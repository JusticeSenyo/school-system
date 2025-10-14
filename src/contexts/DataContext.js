// src/contexts/DataContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';

const DataContext = createContext();

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
};

/**
 * NOTE:
 * We intentionally DO NOT auto-load students/teachers/courses on mount,
 * because those ORDS endpoints aren’t available yet (were 404-ing).
 * When you add the real endpoints, flip AUTO_LOAD_LISTS to true and/or
 * call the fetchers from the pages that need them.
 */
const AUTO_LOAD_LISTS = false;

// (Placeholders – update when your ORDS routes exist)
const ENDPOINTS = {
  students: 'academic/get/students/',
  teachers: 'academic/get/teachers/',
  courses:  'academic/get/courses/',
};

// Role → dashboard path (these are real in your setup)
const DASHBOARD_PATH_BY_ROLE = {
  admin:        'get/admin/dashboard/',
  headteacher:  'get/headteacher/dashboard/',
  teacher:      'get/teacher/dashboard/',
  accountant:   'get/accountant/dashboard/',
  owner:        'get/admin/dashboard/', // fallback
};

export const DataProvider = ({ children }) => {
  const { user, isAuthenticated, apiCall } = useAuth();
  const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? null;
  const role = String(user?.userType || '').toLowerCase();

  const [loading, setLoading] = useState({
    students:  false,
    teachers:  false,
    courses:   false,
    dashboard: false,
  });

  const [errors, setErrors] = useState({});

  const [students, setStudents]   = useState([]);
  const [teachers, setTeachers]   = useState([]);
  const [courses,  setCourses]    = useState([]);
  const [dashboardData, setDashboardData] = useState(null);

  const setLoadingState = useCallback((k, v) => {
    setLoading(prev => ({ ...prev, [k]: v }));
  }, []);
  const setOpError = useCallback((k, e) => {
    const msg = e?.error || e?.message || String(e) || 'Unknown error';
    setErrors(prev => ({ ...prev, [k]: msg }));
  }, []);
  const clearError = useCallback((k) => {
    setErrors(prev => ({ ...prev, [k]: null }));
  }, []);

  // ------- Dashboard (real endpoints) -------
  const fetchDashboardData = useCallback(async () => {
    if (!apiCall || !user?.id) return;
    const path = DASHBOARD_PATH_BY_ROLE[role] || DASHBOARD_PATH_BY_ROLE.admin;

    setLoadingState('dashboard', true);
    clearError('dashboard');
    try {
      const res = await apiCall(path, { params: { user_id: user.id } });
      setDashboardData(res?.data ?? res ?? {});
    } catch (e) {
      // Don’t block UI if missing; cards can show zeros.
      setOpError('dashboard', e);
      setDashboardData({});
    } finally {
      setLoadingState('dashboard', false);
    }
  }, [apiCall, role, user?.id, setLoadingState, clearError, setOpError]);

  // ------- List fetchers (NO auto-run to avoid 404 spam) -------
  const fetchStudents = useCallback(async () => {
    if (!apiCall || !schoolId) return;
    setLoadingState('students', true);
    clearError('students');
    try {
      const res = await apiCall(ENDPOINTS.students, { params: { p_school_id: schoolId } });
      const rows =
        Array.isArray(res) ? res :
        Array.isArray(res?.items) ? res.items :
        Array.isArray(res?.students) ? res.students : [];
      setStudents(rows);
    } catch (e) {
      setOpError('students', e);
      setStudents([]);
    } finally {
      setLoadingState('students', false);
    }
  }, [apiCall, schoolId, setLoadingState, clearError, setOpError]);

  const fetchTeachers = useCallback(async () => {
    if (!apiCall || !schoolId) return;
    setLoadingState('teachers', true);
    clearError('teachers');
    try {
      const res = await apiCall(ENDPOINTS.teachers, { params: { p_school_id: schoolId } });
      const rows =
        Array.isArray(res) ? res :
        Array.isArray(res?.items) ? res.items :
        Array.isArray(res?.teachers) ? res.teachers : [];
      setTeachers(rows);
    } catch (e) {
      setOpError('teachers', e);
      setTeachers([]);
    } finally {
      setLoadingState('teachers', false);
    }
  }, [apiCall, schoolId, setLoadingState, clearError, setOpError]);

  const fetchCourses = useCallback(async () => {
    if (!apiCall || !schoolId) return;
    setLoadingState('courses', true);
    clearError('courses');
    try {
      const res = await apiCall(ENDPOINTS.courses, { params: { p_school_id: schoolId } });
      const rows =
        Array.isArray(res) ? res :
        Array.isArray(res?.items) ? res.items :
        Array.isArray(res?.courses) ? res.courses : [];
      setCourses(rows);
    } catch (e) {
      setOpError('courses', e);
      setCourses([]);
    } finally {
      setLoadingState('courses', false);
    }
  }, [apiCall, schoolId, setLoadingState, clearError, setOpError]);

  // ------- Initial loads -------
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    // Always load dashboard (these endpoints exist)
    fetchDashboardData();

    // Do NOT auto-load lists until real endpoints are ready.
    if (AUTO_LOAD_LISTS) {
      fetchStudents();
      fetchTeachers();
      fetchCourses();
    }
  }, [isAuthenticated, user, fetchDashboardData, fetchStudents, fetchTeachers, fetchCourses]);

  // Stats derived from whatever we have; dashboardData can override if you expose totals there
  const stats = {
    totalStudents: students.length,
    totalTeachers: teachers.length,
    totalCourses:  courses.length,
    unreadNotifications: 0,
    unreadMessages: 0,
  };

  const value = {
    // Data
    students, teachers, courses, dashboardData,

    // Loading / errors
    loading, errors, clearError,

    // Stats
    stats,

    // Refetchers (call these from pages when you wire endpoints)
    fetchStudents, fetchTeachers, fetchCourses, fetchDashboardData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
