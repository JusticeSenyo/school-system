// src/pages/AdminDashboard.js
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import {
  Users,
  UserCheck,
  BookOpen,
  BarChart2,
  ClipboardList,
  CalendarCheck,
  UserPlus,
  UserCog,
  School,
  CheckCircle,
  Megaphone,
  FileText
} from 'lucide-react';
import { useAuth } from '../AuthContext';

// ===== Role-based menus (your provided config) =====
export const roleBasedMenus = {
  admin: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Communication", path: "/dashboard/communication" },
    { label: "Manage Staff", path: "/dashboard/manage-staff" },
    { label: "Manage Students", path: "/dashboard/manage-students" },
    { label: "Attendance", path: "/dashboard/attendance" },
    {
      label: "Fees",
      children: [
        { label: "Manage Fees", path: "/dashboard/manage-fees" },
        { label: "Fees Report", path: "/dashboard/fees-report" },
        { label: "Print Bill", path: "/dashboard/print-bill" },
      ],
    },
    {
      label: "Academics",
      children: [
        { label: "Manage Class Teacher", path: "/dashboard/class-teacher" },
        { label: "Manage Subjects", path: "/dashboard/manage-subjects" },
        { label: "Assign Subjects", path: "/dashboard/assign-subjects" },
        { label: "Manage Classes", path: "/dashboard/classes" },
      ],
    },
    {
      label: "Examination",
      children: [
        { label: "Print Exam Report", path: "/dashboard/print-exam-report" },
      ],
    },
    { label: "Settings", path: "/settings" },
  ],

  headteacher: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Communication", path: "/dashboard/communication" },
    { label: "Manage Staff", path: "/dashboard/manage-staff" },
    { label: "Manage Students", path: "/dashboard/manage-students" },
    {
      label: "Attendance",
      children: [
        { label: "Attendance Report", path: "/dashboard/attendance-report" },
      ],
    },
    {
      label: "Examination",
      children: [
        { label: "Manage Exam Report", path: "/dashboard/manage-exam" },
        { label: "Print Exam Report", path: "/dashboard/print-exam-report" },
      ],
    },
    { label: "Settings", path: "/settings" },
  ],

  accountant: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Communication", path: "/dashboard/communication" },
    { label: "Manage Students", path: "/dashboard/manage-students" },
    {
      label: "Fees",
      children: [
        { label: "Manage Fees", path: "/dashboard/manage-fees" },
        { label: "Fees Report", path: "/dashboard/fees-report" },
        { label: "Print Bill", path: "/dashboard/print-bill" },
      ],
    },
    { label: "Settings", path: "/settings" },
  ],

  teacher: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Communication", path: "/dashboard/communication" },
    { label: "Manage Students", path: "/dashboard/manage-students" },
    {
      label: "Attendance",
      children: [
        { label: "Manage Attendance", path: "/dashboard/manage-attendance" },
      ],
    },
    {
      label: "Examination",
      children: [
        { label: "Manage Exam Report", path: "/dashboard/manage-exam" },
      ],
    },
    { label: "Settings", path: "/settings" },
  ],

  owner: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Communication", path: "/dashboard/communication" },
    { label: "Manage Staff", path: "/dashboard/manage-staff" },
    { label: "Manage Students", path: "/dashboard/manage-students" },
    {
      label: "Attendance",
      children: [
        { label: "Attendance Report", path: "/dashboard/attendance-report" },
      ],
    },
    {
      label: "Fees",
      children: [
        { label: "Manage Fees", path: "/dashboard/manage-fees" },
        { label: "Fees Report", path: "/dashboard/fees-report" },
        { label: "Print Bill", path: "/dashboard/print-bill" },
      ],
    },
    {
      label: "Academics",
      children: [
        { label: "Manage Class Teacher", path: "/dashboard/class-teacher" },
        { label: "Manage Subjects", path: "/dashboard/manage-subjects" },
        { label: "Assign Subjects", path: "/dashboard/assign-subjects" },
        { label: "Manage Classes", path: "/dashboard/classes" },
      ],
    },
    {
      label: "Examination",
      children: [
        { label: "Manage Exam Report", path: "/dashboard/manage-exam" },
        { label: "Print Exam Report", path: "/dashboard/print-exam-report" },
      ],
    },
    { label: "Settings", path: "/settings" },
  ],
};

// ===== API (ORDS) ENDPOINTS =====
const DASHBOARD_API =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/get/admin/dashboard/';
const ACADEMIC_YEAR_API =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/academic/get/academic_year/';

const GHS = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
  maximumFractionDigits: 2
});

const fmtNum = (n) => (typeof n === 'number' ? n.toLocaleString() : '—');
const fmtPct = (n) =>
  (n === null || n === undefined || isNaN(Number(n))) ? '—' : `${Number(n).toFixed(2)}%`;

// Recursively search a role menu tree for a label, returning its path if found
function findPathForLabel(menuItems, label) {
  if (!Array.isArray(menuItems)) return null;
  for (const item of menuItems) {
    if (item.label === label && item.path) return item.path;
    if (item.children) {
      const childHit = findPathForLabel(item.children, label);
      if (childHit) return childHit;
    }
  }
  return null;
}

// Given a role and a label, find the correct route from roleBasedMenus.
// If not found, fall back to a sensible default map.
function resolveRouteByRoleAndLabel(role, label) {
  const normalizedRole = String(role || '').toLowerCase();
  const menu = roleBasedMenus[normalizedRole];
  const hit = findPathForLabel(menu, label);
  if (hit) return hit;

  const fallbackMap = {
    'Manage Students': '/dashboard/manage-students',
    'Manage Staff': '/dashboard/manage-staff',
    'Manage Classes': '/dashboard/classes',
    'View Attendance': '/dashboard/attendance' // teacher has /dashboard/manage-attendance; menu will override if present
  };
  return fallbackMap[label] || '/dashboard';
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth() || {};

  const role = (user?.role || 'admin').toLowerCase();   // default to 'admin' if missing
  const userId = user?.user_id ?? 1;                    // replace with your real user id from auth
  const schoolId = user?.school_id ?? 1;                // replace with your real school id from auth

  const [loading, setLoading] = useState(true);
  const [apiErr, setApiErr] = useState('');
  const [data, setData] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    attendanceRate: 0,
    revenue: 0,
    totalStaff: 0
  });
  const [academicYear, setAcademicYear] = useState(''); // dynamic academic year name

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setApiErr('');

        // Build URLs
        const statsUrl = `${DASHBOARD_API}?user_id=${encodeURIComponent(userId)}`;
        const yearUrl  = `${ACADEMIC_YEAR_API}?p_school_id=${encodeURIComponent(schoolId)}`;

        // Fetch both in parallel
        const [statsRes, yearRes] = await Promise.all([
          fetch(statsUrl, { headers: { Accept: 'application/json' }, signal: ac.signal }),
          fetch(yearUrl,  { headers: { Accept: 'application/json' }, signal: ac.signal })
        ]);

        // ---- Stats ----
        const statsJson = await statsRes.json().catch(() => ({}));
        if (!statsRes.ok || statsJson?.error) {
          throw new Error(statsJson?.error || `Stats load failed: ${statsRes.status}`);
        }
        setData({
          totalStudents: statsJson.totalStudents ?? 0,
          totalTeachers: statsJson.totalTeachers ?? 0,
          totalClasses: statsJson.totalClasses ?? 0,
          attendanceRate: statsJson.attendanceRate ?? 0,
          revenue: statsJson.revenue ?? 0,
          totalStaff: statsJson.totalStaff ?? 0
        });

        // ---- Academic Year (pick CURRENT) ----
        // API returns: [{ academic_year_id, academic_year_name, status, school_id }]
        let yearName = '';
        try {
          const yearJson = await yearRes.json();
          if (Array.isArray(yearJson) && yearJson.length) {
            const current = yearJson.find(
              y => String(y.status ?? '').toUpperCase() === 'CURRENT'
            );
            yearName =
              current?.academic_year_name ||
              yearJson[0]?.academic_year_name ||
              '';
          }
        } catch {
          // ignore JSON parse errors for year endpoint
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

  const stats = useMemo(
    () => [
      {
        label: 'Total Students',
        value: loading ? '—' : fmtNum(data.totalStudents),
        change: '',
        icon: <Users className="h-6 w-6 text-indigo-500" />
      },
      {
        label: 'Total Teachers',
        value: loading ? '—' : fmtNum(data.totalTeachers),
        change: '',
        icon: <UserCheck className="h-6 w-6 text-green-500" />
      },
      {
        label: 'Total Classes',
        value: loading ? '—' : fmtNum(data.totalClasses),
        change: 'Across all grades',
        icon: <BookOpen className="h-6 w-6 text-yellow-500" />
      },
      {
        label: 'Attendance Rate',
        value: loading ? '—' : fmtPct(data.attendanceRate),
        change: '',
        icon: <BarChart2 className="h-6 w-6 text-purple-500" />
      }
    ],
    [loading, data]
  );

  // Quick Actions → resolve to correct paths per role
  const quickActionDefs = useMemo(
    () => [
      { label: 'Manage Students', icon: <UserPlus className="h-5 w-5" /> },
      { label: 'Manage Staff', icon: <UserCog className="h-5 w-5" /> },
      { label: 'Manage Classes', icon: <School className="h-5 w-5" /> },
      { label: 'View Attendance', icon: <CalendarCheck className="h-5 w-5" /> }
    ],
    []
  );

  const actions = useMemo(
    () =>
      quickActionDefs.map(a => ({
        ...a,
        path: resolveRouteByRoleAndLabel(role, a.label)
      })),
    [role, quickActionDefs]
  );

  // Placeholder activity (keep or wire to another API later)
  const activity = [
    {
      icon: <CheckCircle className="text-green-500 h-5 w-5" />,
      text: 'New student John Doe enrolled in Grade 10',
      date: '1/20/2024, 5:30 AM'
    },
    {
      icon: <ClipboardList className="text-indigo-500 h-5 w-5" />,
      text: 'Attendance marked for Grade 9A - 28/30 present',
      date: '1/20/2024, 4:15 AM'
    },
    {
      icon: <Megaphone className="text-orange-500 h-5 w-5" />,
      text: 'New announcement posted: Parent-Teacher Meeting',
      date: '1/19/2024, 11:45 AM'
    },
    {
      icon: <FileText className="text-blue-500 h-5 w-5" />,
      text: 'Grades updated for Mathematics - Grade 8B',
      date: '1/19/2024, 9:20 AM'
    }
  ];

  return (
    <DashboardLayout
      title="School Dashboard"
      subtitle="Overview of your school's performance and activities"
    >
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-6 text-white mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-1">Welcome to the Admin Dashboard 🎓</h2>
        <p className="text-sm sm:text-base text-purple-100">
          Get insights into your school’s performance, staff, students, and operations.
        </p>
      </div>

      {/* Error */}
      {apiErr && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {apiErr}
        </div>
      )}

      {/* Stats Cards */}
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

      {/* Revenue highlight — uses dynamic CURRENT academic year */}
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

      {/* Quick Actions (role-aware navigation) */}
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

      {/* Recent Activity (placeholder) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Recent Activity</h3>
          <button className="text-sm text-indigo-600 hover:underline">View All</button>
        </div>
        <ul className="space-y-4">
          {activity.map((item, index) => (
            <li
              key={index}
              className="flex items-start space-x-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className="flex-shrink-0">{item.icon}</div>
              <div className="flex-1">
                <p className="text-sm text-gray-800 dark:text-gray-100">{item.text}</p>
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.date}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
