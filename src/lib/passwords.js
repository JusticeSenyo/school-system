// src/lib/passwords.js

// Base endpoint:
//   https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/security/temp/pass/
const SEC_TEMP_PWD_BASE =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/security/temp/pass/';

// Safe joiner (prevents // and builds query)
const join = (base, path = '', params = {}) => {
  const root = String(base || '').replace(/\/+$/, '') + '/';
  const p = String(path || '').replace(/^\/+/, '');
  const u = new URL(p, root);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  });
  return u.toString();
};

// Robust extractor: handles plain JSON, JSON preceded by stray header lines,
// or plain-text passwords.
function extractPassword(raw) {
  if (!raw) return null;
  // 1) If there is JSON in the string, parse the substring from the first "{"
  const jsonStart = raw.indexOf('{');
  if (jsonStart !== -1) {
    const jsonChunk = raw.slice(jsonStart).trim();
    try {
      const data = JSON.parse(jsonChunk);
      if (data?.tempPassword) return String(data.tempPassword);
      if (data?.password)     return String(data.password);
      if (data?.pwd)          return String(data.pwd);
    } catch {
      // fall through
    }
    // If JSON parsing failed, try regex for common keys
    const m1 = jsonChunk.match(/"tempPassword"\s*:\s*"([^"]+)"/i)
           || jsonChunk.match(/"password"\s*:\s*"([^"]+)"/i)
           || jsonChunk.match(/"pwd"\s*:\s*"([^"]+)"/i);
    if (m1) return m1[1];
  }

  // 2) No JSON? Some servers return only the password as plain text.
  // Trim quotes/whitespace
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, '');
  // If the line contains header-ish text, try to take the last quoted token
  const quoted = raw.match(/["']([^"']{4,256})["']\s*$/);
  if (quoted) return quoted[1];

  // As a last resort, if trimmed has no spaces and looks reasonable, accept it
  if (/^\S{4,256}$/.test(trimmed)) return trimmed;

  return null;
}

export async function getTempPassword(len = 12) {
  const url = join(SEC_TEMP_PWD_BASE, '', { p_len: len });
  const res = await fetch(url, {
    // Only Accept on GET — avoids CORS preflight
    headers: { Accept: 'application/json' },
  });

  const raw = await res.text();
  const pwd = extractPassword(raw);

  if (pwd) return pwd;

  // If we get here, the response was badly formatted
  throw new Error(`Temp password API returned an unexpected format (HTTP ${res.status}).`);
}
