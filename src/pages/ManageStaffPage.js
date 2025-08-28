// src/pages/ManageStaffPage.js
import React, { useEffect, useMemo, useState, useRef } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import {
  PlusCircle, X, Mail, UserCircle2,
  Loader2, CheckCircle2, AlertCircle, RotateCcw, Pencil,
  Download, Search, KeyRound, Eye, Image as ImageIcon, Printer
} from 'lucide-react';
import { getTempPassword } from '../lib/passwords';
import * as XLSX from 'xlsx';
import { useAuth } from '../AuthContext';

import { OCI, buildStaffKey, buildPublicUrl, putToOCI } from '../config/storage';

// ===== Constants =====
const ROLE_LABELS = { AD: 'Admin', HT: 'Head Teacher', TE: 'Teacher', AC: 'Accountant', SO: 'Owner' };
const ROLE_OPTIONS = [
  { value: 'AD', label: 'Admin' },
  { value: 'HT', label: 'Head Teacher' },
  { value: 'TE', label: 'Teacher' },
  { value: 'AC', label: 'Accountant' },
  { value: 'SO', label: 'Owner' },
];

const EMAIL_API_BASE = 'https://schoolmasterhub.vercel.app';

// Relative API paths (joined with API_BASE by the safe builder)
const RESET_PWD_PATH = 'staff/reset_password/';

// Try both variants for next-id (whichever is wired in ORDS)
const NEXT_STAFF_ID_PATHS = [
  'staff/id/next',
  'school/staff/staff_api/staff/id/next',
];

// Absolute endpoints in the new `schools` schema
const ADD_STAFF_ENDPOINT =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/staff/add/staff/';
const UPDATE_STAFF_ENDPOINT =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/staff/update/staff/';

// ===== Safe URL builder (prevents //, handles query params, and lets absolute URLs pass-through) =====
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

// ===== Fetch next staff id (robust to JSON / stray text / alt paths) =====
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

// ===== Helper: initials for avatar fallback =====
const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('') || 'ST';

// ===== Helper: nicer messages for common Oracle errors =====
function mapOracleError(errText = '') {
  const t = String(errText);
  if (/ORA-00001/i.test(t)) return 'Email already exists (unique constraint).';
  if (/ORA-01400/i.test(t)) return 'A required column was empty. Check all required fields.';
  if (/ORA-06502|numeric or value error/i.test(t)) return 'Value too long or wrong data type (check field lengths).';
  if (/ORA-12899/i.test(t)) return 'One of the values exceeds the column size. Shorten and try again.';
  if (/ORA-01036|illegal variable name|number/i.test(t)) return 'Backend bind variables mismatch (check parameter names).';
  if (/ORA-00904|invalid identifier/i.test(t)) return 'Backend column/parameter name mismatch.';
  if (/ORA-00907|missing right parenthesis|ORA-00933|ORA-00936/i.test(t)) return 'Backend SQL syntax error.';
  return null;
}

// ===== Avatar component =====
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

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Image in dialog
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const fileInputRef = useRef(null);

  // Info dialog
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [infoStaff, setInfoStaff] = useState(null);

  // Add / Edit
  const [isOpen, setIsOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({ full_name: '', email: '', role: 'TE', status: 'ACTIVE', password: '', image_url: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [regenLoading, setRegenLoading] = useState(false);

  // Newly required by your backend: pre-generated id
  const [pendingUserId, setPendingUserId] = useState(null);

  // ===== Fetch Staff =====
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
      try { data = JSON.parse(text); } catch {}

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

  useEffect(() => { fetchStaff(); /* eslint-disable-next-line */ }, [schoolId]);

  // ===== Filtering =====
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

  // ===== Utilities =====
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
  };

  const validateForm = () => {
    if (!form.full_name.trim()) return 'Full name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Valid email is required';
    if (!ROLE_OPTIONS.find(r => r.value === form.role)) return 'Select a valid role';
    return '';
  };

  // ===== Robust UPDATE function (tries POST form-urlencoded → GET → POST JSON) =====
  const updateStaffRobust = async (payload) => {
    // exact binds your PL/SQL uses (NO p_password here)
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

    // 1) POST form-urlencoded (simple request, avoids preflight)
    try {
      const r = await fetch(UPDATE_STAFF_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeForm(mustParams),
      });
      const t = await r.text();
      let j = null; try { j = JSON.parse(t); } catch {}
      if (r.ok && (j == null || j?.success !== false)) return true;
      // fall through to next attempts
    } catch (e) {
      // ignore and try next
    }

    // 2) GET with query params
    try {
      const getUrl = toUrl(UPDATE_STAFF_ENDPOINT, mustParams);
      const r = await fetch(getUrl, { method: 'GET' });
      const t = await r.text();
      let j = null; try { j = JSON.parse(t); } catch {}
      if (r.ok && (j == null || j?.success !== false)) return true;
    } catch (e) {
      // ignore and try next
    }

    // 3) POST JSON fallback
    try {
      const r = await fetch(UPDATE_STAFF_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mustParams),
      });
      const t = await r.text();
      let j = null; try { j = JSON.parse(t); } catch {}
      if (r.ok && (j == null || j?.success !== false)) return true;
      throw new Error((j?.error || t || `HTTP ${r.status}`).slice(0, 800));
    } catch (e) {
      throw e;
    }
  };

  // ===== Dialog open helpers =====
  const openAdd = async () => {
    resetForm();
    setDialogMode('add');
    setIsOpen(true);
    try {
      const pwd    = await generateTempPassword();
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
      password: '', // not used on edit anymore
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

  // ===== ADD: upload first -> add with p_image_url -> email -> refresh =====
  const submitAddStaff = async () => {
    setFormError(''); setFormSuccess('');
    const err = validateForm();
    if (err) { setFormError(err); return; }
    if (!userId) { setFormError('Missing current user ID. Please re-login.'); return; }
    if (!pendingUserId) { setFormError('Unable to allocate a new Staff ID. Please try again.'); return; }
    if (!form.password?.trim()) { setFormError('Temporary password is empty. Click "Regenerate" and try again.'); return; }

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

      // Call the NEW absolute add endpoint and include p_image_url
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

      const res = await fetch(addUrl, { method: 'GET' });
      let data = null; let raw = '';
      try { raw = await res.text(); data = JSON.parse(raw); } catch {}
      if (!res.ok || data?.success === false) {
        const serverMsg = (data?.error || raw || '').slice(0, 600) || `HTTP ${res.status}`;
        throw new Error(serverMsg);
      }

      // Update UI immediately
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

  // ===== EDIT: (optional) upload -> robust update (OCI overwrite if new image) =====
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
        schoolId,                       // required by your UPDATE
        fullName: form.full_name,
        email: form.email,
        role: form.role,
        status: form.status,
        imageUrl: imageUrlToSave,
        // no password on edit
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

  // ===== Reset password & email =====
  const [resettingId, setResettingId] = useState(null);

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

  // ===== Export to Excel =====
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

  // ===== Keyboard helpers =====
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

  const addDisabled  = submitting || !!validateForm() || !pendingUserId;
  const editDisabled = submitting || !!validateForm();

  // ===== Render =====
  return (
    <DashboardLayout title="Manage Staff" subtitle="View, filter, edit, and manage staff records">
      {/* Toolbar */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 rounded-md text-sm border bg-white dark:bg-gray-900"
          >
            <option value="">All Roles</option>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.label}>{r.label}</option>)}
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="pl-9 pr-3 py-2 w-64 rounded-md text-sm border bg-white dark:bg-gray-900"
            />
          </div>

          <button
            onClick={fetchStaff}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Refresh staff list"
          >
            <RotateCcw size={16} /> Refresh
          </button>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700"
            title="Download Excel report of current table view"
          >
            <Download size={16} /> Download Excel
          </button>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
        >
          <PlusCircle size={16} /> Add New Staff
        </button>
      </div>

      {/* Status */}
      {loading && <div className="mb-4 text-sm text-gray-600">Loading staff…</div>}
      {loadError && (
        <div className="mb-4 flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span className="text-sm">{loadError}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-indigo-100 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">Staff</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((staff) => (
              <tr key={staff.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar urls={staff.photo_urls} name={staff.name} />
                    <span>{staff.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {ROLE_LABELS[staff.role] || staff.role}
                  </span>
                </td>
                <td className="px-4 py-2">{staff.email}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {staff.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setInfoStaff(staff); setIsInfoOpen(true); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800"
                      title="View details"
                    >
                      <Eye size={14} /> View
                    </button>

                    <button
                      onClick={() => openEdit(staff)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800"
                      title="Edit staff"
                    >
                      <Pencil size={14} /> Edit
                    </button>

                    <button
                      onClick={() => resetAndSend(staff)}
                      disabled={resettingId === staff.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-60"
                      title="Reset password & email credentials"
                    >
                      {resettingId === staff.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound size={14} />}
                      {resettingId === staff.id ? 'Resetting…' : 'Reset & Send'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && !loadError && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  No staff found for your filters/search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => (submitting ? null : setIsOpen(false))} />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{dialogMode === 'add' ? 'Add Staff' : 'Edit Staff'}</h3>
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => (submitting ? null : setIsOpen(false))}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Photo */}
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Photo</span>
                <div className="mt-2 flex items-center gap-3">
                  <Avatar
                    urls={[
                      ...(photoPreview ? [photoPreview] : []),
                      ...(form.image_url ? [form.image_url] : []),
                    ]}
                    name={form.full_name}
                    size={56}
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
                    className="px-3 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {dialogMode === 'add' ? 'Upload Image' : 'Change Image'}
                  </button>
                </div>
              </div>

              <label className="grid gap-1">
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <UserCircle2 className="h-4 w-4" /> Full Name
                </span>
                <input
                  className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="e.g. Ama Boateng"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email
                </span>
                <input
                  type="email"
                  className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="name@school.edu"
                />
              </label>

              {/* No password field in edit mode */}

              <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Role</span>
                  <select
                    className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Status</span>
                  <select
                    className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </label>
              </div>

              {formError && (
                <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span className="text-sm">{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="flex items-start gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4" />
                  <span className="text-sm">{formSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button className="px-4 py-2 rounded-lg border" onClick={() => (submitting ? null : setIsOpen(false))} disabled={submitting}>
                  Cancel
                </button>

                {dialogMode === 'add' ? (
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                    onClick={submitAddStaff}
                    disabled={addDisabled}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                    {submitting ? 'Adding…' : 'Add Staff'}
                  </button>
                ) : (
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                    onClick={submitUpdateStaff}
                    disabled={editDisabled}
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

      {/* Info Dialog */}
      {isInfoOpen && infoStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <Avatar urls={infoStaff.photo_urls} name={infoStaff.name} size={120} />
                <div>
                  <div className="text-lg font-semibold">{infoStaff.name}</div>
                  <div className="text-xs text-gray-500">{ROLE_LABELS[infoStaff.role] || infoStaff.role}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {infoStaff.status}
                </span>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800"
                  title="Print"
                >
                  <Printer size={16} /> Print
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

            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <UserCircle2 className="h-4 w-4 text-indigo-600" />
                    <h4 className="text-sm font-semibold">Profile</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoLine label="Name" value={infoStaff.name} />
                    <InfoLine label="Role" value={ROLE_LABELS[infoStaff.role] || infoStaff.role} />
                    <InfoLine label="Email" value={infoStaff.email} />
                    <InfoLine label="Status" value={infoStaff.status} />
                    <InfoLine label="Created At" value={infoStaff.created_at} />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end">
              <button
                onClick={() => setIsInfoOpen(false)}
                className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function InfoLine({ label, value }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
