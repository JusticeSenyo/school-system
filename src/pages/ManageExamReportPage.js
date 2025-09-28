import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { useAuth } from "../AuthContext";
import {
  RotateCcw,
  Download,
  Search as SearchIcon,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  Filter,
} from "lucide-react";
import * as XLSX from "xlsx";

/* ------------ ORDS base ------------ */
const HOST =
  "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

/* ------------ Academic lookups ------------ */
const ACADEMIC_CLASSES_API = `${HOST}/academic/get/classes/`;
const CLASS_TEACHER_CLASSES_API = `${HOST}/academic/class_teacher/class/`; // ?p_user_id
const ACADEMIC_YEAR_API = `${HOST}/academic/get/academic_year/`;
const ACADEMIC_TERM_API = `${HOST}/academic/get/term/`;
const STUDENTS_API = `${HOST}/student/get/students/`;

/* ------------ Exams ------------ */
const STUDENT_REPORT_URL = ({ sid, yearId, termId, classId, studentId }) => {
  const qp = new URLSearchParams({
    p_school_id: String(sid),
    p_year_id: String(yearId),
    p_term_id: String(termId),
    p_class_id: String(classId),
    p_student_id: String(studentId),
  });
  return `${HOST}/exams/marks/student/?${qp.toString()}`;
};

/* ------------ Reviews (GET) ------------ */
const REV_LIST_URL = ({ sid, yearId, termId, classId }) => {
  const qp = new URLSearchParams({
    p_school_id: String(sid),
    p_year_id: String(yearId),
    p_term_id: String(termId),
    p_class_id: String(classId),
  });
  return `${HOST}/exams/review/list/?${qp.toString()}`;
};
const REV_UPSERT_URL = (p) =>
  `${HOST}/exams/review/upsert/?${new URLSearchParams(p).toString()}`;

/* ------------ Attendance summary (GET per class/term/year) ------------ */
const ATTEND_SUMMARY_URL = ({ sid, classId, yearId, termId }) => {
  const qp = new URLSearchParams({
    p_school_id: String(sid),
    p_class_id: String(classId),
    p_year_id: String(yearId),
    p_term_id: String(termId),
  });
  return `${HOST}/report/get/attendance/summary/?${qp.toString()}`;
};

/* ------------ helpers ------------ */
const normalizeRole = (role) => {
  if (!role) return "";
  const r = String(role).toLowerCase();
  if (r === "ht" || r === "headteacher") return "headteacher";
  if (r === "tr" || r === "teacher") return "teacher";
  if (r === "ad" || r === "admin") return "admin";
  if (r === "ac" || r === "accountant") return "accountant";
  if (r === "ow" || r === "owner") return "owner";
  return r;
};
const jtxt = async (u, headers = {}) => {
  const r = await fetch(u, { cache: "no-store", headers: { Accept: "application/json", ...headers } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.text()).trim();
};
const jarr = async (u, headers = {}) => {
  const t = await jtxt(u, headers);
  if (!t) return [];
  try {
    const d = JSON.parse(t);
    return Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : [];
  } catch {
    return [];
  }
};
const jobject = async (u, headers = {}) => {
  const t = await jtxt(u, headers);
  try { return t ? JSON.parse(t) : null; } catch { return null; }
};
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** small concurrency limiter */
async function mapWithConcurrency(items, limit, mapper) {
  const ret = new Array(items.length);
  let i = 0, running = 0;
  await new Promise((resolve) => {
    const next = () => {
      while (running < limit && i < items.length) {
        const cur = i++;
        running++;
        Promise.resolve(mapper(items[cur], cur))
          .then((v) => (ret[cur] = v))
          .catch((e) => (ret[cur] = { error: String(e?.message || e) }))
          .finally(() => {
            running--;
            if (ret.filter((x) => x !== undefined).length === items.length) resolve();
            else next();
          });
      }
    };
    next();
  });
  return ret;
}

/* pick the most frequent non-empty reopen_date in a class review list */
function pickClassReopenDate(reviews) {
  const counts = new Map();
  for (const r of reviews || []) {
    const v = (r.reopen_date ?? r.REOPEN_DATE ?? "").trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [v, c] of counts.entries()) {
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return best;
}

/* ------------ Component ------------ */
export default function ManageExamReportPage() {
  const { user, token } = useAuth() || {};
  const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? 1;
  const userId =
    user?.id ?? user?.userId ?? user?.USER_ID ?? user?.staff_id ?? user?.STAFF_ID ?? null;

  const role = normalizeRole(user?.userType);
  const isHT = role === "headteacher";
  const isTeacher = role === "teacher";

  const H = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  // LOVs
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(null);     // numbers to avoid 1/"1" mismatches
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState(null);
  const [terms, setTerms] = useState([]);
  const [termId, setTermId] = useState(null);

  // Students in selected class
  const [students, setStudents] = useState([]);

  // Reopen Date (Head teacher only section, but we prefill value here)
  const todayISO = new Date().toISOString().slice(0, 10);
  const [reopenDate, setReopenDate] = useState("");

  // Table rows
  const [rows, setRows] = useState([]);

  // Status & UX
  const [loadingLov, setLoadingLov] = useState(false);
  const [loadingBuild, setLoadingBuild] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [banner, setBanner] = useState({ type: "", text: "" });
  const [showDirtyOnly, setShowDirtyOnly] = useState(false);

  // Prevent race conditions across scope changes
  const [scopeKey, setScopeKey] = useState("");

  // Update scopeKey and clear rows whenever scope changes
  useEffect(() => {
    if (!schoolId || !Number.isFinite(yearId) || !Number.isFinite(termId) || !Number.isFinite(classId)) {
      setScopeKey("");
      setRows([]);
      return;
    }
    const k = `${schoolId}|${yearId}|${termId}|${classId}`;
    setScopeKey(k);
    setRows([]); // clear immediately so UI doesn't show stale data
  }, [schoolId, yearId, termId, classId]);

  // Load LOVs once (years/terms + classes depending on role)
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      setLoadingLov(true);
      try {
        // Classes by role:
        if (isHT) {
          // Head teacher: see ALL classes
          const cls = await jarr(`${ACADEMIC_CLASSES_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);
          const normC = cls.map((r) => ({
            id: Number(r.class_id ?? r.CLASS_ID ?? r.id ?? r.ID),
            name: r.class_name ?? r.CLASS_NAME ?? r.name ?? r.NAME,
          })).filter((x) => Number.isFinite(x.id));
          setClasses(normC);
          if (!Number.isFinite(classId) && normC.length) setClassId(Number(normC[0].id));
        } else {
          // Class teacher: only their class(es)
          const url = `${CLASS_TEACHER_CLASSES_API}?p_user_id=${encodeURIComponent(userId ?? "")}`;
          const rows = await jarr(url, H);
          const normC = rows.map((r) => ({
            id: Number(r.class_id ?? r.CLASS_ID ?? r.id ?? r.ID),
            name: r.class_name ?? r.CLASS_NAME ?? r.name ?? r.NAME,
          })).filter((x) => Number.isFinite(x.id));
          setClasses(normC);
          if (!Number.isFinite(classId) && normC.length) setClassId(Number(normC[0].id));
        }

        // Years
        const yrs = await jarr(`${ACADEMIC_YEAR_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);
        const normY = yrs.map((r) => ({
          id: Number(r.academic_year_id ?? r.ACADEMIC_YEAR_ID ?? r.id),
          name: r.academic_year_name ?? r.ACADEMIC_YEAR_NAME ?? r.name,
          status: (r.status ?? r.STATUS) || "",
        })).filter((a) => Number.isFinite(a.id));
        setYears(normY);
        const curY = normY.find((a) => String(a.status).toUpperCase() === "CURRENT");
        setYearId(Number(curY?.id ?? normY[0]?.id ?? NaN));

        // Terms
        const trm = await jarr(`${ACADEMIC_TERM_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);
        const normT = trm.map((r) => ({
          id: Number(r.term_id ?? r.TERM_ID ?? r.id),
          name: r.term_name ?? r.TERM_NAME ?? r.name,
          status: (r.status ?? r.STATUS) || "",
        })).filter((t) => Number.isFinite(t.id));
        setTerms(normT);
        const curT = normT.find((t) => String(t.status).toUpperCase() === "CURRENT");
        setTermId(Number(curT?.id ?? normT[0]?.id ?? NaN));
      } catch (e) {
        setErr(`Failed to load lookups. ${e?.message || e}`);
      } finally {
        setLoadingLov(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, isHT, isTeacher, userId]);

  // Load students on class change (STRICT filter by selected class)
  useEffect(() => {
    if (!schoolId || !Number.isFinite(classId)) { setStudents([]); return; }
    (async () => {
      try {
        const url = `${STUDENTS_API}?p_school_id=${encodeURIComponent(schoolId)}&p_class_id=${encodeURIComponent(classId)}`;
        const raw = await jarr(url, H);

        const normalized = (raw || []).map((s) => {
          const sid = s.student_id ?? s.STUDENT_ID ?? s.id ?? s.ID;
          const cname = s.full_name ?? s.FULL_NAME ?? s.name ?? s.NAME ?? "";
          const idxNo = s.index_no ?? s.INDEX_NO ?? "";
          const cid = s.class_id ?? s.CLASS_ID ?? s.class ?? s.CLASS ?? null;
          return {
            id: Number(sid),
            name: cname,
            index_no: idxNo,
            class_id: Number(cid),
          };
        }).filter((x) => Number.isFinite(x.id));

        const onlySelected = normalized.filter((s) => Number(s.class_id) === Number(classId));
        setStudents(onlySelected);
      } catch (e) {
        setErr(`Failed to load students. ${e?.message || e}`);
        setStudents([]);
      }
    })();
  }, [schoolId, classId, H]);

  // Build table (averages, ranking, merge reviews, attendance) + PREFILL reopen date
  const buildTable = async () => {
    setErr("");
    setBanner({ type: "", text: "" });
    if (!schoolId || !Number.isFinite(yearId) || !Number.isFinite(termId) || !Number.isFinite(classId)) return;
    if (!students.length) { setRows([]); return; }

    const localKey = `${schoolId}|${yearId}|${termId}|${classId}`;
    setLoadingBuild(true);
    setProgress({ done: 0, total: students.length });

    try {
      // 1) per-student average
      const base = await mapWithConcurrency(
        students,
        6,
        async (s) => {
          const url = STUDENT_REPORT_URL({
            sid: schoolId, yearId, termId, classId, studentId: s.id,
          });
          const items = await jarr(url, H);
          const totals = items.map((r) => Number(r.total ?? r.TOTAL ?? 0));
          const cnt = totals.length;
          const sum = totals.reduce((a, b) => a + (Number(b) || 0), 0);
          const avg = cnt ? round2(sum / cnt) : 0;
          setProgress((p) => ({ ...p, done: Math.min(p.done + 1, students.length) }));
          return { student_id: s.id, name: s.name, index_no: s.index_no, avg };
        }
      );

      // Abort if scope changed
      if (scopeKey && scopeKey !== localKey) return;

      // 2) ranking
      const sorted = [...base].sort((a, b) => (b.avg || 0) - (a.avg || 0));
      let lastScore = null, lastRank = 0;
      sorted.forEach((r, i) => {
        if (r.avg === lastScore) r.position = lastRank;
        else { r.position = i + 1; lastRank = r.position; lastScore = r.avg; }
      });
      const posMap = new Map(sorted.map((r) => [String(r.student_id), r.position]));

      // 3) reviews
      const revArr = await jarr(REV_LIST_URL({ sid: schoolId, yearId, termId, classId }), H);
      const revByStudent = new Map(
        revArr.map((r) => [
          String(r.student ?? r.STUDENT),
          {
            id: r.id ?? r.ID,
            teacher_remarks: r.teacher_remarks ?? r.TEACHER_REMARKS ?? "",
            head_remarks: r.head_remarks ?? r.HEAD_REMARKS ?? "",
            attendance: Number(r.attendance ?? r.ATTENDANCE ?? 0),
            reopen_date: r.reopen_date ?? r.REOPEN_DATE ?? "",
          },
        ])
      );

      // PREFILL Reopen Date (most frequent non-empty in this class scope)
      const classReopen = pickClassReopenDate(revArr);
      if (classReopen && isHT) {
        setReopenDate((prev) => prev || classReopen);
      }

      // 4) attendance (strict class scope)
      let presentMap = new Map();
      try {
        const att = await jarr(
          ATTEND_SUMMARY_URL({ sid: schoolId, classId, yearId, termId }),
          H
        );
        const rosterIds = new Set(students.map(s => String(s.id)));
        const normalized = (att || []).map((row) => ({
          student_id: row.student_id ?? row.STUDENT_ID ?? row.student ?? row.STUDENT,
          class_id:   row.class_id   ?? row.CLASS_ID   ?? row.class   ?? row.CLASS,
          present:    Number(row.present ?? row.PRESENT ?? row.present_count ?? row.PRESENT_COUNT ?? 0),
        }));
        const hasClassId = normalized.some(r => r.class_id !== undefined && r.class_id !== null);
        const attFiltered = hasClassId
          ? normalized.filter(r => Number(r.class_id) === Number(classId))
          : normalized.filter(r => rosterIds.has(String(r.student_id)));
        presentMap = new Map(attFiltered.map((r) => [String(r.student_id), r.present]));
      } catch {
        presentMap = new Map();
      }

      if (scopeKey && scopeKey !== localKey) return;

      // 5) merge
      const table = base.map((r) => {
        const rv = revByStudent.get(String(r.student_id)) || {};
        const presentDays = presentMap.get(String(r.student_id));
        return {
          id: rv.id ?? null,
          student_id: r.student_id,
          name: r.name,
          index_no: r.index_no,
          avg: r.avg,
          position: posMap.get(String(r.student_id)) || "",
          present_days: Number.isFinite(presentDays) ? presentDays : Number(rv.attendance ?? 0),
          teacher_remarks: rv.teacher_remarks || "",
          head_remarks: rv.head_remarks || "",
          reopen_date: rv.reopen_date || "",
          __dirty: false,
          __savedOk: false,
        };
      });

      if (scopeKey && scopeKey !== localKey) return;
      setRows(table);
    } catch (e) {
      setErr(`Failed to compute report: ${e?.message || e}`);
      setRows([]);
    } finally {
      setLoadingBuild(false);
      setProgress({ done: 0, total: 0 });
    }
  };

  // Auto-compute whenever a complete scope + roster is ready (no need to press Compute)
  useEffect(() => {
    if (
      schoolId &&
      Number.isFinite(yearId) &&
      Number.isFinite(termId) &&
      Number.isFinite(classId) &&
      students.length
    ) {
      buildTable();
    } else {
      setRows([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, yearId, termId, classId, students]);

  // Filters
  const filtered = useMemo(() => {
    let arr = rows;
    if (showDirtyOnly) arr = arr.filter((r) => r.__dirty);
    const n = q.trim().toLowerCase();
    if (!n) return arr;
    return arr.filter((r) =>
      (r.name || "").toLowerCase().includes(n) ||
      String(r.index_no || "").toLowerCase().includes(n)
    );
  }, [rows, q, showDirtyOnly]);

  const canEditTeacher = isTeacher;
  const canEditHead = isHT;

  const onChangeCell = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) =>
        r.student_id === id ? { ...r, [field]: value, __dirty: true, __savedOk: false } : r
      )
    );
  };

  const saveRow = async (r, withBanner = false, reopenOnly = false) => {
    // Block reopen-only saves if not head teacher
    if (reopenOnly && !isHT) {
      setBanner({ type: "error", text: "Only Head Teacher can set Reopen Date." });
      setTimeout(() => setBanner({ type: "", text: "" }), 2000);
      return;
    }

    const qs = {
      p_id: r.id ?? "",
      p_school_id: schoolId,
      p_year_id: yearId,
      p_term_id: termId,
      p_class_id: classId,
      p_student_id: r.student_id,
      p_teacher_remarks: r.teacher_remarks ?? "",
      p_head_remarks: r.head_remarks ?? "",
      p_overall_score: String(r.avg ?? ""),
      p_overall_position: String(r.position ?? ""),
      p_attendance: String(r.present_days ?? ""),
      p_reopen_date: (reopenOnly ? reopenDate : r.reopen_date) ? (reopenOnly ? reopenDate : r.reopen_date).trim() : "",
    };

    const res = await jobject(REV_UPSERT_URL(qs), H);
    const ok =
      (res && (res.status === "ok" || res.STATUS === "OK")) ||
      typeof res?.id !== "undefined" ||
      typeof res?.ID !== "undefined";

    if (!ok) throw new Error(res?.message || res?.MESSAGE || "Save failed");

    setRows((prev) =>
      prev.map((x) =>
        x.student_id === r.student_id
          ? {
              ...x,
              id: res?.id ?? res?.ID ?? x.id,
              reopen_date: qs.p_reopen_date || x.reopen_date || "",
              __dirty: reopenOnly ? x.__dirty : false,
              __savedOk: true,
            }
          : x
      )
    );

    if (withBanner) {
      setBanner({ type: "success", text: `Saved ${r.name}` });
      setTimeout(() => setBanner({ type: "", text: "" }), 2000);
    }
  };

  const saveAll = async () => {
    const dirty = rows.filter((r) => r.__dirty);
    if (!dirty.length) {
      setBanner({ type: "info", text: "No changes to save." });
      setTimeout(() => setBanner({ type: "", text: "" }), 1800);
      return;
    }
    try {
      for (const r of dirty) {
        await saveRow(r, false, false);
      }
      setBanner({ type: "success", text: `Saved ${dirty.length} student${dirty.length === 1 ? "" : "s"}.` });
      setTimeout(() => setBanner({ type: "", text: "" }), 2500);
    } catch (e) {
      setBanner({ type: "error", text: `Save failed: ${e?.message || e}` });
    }
  };

  const applyReopenToAll = async () => {
    if (!isHT) {
      setBanner({ type: "error", text: "Only Head Teacher can set Reopen Date." });
      setTimeout(() => setBanner({ type: "", text: "" }), 2000);
      return;
    }
    if (!reopenDate) {
      setBanner({ type: "error", text: "Pick a Reopen Date first." });
      setTimeout(() => setBanner({ type: "", text: "" }), 2000);
      return;
    }
    try {
      for (const r of rows) {
        await saveRow(r, false, true); // reopenOnly=true
      }
      setBanner({ type: "success", text: `Reopen date applied to ${rows.length} student${rows.length === 1 ? "" : "s"}.` });
      setTimeout(() => setBanner({ type: "", text: "" }), 2500);
    } catch (e) {
      setBanner({ type: "error", text: `Failed applying reopen date: ${e?.message || e}` });
    }
  };

  // Export current view to Excel
  const exportToExcel = () => {
    try {
      const cls = classes.find((c) => Number(c.id) === Number(classId));
      const className = (cls?.name || `Class-${classId}`).replace(/[\\/:*?"<>|]/g, "-");
      const termName = terms.find((t) => Number(t.id) === Number(termId))?.name || termId;
      const yearName = years.find((y) => Number(y.id) === Number(yearId))?.name || yearId;

      const out = filtered.map((r, i) => ({
        "#": i + 1,
        Student: r.name,
        "Index No": r.index_no || "",
        "Overall Score": r.avg,
        Position: r.position,
        "Present Days": r.present_days ?? 0,
        "Teacher Remarks": r.teacher_remarks || "",
        "Head Remarks": r.head_remarks || "",
        "Reopen Date": isHT ? (reopenDate || r.reopen_date || "") : "", // only HT sees/export
      }));

      const ws = XLSX.utils.json_to_sheet(out);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Exam Report");
      XLSX.writeFile(wb, `ExamReport_${className}_${termName}_${yearName}.xlsx`);
    } catch (e) {
      alert(e?.message || "Failed to export Excel");
    }
  };

  const unsavedCount = rows.filter((r) => r.__dirty).length;

  return (
    <DashboardLayout
      title="Manage Exam Report"
      subtitle=""
    >
      {/* Toolbar */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Class */}
          <select
            className="px-4 py-2 rounded-md text-sm border bg-white dark:bg-gray-900"
            value={Number.isFinite(classId) ? String(classId) : ""}
            onChange={(e) => setClassId(Number(e.target.value))}
            disabled={loadingLov || classes.length === 0}
            title={isHT ? "All classes" : "Your class(es)"}
          >
            {loadingLov ? (
              <option>Loading classes…</option>
            ) : classes.length ? (
              classes.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {c.name}
                </option>
              ))
            ) : (
              <option>No classes found</option>
            )}
          </select>

          {/* Term */}
          <select
            className="px-4 py-2 rounded-md text-sm border bg-white dark:bg-gray-900"
            value={Number.isFinite(termId) ? String(termId) : ""}
            onChange={(e) => setTermId(Number(e.target.value))}
            disabled={loadingLov || terms.length === 0}
          >
            {terms.length ? (
              terms.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.name}
                </option>
              ))
            ) : (
              <option>No terms</option>
            )}
          </select>

          {/* Year */}
          <select
            className="px-4 py-2 rounded-md text-sm border bg-white dark:bg-gray-900"
            value={Number.isFinite(yearId) ? String(yearId) : ""}
            onChange={(e) => setYearId(Number(e.target.value))}
            disabled={loadingLov || years.length === 0}
          >
            {years.length ? (
              years.map((y) => (
                <option key={String(y.id)} value={String(y.id)}>
                  {y.name}
                </option>
              ))
            ) : (
              <option>No years</option>
            )}
          </select>

          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search student / Index No…"
              className="pl-9 pr-3 py-2 w-72 rounded-md text-sm border bg-white dark:bg-gray-900"
            />
          </div>

          {/* Refresh / Recompute */}
          <button
            onClick={buildTable}
            disabled={loadingBuild || !Number.isFinite(classId) || !Number.isFinite(termId) || !Number.isFinite(yearId)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition border bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
            title="Recompute averages, positions & attendance"
          >
            <RotateCcw size={16} />
            {loadingBuild ? "Computing…" : "Refresh"}
          </button>

          {/* Export */}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition bg-emerald-600 text-white hover:bg-emerald-700"
            title="Download Excel of current table view"
          >
            <Download size={16} /> Download Excel
          </button>

          {/* Save All */}
          <button
            onClick={saveAll}
            disabled={unsavedCount === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            title="Save all edited remarks"
          >
            <Save size={16} /> Save All {unsavedCount ? `(${unsavedCount})` : ""}
          </button>
        </div>

        {/* Dirty filter */}
        <button
          onClick={() => setShowDirtyOnly((s) => !s)}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${showDirtyOnly ? "bg-indigo-50 dark:bg-indigo-900/30" : "bg-white dark:bg-gray-900"}`}
          title="Show edited rows only"
        >
          <Filter size={16} />
          {showDirtyOnly ? "Showing edited only" : "Show edited only"}
        </button>
      </div>

      {/* Banners */}
      {banner.text && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-lg p-3 border ${
            banner.type === "success"
              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : banner.type === "error"
              ? "text-rose-700 bg-rose-50 border-rose-200"
              : "text-gray-700 bg-gray-50 border-gray-200"
          }`}
        >
          {banner.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : banner.type === "error" ? <AlertCircle className="h-4 w-4" /> : null}
          <span className="text-sm">{banner.text}</span>
        </div>
      )}
      {err && (
        <div className="mb-4 flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{err}</span>
        </div>
      )}
      {!err && loadingBuild && progress.total > 0 && (
        <div className="mb-3 p-3 rounded border bg-gray-50 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Computing: {progress.done} / {progress.total}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-indigo-100 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left">Index No</th>
              <th className="px-4 py-3 text-left">Overall Score</th>
              <th className="px-4 py-3 text-left">Position</th>
              <th className="px-4 py-3 text-left">Present Days</th>
              <th className="px-4 py-3 text-left">Teacher Remarks</th>
              <th className="px-4 py-3 text-left">Head Remarks</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                  {loadingBuild ? "Computing…" : "No students/records match your filters."}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.student_id}
                  className={`border-t hover:bg-gray-50 dark:hover:bg-gray-800 ${r.__dirty ? "bg-yellow-50/40 dark:bg-yellow-900/10" : ""}`}
                >
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2">{r.index_no || "-"}</td>
                  <td className="px-4 py-2">{r.avg}</td>
                  <td className="px-4 py-2">{r.position}</td>
                  <td className="px-4 py-2">
                    <span className="inline-block min-w-[3ch] text-center">{r.present_days ?? 0}</span>
                  </td>
                  <td className="px-4 py-2">
                    <textarea
                      value={r.teacher_remarks || ""}
                      onChange={(e) => onChangeCell(r.student_id, "teacher_remarks", e.target.value)}
                      disabled={!canEditTeacher}
                      className={`w-64 min-h-[60px] px-2 py-1 rounded-md border bg-white dark:bg-gray-800 ${
                        !canEditTeacher ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                      placeholder={canEditTeacher ? "Teacher remarks…" : "Read-only"}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <textarea
                      value={r.head_remarks || ""}
                      onChange={(e) => onChangeCell(r.student_id, "head_remarks", e.target.value)}
                      disabled={!canEditHead}
                      className={`w-64 min-h-[60px] px-2 py-1 rounded-md border bg-white dark:bg-gray-800 ${
                        !canEditHead ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                      placeholder={canEditHead ? "Head teacher remarks…" : "Read-only"}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => saveRow(r, true)}
                      disabled={!r.__dirty}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {r.__savedOk ? <CheckCircle2 size={14} /> : <Save size={14} />}
                      {r.__savedOk ? "Saved" : "Save"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reopen Date — Head Teacher only */}
      {isHT && (
        <div className="mt-5 p-4 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <div className="font-medium">Reopen Date (applies to all students)</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {reopenDate ? "Loaded existing class reopen date. You can change it below." : "Pick a date, then click “Apply to All & Save”."
              }
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              className="px-3 py-2 rounded-md text-sm border bg-white dark:bg-gray-900"
              value={reopenDate}
              max={todayISO}
              onChange={(e) => setReopenDate(e.target.value)}
            />
            <button
              onClick={applyReopenToAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Save size={16} /> Apply to All & Save
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Tip: “Save” on each row only saves that student. “Save All” saves all edited remarks.
        {isHT ? " “Apply to All & Save” sets or updates the Reopen Date for everyone in the class." : ""}
      </div>
    </DashboardLayout>
  );
}
