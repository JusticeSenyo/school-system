// src/pages/AttendanceReportPage.js
import React, { useMemo, useState, useEffect } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { useAuth } from "../AuthContext";
import {
  CalendarDays,
  Download,
  Filter,
  Printer,
  Search,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

/**
 * AttendanceReportPage (HeadTeacher) — RANGE VIEW
 * Endpoints used (aligned with FeesReportPage):
 * - Classes:        academic/get/classes/?p_school_id
 * - Years:          academic/get/academic_year/?p_school_id
 * - Terms:          academic/get/term/?p_school_id
 * - Roster:         student/get/students/?p_school_id&p_class_id
 * - Attendance:     report/get/attendance/?p_school_id&p_class_id&p_academic_year&p_term&p_date
 */

const HOST = "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

// Endpoints (match FeesReportPage)
const ACADEMIC_CLASSES_API = `${HOST}/academic/get/classes/`;        // ?p_school_id
const ACADEMIC_YEAR_API    = `${HOST}/academic/get/academic_year/`;  // ?p_school_id
const ACADEMIC_TERM_API    = `${HOST}/academic/get/term/`;           // ?p_school_id

// Other endpoints
const ROSTER_API     = `${HOST}/student/get/students/`;              // ?p_school_id&p_class_id
const DAILY_ATT_API  = `${HOST}/report/get/attendance/`;             // ?p_school_id&p_class_id&p_academic_year&p_term&p_date

// ===== utils (same spirit as FeesReportPage) =====
const jtxt = async (u) => {
  const r = await fetch(u, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.text()).trim();
};
const jarr = async (u) => {
  const t = await jtxt(u);
  if (!t) return [];
  try {
    const d = JSON.parse(t);
    return Array.isArray(d) ? d : (Array.isArray(d.items) ? d.items : []);
  } catch {
    return [];
  }
};

// ================= Local helpers =================
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (iso, days) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 1000) / 10; // 1 decimal place
}

function sparkline(points = []) {
  if (!points.length) return [];
  const min = Math.min(...points);
  const max = Math.max(...points);
  if (min === max) return points.map(() => 0.6);
  return points.map((v) => (v - min) / (max - min));
}

const listDatesInclusive = (from, to) => {
  if (!from || !to) return [];
  const start = new Date(from);
  const end = new Date(to);
  if (isNaN(start) || isNaN(end) || start > end) return [];
  const out = [];
  let d = new Date(start);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
};

const RANGE_MAX_DAYS = 60; // safety cap

export default function AttendanceReportPage() {
  const { user } = useAuth() || {};
  const SCHOOL_ID =
    user?.schoolId ?? user?.school_id ?? user?.school?.id ?? user?.SCHOOL_ID ?? null;

  // LOV - classes
  const [classes, setClasses] = useState([]); // [{class_id, class_name}]
  const [klass, setKlass] = useState("");     // selected class_id (string)
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesErr, setClassesErr] = useState("");

  // Year/Term from APIs (show names, pass IDs)
  const [years, setYears] = useState([]); // [{id,name,status}]
  const [terms, setTerms] = useState([]); // [{id,name,status}]
  const [yearId, setYearId] = useState("");   // academic_year_id
  const [termId, setTermId] = useState("");   // term_id
  const [ytErr, setYtErr] = useState("");
  const [ytLoading, setYtLoading] = useState(false);

  // Date range
  const [from, setFrom] = useState(addDaysISO(todayISO(), -14));
  const [to, setTo] = useState(todayISO());
  const [rangeWarn, setRangeWarn] = useState("");

  // Roster (for chosen class)
  const [roster, setRoster] = useState([]); // [{ student_id, full_name }]
  const [rosterLoading, setRosterLoading] = useState(false);

  // Attendance (range fetch -> aggregate)
  const [loadingReport, setLoadingReport] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("name"); // name | present | absent | tardy | rate
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

  // Raw daily fetch results: [{date, items:[{full_name,status,student_id?}]}]
  const [daily, setDaily] = useState([]);

  // ========== Load classes (use academic/get/classes like FeesReportPage) ==========
  useEffect(() => {
    if (!SCHOOL_ID) return;
    (async () => {
      setClassesLoading(true); setClassesErr("");
      try {
        const url = `${ACADEMIC_CLASSES_API}?p_school_id=${encodeURIComponent(SCHOOL_ID)}`;
        const arr = await jarr(url);
        const all = (arr || [])
          .map(c => ({
            class_id: c.class_id ?? c.CLASS_ID ?? c.id ?? c.ID,
            class_name: c.class_name ?? c.CLASS_NAME ?? c.name ?? c.NAME
          }))
          .filter(c => c.class_id != null && c.class_name);
        setClasses(all);
        if (!klass && all.length) setKlass(String(all[0].class_id));
      } catch (e) {
        setClassesErr(`Failed to load classes. ${e?.message || e}`);
        setClasses([]);
      } finally {
        setClassesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SCHOOL_ID]);

  // ========== Load Years & Terms (match FeesReportPage endpoints) ==========
  useEffect(() => {
    if (!SCHOOL_ID) return;
    (async () => {
      setYtErr(""); setYtLoading(true);
      try {
        // Years
        const yUrl = `${ACADEMIC_YEAR_API}?p_school_id=${encodeURIComponent(SCHOOL_ID)}`;
        const yArr = await jarr(yUrl);
        const yNorm = (yArr || []).map(y => ({
          id: y.academic_year_id ?? y.ACADEMIC_YEAR_ID,
          name: y.academic_year_name ?? y.ACADEMIC_YEAR_NAME,
          status: y.status ?? y.STATUS ?? null,
        })).filter(x => x.id != null && x.name);
        setYears(yNorm);
        const yDefault = yNorm.find(x => String(x.status).toUpperCase() === "CURRENT") || yNorm[0];
        if (!yearId && yDefault) setYearId(String(yDefault.id));

        // Terms
        const tUrl = `${ACADEMIC_TERM_API}?p_school_id=${encodeURIComponent(SCHOOL_ID)}`;
        const tArr = await jarr(tUrl);
        const tNorm = (tArr || []).map(t => ({
          id: t.term_id ?? t.TERM_ID,
          name: t.term_name ?? t.TERM_NAME,
          status: t.status ?? t.STATUS ?? null,
        })).filter(x => x.id != null && x.name);
        setTerms(tNorm);
        const tDefault = tNorm.find(x => String(x.status).toUpperCase() === "CURRENT") || tNorm[0];
        if (!termId && tDefault) setTermId(String(tDefault.id));
      } catch (e) {
        setYtErr(e?.message || "Failed to load academic years/terms");
      } finally {
        setYtLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SCHOOL_ID]);

  // ========== Load roster for selected class ==========
  useEffect(() => {
    if (!SCHOOL_ID || !klass) { setRoster([]); return; }
    (async () => {
      setRosterLoading(true);
      try {
        const url = `${ROSTER_API}?p_school_id=${encodeURIComponent(SCHOOL_ID)}&p_class_id=${encodeURIComponent(klass)}`;
        const arr = await jarr(url);
        const normalized = (arr || []).map(s => ({
          student_id: s.student_id ?? s.STUDENT_ID ?? s.id ?? s.ID ?? null,
          full_name: s.full_name ?? s.FULL_NAME ?? s.name ?? s.NAME ?? "",
        })).filter(s => s.full_name);
        setRoster(normalized);
      } catch {
        setRoster([]);
      } finally {
        setRosterLoading(false);
      }
    })();
  }, [SCHOOL_ID, klass]);

  // ========== Load attendance for each day in range ==========
  const loadAttendanceRange = async () => {
    setErr(""); setDaily([]); setRangeWarn("");
    if (!SCHOOL_ID || !klass || !yearId || !termId) return;

    const dates = listDatesInclusive(from, to);
    if (!dates.length) { setDaily([]); return; }
    if (dates.length > RANGE_MAX_DAYS) {
      setRangeWarn(`Range too large (${dates.length} days). Fetching the last ${RANGE_MAX_DAYS} days only.`);
    }
    const effectiveDates = dates.slice(-RANGE_MAX_DAYS);

    setLoadingReport(true);
    try {
      const fetchOne = async (d) => {
        const url = `${DAILY_ATT_API}?p_school_id=${encodeURIComponent(SCHOOL_ID)}&p_class_id=${encodeURIComponent(klass)}&p_academic_year=${encodeURIComponent(yearId)}&p_term=${encodeURIComponent(termId)}&p_date=${encodeURIComponent(d)}`;
        const arr = await jarr(url);
        const norm = (arr || []).map(r => ({
          student_id: r.student_id ?? r.STUDENT_ID ?? null,
          full_name: r.full_name ?? r.FULL_NAME ?? "",
          status: String(r.status ?? r.STATUS ?? "").toUpperCase() || "ABSENT",
        }));
        return { date: d, items: norm };
      };

      const results = await Promise.all(effectiveDates.map(fetchOne));
      setDaily(results);
    } catch (e) {
      setErr(e?.message || "Failed to load attendance.");
      setDaily([]);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => { loadAttendanceRange(); /* eslint-disable-next-line */ }, [klass, from, to]);
  useEffect(() => { loadAttendanceRange(); /* eslint-disable-next-line */ }, [yearId, termId]);

  // ========== Aggregate ==========
  const allRecords = useMemo(() => {
    const out = [];
    for (const day of daily) {
      for (const it of day.items) out.push({ ...it, date: day.date });
    }
    return out;
  }, [daily]);

  const dailyMap = useMemo(() => {
    const map = {};
    for (const d of daily) {
      const P = d.items.filter(i => i.status === "PRESENT").length;
      const A = d.items.filter(i => i.status === "ABSENT").length;
      const T = d.items.filter(i => i.status === "TARDY").length;
      map[d.date] = { P, A, T };
    }
    const days = [];
    for (let d = from; d <= to; d = addDaysISO(d, 1)) {
      const row = map[d] || { P: 0, A: 0, T: 0 };
      days.push({ date: d, present: row.P, absent: row.A, tardy: row.T });
      if (d === to) break;
    }
    return days;
  }, [daily, from, to]);

  const spark = sparkline(dailyMap.map(d => d.present));

  const studentsAgg = useMemo(() => {
    const baseMap = new Map();
    roster.forEach(s => {
      const key = s.student_id ? String(s.student_id) : s.full_name;
      baseMap.set(key, {
        id: key,
        name: s.full_name || `Student ${key}`,
        present: 0,
        absent: 0,
        tardy: 0,
        days: 0,
      });
    });
    for (const rec of allRecords) {
      const key = rec.student_id ? String(rec.student_id) : rec.full_name || "unknown";
      if (!baseMap.has(key)) {
        baseMap.set(key, {
          id: key,
          name: rec.full_name || `Student ${key}`,
          present: 0,
          absent: 0,
          tardy: 0,
          days: 0,
        });
      }
      const obj = baseMap.get(key);
      if (rec.status === "PRESENT") obj.present += 1;
      else if (rec.status === "TARDY") obj.tardy += 1;
      else obj.absent += 1;
      obj.days += 1;
    }
    return [...baseMap.values()].map(v => ({
      ...v,
      rate: v.days ? Math.round((v.present / v.days) * 1000) / 10 : 0,
    }));
  }, [roster, allRecords]);

  const totals = useMemo(() => {
    const present = allRecords.filter(r => r.status === "PRESENT").length;
    const absent = allRecords.filter(r => r.status === "ABSENT").length;
    const tardy = allRecords.filter(r => r.status === "TARDY").length;
    const sessions = allRecords.length;
    const rate = pct(present, sessions);
    return { present, absent, tardy, sessions, rate };
  }, [allRecords]);

  const rows = useMemo(() => {
    const termQ = q.trim().toLowerCase();
    const base = studentsAgg.filter(s =>
      !termQ ||
      s.name.toLowerCase().includes(termQ) ||
      String(s.id).toLowerCase().includes(termQ)
    );
    const compare = (a, b, key) => {
      if (key === "name") return a.name.localeCompare(b.name);
      return (a[key] ?? 0) - (b[key] ?? 0);
    };
    const sorted = base.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      return compare(a, b, sortKey) * dir;
    });
    return sorted;
  }, [studentsAgg, q, sortKey, sortDir]);

  const setRange = (days) => {
    setFrom(addDaysISO(to, -days + 1));
  };

  const exportCSV = () => {
    const cls = classes.find(c => String(c.class_id) === String(klass));
    const clsName = (cls?.class_name || `Class-${klass}`).replace(/[\\/:*?"<>|]/g, "-");
    const yName = years.find(y => String(y.id) === String(yearId))?.name || yearId;
    const tName = terms.find(t => String(t.id) === String(termId))?.name || termId;
    const header = "StudentID,StudentName,Present,Absent,Tardy,Days,AttendanceRate%\n";
    const lines = rows
      .map(r => `${r.id},${r.name},${r.present},${r.absent},${r.tardy},${r.days},${r.rate}`)
      .join("\n");
    downloadText(`${clsName}_Attendance_${yName}_${tName}_${from}_to_${to}.csv`, header + lines, "text/csv");
  };

  const doPrint = () => window.print();

  const classOptions = classes.map(c => ({ label: c.class_name, value: String(c.class_id) }));

  return (
    <DashboardLayout title="Attendance Report" subtitle="">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4 sm:p-6 mb-6">
        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
          <Select
            label="Academic Year"
            value={yearId}
            onChange={setYearId}
            options={years.map(y => ({ label: y.name + (String(y.status).toUpperCase() === "CURRENT" ? " (CURRENT)" : ""), value: String(y.id) }))}
            className="lg:col-span-2"
          />
          <Select
            label="Term"
            value={termId}
            onChange={setTermId}
            options={terms.map(t => ({ label: t.name + (String(t.status).toUpperCase() === "CURRENT" ? " (CURRENT)" : ""), value: String(t.id) }))}
            className="lg:col-span-2"
          />
          {/* Class from API */}
          <label className="text-sm grid gap-1 lg:col-span-2">
            <span className="text-gray-700 dark:text-gray-300">Class</span>
            <select
              className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
              value={klass}
              onChange={(e) => setKlass(e.target.value)}
              disabled={!SCHOOL_ID || classesLoading || classes.length === 0}
            >
              {classesLoading ? (
                <option>Loading classes…</option>
              ) : classes.length ? (
                classOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)
              ) : (
                <option>No classes found</option>
              )}
            </select>
            {(classesErr || ytErr) && <div className="text-xs text-rose-600 mt-1">{classesErr || ytErr}</div>}
          </label>
          <DateInput label="From" value={from} onChange={setFrom} className="lg:col-span-3" />
          <DateInput label="To" value={to} onChange={(v) => setTo(v > todayISO() ? todayISO() : v)} className="lg:col-span-3" />
        </div>

        {/* Quick Ranges and Actions */}
        <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Quick Ranges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Quick ranges:</span>
              <span className="sm:hidden">Quick:</span>
            </span>
            <QuickButton onClick={() => setRange(7)} label="Last 7 days" />
            <QuickButton onClick={() => setRange(14)} label="Last 14 days" />
            <QuickButton onClick={() => setRange(30)} label="Last 30 days" />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
            <button
              onClick={exportCSV}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
            <button
              onClick={doPrint}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
              <span className="sm:hidden">Print</span>
            </button>
          </div>
        </div>

        {/* Warning Message */}
        {!!rangeWarn && (
          <div className="mt-3 inline-flex items-start sm:items-center gap-2 text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-200 px-3 py-2 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 sm:mt-0" />
            <span>{rangeWarn}</span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KpiCard
          icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />}
          label="Attendance Rate"
          value={`${totals.rate}%`}
          sub={`${totals.sessions} attendance marks`}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />}
          label="Present"
          value={totals.present}
          barValue={pct(totals.present, totals.sessions)}
        />
        <KpiCard
          icon={<XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-rose-600" />}
          label="Absent"
          value={totals.absent}
          barValue={pct(totals.absent, totals.sessions)}
        />
        <KpiCard
          icon={<Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />}
          label="Tardy"
          value={totals.tardy}
          barValue={pct(totals.tardy, totals.sessions)}
        />
      </div>

      {/* Trend & class breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="h-4 w-4 text-indigo-500" />
            <h3 className="font-semibold">Present Trend</h3>
          </div>
          {dailyMap.length ? (
            <div className="h-24 flex items-end gap-1">
              {spark.map((norm, idx) => (
                <div
                  key={idx}
                  className="w-2 bg-indigo-500/70 rounded-sm"
                  style={{ height: `${Math.max(8, Math.round(norm * 100))}%` }}
                  title={`${dailyMap[idx].date}: ${dailyMap[idx].present} present`}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">No data in selected range.</div>
          )}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {from} to {to}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-indigo-500" />
            <h3 className="font-semibold">Class Snapshot</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Snapshot label="Students" value={roster.length || "—"} />
            <Snapshot label="Days in Range" value={dailyMap.length} />
            <Snapshot label="Marks Total" value={totals.sessions} />
          </div>
          <div className="mt-4">
            <Bar label="Present" percent={pct(totals.present, totals.sessions)} color="bg-emerald-500" />
            <Bar label="Absent" percent={pct(totals.absent, totals.sessions)} color="bg-rose-500" />
            <Bar label="Tardy" percent={pct(totals.tardy, totals.sessions)} color="bg-amber-500" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            <div className="font-semibold">Students</div>
          </div>
          <div className="relative w-full sm:w-auto sm:ml-auto">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 pr-3 py-2 w-full sm:w-72 border rounded-lg bg-white dark:bg-gray-900 text-sm"
              placeholder="Search by name or ID"
            />
          </div>
        </div>

        {/* Status / alerts */}
        <div className="px-4 pt-4">
          {err && (
            <div className="mb-4 flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm">
              <span>{err}</span>
            </div>
          )}
          {!err && (classesLoading || rosterLoading || loadingReport || ytLoading) && (
            <div className="mb-3 p-3 rounded border bg-gray-50 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 text-sm">
              Loading…
            </div>
          )}
          {!err && !loadingReport && rows.length === 0 && (
            <div className="p-3 rounded border bg-gray-50 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 text-sm">
              No attendance records match your filters.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        {rows.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
                    <Th label="Student" sortKey="name" sortKeyState={sortKey} sortDir={sortDir} setSortKey={setSortKey} setSortDir={setSortDir} />
                    <Th label="Present" sortKey="present" sortKeyState={sortKey} sortDir={sortDir} setSortKey={setSortKey} setSortDir={setSortDir} />
                    <Th label="Absent" sortKey="absent" sortKeyState={sortKey} sortDir={sortDir} setSortKey={setSortKey} setSortDir={setSortDir} />
                    <Th label="Tardy" sortKey="tardy" sortKeyState={sortKey} sortDir={sortDir} setSortKey={setSortKey} setSortDir={setSortDir} />
                    <Th label="Rate %" sortKey="rate" sortKeyState={sortKey} sortDir={sortDir} setSortKey={setSortKey} setSortDir={setSortDir} />
                    <th className="py-2 w-40">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="py-2">{s.name}</td>
                      <td className="py-2">{s.present}</td>
                      <td className="py-2">{s.absent}</td>
                      <td className="py-2">{s.tardy}</td>
                      <td className="py-2">{s.rate}</td>
                      <td className="py-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2 overflow-hidden">
                          <div
                            className={`h-2 ${s.rate >= 95 ? "bg-emerald-500" : s.rate >= 85 ? "bg-amber-500" : "bg-rose-500"}`}
                            style={{ width: `${Math.min(100, s.rate)}%` }}
                            title={`${s.rate}%`}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden px-4 pb-4 space-y-3">
              {rows.map((s) => (
                <div
                  key={s.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900"
                >
                  {/* Student Name */}
                  <div className="font-semibold text-base text-gray-900 dark:text-white mb-3">
                    {s.name}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Present</div>
                      <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{s.present}</div>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Absent</div>
                      <div className="text-lg font-semibold text-rose-600 dark:text-rose-400">{s.absent}</div>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Tardy</div>
                      <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">{s.tardy}</div>
                    </div>
                  </div>

                  {/* Attendance Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Attendance Rate</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{s.rate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 transition-all ${s.rate >= 95 ? "bg-emerald-500" : s.rate >= 85 ? "bg-amber-500" : "bg-rose-500"}`}
                        style={{ width: `${Math.min(100, s.rate)}%` }}
                        title={`${s.rate}%`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          button, input, select { display: none !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}

/* ------------ Reusable bits ------------ */

function KpiCard({ icon, label, value, sub, barValue }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-300">{label}</div>
        {icon}
      </div>
      <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{value}</div>
      {sub && <div className="text-xs text-gray-500 dark:text-gray-400">{sub}</div>}
      {typeof barValue === "number" && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2 overflow-hidden">
            <div className="h-2 bg-indigo-500" style={{ width: `${Math.min(100, barValue)}%` }} />
          </div>
          <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">{barValue}%</div>
        </div>
      )}
    </div>
  );
}

function Snapshot({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900">
      <div className="text-sm text-gray-600 dark:text-gray-300">{label}</div>
      <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}

function Bar({ label, percent, color }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-500 dark:text-gray-400">{percent}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2 overflow-hidden">
        <div className={`h-2 ${color}`} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
    </div>
  );
}

function Th({ label, sortKey, sortKeyState, sortDir, setSortKey, setSortDir }) {
  const active = sortKeyState === sortKey;
  const nextDir = active && sortDir === "desc" ? "asc" : "desc";
  return (
    <th className="py-2">
      <button
        type="button"
        onClick={() => {
          setSortKey(sortKey);
          setSortDir(nextDir);
        }}
        className={`inline-flex items-center gap-1 ${active ? "text-indigo-600" : "text-gray-700 dark:text-gray-300"}`}
        title={`Sort by ${label}`}
      >
        {label}
        {active ? (sortDir === "desc" ? "▾" : "▴") : ""}
      </button>
    </th>
  );
}

function Select({ label, value, onChange, options, className = "" }) {
  const opts =
    Array.isArray(options) && typeof options[0] === "object"
      ? options
      : options.map((o) => ({ label: o, value: o }));
  return (
    <label className={`text-sm grid gap-1 ${className}`}>
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <select
        className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateInput({ label, value, onChange, className = "" }) {
  return (
    <label className={`text-sm grid gap-1 ${className}`}>
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
      />
    </label>
  );
}

function QuickButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      {label}
    </button>
  );
}

function downloadText(filename, content, mime) {
  const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
