// dashboards/AdminDashboard.js
import React from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Activity, Award, BarChart3, BookOpen, DollarSign, GraduationCap, Shield, Target, TrendingUp, Users, Zap } from 'lucide-react';

const AdminDashboard = () => {
  return (
    <DashboardLayout title="Administration Dashboard" subtitle="System Administrator">
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white mb-8">
        <h2 className="text-2xl font-bold mb-2">Welcome to the Admin Dashboard 🎓</h2>
        <p className="text-purple-100">Get insights into your school’s performance, staff, students, and operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Key Metric Cards (placeholders) */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-blue-100 rounded-xl">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-green-600 text-sm font-medium">+5.2%</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">1,247</p>
          <p className="text-sm text-gray-600">Total Students</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-green-100 rounded-xl">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-green-600 text-sm font-medium">+3</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">89</p>
          <p className="text-sm text-gray-600">Teaching Staff</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
            <span className="text-green-600 text-sm font-medium">+12.3%</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">$287K</p>
          <p className="text-sm text-gray-600">Monthly Revenue</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-purple-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-green-600 text-sm font-medium">+2.1%</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">82.4%</p>
          <p className="text-sm text-gray-600">Avg. Performance</p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <Award className="h-6 w-6 text-blue-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-blue-600">95%</div>
          <div className="text-sm text-blue-800">Student Satisfaction</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <Target className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-green-600">87%</div>
          <div className="text-sm text-green-800">Graduation Rate</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-purple-600">+15%</div>
          <div className="text-sm text-purple-800">Enrollment Growth</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <Shield className="h-6 w-6 text-orange-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-orange-600">99.8%</div>
          <div className="text-sm text-orange-800">System Uptime</div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
