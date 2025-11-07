// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import IdleLogout from './components/IdleLogout';
import { AuthProvider, useAuth } from './AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import SchoolLogin from './SchoolLogin';

import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { TeacherAccessProvider, useTeacherAccess } from './contexts/TeacherAccessContext';
// import ParentDashboard from './dashboards/ParentDashboard';
// import StudentDashboard from './dashboards/StudentDashboard';

// Lazy-loaded dashboards
//new student dashboard

const StudentDashboard = lazy(() => import('./dashboards/StudentDashboard'));
const ParentDashboard = lazy(() => import('./dashboards/ParentDashboard'));
const TeacherDashboard = lazy(() => import('./dashboards/TeacherDashboard'));
const AdminDashboard = lazy(() => import('./dashboards/AdminDashboard'));
const AccountantDashboard = lazy(() => import('./dashboards/AccountantDashboard'));
const HeadTeacherDashboard = lazy(() => import('./dashboards/HeadTeacherDashboard'));

// Lazy-loaded pages
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));
const CommunicationPage = lazy(() => import('./pages/CommunicationPage'));
const ManageStaffPage = lazy(() => import('./pages/ManageStaffPage'));
const ManageStudentsPage = lazy(() => import('./pages/ManageStudentsPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const ManageAttendancePage = lazy(() => import('./pages/ManageAttendancePage'));
const ManageEventsPage = lazy(() => import('./pages/ManageEventsPage'));

// Fees pages
const ManageFeesPage = lazy(() => import('./pages/ManageFeesPage'));
const FeesReportPage = lazy(() => import('./pages/FeesReportPage'));
const PrintBillPage = lazy(() => import('./pages/PrintBillPage'));

// Academics (Admin-only)
const ManageClassTeacherPage = lazy(() => import('./pages/ManageClassTeacherPage'));
const ManageSubjectsPage = lazy(() => import('./pages/ManageSubjectsPage'));
const ManageClassesPage = lazy(() => import('./pages/ManageClassesPage'));
const AssignSubjectsPage = lazy(() => import('./pages/AssignSubjectsPage')); // ✅ KEEP

// Academic Years & Terms (Admin-only)
const ManageAcademicYearsPage = lazy(() => import('./pages/ManageAcademicYearsPage'));
const ManageTermsPage = lazy(() => import('./pages/ManageTermsPage'));

// Examination
const PrintExamReportPage = lazy(() => import('./pages/PrintExamReportPage')); // Admin + HeadTeacher
const ManageExamReportPage = lazy(() => import('./pages/ManageExamReportPage')); // HeadTeacher + Teacher (class-teacher only)

// HeadTeacher Attendance Report (HT only)
const AttendanceReportPage = lazy(() => import('./pages/AttendanceReportPage'));

// Exams
const ExamScaleSetupPage = lazy(() => import('./pages/ExamScaleSetupPage')); // Admin-only
const EnterScoresPage = lazy(() => import('./pages/EnterScoresPage')); // Teacher/HT/Admin


//student
const OnlineQuizzes = lazy(() => import('./pages/student/OnlineQuizzes'));
const OnlineLessons = lazy(() => import('./pages/student/OnlineLessons'));
const Assignment = lazy(() => import('./pages/student/Assignment'));

// parent
const TeacherContacts = lazy(() => import('./pages/teacher/TeacherContacts'));



const DashboardLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
    <div className="text-center">
      <LoadingSpinner size="large" showLogo={true} />
      <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading your dashboard...</p>
    </div>
  </div>
);

// Normalize roles
const normalizeRole = (role) => {
  if (!role) return '';
  const r = String(role).toLowerCase();
  if (r === 'ht' || r === 'headteacher') return 'headteacher';
  if (r === 'ad' || r === 'admin') return 'admin';
  if (r === 'tr' || r === 'teacher') return 'teacher';
  if (r === 'ac' || r === 'accountant') return 'accountant';
  if (r === 'ow' || r === 'owner') return 'owner';
  return r;
};

/** ---------- ROUTE GUARDS ---------- **/
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, isInitializing } = useAuth();
  const location = useLocation();
  if (isInitializing || isLoading) return <DashboardLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
};

const RoleRoute = ({ allowed = [], children }) => {
  const { user } = useAuth();
  const role = normalizeRole(user?.userType);
  if (!allowed.includes(role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const FeatureRoute = ({ requireClassTeacher = false, children }) => {
  const { user } = useAuth();
  const role = normalizeRole(user?.userType);
  const { isClassTeacher } = useTeacherAccess();
  if (requireClassTeacher && role === 'teacher' && !isClassTeacher) return <Navigate to="/dashboard" replace />;
  return children;
};

const DashboardRouter = () => {
  const { user, isLoading, isInitializing } = useAuth();
  if (isInitializing || isLoading) return <DashboardLoading />;
  if (!user) return <Navigate to="/login" replace />;
  switch (normalizeRole(user.userType)) {
    case 'teacher': return <Suspense fallback={<DashboardLoading />}><TeacherDashboard /></Suspense>;
    case 'admin': return <Suspense fallback={<DashboardLoading />}><AdminDashboard /></Suspense>;
    case 'accountant': return <Suspense fallback={<DashboardLoading />}><AccountantDashboard /></Suspense>;
    case 'headteacher': return <Suspense fallback={<DashboardLoading />}><HeadTeacherDashboard /></Suspense>;
    case 'student': return <Suspense fallback={<DashboardLoading />}><StudentDashboard /></Suspense>;
    default: return <Navigate to="/login" replace />;
  }
};

const LoginRoute = () => {
  const { isAuthenticated, isLoading, isInitializing } = useAuth();
  const location = useLocation();
  const from = (location.state?.from?.pathname || '') + (location.state?.from?.search || '');
  if (isAuthenticated && !isLoading && !isInitializing) return <Navigate to={from || '/dashboard'} replace />;
  return <SchoolLogin />;
};

/** ---------- ROUTES ---------- **/
const AppRoutes = () => {
  const { isAuthenticated, isLoading, isInitializing } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginRoute />} />

      {/* student */}

      <Route path="/test-student" element={<StudentDashboard />} />

      <Route path="/test-student/onlineQuizzes" element={<OnlineQuizzes />} />

      <Route path="/test-student/OnlineLessons" element={<OnlineLessons />} />

      <Route path="/test-student/Assignment" element={<Assignment />} />

      {/* parent */}
      <Route path="/test-parent" element={<ParentDashboard />} />

      <Route path="/test-parent/teachercontacts" element={<TeacherContacts />} />
      {/* Dashboard */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />

      {/* Communication (not for teachers) */}
      <Route path="/dashboard/communication" element={
        <ProtectedRoute>
          <RoleRoute allowed={['admin', 'accountant', 'headteacher', 'owner']}>
            <Suspense fallback={<DashboardLoading />}><CommunicationPage /></Suspense>
          </RoleRoute>
        </ProtectedRoute>
      } />

      {/* Events: Admin + Headteacher */}
      <Route path="/dashboard/manage-events" element={
        <ProtectedRoute>
          <RoleRoute allowed={['admin', 'headteacher']}>
            <Suspense fallback={<DashboardLoading />}><ManageEventsPage /></Suspense>
          </RoleRoute>
        </ProtectedRoute>
      } />

      {/* Staff */}
      <Route path="/dashboard/manage-staff" element={
        <ProtectedRoute>
          <Suspense fallback={<DashboardLoading />}><ManageStaffPage /></Suspense>
        </ProtectedRoute>
      } />

      {/* Students (class teachers only) */}
      <Route path="/dashboard/manage-students" element={
        <ProtectedRoute>
          <RoleRoute allowed={['admin', 'owner', 'headteacher', 'accountant', 'teacher']}>
            <FeatureRoute requireClassTeacher>
              <Suspense fallback={<DashboardLoading />}><ManageStudentsPage /></Suspense>
            </FeatureRoute>
          </RoleRoute>
        </ProtectedRoute>
      } />

      {/* Attendance */}
      <Route path="/dashboard/attendance" element={
        <ProtectedRoute>
          <Suspense fallback={<DashboardLoading />}><AttendancePage /></Suspense>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/manage-attendance" element={
        <ProtectedRoute>
          <RoleRoute allowed={['teacher']}>
            <FeatureRoute requireClassTeacher>
              <Suspense fallback={<DashboardLoading />}><ManageAttendancePage /></Suspense>
            </FeatureRoute>
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/attendance-report" element={
        <ProtectedRoute>
          <RoleRoute allowed={['headteacher']}>
            <Suspense fallback={<DashboardLoading />}><AttendanceReportPage /></Suspense>
          </RoleRoute>
        </ProtectedRoute>
      } />

      {/* Fees */}
      <Route path="/dashboard/manage-fees" element={
        <ProtectedRoute>
          <RoleRoute allowed={['admin', 'accountant']}>
            <Suspense fallback={<DashboardLoading />}><ManageFeesPage /></Suspense>
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/fees-report" element={
        <ProtectedRoute>
          <RoleRoute allowed={['admin', 'accountant']}>
            <Suspense fallback={<DashboardLoading />}><FeesReportPage /></Suspense>
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/print-bill" element={
        <ProtectedRoute>
          <RoleRoute allowed={['admin', 'accountant']}>
            <Suspense fallback={<DashboardLoading />}><PrintBillPage /></Suspense>
          </RoleRoute>
        </ProtectedRoute>
      } />

      {/* Academics (Admin only) */}
      <Route path="/dashboard/class-teacher" element={
        <ProtectedRoute>
          <RoleRoute allowed={['admin']}>
            <Suspense fallback={<DashboardLoading />}><ManageClassTeacherPage /></Suspense>
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/manage-subjects" element={
        <ProtectedRoute>
          <RoleRoute allowed={['admin']}>
            <Suspense fallback={<DashboardLoading />}><ManageSubjectsPage /></Suspense>
          </RoleRoute>
        </ProtectedRoute>
      } />
      {/* ✅ AssignSubjectsPage kept */}
      <Route path="/dashboard/assign-subjects" element={
        <ProtectedRoute>
          <RoleRoute allowed={['admin']}>
            <Suspense fallback={<DashboardLoading />}><AssignSubjectsPage /></Suspense>
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/classes" element={
        <ProtectedRoute>
          <RoleRoute allowed={['admin']}>
            <Suspense fallback={<DashboardLoading />}><ManageClassesPage /></Suspense>
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/academic-years" element={
        <ProtectedRoute>
          <RoleRoute allowed={['admin']}>
            <Suspense fallback={<DashboardLoading />}><ManageAcademicYearsPage /></Suspense>
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/academic-terms" element={
        <ProtectedRoute>
          <RoleRoute allowed={['admin']}>
            <Suspense fallback={<DashboardLoading />}><ManageTermsPage /></Suspense>
          </RoleRoute>
        </ProtectedRoute>
      } />

      {/* Exams */}
      <Route path="/dashboard/print-exam-report" element={
        <ProtectedRoute>
          <RoleRoute allowed={['admin', 'headteacher']}>
            <Suspense fallback={<DashboardLoading />}><PrintExamReportPage /></Suspense>
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/manage-exam" element={
        <ProtectedRoute>
          <RoleRoute allowed={['headteacher', 'teacher']}>
            <FeatureRoute requireClassTeacher>
              <Suspense fallback={<DashboardLoading />}><ManageExamReportPage /></Suspense>
            </FeatureRoute>
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/exams/enter-scores" element={
        <ProtectedRoute>
          <RoleRoute allowed={['teacher', 'headteacher', 'admin']}>
            <Suspense fallback={<DashboardLoading />}><EnterScoresPage /></Suspense>
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/exams/scale" element={
        <ProtectedRoute>
          <RoleRoute allowed={['admin']}>
            <Suspense fallback={<DashboardLoading />}><ExamScaleSetupPage /></Suspense>
          </RoleRoute>
        </ProtectedRoute>
      } />

      {/* Profile & Settings */}
      <Route path="/profile" element={<ProtectedRoute><Suspense fallback={<DashboardLoading />}><Profile /></Suspense></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Suspense fallback={<DashboardLoading />}><Settings /></Suspense></ProtectedRoute>} />

      {/* Default Redirect */}
      <Route
        path="/"
        element={
          isInitializing ? (
            <DashboardLoading />
          ) : isAuthenticated && !isLoading ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* 404 */}
      <Route path="*" element={<Suspense fallback={<DashboardLoading />}><NotFound /></Suspense>} />
    </Routes>
  );
};

/** ---------- THEME WRAPPER ---------- */
const ThemeWrapper = ({ children }) => {
  const { theme } = useTheme();
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="App min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {children}
      </div>
    </div>
  );
};

/** ---------- DataProvider fallback ---------- */
let DataProvider;
try {
  // eslint-disable-next-line global-require
  const DataContextModule = require('./contexts/DataContext');
  DataProvider = DataContextModule.DataProvider;
} catch {
  console.warn('DataContext not found, using fallback');
  DataProvider = ({ children }) => children;
}

/** ---------- APP ROOT ---------- */
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <TeacherAccessProvider>
            <Router>
              <DataProvider>
                <ThemeWrapper>
                  <IdleLogout idleMs={15 * 60 * 1000} />
                  {/* SessionManager removed */}
                  {/* Onboarding routes removed */}
                  <AppRoutes />
                </ThemeWrapper>
              </DataProvider>
            </Router>
          </TeacherAccessProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
