// src/pages/PrintBillPage.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import {
  Printer, Search, Copy, Send, CheckCircle2, Loader2, X, Mail, MessageSquare,
  Building2, CalendarDays, Inbox, Download, Lock
} from "lucide-react";
import { useAuth } from "../AuthContext";

/* ------------ ORDS (same host & endpoints used in ManageFeesPage) ------------ */
const HOST = "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";
const ACADEMIC_CLASSES_API = `${HOST}/academic/get/classes/`;
const ACADEMIC_YEAR_API    = `${HOST}/academic/get/academic_year/`;
const ACADEMIC_TERM_API    = `${HOST}/academic/get/term/`;
const ACADEMIC_FEECAT_LIST_API = `${HOST}/academic/list/fee_category/`;
const FEES_INVOICES_API    = `${HOST}/fees/invoice/`;   // ?p_school_id=&p_class_id=&p_term=&p_academic_year=
const FEES_PAYMENTS_API    = `${HOST}/fees/payment/`;   // ?p_invoice_id=
const ACADEMIC_SCHOOL_API  = `${HOST}/academic/get/school/`; // includes logo_url, signature_url

/* ------------ helpers (same style as ManageFeesPage) ------------ */
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
const bust = (url) => {
  if (!url) return "";
  try { const u = new URL(url, window.location.origin); u.searchParams.set("_", Date.now()); return u.toString(); }
  catch { return `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`; }
};

// --- email helper (same shape as ManageFeesPage) ---
const sendEmailApi = async ({ to, subject, message, fromName }) => {
  const r = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: Array.isArray(to) ? to : [to], subject, message, fromName }),
  });
  const j = await r.json().catch(()=>({}));
  if (!r.ok || j?.success === false) {
    throw new Error(j?.error || `Email send failed (${r.status})`);
  }
  return j; // { success: true, sent, dev? }
};

/* ------------ page ------------ */
export default function PrintBillPage() {
  const { user } = useAuth() || {};
  const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? 1;
  const pkg = Number(user?.school?.package ?? user?.package ?? user?.plan ?? 2);
  const IS_BASIC = pkg === 1;
  const CUR = user?.school?.currency ?? user?.currency ?? "GHS";
  const SCHOOL_NAME = user?.school?.name ?? user?.school_name ?? "Your School";
  const SCHOOL_PHONE = user?.school?.phone ?? "";
  const SCHOOL_EMAIL = user?.school?.email ?? "";

  // Branding (fetched live)
  const [branding, setBranding] = useState({ logoUrl: "", signatureUrl: "" });

  // Filters/options
  const [terms, setTerms] = useState([]);     const [termId, setTermId] = useState(null);
  const [years, setYears] = useState([]);     const [yearId, setYearId] = useState(null);
  const [classes, setClasses] = useState([]); const [classId, setClassId] = useState(null);
  const [classesLoading, setClassesLoading] = useState(false);

  // Fee catalogue (for descriptions)
  const [feeCats, setFeeCats] = useState([]); // raw rows
  const feeCatById = useMemo(() => {
    const m = new Map();
    for (const r of feeCats) {
      const id = r.category_id ?? r.CATEGORY_ID ?? r.id ?? r.ID;
      const name = r.category_name ?? r.CATEGORY_NAME ?? r.name ?? r.NAME;
      const description = r.description ?? r.DESCRIPTION ?? "";
      if (id != null) m.set(Number(id), { id: Number(id), name, description });
    }
    return m;
  }, [feeCats]);

  // Students derived from invoices for current selection
  const [invoices, setInvoices] = useState([]);
  const [invLoading, setInvLoading] = useState(false); const [invErr, setInvErr] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // Bill details (for selected student)
  const [items, setItems] = useState([]);
  const [paidToDate, setPaidToDate] = useState(0);
  const [loadingBill, setLoadingBill] = useState(false);
  const [notes, setNotes] = useState("Please settle all fees by the end of week 3.");
  // Visible toggle for all plans; disabled on BASIC (so they see it exists)
  const [includeMoMoBlock, setIncludeMoMoBlock] = useState(!IS_BASIC); 

  // Reminder modal
  const [openReminder, setOpenReminder] = useState(false);

  const previewRef = useRef(null);

  // sending states
  const [sendingBill, setSendingBill] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  /* ---- load school branding ---- */
  useEffect(() => {
    (async () => {
      try {
        const rows = await jarr(ACADEMIC_SCHOOL_API);
        const rec = rows.find(r => String(r.school_id ?? r.SCHOOL_ID) === String(schoolId));
        setBranding({
          logoUrl: rec?.logo_url ?? rec?.LOGO_URL ?? "",
          signatureUrl: rec?.signature_url ?? rec?.SIGNATURE_URL ?? "",
        });
      } catch { setBranding({ logoUrl: "", signatureUrl: "" }); }
    })();
  }, [schoolId]);

  /* ---- load options ---- */
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      setClassesLoading(true);
      try {
        const rows = await jarr(`${ACADEMIC_CLASSES_API}?p_school_id=${encodeURIComponent(schoolId)}`);
        const norm = rows.map(r => ({
          class_id: r.class_id ?? r.CLASS_ID ?? r.id ?? r.ID,
          class_name: r.class_name ?? r.CLASS_NAME ?? r.name ?? r.NAME
        })).filter(x => x.class_id!=null);
        setClasses(norm);
        if (!classId && norm.length) setClassId(Number(norm[0].class_id));
      } catch { setClasses([]); }
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

  // Load fee categories (for descriptions)
  useEffect(() => { if (!schoolId) return; (async () => {
    try {
      const rows = await jarr(`${ACADEMIC_FEECAT_LIST_API}?p_school_id=${encodeURIComponent(schoolId)}`);
      setFeeCats(rows || []);
    } catch { setFeeCats([]); }
  })(); }, [schoolId]);

  /* ---- load invoices ---- */
  const loadInvoices = async () => {
    if (!schoolId || !classId || !termId || !yearId) return;
    setInvLoading(true); setInvErr("");
    try {
      const url = `${FEES_INVOICES_API}?p_school_id=${schoolId}&p_class_id=${classId}&p_term=${termId}&p_academic_year=${yearId}`;
      const rows = await jarr(url);
      const mapped = rows.map(r => ({
        invoice_id:   r.invoice_id ?? r.INVOICE_ID,
        student_id:   r.student_id ?? r.STUDENT_ID,
        index_no:     r.index_no ?? r.student_index ?? r.INDEX_NO ?? r.STUDENT_INDEX ?? "",
        student_name: r.student_name ?? r.STUDENT_NAME,
        class_id:     r.class_id ?? r.CLASS_ID,
        class_name:   r.class_name ?? r.CLASS_NAME,
        category_id:  r.category_id ?? r.CATEGORY_ID,
        category_name:r.category_name ?? r.CATEGORY_NAME,
        contact_email: r.contact_email ?? r.CONTACT_EMAIL ?? "",
        contact_phone: r.contact_phone ?? r.CONTACT_PHONE ?? "",
        amount:       Number(r.amount ?? r.AMOUNT ?? 0),
      }));
      setInvoices(mapped);
      if (mapped.length && !selectedStudentId) {
        const first = mapped[0].student_id;
        setSelectedStudentId(String(first));
      }
    } catch (e) {
      setInvErr(e?.message || "Failed to load invoices.");
      setInvoices([]);
    }
    setInvLoading(false);
  };
  useEffect(() => { loadInvoices(); /* eslint-disable-next-line */ }, [schoolId, classId, termId, yearId]);

  /* ---- students (derived) ---- */
  const students = useMemo(() => {
    const m = new Map();
    for (const r of invoices) {
      const sid = String(r.student_id || "");
      if (!sid) continue;
      if (!m.has(sid)) m.set(sid, {
        student_id: sid,
        index_no: r.index_no || "",
        full_name: r.student_name || sid,
        class_id: r.class_id,
        class_name: r.class_name || "",
        contact_email: r.contact_email || "",
        contact_phone: r.contact_phone || ""
      });
    }
    return [...m.values()].sort((a,b)=>(a.full_name||"").localeCompare(b.full_name||""));
  }, [invoices]);

  const student = useMemo(
    () => students.find(s => String(s.student_id) === String(selectedStudentId)) || students[0],
    [selectedStudentId, students]
  );

  /* ---- build bill lines & payments for selected student ---- */
  useEffect(() => {
    const buildBill = async () => {
      setItems([]); setPaidToDate(0);
      if (!student) return;
      setLoadingBill(true);
      try {
        const myInvs = invoices.filter(i => String(i.student_id) === String(student.student_id));
        const grouped = new Map();
        for (const inv of myInvs) {
          const key = String(inv.category_id);
          if (!grouped.has(key)) grouped.set(key, { 
            category_id: inv.category_id, 
            category_name: inv.category_name || key, 
            amount: 0, 
            invoice_ids: [] 
          });
          const g = grouped.get(key);
          g.amount += Number(inv.amount || 0);
          g.invoice_ids.push(inv.invoice_id);
        }
        const lines = [...grouped.values()]
          .sort((a,b)=> (a.category_name||"").localeCompare(b.category_name||""))
          .map(row => {
            const fc = feeCatById.get(Number(row.category_id));
            return {
              ...row,
              description: fc?.description || ""
            };
          });
        setItems(lines);

        // Sum payments per invoice
        let paid = 0;
        for (const inv of myInvs) {
          try {
            const pays = await jarr(`${FEES_PAYMENTS_API}?p_invoice_id=${encodeURIComponent(inv.invoice_id)}`);
            paid += pays.reduce((s,p)=> s + Number((p.amount_paid ?? p.AMOUNT_PAID) || 0), 0);
          } catch { /* noop */ }
        }
        setPaidToDate(paid);
      } finally {
        setLoadingBill(false);
      }
    };
    buildBill();
  }, [student, invoices, feeCatById]);

  /* ---- derived ---- */
  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    const discount = 0;
    const billed = subtotal - discount;
    const paid = Number(paidToDate || 0);
    const due = Math.max(0, billed - paid);
    return { subtotal, discount, billed, paid, due };
  }, [items, paidToDate]);

  const classNameLabel = useMemo(() => {
    const c = classes.find(cc => Number(cc.class_id)===Number(classId));
    return c?.class_name || `Class ${classId||""}`;
  }, [classes, classId]);
  const termName = useMemo(() => terms.find(t => Number(t.id)===Number(termId))?.name || "", [terms, termId]);
  const yearName = useMemo(() => years.find(y => Number(y.id)===Number(yearId))?.name || "", [years, yearId]);

  /* ---- actions ---- */
  const money = (n) => `${CUR} ${currency(n)}`;

  const handlePrint = () => window.print();

  const emailBill = async () => {
    const to = (student?.contact_email || "").trim();
    if (!to) return alert("No contact email found for this student.");

    const subject = `School Bill — ${termName} ${yearName}`;
    const body =
`Dear Parent/Guardian,

Please find the bill for ${student?.full_name} (Index No.: ${student?.index_no || "-"}) — ${classNameLabel}.

Billed:       ${money(totals.billed)}
Paid to date: ${money(totals.paid)}
Total Due:    ${money(totals.due)}

Thank you.`;

    try {
      setSendingBill(true);
      const resp = await sendEmailApi({ to, subject, message: body, fromName: SCHOOL_NAME });
      alert(resp?.dev ? `DEV MODE: Email simulated to ${to}` : `Bill sent to ${to}`);
    } catch (e) {
      alert(e?.message || "Failed to send email.");
    } finally {
      setSendingBill(false);
    }
  };

  /* ---- gated button states (show for all plans; disable on BASIC) ---- */
  const hasStudent = !!student?.student_id;
  const hasEmail   = !!(student?.contact_email || "").trim();

  const disabledReason = (feature) => {
    if (!hasStudent) return "Select a student first";
    if (IS_BASIC) return `Upgrade to access ${feature}`;
    return "";
  };

  return (
    <DashboardLayout title="Print Bill" subtitle="">
      {/* Sticky Filters */}
      <div className="sticky top-0 z-10 pb-3 bg-gradient-to-b from-white/70 to-transparent dark:from-gray-900/60 backdrop-blur-md mb-2">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 border border-gray-100 dark:border-gray-700">
          {/* Student picker full-width row */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <div className="col-span-1 md:col-span-2 xl:col-span-6">
              <StudentLov
                label="Student"
                students={students}
                value={selectedStudentId}
                onPick={(id) => setSelectedStudentId(id)}
              />
            </div>

            <LabeledSelect labelEl={<LabelWithIcon icon={<Building2 className="w-4 h-4" />} text="Class" />} value={classId ?? ""} onChange={(v)=>setClassId(Number(v))}>
              {classesLoading && <option>Loading…</option>}
              {!classesLoading && classes.length===0 && <option value="">No classes</option>}
              {!classesLoading && classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
            </LabeledSelect>

            <LabeledSelect labelEl={<LabelWithIcon icon={<CalendarDays className="w-4 h-4" />} text="Term" />} value={termId ?? ""} onChange={(v)=>setTermId(Number(v))}>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </LabeledSelect>

            <LabeledSelect labelEl={<LabelWithIcon icon={<Inbox className="w-4 h-4" />} text="Academic Year" />} value={yearId ?? ""} onChange={(v)=>setYearId(Number(v))}>
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </LabeledSelect>
          </div>

          {/* Second row: Refresh */}
          <div className="mt-3 flex items-center justify-end">
            <button onClick={loadInvoices} className="inline-flex items-center justify-center gap-2 border rounded-xl px-3 py-2">
              {invLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Refresh
            </button>
          </div>

          {invErr && !invLoading && <div className="mt-2 text-sm text-rose-600">{invErr}</div>}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg"
          title="Print the bill"
        >
          <Printer className="h-4 w-4" /> Print Bill
        </button>

        <button
          onClick={IS_BASIC ? undefined : emailBill}
          disabled={!hasStudent || !hasEmail || IS_BASIC || sendingBill}
          title={
            !hasStudent ? "Select a student first"
            : (!hasEmail ? "No contact email on file" : (IS_BASIC ? "Upgrade to access Email Bill" : "Send bill by email"))
          }
          className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg ${(!hasStudent || !hasEmail || IS_BASIC) ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {sendingBill ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          {sendingBill ? "Sending…" : "Email Bill"}
          {IS_BASIC && <Lock className="h-4 w-4 ml-1" />}
        </button>

        <button
          onClick={IS_BASIC ? undefined : ()=>setOpenReminder(true)}
          disabled={!hasStudent || IS_BASIC}
          title={disabledReason("Send Reminder")}
          className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg ${(!hasStudent || IS_BASIC) ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <Send className="h-4 w-4" /> Send Reminder
          {IS_BASIC && <Lock className="h-4 w-4 ml-1" />}
        </button>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiMini label="Billed" value={money(totals.billed)} />
        <KpiMini label="Paid" value={money(totals.paid)} />
        <KpiMini label="Outstanding" value={money(totals.due)} />
        <KpiMini label="Items" value={String(items.length)} />
        <KpiMini label="Status" value={totals.due <= 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Paid
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700">
            Outstanding
          </span>
        )} />
      </div>

      {/* Preview / Print area */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
        <div className="p-4 print:p-0" ref={previewRef}>
          {loadingBill ? (
            <div className="p-8 text-center text-gray-500 inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading bill…
            </div>
          ) : (
            <BillDocument
              term={termName}
              year={yearName}
              classNameLabel={classNameLabel}
              student={student}
              items={items}
              totals={totals}
              notes={notes}
              includeMoMoBlock={includeMoMoBlock && !IS_BASIC}
              cur={CUR}
              schoolName={SCHOOL_NAME}
              schoolPhone={SCHOOL_PHONE}
              schoolEmail={SCHOOL_EMAIL}
              schoolLogoUrl={branding.logoUrl}
              headSignatureUrl={branding.signatureUrl}
            />
          )}
        </div>
      </div>

      {/* Notes editor */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow p-4 border border-gray-100 dark:border-gray-700">
        <label className="text-sm grid gap-1">
          <span className="text-gray-700 dark:text-gray-300">Footer Notes (printed on bill)</span>
          <textarea
            rows={3}
            className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="E.g., Please settle all fees by the end of week 3."
          />
        </label>
      </div>

      {/* Reminder Modal */}
      {openReminder && (
        <ReminderModal
          onClose={()=>setOpenReminder(false)}
          student={student}
          totals={totals}
          termName={termName}
          yearName={yearName}
          classNameLabel={classNameLabel}
          // NEW: email through API
          onSendEmail={async ({ to, subject, message }) => {
            try {
              setSendingReminder(true);
              const resp = await sendEmailApi({ to, subject, message, fromName: SCHOOL_NAME });
              alert(resp?.dev ? `DEV MODE: Reminder simulated to ${to}` : `Reminder sent to ${to}`);
              setOpenReminder(false);
            } catch (e) {
              alert(e?.message || "Failed to send reminder.");
            } finally {
              setSendingReminder(false);
            }
          }}
          sending={sendingReminder}
        />
      )}

      {/* Print styles */}
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

/* ------------ subcomponents ------------ */
function BillDocument({
  term, year, classNameLabel, student, items, totals, notes, includeMoMoBlock, cur,
  schoolName, schoolPhone, schoolEmail, schoolLogoUrl, headSignatureUrl
}) {
  return (
    <div className="print-area max-w-3xl mx-auto my-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b dark:border-gray-700 flex items-start gap-4">
        {schoolLogoUrl ? (
          <img src={bust(schoolLogoUrl)} alt="School Logo" className="h-14 w-14 object-contain" />
        ) : (
          <div className="h-14 w-14 rounded bg-indigo-600" />
        )}
        <div className="flex-1">
          <div className="text-xl font-bold">{schoolName}</div>
          {(schoolPhone || schoolEmail) && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {schoolPhone || ""}{schoolPhone && schoolEmail ? " · " : ""}{schoolEmail || ""}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">School Bill</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {term}, {year}
          </div>
          {classNameLabel ? (
            <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">Class: <span className="font-medium">{classNameLabel}</span></div>
          ) : null}
        </div>
      </div>

      {/* Student Info */}
      <div className="p-6 grid sm:grid-cols-2 gap-3">
        <InfoRow label="Student Name" value={student?.full_name || "-"} />
        <InfoRow label="Index No." value={student?.index_no || "-"} />
        <InfoRow label="Class" value={student?.class_name || classNameLabel || "-"} />
        <InfoRow label="Term / Year" value={`${term} / ${year}`} />
      </div>

      {/* Items */}
      <div className="px-6 pb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
              <th className="py-2">#</th>
              <th className="py-2">Fee Item (Description)</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={`${it.category_id}-${idx}`} className="border-b last:border-0 dark:border-gray-700">
                <td className="py-2">{idx + 1}</td>
                <td className="py-2">
                  <div className="font-medium">{it.category_name}</div>
                  <div className="text-xs text-gray-500 whitespace-pre-line">
                    {it.description?.trim() ? it.description : `${it.category_name} for ${term} ${year}`}
                  </div>
                </td>
                <td className="py-2 text-right">{cur} {currency(it.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-3 text-right font-medium">Subtotal</td>
              <td className="pt-3 text-right">{cur} {currency(totals.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="text-right">Discounts</td>
              <td className="text-right">{cur} {currency(totals.discount)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="pt-1 text-right font-bold">Billed</td>
              <td className="pt-1 text-right font-bold">{cur} {currency(totals.billed)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="text-right">Paid to Date</td>
              <td className="text-right">{cur} {currency(totals.paid)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="pt-1 text-right font-bold">Total Due</td>
              <td className="pt-1 text-right font-bold">{cur} {currency(totals.due)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer notes */}
      {notes && (
        <div className="px-6 pb-6 text-sm text-gray-600 dark:text-gray-300">
          <div className="font-medium mb-1">Notes</div>
          <div>{notes}</div>
        </div>
      )}

      {/* Signature */}
      <div className="px-6 pb-10">
        <div className="flex justify-end">
          <div className="text-center">
            <div className="h-14 flex items-end justify-center">
              {headSignatureUrl ? (
                <img src={bust(headSignatureUrl)} alt="Headteacher Signature" className="h-12 object-contain" />
              ) : null}
            </div>
            <div className="border-t dark:border-gray-600 w-56 mx-auto" />
            <div className="text-sm mt-1">Authorized Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReminderModal({ onClose, student, totals, termName, yearName, classNameLabel, paymentUrl, onSendEmail, sending }) {
  const [channel, setChannel] = useState("Email"); // Email | SMS
  const [email, setEmail] = useState(student?.contact_email || "");
  const [phone, setPhone] = useState(student?.contact_phone || "");
  const [subject, setSubject] = useState(`Fee Reminder — ${termName} ${yearName}`);
  const [message, setMessage] = useState(
`Dear Parent/Guardian,

This is a friendly reminder that fees for ${student?.full_name} (Index No.: ${student?.index_no || "-"}) — ${classNameLabel} are due.
Outstanding: ${totals ? `${totals.due}` : ""}

Thank you.`
  );

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, []);

  const sendEmail = async () => {
    const to = (email || "").trim();
    if (!to) return alert("Enter a valid email address.");
    if (!onSendEmail) return alert("Email sender is not configured.");
    await onSendEmail({ to, subject, message });
  };

  const copySms = () => {
    const smsText =
`Fees reminder for ${student?.full_name} (Index No.: ${student?.index_no || "-" }). Due: ${totals?.due}. Pay: ${paymentUrl}`;
    navigator.clipboard?.writeText(smsText);
    alert("SMS text copied. Paste into your SMS gateway.");
  };

  return (
    // Perfectly centered, blurred, scrollable overlay
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 my-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            <h4 className="font-semibold">Send Reminder</h4>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content area: independent scroll */}
        <div className="p-4 grid gap-4 overflow-y-auto flex-1 min-h-0">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {student?.full_name} (Index No.: {student?.index_no || "-"}) — {classNameLabel}
          </div>

          <div className="flex gap-2">
            <button onClick={()=>setChannel("Email")} className={`px-3 py-1.5 rounded-lg border ${channel==="Email" ? "bg-gray-900 text-white border-gray-900" : ""}`}>
              <Mail className="inline-block w-4 h-4 mr-1" /> Email
            </button>
            <button onClick={()=>setChannel("SMS")} className={`px-3 py-1.5 rounded-lg border ${channel==="SMS" ? "bg-gray-900 text-white border-gray-900" : ""}`}>
              <MessageSquare className="inline-block w-4 h-4 mr-1" /> SMS
            </button>
          </div>

          {channel==="Email" ? (
            <>
              <Input label="To (Email)" value={email} onChange={setEmail} placeholder="parent@example.com" />
              <Input label="Subject" value={subject} onChange={setSubject} />
              {/* Message on its own line */}
              <label className="text-sm grid gap-1">
                <span className="text-gray-700 dark:text-gray-300">Message</span>
                <textarea rows={6} className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900" value={message} onChange={(e)=>setMessage(e.target.value)} />
              </label>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-2 border rounded-lg" onClick={onClose}>Close</button>
                <button
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-60"
                  onClick={sendEmail}
                  disabled={!!sending}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin inline-block" /> : "Send Email"}
                </button>
              </div>
            </>
          ) : (
            <>
              <Input label="To (Phone)" value={phone} onChange={setPhone} placeholder="+233..." />
              <div className="text-sm text-gray-600 dark:text-gray-300">
                We’ve prepared an SMS text with a secure payment link. Click to copy and send via your SMS provider.
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-2 border rounded-lg" onClick={onClose}>Close</button>
                <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg" onClick={copySms}>Copy SMS Text</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <div className="font-medium text-gray-800 dark:text-gray-100">{value}</div>
    </div>
  );
}

/** Slightly enhanced select so we can pass an icon+label node */
function LabeledSelect({ labelEl, label, value, onChange, children }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
        {labelEl ?? label}
      </span>
      <select className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-800" value={value} onChange={(e)=>onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}

function LabelWithIcon({ icon, text }) {
  return <><span className="inline-flex items-center gap-2">{icon}<span>{text}</span></span></>;
}

function KpiMini({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}
function Input({ label, value, onChange, placeholder }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <input
        className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900"
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

/* ------------ Student LOV (lookup modal) ------------ */
function StudentLov({ label = "Student", students = [], value, onPick }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");

  // Lock body scroll while student modal is open
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  const selected = React.useMemo(
    () => students.find(s => String(s.student_id) === String(value)),
    [students, value]
  );

  const filtered = React.useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return students;
    return students.filter(s =>
      String(s.student_id).toLowerCase().includes(n) ||
      String(s.index_no || "").toLowerCase().includes(n) ||
      String(s.full_name).toLowerCase().includes(n) ||
      String(s.class_name || "").toLowerCase().includes(n)
    );
  }, [students, q]);

  return (
    <>
      {/* Render like a select within filters card (full-width row via parent col-span) */}
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
            {selected ? `${selected.full_name} (Index No.: ${selected.index_no || "-"})` : "Select student…"}
          </span>
          <svg className="ml-2 h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/>
          </svg>
        </button>
      </label>

      {open && (
        // Perfectly centered, blurred, scrollable overlay
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 my-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <div className="font-semibold">Choose Student</div>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search field (own line) */}
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

            {/* Results – grows & scrolls */}
            <div className="px-2 pb-2 overflow-y-auto flex-1 min-h-0">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">No students found.</div>
              ) : (
                <ul className="divide-y dark:divide-gray-800">
                  {filtered.map((s) => {
                    return (
                      <li key={s.student_id}>
                        <button
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800`}
                          onClick={() => { onPick(String(s.student_id)); setOpen(false); }}
                        >
                          <div className="font-medium">
                            {s.full_name} <span className="text-gray-500">(Index No.: {s.index_no || "-"})</span>
                          </div>
                          <div className="text-xs text-gray-500">{s.class_name || ""}</div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="p-3 border-t dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
              <span>{filtered.length} result{filtered.length===1 ? "" : "s"}</span>
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 border rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
