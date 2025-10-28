import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

/* ========= API base (env-driven) =========
 * Local dev (CRA proxy):   REACT_APP_API_BASE=/api/ords/schools/
 * Vercel / prod:           REACT_APP_API_BASE=https://<your-host>/ords/schools/
 */
const RAW_ENV_BASE = process.env.REACT_APP_API_BASE || '/api/ords/schools/';
// normalize to exactly one trailing slash
const API_BASE = RAW_ENV_BASE.replace(/\/+$/, '') + '/';

/** Join base + path without double slashes */
const joinPath = (base, path = '') => {
  const b = String(base || '');
  const p = String(path || '');
  if (!b) return p;
  if (!p) return b;
  return b.replace(/\/+$/, '') + '/' + p.replace(/^\/+/, '');
};

/** Build URL that supports both absolute and relative API_BASE */
const buildApiUrl = (path = '', params = {}) => {
  const cleanPath = String(path || '').replace(/^\/+/, '');
  const base = API_BASE;

  // Absolute base -> use URL()
  if (/^https?:\/\//i.test(base)) {
    const url = new URL(joinPath(base, cleanPath));
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
    return url.toString();
  }

  // Relative base -> manual query building (keeps /api/... intact)
  const urlStr = joinPath(base, cleanPath);
  const usp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
  });
  const qs = usp.toString();
  return qs ? `${urlStr}?${qs}` : urlStr;
};

/* ===== Friendlier Oracle/ORDS error mapping ===== */
const mapOracleError = (text = '') => {
  const t = String(text);
  if (/ORDS-25001/i.test(t)) return 'Server error in REST handler (ORDS-25001). Check required parameters / SQL/PLSQL.';
  if (/ORA-00001/i.test(t)) return 'Unique constraint: the value already exists.';
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

/** Synchronous hydration to avoid redirect flicker */
const initUserFromStorage = () => {
  try {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    return t && u ? JSON.parse(u) : null;
  } catch { return null; }
};
const initTokenFromStorage = () => {
  try { return localStorage.getItem('token') || null; }
  catch { return null; }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(initUserFromStorage);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState(initTokenFromStorage);

  const mapRole = (apiRole) => ({
    TE: 'teacher',
    AD: 'admin',
    AC: 'accountant',
    HT: 'headteacher',
    SO: 'owner',
  }[apiRole] || null);

  const save = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const del  = (k) => { try { localStorage.removeItem(k); } catch {} };

  // useEffect(() => {
  //   // If token exists but user state didn't hydrate yet, restore it
  //   if (!user && token) {
  //     try {
  //       const savedUser = read('user');
  //       if (savedUser) setUser(JSON.parse(savedUser));
  //     } catch {
  //       del('user'); del('token');
  //     }
  //   }
  // }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user && token) {
      try {
        const savedUser = read('user');

        // ✅ Check if saved user exists and is valid
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);

          // ✅ Optional: basic sanity checks (you can add more if needed)
          if (typeof parsedUser === 'object' && parsedUser.userType) {
            setUser(parsedUser);
          } else {
            // Invalid structure — clear data
            del('user');
            del('token');
            setUser(null);
            setToken(null);
          }
        } else {
          // No user found but token exists — clear both
          del('user');
          del('token');
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        // If anything goes wrong parsing JSON or token is malformed
        console.error('Invalid user data in storage, clearing session:', err);
        del('user');
        del('token');
        setUser(null);
        setToken(null);
      }
    }
  }, [token]);


  const handleApiError = (error, operation = 'API call') => {
    const msg = String(error?.message || '');
    if (msg.includes('NetworkError') || msg.includes('fetch')) {
      return {
        success: false,
        error: 'Connection blocked or failed (possibly CORS). Check your proxy/env setup.',
        type: 'cors_or_network',
      };
    }
    const mapped = mapOracleError(msg);
    if (mapped) return { success: false, error: mapped, type: 'db' };
    return { success: false, error: msg || 'An unexpected error occurred.', type: 'unknown' };
  };

  // ===== Login via GET (no Content-Type => avoids preflight) =====
  // schoolId is OPTIONAL; backend may return school info regardless.
  const login = async (email, password, selectedUserType = null, isDemoMode = false, schoolId) => {
    setIsLoading(true);
    try {
      const params = {
        email: String(email || ''),
        password: String(password || ''),
      };
      if (schoolId !== undefined && schoolId !== null && String(schoolId) !== '') {
        params.p_school_id = String(schoolId);
      }

      const url = buildApiUrl('staff/login/staff/', params);

      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' }, // no Content-Type on GET
      });

      const { json, raw } = await parseMaybeJson(response);
      const data = json ?? {};

      if (!response.ok) {
        const mapped = mapOracleError(JSON.stringify(data) || raw);
        setIsLoading(false);
        return { success: false, error: mapped || data?.message || `Login failed (HTTP ${response.status})`, type: 'auth_failed' };
      }

      if (data.success && data.user) {
        const apiRole = mapRole(data.user.role);
        if (!apiRole) {
          setIsLoading(false);
          return { success: false, error: 'This login type is not supported in this system.', type: 'role_unsupported' };
        }

        if (selectedUserType && selectedUserType !== apiRole && !isDemoMode) {
          setIsLoading(false);
          return { success: false, error: `Invalid login! Your account is registered as ${apiRole}, but you selected ${selectedUserType}.`, type: 'role_mismatch' };
        }

        const finalRole = selectedUserType || apiRole;

        // Prefer school id from API; fallback to provided schoolId only if API doesn’t include it
        const resolvedSchoolId =
          data?.user?.schoolId ??
          data?.user?.school_id ??
          data?.school?.id ??
          (schoolId !== undefined && schoolId !== null
            ? (Number.isNaN(Number(schoolId)) ? schoolId : Number(schoolId))
            : null);

        const schoolObj = data.school || {};
        const planFromApi = Number(
          schoolObj.package ?? data.user.package ?? data.user.plan ?? NaN
        );
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
          school: Object.keys(schoolObj).length ? {
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
          } : undefined,
          avatar: getAvatar(finalRole),
          isRoleMismatch: !!selectedUserType && selectedUserType !== apiRole,
          isDemoMode,
          permissions: getUserPermissions(data.user.role),
        };

        setUser(userData);
        setToken(data.token);
        save('user', JSON.stringify(userData));
        save('token', data.token);

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
    del('user');
    del('token');
  };

  /**
   * apiCall(endpoint, { method, headers, body, params, skipAuth })
   * - Works for both absolute and relative API_BASE
   * - Avoids Content-Type on GET/HEAD (reduces CORS preflights)
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

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated,
    isLoading,
    apiCall,
    API_BASE,
    buildApiUrl,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/* ===== Permissions / Avatars ===== */
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
