import React from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import {
  Users,
  UserCheck,
  BookOpen,
  BarChart2,
  ClipboardList,
  CalendarCheck,
  CheckCircle,
  Megaphone,
  FileText,
  Eye,
  Award,
  ClipboardCheck,
  GraduationCap,
} from "lucide-react";

const headStats = [
  {
    label: "Teachers Supervised",
    value: 18,
    change: "3 observations due this week",
    icon: <UserCheck className="h-6 w-6 text-green-500" />,
  },
  {
    label: "Classes Observed",
    value: 42,
    change: "8 this term",
    icon: <Eye className="h-6 w-6 text-purple-500" />,
  },
  {
    label: "Attendance Alerts (Today)",
    value: 12,
    change: "Across 4 classes",
    icon: <ClipboardList className="h-6 w-6 text-orange-500" />,
  },
  {
    label: "Reports to Approve",
    value: 9,
    change: "Pending signatures",
    icon: <FileText className="h-6 w-6 text-blue-500" />,
  },
];

const quickActions = [
  {
    label: "Approve Report Cards",
    to: "/dashboard/attendance", // adjust to your actual approvals route
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    label: "Attendance Report",
    to: "/dashboard/attendance",
    icon: <BarChart2 className="h-5 w-5" />,
  },
  {
    label: "Schedule Observation",
    to: "/dashboard/manage-staff",
    icon: <CalendarCheck className="h-5 w-5" />,
  },
  {
    label: "Manage Timetable",
    to: "/dashboard/communication", // replace with timetable page when available
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    label: "Post Announcement",
    to: "/dashboard/communication",
    icon: <Megaphone className="h-5 w-5" />,
  },
  {
    label: "Exam Schedules",
    to: "/dashboard/manage-students", // adjust if you have an exams page
    icon: <Award className="h-5 w-5" />,
  },
];

const activityFeed = [
  {
    icon: <CheckCircle className="text-green-500 h-5 w-5" />,
    text: "Approved report cards for JHS 2B (Maths & Science)",
    date: "8/18/2025, 09:10",
  },
  {
    icon: <ClipboardList className="text-indigo-500 h-5 w-5" />,
    text: "Attendance flagged: Grade 6A — 4 late, 2 absent",
    date: "8/18/2025, 08:25",
  },
  {
    icon: <Megaphone className="text-orange-500 h-5 w-5" />,
    text: "Announcement posted: PTA Meeting (Friday 3:00 PM)",
    date: "8/17/2025, 16:05",
  },
  {
    icon: <Eye className="text-purple-500 h-5 w-5" />,
    text: "Class observation scheduled for Mr. Owusu (Eng. 7B)",
    date: "8/17/2025, 12:40",
  },
  {
    icon: <FileText className="text-blue-500 h-5 w-5" />,
    text: "Termly subject reports submitted by Science Dept.",
    date: "8/16/2025, 10:15",
  },
];

export default function HeadTeacherDashboard() {
  return (
    <DashboardLayout
      title="HeadTeacher Dashboard"
      // subtitle="Academic oversight, approvals, and school performance at a glance"
    >
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-700 rounded-2xl p-4 sm:p-6 text-white mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="h-6 w-6 opacity-90" />
          <h2 className="text-xl sm:text-2xl font-bold">
            Welcome, HeadTeacher (HT) 🧑‍💼
          </h2>
        </div>
        <p className="text-sm sm:text-base text-indigo-100">
          Track teacher performance, approve report cards, monitor attendance, and keep academics on course.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        {headStats.map((item, idx) => (
          <div
            key={idx}
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

      {/* Quick Actions */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.to}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-100 rounded-xl border border-indigo-100 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition"
            >
              {action.icon}
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Teachers & Academics Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {/* Supervision Queue */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              <h4 className="font-semibold">Upcoming Observations</h4>
            </div>
            <Link to="/dashboard/manage-staff" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-3 text-sm">
            {[
              { name: "Mrs. Mensah", subject: "Maths (8A)", when: "Wed 10:30" },
              { name: "Mr. Owusu", subject: "English (7B)", when: "Thu 09:15" },
              { name: "Ms. Adjei", subject: "Science (6C)", when: "Fri 11:00" },
            ].map((t, i) => (
              <li
                key={i}
                className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-800 dark:text-gray-100">{t.name}</div>
                  <div className="text-gray-500 dark:text-gray-400">{t.subject}</div>
                </div>
                <div className="text-indigo-600 dark:text-indigo-300 font-medium">{t.when}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* Attendance Snapshot */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-orange-500" />
              <h4 className="font-semibold">Attendance Snapshot (Today)</h4>
            </div>
            <Link to="/dashboard/attendance" className="text-sm text-indigo-600 hover:underline">
              Open report
            </Link>
          </div>
          <ul className="space-y-3 text-sm">
            {[
              { cls: "6A", present: 28, total: 30 },
              { cls: "7B", present: 29, total: 30 },
              { cls: "JHS 2B", present: 31, total: 33 },
            ].map((c, i) => (
              <li
                key={i}
                className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg"
              >
                <div className="font-medium text-gray-800 dark:text-gray-100">Class {c.cls}</div>
                <div className="text-gray-600 dark:text-gray-300">
                  {c.present}/{c.total} present
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Exams & Reports */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <h4 className="font-semibold">Exams & Reports</h4>
            </div>
            <Link to="/dashboard/manage-students" className="text-sm text-indigo-600 hover:underline">
              Configure
            </Link>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg">
              <div>
                <div className="font-medium">Mid-Term Exams</div>
                <div className="text-gray-500 dark:text-gray-400">Schedule draft ready</div>
              </div>
              <span className="text-indigo-600 dark:text-indigo-300 font-medium">Review</span>
            </li>
            <li className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg">
              <div>
                <div className="font-medium">Reports to Sign</div>
                <div className="text-gray-500 dark:text-gray-400">9 pending approval</div>
              </div>
              <span className="text-indigo-600 dark:text-indigo-300 font-medium">Approve</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Recent Activity
          </h3>
          <Link to="/dashboard/communication" className="text-sm text-indigo-600 hover:underline">
            View All
          </Link>
        </div>
        <ul className="space-y-4">
          {activityFeed.map((item, index) => (
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
}
