// src/pages/ManageAttendancePage.js
import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { useAuth } from '../AuthContext';
import {
  CheckCircle, XCircle, Calendar, Users, Save, Loader2, CheckSquare, AlertCircle, RefreshCcw, ListChecks, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ===== ORDS endpoints =====
const UNMARKED_API =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/report/class_teacher/unmarked/';
const MARKED_TODAY_API =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/report/class_teacher/attendance/';
const MARK_ATTENDANCE_API =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/report/mark/attendance/';
const CLASS_LIST_API =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/academic/class_teacher/class/';

// Map UI value -> API value
const statusToApi = { present: 'PRESENT', absent: 'ABSENT' };

function formatYmd(d) {
  // Africa/Accra is UTC+0; ISO slice is fine
  return d.toISOString().slice(0, 10);
}

const ManageAttendancePage = () => {
  const { user } = useAuth?.() || {};
  const userId = user?.user_id ?? user?.id ?? 1;
  const schoolId = user?.school_id ?? 1;
  const recordedBy = userId;

  const today = formatYmd(new Date());

  // Classes for this class teacher (from API)
  const [classes, setClasses] = useState([]); // [{class_id, class_name}]
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesErr, setClassesErr] = useState('');
  const [classId, setClassId] = useState(null);
  const [date, setDate] = useState(today);

  // Data
  const [unmarked, setUnmarked] = useState([]);
  const [marked, setMarked] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState({ ok: null, msg: '' });

  // attendance = { [student_id]: 'present'|'absent' }
  const [attendance, setAttendance] = useState({});

  // Stats for the editable (unmarked) list
  const stats = useMemo(() => {
    const total = unmarked.length;
    const present = unmarked.filter(s => attendance[s.student_id] === 'present').length;
    const absent = unmarked.filter(s => attendance[s.student_id] === 'absent').length;
    const unchosen = total - present - absent;
    const rate = total ? Math.round((present / total) * 10000) / 100 : 0;
    return { total, present, absent, unchosen, rate };
  }, [unmarked, attendance]);

  // ========== Fetch class list for this teacher ==========
  const fetchClasses = async () => {
    setClassesLoading(true);
    setClassesErr('');
    try {
      const url = `${CLASS_LIST_API}?p_user_id=${encodeURIComponent(userId)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Classes fetch failed: ${res.status}`);
      const rows = await res.json();

      const normalized = (Array.isArray(rows) ? rows : []).map(r => ({
        class_id: r.class_id ?? r.CLASS_ID ?? r.id ?? r.ID,
        class_name: r.class_name ?? r.CLASS_NAME ?? r.name ?? r.NAME
      })).filter(r => r.class_id != null);

      setClasses(normalized);

      // Default select first available class if none selected or if previous selection is no longer valid
      if (!normalized.length) {
        setClassId(null);
      } else if (!classId || !normalized.some(c => Number(c.class_id) === Number(classId))) {
        setClassId(Number(normalized[0].class_id));
      }
    } catch (e) {
      setClassesErr(e?.message || 'Failed to load classes.');
    } finally {
      setClassesLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ========== Attendance data fetchers ==========
  const fetchUnmarked = async () => {
    if (!classId) return;
    const url =
      `${UNMARKED_API}?p_school_id=${encodeURIComponent(schoolId)}` +
      `&p_class_id=${encodeURIComponent(classId)}` +
      `&p_date=${encodeURIComponent(date)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Unmarked fetch failed: ${res.status}`);
    const rows = await res.json();

    const normalized = (Array.isArray(rows) ? rows : []).map(r => ({
      student_id: r.student_id ?? r.Student_id ?? r.STUDENT_ID,
      full_name: r.full_name ?? r.FULL_NAME,
      class_id: r.class_id ?? r.CLASS_ID,
      school_id: r.school_id ?? r.SCHOOL_ID,
    }));

    setUnmarked(normalized);
    setAttendance({});
  };

  const fetchMarkedToday = async () => {
    if (!classId) return;
    const url =
      `${MARKED_TODAY_API}?p_school_id=${encodeURIComponent(schoolId)}` +
      `&p_class_id=${encodeURIComponent(classId)}` +
      `&p_user_id=${encodeURIComponent(recordedBy)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Marked fetch failed: ${res.status}`);
    const rows = await res.json();

    const filtered = (Array.isArray(rows) ? rows : []).filter(r => {
      const d = (r.attendance_date ?? r.ATTENDANCE_DATE);
      return (typeof d === 'string' ? d.slice(0, 10) : d) === date;
    });

    const normalized = filtered.map(r => ({
      full_name: r.full_name ?? r.FULL_NAME,
      status: (r.status ?? r.STATUS)?.toUpperCase(),
      attendance_date: (r.attendance_date ?? r.ATTENDANCE_DATE)?.slice(0, 10),
      class_teacher: r.class_teacher ?? r.CLASS_TEACHER,
      class_teacher_id: r.class_teacher_id ?? r.CLASS_TEACHER_ID,
    }));

    setMarked(normalized);
  };

  const loadData = async () => {
    if (!classId) return;
    setLoading(true);
    setResult({ ok: null, msg: '' });
    try {
      await Promise.all([fetchUnmarked(), fetchMarkedToday()]);
    } catch (e) {
      setResult({ ok: false, msg: e.message || 'Failed to load data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, classId, date, recordedBy]);

  // ========== UI actions ==========
  const handleAttendanceChange = (student_id, status) => {
    setAttendance(prev => ({ ...prev, [student_id]: status }));
  };

  const markAll = (status) => {
    const next = {};
    for (const s of unmarked) next[s.student_id] = status;
    setAttendance(next);
  };

  const resetMarks = () => setAttendance({});

  const submitAttendance = async () => {
    setSubmitting(true);
    setResult({ ok: null, msg: '' });
    try {
      for (const s of unmarked) {
        const chosen = attendance[s.student_id];
        if (!chosen) continue;
        const apiStatus = statusToApi[chosen];

        if (!s.student_id) {
          throw new Error(`Missing student_id for ${s.full_name}. Update unmarked API to include student_id.`);
        }

        const url =
          `${MARK_ATTENDANCE_API}` +
          `?p_school_id=${encodeURIComponent(schoolId)}` +
          `&p_class_id=${encodeURIComponent(classId)}` +
          `&p_student_id=${encodeURIComponent(s.student_id)}` +
          `&p_status=${encodeURIComponent(apiStatus)}` +
          `&p_date=${encodeURIComponent(date)}` +
          `&p_recorded_by=${encodeURIComponent(recordedBy)}`;

        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`Failed for ${s.full_name} (${s.student_id}): ${res.status} ${txt}`);
        }
      }

      setResult({ ok: true, msg: 'Attendance submitted successfully.' });
      await loadData();
    } catch (err) {
      setResult({ ok: false, msg: err.message || 'Failed to submit attendance.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Prevent selecting a future date
  const handleDateChange = (e) => {
    const v = e.target.value;
    setDate(v > today ? today : v);
  };

  // ========== Excel export for Marked Today ==========
  const downloadMarkedExcel = () => {
    if (!marked.length) return;

    // Find selected class info
    const cls = classes.find(c => Number(c.class_id) === Number(classId));
    const className = (cls?.class_name || `Class-${classId}`).replace(/[\\/:*?"<>|]/g, '-');

    // Prepare data rows
    const rows = marked.map((r, i) => ({
      '#': i + 1,
      Student: r.full_name,
      Status: r.status === 'PRESENT' ? 'Present' : 'Absent'
    }));

    // Create worksheet & workbook
    const ws = XLSX.utils.json_to_sheet(rows);

    // Autosize columns based on content
    const headers = Object.keys(rows[0] || { '#': '', Student: '', Status: '', Date: '', Teacher: '', TeacherID: '', Class: '', ClassID: '' });
    const colWidths = headers.map(h => {
      const maxLen = Math.max(
        h.length,
        ...rows.map(r => (r[h] ? String(r[h]).length : 0))
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marked');

    const filename = `attendance_${className}_${date}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const excelDisabled = loading || marked.length === 0;

  return (
    <DashboardLayout title="Manage Attendance" subtitle="Class teacher daily attendance">
      {/* Top Bar */}
      <div className="mb-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 shadow-sm">
          <Users className="w-5 h-5" />
          <div className="flex-1">
            <div className="text-xs text-gray-500">Class</div>
            <select
              value={classId ?? ''}
              onChange={(e) => setClassId(Number(e.target.value))}
              className="w-full mt-0.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              {classesLoading && <option value="">Loading classes…</option>}
              {!classesLoading && classes.length === 0 && (
                <option value="">No classes found</option>
              )}
              {!classesLoading && classes.map(c => (
                <option key={c.class_id} value={c.class_id}>
                  {c.class_name || `Class ${c.class_id}`}
                </option>
              ))}
            </select>
            {classesErr && (
              <div className="mt-1 text-xs text-rose-600">{classesErr}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 shadow-sm">
          <Calendar className="w-5 h-5" />
          <div className="flex-1">
            <div className="text-xs text-gray-500">Date</div>
            <input
              type="date"
              value={date}
              max={today}                // prevent beyond today
              onChange={handleDateChange}
              className="w-full mt-0.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 shadow-sm">
          <button
            onClick={() => markAll('present')}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-xl hover:bg-emerald-700"
          >
            <CheckSquare className="w-4 h-4" /> Mark All Present
          </button>
          <button
            onClick={() => markAll('absent')}
            className="inline-flex items-center gap-2 bg-rose-600 text-white px-3 py-2 rounded-xl hover:bg-rose-700"
          >
            <XCircle className="w-4 h-4" /> Mark All Absent
          </button>
          <button
            onClick={resetMarks}
            className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-3 py-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <RefreshCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* Editable UNMARKED list */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ListChecks className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Students not marked today</h3>
          <span className="text-sm text-gray-500">({date})</span>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-200">Student</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-200">Status</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-200">Quick</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" className="p-6 text-center text-gray-500">Loading…</td></tr>
              ) : unmarked.length === 0 ? (
                <tr><td colSpan="3" className="p-6 text-center text-gray-500">All students are marked for today 🎉</td></tr>
              ) : unmarked.map((s, idx) => {
                const value = attendance[s.student_id] || '';
                return (
                  <tr key={s.student_id ?? s.full_name + idx} className={idx % 2 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/40 dark:bg-gray-900/20'}>
                    <td className="p-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="font-medium">{s.full_name}</div>
                    </td>
                    <td className="p-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <select
                          value={value}
                          onChange={(e) => handleAttendanceChange(s.student_id, e.target.value)}
                          className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                        >
                          <option value="">Select</option>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </select>
                        {value === 'present' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-1 rounded-full text-xs">
                            <CheckCircle className="w-3 h-3" /> Present
                          </span>
                        )}
                        {value === 'absent' && (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-300 px-2 py-1 rounded-full text-xs">
                            <XCircle className="w-3 h-3" /> Absent
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAttendanceChange(s.student_id, 'present')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(s.student_id, 'absent')}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer actions for UNMARKED */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
                <Users className="w-3 h-3" /> {stats.total} unmarked
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                <CheckCircle className="w-3 h-3" /> {stats.present} set present
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                <XCircle className="w-3 h-3" /> {stats.absent} set absent
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-3 h-3" /> {stats.unchosen} not chosen
              </span>
            </div>

            <button
              onClick={submitAttendance}
              disabled={submitting || unmarked.length === 0}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {submitting ? 'Submitting…' : 'Submit Attendance'}
            </button>
          </div>

          {/* Messages */}
          {result.ok === true && (
            <div className="mx-4 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 px-4 py-3">
              {result.msg || 'Attendance submitted successfully.'}
            </div>
          )}
          {result.ok === false && (
            <div className="mx-4 mb-4 rounded-xl bg-rose-50 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 px-4 py-3">
              {result.msg}
            </div>
          )}
        </div>
      </div>

      {/* Read-only MARKED TODAY list */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Students marked today</h3>
            <span className="text-sm text-gray-500">({date})</span>
          </div>

          {/* Download Excel button */}
          <button
            onClick={downloadMarkedExcel}
            disabled={excelDisabled}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 disabled:opacity-60"
            title={excelDisabled ? 'No data to download' : 'Download Excel of marked list'}
          >
            <Download className="w-4 h-4" />
            Download Excel
          </button>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-200">Student</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-200">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="p-6 text-center text-gray-500">Loading…</td></tr>
              ) : marked.length === 0 ? (
                <tr><td colSpan="4" className="p-6 text-center text-gray-500">No records for today yet.</td></tr>
              ) : marked.map((r, idx) => (
                <tr key={idx} className={idx % 2 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/40 dark:bg-gray-900/20'}>
                  <td className="p-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="font-medium">{r.full_name}</div>
                  </td>
                  <td className="p-3 border-t border-gray-100 dark:border-gray-700">
                    {r.status === 'PRESENT' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-1 rounded-full text-xs">
                        <CheckCircle className="w-3 h-3" /> Present
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-300 px-2 py-1 rounded-full text-xs">
                        <XCircle className="w-3 h-3" /> Absent
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageAttendancePage;
