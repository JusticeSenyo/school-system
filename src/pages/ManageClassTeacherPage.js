import React, { useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { Search, UserPlus, Edit3, Trash2, X, Save, CheckCircle2, Users } from "lucide-react";

const CLASSES = ["KG 1", "KG 2", "P1", "P2", "P3", "P4", "P5", "JHS 1", "JHS 2", "JHS 3"];
const TEACHERS = [
  { id: "T001", name: "Mrs. Mensah", subject: "Maths" },
  { id: "T002", name: "Mr. Owusu", subject: "English" },
  { id: "T003", name: "Ms. Adjei", subject: "Science" },
  { id: "T004", name: "Mr. Amoah", subject: "ICT" },
];

const MOCK_ASSIGNMENTS = [
  { id: 1, className: "P4", teacherId: "T001", teacherName: "Mrs. Mensah", coreSubject: "Maths" },
  { id: 2, className: "P5", teacherId: "T002", teacherName: "Mr. Owusu", coreSubject: "English" },
  { id: 3, className: "JHS 2", teacherId: "T003", teacherName: "Ms. Adjei", coreSubject: "Science" },
];

export default function ManageClassTeacherPage() {
  const [q, setQ] = useState("");
  const [klass, setKlass] = useState("All");
  const [rows, setRows] = useState(MOCK_ASSIGNMENTS);

  const [openCreate, setOpenCreate] = useState(false);
  const [createPayload, setCreatePayload] = useState({ className: CLASSES[0], teacherId: TEACHERS[0].id, coreSubject: TEACHERS[0].subject });
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    return rows.filter(r =>
      (klass === "All" || r.className === klass) &&
      (q ? r.className.toLowerCase().includes(q.toLowerCase()) || r.teacherName.toLowerCase().includes(q.toLowerCase()) : true)
    );
  }, [rows, q, klass]);

  const teacherById = (id) => TEACHERS.find(t => t.id === id);

  function handleCreate() {
    const t = teacherById(createPayload.teacherId);
    const next = {
      id: Math.max(0, ...rows.map(r => r.id)) + 1,
      className: createPayload.className,
      teacherId: createPayload.teacherId,
      teacherName: t?.name || "",
      coreSubject: createPayload.coreSubject || t?.subject || "",
    };
    setRows(prev => [...prev, next]);
    setOpenCreate(false);
    // TODO: POST /academics/class-teacher
  }

  function handleUpdate() {
    if (!editing) return;
    const t = teacherById(editing.teacherId);
    setRows(prev => prev.map(r => r.id === editing.id ? {
      ...editing,
      teacherName: t?.name || editing.teacherName,
      coreSubject: editing.coreSubject || t?.subject || editing.coreSubject,
    } : r));
    setEditing(null);
    // TODO: PUT /academics/class-teacher/:id
  }

  function handleDelete(id) {
    setRows(prev => prev.filter(r => r.id !== id));
    // TODO: DELETE /academics/class-teacher/:id
  }

  return (
    <DashboardLayout title="Manage Class Teacher" subtitle="Assign class teachers and update their core subjects">
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
                placeholder="Search by class or teacher"
              />
            </div>
            <select value={klass} onChange={(e) => setKlass(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              {["All", ...CLASSES].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={() => setOpenCreate(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg">
            <UserPlus className="h-4 w-4" /> Assign Class Teacher
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
                <th className="p-3">Teacher</th>
                <th className="p-3">Core Subject</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b last:border-0 dark:border-gray-700">
                  <td className="p-3 font-medium">{r.className}</td>
                  <td className="p-3">{r.teacherName} <span className="text-gray-500">({r.teacherId})</span></td>
                  <td className="p-3">{r.coreSubject}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button className="px-2 py-1 border rounded-lg inline-flex items-center gap-1" onClick={() => setEditing({ ...r })}>
                        <Edit3 className="h-4 w-4" /> Edit
                      </button>
                      <button className="px-2 py-1 border rounded-lg text-rose-600 inline-flex items-center gap-1" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td className="p-6 text-center text-gray-500 dark:text-gray-400" colSpan={4}>
                    No assignments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create */}
      {openCreate && (
        <Modal title="Assign Class Teacher" icon={<Users className="h-5 w-5" />} onClose={() => setOpenCreate(false)}>
          <div className="grid gap-3">
            <Select label="Class" value={createPayload.className} onChange={v => setCreatePayload(s => ({ ...s, className: v }))} options={CLASSES} />
            <Select
              label="Teacher"
              value={createPayload.teacherId}
              onChange={v => setCreatePayload(s => ({ ...s, teacherId: v, coreSubject: teacherById(v)?.subject || s.coreSubject }))}
              options={TEACHERS.map(t => ({ label: `${t.name} (${t.id}) — ${t.subject}`, value: t.id }))}
            />
            <Input label="Core Subject" value={createPayload.coreSubject} onChange={v => setCreatePayload(s => ({ ...s, coreSubject: v }))} />
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
        <Modal title="Edit Assignment" icon={<Edit3 className="h-5 w-5" />} onClose={() => setEditing(null)}>
          <div className="grid gap-3">
            <Select label="Class" value={editing.className} onChange={v => setEditing(s => ({ ...s, className: v }))} options={CLASSES} />
            <Select
              label="Teacher"
              value={editing.teacherId}
              onChange={v => setEditing(s => ({ ...s, teacherId: v, teacherName: teacherById(v)?.name || s.teacherName, coreSubject: teacherById(v)?.subject || s.coreSubject }))}
              options={TEACHERS.map(t => ({ label: `${t.name} (${t.id}) — ${t.subject}`, value: t.id }))}
            />
            <Input label="Core Subject" value={editing.coreSubject} onChange={v => setEditing(s => ({ ...s, coreSubject: v }))} />
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
function Select({ label, value, onChange, options }) {
  const opts = Array.isArray(options) && typeof options[0] === "object" ? options : options.map(o => ({ label: o, value: o }));
  return (
    <label className="text-sm grid gap-1">
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800">
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
