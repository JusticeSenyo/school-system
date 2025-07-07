// dashboards/TeacherDashboard.js
import React from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Calendar, ClipboardList, BookOpen, CheckCircle } from 'lucide-react';

const TeacherDashboard = () => {
  return (
    <DashboardLayout title="Teacher Dashboard" subtitle="Instructor">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-4 mb-2">
            <BookOpen className="text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-800">Classes Assigned</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">5</p>
          <p className="text-sm text-gray-500">This term</p>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-4 mb-2">
            <ClipboardList className="text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-800">Lesson Plans</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">12</p>
          <p className="text-sm text-gray-500">Prepared this week</p>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-4 mb-2">
            <Calendar className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Upcoming Lessons</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">3</p>
          <p className="text-sm text-gray-500">Today</p>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-4 mb-2">
            <CheckCircle className="text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Attendance</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">96%</p>
          <p className="text-sm text-gray-500">Monthly average</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;