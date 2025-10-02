// src/pages/ManageExamReportPage.js
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
  X,
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
const SCHOOL_INFO_API = `${HOST}/academic/get/school/`;

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

/* ------------ Promote / Repeat ------------ */
const PROMO_CLASSES_API = `${HOST}/student/get/classes/`; // ?p_school_id
const STUDENT_UPDATE_API = `${HOST}/student/update/student/`;

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

/* NEW: ordinal renderer for positions (1st, 2nd, 3rd, …) */
function ordinal(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "";
  const j = v % 10, k = v % 100;
  if (j === 1 && k !== 11) return `${v}st`;
  if (j === 2 && k !== 12) return `${v}nd`;
  if (j === 3 && k !== 13) return `${v}rd`;
  return `${v}th`;
}

/* ---- Plan helpers (same pattern as other pages) ---- */
function isDateExpired(isoOrDateString) {
  if (!isoOrDateString) return false;
  const d = new Date(String(isoOrDateString));
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  const todayFloor = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return d.getTime() < todayFloor;
}
const PLAN_NAME_BY_CODE = (raw) => {
  const v = String(raw ?? "").trim().toUpperCase();
  if (v === "1" || v === "BASIC") return "BASIC";
  if (v === "2" || v === "STANDARD") return "STANDARD";
  if (v === "3" || v === "PREMIUM" || v === "PREMUIM") return "PREMIUM";
  return "BASIC";
};
const HUMAN_PLAN = (code) => ({ BASIC: "Basic", STANDARD: "Standard", PREMIUM: "Premium" }[code] || "Basic");

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

  /* ---------- Plan / expiry gating ---------- */
  const fallbackPkg = Number(user?.school?.package ?? user?.package ?? user?.plan ?? 2);
  const fallbackPlanCode = fallbackPkg === 1 ? "BASIC" : fallbackPkg === 3 ? "PREMIUM" : "STANDARD";

  const [pkgName, setPkgName] = useState("");
  const [expiryRaw, setExpiryRaw] = useState("");
  const [pkgLoaded, setPkgLoaded] = useState(false);

  const planBannerKey = `examreport_plan_banner_dismissed_${schoolId}`;
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
        const rows = await jarr(SCHOOL_INFO_API, H);
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

  // LOVs
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(null);
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState(null);
  const [terms, setTerms] = useState([]);
  const [termId, setTermId] = useState(null);

  // Students in selected class
  const [students, setStudents] = useState([]);

  // Reopen Date
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

  // ===== Promote / Repeat modal state (simplified UX) =====
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoClasses, setPromoClasses] = useState([]); // [{class_id, class_name, section}]
  const [promoStudents, setPromoStudents] = useState([]); // full rows for update
  const [promoActions, setPromoActions] = useState({}); // { [student_id]: 'SKIP'|'PROMOTE'|'REPEAT' }
  const [promoteToClassId, setPromoteToClassId] = useState(null);
  const [promoBanner, setPromoBanner] = useState({ type: "", text: "" });
  const canPromote = isHT && !isExpired;

  // Update scopeKey and clear rows whenever scope changes
  useEffect(() => {
    if (!schoolId || !Number.isFinite(yearId) || !Number.isFinite(termId) || !Number.isFinite(classId)) {
      setScopeKey("");
      setRows([]);
      return;
    }
    const k = `${schoolId}|${yearId}|${termId}|${classId}`;
    setScopeKey(k);
    setRows([]);
  }, [schoolId, yearId, termId, classId]);

  // Load LOVs once (years/terms + classes)
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      setLoadingLov(true);
      try {
        // Classes by role
        if (isHT) {
          const cls = await jarr(`${ACADEMIC_CLASSES_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);
          const normC = cls.map((r) => ({
            id: Number(r.class_id ?? r.CLASS_ID ?? r.id ?? r.ID),
            name: r.class_name ?? r.CLASS_NAME ?? r.name ?? r.NAME,
          })).filter((x) => Number.isFinite(x.id));
          setClasses(normC);
          if (!Number.isFinite(classId) && normC.length) setClassId(Number(normC[0].id));
        } else {
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
  }, [schoolId, isHT, userId]);

  // Load students
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
          return { id: Number(sid), name: cname, index_no: idxNo, class_id: Number(cid) };
        }).filter((x) => Number.isFinite(x.id));

        const onlySelected = normalized.filter((s) => Number(s.class_id) === Number(classId));
        setStudents(onlySelected);
      } catch (e) {
        setErr(`Failed to load students. ${e?.message || e}`);
        setStudents([]);
      }
    })();
  }, [schoolId, classId, H]);

  // Build table + ranking + attendance + reviews
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
          const url = STUDENT_REPORT_URL({ sid: schoolId, yearId, termId, classId, studentId: s.id });
          const items = await jarr(url, H);
          const totals = items.map((r) => Number(r.total ?? r.TOTAL ?? 0));
          const cnt = totals.length;
          const sum = totals.reduce((a, b) => a + (Number(b) || 0), 0);
          const avg = cnt ? round2(sum / cnt) : 0;
          setProgress((p) => ({ ...p, done: Math.min(p.done + 1, students.length) }));
          return { student_id: s.id, name: s.name, index_no: s.index_no, avg };
        }
      );

      if (scopeKey && scopeKey !== localKey) return;

      // 2) ranking (numeric)
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

      // PREFILL Reopen Date
      const classReopen = pickClassReopenDate(revArr);
      if (classReopen && isHT) {
        setReopenDate((prev) => prev || classReopen);
      }

      // 4) attendance
      let presentMap = new Map();
      try {
        const att = await jarr(ATTEND_SUMMARY_URL({ sid: schoolId, classId, yearId, termId }), H);
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
          position: posMap.get(String(r.student_id)) || "", // numeric for API
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

  // Auto-compute
  useEffect(() => {
    if (schoolId && Number.isFinite(yearId) && Number.isFinite(termId) && Number.isFinite(classId) && students.length) {
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

  const canEditTeacher = isTeacher && !isExpired;
  const canEditHead = isHT && !isExpired;

  const onChangeCell = (id, field, value) => {
    if (isExpired) return;
    setRows((prev) =>
      prev.map((r) =>
        r.student_id === id ? { ...r, [field]: value, __dirty: true, __savedOk: false } : r
      )
    );
  };

  const saveRow = async (r, withBanner = false, reopenOnly = false) => {
    if (isExpired) return;
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
      p_overall_position: String(r.position ?? ""), // stays numeric
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
    if (isExpired) return;
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
    if (isExpired) return;
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
        await saveRow(r, false, true);
      }
      setBanner({ type: "success", text: `Reopen date applied to ${rows.length} student${rows.length === 1 ? "" : "s"}.` });
      setTimeout(() => setBanner({ type: "", text: "" }), 2500);
    } catch (e) {
      setBanner({ type: "error", text: `Failed applying reopen date: ${e?.message || e}` });
    }
  };

  // Export current view to Excel (Position as ordinal text)
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
        Position: ordinal(r.position), // <-- ordinal here
        "Present Days": r.present_days ?? 0,
        "Teacher Remarks": r.teacher_remarks || "",
        "Head Remarks": r.head_remarks || "",
        "Reopen Date": isHT ? (reopenDate || r.reopen_date || "") : "",
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

  /* ===== Promote / Repeat functions (new UX) ===== */
  function setPromoForAll(action) {
    setPromoActions((prev) => {
      const next = { ...prev };
      for (const s of promoStudents) next[s.student_id] = action;
      return next;
    });
  }

  async function openPromoteModal() {
    if (!isHT) return;
    setPromoBanner({ type: "", text: "" });
    setShowPromoteModal(true);
    setPromoLoading(true);
    try {
      // Load classes for target list
      const cls = await jarr(`${PROMO_CLASSES_API}?p_school_id=${encodeURIComponent(schoolId)}`, H);
      const normC = (cls || []).map(r => ({
        class_id: Number(r.class_id ?? r.CLASS_ID ?? r.id ?? r.ID),
        class_name: r.class_name ?? r.CLASS_NAME ?? r.name ?? r.NAME ?? "",
        section: r.section ?? r.SECTION ?? "",
      })).filter(c => Number.isFinite(c.class_id));
      setPromoClasses(normC);

      // Choose a sensible default "Promote to" class (first one that is NOT the current class if possible)
      let defaultTarget = normC.find(c => Number(c.class_id) !== Number(classId))?.class_id;
      if (!Number.isFinite(defaultTarget) && normC.length) defaultTarget = normC[0].class_id;
      setPromoteToClassId(Number.isFinite(defaultTarget) ? defaultTarget : null);

      // Load students (full payload for update API)
      const sRows = await jarr(
        `${STUDENTS_API}?p_school_id=${encodeURIComponent(schoolId)}&p_class_id=${encodeURIComponent(classId)}`,
        H
      );
      const normS = (sRows || []).map(s => ({
        student_id: Number(s.student_id ?? s.STUDENT_ID ?? s.id ?? s.ID),
        school_id: Number(s.school_id ?? s.SCHOOL_ID ?? schoolId),
        full_name: s.full_name ?? s.FULL_NAME ?? "",
        gender: s.gender ?? s.GENDER ?? "",
        dob: s.dob ?? s.DOB ?? "",
        class_id: Number(s.class_id ?? s.CLASS_ID ?? classId),
        admission_no: s.admission_no ?? s.ADMISSION_NO ?? "",
        index_no: s.index_no ?? s.INDEX_NO ?? "",
        role: s.role ?? s.ROLE ?? "",
        status: s.status ?? s.STATUS ?? "",
        father_name: s.father_name ?? s.FATHER_NAME ?? "",
        mother_name: s.mother_name ?? s.MOTHER_NAME ?? "",
        father_phone: s.father_phone ?? s.FATHER_PHONE ?? "",
        mother_phone: s.mother_phone ?? s.MOTHER_PHONE ?? "",
        guardian_name: s.guardian_name ?? s.GUARDIAN_NAME ?? "",
        guardian_phone: s.guardian_phone ?? s.GUARDIAN_PHONE ?? "",
        phone: s.phone ?? s.PHONE ?? "",
        email: s.email ?? s.EMAIL ?? "",
        image_url: s.image_url ?? s.IMAGE_URL ?? "",
        name: (s.full_name ?? s.FULL_NAME ?? "").trim(),
      })).filter(x => Number.isFinite(x.student_id));
      setPromoStudents(normS);

      // init actions to SKIP
      const init = {};
      for (const s of normS) init[s.student_id] = "SKIP";
      setPromoActions(init);
    } catch (e) {
      setPromoBanner({ type: "error", text: `Failed to load promotion data: ${e?.message || e}` });
    } finally {
      setPromoLoading(false);
    }
  }

  async function submitPromotions() {
    if (!isHT || isExpired) return;
    setPromoLoading(true);
    setPromoBanner({ type: "", text: "" });
    try {
      // Validate if at least one Promote requires target and we have a target class selected
      const needsTarget = Object.values(promoActions).some(a => a === "PROMOTE");
      if (needsTarget && !Number.isFinite(promoteToClassId)) {
        throw new Error("Select a 'Promote to class' before applying changes.");
      }

      let changed = 0;
      for (const s of promoStudents) {
        const action = promoActions[s.student_id];
        if (!action || action === "SKIP") continue;

        const targetClassId = action === "REPEAT" ? Number(s.class_id) : Number(promoteToClassId);
        if (!Number.isFinite(targetClassId)) continue;

        const qs = new URLSearchParams({
          p_student_id: String(s.student_id),
          p_school_id: String(s.school_id || schoolId),
          p_class_id: String(targetClassId),

          p_full_name: s.full_name || "",
          p_gender: s.gender || "",
          p_image_url: s.image_url || "",
          p_role: s.role || "",
          p_status: s.status || "",
          p_admission_no: s.admission_no || "",
          p_index_no: s.index_no || "",
          p_father_name: s.father_name || "",
          p_mother_name: s.mother_name || "",
          p_father_phone: s.father_phone || "",
          p_mother_phone: s.mother_phone || "",
          p_guardian_name: s.guardian_name || "",
          p_guardian_phone: s.guardian_phone || "",
          p_phone: s.phone || "",
          p_email: s.email || "",
          p_dob: s.dob || "",
        });

        const url = `${STUDENT_UPDATE_API}?${qs.toString()}`;
        const res = await fetch(url, { method: "GET", headers: { ...H } });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Failed for ${s.name || s.student_id}: HTTP ${res.status} ${txt}`);
        }
        changed++;
      }

      setPromoBanner({ type: "success", text: changed ? `Updated ${changed} student${changed === 1 ? "" : "s"}.` : "No changes made." });

      // Recompute table and students in class (remove promoted ones from current class view)
      await buildTable();
      setStudents((prev) =>
        prev.filter(st => {
          const action = promoActions[st.id];
          if (action === "PROMOTE") return false; // moved out
          return true; // REPEAT or SKIP remain
        })
      );
    } catch (e) {
      setPromoBanner({ type: "error", text: e?.message || "Promotion failed." });
    } finally {
      setPromoLoading(false);
    }
  }

  return (
    <DashboardLayout title={`Manage Exam Report (${PLAN.toUpperCase()})`} subtitle="">
      {/* Plan status banner */}
      {pkgLoaded && showPlan && (
        <div
          className={`mb-4 rounded-lg border p-3 text-sm ${
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

          {/* Refresh */}
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
            disabled={unsavedCount === 0 || isExpired}
            title={isExpired ? "Plan expired" : "Save all edited remarks"}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 ${isExpired ? "cursor-not-allowed" : ""}`}
          >
            <Save size={16} /> Save All {unsavedCount ? `(${unsavedCount})` : ""}
          </button>

          {/* Promote / Repeat (HT only, more visible) */}
          {isHT && (
            <button
              onClick={openPromoteModal}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition bg-fuchsia-600 text-white hover:bg-fuchsia-700"
              type="button"
              title="Promote or repeat students"
            >
              <Filter size={16} />
              Promote / Repeat
            </button>
          )}
        </div>
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
                  <td className="px-4 py-2">{ordinal(r.position)}</td>{/* <- ordinal in UI */}
                  <td className="px-4 py-2">
                    <span className="inline-block min-w-[3ch] text-center">{r.present_days ?? 0}</span>
                  </td>
                  <td className="px-4 py-2">
                    <textarea
                      value={r.teacher_remarks || ""}
                      onChange={(e) => onChangeCell(r.student_id, "teacher_remarks", e.target.value)}
                      disabled={!canEditTeacher}
                      title={!canEditTeacher ? (isExpired ? "Plan expired" : "Not allowed for your role") : "Teacher remarks…"}
                      className={`w-64 min-h-[60px] px-2 py-1 rounded-md border bg-white dark:bg-gray-800 ${!canEditTeacher ? "opacity-60 cursor-not-allowed" : ""}`}
                      placeholder={canEditTeacher ? "Teacher remarks…" : "Read-only"}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <textarea
                      value={r.head_remarks || ""}
                      onChange={(e) => onChangeCell(r.student_id, "head_remarks", e.target.value)}
                      disabled={!canEditHead}
                      title={!canEditHead ? (isExpired ? "Plan expired" : "Head Teacher only") : "Head teacher remarks…"}
                      className={`w-64 min-h-[60px] px-2 py-1 rounded-md border bg-white dark:bg-gray-800 ${!canEditHead ? "opacity-60 cursor-not-allowed" : ""}`}
                      placeholder={canEditHead ? "Head teacher remarks…" : "Read-only"}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => saveRow(r, true)}
                      disabled={!r.__dirty || isExpired}
                      title={isExpired ? "Plan expired" : "Save this row"}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 ${isExpired ? "cursor-not-allowed" : ""}`}
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
              {reopenDate ? "Loaded existing class reopen date. You can change it below." : "Pick a date, then click “Apply to All & Save”."}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              className={`px-3 py-2 rounded-md text-sm border bg-white dark:bg-gray-900 ${isExpired ? "opacity-60 cursor-not-allowed" : ""}`}
              value={reopenDate}
              max={todayISO}
              onChange={(e) => setReopenDate(e.target.value)}
              disabled={isExpired}
              title={isExpired ? "Plan expired" : "Pick reopen date"}
            />
            <button
              onClick={applyReopenToAll}
              disabled={isExpired}
              title={isExpired ? "Plan expired" : "Apply to all & save"}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 ${isExpired ? "cursor-not-allowed" : ""}`}
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

      {/* Promote / Repeat Modal (HT only) */}
      {showPromoteModal && isHT && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => !promoLoading && setShowPromoteModal(false)} />
          {/* modal */}
          <div className="relative z-[71] w-full max-w-5xl mx-4 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-700 shadow-xl">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700">
              <div>
                <div className="text-lg font-semibold">Promote / Repeat Students</div>
                <div className="text-xs text-gray-500">
                  Current class: <strong>{classes.find(c => Number(c.id) === Number(classId))?.name || `#${classId}`}</strong> · Term: {terms.find(t => Number(t.id) === Number(termId))?.name || termId} · Year: {years.find(y => Number(y.id) === Number(yearId))?.name || yearId}
                </div>
              </div>
              <button
                onClick={() => setShowPromoteModal(false)}
                disabled={promoLoading}
                className="p-2 rounded hover:bg-black/5 disabled:opacity-50"
                aria-label="Close"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* banner */}
            {promoBanner.text && (
              <div className={`mx-5 mt-4 rounded-lg border p-3 text-sm ${
                promoBanner.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : promoBanner.type === "error"
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              }`}>
                {promoBanner.text}
              </div>
            )}

            {/* controls */}
            <div className="px-5 pt-4 pb-3 flex flex-col lg:flex-row lg:items-end gap-3">
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1">Promote to class (applies to all marked <strong>Promote</strong>)</label>
                <select
                  value={Number.isFinite(promoteToClassId) ? String(promoteToClassId) : ""}
                  onChange={(e) => setPromoteToClassId(Number(e.target.value))}
                  disabled={promoLoading || promoClasses.length === 0}
                  className="px-3 py-2 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 text-sm min-w-[16rem]"
                >
                  {promoClasses.length ? promoClasses.map(c => (
                    <option key={c.class_id} value={String(c.class_id)}>
                      {c.class_name}{c.section ? ` (${c.section})` : ""}
                    </option>
                  )) : <option value="">No classes</option>}
                </select>
                <div className="text-xs text-gray-500 mt-1">Students marked <em>Repeat</em> will remain in their current class.</div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setPromoForAll("PROMOTE")}
                  disabled={promoLoading || promoStudents.length === 0 || !Number.isFinite(promoteToClassId)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-sm"
                  type="button"
                  title="Set all to Promote"
                >
                  Promote All
                </button>
                <button
                  onClick={() => setPromoForAll("REPEAT")}
                  disabled={promoLoading || promoStudents.length === 0}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-sm"
                  type="button"
                  title="Set all to Repeat"
                >
                  Repeat All
                </button>
                <button
                  onClick={() => setPromoForAll("SKIP")}
                  disabled={promoLoading || promoStudents.length === 0}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-sm"
                  type="button"
                  title="Clear selections"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* summary chips */}
            <div className="px-5 pb-2 text-xs text-gray-500 flex flex-wrap gap-2">
              {(() => {
                const vals = Object.values(promoActions);
                const total = promoStudents.length;
                const promote = vals.filter(v => v === "PROMOTE").length;
                const repeat = vals.filter(v => v === "REPEAT").length;
                const skip = total - promote - repeat;
                return (
                  <>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-200">Promote: {promote}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">Repeat: {repeat}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">Skip: {skip}</span>
                  </>
                );
              })()}
            </div>

            {/* table */}
            <div className="px-5 pb-5">
              <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left">Current Class</th>
                      <th className="px-4 py-3 text-left">Action</th>
                      <th className="px-4 py-3 text-left">Target Class (read-only)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoLoading ? (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                        <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</span>
                      </td></tr>
                    ) : promoStudents.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No students in this class.</td></tr>
                    ) : promoStudents.map((s, idx) => {
                      const action = promoActions[s.student_id] || "SKIP";
                      const curClassName =
                        classes.find(c => Number(c.id) === Number(s.class_id))?.name ||
                        promoClasses.find(c => Number(c.class_id) === Number(s.class_id))?.class_name ||
                        s.class_id;

                      let targetText = "—";
                      if (action === "REPEAT") targetText = String(curClassName);
                      if (action === "PROMOTE") {
                        const tgt = promoClasses.find(c => Number(c.class_id) === Number(promoteToClassId));
                        targetText = tgt ? `${tgt.class_name}${tgt.section ? ` (${tgt.section})` : ""}` : "Select class above";
                      }

                      return (
                        <tr key={s.student_id} className={idx % 2 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-800/40'}>
                          <td className="px-4 py-2">{s.name}</td>
                          <td className="px-4 py-2">{String(curClassName)}</td>
                          <td className="px-4 py-2">
                            <select
                              value={action}
                              onChange={(e) => {
                                const a = e.target.value;
                                setPromoActions(prev => ({ ...prev, [s.student_id]: a }));
                              }}
                              disabled={promoLoading}
                              className="px-3 py-2 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700"
                            >
                              <option value="SKIP">Skip</option>
                              <option value="PROMOTE">Promote</option>
                              <option value="REPEAT">Repeat</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              readOnly
                              value={targetText}
                              className="w-full px-3 py-2 rounded-md border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                              title="Target class is derived from your action and the selection above"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* footer actions */}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowPromoteModal(false)}
                  disabled={promoLoading}
                  className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPromotions}
                  disabled={promoLoading || !isHT || isExpired}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition bg-fuchsia-600 text-white hover:bg-fuchsia-700 disabled:opacity-50 ${(!isHT || isExpired) ? "cursor-not-allowed" : ""}`}
                  title={!isHT ? "Head Teacher only" : (isExpired ? "Plan expired" : "Apply changes")}
                  type="button"
                >
                  {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {promoLoading ? "Applying…" : "Apply Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
