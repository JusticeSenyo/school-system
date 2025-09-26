// src/pages/ManageTermsPage.js
import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { Search, Plus, Edit3, Trash2, X, Save, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "../AuthContext";

/* === ORDS base === */
const BASE_ORDS = "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

/* URLs */
const GET_TERMS_URL    = (schoolId) => `${BASE_ORDS}/academic/get/terms/?p_school_id=${encodeURIComponent(schoolId)}`;
const ADD_TERM_URL     = (schoolId, name, status) =>
  `${BASE_ORDS}/academic/add/term/?p_school_id=${encodeURIComponent(schoolId)}&p_term_name=${encodeURIComponent(name)}&p_status=${encodeURIComponent(status || "")}`;
const UPDATE_TERM_URL  = (id, schoolId, name, status) =>
  `${BASE_ORDS}/academic/update/term/?p_term_id=${encodeURIComponent(id)}&p_school_id=${encodeURIComponent(schoolId)}&p_term_name=${encodeURIComponent(name)}&p_status=${encodeURIComponent(status || "")}`;
const DELETE_TERM_URL  = (id) => `${BASE_ORDS}/academic/delete/term/?p_term_id=${encodeURIComponent(id)}`;

/* Hook to resolve schoolId + token (same style as Classes page) */
function useSchoolId() {
  const { user, token } = useAuth() || {};
  const fromUser =
    user?.school_id ?? user?.schoolId ?? user?.school?.id ?? null;
  const fromStorage = Number(localStorage.getItem("school_id"));
  const schoolId = Number.isFinite(fromUser) ? fromUser : (Number.isFinite(fromStorage) ? fromStorage : null);
  return { schoolId, token };
}

export default function ManageTermsPage() {
  const { schoolId, token } = useSchoolId();

  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState("");

  // Create dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createIsCurrent, setCreateIsCurrent] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editing, setEditing] = useState(null); // { id, name, status }
  const [updating, setUpdating] = useState(false);

  // Delete dialog
  const [deletingId, setDeletingId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const authHeaders = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  async function loadTerms() {
    if (!schoolId) {
      setErr("No school selected.");
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setErr("");
      const res = await fetch(GET_TERMS_URL(schoolId), { headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
      const mapped = list.map((t) => ({
        id: t.term_id ?? t.TERM_ID,
        name: t.term_name ?? t.TERM_NAME,
        status: t.status ?? t.STATUS ?? null, // expect 'CURRENT' or null
      }));
      setRows(mapped);
    } catch (e) {
      setErr(`Failed to load terms: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadTerms(); /* eslint-disable-next-line */ }, [schoolId]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter(r => (!ql || r.name?.toLowerCase().includes(ql)));
  }, [rows, q]);

  // Create
  async function handleCreate() {
    const name = createName.trim();
    if (!name || !schoolId) return;
    try {
      setSaving(true);
      const statusValue = createIsCurrent ? "CURRENT" : ""; // empty -> NULL on DB
      const res = await fetch(ADD_TERM_URL(schoolId, name, statusValue), { method: "GET", headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOpenCreate(false);
      setCreateName("");
      setCreateIsCurrent(false);
      await loadTerms();
    } catch (e) {
      alert(`Could not create term: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  // Update
  async function handleUpdate() {
    if (!editing || !editing.name?.trim() || !schoolId) return;
    try {
      setUpdating(true);
      const statusValue = editing.status === "CURRENT" ? "CURRENT" : "";
      const res = await fetch(
        UPDATE_TERM_URL(editing.id, schoolId, editing.name.trim(), statusValue),
        { method: "GET", headers: authHeaders }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditing(null);
      await loadTerms();
    } catch (e) {
      alert(`Could not update term: ${e.message}`);
    } finally {
      setUpdating(false);
    }
  }

  // Delete
  async function confirmDelete() {
    if (!deletingId) return;
    try {
      setDeleting(true);
      const res = await fetch(DELETE_TERM_URL(deletingId), { method: "GET", headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDeletingId(null);
      await loadTerms();
    } catch (e) {
      alert(`Could not delete term: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  }

  // Excel export
  function exportToExcel() {
    const rowsForExcel = rows.map(r => ({
      "Term ID": r.id,
      "Term Name": r.name,
      "Status": r.status === "CURRENT" ? "CURRENT" : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rowsForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Terms");
    XLSX.writeFile(wb, "academic_terms.xlsx");
  }

  return (
    <DashboardLayout title="Manage Academic Terms" subtitle="Create and manage academic terms">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-sm"
              placeholder="Search term"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setOpenCreate(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg" disabled={!schoolId}>
              <Plus className="h-4 w-4" /> New Term
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
                <th className="p-3">Term</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="p-6 text-center text-gray-500 dark:text-gray-400" colSpan={4}>Loading terms…</td></tr>
              ) : filtered.length ? (
                filtered.map(r => (
                  <tr key={r.id} className="border-b last:border-0 dark:border-gray-700">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3">
                      {r.status === "CURRENT" ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          CURRENT
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button
                          className="px-2 py-1 border rounded-lg inline-flex items-center gap-1"
                          onClick={() => setEditing({ id: r.id, name: r.name, status: r.status })}
                        >
                          <Edit3 className="h-4 w-4" /> Edit
                        </button>
                        <button
                          className="px-2 py-1 border rounded-lg text-rose-600 inline-flex items-center gap-1"
                          onClick={() => setDeletingId(r.id)}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="p-6 text-center text-gray-500 dark:text-gray-400" colSpan={4}>No terms found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create */}
      {openCreate && (
        <Modal title="New Term" onClose={() => setOpenCreate(false)}>
          <div className="grid gap-3">
            <Input label="Term Name (e.g., Term 1)" value={createName} onChange={setCreateName} />
            <Checkbox
              label="Mark as CURRENT term"
              checked={createIsCurrent}
              onChange={setCreateIsCurrent}
            />
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
        <Modal title="Edit Term" onClose={() => setEditing(null)}>
          <div className="grid gap-3">
            <Input label="Term Name" value={editing.name} onChange={(v) => setEditing(s => ({ ...s, name: v }))} />
            <Checkbox
              label="Mark as CURRENT term"
              checked={editing.status === "CURRENT"}
              onChange={(checked) => setEditing(s => ({ ...s, status: checked ? "CURRENT" : "" }))}
            />
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
        <Modal title="Delete Term" onClose={() => setDeletingId(null)}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 text-amber-500" />
            <div className="text-sm">
              <p>Are you sure you want to delete this term?</p>
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
function Checkbox({ label, checked, onChange }) {
  return (
    <label className="text-sm flex items-center gap-2 select-none">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded"
      />
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}
