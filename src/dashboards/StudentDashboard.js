// dashboards/StudentDashboard.js
import React from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { GraduationCap, CalendarCheck, BookOpen, FileText } from 'lucide-react';

const StudentDashboard = () => {
  return (
    <DashboardLayout title="Student Dashboard" subtitle="Learner">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-4 mb-2">
            <GraduationCap className="text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-800">GPA</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">3.82</p>
          <p className="text-sm text-gray-500">Current academic year</p>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-4 mb-2">
            <BookOpen className="text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-800">Subjects</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">9</p>
          <p className="text-sm text-gray-500">Total enrolled</p>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-4 mb-2">
            <FileText className="text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-800">Assignments</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">4</p>
          <p className="text-sm text-gray-500">Pending submission</p>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-4 mb-2">
            <CalendarCheck className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Next Class</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">10:30 AM</p>
          <p className="text-sm text-gray-500">Mathematics</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;