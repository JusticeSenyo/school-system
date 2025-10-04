import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { Search, Plus, Edit3, Trash2, X, Save, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "../AuthContext";

// === ORDS base ===
const BASE_ORDS = "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

// Build URLs
const GET_CLASSES_URL   = (schoolId) => `${BASE_ORDS}/academic/get/classes/?p_school_id=${encodeURIComponent(schoolId)}`;
const ADD_CLASS_URL     = (schoolId, name) => `${BASE_ORDS}/academic/add/class/?p_school_id=${encodeURIComponent(schoolId)}&p_class_name=${encodeURIComponent(name)}`;
const UPDATE_CLASS_URL  = (id, schoolId, name) => `${BASE_ORDS}/academic/update/staff/?p_class_id=${encodeURIComponent(id)}&p_school_id=${encodeURIComponent(schoolId)}&p_class_name=${encodeURIComponent(name)}`;
const DELETE_CLASS_URL  = (id) => `${BASE_ORDS}/academic/delete/class/?p_class_id=${encodeURIComponent(id)}`;

// Small hook to resolve schoolId from auth (with localStorage fallback)
function useSchoolId() {
  const { user, token } = useAuth() || {};
  const fromUser =
    user?.school_id ??
    user?.schoolId ??
    user?.school?.id ??
    null;
  const fromStorage = Number(localStorage.getItem("school_id"));
  const schoolId = Number.isFinite(fromUser) ? fromUser : (Number.isFinite(fromStorage) ? fromStorage : null);
  return { schoolId, token };
}

export default function ManageClassesPage() {
  const { schoolId, token } = useSchoolId();

  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState("");

  // Create dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editing, setEditing] = useState(null); // { id, name }
  const [updating, setUpdating] = useState(false);

  // Delete dialog
  const [deletingId, setDeletingId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const authHeaders = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  async function loadClasses() {
    if (!schoolId) {
      setErr("No school selected.");
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setErr("");
      const res = await fetch(GET_CLASSES_URL(schoolId), { headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const mapped = (Array.isArray(data) ? data : []).map(item => ({
        id: item.class_id,
        name: item.class_name,
        createdAt: item.created_at
      }));
      setRows(mapped);
    } catch (e) {
      setErr(`Failed to load classes: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadClasses(); /* eslint-disable-next-line */ }, [schoolId]);

  const filtered = useMemo(() => {
    return rows.filter(r => (q ? r.name.toLowerCase().includes(q.toLowerCase()) : true));
  }, [rows, q]);

  // Create
  async function handleCreate() {
    const name = createName.trim();
    if (!name || !schoolId) return;
    try {
      setSaving(true);
      const res = await fetch(ADD_CLASS_URL(schoolId, name), { method: "GET", headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOpenCreate(false);
      setCreateName("");
      await loadClasses();
    } catch (e) {
      alert(`Could not create class: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  // Update
  async function handleUpdate() {
    if (!editing || !editing.name?.trim() || !schoolId) return;
    try {
      setUpdating(true);
      const res = await fetch(UPDATE_CLASS_URL(editing.id, schoolId, editing.name.trim()), { method: "GET", headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditing(null);
      await loadClasses();
    } catch (e) {
      alert(`Could not update class: ${e.message}`);
    } finally {
      setUpdating(false);
    }
  }

  // Delete
  async function confirmDelete() {
    if (!deletingId) return;
    try {
      setDeleting(true);
      const res = await fetch(DELETE_CLASS_URL(deletingId), { method: "GET", headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDeletingId(null);
      await loadClasses();
    } catch (e) {
      alert(`Could not delete class: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  }

  // Excel export
  function exportToExcel() {
    const rowsForExcel = rows.map(r => ({
      "Class ID": r.id,
      "Class Name": r.name,
      "Created": r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rowsForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Classes");
    XLSX.writeFile(wb, "classes.xlsx");
  }

  return (
    <DashboardLayout title="Manage Classes" subtitle="">
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
                placeholder="Search class"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <button onClick={() => setOpenCreate(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg" disabled={!schoolId}>
              <Plus className="h-4 w-4" /> New Class
            </button>
            <button onClick={exportToExcel} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg" disabled={!rows.length}>
              <Download className="h-4 w-4" /> Download Excel
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
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="p-6 text-center text-gray-500 dark:text-gray-400" colSpan={3}>
                    Loading classes…
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map(r => (
                  <tr key={r.id} className="border-b last:border-0 dark:border-gray-700">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button className="px-2 py-1 border rounded-lg inline-flex items-center gap-1 sm:hidden" onClick={() => setEditing({ id: r.id, name: r.name })}>
                          <Edit3 className="h-4 w-4" /> 
                        </button>
                        <button className="px-2 py-1 border rounded-lg inline-flex items-center gap-1 max-sm:hidden" onClick={() => setEditing({ id: r.id, name: r.name })}>
                          <Edit3 className="h-4 w-4" /> Edit
                        </button>
                        <button className="px-2 py-1 border rounded-lg text-rose-600 inline-flex items-center gap-1 sm:hidden" onClick={() => setDeletingId(r.id)}>
                          <Trash2 className="h-4 w-4" /> 
                        </button>
                        <button className="px-2 py-1 border rounded-lg text-rose-600 inline-flex items-center gap-1 max-sm:hidden" onClick={() => setDeletingId(r.id)}>
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-6 text-center text-gray-500 dark:text-gray-400" colSpan={3}>
                    No classes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create */}
      {openCreate && (
        <Modal title="New Class" onClose={() => setOpenCreate(false)}>
          <div className="grid gap-3">
            <Input label="Class Name (e.g., Grade 1)" value={createName} onChange={setCreateName} />
            <div className="flex justify-end gap-2 mt-2">
              <button className="px-3 py-2 border rounded-lg inline-flex items-center gap-2" onClick={() => setOpenCreate(false)}>
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                disabled={saving || !schoolId}
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
        <Modal title="Edit Class" onClose={() => setEditing(null)}>
          <div className="grid gap-3">
            <Input label="Class Name" value={editing.name} onChange={(v) => setEditing(s => ({ ...s, name: v }))} />
            <div className="flex justify-end gap-2 mt-2">
              <button className="px-3 py-2 border rounded-lg inline-flex items-center gap-2" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                disabled={updating || !schoolId}
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
        <Modal title="Delete Class" onClose={() => setDeletingId(null)}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 text-amber-500" />
            <div className="text-sm">
              <p>Are you sure you want to delete this class?</p>
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

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-3">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h4 className="font-semibold">{title}</h4>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
function Input({ label, value, onChange }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800" />
    </label>
  );
}
