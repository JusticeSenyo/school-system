import React from 'react';
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

const stats = [
  {
    label: 'Total Students',
    value: 850,
    change: '+12 from last month',
    icon: <Users className="h-6 w-6 text-indigo-500" />
  },
  {
    label: 'Total Teachers',
    value: 45,
    change: '+2 from last month',
    icon: <UserCheck className="h-6 w-6 text-green-500" />
  },
  {
    label: 'Total Classes',
    value: 32,
    change: 'Across all grades',
    icon: <BookOpen className="h-6 w-6 text-yellow-500" />
  },
  {
    label: 'Attendance Rate',
    value: '94.5%',
    change: '+2.1% from last month',
    icon: <BarChart2 className="h-6 w-6 text-purple-500" />
  }
];

const actions = [
  { label: 'Manage Students', icon: <UserPlus className="h-5 w-5" /> },
  { label: 'Manage Staff', icon: <UserCog className="h-5 w-5" /> },
  { label: 'Manage Classes', icon: <School className="h-5 w-5" /> },
  { label: 'View Attendance', icon: <CalendarCheck className="h-5 w-5" /> }
];

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

const AdminDashboard = () => {
  return (
    <DashboardLayout title="School Dashboard" subtitle="Overview of your school's performance and activities">
      
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white mb-8">
        <h2 className="text-2xl font-bold mb-2">Welcome to the Admin Dashboard 🎓</h2>
        <p className="text-purple-100">Get insights into your school’s performance, staff, students, and operations.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((item, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
              {item.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{item.value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{item.change}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {actions.map((action, index) => (
            <button
              key={index}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-100 rounded-xl border border-indigo-100 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition"
            >
              {action.icon}
              <span className="font-medium text-sm">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Recent Activity</h3>
          <button className="text-sm text-indigo-600 hover:underline">View All</button>
        </div>
        <ul className="space-y-4">
          {activity.map((item, index) => (
            <li key={index} className="flex items-start space-x-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div>{item.icon}</div>
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
