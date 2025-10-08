import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

/**
 * === API BASE (CORS-safe) ==========================================
 * Point your frontend at a RELATIVE base. In production, add a rewrite:
 *   - Vercel rewrite:   /ords/(.*)  ->  https://...oracle.../ords/schools/$1
 * or use an API route at /api/ords and set VITE_API_BASE=/api/ords
 *
 * Env priority:
 * - import.meta.env.VITE_API_BASE
 * - process.env.REACT_APP_API_BASE
 * - fallback: "/ords"
 */
const API_BASE_ENV =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE ||
  "/ords";

/** Always exactly one trailing slash */
export const API_BASE = API_BASE_ENV.replace(/\/+$/, "") + "/";

/** Joiner that avoids double slashes and appends query params */
export const buildApiUrl = (path = "", params = {}) => {
  const clean = String(path).replace(/^\/+/, "");
  const url = new URL(clean, API_BASE);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  return url.toString();
};

/** Map common Oracle/ORDS errors to human text */
const mapOracleError = (text = "") => {
  const t = String(text);
  if (/ORDS-25001/i.test(t)) return "Server error in REST handler (ORDS-25001). Check parameters.";
  if (/ORA-00001/i.test(t)) return "Unique constraint: that value already exists.";
  if (/ORA-01400/i.test(t)) return "A required value was missing.";
  if (/ORA-12899/i.test(t)) return "Value too long for a column.";
  if (/ORA-06502|numeric or value error/i.test(t)) return "Numeric or value error (type/length).";
  if (/ORA-00904|invalid identifier/i.test(t)) return "Invalid column/identifier (backend mismatch).";
  if (/ORA-00907|ORA-00933|ORA-00936/i.test(t)) return "SQL syntax error in backend.";
  if (/ORA-01036|illegal variable name|number/i.test(t)) return "Bind variable mismatch in backend.";
  return null;
};

const parseMaybeJson = async (res) => {
  const raw = await res.text().catch(() => "");
  try {
    return { json: raw ? JSON.parse(raw) : null, raw };
  } catch {
    return { json: null, raw };
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("token") || null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  // role mapping from API short codes
  const mapRole = (apiRole) => {
    const roleMap = { TE: "teacher", AD: "admin", AC: "accountant", HT: "headteacher", SO: "owner" };
    return roleMap[apiRole] || null; // null => unsupported (e.g., student)
  };

  const save = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  };
  const read = (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const remove = (k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  };

  // Rehydrate on refresh
  useEffect(() => {
    const savedUser = read("user");
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        remove("user");
        remove("token");
      }
    }
  }, [token]);

  /** Normalize network/CORS errors to a friendly shape */
  const handleApiError = (error, op = "API call") => {
    // eslint-disable-next-line no-console
    console.error(`${op} error:`, error);
    const msg = String(error?.message || "");

    if (/Failed to fetch|NetworkError|TypeError/i.test(msg)) {
      const e = new Error(
        "Connection blocked or failed (likely CORS/network). Please try again or contact support."
      );
      e._cors = true;
      return { success: false, error: e.message, type: "cors_or_network" };
    }

    const mapped = mapOracleError(msg);
    if (mapped) return { success: false, error: mapped, type: "db" };

    return { success: false, error: msg || "Unexpected error.", type: "unknown" };
  };

  /**
   * apiCall(endpoint, { method, headers, body, params, skipAuth })
   * - Uses relative base (rewritten by your hosting)
   * - Avoids JSON Content-Type on GET/HEAD (reduces preflights)
   * - Skips Content-Type for FormData automatically
   */
  const apiCall = async (endpoint, options = {}) => {
    const { params, skipAuth = false, method = "GET", headers = {}, body } = options || {};
    const url = buildApiUrl(endpoint, params);

    // Build headers
    const finalHeaders = { Accept: "application/json", ...headers };
    const upper = (method || "GET").toUpperCase();

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const hasBody = body !== undefined && body !== null;

    // Only set JSON content-type when sending plain objects/JSON (not FormData)
    if (hasBody && !isFormData && upper !== "GET" && upper !== "HEAD") {
      finalHeaders["Content-Type"] = finalHeaders["Content-Type"] || "application/json";
    } else {
      if (finalHeaders["Content-Type"] === "application/json") delete finalHeaders["Content-Type"];
    }

    if (!skipAuth && token) finalHeaders.Authorization = `Bearer ${token}`;

    try {
      const res = await fetch(url, {
        method: upper,
        headers: finalHeaders,
        body:
          hasBody && !isFormData && upper !== "GET" && upper !== "HEAD"
            ? typeof body === "string"
              ? body
              : JSON.stringify(body)
            : isFormData
            ? body
            : undefined,
      });

      if (res.status === 401) {
        logout();
        return { success: false, error: "Session expired. Please login again." };
      }

      const { json, raw } = await parseMaybeJson(res);

      if (!res.ok) {
        const mapped = mapOracleError(JSON.stringify(json) || raw);
        return { success: false, error: mapped || json?.message || `HTTP ${res.status}` };
      }

      // normalize success for empty bodies
      return json ?? { success: true };
    } catch (err) {
      return handleApiError(err, "API call");
    }
  };

  /**
   * Login (ORDS GET with query params – avoids preflight)
   * Endpoint expected: staff/login/staff/?email&password&p_school_id
   */
  const login = async (email, password, selectedUserType, isDemoMode, schoolId) => {
    setIsLoading(true);

    try {
      if (schoolId === undefined || schoolId === null || schoolId === "") {
        setIsLoading(false);
        return { success: false, error: "Please select your school before logging in.", type: "validation" };
      }

      const url = buildApiUrl("staff/login/staff/", {
        email: String(email || ""),
        password: String(password || ""),
        p_school_id: String(schoolId),
      });

      const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
      const { json, raw } = await parseMaybeJson(res);
      const data = json ?? {};

      if (!res.ok) {
        const mapped = mapOracleError(JSON.stringify(data) || raw);
        setIsLoading(false);
        return { success: false, error: mapped || data?.message || `Login failed (HTTP ${res.status})` };
      }

      if (!data?.success || !data?.user) {
        setIsLoading(false);
        return { success: false, error: data?.message || "Invalid credentials" };
      }

      const apiRole = mapRole(data.user.role);
      if (!apiRole) {
        setIsLoading(false);
        return { success: false, error: "This login type is not supported in this system." };
      }
      if (selectedUserType && selectedUserType !== apiRole && !isDemoMode) {
        setIsLoading(false);
        return {
          success: false,
          error: `Invalid login! Your account is ${apiRole}, but you selected ${selectedUserType}.`,
        };
      }

      const finalRole = selectedUserType || apiRole;
      const schoolObj = data.school || {};
      const plan = Number(schoolObj.package ?? data.user.package ?? data.user.plan ?? NaN);
      const currency = schoolObj.currency || data.user.currency || "GHS";
      const resolvedSchoolId =
        data.user.schoolId ?? data.user.school_id ?? (Number.isNaN(Number(schoolId)) ? schoolId : Number(schoolId));

      const userData = {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        name: data.user.fullName,
        userType: finalRole,
        apiRole,
        originalRole: data.user.role,
        schoolId: resolvedSchoolId,
        plan,
        package: plan,
        currency,
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
      save("user", JSON.stringify(userData));
      save("token", data.token);
      setIsLoading(false);
      return { success: true, user: userData };
    } catch (err) {
      setIsLoading(false);
      return handleApiError(err, "Login");
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    remove("user");
    remove("token");
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    apiCall,
    API_BASE,
    buildApiUrl,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ---- Permissions / Avatars -----------------------------------------
const getUserPermissions = (apiRole) => {
  const perms = {
    AD: ["manage_users", "view_reports", "system_settings", "manage_courses", "view_all_data"],
    TE: ["manage_classes", "grade_students", "view_student_data", "manage_assignments"],
    AC: ["manage_fees", "view_fees", "view_bills"],
    HT: ["manage_teachers", "monitor_students", "review_exams"],
    SO: ["manage_school", "access_all", "review_finances"],
  };
  return perms[apiRole] || [];
};

const getAvatar = (userType) => {
  const avatars = { teacher: "👨‍🏫", admin: "👨‍💼", accountant: "💰", headteacher: "👩‍🏫", owner: "🏫" };
  return avatars[userType] || "👤";
};
