// contexts/DataContext.js - Integrated with your Oracle API
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const { user, isAuthenticated, apiCall } = useAuth();
  
  // Loading states
  const [loading, setLoading] = useState({
    students: false,
    teachers: false,
    courses: false,
    assignments: false,
    grades: false,
    attendance: false,
    dashboard: false,
  });

  // Data states
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);

  // Error handling
  const [errors, setErrors] = useState({});

  // Generic error handler
  const handleError = useCallback((operation, error) => {
    console.error(`Error in ${operation}:`, error);
    setErrors(prev => ({ ...prev, [operation]: error.message }));
  }, []);

  // Clear error
  const clearError = useCallback((operation) => {
    setErrors(prev => ({ ...prev, [operation]: null }));
  }, []);

  // Generic loading setter
  const setLoadingState = useCallback((operation, isLoading) => {
    setLoading(prev => ({ ...prev, [operation]: isLoading }));
  }, []);

  // Student Management using your Oracle API
  const fetchStudents = useCallback(async (filters = {}) => {
    if (!apiCall) return;
    
    setLoadingState('students', true);
    clearError('students');
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = `/students${queryParams ? `?${queryParams}` : ''}`;
      const response = await apiCall(endpoint);
      
      if (response.success) {
        setStudents(response.data || response.students || []);
      } else {
        throw new Error(response.error || 'Failed to fetch students');
      }
    } catch (error) {
      handleError('students', error);
      // Set mock data on error for demo purposes
      setStudents([
        { id: 1, fullName: 'John Doe', email: 'john@school.edu', grade: '10A' },
        { id: 2, fullName: 'Jane Smith', email: 'jane@school.edu', grade: '10B' }
      ]);
    } finally {
      setLoadingState('students', false);
    }
  }, [apiCall, setLoadingState, clearError, handleError]);

  const createStudent = useCallback(async (studentData) => {
    if (!apiCall) return;
    
    try {
      const response = await apiCall('/students', {
        method: 'POST',
        body: JSON.stringify(studentData)
      });
      
      if (response.success) {
        await fetchStudents(); // Refresh list
        return response;
      } else {
        throw new Error(response.error || 'Failed to create student');
      }
    } catch (error) {
      handleError('createStudent', error);
      throw error;
    }
  }, [apiCall, fetchStudents, handleError]);

  const updateStudent = useCallback(async (studentId, studentData) => {
    if (!apiCall) return;
    
    try {
      const response = await apiCall(`/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify(studentData)
      });
      
      if (response.success) {
        await fetchStudents(); // Refresh list
        return response;
      } else {
        throw new Error(response.error || 'Failed to update student');
      }
    } catch (error) {
      handleError('updateStudent', error);
      throw error;
    }
  }, [apiCall, fetchStudents, handleError]);

  const deleteStudent = useCallback(async (studentId) => {
    if (!apiCall) return;
    
    try {
      const response = await apiCall(`/students/${studentId}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        await fetchStudents(); // Refresh list
        return response;
      } else {
        throw new Error(response.error || 'Failed to delete student');
      }
    } catch (error) {
      handleError('deleteStudent', error);
      throw error;
    }
  }, [apiCall, fetchStudents, handleError]);

  // Teacher Management
  const fetchTeachers = useCallback(async (filters = {}) => {
    if (!apiCall) return;
    
    setLoadingState('teachers', true);
    clearError('teachers');
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = `/teachers${queryParams ? `?${queryParams}` : ''}`;
      const response = await apiCall(endpoint);
      
      if (response.success) {
        setTeachers(response.data || response.teachers || []);
      } else {
        throw new Error(response.error || 'Failed to fetch teachers');
      }
    } catch (error) {
      handleError('teachers', error);
      // Mock data on error
      setTeachers([
        { id: 1, fullName: 'Prof. Johnson', email: 'johnson@school.edu', department: 'Mathematics' },
        { id: 2, fullName: 'Dr. Smith', email: 'smith@school.edu', department: 'Physics' }
      ]);
    } finally {
      setLoadingState('teachers', false);
    }
  }, [apiCall, setLoadingState, clearError, handleError]);

  // Course Management
  const fetchCourses = useCallback(async (filters = {}) => {
    if (!apiCall) return;
    
    setLoadingState('courses', true);
    clearError('courses');
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = `/courses${queryParams ? `?${queryParams}` : ''}`;
      const response = await apiCall(endpoint);
      
      if (response.success) {
        setCourses(response.data || response.courses || []);
      } else {
        throw new Error(response.error || 'Failed to fetch courses');
      }
    } catch (error) {
      handleError('courses', error);
      // Mock data on error
      setCourses([
        { id: 1, name: 'Mathematics 101', teacher: 'Prof. Johnson', students: 25 },
        { id: 2, name: 'Physics 201', teacher: 'Dr. Smith', students: 20 }
      ]);
    } finally {
      setLoadingState('courses', false);
    }
  }, [apiCall, setLoadingState, clearError, handleError]);

  // Assignment Management
  const fetchAssignments = useCallback(async (filters = {}) => {
    if (!apiCall) return;
    
    setLoadingState('assignments', true);
    clearError('assignments');
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = `/assignments${queryParams ? `?${queryParams}` : ''}`;
      const response = await apiCall(endpoint);
      
      if (response.success) {
        setAssignments(response.data || response.assignments || []);
      } else {
        throw new Error(response.error || 'Failed to fetch assignments');
      }
    } catch (error) {
      handleError('assignments', error);
      // Mock data on error
      setAssignments([
        { id: 1, title: 'Math Homework 1', dueDate: '2025-07-10', status: 'pending' },
        { id: 2, title: 'Physics Lab Report', dueDate: '2025-07-15', status: 'submitted' }
      ]);
    } finally {
      setLoadingState('assignments', false);
    }
  }, [apiCall, setLoadingState, clearError, handleError]);

  // Grading System
  const fetchGrades = useCallback(async (studentId, filters = {}) => {
    if (!apiCall) return;
    
    setLoadingState('grades', true);
    clearError('grades');
    try {
      const queryParams = new URLSearchParams({...filters, studentId}).toString();
      const endpoint = `/grades?${queryParams}`;
      const response = await apiCall(endpoint);
      
      if (response.success) {
        setGrades(response.data || response.grades || []);
      } else {
        throw new Error(response.error || 'Failed to fetch grades');
      }
    } catch (error) {
      handleError('grades', error);
      // Mock data on error
      setGrades([
        { id: 1, subject: 'Mathematics', assignment: 'Midterm', grade: 'A', points: 95 },
        { id: 2, subject: 'Physics', assignment: 'Lab Report', grade: 'B+', points: 88 }
      ]);
    } finally {
      setLoadingState('grades', false);
    }
  }, [apiCall, setLoadingState, clearError, handleError]);

  // Dashboard Data
  const fetchDashboardData = useCallback(async () => {
    if (!user || !isAuthenticated || !apiCall) return;
    
    setLoadingState('dashboard', true);
    clearError('dashboard');
    try {
      const response = await apiCall(`/dashboard/${user.userType}/${user.id}`);
      
      if (response.success) {
        setDashboardData(response.data || response.dashboard);
      } else {
        throw new Error(response.error || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      handleError('dashboard', error);
      // Set mock data if API fails
      setDashboardData(getMockDashboardData(user.userType));
    } finally {
      setLoadingState('dashboard', false);
    }
  }, [user, isAuthenticated, apiCall, setLoadingState, clearError, handleError]);

  // File Upload using your API
  const uploadFile = useCallback(async (file, type = 'general') => {
    if (!apiCall) return;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const response = await apiCall('/upload', {
        method: 'POST',
        body: formData,
        headers: {} // Don't set Content-Type, let the browser set it for FormData
      });
      
      if (response.success) {
        return response;
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error) {
      handleError('uploadFile', error);
      throw error;
    }
  }, [apiCall, handleError]);

  // Load initial data when user changes
  useEffect(() => {
    if (isAuthenticated && user && apiCall) {
      fetchDashboardData();
      
      // Load role-specific data
      if (user.userType === 'teacher') {
        fetchCourses({ teacherId: user.id });
        fetchAssignments({ teacherId: user.id });
      } else if (user.userType === 'admin') {
        fetchStudents();
        fetchTeachers();
        fetchCourses();
      } else if (user.userType === 'student') {
        fetchCourses({ studentId: user.id });
        fetchAssignments({ studentId: user.id });
        fetchGrades(user.id);
      }
    }
  }, [isAuthenticated, user, apiCall, fetchDashboardData, fetchCourses, fetchAssignments, fetchStudents, fetchTeachers, fetchGrades]);

  // Computed stats
  const stats = {
    totalStudents: students.length,
    totalTeachers: teachers.length,
    totalCourses: courses.length,
    totalAssignments: assignments.length,
    pendingAssignments: assignments.filter(a => a.status === 'pending').length,
    unreadNotifications: notifications.filter(n => !n.read).length,
    unreadMessages: messages.filter(m => !m.read).length,
  };

  // Mock data fallback
  const getMockDashboardData = useCallback((userType) => {
    const mockData = {
      teacher: {
        totalStudents: 127,
        activeCourses: 5,
        pendingReviews: 12,
        averageGrade: 85.2,
        todayClasses: [
          { id: 1, subject: "Mathematics", grade: "10A", time: "9:00 AM", room: "204", status: "current" },
          { id: 2, subject: "Algebra", grade: "11B", time: "11:00 AM", room: "204", status: "upcoming" },
        ],
        recentSubmissions: [
          { id: 1, student: "Emma Wilson", assignment: "Quadratic Equations", submitted: "2 hours ago", status: "pending" },
        ]
      },
      admin: {
        totalStudents: 1247,
        teachingStaff: 89,
        monthlyRevenue: 287000,
        averagePerformance: 82.4,
        systemAlerts: [
          { id: 1, type: "critical", message: "Server maintenance scheduled", time: "2 hours ago" },
        ],
        departmentPerformance: [
          { department: "Mathematics", students: 312, performance: 85.2, trend: "up" },
        ]
      },
      student: {
        currentGPA: 3.7,
        creditsEarned: 24,
        assignmentsDue: 3,
        attendanceRate: 96,
        todaySchedule: [
          { id: 1, subject: "Mathematics", teacher: "Prof. Johnson", time: "9:00 AM", status: "current" },
        ],
        recentGrades: [
          { id: 1, subject: "Calculus", assignment: "Midterm Exam", grade: "A-", points: "92/100" },
        ]
      }
    };
    return mockData[userType] || {};
  }, []);

  const value = {
    // Data
    students,
    teachers,
    courses,
    assignments,
    grades,
    attendance,
    dashboardData,
    notifications,
    messages,
    
    // Loading states
    loading,
    
    // Errors
    errors,
    clearError,
    
    // Stats
    stats,
    
    // Student operations
    fetchStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    
    // Teacher operations
    fetchTeachers,
    
    // Course operations
    fetchCourses,
    
    // Assignment operations
    fetchAssignments,
    
    // Grading operations
    fetchGrades,
    
    // Dashboard operations
    fetchDashboardData,
    
    // File operations
    uploadFile,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};