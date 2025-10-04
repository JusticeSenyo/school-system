// src/pages/TeacherDashboard.js
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { useAuth } from "../AuthContext";
import {
  BookOpen,
  RefreshCw,
  BarChart2,
  AlertCircle,
  Megaphone,
  Inbox,
  Mail,
  MessageSquare,
  CalendarDays,
} from "lucide-react";

/* ------------ ORDS base ------------ */
const HOST =
  "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

/* ------------ Endpoints ------------ */
// Class teacher: classes assigned
const CLASS_TEACHER_CLASSES_API = `${HOST}/academic/class_teacher/class/`; // ?p_user_id=
// Subjects/classes a teacher teaches
const SUBJECT_TEACHER_API = `${HOST}/academic/get/subject_teacher/`; // ?p_school_id[&p_user_id]
// Academic LOVs (current year/term)
const YEARS_API = `${HOST}/academic/get/years/`; // ?p_school_id
const TERMS_API = `${HOST}/academic/get/terms/`; // ?p_school_id
// Attendance (day view)
const DAILY_ATT_API = `${HOST}/report/get/attendance/`; // ?p_school_id&p_class_id&p_academic_year&p_term&p_date
// Communications (dashboard)
const COMMS_SENT_API = `${HOST}/comms/dashboard/sent/`; // ?p_school_id
// Events (for calendar)
const EVENTS_GET_API = `${HOST}/academic/get/event/`; // ?p_school_id

/* ------------ Helpers ------------ */
const jtxt = async (u, init) => {
  const r = await fetch(u, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    ...(init || {}),
  });
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
const todayISO = () => new Date().toISOString().slice(0, 10);
const dateOnly = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const fmtWhen = (isoLike) => {
  if (!isoLike) return "";
  const d = new Date(isoLike);
  return isNaN(d.getTime()) ? String(isoLike) : d.toLocaleString();
};
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0); // 1dp

/** small concurrency limiter */
async function mapWithConcurrency(items, limit, mapper) {
  const ret = new Array(items.length);
  let i = 0,
    running = 0;
  await new Promise((resolve) => {
    const next = () => {
      while (running < limit && i < items.length) {
        const cur = i++;
        running++;
        Promise.resolve(mapper(items[cur], cur))
          .then((v) => (ret[cur] = v))
          .catch(() => (ret[cur] = null))
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

/* ------------ Component ------------ */
export default function TeacherDashboard() {
  const { user, token } = useAuth() || {};
  const userId =
    user?.id ?? user?.user_id ?? user?.staff_id ?? user?.STAFF_ID ?? null;
  const schoolId =
    user?.schoolId ?? user?.school_id ?? user?.school?.id ?? null;

  const authInit = useMemo(
    () =>
      token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        : {},
    [token]
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");

  // class-teacher view
  const [classes, setClasses] = useState([]); // [{class_id, class_name}]
  const [yearId, setYearId] = useState(null);
  const [termId, setTermId] = useState(null);
  const [todayMap, setTodayMap] = useState({}); // { [class_id]: {present,tardy,absent,total,rate} }

  // normal teacher (subjects they teach)
  const [subjects, setSubjects] = useState([]); // [{CLASS_ID, CLASS_NAME, SUBJECT_ID, SUBJECT_NAME}]

  // comms
  const [annAll, setAnnAll] = useState([]);
  const [annToday, setAnnToday] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [annLoading, setAnnLoading] = useState(false);
  const [annErr, setAnnErr] = useState("");

  // events (calendar)
  const [events, setEvents] = useState([]); // [{event_id, event_name, event_date}]
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [lastUpdated, setLastUpdated] = useState("");

  const isClassTeacher = classes.length > 0;

  /* ---- Load class-teacher classes ---- */
  const loadAssignedClasses = async () => {
    if (!userId) return;
    setErr("");
    try {
      const url = `${CLASS_TEACHER_CLASSES_API}?p_user_id=${encodeURIComponent(
        userId
      )}`;
      const rows = await jarr(url, authInit);
      const norm = (rows || [])
        .map((r) => ({
          class_id: r.class_id ?? r.CLASS_ID,
          class_name: r.class_name ?? r.CLASS_NAME,
        }))
        .filter((x) => x.class_id != null && x.class_name);
      setClasses(norm);
    } catch (e) {
      // Not fatal: just means they may be a non-class teacher
      setClasses([]);
    }
  };

  /* ---- Load subjects/classes the teacher teaches ---- */
  const loadSubjects = async () => {
    if (!schoolId) return;
    try {
      const url = `${SUBJECT_TEACHER_API}?p_school_id=${encodeURIComponent(
        schoolId
      )}&p_user_id=${encodeURIComponent(userId || "")}`;
      const rows = await jarr(url, authInit);
      const norm = (rows || [])
        .map((r) => ({
          CLASS_ID: r.class_id ?? r.CLASS_ID,
          CLASS_NAME: r.class_name ?? r.CLASS_NAME,
          SUBJECT_ID: r.subject_id ?? r.SUBJECT_ID,
          SUBJECT_NAME: r.subject_name ?? r.SUBJECT_NAME,
        }))
        .filter((x) => x.CLASS_ID != null && x.SUBJECT_ID != null);
      setSubjects(norm);
    } catch {
      setSubjects([]);
    }
  };

  /* ---- Load current year/term ---- */
  const loadYearTerm = async () => {
    if (!schoolId) return;
    try {
      // Years
      const ys = await jarr(
        `${YEARS_API}?p_school_id=${encodeURIComponent(schoolId)}`,
        authInit
      );
      const yNorm = ys
        .map((y) => ({
          id: y.academic_year_id ?? y.ACADEMIC_YEAR_ID,
          name: y.academic_year_name ?? y.ACADEMIC_YEAR_NAME,
          status: y.status ?? y.STATUS ?? "",
        }))
        .filter((x) => x.id != null);
      const yCur =
        yNorm.find((x) => String(x.status).toUpperCase() === "CURRENT") ||
        yNorm[0];
      setYearId(yCur?.id ?? null);

      // Terms
      const ts = await jarr(
        `${TERMS_API}?p_school_id=${encodeURIComponent(schoolId)}`,
        authInit
      );
      const tNorm = ts
        .map((t) => ({
          id: t.term_id ?? t.TERM_ID,
          name: t.term_name ?? t.TERM_NAME,
          status: t.status ?? t.STATUS ?? "",
        }))
        .filter((x) => x.id != null);
      const tCur =
        tNorm.find((x) => String(x.status).toUpperCase() === "CURRENT") ||
        tNorm[0];
      setTermId(tCur?.id ?? null);
    } catch {
      // leave nulls; attendance cards will show “—”
    }
  };

  /* ---- Load communications (Teacher + General) ---- */
  const loadComms = async () => {
    if (!schoolId) return;
    try {
      setAnnLoading(true);
      setAnnErr("");
      const rows = await jarr(
        `${COMMS_SENT_API}?p_school_id=${encodeURIComponent(schoolId)}`,
        authInit
      );
      const isGeneral = (v) => {
        const s = String(v ?? "").trim().toUpperCase();
        return s === "" || s === "NULL" || s === "ALL";
      };
      const filtered = (rows || [])
        .filter((m) => {
          const tr = (m.target_role ?? m.TARGET_ROLE ?? "")
            .toString()
            .toUpperCase();
          return tr === "TE" || isGeneral(tr);
        })
        .sort(
          (a, b) =>
            new Date(b.created_at ?? b.CREATED_AT) -
            new Date(a.created_at ?? a.CREATED_AT)
        );
      const today = todayISO();
      setAnnAll(filtered);
      setAnnToday(
        filtered.filter(
          (m) => dateOnly(m.created_at ?? m.CREATED_AT) === today
        )
      );
    } catch (e) {
      setAnnAll([]);
      setAnnToday([]);
      setAnnErr(e?.message || "Failed to load communications");
    } finally {
      setAnnLoading(false);
    }
  };

  /* ---- Load events (for calendar) ---- */
  const loadEvents = async () => {
    if (!schoolId) return;
    try {
      const rows = await jarr(
        `${EVENTS_GET_API}?p_school_id=${encodeURIComponent(schoolId)}`,
        authInit
      );
      const norm = (rows || [])
        .map((e) => ({
          event_id: e.event_id ?? e.EVENT_ID,
          event_name: e.event_name ?? e.EVENT_NAME,
          event_date: e.event_date ?? e.EVENT_DATE, // should be ISO or yyyy-mm-dd
        }))
        .filter((e) => e.event_date && e.event_name);
      setEvents(norm);
    } catch {
      setEvents([]);
    }
  };

  /* ---- Load today’s attendance for each assigned class ---- */
  const loadTodayAttendance = async () => {
    if (!schoolId || !yearId || !termId || classes.length === 0) return;
    setRefreshing(true);
    const pDate = todayISO();
    try {
      const results = await mapWithConcurrency(classes, 6, async (c) => {
        const url = `${DAILY_ATT_API}?p_school_id=${encodeURIComponent(
          schoolId
        )}&p_class_id=${encodeURIComponent(
          c.class_id
        )}&p_academic_year=${encodeURIComponent(
          yearId
        )}&p_term=${encodeURIComponent(termId)}&p_date=${encodeURIComponent(
          pDate
        )}`;
        const items = await jarr(url, authInit);
        const norm = (items || []).map((r) =>
          String(r.status ?? r.STATUS ?? "ABSENT").toUpperCase()
        );
        const present = norm.filter((s) => s === "PRESENT").length;
        const tardy = norm.filter((s) => s === "TARDY").length;
        const absent = norm.filter((s) => s === "ABSENT").length;
        const total = norm.length;
        return {
          class_id: c.class_id,
          present,
          tardy,
          absent,
          total,
          rate: pct(present, total),
        };
      });
      const m = {};
      for (const row of results) {
        if (row && row.class_id != null) m[row.class_id] = row;
      }
      setTodayMap(m);
    } catch {
      setTodayMap({});
    } finally {
      setRefreshing(false);
      setLastUpdated(new Date().toLocaleString());
    }
  };

  /* ---- lifecycle ---- */
  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadAssignedClasses(),
      loadSubjects(),
      loadYearTerm(),
      loadComms(),
      loadEvents(),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, schoolId, token]);

  useEffect(() => {
    // re-fetch today’s per-class stats when LOVs/classes ready (only for class teachers)
    if (schoolId && yearId && termId && classes.length) loadTodayAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, yearId, termId, classes]);

  const doFullRefresh = async () => {
    setLoading(true);
    await Promise.all([
      loadAssignedClasses(),
      loadSubjects(),
      loadYearTerm(),
      loadComms(),
      loadEvents(),
    ]);
    await loadTodayAttendance();
    setLoading(false);
  };

  /* ---- Derived: attendance rows for dashboard table ---- */
  const attendanceRows = classes.map((c) => {
    const s =
      todayMap[c.class_id] || { present: 0, tardy: 0, absent: 0, total: 0, rate: 0 };
    return { ...c, ...s };
  });

  const totals = attendanceRows.reduce(
    (acc, r) => {
      acc.present += r.present;
      acc.tardy += r.tardy;
      acc.absent += r.absent;
      acc.total += r.total;
      return acc;
    },
    { present: 0, tardy: 0, absent: 0, total: 0 }
  );

  const overallRate = pct(totals.present, totals.total);

  /* ===== Subjects & Classes: full-width dashboard section ===== */
  const [subq, setSubq] = useState("");
  const groupedSubjects = useMemo(() => {
    const q = subq.trim().toLowerCase();
    const map = new Map();
    for (const r of subjects) {
      const cId = r.CLASS_ID;
      const cName = r.CLASS_NAME || "—";
      const sName = r.SUBJECT_NAME || "—";

      const hit =
        !q ||
        cName.toLowerCase().includes(q) ||
        String(cId).toLowerCase().includes(q) ||
        sName.toLowerCase().includes(q);

      if (!hit) continue;

      if (!map.has(cId)) {
        map.set(cId, { classId: cId, className: cName, subjects: [] });
      }
      map.get(cId).subjects.push(sName);
    }
    const arr = Array.from(map.values()).map((x) => ({
      ...x,
      subjects: Array.from(new Set(x.subjects)).sort((a, b) => a.localeCompare(b)),
    }));
    arr.sort((a, b) => a.className.localeCompare(b.className));
    return arr;
  }, [subjects, subq]);

  const subjectTotals = useMemo(() => {
    const classesCount = new Set(subjects.map((s) => s.CLASS_ID)).size;
    const subjectsCount = subjects.length;
    return { classesCount, subjectsCount };
  }, [subjects]);

  /* ------------ Render ------------ */
  return (
    <DashboardLayout title="Teacher Dashboard">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl mb-6 sm:mb-8 shadow border border-indigo-200/40 dark:border-indigo-900/30">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-700" />
        <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative p-4 sm:p-6 text-white">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <h2 className="text-xl sm:text-2xl font-bold">
              {isClassTeacher ? "Class & Attendance Report" : "Teaching Hub"}
            </h2>
            <button
              onClick={doFullRefresh}
              className="ml-auto inline-flex items-center gap-2 text-sm bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg border border-white/20"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <p className="text-sm sm:text-base text-indigo-100 mt-1">
            {isClassTeacher
              ? "Live view of your assigned classes, with today’s attendance and quick actions."
              : "See your classes & subjects, school communications, and upcoming events."}
          </p>
          {!!lastUpdated && (
            <div className="text-xs text-indigo-100 mt-1">Updated: {lastUpdated}</div>
          )}
        </div>
      </div>

      {/* Status / error */}
      {!!err && (
        <div className="mb-6 inline-flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <span>{err}</span>
        </div>
      )}

      {/* ===== Row 1: Subjects & Classes (FULL-WIDTH) ===== */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            <h3 className="font-semibold">Subjects & Classes</h3>
            <div className="ml-auto flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-100 border border-indigo-100 dark:border-indigo-800">
                {subjectTotals.classesCount} classes
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 dark:bg-gray-900/40 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                {subjectTotals.subjectsCount} subjects
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40">
            <input
              type="text"
              value={subq}
              onChange={(e) => setSubq(e.target.value)}
              placeholder="Search class or subject…"
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {/* Body */}
          <div className="p-4">
            {subjects.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                No subject assignments found.
              </div>
            ) : groupedSubjects.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">No matches.</div>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {groupedSubjects.map(({ classId, className, subjects }) => (
                  <li
                    key={classId}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {className}
                      </div>
                      <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-100 border border-indigo-100 dark:border-indigo-800">
                        {subjects.length} {subjects.length === 1 ? "subject" : "subjects"}
                      </span>
                    </div>

                    {/* subject chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {subjects.map((sName, idx) => (
                        <span
                          key={`${classId}-${idx}`}
                          className="text-[11px] px-2 py-1 rounded-full bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                          title={sName}
                        >
                          {sName}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ===== Row 2: Attendance Report (full-width) ===== */}
      {isClassTeacher && (
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold">Attendance Report — Today</h3>
              <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                Academic Year: {yearId ?? "—"} • Term: {termId ?? "—"} • Date: {todayISO()}
              </span>
            </div>

            {/* Summary chips */}
            <div className="px-4 pt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-3 text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">Overall Rate</div>
                <div className="text-lg font-semibold">{overallRate}%</div>
              </div>
              <div className="rounded-lg border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-3 text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">Present</div>
                <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {totals.present}
                </div>
              </div>
              <div className="rounded-lg border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-3 text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">Tardy</div>
                <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                  {totals.tardy}
                </div>
              </div>
              <div className="rounded-lg border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-3 text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">Absent</div>
                <div className="text-lg font-semibold text-rose-600 dark:text-rose-400">
                  {totals.absent}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="p-4">
              {attendanceRows.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  No attendance data for today.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                        <th className="py-2 pr-4">Class</th>
                        <th className="py-2 px-2 text-center">Present</th>
                        <th className="py-2 px-2 text-center">Tardy</th>
                        <th className="py-2 px-2 text-center">Absent</th>
                        <th className="py-2 px-2 text-center">Marked</th>
                        <th className="py-2 pl-2 text-right">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRows.map((r) => (
                        <tr
                          key={r.class_id}
                          className="border-b border-gray-100 dark:border-gray-800"
                        >
                          <td className="py-2 pr-4">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {r.class_name}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center text-emerald-600 dark:text-emerald-400">
                            {r.present}
                          </td>
                          <td className="py-2 px-2 text-center text-amber-600 dark:text-amber-400">
                            {r.tardy}
                          </td>
                          <td className="py-2 px-2 text-center text-rose-600 dark:text-rose-400">
                            {r.absent}
                          </td>
                          <td className="py-2 px-2 text-center">{r.total}</td>
                          <td className="py-2 pl-2 text-right font-semibold">
                            {r.rate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Row 3: Calendar (full-width, its own line) ===== */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold">School Events</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 rounded border text-sm"
                onClick={() =>
                  setCalMonth(
                    new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1)
                  )
                }
              >
                ‹ Prev
              </button>
              <div className="text-sm font-medium">
                {calMonth.toLocaleString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <button
                className="px-2 py-1 rounded border text-sm"
                onClick={() =>
                  setCalMonth(
                    new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1)
                  )
                }
              >
                Next ›
              </button>
            </div>
          </div>

          <BigCalendar monthStart={calMonth} events={events} />
        </div>
      </div>

      {/* ===== Row 4: Communications ===== */}
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
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300 mb-8">
          Loading…
        </div>
      ) : annErr ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm mb-8">
          {annErr}
        </div>
      ) : (showAll ? annAll : annToday).length === 0 ? (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300 mb-8">
          {showAll ? "No communications yet." : "No communications today."}
        </div>
      ) : (
        <ul className="space-y-4 mb-8">
          {(showAll ? annAll : annToday).map((m) => {
            const subject = m.subject ?? m.SUBJECT ?? "(No subject)";
            const body = (m.body ?? m.BODY ?? "").toString();
            const createdAt = m.created_at ?? m.CREATED_AT;
            return (
              <li
                key={
                  m.message_id ?? m.MESSAGE_ID ?? `${subject}-${createdAt}`
                }
                className="flex items-start space-x-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <div>
                  <Megaphone className="text-orange-500 h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">
                    {subject}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2">
                    {body}
                  </p>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 opacity-80">
                      <Inbox className="h-3.5 w-3.5" /> Dashboard
                    </span>
                    {String(m.has_email ?? m.HAS_EMAIL ?? "N").toUpperCase() ===
                      "Y" && (
                      <span className="inline-flex items-center gap-1 opacity-60">
                        <Mail className="h-3.5 w-3.5" /> Email
                      </span>
                    )}
                    {String(m.has_sms ?? m.HAS_SMS ?? "N").toUpperCase() ===
                      "Y" && (
                      <span className="inline-flex items-center gap-1 opacity-60">
                        <MessageSquare className="h-3.5 w-3.5" /> SMS
                      </span>
                    )}
                    <span className="ml-auto">{fmtWhen(createdAt)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardLayout>
  );
}

/* ------------ Calendar component (no external deps) ------------ */

function BigCalendar({ monthStart, events }) {
  // Build a simple month grid with leading/trailing days
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
        <div
          key={d}
          className="text-xs font-medium text-gray-600 dark:text-gray-300 px-2 py-1"
        >
          {d}
        </div>
      ))}
      {cells.map((c, idx) => (
        <div
          key={idx}
          className={`min-h-[92px] rounded-lg border p-2 overflow-hidden ${
            c.inMonth
              ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              : "bg-gray-50 dark:bg-gray-800/50 border-gray-200/60 dark:border-gray-700/60 opacity-70"
          }`}
        >
          <div className="flex items-center justify_between">
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
              <div className="text-[11px] text-gray-500">
                +{c.events.length - 3} more…
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
