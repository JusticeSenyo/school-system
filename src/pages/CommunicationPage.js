// src/pages/CommunicationPage.js
import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import {
  Mail, MessageSquare, Send, Loader2, Users, Building2, Inbox,
  CheckCircle2, UserCheck2, Shield, AlertCircle, Info, X
} from 'lucide-react';
import { useAuth } from '../AuthContext';

/* -------- ORDS HOST & endpoints -------- */
const HOST = "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

/* lookups */
const ACADEMIC_CLASSES_API = `${HOST}/academic/get/classes/`;
const SCHOOL_INFO_API      = `${HOST}/academic/get/school/`;

/* directories (GET) */
const STAFF_API    = `${HOST}/staff/get/staff/`;      // ?p_school_id=&p_role=
const STUDENTS_API = `${HOST}/student/get/students/`; // ?p_school_id=&p_class_id=

/* comms (persisted dashboard messages) */
const COMMS_CREATE_DASH_API = `${HOST}/comms/dashboard/message/`; // POST
const COMMS_SENT_API        = `${HOST}/comms/dashboard/sent/`;    // GET ?p_school_id=&p_created_by=

/* transactional SMS (GET) */
const SEND_SMS_API = `${HOST}/comms/send/sms/`; // GET p_contact, p_msg

/* staff role labels & options (Admin removed from LOV) */
const ROLE_LABELS = { HT: 'HeadTeacher', TE: 'Teacher', AC: 'Accountant' };
const FIXED_ROLE_CODES = ['HT','TE','AC'];

/* ------------ helpers ------------ */
const jtxt = async (u, init) => {
  const r = await fetch(u, { cache: 'no-store', headers: { Accept: 'application/json' }, ...init });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.text()).trim();
};
const jarr = async (u) => {
  const t = await jtxt(u); if (!t) return [];
  try { const d = JSON.parse(t); return Array.isArray(d) ? d : (Array.isArray(d.items) ? d.items : []); } catch { return []; }
};
const jobj = async (u, body) => {
  const r = await fetch(u, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body || {})
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${t}`);
  try { return JSON.parse(t || '{}'); } catch { return {}; }
};

const csv  = (arr) => arr.filter(Boolean).join(',');
const uniq = (arr) => [...new Set(arr.filter(Boolean))];
const listToCsv = (list) => csv(uniq(list));
const splitCsv = (s) => (s || '').split(/[;,\s]+/).map(x => x.trim()).filter(Boolean);

// Convert to local Ghana format for SMS API (expects 0XXXXXXXXX)
const toLocalGh = (p) => {
  if (!p) return '';
  const d = String(p).replace(/[^\d]/g, '');
  if (d.startsWith('233') && d.length === 12) return '0' + d.slice(3);
  if (d.startsWith('0')   && d.length === 10) return d;
  return d;
};

// Send SMS one-by-one using ?p_contact=&p_msg=
async function sendSmsBatch(numbersCsv, message) {
  const arr = uniq(splitCsv(numbersCsv).map(toLocalGh)).filter(Boolean);
  for (const num of arr) {
    await fetch(`${SEND_SMS_API}?p_contact=${encodeURIComponent(num)}&p_msg=${encodeURIComponent(message)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
  }
}

/* -------- Client → Serverless email helper (no keys in browser) -------- */
async function sendEmailViaApi(toCsv, subject, message, fromName) {
  const recipients = uniq(splitCsv(toCsv));
  if (!recipients.length) return;

  const CHUNK = 500;
  for (let i = 0; i < recipients.length; i += CHUNK) {
    const chunk = recipients.slice(i, i + CHUNK);

    const resp = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: chunk, subject, message, fromName }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || 'Email send failed');
    }
    const data = await resp.json();
    if (!data?.success) throw new Error(data?.error || 'Email send failed');
  }
}

function isDateExpired(isoOrDateString) {
  if (!isoOrDateString) return false;
  const d = new Date(String(isoOrDateString));
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  // compare at day precision
  return d.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

/* ---- Plan helpers to humanize plan like Manage Staff ---- */
const PLAN_NAME_BY_CODE = (raw) => {
  const v = String(raw ?? '').trim().toUpperCase();
  if (v === '1' || v === 'BASIC') return 'BASIC';
  if (v === '2' || v === 'STANDARD') return 'STANDARD';
  if (v === '3' || v === 'PREMIUM' || v === 'PREMUIM') return 'PREMIUM';
  return 'BASIC';
};
const HUMAN_PLAN = (code) => ({ BASIC: 'Basic', STANDARD: 'Standard', PREMIUM: 'Premium' }[code] || 'Basic');

/* ------------ page ------------ */
export default function CommunicationPage() {
  const { user } = useAuth() || {};
  const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? 1;
  const staffId  = user?.staff_id ?? user?.id ?? 0;
  const schoolName =
    (user?.school?.name || user?.school_name || user?.schoolName || 'School Master Hub').toString().toUpperCase();

  /* --- package + expiry gating --- */
  const [pkgName, setPkgName] = useState("");
  const [expiryRaw, setExpiryRaw] = useState("");
  const [pkgLoaded, setPkgLoaded] = useState(false);
  const [showPlan, setShowPlan] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const rows = await jarr(SCHOOL_INFO_API);
        const s = rows.find(r => String(r.school_id ?? r.SCHOOL_ID) === String(schoolId));
        const p = (s?.package ?? s?.PACKAGE ?? "").toString();
        const exp = s?.expiry ?? s?.EXPIRY ?? "";
        setPkgName(p);
        setExpiryRaw(exp);
      } catch {
        setPkgName(""); setExpiryRaw("");
      } finally {
        setPkgLoaded(true);
      }
    })();
  }, [schoolId]);

  const planHuman = HUMAN_PLAN(PLAN_NAME_BY_CODE(pkgName));
  const isExpired = isDateExpired(expiryRaw);
  const isPremium = String(pkgName).trim().toLowerCase() === "premium";
  const canUseSms = isPremium && !isExpired;
  const canUseParentsDashboard = isPremium && !isExpired;

  /* tabs */
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'class' | 'parents'

  /* classes (used by Class & Parents tabs) */
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await jarr(`${ACADEMIC_CLASSES_API}?p_school_id=${schoolId}`);
        const norm = rows.map(r => ({
          class_id: r.class_id ?? r.CLASS_ID ?? r.id ?? r.ID,
          class_name: r.class_name ?? r.CLASS_NAME ?? r.name ?? r.NAME,
        })).filter(x=>x.class_id!=null);
        setClasses(norm);
        if (!classId) setClassId('ALL');
      } catch {
        setClasses([]);
      }
    })();
    // eslint-disable-next-line
  }, [schoolId]);

  /* Recently Sent (dashboard persisted) */
  const [sentList, setSentList] = useState([]);
  const loadSent = async () => {
    try {
      const rows = await jarr(`${COMMS_SENT_API}?p_school_id=${schoolId}&p_created_by=${staffId}`);
      setSentList(rows);
    } catch {
      setSentList([]);
    }
  };
  useEffect(() => { loadSent(); /* eslint-disable-next-line */ }, [schoolId, staffId]);

  /* status (shared) */
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  /* ---------- STAFF TAB ---------- */
  const [staffSubject, setStaffSubject] = useState('');
  const [staffMessage, setStaffMessage] = useState('');
  const [staffVia, setStaffVia] = useState({ dashboard: true, email: false, sms: false });
  const toggleStaffVia = (k) => setStaffVia(prev => {
    if (isExpired) return prev; // block toggle when expired
    if (k === 'sms' && !canUseSms) return prev;
    return ({ ...prev, [k]: !prev[k] });
  });

  const [staffRoles, setStaffRoles] = useState([]); // merged list (Admin removed)
  const [staffRole, setStaffRole] = useState('');   // '' = all

  const [staffEmails, setStaffEmails] = useState('');
  const [staffPhones, setStaffPhones] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const rows = await jarr(`${STAFF_API}?p_school_id=${schoolId}`);
        const apiCodes = uniq(rows.map(r => (r.role ?? r.ROLE ?? '')).filter(Boolean));
        const merged = [...FIXED_ROLE_CODES, ...apiCodes.filter(c => !FIXED_ROLE_CODES.includes(c))];
        const filtered = merged.filter(c => String(c).toUpperCase() !== 'AD');
        setStaffRoles(filtered);
      } catch {
        setStaffRoles(FIXED_ROLE_CODES);
      }
    })();
  }, [schoolId]);

  useEffect(() => {
    (async () => {
      try {
        const url = `${STAFF_API}?p_school_id=${schoolId}` + (staffRole ? `&p_role=${encodeURIComponent(staffRole)}` : '');
        const staffRows = (await jarr(url)).map(r => ({
          email: r.email || r.EMAIL || '',
          phone: r.phone || r.PHONE || ''
        }));
        const emails = listToCsv(staffRows.map(r => r.email).filter(Boolean));
        const phones = listToCsv(staffRows.map(r => toLocalGh(r.phone)).filter(Boolean));
        setStaffEmails(emails);
        setStaffPhones(phones);
      } catch {
        setStaffEmails('');
        setStaffPhones('');
      }
    })();
  }, [schoolId, staffRole]);

  const submitStaff = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    if (isExpired) { setErr('Plan expired. Please renew to send messages.'); return; }
    if (!staffSubject.trim() || !staffMessage.trim()) { setErr('Subject and Message are required.'); return; }
    if (!staffVia.dashboard && !staffVia.email && !staffVia.sms) { setErr('Select at least one channel.'); return; }
    if (staffVia.sms && !canUseSms) { setErr('Upgrade to use SMS.'); return; }

    setSending(true);
    try {
      // dashboard persist (allowed if not expired)
      if (staffVia.dashboard) {
        await jobj(COMMS_CREATE_DASH_API, {
          p_school_id: schoolId,
          p_subject: staffSubject.trim(),
          p_body: staffMessage.trim(),
          p_target_type: 'ALL_TEACHERS',
          p_class_id: null,
          p_target_role: staffRole || null,
          p_created_by: staffId,
          p_expires_at: null,
          p_has_email: staffVia.email ? 'Y' : 'N',
          p_has_sms:   staffVia.sms   ? 'Y' : 'N'
        });
      }

      if (staffVia.sms && canUseSms) {
        const numsCsv = (staffPhones || '').trim();
        if (numsCsv) await sendSmsBatch(numsCsv, staffMessage);
      }

      if (staffVia.email) {
        const emailsCsv = (staffEmails || '').trim();
        if (emailsCsv) {
          await sendEmailViaApi(
            emailsCsv,
            staffSubject,
            staffMessage,
            schoolName
          );
        }
      }

      setOk('Message dispatched to Staff.');
      setStaffSubject(''); setStaffMessage('');
      setStaffVia(v => ({ ...v, email: false, sms: false }));
      await loadSent();
    } catch (ex) {
      setErr(ex?.message || 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  /* ---------- CLASS TAB (premium only) ---------- */
  const [classSubject, setClassSubject] = useState('');
  const [classMessage, setClassMessage] = useState('');

  const submitClass = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    if (isExpired) { setErr('Plan expired. Please renew to send messages.'); return; }
    if (!canUseParentsDashboard) { setErr('Upgrade to use this feature.'); return; }
    if (!classId) { setErr('Choose a class.'); return; }
    if (!classSubject.trim() || !classMessage.trim()) { setErr('Subject and Message are required.'); return; }

    setSending(true);
    try {
      await jobj(COMMS_CREATE_DASH_API, {
        p_school_id: schoolId,
        p_subject: classSubject.trim(),
        p_body: classMessage.trim(),
        p_target_type: classId === 'ALL' ? 'ALL_STUDENTS' : 'CLASS_STUDENTS',
        p_class_id: classId === 'ALL' ? null : Number(classId),
        p_created_by: staffId,
        p_expires_at: null,
        p_has_email: 'N',
        p_has_sms:   'N'
      });
      setOk('Message dispatched to Student Dashboards.');
      setClassSubject(''); setClassMessage('');
      await loadSent();
    } catch (ex) {
      setErr(ex?.message || 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  /* ---------- PARENTS TAB (premium only) ---------- */
  const [parentsScope, setParentsScope] = useState('ALL'); // 'ALL' | 'CLASS'
  const [parentsSubject, setParentsSubject] = useState('');
  const [parentsMessage, setParentsMessage] = useState('');
  const [parentsVia, setParentsVia] = useState({ dashboard: true, email: false, sms: false });
  const toggleParentsVia = (k) => setParentsVia(prev => {
    if (isExpired) return prev; // block toggle when expired
    if (!canUseParentsDashboard) return prev;
    if (k === 'sms' && !canUseSms) return prev;
    return ({ ...prev, [k]: !prev[k] });
  });

  const parentsNeedsClass = useMemo(() => parentsScope === 'CLASS', [parentsScope]);
  const parentsTargetType = useMemo(
    () => (parentsScope === 'CLASS' ? 'CLASS_PARENTS' : 'ALL_PARENTS'),
    [parentsScope]
  );

  const [parentsEmails, setParentsEmails] = useState('');
  const [parentsPhones, setParentsPhones] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const url = `${STUDENTS_API}?p_school_id=${schoolId}` + (parentsNeedsClass && classId ? `&p_class_id=${classId}` : '');
        const studs = (await jarr(url)).map(s => ({
          guardian_phone: s.guardian_phone || s.GUARDIAN_PHONE || '',
          father_phone:   s.father_phone   || s.FATHER_PHONE   || '',
          mother_phone:   s.mother_phone   || s.MOTHER_PHONE   || '',
          guardian_email: s.guardian_email || s.GUARDIAN_EMAIL || '',
          email:          s.email          || s.EMAIL          || ''
        }));
        const allPhones = [];
        const allEmails = [];
        studs.forEach(s => {
          const p1 = toLocalGh(s.guardian_phone);
          const p2 = toLocalGh(s.father_phone);
          const p3 = toLocalGh(s.mother_phone);
          [p1,p2,p3].forEach(p => { if (p) allPhones.push(p); });
          allEmails.push(s.guardian_email || s.email || '');
        });
        setParentsPhones(listToCsv(allPhones));
        setParentsEmails(listToCsv(allEmails));
      } catch {
        setParentsPhones('');
        setParentsEmails('');
      }
    })();
  }, [schoolId, parentsScope, classId, parentsNeedsClass]);

  const submitParents = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    if (isExpired) { setErr('Plan expired. Please renew to send messages.'); return; }
    if (!canUseParentsDashboard) { setErr('Upgrade to use this feature.'); return; }
    if (!parentsSubject.trim() || !parentsMessage.trim()) { setErr('Subject and Message are required.'); return; }
    if (!parentsVia.dashboard && !parentsVia.email && !parentsVia.sms) { setErr('Select at least one channel.'); return; }
    if (parentsNeedsClass && !classId) { setErr('Choose a class.'); return; }
    if (parentsVia.sms && !canUseSms) { setErr('Upgrade to use SMS.'); return; }

    setSending(true);
    try {
      if (parentsVia.dashboard) {
        await jobj(COMMS_CREATE_DASH_API, {
          p_school_id: schoolId,
          p_subject: parentsSubject.trim(),
          p_body: parentsMessage.trim(),
          p_target_type: parentsTargetType,
          p_class_id: parentsNeedsClass ? (classId === 'ALL' ? null : Number(classId)) : null,
          p_created_by: staffId,
          p_expires_at: null,
          p_has_email: parentsVia.email ? 'Y' : 'N',
          p_has_sms:   parentsVia.sms   ? 'Y' : 'N'
        });
      }

      if (parentsVia.sms && canUseSms) {
        const numsCsv = (parentsPhones || '').trim();
        if (numsCsv) await sendSmsBatch(numsCsv, parentsMessage);
      }
      if (parentsVia.email) {
        const emailsCsv = (parentsEmails || '').trim();
        if (emailsCsv) {
          await sendEmailViaApi(
            emailsCsv,
            parentsSubject,
            parentsMessage,
            schoolName
          );
        }
      }

      setOk('Message dispatched to Parents.');
      setParentsSubject(''); setParentsMessage('');
      setParentsVia(v => ({ ...v, email: false, sms: false }));
      await loadSent();
    } catch (ex) {
      setErr(ex?.message || 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout title="Communication" subtitle="">
      {/* Plan status banner */}
      {pkgLoaded && (
        <div className={`mb-4 rounded-lg border p-3 text-sm ${isExpired
          ? 'bg-rose-50 border-rose-200 text-rose-700'
          : 'bg-gray-50 border-gray-200 text-gray-700'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className={`h-4 w-4 ${isExpired ? 'text-rose-600' : 'text-gray-500'}`} />
            <span>
              Plan: <strong>{planHuman || '—'}</strong>
              {expiryRaw ? <> · Expires: <strong>{String(expiryRaw).slice(0,10)}</strong></> : null}
              {isExpired && <> · <strong>Expired</strong></>}
            </span>
          </div>
          <button
            onClick={() => setShowPlan(false)}
            className="ml-auto p-1 rounded hover:bg-black/5"
            aria-label="Dismiss plan banner"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <TabButton
          active={activeTab==='staff'}
          onClick={()=>!isExpired && setActiveTab('staff')}
          icon={<Shield className="w-4 h-4" />}
          label="Staff"
          disabled={isExpired}
          title={isExpired ? 'Plan expired' : ''}
        />
        <TabButton
          active={activeTab==='class'}
          onClick={()=> (canUseParentsDashboard ? setActiveTab('class') : null)}
          icon={<Building2 className="w-4 h-4" />}
          label="Class"
          disabled={!canUseParentsDashboard}
          title={!canUseParentsDashboard ? (isExpired ? 'Plan expired' : 'Upgrade to use this feature') : ''}
        />
        <TabButton
          active={activeTab==='parents'}
          onClick={()=> (canUseParentsDashboard ? setActiveTab('parents') : null)}
          icon={<UserCheck2 className="w-4 h-4" />}
          label="Parents"
          disabled={!canUseParentsDashboard}
          title={!canUseParentsDashboard ? (isExpired ? 'Plan expired' : 'Upgrade to use this feature') : ''}
        />
      </div>

      {/* STAFF */}
      {activeTab==='staff' && (
        <SectionCard title="Staff" subtitle="Send to Teachers/Staff via Dashboard or Email">
          {/* Role filter (Admin removed) */}
          <div className="grid gap-2 mb-3">
            <label className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Users className="w-4 h-4" /> Staff Role
            </label>
            <select
              value={staffRole}
              onChange={(e)=>setStaffRole(e.target.value)}
              disabled={isExpired}
              title={isExpired ? 'Plan expired' : ''}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
            >
              <option value="">All Roles</option>
              {FIXED_ROLE_CODES.map(code => (
                <option key={code} value={code}>{ROLE_LABELS[code] || code}</option>
              ))}
              {staffRoles
                .filter(code => code && !FIXED_ROLE_CODES.includes(code) && String(code).toUpperCase() !== 'AD')
                .map(code => (
                  <option key={code} value={code}>{ROLE_LABELS[code] || code}</option>
                ))
              }
            </select>
          </div>

          <form onSubmit={submitStaff} className="space-y-4">
            <TextInput label="Subject" value={staffSubject} onChange={setStaffSubject} disabled={isExpired} />
            <TextArea  label="Message" value={staffMessage} onChange={setStaffMessage} rows={5} disabled={isExpired} />

            <div className="flex flex-wrap gap-4 mt-2">
              <ChannelCheck icon={<Inbox className="w-4 h-4" />} label="Dashboard" checked={staffVia.dashboard} onChange={()=>toggleStaffVia('dashboard')} disabled={isExpired} title={isExpired ? 'Plan expired' : ''} />
              <ChannelCheck icon={<Mail className="w-4 h-4" />} label="Email" checked={staffVia.email} onChange={()=>toggleStaffVia('email')} disabled={isExpired} title={isExpired ? 'Plan expired' : ''} />
              <ChannelCheck icon={<MessageSquare className="w-4 h-4" />} label="SMS" checked={staffVia.sms} onChange={()=>toggleStaffVia('sms')} disabled={!canUseSms} title={!canUseSms ? (isExpired ? 'Plan expired' : 'Upgrade to use this feature') : ''} />
            </div>

            {(staffVia.email || (staffVia.sms && canUseSms)) && (
              <div className="grid md:grid-cols-2 gap-4">
                {staffVia.email && (
                  <TextArea label="Email Recipients (comma separated)" value={staffEmails} onChange={setStaffEmails} rows={3} disabled={isExpired} />
                )}
                {staffVia.sms && canUseSms && (
                  <TextArea label="Phone Recipients (comma separated)" value={staffPhones} onChange={setStaffPhones} rows={3} disabled={isExpired} />
                )}
              </div>
            )}

            <ActionRow
              sending={sending}
              err={err}
              ok={ok}
              disableAll={isExpired}
              disabledTitle="Plan expired"
              submitLabel="Send Message"
            />
          </form>
        </SectionCard>
      )}

      {/* CLASS (Premium only — UI guarded by disabled tab) */}
      {activeTab==='class' && canUseParentsDashboard && (
        <SectionCard title="Class" subtitle="Send to Students’ Dashboards (Premium)">
          <div className="grid gap-2 mb-2">
            <label className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Class
            </label>
            <select
              value={classId ?? ''}
              onChange={(e)=>{ const v = e.target.value; setClassId(v==='ALL' ? 'ALL' : Number(v)); }}
              disabled={isExpired}
              title={isExpired ? 'Plan expired' : ''}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
            >
              <option value="ALL">All Students</option>
              {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
            </select>
          </div>

          <form onSubmit={submitClass} className="space-y-4">
            <TextInput label="Subject" value={classSubject} onChange={setClassSubject} disabled={isExpired} />
            <TextArea  label="Message" value={classMessage} onChange={setClassMessage} rows={5} disabled={isExpired} />
            <div className="flex flex-wrap gap-4 mt-2 opacity-100">
              <label className="inline-flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked readOnly className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded" />
                <span className="inline-flex items-center gap-1"><Inbox className="w-4 h-4" /> Dashboard (Students)</span>
              </label>
            </div>
            <ActionRow
              sending={sending}
              err={err}
              ok={ok}
              disableAll={isExpired}
              disabledTitle="Plan expired"
              submitLabel="Send Message"
            />
          </form>
        </SectionCard>
      )}

      {/* PARENTS (Premium only — UI guarded by disabled tab) */}
      {activeTab==='parents' && canUseParentsDashboard && (
        <SectionCard title="Parents" subtitle="Send to Parents via Dashboard, Email or SMS (Premium)">
          <div className="grid gap-2 mb-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">Scope</label>
            <select
              value={parentsScope}
              onChange={(e)=>setParentsScope(e.target.value)}
              disabled={isExpired}
              title={isExpired ? 'Plan expired' : ''}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
            >
              <option value="ALL">All Parents</option>
              <option value="CLASS">By Class</option>
            </select>
          </div>

          {parentsScope === 'CLASS' && (
            <div className="grid gap-2 mb-2">
              <label className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Class
              </label>
              <select
                value={classId ?? ''}
                onChange={(e)=>{ const v = e.target.value; setClassId(v==='ALL' ? 'ALL' : Number(v)); }}
                disabled={isExpired}
                title={isExpired ? 'Plan expired' : ''}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
              >
                <option value="ALL">All Students</option>
                {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
              </select>
            </div>
          )}

          <form onSubmit={submitParents} className="space-y-4">
            <TextInput label="Subject" value={parentsSubject} onChange={setParentsSubject} disabled={isExpired} />
            <TextArea  label="Message" value={parentsMessage} onChange={setParentsMessage} rows={5} disabled={isExpired} />

            <div className="flex flex-wrap gap-4 mt-2">
              <ChannelCheck icon={<Inbox className="w-4 h-4" />} label="Dashboard" checked={parentsVia.dashboard} onChange={()=>toggleParentsVia('dashboard')} disabled={isExpired} title={isExpired ? 'Plan expired' : ''} />
              <ChannelCheck icon={<Mail className="w-4 h-4" />} label="Email" checked={parentsVia.email} onChange={()=>toggleParentsVia('email')} disabled={isExpired} title={isExpired ? 'Plan expired' : ''} />
              <ChannelCheck icon={<MessageSquare className="w-4 h-4" />} label="SMS" checked={parentsVia.sms} onChange={()=>toggleParentsVia('sms')} disabled={!canUseSms} title={!canUseSms ? (isExpired ? 'Plan expired' : 'Upgrade to use this feature') : ''} />
            </div>

            {(parentsVia.email || (parentsVia.sms && canUseSms)) && (
              <div className="grid md:grid-cols-2 gap-4">
                {parentsVia.email && (
                  <TextArea label="Parent Email Recipients (comma separated)" value={parentsEmails} onChange={setParentsEmails} rows={3} disabled={isExpired} />
                )}
                {parentsVia.sms && canUseSms && (
                  <TextArea label="Parent Phone Recipients (comma separated)" value={parentsPhones} onChange={setParentsPhones} rows={3} disabled={isExpired} />
                )}
              </div>
            )}

            <ActionRow
              sending={sending}
              err={err}
              ok={ok}
              disableAll={isExpired}
              disabledTitle="Plan expired"
              submitLabel="Send Message"
            />
          </form>
        </SectionCard>
      )}

      {/* Recently Sent (Dashboard persisted) */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Recently Sent (Dashboard)</h2>
        {sentList.length === 0 ? (
          <div className="text-sm text-gray-500">No messages yet.</div>
        ) : (
          <ul className="space-y-3">
            {sentList.map((m) => (
              <li key={m.message_id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <div className="text-sm text-gray-800 dark:text-gray-100 font-medium">{m.subject}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  To: {readableAudience(m.target_type, m.class_id, classes)}
                </div>
                <div className="text-sm mt-1 text-gray-700 dark:text-gray-200 line-clamp-2">{m.body}</div>
                <div className="text-xs text-gray-400 mt-1">Sent on: {m.created_at}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ---------- small UI pieces ---------- */
function TabButton({ active, onClick, icon, label, disabled=false, title="" }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm relative group ${
        active
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      title={title}
      type="button"
    >
      {icon}{label}
      {disabled && title && (
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1
                         whitespace-nowrap text-xs px-2 py-1 rounded-md shadow
                         bg-gray-900 text-white opacity-0 group-hover:opacity-100 transition">
          {title}
        </span>
      )}
    </button>
  );
}
function SectionCard({ title, subtitle, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8 border border-gray-100 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-1 text-gray-800 dark:text-white">{title}</h2>
      {subtitle && <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">{subtitle}</div>}
      {children}
    </div>
  );
}
function TextInput({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        disabled={disabled}
        title={disabled ? 'Plan expired' : ''}
        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
        required
      />
    </div>
  );
}
function TextArea({ label, value, onChange, rows=5, disabled }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <textarea
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        title={disabled ? 'Plan expired' : ''}
        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
        required
      />
    </div>
  );
}
function ChannelCheck({ icon, label, checked, onChange, disabled=false, title="" }) {
  return (
    <label className={`inline-flex items-center space-x-2 text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300'} relative group`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        title={title}
        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded"
      />
      <span className="inline-flex items-center gap-1">{icon}{label}</span>
      {disabled && title && (
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1
                         whitespace-nowrap text-xs px-2 py-1 rounded-md shadow
                         bg-gray-900 text-white opacity-0 group-hover:opacity-100 transition">
          {title}
        </span>
      )}
    </label>
  );
}
function ActionRow({ sending, err, ok, disableAll=false, disabledTitle='Plan expired', submitLabel='Send Message' }) {
  return (
    <>
      {err && <div className="text-sm text-rose-600">{err}</div>}
      {ok && <div className="text-sm text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {ok}</div>}
      <div className="mt-2">
        <button
          type="submit"
          disabled={disableAll || sending}
          title={disableAll ? disabledTitle : ''}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-medium shadow inline-flex items-center gap-2 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitLabel}
        </button>
      </div>
    </>
  );
}
function readableAudience(targetType, classId, classes) {
  const c = classes.find(x => Number(x.class_id) === Number(classId));
  switch (String(targetType || '').toUpperCase()) {
    case 'ALL':             return 'All (Parents, Teachers & Students)';
    case 'ALL_PARENTS':     return 'All Parents';
    case 'ALL_TEACHERS':    return 'All Teachers/Staff';
    case 'ALL_STUDENTS':    return 'All Students';
    case 'CLASS_PARENTS':   return `Class Parents${c ? ` — ${c.class_name}` : ''}`;
    case 'CLASS_STUDENTS':  return `Class Students${c ? ` — ${c.class_name}` : ''}`;
    default:                return targetType || '';
  }
}
