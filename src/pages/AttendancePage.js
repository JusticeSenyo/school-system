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

const TERMS_API = 'academic/get/terms/'; // ?p_school_id
const YEARS_API = 'academic/get/years/'; // ?p_school_id

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

  // Years/Terms: show names, pass IDs
  const [terms, setTerms] = useState([]);   // [{id,name,status}]
  const [years, setYears] = useState([]);   // [{id,name,status}]
  const [selectedTermId, setSelectedTermId] = useState(''); // term_id
  const [selectedYearId, setSelectedYearId] = useState(''); // academic_year_id

  const [selectedDate, setSelectedDate] = useState(today);
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [err, setErr] = useState('');
  const [loadingLOV, setLoadingLOV] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingYT, setLoadingYT] = useState(false);

  // Parse JSON safely
  const parseMaybeJson = async (response) => {
    const raw = await response.text();
    try {
      return { json: JSON.parse(raw), raw, ok: response.ok, status: response.status };
    } catch {
      return { json: null, raw, ok: response.ok, status: response.status };
    }
  };

  // Load classes
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

      const arr = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      const allClasses = (arr || [])
        .map((c) => ({
          class_id: c.class_id ?? c.CLASS_ID,
          class_name: c.class_name ?? c.CLASS_NAME,
        }))
        .filter((c) => c.class_id != null && c.class_name);

      setClasses(allClasses);

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

  // Load Year/Term LOVs (default CURRENT)
  const loadYearsTerms = async () => {
    setErr(''); setLoadingYT(true);
    try {
      // Years
      const yUrl = buildUrl(YEARS_API, { p_school_id: SCHOOL_ID });
      const yRes = await fetch(yUrl, { headers: { Accept: 'application/json' } });
      const { json: yJson } = await parseMaybeJson(yRes);
      const yArr = Array.isArray(yJson) ? yJson : (Array.isArray(yJson?.items) ? yJson.items : []);
      const yNorm = yArr.map(y => ({
        id: y.academic_year_id ?? y.ACADEMIC_YEAR_ID,
        name: y.academic_year_name ?? y.ACADEMIC_YEAR_NAME,
        status: y.status ?? y.STATUS ?? null,
      })).filter(x => x.id != null && x.name);
      setYears(yNorm);
      const yDefault = yNorm.find(x => String(x.status).toUpperCase() === 'CURRENT') || yNorm[0];
      if (!selectedYearId && yDefault) setSelectedYearId(String(yDefault.id));

      // Terms
      const tUrl = buildUrl(TERMS_API, { p_school_id: SCHOOL_ID });
      const tRes = await fetch(tUrl, { headers: { Accept: 'application/json' } });
      const { json: tJson } = await parseMaybeJson(tRes);
      const tArr = Array.isArray(tJson) ? tJson : (Array.isArray(tJson?.items) ? tJson.items : []);
      const tNorm = tArr.map(t => ({
        id: t.term_id ?? t.TERM_ID,
        name: t.term_name ?? t.TERM_NAME,
        status: t.status ?? t.STATUS ?? null,
      })).filter(x => x.id != null && x.name);
      setTerms(tNorm);
      const tDefault = tNorm.find(x => String(x.status).toUpperCase() === 'CURRENT') || tNorm[0];
      if (!selectedTermId && tDefault) setSelectedTermId(String(tDefault.id));
    } catch (e) {
      setErr(prev => prev || (e?.message || 'Failed to load academic years/terms'));
    } finally {
      setLoadingYT(false);
    }
  };

  // Load attendance report (single-day view)
  const loadReport = async () => {
    if (!selectedClass || !selectedTermId || !selectedYearId) return;
    setLoadingReport(true); setErr('');
    try {
      const url = buildUrl('report/get/attendance/', {
        p_school_id: SCHOOL_ID,
        p_class_id: selectedClass,
        p_academic_year: selectedYearId, // pass ID
        p_term: selectedTermId,          // pass ID
        p_date: selectedDate,            // YYYY-MM-DD
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
  useEffect(() => { loadYearsTerms(); }, []);
  useEffect(() => { if (selectedClass && selectedTermId && selectedYearId) loadReport(); }, [selectedClass, selectedDate, selectedTermId, selectedYearId]);

  // Live client-side filter
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => String(r.full_name || '').toLowerCase().includes(q));
  }, [reports, searchQuery]);

  const present = filtered.filter((r) => String(r.status || '').toUpperCase() === 'PRESENT').length;
  const absent = filtered.length - present;

  // Export current view to Excel (include class + year/term names)
  const exportToExcel = () => {
    try {
      const cls = classes.find((c) => String(c.class_id) === String(selectedClass));
      const className = (cls?.class_name || `Class-${selectedClass}`).replace(/[\\/:*?"<>|]/g, '-');
      const yName = years.find(y => String(y.id) === String(selectedYearId))?.name || selectedYearId;
      const tName = terms.find(t => String(t.id) === String(selectedTermId))?.name || selectedTermId;

      const rows = filtered.map((r, idx) => ({
        '#': idx + 1,
        Student: r.full_name || '',
        Status: r.status || 'ABSENT',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `Attendance_${className}_${yName}_${tName}_${selectedDate}.xlsx`);
    } catch (e) {
      alert(e?.message || 'Failed to export Excel');
    }
  };

  return (
    <DashboardLayout title="Attendance Report" subtitle="">
      {/* Toolbar */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Academic Year (show name, value = id) */}
          <select
            className="px-4 py-2 rounded-md text-sm border bg-white dark:bg-gray-900"
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            disabled={loadingYT || years.length === 0}
            title="Academic Year"
          >
            {loadingYT ? (
              <option>Loading years…</option>
            ) : years.length ? (
              years.map((y) => (
                <option key={String(y.id)} value={String(y.id)}>
                  {y.name}{String(y.status).toUpperCase() === 'CURRENT' ? ' (CURRENT)' : ''}
                </option>
              ))
            ) : (
              <option>No years</option>
            )}
          </select>

          {/* Term (show name, value = id) */}
          <select
            className="px-4 py-2 rounded-md text-sm border bg-white dark:bg-gray-900"
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            disabled={loadingYT || terms.length === 0}
            title="Term"
          >
            {loadingYT ? (
              <option>Loading terms…</option>
            ) : terms.length ? (
              terms.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.name}{String(t.status).toUpperCase() === 'CURRENT' ? ' (CURRENT)' : ''}
                </option>
              ))
            ) : (
              <option>No terms</option>
            )}
          </select>

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
      {!err && (loadingReport || loadingYT || loadingLOV) && (
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
