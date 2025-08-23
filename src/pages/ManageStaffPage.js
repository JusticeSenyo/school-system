// src/pages/ManageStaffPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import {
  PlusCircle, X, Mail, UserCircle2,
  Loader2, CheckCircle2, AlertCircle, RotateCcw, Pencil
} from 'lucide-react';
import { useAuth } from '../AuthContext';

// No Postmark secrets in the frontend anymore.
// EMAILS ARE SENT VIA: /api/send-postmark  (serverless function on Vercel)

const ROLE_LABELS = { AD: 'Admin', HT: 'Head Teacher', TE: 'Teacher', AC: 'Accountant', SO: 'Owner' };
const ROLE_OPTIONS = [
  { value: 'AD', label: 'Admin' },
  { value: 'HT', label: 'Head Teacher' },
  { value: 'TE', label: 'Teacher' },
  { value: 'AC', label: 'Accountant' },
  { value: 'SO', label: 'Owner' },
];

export default function ManageStaffPage() {
  const { token, user, API_BASE } = useAuth();

  const schoolId =
    user?.school_id ?? user?.schoolId ?? user?.school?.id ?? user?.schoolID ?? user?.SCHOOL_ID ?? null;
  const userId = user?.user_id ?? user?.id ?? user?.USER_ID ?? null;

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('');

  // ============ FETCH STAFF ============
  const fetchStaff = async () => {
    setLoading(true);
    setLoadError('');

    if (!schoolId || !userId) {
      setLoading(false);
      setLoadError('Missing school ID or user ID on logged-in user.');
      return;
    }

    try {
      const url = new URL(`${API_BASE}/get/staff/`);
      url.searchParams.set('p_school_id', String(schoolId));
      url.searchParams.set('p_user_id', String(userId));

      const res = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch {}

      if (!res.ok) throw new Error(data?.message || data?.error || `Failed: ${res.status}`);

      const rows = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.rows) ? data.rows : []));
      const mapped = (rows || []).map((r, i) => ({
        id: r.USER_ID ?? r.user_id ?? r.id ?? i,
        name: r.FULL_NAME ?? r.full_name ?? r.name ?? '',
        role: r.ROLE ?? r.role ?? 'TE',
        email: r.EMAIL ?? r.email ?? '',
        status: r.STATUS ?? r.status ?? 'ACTIVE',
        created_at: r.CREATED_AT ?? r.created_at ?? null,
      }));

      setStaffList(mapped);
    } catch (e) {
      setLoadError(e.message || 'Unable to load staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); /* eslint-disable-next-line */ }, [schoolId, userId]);

  const filtered = useMemo(() => {
    if (!filter) return staffList;
    return staffList.filter(s => (ROLE_LABELS[s.role] || s.role).toLowerCase() === filter.toLowerCase());
  }, [staffList, filter]);

  // ============ SEND EMAIL VIA SERVERLESS ============
  // Calls /api/send-postmark (created in your repo under /api/send-postmark.js)
  const sendWelcomeEmail = async ({ full_name, email, role, tempPassword }) => {
    try {
      const res = await fetch('/api/send-postmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name,
          email,
          role: ROLE_LABELS[role] || role,
          tempPassword
          // If you didn't set LOGIN_URL/POSTMARK_FROM as env vars on Vercel,
          // you can optionally pass:
          // loginUrl: 'https://schoolmasterhub.vercel.app/login',
          // from: 'kingsford.amoah@johrit.tech'
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

  // ============ ADD / EDIT ============
  const [isOpen, setIsOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({ full_name: '', email: '', role: 'TE', status: 'ACTIVE' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const resetForm = () => {
    setForm({ full_name: '', email: '', role: 'TE', status: 'ACTIVE' });
    setFormError(''); setFormSuccess('');
    setEditingId(null); setDialogMode('add');
  };

  const validateForm = () => {
    if (!form.full_name.trim()) return 'Full name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Valid email is required';
    if (!ROLE_OPTIONS.find(r => r.value === form.role)) return 'Select a valid role';
    return '';
  };

  const buildAddStaffURL = () => {
    const params = new URLSearchParams({
      p_creator_user_id: String(userId ?? ''),
      p_full_name: form.full_name.trim(),
      p_email: form.email.trim().toLowerCase(),
      p_role: form.role,
      status: form.status || 'ACTIVE',
    });
    return `${API_BASE}/add/staff/?${params.toString()}`;
  };

  const buildUpdateStaffURL = () => {
    const params = new URLSearchParams({
      p_user_id: String(editingId),
      p_full_name: form.full_name.trim(),
      p_email: form.email.trim().toLowerCase(),
      p_role: form.role,
      p_status: form.status || 'ACTIVE',
    });
    return `${API_BASE}/update/staff/?${params.toString()}`;
  };

  const openAdd = () => { resetForm(); setDialogMode('add'); setIsOpen(true); };
  const openEdit = (row) => {
    setDialogMode('edit');
    setEditingId(row.id);
    setForm({ full_name: row.name, email: row.email, role: row.role, status: row.status || 'ACTIVE' });
    setFormError(''); setFormSuccess(''); setIsOpen(true);
  };

  // ============ ADD STAFF ============
  const submitAddStaff = async () => {
    setFormError(''); setFormSuccess('');
    const err = validateForm();
    if (err) { setFormError(err); return; }
    if (!userId) { setFormError('Missing current user ID. Please re-login.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(buildAddStaffURL(), { method: 'GET' });
      const text = await res.text();
      let data = null; try { data = JSON.parse(text); } catch {}

      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || `Failed with status ${res.status}`);
      }

      // optimistic update
      setStaffList(prev => ([...prev, {
        id: data?.userId || `tmp-${Date.now()}`,
        name: form.full_name.trim(),
        role: form.role,
        email: form.email.trim().toLowerCase(),
        status: form.status || 'ACTIVE',
      }]));

      // temp password can be tempPassword OR temp_password depending on ORDS block
      const tempPassword = data?.tempPassword ?? data?.temp_password;

      if (tempPassword) {
        const emailResult = await sendWelcomeEmail({
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          tempPassword
        });

        if (emailResult.ok) {
          setFormSuccess('Staff added successfully. Email sent with login details.');
        } else {
          setFormSuccess(`Staff added successfully, but email failed: ${emailResult.error}`);
        }
      } else {
        setFormSuccess('Staff added successfully.');
      }

      setTimeout(async () => { await fetchStaff(); setIsOpen(false); resetForm(); }, 800);
    } catch (e) {
      setFormError(e.message || 'Failed to add staff.');
    } finally {
      setSubmitting(false);
    }
  };

  // ============ UPDATE STAFF ============
  const submitUpdateStaff = async () => {
    setFormError(''); setFormSuccess('');
    const err = validateForm();
    if (err) { setFormError(err); return; }
    if (!editingId) { setFormError('Missing staff ID.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(buildUpdateStaffURL(), { method: 'GET' });
      const text = await res.text();
      let data = null; try { data = JSON.parse(text); } catch {}

      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || `Failed with status ${res.status}`);
      }

      setFormSuccess('Staff updated successfully.');
      setTimeout(async () => { await fetchStaff(); setIsOpen(false); resetForm(); }, 600);
    } catch (e) {
      setFormError(e.message || 'Failed to update staff.');
    } finally {
      setSubmitting(false);
    }
  };

  // keyboard helpers
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

  const addDisabled = submitting || !!validateForm();
  const editDisabled = submitting || !!validateForm();

  return (
    <DashboardLayout title="Manage Staff" subtitle="View, filter, edit, and manage staff records">
      {/* Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 rounded-md text-sm border bg-white dark:bg-gray-900"
          >
            <option value="">All Roles</option>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.label}>{r.label}</option>)}
          </select>

          <button
            onClick={fetchStaff}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Refresh staff list"
          >
            <RotateCcw size={16} /> Refresh
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
          <span>{loadError}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-indigo-100 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((staff) => (
              <tr key={staff.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-2">{staff.name}</td>
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
                  <button
                    onClick={() => openEdit(staff)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800"
                    title="Edit staff"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && !loadError && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  No staff found for your school.
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
                    disabled={submitting || !!validateForm()}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                    {submitting ? 'Adding…' : 'Add Staff'}
                  </button>
                ) : (
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                    onClick={submitUpdateStaff}
                    disabled={submitting || !!validateForm()}
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
    </DashboardLayout>
  );
}
