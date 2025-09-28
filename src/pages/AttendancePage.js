// src/pages/AttendancePage.js
import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { RotateCcw, Download, Search as SearchIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

const BASE = 'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/';
const buildUrl = (path, params) => {
  const clean = String(path).replace(/^\/+/, '');
  const url = new URL(clean, BASE.replace(/\/+$/, '') + '/');
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  return url.toString();
};
const fmt = (d) => new Date(d).toISOString().slice(0, 10);

// Tailwind classes (light + dark)
const field =
  "px-3 py-2 rounded-md border text-sm outline-none transition focus:ring-2 focus:ring-offset-0 focus:border-transparent " +
  "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-blue-500 " +
  "dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:ring-blue-400";
const btnPrimary =
  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[.99] " +
  "dark:bg-emerald-600 dark:hover:bg-emerald-700";
const btnGhost =
  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition border bg-gray-100 text-gray-900 hover:bg-gray-200 " +
  "dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700";

const AttendancePage = () => {
  const SCHOOL_ID = 1; // TODO: replace with user.schoolId from AuthContext
  const today = fmt(new Date());

  const [classes, setClasses] = useState([]);             // [{ class_id, class_name }]
  const [selectedClass, setSelectedClass] = useState(''); // class_id (string)
  const [selectedDate, setSelectedDate] = useState(today);
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [err, setErr] = useState('');
  const [loadingLOV, setLoadingLOV] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  // Parse JSON safely
  const parseMaybeJson = async (response) => {
    const raw = await response.text();
    try {
      return { json: JSON.parse(raw), raw, ok: response.ok, status: response.status };
    } catch {
      return { json: null, raw, ok: response.ok, status: response.status };
    }
  };

  // Load classes: show ALL classes from API; display class_name; return class_id
  const loadClasses = async () => {
    setLoadingLOV(true); setErr('');
    try {
      const url = buildUrl('student/get/classes/', { p_school_id: SCHOOL_ID });
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const { json, raw, ok, status } = await parseMaybeJson(res);

      if (!ok) {
        setErr(`Failed to load classes (HTTP ${status}). ${String(raw).slice(0, 200)}`);
        setClasses([]);
        return;
      }

      // Expect: [{ student_id, class_name, section, class_id }, ...]
      const arr = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      const allClasses = (arr || [])
        .map((c) => ({
          class_id: c.class_id ?? c.CLASS_ID,
          class_name: c.class_name ?? c.CLASS_NAME,
        }))
        .filter((c) => c.class_id != null && c.class_name);

      setClasses(allClasses);

      // Auto-select first available class if none selected
      if (!selectedClass && allClasses.length) {
        setSelectedClass(String(allClasses[0].class_id));
      }
    } catch (e) {
      setErr(`Failed to load classes. ${e?.message || e}`);
      setClasses([]);
    } finally {
      setLoadingLOV(false);
    }
  };

  // Load attendance report
  const loadReport = async () => {
    if (!selectedClass) return;
    setLoadingReport(true); setErr('');
    try {
      const url = buildUrl('report/get/attendance/', {
        p_school_id: SCHOOL_ID,
        p_class_id: selectedClass,
        p_date: selectedDate,
      });

      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const { json, raw, ok, status } = await parseMaybeJson(res);

      if (!ok) {
        setErr(`Attendance request failed (HTTP ${status}). ${String(raw).slice(0, 300)}`);
        setReports([]);
        return;
      }

      const items = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : []);
      setReports(items);
    } catch (e) {
      setErr(`Failed to load attendance. ${e?.message || e}`);
      setReports([]);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => { loadClasses(); }, []);
  useEffect(() => { if (selectedClass) loadReport(); }, [selectedClass, selectedDate]);

  // Live client-side filter
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => String(r.full_name || '').toLowerCase().includes(q));
  }, [reports, searchQuery]);

  const present = filtered.filter((r) => String(r.status || '').toUpperCase() === 'PRESENT').length;
  const absent = filtered.length - present;

  // Export current view to Excel (include class name)
  const exportToExcel = () => {
    try {
      const cls = classes.find((c) => String(c.class_id) === String(selectedClass));
      const className = (cls?.class_name || `Class-${selectedClass}`).replace(/[\\/:*?"<>|]/g, '-');

      const rows = filtered.map((r, idx) => ({
        '#': idx + 1,
        Student: r.full_name || '',
        Status: r.status || 'ABSENT',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `Attendance_${className}_${selectedDate}.xlsx`);
    } catch (e) {
      alert(e?.message || 'Failed to export Excel');
    }
  };

  return (
    <DashboardLayout title="Attendance Report" subtitle="">
      {/* Toolbar */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Class (ALL classes) */}
          <select
            className="px-4 py-2 rounded-md text-sm border bg-white dark:bg-gray-900"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={loadingLOV || classes.length === 0}
          >
            {loadingLOV ? (
              <option>Loading classes…</option>
            ) : classes.length ? (
              classes.map((c) => (
                <option key={String(c.class_id)} value={String(c.class_id)}>
                  {c.class_name}
                </option>
              ))
            ) : (
              <option>No classes found</option>
            )}
          </select>

          {/* Date (clamped to today) */}
          <input
            type="date"
            className="px-4 py-2 rounded-md text-sm border bg-white dark:bg-gray-900"
            value={selectedDate}
            max={today}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedDate(v > today ? today : v);
            }}
          />

          {/* Live Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name…"
              className="pl-9 pr-3 py-2 w-72 rounded-md text-sm border bg-white dark:bg-gray-900"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={loadReport}
            disabled={loadingReport || !selectedClass}
            className={btnGhost}
            title="Refresh attendance"
          >
            <RotateCcw size={16} />
            {loadingReport ? 'Loading…' : 'Refresh'}
          </button>

          {/* Download Excel */}
          <button
            onClick={exportToExcel}
            className={btnPrimary}
            title="Download Excel of current table view"
          >
            <Download size={16} /> Download Excel
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          Total: {filtered.length}
        </span>
        <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
          Present: {present}
        </span>
        <span className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
          Absent: {absent}
        </span>
      </div>

      {/* Alerts / Status */}
      {err && (
        <div className="mb-4 flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <span className="text-sm">{err}</span>
        </div>
      )}
      {!err && loadingReport && (
        <div className="mb-3 p-3 rounded border bg-gray-50 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
          Loading report…
        </div>
      )}
      {!err && !loadingReport && filtered.length === 0 && (
        <div className="p-3 rounded border bg-gray-50 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
          No attendance records match your filters.
        </div>
      )}

      {/* Table */}
      {!err && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-indigo-100 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left">Student</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const isPresent = String(item.status || '').toUpperCase() === 'PRESENT';
                return (
                  <tr key={item.student_id ?? i} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.full_name}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
                        ${isPresent
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                        {item.status || 'ABSENT'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AttendancePage;
