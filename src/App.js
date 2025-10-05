import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import SchoolLogin from './SchoolLogin';

import OnboardingDashboard from './pages/OnboardingDashboard';
import AddUsersPage from './pages/AddUsersPage';
import AssignSubjectsPage from './pages/AssignSubjectsPage';
import AddClassesSubjectsPage from './pages/AddClassesSubjectsPage';
import AddFeesPage from './pages/AddFeesPage';
import AddStudentsPage from './pages/AddStudentsPage';
import SetupCompletePage from './pages/SetupCompletePage';
import SchoolDetailsPage from './pages/SchoolDetailsPage';

import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { TeacherAccessProvider, useTeacherAccess } from './contexts/TeacherAccessContext';

// Lazy-loaded dashboards
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

// NEW: Academic Years & Terms (Admin-only)
const ManageAcademicYearsPage = lazy(() => import('./pages/ManageAcademicYearsPage'));
const ManageTermsPage = lazy(() => import('./pages/ManageTermsPage'));

// Examination
const PrintExamReportPage = lazy(() => import('./pages/PrintExamReportPage')); // Admin + HeadTeacher
const ManageExamReportPage = lazy(() => import('./pages/ManageExamReportPage')); // HeadTeacher + Teacher (class-teacher only)

// HeadTeacher Attendance Report (NEW)
const AttendanceReportPage = lazy(() => import('./pages/AttendanceReportPage')); // HT only

// NEW PAGES
const ExamScaleSetupPage = lazy(() => import('./pages/ExamScaleSetupPage')); // Admin-only
const EnterScoresPage = lazy(() => import('./pages/EnterScoresPage')); // ALL teachers

const DashboardLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
    <div className="text-center">
      <LoadingSpinner size="large" showLogo={true} />
      <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading your dashboard...</p>
    </div>
  </div>
);

// Normalize roles so either "headteacher" or "HT" works
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

// Protect private routes
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, isInitializing } = useAuth();
  if (isInitializing || isLoading) return <DashboardLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Role guard for sensitive routes
const RoleRoute = ({ allowed = [], children }) => {
  const { user } = useAuth();
  const role = normalizeRole(user?.userType);
  if (!allowed.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};


// Extra feature-gate for "class teacher only" pages when role is teacher
const FeatureRoute = ({ requireClassTeacher = false, children }) => {
  const { user } = useAuth();
  const role = normalizeRole(user?.userType);
  const { isClassTeacher } = useTeacherAccess();
  if (requireClassTeacher && role === 'teacher' && !isClassTeacher) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// Role-based dashboard
const DashboardRouter = () => {
  const { user, isLoading, isInitializing } = useAuth();
  if (isInitializing || isLoading) return <DashboardLoading />;
  if (!user) return <Navigate to="/login" replace />;

  switch (normalizeRole(user.userType)) {
    case 'teacher':
      return (
        <Suspense fallback={<DashboardLoading />}>
          <TeacherDashboard />
        </Suspense>
      );
    case 'admin':
      return (
        <Suspense fallback={<DashboardLoading />}>
          <AdminDashboard />
        </Suspense>
      );
    case 'accountant':
      return (
        <Suspense fallback={<DashboardLoading />}>
          <AccountantDashboard />
        </Suspense>
      );
    case 'headteacher':
      return (
        <Suspense fallback={<DashboardLoading />}>
          <HeadTeacherDashboard />
        </Suspense>
      );
    default:
      return <Navigate to="/login" replace />;
  }
};

// Public login route
const LoginRoute = () => {
  const { isAuthenticated, isLoading, isInitializing } = useAuth();
  if (isAuthenticated && !isLoading && !isInitializing) {
    return <Navigate to="/dashboard" replace />;
  }
  return <SchoolLogin />;
};

// All routes
const AppRoutes = () => {
  const { isAuthenticated, isLoading, isInitializing } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginRoute />} />

      {/* Onboarding Routes */}
      <Route path="/setup" element={<OnboardingDashboard />} />
      <Route path="/setup/school-details" element={<SchoolDetailsPage />} />
      <Route path="/setup/add-users" element={<AddUsersPage />} />
      <Route path="/setup/classes-subjects" element={<AddClassesSubjectsPage />} />
      <Route path="/setup/fees" element={<AddFeesPage />} />
      <Route path="/setup/students" element={<AddStudentsPage />} />
      <Route path="/setup/complete" element={<SetupCompletePage />} />

      {/* Protected Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        }
      />

      {/* Feature Pages */}
      {/* Communication: NOT available to teachers */}
      <Route
  path="/dashboard/communication"
  element={
    <ProtectedRoute>
      {/* block teachers; allow others */}
      <RoleRoute allowed={['admin', 'accountant', 'headteacher', 'owner']}>
        <Suspense fallback={<DashboardLoading />}>
          <CommunicationPage />
        </Suspense>
      </RoleRoute>
    </ProtectedRoute>
  }
/>

{/* Manage Events: Admin + Headteacher only */}
<Route
  path="/dashboard/manage-events"
  element={
    <ProtectedRoute>
      <RoleRoute allowed={['admin', 'headteacher']}>
        <Suspense fallback={<DashboardLoading />}>
          <ManageEventsPage />
        </Suspense>
      </RoleRoute>
    </ProtectedRoute>
  }
/>



      {/* Manage Staff (same as before) */}
      <Route
        path="/dashboard/manage-staff"
        element={
          <ProtectedRoute>
            <Suspense fallback={<DashboardLoading />}>
              <ManageStaffPage />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Manage Students: teacher sees ONLY if class teacher */}
      <Route
        path="/dashboard/manage-students"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['admin','owner','headteacher','accountant','teacher']}>
              <FeatureRoute requireClassTeacher>
                <Suspense fallback={<DashboardLoading />}>
                  <ManageStudentsPage />
                </Suspense>
              </FeatureRoute>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Attendance (plain view if you still use it elsewhere) */}
      <Route
        path="/dashboard/attendance"
        element={
          <ProtectedRoute>
            <Suspense fallback={<DashboardLoading />}>
              <AttendancePage />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Manage Attendance: teacher sees ONLY if class teacher */}
      <Route
        path="/dashboard/manage-attendance"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['teacher']}>
              <FeatureRoute requireClassTeacher>
                <Suspense fallback={<DashboardLoading />}>
                  <ManageAttendancePage />
                </Suspense>
              </FeatureRoute>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* HeadTeacher-only: Attendance Report */}
      <Route
        path="/dashboard/attendance-report"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['headteacher']}>
              <Suspense fallback={<DashboardLoading />}>
                <AttendanceReportPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Fees pages (Admin & Accountant only) */}
      <Route
        path="/dashboard/manage-fees"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['admin', 'accountant']}>
              <Suspense fallback={<DashboardLoading />}>
                <ManageFeesPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/fees-report"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['admin', 'accountant']}>
              <Suspense fallback={<DashboardLoading />}>
                <FeesReportPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/print-bill"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['admin', 'accountant']}>
              <Suspense fallback={<DashboardLoading />}>
                <PrintBillPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Academics pages (Admin only) */}
      <Route
        path="/dashboard/class-teacher"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['admin']}>
              <Suspense fallback={<DashboardLoading />}>
                <ManageClassTeacherPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/manage-subjects"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['admin']}>
              <Suspense fallback={<DashboardLoading />}>
                <ManageSubjectsPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/assign-subjects"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['admin']}>
              <Suspense fallback={<DashboardLoading />}>
                <AssignSubjectsPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/classes"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['admin']}>
              <Suspense fallback={<DashboardLoading />}>
                <ManageClassesPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      {/* NEW: Academic Years & Terms (Admin only) */}
      <Route
        path="/dashboard/academic-years"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['admin']}>
              <Suspense fallback={<DashboardLoading />}>
                <ManageAcademicYearsPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/academic-terms"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['admin']}>
              <Suspense fallback={<DashboardLoading />}>
                <ManageTermsPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Examination */}
      <Route
        path="/dashboard/print-exam-report"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['admin', 'headteacher']}>
              <Suspense fallback={<DashboardLoading />}>
                <PrintExamReportPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      {/* Manage Exam Report: teacher sees ONLY if class teacher */}
      <Route
        path="/dashboard/manage-exam"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['headteacher', 'teacher']}>
              <FeatureRoute requireClassTeacher>
                <Suspense fallback={<DashboardLoading />}>
                  <ManageExamReportPage />
                </Suspense>
              </FeatureRoute>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      {/* NEW: Enter Scores (all teachers) */}
      <Route
        path="/dashboard/exams/enter-scores"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['teacher','headteacher','admin']}>
              <Suspense fallback={<DashboardLoading />}>
                <EnterScoresPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />


      {/* NEW: Grading Scale Setup (Admin) */}
      <Route
        path="/dashboard/exams/scale"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['admin'] /* add 'owner' if needed */}>
              <Suspense fallback={<DashboardLoading />}>
                <ExamScaleSetupPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Profile & Settings */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Suspense fallback={<DashboardLoading />}>
              <Profile />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Suspense fallback={<DashboardLoading />}>
              <Settings />
            </Suspense>
          </ProtectedRoute>
        }
      />

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

      {/* 404 Page */}
      <Route
        path="*"
        element={
          <Suspense fallback={<DashboardLoading />}>
            <NotFound />
          </Suspense>
        }
      />
    </Routes>
  );
};

// Theme Wrapper
const ThemeWrapper = ({ children }) => {
  const { theme } = useTheme();
  return (
    <div className={`${theme === 'dark' ? 'dark' : ''}`}>
      <div className="App min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {children}
      </div>
    </div>
  );
};

// App Root
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <TeacherAccessProvider>
            <DataProvider>
              <Router>
                <ThemeWrapper>
                  <AppRoutes />
                </ThemeWrapper>
              </Router>
            </DataProvider>
          </TeacherAccessProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// Optional DataContext fallback (kept at bottom to avoid hoisting issues)
let DataProvider;
try {
  // eslint-disable-next-line global-require
  const DataContextModule = require('./contexts/DataContext');
  DataProvider = DataContextModule.DataProvider;
} catch (error) {
  console.warn('DataContext not found, using fallback');
  DataProvider = ({ children }) => children;
}

export default App;
