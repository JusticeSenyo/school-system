import React, { useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { Search, Plus, Edit3, Trash2, X, Save, CheckCircle2, Users } from "lucide-react";
import { Link } from "react-router-dom";

const LEVELS = ["KG", "Primary", "JHS"];
const STREAMS = ["A", "B", "C"]; // optional stream suffix

const MOCK_CLASSES = [
  { id: 1, name: "P4", level: "Primary", stream: "A", capacity: 35, classTeacher: "Mrs. Mensah" },
  { id: 2, name: "P5", level: "Primary", stream: "B", capacity: 35, classTeacher: "Mr. Owusu" },
  { id: 3, name: "JHS 2", level: "JHS", stream: "A", capacity: 40, classTeacher: "Ms. Adjei" },
];

export default function ManageClassesPage() {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("All");
  const [rows, setRows] = useState(MOCK_CLASSES);

  const [openCreate, setOpenCreate] = useState(false);
  const [createPayload, setCreatePayload] = useState({ name: "", level: LEVELS[1], stream: "A", capacity: 35 });
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    return rows.filter(r =>
      (level === "All" || r.level === level) &&
      (q ? r.name.toLowerCase().includes(q.toLowerCase()) : true)
    );
  }, [rows, q, level]);

  function handleCreate() {
    if (!createPayload.name) return;
    const next = { id: Math.max(0, ...rows.map(r => r.id)) + 1, ...createPayload, capacity: Number(createPayload.capacity) };
    setRows(prev => [...prev, next]);
    setOpenCreate(false);
    // TODO: POST /academics/classes
  }

  function handleUpdate() {
    if (!editing) return;
    setRows(prev => prev.map(r => r.id === editing.id ? { ...editing, capacity: Number(editing.capacity) } : r));
    setEditing(null);
    // TODO: PUT /academics/classes/:id
  }

  function handleDelete(id) {
    setRows(prev => prev.filter(r => r.id !== id));
    // TODO: DELETE /academics/classes/:id
  }

  return (
    <DashboardLayout title="Manage Classes" subtitle="Create classes, set levels and capacities">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-sm" placeholder="Search class" />
            </div>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              {["All", ...LEVELS].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <button onClick={() => setOpenCreate(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg">
            <Plus className="h-4 w-4" /> New Class
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
                <th className="p-3">Class</th>
                <th className="p-3">Level</th>
                <th className="p-3">Stream</th>
                <th className="p-3">Capacity</th>
                <th className="p-3">Class Teacher</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b last:border-0 dark:border-gray-700">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3">{r.level}</td>
                  <td className="p-3">{r.stream}</td>
                  <td className="p-3">{r.capacity}</td>
                  <td className="p-3">
                    {r.classTeacher ? (
                      <span>{r.classTeacher}</span>
                    ) : (
                      <Link to="/dashboard/class-teacher" className="text-indigo-600 hover:underline inline-flex items-center gap-1">
                        <Users className="h-4 w-4" /> Assign
                      </Link>
                    )}
                  </td>
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
            <Input label="Class Name (e.g., P4)" value={createPayload.name} onChange={v => setCreatePayload(s => ({ ...s, name: v }))} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select label="Level" value={createPayload.level} onChange={v => setCreatePayload(s => ({ ...s, level: v }))} options={LEVELS} />
              <Select label="Stream" value={createPayload.stream} onChange={v => setCreatePayload(s => ({ ...s, stream: v }))} options={STREAMS} />
              <NumberInput label="Capacity" value={createPayload.capacity} onChange={v => setCreatePayload(s => ({ ...s, capacity: Number(v) }))} />
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
        <Modal title="Edit Class" onClose={() => setEditing(null)}>
          <div className="grid gap-3">
            <Input label="Class Name" value={editing.name} onChange={v => setEditing(s => ({ ...s, name: v }))} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select label="Level" value={editing.level} onChange={v => setEditing(s => ({ ...s, level: v }))} options={LEVELS} />
              <Select label="Stream" value={editing.stream} onChange={v => setEditing(s => ({ ...s, stream: v }))} options={STREAMS} />
              <NumberInput label="Capacity" value={editing.capacity} onChange={v => setEditing(s => ({ ...s, capacity: Number(v) }))} />
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
