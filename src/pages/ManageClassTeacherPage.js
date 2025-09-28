import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { Search, UserPlus, Edit3, Trash2, X, Save, CheckCircle2, Users, AlertTriangle, RefreshCcw } from "lucide-react";
import { useAuth } from "../AuthContext";

/** ==== ORDS base & URL builders ==== */
const BASE_ORDS = "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

/** Report: lists ALL class–tutor by school_id */
const GET_CLASS_TEACHERS_URL = (schoolId) =>
  `${BASE_ORDS}/academic/get/class_teacher/?p_school_id=${encodeURIComponent(schoolId)}`;

/** LOVs */
const GET_CLASSES_LOV_URL  = (schoolId) => `${BASE_ORDS}/academic/get/classes/?p_school_id=${encodeURIComponent(schoolId)}`;
const GET_STAFF_LOV_URL    = (schoolId) => `${BASE_ORDS}/staff/get/staff/?p_school_id=${encodeURIComponent(schoolId)}`;

/** CRUD (class teacher) */
const ADD_CLASS_TEACHER_URL = (schoolId, teacherUserId, classId) =>
  `${BASE_ORDS}/academic/add/class_teacher/?p_teacher_id=${encodeURIComponent(teacherUserId)}&p_class_id=${encodeURIComponent(classId)}&p_school_id=${encodeURIComponent(schoolId)}`;

const UPDATE_CLASS_TEACHER_URL = (classTeacherId, teacherUserId, classId) =>
  `${BASE_ORDS}/academic/update/class_teacher/?p_class_teacher_id=${encodeURIComponent(classTeacherId)}&p_teacher_id=${encodeURIComponent(teacherUserId)}&p_class_id=${encodeURIComponent(classId)}`;

const DELETE_CLASS_TEACHER_URL = (classTeacherId) =>
  `${BASE_ORDS}/academic/delete/class_teacher/?p_class_teacher_id=${encodeURIComponent(classTeacherId)}`;

/** Resolve schoolId & token from auth (fallback to localStorage) */
function useSchoolId() {
  const { user, token } = useAuth() || {};
  const fromUser = user?.school_id ?? user?.schoolId ?? user?.school?.id ?? null;
  const fromStorage = Number(localStorage.getItem("school_id"));
  const schoolId = Number.isFinite(fromUser) ? fromUser : (Number.isFinite(fromStorage) ? fromStorage : null);
  return { schoolId, token };
}

export default function ManageClassTutorPage() {
  const { schoolId, token } = useSchoolId();

  // Report rows
  const [rows, setRows] = useState([]); // [{id, schoolId, classId, userId, staffName, className}]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // LOVs
  const [classesLov, setClassesLov] = useState([]);
  const [tutorsLov, setTutorsLov] = useState([]); // filtered to role = TE

  // Search
  const [q, setQ] = useState("");

  // Create
  const [openCreate, setOpenCreate] = useState(false);
  const [createPayload, setCreatePayload] = useState({ classId: "", userId: "" });
  const [saving, setSaving] = useState(false);

  // Edit
  const [editing, setEditing] = useState(null); // { id, classId, userId }
  const [updating, setUpdating] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const authHeaders = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  /** Load all class–tutor assignments */
  async function loadAssignments() {
    if (!schoolId) {
      setErr("No school selected.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErr("");
      const res = await fetch(GET_CLASS_TEACHERS_URL(schoolId), { headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const mapped = (Array.isArray(data) ? data : []).map(it => ({
        id:
          it.CLASS_TEACHER_ID ?? it.class_teacher_id ??
          it.TEACHER_SUBJECT_ID ?? it.teacher_subject_id, // tolerate backend label
        schoolId: it.SCHOOL_ID ?? it.school_id,
        classId:  it.CLASS_ID  ?? it.class_id,
        userId:   it.USER_ID   ?? it.user_id, // tutor's user_id
        staffName: it.STAFF_NAME ?? it.staff_name ?? it.FULL_NAME ?? it.full_name,
        className: it.CLASS_NAME ?? it.class_name,
      })).filter(r => r.id != null);
      setRows(mapped);
    } catch (e) {
      setErr(`Failed to load assignments: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  /** Load LOVs (classes, tutors=role TE) */
  async function loadLovs() {
    if (!schoolId) return;
    const [cRes, tRes] = await Promise.all([
      fetch(GET_CLASSES_LOV_URL(schoolId), { headers: authHeaders }),
      fetch(GET_STAFF_LOV_URL(schoolId),   { headers: authHeaders }),
    ]);

    if (cRes.ok) {
      const cj = await cRes.json();
      setClassesLov((Array.isArray(cj) ? cj : []).map(x => ({
        value: x.class_id ?? x.CLASS_ID,
        label: x.class_name ?? x.CLASS_NAME,
      })).filter(x => x.value != null && x.label));
    }

    if (tRes.ok) {
      const tj = await tRes.json();
      const tutors = (Array.isArray(tj) ? tj : [])
        .map(x => {
          const roleRaw = x.role ?? x.ROLE ?? x.user_role ?? x.USER_ROLE ?? x.staff_role ?? x.STAFF_ROLE ?? "";
          const role = String(roleRaw).toUpperCase();
          return {
            value: x.user_id ?? x.USER_ID,
            label: x.full_name ?? x.FULL_NAME,
            role,
          };
        })
        .filter(x => x.value != null && x.label && x.role === "TE")
        .map(({ value, label }) => ({ value, label }));
      setTutorsLov(tutors);
    }
  }

  useEffect(() => { loadAssignments(); loadLovs(); /* eslint-disable-next-line */ }, [schoolId]);

  /** Create */
  async function handleCreate() {
    const { classId, userId } = createPayload;
    if (!schoolId || !classId || !userId) return;
    try {
      setSaving(true);
      const res = await fetch(ADD_CLASS_TEACHER_URL(schoolId, userId, classId), { method: "GET", headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOpenCreate(false);
      setCreatePayload({ classId: "", userId: "" });
      await loadAssignments();
    } catch (e) {
      alert(`Could not create assignment: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  /** Update */
  async function handleUpdate() {
    if (!editing) return;
    const { id, classId, userId } = editing;
    if (!id || !classId || !userId) return;
    try {
      setUpdating(true);
      const res = await fetch(UPDATE_CLASS_TEACHER_URL(id, userId, classId), { method: "GET", headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditing(null);
      await loadAssignments();
    } catch (e) {
      alert(`Could not update assignment: ${e.message}`);
    } finally {
      setUpdating(false);
    }
  }

  /** Delete */
  async function confirmDelete() {
    if (!deletingId) return;
    try {
      setDeleting(true);
      const res = await fetch(DELETE_CLASS_TEACHER_URL(deletingId), { method: "GET", headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDeletingId(null);
      await loadAssignments();
    } catch (e) {
      alert(`Could not delete assignment: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  }

  /** Client-side search */
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r =>
      [r.className, r.staffName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(t)
    );
  }, [rows, q]);

  return (
    <DashboardLayout title="Class–Tutor Assignments" subtitle="">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-sm"
                placeholder="Search by class / tutor"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <button onClick={loadAssignments} className="px-3 py-2 border rounded-lg inline-flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" /> Refresh
            </button>
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg"
              disabled={!schoolId}
            >
              <UserPlus className="h-4 w-4" /> Assign Class Tutor
            </button>
          </div>
        </div>
        {err && <p className="text-rose-600 mt-2 text-sm">{err}</p>}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
                <th className="p-3">Class</th>
                <th className="p-3">Tutor</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="p-6 text-center text-gray-500">Loading…</td></tr>
              ) : filtered.length ? (
                filtered.map(r => (
                  <tr key={r.id} className="border-b last:border-0 dark:border-gray-700">
                    <td className="p-3">{r.className}</td>
                    <td className="p-3">{r.staffName}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button
                          className="px-2 py-1 border rounded-lg inline-flex items-center gap-1"
                          onClick={() => setEditing({ id: r.id, classId: r.classId, userId: r.userId })}
                        >
                          <Edit3 className="h-4 w-4" /> Edit
                        </button>
                        <button
                          className="px-2 py-1 border rounded-lg text-rose-600 inline-flex items-center gap-1"
                          onClick={() => setDeletingId(r.id)}
                        >
                          <Trash2 className="h-4 w-4" /> Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="p-6 text-center text-gray-500">No assignments.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create */}
      {openCreate && (
        <Modal title="Assign Class Tutor" icon={<Users className="h-5 w-5" />} onClose={() => setOpenCreate(false)}>
          <div className="grid gap-3">
            <Select label="Class" options={classesLov} value={createPayload.classId} onChange={v => setCreatePayload(s => ({ ...s, classId: v }))} placeholder="Select class" />
            <Select label="Tutor" options={tutorsLov} value={createPayload.userId} onChange={v => setCreatePayload(s => ({ ...s, userId: v }))} placeholder="Select tutor" />
            <div className="flex justify-end gap-2 mt-2">
              <button className="px-3 py-2 border rounded-lg inline-flex items-center gap-2" onClick={() => setOpenCreate(false)}>
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                disabled={saving || !createPayload.classId || !createPayload.userId}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg inline-flex items-center gap-2 disabled:opacity-60"
                onClick={handleCreate}
              >
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit */}
      {editing && (
        <Modal title="Edit Assignment" icon={<Edit3 className="h-5 w-5" />} onClose={() => setEditing(null)}>
          <div className="grid gap-3">
            <Select label="Class" options={classesLov} value={editing.classId ?? ""} onChange={v => setEditing(s => ({ ...s, classId: v }))} placeholder="Select class" />
            <Select label="Tutor" options={tutorsLov} value={editing.userId ?? ""} onChange={v => setEditing(s => ({ ...s, userId: v }))} placeholder="Select tutor" />
            <div className="flex justify-end gap-2 mt-2">
              <button className="px-3 py-2 border rounded-lg inline-flex items-center gap-2" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                disabled={updating || !editing.classId || !editing.userId}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg inline-flex items-center gap-2 disabled:opacity-60"
                onClick={handleUpdate}
              >
                <CheckCircle2 className="h-4 w-4" /> {updating ? "Updating…" : "Update"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deletingId !== null && (
        <Modal title="Delete Assignment" onClose={() => setDeletingId(null)}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 text-amber-500" />
            <div className="text-sm">
              <p>Are you sure you want to delete this class tutor assignment?</p>
              <p className="text-gray-500 mt-1">This action cannot be undone.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="px-3 py-2 border rounded-lg inline-flex items-center gap-2" onClick={() => setDeletingId(null)}>
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              disabled={deleting}
              className="px-3 py-2 bg-rose-600 text-white rounded-lg inline-flex items-center gap-2 disabled:opacity-60"
              onClick={confirmDelete}
            >
              <Trash2 className="h-4 w-4" /> {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}

/** ==== Small UI helpers ==== */
function Modal({ title, icon, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-3">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            {icon}
            <h4 className="font-semibold">{title}</h4>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
function Select({ label, value, onChange, options, placeholder }) {
  const opts = (options || []).map(o => (typeof o === "object" ? o : { value: o, label: String(o) }));
  return (
    <label className="text-sm grid gap-1">
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800">
        <option value="">{placeholder || "Select"}</option>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
