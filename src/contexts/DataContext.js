// src/contexts/DataContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useAuth } from '../AuthContext';

const DataContext = createContext();

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
};

export const DataProvider = ({ children }) => {
  const { user, isAuthenticated, apiCall } = useAuth();

  // --- loading flags ---
  const [loading, setLoading] = useState({
    students: false,
    teachers: false,
    courses: false,
    assignments: false,
    grades: false,
    attendance: false,
    dashboard: false,
  });

  // --- data buckets ---
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);

  // --- errors ---
  const [errors, setErrors] = useState({});

  // track mounted to avoid setState after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // helpers
  const setLoadingState = useCallback((key, val) => {
    if (!mountedRef.current) return;
    setLoading(prev => ({ ...prev, [key]: val }));
  }, []);

  const setOpError = useCallback((op, errMsg) => {
    if (!mountedRef.current) return;
    setErrors(prev => ({ ...prev, [op]: errMsg || null }));
  }, []);

  const clearError = useCallback((op) => {
    if (!mountedRef.current) return;
    setErrors(prev => ({ ...prev, [op]: null }));
  }, []);

  // Always inject p_school_id if available
  const withSchool = useCallback((obj = {}) => {
    const schoolId =
      user?.schoolId ?? user?.school_id ?? user?.school?.id ?? undefined;
    return schoolId ? { ...obj, p_school_id: String(schoolId) } : { ...obj };
  }, [user]);

  // Only use mock data when the error is network/CORS (to keep real API errors visible)
  const isCorsOrNetwork = (resp) =>
    resp && typeof resp === 'object' && resp.success === false && resp.type === 'cors_or_network';

  // ---- Students ----
  const fetchStudents = useCallback(async (filters = {}) => {
    if (!apiCall) return;
    setLoadingState('students', true);
    clearError('students');

    try {
      const resp = await apiCall('students', { params: withSchool(filters) });

      if (resp?.success) {
        if (!mountedRef.current) return;
        setStudents(resp.data || resp.students || []);
      } else {
        if (isCorsOrNetwork(resp)) {
          // soft fallback for demo
          setStudents([
            { id: 1, fullName: 'John Doe', email: 'john@school.edu', grade: '10A' },
            { id: 2, fullName: 'Jane Smith', email: 'jane@school.edu', grade: '10B' },
          ]);
        } else {
          throw new Error(resp?.error || 'Failed to fetch students');
        }
      }
    } catch (e) {
      setOpError('students', e.message);
    } finally {
      setLoadingState('students', false);
    }
  }, [apiCall, withSchool, setLoadingState, clearError, setOpError]);

  const createStudent = useCallback(async (studentData) => {
    if (!apiCall) return;
    const body = { ...studentData, ...withSchool() };

    const resp = await apiCall('students', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!resp?.success) throw new Error(resp?.error || 'Failed to create student');
    await fetchStudents();
    return resp;
  }, [apiCall, withSchool, fetchStudents]);

  const updateStudent = useCallback(async (studentId, studentData) => {
    if (!apiCall) return;
    const resp = await apiCall(`students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...studentData, ...withSchool() }),
    });
    if (!resp?.success) throw new Error(resp?.error || 'Failed to update student');
    await fetchStudents();
    return resp;
  }, [apiCall, withSchool, fetchStudents]);

  const deleteStudent = useCallback(async (studentId) => {
    if (!apiCall) return;
    const resp = await apiCall(`students/${studentId}`, {
      method: 'DELETE',
      params: withSchool(),
    });
    if (!resp?.success) throw new Error(resp?.error || 'Failed to delete student');
    await fetchStudents();
    return resp;
  }, [apiCall, withSchool, fetchStudents]);

  // ---- Teachers ----
  const fetchTeachers = useCallback(async (filters = {}) => {
    if (!apiCall) return;
    setLoadingState('teachers', true);
    clearError('teachers');
    try {
      const resp = await apiCall('teachers', { params: withSchool(filters) });
      if (resp?.success) {
        if (!mountedRef.current) return;
        setTeachers(resp.data || resp.teachers || []);
      } else {
        if (isCorsOrNetwork(resp)) {
          setTeachers([
            { id: 1, fullName: 'Prof. Johnson', email: 'johnson@school.edu', department: 'Mathematics' },
            { id: 2, fullName: 'Dr. Smith', email: 'smith@school.edu', department: 'Physics' },
          ]);
        } else {
          throw new Error(resp?.error || 'Failed to fetch teachers');
        }
      }
    } catch (e) {
      setOpError('teachers', e.message);
    } finally {
      setLoadingState('teachers', false);
    }
  }, [apiCall, withSchool, setLoadingState, clearError, setOpError]);

  // ---- Courses ----
  const fetchCourses = useCallback(async (filters = {}) => {
    if (!apiCall) return;
    setLoadingState('courses', true);
    clearError('courses');
    try {
      const resp = await apiCall('courses', { params: withSchool(filters) });
      if (resp?.success) {
        if (!mountedRef.current) return;
        setCourses(resp.data || resp.courses || []);
      } else {
        if (isCorsOrNetwork(resp)) {
          setCourses([
            { id: 1, name: 'Mathematics 101', teacher: 'Prof. Johnson', students: 25 },
            { id: 2, name: 'Physics 201', teacher: 'Dr. Smith', students: 20 },
          ]);
        } else {
          throw new Error(resp?.error || 'Failed to fetch courses');
        }
      }
    } catch (e) {
      setOpError('courses', e.message);
    } finally {
      setLoadingState('courses', false);
    }
  }, [apiCall, withSchool, setLoadingState, clearError, setOpError]);

  // ---- Assignments ----
  const fetchAssignments = useCallback(async (filters = {}) => {
    if (!apiCall) return;
    setLoadingState('assignments', true);
    clearError('assignments');
    try {
      const resp = await apiCall('assignments', { params: withSchool(filters) });
      if (resp?.success) {
        if (!mountedRef.current) return;
        setAssignments(resp.data || resp.assignments || []);
      } else {
        if (isCorsOrNetwork(resp)) {
          setAssignments([
            { id: 1, title: 'Math Homework 1', dueDate: '2025-07-10', status: 'pending' },
            { id: 2, title: 'Physics Lab Report', dueDate: '2025-07-15', status: 'submitted' },
          ]);
        } else {
          throw new Error(resp?.error || 'Failed to fetch assignments');
        }
      }
    } catch (e) {
      setOpError('assignments', e.message);
    } finally {
      setLoadingState('assignments', false);
    }
  }, [apiCall, withSchool, setLoadingState, clearError, setOpError]);

  // ---- Grades ----
  const fetchGrades = useCallback(async (studentId, filters = {}) => {
    if (!apiCall) return;
    setLoadingState('grades', true);
    clearError('grades');
    try {
      const resp = await apiCall('grades', {
        params: withSchool({ ...filters, studentId }),
      });
      if (resp?.success) {
        if (!mountedRef.current) return;
        setGrades(resp.data || resp.grades || []);
      } else {
        if (isCorsOrNetwork(resp)) {
          setGrades([
            { id: 1, subject: 'Mathematics', assignment: 'Midterm', grade: 'A', points: 95 },
            { id: 2, subject: 'Physics', assignment: 'Lab Report', grade: 'B+', points: 88 },
          ]);
        } else {
          throw new Error(resp?.error || 'Failed to fetch grades');
        }
      }
    } catch (e) {
      setOpError('grades', e.message);
    } finally {
      setLoadingState('grades', false);
    }
  }, [apiCall, withSchool, setLoadingState, clearError, setOpError]);

  // ---- Dashboard ----
  const fetchDashboardData = useCallback(async () => {
    if (!user || !isAuthenticated || !apiCall) return;
    setLoadingState('dashboard', true);
    clearError('dashboard');
    try {
      // Keep your current pattern: /dashboard/:role/:userId plus school param
      const resp = await apiCall(`dashboard/${user.userType}/${user.id}`, {
        params: withSchool(),
      });

      if (resp?.success) {
        if (!mountedRef.current) return;
        setDashboardData(resp.data || resp.dashboard || {});
      } else {
        // Fallback to mock only if truly network-blocked
        if (isCorsOrNetwork(resp)) {
          setDashboardData(getMockDashboardData(user.userType));
        } else {
          throw new Error(resp?.error || 'Failed to fetch dashboard data');
        }
      }
    } catch (e) {
      setOpError('dashboard', e.message);
      setDashboardData(getMockDashboardData(user?.userType));
    } finally {
      setLoadingState('dashboard', false);
    }
  }, [user, isAuthenticated, apiCall, withSchool, setLoadingState, clearError, setOpError]);

  // ---- File Upload ----
  const uploadFile = useCallback(async (file, type = 'general') => {
    if (!apiCall) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    // Append school id too
    const school = withSchool();
    Object.entries(school).forEach(([k, v]) => formData.append(k, v));

    const resp = await apiCall('upload', {
      method: 'POST',
      body: formData,
      headers: {}, // let browser set multipart boundary
    });
    if (!resp?.success) throw new Error(resp?.error || 'Upload failed');
    return resp;
  }, [apiCall, withSchool]);

  // ---- initial loads (role aware) ----
  useEffect(() => {
    if (!isAuthenticated || !user || !apiCall) return;

    fetchDashboardData();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, apiCall]);

  // ---- stats (derived) ----
  const stats = {
    totalStudents: students.length,
    totalTeachers: teachers.length,
    totalCourses: courses.length,
    totalAssignments: assignments.length,
    pendingAssignments: assignments.filter(a => a.status === 'pending').length,
    unreadNotifications: notifications.filter(n => !n.read).length,
    unreadMessages: messages.filter(m => !m.read).length,
  };

  // ---- mock dashboard ----
  const getMockDashboardData = (userType) => {
    const mock = {
      teacher: {
        totalStudents: 127,
        activeCourses: 5,
        pendingReviews: 12,
        averageGrade: 85.2,
        todayClasses: [
          { id: 1, subject: 'Mathematics', grade: '10A', time: '9:00 AM', room: '204', status: 'current' },
          { id: 2, subject: 'Algebra',    grade: '11B', time: '11:00 AM', room: '204', status: 'upcoming' },
        ],
        recentSubmissions: [
          { id: 1, student: 'Emma Wilson', assignment: 'Quadratic Equations', submitted: '2 hours ago', status: 'pending' },
        ],
      },
      admin: {
        totalStudents: 1247,
        teachingStaff: 89,
        monthlyRevenue: 287000,
        averagePerformance: 82.4,
        systemAlerts: [
          { id: 1, type: 'critical', message: 'Server maintenance scheduled', time: '2 hours ago' },
        ],
        departmentPerformance: [
          { department: 'Mathematics', students: 312, performance: 85.2, trend: 'up' },
        ],
      },
      student: {
        currentGPA: 3.7,
        creditsEarned: 24,
        assignmentsDue: 3,
        attendanceRate: 96,
        todaySchedule: [
          { id: 1, subject: 'Mathematics', teacher: 'Prof. Johnson', time: '9:00 AM', status: 'current' },
        ],
        recentGrades: [
          { id: 1, subject: 'Calculus', assignment: 'Midterm Exam', grade: 'A-', points: '92/100' },
        ],
      },
    };
    return mock[userType] || {};
  };

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      fetchDashboardData(),
      fetchStudents(),
      fetchTeachers(),
      fetchCourses(),
      fetchAssignments(),
    ]);
  }, [fetchDashboardData, fetchStudents, fetchTeachers, fetchCourses, fetchAssignments]);

  const value = {
    // data
    students, teachers, courses, assignments, grades, attendance,
    dashboardData, notifications, messages,

    // ops
    fetchStudents, createStudent, updateStudent, deleteStudent,
    fetchTeachers, fetchCourses, fetchAssignments, fetchGrades,
    fetchDashboardData, uploadFile, refreshAll,

    // ui state
    loading, errors, clearError, stats,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
