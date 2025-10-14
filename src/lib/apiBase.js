// src/lib/apiBase.js

// Prefer env var; default to CRA proxy path that we rewrite in dev (setupProxy)
// and in production (vercel.json). Do NOT put the Oracle domain here.
const RAW = process.env.REACT_APP_API_BASE || "/api/ords";

// normalize to exactly one trailing slash
export const API_BASE = RAW.replace(/\/+$/, "") + "/";

// Joiner to safely build URLs like buildApiUrl("schools/academic/get/school/", {q: "x"})
export const buildApiUrl = (path = "", params = {}) => {
  const clean = String(path).replace(/^\/+/, "");
  const url = new URL(clean, API_BASE);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  });
  return url.toString();
};
