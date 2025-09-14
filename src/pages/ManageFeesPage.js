// src/pages/ManageFeesPage.js
import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { useAuth } from "../AuthContext";
import {
  Plus, Edit3, Trash2, Save, X, Search, Receipt,
  Wallet, Layers, Building2, CalendarDays, Inbox, AlertCircle,
  CheckCircle, XCircle, DollarSign, Loader2, Download, Info, Users,
  FileDown, ChevronRight, Send, Printer
} from "lucide-react";

/* ------------ ORDS ------------ */
const HOST = "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";
const ACADEMIC_CLASSES_API       = `${HOST}/academic/get/classes/`;
const ACADEMIC_YEAR_API          = `${HOST}/academic/get/academic_year/`;
const ACADEMIC_TERM_API          = `${HOST}/academic/get/term/`;
const ACADEMIC_FEECAT_LIST_API   = `${HOST}/academic/list/fee_category/`;
const ACADEMIC_FEECAT_ADD_API    = `${HOST}/academic/add/fee_category/`;
const ACADEMIC_FEECAT_UPDATE_API = `${HOST}/academic/update/fee_category/`;
const ACADEMIC_FEECAT_DELETE_API = `${HOST}/academic/delete/fee_category/`;
const ACADEMIC_FEESTR_LIST_API   = `${HOST}/academic/list/fee_structure/`;
const ACADEMIC_FEESTR_ADD_API    = `${HOST}/academic/add/fee_structure/`;
const ACADEMIC_FEESTR_UPDATE_API = `${HOST}/academic/update/fees_structure/`;
const ACADEMIC_FEESTR_DELETE_API = `${HOST}/academic/delete/fee_structure/`;
const FEES_INVOICES_API          = `${HOST}/fees/invoice/`;
const FEES_GENERATE_API          = `${HOST}/fees/invoice/generate/`;
const FEES_PAYMENTS_API          = `${HOST}/fees/payment/`;
const FEES_PAYMENTS_LISTADD_API  = `${HOST}/fees/list/payment/`;
const FEES_CLASS_SUMMARY_API     = `${HOST}/fees/summary/class/`;
const FEES_RECEIPT_GEN_API       = `${HOST}/fees/receipt/generate/`;

/* ------------ utils ------------ */
const jtxt = async (u) => {
  const r = await fetch(u, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.text()).trim();
};
const jarr = async (u) => {
  const t = await jtxt(u); if (!t) return [];
  try { const d = JSON.parse(t); return Array.isArray(d) ? d : (Array.isArray(d.items) ? d.items : []); } catch { return []; }
};
const jobj = async (u) => {
  const t = await jtxt(u); if (!t) return {};
  try { const d = JSON.parse(t); return d && typeof d === "object" ? d : {}; } catch { return {}; }
};

const currency = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isNum = (v) => v !== null && v !== undefined && !Number.isNaN(Number(v));
const ask = (m) => (typeof window !== "undefined" ? window.confirm(m) : true);
const csv = (rows, name="export.csv") => {
  if (!rows?.length) return;
  const heads = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const out = [heads.join(","), ...rows.map(r => heads.map(h => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([out], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 500);
};

// Receipt helper: returns a string like RCPT-1-YYYYMM-00001 (throws with clear message on failure)
const getReceiptNo = async (schoolId) => {
  if (!schoolId) throw new Error("Missing schoolId");

  const url = `${FEES_RECEIPT_GEN_API}?p_school_id=${encodeURIComponent(schoolId)}`;
  const r = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`Receipt API error: HTTP ${r.status}`);

  const raw = (await r.text()).trim();
  if (!raw) throw new Error("Receipt API returned empty body");

  // 1) Try clean JSON
  try {
    const j = JSON.parse(raw);
    const rcpt = (j.receipt_no || j.RECEIPT_NO || j.receipt || j.RECEIPT || "").toString();
    if (rcpt) return rcpt;
  } catch (_) {
    // ignore; we'll try other strategies below
  }

  // 2) Try to locate a JSON-looking substring within text/HTML
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const slice = raw.slice(firstBrace, lastBrace + 1);
    try {
      const j2 = JSON.parse(slice);
      const rcpt2 = (j2.receipt_no || j2.RECEIPT_NO || j2.receipt || j2.RECEIPT || "").toString();
      if (rcpt2) return rcpt2;
    } catch (_) {}
  }

  // 3) Last resort: pattern-match a receipt code in plain text/HTML
  const m = raw.match(/RCPT-[A-Za-z0-9-]+/);
  if (m && m[0]) return m[0];

  // 4) Give a helpful error with a short excerpt
  const excerpt = raw.replace(/\s+/g, " ").slice(0, 180);
  throw new Error(`Receipt API returned invalid JSON: ${excerpt}${raw.length > 180 ? "…" : ""}`);
};

const Chip = ({ children, color="gray" }) => {
  const c = {
    gray:"bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
    green:"bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    red:"bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    amber:"bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    indigo:"bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  }[color];
  return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${c}`}>{children}</span>;
};
const StatusPill = ({ status }) => {
  const s = String(status||"").toUpperCase();
  if (s==="PAID") return <Chip color="green"><CheckCircle className="w-3 h-3" /> PAID</Chip>;
  if (s==="PARTLY_PAID"||s==="PARTIAL") return <Chip color="amber"><Info className="w-3 h-3" /> PARTLY PAID</Chip>;
  if (s==="UNPAID") return <Chip color="red"><XCircle className="w-3 h-3" /> UNPAID</Chip>;
  return <Chip>{s||"N/A"}</Chip>;
};
const Toast = ({ type="info", text }) => {
  const m = {
    info:"bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200",
    ok:"bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
    err:"bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200",
  }[type];
  return <div className={`rounded-xl px-4 py-3 ${m}`}>{text}</div>;
};

/* ------------ aggregations ------------ */
const aggInvoices = (rows=[]) => {
  const m = new Map();
  for (const r of rows) {
    const id = String(r.student_id ?? r.STUDENT_ID ?? ""); if (!id) continue;
    if (!m.has(id)) m.set(id, {
      student_id: r.student_id ?? r.STUDENT_ID,
      student_name: r.student_name ?? r.STUDENT_NAME ?? id,
      contact_email: (r.contact_email ?? r.CONTACT_EMAIL ?? "").trim(),
      contact_phone: (r.contact_phone ?? r.CONTACT_PHONE ?? "").trim(),
      amount:0, paid_total:0, balance:0
    });
    const a = m.get(id);
    const amt = Number(r.amount ?? r.AMOUNT ?? 0);
    const paid = Number(r.paid_total ?? r.AMOUNT_PAID ?? r.PAID_TOTAL ?? 0);
    const bal  = Number((r.balance ?? r.BALANCE) ?? (amt - paid));
    if (!a.contact_email && (r.contact_email ?? r.CONTACT_EMAIL)) a.contact_email = (r.contact_email ?? r.CONTACT_EMAIL).trim();
    if (!a.contact_phone && (r.contact_phone ?? r.CONTACT_PHONE)) a.contact_phone = (r.contact_phone ?? r.CONTACT_PHONE).trim();
    a.amount += amt; a.paid_total += paid; a.balance += bal;
  }
  return [...m.values()].map(v => ({
    ...v,
    status: v.amount<=0 ? "UNPAID" : (v.balance<=0 ? "PAID" : (v.paid_total>0 ? "PARTLY_PAID" : "UNPAID"))
  }));
};
const aggPayments = (rows=[]) => {
  const m = new Map();
  for (const p of rows) {
    const id = String(p.student_id ?? ""); if (!id) continue;
    if (!m.has(id)) m.set(id, { student_id:p.student_id, student_name:p.student_name ?? id, total_paid_now:0, payments_count:0 });
    const a = m.get(id); a.total_paid_now += Number(p.amount_paid || 0); a.payments_count += 1;
  }
  return [...m.values()];
};

/* ------------ page ------------ */
export default function ManageFeesPage() {
  const { user } = useAuth() || {};
  const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? 1;
  const pkg = Number(user?.school?.package ?? user?.package ?? user?.plan ?? 2);
  const PLAN = pkg===1 ? "basic" : pkg===3 ? "premium" : "standard";
  const IS_BASIC = pkg===1;
  const CUR = user?.school?.currency ?? user?.currency ?? "GHS";
  const SCHOOL_NAME = user?.school?.name ?? user?.school_name ?? "Your School";
  const money = (n) => `${CUR} ${currency(n)}`;
  const userId = user?.id ?? user?.user_id ?? 1;

  const [terms, setTerms] = useState([]);     const [termId, setTermId] = useState(null);
  const [years, setYears] = useState([]);     const [yearId, setYearId] = useState(null);
  const [classes, setClasses] = useState([]); const [classId, setClassId] = useState(null);
  const [classErr, setClassErr] = useState(""); const [classesLoading, setClassesLoading] = useState(false);

  const [tab, setTab] = useState("overview");
  const [categories, setCategories] = useState([]); const [catLoading, setCatLoading] = useState(false);
  const [catErr, setCatErr] = useState(""); const [openCat, setOpenCat] = useState(false); const [editCat, setEditCat] = useState(null);

  const [structures, setStructures] = useState([]); const [strLoading, setStrLoading] = useState(false);
  const [strErr, setStrErr] = useState(""); const [openStr, setOpenStr] = useState(false); const [editStr, setEditStr] = useState(null);

  const [summary, setSummary] = useState({ total_billed:0, total_paid:0, balance:0, unpaid_count:0, count:0, partial_count:0, paid_count:0 });
  const [invLoading, setInvLoading] = useState(false); const [invErr, setInvErr] = useState(""); const [invoices, setInvoices] = useState([]); const [searchInv, setSearchInv] = useState("");
  const [payLoading, setPayLoading] = useState(false); const [payErr, setPayErr] = useState(""); const [payments, setPayments] = useState([]); const [searchPay, setSearchPay] = useState("");

  const [openStudentPay, setOpenStudentPay] = useState(false); const [studentForPay, setStudentForPay] = useState(null);
  const [payAnyForm, setPayAnyForm] = useState({ amount_paid:"", method:"MoMo", receipt_no:"" });
  const [openStudentPayments, setOpenStudentPayments] = useState(false); const [studentForPayments, setStudentForPayments] = useState(null);
  const [toast, setToast] = useState(null);

  // NEW: balances filter
  const [balancesFilter, setBalancesFilter] = useState("all"); // 'all' | 'owing' | 'paid'

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      setClassesLoading(true); setClassErr("");
      try {
        const rows = await jarr(`${ACADEMIC_CLASSES_API}?p_school_id=${encodeURIComponent(schoolId)}`);
        const norm = rows.map(r => ({
          class_id: r.class_id ?? r.CLASS_ID ?? r.id ?? r.ID,
          class_name: r.class_name ?? r.CLASS_NAME ?? r.name ?? r.NAME
        })).filter(x => x.class_id!=null);
        setClasses(norm); if (!classId && norm.length) setClassId(Number(norm[0].class_id));
      } catch (e) { setClassErr((e && e.message) || "Failed to load classes."); }
      setClassesLoading(false);
    })();
  }, [schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!schoolId) return; (async () => {
    const rows = await jarr(`${ACADEMIC_YEAR_API}?p_school_id=${encodeURIComponent(schoolId)}`);
    const all = rows.map(r => ({
      id: r.academic_year_id ?? r.ACADEMIC_YEAR_ID,
      name: r.academic_year_name ?? r.ACADEMIC_YEAR_NAME,
      status: (r.status ?? r.STATUS) || ""
    })).filter(a=>a.id!=null);
    setYears(all);
    const cur = all.find(a => String(a.status).toUpperCase()==="CURRENT");
    setYearId(cur?.id ?? (all[0]?.id ?? null));
  })(); }, [schoolId]);

  useEffect(() => { if (!schoolId) return; (async () => {
    const rows = await jarr(`${ACADEMIC_TERM_API}?p_school_id=${encodeURIComponent(schoolId)}`);
    const all = rows.map(r => ({
      id: r.term_id ?? r.TERM_ID,
      name: r.term_name ?? r.TERM_NAME,
      status: (r.status ?? r.STATUS) || ""
    })).filter(t=>t.id!=null);
    setTerms(all);
    const cur = all.find(t => String(t.status).toUpperCase()==="CURRENT");
    setTermId(cur?.id ?? (all[0]?.id ?? null));
  })(); }, [schoolId]);

  useEffect(() => { if (schoolId) loadCategories(); }, [schoolId]);

  useEffect(() => {
    if (!schoolId || !classId || !isNum(termId) || !isNum(yearId)) return;
    loadClassSummary(); loadInvoices(); loadRecentPayments();
  }, [schoolId, classId, termId, yearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!schoolId || !classId || !isNum(termId) || !isNum(yearId)) return; loadStructures(); }, [schoolId, classId, termId, yearId, categories]); // eslint-disable-line react-hooks/exhaustive-deps

  const termName = useMemo(() => terms.find(t => Number(t.id)===Number(termId))?.name || "", [terms, termId]);
  const yearName = useMemo(() => years.find(y => Number(y.id)===Number(yearId))?.name || "", [years, yearId]);
  const clsName  = useMemo(() => classes.find(c => Number(c.class_id)===Number(classId))?.class_name || `Class ${classId||""}`, [classes, classId]);

  const loadCategories = async () => {
    setCatLoading(true); setCatErr("");
    try {
      const rows = await jarr(`${ACADEMIC_FEECAT_LIST_API}?p_school_id=${encodeURIComponent(schoolId)}`);
      setCategories(rows.map(r => ({
        category_id: r.category_id ?? r.CATEGORY_ID,
        name: r.category_name ?? r.CATEGORY_NAME ?? r.name ?? r.NAME,
        description: r.description ?? r.DESCRIPTION
      })));
    } catch (e) { setCatErr((e && e.message) || "Failed to load categories."); }
    setCatLoading(false);
  };
  const loadStructures = async () => {
    setStrLoading(true); setStrErr("");
    try {
      const url = `${ACADEMIC_FEESTR_LIST_API}?p_school_id=${schoolId}&p_term=${termId}&p_academic_year=${yearId}&p_class_id=${classId}`;
      const rows = await jarr(url);
      const nameById = new Map(categories.map(c => [String(c.category_id), c.name]));
      setStructures(rows.map(r => ({
        structure_id:r.structure_id ?? r.STRUCTURE_ID, class_id:r.class_id ?? r.CLASS_ID,
        category_id:r.category_id ?? r.CATEGORY_ID, amount:Number(r.amount ?? r.AMOUNT ?? 0),
        category_name: nameById.get(String(r.category_id ?? r.CATEGORY_ID)) || ""
      })));
    } catch (e) { setStrErr((e && e.message) || "Failed to load structures."); }
    setStrLoading(false);
  };
  const loadClassSummary = async () => {
    const u = `${FEES_CLASS_SUMMARY_API}?p_school_id=${schoolId}&p_class_id=${classId}&p_term=${termId}&p_academic_year=${yearId}`;
    const j = await jobj(u);
    setSummary({
      total_billed:Number(j.total_billed||0), total_paid:Number(j.total_paid||0), balance:Number(j.balance||0),
      unpaid_count:Number(j.unpaid_count||0), partial_count:Number(j.partial_count||0), paid_count:Number(j.paid_count||0), count:Number(j.count||0)
    });
  };
  const loadInvoices = async () => {
    setInvLoading(true); setInvErr("");
    try {
      const url = `${FEES_INVOICES_API}?p_school_id=${schoolId}&p_class_id=${classId}&p_term=${termId}&p_academic_year=${yearId}`;
      const rows = await jarr(url);
      setInvoices(rows.map(r => ({
        invoice_id: r.invoice_id ?? r.INVOICE_ID, 
        student_id: r.student_id ?? r.STUDENT_ID, 
        student_name: r.student_name ?? r.STUDENT_NAME,
        contact_email: r.contact_email ?? r.CONTACT_EMAIL ?? "",
        contact_phone: r.contact_phone ?? r.CONTACT_PHONE ?? "",
        category_id: r.category_id ?? r.CATEGORY_ID,
        category_name: r.category_name ?? r.CATEGORY_NAME, 
        term: r.term ?? r.TERM, 
        academic_year: r.academic_year ?? r.ACADEMIC_YEAR,
        amount: Number(r.amount ?? r.AMOUNT ?? 0), 
        status: (r.status ?? r.STATUS) || "UNPAID",
        due_date:(r.due_date ?? r.DUE_DATE)?.slice ? (r.due_date ?? r.DUE_DATE).slice(0,10) : r.due_date,
        paid_total:Number(r.paid_total ?? r.AMOUNT_PAID ?? r.PAID_TOTAL ?? 0),
        balance:Number((r.balance ?? r.BALANCE) ?? (Number(r.amount||0) - Number(r.paid_total||0)))
      })));
    } catch (e) { setInvErr((e && e.message) || "Failed to load invoices."); }
    setInvLoading(false);
  };

  /* ------------ FIXED: self-contained payments loader (no race with invoices) ------------ */
  const loadRecentPayments = async () => {
    if (!schoolId || !classId || !isNum(termId) || !isNum(yearId)) return;
    setPayLoading(true); setPayErr("");

    try {
      // 1) Fetch the invoices fresh for the current filters (do not rely on invoices state)
      const invUrl = `${FEES_INVOICES_API}?p_school_id=${schoolId}&p_class_id=${classId}&p_term=${termId}&p_academic_year=${yearId}`;
      const rows = await jarr(invUrl);
      const invList = rows.map(r => ({
        invoice_id:r.invoice_id ?? r.INVOICE_ID,
        student_id:r.student_id ?? r.STUDENT_ID,
        student_name:r.student_name ?? r.STUDENT_NAME ?? (r.student_id ?? r.STUDENT_ID),
        category_name:r.category_name ?? r.CATEGORY_NAME ?? r.category_id ?? r.CATEGORY_ID,
        amount:Number(r.amount ?? r.AMOUNT ?? 0),
        paid_total:Number(r.paid_total ?? r.AMOUNT_PAID ?? r.PAID_TOTAL ?? 0),
        balance:Number((r.balance ?? r.BALANCE) ?? 0),
      }));

      // 2) Pull payments per invoice and flatten
      const flat = (await Promise.all(invList.map(async i => {
        const arr = await jarr(`${FEES_PAYMENTS_API}?p_invoice_id=${encodeURIComponent(i.invoice_id)}`);
        return (arr||[]).map(r => ({
          payment_id:r.payment_id ?? r.PAYMENT_ID,
          invoice_id:i.invoice_id,
          amount_paid:Number(r.amount_paid ?? r.AMOUNT_PAID ?? 0),
          method:r.method ?? r.METHOD,
          receipt_no:r.receipt_no ?? r.RECEIPT_NO,
          payment_date:(r.payment_date ?? r.PAYMENT_DATE)?.slice ? (r.payment_date ?? r.PAYMENT_DATE).slice(0,10) : r.payment_date,
          recorded_by:r.recorded_by ?? r.RECORDED_BY,
          student_name:i.student_name,
          student_id:i.student_id,
          category_name:i.category_name
        }));
      }))).flat();

      // 3) Sort newest first
      flat.sort((a,b) =>
        (b.payment_date||"").localeCompare(a.payment_date||"") ||
        String(b.payment_id).localeCompare(String(a.payment_id))
      );

      setPayments(flat);
    } catch (e) {
      setPayErr((e && e.message) || "Failed to load payments.");
    }

    setPayLoading(false);
  };

  /* ------------ actions ------------ */
  const saveCategory = async (p) => {
    try {
      if (editCat?.category_id) {
        const u = `${ACADEMIC_FEECAT_UPDATE_API}?p_category_id=${editCat.category_id}&p_category_name=${encodeURIComponent(p.name||"")}&p_description=${encodeURIComponent(p.description||"")}`;
        const r = await fetch(u, { cache:"no-store", headers:{Accept:"application/json"} }); if (!r.ok) throw new Error("Update failed");
      } else {
        const u = `${ACADEMIC_FEECAT_ADD_API}?p_school_id=${schoolId}&p_category_name=${encodeURIComponent(p.name||"")}&p_description=${encodeURIComponent(p.description||"")}`;
        const r = await fetch(u, { cache:"no-store", headers:{Accept:"application/json"} }); if (!r.ok) throw new Error("Create failed");
      }
      setOpenCat(false); setEditCat(null); await loadCategories(); setToast({ type:"ok", text:"Category saved." });
    } catch (e) { setToast({ type:"err", text:(e && e.message) || "Failed to save category." }); }
  };
  const deleteCategory = async (id) => {
    if (!id || !ask("Delete this category permanently?")) return;
    try {
      const r = await fetch(`${ACADEMIC_FEECAT_DELETE_API}?p_category_id=${id}`, { cache:"no-store", headers:{Accept:"application/json"} });
      if (!r.ok) throw new Error("Delete failed"); await loadCategories(); setToast({ type:"ok", text:"Category deleted." });
    } catch (e) { setToast({ type:"err", text:(e && e.message) || "Failed to delete category." }); }
  };
  const saveStructure = async (p) => {
    if (!isNum(termId) || !isNum(yearId)) return setToast({ type:"err", text:"Select a valid Term & Year." });
    if (!p.category_id) return setToast({ type:"err", text:"Select a category." });
    try {
      if (editStr?.structure_id) {
        const u = `${ACADEMIC_FEESTR_UPDATE_API}?p_structure_id=${editStr.structure_id}&p_school_id=${schoolId}&p_category_id=${p.category_id}&p_class_id=${classId}&p_term=${termId}&p_academic_year=${yearId}&p_amount=${Number(p.amount||0)}`;
        const r = await fetch(u, { cache:"no-store", headers:{Accept:"application/json"} }); if (!r.ok) throw new Error("Update failed");
      } else {
        const u = `${ACADEMIC_FEESTR_ADD_API}?p_school_id=${schoolId}&p_class_id=${classId}&p_category_id=${p.category_id}&p_term=${termId}&p_academic_year=${yearId}&p_amount=${Number(p.amount||0)}`;
        const r = await fetch(u, { cache:"no-store", headers:{Accept:"application/json"} }); if (!r.ok) throw new Error("Save failed");
      }
      setOpenStr(false); setEditStr(null); await loadStructures(); await loadClassSummary(); setToast({ type:"ok", text:"Structure saved." });
    } catch (e) { setToast({ type:"err", text:(e && e.message) || "Failed to save structure." }); }
  };
  const deleteStructure = async (id) => {
    if (!id || !ask("Delete this structure line?")) return;
    try {
      const r = await fetch(`${ACADEMIC_FEESTR_DELETE_API}?p_structure_id=${id}`, { cache:"no-store", headers:{Accept:"application/json"} });
      if (!r.ok) throw new Error("Delete failed"); await loadStructures(); await loadClassSummary(); setToast({ type:"ok", text:"Structure deleted." });
    } catch (e) { setToast({ type:"err", text:(e && e.message) || "Failed to delete structure." }); }
  };
  const generateInvoices = async () => {
    if (!ask(`Generate invoices for:\nClass: ${clsName}\nTerm: ${termName}\nYear: ${yearName}\n\nProceed?`)) return;
    try {
      const u = `${FEES_GENERATE_API}?p_school_id=${schoolId}&p_class_id=${classId}&p_term=${termId}&p_academic_year=${yearId}`;
      const r = await fetch(u, { cache:"no-store", headers:{Accept:"application/json"} });
      if (!r.ok) throw new Error("Generate failed");
      await Promise.all([loadInvoices(), loadClassSummary(), loadRecentPayments()]);
      setToast({ type:"ok", text:"Invoices generated." }); setTab("invoices");
    } catch (e) { setToast({ type:"err", text:(e && e.message) || "Failed to generate invoices." }); }
  };

  /* email (Std/Premium) */
  const studentInvoices = (sid) => invoices.filter(i => Number(i.student_id)===Number(sid));
  const studentEmail = (sid) => (studentInvoices(sid).find(i => i.contact_email)?.contact_email || "").trim();
  const studentPhone = (sid) => (studentInvoices(sid).find(i => i.contact_phone)?.contact_phone || "").trim();

  const emailConsolidated = (sid, name) => {
    const email = studentEmail(sid); if (!email) return setToast({ type:"err", text:"No contact email found." });
    const invs = studentInvoices(sid); if (!invs.length) return setToast({ type:"err", text:"No invoices in this selection." });
    const lines = invs.map(i => `• ${i.category_name || i.category_id}: ${money(i.amount)} | Paid: ${money(i.paid_total)} | Bal: ${money(i.balance)}${i.due_date ? ` | Due: ${i.due_date}` : ""}`).join("\n");
    const totalAmount = invs.reduce((s,r)=>s+Number(r.amount||0),0);
    const totalPaid   = invs.reduce((s,r)=>s+Number(r.paid_total||0),0);
    const totalBal    = invs.reduce((s,r)=>s+Number(r.balance||0),0);
    const subject = `Invoice for ${name} — ${clsName}, ${termName} ${yearName}`;
    const body = `Dear Parent/Guardian,

Please find the invoice breakdown for ${name} (${clsName}, ${termName} ${yearName}):

${lines}

Totals:
• Amount: ${money(totalAmount)}
• Paid:   ${money(totalPaid)}
• Balance:${money(totalBal)}

To make payment, please use the approved channels and include the receipt number where applicable.
Thank you.`;
    const href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (typeof window !== "undefined") window.location.href = href;
    setToast({ type:"ok", text:`Opening email to ${email}...` });
  };

  // NEW: Send Reminder (Balances tab). Email preferred; fallback to SMS intent.
  const sendReminder = (sid, name) => {
    const email = studentEmail(sid);
    const phone = studentPhone(sid);
    const invs = studentInvoices(sid);
    const totalBal = invs.reduce((s,r)=> s + Number(((r.balance ?? (r.amount - r.paid_total)) ?? 0)), 0);

    if (totalBal <= 0) return setToast({ type:"info", text: "This student does not owe any balance." });
    if (!email && !phone) return setToast({ type:"err", text: "No contact email or phone on file." });

    const clsLbl = clsName;
    const subject = `Fee Reminder — ${name} (${clsLbl}, ${termName} ${yearName})`;
    const body =
`Dear Parent/Guardian,

This is a gentle reminder that there is an outstanding fee balance for ${name} (${clsLbl}, ${termName} ${yearName}).

Outstanding balance: ${money(totalBal)}

Kindly settle the balance at your earliest convenience using the approved channels. If you have recently paid, please ignore this reminder.

Thank you.`;

    if (email) {
      const href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if (typeof window !== "undefined") window.location.href = href;
      setToast({ type:"ok", text:`Opening email to ${email}...` });
    } else if (phone) {
      const href = `sms:${encodeURIComponent(phone)}?&body=${encodeURIComponent(body)}`;
      if (typeof window !== "undefined") window.location.href = href;
      setToast({ type:"ok", text:`Opening SMS to ${phone}...` });
    }
  };

  /* payments: block overpay & non-numeric & guarantee receipt no */
  const savePaymentForStudent = async (valuesOverride) => {
    const values = valuesOverride ?? payAnyForm;
    const amt = Number(values.amount_paid);
    if (!studentForPay?.student_id || !isFinite(amt) || amt <= 0) return setToast({ type:"err", text:"Enter a valid amount and pick a student." });

    const stuInvoices = invoices
      .filter(i => Number(i.student_id)===Number(studentForPay.student_id))
      .filter(i => Number(((i.balance ?? (i.amount - i.paid_total)) ?? 0)) > 0);
    if (!stuInvoices.length) return setToast({ type:"err", text:"No unpaid invoices for this student." });

    const outstanding = stuInvoices.reduce((s,r)=>s+Number(((r.balance ?? (r.amount - r.paid_total)) ?? 0)),0);
    if (amt > outstanding) return setToast({ type:"err", text:"Advanced payments are not permitted. Enter an amount up to the outstanding balance." });

    // Ensure a single (auto-generated) receipt number for the whole split
    let receiptToUse = (values.receipt_no || "").toString().trim();
    if (!receiptToUse) {
      try { receiptToUse = await getReceiptNo(schoolId); } catch { /* silent */ }
    }
    receiptToUse = (receiptToUse || "").toUpperCase().replace(/\s+/g, "-").slice(0,50);

    const sorted = [...stuInvoices].sort((a,b) => (a.due_date||"")<(b.due_date||"") ? -1 : (a.due_date===b.due_date ? Number(a.invoice_id)-Number(b.invoice_id) : 1));
    let remaining = amt;

    for (const inv of sorted) {
      if (remaining<=0) break;
      const invBal = Number(((inv.balance ?? (inv.amount - inv.paid_total)) ?? 0));
      const payNow = Math.min(invBal, remaining); if (payNow<=0) continue;
      const u = `${FEES_PAYMENTS_LISTADD_API}?p_invoice_id=${Number(inv.invoice_id)}&p_amount_paid=${payNow}&p_method=${encodeURIComponent(values.method||"MoMo")}&p_receipt_no=${encodeURIComponent(receiptToUse)}&p_recorded_by=${userId}&p_school_id=${schoolId}`;
      const r = await fetch(u, { cache:"no-store", headers:{Accept:"application/json"} }); if (!r.ok) throw new Error(`Payment failed for invoice #${inv.invoice_id}`);
      remaining -= payNow;
    }

    setOpenStudentPay(false);
    await Promise.all([loadInvoices(), loadClassSummary(), loadRecentPayments()]);
    setStudentForPayments({ student_id: studentForPay.student_id, full_name: studentForPay.full_name });
    setOpenStudentPayments(true);
    setToast({ type:"ok", text:"Payment recorded." });
  };

  /* derived */
  const invFiltered = useMemo(() => {
    const q = (searchInv||"").toLowerCase();
    return invoices.filter(i => !q || String(i.student_id).includes(q) || (i.student_name||"").toLowerCase().includes(q));
  }, [invoices, searchInv]);
  const invAgg = useMemo(() => aggInvoices(invFiltered), [invFiltered]);
  const debtorsAgg = useMemo(() => invAgg.filter(a => a.balance > 0), [invAgg]);
  const payAgg = useMemo(() => aggPayments(payments), [payments]);
  const payAggFiltered = useMemo(() => {
    const q = (searchPay||"").toLowerCase();
    return payAgg.filter(p => !q || String(p.student_id).includes(q) || (p.student_name||"").toLowerCase().includes(q));
  }, [payAgg, searchPay]);

  // NEW: balancesRows for the Balances tab filter
  const balancesRows = useMemo(() => {
    if (balancesFilter === "owing") return invAgg.filter(a => a.balance > 0);
    if (balancesFilter === "paid")  return invAgg.filter(a => a.balance <= 0);
    return invAgg;
  }, [invAgg, balancesFilter]);

  // Open modal — do NOT fetch receipt here; modal will do it on mount
  const openPay = (student_id, full_name) => {
    const stuInv = invoices.filter(i => Number(i.student_id)===Number(student_id));
    const suggested = stuInv.reduce((s,r)=> s + Number(((r.balance ?? (r.amount - r.paid_total)) ?? 0)), 0);
    setStudentForPay({ student_id, full_name });
    setPayAnyForm({ amount_paid: suggested>0 ? suggested : "", method:"MoMo", receipt_no: "" });
    setOpenStudentPay(true);
  };
  const openPayments = (student_id, full_name) => { setStudentForPayments({ student_id, full_name }); setOpenStudentPayments(true); };

  /* ------------ render ------------ */
  return (
    <DashboardLayout title={`Fees (${PLAN.toUpperCase()})`} subtitle="Configure categories & structures, generate invoices, track balances, and record payments">
      {/* Filters */}
      <div className="sticky top-0 z-10 pb-3 bg-gradient-to-b from-white/70 to-transparent dark:from-gray-900/60 backdrop-blur-md mb-2">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 border border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <LabeledSelect icon={<Building2 className="w-4 h-4" />} label="Class" value={classId ?? ""} onChange={v => setClassId(Number(v))}>
              {classesLoading && <option>Loading…</option>}
              {!classesLoading && classes.length===0 && <option value="">No classes</option>}
              {!classesLoading && classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
            </LabeledSelect>
            <LabeledSelect icon={<CalendarDays className="w-4 h-4" />} label="Term" value={termId ?? ""} onChange={v => setTermId(Number(v))}>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </LabeledSelect>
            <LabeledSelect icon={<Inbox className="w-4 h-4" />} label="Academic Year" value={yearId ?? ""} onChange={v => setYearId(Number(v))}>
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </LabeledSelect>
            <div className="flex items-end gap-2">
              <button onClick={()=>{loadClassSummary();loadInvoices();loadRecentPayments();}} className="w-full inline-flex items-center justify-center gap-2 border rounded-xl px-3 py-2">
                <Download className="w-4 h-4" /> Refresh
              </button>
            </div>
          </div>
          {classErr && <div className="mt-2"><Toast type="err" text={classErr} /></div>}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-3 flex flex-wrap gap-2">
        <TabBtn onClick={()=>setTab("overview")}   active={tab==="overview"}   icon={<Layers className="w-4 h-4" />}>Overview</TabBtn>
        <TabBtn onClick={()=>setTab("categories")} active={tab==="categories"} icon={<Building2 className="w-4 h-4" />}>Categories</TabBtn>
        <TabBtn onClick={()=>setTab("structures")} active={tab==="structures"} icon={<CalendarDays className="w-4 h-4" />}>Structures</TabBtn>
        <TabBtn onClick={()=>setTab("invoices")}   active={tab==="invoices"}   icon={<Receipt className="w-4 h-4" />}>Invoices</TabBtn>
        <TabBtn onClick={()=>setTab("payments")}   active={tab==="payments"}   icon={<Wallet className="w-4 h-4" />}>Payments</TabBtn>
        <TabBtn onClick={()=>setTab("balances")}   active={tab==="balances"}   icon={<Users className="w-4 h-4" />}>Balances</TabBtn>
      </div>

      {/* Overview */}
      {tab==="overview" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
            <KpiCard icon={<DollarSign className="w-5 h-5" />} title="Total Billed" value={money(summary.total_billed)} />
            <KpiCard icon={<CheckCircle className="w-5 h-5" />} title="Total Paid" value={money(summary.total_paid)} />
            <KpiCard icon={<XCircle className="w-5 h-5" />} title="Outstanding" value={money(summary.balance)} />
            <KpiCard icon={<AlertCircle className="w-5 h-5" />} title="Unpaid / All" value={`${debtorsAgg.length}/${invAgg.length}`} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <CardTable title={`All students — ${clsName}, ${termName} ${yearName}`} cols={["Student","Total Amount","Total Paid","Balance","Status"]}>
              {invAgg.slice(0,10).map(r => (
                <tr key={r.student_id} className="border-b last:border-0 dark:border-gray-700">
                  <td className="p-3 font-medium">
                    <div className="flex flex-col">
                      <span>{r.student_name || r.student_id}</span>
                      <span className="text-xs text-gray-500">
                        {(r.contact_email && r.contact_phone)
                          ? `${r.contact_email} • ${r.contact_phone}`
                          : (r.contact_email || r.contact_phone || <span className="text-amber-600">No contact</span>)}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">{money(r.amount)}</td>
                  <td className="p-3">{money(r.paid_total)}</td>
                  <td className="p-3">{money(r.balance)}</td>
                  <td className="p-3"><StatusPill status={r.status} /></td>
                </tr>
              ))}
              {invAgg.length===0 && <EmptyRow cols={5} text="No invoices yet for this selection." />}
            </CardTable>

            <CardTable title={`Students owing — ${clsName}, ${termName} ${yearName}`} cols={["Student","Billed","Paid","Balance","Status"]}>
              {debtorsAgg.slice(0,10).map(r => (
                <tr key={r.student_id} className="border-b last:border-0 dark:border-gray-700">
                  <td className="p-3 font-medium">
                    <div className="flex flex-col">
                      <span>{r.student_name}</span>
                      <span className="text-xs text-gray-500">
                        {(r.contact_email && r.contact_phone)
                          ? `${r.contact_email} • ${r.contact_phone}`
                          : (r.contact_email || r.contact_phone || <span className="text-amber-600">No contact</span>)}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">{money(r.amount)}</td>
                  <td className="p-3">{money(r.paid_total)}</td>
                  <td className="p-3">{money(r.balance)}</td>
                  <td className="p-3"><StatusPill status={r.status} /></td>
                </tr>
              ))}
              {debtorsAgg.length===0 && <EmptyRow cols={5} text="Everyone is fully paid 🎉" />}
            </CardTable>
          </div>
        </>
      )}

      {/* Categories */}
      {tab==="categories" && (
        <Section title="Categories" right={
          <>
            <button className="inline-flex items-center gap-2 px-3 py-2 border rounded-xl" onClick={loadCategories}>
              {catLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Refresh
            </button>
            <button className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-xl" onClick={()=>{setEditCat(null);setOpenCat(true);}}>
              <Plus className="w-4 h-4" /> New Category
            </button>
          </>
        }>
          {catErr && <div className="mb-3"><Toast type="err" text={catErr} /></div>}
          <Table cols={["Name","Description",""]}>
            {categories.map(c => (
              <tr key={c.category_id} className="border-b last:border-0 dark:border-gray-700">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.description || "-"}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <button className="px-2 py-1 border rounded-lg inline-flex items-center gap-1" onClick={()=>{setEditCat(c);setOpenCat(true);}}>
                      <Edit3 className="h-4 w-4" /> Edit
                    </button>
                    <button className="px-2 py-1 border rounded-lg text-rose-600 inline-flex items-center gap-1" onClick={()=>deleteCategory(c.category_id)}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!catLoading && categories.length===0 && <EmptyRow cols={3} text="No categories yet." />}
          </Table>
        </Section>
      )}

      {/* Structures */}
      {tab==="structures" && (
        <Section title={`Fee Structures — ${clsName}, ${termName} ${yearName}`} right={
          <>
            <button className="inline-flex items-center gap-2 px-3 py-2 border rounded-xl" onClick={loadStructures}>
              {strLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Refresh
            </button>
            <button className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-xl" onClick={()=>{setEditStr(null);setOpenStr(true);}}>
              <Plus className="w-4 h-4" /> Add / Update Line
            </button>
          </>
        }>
          {strErr && <div className="mb-3"><Toast type="err" text={strErr} /></div>}
          <Table cols={["Category","Amount",""]}>
            {structures.map(s => (
              <tr key={`${s.class_id}-${s.category_id}`} className="border-b last:border-0 dark:border-gray-700">
                <td className="p-3 font-medium">{s.category_name || s.category_id}</td>
                <td className="p-3">{money(s.amount)}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <button className="px-2 py-1 border rounded-lg inline-flex items-center gap-1" onClick={()=>{setEditStr(s);setOpenStr(true);}}>
                      <Edit3 className="h-4 w-4" /> Edit
                    </button>
                    <button className="px-2 py-1 border rounded-lg text-rose-600 inline-flex items-center gap-1" disabled={!s.structure_id} onClick={()=>deleteStructure(s.structure_id)}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!strLoading && structures.length===0 && <EmptyRow cols={3} text="No structure lines yet. Click “Add / Update Line”."/>}
          </Table>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-500 px-3 py-2 rounded-xl border border-dashed dark:border-gray-700">Tip: After changes, generate invoices for {clsName}.</div>
            <button onClick={generateInvoices} disabled={!schoolId||!classId} className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-xl disabled:opacity-60">
              <Receipt className="w-4 h-4" /> Generate Invoices for {clsName}
            </button>
          </div>
        </Section>
      )}

      {/* Invoices (by student) */}
      {tab==="invoices" && (
        <Section title={`Invoices — ${clsName}, ${termName} ${yearName}`} right={
          <div className="flex items-center gap-2">
            <SearchBox value={searchInv} onChange={setSearchInv} placeholder="Search by student" />
            <button className="inline-flex items-center gap-2 px-3 py-2 border rounded-xl" onClick={loadInvoices}>
              {invLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Refresh
            </button>
            <button className="inline-flex items-center gap-2 px-3 py-2 border rounded-xl" onClick={()=>csv(invAgg, `invoices_by_student_${clsName}_${termName}_${yearName}.csv`)}>
              <FileDown className="w-4 h-4" /> Export
            </button>
          </div>
        }>
          {invErr && <div className="mb-3"><Toast type="err" text={invErr} /></div>}
          <Table cols={["Student","Total Amount","Total Paid","Balance","Status",""]}>
            {invAgg.map(r => {
              const email = studentEmail(r.student_id); const canSend = !IS_BASIC && !!email;
              return (
                <tr key={r.student_id} className="border-b last:border-0 dark:border-gray-700">
                  <td className="p-3 font-medium">
                    <div className="flex flex-col">
                      <span>{r.student_name || r.student_id}</span>
                      <span className="text-xs text-gray-500">
                        {(r.contact_email && r.contact_phone)
                          ? `${r.contact_email} • ${r.contact_phone}`
                          : (r.contact_email || r.contact_phone || <span className="text-amber-600">No contact</span>)}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">{money(r.amount)}</td>
                  <td className="p-3">{money(r.paid_total)}</td>
                  <td className="p-3">{money(r.balance)}</td>
                  <td className="p-3"><StatusPill status={r.status} /></td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button className="px-2 py-1 border rounded-lg inline-flex items-center gap-1" onClick={()=>openPay(r.student_id, r.student_name || r.student_id)}>
                        View / Pay <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        className={`px-2 py-1 border rounded-lg inline-flex items-center gap-1 ${canSend ? "" : "opacity-60 cursor-not-allowed"}`}
                        onClick={()=>canSend && emailConsolidated(r.student_id, r.student_name || r.student_id)}
                        disabled={!canSend} title={IS_BASIC ? "Available on Standard & Premium" : (email ? "Send invoice via email" : "No email on file")}
                      >
                        <Send className="w-4 h-4" /> Send Invoice
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!invLoading && invAgg.length===0 && <EmptyRow cols={6} text={`No invoices. Try generating for ${clsName}.`} />}
          </Table>
        </Section>
      )}

      {/* Payments (by student) */}
      {tab==="payments" && (
        <Section title="Payments" right={
          <div className="flex items-center gap-2">
            <SearchBox value={searchPay} onChange={setSearchPay} placeholder="Search by student" />
            <button className="inline-flex items-center gap-2 px-3 py-2 border rounded-xl" onClick={loadRecentPayments}>
              {payLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Refresh
            </button>
            <button className="inline-flex items-center gap-2 px-3 py-2 border rounded-xl" onClick={()=>csv(payAggFiltered, `payments_by_student_${clsName}_${termName}_${yearName}.csv`)}>
              <FileDown className="w-4 h-4" /> Export
            </button>
          </div>
        }>
          {payErr && <div className="mb-3"><Toast type="err" text={payErr} /></div>}
          <Table cols={["Student","Total Paid",""]}>
            {payAggFiltered.map(p => (
              <tr key={p.student_id} className="border-b last:border-0 dark:border-gray-700">
                <td className="p-3 font-medium">{p.student_name || p.student_id}</td>
                <td className="p-3">{money(p.total_paid_now)}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <button className="px-2 py-1 border rounded-lg inline-flex items-center gap-1" onClick={()=>openPayments(p.student_id, p.student_name || p.student_id)}>
                      View Payments <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!payLoading && payAggFiltered.length===0 && <EmptyRow cols={4} text="No payments found for this selection." />}
          </Table>
        </Section>
      )}

      {/* Balances */}
      {tab==="balances" && (
        <Section title={`Balances — ${clsName}, ${termName} ${yearName}`} right={
          <>
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={()=>setBalancesFilter("all")}
                className={`px-2 py-1 rounded-lg border ${balancesFilter==="all" ? "bg-gray-900 text-white border-gray-900" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}
                title="Show all"
              >All</button>
              <button
                onClick={()=>setBalancesFilter("owing")}
                className={`px-2 py-1 rounded-lg border ${balancesFilter==="owing" ? "bg-gray-900 text-white border-gray-900" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}
                title="Show owing only"
              >Owing</button>
              <button
                onClick={()=>setBalancesFilter("paid")}
                className={`px-2 py-1 rounded-lg border ${balancesFilter==="paid" ? "bg-gray-900 text-white border-gray-900" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}
                title="Show fully paid only"
              >Paid</button>
            </div>
            <button className="inline-flex items-center gap-2 px-3 py-2 border rounded-xl" onClick={()=>{loadInvoices();loadClassSummary();}}>
              <Download className="w-4 h-4" /> Refresh
            </button>
            <button className="inline-flex items-center gap-2 px-3 py-2 border rounded-xl" onClick={()=>csv(balancesRows, `balances_${balancesFilter}_${clsName}_${termName}_${yearName}.csv`)}>
              <FileDown className="w-4 h-4" /> Export
            </button>
          </>
        }>
          <div className="flex items-center gap-2 mb-3">
            <Chip color="indigo">Billed: {money(summary.total_billed)}</Chip>
            <Chip color="green">Paid: {money(summary.total_paid)}</Chip>
            <Chip color="amber">Balance: {money(summary.balance)}</Chip>
          </div>
          <Table cols={["Student","Billed","Paid","Balance","Status",""]}>
            {balancesRows.map(b => {
              const email = studentEmail(b.student_id);
              const phone = studentPhone(b.student_id);
              const canRemind = b.balance > 0 && (!!email || !!phone);
              return (
                <tr key={b.student_id} className="border-b last:border-0 dark:border-gray-700">
                  <td className="p-3 font-medium">
                    <div className="flex flex-col">
                      <span>{b.student_name}</span>
                      <span className="text-xs text-gray-500">
                        {(email && phone)
                          ? `${email} • ${phone}`
                          : (email || phone || <span className="text-amber-600">No contact</span>)}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">{money(b.amount)}</td>
                  <td className="p-3">{money(b.paid_total)}</td>
                  <td className="p-3">{money(b.balance)}</td>
                  <td className="p-3"><StatusPill status={b.status} /></td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button className="px-2 py-1 border rounded-lg inline-flex items-center gap-1" onClick={()=>openPay(b.student_id, b.student_name)}>
                        View / Pay <Wallet className="w-4 h-4" />
                      </button>
                      <button
                        className={`px-2 py-1 border rounded-lg inline-flex items-center gap-1 ${canRemind ? "" : "opacity-60 cursor-not-allowed"}`}
                        disabled={!canRemind}
                        onClick={()=>sendReminder(b.student_id, b.student_name)}
                        title={b.balance<=0 ? "Student is fully paid" : (!!email || !!phone ? "Send a reminder" : "No contact available")}
                      >
                        <Send className="w-4 h-4" /> Send Reminder
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {balancesRows.length===0 && <EmptyRow cols={6} text="No students match this filter." />}
          </Table>
        </Section>
      )}

      {toast && <div className="mt-4"><Toast type={toast.type} text={toast.text} /></div>}

      {/* Category Modal */}
      {openCat && (
        <Modal onClose={()=>{setOpenCat(false);setEditCat(null);}} title={editCat ? "Edit Category" : "New Category"} icon={<Building2 className="h-5 w-5" />}>
          <CategoryForm initial={editCat || { name:"", description:"" }} onCancel={()=>{setOpenCat(false);setEditCat(null);}} onSave={saveCategory} />
        </Modal>
      )}

      {/* Structure Modal */}
      {openStr && (
        <Modal onClose={()=>{setOpenStr(false);setEditStr(null);}} title={editStr?.structure_id ? "Edit Structure Line" : "Add / Update Structure Line"} icon={<CalendarDays className="h-5 w-5" />}>
          <StructureForm
            categories={categories}
            needCategoriesHint={categories.length===0}
            initial={editStr ? { category_id: String(editStr.category_id), amount: editStr.amount } : { category_id:"", amount:"" }}
            onCancel={()=>{setOpenStr(false);setEditStr(null);}}
            onSave={saveStructure}
          />
        </Modal>
      )}

      {/* Student View/Pay Modal */}
      {openStudentPay && studentForPay && (
        <Modal onClose={()=>setOpenStudentPay(false)} title={`View / Pay — ${studentForPay.full_name}`} icon={<Wallet className="h-5 w-5" />}>
          <StudentPayModal
            cur={CUR}
            schoolId={schoolId}
            student={studentForPay}
            invoices={invoices.filter(i => Number(i.student_id)===Number(studentForPay.student_id))}
            form={payAnyForm}
            setForm={setPayAnyForm}
            onCancel={()=>setOpenStudentPay(false)}
            onSave={()=>savePaymentForStudent()}
            isBasic={IS_BASIC}
            emailSender={(sid, name)=>emailConsolidated(sid, name)}
          />
        </Modal>
      )}

      {/* Student Payments Modal */}
      {openStudentPayments && studentForPayments && (
        <Modal onClose={()=>setOpenStudentPayments(false)} title={`Payments — ${studentForPayments.full_name}`} icon={<Wallet className="h-5 w-5" />}>
          <StudentPaymentsModal
            cur={CUR}
            schoolName={SCHOOL_NAME}
            classNameLabel={clsName}
            termName={termName}
            yearName={yearName}
            student={studentForPayments}
            payments={payments.filter(p => Number(p.student_id) === Number(studentForPayments.student_id))}
            onClose={()=>setOpenStudentPayments(false)}
          />
        </Modal>
      )}
    </DashboardLayout>
  );
}

/* ------------ small shared UI ------------ */
function KpiCard({ icon, title, value }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-900 border dark:border-gray-700">{icon}</div>
        <div>
          <div className="text-xs text-gray-500">{title}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
}
function TabBtn({ active, onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${active ? "bg-gray-900 text-white border-gray-900" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}
    >
      {icon}{children}
    </button>
  );
}
function LabeledSelect({ icon, label, value, onChange, children }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">{icon}{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-800">
        {children}
      </select>
    </label>
  );
}
function Input({ label, value, onChange, type = "text", compact = false, placeholder, ...rest }) {
  return (
    <label className="text-sm grid gap-1">
      {label && <span className="text-gray-700 dark:text-gray-300">{label}</span>}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`border rounded-xl ${compact ? "px-2 py-1.5" : "px-3 py-2"} bg-white dark:bg-gray-800`}
        {...rest}
      />
    </label>
  );
}
function Modal({ title, icon, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-3">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">{icon}<h4 className="font-semibold">{title}</h4></div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
function Section({ title, right, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex items-center gap-2">{right}</div>
      </div>
      {children}
    </div>
  );
}
function CardTable({ title, cols, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b dark:border-gray-700 font-medium">{title}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
              {cols.map((c,i)=><th key={i} className="p-3">{c}</th>)}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
function Table({ cols, children }) {
  return (
    <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
            {cols.map((c,i)=><th key={i} className="p-3">{c}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="relative">
      <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
      <input className="pl-8 pr-3 py-2 border rounded-xl bg-white dark:bg-gray-800" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}
function EmptyRow({ cols, text }) {
  return <tr><td className="p-6 text-center text-gray-500" colSpan={cols}>{text}</td></tr>;
}

/* ------------ forms ------------ */
function CategoryForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);

  return (
    <div className="grid gap-3">
      <Input label="Name" value={form.name} onChange={v => setForm(s => ({ ...s, name: v }))} />
      <Input label="Description" value={form.description} onChange={v => setForm(s => ({ ...s, description: v }))} placeholder="Optional" />
      <div className="flex justify-end gap-2 mt-2">
        <button className="px-3 py-2 border rounded-xl inline-flex items-center gap-2" onClick={onCancel}>
          <X className="h-4 w-4" /> Cancel
        </button>
        <button className="px-3 py-2 bg-indigo-600 text-white rounded-xl inline-flex items-center gap-2" onClick={() => onSave(form)}>
          <Save className="h-4 w-4" /> Save
        </button>
      </div>
    </div>
  );
}

function StructureForm({ initial, onCancel, onSave, categories, needCategoriesHint }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);

  return (
    <div className="grid gap-3">
      <label className="text-sm grid gap-1">
        <span className="text-gray-700 dark:text-gray-300">Category</span>
        <select value={form.category_id} onChange={(e) => setForm(s => ({ ...s, category_id: e.target.value }))} className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-800">
          <option value="">Select category</option>
          {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
        </select>
      </label>
      <Input label="Amount" type="number" inputMode="decimal" min="0" value={form.amount} onChange={(v) => {
        const cleaned = String(v).replace(/[^0-9.]/g, "");
        setForm(s => ({ ...s, amount: cleaned }));
      }} />
      {needCategoriesHint && <div className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">Tip: You have no categories. Add some in the Categories tab.</div>}
      <div className="flex justify-end gap-2 mt-2">
        <button className="px-3 py-2 border rounded-xl inline-flex items-center gap-2" onClick={onCancel}>
          <X className="h-4 w-4" /> Cancel
        </button>
        <button className="px-3 py-2 bg-indigo-600 text-white rounded-xl inline-flex items-center gap-2" onClick={() => onSave({ ...form, amount: Number(form.amount||0) })}>
          <Save className="h-4 w-4" /> Save
        </button>
      </div>
    </div>
  );
}

/* ------------ student modals ------------ */
function StudentPayModal({ cur, schoolId, student, invoices, form, setForm, onCancel, onSave, isBasic, emailSender }) {
  const totalBilled = invoices.reduce((s,r)=>s+Number(r.amount||0),0);
  const totalPaid   = invoices.reduce((s,r)=>s+Number(r.paid_total||0),0);
  const outstanding = invoices.reduce((s,r)=> s + Number(((r.balance ?? (r.amount - r.paid_total)) ?? 0)), 0);

  const hasBalance = outstanding > 0;

  const canSave = (() => {
    const n = Number(form.amount_paid);
    if (!isFinite(n)) return false;
    if (n <= 0) return false;
    if (n > outstanding) return false; // block overpay
    return true;
  })();

  const handleAmountChange = (val) => {
    const cleaned = String(val).replace(/[^0-9.]/g, "");
    let n = cleaned === "" ? "" : Number(cleaned);
    if (n !== "" && !Number.isFinite(n)) n = "";
    if (typeof n === "number" && n > outstanding) n = outstanding;
    setForm(s => ({ ...s, amount_paid: n }));
  };

  // Auto-fetch receipt number when modal opens (only if there is balance and we don't already have one)
  useEffect(() => {
    let ok = true;
    (async () => {
      if (hasBalance && !form.receipt_no) {
        try {
          const rcpt = await getReceiptNo(schoolId);
          if (ok && rcpt) setForm(s => ({ ...s, receipt_no: rcpt }));
        } catch {}
      }
    })();
    return () => { ok = false; };
  }, [hasBalance, form.receipt_no, schoolId, setForm]);

  return (
    <div className="grid gap-3">
      {/* Summary */}
      <div className="rounded-xl border dark:border-gray-700">
        <div className="p-3 border-b dark:border-gray-700 font-medium">
          {student.full_name} <span className="text-gray-500">({student.student_id})</span>
        </div>
        <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
            <div className="text-gray-500">Total Billed</div>
            <div className="font-semibold">{cur} {Number(totalBilled).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
            <div className="text-gray-500">Total Paid</div>
            <div className="font-semibold">{cur} {Number(totalPaid).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
            <div className="text-gray-500">Outstanding</div>
            <div className="font-semibold">{cur} {Number(outstanding).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          </div>
        </div>
      </div>

      {/* Invoices list */}
      <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
              <th className="p-3">Category</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Paid</th>
              <th className="p-3">Balance</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.invoice_id} className="border-b last:border-0 dark:border-gray-700">
                <td className="p-3">{inv.category_name || inv.category_id}</td>
                <td className="p-3">{cur} {Number(inv.amount||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                <td className="p-3">{cur} {Number(inv.paid_total||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                <td className="p-3">{cur} {Number(((inv.balance ?? (inv.amount - inv.paid_total)) ?? 0)).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td className="p-6 text-center text-gray-500" colSpan={5}>No invoices for this student in the current selection.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Payment form */}
      {!hasBalance ? (
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2">
          <CheckCircle className="w-4 h-4" />
          <span>This student is fully paid. No payment needed.</span>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Amount to Pay"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.amount_paid}
              onChange={handleAmountChange}
              placeholder={`Up to ${cur} ${Number(outstanding).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`}
            />
            <label className="text-sm grid gap-1">
              <span className="text-gray-700 dark:text-gray-300">Method</span>
              <select
                className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-800"
                value={form.method}
                onChange={e => setForm(s => ({ ...s, method: e.target.value }))}
              >
                <option value="MoMo">MoMo</option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
                <option value="POS">POS</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            {!isBasic && hasBalance && (
              <button
                className="px-3 py-2 border rounded-xl inline-flex items-center gap-2"
                onClick={() => emailSender(student.student_id, student.full_name)}
              >
                <Send className="w-4 h-4" /> Send Invoice
              </button>
            )}
            <button className="px-3 py-2 border rounded-xl inline-flex items-center gap-2" onClick={onCancel}>
              <X className="h-4 w-4" /> Close
            </button>
            <button
              className={`px-3 py-2 bg-indigo-600 text-white rounded-xl inline-flex items-center gap-2 ${canSave ? "" : "opacity-60 cursor-not-allowed"}`}
              disabled={!canSave}
              onClick={onSave}
              title="Record payment"
            >
              <Save className="h-4 w-4" /> Save Payment
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* Payments list modal (group by receipt no + method, sum amounts, print) */
function StudentPaymentsModal({ cur, schoolName, classNameLabel, termName, yearName, student, payments, onClose }) {
  // group by receipt_no+method
  const groupsMap = new Map();
  for (const p of payments) {
    const rcpt = (p.receipt_no || "-").toString();
    const m = (p.method || "-").toString();
    const key = `${rcpt}||${m}`;
    if (!groupsMap.has(key)) groupsMap.set(key, { receipt_no: rcpt, method: m, amount: 0, dates: [] });
    const g = groupsMap.get(key);
    g.amount += Number(p.amount_paid || 0);
    if (p.payment_date) g.dates.push(p.payment_date);
  }
  const groups = [...groupsMap.values()].map(g => ({ ...g, date: g.dates.sort().slice(-1)[0] || "" }))
        .sort((a,b) => (b.date||"").localeCompare(a.date||"") || (a.receipt_no||"").localeCompare(b.receipt_no||""));

  const total = groups.reduce((s,g)=>s+g.amount,0);

  const printGroups = () => {
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;

    const rows = payments.length
      ? groups.map(g => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${g.date || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${g.receipt_no}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${g.method}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${cur} ${Number(g.amount).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="4" style="padding:16px;text-align:center;color:#888">No payments recorded yet.</td></tr>`;

    const html = `
      <html><head><title>Payments — ${student.full_name}</title></head>
      <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px">
        <h2 style="margin:0 0 6px 0">${schoolName}</h2>
        <div style="color:#555;margin-bottom:12px">${classNameLabel} • ${termName} ${yearName}</div>
        <div style="font-weight:600;margin-bottom:8px">Payments — ${student.full_name} (${student.student_id})</div>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <thead>
            <tr style="text-align:left;color:#555;border-bottom:1px solid #ddd">
              <th style="padding:8px">Date</th>
              <th style="padding:8px">Receipt No.</th>
              <th style="padding:8px">Method</th>
              <th style="padding:8px;text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:8px;text-align:right;border-top:1px solid #ddd"><strong>Total</strong></td>
              <td style="padding:8px;text-align:right;border-top:1px solid #ddd"><strong>${cur} ${Number(total).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></td>
            </tr>
          </tfoot>
        </table>
        <script>window.onload=()=>window.print();</script>
      </body></html>
    `;
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="grid gap-3">
      <div className="text-sm text-gray-600 dark:text-gray-300">
        {schoolName} • {classNameLabel} • {termName} {yearName}
      </div>

      <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
              <th className="p-3">Date</th>
              <th className="p-3">Receipt No.</th>
              <th className="p-3">Method</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <tr key={`${g.receipt_no}||${g.method}`} className="border-b last:border-0 dark:border-gray-700">
                <td className="p-3">{g.date || "-"}</td>
                <td className="p-3 font-medium">{g.receipt_no}</td>
                <td className="p-3">{g.method}</td>
                <td className="p-3 text-right">
                  {cur} {Number(g.amount||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td className="p-6 text-center text-gray-500" colSpan={4}>
                  No payments recorded yet.
                </td>
              </tr>
            )}
          </tbody>
          {groups.length>0 && (
            <tfoot>
              <tr className="border-t dark:border-gray-700 font-semibold">
                <td className="p-3" colSpan={3}>Total</td>
                <td className="p-3 text-right">
                  {cur} {Number(total).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex justify-end gap-2">
        <button className="px-3 py-2 border rounded-xl inline-flex items-center gap-2" onClick={printGroups}>
          <Printer className="h-4 w-4" /> Print
        </button>
        <button className="px-3 py-2 border rounded-xl inline-flex items-center gap-2" onClick={onClose}>
          <X className="h-4 w-4" /> Close
        </button>
      </div>
    </div>
  );
}

