// src/pages/AccountantDashboard.js
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { useAuth } from "../AuthContext";
import {
  BadgeDollarSign,
  CreditCard,
  Users,
  DollarSign,
  ListChecks,
  MailCheck,
  RefreshCw,
  Loader2,
  Megaphone,
  Inbox,
  Mail,
  MessageSquare,
  CalendarDays,
} from "lucide-react";
import { getMenusForRole } from "../constants/roleBasedMenus";

/* ===== ORDS base ===== */
const HOST =
  "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

/* ===== Endpoints ===== */
const ACADEMIC_CLASSES_API = `${HOST}/academic/get/classes/`;         // ?p_school_id=
const ACADEMIC_YEAR_API    = `${HOST}/academic/get/academic_year/`;   // ?p_school_id=
const ACADEMIC_TERM_API    = `${HOST}/academic/get/term/`;            // ?p_school_id=
const STUDENTS_API         = `${HOST}/student/get/students/`;         // ?p_school_id[&p_class_id]
const FEES_INVOICES_API    = `${HOST}/fees/invoice/`;                 // ?p_school_id=&p_class_id=&p_term=&p_academic_year=
const COMMS_SENT_API       = `${HOST}/comms/dashboard/sent/`;         // ?p_school_id=&p_role=
const EVENTS_GET_API       = `${HOST}/academic/get/event/`;           // ?p_school_id=

/* ===== helpers ===== */
const jtxt = async (u, init) => {
  const r = await fetch(u, { cache: "no-store", headers: { Accept: "application/json" }, ...(init || {}) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.text()).trim();
};
const jarr = async (u, init) => {
  const t = await jtxt(u, init).catch(() => "");
  if (!t) return [];
  try {
    const d = JSON.parse(t);
    return Array.isArray(d) ? d : Array.isArray(d.items) ? d.items : [];
  } catch {
    return [];
  }
};
const jobject = async (u, init) => {
  const t = await jtxt(u, init).catch(() => "");
  if (!t) return {};
  try { return JSON.parse(t) || {}; } catch { return {}; }
};
/** small concurrency limiter */
async function mapWithConcurrency(items, limit, mapper) {
  const ret = new Array(items.length);
  let i = 0, running = 0;
  await new Promise((resolve) => {
    const next = () => {
      while (running < limit && i < items.length) {
        const cur = i++;
        running++;
        Promise.resolve(mapper(items[cur], cur))
          .then((v) => (ret[cur] = v))
          .catch((e) => (ret[cur] = { error: String(e?.message || e) }))
          .finally(() => {
            running--;
            if (ret.filter((x) => x !== undefined).length === items.length) resolve();
            else next();
          });
      }
    };
    next();
  });
  return ret;
}
const currencyFmt = (n, cur = "GHS") =>
  `${cur} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateOnly = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtWhen = (isoLike) => {
  if (!isoLike) return "";
  const d = new Date(isoLike);
  return isNaN(d.getTime()) ? String(isoLike) : d.toLocaleString();
};
function resolvePathByLabel(role, label) {
  const items = getMenusForRole(role);
  const walk = (arr) => {
    for (const it of arr || []) {
      if (it.label === label && it.path) return it.path;
      if (it.children) {
        const hit = walk(it.children);
        if (hit) return it;
      }
    }
    return null;
  };
  const found = walk(items);
  return typeof found === "string" ? found : found?.path || null;
}
/* Map UI role to code used by comms endpoint (AC for Accountant) */
function roleToCode(userType) {
  const r = String(userType || "").trim().toLowerCase();
  if (["ac", "accountant"].includes(r)) return "AC";
  if (["ht", "headteacher", "head teacher"].includes(r)) return "HT";
  if (["ad", "admin", "administrator"].includes(r)) return "AD";
  if (["te", "tr", "teacher"].includes(r)) return "TE";
  if (["owner", "schoolowner", "school owner", "ow"].includes(r)) return "OW";
  return r.slice(0, 2).toUpperCase();
}

/** Aggregate invoices per student */
const aggInvoicesPerStudent = (rows = []) => {
  const m = new Map();
  for (const r of rows) {
    const id = String(r.student_id ?? r.STUDENT_ID ?? "");
    const name = r.student_name ?? r.STUDENT_NAME ?? id;
    if (!id) continue;
    if (!m.has(id)) m.set(id, { student_id: id, student_name: name, amount: 0, paid_total: 0, balance: 0 });
    const a = m.get(id);
    const amt = Number(r.amount ?? r.AMOUNT ?? 0);
    const paid = Number(r.paid_total ?? r.AMOUNT_PAID ?? r.PAID_TOTAL ?? 0);
    const bal  = Number((r.balance ?? r.BALANCE) ?? (amt - paid));
    a.amount += amt; a.paid_total += paid; a.balance += bal;
  }
  return [...m.values()];
};

export default function AccountantDashboard() {
  const { user, token } = useAuth() || {};
  const role = String(user?.userType || "accountant").toLowerCase();
  const roleCode = roleToCode(user?.userType);
  const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? null;
  const CUR = user?.school?.currency ?? user?.currency ?? "GHS";

  const H = useMemo(
    () =>
      token
        ? { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
        : {},
    [token]
  );

  // lookups
  const [years, setYears] = useState([]); const [yearId, setYearId] = useState(null);
  const [terms, setTerms] = useState([]); const [termId, setTermId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [studentsAll, setStudentsAll] = useState([]);

  // stats
  const [totalRevenue, setTotalRevenue] = useState(0); // "Total Paid"
  const [outstanding, setOutstanding] = useState(0);
  const [outstandingCount, setOutstandingCount] = useState(0);
  const [invoicesCount, setInvoicesCount] = useState(0); // kept for future use
  const [studentsBilledCount, setStudentsBilledCount] = useState(0);
  const [studentsCoveragePct, setStudentsCoveragePct] = useState(0);

  // comms
  const [annAll, setAnnAll] = useState([]);      // all (AC + general)
  const [annToday, setAnnToday] = useState([]);  // today-only subset
  const [showAll, setShowAll] = useState(false); // inline toggle
  const [annLoading, setAnnLoading] = useState(false);
  const [annErr, setAnnErr] = useState("");

  // events (calendar)
  const [events, setEvents] = useState([]); // [{event_id, event_name, event_date}]
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // ui
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  // Load LOVs
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        // years
        const y = await jarr(`${ACADEMIC_YEAR_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);
        const yNorm = y.map(r => ({
          id: r.academic_year_id ?? r.ACADEMIC_YEAR_ID,
          name: r.academic_year_name ?? r.ACADEMIC_YEAR_NAME,
          status: (r.status ?? r.STATUS) || ""
        })).filter(a => a.id != null);
        setYears(yNorm);
        const curY = yNorm.find(a => String(a.status).toUpperCase() === "CURRENT");
        setYearId(curY?.id ?? yNorm[0]?.id ?? null);

        // terms
        const t = await jarr(`${ACADEMIC_TERM_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);
        const tNorm = t.map(r => ({
          id: r.term_id ?? r.TERM_ID,
          name: r.term_name ?? r.TERM_NAME,
          status: (r.status ?? r.STATUS) || ""
        })).filter(a => a.id != null);
        setTerms(tNorm);
        const curT = tNorm.find(a => String(a.status).toUpperCase() === "CURRENT");
        setTermId(curT?.id ?? tNorm[0]?.id ?? null);

        // classes
        const c = await jarr(`${ACADEMIC_CLASSES_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);
        const cNorm = c.map(r => ({
          id: r.class_id ?? r.CLASS_ID ?? r.id ?? r.ID,
          name: r.class_name ?? r.CLASS_NAME ?? r.name ?? r.NAME
        })).filter(a => a.id != null);
        setClasses(cNorm);

        // all students
        const s = await jarr(`${STUDENTS_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);
        const sNorm = s.map(r => ({ id: r.student_id ?? r.STUDENT_ID ?? r.id ?? r.ID })).filter(a => a.id != null);
        setStudentsAll(sNorm);
      } catch {
        // empty state tolerated
      }
    })();
  }, [schoolId, H]);

  // Load finance stats (across all classes) for current term/year
  const loadFinance = async () => {
    if (!schoolId || !termId || !yearId || classes.length === 0) return;
    setRefreshing(true);
    try {
      // fetch invoices per class in parallel
      const perClass = await mapWithConcurrency(
        classes,
        6,
        async (c) => {
          const url = `${FEES_INVOICES_API}?p_school_id=${schoolId}&p_class_id=${c.id}&p_term=${termId}&p_academic_year=${yearId}`;
          return await jarr(url, H);
        }
      );
      const all = perClass.flat();

      // counts
      setInvoicesCount(all.length);

      // per-student aggregation
      const agg = aggInvoicesPerStudent(all);
      setStudentsBilledCount(agg.length);

      const totalRevenue_ = agg.reduce((s, r) => s + Number(r.paid_total || 0), 0);
      const outstanding_  = agg.reduce((s, r) => s + Number(r.balance || 0), 0);
      const owingCount    = agg.filter(r => Number(r.balance) > 0).length;

      setTotalRevenue(totalRevenue_);
      setOutstanding(outstanding_);
      setOutstandingCount(owingCount);

      if (studentsAll.length > 0) {
        setStudentsCoveragePct(Number(((agg.length / studentsAll.length) * 100).toFixed(2)));
      } else {
        setStudentsCoveragePct(0);
      }
    } catch {
      // optional: set an error banner
    } finally {
      setRefreshing(false);
      setLoading(false);
      setLastUpdated(new Date().toLocaleString());
    }
  };

  useEffect(() => { loadFinance(); /* eslint-disable-next-line */ }, [schoolId, termId, yearId, classes, studentsAll, token]);

  // Communications — AC + general
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        setAnnLoading(true); setAnnErr("");
        const rows = await jarr(`${COMMS_SENT_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);

        const isGeneral = (v) => {
          const s = String(v ?? "").trim().toUpperCase();
          return s === "" || s === "NULL" || s === "ALL";
        };
        const filtered = rows
          .filter((m) => {
            const tr = (m.target_role ?? m.TARGET_ROLE ?? "").toString().toUpperCase();
            return tr === String(roleCode || "").toUpperCase() || isGeneral(tr);
          })
          .sort((a, b) => new Date(b.created_at ?? b.CREATED_AT) - new Date(a.created_at ?? a.CREATED_AT));

        const today = todayISO();
        const onlyToday = filtered.filter((m) => dateOnly(m.created_at ?? m.CREATED_AT) === today);

        setAnnAll(filtered);
        setAnnToday(onlyToday);
      } catch (e) {
        setAnnAll([]); setAnnToday([]); setAnnErr(e?.message || "Failed to load communications");
      } finally {
        setAnnLoading(false);
      }
    })();
  }, [schoolId, roleCode, H]);

  // Events — Calendar
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        const rows = await jarr(`${EVENTS_GET_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);
        const norm = (rows || [])
          .map((e) => ({
            event_id: e.event_id ?? e.EVENT_ID,
            event_name: e.event_name ?? e.EVENT_NAME,
            event_date: e.event_date ?? e.EVENT_DATE,
          }))
          .filter((e) => e.event_date && e.event_name);
        setEvents(norm);
      } catch {
        setEvents([]);
      }
    })();
  }, [schoolId, H]);

  /* Quick actions -> resolve from role menus when possible */
  const quickActions = useMemo(() => {
    const wanted = [
      { label: "Manage Fees",   icon: <DollarSign className="h-5 w-5" /> },
      { label: "View Bill",     icon: <MailCheck className="h-5 w-5" /> },
      { label: "Fees — Overview", icon: <ListChecks className="h-5 w-5" /> },
    ];
    return wanted.map((a) => {
      const path =
        resolvePathByLabel(role, a.label) ||
        (a.label === "Manage Fees"   ? "/dashboard/manage-fees" :
         a.label === "View Bill"     ? "/dashboard/print-bill" :
         a.label === "Fees — Overview" ? "/dashboard/fees-report" : "/dashboard");
      return { ...a, to: path };
    });
  }, [role]);

  /* ======== KPI CARDS (as requested) ======== */
  const statCards = [
    {
      label: "Total Revenue",
      value: currencyFmt(totalRevenue, CUR),
      sub: `${terms.find(t => t.id === termId)?.name || ""} · ${years.find(y => y.id === yearId)?.name || ""}`,
      icon: <BadgeDollarSign className="h-6 w-6 text-green-500" />,
    },
    {
      label: "Outstanding Fees",
      value: currencyFmt(outstanding, CUR),
      sub: `${outstandingCount} student${outstandingCount === 1 ? "" : "s"} owing`,
      icon: <CreditCard className="h-6 w-6 text-red-500" />,
    },
    {
      label: "Unpaid / All",
      value: `${outstandingCount.toLocaleString()}/${studentsBilledCount.toLocaleString()}`,
      sub: studentsAll.length ? `${(studentsCoveragePct || 0).toFixed(0)}% of students billed` : "—",
      icon: <Users className="h-6 w-6 text-yellow-500" />,
    },
  ];

  return (
    <DashboardLayout title="Finance Dashboard">
      {/* Live header */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white mb-8 border border-indigo-200/40 dark:border-indigo-900/30">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-blue-600 to-indigo-700" />
        <div className="relative">
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-1 rounded-full bg-white/20">LIVE</span>
            {lastUpdated && <span className="text-white/90">Updated: {lastUpdated}</span>}
            <button
              onClick={loadFinance}
              className="ml-auto inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg border border-white/20"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <h2 className="mt-3 text-2xl font-bold">Welcome to the Accountant Dashboard 💼</h2>
          <p className="text-white/85">
            Track fees, manage payments, and monitor financial insights from live records.
          </p>
        </div>
      </div>

      {/* Stats (live) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <span className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                <span className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))
        ) : (
          statCards.map((item, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
                {item.icon}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{item.value}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{item.sub}</div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {quickActions.map((action, i) => (
            <Link
              key={i}
              to={action.to}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-100 rounded-xl border border-indigo-100 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition"
              title={action.label}
            >
              {action.icon}
              <span className="font-medium text-sm">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Events + Communications grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Calendar (2 cols) */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-indigo-500" />
                <h3 className="font-semibold">Upcoming Events</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 rounded border text-sm"
                  onClick={() =>
                    setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))
                  }
                >
                  ‹ Prev
                </button>
                <div className="text-sm font-medium">
                  {calMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}
                </div>
                <button
                  className="px-2 py-1 rounded border text-sm"
                  onClick={() =>
                    setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))
                  }
                >
                  Next ›
                </button>
              </div>
            </div>

            <BigCalendar monthStart={calMonth} events={events} />
          </div>
        </div>

        {/* Communications */}
        <div className="lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {showAll ? "All Time Communications" : "Today’s Communications"}
            </h3>
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-sm text-indigo-600 hover:underline"
            >
              {showAll ? "Show Today Only" : "View All"}
            </button>
          </div>

          {annLoading ? (
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </span>
            </div>
          ) : annErr ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm">
              {annErr}
            </div>
          ) : (showAll ? annAll : annToday).length === 0 ? (
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300">
              {showAll ? "No communications yet." : "No communications today."}
            </div>
          ) : (
            <ul className="space-y-4">
              {(showAll ? annAll : annToday).map((m) => {
                const subject = m.subject ?? m.SUBJECT ?? "(No subject)";
                const body = (m.body ?? m.BODY ?? "").toString();
                const createdAt = m.created_at ?? m.CREATED_AT;
                return (
                  <li
                    key={m.message_id ?? m.MESSAGE_ID ?? `${subject}-${createdAt}`}
                    className="flex items-start space-x-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                  >
                    <div><Megaphone className="text-orange-500 h-6 w-6" /></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">{subject}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2">{body}</p>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 opacity-80">
                          <Inbox className="h-3.5 w-3.5" /> Dashboard
                        </span>
                        {String(m.has_email ?? m.HAS_EMAIL ?? "N").toUpperCase() === "Y" && (
                          <span className="inline-flex items-center gap-1 opacity-60"><Mail className="h-3.5 w-3.5" /> Email</span>
                        )}
                        {String(m.has_sms ?? m.HAS_SMS ?? "N").toUpperCase() === "Y" && (
                          <span className="inline-flex items-center gap-1 opacity-60"><MessageSquare className="h-3.5 w-3.5" /> SMS</span>
                        )}
                        <span className="ml-auto">{fmtWhen(createdAt)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ===== Simple dependency-free monthly calendar ===== */
function BigCalendar({ monthStart, events }) {
  const y = monthStart.getFullYear();
  const m = monthStart.getMonth(); // 0-based
  const first = new Date(y, m, 1);
  const startDay = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysPrev = startDay;
  const totalCells = Math.ceil((daysPrev + daysInMonth) / 7) * 7;

  // Map events by yyyy-mm-dd
  const byDate = new Map();
  (events || []).forEach((e) => {
    const d = dateOnly(e.event_date);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(e);
  });

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - daysPrev + 1;
    const dateObj = new Date(y, m, dayNum);
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    const iso = dateObj.toISOString().slice(0, 10);
    const e = byDate.get(iso) || [];
    cells.push({ iso, dayNum: dateObj.getDate(), inMonth, events: e });
  }

  return (
    <div className="grid grid-cols-7 gap-1 sm:gap-2">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
        <div key={d} className="text-xs font-medium text-gray-600 dark:text-gray-300 px-2 py-1">
          {d}
        </div>
      ))}
      {cells.map((c, idx) => (
        <div
          key={idx}
          className={`min-h-[104px] rounded-lg border p-2 overflow-hidden ${
            c.inMonth
              ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              : "bg-gray-50 dark:bg-gray-800/50 border-gray-200/60 dark:border-gray-700/60 opacity-70"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {c.dayNum}
            </div>
            {c.iso === todayISO() && (
              <span className="text-[10px] px-1 rounded bg-indigo-600 text-white">
                Today
              </span>
            )}
          </div>

          {/* events */}
          <div className="mt-1 space-y-1">
            {c.events.slice(0, 3).map((ev) => (
              <div
                key={ev.event_id}
                className="text-[11px] px-2 py-1 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-100 border border-indigo-100 dark:border-indigo-800 truncate"
                title={ev.event_name}
              >
                • {ev.event_name}
              </div>
            ))}
            {c.events.length > 3 && (
              <div className="text-[11px] text-gray-500">+{c.events.length - 3} more…</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
