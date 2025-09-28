// src/pages/AttendanceReportPage.js
import React, { useMemo, useState, useEffect } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
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
 * AttendanceReportPage (HeadTeacher)
 * Replaces MOCK_* with live ORDS endpoints:
 * - Classes:           student/get/classes/?p_school_id
 * - Roster (students): student/get/students/?p_school_id&p_class_id
 * - Attendance (day):  report/get/attendance/?p_school_id&p_class_id&p_date
 *
 * Notes:
 * - Date range fetch is N calls (one per day); capped (default 60 days) for UX.
 * - API returns status like 'PRESENT' / 'ABSENT' (and possibly 'TARDY').
 */

// ================= ORDS base + helpers (same style as AttendancePage.js) =================
const BASE =
  "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/";

const buildUrl = (path, params) => {
  const clean = String(path).replace(/^\/+/, "");
  const url = new URL(clean, BASE.replace(/\/+$/, "") + "/");
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  return url.toString();
};

// Endpoints reused from your other pages
const CLASSES_API = "student/get/classes/";     // ?p_school_id
const ROSTER_API = "student/get/students/";     // ?p_school_id&p_class_id
const DAILY_ATT_API = "report/get/attendance/"; // ?p_school_id&p_class_id&p_date

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

// ================= Page =================
const RANGE_MAX_DAYS = 60; // safety cap to avoid hammering the API

// Static until you wire year/term endpoints
const YEARS = ["2025/26", "2024/25"];
const TERMS = ["Term 1", "Term 2", "Term 3"];

export default function AttendanceReportPage() {
  // If you have AuthContext, replace SCHOOL_ID below with user.schoolId
  const SCHOOL_ID = 1;

  // LOV
  const [classes, setClasses] = useState([]); // [{class_id, class_name}]
  const [klass, setKlass] = useState("");     // selected class_id (string)
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesErr, setClassesErr] = useState("");

  // Year/Term (kept local; APIs not provided in this page)
  const [year, setYear] = useState(YEARS[0]);
  const [term, setTerm] = useState(TERMS[0]);

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

  // ========== JSON parser ==========
  const parseMaybeJson = async (response) => {
    const raw = await response.text();
    try {
      return { json: JSON.parse(raw), raw, ok: response.ok, status: response.status };
    } catch {
      return { json: null, raw, ok: response.ok, status: response.status };
    }
  };

  // ========== Load classes ==========
  const loadClasses = async () => {
    setClassesLoading(true); setClassesErr("");
    try {
      const url = buildUrl(CLASSES_API, { p_school_id: SCHOOL_ID });
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const { json, raw, ok, status } = await parseMaybeJson(res);
      if (!ok) {
        setClassesErr(`Failed to load classes (HTTP ${status}). ${String(raw).slice(0, 160)}`);
        setClasses([]);
        return;
      }
      const arr = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];
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
  };

  useEffect(() => { loadClasses(); /* eslint-disable-next-line */ }, []);

  // ========== Load roster for selected class ==========
  const loadRoster = async () => {
    if (!klass) { setRoster([]); return; }
    setRosterLoading(true);
    try {
      const url = buildUrl(ROSTER_API, { p_school_id: SCHOOL_ID, p_class_id: klass });
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const { json } = await parseMaybeJson(res);
      const items = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];
      const normalized = items.map(s => ({
        student_id: s.student_id ?? s.STUDENT_ID ?? s.id ?? s.ID ?? null,
        full_name: s.full_name ?? s.FULL_NAME ?? s.name ?? s.NAME ?? "",
      })).filter(s => s.full_name);
      setRoster(normalized);
    } catch {
      setRoster([]);
    } finally {
      setRosterLoading(false);
    }
  };

  useEffect(() => { loadRoster(); /* eslint-disable-next-line */ }, [klass]);

  // ========== Load attendance for each day in range ==========
  const loadAttendanceRange = async () => {
    setErr(""); setDaily([]); setRangeWarn("");
    if (!klass) return;

    // Cap the range
    const dates = listDatesInclusive(from, to);
    if (!dates.length) { setDaily([]); return; }
    if (dates.length > RANGE_MAX_DAYS) {
      setRangeWarn(`Range too large (${dates.length} days). Fetching the last ${RANGE_MAX_DAYS} days only.`);
    }
    const effectiveDates = dates.slice(-RANGE_MAX_DAYS);

    setLoadingReport(true);
    try {
      const fetchOne = async (d) => {
        const url = buildUrl(DAILY_ATT_API, {
          p_school_id: SCHOOL_ID,
          p_class_id: klass,
          p_date: d,
        });
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const { json } = await parseMaybeJson(res);
        const items = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];
        // normalize per item
        const norm = items.map(r => ({
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

  // ========== Aggregate ==========

  // Flatten all records with date stamp
  const allRecords = useMemo(() => {
    const out = [];
    for (const day of daily) {
      for (const it of day.items) {
        out.push({ ...it, date: day.date });
      }
    }
    return out;
  }, [daily]);

  // Build map by date for trend
  const dailyMap = useMemo(() => {
    const map = {};
    for (const d of daily) {
      const P = d.items.filter(i => i.status === "PRESENT").length;
      const A = d.items.filter(i => i.status === "ABSENT").length;
      const T = d.items.filter(i => i.status === "TARDY").length;
      map[d.date] = { P, A, T };
    }
    // expand to include empty days in range for consistent bars
    const days = [];
    for (let d = from; d <= to; d = addDaysISO(d, 1)) {
      const row = map[d] || { P: 0, A: 0, T: 0 };
      days.push({ date: d, present: row.P, absent: row.A, tardy: row.T });
      if (d === to) break;
    }
    return days;
  }, [daily, from, to]);

  const spark = sparkline(dailyMap.map(d => d.present));

  // Aggregate per student using roster as the base
  const studentsAgg = useMemo(() => {
    const baseMap = new Map();
    // Start with roster if available
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

    // Also include any students found in attendance even if not in roster
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
      else obj.absent += 1; // treat unknown as absent
      obj.days += 1; // days with a recorded mark
    }

    // finalize rate
    return [...baseMap.values()].map(v => ({
      ...v,
      rate: v.days ? Math.round((v.present / v.days) * 1000) / 10 : 0,
    }));
  }, [roster, allRecords]);

  // Totals / KPIs
  const totals = useMemo(() => {
    const present = allRecords.filter(r => r.status === "PRESENT").length;
    const absent = allRecords.filter(r => r.status === "ABSENT").length;
    const tardy = allRecords.filter(r => r.status === "TARDY").length;
    const sessions = allRecords.length;
    const rate = pct(present, sessions);
    return { present, absent, tardy, sessions, rate };
  }, [allRecords]);

  // Filter + sort table rows
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

  // Quick range helpers
  const setRange = (days) => {
    setFrom(addDaysISO(to, -days + 1));
  };

  // Export CSV
  const exportCSV = () => {
    const cls = classes.find(c => String(c.class_id) === String(klass));
    const clsName = (cls?.class_name || `Class-${klass}`).replace(/[\\/:*?"<>|]/g, "-");
    const header = "StudentID,StudentName,Present,Absent,Tardy,Days,AttendanceRate%\n";
    const lines = rows
      .map(r => `${r.id},${r.name},${r.present},${r.absent},${r.tardy},${r.days},${r.rate}`)
      .join("\n");
    downloadText(`${clsName}_Attendance_${from}_to_${to}.csv`, header + lines, "text/csv");
  };

  // Print
  const doPrint = () => window.print();

  // UI labels
  const classOptions = classes.map(c => ({ label: c.class_name, value: String(c.class_id) }));

  return (
    <DashboardLayout
      title="Attendance Report"
      subtitle=""
    >
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4 mb-6">
        <div className="grid lg:grid-cols-12 gap-3">
          <Select label="Year" value={year} onChange={setYear} options={YEARS} className="lg:col-span-2" />
          <Select label="Term" value={term} onChange={setTerm} options={TERMS} className="lg:col-span-2" />

          {/* Class from API */}
          <label className="text-sm grid gap-1 lg:col-span-2">
            <span className="text-gray-700 dark:text-gray-300">Class</span>
            <select
              className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
              value={klass}
              onChange={(e) => setKlass(e.target.value)}
              disabled={classesLoading || classes.length === 0}
            >
              {classesLoading ? (
                <option>Loading classes…</option>
              ) : classes.length ? (
                classOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)
              ) : (
                <option>No classes found</option>
              )}
            </select>
            {classesErr && <div className="text-xs text-rose-600 mt-1">{classesErr}</div>}
          </label>

          <DateInput label="From" value={from} onChange={setFrom} className="lg:col-span-3" />
          <DateInput label="To" value={to} onChange={(v) => setTo(v > todayISO() ? todayISO() : v)} className="lg:col-span-3" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Quick ranges:
          </span>
          <QuickButton onClick={() => setRange(7)} label="Last 7 days" />
          <QuickButton onClick={() => setRange(14)} label="Last 14 days" />
          <QuickButton onClick={() => setRange(30)} label="Last 30 days" />
          <div className="ml-auto flex gap-2">
            <button onClick={exportCSV} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button onClick={doPrint} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        {!!rangeWarn && (
          <div className="mt-3 inline-flex items-center gap-2 text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-200 px-3 py-2 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4" /> {rangeWarn}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={<TrendingUp className="h-6 w-6 text-indigo-600" />}
          label="Attendance Rate"
          value={`${totals.rate}%`}
          sub={`${totals.sessions} attendance marks`}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" />}
          label="Present"
          value={totals.present}
          barValue={pct(totals.present, totals.sessions)}
        />
        <KpiCard
          icon={<XCircle className="h-6 w-6 text-rose-600" />}
          label="Absent"
          value={totals.absent}
          barValue={pct(totals.absent, totals.sessions)}
        />
        <KpiCard
          icon={<Clock className="h-6 w-6 text-amber-600" />}
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
        <div className="p-4 border-b dark:border-gray-700 flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-500" />
          <div className="font-semibold">Students</div>

          <div className="ml-auto relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 pr-3 py-2 w-72 border rounded-lg bg-white dark:bg-gray-900 text-sm"
              placeholder="Search by name or ID"
            />
          </div>
        </div>

        {/* Status / alerts */}
        <div className="px-4 pt-4">
          {err && (
            <div className="mb-4 flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
              <span className="text-sm">{err}</span>
            </div>
          )}
          {!err && (classesLoading || rosterLoading || loadingReport) && (
            <div className="mb-3 p-3 rounded border bg-gray-50 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
              Loading…
            </div>
          )}
          {!err && !loadingReport && rows.length === 0 && (
            <div className="p-3 rounded border bg-gray-50 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
              No attendance records match your filters.
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <div className="overflow-x-auto p-4">
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
                  <tr key={s.id} className="border-b last:border-0 dark:border-gray-700">
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
