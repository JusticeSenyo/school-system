// src/pages/AdminDashboard.js
import React, { useEffect, useMemo, useState } from 'react';
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
  School,
  Megaphone,
  Inbox,
  Mail,
  MessageSquare,
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
    {
      label: 'Attendance',
      children: [{ label: 'Attendance Report', path: '/dashboard/attendance-report' }],
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
    {
      label: 'Attendance',
      children: [{ label: 'Manage Attendance', path: '/dashboard/manage-attendance' }],
    },
    {
      label: 'Examination',
      children: [{ label: 'Manage Exam Report', path: '/dashboard/manage-exam' }],
    },
    { label: 'Settings', path: '/settings' },
  ],

  owner: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Communication', path: '/dashboard/communication' },
    { label: 'Manage Staff', path: '/dashboard/manage-staff' },
    { label: 'Manage Students', path: '/dashboard/manage-students' },
    {
      label: 'Attendance',
      children: [{ label: 'Attendance Report', path: '/dashboard/attendance-report' }],
    },
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

/* ===== ORDS endpoints ===== */
const HOST =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools';
const DASHBOARD_API = `${HOST}/get/admin/dashboard/`;
const ACADEMIC_YEAR_API = `${HOST}/academic/get/academic_year/`;
const CLASSES_API = `${HOST}/academic/get/classes/`;
const COMMS_SENT_API = `${HOST}/comms/dashboard/sent/`;

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

const jtxt = async (u, init) => {
  const r = await fetch(u, { cache: 'no-store', headers: { Accept: 'application/json' }, ...(init || {}) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.text()).trim();
};
const jarr = async (u) => {
  const t = await jtxt(u);
  if (!t) return [];
  try {
    const d = JSON.parse(t);
    return Array.isArray(d) ? d : Array.isArray(d.items) ? d.items : [];
  } catch {
    return [];
  }
};

// Find a matching path by menu label
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
    case 'ALL':
      return 'All (Parents, Teachers & Students)';
    case 'ALL_PARENTS':
      return 'All Parents';
    case 'ALL_TEACHERS':
      return 'All Teachers/Staff';
    case 'ALL_STUDENTS':
      return 'All Students';
    case 'CLASS_PARENTS':
      return `Class Parents${c ? ` — ${c.class_name}` : ''}`;
    case 'CLASS_STUDENTS':
      return `Class Students${c ? ` — ${c.class_name}` : ''}`;
    default:
      return targetType || '';
  }
}
const fmtWhen = (isoLike) => {
  if (!isoLike) return '';
  const d = new Date(isoLike);
  return isNaN(d.getTime()) ? String(isoLike) : d.toLocaleString();
};

/* ===== Component ===== */
const RECENT_LIMIT = 5;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth() || {};

  const role = (user?.userType || 'admin').toLowerCase();
  const userId = user?.id;
  const schoolId = user?.schoolId;

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

  // Load stats + current academic year
  useEffect(() => {
    if (!userId || !schoolId) return;
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setApiErr('');

        const statsUrl = `${DASHBOARD_API}?user_id=${encodeURIComponent(userId)}`;
        const yearUrl = `${ACADEMIC_YEAR_API}?p_school_id=${encodeURIComponent(schoolId)}`;

        const [statsRes, yearRes] = await Promise.all([
          fetch(statsUrl, { headers: { Accept: 'application/json' }, signal: ac.signal }),
          fetch(yearUrl, { headers: { Accept: 'application/json' }, signal: ac.signal }),
        ]);

        const statsJson = await statsRes.json().catch(() => ({}));
        if (!statsRes.ok || statsJson?.error) {
          throw new Error(statsJson?.error || `Stats load failed: ${statsRes.status}`);
        }

        // Defensive mapping for field name variants coming from PL/SQL
        setData({
          totalStudents: statsJson.totalStudents ?? statsJson.total_students ?? 0,
          totalTeachers: statsJson.totalTeachers ?? statsJson.total_teachers ?? 0,
          totalClasses:
            statsJson.totalClasses ?? statsJson.total_class ?? statsJson.totalClass ?? 0,
          attendanceRate: statsJson.attendanceRate ?? statsJson.attendance_rate ?? 0,
          revenue: statsJson.revenue ?? 0,
          totalStaff: statsJson.totalStaff ?? statsJson.total_staff ?? 0,
        });

        // Academic year
        let yearName = '';
        try {
          const yearJson = await yearRes.json();
          if (Array.isArray(yearJson) && yearJson.length) {
            const current = yearJson.find(
              (y) => String(y.status ?? '').toUpperCase() === 'CURRENT'
            );
            yearName =
              current?.academic_year_name || yearJson[0]?.academic_year_name || '';
          }
        } catch {
          /* ignore */
        }
        setAcademicYear(yearName);
      } catch (e) {
        setApiErr(e?.message || 'Network error');
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [userId, schoolId]);

  // Load classes (for audience labels)
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        const rows = await jarr(`${CLASSES_API}?p_school_id=${encodeURIComponent(schoolId)}`);
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
  }, [schoolId]);

  // Load recent dashboard messages (activity)
  useEffect(() => {
    if (!userId || !schoolId) return;
    (async () => {
      try {
        setRecentLoading(true);
        const rows = await jarr(
          `${COMMS_SENT_API}?p_school_id=${encodeURIComponent(
            schoolId
          )}&p_created_by=${encodeURIComponent(userId)}`
        );
        const sorted = [...rows].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setRecentMsgs(sorted.slice(0, 3));
      } catch {
        setRecentMsgs([]);
      } finally {
        setRecentLoading(false);
      }
    })();
  }, [userId, schoolId]);

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
      { label: 'Manage Classes', icon: <School className="h-5 w-5" /> },
      { label: 'View Attendance', icon: <CalendarCheck className="h-5 w-5" /> },
    ];
    return defs.map((a) => ({ ...a, path: resolveRouteByRoleAndLabel(role, a.label) }));
  }, [role]);

  return (
    <DashboardLayout title="School Dashboard" subtitle="Overview of your school's performance and activities">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-6 text-white mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-1">Welcome to the Admin Dashboard 🎓</h2>
        <p className="text-sm sm:text-base text-purple-100">
          Get insights into your school’s performance, staff, students, and operations.
        </p>
      </div>

      {/* If auth not ready */}
      {(!userId || !schoolId) && (
        <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
          Preparing your dashboard…
        </div>
      )}

      {/* Error */}
      {apiErr && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {apiErr}
        </div>
      )}

      {/* Stats */}
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

      {/* Revenue highlight */}
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
            <School className="h-10 w-10 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
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

      {/* Recent Activity — Dashboard Messages */}
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
              key={m.message_id}
              className="flex items-start gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className="flex-shrink-0">
                <Megaphone className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {m.subject || '(No subject)'}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100 border border-indigo-100 dark:border-indigo-700">
                    {readableAudience(m.target_type, m.class_id, classes)}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Inbox className="h-3.5 w-3.5" /> Dashboard
                    {String(m.has_email || '').toUpperCase() === 'Y' && (
                      <span className="inline-flex items-center gap-1 ml-2">
                        <Mail className="h-3.5 w-3.5" /> Email
                      </span>
                    )}
                    {String(m.has_sms || '').toUpperCase() === 'Y' && (
                      <span className="inline-flex items-center gap-1 ml-2">
                        <MessageSquare className="h-3.5 w-3.5" /> SMS
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-200 mt-1 line-clamp-2">
                  {safeText(m.body, 200)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Sent on: {fmtWhen(m.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
