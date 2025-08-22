// src/pages/ManageExamReportPage.js
import React, { useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import {
  Plus, Save, Upload, Download, CheckCircle2, CircleAlert,
  Search, X, FileText, ShieldCheck, Eye, EyeOff, Trash2
} from "lucide-react";

/**
 * ManageExamReportPage
 * Roles: Admin, HeadTeacher, Teacher (as per your menus)
 * Replace MOCK_* with API calls later.
 */

const TERMS = ["Term 1", "Term 2", "Term 3"];
const YEARS = ["2025/26", "2024/25"];
const CLASSES = ["P4", "P5", "JHS 2", "JHS 3"];
const SUBJECTS = ["Mathematics", "English", "Integrated Science", "ICT"];

const SUBJECT_WEIGHTS = {
  Mathematics: { examWeight: 70, classWorkWeight: 30, passMark: 50 },
  English: { examWeight: 70, classWorkWeight: 30, passMark: 50 },
  "Integrated Science": { examWeight: 60, classWorkWeight: 40, passMark: 50 },
  ICT: { examWeight: 60, classWorkWeight: 40, passMark: 50 },
};

// Mock students by class
const MOCK_STUDENTS_BY_CLASS = {
  P4: [
    { id: "STU001", name: "Ama Boateng" },
    { id: "STU002", name: "Kojo Mensah" },
  ],
  "JHS 2": [
    { id: "STU004", name: "Yaw Adjei" },
  ],
  P5: [
    { id: "STU003", name: "Akua Owusu" },
  ],
  "JHS 3": [],
};

// Mock existing exams (you’d fetch list)
const MOCK_EXAMS = [
  {
    id: "EX2025-T1-P4-Maths",
    label: "Mid-Term Test",
    year: "2025/26",
    term: "Term 1",
    className: "P4",
    subject: "Mathematics",
    status: "published", // draft | pending-approval | published
    marks: { STU001: { exam: 78, classwork: 24 }, STU002: { exam: 82, classwork: 21 } },
    meta: { createdBy: "teacher@school.com", approvedBy: "ht@school.com" }
  }
];

const DEFAULT_SCALE = [
  { grade: "A1", min: 80, remark: "Excellent" },
  { grade: "B2", min: 70, remark: "Very Good" },
  { grade: "B3", min: 65, remark: "Good" },
  { grade: "C4", min: 60, remark: "Credit" },
  { grade: "C5", min: 55, remark: "Credit" },
  { grade: "C6", min: 50, remark: "Credit" },
  { grade: "D7", min: 45, remark: "Pass" },
  { grade: "E8", min: 40, remark: "Pass" },
  { grade: "F9", min: 0,  remark: "Fail" },
];

export default function ManageExamReportPage() {
  // Filters
  const [year, setYear] = useState(YEARS[0]);
  const [term, setTerm] = useState(TERMS[0]);
  const [klass, setKlass] = useState(CLASSES[0]);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [query, setQuery] = useState("");

  // Exams & selection
  const [exams, setExams] = useState(MOCK_EXAMS);
  const filteredExams = useMemo(
    () => exams.filter(e => e.year === year && e.term === term && e.className === klass && e.subject === subject),
    [exams, year, term, klass, subject]
  );
  const [selectedExamId, setSelectedExamId] = useState(filteredExams[0]?.id || "");
  React.useEffect(() => {
    // Keep selected exam valid across filter changes
    if (!filteredExams.find(e => e.id === selectedExamId)) {
      setSelectedExamId(filteredExams[0]?.id || "");
    }
  }, [filteredExams, selectedExamId]);

  // Active exam object
  const activeExam = useMemo(() => filteredExams.find(e => e.id === selectedExamId) || null, [filteredExams, selectedExamId]);

  // Editing state for marks
  const students = useMemo(() => MOCK_STUDENTS_BY_CLASS[klass] || [], [klass]);
  const weights = SUBJECT_WEIGHTS[subject] || { examWeight: 70, classWorkWeight: 30, passMark: 50 };
  const [scale] = useState(DEFAULT_SCALE);

  const [editingMarks, setEditingMarks] = useState(() => activeExam?.marks || {});
  React.useEffect(() => {
    setEditingMarks(activeExam?.marks || {});
  }, [activeExam?.id]); // reload when switching exams

  function setMark(stuId, field, value) {
    const v = value === "" ? "" : clamp(Number(value), 0, 100);
    setEditingMarks(prev => ({
      ...prev,
      [stuId]: { exam: prev[stuId]?.exam ?? "", classwork: prev[stuId]?.classwork ?? "", [field]: v }
    }));
  }

  // Derived rows with computed totals & grade
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter(s => (q ? s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) : true))
      .map(s => {
        const m = editingMarks[s.id] || { exam: "", classwork: "" };
        const exam = m.exam === "" ? "" : clamp(m.exam, 0, 100);
        const cw = m.classwork === "" ? "" : clamp(m.classwork, 0, 100);
        const total =
          exam === "" || cw === ""
            ? ""
            : round2(exam * (weights.examWeight / 100) + cw * (weights.classWorkWeight / 100));
        const g = total === "" ? { grade: "-", remark: "-" } : gradeFromScale(total, scale);
        return { ...s, exam, classwork: cw, total, grade: g.grade, remark: g.remark };
      });
  }, [students, editingMarks, query, weights, scale]);

  // Actions
  function newExam() {
    const id = `${Date.now()}-${term}-${klass}-${subject}`;
    const draft = {
      id,
      label: "New Exam",
      year,
      term,
      className: klass,
      subject,
      status: "draft",
      marks: {},
      meta: { createdBy: "you@school.com" },
    };
    setExams(prev => [draft, ...prev]);
    setSelectedExamId(id);
    setEditingMarks({});
  }

  function saveDraft() {
    if (!activeExam) return;
    const updated = exams.map(e =>
      e.id === activeExam.id ? { ...e, marks: sanitizeMarks(editingMarks) } : e
    );
    setExams(updated);
    window.alert("Draft saved.");
  }

  function submitForApproval() {
    if (!activeExam) return;
    const updated = exams.map(e =>
      e.id === activeExam.id ? { ...e, status: "pending-approval", marks: sanitizeMarks(editingMarks) } : e
    );
    setExams(updated);
    window.alert("Submitted for HeadTeacher approval.");
  }

  function publish() {
    if (!activeExam) return;
    const updated = exams.map(e =>
      e.id === activeExam.id ? { ...e, status: "published", marks: sanitizeMarks(editingMarks) } : e
    );
    setExams(updated);
    window.alert("Exam published.");
  }

  function unpublish() {
    if (!activeExam) return;
    const updated = exams.map(e =>
      e.id === activeExam.id ? { ...e, status: "draft" } : e
    );
    setExams(updated);
    window.alert("Exam moved back to Draft.");
  }

  function removeExam() {
    if (!activeExam) return;
    if (!window.confirm("Delete this exam? This cannot be undone.")) return;
    setExams(prev => prev.filter(e => e.id !== activeExam.id));
    setSelectedExamId("");
  }

  function importCsvStub() {
    window.alert("Open file picker and parse CSV here. Map columns to StudentID, Exam, Classwork.");
  }

  function exportCsv() {
    if (!activeExam) return;
    const header = "StudentID,StudentName,Exam,Classwork,Total,Grade,Remark\n";
    const lines = rows.map(r => `${r.id},${r.name},${r.exam},${r.classwork},${r.total},${r.grade},${r.remark}`).join("\n");
    downloadText(`${klass}_${subject}_${term}_${year}_${activeExam.label}.csv`, header + lines, "text/csv");
  }

  const canSubmit = activeExam && activeExam.status === "draft";
  const canPublish = activeExam && (activeExam.status === "draft" || activeExam.status === "pending-approval");
  const canUnpublish = activeExam && activeExam.status === "published";

  return (
    <DashboardLayout title="Manage Exam Report" subtitle="Enter scores, manage drafts, and publish results">
      {/* Filters & Exam header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-100 dark:border-gray-700 mb-6">
        <div className="grid lg:grid-cols-12 gap-3">
          <Select className="lg:col-span-2" label="Year" value={year} onChange={setYear} options={YEARS} />
          <Select className="lg:col-span-2" label="Term" value={term} onChange={setTerm} options={TERMS} />
          <Select className="lg:col-span-2" label="Class" value={klass} onChange={setKlass} options={CLASSES} />
          <Select className="lg:col-span-3" label="Subject" value={subject} onChange={setSubject} options={SUBJECTS} />
          <ExamPicker
            className="lg:col-span-3"
            exams={filteredExams}
            value={selectedExamId}
            onChange={setSelectedExamId}
            onNew={newExam}
          />
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={saveDraft} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg">
            <Save className="h-4 w-4" /> Save Draft
          </button>
          <button onClick={importCsvStub} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          {canSubmit && (
            <button onClick={submitForApproval} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
              <ShieldCheck className="h-4 w-4" /> Submit for Approval
            </button>
          )}
          {canPublish && (
            <button onClick={publish} className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg">
              <CheckCircle2 className="h-4 w-4" /> Publish
            </button>
          )}
          {canUnpublish && (
            <button onClick={unpublish} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
              <EyeOff className="h-4 w-4" /> Unpublish
            </button>
          )}
          {activeExam && (
            <button onClick={removeExam} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-red-600 border-red-200 dark:border-red-800">
              <Trash2 className="h-4 w-4" /> Delete Exam
            </button>
          )}
        </div>

        {/* Status */}
        <div className="mt-3">
          {activeExam ? <StatusBadge status={activeExam.status} /> : <EmptyHint />}
        </div>
      </div>

      {/* Marks table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700 flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-500" />
          <div className="font-semibold">Enter Scores</div>
          <div className="ml-auto relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-3 py-2 w-64 border rounded-lg bg-white dark:bg-gray-900 text-sm"
              placeholder="Search student name or ID"
            />
          </div>
        </div>

        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
                <th className="py-2">Student</th>
                <th className="py-2">Student ID</th>
                <th className="py-2">Exam ({weights.examWeight}%)</th>
                <th className="py-2">Classwork ({weights.classWorkWeight}%)</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2">Grade</th>
                <th className="py-2">Remark</th>
                <th className="py-2">Valid</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const validExam = r.exam === "" || (r.exam >= 0 && r.exam <= 100);
                const validCw = r.classwork === "" || (r.classwork >= 0 && r.classwork <= 100);
                const isValid = validExam && validCw && r.exam !== "" && r.classwork !== "";
                return (
                  <tr key={r.id} className="border-b last:border-0 dark:border-gray-700">
                    <td className="py-2">{r.name}</td>
                    <td className="py-2">{r.id}</td>
                    <td className="py-2">
                      <NumberInput
                        value={r.exam}
                        onChange={(v) => setMark(r.id, "exam", v)}
                        invalid={!validExam}
                      />
                    </td>
                    <td className="py-2">
                      <NumberInput
                        value={r.classwork}
                        onChange={(v) => setMark(r.id, "classwork", v)}
                        invalid={!validCw}
                      />
                    </td>
                    <td className="py-2 text-right font-semibold">{r.total === "" ? "-" : r.total}</td>
                    <td className="py-2">{r.grade}</td>
                    <td className="py-2">{r.remark}</td>
                    <td className="py-2">
                      {isValid ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <CircleAlert className="h-4 w-4 text-amber-500" />
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-500 dark:text-gray-400">
                    No students found for this class/filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print styles (no-op here but kept for consistency) */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </DashboardLayout>
  );
}

/* --- Small Components --- */

function StatusBadge({ status }) {
  const map = {
    draft: { label: "Draft", cls: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200" },
    "pending-approval": { label: "Pending Approval", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
    published: { label: "Published", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  };
  const s = map[status] || map.draft;
  return <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function EmptyHint() {
  return (
    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
      <X className="h-4 w-4" /> No exam selected. Create a new one or pick from the list.
    </div>
  );
}

function ExamPicker({ className = "", exams, value, onChange, onNew }) {
  return (
    <label className={`text-sm grid gap-1 ${className}`}>
      <span className="text-gray-700 dark:text-gray-300">Exam</span>
      <div className="flex gap-2">
        <select
          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {exams.length === 0 && <option value="">No exams yet</option>}
          {exams.map(e => (
            <option key={e.id} value={e.id}>
              {e.label} • {prettyStatus(e.status)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg"
        >
          <Plus className="h-4 w-4" /> New
        </button>
      </div>
    </label>
  );
}

function NumberInput({ value, onChange, invalid }) {
  return (
    <input
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-2 py-1 w-24 border rounded-lg bg-white dark:bg-gray-900 ${invalid ? "border-red-400" : ""}`}
      placeholder="0-100"
    />
  );
}

function Select({ label, value, onChange, options, className = "" }) {
  const opts = Array.isArray(options) && typeof options[0] === "object" ? options : options.map(o => ({ label: o, value: o }));
  return (
    <label className={`text-sm grid gap-1 ${className}`}>
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <select
        className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {opts.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

/* --- Utils --- */
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isNaN(n) ? 0 : n));
}
function gradeFromScale(total, scale) {
  const t = Number(total || 0);
  const row = [...scale].sort((a, b) => b.min - a.min).find(r => t >= r.min) || { grade: "-", remark: "-" };
  return row;
}
function sanitizeMarks(marks) {
  const clean = {};
  Object.entries(marks || {}).forEach(([sid, m]) => {
    if (m && m.exam !== "" && m.classwork !== "") {
      clean[sid] = { exam: clamp(m.exam, 0, 100), classwork: clamp(m.classwork, 0, 100) };
    }
  });
  return clean;
}
function downloadText(filename, content, mime) {
  const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function prettyStatus(s) {
  if (s === "pending-approval") return "Pending";
  return s[0].toUpperCase() + s.slice(1);
}
