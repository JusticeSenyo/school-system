// src/pages/PrintExamReportPage.js
import React, { useMemo, useRef, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import {
  Printer, Download, Search, BookOpen, Users, MessageSquare, Send, Phone, Copy
} from "lucide-react";

/**
 * PrintExamReportPage
 * - Filters: Term, Year, Class, Subject
 * - Student picker with search
 * - Template: Summary / Detailed
 * - Grading scale with live grade compute
 * - Print & Export CSV
 *
 * Replace MOCK data with your API later.
 */

const TERMS = ["Term 1", "Term 2", "Term 3"];
const YEARS = ["2025/26", "2024/25"];
const CLASSES = ["P4", "P5", "JHS 2", "JHS 3"];
const SUBJECTS = ["Mathematics", "English", "Integrated Science", "ICT"];
const TEMPLATES = ["Summary", "Detailed"];

// Mock students (replace with backend)
const MOCK_STUDENTS = [
  { id: "STU001", name: "Ama Boateng", className: "P4", parentPhone: "+233200000001" },
  { id: "STU002", name: "Kojo Mensah", className: "P4", parentPhone: "+233200000002" },
  { id: "STU003", name: "Akua Owusu", className: "JHS 2", parentPhone: "+233200000003" },
];

// Mock subject weighting (could also come from Manage Subjects)
const SUBJECT_WEIGHTS = {
  Mathematics: { examWeight: 70, classWorkWeight: 30, passMark: 50 },
  English: { examWeight: 70, classWorkWeight: 30, passMark: 50 },
  "Integrated Science": { examWeight: 60, classWorkWeight: 40, passMark: 50 },
  ICT: { examWeight: 60, classWorkWeight: 40, passMark: 50 },
};

// Mock scores (replace with backend results)
const MOCK_SCORES = {
  STU001: {
    Mathematics: { exam: 78, classwork: 24 }, // out of weight proportions (100-scale each)
    English: { exam: 69, classwork: 26 },
    "Integrated Science": { exam: 65, classwork: 32 },
  },
  STU002: {
    Mathematics: { exam: 82, classwork: 21 },
    English: { exam: 58, classwork: 28 },
    "Integrated Science": { exam: 55, classwork: 37 },
  },
  STU003: {
    Mathematics: { exam: 71, classwork: 27 },
    English: { exam: 76, classwork: 25 },
    ICT: { exam: 80, classwork: 34 },
  },
};

// Default grading scale
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

export default function PrintExamReportPage() {
  const [term, setTerm] = useState(TERMS[0]);
  const [year, setYear] = useState(YEARS[0]);
  const [klass, setKlass] = useState(CLASSES[0]);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [q, setQ] = useState("");

  const [selectedStudentId, setSelectedStudentId] = useState(
    MOCK_STUDENTS.find(s => s.className === klass)?.id || MOCK_STUDENTS[0].id
  );

  // Optional: Allow custom pass mark / scale override per subject
  const weights = SUBJECT_WEIGHTS[subject] || { examWeight: 70, classWorkWeight: 30, passMark: 50 };
  const [scale, setScale] = useState(DEFAULT_SCALE);

  const previewRef = useRef(null);

  const studentsInClass = useMemo(
    () => MOCK_STUDENTS.filter(s => s.className === klass),
    [klass]
  );

  const studentsFiltered = useMemo(
    () =>
      studentsInClass.filter(s =>
        q ? s.name.toLowerCase().includes(q.toLowerCase()) || s.id.toLowerCase().includes(q.toLowerCase()) : true
      ),
    [q, studentsInClass]
  );

  const student =
    useMemo(() => studentsFiltered.find(s => s.id === selectedStudentId) || studentsFiltered[0], [selectedStudentId, studentsFiltered]);

  const allSubjectsForStudent = useMemo(() => {
    const scores = MOCK_SCORES[student?.id] || {};
    return Object.keys(scores);
  }, [student]);

  const currentScores = useMemo(() => {
    const scores = MOCK_SCORES[student?.id] || {};
    // if chosen subject has no score, fallback to first subject for preview
    if (!scores[subject] && allSubjectsForStudent.length) {
      return scores[allSubjectsForStudent[0]];
    }
    return scores[subject] || { exam: 0, classwork: 0 };
  }, [student, subject, allSubjectsForStudent]);

  const computed = useMemo(() => {
    const exam = clamp(currentScores.exam, 0, 100);
    const cw = clamp(currentScores.classwork, 0, 100);
    const total = (exam * (weights.examWeight / 100)) + (cw * (weights.classWorkWeight / 100));
    const gradeObj = gradeFromScale(total, scale);
    return {
      exam, cw,
      total: round2(total),
      grade: gradeObj.grade,
      remark: gradeObj.remark,
      pass: total >= (weights.passMark ?? 50),
    };
  }, [currentScores, weights, scale]);

  function handlePrint() {
    window.print();
  }

  function exportCsv() {
    // Export for whole class for the chosen subject
    const header = "StudentID,StudentName,Class,Term,Year,Subject,Exam,Classwork,Total,Grade,Remark\n";
    const rows = studentsFiltered.map(s => {
      const sc = MOCK_SCORES[s.id]?.[subject] || { exam: 0, classwork: 0 };
      const total = (clamp(sc.exam, 0, 100) * (weights.examWeight / 100)) + (clamp(sc.classwork, 0, 100) * (weights.classWorkWeight / 100));
      const g = gradeFromScale(total, scale);
      return `${s.id},${s.name},${klass},${term},${year},${subject},${sc.exam},${sc.classwork},${round2(total)},${g.grade},${g.remark}`;
    }).join("\n");
    downloadText(`${klass}_${subject}_${term}_${year}_exam_report.csv`, header + rows, "text/csv");
  }

  function copyShareLink() {
    const link = `https://portal.schoolmasterhub.com/${year}/${term}/${klass}/exam-report/${subject}`;
    navigator.clipboard?.writeText(link);
    alert("Report link copied.");
  }

  function sendWhatsApp() {
    const message = encodeURIComponent(
      `Exam Report • ${subject} • ${term} ${year}\nStudent: ${student?.name} (${student?.id})\nTotal: ${computed.total} (${computed.grade}) — ${computed.remark}`
    );
    window.open(`https://wa.me/${(student?.parentPhone || "").replace(/[^\d]/g, "")}?text=${message}`, "_blank", "noopener,noreferrer");
  }

  function sendSMS() {
    alert("SMS sent (stub). Integrate with your SMS provider here.");
  }

  function sendEmail() {
    const subjectLine = encodeURIComponent(`Exam Report - ${subject} - ${term} ${year}`);
    const body = encodeURIComponent(
      `Dear Parent,\n\nExam report for ${student?.name} (${student?.id}) in ${student?.className}:\nSubject: ${subject}\nExam: ${computed.exam}\nClasswork: ${computed.cw}\nTotal: ${computed.total}\nGrade: ${computed.grade} (${computed.remark})\n\nThank you.`
    );
    window.location.href = `mailto:?subject=${subjectLine}&body=${body}`;
  }

  return (
    <DashboardLayout title="Print Exam Report" subtitle="Generate and print exam reports for students">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-100 dark:border-gray-700 mb-6">
        <div className="grid lg:grid-cols-12 gap-3">
          <Select className="lg:col-span-2" label="Term" value={term} onChange={setTerm} options={TERMS} />
          <Select className="lg:col-span-2" label="Year" value={year} onChange={setYear} options={YEARS} />
          <Select className="lg:col-span-2" label="Class" value={klass} onChange={v => { setKlass(v); setSelectedStudentId(MOCK_STUDENTS.find(s => s.className === v)?.id || ""); }} options={CLASSES} />
          <Select className="lg:col-span-3" label="Subject" value={subject} onChange={setSubject} options={SUBJECTS} />
          <Select className="lg:col-span-3" label="Template" value={template} onChange={setTemplate} options={TEMPLATES} />
          <div className="lg:col-span-6">
            <label className="text-sm grid gap-1">
              <span className="text-gray-700 dark:text-gray-300">Find Student</span>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-9 pr-3 py-2 w-full border rounded-lg bg-white dark:bg-gray-900 text-sm"
                  placeholder="Search by name or ID"
                />
              </div>
            </label>
          </div>
          <div className="lg:col-span-6">
            <label className="text-sm grid gap-1">
              <span className="text-gray-700 dark:text-gray-300">Student</span>
              <select
                className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                {studentsFiltered.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id}) — {s.className}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handlePrint} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg">
            <Printer className="h-4 w-4" /> Print Report
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
            <Download className="h-4 w-4" /> Export CSV (Class)
          </button>
          <button onClick={copyShareLink} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
            <Copy className="h-4 w-4" /> Copy Report Link
          </button>
          <button onClick={sendWhatsApp} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
            <MessageSquare className="h-4 w-4" /> WhatsApp
          </button>
          <button onClick={sendSMS} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
            <Phone className="h-4 w-4" /> SMS
          </button>
          <button onClick={sendEmail} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
            <Send className="h-4 w-4" /> Email
          </button>
        </div>
      </div>

      {/* Preview / Print area */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <div className="p-4 print:p-0" ref={previewRef}>
          <ExamReportDocument
            template={template}
            term={term}
            year={year}
            klass={klass}
            subject={subject}
            student={student}
            weights={weights}
            computed={computed}
            scale={scale}
          />
        </div>
      </div>

      {/* Print-only CSS */}
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}
      </style>
    </DashboardLayout>
  );
}

function ExamReportDocument({ template, term, year, klass, subject, student, weights, computed, scale }) {
  const school = {
    name: "Bright Future Academy",
    address: "Accra, Ghana",
    phone: "+233 20 000 0000",
    email: "admin@brightfuture.edu",
    logoUrl: "",
  };

  return (
    <div className="print-area max-w-3xl mx-auto my-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b dark:border-gray-700 flex items-start gap-4">
        {school.logoUrl ? (
          <img src={school.logoUrl} alt="School Logo" className="h-14 w-14 object-contain" />
        ) : (
          <div className="h-14 w-14 rounded bg-indigo-600" />
        )}
        <div className="flex-1">
          <div className="text-xl font-bold">{school.name}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{school.address}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{school.phone} · {school.email}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">Exam Report</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{term}, {year}</div>
        </div>
      </div>

      {/* Student & Subject Info */}
      <div className="p-6 grid sm:grid-cols-2 gap-3">
        <InfoRow label="Student Name" value={student?.name || "-"} />
        <InfoRow label="Student ID" value={student?.id || "-"} />
        <InfoRow label="Class" value={klass} />
        <InfoRow label="Subject" value={subject} />
      </div>

      {/* Scores */}
      <div className="px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
              <th className="py-2">Component</th>
              <th className="py-2">Weight</th>
              {template === "Detailed" && <th className="py-2">Raw Score (0-100)</th>}
              <th className="py-2 text-right">Weighted</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b dark:border-gray-700">
              <td className="py-2">Examination</td>
              <td className="py-2">{weights.examWeight}%</td>
              {template === "Detailed" && <td className="py-2">{computed.exam}</td>}
              <td className="py-2 text-right">{round2(computed.exam * (weights.examWeight / 100))}</td>
            </tr>
            <tr>
              <td className="py-2">Classwork / Continuous Assessment</td>
              <td className="py-2">{weights.classWorkWeight}%</td>
              {template === "Detailed" && <td className="py-2">{computed.cw}</td>}
              <td className="py-2 text-right">{round2(computed.cw * (weights.classWorkWeight / 100))}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={template === "Detailed" ? 3 : 2} className="pt-3 text-right font-medium">
                Total
              </td>
              <td className="pt-3 text-right font-bold">{computed.total}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Grade & Remark */}
      <div className="px-6 py-4 grid sm:grid-cols-3 gap-3">
        <InfoRow label="Grade" value={computed.grade} />
        <InfoRow label="Remark" value={computed.remark} />
        <InfoRow label="Pass Mark" value={`${weights.passMark}%`} />
      </div>

      {/* Grading Scale */}
      {template === "Detailed" && (
        <div className="px-6 pb-6">
          <div className="text-sm font-semibold mb-1 flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Grading Scale
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs border w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="p-2 text-left">Grade</th>
                  <th className="p-2 text-left">Min %</th>
                  <th className="p-2 text-left">Remark</th>
                </tr>
              </thead>
              <tbody>
                {scale.map(row => (
                  <tr key={row.grade} className="border-t">
                    <td className="p-2">{row.grade}</td>
                    <td className="p-2">{row.min}</td>
                    <td className="p-2">{row.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Signature */}
      <div className="px-6 pb-10">
        <div className="flex justify-between">
          <Signature label="Head Teacher" />
          <Signature label="Class Teacher" />
          <Signature label="Parent/Guardian" />
        </div>
      </div>
    </div>
  );
}

function Signature({ label }) {
  return (
    <div className="text-center w-1/3">
      <div className="h-14" />
      <div className="border-t dark:border-gray-600 w-40 mx-auto" />
      <div className="text-xs mt-1">{label} Signature</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <div className="font-medium text-gray-800 dark:text-gray-100">{String(value ?? "-")}</div>
    </div>
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

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number(n || 0)));
}
function gradeFromScale(total, scale) {
  const t = Number(total || 0);
  const row = [...scale].sort((a, b) => b.min - a.min).find(r => t >= r.min) || { grade: "-", remark: "-" };
  return row;
}
function downloadText(filename, content, mime) {
  const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
