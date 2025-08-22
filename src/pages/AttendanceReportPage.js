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
} from "lucide-react";

/**
 * AttendanceReportPage (HeadTeacher)
 * - Replace MOCK_* with API calls later (fetch by class/term/date range).
 * - Uses Tailwind, no external chart libs (sparkline & bars are CSS).
 */

// --- Mock Data (swap with backend) ---
const YEARS = ["2025/26", "2024/25"];
const TERMS = ["Term 1", "Term 2", "Term 3"];
const CLASSES = ["P4", "P5", "JHS 2", "JHS 3"];

const MOCK_CLASS_ROSTER = {
  "P4": [
    { id: "STU001", name: "Ama Boateng" },
    { id: "STU002", name: "Kojo Mensah" },
    { id: "STU003", name: "Akua Owusu" },
  ],
  "P5": [
    { id: "STU101", name: "Yaw Mensah" },
    { id: "STU102", name: "Afia Serwaa" },
  ],
  "JHS 2": [
    { id: "STU201", name: "Kofi Adjei" },
    { id: "STU202", name: "Esi Appiah" },
    { id: "STU203", name: "Kwame Owusu" },
    { id: "STU204", name: "Abena Gifty" },
  ],
  "JHS 3": [],
};

// Attendance records per day (P=Present, A=Absent, T=Tardy)
const MOCK_ATTENDANCE = [
  // class, studentId, date(YYYY-MM-DD), status
  { className: "P4", studentId: "STU001", date: "2025-01-10", status: "P" },
  { className: "P4", studentId: "STU002", date: "2025-01-10", status: "A" },
  { className: "P4", studentId: "STU003", date: "2025-01-10", status: "P" },
  { className: "P4", studentId: "STU001", date: "2025-01-11", status: "P" },
  { className: "P4", studentId: "STU002", date: "2025-01-11", status: "T" },
  { className: "P4", studentId: "STU003", date: "2025-01-11", status: "P" },
  // Another class
  { className: "JHS 2", studentId: "STU201", date: "2025-01-10", status: "P" },
  { className: "JHS 2", studentId: "STU202", date: "2025-01-10", status: "P" },
  { className: "JHS 2", studentId: "STU203", date: "2025-01-10", status: "T" },
  { className: "JHS 2", studentId: "STU204", date: "2025-01-10", status: "A" },
  { className: "JHS 2", studentId: "STU201", date: "2025-01-11", status: "P" },
  { className: "JHS 2", studentId: "STU202", date: "2025-01-11", status: "P" },
  { className: "JHS 2", studentId: "STU203", date: "2025-01-11", status: "P" },
  { className: "JHS 2", studentId: "STU204", date: "2025-01-11", status: "P" },
];

// --- Helpers ---
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (iso, days) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const within = (date, from, to) => (!from || date >= from) && (!to || date <= to);

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 1000) / 10; // 1 decimal place
}

function sparkline(points = []) {
  // returns normalized array between 0..1 for min/max, safe for CSS heights
  if (!points.length) return [];
  const min = Math.min(...points);
  const max = Math.max(...points);
  if (min === max) return points.map(() => 0.6);
  return points.map((v) => (v - min) / (max - min));
}

// --- Page ---
export default function AttendanceReportPage() {
  const [year, setYear] = useState(YEARS[0]);
  const [term, setTerm] = useState(TERMS[0]);
  const [klass, setKlass] = useState(CLASSES[0]);

  // Default range: last 14 days
  const [from, setFrom] = useState(addDaysISO(todayISO(), -14));
  const [to, setTo] = useState(todayISO());
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("name"); // name | present | absent | tardy | rate
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

  // Derived: current class roster and attendance slice
  const roster = useMemo(() => MOCK_CLASS_ROSTER[klass] || [], [klass]);

  const classRecords = useMemo(
    () => MOCK_ATTENDANCE.filter(r => r.className === klass && within(r.date, from, to)),
    [klass, from, to]
  );

  // Aggregate per student
  const studentsAgg = useMemo(() => {
    const byStu = new Map();
    roster.forEach(s => byStu.set(s.id, { ...s, present: 0, absent: 0, tardy: 0, days: 0 }));
    classRecords.forEach(r => {
      if (!byStu.has(r.studentId)) return;
      const rec = byStu.get(r.studentId);
      rec.days += 1;
      if (r.status === "P") rec.present += 1;
      else if (r.status === "A") rec.absent += 1;
      else if (r.status === "T") rec.tardy += 1;
      byStu.set(r.studentId, rec);
    });
    // compute rate
    return [...byStu.values()].map(v => ({
      ...v,
      rate: v.days ? Math.round((v.present / v.days) * 1000) / 10 : 0, // 1 dp
    }));
  }, [roster, classRecords]);

  // Totals / KPIs
  const totals = useMemo(() => {
    const present = classRecords.filter(r => r.status === "P").length;
    const absent = classRecords.filter(r => r.status === "A").length;
    const tardy = classRecords.filter(r => r.status === "T").length;
    const sessions = classRecords.length;
    const rate = pct(present, sessions);
    return { present, absent, tardy, sessions, rate };
  }, [classRecords]);

  // Daily trend for sparkline (present count per day)
  const dailyMap = useMemo(() => {
    const map = {};
    classRecords.forEach(r => {
      map[r.date] = map[r.date] || { P: 0, A: 0, T: 0 };
      map[r.date][r.status] += 1;
    });
    const days = [];
    for (let d = from; d <= to; d = addDaysISO(d, 1)) {
      const row = map[d] || { P: 0, A: 0, T: 0 };
      days.push({ date: d, present: row.P, absent: row.A, tardy: row.T });
      if (d === to) break;
    }
    return days;
  }, [classRecords, from, to]);
  const spark = sparkline(dailyMap.map(d => d.present));

  // Filter + sort table rows
  const rows = useMemo(() => {
    const termQ = q.trim().toLowerCase();
    const base = studentsAgg.filter(s =>
      !termQ ||
      s.name.toLowerCase().includes(termQ) ||
      s.id.toLowerCase().includes(termQ)
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
    const header = "StudentID,StudentName,Present,Absent,Tardy,Days,AttendanceRate%\n";
    const lines = rows
      .map(r => `${r.id},${r.name},${r.present},${r.absent},${r.tardy},${r.days},${r.rate}`)
      .join("\n");
    downloadText(`${klass}_Attendance_${from}_to_${to}.csv`, header + lines, "text/csv");
  };

  // Print
  const doPrint = () => window.print();

  // Keep ESLint happy about window.* being explicit
  useEffect(() => {}, []);

  return (
    <DashboardLayout
      title="Attendance Report"
      subtitle="Analyze attendance patterns and spot issues early"
    >
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4 mb-6">
        <div className="grid lg:grid-cols-12 gap-3">
          <Select label="Year" value={year} onChange={setYear} options={YEARS} className="lg:col-span-2" />
          <Select label="Term" value={term} onChange={setTerm} options={TERMS} className="lg:col-span-2" />
          <Select label="Class" value={klass} onChange={setKlass} options={CLASSES} className="lg:col-span-2" />

          <DateInput label="From" value={from} onChange={setFrom} className="lg:col-span-3" />
          <DateInput label="To" value={to} onChange={setTo} className="lg:col-span-3" />
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
            <Snapshot label="Students" value={roster.length} />
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

        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
                <Th label="Student" sortKey="name" sortKeyState={sortKey} sortDir={sortDir} setSortKey={setSortKey} setSortDir={setSortDir} />
                <th className="py-2">ID</th>
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
                  <td className="py-2">{s.id}</td>
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
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500 dark:text-gray-400">
                    No students match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
  const opts = Array.isArray(options) && typeof options[0] === "object" ? options : options.map(o => ({ label: o, value: o }));
  return (
    <label className={`text-sm grid gap-1 ${className}`}>
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <select
        className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {opts.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
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
