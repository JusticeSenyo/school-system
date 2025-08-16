import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import SchoolLogin from './SchoolLogin';
import SignUpPage from './pages/SignUpPage';
import OnboardingDashboard from './pages/OnboardingDashboard';
import AddUsersPage from './pages/AddUsersPage';
import AddClassesSubjectsPage from './pages/AddClassesSubjectsPage';
import AddFeesPage from './pages/AddFeesPage';
import AddStudentsPage from './pages/AddStudentsPage';
import SetupCompletePage from './pages/SetupCompletePage';
import SchoolDetailsPage from './pages/SchoolDetailsPage';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Optional Data Context fallback
let DataProvider;
try {
  const DataContextModule = require('./contexts/DataContext');
  DataProvider = DataContextModule.DataProvider;
} catch (error) {
  console.warn('DataContext not found, using fallback');
  DataProvider = ({ children }) => children;
}

// Lazy-loaded dashboards
const TeacherDashboard = lazy(() => import('./dashboards/TeacherDashboard'));
const AdminDashboard = lazy(() => import('./dashboards/AdminDashboard'));
const AccountantDashboard = lazy(() => import('./dashboards/AccountantDashboard'));

// Lazy-loaded pages
const Profile = lazy(() =>
  import('./pages/Profile').catch(() => ({
    default: () => <div className="p-8 text-center">Profile page not available</div>
  }))
);
const Settings = lazy(() =>
  import('./pages/Settings').catch(() => ({
    default: () => <div className="p-8 text-center">Settings page not available</div>
  }))
);
const NotFound = lazy(() =>
  import('./pages/NotFound').catch(() => ({
    default: () => <div className="p-8 text-center">Page not found</div>
  }))
);

// Loading spinner fallback
const DashboardLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
    <div className="text-center">
      <LoadingSpinner size="large" showLogo={true} />
      <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading your dashboard...</p>
    </div>
  </div>
);

// Protect private routes
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, isInitializing } = useAuth();
  if (isInitializing) return <DashboardLoading />;
  if (isLoading) return children;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Dynamic dashboard routing
const DashboardRouter = () => {
  const { user, isLoading, isInitializing } = useAuth();
  if (isInitializing || isLoading) return <DashboardLoading />;
  if (!user) return <Navigate to="/login" replace />;

  switch (user.userType) {
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
    default:
      return <Navigate to="/login" replace />;
  }
};

// Login route logic
const LoginRoute = () => {
  const { isAuthenticated, isLoading, isInitializing } = useAuth();
  if (isAuthenticated && !isLoading && !isInitializing) {
    return <Navigate to="/dashboard" replace />;
  }
  return <SchoolLogin />;
};

// Define app routes
const AppRoutes = () => {
  const { isAuthenticated, isLoading, isInitializing } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/signup" element={<SignUpPage />} />

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

      {/* Profile */}
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

      {/* Settings */}
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

      {/* Catch-all */}
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

// Dark/light theme wrapper
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

// Root App
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <Router>
              <ThemeWrapper>
                <AppRoutes />
              </ThemeWrapper>
            </Router>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
