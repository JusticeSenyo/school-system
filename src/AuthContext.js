// src/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

/** ------------------------------------------------------------------
 *  API base & URL builder (supports absolute or relative bases)
 *  Set env for prod:
 *    REACT_APP_API_BASE=/ords/                                  (with proxy)
 *    or
 *    REACT_APP_API_BASE=https://....oraclecloudapps.com/ords/schools/ (direct)
 * ------------------------------------------------------------------ */
const API_BASE_RAW =
  process.env.REACT_APP_API_BASE ||
  '/ords/'; // default to proxy path so local + prod rewrites work

const resolveBase = (raw) => {
  let s = String(raw || '').trim();
  if (!s) s = '/ords/';
  if (!s.endsWith('/')) s += '/';

  // Already absolute?
  if (/^https?:\/\//i.test(s)) return s;

  // Make absolute from current origin
  const origin =
    (typeof window !== 'undefined' && window.location?.origin)
      ? window.location.origin.replace(/\/+$/, '')
      : 'http://localhost';
  return origin + (s.startsWith('/') ? s : `/${s}`);
};

export const API_BASE = resolveBase(API_BASE_RAW);

export const buildApiUrl = (path = '', params = {}) => {
  const cleanPath = String(path || '').replace(/^\/+/, ''); // strip leading slash
  const base = API_BASE.endsWith('/') ? API_BASE : `${API_BASE}/`;
  const url = new URL(base + cleanPath);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  });
  return url.toString();
};

/** ---------------- Error helpers (ORDS/Oracle nicer messages) --------------- */
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

/** --------------------------------- Provider -------------------------------- */
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

  // Role mapper from API codes to app roles
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

  // storage helpers
  const saveToStorage = (k, v) => { try { localStorage?.setItem(k, v); } catch {} };
  const getFromStorage = (k) => { try { return localStorage?.getItem(k); } catch { return null; } };
  const removeFromStorage = (k) => { try { localStorage?.removeItem(k); } catch {} };

  // hydrate user on mount if token + user exist
  useEffect(() => {
    const savedUser = getFromStorage('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        removeFromStorage('user');
        removeFromStorage('token');
      }
    }
  }, [token]);

  const handleApiError = (error, op = 'API call') => {
    console.error(`${op} error:`, error);
    const msg = String(error?.message || '');
    if (msg.includes('NetworkError') || msg.includes('fetch')) {
      return {
        success: false,
        error: 'Connection blocked or failed (possibly CORS). Contact your system administrator or check your network.',
        type: 'cors_or_network',
      };
    }
    const mapped = mapOracleError(msg);
    if (mapped) return { success: false, error: mapped, type: 'db' };
    return { success: false, error: msg || 'An unexpected error occurred.', type: 'unknown' };
  };

  /** ---------------------------- LOGIN (GET) ---------------------------- **
   * login(email, password, selectedUserType, isDemoMode, schoolId)
   * ORDS endpoint: staff/login/staff/ expects :email, :password, :p_school_id
   */
  const login = async (email, password, selectedUserType = null, isDemoMode = false, schoolId) => {
    setIsLoading(true);
    try {
      if (schoolId === undefined || schoolId === null || schoolId === '') {
        setIsLoading(false);
        return { success: false, error: 'Please select your school before logging in.', type: 'validation' };
      }

      const url = buildApiUrl('staff/login/staff/', {
        email: String(email || ''),
        password: String(password || ''),
        p_school_id: String(schoolId),
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' }, // avoid Content-Type on GET => no preflight
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

        // Only allow supported roles
        if (!apiRole) {
          setIsLoading(false);
          return { success: false, error: 'This login type is not supported in this system.', type: 'role_unsupported' };
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

        // Prefer schoolId from API if present; otherwise use the chosen one
        const resolvedSchoolId =
          data.user.schoolId ?? data.user.school_id ?? (Number.isNaN(Number(schoolId)) ? schoolId : Number(schoolId));

        // Pick plan/currency/school if API provides
        const schoolObj = data.school || {};
        const planFromApi = Number(schoolObj.package ?? data.user.package ?? data.user.plan ?? NaN);
        const currencyFromApi = schoolObj.currency || data.user.currency || 'GHS';

        const userData = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName,
          name: data.user.fullName,
          userType: finalRole,
          apiRole,
          originalRole: data.user.role,
          schoolId: resolvedSchoolId,

          plan: planFromApi,
          package: planFromApi,
          currency: currencyFromApi,
          school: Object.keys(schoolObj).length
            ? {
                id: schoolObj.id,
                name: schoolObj.name,
                address: schoolObj.address,
                phone: schoolObj.phone,
                email: schoolObj.email,
                status: schoolObj.status,
                expiry: schoolObj.expiry,
                createdAt: schoolObj.createdAt,
                package: schoolObj.package,
                currency: schoolObj.currency,
              }
            : undefined,

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
        return { success: false, error: data?.message || 'Invalid credentials', type: 'auth_failed' };
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

  /** ----------------------------- API CALL ------------------------------ **
   * apiCall(endpoint, { method, headers, body, params, skipAuth })
   * - Builds URL safely
   * - Omits Content-Type on GET/HEAD (reduces CORS preflights)
   * - Adds Authorization only when token present & skipAuth=false
   */
  const apiCall = async (endpoint, options = {}) => {
    const { skipAuth = false, params, ...rest } = options || {};
    const url = buildApiUrl(endpoint, params);

    const baseHeaders = { Accept: 'application/json' };
    const finalHeaders = { ...baseHeaders, ...(rest.headers || {}) };

    if (!skipAuth && token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }

    const hasBody = rest.body !== undefined && rest.body !== null;
    const method = (rest.method || 'GET').toUpperCase();

    if (hasBody && method !== 'GET' && method !== 'HEAD') {
      finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
    } else {
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
        return { success: false, error: mapped || json?.message || `Request failed (HTTP ${response.status})` };
      }

      return json ?? { success: true };
    } catch (error) {
      return handleApiError(error, 'API call');
    }
  };

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated,
        isLoading,
        apiCall,
        API_BASE,
        buildApiUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/** ---------------------------- Permissions / Avatars ----------------------- */
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
