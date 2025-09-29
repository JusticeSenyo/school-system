// src/pages/ManageStudentsPage.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import {
  PlusCircle, X, Mail, UserCircle2,
  Loader2, CheckCircle2, AlertCircle, RefreshCcw as RotateCcw, Pencil,
  Download, Search, KeyRound, Eye, Image as ImageIcon, Printer,
  Hash, Users, Phone, Upload, Info, GraduationCap,Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../AuthContext';
import { getTempPassword } from '../lib/passwords';
import { buildPublicUrl, putToOCI } from '../config/storage';

/* ================== Plans / limits ================== */
const PLAN_LIMITS = { BASIC: 100, STANDARD: 1000, PREMIUM: Infinity };
const PLAN_NAME_BY_CODE = (raw) => {
  const v = String(raw ?? '').trim().toUpperCase();
  if (v === '1' || v === 'BASIC') return 'BASIC';
  if (v === '2' || v === 'STANDARD') return 'STANDARD';
  if (v === '3' || v === 'PREMIUM' || v === 'PREMUIM') return 'PREMIUM';
  return 'BASIC';
};
const HUMAN_PLAN = (code) => ({ BASIC: 'Basic', STANDARD: 'Standard', PREMIUM: 'Premium' }[code] || 'Basic');

/* ================== ORDS endpoints (absolute) ================== */
const GET_STUDENTS_ENDPOINT =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/student/get/students/';
const GET_CLASSES_ENDPOINT =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/student/get/classes/';
const NEXT_STUDENT_ID_ENDPOINT =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/student/id/next';
const ADD_STUDENT_ENDPOINT =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/student/add/student/';
const UPDATE_STUDENT_ENDPOINT =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/student/update/student/';
const RESET_STUDENT_PWD_ENDPOINT =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/student/reset_password/';
const TEMP_PASS_ENDPOINT =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/security/temp/pass/';

/* ================== Email sender ================== */
const EMAIL_API_BASE = 'https://schoolmasterhub.vercel.app';

/* ================== Safe URL builder ================== */
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

/* ================== Helpers ================== */
const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || 'ST';

function mapOracleError(errText = '') {
  const t = String(errText);
  // new -201xx friendly errors
  if (/-20110/.test(t)) return 'Creator not found in this school.';
  if (/-20111/.test(t)) return 'Not authorized: only AD/SA can add students.';
  if (/-20112/.test(t)) return 'Full name is required.';
  if (/-20113/.test(t)) return 'Role must be ST.';
  if (/-20114/.test(t)) return 'Password is required for student.';
  if (/-20115/.test(t)) return 'Class ID is required.';
  if (/-20116/.test(t)) return 'Gender is required.';
  if (/-20117/.test(t)) return 'Gender must be M or F.';
  if (/-20118/.test(t)) return 'Invalid DOB format. Use YYYY-MM-DD.';
  if (/-20119/.test(t)) return 'Class not found for this school.';
  if (/-20120/.test(t)) return 'Admission number already exists for this school.';
  if (/-20121/.test(t)) return 'Index number already exists for this school.';
  if (/-20122/.test(t)) return 'Email already exists for this school.';
  if (/-20123/.test(t)) return 'Duplicate unique field (admission/index/email).';
  if (/-20199/.test(t)) return 'Failed to add student (server).';
  // generic ORA mappings
  if (/ORA-00001/i.test(t)) return 'Duplicate detected (unique constraint).';
  if (/ORA-01400/i.test(t)) return 'A required column was empty. Check all required fields.';
  if (/ORA-06502|numeric or value error/i.test(t)) return 'Value too long or wrong data type (check field lengths).';
  if (/ORA-12899/i.test(t)) return 'One of the values exceeds the column size. Shorten and try again.';
  if (/ORA-01036|illegal variable name|number/i.test(t)) return 'Backend bind variables mismatch (check parameter names).';
  if (/ORA-00904|invalid identifier/i.test(t)) return 'Backend column/parameter name mismatch.';
  if (/ORA-00907|missing right parenthesis|ORA-00933|ORA-00936/i.test(t)) return 'Backend SQL syntax error.';
  return null;
}

/* fetch JSON-like arrays safely (for plan info) */
const jarr = async (url, headers = {}) => {
  const r = await fetch(url, { headers: { Accept: 'application/json', ...headers }, cache: 'no-store' });
  const t = (await r.text()).trim();
  if (!t) return [];
  try {
    const d = JSON.parse(t);
    return Array.isArray(d) ? d : Array.isArray(d.items) ? d.items : Array.isArray(d.rows) ? d.rows : [];
  } catch { return []; }
};

const Avatar = ({ urls = [], name, size = 80, rounded = 'rounded-full' }) => {
  const [idx, setIdx] = useState(0);
  const src = urls && urls.length > idx ? urls[idx] : null;

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'photo'}
        className={`${rounded} object-cover flex-shrink-0`}
        style={{ width: size, height: size }}
        onError={() => setIdx(idx + 1)}
      />
    );
  }
  return (
    <div
      className={`${rounded} bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0`}
      style={{ width: size, height: size, fontSize: Math.max(10, size / 2.6) }}
      aria-label="avatar"
      title={name || 'Student'}
    >
      {initials(name)}
    </div>
  );
};

// Build a stable object key for student photos in OCI
const buildStudentKey = (schoolId, studentId, ext = 'jpg') =>
  `schools/${schoolId}/students/${studentId}.${ext}`;

// Robust "next id" fetch
async function fetchNextStudentId(toUrl, { token, schoolId } = {}) {
  const headers = { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const url = toUrl(NEXT_STUDENT_ID_ENDPOINT, schoolId ? { p_school_id: String(schoolId) } : undefined);

  const res = await fetch(url, { headers });
  const raw = await res.text();
  const body = raw.replace(/^content[- ]type\s*:\s*application\/json[^\n]*\n?/i, '').trim();

  const jsonSlice = body.match(/\{[\s\S]*\}/);
  if (jsonSlice) {
    try {
      const j = JSON.parse(jsonSlice[0]);
      const id = j?.next_id ?? j?.NEXT_ID ?? j?.student_id ?? j?.STUDENT_ID ?? j?.id ?? j?.ID ?? null;
      if (id != null && String(id).match(/^\d+$/)) return Number(id);
    } catch { /* ignore */ }
  }
  const m = body.match(/\d{1,18}/);
  if (m) return Number(m[0]);

  throw new Error(`Unexpected response from student/id/next: ${body.slice(0, 200)}`);
}

// Fetch temp password from ORDS (fallback)
async function fetchTempPassword() {
  try {
    const res = await fetch(TEMP_PASS_ENDPOINT, { headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.tempPassword) return data.tempPassword;
  } catch { /* ignore */ }
  return getTempPassword(12);
}

/* ================== Component ================== */
export default function ManageStudentsPage() {
  const { token, user, API_BASE } = useAuth();
  const { toUrl } = useApiJoin(API_BASE);

  const schoolId =
    user?.school_id ?? user?.schoolId ?? user?.school?.id ?? user?.schoolID ?? user?.SCHOOL_ID ?? null;
  const userId = user?.user_id ?? user?.id ?? user?.USER_ID ?? null;

  const SCHOOL_NAME =
    user?.school?.name ?? user?.school_name ?? user?.SCHOOL_NAME ?? user?.orgName ?? user?.organisation ?? '';

  /* ---------- Plan & expiry ---------- */
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
        const exp  = rec?.expiry ?? rec?.EXPIRY ?? user?.expiry ?? user?.EXPIRY ?? null;
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

  const planMax = PLAN_LIMITS[planCode] ?? 100;
  const planExpired = useMemo(() => {
    if (!expiryISO) return false;
    const d = new Date(expiryISO);
    return isFinite(d.getTime()) && d.getTime() < Date.now();
  }, [expiryISO]);

  // State
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [classesErr, setClassesErr] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // mobile
  const [showMobileFilters, setShowMobileFilters] = useState(false);


  // Dialogs
  const [isOpen, setIsOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    full_name: '', email: '', class_id: '', status: 'ACTIVE',
    gender: '', dob: '', admission_no: '', index_no: '', phone: '',
    father_name: '', mother_name: '', father_phone: '', mother_phone: '',
    guardian_name: '', guardian_phone: '',
    image_url: '', // hidden in UI, used for caching/updating
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Photo
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const fileInputRef = useRef(null);

  // Reset password
  const [resettingId, setResettingId] = useState(null);

  // Info dialog
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [infoStudent, setInfoStudent] = useState(null);

  // Pre-allocated id
  const [pendingStudentId, setPendingStudentId] = useState(null);

  // BULK IMPORT
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy] = useState(false);
  const [bulkErr, setBulkErr] = useState('');
  const [bulkOk, setBulkOk] = useState('');
  const [bulkFileName, setBulkFileName] = useState('');
  const [previewRows, setPreviewRows] = useState([]);
  const [importing, setImporting] = useState(false);

  /* ---------- Fetch students ---------- */
  const fetchStudents = async () => {
    setLoading(true);
    setLoadError('');
    try {
      if (!schoolId) throw new Error('Missing school ID on logged-in user.');

      const url = toUrl(GET_STUDENTS_ENDPOINT, { p_school_id: String(schoolId) });
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const text = await res.text();
      let data = null; try { data = JSON.parse(text); } catch {}

      if (!res.ok) throw new Error(data?.message || data?.error || `Failed: ${res.status}`);

      const rows = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.rows) ? data.rows : []));

      const mapped = (rows || []).map((r, i) => {
        const id = r.STUDENT_ID ?? r.student_id ?? r.id ?? i;
        const created = r.CREATED_AT ?? r.created_at ?? '';
        const imageUrl = r.IMAGE_URL ?? r.image_url ?? '';

        const urlChain = [];
        if (imageUrl) {
          try {
            const u = new URL(imageUrl, window.location.origin);
            u.searchParams.set('_', String(created || Date.now()));
            urlChain.push(u.toString());
          } catch {
            urlChain.push(String(imageUrl));
          }
        }

        return {
          id,
          full_name: r.FULL_NAME ?? r.full_name ?? r.name ?? '',
          email: r.EMAIL ?? r.email ?? '',
          class_id: r.CLASS_ID ?? r.class_id ?? '',
          status: r.STATUS ?? r.status ?? 'ACTIVE',
          gender: r.GENDER ?? r.gender ?? '',
          dob: r.DOB ?? r.dob ?? '',
          admission_no: r.ADMISSION_NO ?? r.admission_no ?? '',
          index_no: r.INDEX_NO ?? r.index_no ?? '',
          phone: r.PHONE ?? r.phone ?? '',
          father_name: r.FATHER_NAME ?? r.father_name ?? '',
          mother_name: r.MOTHER_NAME ?? r.mother_name ?? '',
          father_phone: r.FATHER_PHONE ?? r.father_phone ?? '',
          mother_phone: r.MOTHER_PHONE ?? r.mother_phone ?? '',
          guardian_name: r.GUARDIAN_NAME ?? r.guardian_name ?? '',
          guardian_phone: r.GUARDIAN_PHONE ?? r.guardian_phone ?? '',
          image_url: imageUrl || '',
          created_at: created,
          photo_urls: urlChain,
        };
      });

      setStudents(mapped);
    } catch (e) {
      setLoadError(e.message || 'Unable to load students.');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Fetch classes ---------- */
  const fetchClasses = async () => {
    setClassesErr('');
    try {
      if (!schoolId) return;
      const url = toUrl(GET_CLASSES_ENDPOINT, { p_school_id: String(schoolId) });
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => []);
      setClasses(Array.isArray(data) ? data : []);
    } catch (e) {
      setClassesErr(e.message || 'Failed to load classes.');
      setClasses([]);
    }
  };

  useEffect(() => { fetchStudents(); fetchClasses(); /* eslint-disable-next-line */ }, [schoolId]);

  /* ---------- Filtering & search ---------- */
  const classIdToName = useMemo(() => {
    const m = new Map();
    for (const c of classes) {
      const id = String(c.class_id ?? '');
      m.set(id, c.class_name || id);
    }
    return m;
  }, [classes]);

  const classNameToId = useMemo(() => {
    const m = new Map();
    for (const c of classes) {
      const name = String(c.class_name ?? '').trim().toLowerCase();
      const id = String(c.class_id ?? '');
      if (name) m.set(name, id);
    }
    return m;
  }, [classes]);

  const getClassName = (id) => classIdToName.get(String(id ?? '')) || String(id ?? '');

  const normalize = (v) => String(v ?? '').toLowerCase();
  const genderLabel = (g) => (g === 'M' ? 'male' : (g === 'F' ? 'female' : normalize(g)));

  function studentMatchesQuery(s, q, getClassNameFn) {
    const haystack = [
      s.full_name, s.email, getClassNameFn(s.class_id), s.status, genderLabel(s.gender),
      s.admission_no, s.index_no, s.phone, s.father_name, s.father_phone, s.mother_name,
      s.mother_phone, s.guardian_name, s.guardian_phone, s.created_at, s.id
    ].map(normalize).join(' ');

    const tokens = normalize(q).split(/\s+/).filter(Boolean);

    return tokens.every(tok => {
      const m = tok.match(/^(\w+):(.*)$/);
      if (m) {
        const [, field, valRaw] = m;
        const val = valRaw.trim();
        const v = normalize(val);

        switch (field) {
          case 'name':     return normalize(s.full_name).includes(v);
          case 'email':    return normalize(s.email).includes(v);
          case 'class':    return normalize(getClassNameFn(s.class_id)).includes(v);
          case 'status':   return normalize(s.status).includes(v);
          case 'gender':   return genderLabel(s.gender).startsWith(v);
          case 'adm':
          case 'admission':return normalize(s.admission_no).includes(v);
          case 'index':    return normalize(s.index_no).includes(v);
          case 'phone':    return normalize(s.phone).includes(v);
          case 'father':   return (normalize(s.father_name) + ' ' + normalize(s.father_phone)).includes(v);
          case 'mother':   return (normalize(s.mother_name) + ' ' + normalize(s.mother_phone)).includes(v);
          case 'guardian': return (normalize(s.guardian_name) + ' ' + normalize(s.guardian_phone)).includes(v);
          case 'id':       return String(s.id).includes(val);
          case 'created':
          case 'date':     return normalize(s.created_at).includes(v);
          default:         return haystack.includes(tok);
        }
      }
      return haystack.includes(tok);
    });
  }

  const filtered = useMemo(() => {
    let list = students;
    if (filterClass) list = list.filter(s => String(s.class_id) === String(filterClass));
    if (searchQuery.trim()) list = list.filter(s => studentMatchesQuery(s, searchQuery, getClassName));
    return list;
  }, [students, filterClass, searchQuery, getClassName]);

  const studentCount = students.length;
  const remaining = useMemo(() => (isFinite(planMax) ? Math.max(0, planMax - studentCount) : Infinity), [planMax, studentCount]);

  /* ---------- Utilities ---------- */
  const generateTempPassword = () => getTempPassword(12);

  const sendWelcomeEmail = async ({ full_name, email, tempPassword, schoolName, replyTo, subject }) => {
    try {
      const endpoint = `${EMAIL_API_BASE}/api/send-postmark`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name,
          email,
          role: 'Student',
          tempPassword,
          schoolName,
          replyTo,
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

  const validateForm = () => {
    if (!form.full_name.trim()) return 'Full name is required';
    if (!form.class_id) return 'Class is required';
    if (!form.gender || !['M','F'].includes(String(form.gender).toUpperCase())) {
      return 'Gender is required (M/F).';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Valid email is required';
    if (planExpired) return 'Plan expired. Please renew.';
    if (isFinite(planMax) && remaining <= 0 && dialogMode === 'add') return `Reached ${planHuman} plan student limit.`;
    return '';
  };

  /* ---------- Robust UPDATE ---------- */
  const updateStudentRobust = async (payload) => {
    const mustParams = {
      p_student_id: String(payload.studentId),
      p_school_id: String(payload.schoolId),
      p_full_name: payload.fullName.trim(),
      p_gender: payload.gender || '',
      p_image_url: payload.imageUrl || '',
      p_dob: payload.dob || '',
      p_class_id: payload.classId,
      p_admission_no: payload.admissionNo || '',
      p_role: 'ST',
      p_status: payload.status || 'ACTIVE',
      p_index_no: payload.indexNo || '',
      p_father_name: payload.fatherName || '',
      p_mother_name: payload.motherName || '',
      p_father_phone: payload.fatherPhone || '',
      p_mother_phone: payload.motherPhone || '',
      p_guardian_name: payload.guardianName || '',
      p_guardian_phone: payload.guardianPhone || '',
      p_phone: payload.phone || '',
      p_email: (payload.email || '').trim().toLowerCase(),
    };

    const encodeForm = (obj) =>
      Object.entries(obj).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');

    try {
      const r = await fetch(UPDATE_STUDENT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeForm(mustParams),
      });
      const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
      if (r.ok && (j == null || j?.success !== false)) return true;
    } catch {}
    try {
      const getUrl = toUrl(UPDATE_STUDENT_ENDPOINT, mustParams);
      const r = await fetch(getUrl, { method: 'GET' });
      const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
      if (r.ok && (j == null || j?.success !== false)) return true;
    } catch {}
    const r = await fetch(UPDATE_STUDENT_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mustParams),
    });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
    if (r.ok && (j == null || j?.success !== false)) return true;
    throw new Error((j?.error || t || `HTTP ${r.status}`).slice(0, 800));
  };

  /* ---------- Dialog open helpers ---------- */
  const resetForm = () => {
    setForm({
      full_name: '', email: '', class_id: '', status: 'ACTIVE',
      gender: '', dob: '', admission_no: '', index_no: '', phone: '',
      father_name: '', mother_name: '', father_phone: '', mother_phone: '',
      guardian_name: '', guardian_phone: '',
      image_url: '',
      _password: '',
    });
    setPhotoFile(null);
    setPhotoPreview('');
    setFormError(''); setFormSuccess('');
    setEditingId(null); setDialogMode('add');
  };

  const openAdd = async () => {
    if (planExpired) { setFormError('Plan expired. Please renew.'); return; }
    if (isFinite(planMax) && remaining <= 0) { setFormError(`Reached ${planHuman} plan student limit.`); return; }

    resetForm();
    setDialogMode('add');
    setIsOpen(true);
    try {
      const [pwd, nextId] = await Promise.all([
        fetchTempPassword(),
        fetchNextStudentId(toUrl, { token, schoolId }),
      ]);
      if (!nextId) throw new Error('Could not fetch next student ID');
      setPendingStudentId(nextId);
      setForm(f => ({ ...f, _password: pwd }));
    } catch (e) {
      setFormError(e.message || 'Could not prepare new student form');
    }
  };

  const openEdit = (row) => {
    setDialogMode('edit');
    setEditingId(row.id);
    setForm({
      full_name: row.full_name,
      email: row.email || '',
      class_id: row.class_id || '',
      status: row.status || 'ACTIVE',
      gender: row.gender || '',
      dob: row.dob || '',
      admission_no: row.admission_no || '',
      index_no: row.index_no || '',
      phone: row.phone || '',
      father_name: row.father_name || '',
      mother_name: row.mother_name || '',
      father_phone: row.father_phone || '',
      mother_phone: row.mother_phone || '',
      guardian_name: row.guardian_name || '',
      guardian_phone: row.guardian_phone || '',
      image_url: row.image_url || '',
      _password: '',
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

  /* ---------- ADD ---------- */
  const submitAddStudent = async () => {
    setFormError(''); setFormSuccess('');
    const err = validateForm();
    if (err) { setFormError(err); return; }
    if (!userId) { setFormError('Missing current user ID. Please re-login.'); return; }
    if (!pendingStudentId) { setFormError('Unable to allocate a new Student ID. Please try again.'); return; }
    const tempPwd = form._password || generateTempPassword();

    setSubmitting(true);
    try {
      let finalImageUrl = form.image_url || '';
      if (photoFile && schoolId && pendingStudentId) {
        const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
        const key = buildStudentKey(schoolId, pendingStudentId, ext);
        await putToOCI(photoFile, key);
        finalImageUrl = buildPublicUrl(key);
      }

      const addUrl = toUrl(ADD_STUDENT_ENDPOINT, {
        p_creator_user_id: String(userId),
        p_full_name: form.full_name.trim(),
        p_gender: form.gender || '',
        p_image_url: finalImageUrl || '',
        p_dob: form.dob || '',
        p_class_id: form.class_id,
        p_admission_no: form.admission_no || '',
        p_student_id: String(pendingStudentId),
        p_role: 'ST',
        p_password: tempPwd,
        p_status: form.status || 'ACTIVE',
        p_index_no: form.index_no || '',
        p_school_id: String(schoolId),
        p_father_name: form.father_name || '',
        p_mother_name: form.mother_name || '',
        p_father_phone: form.father_phone || '',
        p_mother_phone: form.mother_phone || '',
        p_guardian_name: form.guardian_name || '',
        p_guardian_phone: form.guardian_phone || '',
        p_phone: form.phone || '',
        p_email: (form.email || '').trim().toLowerCase(),
      });

      const res = await fetch(addUrl, { method: 'GET' });
      let data = null; let raw = '';
      try { raw = await res.text(); data = JSON.parse(raw); } catch {}
      if (!res.ok || data?.ok === false || data?.success === false) {
        const serverMsg = mapOracleError(data?.error || raw) || (data?.error || raw || '').slice(0, 600) || `HTTP ${res.status}`;
        throw new Error(serverMsg);
      }

      setStudents(prev => ([
        ...prev,
        {
          id: pendingStudentId,
          full_name: form.full_name.trim(),
          email: (form.email || '').trim().toLowerCase(),
          class_id: form.class_id,
          status: form.status || 'ACTIVE',
          gender: form.gender || '',
          dob: form.dob || '',
          admission_no: form.admission_no || '',
          index_no: form.index_no || '',
          phone: form.phone || '',
          father_name: form.father_name || '',
          mother_name: form.mother_name || '',
          father_phone: form.father_phone || '',
          mother_phone: form.mother_phone || '',
          guardian_name: form.guardian_name || '',
          guardian_phone: form.guardian_phone || '',
          image_url: finalImageUrl || '',
          role: 'ST',
          created_at: new Date().toISOString(),
          photo_urls: [
            ...(finalImageUrl ? [finalImageUrl] : []),
            ...(photoPreview ? [photoPreview] : []),
          ]
        }
      ]));

      if (form.email) {
        const emailResult = await sendWelcomeEmail({
          full_name: form.full_name.trim(),
          email: (form.email || '').trim().toLowerCase(),
          tempPassword: tempPwd,
          schoolName: SCHOOL_NAME || undefined,
          replyTo: user?.email || user?.EMAIL || undefined,
          subject: `Your ${SCHOOL_NAME || 'SchoolMasterHub'} student account`
        });
        setFormSuccess(
          emailResult.ok
            ? 'Student added successfully. Email sent with login details.'
            : `Student added, but email failed: ${emailResult.error}`
        );
      } else {
        setFormSuccess('Student added successfully.');
      }

      setTimeout(async () => {
        await fetchStudents();
        setIsOpen(false);
        setPendingStudentId(null);
        resetForm();
      }, 800);
    } catch (e) {
      const nice = mapOracleError(e?.message || '');
      setFormError(nice || e.message || 'Failed to add student.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- UPDATE ---------- */
  const submitUpdateStudent = async () => {
    setFormError(''); setFormSuccess('');
    const err = validateForm();
    if (err) { setFormError(err); return; }
    if (!editingId) { setFormError('Missing student ID.'); return; }

    setSubmitting(true);
    try {
      let imageUrlToSave = form.image_url || '';
      if (photoFile && schoolId && editingId) {
        const prevExtMatch = (form.image_url || '').match(/\.(jpg|jpeg|png|webp|gif)$/i);
        const prevExt = prevExtMatch ? prevExtMatch[1].toLowerCase() : null;
        const uploadedExt = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
        const ext = prevExt || uploadedExt;

        const key = buildStudentKey(schoolId, editingId, ext);
        await putToOCI(photoFile, key);
        imageUrlToSave = buildPublicUrl(key);
      }

      await updateStudentRobust({
        studentId: editingId,
        schoolId,
        fullName: form.full_name,
        gender: form.gender,
        imageUrl: imageUrlToSave,
        dob: form.dob,
        classId: form.class_id,
        admissionNo: form.admission_no,
        status: form.status,
        indexNo: form.index_no,
        fatherName: form.father_name,
        motherName: form.mother_name,
        fatherPhone: form.father_phone,
        motherPhone: form.mother_phone,
        guardianName: form.guardian_name,
        guardianPhone: form.guardian_phone,
        phone: form.phone,
        email: form.email,
      });

      setFormSuccess('Student updated successfully.');
      setTimeout(async () => { await fetchStudents(); setIsOpen(false); resetForm(); }, 600);
    } catch (e) {
      const nice = mapOracleError(e?.message || '');
      setFormError(nice || e.message || 'Failed to update student.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Reset password & email (PREMIUM ONLY) ---------- */
  const resetPasswordForStudent = async (studentId, newPassword) => {
    const url = toUrl(RESET_STUDENT_PWD_ENDPOINT, {
      p_student_id: String(studentId),
      p_password: String(newPassword)
    });
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      throw new Error(data?.error || `Failed to reset password (${res.status})`);
    }
    return true;
  };

  const resetAndSend = async (row) => {
    if (planCode !== 'PREMIUM') return; // guard
    if (!row?.id || !row?.email) return;
    if (!window.confirm(`Reset password for ${row.full_name || row.email}?`)) return;

    setFormError(''); setFormSuccess('');
    setResettingId(row.id);
    try {
      const tempPassword = await fetchTempPassword();
      await resetPasswordForStudent(row.id, tempPassword);

      const emailResult = await sendWelcomeEmail({
        full_name: row.full_name || '',
        email: row.email,
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

  /* ---------- Export to Excel ---------- */
  const exportToExcel = () => {
    try {
      const rows = filtered.map((s, idx) => ({
        '#': idx + 1,
        Name: s.full_name,
        Class: getClassName(s.class_id),
        Email: s.email,
        Status: s.status,
        CreatedAt: s.created_at || '',
        Photo: s.image_url || ''
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students');
      const safeName = (SCHOOL_NAME || 'School').replace(/[\\/:*?"<>|]/g, '_');
      const ts = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `${safeName}_Students_${ts}.xlsx`);
    } catch (e) {
      alert(e?.message || 'Failed to export Excel');
    }
  };

  /* ---------- Bulk Import ---------- */
  const openBulk = () => {
    if (planExpired) { setBulkErr('Plan expired — renew to use this feature'); setBulkOpen(true); return; }
    if (isFinite(planMax) && remaining <= 0) { setBulkErr(`Reached ${planHuman} plan student limit`); setBulkOpen(true); return; }
    setBulkErr(''); setBulkOk(''); setBulkFileName('');
    setPreviewRows([]);
    setImporting(false);
    setBulkOpen(true);
  };

  const downloadTemplate = () => {
    const rows = [
      { full_name: 'Ama Boateng', class_id: '1', class_name: '', status: 'ACTIVE', email: 'ama@school.edu', gender: 'F', dob: '2011-06-20', admission_no: '', index_no: '', phone: '', father_name: '', father_phone: '', mother_name: '', mother_phone: '', guardian_name: '', guardian_phone: '', image_url: '' },
      { full_name: 'Kofi Mensah', class_id: '2', class_name: '', status: 'ACTIVE', email: 'kofi@school.edu', gender: 'M', dob: '2012-02-03', admission_no: '', index_no: '', phone: '', father_name: '', father_phone: '', mother_name: '', mother_phone: '', guardian_name: '', guardian_phone: '', image_url: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(rows, { header: ['full_name','class_id','class_name','status','email','gender','dob','admission_no','index_no','phone','father_name','father_phone','mother_name','mother_phone','guardian_name','guardian_phone','image_url'] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'students_import_template.xlsx');
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
        // class may be provided as class_id or class_name
        let class_id = String(r.class_id ?? r.CLASS_ID ?? '').trim();
        const class_name_raw = String(r.class_name ?? r.CLASS_NAME ?? '').trim().toLowerCase();
        if (!class_id && class_name_raw) {
          const mapped = classNameToId.get(class_name_raw);
          if (mapped) class_id = String(mapped);
        }

        const status    = String(r.status || r.STATUS || 'ACTIVE').trim().toUpperCase();
        const email     = String(r.email || r.EMAIL || '').trim().toLowerCase();
        const gender    = String(r.gender || r.GENDER || '').trim().toUpperCase(); // "", "M", "F"
        const dob       = String(r.dob || r.DOB || '').trim();
        const admission_no = String(r.admission_no || r.ADMISSION_NO || '').trim();
        const index_no  = String(r.index_no || r.INDEX_NO || '').trim();
        const phone     = String(r.phone || r.PHONE || '').trim();
        const father_name   = String(r.father_name || r.FATHER_NAME || '').trim();
        const father_phone  = String(r.father_phone || r.FATHER_PHONE || '').trim();
        const mother_name   = String(r.mother_name || r.MOTHER_NAME || '').trim();
        const mother_phone  = String(r.mother_phone || r.MOTHER_PHONE || '').trim();
        const guardian_name = String(r.guardian_name || r.GUARDIAN_NAME || '').trim();
        const guardian_phone= String(r.guardian_phone || r.GUARDIAN_PHONE || '').trim();
        const image_url = String(r.image_url || r.IMAGE_URL || '').trim();

        let valid = true;
        let message = '';

        if (!full_name) { valid = false; message = 'full_name is required'; }
        else if (!class_id) { valid = false; message = 'class_id (or class_name) is required'; }
        else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { valid = false; message = 'email is invalid'; }
        else if (gender && !['M','F'].includes(gender)) { valid = false; message = 'gender must be M/F'; }

        return {
          idx: i+1, full_name, class_id, status, email, gender, dob, admission_no, index_no, phone,
          father_name, father_phone, mother_name, mother_phone, guardian_name, guardian_phone,
          image_url, valid, message, toImport: valid
        };
      });

      const capacity = isFinite(planMax) ? Math.max(0, planMax - studentCount) : Infinity;
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
        const newId = await fetchNextStudentId(toUrl, { token, schoolId });
        const tempPwd = getTempPassword(12);

        const addUrl = toUrl(ADD_STUDENT_ENDPOINT, {
          p_creator_user_id: String(userId),
          p_full_name: r.full_name,
          p_gender: r.gender || '',
          p_image_url: r.image_url || '',
          p_dob: r.dob || '',
          p_class_id: r.class_id,
          p_admission_no: r.admission_no || '',
          p_student_id: String(newId),
          p_role: 'ST',
          p_password: tempPwd,
          p_status: r.status || 'ACTIVE',
          p_index_no: r.index_no || '',
          p_school_id: String(schoolId),
          p_father_name: r.father_name || '',
          p_mother_name: r.mother_name || '',
          p_father_phone: r.father_phone || '',
          p_mother_phone: r.mother_phone || '',
          p_guardian_name: r.guardian_name || '',
          p_guardian_phone: r.guardian_phone || '',
          p_phone: r.phone || '',
          p_email: (r.email || '').trim().toLowerCase(),
        });

        const resp = await fetch(addUrl, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' });
        const body = await resp.text();
        if (!resp.ok) {
          throw new Error(mapOracleError(body) || body || `HTTP ${resp.status}`);
        }
        // parse ok/json structure if present
        try {
          const jj = JSON.parse(body);
          if (jj?.ok === false || jj?.success === false) {
            throw new Error(mapOracleError(jj?.error) || jj?.error || 'Failed');
          }
        } catch { /* some handlers return plain text; ignore */ }

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
    setBulkOk(`Imported ${okCount} student${okCount !== 1 ? 's' : ''}${failCount ? `, ${failCount} failed` : ''}.`);
    setImporting(false);
    await fetchStudents();
  };

  /* ---------- Keyboard helpers ---------- */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) setIsOpen(false);
      if (e.key === 'Enter' && !submitting) {
        if (dialogMode === 'add') submitAddStudent();
        else submitUpdateStudent();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, submitting, form, dialogMode]); // eslint-disable-line

  const addDisabled = submitting || !!validateForm() || !pendingStudentId || planExpired || (isFinite(planMax) && remaining <= 0);
  const editDisabled = submitting || !!validateForm();

  const premiumOnly = planCode !== 'PREMIUM';

  /* ================== Render ================== */
  return (
    <DashboardLayout title="Manage Students" subtitle="">
      {/* Plan banner */}
      <PlanBanner planHuman={planHuman} expiryISO={expiryISO} count={studentCount} max={planMax} />

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
              placeholder="Search name, email, class… (e.g., status:active class:Grade 2 gender:f)"
              className="w-full pl-9 pr-3 py-2 rounded-md text-sm border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Add Button - Full width on mobile */}
          <button
            onClick={openAdd}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium whitespace-nowrap"
          >
            <PlusCircle size={16} />
            <span className="sm:inline">Add New Student</span>
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
              {(filterClass || searchQuery) && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded">
                  {[filterClass, searchQuery].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Desktop Filter Controls */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-3 py-2 rounded-md text-sm border bg-white dark:bg-gray-900 min-w-0"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={String(c.class_id ?? '')} value={String(c.class_id ?? '')}>
                    {c.class_name}
                  </option>
                ))}
              </select>

              <button
                onClick={fetchStudents}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 whitespace-nowrap"
                title="Refresh student list"
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
                      ? `Reached ${planHuman} plan student limit`
                      : 'Import students from Excel'
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
                    <label className="block text-sm font-medium mb-1">Class Filter</label>
                    <select
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className="w-full px-3 py-2 rounded-md text-sm border bg-white dark:bg-gray-900"
                    >
                      <option value="">All Classes</option>
                      {classes.map((c) => (
                        <option key={String(c.class_id ?? '')} value={String(c.class_id ?? '')}>
                          {c.class_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={fetchStudents}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <RotateCcw size={16} /> Refresh Student List
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
        </div>
      </div>

      {/* Status Messages */}
      {loading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading students…
        </div>
      )}
      {loadError && (
        <div className="mb-4 flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{loadError}</span>
        </div>
      )}
      {classesErr && (
        <div className="mb-4 flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{classesErr}</span>
        </div>
      )}


      {/* Responsive Student Display */}
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-indigo-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-gray-100">Student</th>
              <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-gray-100">Class</th>
              <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-gray-100">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-gray-100">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-gray-100">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((s) => (
              <tr key={s.id} className=" hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Avatar urls={s.photo_urls} name={s.full_name} size={40} />
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{s.full_name}</div>
                      <div className="text-xs text-gray-500 truncate">{s.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {getClassName(s.class_id)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setInfoStudent(s); setIsInfoOpen(true); }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 text-xs"
                      title="View details"
                    >
                      <Eye size={12} /> View
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 text-xs"
                      title="Edit student"
                    >
                      <Pencil size={12} /> Edit
                    </button>

                    <button
                      onClick={() => premiumOnly ? null : resetAndSend(s)}
                      disabled={premiumOnly || resettingId === s.id}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border ${premiumOnly ? 'opacity-60 cursor-not-allowed' : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                      title={premiumOnly ? 'Premium plan required for Reset & Send' : 'Reset password & email credentials'}
                    >
                      {resettingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound size={14} />}
                      {resettingId === s.id ? 'Resetting…' : 'Reset & Send'}
                    </button>
                  </div>
                  {premiumOnly && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <Info className="h-3 w-3" /> Reset &amp; Send is a Premium feature
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && !loadError && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <GraduationCap className="h-12 w-12 text-gray-400" />
                    <p>No students found for your filters/search.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {filtered.map((s) => (
          <div key={s.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="flex items-start gap-3 mb-3">
              <Avatar urls={s.photo_urls} name={s.full_name} size={48} />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{s.full_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {getClassName(s.class_id)}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {s.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {s.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{s.email}</span>
                </div>
              )}
              {s.admission_no && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Hash className="h-4 w-4 flex-shrink-0" />
                  <span>Admission: {s.admission_no}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setInfoStudent(s); setIsInfoOpen(true); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 text-sm flex-1 justify-center sm:flex-none"
              >
                <Eye size={14} /> View
              </button>
              <button
                onClick={() => openEdit(s)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 text-sm flex-1 justify-center sm:flex-none"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => premiumOnly ? null : resetAndSend(s)}
                disabled={premiumOnly || resettingId === s.id}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border ${premiumOnly ? 'opacity-60 cursor-not-allowed' : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                title={premiumOnly ? 'Premium plan required for Reset & Send' : 'Reset password & email credentials'}
              >
                {resettingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound size={14} />}
                {resettingId === s.id ? 'Resetting…' : 'Reset & Send'}
              </button>
              {premiumOnly && (
                <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <Info className="h-3 w-3" /> Reset &amp; Send is a Premium feature
                </div>
              )}
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && !loadError && (
          <div className="text-center py-12">
            <GraduationCap className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No students found</p>
            <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => (submitting ? null : setIsOpen(false))} />
          <div className="relative z-10 h-full overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-2xll shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                  <h3 className="text-lg font-semibold">{dialogMode === 'add' ? 'Add Student' : 'Edit Student'}</h3>
                  <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => (submitting ? null : setIsOpen(false))}>
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="px-6 py-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Photo */}
                    <div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Photo</span>
                      <div className="mt-2 flex items-center gap-3">
                        <Avatar urls={[...(photoPreview ? [photoPreview] : [])]} name={form.full_name} size={40} />
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          {dialogMode === 'add' ? 'Upload Image' : 'Change Image'}
                        </button>
                      </div>
                    </div>

                    {/* Basics */}
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
                        placeholder="student@school.edu"
                      />
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="grid gap-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Class</span>
                        <select
                          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                          value={String(form.class_id || '')}
                          onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}
                        >
                          <option value="">Select a class</option>
                          {classes.map(c => (
                            <option key={String(c.class_id ?? '')} value={String(c.class_id ?? '')}>
                              {c.class_name}
                            </option>
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
                          <option value="TRANSFERRED">TRANSFERRED</option>
                          <option value="GRADUATED">GRADUATED</option>
                        </select>
                      </label>
                    </div>

                    {/* More details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="grid gap-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Gender</span>
                        <select
                          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                          value={form.gender}
                          onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                        >
                          <option value="">Select</option>
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                        </select>
                      </label>

                      <label className="grid gap-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Date of Birth</span>
                        <input
                          type="date"
                          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                          value={form.dob}
                          onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="grid gap-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Admission #</span>
                        <input
                          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                          value={form.admission_no}
                          onChange={(e) => setForm((f) => ({ ...f, admission_no: e.target.value }))}
                        />
                      </label>

                      <label className="grid gap-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Index #</span>
                        <input
                          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                          value={form.index_no}
                          onChange={(e) => setForm((f) => ({ ...f, index_no: e.target.value }))}
                        />
                      </label>
                    </div>

                    <label className="grid gap-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Phone</span>
                      <input
                        className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="e.g. 024..."
                      />
                    </label>

                    {/* Parents & Guardians */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="grid gap-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Father's Name</span>
                        <input
                          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                          value={form.father_name}
                          onChange={(e) => setForm((f) => ({ ...f, father_name: e.target.value }))}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Father's Phone</span>
                        <input
                          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                          value={form.father_phone}
                          onChange={(e) => setForm((f) => ({ ...f, father_phone: e.target.value }))}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Mother's Name</span>
                        <input
                          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                          value={form.mother_name}
                          onChange={(e) => setForm((f) => ({ ...f, mother_name: e.target.value }))}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Mother's Phone</span>
                        <input
                          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                          value={form.mother_phone}
                          onChange={(e) => setForm((f) => ({ ...f, mother_phone: e.target.value }))}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Guardian's Name</span>
                        <input
                          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                          value={form.guardian_name}
                          onChange={(e) => setForm((f) => ({ ...f, guardian_name: e.target.value }))}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Guardian's Phone</span>
                        <input
                          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                          value={form.guardian_phone}
                          onChange={(e) => setForm((f) => ({ ...f, guardian_phone: e.target.value }))}
                        />
                      </label>
                    </div>

                    {formError && (
                      <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                        <AlertCircle className="mt-0.5 h-4 w-4" />
                        <span className="text-sm">{formError}</span>
                      </div>
                    )}
                    {formSuccess && (
                      <div className="flex items-start gap-2 text-emerald-700 bg-emerald-50 border-emerald-200 rounded-lg p-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4" />
                        <span className="text-sm">{formSuccess}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2 flex-shrink-0">
                  <button className="px-4 py-2 rounded-lg border" onClick={() => (submitting ? null : setIsOpen(false))} disabled={submitting}>
                    Cancel
                  </button>

                  {dialogMode === 'add' ? (
                    <button
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                      onClick={submitAddStudent}
                      disabled={addDisabled}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                      {submitting ? 'Adding…' : 'Add Student'}
                    </button>
                  ) : (
                    <button
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                      onClick={submitUpdateStudent}
                      disabled={editDisabled}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                      {submitting ? 'Updating…' : 'Update Student'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Dialog */}
      {isInfoOpen && infoStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <Avatar urls={infoStudent.photo_urls} name={infoStudent.full_name} size={80} />
                <div>
                  <div className="text-lg font-semibold">{infoStudent.full_name}</div>
                  <div className="text-xs text-gray-500">{getClassName(infoStudent.class_id)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {infoStudent.status}
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

            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Profile */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <UserCircle2 className="h-4 w-4 text-indigo-600" />
                    <h4 className="text-sm font-semibold">Profile</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoLine label="Full Name" value={infoStudent.full_name} />
                    <InfoLine
                      label="Gender"
                      value={
                        infoStudent.gender === 'M' ? 'Male'
                          : infoStudent.gender === 'F' ? 'Female'
                          : infoStudent.gender
                      }
                    />
                    <InfoLine label="Date of Birth" value={infoStudent.dob} />
                    <InfoLine label="Status" value={infoStudent.status} />
                    <InfoLine label="Role" value="Student" />
                    <InfoLine label="Created At" value={infoStudent.created_at} />
                  </div>
                </div>

                {/* Class & IDs */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Hash className="h-4 w-4 text-indigo-600" />
                    <h4 className="text-sm font-semibold">Class & IDs</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoLine label="Class" value={getClassName(infoStudent.class_id)} />
                    <InfoLine label="Admission #" value={infoStudent.admission_no} />
                    <InfoLine label="Index #" value={infoStudent.index_no} />
                  </div>
                </div>

                {/* Student Contact */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Phone className="h-4 w-4 text-indigo-600" />
                    <h4 className="text-sm font-semibold">Student Contact</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoLine label="Phone" value={infoStudent.phone} />
                    <InfoLine label="Email" value={infoStudent.email} />
                  </div>
                </div>

                {/* Parents & Guardians */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-indigo-600" />
                    <h4 className="text-sm font-semibold">Parents & Guardians</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoLine label="Father's Name" value={infoStudent.father_name} />
                    <InfoLine label="Father's Phone" value={infoStudent.father_phone} />
                    <InfoLine label="Mother's Name" value={infoStudent.mother_name} />
                    <InfoLine label="Mother's Phone" value={infoStudent.mother_phone} />
                    <InfoLine label="Guardian's Name" value={infoStudent.guardian_name} />
                    <InfoLine label="Guardian's Phone" value={infoStudent.guardian_phone} />
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

      {/* Bulk Import Dialog */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => (bulkBusy || importing) ? null : setBulkOpen(false)} />
          <div className="relative z-10 h-full overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-semibold">Bulk Import Students</h3>
                  <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => (bulkBusy || importing) ? null : setBulkOpen(false)}>
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="px-6 py-4 space-y-4 overflow-y-auto">
                  <div className="rounded-lg border p-3 text-sm bg-indigo-50/60 dark:bg-indigo-900/20 dark:border-indigo-900/40">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 text-indigo-600" />
                      <div>
                        <div>Upload an <strong>.xlsx</strong> file with headers: <code>full_name</code>, <code>class_id</code> (or <code>class_name</code>), <code>status</code>, <code>email</code>, <code>gender</code> (M/F), <code>dob</code> (YYYY-MM-DD), and optional contact fields.</div>
                        <div className="mt-1">Your plan: <strong>{planHuman}</strong>. Remaining capacity: <strong>{isFinite(remaining) ? remaining : 'unlimited'}</strong>.</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={downloadTemplate}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Download size={16} /> Download Template
                    </button>

                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 cursor-pointer">
                      <Upload size={16} /> Choose File
                      <input type="file" accept=".xlsx" className="hidden" onChange={handleBulkFile} />
                    </label>

                    {bulkFileName && <span className="text-sm text-gray-600">Selected: {bulkFileName}</span>}
                  </div>

                  {bulkErr && (
                    <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                      <AlertCircle className="mt-0.5 h-4 w-4" />
                      <span className="text-sm">{bulkErr}</span>
                    </div>
                  )}
                  {bulkOk && (
                    <div className="flex items-start gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4" />
                      <span className="text-sm">{bulkOk}</span>
                    </div>
                  )}

                  {/* Preview table */}
                  {previewRows.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-left">Full Name</th>
                            <th className="px-3 py-2 text-left">Class ID</th>
                            <th className="px-3 py-2 text-left">Email</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Gender</th>
                            <th className="px-3 py-2 text-left">Result</th>
                            <th className="px-3 py-2 text-left">Import?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((r) => (
                            <tr key={r.idx} className="border-t">
                              <td className="px-3 py-2">{r.idx}</td>
                              <td className="px-3 py-2">{r.full_name}</td>
                              <td className="px-3 py-2">{r.class_id}</td>
                              <td className="px-3 py-2">{r.email}</td>
                              <td className="px-3 py-2">{r.status}</td>
                              <td className="px-3 py-2">{r.gender}</td>
                              <td className="px-3 py-2">
                                {r.message ? (
                                  <span className={`inline-flex text-[11px] px-2 py-0.5 rounded ${/imported/i.test(r.message) ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    {r.message}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={!!r.toImport}
                                  onChange={(e) => {
                                    setPreviewRows(prev => prev.map(x => x.idx === r.idx ? { ...x, toImport: e.target.checked && x.valid } : x));
                                  }}
                                  disabled={!r.valid || importing}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded-lg border"
                    onClick={() => (bulkBusy || importing) ? null : setBulkOpen(false)}
                    disabled={bulkBusy || importing}
                  >
                    Close
                  </button>
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
                    onClick={doImport}
                    disabled={importing || previewRows.filter(r => r.toImport && r.valid).length === 0}
                  >
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {importing ? 'Importing…' : `Import ${previewRows.filter(r => r.toImport && r.valid).length}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ---------- Small components ---------- */
function InfoLine({ label, value }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export function PlanBanner({ planHuman, expiryISO, count, max, label = 'Records', storageKey = 'plan-banner' }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      const v = sessionStorage.getItem(storageKey);
      if (v === '1') setHidden(true);
    } catch {}
  }, [storageKey]);

  if (hidden) return null;

  const expired = (() => {
    if (!expiryISO) return false;
    const d = new Date(expiryISO);
    return isFinite(d.getTime()) && d.getTime() < Date.now();
  })();

  const limited = isFinite(max);
  const remaining = limited ? Math.max(0, max - count) : Infinity;

  const base = 'mb-4 rounded-xl border p-4 relative';
  const lightClasses = expired
    ? 'bg-red-50 border-red-200 text-red-800'
    : 'bg-gray-50 border-gray-200 text-gray-800';
  const darkClasses = expired
    ? 'dark:bg-red-900/20 dark:border-red-900/40 dark:text-red-200'
    : 'dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100';

  return (
    <div className={`${base} ${lightClasses} ${darkClasses}`}>
      {/* Close (X) */}
      <button
        aria-label="Dismiss"
        onClick={() => {
          setHidden(true);
          try { sessionStorage.setItem(storageKey, '1'); } catch {}
        }}
        className="absolute right-2 top-2 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <div className="text-sm">
            Plan: <strong>{planHuman}</strong>{' '}
            {limited ? (
              <>
                • {label}:{' '}
                <strong>{count}</strong> / <strong>{max}</strong>{' '}
                (remaining <strong>{remaining}</strong>)
              </>
            ) : (
              <>
                • {label}:{' '}
                <strong>{count}</strong> / <strong>unlimited</strong>
              </>
            )}
            {expiryISO ? (
              <> • Expires: <strong>{new Date(expiryISO).toLocaleDateString()}</strong></>
            ) : null}
            {expired ? (
              <span className="ml-2 inline-flex px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs dark:bg-red-900/40 dark:text-red-200">
                Expired
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

