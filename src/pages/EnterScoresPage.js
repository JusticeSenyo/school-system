// src/pages/EnterScoresPage.js
import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { useAuth } from "../AuthContext";
import {
  Loader2,
  Save,
  Check,
  X,
  BookOpen,
  RefreshCw,
  Trash2,
  Filter,
  Search as SearchIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

/* -------------------- ORDS Endpoints -------------------- */
const HOST =
  "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

const YEARS_API = `${HOST}/academic/get/academic_year/`; // ?p_school_id
const TERMS_API = `${HOST}/academic/get/term/`; // ?p_school_id
const STUDENTS_API = `${HOST}/student/get/students/`; // ?p_school_id&p_class_id
const ASSIGN_API = `${HOST}/academic/get/subject_teacher/`; // ?p_school_id&p_user_id
const SCHOOL_INFO_API = `${HOST}/academic/get/school/`; // list, we'll pick by school_id
const SCALE_API = ({ sid, classId }) =>
  `${HOST}/exams/scheme/get/?p_school_id=${sid}${classId ? `&p_class=${classId}` : ""}`;

// Upsert (Create/Update)
const ADD_MARK_URL = (p) => {
  const qp = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) =>
    v !== undefined && v !== null && v !== "" && qp.set(k, String(v))
  );
  return `${HOST}/exams/marks/add/?${qp.toString()}`;
};

// Read
const GET_MARKS_URL = (p) => {
  const qp = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) =>
    v !== undefined && v !== null && v !== "" && qp.set(k, String(v))
  );
  return `${HOST}/exams/marks/get/?${qp.toString()}`;
};

// Delete
const DELETE_MARK_URL = ({ id, schoolId }) =>
  `${HOST}/exams/marks/delete/?p_id=${encodeURIComponent(id)}&p_school_id=${encodeURIComponent(
    schoolId
  )}`;

/* -------------------- Helpers -------------------- */
const jarr = async (u, headers = {}) => {
  const r = await fetch(u, {
    headers: { Accept: "application/json", ...headers },
    cache: "no-store",
  });
  const t = (await r.text()).trim();
  if (!t) return [];
  try {
    const d = JSON.parse(t);
    return Array.isArray(d) ? d : Array.isArray(d.items) ? d.items : [];
  } catch {
    return [];
  }
};

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const numOrEmpty = (v) => (v === "" || v === null || v === undefined ? "" : Number(v));

/* ---- Plan helpers (match ManageFeesPage) ---- */
function isDateExpired(isoOrDateString) {
  if (!isoOrDateString) return false;
  const d = new Date(String(isoOrDateString));
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  const todayFloor = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return d.getTime() < todayFloor;
}
const PLAN_NAME_BY_CODE = (raw) => {
  const v = String(raw ?? '').trim().toUpperCase();
  if (v === '1' || v === 'BASIC') return 'BASIC';
  if (v === '2' || v === 'STANDARD') return 'STANDARD';
  if (v === '3' || v === 'PREMIUM' || v === 'PREMUIM') return 'PREMIUM';
  return 'BASIC';
};
const HUMAN_PLAN = (code) => ({ BASIC: 'Basic', STANDARD: 'Standard', PREMIUM: 'Premium' }[code] || 'Basic');

/* -------------------- Component -------------------- */
export default function EnterScoresPage() {
  const { user, token } = useAuth() || {};
  const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? 1;
  const userId =
    user?.id ?? user?.userId ?? user?.USER_ID ?? user?.staff_id ?? user?.STAFF_ID ?? null;
  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  /* ---------- Plan / expiry gating ---------- */
  const fallbackPkg = Number(user?.school?.package ?? user?.package ?? user?.plan ?? 2);
  const fallbackPlanCode = fallbackPkg === 1 ? "BASIC" : fallbackPkg === 3 ? "PREMIUM" : "STANDARD";

  const [pkgName, setPkgName] = useState("");
  const [expiryRaw, setExpiryRaw] = useState("");
  const [pkgLoaded, setPkgLoaded] = useState(false);

  const planBannerKey = `scores_plan_banner_dismissed_${schoolId}`;
  const [showPlan, setShowPlan] = useState(() => {
    try { return localStorage.getItem(planBannerKey) !== "1"; } catch { return true; }
  });
  const dismissPlan = () => {
    try { localStorage.setItem(planBannerKey, "1"); } catch {}
    setShowPlan(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const rows = await jarr(SCHOOL_INFO_API, headers);
        const s = rows.find(r => String(r.school_id ?? r.SCHOOL_ID) === String(schoolId));
        const p = (s?.package ?? s?.PACKAGE ?? "").toString();
        const exp = s?.expiry ?? s?.EXPIRY ?? "";
        setPkgName(p);
        setExpiryRaw(exp);
      } catch {
        setPkgName(fallbackPlanCode);
        setExpiryRaw("");
      } finally {
        setPkgLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const planCode = PLAN_NAME_BY_CODE(pkgName || fallbackPlanCode); // BASIC | STANDARD | PREMIUM
  const PLAN = planCode.toLowerCase();
  const planHuman = HUMAN_PLAN(planCode);
  const isExpired = isDateExpired(expiryRaw);

  // Teacher assignments from /academic/get/subject_teacher/
  // Shape: [{ classId, className, subjectId, subjectName }]
  const [assignments, setAssignments] = useState([]);

  // LOVs derived from assignments
  const classOptions = useMemo(() => {
    const map = new Map();
    for (const a of assignments) {
      const cid = Number(a.classId);
      const label = a.className || `Class ${cid}`;
      if (!map.has(cid)) map.set(cid, label);
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [assignments]);

  const [classId, setClassId] = useState(null);

  const subjectOptions = useMemo(() => {
    return assignments
      .filter((a) => Number(a.classId) === Number(classId))
      .map((a) => ({ value: Number(a.subjectId), label: a.subjectName || `Subject ${a.subjectId}` }));
  }, [assignments, classId]);

  const [subjectId, setSubjectId] = useState(null);

  // Years/Terms
  const [years, setYears] = useState([]); // [{id,name,status}]
  const [terms, setTerms] = useState([]); // [{id,name,status}]
  const [yearId, setYearId] = useState(null);
  const [termId, setTermId] = useState(null);

  // Roster & scale & marks
  const [students, setStudents] = useState([]); // [{id,name,index_no}]
  const [scale, setScale] = useState([]); // [{min,max,grade,remark}]
  const [marks, setMarks] = useState([]); // raw marks for selection

  // Grid rows
  const [rows, setRows] = useState([]); // [{id,name,index_no,class_score,exam_score,total,grade,meaning,position,_exists,_markId,_dirty,_savedOk}]
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  // extras like in ManageExamReportPage
  const [q, setQ] = useState("");
  const [showDirtyOnly, setShowDirtyOnly] = useState(false);
  const [banner, setBanner] = useState({ type: "", text: "" });
  const [err, setErr] = useState("");

  /* ---------- Load teacher assignments ---------- */
  useEffect(() => {
    if (!schoolId || !userId) {
      setAssignments([]);
      return;
    }
    (async () => {
      const url = `${ASSIGN_API}?p_school_id=${schoolId}&p_user_id=${userId}`;
      const list = await jarr(url, headers);
      const norm = list
        .map((x) => ({
          classId: x.CLASS_ID ?? x.class_id,
          className: x.CLASS_NAME ?? x.class_name,
          subjectId: x.SUBJECT_ID ?? x.subject_id,
          subjectName: x.SUBJECT_NAME ?? x.subject_name,
        }))
        .filter((a) => a.classId != null && a.subjectId != null);
      setAssignments(norm);

      // default selections
      if (!norm.length) return;
      setClassId((prev) => prev ?? Number(norm[0].classId));
      // subject set in effect below
    })();
  }, [schoolId, userId, headers]);

  // Ensure subject defaults when class changes or assignments load
  useEffect(() => {
    const list = assignments.filter((a) => Number(a.classId) === Number(classId));
    if (!list.length) {
      setSubjectId(null);
      return;
    }
    setSubjectId((prev) =>
      prev && list.some((a) => Number(a.subjectId) === Number(prev))
        ? prev
        : Number(list[0].subjectId)
    );
  }, [assignments, classId]);

  /* ---------- Years/Terms ---------- */
  useEffect(() => {
    (async () => {
      try {
        const y = await jarr(`${YEARS_API}?p_school_id=${schoolId}`, headers);
        const normY = y
          .map((r) => ({
            id: r.ACADEMIC_YEAR_ID ?? r.academic_year_id ?? r.id,
            name: r.ACADEMIC_YEAR_NAME ?? r.academic_year_name ?? r.name,
            status: r.STATUS ?? r.status,
          }))
          .filter((a) => a.id != null);
        setYears(normY);
        const cy = normY.find((a) => String(a.status).toUpperCase() === "CURRENT") || normY[0];
        setYearId(cy?.id ?? null);

        const t = await jarr(`${TERMS_API}?p_school_id=${schoolId}`, headers);
        const normT = t
          .map((r) => ({
            id: r.TERM_ID ?? r.term_id ?? r.id,
            name: r.TERM_NAME ?? r.term_name ?? r.name,
            status: r.STATUS ?? r.status,
          }))
          .filter((a) => a.id != null);
        setTerms(normT);
        const ct = normT.find((a) => String(a.status).toUpperCase() === "CURRENT") || normT[0];
        setTermId(ct?.id ?? null);
      } catch (e) {
        setErr(`Failed to load Year/Term: ${e?.message || e}`);
      }
    })();
  }, [schoolId, headers]);

  /* ---------- Load roster, scale, marks ---------- */
  const canQuery = !!(schoolId && classId && subjectId && yearId && termId);

  useEffect(() => {
    if (!schoolId || !classId) {
      setStudents([]);
      return;
    }
    (async () => {
      try {
        const st = await jarr(
          `${STUDENTS_API}?p_school_id=${schoolId}&p_class_id=${classId}`,
          headers
        );
        const roster = st
          .map((s) => ({
            id: s.STUDENT_ID ?? s.student_id ?? s.ID,
            name: s.FULL_NAME ?? s.full_name ?? s.NAME ?? "",
            index_no: s.index_no ?? s.INDEX_NO ?? "",
          }))
          .filter((x) => x.id != null);
        setStudents(roster);
      } catch {
        setStudents([]);
      }
    })();
  }, [schoolId, classId, headers]);

  useEffect(() => {
    if (!schoolId || !classId) {
      setScale([]);
      return;
    }
    (async () => {
      try {
        const sc = await jarr(SCALE_API({ sid: schoolId, classId }), headers);
        const bands = sc
          .map((r) => ({
            min: Number(r.PERCENT_FROM ?? r.percent_from ?? 0),
            max: Number(r.PERCENT_TO ?? r.percent_to ?? 0),
            grade: r.GRADE ?? r.grade ?? "",
            remark: r.REMARKS ?? r.remarks ?? "",
          }))
          .sort((a, b) => (b.min || 0) - (a.min || 0));
        setScale(bands);
      } catch {
        setScale([]);
      }
    })();
  }, [schoolId, classId, headers]);

  useEffect(() => {
    if (!canQuery) {
      setMarks([]);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const list = await jarr(
          GET_MARKS_URL({
            p_school_id: schoolId,
            p_academic_year: yearId,
            p_academic_term: termId,
            p_class: classId,
            p_subject: subjectId,
          }),
          headers
        );
        const norm = list.map((x) => ({
          add_marks_id: x.id ?? x.ADD_MARKS_ID,
          student: x.student ?? x.STUDENT,
          roll_no: x.roll_no ?? x.ROLL_NO ?? "",
          class_score: numOrEmpty(x.class_score ?? x.CLASS_SCORE),
          exam_score: numOrEmpty(x.exam_score ?? x.EXAM_SCORE),
          total: numOrEmpty(x.total ?? x.TOTAL),
          grade: x.grade ?? x.GRADE ?? "",
          meaning: x.meaning ?? x.MEANING ?? "",
          position: x.position ?? x.POSITION ?? "",
        }));
        setMarks(norm);
      } finally {
        setLoading(false);
      }
    })();
  }, [canQuery, schoolId, yearId, termId, classId, subjectId, headers]);

  /* ---------- Merge roster + marks -> rows ---------- */
  useEffect(() => {
    const studentById = new Map(students.map((s) => [String(s.id), s]));
    const marksByStudent = new Map(marks.map((m) => [String(m.student), m]));

    const combined = students.map((s) => {
      const m = marksByStudent.get(String(s.id));
      if (m) {
        const total = round1((Number(m.class_score) || 0) + (Number(m.exam_score) || 0));
        const { grade, meaning } = calcGrade(total, scale);
        return {
          id: s.id,
          name: s.name,
          index_no: m.roll_no || s.index_no || "",
          class_score: m.class_score ?? "",
          exam_score: m.exam_score ?? "",
          total,
          grade: m.grade || grade,
          meaning: m.meaning || meaning,
          position: m.position || "",
          _exists: true,
          _markId: m.add_marks_id || null,
          _dirty: false,
          _savedOk: false,
        };
      }
      return {
        id: s.id,
        name: s.name,
        index_no: s.index_no || "",
        class_score: "",
        exam_score: "",
        total: 0,
        grade: "",
        meaning: "",
        position: "",
        _exists: false,
        _markId: null,
        _dirty: false,
        _savedOk: false,
      };
    });

    // Include marks whose students aren’t in roster
    for (const m of marks) {
      const key = String(m.student);
      if (!studentById.has(key)) {
        const total = round1((Number(m.class_score) || 0) + (Number(m.exam_score) || 0));
        const { grade, meaning } = calcGrade(total, scale);
        combined.push({
          id: m.student,
          name: `Student ${m.student}`,
          index_no: m.roll_no || "",
          class_score: m.class_score ?? "",
          exam_score: m.exam_score ?? "",
          total,
          grade: m.grade || grade,
          meaning: m.meaning || meaning,
          position: m.position || "",
          _exists: true,
          _markId: m.add_marks_id || null,
          _dirty: false,
          _savedOk: false,
        });
      }
    }

    const withPos = applyPositions(combined);
    setRows(withPos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, marks, scale]);

  /* ---------- Grade / Position helpers ---------- */
  const calcGrade = (total, bands) => {
    for (const b of bands || []) {
      if (total >= b.min && total <= b.max) return { grade: b.grade, meaning: b.remark };
    }
    return { grade: "", meaning: "" };
  };

  const applyPositions = (list) => {
    const arr = [...list];
    const scored = arr
      .map((r, idx) => ({ idx, total: Number(r.total) || 0 }))
      .sort((a, b) => b.total - a.total);

    let lastTotal = null;
    let lastRank = 0;
    let seen = 0;

    const pos = new Array(arr.length).fill("");

    for (const { idx, total } of scored) {
      seen += 1;
      if (lastTotal === null || total < lastTotal) {
        lastRank = seen;
        lastTotal = total;
      }
      pos[idx] = total > 0 ? String(lastRank) : "";
    }

    return arr.map((r, i) => ({ ...r, position: pos[i] }));
  };

  /* ---------- Handlers (with plan gating) ---------- */
  const updateCell = (id, key, value) => {
    if (isExpired) return; // hard gate editing
    if (key === "index_no") return; // Index No is read-only

    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r;

        const v = key.includes("score") ? (value === "" ? "" : Number(value)) : value;
        const updated = { ...r, [key]: v, _dirty: true, _savedOk: false };

        const classScore = Number(updated.class_score || 0);
        const examScore = Number(updated.exam_score || 0);
        const total = round1(classScore + examScore);
        const { grade, meaning } = calcGrade(total, scale);

        return { ...updated, total, grade, meaning };
      });
      return applyPositions(next);
    });
  };

  const removeRow = async (row) => {
    if (isExpired) return;
    if (row._exists && row._markId) {
      try {
        setSaving(true);
        await fetch(DELETE_MARK_URL({ id: row._markId, schoolId }), {
          headers,
          cache: "no-store",
        });
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        setToast("Deleted.");
        setTimeout(() => setToast(""), 2000);
      } catch (e) {
        setToast(`Delete failed: ${e?.message || e}`);
      } finally {
        setSaving(false);
      }
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const refreshAll = async () => {
    if (!canQuery || isExpired) return;
    setLoading(true);
    try {
      const list = await jarr(
        GET_MARKS_URL({
          p_school_id: schoolId,
          p_academic_year: yearId,
          p_academic_term: termId,
          p_class: classId,
          p_subject: subjectId,
        }),
        headers
      );
      const norm = list.map((x) => ({
        add_marks_id: x.id ?? x.ADD_MARKS_ID,
        student: x.student ?? x.STUDENT,
        roll_no: x.roll_no ?? x.ROLL_NO ?? "",
        class_score: numOrEmpty(x.class_score ?? x.CLASS_SCORE),
        exam_score: numOrEmpty(x.exam_score ?? x.EXAM_SCORE),
        total: numOrEmpty(x.total ?? x.TOTAL),
        grade: x.grade ?? x.GRADE ?? "",
        meaning: x.meaning ?? x.MEANING ?? "",
        position: x.position ?? x.POSITION ?? "",
      }));
      setMarks(norm);
      setToast("Refreshed.");
      setTimeout(() => setToast(""), 1500);
    } finally {
      setLoading(false);
    }
  };

  // Save a single row
  const saveRow = async (r, showBanner = false) => {
    if (!canQuery || isExpired) return;
    setSaving(true);
    try {
      const url = ADD_MARK_URL({
        p_school_id: schoolId,
        p_academic_year: yearId,
        p_academic_term: termId,
        p_class: classId,
        p_student: r.id,
        p_roll_no: r.index_no || "",
        p_subject: subjectId,
        p_class_score: r.class_score || 0,
        p_exam_score: r.exam_score || 0,
        p_total: r.total || undefined,
        p_grade: r.grade || "",
        p_position: r.position || "",
        p_meaning: r.meaning || "",
      });
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setRows((prev) =>
        prev.map((x) =>
          x.id === r.id ? { ...x, _dirty: false, _exists: true, _savedOk: true } : x
        )
      );
      if (showBanner) {
        setBanner({ type: "success", text: `Saved ${r.name}` });
        setTimeout(() => setBanner({ type: "", text: "" }), 1800);
      }
    } catch (e) {
      setBanner({ type: "error", text: `Save failed: ${e?.message || e}` });
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    if (!canQuery || isExpired) return;
    const dirty = rows.filter((r) => r._dirty);
    if (!dirty.length) {
      setBanner({ type: "info", text: "No changes to save." });
      setTimeout(() => setBanner({ type: "", text: "" }), 1600);
      return;
    }

    setSaving(true);
    try {
      // Ensure positions are current
      const withPos = applyPositions(rows);
      setRows(withPos);

      for (const r of withPos) {
        if (!r._dirty) continue;
        await saveRow(r, false);
      }
      setBanner({
        type: "success",
        text: `Saved ${dirty.length} student${dirty.length === 1 ? "" : "s"}.`,
      });
      setTimeout(() => setBanner({ type: "", text: "" }), 2200);
      await refreshAll();
    } catch (e) {
      setBanner({ type: "error", text: `Save failed: ${e?.message || e}` });
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Derived ---------- */
  const noAssignments = !assignments.length;
  const unsavedCount = rows.filter((r) => r._dirty).length;

  const filteredRows = useMemo(() => {
    let arr = [...rows];
    if (showDirtyOnly) arr = arr.filter((r) => r._dirty);
    const n = q.trim().toLowerCase();
    if (!n) return arr;
    return arr.filter(
      (r) => (r.name || "").toLowerCase().includes(n) || String(r.index_no || "").toLowerCase().includes(n)
    );
  }, [rows, q, showDirtyOnly]);

  return (
    <DashboardLayout title={`Enter Scores (${PLAN.toUpperCase()})`} subtitle="">
      {/* Plan status banner (dismissable; red if expired) */}
      {pkgLoaded && showPlan && (
        <div
          className={`mb-4 w-full rounded-lg border p-3 text-sm ${
            isExpired
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-gray-50 border-gray-200 text-gray-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className={`h-4 w-4 ${isExpired ? "text-rose-600" : "text-gray-500"}`} />
            <span>
              Plan: <strong>{planHuman || "—"}</strong>
              {expiryRaw ? <> · Expires: <strong>{String(expiryRaw).slice(0,10)}</strong></> : null}
              {isExpired && <> · <strong>Expired</strong></>}
            </span>
            <button
              onClick={dismissPlan}
              className="ml-auto p-1 rounded hover:bg-black/5"
              aria-label="Dismiss plan banner"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <LabeledSelect label="Academic Year" value={yearId ?? ""} onChange={(v) => setYearId(Number(v))}>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </LabeledSelect>

        <LabeledSelect label="Term" value={termId ?? ""} onChange={(v) => setTermId(Number(v))}>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </LabeledSelect>

        <LabeledSelect label="Class" value={classId ?? ""} onChange={(v) => setClassId(Number(v))}>
          {noAssignments ? (
            <option value="">No assigned classes</option>
          ) : (
            classOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          )}
        </LabeledSelect>

        <LabeledSelect label="Subject" value={subjectId ?? ""} onChange={(v) => setSubjectId(Number(v))}>
          {!classId || !subjectOptions.length ? (
            <option value="">No assigned subjects</option>
          ) : (
            subjectOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          )}
        </LabeledSelect>

        {/* Buttons section adapts */}
        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-end gap-2">
          <button
            type="button"
            onClick={refreshAll}
            disabled={!canQuery || loading || isExpired}
            className={`inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 disabled:opacity-50 ${isExpired ? "cursor-not-allowed" : ""}`}
            title={isExpired ? "Plan expired" : "Reload marks"}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={saveAll}
            disabled={saving || !canQuery || unsavedCount === 0 || isExpired}
            className={`inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 ${isExpired ? "cursor-not-allowed" : ""}`}
            title={isExpired ? "Plan expired" : "Save all edited rows"}
          >
            <Save className="h-4 w-4" /> Save All {unsavedCount ? `(${unsavedCount})` : ""}
          </button>
        </div>
      </div>

      {/* Quick tools: search + dirty filter */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student / Index No…"
            className="pl-9 pr-3 py-2 w-72 rounded-md text-sm border bg-white dark:bg-gray-900 dark:border-gray-700"
          />
        </div>
        <button
          onClick={() => setShowDirtyOnly((s) => !s)}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
            showDirtyOnly ? "bg-indigo-50 dark:bg-indigo-900/30" : "bg-white dark:bg-gray-900"
          }`}
          title="Show edited rows only"
        >
          <Filter className="h-4 w-4" /> {showDirtyOnly ? "Showing edited only" : "Show edited only"}
        </button>
      </div>

      {/* Info & banners */}
      {!!scale.length && (
        <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 inline-flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Grading scale loaded for this class.
        </div>
      )}

      {banner.text && (
        <div
          className={`mb-3 flex items-start gap-2 rounded-lg p-3 border ${
            banner.type === "success"
              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : banner.type === "error"
              ? "text-rose-700 bg-rose-50 border-rose-200"
              : "text-gray-700 bg-gray-50 border-gray-200"
          }`}
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : banner.type === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : null}
          <span className="text-sm">{banner.text}</span>
        </div>
      )}
      {err && (
        <div className="mb-3 flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{err}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm hidden md:table">
          <thead>
            <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
              <th className="p-2">Student</th>
              <th className="p-2">Index No</th>
              <th className="p-2 text-right">Class Score</th>
              <th className="p-2 text-right">Exam Score</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2">Grade</th>
              <th className="p-2">Remark</th>
              <th className="p-2 text-center w-16">Position</th>
              <th className="p-2 text-right w-32">Actions</th>
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="p-6 text-center">
                  <span className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </span>
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-gray-500">
                  {noAssignments ? "No teaching assignments found." : "No students/records match your filters."}
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b last:border-0 dark:border-gray-700 ${r._dirty ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""
                    }`}
                >
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.index_no || "—"}</td>
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      className={`w-24 text-right border rounded px-2 py-1 bg-white dark:bg-gray-900 dark:border-gray-700 ${isExpired ? "opacity-60 cursor-not-allowed" : ""}`}
                      value={r.class_score}
                      onChange={(e) => updateCell(r.id, "class_score", e.target.value)}
                      disabled={isExpired}
                      title={isExpired ? "Plan expired" : ""}
                    />
                  </td>
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      className={`w-24 text-right border rounded px-2 py-1 bg-white dark:bg-gray-900 dark:border-gray-700 ${isExpired ? "opacity-60 cursor-not-allowed" : ""}`}
                      value={r.exam_score}
                      onChange={(e) => updateCell(r.id, "exam_score", e.target.value)}
                      disabled={isExpired}
                      title={isExpired ? "Plan expired" : ""}
                    />
                  </td>
                  <td className="p-2 text-right">{r.total}</td>
                  <td className="p-2">{r.grade}</td>
                  <td className="p-2">{r.meaning}</td>
                  <td className="p-2 text-center">{r.position}</td>
                  <td className="p-2 text-right">
                    <button
                      type="button"
                      onClick={() => saveRow(r, true)}
                      disabled={!r._dirty || saving || isExpired}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 ${isExpired ? "cursor-not-allowed" : ""}`}
                      title={isExpired ? "Plan expired" : "Save this row"}
                    >
                      {r._savedOk ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                      {r._savedOk ? "Saved" : "Save"}
                    </button>
                  </td>
                  <td className="p-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(r)}
                      className={`p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/30 ${isExpired ? "opacity-60 cursor-not-allowed" : ""}`}
                      title={isExpired ? "Plan expired" : (r._exists ? "Delete mark" : "Remove from view")}
                      disabled={isExpired}
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Mobile card view */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="p-6 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" /> Loading…
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {noAssignments ? "No teaching assignments found." : "No students/records match your filters."}
            </div>
          ) : (
            filteredRows.map((r) => (
              <div
                key={r.id}
                className={`p-3 border rounded-lg dark:border-gray-700 ${r._dirty ? "bg-yellow-50/50 dark:bg-yellow-900/10" : "bg-white dark:bg-gray-800"
                  }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-sm text-gray-500">{r.index_no || "—"}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>Class Score: {r.class_score}</div>
                  <div>Exam Score: {r.exam_score}</div>
                  <div>Total: {r.total}</div>
                  <div>Grade: {r.grade}</div>
                  <div>Remark: {r.meaning}</div>
                  <div>Position: {r.position}</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveRow(r, true)}
                    disabled={!r._dirty || saving || isExpired}
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 ${isExpired ? "cursor-not-allowed" : ""}`}
                  >
                    {r._savedOk ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {r._savedOk ? "Saved" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(r)}
                    className={`flex-1 p-2 rounded-md border text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 ${isExpired ? "opacity-60 cursor-not-allowed" : ""}`}
                    disabled={isExpired}
                  >
                    <Trash2 className="h-4 w-4 mx-auto" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>


      {/* Footer actions & toasts */}
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <button
          onClick={saveAll}
          disabled={saving || !filteredRows.length || !canQuery || unsavedCount === 0 || isExpired}
          className={`inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 ${isExpired ? "cursor-not-allowed" : ""}`}
          title={isExpired ? "Plan expired" : "Save all"}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save All
          {unsavedCount ? ` (${unsavedCount})` : ""}
        </button>
        {toast && (
          <span className="ml-1 inline-flex items-center gap-1 text-sm">
            {toast.toLowerCase().includes("fail") ? (
              <X className="h-4 w-4 text-rose-600" />
            ) : (
              <Check className="h-4 w-4 text-emerald-600" />
            )}
            {toast}
          </span>
        )}
      </div>
    </DashboardLayout>
  );
}

/* -------------------- Small UI bits -------------------- */
function LabeledSelect({ label, value, onChange, children }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <select
        className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
