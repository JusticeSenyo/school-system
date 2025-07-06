import React from 'react';
import { useAuth } from '../AuthContext';
import { 
  LogOut, Users, GraduationCap, BookOpen, DollarSign, TrendingUp, AlertTriangle, Settings, 
  BarChart3, Calendar, Search, Bell, MessageSquare, Filter, Download, Plus, Eye,
  Activity, Target, Award, CheckCircle, XCircle, Clock, FileText, Shield,
  ChevronRight, MoreVertical, ArrowUpRight, ArrowDownRight, Zap
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  // Mock data for admin dashboard
  const keyMetrics = [
    { 
      label: "Total Students", 
      value: "1,247", 
      change: "+5.2%", 
      trend: "up", 
      icon: GraduationCap, 
      color: "blue",
      description: "Active enrollments"
    },
    { 
      label: "Teaching Staff", 
      value: "89", 
      change: "+3", 
      trend: "up", 
      icon: Users, 
      color: "green",
      description: "Full-time educators"
    },
    { 
      label: "Monthly Revenue", 
      value: "$287K", 
      change: "+12.3%", 
      trend: "up", 
      icon: DollarSign, 
      color: "emerald",
      description: "Tuition & fees"
    },
    { 
      label: "Avg. Performance", 
      value: "82.4%", 
      change: "+2.1%", 
      trend: "up", 
      icon: TrendingUp, 
      color: "purple",
      description: "School-wide GPA"
    }
  ];

  const systemAlerts = [
    { id: 1, type: "critical", message: "Server maintenance scheduled for tonight", time: "2 hours ago", icon: AlertTriangle },
    { id: 2, type: "warning", message: "12 students have pending fee payments", time: "4 hours ago", icon: DollarSign },
    { id: 3, type: "info", message: "7 new enrollment applications pending", time: "1 day ago", icon: Users },
    { id: 4, type: "success", message: "Backup completed successfully", time: "1 day ago", icon: CheckCircle }
  ];

  const recentActivities = [
    { id: 1, user: "Sarah Wilson", action: "enrolled 5 new students", department: "Admissions", time: "2 hours ago", type: "enrollment" },
    { id: 2, user: "Math Department", action: "updated curriculum guidelines", department: "Academic", time: "4 hours ago", type: "curriculum" },
    { id: 3, user: "Finance Team", action: "processed monthly payments", department: "Finance", time: "6 hours ago", type: "finance" },
    { id: 4, user: "IT Support", action: "upgraded system security", department: "Technology", time: "1 day ago", type: "system" }
  ];

  const departmentPerformance = [
    { department: "Mathematics", students: 312, performance: 85.2, trend: "up", change: "+2.1%" },
    { department: "Science", students: 298, performance: 82.7, trend: "up", change: "+1.8%" },
    { department: "English", students: 287, performance: 88.1, trend: "up", change: "+3.2%" },
    { department: "History", students: 203, performance: 79.8, trend: "down", change: "-1.1%" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Administration Dashboard</h1>
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">System Administrator</span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search users, reports..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-64"
                />
              </div>
              
              {/* Quick Actions */}
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Settings className="h-5 w-5" />
              </button>
              
              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">5</span>
              </button>
              
              {/* Profile */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                  {user.name?.charAt(0)}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">School Overview Dashboard 📊</h2>
                <p className="text-purple-100 mb-4">Comprehensive insights and management tools for your institution.</p>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-1">
                    <Activity className="h-4 w-4" />
                    <span>System Status: Optimal</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Shield className="h-4 w-4" />
                    <span>Security: Enhanced</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Zap className="h-4 w-4" />
                    <span>Performance: 99.2%</span>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <Target className="h-8 w-8 mb-2" />
                  <div className="text-right">
                    <p className="text-xl font-bold">2024-25</p>
                    <p className="text-sm text-purple-100">Academic Year</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {keyMetrics.map((metric) => {
            const IconComponent = metric.icon;
            return (
              <div key={metric.label} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-${metric.color}-100`}>
                    <IconComponent className={`h-6 w-6 text-${metric.color}-600`} />
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    {metric.trend === 'up' ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
                  <p className="text-sm font-medium text-gray-700">{metric.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* System Alerts & Performance */}
          <div className="lg:col-span-2 space-y-8">
            {/* System Alerts */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                    System Alerts & Notifications
                  </h3>
                  <button className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center">
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {systemAlerts.map((alert) => {
                    const IconComponent = alert.icon;
                    return (
                      <div key={alert.id} className={`flex items-start space-x-3 p-4 rounded-lg border-l-4 ${
                        alert.type === 'critical' ? 'border-red-500 bg-red-50' :
                        alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                        alert.type === 'info' ? 'border-blue-500 bg-blue-50' :
                        'border-green-500 bg-green-50'
                      }`}>
                        <IconComponent className={`h-5 w-5 mt-0.5 ${
                          alert.type === 'critical' ? 'text-red-600' :
                          alert.type === 'warning' ? 'text-yellow-600' :
                          alert.type === 'info' ? 'text-blue-600' :
                          'text-green-600'
                        }`} />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            alert.type === 'critical' ? 'text-red-800' :
                            alert.type === 'warning' ? 'text-yellow-800' :
                            alert.type === 'info' ? 'text-blue-800' :
                            'text-green-800'
                          }`}>
                            {alert.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Department Performance */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                    Department Performance
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                      <Filter className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {departmentPerformance.map((dept) => (
                    <div key={dept.department} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{dept.department}</p>
                          <p className="text-sm text-gray-500">{dept.students} students</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-gray-900">{dept.performance}%</span>
                          <span className={`text-sm ${dept.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {dept.change}
                          </span>
                        </div>
                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${dept.performance}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="lg:col-span-1 space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                  Quick Actions
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center transition-colors group">
                    <Users className="h-6 w-6 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-blue-800">Manage Staff</p>
                  </button>
                  <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center transition-colors group">
                    <GraduationCap className="h-6 w-6 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-green-800">Student Records</p>
                  </button>
                  <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center transition-colors group">
                    <BarChart3 className="h-6 w-6 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-purple-800">View Reports</p>
                  </button>
                  <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-center transition-colors group">
                    <DollarSign className="h-6 w-6 text-orange-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-orange-800">Finance</p>
                  </button>
                  <button className="p-4 bg-red-50 hover:bg-red-100 rounded-lg text-center transition-colors group">
                    <Settings className="h-6 w-6 text-red-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-red-800">System Config</p>
                  </button>
                  <button className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-center transition-colors group">
                    <Plus className="h-6 w-6 text-indigo-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-indigo-800">Add New</p>
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-green-600" />
                    Recent Activities
                  </h3>
                  <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                    View All
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        activity.type === 'enrollment' ? 'bg-blue-100 text-blue-700' :
                        activity.type === 'curriculum' ? 'bg-green-100 text-green-700' :
                        activity.type === 'finance' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {activity.type === 'enrollment' ? <Users className="h-4 w-4" /> :
                         activity.type === 'curriculum' ? <BookOpen className="h-4 w-4" /> :
                         activity.type === 'finance' ? <DollarSign className="h-4 w-4" /> :
                         <Settings className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.user}
                          </p>
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                            {activity.department}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {activity.action}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Overview */}
        <div className="mt-8">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-indigo-600" />
                  School Analytics Overview
                </h3>
                <div className="flex items-center space-x-2">
                  <select className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-indigo-500">
                    <option>Last 30 days</option>
                    <option>Last 3 months</option>
                    <option>Last year</option>
                  </select>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Mock Chart Area */}
              <div className="h-80 bg-gradient-to-t from-indigo-50 to-white rounded-lg border-2 border-dashed border-indigo-200 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 text-indigo-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium text-lg">Comprehensive Analytics Dashboard</p>
                  <p className="text-sm text-gray-400 mt-2">Student performance, financial metrics, and operational insights</p>
                </div>
              </div>
              
              {/* Key Insights */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}