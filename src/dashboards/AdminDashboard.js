// src/pages/AdminDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import {
  Users,
  UserCheck,
  BookOpen,
  BarChart2,
  CalendarCheck,
  UserPlus,
  UserCog,
  School as SchoolIcon,
  Megaphone,
  Inbox,
  Mail,
  MessageSquare,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../AuthContext';

/* ===== Role-based menus ===== */
export const roleBasedMenus = {
  admin: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Communication', path: '/dashboard/communication' },
    { label: 'Manage Staff', path: '/dashboard/manage-staff' },
    { label: 'Manage Students', path: '/dashboard/manage-students' },
    { label: 'Attendance', path: '/dashboard/attendance' },
    {
      label: 'Fees',
      children: [
        { label: 'Manage Fees', path: '/dashboard/manage-fees' },
        { label: 'Fees Report', path: '/dashboard/fees-report' },
        { label: 'Print Bill', path: '/dashboard/print-bill' },
      ],
    },
    {
      label: 'Academics',
      children: [
        { label: 'Manage Class Teacher', path: '/dashboard/class-teacher' },
        { label: 'Manage Subjects', path: '/dashboard/manage-subjects' },
        { label: 'Assign Subjects', path: '/dashboard/assign-subjects' },
        { label: 'Manage Classes', path: '/dashboard/classes' },
      ],
    },
    {
      label: 'Examination',
      children: [{ label: 'Print Exam Report', path: '/dashboard/print-exam-report' }],
    },
    { label: 'Settings', path: '/settings' },
  ],
  headteacher: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Communication', path: '/dashboard/communication' },
    { label: 'Manage Staff', path: '/dashboard/manage-staff' },
    { label: 'Manage Students', path: '/dashboard/manage-students' },
    { label: 'Attendance', children: [{ label: 'Attendance Report', path: '/dashboard/attendance-report' }] },
    {
      label: 'Examination',
      children: [
        { label: 'Manage Exam Report', path: '/dashboard/manage-exam' },
        { label: 'Print Exam Report', path: '/dashboard/print-exam-report' },
      ],
    },
    { label: 'Settings', path: '/settings' },
  ],
  accountant: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Communication', path: '/dashboard/communication' },
    { label: 'Manage Students', path: '/dashboard/manage-students' },
    {
      label: 'Fees',
      children: [
        { label: 'Manage Fees', path: '/dashboard/manage-fees' },
        { label: 'Fees Report', path: '/dashboard/fees-report' },
        { label: 'Print Bill', path: '/dashboard/print-bill' },
      ],
    },
    { label: 'Settings', path: '/settings' },
  ],
  teacher: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Communication', path: '/dashboard/communication' },
    { label: 'Manage Students', path: '/dashboard/manage-students' },
    { label: 'Attendance', children: [{ label: 'Manage Attendance', path: '/dashboard/manage-attendance' }] },
    { label: 'Examination', children: [{ label: 'Manage Exam Report', path: '/dashboard/manage-exam' }] },
    { label: 'Settings', path: '/settings' },
  ],
  owner: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Communication', path: '/dashboard/communication' },
    { label: 'Manage Staff', path: '/dashboard/manage-staff' },
    { label: 'Manage Students', path: '/dashboard/manage-students' },
    { label: 'Attendance', children: [{ label: 'Attendance Report', path: '/dashboard/attendance-report' }] },
    {
      label: 'Fees',
      children: [
        { label: 'Manage Fees', path: '/dashboard/manage-fees' },
        { label: 'Fees Report', path: '/dashboard/fees-report' },
        { label: 'Print Bill', path: '/dashboard/print-bill' },
      ],
    },
    {
      label: 'Academics',
      children: [
        { label: 'Manage Class Teacher', path: '/dashboard/class-teacher' },
        { label: 'Manage Subjects', path: '/dashboard/manage-subjects' },
        { label: 'Assign Subjects', path: '/dashboard/assign-subjects' },
        { label: 'Manage Classes', path: '/dashboard/classes' },
      ],
    },
    {
      label: 'Examination',
      children: [
        { label: 'Manage Exam Report', path: '/dashboard/manage-exam' },
        { label: 'Print Exam Report', path: '/dashboard/print-exam-report' },
      ],
    },
    { label: 'Settings', path: '/settings' },
  ],
};

/* ===== ORDS relative endpoints (all go through apiCall) ===== */
const PATHS = {
  DASHBOARD: 'get/admin/dashboard/',                // ?user_id=
  ACADEMIC_YEAR: 'academic/get/academic_year/',     // ?p_school_id=
  CLASSES: 'academic/get/classes/',                 // ?p_school_id=
  COMMS_SENT: 'comms/dashboard/sent/',              // ?p_school_id=&p_created_by=
  EVENTS: 'academic/get/event/',                    // ?p_school_id=
};

/* ===== helpers ===== */
const GHS = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
  maximumFractionDigits: 2,
});
const fmtNum = (n) => (typeof n === 'number' ? n.toLocaleString() : '—');
const fmtPct = (n) =>
  n === null || n === undefined || isNaN(Number(n)) ? '—' : `${Number(n).toFixed(2)}%`;
const safeText = (s, n = 160) =>
  String(s || '').trim().slice(0, n) + (String(s || '').length > n ? '…' : '');
const dateOnly = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
const todayISO = () => new Date().toISOString().slice(0, 10);

function findPathForLabel(menuItems, label) {
  if (!Array.isArray(menuItems)) return null;
  for (const item of menuItems) {
    if (item.label === label && item.path) return item.path;
    if (item.children) {
      const hit = findPathForLabel(item.children, label);
      if (hit) return hit;
    }
  }
  return null;
}
function resolveRouteByRoleAndLabel(role, label) {
  const normalizedRole = String(role || '').toLowerCase();
  const menu = roleBasedMenus[normalizedRole];
  const hit = findPathForLabel(menu, label);
  if (hit) return hit;
  const fallback = {
    'Manage Students': '/dashboard/manage-students',
    'Manage Staff': '/dashboard/manage-staff',
    'Manage Classes': '/dashboard/classes',
    'View Attendance': '/dashboard/attendance',
  };
  return fallback[label] || '/dashboard';
}

function readableAudience(targetType, classId, classes) {
  const c = classes.find((x) => Number(x.class_id) === Number(classId));
  switch (String(targetType || '').toUpperCase()) {
    case 'ALL':            return 'All (Parents, Teachers & Students)';
    case 'ALL_PARENTS':    return 'All Parents';
    case 'ALL_TEACHERS':   return 'All Teachers/Staff';
    case 'ALL_STUDENTS':   return 'All Students';
    case 'CLASS_PARENTS':  return `Class Parents${c ? ` — ${c.class_name}` : ''}`;
    case 'CLASS_STUDENTS': return `Class Students${c ? ` — ${c.class_name}` : ''}`;
    default:               return targetType || '';
  }
}
const fmtWhen = (isoLike) => {
  if (!isoLike) return '';
  const d = new Date(isoLike);
  return isNaN(d.getTime()) ? String(isoLike) : d.toLocaleString();
};

/* ===== Simple dependency-free monthly calendar ===== */
function BigCalendar({ monthStart, events }) {
  const y = monthStart.getFullYear();
  const m = monthStart.getMonth(); // 0-based
  const first = new Date(y, m, 1);
  const startDay = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysPrev = startDay;
  const totalCells = Math.ceil((daysPrev + daysInMonth) / 7) * 7;

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

/* ===== Component ===== */
const RECENT_LIMIT = 5;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, apiCall } = useAuth() || {};

  const role = (user?.userType || 'admin').toLowerCase();
  const userId = user?.id ?? user?.user_id ?? null;
  const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [apiErr, setApiErr] = useState('');
  const [data, setData] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    attendanceRate: 0,
    revenue: 0,
    totalStaff: 0,
  });
  const [academicYear, setAcademicYear] = useState('');

  const [classes, setClasses] = useState([]);
  const [recentMsgs, setRecentMsgs] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const [events, setEvents] = useState([]);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Small helper to get arrays from apiCall with ORDS' varying shapes
  const fetchArray = useCallback(
    async (path, params = {}) => {
      const res = await apiCall(path, { params });
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.items)) return res.items;
      // sometimes single object contains array under a named key; flatten the first array found
      const firstArray = Object.values(res || {}).find((v) => Array.isArray(v));
      return Array.isArray(firstArray) ? firstArray : [];
    },
    [apiCall]
  );

  // Load stats + current academic year
  useEffect(() => {
    if (!apiCall || !userId || !schoolId) return;

    (async () => {
      try {
        setLoading(true);
        setApiErr('');

        // Stats
        const statsRes = await apiCall(PATHS.DASHBOARD, { params: { user_id: userId } });
        setData({
          totalStudents: statsRes.totalStudents ?? statsRes.total_students ?? 0,
          totalTeachers: statsRes.totalTeachers ?? statsRes.total_teachers ?? 0,
          totalClasses: statsRes.totalClasses ?? statsRes.total_class ?? statsRes.totalClass ?? 0,
          attendanceRate: statsRes.attendanceRate ?? statsRes.attendance_rate ?? 0,
          revenue: statsRes.revenue ?? 0,
          totalStaff: statsRes.totalStaff ?? statsRes.total_staff ?? 0,
        });

        // Academic year (choose CURRENT if available)
        const years = await fetchArray(PATHS.ACADEMIC_YEAR, { p_school_id: schoolId });
        if (years.length) {
          const current = years.find((it) => String(it.status ?? it.STATUS ?? '').toUpperCase() === 'CURRENT');
          const name =
            current?.academic_year_name ?? current?.ACADEMIC_YEAR_NAME ??
            years[0]?.academic_year_name ?? years[0]?.ACADEMIC_YEAR_NAME ?? '';
          setAcademicYear(name);
        } else {
          setAcademicYear('');
        }
      } catch (e) {
        setApiErr(e?.error || e?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiCall, userId, schoolId, fetchArray]);

  // Load classes (for audience labels)
  useEffect(() => {
    if (!apiCall || !schoolId) return;
    (async () => {
      try {
        const rows = await fetchArray(PATHS.CLASSES, { p_school_id: schoolId });
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
  }, [apiCall, schoolId, fetchArray]);

  // Load recent dashboard messages (activity)
  useEffect(() => {
    if (!apiCall || !userId || !schoolId) return;
    (async () => {
      try {
        setRecentLoading(true);
        const rows = await fetchArray(PATHS.COMMS_SENT, {
          p_school_id: schoolId,
          p_created_by: userId,
        });
        const sorted = [...rows].sort(
          (a, b) => new Date(b.created_at ?? b.CREATED_AT) - new Date(a.created_at ?? a.CREATED_AT)
        );
        setRecentMsgs(sorted.slice(0, RECENT_LIMIT));
      } catch {
        setRecentMsgs([]);
      } finally {
        setRecentLoading(false);
      }
    })();
  }, [apiCall, userId, schoolId, fetchArray]);

  // Load events for calendar
  useEffect(() => {
    if (!apiCall || !schoolId) return;
    (async () => {
      try {
        const rows = await fetchArray(PATHS.EVENTS, { p_school_id: schoolId });
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
  }, [apiCall, schoolId, fetchArray]);

  const stats = useMemo(
    () => [
      {
        label: 'Total Students',
        value: loading ? '—' : fmtNum(data.totalStudents),
        change: '',
        icon: <Users className="h-6 w-6 text-indigo-500" />,
      },
      {
        label: 'Total Staff',
        value: loading ? '—' : fmtNum(data.totalStaff),
        change: '',
        icon: <UserCheck className="h-6 w-6 text-green-500" />,
      },
      {
        label: 'Total Classes',
        value: loading ? '—' : fmtNum(data.totalClasses),
        change: '',
        icon: <BookOpen className="h-6 w-6 text-yellow-500" />,
      },
      {
        label: "Today's Attendance Rate",
        value: loading ? '—' : fmtPct(data.attendanceRate),
        change: '',
        icon: <BarChart2 className="h-6 w-6 text-purple-500" />,
      },
    ],
    [loading, data]
  );

  const actions = useMemo(() => {
    const defs = [
      { label: 'Manage Students', icon: <UserPlus className="h-5 w-5" /> },
      { label: 'Manage Staff', icon: <UserCog className="h-5 w-5" /> },
      { label: 'Manage Classes', icon: <SchoolIcon className="h-5 w-5" /> },
      { label: 'View Attendance', icon: <CalendarCheck className="h-5 w-5" /> },
    ];
    return defs.map((a) => ({ ...a, path: resolveRouteByRoleAndLabel(role, a.label) }));
  }, [role]);

  return (
    <DashboardLayout title="School Dashboard">
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-6 text-white mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-1">Welcome to the Admin Dashboard 🎓</h2>
        <p className="text-sm sm:text-base text-purple-100">
          Get insights into your school’s performance, staff, students, and operations.
        </p>
      </div>

      {(!userId || !schoolId) && (
        <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
          Preparing your dashboard…
        </div>
      )}

      {apiErr && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {apiErr}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        {stats.map((item, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
              {item.icon}
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{item.value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{item.change}</div>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Revenue {academicYear ? `(${academicYear})` : ''}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '—' : GHS.format(data.revenue || 0)}
              </div>
            </div>
            <SchoolIcon className="h-10 w-10 text-indigo-500" />
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => navigate(action.path)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-100 rounded-xl border border-indigo-100 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition"
              title={action.path}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
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
                  {calMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
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

        <div className="lg:col-span-1">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Recent Activity</h3>
            <button
              type="button"
              className="text-sm text-indigo-600 hover:underline disabled:text-gray-400"
              disabled
              title="More coming soon"
            >
              View All
            </button>
          </div>

          <div className="space-y-4">
            {recentLoading ? (
              <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300">
                Loading recent messages…
              </div>
            ) : recentMsgs.length === 0 ? (
              <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300">
                No dashboard messages yet.
              </div>
            ) : (
              recentMsgs.map((m) => (
                <div
                  key={m.message_id ?? m.MESSAGE_ID}
                  className="flex items-start gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex-shrink-0">
                    <Megaphone className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {m.subject ?? m.SUBJECT ?? '(No subject)'}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100 border border-indigo-100 dark:border-indigo-700">
                        {readableAudience(m.target_type ?? m.TARGET_TYPE, m.class_id ?? m.CLASS_ID, classes)}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Inbox className="h-3.5 w-3.5" /> Dashboard
                        {String(m.has_email ?? m.HAS_EMAIL ?? 'N').toUpperCase() === 'Y' && (
                          <span className="inline-flex items-center gap-1 ml-2">
                            <Mail className="h-3.5 w-3.5" /> Email
                          </span>
                        )}
                        {String(m.has_sms ?? m.HAS_SMS ?? 'N').toUpperCase() === 'Y' && (
                          <span className="inline-flex items-center gap-1 ml-2">
                            <MessageSquare className="h-3.5 w-3.5" /> SMS
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-200 mt-1 line-clamp-2">
                      {safeText(m.body ?? m.BODY, 200)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Sent on: {fmtWhen(m.created_at ?? m.CREATED_AT)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
