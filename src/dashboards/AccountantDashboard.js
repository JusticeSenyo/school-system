import React from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import {
  FileText,
  BadgeDollarSign,
  CreditCard,
  Users,
  DollarSign,
  ListChecks,
  MailCheck,
} from 'lucide-react';

const stats = [
  {
    label: 'Total Revenue',
    value: 'GHS 120,000',
    change: 'This Term',
    icon: <BadgeDollarSign className="h-6 w-6 text-green-500" />,
  },
  {
    label: 'Outstanding Fees',
    value: 'GHS 15,000',
    change: '20 students',
    icon: <CreditCard className="h-6 w-6 text-red-500" />,
  },
  {
    label: 'Invoices Sent',
    value: '300',
    change: 'This Term',
    icon: <FileText className="h-6 w-6 text-indigo-500" />,
  },
  {
    label: 'Students Billed',
    value: '500',
    change: '80% of students',
    icon: <Users className="h-6 w-6 text-yellow-500" />,
  },
];

const actions = [
  { label: 'Manage Fees', icon: <DollarSign className="h-5 w-5" /> },
  { label: 'Send Invoice', icon: <MailCheck className="h-5 w-5" /> },
  { label: 'Track Payments', icon: <ListChecks className="h-5 w-5" /> },
];

const activity = [
  {
    icon: <BadgeDollarSign className="text-green-500 h-5 w-5" />,
    text: 'Collected GHS 4,500 from Grade 9 students',
    date: 'Aug 14, 2025, 10:30 AM',
  },
  {
    icon: <CreditCard className="text-red-500 h-5 w-5" />,
    text: '15 new fee defaulters added from Grade 10',
    date: 'Aug 13, 2025, 3:15 PM',
  },
  {
    icon: <FileText className="text-blue-500 h-5 w-5" />,
    text: 'Invoices sent to all Grade 8 students',
    date: 'Aug 13, 2025, 1:00 PM',
  },
];

const AccountantDashboard = () => {
  return (
    <DashboardLayout title="Finance Dashboard" subtitle="Manage school finances, invoices, and fee reports">
      <div className="bg-gradient-to-r from-green-500 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white mb-8">
        <h2 className="text-2xl font-bold mb-2">Welcome to the Accountant Dashboard 💼</h2>
        <p className="text-white/80">Track fees, manage payments, and monitor financial insights of your school.</p>
      </div>

      {/* Stats */}
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

      {/* Actions */}
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

      {/* Activity */}
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

export default AccountantDashboard;
