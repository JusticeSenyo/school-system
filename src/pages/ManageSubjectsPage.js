import React, { useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { Search, Plus, Edit3, Trash2, X, Save, CheckCircle2, Percent, BookOpen } from "lucide-react";

const DEPARTMENTS = ["General", "Mathematics", "English", "Science", "ICT", "Social Studies"];
const LEVELS = ["KG", "Primary", "JHS"]; // optionally filter usage per subject

const MOCK_SUBJECTS = [
  { id: 1, name: "Mathematics", department: "Mathematics", level: "Primary", passMark: 50, examWeight: 70, classWorkWeight: 30 },
  { id: 2, name: "English Language", department: "English", level: "Primary", passMark: 50, examWeight: 70, classWorkWeight: 30 },
  { id: 3, name: "Integrated Science", department: "Science", level: "JHS", passMark: 50, examWeight: 60, classWorkWeight: 40 },
];

export default function ManageSubjectsPage() {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All");
  const [rows, setRows] = useState(MOCK_SUBJECTS);

  const [openCreate, setOpenCreate] = useState(false);
  const [createPayload, setCreatePayload] = useState({
    name: "", department: DEPARTMENTS[0], level: LEVELS[1], passMark: 50, examWeight: 70, classWorkWeight: 30,
  });
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    return rows.filter(r =>
      (dept === "All" || r.department === dept) &&
      (q ? r.name.toLowerCase().includes(q.toLowerCase()) : true)
    );
  }, [rows, q, dept]);

  function handleCreate() {
    if (!createPayload.name) return;
    const next = { id: Math.max(0, ...rows.map(r => r.id)) + 1, ...createPayload, passMark: Number(createPayload.passMark), examWeight: Number(createPayload.examWeight), classWorkWeight: Number(createPayload.classWorkWeight) };
    setRows(prev => [...prev, next]);
    setOpenCreate(false);
    // TODO: POST /academics/subjects
  }

  function handleUpdate() {
    if (!editing) return;
    setRows(prev => prev.map(r => r.id === editing.id ? editing : r));
    setEditing(null);
    // TODO: PUT /academics/subjects/:id
  }

  function handleDelete(id) {
    setRows(prev => prev.filter(r => r.id !== id));
    // TODO: DELETE /academics/subjects/:id
  }

  return (
    <DashboardLayout title="Manage Subjects" subtitle="Create subjects, departments and assessment weights">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-sm" placeholder="Search subject" />
            </div>
            <select value={dept} onChange={(e) => setDept(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              {["All", ...DEPARTMENTS].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <button onClick={() => setOpenCreate(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg">
            <Plus className="h-4 w-4" /> New Subject
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
                <th className="p-3">Subject</th>
                <th className="p-3">Department</th>
                <th className="p-3">Level</th>
                <th className="p-3">Pass Mark</th>
                <th className="p-3">Exam/Classwork</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b last:border-0 dark:border-gray-700">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3">{r.department}</td>
                  <td className="p-3">{r.level}</td>
                  <td className="p-3">{r.passMark}%</td>
                  <td className="p-3">{r.examWeight}% / {r.classWorkWeight}%</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button className="px-2 py-1 border rounded-lg inline-flex items-center gap-1" onClick={() => setEditing({ ...r })}>
                        <Edit3 className="h-4 w-4" /> Edit
                      </button>
                      <button className="px-2 py-1 border rounded-lg text-rose-600 inline-flex items-center gap-1" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td className="p-6 text-center text-gray-500 dark:text-gray-400" colSpan={6}>
                    No subjects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create */}
      {openCreate && (
        <Modal title="New Subject" icon={<BookOpen className="h-5 w-5" />} onClose={() => setOpenCreate(false)}>
          <div className="grid gap-3">
            <Input label="Subject Name" value={createPayload.name} onChange={v => setCreatePayload(s => ({ ...s, name: v }))} />
            <Select label="Department" value={createPayload.department} onChange={v => setCreatePayload(s => ({ ...s, department: v }))} options={DEPARTMENTS} />
            <Select label="Level" value={createPayload.level} onChange={v => setCreatePayload(s => ({ ...s, level: v }))} options={LEVELS} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <NumberInput label="Pass Mark (%)" value={createPayload.passMark} onChange={v => setCreatePayload(s => ({ ...s, passMark: Number(v) }))} />
              <NumberInput label="Exam Weight (%)" value={createPayload.examWeight} onChange={v => setCreatePayload(s => ({ ...s, examWeight: Number(v) }))} />
              <NumberInput label="Classwork Weight (%)" value={createPayload.classWorkWeight} onChange={v => setCreatePayload(s => ({ ...s, classWorkWeight: Number(v) }))} />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button className="px-3 py-2 border rounded-lg inline-flex items-center gap-2" onClick={() => setOpenCreate(false)}>
                <X className="h-4 w-4" /> Cancel
              </button>
              <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg inline-flex items-center gap-2" onClick={handleCreate}>
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit */}
      {editing && (
        <Modal title="Edit Subject" icon={<Edit3 className="h-5 w-5" />} onClose={() => setEditing(null)}>
          <div className="grid gap-3">
            <Input label="Subject Name" value={editing.name} onChange={v => setEditing(s => ({ ...s, name: v }))} />
            <Select label="Department" value={editing.department} onChange={v => setEditing(s => ({ ...s, department: v }))} options={DEPARTMENTS} />
            <Select label="Level" value={editing.level} onChange={v => setEditing(s => ({ ...s, level: v }))} options={LEVELS} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <NumberInput label="Pass Mark (%)" value={editing.passMark} onChange={v => setEditing(s => ({ ...s, passMark: Number(v) }))} />
              <NumberInput label="Exam Weight (%)" value={editing.examWeight} onChange={v => setEditing(s => ({ ...s, examWeight: Number(v) }))} />
              <NumberInput label="Classwork Weight (%)" value={editing.classWorkWeight} onChange={v => setEditing(s => ({ ...s, classWorkWeight: Number(v) }))} />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button className="px-3 py-2 border rounded-lg inline-flex items-center gap-2" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" /> Cancel
              </button>
              <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg inline-flex items-center gap-2" onClick={handleUpdate}>
                <CheckCircle2 className="h-4 w-4" /> Update
              </button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}

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
function Input({ label, value, onChange }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800" />
    </label>
  );
}
function NumberInput({ label, value, onChange }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800" />
    </label>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800">
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
