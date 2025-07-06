// App.js - Fixed for your AuthContext
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import SchoolLogin from './SchoolLogin';

// Import DataProvider with proper error handling
let DataProvider;
try {
  const DataContextModule = require('./contexts/DataContext');
  DataProvider = DataContextModule.DataProvider;
} catch (error) {
  console.warn('DataContext not found, using fallback');
  // Fallback DataProvider
  DataProvider = ({ children }) => children;
}

// Lazy load dashboard components for better performance
const TeacherDashboard = lazy(() => import('./dashboards/TeacherDashboard'));
const AdminDashboard = lazy(() => import('./dashboards/AdminDashboard'));
const StudentDashboard = lazy(() => import('./dashboards/StudentDashboard'));

// Additional lazy-loaded pages with error handling
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

// Loading component with school branding
const DashboardLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="text-center">
      <LoadingSpinner size="large" showLogo={true} />
      <p className="mt-4 text-gray-600 font-medium">Loading your dashboard...</p>
    </div>
  </div>
);

// Enhanced Protected Route Component with loading state
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth(); // Note: using isLoading from your AuthContext
  
  if (isLoading) {
    return <DashboardLoading />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Enhanced Dashboard Router with error handling
const DashboardRouter = () => {
  const { user, isLoading } = useAuth(); // Note: using isLoading from your AuthContext
  
  if (isLoading) {
    return <DashboardLoading />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
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
    case 'student':
      return (
        <Suspense fallback={<DashboardLoading />}>
          <StudentDashboard />
        </Suspense>
      );
    default:
      console.warn(`Unknown user type: ${user.userType}`);
      return <Navigate to="/login" replace />;
  }
};

// Enhanced App Routes with additional functionality
const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth(); // Note: using isLoading from your AuthContext
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          isLoading ? (
            <DashboardLoading />
          ) : isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <SchoolLogin />
          )
        } 
      />
      
      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        }
      />
      
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
      
      {/* Default redirect */}
      <Route 
        path="/" 
        element={
          isLoading ? (
            <DashboardLoading />
          ) : isAuthenticated ? (
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

// Enhanced App Component with all providers and error handling
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <Router>
            <div className="App min-h-screen bg-gray-50">
              <AppRoutes />
            </div>
          </Router>
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;