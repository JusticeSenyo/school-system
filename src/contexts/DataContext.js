import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

const DataContext = createContext();
export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
};

export const DataProvider = ({ children }) => {
  const { user, isAuthenticated, apiCall } = useAuth();
  const { pathname } = useLocation();

  // Loading flags
  const [loading, setLoading] = useState({
    students: false,
    teachers: false,
    courses: false,
    assignments: false,
    grades: false,
    attendance: false,
    dashboard: false,
  });

  // Error messages per resource
  const [errors, setErrors] = useState({});

  // Data
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);

  // Helpers
  const setLoadingState = useCallback((key, val) => {
    setLoading((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleError = useCallback((key, err) => {
    // eslint-disable-next-line no-console
    console.error(`Error in ${key}:`, err);
    setErrors((prev) => ({ ...prev, [key]: err?.error || err?.message || String(err) }));
  }, []);

  const clearError = useCallback((key) => {
    setErrors((prev) => ({ ...prev, [key]: null }));
  }, []);

  // Guards: avoid hammering API on /login or during setup
  const canFetch = useMemo(() => {
    if (!isAuthenticated || !user || !apiCall) return false;
    if (pathname === "/login") return false;
    if (pathname.startsWith("/setup")) return false;
    return true;
  }, [isAuthenticated, user, apiCall, pathname]);

  // ===== Students ====================================================
  const fetchStudents = useCallback(
    async (filters = {}) => {
      if (!apiCall) return;
      setLoadingState("students", true);
      clearError("students");
      try {
        const resp = await apiCall("/students", { params: filters });
        if (resp?.success !== false) {
          setStudents(resp?.data || resp?.students || Array.isArray(resp) ? resp : []);
        } else {
          throw new Error(resp?.error || "Failed to fetch students");
        }
      } catch (err) {
        handleError("students", err);
        // Demo fallback
        setStudents([
          { id: 1, fullName: "John Doe", email: "john@school.edu", grade: "10A" },
          { id: 2, fullName: "Jane Smith", email: "jane@school.edu", grade: "10B" },
        ]);
      } finally {
        setLoadingState("students", false);
      }
    },
    [apiCall, setLoadingState, clearError, handleError]
  );

  const createStudent = useCallback(
    async (student) => {
      if (!apiCall) return;
      try {
        const resp = await apiCall("/students", { method: "POST", body: student });
        if (resp?.success === false) throw new Error(resp?.error || "Failed to create student");
        await fetchStudents();
        return resp;
      } catch (err) {
        handleError("createStudent", err);
        throw err;
      }
    },
    [apiCall, fetchStudents, handleError]
  );

  const updateStudent = useCallback(
    async (id, student) => {
      if (!apiCall) return;
      try {
        const resp = await apiCall(`/students/${id}`, { method: "PUT", body: student });
        if (resp?.success === false) throw new Error(resp?.error || "Failed to update student");
        await fetchStudents();
        return resp;
      } catch (err) {
        handleError("updateStudent", err);
        throw err;
      }
    },
    [apiCall, fetchStudents, handleError]
  );

  const deleteStudent = useCallback(
    async (id) => {
      if (!apiCall) return;
      try {
        const resp = await apiCall(`/students/${id}`, { method: "DELETE" });
        if (resp?.success === false) throw new Error(resp?.error || "Failed to delete student");
        await fetchStudents();
        return resp;
      } catch (err) {
        handleError("deleteStudent", err);
        throw err;
      }
    },
    [apiCall, fetchStudents, handleError]
  );

  // ===== Teachers ====================================================
  const fetchTeachers = useCallback(
    async (filters = {}) => {
      if (!apiCall) return;
      setLoadingState("teachers", true);
      clearError("teachers");
      try {
        const resp = await apiCall("/teachers", { params: filters });
        if (resp?.success !== false) {
          setTeachers(resp?.data || resp?.teachers || (Array.isArray(resp) ? resp : []));
        } else {
          throw new Error(resp?.error || "Failed to fetch teachers");
        }
      } catch (err) {
        handleError("teachers", err);
        setTeachers([
          { id: 1, fullName: "Prof. Johnson", email: "johnson@school.edu", department: "Mathematics" },
          { id: 2, fullName: "Dr. Smith", email: "smith@school.edu", department: "Physics" },
        ]);
      } finally {
        setLoadingState("teachers", false);
      }
    },
    [apiCall, setLoadingState, clearError, handleError]
  );

  // ===== Courses =====================================================
  const fetchCourses = useCallback(
    async (filters = {}) => {
      if (!apiCall) return;
      setLoadingState("courses", true);
      clearError("courses");
      try {
        const resp = await apiCall("/courses", { params: filters });
        if (resp?.success !== false) {
          setCourses(resp?.data || resp?.courses || (Array.isArray(resp) ? resp : []));
        } else {
          throw new Error(resp?.error || "Failed to fetch courses");
        }
      } catch (err) {
        handleError("courses", err);
        setCourses([
          { id: 1, name: "Mathematics 101", teacher: "Prof. Johnson", students: 25 },
          { id: 2, name: "Physics 201", teacher: "Dr. Smith", students: 20 },
        ]);
      } finally {
        setLoadingState("courses", false);
      }
    },
    [apiCall, setLoadingState, clearError, handleError]
  );

  // ===== Assignments =================================================
  const fetchAssignments = useCallback(
    async (filters = {}) => {
      if (!apiCall) return;
      setLoadingState("assignments", true);
      clearError("assignments");
      try {
        const resp = await apiCall("/assignments", { params: filters });
        if (resp?.success !== false) {
          setAssignments(resp?.data || resp?.assignments || (Array.isArray(resp) ? resp : []));
        } else {
          throw new Error(resp?.error || "Failed to fetch assignments");
        }
      } catch (err) {
        handleError("assignments", err);
        setAssignments([
          { id: 1, title: "Math Homework 1", dueDate: "2025-07-10", status: "pending" },
          { id: 2, title: "Physics Lab Report", dueDate: "2025-07-15", status: "submitted" },
        ]);
      } finally {
        setLoadingState("assignments", false);
      }
    },
    [apiCall, setLoadingState, clearError, handleError]
  );

  // ===== Grades ======================================================
  const fetchGrades = useCallback(
    async (studentId, filters = {}) => {
      if (!apiCall) return;
      setLoadingState("grades", true);
      clearError("grades");
      try {
        const resp = await apiCall("/grades", { params: { ...filters, studentId } });
        if (resp?.success !== false) {
          setGrades(resp?.data || resp?.grades || (Array.isArray(resp) ? resp : []));
        } else {
          throw new Error(resp?.error || "Failed to fetch grades");
        }
      } catch (err) {
        handleError("grades", err);
        setGrades([
          { id: 1, subject: "Mathematics", assignment: "Midterm", grade: "A", points: 95 },
          { id: 2, subject: "Physics", assignment: "Lab Report", grade: "B+", points: 88 },
        ]);
      } finally {
        setLoadingState("grades", false);
      }
    },
    [apiCall, setLoadingState, clearError, handleError]
  );

  // ===== Dashboard ===================================================
  const getMockDashboardData = useCallback((role) => {
    const d = {
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
        ],
      },
      admin: {
        totalStudents: 1247,
        teachingStaff: 89,
        monthlyRevenue: 287000,
        averagePerformance: 82.4,
        systemAlerts: [{ id: 1, type: "critical", message: "Server maintenance scheduled", time: "2 hours ago" }],
        departmentPerformance: [{ department: "Mathematics", students: 312, performance: 85.2, trend: "up" }],
      },
      student: {
        currentGPA: 3.7,
        creditsEarned: 24,
        assignmentsDue: 3,
        attendanceRate: 96,
        todaySchedule: [{ id: 1, subject: "Mathematics", teacher: "Prof. Johnson", time: "9:00 AM", status: "current" }],
        recentGrades: [{ id: 1, subject: "Calculus", assignment: "Midterm Exam", grade: "A-", points: "92/100" }],
      },
      headteacher: {
        schools: 1,
        teachers: 89,
        students: 1247,
        alerts: 2,
      },
      accountant: {
        totalInvoices: 342,
        dueThisWeek: 19,
        monthlyRevenue: 287000,
        overdue: 12,
      },
      owner: {
        schools: 1,
        staff: 112,
        students: 1247,
        mrr: 287000,
      },
    };
    return d[role] || {};
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!apiCall || !user || !isAuthenticated) return;
    setLoadingState("dashboard", true);
    clearError("dashboard");
    try {
      const resp = await apiCall(`/dashboard/${user.userType}/${user.id}`);
      if (resp?.success === false) throw new Error(resp?.error || "Failed to fetch dashboard");
      setDashboardData(resp?.data || resp?.dashboard || getMockDashboardData(user.userType));
    } catch (err) {
      handleError("dashboard", err);
      setDashboardData(getMockDashboardData(user.userType));
    } finally {
      setLoadingState("dashboard", false);
    }
  }, [apiCall, user, isAuthenticated, setLoadingState, clearError, handleError, getMockDashboardData]);

  // ===== Upload ======================================================
  const uploadFile = useCallback(
    async (file, type = "general") => {
      if (!apiCall) return;
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", type);
        const resp = await apiCall("/upload", { method: "POST", body: fd }); // no content-type set
        if (resp?.success === false) throw new Error(resp?.error || "Upload failed");
        return resp;
      } catch (err) {
        handleError("uploadFile", err);
        throw err;
      }
    },
    [apiCall, handleError]
  );

  /**
   * Initial loads gated by route & auth.
   * Avoid fetching on /login or during onboarding (/setup...)
   */
  useEffect(() => {
    if (!canFetch) return;

    fetchDashboardData();

    if (user.userType === "teacher") {
      fetchCourses({ teacherId: user.id });
      fetchAssignments({ teacherId: user.id });
    } else if (user.userType === "admin") {
      fetchStudents();
      fetchTeachers();
      fetchCourses();
    } else if (user.userType === "student") {
      fetchCourses({ studentId: user.id });
      fetchAssignments({ studentId: user.id });
      fetchGrades(user.id);
    } else if (user.userType === "headteacher") {
      // tailor as needed
      fetchTeachers();
      fetchStudents();
    } else if (user.userType === "accountant") {
      // accountant-focused loads (fees, invoices) – add when endpoints exist
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, user?.userType, user?.id]);

  // ===== Computed stats =============================================
  const stats = useMemo(
    () => ({
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalCourses: courses.length,
      totalAssignments: assignments.length,
      pendingAssignments: assignments.filter((a) => a.status === "pending").length,
      unreadNotifications: notifications.filter((n) => !n.read).length,
      unreadMessages: messages.filter((m) => !m.read).length,
    }),
    [students, teachers, courses, assignments, notifications, messages]
  );

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

    // Loading / errors
    loading,
    errors,
    clearError,

    // Stats
    stats,

    // Ops
    fetchStudents,
    createStudent,
    updateStudent,
    deleteStudent,

    fetchTeachers,
    fetchCourses,
    fetchAssignments,
    fetchGrades,
    fetchDashboardData,

    uploadFile,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
