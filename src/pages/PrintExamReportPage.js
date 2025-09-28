// src/pages/PrintExamReportPage.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import {
  Printer,
  Search,
  BookOpen,
  Loader2,
  X,
  Building2,
  CalendarDays,
  Inbox,
  CheckCircle2,
  XCircle,
  Quote,
  UserRound,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "../AuthContext";

/* ------------ ORDS base ------------ */
const HOST =
  "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

/* ------------ Academic lookups ------------ */
const ACADEMIC_CLASSES_API = `${HOST}/academic/get/classes/`;
const ACADEMIC_YEAR_API = `${HOST}/academic/get/academic_year/`;
const ACADEMIC_TERM_API = `${HOST}/academic/get/term/`;
const SUBJECTS_API = `${HOST}/academic/get/subject/`; // ?p_school_id=

/* ------------ Exams APIs (LIVE) ------------ */
const STUDENT_REPORT_URL = ({
  sid,
  yearId,
  termId,
  classId,
  studentId,
  passMark,
}) => {
  const qp = new URLSearchParams({
    p_school_id: String(sid),
    p_year_id: String(yearId),
    p_term_id: String(termId),
    p_class_id: String(classId),
    p_student_id: String(studentId),
  });
  if (passMark != null && passMark !== "") qp.set("p_pass_mark", String(passMark));
  return `${HOST}/exams/marks/student/?${qp.toString()}`;
};

/* ------------ Review (single object) ------------ */
const REVIEW_URL = ({ sid, yearId, termId, classId, studentId }) => {
  const qp = new URLSearchParams({
    p_school_id: String(sid),
    p_year_id: String(yearId),
    p_term_id: String(termId),
    p_class_id: String(classId),
    p_student_id: String(studentId),
  });
  return `${HOST}/exams/review/student/?${qp.toString()}`;
};

/* ------------ Students API ------------ */
const STUDENTS_API = `${HOST}/student/get/students/`; // ?p_school_id=&p_class_id=

/* ------------ Grading scale (from marks_grade) ------------ */
const GRADING_SCALE_URL = ({ sid, classId }) => {
  const qp = new URLSearchParams({ p_school_id: String(sid) });
  if (classId != null && classId !== "") qp.set("p_class", String(classId));
  return `${HOST}/exams/scheme/get/?${qp.toString()}`;
};

/* ------------ helpers ------------ */
const jtxt = async (u, headers = {}) => {
  const r = await fetch(u, {
    cache: "no-store",
    headers: { Accept: "application/json", ...headers },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.text()).trim();
};
const jarr = async (u, headers = {}) => {
  const t = await jtxt(u, headers);
  if (!t) return [];
  try {
    const d = JSON.parse(t);
    return Array.isArray(d) ? d : Array.isArray(d.items) ? d.items : [];
  } catch {
    return [];
  }
};
const jobjectLenient = async (u, headers = {}) => {
  // Returns: {} for empty / no row, or a plain object if available
  try {
    const t = await jtxt(u, headers);
    if (!t) return {};
    try {
      const parsed = JSON.parse(t);
      // Some gateways wrap as items:[], standardize to plain object
      if (Array.isArray(parsed)) return parsed[0] || {};
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
        return parsed.items[0] || {};
      }
      return parsed || {};
    } catch {
      return {};
    }
  } catch {
    return {};
  }
};
const asArr = (v) => (Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : []);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export default function PrintExamReportPage() {
  const { user, token } = useAuth() || {};
  const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? 1;
  const H = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  // LOV state
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState(null);
  const [terms, setTerms] = useState([]);
  const [termId, setTermId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(null);

  // Students
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // Subjects (id -> name)
  const [subjectNames, setSubjectNames] = useState(new Map());

  // Report data
  const [studentReport, setStudentReport] = useState([]);
  const [scaleBands, setScaleBands] = useState([]);
  const [review, setReview] = useState(null); // teacher/head remarks, attendance, etc.

  // UX
  const [loading, setLoading] = useState(false);
  const [passMark] = useState(50);

  // Load Classes
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        const rows = await jarr(
          `${ACADEMIC_CLASSES_API}?p_school_id=${encodeURIComponent(
            schoolId
          )}`,
          H
        );
        const norm = rows
          .map((r) => ({
            id: r.class_id ?? r.CLASS_ID ?? r.id ?? r.ID,
            name: r.class_name ?? r.CLASS_NAME ?? r.name ?? r.NAME,
          }))
          .filter((x) => x.id != null);
        setClasses(norm);
        if (!classId && norm.length) setClassId(Number(norm[0].id));
      } catch {
        setClasses([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, H]);

  // Load Years
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const rows = await jarr(
        `${ACADEMIC_YEAR_API}?p_school_id=${encodeURIComponent(schoolId)}`,
        H
      );
      const all = rows
        .map((r) => ({
          id: r.academic_year_id ?? r.ACADEMIC_YEAR_ID,
          name: r.academic_year_name ?? r.ACADEMIC_YEAR_NAME,
          status: (r.status ?? r.STATUS) || "",
        }))
        .filter((a) => a.id != null);
      setYears(all);
      const cur = all.find(
        (a) => String(a.status).toUpperCase() === "CURRENT"
      );
      setYearId(Number(cur?.id ?? all[0]?.id ?? null));
    })();
  }, [schoolId, H]);

  // Load Terms
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const rows = await jarr(
        `${ACADEMIC_TERM_API}?p_school_id=${encodeURIComponent(schoolId)}`,
        H
      );
      const all = rows
        .map((r) => ({
          id: r.term_id ?? r.TERM_ID,
          name: r.term_name ?? r.TERM_NAME,
          status: (r.status ?? r.STATUS) || "",
        }))
        .filter((t) => t.id != null);
      setTerms(all);
      const cur = all.find(
        (t) => String(t.status).toUpperCase() === "CURRENT"
      );
      setTermId(Number(cur?.id ?? all[0]?.id ?? null));
    })();
  }, [schoolId, H]);

  // Load Subjects (id -> name map)
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        const rows = await jarr(
          `${SUBJECTS_API}?p_school_id=${encodeURIComponent(schoolId)}`,
          H
        );
        const m = new Map(
          rows
            .map((s) => {
              const id = Number(s.subject_id ?? s.SUBJECT_ID ?? s.id ?? s.ID);
              const name =
                s.subject_name ?? s.SUBJECT_NAME ?? s.name ?? s.NAME ?? "";
              return id ? [id, name] : null;
            })
            .filter(Boolean)
        );
        setSubjectNames(m);
      } catch {
        setSubjectNames(new Map());
      }
    })();
  }, [schoolId, H]);

  // Load Students (filtered by class) + include image_url
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        const url = `${STUDENTS_API}?p_school_id=${encodeURIComponent(
          schoolId
        )}${classId ? `&p_class_id=${encodeURIComponent(classId)}` : ""}`;
        const rows = await jarr(url, H);
        const byId = new Map(classes.map((c) => [Number(c.id), c.name]));
        const arr = rows
          .map((s) => ({
            id: s.student_id ?? s.STUDENT_ID ?? s.id ?? s.ID,
            name: s.full_name ?? s.FULL_NAME ?? s.name ?? s.NAME ?? "",
            index_no: s.index_no ?? s.INDEX_NO ?? "",
            class_id: s.class_id ?? s.CLASS_ID ?? null,
            class_name: byId.get(Number(s.class_id ?? s.CLASS_ID)) || "",
            parent_phone:
              s.guardian_phone ??
              s.GUARDIAN_PHONE ??
              s.father_phone ??
              s.FATHER_PHONE ??
              s.mother_phone ??
              s.MOTHER_PHONE ??
              "",
            email: s.email ?? s.EMAIL ?? "",
            image_url: s.image_url ?? s.IMAGE_URL ?? "", // student photo
          }))
          .filter((x) => x.id != null);
        setStudents(arr);
        if (
          !selectedStudentId ||
          !arr.find((a) => String(a.id) === String(selectedStudentId))
        ) {
          if (arr.length) setSelectedStudentId(String(arr[0].id));
          else setSelectedStudentId("");
        }
      } catch {
        setStudents([]);
        setSelectedStudentId("");
      }
    })();
  }, [schoolId, classId, classes, H]);

  // Load grading scale (from marks_grade) for this school + class
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        const url = GRADING_SCALE_URL({ sid: schoolId, classId });
        const rows = await jarr(url, H);
        const bands = rows.map((r) => ({
          grade: r.grade ?? r.GRADE ?? "",
          min: Number(r.percent_from ?? r.PERCENT_FROM ?? 0),
          max: Number(r.percent_to ?? r.PERCENT_TO ?? 0),
          remark: r.remarks ?? r.REMARKS ?? "",
          klass: r.class ?? r.CLASS ?? null,
        }));
        bands.sort((a, b) => (b.min || 0) - (a.min || 0));
        setScaleBands(bands);
      } catch {
        setScaleBands([]);
      }
    })();
  }, [schoolId, classId, H]);

  // Load student's full report + review
  useEffect(() => {
    const load = async () => {
      setStudentReport([]);
      setReview(null);
      if (!schoolId || !yearId || !termId || !classId || !selectedStudentId)
        return;
      setLoading(true);
      try {
        const t = await jtxt(
          STUDENT_REPORT_URL({
            sid: schoolId,
            yearId,
            termId,
            classId,
            studentId: selectedStudentId,
            passMark,
          }),
          H
        );
        let res;
        try {
          res = JSON.parse(t);
        } catch {
          res = [];
        }
        const arr = asArr(res).map((r) => ({
          subjectId: r.subject_id ?? r.SUBJECT_ID ?? r.subject,
          subjectName:
            r.subject_name ??
            r.SUBJECT_NAME ??
            (r.subject_id ? `Subject ${r.subject_id}` : ""),
          classwork: Number(
            r.classwork ?? r.CLASSWORK ?? r.class_score ?? r.CLASS_SCORE ?? 0
          ),
          exam: Number(r.exam ?? r.EXAM ?? r.exam_score ?? r.EXAM_SCORE ?? 0),
          total: Number(r.total ?? r.TOTAL ?? 0),
          grade: r.grade ?? r.GRADE ?? "",
          remark: r.remark ?? r.REMARK ?? r.meaning ?? r.MEANING ?? "",
          pass:
            String(r.pass ?? r.PASS).toUpperCase() === "Y" || r.pass === true,
        }));
        setStudentReport(arr);
      } catch {
        setStudentReport([]);
      }

      try {
        // REVIEW: single object with lower-case keys per your PL/SQL
        const revObj = await jobjectLenient(
          REVIEW_URL({
            sid: schoolId,
            yearId,
            termId,
            classId,
            studentId: selectedStudentId,
          }),
          H
        );

        // Normalize to a shallow object with both lower & upper lookups
        const norm = revObj && typeof revObj === "object" ? revObj : {};
        setReview(norm);
      } catch {
        setReview({});
      }

      setLoading(false);
    };
    load();
  }, [schoolId, yearId, termId, classId, selectedStudentId, passMark, H]);

  // helpers
  const getYearName = (id) =>
    years.find((y) => Number(y.id) === Number(id))?.name || id || "-";
  const getTermName = (id) =>
    terms.find((t) => Number(t.id) === Number(id))?.name || id || "-";
  const getClassName = (id) =>
    classes.find((c) => Number(c.id) === Number(id))?.name || id || "-";

  const student =
    useMemo(
      () => students.find((s) => String(s.id) === String(selectedStudentId)) || null,
      [students, selectedStudentId]
    );

  const previewRef = useRef(null);
  const handlePrint = () => window.print();

  // computed stats
  const stats = useMemo(() => {
    const count = studentReport.length;
    const totals = studentReport.map((r) => Number(r.total) || 0);
    const totalSum = totals.reduce((a, b) => a + b, 0);
    const avg = count ? round2(totalSum / count) : 0;
    const passes = studentReport.filter((r) => r.pass).length;
    const fails = count - passes;
    return { count, totalSum: round2(totalSum), avg, passes, fails };
  }, [studentReport]);

  return (
    <DashboardLayout
      title="Print Exam Report"
      subtitle=""
    >
      {/* Filters */}
      <div className="sticky top-0 z-10 pb-3 bg-gradient-to-b from-white/70 to-transparent dark:from-gray-900/60 backdrop-blur-md mb-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 border border-gray-100 dark:border-gray-700">
            {/* Make Student picker a full-width row */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <div className="col-span-1 md:col-span-2 xl:col-span-6">
              <StudentLov
                label="Student"
                students={students}
                value={selectedStudentId}
                onPick={(id) => setSelectedStudentId(id)}
              />
            </div>
            <LabeledSelect
              labelEl={<LabelWithIcon icon={<Building2 className="w-4 h-4" />} text="Class" />}
              value={classId ?? ""}
              onChange={(v) => setClassId(Number(v))}
            >
              {classes.length === 0 && <option value="">No classes</option>}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </LabeledSelect>
            <LabeledSelect
              labelEl={<LabelWithIcon icon={<CalendarDays className="w-4 h-4" />} text="Term" />}
              value={termId ?? ""}
              onChange={(v) => setTermId(Number(v))}
            >
              {terms.length === 0 && <option value="">No terms</option>}
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </LabeledSelect>
            <LabeledSelect
              labelEl={<LabelWithIcon icon={<Inbox className="w-4 h-4" />} text="Academic Year" />}
              value={yearId ?? ""}
              onChange={(v) => setYearId(Number(v))}
            >
              {years.length === 0 && <option value="">No years</option>}
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </LabeledSelect>

            <div className=" md:flex items-end">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg w-full md:w-auto"
              >
                <Printer className="h-4 w-4" /> Print Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
        <div className="p-4 print:p-0" ref={previewRef}>
          {loading ? (
            <div className="p-8 text-center text-gray-500 inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : student && studentReport.length > 0 ? (
            <StudentReportDocument
              termLabel={getTermName(termId)}
              yearLabel={getYearName(yearId)}
              klass={getClassName(classId)}
              student={student}
              subjects={studentReport}
              stats={stats}
              scale={scaleBands}
              review={review}
              subjectNames={subjectNames}
              school={{
                name: user?.school?.name || user?.school_name || "Your School",
                address: user?.school?.address || "",
                phone: user?.school?.phone || "",
                email: user?.school?.email || "",
                logoUrl: "",
              }}
            />
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Select a student. If blank, ensure marks exist for the chosen Term/Year/Class.
            </div>
          )}
        </div>
      </div>

      {/* Print styles */}
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

function StudentReportDocument({
  termLabel,
  yearLabel,
  klass,
  student,
  subjects,
  stats,
  scale,
  review,
  school,
  subjectNames,
}) {
  // Helper that reads either lower- or upper-cased API keys
  const pick = (o, a, b) => (o && (o[a] ?? o[b])) ?? undefined;

  const teacherRemark = pick(review, "teacher_remarks", "TEACHER_REMARKS") || "";
  const headRemark    = pick(review, "head_remarks",    "HEAD_REMARKS")    || "";
  const apiOverall    = pick(review, "overall_score",   "OVERALL_SCORE");
  const overallPos    = pick(review, "overall_position","OVERALL_POSITION") ?? "-";
  const attendance    = pick(review, "attendance",      "ATTENDANCE")      ?? "-";
  let reopen          = pick(review, "reopen_date",     "REOPEN_DATE")     ?? "-";

  // Normalize reopen format to YYYY-MM-DD if ISO
  if (typeof reopen === "string" && reopen.length >= 10) {
    reopen = reopen.slice(0, 10);
  }

  // If API didn't provide overall_score, use computed average
  const overallScore = apiOverall != null && apiOverall !== "" ? apiOverall : stats.avg;

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
          {(school.address || school.phone || school.email) && (
            <>
              <div className="text-sm text-gray-600 dark:text-gray-400">{school.address}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {[school.phone, school.email].filter(Boolean).join(" · ")}
              </div>
            </>
          )}
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">Exam Report</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {termLabel}, {yearLabel}
          </div>
          {klass ? (
            <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              Class: <span className="font-medium">{klass}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Student Info Row with Photo */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3">
          <InfoRow label="Student Name" value={student?.name || "-"} />
          <InfoRow label="Index No." value={student?.index_no || "-"} />
          <InfoRow label="Class" value={student?.class_name || klass || "-"} />
          <InfoRow label="Term / Year" value={`${termLabel} / ${yearLabel}`} />
        </div>
        <div className="justify-self-end">
          <StudentAvatar imageUrl={student?.image_url} name={student?.name} />
        </div>
      </div>

      {/* KPIs */}
      <div className="px-6 grid sm:grid-cols-4 gap-3 mb-4">
        <StatPill label="Subjects" value={stats.count} />
        <StatPill label="Total" value={stats.totalSum} />
        <StatPill label="Average" value={stats.avg} />
        <StatPill label="Pass / Fail" value={`${stats.passes} / ${stats.fails}`} />
      </div>

      {/* Subjects table */}
      <div className="px-6 pb-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
              <th className="py-2">#</th>
              <th className="py-2">Subject</th>
              <th className="py-2 text-right">Classwork</th>
              <th className="py-2 text-right">Exam</th>
              <th className="py-2 text-right">Total</th>
              <th className="py-2 text-right">Grade</th>
              <th className="py-2">Remark</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((r, idx) => (
              <tr key={`${r.subjectId}-${idx}`} className="border-b last:border-0 dark:border-gray-700">
                <td className="py-2">{idx + 1}</td>
                <td className="py-2">
                  {subjectNames?.get(Number(r.subjectId)) ||
                    r.subjectName ||
                    (r.subjectId != null ? `Subject ${r.subjectId}` : "")}
                </td>
                <td className="py-2 text-right">{r.classwork}</td>
                <td className="py-2 text-right">{r.exam}</td>
                <td className="py-2 text-right">{round2(r.total)}</td>
                <td className="py-2 text-right">{r.grade}</td>
                <td className="py-2 flex items-center gap-2">
                  {r.pass ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600" />
                  )}
                  <span>{r.remark}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary quick facts */}
      <div className="px-6 py-4 grid sm:grid-cols-2 gap-3">
        <InfoRow label="Overall Score" value={overallScore ?? "-"} />
        <InfoRow label="Overall Position" value={overallPos ?? "-"} />
        <InfoRow label="Attendance" value={attendance ?? "-"} />
        <InfoRow label="Reopen Date" value={reopen ?? "-"} />
      </div>

      {/* Prominent Remarks block */}
      <div className="px-6 pb-4 grid sm:grid-cols-2 gap-4">
        <RemarkCard
          icon={<UserRound className="h-4 w-4" />}
          title="Class Teacher's Remarks"
          text={teacherRemark || "—"}
        />
        <RemarkCard
          icon={<GraduationCap className="h-4 w-4" />}
          title="Head Teacher's Remarks"
          text={headRemark || "—"}
        />
      </div>

      {/* Grading scale (School + Class scoped) */}
      {!!scale?.length && (
        <div className="px-6 py-4">
          <div className="text-sm font-semibold mb-1 flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Grading Scale
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs border w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="p-2 text-left">Grade</th>
                  <th className="p-2 text-left">Min %</th>
                  <th className="p-2 text-left">Max %</th>
                  <th className="p-2 text-left">Remark</th>
                </tr>
              </thead>
              <tbody>
                {scale.map((row) => (
                  <tr key={row.grade} className="border-t">
                    <td className="p-2">{row.grade}</td>
                    <td className="p-2">{row.min}</td>
                    <td className="p-2">{row.max}</td>
                    <td className="p-2">{row.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Signatures (Class Teacher removed) */}
      <div className="px-6 pb-10">
        <div className="flex justify-between">
          <Signature label="Head Teacher" />
          <Signature label="Parent/Guardian" />
        </div>
      </div>
    </div>
  );
}

function StudentAvatar({ imageUrl, name }) {
  return (
    <div className="h-28 w-28 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name || "Student photo"}
          className="h-full w-full object-cover"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : (
        <div className="text-xs text-gray-500 p-2 text-center">No Photo</div>
      )}
    </div>
  );
}

function RemarkCard({ icon, title, text }) {
  return (
    <div className="rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="text-sm leading-relaxed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Quote className="h-4 w-4 mt-0.5 opacity-60" />
          <span>{text}</span>
        </div>
      </div>
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

function StatPill({ label, value }) {
  return (
    <div className="rounded-xl border dark:border-gray-700 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

function LabeledSelect({ labelEl, label, value, onChange, children }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
        {labelEl ?? label}
      </span>
      <select
        className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-800"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function LabelWithIcon({ icon, text }) {
  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      <span>{text}</span>
    </span>
  );
}

function Signature({ label }) {
  return (
    <div className="text-center w-1/2">
      <div className="h-14" />
      <div className="border-t dark:border-gray-600 w-40 mx-auto" />
      <div className="text-xs mt-1">{label} Signature</div>
    </div>
  );
}

function StudentLov({ label = "Student", students = [], value, onPick }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");

  const selected = React.useMemo(
    () => students.find((s) => String(s.id) === String(value)),
    [students, value]
  );

  const filtered = React.useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return students;
    return students.filter(
      (s) =>
        String(s.id).toLowerCase().includes(n) ||
        String(s.index_no || "").toLowerCase().includes(n) ||
        String(s.name || "").toLowerCase().includes(n) ||
        String(s.class_name || "").toLowerCase().includes(n)
    );
  }, [students, q]);

  return (
    <>
      <label className="text-sm grid gap-1">
        <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Search className="w-4 h-4" /> {label}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center justify-between border rounded-xl px-3 py-2 bg-white dark:bg-gray-800 text-left w-full"
          title="Click to choose student"
        >
          <span className="truncate">
            {selected
              ? `${selected.name} (Index No.: ${selected.index_no || "-"})`
              : "Select student…"}
          </span>
          <svg
            className="ml-2 h-4 w-4 text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </label>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-3">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <div className="font-semibold">Choose Student</div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              <label className="text-sm grid gap-1">
                <span className="text-gray-700 dark:text-gray-300">Search</span>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pl-9 pr-3 py-2 w-full border rounded-lg bg-white dark:bg-gray-900 text-sm"
                    placeholder="Search by name, Index No., ID, or class"
                  />
                </div>
              </label>
            </div>

            <div className="max-h-80 overflow-auto px-2 pb-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  No students found.
                </div>
              ) : (
                <ul className="divide-y dark:divide-gray-800">
                  {filtered.map((s) => {
                    const isActive = String(s.id) === String(value);
                    return (
                      <li key={s.id}>
                        <button
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                            isActive ? "bg-indigo-50 dark:bg-indigo-900/30" : ""
                          }`}
                          onClick={() => {
                            onPick(String(s.id));
                            setOpen(false);
                          }}
                        >
                          <div className="font-medium">
                            {s.name}{" "}
                            <span className="text-gray-500">
                              (Index No.: {s.index_no || "-"})
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {s.class_name || ""}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="p-3 border-t dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
              <span>
                {filtered.length} result{filtered.length === 1 ? "" : "s"}
              </span>
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 border rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
