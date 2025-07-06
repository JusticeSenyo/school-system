import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState(() => {
    try {
      return localStorage?.getItem('token') || null;
    } catch {
      return null;
    }
  });

  // API Base URL - Change this line based on CORS solution
  const API_BASE = 'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/school/api/v1';
  // For proxy method, change above line to: const API_BASE = '/ords/schools/school/api/v1';

  // Role mapping from API to frontend
  const mapRole = (apiRole) => {
    const roleMap = {
      'TE': 'teacher',
      'AD': 'admin', 
      'ST': 'student',
      // Add more mappings as needed
    };
    return roleMap[apiRole] || 'student';
  };

  // Safe localStorage helpers
  const saveToStorage = (key, value) => {
    try {
      localStorage?.setItem(key, value);
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
  };

  const getFromStorage = (key) => {
    try {
      return localStorage?.getItem(key);
    } catch {
      return null;
    }
  };

  const removeFromStorage = (key) => {
    try {
      localStorage?.removeItem(key);
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
  };

  // Check if user is already logged in on app start
  useEffect(() => {
    const savedUser = getFromStorage('user');
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        removeFromStorage('user');
        removeFromStorage('token');
      }
    }
  }, [token]);

  // Enhanced error handling function
  const handleApiError = (error, operation = 'API call') => {
    console.error(`${operation} error:`, error);
    
    // Check for CORS errors
    if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Connection blocked by browser security (CORS). Please contact your system administrator to enable cross-origin requests for this domain.',
        type: 'cors'
      };
    }
    
    // Check for network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Unable to connect to the server. Please check your internet connection and try again.',
        type: 'network'
      };
    }
    
    // Default error
    return {
      success: false,
      error: error.message || 'An unexpected error occurred. Please try again.',
      type: 'unknown'
    };
  };

  // Login function with enhanced CORS error handling
  const login = async (email, password, selectedUserType = null, isDemoMode = false) => {
    console.log('🚀 Starting login process...');
    setIsLoading(true);
    
    try {
      const url = `${API_BASE}/auth/login/?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
      console.log('📡 Making request to:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 Response received:', response);

      const data = await response.json();
      console.log('📄 Response data:', data);

      if (data.success && data.user) {
        const apiRole = mapRole(data.user.role);
        
        // Strict role matching validation (unless demo mode is enabled)
        if (selectedUserType && selectedUserType !== apiRole && !isDemoMode) {
          setIsLoading(false);
          return { 
            success: false, 
            error: `Invalid login! Your account is registered as ${apiRole}, but you selected ${selectedUserType}. Please select the correct role or enable Demo Mode to test.`,
            type: 'role_mismatch'
          };
        }
        
        // Use selected role if provided (and valid), otherwise use API role
        const finalRole = selectedUserType || apiRole;
        
        const userData = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName,
          name: data.user.fullName,
          userType: finalRole, // This determines which dashboard to show
          apiRole: apiRole, // Keep original API role for reference
          originalRole: data.user.role, // Keep raw API role
          schoolId: data.user.schoolId,
          avatar: getAvatar(finalRole),
          isRoleMismatch: !!selectedUserType && selectedUserType !== apiRole, // Flag if roles don't match
          isDemoMode: isDemoMode, // Flag if demo mode was used
          permissions: getUserPermissions(data.user.role) // Add user permissions based on actual API role
        };
        
        // Save to state and localStorage
        setUser(userData);
        setToken(data.token);
        saveToStorage('user', JSON.stringify(userData));
        saveToStorage('token', data.token);
        
        setIsLoading(false);
        console.log('✅ Login successful');
        return { success: true, user: userData };
      } else {
        setIsLoading(false);
        console.log('❌ Login failed:', data.message);
        return { 
          success: false, 
          error: data.message || 'Invalid credentials',
          type: 'auth_failed'
        };
      }
    } catch (error) {
      setIsLoading(false);
      const errorResponse = handleApiError(error, 'Login');
      console.log('💥 Login exception handled:', errorResponse);
      return errorResponse;
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    removeFromStorage('user');
    removeFromStorage('token');
    
    // Optional: Call logout API endpoint if you have one
    // fetch(`${API_BASE}/auth/logout`, { ... });
  };

  // API call helper with enhanced error handling
  const apiCall = async (endpoint, options = {}) => {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Handle token expiry
      if (response.status === 401) {
        logout();
        return { success: false, error: 'Session expired. Please login again.' };
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return handleApiError(error, 'API call');
    }
  };

  const isAuthenticated = !!user && !!token;

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated,
    isLoading,
    apiCall, // Expose for future API calls
    API_BASE // Expose base URL if needed
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Helper function to get user permissions based on API role
const getUserPermissions = (apiRole) => {
  const permissions = {
    'AD': ['manage_users', 'view_reports', 'system_settings', 'manage_courses', 'view_all_data'],
    'TE': ['manage_classes', 'grade_students', 'view_student_data', 'manage_assignments'],
    'ST': ['view_grades', 'submit_assignments', 'view_schedule', 'view_profile']
  };

  return permissions[apiRole] || [];
};

// Helper function for avatars
const getAvatar = (userType) => {
  const avatars = {
    teacher: '👨‍🏫',
    admin: '👨‍💼',
    student: '👨‍🎓'
  };
  return avatars[userType] || '👤';
};