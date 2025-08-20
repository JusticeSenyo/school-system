// src/pages/PrintBillPage.js
import React, { useMemo, useRef, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import {
  Printer, Download, Search, Filter, Copy, MessageSquare, Send, Phone, CheckCircle2,
} from "lucide-react";

/**
 * PrintBillPage
 * - Select Term/Year/Class, pick student
 * - Choose template (Simple / Detailed)
 * - Preview a clean, print-optimized bill
 * - Print (window.print), Export CSV (for records)
 *
 * Replace MOCK data & hooks with real API calls (students, bills, items).
 */

const TERMS = ["Term 1", "Term 2", "Term 3"];
const YEARS = ["2025/26", "2024/25"];
const CLASSES = ["P1", "P2", "P3", "P4", "P5", "JHS 1", "JHS 2", "JHS 3"];
const TEMPLATES = ["Simple", "Detailed"];

// Mock students + billing items (replace with backend data)
const MOCK_STUDENTS = [
  { id: "STU001", name: "Ama Boateng", className: "P4", parentPhone: "+233200000001" },
  { id: "STU002", name: "Kojo Mensah", className: "P4", parentPhone: "+233200000002" },
  { id: "STU003", name: "Akua Owusu", className: "JHS 2", parentPhone: "+233200000003" },
];

const MOCK_BILL_ITEMS = [
  { id: 1, name: "Tuition", amount: 1200 },
  { id: 2, name: "PTA Levy", amount: 150 },
  { id: 3, name: "Lab Fee", amount: 200 },
];

export default function PrintBillPage() {
  const [term, setTerm] = useState(TERMS[0]);
  const [year, setYear] = useState(YEARS[0]);
  const [klass, setKlass] = useState(CLASSES[3]); // default P4
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [q, setQ] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(MOCK_STUDENTS[0].id);
  const [notes, setNotes] = useState("Please settle all fees by the end of week 3.");
  const [includeMoMoBlock, setIncludeMoMoBlock] = useState(true);

  const previewRef = useRef(null);

  const studentsFiltered = useMemo(() => {
    return MOCK_STUDENTS.filter(s =>
      s.className === klass &&
      (q ? s.name.toLowerCase().includes(q.toLowerCase()) || s.id.toLowerCase().includes(q.toLowerCase()) : true)
    );
  }, [klass, q]);

  const student = useMemo(
    () => studentsFiltered.find(s => s.id === selectedStudentId) || studentsFiltered[0],
    [selectedStudentId, studentsFiltered]
  );

  const totals = useMemo(() => {
    const subtotal = MOCK_BILL_ITEMS.reduce((s, it) => s + it.amount, 0);
    const discount = 0; // plug your logic here
    const due = subtotal - discount;
    return { subtotal, discount, due };
  }, []);

  function handlePrint() {
    // Use a print-specific stylesheet so only the bill content prints.
    window.print();
  }

  function exportCsv() {
    const header = "StudentID,StudentName,Class,Term,Year,Item,Amount\n";
    const rows = MOCK_BILL_ITEMS.map(i => 
      `${student?.id || ""},${student?.name || ""},${student?.className || ""},${term},${year},${i.name},${i.amount}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bill_${student?.id || "student"}_${term}_${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function copyPaymentLink() {
    // Replace with actual bill link from backend
    const link = `https://pay.schoolmasterhub.com/${year}/${term}/${student?.id}`;
    navigator.clipboard?.writeText(link);
    alert("Payment link copied.");
  }

  function sendWhatsApp() {
    // Simple wa.me link — replace message with your encoded one
    const message = encodeURIComponent(
      `Hello ${student?.name}'s parent, your school bill for ${term} ${year} is ${formatMoney(totals.due)}. Pay securely: https://pay.schoolmasterhub.com/${year}/${term}/${student?.id}`
    );
    window.open(`https://wa.me/${(student?.parentPhone || "").replace(/[^\d]/g, "")}?text=${message}`, "_blank", "noopener,noreferrer");
  }

  function sendSMS() {
    // Stub — integrate with your SMS gateway (Hubtel/ITC/Paystack/Flutterwave etc.)
    alert("SMS sent (stub). Integrate with your SMS provider here.");
  }

  function sendEmail() {
    // Stub — open default email client
    const subject = encodeURIComponent(`School Bill - ${term} ${year}`);
    const body = encodeURIComponent(
      `Dear Parent,\n\nPlease find the school bill for ${student?.name} (${student?.id}) in ${student?.className}.\nTotal Due: ${formatMoney(totals.due)}\nPay online: https://pay.schoolmasterhub.com/${year}/${term}/${student?.id}\n\nThank you.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <DashboardLayout title="Print Bill" subtitle="Generate and print/send student bills">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          {/* Filters */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <Select label="Term" value={term} onChange={setTerm} options={TERMS} />
            <Select label="Year" value={year} onChange={setYear} options={YEARS} />
            <Select label="Class" value={klass} onChange={setKlass} options={CLASSES} />
            <div className="col-span-1 md:col-span-2">
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
            <Select
              label="Template"
              value={template}
              onChange={setTemplate}
              options={TEMPLATES}
            />
            <Toggle
              label="Include MoMo/Card instructions"
              checked={includeMoMoBlock}
              onChange={setIncludeMoMoBlock}
            />
          </div>

          {/* Student picker */}
          <div className="min-w-[240px]">
            <label className="text-sm grid gap-1">
              <span className="text-gray-700 dark:text-gray-300">Student</span>
              <select
                className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                {studentsFiltered.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id}) — {s.className}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handlePrint} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg">
            <Printer className="h-4 w-4" /> Print Bill
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={copyPaymentLink} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
            <Copy className="h-4 w-4" /> Copy Payment Link
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
          <BillDocument
            template={template}
            term={term}
            year={year}
            student={student}
            items={MOCK_BILL_ITEMS}
            totals={totals}
            notes={notes}
            includeMoMoBlock={includeMoMoBlock}
          />
        </div>
      </div>

      {/* Notes editor */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-100 dark:border-gray-700">
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

function BillDocument({ template, term, year, student, items, totals, notes, includeMoMoBlock }) {
  // If you have tenant branding, plug it here:
  const school = {
    name: "Bright Future Academy",
    address: "Accra, Ghana",
    phone: "+233 20 000 0000",
    email: "admin@brightfuture.edu",
    logoUrl: "", // optional
  };

  return (
    <div className="print-area max-w-3xl mx-auto my-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b dark:border-gray-700 flex items-start gap-4">
        {school.logoUrl ? (
          <img src={school.logoUrl} alt="School Logo" className="h-14 w-14 object-contain" />
        ) : (
          <div className="h-14 w-14 rounded bg-indigo-600"></div>
        )}
        <div className="flex-1">
          <div className="text-xl font-bold">{school.name}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{school.address}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {school.phone} · {school.email}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">School Bill</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {term}, {year}
          </div>
        </div>
      </div>

      {/* Student Info */}
      <div className="p-6 grid sm:grid-cols-2 gap-3">
        <InfoRow label="Student Name" value={student?.name || "-"} />
        <InfoRow label="Student ID" value={student?.id || "-"} />
        <InfoRow label="Class" value={student?.className || "-"} />
        <InfoRow label="Parent Phone" value={student?.parentPhone || "-"} />
      </div>

      {/* Items */}
      <div className="px-6 pb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
              <th className="py-2">#</th>
              <th className="py-2">{template === "Simple" ? "Fee Item" : "Fee Item (Description)"}</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id} className="border-b last:border-0 dark:border-gray-700">
                <td className="py-2">{idx + 1}</td>
                <td className="py-2">
                  <div className="font-medium">{it.name}</div>
                  {template === "Detailed" && (
                    <div className="text-xs text-gray-500">
                      {/* You could store descriptions per fee item in DB; showing example text here */}
                      {it.name} charge for {term} {year}
                    </div>
                  )}
                </td>
                <td className="py-2 text-right">{formatMoney(it.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-3 text-right font-medium">Subtotal</td>
              <td className="pt-3 text-right">{formatMoney(totals.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="text-right">Discounts</td>
              <td className="text-right">{formatMoney(totals.discount)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="pt-1 text-right font-bold">Total Due</td>
              <td className="pt-1 text-right font-bold">{formatMoney(totals.due)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment instructions */}
      {includeMoMoBlock && (
        <div className="px-6 pb-6">
          <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 p-3 text-sm text-indigo-800 dark:text-indigo-100">
            <div className="font-semibold mb-1">Pay by Mobile Money / Card</div>
            <ul className="list-disc ml-5 space-y-1">
              <li>Use the online link sent via SMS/WhatsApp, or visit: <span className="underline">pay.schoolmasterhub.com</span></li>
              <li>Reference: <span className="font-medium">{student?.id}</span> · Term: <span className="font-medium">{term}</span></li>
              <li>Receipts are issued automatically after payment.</li>
            </ul>
          </div>
        </div>
      )}

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
            <div className="h-14" />
            <div className="border-t dark:border-gray-600 w-56 mx-auto" />
            <div className="text-sm mt-1">Authorized Signature</div>
          </div>
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

function Select({ label, value, onChange, options }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <select
        className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="text-sm flex items-center gap-2 mt-6">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}

function formatMoney(n) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "GHS", maximumFractionDigits: 2 }).format(n || 0);
  } catch {
    return `GHS ${Number(n || 0).toFixed(2)}`;
  }
}
