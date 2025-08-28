// src/pages/ManageStudentsPage.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { PlusCircle, X, Mail, UserCircle2,
   Loader2, CheckCircle2, AlertCircle, RefreshCcw as RotateCcw, Pencil,
   Download, Search, KeyRound, Eye, Image as ImageIcon, Printer,
   Hash, Users, Phone } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../AuthContext';
import { getTempPassword } from '../lib/passwords';
import { buildPublicUrl, putToOCI } from '../config/storage';

// ===== ORDS endpoints (absolute) =====
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

// ===== Email sender (same as staff) =====
const EMAIL_API_BASE = 'https://schoolmasterhub.vercel.app';

// ===== Safe URL builder (same as staff) =====
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

// ===== Helpers (mirrors staff) =====
const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || 'ST';

function mapOracleError(errText = '') {
  const t = String(errText);
  if (/ORA-00001/i.test(t)) return 'Duplicate detected (unique constraint).';
  if (/ORA-01400/i.test(t)) return 'A required column was empty. Check all required fields.';
  if (/ORA-06502|numeric or value error/i.test(t)) return 'Value too long or wrong data type (check field lengths).';
  if (/ORA-12899/i.test(t)) return 'One of the values exceeds the column size. Shorten and try again.';
  if (/ORA-01036|illegal variable name|number/i.test(t)) return 'Backend bind variables mismatch (check parameter names).';
  if (/ORA-00904|invalid identifier/i.test(t)) return 'Backend column/parameter name mismatch.';
  if (/ORA-00907|missing right parenthesis|ORA-00933|ORA-00936/i.test(t)) return 'Backend SQL syntax error.';
  return null;
}

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
      title={name || 'Student'}
    >
      {initials(name)}
    </div>
  );
};

// Build a stable object key for student photos in OCI
const buildStudentKey = (schoolId, studentId, ext = 'jpg') =>
  `schools/${schoolId}/students/${studentId}.${ext}`;

// Robust "next id" fetch (like staff)
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

// Fetch temp password from ORDS (fallback to local generator)
async function fetchTempPassword() {
  try {
    const res = await fetch(TEMP_PASS_ENDPOINT, { headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.tempPassword) return data.tempPassword;
  } catch { /* ignore */ }
  return getTempPassword(12);
}

// ===== Component =====
export default function ManageStudentsPage() {
  const { token, user, API_BASE } = useAuth();
  const { toUrl } = useApiJoin(API_BASE);

  const schoolId =
    user?.school_id ?? user?.schoolId ?? user?.school?.id ?? user?.schoolID ?? user?.SCHOOL_ID ?? null;
  const userId = user?.user_id ?? user?.id ?? user?.USER_ID ?? null;

  const SCHOOL_NAME =
    user?.school?.name ?? user?.school_name ?? user?.SCHOOL_NAME ?? user?.orgName ?? user?.organisation ?? '';

  // State
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [classesErr, setClassesErr] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Photo (UI only – URL hidden, we upload to OCI)
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const fileInputRef = useRef(null);

  // Reset password
  const [resettingId, setResettingId] = useState(null);

  // Info dialog
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [infoStudent, setInfoStudent] = useState(null);

  // Pre-allocated id (like staff)
  const [pendingStudentId, setPendingStudentId] = useState(null);

  // ===== Fetch students =====
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

        // chain of photo candidates (no URL text shown anywhere)
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

  // ===== Fetch classes (for filter + labels) =====
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

  // ===== Filtering & search (expanded to search entire "report") =====
  const classIdToName = useMemo(() => {
    const m = new Map();
    for (const c of classes) {
      const id = String(c.class_id ?? '');
      m.set(id, c.class_name || id);
    }
    return m;
  }, [classes]);

  const getClassName = (id) => classIdToName.get(String(id ?? '')) || String(id ?? '');

  // ---- Search helpers: full-report search & fielded queries ----
  const normalize = (v) => String(v ?? '').toLowerCase();

  const genderLabel = (g) =>
    g === 'M' ? 'male' : (g === 'F' ? 'female' : normalize(g));

  function studentMatchesQuery(s, q, getClassNameFn) {
    const haystack = [
      s.full_name,
      s.email,
      getClassNameFn(s.class_id),
      s.status,
      genderLabel(s.gender),
      s.admission_no,
      s.index_no,
      s.phone,
      s.father_name,
      s.father_phone,
      s.mother_name,
      s.mother_phone,
      s.guardian_name,
      s.guardian_phone,
      s.created_at,
      s.id
    ].map(normalize).join(' ');

    const tokens = normalize(q).split(/\s+/).filter(Boolean); // AND across tokens

    return tokens.every(tok => {
      const m = tok.match(/^(\w+):(.*)$/); // field:value
      if (m) {
        const [, field, valRaw] = m;
        const val = valRaw.trim();
        const v = normalize(val);

        switch (field) {
          case 'name':     return normalize(s.full_name).includes(v);
          case 'email':    return normalize(s.email).includes(v);
          case 'class':    return normalize(getClassNameFn(s.class_id)).includes(v);
          case 'status':   return normalize(s.status).includes(v);
          case 'gender':   return genderLabel(s.gender).startsWith(v); // m/f/male/female
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
          default:         return haystack.includes(tok); // fallback
        }
      }
      // plain token
      return haystack.includes(tok);
    });
  }

  const filtered = useMemo(() => {
    let list = students;

    if (filterClass) {
      list = list.filter(s => String(s.class_id) === String(filterClass));
    }

    if (searchQuery.trim()) {
      list = list.filter(s => studentMatchesQuery(s, searchQuery, getClassName));
    }

    return list;
  }, [students, filterClass, searchQuery, getClassName]);

  // ===== Utilities (like staff) =====
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
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Valid email is required';
    return '';
  };

  // ===== Robust UPDATE (form-urlencoded → GET → JSON), includes full param set =====
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

    // 1) POST x-www-form-urlencoded
    try {
      const r = await fetch(UPDATE_STUDENT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeForm(mustParams),
      });
      const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
      if (r.ok && (j == null || j?.success !== false)) return true;
    } catch {}

    // 2) GET with query
    try {
      const getUrl = toUrl(UPDATE_STUDENT_ENDPOINT, mustParams);
      const r = await fetch(getUrl, { method: 'GET' });
      const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
      if (r.ok && (j == null || j?.success !== false)) return true;
    } catch {}

    // 3) POST JSON
    const r = await fetch(UPDATE_STUDENT_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mustParams),
    });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
    if (r.ok && (j == null || j?.success !== false)) return true;
    throw new Error((j?.error || t || `HTTP ${r.status}`).slice(0, 800));
  };

  // ===== Dialog open helpers (mirror staff) =====
  const resetForm = () => {
    setForm({
      full_name: '', email: '', class_id: '', status: 'ACTIVE',
      gender: '', dob: '', admission_no: '', index_no: '', phone: '',
      father_name: '', mother_name: '', father_phone: '', mother_phone: '',
      guardian_name: '', guardian_phone: '',
      image_url: '',
      _password: '', // hidden temp password
    });
    setPhotoFile(null);
    setPhotoPreview('');
    setFormError(''); setFormSuccess('');
    setEditingId(null); setDialogMode('add');
  };

  const openAdd = async () => {
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
      // keep password hidden in UI; store internally
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
      _password: '', // not used on edit
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

  // ===== ADD (pre-id + ORDS temp password + OCI upload + GET call) =====
  const submitAddStudent = async () => {
    setFormError(''); setFormSuccess('');
    const err = validateForm();
    if (err) { setFormError(err); return; }
    if (!userId) { setFormError('Missing current user ID. Please re-login.'); return; }
    if (!pendingStudentId) { setFormError('Unable to allocate a new Student ID. Please try again.'); return; }
    const tempPwd = form._password || generateTempPassword();

    setSubmitting(true);
    try {
      // Upload to OCI if a file was picked; save the public URL
      let finalImageUrl = form.image_url || '';
      if (photoFile && schoolId && pendingStudentId) {
        const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
        const key = buildStudentKey(schoolId, pendingStudentId, ext);
        await putToOCI(photoFile, key);                // uploads/overwrites
        finalImageUrl = buildPublicUrl(key);           // make it public
      }

      // Call ADD endpoint with full param set (including p_image_url)
      const addUrl = toUrl(ADD_STUDENT_ENDPOINT, {
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
      if (!res.ok || data?.success === false) {
        const serverMsg = (data?.error || raw || '').slice(0, 600) || `HTTP ${res.status}`;
        throw new Error(serverMsg);
      }

      // Update UI immediately (like staff)
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

      // Email credentials (same pattern as staff)
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

  // ===== UPDATE (allow replacing the image and save new URL) =====
  const submitUpdateStudent = async () => {
    setFormError(''); setFormSuccess('');
    const err = validateForm();
    if (err) { setFormError(err); return; }
    if (!editingId) { setFormError('Missing student ID.'); return; }

    setSubmitting(true);
    try {
      // Default to current URL
      let imageUrlToSave = form.image_url || '';

      // If a new file was chosen, upload and replace
      if (photoFile && schoolId && editingId) {
        const prevExtMatch = (form.image_url || '').match(/\.(jpg|jpeg|png|webp|gif)$/i);
        const prevExt = prevExtMatch ? prevExtMatch[1].toLowerCase() : null;
        const uploadedExt = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
        const ext = prevExt || uploadedExt;

        const key = buildStudentKey(schoolId, editingId, ext);
        await putToOCI(photoFile, key);               // overwrites same object
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

  // ===== Reset password & email (use ORDS temp pass for parity) =====
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

  // ===== Export to Excel (match staff’s columns shape) =====
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

  // ===== Keyboard helpers (same as staff) =====
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

  const addDisabled = submitting || !!validateForm() || !pendingStudentId;
  const editDisabled = submitting || !!validateForm();

  // ===== Render (copied look from ManageStaff) =====
  return (
    <DashboardLayout title="Manage Students" subtitle="View, filter, edit, and manage student records">
      {/* Toolbar */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Class filter like staff’s role filter */}
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-4 py-2 rounded-md text-sm border bg-white dark:bg-gray-900"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={String(c.class_id ?? '')} value={String(c.class_id ?? '')}>
                {c.class_name}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, class, status… (e.g., status:active class:Grade 2 gender:f)"
              className="pl-9 pr-3 py-2 w-64 rounded-md text-sm border bg-white dark:bg-gray-900"
            />
          </div>

          <button
            onClick={fetchStudents}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Refresh list"
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
          <PlusCircle size={16} /> Add New Student
        </button>
      </div>

      {/* Status */}
      {loading && <div className="mb-4 text-sm text-gray-600">Loading students…</div>}
      {loadError && (
        <div className="mb-4 flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span className="text-sm">{loadError}</span>
        </div>
      )}
      {classesErr && (
        <div className="mb-4 flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span className="text-sm">{classesErr}</span>
        </div>
      )}

      {/* Table (same columns shape as staff: Student | Class | Email | Status | Actions) */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-indigo-100 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar urls={s.photo_urls} name={s.full_name} />
                    <span>{s.full_name}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {getClassName(s.class_id)}
                  </span>
                </td>
                <td className="px-4 py-2">{s.email}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setInfoStudent(s); setIsInfoOpen(true); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800"
                      title="View details"
                    >
                      <Eye size={14} /> View
                    </button>

                    <button
                      onClick={() => openEdit(s)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800"
                      title="Edit student"
                    >
                      <Pencil size={14} /> Edit
                    </button>

                    <button
                      onClick={() => resetAndSend(s)}
                      disabled={resettingId === s.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-60"
                      title="Reset password & email credentials"
                    >
                      {resettingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound size={14} />}
                      {resettingId === s.id ? 'Resetting…' : 'Reset & Send'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && !loadError && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  No students found for your filters/search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Dialog (scrollable & responsive) */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => (submitting ? null : setIsOpen(false))}
          />
          {/* Scroll container */}
          <div className="relative z-10 h-full overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                  <h3 className="text-lg font-semibold">{dialogMode === 'add' ? 'Add Student' : 'Edit Student'}</h3>
                  <button
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => (submitting ? null : setIsOpen(false))}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body (scrollable) */}
                <div className="px-6 py-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Photo */}
                    <div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Photo</span>
                      <div className="mt-2 flex items-center gap-3">
                        <Avatar
                          urls={[...(photoPreview ? [photoPreview] : [])]}
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
                      <div className="flex items-start gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4" />
                        <span className="text-sm">{formSuccess}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer (sticks below body content) */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2 flex-shrink-0">
                  <button className="px-4 py-2 rounded-lg border" onClick={() => (submitting ? null : setIsOpen(false))} disabled={submitting}>
                    Cancel
                  </button>

                  {dialogMode === 'add' ? (
                    <button
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                      onClick={submitAddStudent}
                      disabled={submitting || !!validateForm() || !pendingStudentId}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                      {submitting ? 'Adding…' : 'Add Student'}
                    </button>
                  ) : (
                    <button
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                      onClick={submitUpdateStudent}
                      disabled={submitting || !!validateForm()}
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

      {/* Info Dialog (already scrollable, just ensure container can't exceed viewport) */}
      {isInfoOpen && infoStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <Avatar urls={infoStudent.photo_urls} name={infoStudent.full_name} size={120} />
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
                        infoStudent.gender === 'M'
                          ? 'Male'
                          : infoStudent.gender === 'F'
                          ? 'Female'
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
