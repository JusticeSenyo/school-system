import React from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import {
  Users,
  BookOpen,
  ClipboardList,
  BarChart2,
  CalendarCheck,
  FileText,
  Megaphone,
  CheckCircle
} from 'lucide-react';

const stats = [
  {
    label: 'Your Classes',
    value: 6,
    change: '+1 new class this term',
    icon: <BookOpen className="h-6 w-6 text-indigo-500" />
  },
  {
    label: 'Total Students',
    value: 180,
    change: 'Across assigned classes',
    icon: <Users className="h-6 w-6 text-green-500" />
  },
  {
    label: 'Attendance Rate',
    value: '96%',
    change: 'This month',
    icon: <BarChart2 className="h-6 w-6 text-purple-500" />
  },
  {
    label: 'Papers Graded',
    value: 210,
    change: 'This term',
    icon: <ClipboardList className="h-6 w-6 text-yellow-500" />
  }
];

const actions = [
  { label: 'Mark Attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Upload Grades', icon: <FileText className="h-5 w-5" /> },
  { label: 'Post Announcement', icon: <Megaphone className="h-5 w-5" /> }
];

const activity = [
  {
    icon: <CheckCircle className="text-green-500 h-5 w-5" />,
    text: 'Graded Final Exams for Grade 9B',
    date: '8/15/2025, 9:00 AM'
  },
  {
    icon: <CalendarCheck className="text-indigo-500 h-5 w-5" />,
    text: 'Marked attendance for Grade 7C',
    date: '8/14/2025, 11:45 AM'
  },
  {
    icon: <Megaphone className="text-orange-500 h-5 w-5" />,
    text: 'Posted new class update: Quiz on Friday',
    date: '8/13/2025, 4:20 PM'
  }
];

const TeacherDashboard = () => {
  return (
    <DashboardLayout title="Teacher Dashboard"
    //  subtitle="Your teaching activities and insights"
     >
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 text-white mb-8">
        <h2 className="text-2xl font-bold mb-2">Welcome to the Teacher Dashboard 👩‍🏫</h2>
        <p className="text-indigo-100">Track your assigned classes, manage student progress, and update grades.</p>
      </div>

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

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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

export default TeacherDashboard;