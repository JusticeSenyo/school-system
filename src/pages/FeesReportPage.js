import React, { useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import {
  Search, CalendarDays, DownloadCloud, Filter, ArrowUpRight,
  PieChart, Wallet, AlertTriangle, CheckCircle2
} from "lucide-react";

/**
 * FeesReportPage
 * - KPI cards: Total billed, Collected, Outstanding, Collection rate
 * - Filters: term/year/class/status, search by student
 * - Table: per-student billing & payments summary
 * - Export CSV
 */

const TERMS = ["Term 1", "Term 2", "Term 3"];
const YEARS = ["2025/26", "2024/25"];
const CLASSES = ["All", "KG 1", "P1", "P2", "P3", "P4", "P5", "JHS 1", "JHS 2", "JHS 3"];
const STATUS = ["All", "Paid", "Partially Paid", "Unpaid"];

// Mock rows (replace with backend data)
const MOCK_ROWS = [
  { studentId: "STU001", name: "Ama Boateng", className: "P4", term: "Term 1", year: "2025/26", billed: 1500, paid: 1500, lastPayment: "2025-08-10" },
  { studentId: "STU002", name: "Kojo Mensah", className: "P4", term: "Term 1", year: "2025/26", billed: 1500, paid: 800, lastPayment: "2025-08-12" },
  { studentId: "STU003", name: "Akua Owusu", className: "JHS 2", term: "Term 1", year: "2025/26", billed: 1700, paid: 0, lastPayment: null },
  { studentId: "STU004", name: "Yaw Asare", className: "P2", term: "Term 1", year: "2025/26", billed: 1200, paid: 1200, lastPayment: "2025-08-09" },
];

export default function FeesReportPage() {
  const [term, setTerm] = useState(TERMS[0]);
  const [year, setYear] = useState(YEARS[0]);
  const [klass, setKlass] = useState(CLASSES[0]);
  const [status, setStatus] = useState(STATUS[0]);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    return MOCK_ROWS.filter(r =>
      r.term === term &&
      r.year === year &&
      (klass === "All" || r.className === klass) &&
      (q ? r.name.toLowerCase().includes(q.toLowerCase()) || r.studentId.toLowerCase().includes(q.toLowerCase()) : true) &&
      (
        status === "All" ||
        (status === "Paid" && r.paid >= r.billed) ||
        (status === "Partially Paid" && r.paid > 0 && r.paid < r.billed) ||
        (status === "Unpaid" && r.paid === 0)
      )
    );
  }, [term, year, klass, status, q]);

  const totals = useMemo(() => {
    const billed = rows.reduce((s, r) => s + r.billed, 0);
    const paid = rows.reduce((s, r) => s + r.paid, 0);
    const outstanding = billed - paid;
    const rate = billed ? (paid / billed) * 100 : 0;
    return { billed, paid, outstanding, rate };
  }, [rows]);

  function exportCsv() {
    const header = "StudentID,Name,Class,Term,Year,Billed,Paid,Outstanding,LastPayment\n";
    const body = rows.map(r => {
      const outstanding = r.billed - r.paid;
      return `${r.studentId},${r.name},${r.className},${r.term},${r.year},${r.billed},${r.paid},${outstanding},${r.lastPayment || ""}`;
    }).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fees_report_${term}_${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout title="Fees Report" subtitle="Collections, arrears, and payment performance">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-sm"
                placeholder="Search by student name or ID"
              />
            </div>
            <select value={term} onChange={(e) => setTerm(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              {TERMS.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              {YEARS.map(y => <option key={y}>{y}</option>)}
            </select>
            <select value={klass} onChange={(e) => setKlass(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              {CLASSES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              {STATUS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
              <Filter className="h-4 w-4" /> More Filters
            </button>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
              <DownloadCloud className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <KpiCard
          title="Total Billed"
          value={formatMoney(totals.billed)}
          icon={<CalendarDays className="h-6 w-6 text-indigo-500" />}
        />
        <KpiCard
          title="Collected"
          value={formatMoney(totals.paid)}
          icon={<Wallet className="h-6 w-6 text-emerald-500" />}
        />
        <KpiCard
          title="Outstanding"
          value={formatMoney(totals.outstanding)}
          icon={<AlertTriangle className="h-6 w-6 text-rose-500" />}
        />
        <KpiCard
          title="Collection Rate"
          value={`${totals.rate.toFixed(1)}%`}
          icon={<PieChart className="h-6 w-6 text-purple-500" />}
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
                <th className="p-3">Student</th>
                <th className="p-3">Class</th>
                <th className="p-3">Billed</th>
                <th className="p-3">Paid</th>
                <th className="p-3">Outstanding</th>
                <th className="p-3">Last Payment</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const outstanding = r.billed - r.paid;
                const full = outstanding <= 0;
                const partial = !full && r.paid > 0;
                return (
                  <tr key={r.studentId} className="border-b last:border-0 dark:border-gray-700">
                    <td className="p-3 font-medium">{r.name} <span className="text-gray-500">({r.studentId})</span></td>
                    <td className="p-3">{r.className}</td>
                    <td className="p-3">{formatMoney(r.billed)}</td>
                    <td className="p-3">{formatMoney(r.paid)}</td>
                    <td className="p-3">{formatMoney(outstanding)}</td>
                    <td className="p-3">{r.lastPayment || "-"}</td>
                    <td className="p-3">
                      <div className="flex justify-end">
                        {full ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </span>
                        ) : partial ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-amber-50 text-amber-700">
                            <ArrowUpRight className="h-3 w-3" /> Partially Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-rose-50 text-rose-700">
                            <AlertTriangle className="h-3 w-3" /> Unpaid
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td className="p-6 text-center text-gray-500 dark:text-gray-400" colSpan={7}>
                    No records match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ title, value, icon }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-300">{title}</span>
        {icon}
      </div>
      <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function formatMoney(n) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "GHS", maximumFractionDigits: 2 }).format(n || 0);
  } catch {
    return `GHS ${Number(n || 0).toFixed(2)}`;
  }
}
