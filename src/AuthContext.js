// src/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ---- Safe API base & joiner (prevents double slashes) ----
const API_BASE_RAW =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/';
// Ensure exactly one trailing slash
const API_BASE = API_BASE_RAW.replace(/\/+$/, '') + '/';

const buildApiUrl = (path = '', params = {}) => {
  // strip any leading slashes from path
  const cleanPath = String(path).replace(/^\/+/, '');
  const url = new URL(cleanPath, API_BASE);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  return url.toString();
};

// ---- Error helpers (nicer Oracle/ORDS messages) ----
const mapOracleError = (text = '') => {
  const t = String(text);
  if (/ORDS-25001/i.test(t)) return 'Server error in REST handler (ORDS-25001). Check required parameters / SQL/PLSQL.';
  if (/ORA-00001/i.test(t)) return 'Unique constraint: the value already exists (e.g., email).';
  if (/ORA-01400/i.test(t)) return 'A required value was missing (NULL into NOT NULL).';
  if (/ORA-12899/i.test(t)) return 'Value too long for column (exceeds size).';
  if (/ORA-06502|numeric or value error/i.test(t)) return 'Numeric or value error (type/length).';
  if (/ORA-00904|invalid identifier/i.test(t)) return 'Invalid column/identifier (backend mismatch).';
  if (/ORA-00907|ORA-00933|ORA-00936/i.test(t)) return 'SQL syntax error in backend.';
  if (/ORA-01036|illegal variable name|number/i.test(t)) return 'Bind variable mismatch in backend.';
  return null;
};

const parseMaybeJson = async (res) => {
  const raw = await res.text();
  try {
    const json = JSON.parse(raw);
    return { json, raw };
  } catch {
    return { json: null, raw };
  }
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

  // Only allow app-supported roles (excluding student)
  const mapRole = (apiRole) => {
    const roleMap = {
      TE: 'teacher',
      AD: 'admin',
      AC: 'accountant',
      HT: 'headteacher',
      SO: 'owner',
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

    const msg = String(error?.message || '');
    // Browser CORS/network hints
    if (msg.includes('NetworkError') || msg.includes('fetch')) {
      return {
        success: false,
        error:
          'Connection blocked or failed (possibly CORS). Contact your system administrator or check your network.',
        type: 'cors_or_network',
      };
    }

    const mapped = mapOracleError(msg);
    if (mapped) {
      return { success: false, error: mapped, type: 'db' };
    }

    return {
      success: false,
      error: msg || 'An unexpected error occurred.',
      type: 'unknown',
    };
  };

  // ---- Login (GET; avoid Content-Type header to prevent preflight) ----
  /**
   * login(email, password, selectedUserType, isDemoMode, schoolId)
   * ORDS endpoint: staff/login/staff/ expects :email, :password, :p_school_id
   */
  const login = async (
    email,
    password,
    selectedUserType = null,
    isDemoMode = false,
    schoolId // <-- required as p_school_id
  ) => {
    setIsLoading(true);

    try {
      // Guard against missing school id
      if (schoolId === undefined || schoolId === null || schoolId === '') {
        setIsLoading(false);
        return {
          success: false,
          error: 'Please select your school before logging in.',
          type: 'validation',
        };
      }

      const url = buildApiUrl('staff/login/staff/', {
        email: String(email || ''),
        password: String(password || ''),
        p_school_id: String(schoolId),
      });

      const response = await fetch(url, {
        method: 'GET',
        // IMPORTANT: no 'Content-Type' on GET => avoid preflight
        headers: { Accept: 'application/json' },
      });

      const { json, raw } = await parseMaybeJson(response);
      const data = json ?? {};

      if (!response.ok) {
        const mapped = mapOracleError(JSON.stringify(data) || raw);
        setIsLoading(false);
        return {
          success: false,
          error: mapped || data?.message || `Login failed (HTTP ${response.status})`,
          type: 'auth_failed',
        };
      }

      if (data.success && data.user) {
        const apiRole = mapRole(data.user.role);

        // Block login if role not supported (e.g., ST)
        if (!apiRole) {
          setIsLoading(false);
          return {
            success: false,
            error: 'This login type is not supported in this system.',
            type: 'role_unsupported',
          };
        }

        if (selectedUserType && selectedUserType !== apiRole && !isDemoMode) {
          setIsLoading(false);
          return {
            success: false,
            error: `Invalid login! Your account is registered as ${apiRole}, but you selected ${selectedUserType}.`,
            type: 'role_mismatch',
          };
        }

        const finalRole = selectedUserType || apiRole;

        // Prefer schoolId from API if present; otherwise use the one the user picked
        const resolvedSchoolId =
          data.user.schoolId ??
          data.user.school_id ??
          (Number.isNaN(Number(schoolId)) ? schoolId : Number(schoolId));

        const userData = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName,
          name: data.user.fullName,
          userType: finalRole,
          apiRole,
          originalRole: data.user.role,
          schoolId: resolvedSchoolId,
          avatar: getAvatar(finalRole),
          isRoleMismatch: !!selectedUserType && selectedUserType !== apiRole,
          isDemoMode,
          permissions: getUserPermissions(data.user.role),
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
          error: data?.message || 'Invalid credentials',
          type: 'auth_failed',
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

  /**
   * apiCall(endpoint, { method, headers, body, params, skipAuth })
   * - Uses safe builder to avoid //
   * - Avoids Content-Type on GET/HEAD (reduces CORS preflights)
   * - If skipAuth=true, omits Authorization header (for public endpoints)
   */
  const apiCall = async (endpoint, options = {}) => {
    const { skipAuth = false, params, ...rest } = options || {};
    const url = buildApiUrl(endpoint, params);

    // Build headers
    const baseHeaders = { Accept: 'application/json' };
    const finalHeaders = { ...baseHeaders, ...(rest.headers || {}) };

    // Add Authorization only if not skipped and we have a token
    if (!skipAuth && token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }

    // Only set Content-Type if we actually send a JSON body
    const hasBody = rest.body !== undefined && rest.body !== null;
    const method = (rest.method || 'GET').toUpperCase();

    if (hasBody && method !== 'GET' && method !== 'HEAD') {
      finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
    } else {
      // Ensure we don't set JSON Content-Type on GET/HEAD
      if (finalHeaders['Content-Type'] === 'application/json') {
        delete finalHeaders['Content-Type'];
      }
    }

    try {
      const response = await fetch(url, { ...rest, method, headers: finalHeaders });

      if (response.status === 401) {
        logout();
        return { success: false, error: 'Session expired. Please login again.' };
      }

      const { json, raw } = await parseMaybeJson(response);
      if (!response.ok) {
        const mapped = mapOracleError(JSON.stringify(json) || raw);
        return {
          success: false,
          error: mapped || json?.message || `Request failed (HTTP ${response.status})`,
        };
      }

      return json ?? { success: true };
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
    API_BASE,
    buildApiUrl, // expose for other modules (so everyone joins paths the same way)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ---- Permissions / Avatars ----
const getUserPermissions = (apiRole) => {
  const permissions = {
    AD: ['manage_users', 'view_reports', 'system_settings', 'manage_courses', 'view_all_data'],
    TE: ['manage_classes', 'grade_students', 'view_student_data', 'manage_assignments'],
    AC: ['manage_fees', 'view_fees', 'view_bills'],
    HT: ['manage_teachers', 'monitor_students', 'review_exams'],
    SO: ['manage_school', 'access_all', 'review_finances'],
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
