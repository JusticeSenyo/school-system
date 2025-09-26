// src/pages/ExamScaleSetupPage.js
import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { Plus, Save, Trash2, Loader2, Building2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../AuthContext";

/* ------------ ORDS base ------------ */
const HOST = "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

/* ------------ Endpoints ------------ */
// Classes LOV
const ACADEMIC_CLASSES_API = `${HOST}/academic/get/classes/`;
// GET scale (by school + class)
const SCALE_GET_URL = ({ sid, classId }) => {
  const qp = new URLSearchParams({ p_school_id: String(sid) });
  if (classId != null && classId !== "") qp.set("p_class", String(classId));
  return `${HOST}/exams/scheme/get/?${qp.toString()}`;
};
// Upsert (create/update) scale band — GET
const SCALE_UPSERT_URL = `${HOST}/exams/scheme/upsert/`;
// Delete band — GET
const SCALE_DELETE_URL = `${HOST}/exams/scheme/delete/`;

/* ------------ helpers ------------ */
const jtxt = async (u, opt = {}) => {
  const r = await fetch(u, { cache: "no-store", ...opt });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.text()).trim();
};
const jarr = async (u, headers = {}) => {
  const t = await jtxt(u, { headers: { Accept: "application/json", ...headers } });
  if (!t) return [];
  try { const d = JSON.parse(t); return Array.isArray(d) ? d : (Array.isArray(d.items) ? d.items : []); }
  catch { return []; }
};
const parseJson = (t) => { try { return t ? JSON.parse(t) : null; } catch { return null; } };

const emptyForm = { id: null, grade: "", percent_from: "", percent_to: "", remarks: "" };

export default function ExamScaleSetupPage() {
  const { user, token } = useAuth() || {};
  const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? 1;
  const H = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(null);

  const [rows, setRows] = useState([]);      // [{id,grade,percent_from,percent_to,remarks,class}]
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // load classes
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        const data = await jarr(`${ACADEMIC_CLASSES_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);
        const norm = data.map(r => ({
          id: r.class_id ?? r.CLASS_ID ?? r.id ?? r.ID,
          name: r.class_name ?? r.CLASS_NAME ?? r.name ?? r.NAME,
        })).filter(x => x.id != null);
        setClasses(norm);
        if (!classId && norm.length) setClassId(Number(norm[0].id));
      } catch {
        setClasses([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, H]);

  // load scale
  useEffect(() => {
    if (!schoolId || !classId) { setRows([]); return; }
    (async () => {
      setLoading(true);
      setMsg({ type: "", text: "" });
      try {
        const url = SCALE_GET_URL({ sid: schoolId, classId });
        const data = await jarr(url, H);
        const bands = data.map(r => ({
          id: r.id ?? r.ID ?? null,
          grade: r.grade ?? r.GRADE ?? "",
          percent_from: Number(r.percent_from ?? r.PERCENT_FROM ?? 0),
          percent_to: Number(r.percent_to ?? r.PERCENT_TO ?? 0),
          remarks: r.remarks ?? r.REMARKS ?? "",
          class: r.class ?? r.CLASS ?? null,
        })).sort((a,b) => (b.percent_from||0) - (a.percent_from||0));
        setRows(bands);
      } catch (e) {
        setRows([]);
        setMsg({ type: "error", text: String(e.message || e) });
      }
      setLoading(false);
    })();
  }, [schoolId, classId, H]);

  const resetForm = () => setForm(emptyForm);

  const onEdit = (row) => {
    setForm({
      id: row.id ?? null,
      grade: row.grade || "",
      percent_from: row.percent_from ?? "",
      percent_to: row.percent_to ?? "",
      remarks: row.remarks || "",
    });
    setMsg({ type: "", text: "" });
  };

  const validate = () => {
    const grade = String(form.grade || "").trim();
    const from = Number(form.percent_from);
    const to = Number(form.percent_to);

    if (!grade) return "Grade is required.";
    if (Number.isNaN(from) || Number.isNaN(to)) return "Percent From/To must be numbers.";
    if (from < 0 || from > 100 || to < 0 || to > 100) return "Percent values must be within 0 - 100.";
    if (from > to) return "'Percent From' cannot be greater than 'Percent To'.";

    // overlap check with other bands in the same class
    for (const r of rows) {
      if (form.id && r.id === form.id) continue; // skip self when editing
      const rf = Number(r.percent_from || 0);
      const rt = Number(r.percent_to || 0);
      const overlaps = (from <= rt) && (to >= rf);
      if (overlaps) return `Range overlaps with grade ${r.grade} (${rf}-${rt}).`;
    }
    return "";
  };

  const reloadRows = async () => {
    const url = SCALE_GET_URL({ sid: schoolId, classId });
    const data = await jarr(url, H);
    const bands = data.map(r => ({
      id: r.id ?? r.ID ?? null,
      grade: r.grade ?? r.GRADE ?? "",
      percent_from: Number(r.percent_from ?? r.PERCENT_FROM ?? 0),
      percent_to: Number(r.percent_to ?? r.PERCENT_TO ?? 0),
      remarks: r.remarks ?? r.REMARKS ?? "",
      class: r.class ?? r.CLASS ?? null,
    })).sort((a,b) => (b.percent_from||0) - (a.percent_from||0));
    setRows(bands);
  };

  const onSave = async () => {
    const err = validate();
    if (err) { setMsg({ type: "error", text: err }); return; }

    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      // Build GET url with query params
      const qp = new URLSearchParams({
        p_school_id: String(schoolId),
        p_class: String(classId),
        p_grade: String(form.grade || "").trim(),
        p_percent_from: String(Number(form.percent_from)),
        p_percent_to: String(Number(form.percent_to)),
        p_remarks: String(form.remarks || "").trim(),
      });
      if (form.id != null && form.id !== "") qp.set("p_id", String(form.id));

      const url = `${SCALE_UPSERT_URL}?${qp.toString()}`;
      const t = await jtxt(url, { headers: { Accept: "application/json", ...H } });
      const resp = parseJson(t) || {};
      if (resp.success === false) throw new Error(resp.message || "Failed to save.");

      setMsg({ type: "success", text: "Saved." });
      resetForm();
      await reloadRows();
    } catch (e) {
      setMsg({ type: "error", text: String(e.message || e) });
    }
    setSaving(false);
  };

  const onDelete = async (row) => {
    const ok = typeof window !== "undefined" && window.confirm(`Delete grade "${row.grade}" (${row.percent_from}-${row.percent_to}) ?`);
    if (!ok) return;

    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      const qp = new URLSearchParams({
        p_id: String(row.id),
        p_school_id: String(schoolId),
        p_class: String(classId),
      });
      const url = `${SCALE_DELETE_URL}?${qp.toString()}`;
      const t = await jtxt(url, { headers: { Accept: "application/json", ...H } });
      const resp = parseJson(t) || {};
      if (resp.success === false) throw new Error(resp.message || "Delete failed.");

      setMsg({ type: "success", text: "Deleted." });
      if (form.id === row.id) resetForm();
      await reloadRows();
    } catch (e) {
      setMsg({ type: "error", text: String(e.message || e) });
    }
    setSaving(false);
  };

  return (
    <DashboardLayout title="Grading Scale Setup" subtitle="Define grade bands per class">
      <div className="grid lg:grid-cols-3 gap-4">
        {/* LEFT: Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4">
          <div className="grid gap-3">
            <label className="text-sm grid gap-1">
              <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Class
              </span>
              <select
                className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-800"
                value={classId ?? ""}
                onChange={(e) => setClassId(Number(e.target.value))}
              >
                {classes.length === 0 && <option value="">No classes</option>}
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>


            <LabeledInput label="Grade" value={form.grade} onChange={v=>setForm(f=>({...f,grade:v}))} placeholder="A+" />
            <div className="grid grid-cols-1 gap-2">
              <LabeledInput label="Percent From" type="number" value={form.percent_from} onChange={v=>setForm(f=>({...f,percent_from:v}))} placeholder="80" />
              <LabeledInput label="Percent To" type="number" value={form.percent_to} onChange={v=>setForm(f=>({...f,percent_to:v}))} placeholder="100" />
            </div>
            <LabeledInput label="Remark" value={form.remarks} onChange={v=>setForm(f=>({...f,remarks:v}))} placeholder="Excellent" />

            {msg.text && (
              <div className={`text-sm flex items-center gap-2 ${msg.type === "error" ? "text-rose-600" : "text-emerald-600"}`}>
                {msg.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>{msg.text}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={onSave}
                disabled={saving || !classId}
                className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {form.id ? "Update Band" : "Add Band"}
              </button>
              {form.id && (
                <button
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg"
                >
                  <Plus className="h-4 w-4" /> New
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Table */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Bands for selected class</div>
          {loading ? (
            <div className="p-8 text-center text-gray-500 inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No bands yet. Add one on the left.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
                    <th className="py-2">Grade</th>
                    <th className="py-2">Min %</th>
                    <th className="py-2">Max %</th>
                    <th className="py-2">Remark</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id ?? `${r.grade}-${r.percent_from}-${r.percent_to}`} className="border-b last:border-0 dark:border-gray-700">
                      <td className="py-2">{r.grade}</td>
                      <td className="py-2">{r.percent_from}</td>
                      <td className="py-2">{r.percent_to}</td>
                      <td className="py-2">{r.remarks}</td>
                      <td className="py-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button className="px-2 py-1 border rounded-lg" onClick={() => onEdit(r)}>Edit</button>
                          <button
                            className="px-2 py-1 border rounded-lg text-rose-600"
                            onClick={() => onDelete(r)}
                          >
                            <Trash2 className="h-4 w-4 inline-block mr-1" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function LabeledInput({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-800"
      />
    </label>
  );
}
