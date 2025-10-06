// src/pages/ManageStaffPage.js
import React, { useEffect, useMemo, useState, useRef } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import {
  PlusCircle, X, Mail, UserCircle2,
  Loader2, CheckCircle2, AlertCircle, RotateCcw, Pencil,
  Download, Search, KeyRound, Eye, Image as ImageIcon, Printer,
  Upload, Info, Filter, Trash2
} from 'lucide-react';
import { getTempPassword } from '../lib/passwords';
import * as XLSX from 'xlsx';
import { useAuth } from '../AuthContext';
import { buildStaffKey, buildPublicUrl, putToOCI } from '../config/storage';

/* ================== Constants kept from first page ================== */
const ROLE_LABELS = { AD: 'Admin', HT: 'Head Teacher', TE: 'Teacher', AC: 'Accountant', SO: 'Owner' };
const ROLE_OPTIONS = [
  { value: 'AD', label: 'Admin' },
  { value: 'HT', label: 'Head Teacher' },
  { value: 'TE', label: 'Teacher' },
  { value: 'AC', label: 'Accountant' },
  { value: 'SO', label: 'Owner' },
];

const EMAIL_API_BASE = 'https://schoolmasterhub.vercel.app';

// Relative API path (joined with API_BASE by safe builder)
const RESET_PWD_PATH = 'staff/reset_password/';

// Try both variants for next-id (whichever is wired in ORDS)
const NEXT_STAFF_ID_PATHS = [
  'staff/id/next',
  'school/staff/staff_api/staff/id/next',
];

// Absolute endpoints (first page style)
const ADD_STAFF_ENDPOINT =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/staff/add/staff/';
const UPDATE_STAFF_ENDPOINT =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/staff/update/staff/';
const DELETE_STAFF_ENDPOINT =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/staff/delete/staff/';

/* ================== Plans / limits (from second page) ================== */
const PLAN_LIMITS = { BASIC: 10, STANDARD: 100, PREMIUM: Infinity };
const PLAN_NAME_BY_CODE = (raw) => {
  const v = String(raw ?? '').trim().toUpperCase();
  if (v === '1' || v === 'BASIC') return 'BASIC';
  if (v === '2' || v === 'STANDARD') return 'STANDARD';
  if (v === '3' || v === 'PREMIUM' || v === 'PREMUIM') return 'PREMIUM';
  return 'BASIC';
};
const HUMAN_PLAN = (code) => ({ BASIC: 'Basic', STANDARD: 'Standard', PREMIUM: 'Premium' }[code] || 'Basic');

/* ================== Safe URL builder (first page) ================== */
const useApiJoin = (API_BASE) => {
  const API_ROOT = (API_BASE || '').replace(/\/+$/, '') + '/';
  const toUrl = (path = '', params = {}) => {
    const rawPath = String(path);
    const isAbsolute = /^https?:\/\//i.test(rawPath);
    const base = isAbsolute ? undefined : API_ROOT;
    const normalized = isAbsolute ? rawPath : rawPath.replace(/^\/+/, '');
    const u = new URL(normalized, base);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
    });
    return u.toString();
  };
  return { toUrl };
};

/* ================== Helpers (shared) ================== */
const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || 'ST';

function mapOracleError(errText = '') {
  const t = String(errText);
  if (/ORA-00001/i.test(t)) return 'Email already exists (unique constraint).';
  if (/ORA-01400/i.test(t)) return 'A required column was empty. Check all required fields.';
  if (/ORA-06502|numeric or value error|ORA-12899/i.test(t)) return 'Value too long or wrong data type (check field lengths).';
  if (/ORA-01036|illegal variable name|number/i.test(t)) return 'Backend bind variables mismatch (check parameter names).';
  if (/ORA-00904|invalid identifier/i.test(t)) return 'Backend column/parameter name mismatch.';
  if (/ORA-00907|ORA-00933|ORA-00936/i.test(t)) return 'Backend SQL syntax error.';
  return null;
}

/* Fetch JSON (array-like) for school info (plan/expiry) */
const jarr = async (url, headers = {}) => {
  const r = await fetch(url, { headers: { Accept: 'application/json', ...headers }, cache: 'no-store' });
  const t = (await r.text()).trim();
  if (!t) return [];
  try {
    const d = JSON.parse(t);
    return Array.isArray(d) ? d : Array.isArray(d.items) ? d.items : Array.isArray(d.rows) ? d.rows : [];
  } catch { return []; }
};

/* Parse response text into JSON or raw */
const jparse = async (r) => {
  const t = (await r.text()).trim();
  if (!t) return {};
  try { return JSON.parse(t); } catch { return { _raw: t }; }
};

/* Build GET url from base + params (used for plan fetch only if needed) */
const buildGet = (base, params) => {
  const qp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qp.set(k, String(v));
  });
  return `${base}?${qp.toString()}`;
};

/* ================== Next staff ID (first page, using toUrl) ================== */
async function fetchNextStaffId(toUrl, { token, schoolId } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const candidates = NEXT_STAFF_ID_PATHS.map(p =>
    toUrl(p, schoolId ? { p_school_id: String(schoolId) } : undefined)
  );

  let lastErr = null;

  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers });
      const raw = await res.text();
      const body = raw.replace(/^content[- ]type\s*:\s*application\/json[^\n]*\n?/i, '').trim();

      const jsonSlice = body.match(/\{[\s\S]*\}/);
      if (jsonSlice) {
        try {
          const j = JSON.parse(jsonSlice[0]);
          const id =
            j?.next_id ?? j?.NEXT_ID ??
            j?.user_id ?? j?.USER_ID ??
            j?.id ?? j?.ID ?? null;
          if (id != null && String(id).match(/^\d+$/)) return Number(id);
        } catch { /* ignore and continue */ }
      }

      const m = body.match(/\d{1,18}/);
      if (m) return Number(m[0]);

      lastErr = new Error(`Unexpected response ${res.status} from ${url}: ${body.slice(0, 200)}`);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr ?? new Error('Could not fetch next staff ID');
}

/* ================== Avatar ================== */
const Avatar = ({ urls = [], name, size = 80, rounded = 'rounded-full' }) => {
  const [idx, setIdx] = useState(0);
  const src = urls && urls.length > idx ? urls[idx] : null;

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'photo'}
        className={`${rounded} object-cover`}
        style={{ width: size, height: size }}
        onError={() => setIdx(idx + 1)}
      />
    );
  }
  return (
    <div
      className={`${rounded} bg-indigo-100 text-indigo-700 flex items-center justify-center`}
      style={{ width: size, height: size, fontSize: Math.max(10, size / 2.6) }}
      aria-label="avatar"
      title={name || 'Staff'}
    >
      {initials(name)}
    </div>
  );
};

/* ================== Page ================== */
export default function ManageStaffPage() {
  const { token, user, API_BASE } = useAuth();
  const { toUrl } = useApiJoin(API_BASE);

  const schoolId =
    user?.school_id ?? user?.schoolId ?? user?.school?.id ?? user?.schoolID ?? user?.SCHOOL_ID ?? null;
  const userId = user?.user_id ?? user?.id ?? user?.USER_ID ?? null;

  const SCHOOL_NAME =
    user?.school?.name ??
    user?.school_name ??
    user?.SCHOOL_NAME ??
    user?.orgName ??
    user?.organisation ??
    '';

  /* ---------- Plan & expiry (added from second page, using toUrl) ---------- */
  const [planCode, setPlanCode] = useState('BASIC'); // BASIC|STANDARD|PREMIUM
  const [planHuman, setPlanHuman] = useState('Basic');
  const [expiryISO, setExpiryISO] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const schoolInfoUrl = toUrl('academic/get/school/');
        const rows = await jarr(schoolInfoUrl, token ? { Authorization: `Bearer ${token}` } : {});
        const rec = (rows || []).find(r => String(r.school_id ?? r.SCHOOL_ID) === String(schoolId));

        const pkgRaw = rec?.package ?? rec?.PACKAGE ?? user?.package ?? user?.PACKAGE ?? user?.plan;
        const code = PLAN_NAME_BY_CODE(pkgRaw);
        const exp = rec?.expiry ?? rec?.EXPIRY ?? user?.expiry ?? user?.EXPIRY ?? null;
        if (!mounted) return;
        setPlanCode(code);
        setPlanHuman(HUMAN_PLAN(code));
        setExpiryISO(exp ? String(exp) : null);
      } catch {
        const fallback = PLAN_NAME_BY_CODE(user?.package ?? user?.plan);
        setPlanCode(fallback);
        setPlanHuman(HUMAN_PLAN(fallback));
        setExpiryISO(user?.expiry ?? null);
      }
    })();
    return () => { mounted = false; };
  }, [schoolId, user, token, toUrl]);

  const planMax = PLAN_LIMITS[planCode] ?? 10;
  const planExpired = useMemo(() => {
    if (!expiryISO) return false;
    const d = new Date(expiryISO);
    return isFinite(d.getTime()) && d.getTime() < Date.now();
  }, [expiryISO]);

  /* ---------- Staff list (kept from first page) ---------- */
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStaff = async () => {
    setLoading(true);
    setLoadError('');

    if (!schoolId) {
      setLoading(false);
      setLoadError('Missing school ID on logged-in user.');
      return;
    }

    try {
      const url = toUrl('staff/get/staff/', { p_school_id: String(schoolId) });
      const res = await fetch(url, { headers: { Accept: 'application/json' } });

      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { }

      if (!res.ok) throw new Error(data?.message || data?.error || `Failed: ${res.status}`);

      const rows = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.rows) ? data.rows : []));

      const mapped = (rows || []).map((r, i) => {
        const id = r.USER_ID ?? r.user_id ?? r.id ?? i;
        const created = r.CREATED_AT ?? r.created_at ?? '';
        const imageUrl = r.IMAGE_URL ?? r.image_url ?? '';

        const urlChain = [];
        if (imageUrl) {
          try {
            const u = new URL(imageUrl, window.location.origin);
            u.searchParams.set('_', String(created || Date.now())); // cache-bust
            urlChain.push(u.toString());
          } catch {
            urlChain.push(imageUrl);
          }
        }

        return {
          id,
          name: r.FULL_NAME ?? r.full_name ?? r.name ?? '',
          role: r.ROLE ?? r.role ?? 'TE',
          email: r.EMAIL ?? r.email ?? '',
          status: r.STATUS ?? r.status ?? 'ACTIVE',
          created_at: created,
          photo_urls: urlChain,
          image_url: imageUrl,
        };
      });

      setStaffList(mapped);
    } catch (e) {
      setLoadError(e.message || 'Unable to load staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); /* eslint-disable-next-line */ }, [schoolId, token]);

  const staffCount = staffList.length;
  const remaining = useMemo(() => (isFinite(planMax) ? Math.max(0, planMax - staffCount) : Infinity), [planMax, staffCount]);

  /* ---------- UI state ---------- */
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [infoStaff, setInfoStaff] = useState(null);

  const [isOpen, setIsOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({ full_name: '', email: '', role: 'TE', status: 'ACTIVE', password: '', image_url: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [regenLoading, setRegenLoading] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState('');

  // image
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const fileInputRef = useRef(null);

  // reset password in table
  const [resettingId, setResettingId] = useState(null);

  // delete
  const [deletingId, setDeletingId] = useState(null);

  // BULK IMPORT (added)
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy] = useState(false);
  const [bulkErr, setBulkErr] = useState('');
  const [bulkOk, setBulkOk] = useState('');
  const [bulkFileName, setBulkFileName] = useState('');
  const [previewRows, setPreviewRows] = useState([]);
  const [importing, setImporting] = useState(false);

  /* ---------- Filtering ---------- */
  const filtered = useMemo(() => {
    let list = staffList;
    if (filter) {
      list = list.filter(s => (ROLE_LABELS[s.role] || s.role).toLowerCase() === filter.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [staffList, filter, searchQuery]);

  /* ---------- Utilities kept from first page ---------- */
  const generateTempPassword = () => getTempPassword(12);

  const sendWelcomeEmail = async ({ full_name, email, roleLabel, tempPassword, schoolName, replyTo, bcc, subject }) => {
    try {
      const endpoint = `${EMAIL_API_BASE}/api/send-postmark`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name,
          email,
          role: roleLabel,
          tempPassword,
          schoolName,
          replyTo,
          bcc,
          subject,
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok || result?.error) {
        return { ok: false, error: result?.error || `HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || 'Network error' };
    }
  };

  const resetForm = () => {
    setForm({ full_name: '', email: '', role: 'TE', status: 'ACTIVE', password: '', image_url: '' });
    setPhotoFile(null);
    setPhotoPreview('');
    setFormError(''); setFormSuccess('');
    setEditingId(null); setDialogMode('add');
    setPendingUserId(null);
  };

  const validateForm = () => {
    if (!form.full_name.trim()) return 'Full name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Valid email is required';
    if (!ROLE_OPTIONS.find(r => r.value === form.role)) return 'Select a valid role';
    return '';
  };

  /* ---------- Update (kept from first page; robust) ---------- */
  const updateStaffRobust = async (payload) => {
    const mustParams = {
      p_user_id: String(payload.userId),
      p_school_id: String(payload.schoolId),
      p_full_name: payload.fullName.trim(),
      p_image_url: payload.imageUrl || '',
      p_email: payload.email.trim().toLowerCase(),
      p_role: payload.role,
      p_status: payload.status || 'ACTIVE',
    };

    const encodeForm = (obj) =>
      Object.entries(obj)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');

    // 1) POST form-urlencoded
    try {
      const r = await fetch(UPDATE_STAFF_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeForm(mustParams),
      });
      const t = await r.text();
      let j = null; try { j = JSON.parse(t); } catch { }
      if (r.ok && (j == null || j?.success !== false)) return true;
    } catch { }

    // 2) GET with query params
    try {
      const getUrl = toUrl(UPDATE_STAFF_ENDPOINT, mustParams);
      const r = await fetch(getUrl, { method: 'GET' });
      const t = await r.text();
      let j = null; try { j = JSON.parse(t); } catch { }
      if (r.ok && (j == null || j?.success !== false)) return true;
    } catch { }

    // 3) POST JSON fallback
    const r = await fetch(UPDATE_STAFF_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mustParams),
    });
    const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch { }
    if (r.ok && (j == null || j?.success !== false)) return true;
    throw new Error((j?.error || t || `HTTP ${r.status}`).slice(0, 800));
  };

  /* ---------- Open dialogs ---------- */
  const openAdd = async () => {
    if (planExpired) { setFormError('Plan expired. Please renew.'); return; }
    if (isFinite(planMax) && remaining <= 0) { setFormError(`You have reached the ${planHuman} plan staff limit.`); return; }

    resetForm();
    setDialogMode('add');
    setIsOpen(true);
    try {
      const pwd = await generateTempPassword();
      const nextId = await fetchNextStaffId(toUrl, { token, schoolId });
      if (!nextId) throw new Error('Could not fetch next staff ID');
      setPendingUserId(nextId);
      setForm(f => ({ ...f, password: pwd }));
    } catch (e) {
      setFormError(e.message || 'Could not prepare new staff form');
    }
  };

  const openEdit = (row) => {
    setDialogMode('edit');
    setEditingId(row.id);
    setForm({
      full_name: row.name,
      email: row.email,
      role: row.role,
      status: row.status || 'ACTIVE',
      password: '',
      image_url: row.image_url || ''
    });
    setPhotoFile(null);
    setPhotoPreview('');
    setFormError(''); setFormSuccess(''); setIsOpen(true);
  };

  const onPickImage = (e) => {
    const f = e.target.files?.[0] || null;
    setPhotoFile(f);
    setPhotoPreview(f ? URL.createObjectURL(f) : '');
  };

  /* ---------- ADD (GET with headers; keep first page’s absolute endpoint) ---------- */
  const submitAddStaff = async () => {
    setFormError(''); setFormSuccess('');
    const err = validateForm();
    if (err) { setFormError(err); return; }
    if (!userId) { setFormError('Missing current user ID. Please re-login.'); return; }
    if (!pendingUserId) { setFormError('Unable to allocate a new Staff ID. Please try again.'); return; }
    if (!form.password?.trim()) { setFormError('Temporary password is empty. Click "Regenerate" and try again.'); return; }
    if (planExpired) { setFormError('Plan expired. Please renew.'); return; }
    if (isFinite(planMax) && remaining <= 0) { setFormError(`You have reached the ${planHuman} plan staff limit.`); return; }

    setSubmitting(true);
    try {
      const newUserId = pendingUserId;

      // upload to OCI first if file provided, to get the final public URL
      let finalImageUrl = form.image_url || '';
      if (photoFile && schoolId) {
        const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
        const key = buildStaffKey(schoolId, newUserId, ext);
        await putToOCI(photoFile, key);
        finalImageUrl = buildPublicUrl(key);
      }

      // Use the absolute add endpoint; toUrl passes through absolute
      const addUrl = toUrl(ADD_STAFF_ENDPOINT, {
        p_user_id: String(newUserId),
        p_school_id: String(schoolId),
        p_creator_user_id: String(userId ?? ''),
        p_full_name: form.full_name.trim(),
        p_email: form.email.trim().toLowerCase(),
        p_role: form.role,
        p_status: form.status || 'ACTIVE',
        p_password: form.password.trim(),
        p_image_url: finalImageUrl || ''
      });

      const res = await fetch(addUrl, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' });
      let data = null; let raw = '';
      try { raw = await res.text(); data = JSON.parse(raw); } catch { }

      if (!res.ok || data?.success === false) {
        const serverMsg = (data?.error || raw || '').slice(0, 600) || `HTTP ${res.status}`;
        throw new Error(serverMsg);
      }

      // Optimistic row
      setStaffList(prev => ([
        ...prev,
        {
          id: newUserId,
          name: form.full_name.trim(),
          role: form.role,
          email: form.email.trim().toLowerCase(),
          status: form.status || 'ACTIVE',
          image_url: finalImageUrl || '',
          created_at: new Date().toISOString(),
          photo_urls: [
            ...(finalImageUrl ? [finalImageUrl] : []),
          ]
        }
      ]));

      const roleLabel = ROLE_LABELS[form.role] || form.role;
      const emailResult = await sendWelcomeEmail({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        roleLabel,
        tempPassword: form.password.trim(),
        schoolName: SCHOOL_NAME || undefined,
        replyTo: user?.email || user?.EMAIL || undefined,
        subject: `Your ${roleLabel} account for ${SCHOOL_NAME || 'SchoolMasterHub'}`,
      });

      setFormSuccess(
        emailResult.ok
          ? 'Staff added successfully. Email sent with login details.'
          : `Staff added successfully, but email failed: ${emailResult.error}`
      );

      setTimeout(async () => {
        await fetchStaff();
        setIsOpen(false);
        setPendingUserId(null);
        resetForm();
      }, 800);
    } catch (e) {
      const nice = mapOracleError(e?.message || '');
      setFormError(nice || e.message || 'Failed to add staff.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- UPDATE (keep first page flow; may overwrite image) ---------- */
  const submitUpdateStaff = async () => {
    setFormError(''); setFormSuccess('');
    const err = validateForm();
    if (err) { setFormError(err); return; }
    if (!editingId) { setFormError('Missing staff ID.'); return; }

    setSubmitting(true);
    try {
      let imageUrlToSave = form.image_url || '';

      // If a new file chosen, upload and set URL (prefer overwriting existing object)
      if (photoFile && schoolId) {
        const prevExtMatch = (form.image_url || '').match(/\.(jpg|jpeg|png|webp|gif)$/i);
        const prevExt = prevExtMatch ? prevExtMatch[1].toLowerCase() : null;
        const uploadedExt = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
        const ext = prevExt || uploadedExt; // reuse previous ext if available

        const key = buildStaffKey(schoolId, editingId, ext);
        await putToOCI(photoFile, key);      // overwrites if same key
        imageUrlToSave = buildPublicUrl(key);
      }

      await updateStaffRobust({
        userId: editingId,
        schoolId,
        fullName: form.full_name,
        email: form.email,
        role: form.role,
        status: form.status,
        imageUrl: imageUrlToSave,
      });

      setFormSuccess('Staff updated successfully.');
      setTimeout(async () => { await fetchStaff(); setIsOpen(false); resetForm(); }, 600);
    } catch (e) {
      const nice = mapOracleError(e?.message || '');
      setFormError(nice || e.message || 'Failed to update staff.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Reset password (kept) ---------- */
  const resetPasswordForUser = async (userIdParam, newPassword) => {
    const url = toUrl(RESET_PWD_PATH, {
      p_user_id: String(userIdParam),
      p_password: String(newPassword)
    });

    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      throw new Error(data?.error || `Failed to reset password (${res.status})`);
    }
    return true;
  };

  const resetAndSend = async (row) => {
    if (!row?.id || !row?.email) return;
    if (!window.confirm(`Reset password for ${row.name || row.email}?`)) return;

    setFormError(''); setFormSuccess('');
    setResettingId(row.id);
    try {
      const tempPassword = await generateTempPassword();
      await resetPasswordForUser(row.id, tempPassword);

      const roleLabel = ROLE_LABELS[row.role] || row.role;
      const emailResult = await sendWelcomeEmail({
        full_name: row.name || '',
        email: row.email,
        roleLabel,
        tempPassword,
        schoolName: SCHOOL_NAME || undefined,
        replyTo: user?.email || user?.EMAIL || undefined,
        subject: 'Your SchoolMasterHub password has been reset',
      });

      setFormSuccess(
        emailResult.ok
          ? `Reset successful. Credentials emailed to ${row.email}.`
          : `Password reset saved, but email failed: ${emailResult.error}`
      );
    } catch (e) {
      const nice = mapOracleError(e?.message || '');
      setFormError(nice || e.message || 'Failed to reset & email password.');
    } finally {
      setResettingId(null);
    }
  };

  /* ---------- Delete staff (new) ---------- */
  const deleteStaff = async (row) => {
    if (!row?.id) return;
    const label = row.name || row.email || `ID ${row.id}`;
    if (!window.confirm(`Delete staff "${label}" permanently?\n\nThis cannot be undone.`)) return;

    setDeletingId(row.id);
    try {
      // Try GET with p_staff_id first, then p_user_id, then POST form-encoded.
      const attempts = [
        { method: 'GET', url: toUrl(DELETE_STAFF_ENDPOINT, { p_staff_id: String(row.id) }) },
        { method: 'GET', url: toUrl(DELETE_STAFF_ENDPOINT, { p_user_id: String(row.id) }) },
      ];

      let ok = false, lastErr = '';
      for (const a of attempts) {
        try {
          const r = await fetch(a.url, { method: a.method, headers: { Accept: 'application/json' }, cache: 'no-store' });
          const t = await r.text();
          let j = null; try { j = JSON.parse(t); } catch {}
          if (r.ok && (j == null || j?.success !== false)) { ok = true; break; }
          lastErr = j?.error || t || `HTTP ${r.status}`;
        } catch (e) { lastErr = e?.message || String(e); }
      }

      if (!ok) {
        for (const key of ['p_staff_id', 'p_user_id']) {
          try {
            const body = new URLSearchParams({ [key]: String(row.id) }).toString();
            const r = await fetch(DELETE_STAFF_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body
            });
            const t = await r.text();
            let j = null; try { j = JSON.parse(t); } catch {}
            if (r.ok && (j == null || j?.success !== false)) { ok = true; break; }
            lastErr = j?.error || t || `HTTP ${r.status}`;
          } catch (e) { lastErr = e?.message || String(e); }
        }
      }

      if (!ok) throw new Error(mapOracleError(lastErr) || lastErr);

      // Optimistic remove, then refresh to be certain.
      setStaffList(prev => prev.filter(s => String(s.id) !== String(row.id)));
      await fetchStaff();
    } catch (e) {
      alert(`Failed to delete staff: ${e?.message || 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  /* ---------- Export Excel (kept) ---------- */
  const exportToExcel = () => {
    try {
      const rows = filtered.map((s, idx) => ({
        '#': idx + 1,
        Name: s.name,
        Role: ROLE_LABELS[s.role] || s.role,
        Email: s.email,
        Status: s.status,
        CreatedAt: s.created_at || '',
        Photo: s.image_url || ''
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Staff');
      const safeName = (SCHOOL_NAME || 'School').replace(/[\\/:*?"<>|]/g, '_');
      const ts = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `${safeName}_Staff_${ts}.xlsx`);
    } catch (e) {
      alert(e?.message || 'Failed to export Excel');
    }
  };

  /* ================== BULK IMPORT (added) ================== */
  const openBulk = () => {
    if (planExpired) { setBulkErr('Plan expired — renew to use this feature'); setBulkOpen(true); return; }
    if (isFinite(planMax) && remaining <= 0) { setBulkErr(`Reached ${planHuman} plan staff limit`); setBulkOpen(true); return; }
    setBulkErr(''); setBulkOk(''); setBulkFileName('');
    setPreviewRows([]);
    setImporting(false);
    setBulkOpen(true);
  };

  const downloadTemplate = () => {
    const rows = [
      { full_name: 'Ama Boateng', email: 'ama@school.edu', role: 'TE', status: 'ACTIVE', image_url: '' },
      { full_name: 'Kofi Mensah', email: 'kofi@school.edu', role: 'HT', status: 'ACTIVE', image_url: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(rows, { header: ['full_name', 'email', 'role', 'status', 'image_url'] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'staff_import_template.xlsx');
  };

  const handleBulkFile = async (e) => {
    setBulkErr(''); setBulkOk('');
    const f = e.target.files?.[0];
    if (!f) return;
    setBulkFileName(f.name);

    try {
      const data = await f.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      const cleaned = rows.map((r, i) => {
        const full_name = String(r.full_name || r.FULL_NAME || '').trim();
        const email = String(r.email || r.EMAIL || '').trim().toLowerCase();
        const role = String(r.role || r.ROLE || '').trim().toUpperCase();
        const status = String(r.status || r.STATUS || 'ACTIVE').trim().toUpperCase();
        const image_url = String(r.image_url || r.IMAGE_URL || '').trim();

        let valid = true;
        let message = '';

        if (!full_name) { valid = false; message = 'full_name is required'; }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { valid = false; message = 'email is invalid'; }
        else if (!['AD', 'HT', 'TE', 'AC', 'SO'].includes(role)) { valid = false; message = 'role must be AD/HT/TE/AC/SO'; }

        return { idx: i + 1, full_name, email, role, status, image_url, valid, message, toImport: valid };
      });

      const capacity = isFinite(planMax) ? Math.max(0, planMax - staffCount) : Infinity;
      if (isFinite(capacity)) {
        cleaned.forEach((row, i) => {
          if (i >= capacity) {
            row.valid = false;
            row.toImport = false;
            row.message = `exceeds remaining capacity (${capacity})`;
          }
        });
      }
      setPreviewRows(cleaned);
    } catch (err) {
      setBulkErr(err?.message || 'Failed to read file.');
    }
  };

  const doImport = async () => {
    if (!previewRows.length) return;
    setBulkErr(''); setBulkOk('');
    setImporting(true);

    const rows = previewRows.filter(r => r.toImport && r.valid);
    let okCount = 0;
    let failCount = 0;
    const updated = [...previewRows];

    for (const r of rows) {
      try {
        const newId = await fetchNextStaffId(toUrl, { token, schoolId });

        const addUrl = toUrl(ADD_STAFF_ENDPOINT, {
          p_user_id: String(newId),
          p_school_id: String(schoolId),
          p_creator_user_id: String(userId ?? ''),
          p_full_name: r.full_name,
          p_email: r.email,
          p_role: r.role,
          p_status: r.status || 'ACTIVE',
          p_password: getTempPassword(12),
          p_image_url: r.image_url || '',
        });

        const resp = await fetch(addUrl, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!resp.ok) {
          const body = await jparse(resp);
          throw new Error(body?.error || body?._raw || `HTTP ${resp.status}`);
        }

        okCount += 1;
        const idxInPrev = updated.findIndex(x => x.idx === r.idx);
        if (idxInPrev >= 0) updated[idxInPrev] = { ...updated[idxInPrev], message: 'Imported', valid: true, toImport: false };
      } catch (e) {
        failCount += 1;
        const idxInPrev = updated.findIndex(x => x.idx === r.idx);
        if (idxInPrev >= 0) {
          const nice = mapOracleError(e?.message || '') || (e?.message || 'Failed');
          updated[idxInPrev] = { ...updated[idxInPrev], message: nice, valid: false, toImport: false };
        }
      }
    }

    setPreviewRows(updated);
    setBulkOk(`Imported ${okCount} staff${failCount ? `, ${failCount} failed` : ''}.`);
    setImporting(false);
    await fetchStaff();
  };

  /* ---------- Keyboard helpers ---------- */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) setIsOpen(false);
      if (e.key === 'Enter' && !submitting) {
        if (dialogMode === 'add') submitAddStaff();
        else submitUpdateStaff();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, submitting, form, dialogMode]);

  const addDisabled = submitting || !!validateForm() || !pendingUserId || planExpired || (isFinite(planMax) && remaining <= 0);
  const editDisabled = submitting || !!validateForm();

  /* ================== Render ================== */
  return (
    <DashboardLayout title="Manage Staff" subtitle="">
      {/* Plan banner (added) */}
      <PlanBanner planHuman={planHuman} expiryISO={expiryISO} count={staffCount} max={planMax} />
      {/* Mobile-First Responsive Toolbar */}
      <div className="mb-6 space-y-4">
        {/* Top Row: Search and Add Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Bar - Full width on mobile, grows on desktop */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2 rounded-md text-sm border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Add Button - Full width on mobile */}
          <button
            onClick={openAdd}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium whitespace-nowrap"
          >
            <PlusCircle size={16} />
            <span className="sm:inline">Add New Staff</span>
          </button>
        </div>

        {/* Second Row: Filters and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left Side: Filter Controls */}
          <div className="flex flex-col xs:flex-row gap-2 xs:items-center">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="sm:hidden flex items-center gap-2 px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Filter size={16} />
              Filters
              {(filters || searchQuery) && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded">
                  {[filters, searchQuery].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Desktop Filter Controls */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 rounded-md text-sm border bg-white dark:bg-gray-900 min-w-0"
              >
                <option value="">All Roles</option>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.label}>{r.label}</option>)}
              </select>

              <button
                onClick={fetchStaff}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 whitespace-nowrap"
                title="Refresh staff list"
              >
                <RotateCcw size={16} />
                <span className="hidden lg:inline">Refresh</span>
              </button>

              <button
                onClick={openBulk}
                disabled={planExpired || (isFinite(planMax) && remaining <= 0)}
                title={
                  planExpired
                    ? 'Plan expired — renew to use this feature'
                    : (isFinite(planMax) && remaining <= 0)
                      ? `Reached ${planHuman} plan staff limit`
                      : 'Import staff from Excel'
                }
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white text-sm rounded-md hover:bg-sky-700 disabled:opacity-60"
              >
                <Upload size={16} /> Bulk Import
              </button>
            </div>

            {/* Mobile Filter Panel */}
            {showMobileFilters && (
              <div className="sm:hidden mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Role Filter</label>
                    <select
                      value={filters}
                      onChange={(e) => setFilters(e.target.value)}
                      className="w-full px-3 py-2 rounded-md text-sm border bg-white dark:bg-gray-900"
                    >
                      <option value="">All Roles</option>
                      {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.label}>{r.label}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={fetchStaff}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <RotateCcw size={16} /> Refresh Staff List
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Action Buttons */}
          <div className="flex flex-col xs:flex-row gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 whitespace-nowrap"
              title="Download Excel report"
            >
              <Download size={16} />
              <span className="xs:hidden lg:inline">Download Excel</span>
              <span className="hidden xs:inline lg:hidden">Excel</span>
            </button>
          </div>

          <button
            onClick={openBulk}
            disabled={planExpired || (isFinite(planMax) && remaining <= 0)}
            title={
              planExpired
                ? 'Plan expired — renew to use this feature'
                : (isFinite(planMax) && remaining <= 0)
                  ? `Reached ${planHuman} plan staff limit`
                  : 'Import staff from Excel'
            }
            className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white text-sm rounded-md hover:bg-sky-700 disabled:opacity-60 sm:hidden"
          >
            <Upload size={16} /> Bulk Import
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {loading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading staff…
        </div>
      )}
      {loadError && (
        <div className="mb-4 flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{loadError}</span>
        </div>
      )}

      {/* Responsive Staff Display */}
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-indigo-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-gray-100">Staff</th>
              <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-gray-100">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-gray-100">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-gray-100">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-gray-100">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((staff) => (
              <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar urls={staff.photo_urls} name={staff.name} size={40} />
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{staff.name}</div>
                      <div className="text-xs text-gray-500 truncate">{staff.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {ROLE_LABELS[staff.role] || staff.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{staff.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {staff.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setInfoStaff(staff); setIsInfoOpen(true); }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 text-xs"
                      title="View details"
                      type="button"
                    >
                      <Eye size={12} /> View
                    </button>
                    <button
                      onClick={() => openEdit(staff)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 text-xs"
                      title="Edit staff"
                      type="button"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => resetAndSend(staff)}
                      disabled={resettingId === staff.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-60 text-xs"
                      title="Reset password"
                    >
                      {resettingId === staff.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound size={12} />}
                      Reset & send
                    </button>
                    <button
                      onClick={() => deleteStaff(staff)}
                      disabled={deletingId === staff.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/20 disabled:opacity-60 text-xs"
                      title="Delete permanently"
                      type="button"
                    >
                      {deletingId === staff.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 size={12} />}
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && !loadError && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <UserCircle2 className="h-12 w-12 text-gray-400" />
                    <p>No staff found for your filters/search.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {filtered.map((staff) => (
          <div key={staff.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="flex items-start gap-3 mb-3">
              <Avatar urls={staff.photo_urls} name={staff.name} size={48} />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{staff.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {ROLE_LABELS[staff.role] || staff.role}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {staff.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{staff.email}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setInfoStaff(staff); setIsInfoOpen(true); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 text-sm flex-1 justify-center sm:flex-none"
              >
                <Eye size={14} /> View
              </button>
              <button
                onClick={() => openEdit(staff)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 text-sm flex-1 justify-center sm:flex-none"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => resetAndSend(staff)}
                disabled={resettingId === staff.id}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-60 text-sm flex-1 justify-center sm:flex-none"
              >
                {resettingId === staff.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound size={14} />}
                Reset
              </button>
              <button
                onClick={() => deleteStaff(staff)}
                disabled={deletingId === staff.id}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-60 text-sm flex-1 justify-center sm:flex-none"
              >
                {deletingId === staff.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && !loadError && (
          <div className="text-center py-12">
            <UserCircle2 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No staff found</p>
            <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Responsive Add/Edit Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => (submitting ? null : setIsOpen(false))} />
            <div className="relative w-full transform rounded-t-2xl sm:rounded-2xl bg-white dark:bg-gray-900 shadow-2xl transition-all sm:max-w-lg sm:border border-gray-200 dark:border-gray-700">
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {dialogMode === 'add' ? 'Add Staff Member' : 'Edit Staff Member'}
                </h3>
                <button
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => (submitting ? null : setIsOpen(false))}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-4 sm:p-6 max-h-[calc(100vh-8rem)] sm:max-h-[70vh] overflow-y-auto">
                <div className="space-y-4 sm:space-y-5">
                  {/* Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Profile Photo
                    </label>
                    <div className="flex items-center gap-4">
                      <Avatar
                        urls={[
                          ...(photoPreview ? [photoPreview] : []),
                          ...(form.image_url ? [form.image_url] : []),
                        ]}
                        name={form.full_name}
                        size={64}
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onPickImage}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                      >
                        <ImageIcon className="h-4 w-4" />
                        {dialogMode === 'add' ? 'Upload Photo' : 'Change Photo'}
                      </button>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <UserCircle2 className="inline h-4 w-4 mr-1" />
                        Full Name
                      </label>
                      <input
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={form.full_name}
                        onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                        placeholder="e.g. Ama Boateng"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <Mail className="inline h-4 w-4 mr-1" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="name@school.edu"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Role
                        </label>
                        <select
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          value={form.role}
                          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Status
                        </label>
                        <select
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          value={form.status}
                          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                          <option value="SUSPENDED">SUSPENDED</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Error/Success Messages */}
                  {formError && (
                    <div className="flex items-start gap-2 p-3 text-red-700 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{formError}</span>
                    </div>
                  )}
                  {formSuccess && (
                    <div className="flex items-start gap-2 p-3 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{formSuccess}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  onClick={() => (submitting ? null : setIsOpen(false))}
                  disabled={submitting}
                >
                  Cancel
                </button>

                {dialogMode === 'add' ? (
                  <button
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={submitAddStaff}
                    disabled={addDisabled}
                    type="button"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                    {submitting ? 'Adding Staff…' : 'Add Staff Member'}
                  </button>
                ) : (
                  <button
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={submitUpdateStaff}
                    disabled={editDisabled}
                    type="button"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                    {submitting ? 'Updating…' : 'Update Staff'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Info Dialog */}
      {isInfoOpen && infoStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
            <div className="fixed inset-0 bg-black/40 transition-opacity" onClick={() => setIsInfoOpen(false)} />
            <div className="relative w-full transform rounded-t-2xl sm:rounded-2xl bg-white dark:bg-gray-900 shadow-2xl transition-all sm:max-w-2xl lg:max-w-3xl sm:border border-gray-200 dark:border-gray-700 max-h-full sm:max-h-[90vh]">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <Avatar urls={infoStaff.photo_urls} name={infoStaff.name} size={80} />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{infoStaff.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{ROLE_LABELS[infoStaff.role] || infoStaff.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {infoStaff.status}
                  </span>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                    title="Print"
                  >
                    <Printer size={16} />
                    <span className="hidden sm:inline">Print</span>
                  </button>
                  <button
                    onClick={() => setIsInfoOpen(false)}
                    className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh] sm:max-h-[50vh]">
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <UserCircle2 className="h-5 w-5 text-indigo-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">Profile Information</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <InfoLine label="Full Name" value={infoStaff.name} />
                    <InfoLine label="Role" value={ROLE_LABELS[infoStaff.role] || infoStaff.role} />
                    <InfoLine label="Email" value={infoStaff.email} />
                    <InfoLine label="Status" value={infoStaff.status} />
                    <InfoLine label="Created At" value={infoStaff.created_at} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setIsInfoOpen(false)}
                  className="w-full sm:w-auto px-6 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal (added) */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => (bulkBusy || importing ? null : setBulkOpen(false))} />
          <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Bulk Import Staff</h3>
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => (bulkBusy || importing ? null : setBulkOpen(false))} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5" />
                <div>
                  <div><b>Format (columns):</b> <code>full_name</code>, <code>email</code>, <code>role</code>, <code>status</code> (optional), <code>image_url</code> (optional)</div>
                  <div className="mt-1">
              <b>Role must be one of:</b>
              <span className="ml-2"><b>AD</b> - Administrator, <b>HT</b> - Headteacher, <b>TE</b> - Teacher, <b>AC</b> - Accountant</span>
            </div>
                  <div className="mt-1">IDs and <code>school_id</code> are not needed — they’re generated/attached automatically.</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800"
                  type="button"
                >
                  <Download className="h-4 w-4" /> Download Template
                </button>

                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <span>Choose File</span>
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBulkFile} disabled={bulkBusy || importing} />
                </label>

                {bulkFileName && <span className="text-sm text-gray-600 dark:text-gray-400">Selected: {bulkFileName}</span>}
              </div>

              {previewRows.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr className="text-left">
                        <th className="p-2">#</th>
                        <th className="p-2">Full Name</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Role</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Image URL</th>
                        <th className="p-2">Validation / Result</th>
                        <th className="p-2 text-center">Import?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r) => (
                        <tr key={r.idx} className="border-t">
                          <td className="p-2">{r.idx}</td>
                          <td className="p-2">{r.full_name}</td>
                          <td className="p-2">{r.email}</td>
                          <td className="p-2">{r.role}</td>
                          <td className="p-2">{r.status}</td>
                          <td className="p-2 truncate max-w-[220px]">{r.image_url || '—'}</td>
                          <td className="p-2">
                            {r.message
                              ? <span className={r.valid ? 'text-emerald-600' : 'text-rose-600'}>{r.message}</span>
                              : <span className={r.valid ? 'text-emerald-600' : 'text-rose-600'}>{r.valid ? 'OK' : 'Invalid'}</span>
                            }
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={!!r.toImport}
                              disabled={!r.valid || importing}
                              onChange={(e) => {
                                const v = e.target.checked;
                                setPreviewRows(prev => prev.map(x => x.idx === r.idx ? { ...x, toImport: v && x.valid } : x));
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bulkErr && (
                <div className="flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span className="text-sm">{bulkErr}</span>
                </div>
              )}
              {bulkOk && (
                <div className="flex items-start gap-2 text-emerald-700 bg-emerald-50 border-emerald-200 rounded-lg p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4" />
                  <span className="text-sm">{bulkOk}</span>
                </div>
              )}

              <div className="text-xs text-gray-600 dark:text-gray-400">
                {isFinite(planMax) ? (
                  <>You can import up to <b>{Math.max(0, planMax - staffCount)}</b> more staff on the <b>{planHuman}</b> plan.</>
                ) : (
                  <>Your <b>{planHuman}</b> plan allows unlimited staff.</>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setBulkOpen(false)}
                  className="px-4 py-2 rounded-lg border"
                  disabled={importing}
                  type="button"
                >
                  Close
                </button>
                <button
                                    onClick={doImport}
                  disabled={
                    importing ||
                    !previewRows.length ||
                    previewRows.every((r) => !r.valid || !r.toImport)
                  }
                  className="px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
                  type="button"
                >
                  {importing ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Import Selected
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ================== Small UI helpers ================== */

function InfoLine({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className="text-sm text-gray-900 dark:text-gray-100 break-words">
        {value || '—'}
      </div>
    </div>
  );
}

function PlanBanner({ planHuman, expiryISO, count, max }) {
  const expired =
    !!expiryISO &&
    Number.isFinite(new Date(expiryISO).getTime()) &&
    new Date(expiryISO).getTime() < Date.now();

  const limited = Number.isFinite(max);
  const used = Number.isFinite(count) ? Math.max(0, count) : 0;
  const cap = limited ? Math.max(1, max) : used || 1;
  const pct = Math.min(100, Math.round((used / cap) * 100));
  const remaining = limited ? Math.max(0, max - used) : '∞';

  return (
    <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Plan
          </div>
          <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {planHuman}
            {expired && (
              <span className="ml-2 inline-flex items-center rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 px-2 py-0.5 text-xs">
                Expired
              </span>
            )}
          </div>
          {expiryISO && (
            <div className="text-xs text-gray-500">
              {expired ? 'Expired on' : 'Expires on'}{' '}
              {new Date(expiryISO).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="w-full sm:w-[60%]">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
            <span>Staff usage</span>
            <span>
              {limited ? (
                <>
                  {used} / {max} used
                </>
              ) : (
                <>
                  {used} used • unlimited
                </>
              )}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full bg-indigo-600"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 text-xs text-gray-600 dark:text-gray-300">
            {limited ? (
              <>
                {remaining} {remaining === 1 ? 'slot' : 'slots'} remaining
              </>
            ) : (
              <>Unlimited slots</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

                    