import React from 'react';
import { useAuth } from '../AuthContext';
import { 
  LogOut, BookOpen, Calendar, Clock, Award, TrendingUp, FileText, Bell, MessageSquare,
  Search, Target, Activity, Star, CheckCircle, AlertTriangle, Play, Download,
  ChevronRight, MoreVertical, Plus, Filter, Eye, Users, Zap, GraduationCap,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Bookmark, Heart
} from 'lucide-react';

export default function StudentDashboard() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  // Mock data for student dashboard
  const academicOverview = [
    { 
      label: "Current GPA", 
      value: "3.7", 
      outOf: "4.0",
      change: "+0.2", 
      trend: "up", 
      icon: Award, 
      color: "emerald",
      description: "This semester"
    },
    { 
      label: "Credits Earned", 
      value: "24", 
      outOf: "32",
      change: "+6", 
      trend: "up", 
      icon: Target, 
      color: "blue",
      description: "Toward graduation"
    },
    { 
      label: "Assignments Due", 
      value: "3", 
      outOf: "15",
      change: "-2", 
      trend: "down", 
      icon: FileText, 
      color: "orange",
      description: "This week"
    },
    { 
      label: "Attendance", 
      value: "96%", 
      outOf: "100%",
      change: "+1%", 
      trend: "up", 
      icon: TrendingUp, 
      color: "purple",
      description: "Excellent record"
    }
  ];

  const todaySchedule = [
    { 
      id: 1, 
      subject: "Advanced Mathematics", 
      teacher: "Prof. Johnson", 
      time: "9:00 AM", 
      duration: "90 min",
      room: "204", 
      status: "current",
      type: "lecture",
      attendance: "required"
    },
    { 
      id: 2, 
      subject: "Physics Laboratory", 
      teacher: "Dr. Smith", 
      time: "11:00 AM", 
      duration: "120 min",
      room: "Lab 3", 
      status: "upcoming",
      type: "lab",
      attendance: "required"
    },
    { 
      id: 3, 
      subject: "English Literature", 
      teacher: "Ms. Davis", 
      time: "2:00 PM", 
      duration: "60 min",
      room: "105", 
      status: "upcoming",
      type: "discussion",
      attendance: "optional"
    }
  ];

  const recentGrades = [
    { id: 1, subject: "Calculus", assignment: "Midterm Exam", grade: "A-", points: "92/100", date: "2 days ago", trend: "up" },
    { id: 2, subject: "Physics", assignment: "Lab Report #3", grade: "B+", points: "88/100", date: "1 week ago", trend: "up" },
    { id: 3, subject: "English", assignment: "Essay Analysis", grade: "A", points: "95/100", date: "1 week ago", trend: "up" },
    { id: 4, subject: "History", assignment: "Research Paper", grade: "B", points: "85/100", date: "2 weeks ago", trend: "neutral" }
  ];

  const upcomingAssignments = [
    { 
      id: 1, 
      title: "Physics Lab Report", 
      subject: "Physics", 
      dueDate: "Tomorrow", 
      priority: "high", 
      progress: 75,
      type: "report"
    },
    { 
      id: 2, 
      title: "Math Problem Set 7", 
      subject: "Mathematics", 
      dueDate: "Mar 22", 
      priority: "medium", 
      progress: 40,
      type: "homework"
    },
    { 
      id: 3, 
      title: "History Research Paper", 
      subject: "History", 
      dueDate: "Mar 25", 
      priority: "low", 
      progress: 20,
      type: "essay"
    }
  ];

  const announcements = [
    { id: 1, title: "Midterm Exam Schedule Released", content: "Please check your exam schedule for next week.", time: "2 hours ago", priority: "high" },
    { id: 2, title: "Library Extended Hours", content: "Library will be open 24/7 during exam period.", time: "1 day ago", priority: "medium" },
    { id: 3, title: "Career Fair Registration", content: "Sign up for the annual career fair happening next month.", time: "2 days ago", priority: "low" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Student Portal</h1>
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Grade 11 • Junior Year</span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search courses, assignments..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 w-64"
                />
              </div>
              
              {/* Quick Actions */}
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Calendar className="h-5 w-5" />
              </button>
              
              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">2</span>
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
                  <p className="text-xs text-gray-500">Student ID: ST2025001</p>
                </div>
                <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center text-white font-medium">
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
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-700 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Welcome back, {user.name?.split(' ')[0]}! 🎓</h2>
                <p className="text-green-100 mb-4">You have 2 assignments due this week and 3 classes today.</p>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Next class in 25 minutes</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Award className="h-4 w-4" />
                    <span>GPA: 3.7/4.0</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target className="h-4 w-4" />
                    <span>75% to graduation</span>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <GraduationCap className="h-8 w-8 mb-2" />
                  <div className="text-right">
                    <p className="text-xl font-bold">Junior</p>
                    <p className="text-sm text-green-100">Year 3 of 4</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {academicOverview.map((metric) => {
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
                    ) : metric.trend === 'down' ? (
                      <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    ) : (
                      <div className="h-4 w-4 mr-1" />
                    )}
                    <span className={
                      metric.trend === 'up' ? 'text-green-600' : 
                      metric.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                    }>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    <p className="text-sm text-gray-500">/ {metric.outOf}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mt-1">{metric.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Schedule */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 mb-8">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                    Today's Schedule
                  </h3>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center">
                    Full Calendar <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {todaySchedule.map((classItem) => (
                    <div key={classItem.id} className={`border-l-4 pl-4 py-4 rounded-r-lg transition-all ${
                      classItem.status === 'current' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{classItem.subject}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              classItem.type === 'lecture' ? 'bg-blue-100 text-blue-700' :
                              classItem.type === 'lab' ? 'bg-purple-100 text-purple-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {classItem.type}
                            </span>
                            {classItem.status === 'current' && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full flex items-center">
                                <Play className="h-3 w-3 mr-1" />
                                Live
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {classItem.time} ({classItem.duration})
                            </div>
                            <div>Room {classItem.room}</div>
                            <div>Prof. {classItem.teacher}</div>
                            <div className={`${classItem.attendance === 'required' ? 'text-red-600' : 'text-gray-500'}`}>
                              {classItem.attendance === 'required' ? '⚠️ Required' : '📝 Optional'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg">
                            <Bookmark className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg">
                            <MessageSquare className="h-4 w-4" />
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
                    <Eye className="h-4 w-4 mr-2" />
                    View All Classes
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    Join Virtual Class
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Grades */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Award className="h-5 w-5 mr-2 text-emerald-600" />
                    Recent Grades
                  </h3>
                  <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center">
                    Grade Report <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentGrades.map((grade) => (
                    <div key={grade.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold ${
                          grade.grade.startsWith('A') ? 'bg-green-100 text-green-700' :
                          grade.grade.startsWith('B') ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {grade.grade}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{grade.assignment}</p>
                          <p className="text-sm text-gray-600">{grade.subject}</p>
                          <p className="text-xs text-gray-500">{grade.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{grade.points}</p>
                        <div className="flex items-center space-x-1">
                          {grade.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-500" />}
                          <span className="text-sm text-gray-500">Grade</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6">
                  <button className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center">
                    <Download className="h-4 w-4 mr-2" />
                    Download Transcript
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Assignments & Announcements */}
          <div className="lg:col-span-1 space-y-8">
            {/* Upcoming Assignments */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-orange-600" />
                    Upcoming Assignments
                  </h3>
                  <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                    View All
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {upcomingAssignments.map((assignment) => (
                    <div key={assignment.id} className={`p-4 border-l-4 rounded-r-lg ${
                      assignment.priority === 'high' ? 'border-red-500 bg-red-50' :
                      assignment.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{assignment.title}</h4>
                          <p className="text-xs text-gray-600">{assignment.subject}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          assignment.priority === 'high' ? 'bg-red-100 text-red-700' :
                          assignment.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {assignment.priority}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">{assignment.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              assignment.priority === 'high' ? 'bg-red-600' :
                              assignment.priority === 'medium' ? 'bg-yellow-600' :
                              'bg-blue-600'
                            }`}
                            style={{ width: `${assignment.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Due: {assignment.dueDate}</span>
                          <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                            Continue
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 space-y-2">
                  <button className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Assignment
                  </button>
                  <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                    Assignment Calendar
                  </button>
                </div>
              </div>
            </div>

            {/* Announcements */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Bell className="h-5 w-5 mr-2 text-purple-600" />
                    Announcements
                  </h3>
                  <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                    View All
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          announcement.priority === 'high' ? 'bg-red-100' :
                          announcement.priority === 'medium' ? 'bg-yellow-100' :
                          'bg-blue-100'
                        }`}>
                          {announcement.priority === 'high' ? <AlertTriangle className="h-4 w-4 text-red-600" /> :
                           announcement.priority === 'medium' ? <Bell className="h-4 w-4 text-yellow-600" /> :
                           <MessageSquare className="h-4 w-4 text-blue-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {announcement.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {announcement.content}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {announcement.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Progress */}
        <div className="mt-8">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-indigo-600" />
                  Academic Progress Overview
                </h3>
                <div className="flex items-center space-x-2">
                  <select className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-indigo-500">
                    <option>This Semester</option>
                    <option>Last Semester</option>
                    <option>Academic Year</option>
                  </select>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Mock Chart Area */}
              <div className="h-64 bg-gradient-to-t from-indigo-50 to-white rounded-lg border-2 border-dashed border-indigo-200 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-indigo-400 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">Grade Trends & Performance Analytics</p>
                  <p className="text-sm text-gray-400 mt-1">Track your academic progress over time</p>
                </div>
              </div>
              
              {/* Progress Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Target className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-green-600">85%</div>
                  <div className="text-sm text-green-800">Goal Progress</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-blue-600">+8%</div>
                  <div className="text-sm text-blue-800">Grade Improvement</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Award className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-purple-600">12</div>
                  <div className="text-sm text-purple-800">Achievements</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <Star className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-orange-600">4.2</div>
                  <div className="text-sm text-orange-800">Predicted GPA</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}