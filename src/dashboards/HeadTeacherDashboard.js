// src/pages/HeadTeacherDashboard.js
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import {
  BarChart2,
  BookOpen,
  RefreshCw,
  Users,
  UserCheck,
  Dot,
  Megaphone,
  Inbox,
  Mail,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { getMenusForRole } from "../constants/roleBasedMenus";

/* ===== ORDS base ===== */
const HOST =
  "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

/* ===== Endpoints (live) ===== */
const DASHBOARD_API  = `${HOST}/get/admin/dashboard/`;       // ?user_id=
const CLASSES_API    = `${HOST}/academic/get/classes/`;      // ?p_school_id=
const TEACHERS_API   = `${HOST}/staff/get/staff/`;           // ?p_school_id=&p_role=TE
const STAFF_API      = `${HOST}/staff/get/staff/`;           // ?p_school_id=
const STUDENTS_API   = `${HOST}/student/get/students/`;      // ?p_school_id=
const COMMS_SENT_API = `${HOST}/comms/dashboard/sent/`;      // ?p_school_id=&p_role= (role-targeted + we’ll also fetch general)

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
  try {
    return JSON.parse(t) || {};
  } catch {
    return {};
  }
};
const fmtNum = (n) => (typeof n === "number" ? n.toLocaleString() : "—");
const fmtPct = (n) => (n == null || Number.isNaN(Number(n)) ? "—" : `${Number(n).toFixed(2)}%`);
const todayISO = () => new Date().toISOString().slice(0, 10);
const dateOnly = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const safeText = (s, n = 200) => String(s || "").trim().slice(0, n) + (String(s || "").length > n ? "…" : "");
const fmtWhen = (isoLike) => {
  if (!isoLike) return "";
  const d = new Date(isoLike);
  return isNaN(d.getTime()) ? String(isoLike) : d.toLocaleString();
};
/* audience label */
function readableAudience(targetType, classId, classes) {
  const c = classes.find((x) => Number(x.class_id) === Number(classId));
  switch (String(targetType || "").toUpperCase()) {
    case "ALL":            return "All (Parents, Teachers & Students)";
    case "ALL_PARENTS":    return "All Parents";
    case "ALL_TEACHERS":   return "All Teachers/Staff";
    case "ALL_STUDENTS":   return "All Students";
    case "CLASS_PARENTS":  return `Class Parents${c ? ` — ${c.class_name}` : ""}`;
    case "CLASS_STUDENTS": return `Class Students${c ? ` — ${c.class_name}` : ""}`;
    default:               return targetType || "";
  }
}
/* Resolve a menu path by its label (from roleBasedMenus) */
function resolvePathByLabel(role, label) {
  const items = getMenusForRole(role);
  const walk = (arr) => {
    for (const it of arr || []) {
      if (it.label === label && it.path) return it.path;
      if (it.children) {
        const hit = walk(it.children);
        if (hit) return hit;
      }
    }
    return null;
  };
  return walk(items);
}
/* safe numeric field pickup from an object */
function pickNum(obj, keys) {
  for (const k of keys) {
    const v = Number(obj?.[k]);
    if (!Number.isNaN(v)) return v;
  }
  return null;
}

/* Map UI/user role → short code for APIs (HEADTEACHER=HT, ADMIN=AD, ACCOUNTANT=AC, TEACHER=TE, OWNER=OW) */
function roleToCode(userType) {
  const r = String(userType || "").trim().toLowerCase();
  if (!r) return null;
  if (["ht", "headteacher", "head teacher"].includes(r)) return "HT";
  if (["ad", "admin", "administrator"].includes(r))        return "AD";
  if (["ac", "accountant"].includes(r))                    return "AC";
  if (["te", "tr", "teacher"].includes(r))                 return "TE";
  if (["owner", "schoolowner", "school owner", "ow"].includes(r)) return "OW";
  // fallback: first two letters uppercased (covers ETC)
  return r.slice(0, 2).toUpperCase();
}

export default function HeadTeacherDashboard() {
  const { user, token } = useAuth() || {};
  const role = String(user?.userType || "headteacher").toLowerCase();
  const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? null;
  const userId   = user?.id ?? user?.user_id ?? null;
  const roleCode = roleToCode(user?.userType);

  const H = useMemo(
    () =>
      token
        ? { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
        : {},
    [token]
  );

  // KPIs
  const [attendanceRate, setAttendanceRate] = useState(0); // from DASHBOARD_API (auth user id)
  const [presentToday, setPresentToday] = useState(null);   // optional if API exposes
  const [totalToday, setTotalToday] = useState(null);       // optional if API exposes

  const [totalClasses, setTotalClasses] = useState(null);
  const [totalStudents, setTotalStudents] = useState(null);
  const [totalTeachers, setTotalTeachers] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  // Announcements + classes
  const [classes, setClasses] = useState([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [annErr, setAnnErr] = useState("");
  const [announcements, setAnnouncements] = useState([]);

  // --- Load LIVE using AUTH USER ID for attendance rate ---
  const loadLive = async () => {
    if (!userId) return;
    setRefreshing(true);

    // 1) consolidated stats by auth user id
    try {
      const stats = await jobject(`${DASHBOARD_API}?user_id=${encodeURIComponent(userId)}`, H);

      // Attendance rate (required)
      const ar = pickNum(stats, ["attendanceRate", "attendance_rate"]);
      if (ar != null) setAttendanceRate(ar);

      // Optional present/total if provided by your API
      const pres = pickNum(stats, ["present", "present_count", "presentToday", "present_today"]);
      const tot  = pickNum(stats, ["total", "enrolled", "enrolled_count", "totalToday", "total_today"]);
      if (pres != null) setPresentToday(pres);
      if (tot  != null) setTotalToday(tot);

      // Other KPIs if available
      const tc = pickNum(stats, ["totalClasses", "total_class", "totalClass"]);
      const ts = pickNum(stats, ["totalStudents", "total_students"]);
      const tt = pickNum(stats, ["totalTeachers", "total_teachers"]);
      if (tc != null) setTotalClasses(tc);
      if (ts != null) setTotalStudents(ts);
      if (tt != null) setTotalTeachers(tt);
    } catch {
      // keep defaults; we’ll fill gaps below
    }

    // 2) fallbacks for other KPIs (not attendance rate)
    try {
      if (schoolId != null && totalClasses == null) {
        const rows = await jarr(`${CLASSES_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);
        setTotalClasses(rows.length);
      }
    } catch {}
    try {
      if (schoolId != null && totalTeachers == null) {
        let n = 0;
        try {
          const trows = await jarr(`${TEACHERS_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);
          n = trows.length;
        } catch {
          const srows = await jarr(`${STAFF_API}?p_school_id=${encodeURIComponent(schoolId)}&p_role=TE`, H);
          n = srows.filter((r) =>
            /teacher|tutor|teaching/i.test(String(r.role ?? r.ROLE ?? r.position ?? r.POSITION ?? ""))
          ).length;
        }
        setTotalTeachers(n);
      }
    } catch {}
    try {
      if (schoolId != null && totalStudents == null) {
        const srows = await jarr(`${STUDENTS_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);
        setTotalStudents(srows.length);
      }
    } catch {}

    setLastUpdated(new Date().toLocaleString());
    setRefreshing(false);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    loadLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, userId, token]);

  // Classes (for audience chips)
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        const rows = await jarr(`${CLASSES_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);
        const norm = rows
          .map((r) => ({
            class_id: r.class_id ?? r.CLASS_ID ?? r.id ?? r.ID,
            class_name: r.class_name ?? r.CLASS_NAME ?? r.name ?? r.NAME,
          }))
          .filter((x) => x.class_id != null);
        setClasses(norm);
      } catch {
        setClasses([]);
      }
    })();
  }, [schoolId, H]);

  // Today’s Announcements (Dashboard only) using new endpoint with p_role = AUTH ROLE
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        setAnnLoading(true); setAnnErr("");

        // 1) role-targeted
        const targetedUrl =
          `${COMMS_SENT_API}?p_school_id=${encodeURIComponent(schoolId)}${roleCode ? `&p_role=${encodeURIComponent(roleCode)}` : ""}`;
        const targeted = await jarr(targetedUrl, H);

        // 2) general (where target_role is NULL) — get all & filter locally
        const allUrl = `${COMMS_SENT_API}?p_school_id=${encodeURIComponent(schoolId)}`;
        const allRows = await jarr(allUrl, H);
        const general = allRows.filter((m) => m.target_role == null || String(m.target_role).trim() === "");

        // merge + de-dupe
        const byId = new Map();
        [...targeted, ...general].forEach((m) => {
          const id = m.message_id ?? m.MESSAGE_ID ?? `${m.subject}-${m.created_at}`;
          if (!byId.has(id)) byId.set(id, m);
        });
        const merged = Array.from(byId.values());

        // today only
        const today = todayISO();
        const todays = merged.filter((m) => dateOnly(m.created_at ?? m.CREATED_AT) === today);

        // newest first
        const sorted = todays.sort(
          (a, b) => new Date(b.created_at ?? b.CREATED_AT) - new Date(a.created_at ?? a.CREATED_AT)
        );

        setAnnouncements(sorted.slice(0, 5));
      } catch (e) {
        setAnnouncements([]); setAnnErr(e?.message || "Failed to load announcements");
      } finally {
        setAnnLoading(false);
      }
    })();
  }, [schoolId, roleCode, H]);

  /* Quick Actions from role menus */
  const quickActions = useMemo(() => {
    const wanted = [
      { label: "Attendance Report", icon: <BarChart2 className="h-5 w-5" /> },
      { label: "Manage Students",   icon: <Users className="h-5 w-5" /> },
      { label: "Manage Staff",      icon: <UserCheck className="h-5 w-5" /> },
      { label: "Manage Classes",    icon: <BookOpen className="h-5 w-5" /> },
    ];
    return wanted
      .map((a) => {
        const path = resolvePathByLabel(role, a.label);
        return path ? { ...a, to: path } : null;
      })
      .filter(Boolean);
  }, [role]);

  // KPI Cards (attendance always first & visible)
  const kpis = [
    {
      key: "attendance",
      label: "Attendance (Today)",
      value: fmtPct(attendanceRate),
      raw: attendanceRate,
      icon: <BarChart2 className="h-6 w-6 text-purple-500" />,
      accent: "from-purple-500/20 to-indigo-500/20",
      present: presentToday,
      total: totalToday,
    },
    totalClasses != null && {
      key: "classes",
      label: "Total Classes",
      value: fmtNum(totalClasses),
      icon: <BookOpen className="h-6 w-6 text-yellow-500" />,
      accent: "from-yellow-500/20 to-amber-500/20",
    },
    totalStudents != null && {
      key: "students",
      label: "Total Students",
      value: fmtNum(totalStudents),
      icon: <Users className="h-6 w-6 text-indigo-500" />,
      accent: "from-indigo-500/20 to-blue-500/20",
    },
    totalTeachers != null && {
      key: "teachers",
      label: "Total Teachers",
      value: fmtNum(totalTeachers),
      icon: <UserCheck className="h-6 w-6 text-emerald-500" />,
      accent: "from-emerald-500/20 to-teal-500/20",
    },
  ].filter(Boolean);

  return (
    <DashboardLayout title="HeadTeacher Dashboard">
      {/* Hero / Live banner */}
      <div className="relative overflow-hidden rounded-2xl mb-6 sm:mb-8 shadow border border-indigo-200/40 dark:border-indigo-900/30">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-700" />
        <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative p-4 sm:p-6 text-white">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white/15">
              <Dot className="h-4 w-4 text-emerald-300" />
              <span className="tracking-wide">LIVE</span>
            </div>
            {lastUpdated && (
              <div className="text-xs text-indigo-100">Updated: {lastUpdated}</div>
            )}
            <button
              onClick={loadLive}
              className="ml-auto inline-flex items-center gap-2 text-sm bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg border border-white/20"
              title="Refresh live data"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <h2 className="mt-3 text-xl sm:text-2xl font-bold">School Overview</h2>
          <p className="text-sm sm:text-base text-indigo-100">
            Key metrics pulled directly from your live records.
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {loading && (
          <>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur animate-pulse p-4"
              >
                <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </>
        )}

        {!loading &&
          kpis.map((k) => (
            <div
              key={k.key}
              className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${k.accent} pointer-events-none`} />
              <div className="relative flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">{k.label}</span>
                {k.icon}
              </div>

              {k.key === "attendance" ? (
                <>
                  <AttendanceGauge pct={Number(k.raw) || 0} label={k.value} />
                  {(k.present != null && k.total != null) && (
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      Today: <span className="font-medium">{k.present}</span> /{" "}
                      <span className="font-medium">{k.total}</span> marked present
                    </div>
                  )}
                </>
              ) : (
                <div className="relative text-2xl font-bold text-gray-900 dark:text-white">
                  {k.value}
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {quickActions.map((a, i) => (
              <Link
                key={i}
                to={a.to}
                className="group w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm rounded-xl border border-indigo-100 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-900/60 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition shadow-sm"
                title={a.label}
              >
                <span className="transform group-hover:scale-110 transition-transform">{a.icon}</span>
                <span className="text-indigo-700 dark:text-indigo-100">{a.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Today's Announcements */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Today’s Announcements
        </h3>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Role filter: {roleCode || "—"} • Targeted + General
        </div>
      </div>

      {annLoading ? (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300 mb-8">
          Loading announcements…
        </div>
      ) : annErr ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm mb-8">
          {annErr}
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300 mb-8">
          No dashboard announcements today.
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {announcements.map((m) => {
            const subject = m.subject ?? m.SUBJECT ?? "(No subject)";
            const body = m.body ?? m.BODY ?? "";
            const createdAt = m.created_at ?? m.CREATED_AT;
            const targetType = m.target_type ?? m.TARGET_TYPE;
            const classId = m.class_id ?? m.CLASS_ID;

            return (
              <div
                key={m.message_id ?? m.MESSAGE_ID ?? `${subject}-${createdAt}`}
                className="flex items-start gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <div className="flex-shrink-0">
                  <Megaphone className="h-6 w-6 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {subject}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100 border border-indigo-100 dark:border-indigo-700">
                      {readableAudience(targetType, classId, classes)}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Inbox className="h-3.5 w-3.5" /> Dashboard
                      {String(m.has_email ?? m.HAS_EMAIL ?? "N").toUpperCase() === "Y" && (
                        <span className="inline-flex items-center gap-1 ml-2 opacity-60">
                          <Mail className="h-3.5 w-3.5" /> Email
                        </span>
                      )}
                      {String(m.has_sms ?? m.HAS_SMS ?? "N").toUpperCase() === "Y" && (
                        <span className="inline-flex items-center gap-1 ml-2 opacity-60">
                          <MessageSquare className="h-3.5 w-3.5" /> SMS
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-200 mt-1 line-clamp-2">
                    {safeText(body, 240)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Sent on: {fmtWhen(createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

/* ===== UI bits ===== */
function AttendanceGauge({ pct = 0, label = "0%" }) {
  const p = Math.max(0, Math.min(100, Number(pct)));
  const deg = (p / 100) * 360;
  return (
    <div className="mt-1 flex items-center gap-4">
      <div
        className="h-16 w-16 rounded-full grid place-items-center"
        style={{ background: `conic-gradient(#6366F1 ${deg}deg, #E5E7EB 0deg)` }}
      >
        <div className="h-12 w-12 rounded-full bg-white dark:bg-gray-800 grid place-items-center text-xs font-semibold">
          {label}
        </div>
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-300">
        <div className="font-medium">Present vs. Enrolled (today)</div>
        <div className="opacity-80">From your user’s dashboard stats</div>
      </div>
    </div>
  );
}
