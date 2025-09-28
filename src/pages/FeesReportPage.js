// src/pages/FeesReportPage.js
import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { useAuth } from "../AuthContext";
import {
  Building2, CalendarDays, Inbox, Download, Search,
  DollarSign, CheckCircle, XCircle, AlertCircle, Loader2, FileDown
} from "lucide-react";

/* ------------ ORDS (same host & endpoints style as ManageFeesPage) ------------ */
const HOST = "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";
const ACADEMIC_CLASSES_API     = `${HOST}/academic/get/classes/`;
const ACADEMIC_YEAR_API        = `${HOST}/academic/get/academic_year/`;
const ACADEMIC_TERM_API        = `${HOST}/academic/get/term/`;
const FEES_INVOICES_API        = `${HOST}/fees/invoice/`;

/* ------------ utils (same spirit as ManageFeesPage) ------------ */
const jtxt = async (u) => {
  const r = await fetch(u, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.text()).trim();
};
const jarr = async (u) => {
  const t = await jtxt(u); if (!t) return [];
  try { const d = JSON.parse(t); return Array.isArray(d) ? d : (Array.isArray(d.items) ? d.items : []); } catch { return []; }
};

const currency = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Aggregate invoices per student (same logic family as ManageFeesPage.aggInvoices) */
const aggInvoices = (rows = []) => {
  const m = new Map();
  for (const r of rows) {
    const id = String(r.student_id ?? r.STUDENT_ID ?? "");
    if (!id) continue;
    if (!m.has(id)) m.set(id, {
      student_id: r.student_id ?? r.STUDENT_ID,
      student_name: r.student_name ?? r.STUDENT_NAME ?? id,
      amount: 0, paid_total: 0, balance: 0,
    });
    const a = m.get(id);
    const amt = Number(r.amount ?? r.AMOUNT ?? 0);
    const paid = Number(r.paid_total ?? r.AMOUNT_PAID ?? r.PAID_TOTAL ?? 0);
    const bal  = Number((r.balance ?? r.BALANCE) ?? (amt - paid));
    a.amount += amt; a.paid_total += paid; a.balance += bal;
  }
  return [...m.values()].map(v => ({
    ...v,
    status: v.amount<=0 ? "UNPAID" : (v.balance<=0 ? "PAID" : (v.paid_total>0 ? "PARTIAL" : "UNPAID"))
  }));
};

/* ------------ shared UI bits (mirrors ManageFeesPage Overview) ------------ */
const Chip = ({ children, color = "gray" }) => {
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
  if (s==="PARTIAL"||s==="PARTLY_PAID") return <Chip color="amber"><AlertCircle className="w-3 h-3" /> PARTLY PAID</Chip>;
  if (s==="UNPAID") return <Chip color="red"><XCircle className="w-3 h-3" /> UNPAID</Chip>;
  return <Chip>{s||"N/A"}</Chip>;
};
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
function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="relative">
      <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
      <input className="pl-8 pr-3 py-2 border rounded-xl bg-white dark:bg-gray-800" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />
    </label>
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
function EmptyRow({ cols, text }) {
  return <tr><td className="p-6 text-center text-gray-500" colSpan={cols}>{text}</td></tr>;
}

/* ------------ Page ------------ */
export default function FeesReportPage() {
  const { user } = useAuth() || {};
  const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? 1;
  const CUR = user?.school?.currency ?? user?.currency ?? "GHS";

  const [terms, setTerms] = useState([]);     const [termId, setTermId] = useState(null);
  const [years, setYears] = useState([]);     const [yearId, setYearId] = useState(null);
  const [classes, setClasses] = useState([]); const [classId, setClassId] = useState(null);
  const [classesLoading, setClassesLoading] = useState(false); const [classErr, setClassErr] = useState("");

  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const [invoices, setInvoices] = useState([]); const [searchQ, setSearchQ] = useState("");

  // Load classes (same API as ManageFeesPage)
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
      } catch (e) { setClassErr(e?.message || "Failed to load classes."); }
      setClassesLoading(false);
    })();
  }, [schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load academic years (same API)
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

  // Load terms (same API)
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

  // Load invoices for current selection (same endpoint/params style)
  const loadInvoices = async () => {
    if (!schoolId || !classId || !termId || !yearId) return;
    setLoading(true); setError("");
    try {
      const url = `${FEES_INVOICES_API}?p_school_id=${schoolId}&p_class_id=${classId}&p_term=${termId}&p_academic_year=${yearId}`;
      const rows = await jarr(url);
      const mapped = rows.map(r => ({
        invoice_id:r.invoice_id ?? r.INVOICE_ID, student_id:r.student_id ?? r.STUDENT_ID, student_name:r.student_name ?? r.STUDENT_NAME,
        category_id:r.category_id ?? r.CATEGORY_ID, category_name:r.category_name ?? r.CATEGORY_NAME,
        amount:Number(r.amount ?? r.AMOUNT ?? 0),
        paid_total:Number(r.paid_total ?? r.AMOUNT_PAID ?? r.PAID_TOTAL ?? 0),
        balance:Number((r.balance ?? r.BALANCE) ?? 0),
      }));
      setInvoices(mapped);
    } catch (e) {
      setError(e?.message || "Failed to load invoices.");
      setInvoices([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadInvoices(); /* eslint-disable-next-line */ }, [schoolId, classId, termId, yearId]);

  // Derived data (same overview style)
  const invAggAll = useMemo(() => {
    const agg = aggInvoices(invoices);
    const q = (searchQ||"").toLowerCase();
    return agg.filter(a => !q || String(a.student_id).includes(q) || (a.student_name||"").toLowerCase().includes(q))
              .sort((a,b)=>(a.student_name||"").localeCompare(b.student_name||""));
  }, [invoices, searchQ]);

  const debtorsAgg = useMemo(() => invAggAll.filter(a => Number(a.balance) > 0), [invAggAll]);

  const totals = useMemo(() => {
    const total_billed = invAggAll.reduce((s, r) => s + Number(r.amount||0), 0);
    const total_paid   = invAggAll.reduce((s, r) => s + Number(r.paid_total||0), 0);
    const balance      = invAggAll.reduce((s, r) => s + Number(r.balance||0), 0);
    return { total_billed, total_paid, balance };
  }, [invAggAll]);

  const termName = useMemo(() => terms.find(t => Number(t.id)===Number(termId))?.name || "", [terms, termId]);
  const yearName = useMemo(() => years.find(y => Number(y.id)===Number(yearId))?.name || "", [years, yearId]);
  const classNameLabel = useMemo(() => classes.find(c => Number(c.class_id)===Number(classId))?.class_name || `Class ${classId||""}`, [classes, classId]);

  const moneyFmt = (n) => `${CUR} ${currency(n)}`;

  // CSV Export (same simple CSV util approach)
  const exportAll = () => {
    const rows = invAggAll.map(r => ({
      student_id: r.student_id,
      student_name: r.student_name,
      amount: r.amount,
      paid_total: r.paid_total,
      balance: r.balance,
      status: r.status
    }));
    csv(rows, `fees_all_students_${classNameLabel}_${termName}_${yearName}.csv`);
  };
  const exportDebtors = () => {
    const rows = debtorsAgg.map(r => ({
      student_id: r.student_id,
      student_name: r.student_name,
      amount: r.amount,
      paid_total: r.paid_total,
      balance: r.balance,
      status: r.status
    }));
    csv(rows, `fees_debtors_${classNameLabel}_${termName}_${yearName}.csv`);
  };
  const csv = (rows, name="export.csv") => {
    if (!rows?.length) return;
    const heads = Object.keys(rows[0]);
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const out = [heads.join(","), ...rows.map(r => heads.map(h => esc(r[h])).join(","))].join("\n");
    const blob = new Blob([out], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  return (
    <DashboardLayout title="Fees — Overview" subtitle="">
      {/* Filters (sticky, same look) */}
      <div className="sticky top-0 z-10 pb-3 bg-gradient-to-b from-white/70 to-transparent dark:from-gray-900/60 backdrop-blur-md mb-2">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 border border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <LabeledSelect icon={<Building2 className="w-4 h-4" />} label="Class" value={classId ?? ""} onChange={(v)=>setClassId(Number(v))}>
              {classesLoading && <option>Loading…</option>}
              {!classesLoading && classes.length===0 && <option value="">No classes</option>}
              {!classesLoading && classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
            </LabeledSelect>
            <LabeledSelect icon={<CalendarDays className="w-4 h-4" />} label="Term" value={termId ?? ""} onChange={(v)=>setTermId(Number(v))}>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </LabeledSelect>
            <LabeledSelect icon={<Inbox className="w-4 h-4" />} label="Academic Year" value={yearId ?? ""} onChange={(v)=>setYearId(Number(v))}>
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </LabeledSelect>
            <label className="text-sm grid gap-1">
              <span className="text-gray-700 dark:text-gray-300">Search</span>
              <SearchBox value={searchQ} onChange={setSearchQ} placeholder="Search by student" />
            </label>
            <div className="flex items-end gap-2">
              <button onClick={loadInvoices} className="w-full inline-flex items-center justify-center gap-2 border rounded-xl px-3 py-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Refresh
              </button>
            </div>
          </div>
          {classErr && <div className="mt-2 text-sm text-rose-600">{classErr}</div>}
          {error && !loading && <div className="mt-2 text-sm text-rose-600">{error}</div>}
        </div>
      </div>

      {/* KPIs (same cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={<DollarSign className="w-5 h-5" />} title="Total Billed" value={moneyFmt(totals.total_billed)} />
        <KpiCard icon={<CheckCircle className="w-5 h-5" />} title="Total Paid" value={moneyFmt(totals.total_paid)} />
        <KpiCard icon={<XCircle className="w-5 h-5" />} title="Outstanding" value={moneyFmt(totals.balance)} />
        <KpiCard icon={<AlertCircle className="w-5 h-5" />} title="Unpaid / All" value={`${debtorsAgg.length}/${invAggAll.length}`} />
      </div>

      {/* Tables (same layout as Manage Fees Overview) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <CardTable title={`All students — ${classNameLabel}, ${termName} ${yearName}`} cols={["Student","Total Amount","Total Paid","Balance","Status"]}>
          {invAggAll.map(r => (
            <tr key={r.student_id} className="border-b last:border-0 dark:border-gray-700">
              <td className="p-3 font-medium">{r.student_name || r.student_id}</td>
              <td className="p-3">{moneyFmt(r.amount)}</td>
              <td className="p-3">{moneyFmt(r.paid_total)}</td>
              <td className="p-3">{moneyFmt(r.balance)}</td>
              <td className="p-3"><StatusPill status={r.status} /></td>
            </tr>
          ))}
          {!loading && invAggAll.length===0 && <EmptyRow cols={5} text="No invoices yet for this selection." />}
        </CardTable>

        <CardTable title={`Students owing — ${classNameLabel}, ${termName} ${yearName}`} cols={["Student","Billed","Paid","Balance","Status"]}>
          {debtorsAgg.map(r => (
            <tr key={r.student_id} className="border-b last:border-0 dark:border-gray-700">
              <td className="p-3 font-medium">{r.student_name}</td>
              <td className="p-3">{moneyFmt(r.amount)}</td>
              <td className="p-3">{moneyFmt(r.paid_total)}</td>
              <td className="p-3">{moneyFmt(r.balance)}</td>
              <td className="p-3"><StatusPill status={r.status} /></td>
            </tr>
          ))}
          {debtorsAgg.length===0 && <EmptyRow cols={5} text="Everyone is fully paid 🎉" />}
        </CardTable>
      </div>

      {/* Exports */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <button className="inline-flex items-center gap-2 px-3 py-2 border rounded-xl" onClick={exportAll}>
          <FileDown className="w-4 h-4" /> Export All
        </button>
        <button className="inline-flex items-center gap-2 px-3 py-2 border rounded-xl" onClick={exportDebtors}>
          <FileDown className="w-4 h-4" /> Export Debtors
        </button>
      </div>
    </DashboardLayout>
  );
}
