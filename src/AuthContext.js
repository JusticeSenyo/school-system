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

  const API_BASE = 'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/school/api/v1';

  // Only allow app-supported roles (excluding student)
  const mapRole = (apiRole) => {
    const roleMap = {
      'TE': 'teacher',
      'AD': 'admin',
      'AC': 'accountant',
      'HT': 'headteacher',
      'SO': 'owner'
    };
    return roleMap[apiRole] || null;
  };

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

  const handleApiError = (error, operation = 'API call') => {
    console.error(`${operation} error:`, error);

    if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Connection blocked by browser security (CORS). Please contact your system administrator.',
        type: 'cors'
      };
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Unable to connect to the server. Check your internet connection.',
        type: 'network'
      };
    }

    return {
      success: false,
      error: error.message || 'An unexpected error occurred.',
      type: 'unknown'
    };
  };

  const login = async (email, password, selectedUserType = null, isDemoMode = false) => {
    setIsLoading(true);

    try {
      const url = `${API_BASE}/auth/login/?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
      const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });

      const data = await response.json();

      if (data.success && data.user) {
        const apiRole = mapRole(data.user.role);

        // Block login if role is not supported in this app (e.g. ST)
        if (!apiRole) {
          setIsLoading(false);
          return {
            success: false,
            error: `This login type is not supported in this system.`,
            type: 'role_unsupported'
          };
        }

        if (selectedUserType && selectedUserType !== apiRole && !isDemoMode) {
          setIsLoading(false);
          return {
            success: false,
            error: `Invalid login! Your account is registered as ${apiRole}, but you selected ${selectedUserType}. Please select the correct role or enable Demo Mode to test.`,
            type: 'role_mismatch'
          };
        }

        const finalRole = selectedUserType || apiRole;

        const userData = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName,
          name: data.user.fullName,
          userType: finalRole,
          apiRole: apiRole,
          originalRole: data.user.role,
          schoolId: data.user.schoolId,
          avatar: getAvatar(finalRole),
          isRoleMismatch: !!selectedUserType && selectedUserType !== apiRole,
          isDemoMode: isDemoMode,
          permissions: getUserPermissions(data.user.role)
        };

        setUser(userData);
        setToken(data.token);
        saveToStorage('user', JSON.stringify(userData));
        saveToStorage('token', data.token);

        setIsLoading(false);
        return { success: true, user: userData };
      } else {
        setIsLoading(false);
        return {
          success: false,
          error: data.message || 'Invalid credentials',
          type: 'auth_failed'
        };
      }
    } catch (error) {
      setIsLoading(false);
      return handleApiError(error, 'Login');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    removeFromStorage('user');
    removeFromStorage('token');
  };

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
    apiCall,
    API_BASE
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const getUserPermissions = (apiRole) => {
  const permissions = {
    'AD': ['manage_users', 'view_reports', 'system_settings', 'manage_courses', 'view_all_data'],
    'TE': ['manage_classes', 'grade_students', 'view_student_data', 'manage_assignments'],
    'AC': ['manage_fees', 'view_fees', 'view_bills'],
    'HT': ['manage_teachers', 'monitor_students', 'review_exams'],
    'SO': ['manage_school', 'access_all', 'review_finances']
  };

  return permissions[apiRole] || [];
};

const getAvatar = (userType) => {
  const avatars = {
    teacher: '👨‍🏫',
    admin: '👨‍💼',
    accountant: '💰',
    headteacher: '👩‍🏫',
    owner: '🏫',
  };
  return avatars[userType] || '👤';
};
