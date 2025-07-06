import React from 'react';
import { useAuth } from '../AuthContext';
import { 
  LogOut, Users, BookOpen, Calendar, Bell, MessageSquare, TrendingUp, Clock, 
  Search, Filter, Plus, MoreVertical, Star, Award, AlertCircle, CheckCircle,
  FileText, BarChart3, Activity, Target, Zap, ChevronRight, Download
} from 'lucide-react';

export default function TeacherDashboard() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  // Mock data for demonstration
  const todayClasses = [
    { id: 1, subject: "Mathematics", grade: "10A", time: "9:00 AM", room: "204", status: "current", students: 28 },
    { id: 2, subject: "Algebra", grade: "11B", time: "11:00 AM", room: "204", status: "upcoming", students: 25 },
    { id: 3, subject: "Calculus", grade: "12A", time: "2:00 PM", room: "204", status: "upcoming", students: 22 }
  ];

  const recentSubmissions = [
    { id: 1, student: "Emma Wilson", assignment: "Quadratic Equations", subject: "Math", submitted: "2 hours ago", status: "pending" },
    { id: 2, student: "James Chen", assignment: "Algebra Quiz #3", subject: "Math", submitted: "4 hours ago", status: "graded" },
    { id: 3, student: "Sarah Johnson", assignment: "Trigonometry Homework", subject: "Math", submitted: "1 day ago", status: "pending" },
    { id: 4, student: "Michael Brown", assignment: "Statistics Project", subject: "Math", submitted: "1 day ago", status: "reviewed" }
  ];

  const quickStats = [
    { label: "Total Students", value: "127", change: "+5.2%", trend: "up", icon: Users, color: "blue" },
    { label: "Active Courses", value: "5", change: "Same", trend: "neutral", icon: BookOpen, color: "green" },
    { label: "Pending Reviews", value: "12", change: "-2", trend: "down", icon: Clock, color: "orange" },
    { label: "Avg. Grade", value: "85.2%", change: "+2.1%", trend: "up", icon: TrendingUp, color: "purple" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Teacher Dashboard</h1>
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Mathematics Department</span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search students, assignments..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
              </div>
              
              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">3</span>
              </button>
              
              {/* Messages */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <MessageSquare className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full"></span>
              </button>
              
              {/* Profile */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">Mathematics Teacher</p>
                </div>
                <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
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
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Good morning, {user.name?.split(' ')[0]}! 👋</h2>
                <p className="text-blue-100 mb-4">You have 3 classes today and 12 assignments to review.</p>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Next class in 25 minutes</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>127 students total</span>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <Calendar className="h-8 w-8 mb-2" />
                  <div className="text-right">
                    <p className="text-2xl font-bold">05</p>
                    <p className="text-sm text-blue-100">Jul 2025</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <div className="flex items-center mt-2">
                      <span className={`text-sm ${
                        stat.trend === 'up' ? 'text-green-600' : 
                        stat.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {stat.change}
                      </span>
                      <span className="text-gray-500 text-sm ml-1">vs last month</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl bg-${stat.color}-100`}>
                    <IconComponent className={`h-6 w-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Classes */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                    Today's Schedule
                  </h3>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center">
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {todayClasses.map((classItem) => (
                    <div key={classItem.id} className={`border-l-4 pl-4 py-3 rounded-r-lg ${
                      classItem.status === 'current' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-semibold text-gray-900">{classItem.subject}</h4>
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              Grade {classItem.grade}
                            </span>
                            {classItem.status === 'current' && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                In Progress
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {classItem.time}
                            </span>
                            <span>Room {classItem.room}</span>
                            <span>{classItem.students} students</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg">
                            <FileText className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg">
                            <Users className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Class
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    View Calendar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Submissions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-green-600" />
                    Recent Submissions
                  </h3>
                  <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                    View All
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentSubmissions.map((submission) => (
                    <div key={submission.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                          {submission.student.charAt(0)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {submission.student}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {submission.assignment}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {submission.submitted}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {submission.status === 'pending' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pending
                          </span>
                        )}
                        {submission.status === 'graded' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Graded
                          </span>
                        )}
                        {submission.status === 'reviewed' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            <Star className="h-3 w-3 mr-1" />
                            Reviewed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 space-y-2">
                  <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center">
                    <Award className="h-4 w-4 mr-2" />
                    Grade Submissions
                  </button>
                  <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                    Create Assignment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="mt-8">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                  Class Performance Overview
                </h3>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    Last 30 days
                  </button>
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
              {/* Mock Chart Area */}
              <div className="h-64 bg-gradient-to-t from-purple-50 to-white rounded-lg border-2 border-dashed border-purple-200 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-purple-400 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">Student Performance Analytics</p>
                  <p className="text-sm text-gray-400">Charts and detailed analytics coming soon</p>
                </div>
              </div>
              
              {/* Quick Insights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">92%</div>
                  <div className="text-sm text-blue-800">Assignment Completion</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">B+</div>
                  <div className="text-sm text-green-800">Average Grade</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">89%</div>
                  <div className="text-sm text-purple-800">Attendance Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}