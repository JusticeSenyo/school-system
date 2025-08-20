import React, { useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import {
  Plus, Edit3, Trash2, Save, X, Search, Filter,
  Upload, Download, Receipt, CheckCircle2, Wallet
} from "lucide-react";

/**
 * ManageFeesPage
 * - Create/edit fee items (Tuition, PTA Levy, Lab)
 * - Generate bills per class/term
 * - Record payments (MoMo/Card/Cash) against bills
 * - Export CSV
 *
 * Replace the mock arrays with your API calls (APEX/PLSQL).
 */

const MOCK_FEE_ITEMS = [
  { id: 1, name: "Tuition", amount: 1200, term: "Term 1", year: "2025/26", category: "Core" },
  { id: 2, name: "PTA Levy", amount: 150, term: "Term 1", year: "2025/26", category: "Levy" },
  { id: 3, name: "Lab Fee", amount: 200, term: "Term 1", year: "2025/26", category: "Department" },
];

const MOCK_CLASSES = ["KG 1", "KG 2", "P1", "P2", "P3", "P4", "P5", "JHS 1", "JHS 2", "JHS 3"];
const TERMS = ["Term 1", "Term 2", "Term 3"];
const YEARS = ["2025/26", "2024/25"];

export default function ManageFeesPage() {
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState(TERMS[0]);
  const [year, setYear] = useState(YEARS[0]);
  const [items, setItems] = useState(MOCK_FEE_ITEMS);
  const [editing, setEditing] = useState(null); // fee item being edited
  const [openCreate, setOpenCreate] = useState(false);
  const [createPayload, setCreatePayload] = useState({ name: "", amount: "", category: "Core", term, year });

  // Billing modal
  const [openBill, setOpenBill] = useState(false);
  const [billPayload, setBillPayload] = useState({ className: MOCK_CLASSES[0], term, year, items: [] });

  // Payment modal
  const [openPayment, setOpenPayment] = useState(false);
  const [paymentPayload, setPaymentPayload] = useState({ billNo: "", amount: "", method: "MoMo", reference: "" });

  const filtered = useMemo(() => {
    return items.filter(i =>
      i.term === term && i.year === year &&
      (i.name.toLowerCase().includes(query.toLowerCase()) || i.category.toLowerCase().includes(query.toLowerCase()))
    );
  }, [items, query, term, year]);

  function resetCreate() {
    setCreatePayload({ name: "", amount: "", category: "Core", term, year });
  }

  function handleCreate() {
    if (!createPayload.name || !createPayload.amount) return;
    const next = {
      id: Math.max(0, ...items.map(i => i.id)) + 1,
      ...createPayload,
      amount: Number(createPayload.amount)
    };
    setItems(prev => [...prev, next]);
    setOpenCreate(false);
    resetCreate();
    // TODO: POST /fees
  }

  function handleUpdate() {
    if (!editing) return;
    setItems(prev => prev.map(i => (i.id === editing.id ? editing : i)));
    setEditing(null);
    // TODO: PUT /fees/:id
  }

  function handleDelete(id) {
    setItems(prev => prev.filter(i => i.id !== id));
    // TODO: DELETE /fees/:id
  }

  function handleGenerateBills() {
    // TODO: POST /bills/generate { className, term, year, items: [ids] }
    setOpenBill(false);
    alert(`Bills generated for ${billPayload.className} - ${billPayload.term} ${billPayload.year}`);
  }

  function handleRecordPayment() {
    // TODO: POST /payments { billNo, amount, method, reference }
    setOpenPayment(false);
    alert(`Payment recorded: ${paymentPayload.amount} via ${paymentPayload.method} (Bill: ${paymentPayload.billNo})`);
  }

  function exportCsv() {
    // Simple CSV export of fee items
    const header = "Name,Amount,Category,Term,Year\n";
    const rows = filtered.map(i => `${i.name},${i.amount},${i.category},${i.term},${i.year}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fees_${term}_${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout title="Manage Fees" subtitle="Create fee items, generate bills and record payments">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-sm"
                placeholder="Search by name or category"
              />
            </div>
            <div className="flex gap-2">
              <select value={term} onChange={e => setTerm(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                {TERMS.map(t => <option key={t}>{t}</option>)}
              </select>
              <select value={year} onChange={e => setYear(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                {YEARS.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setOpenCreate(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg">
              <Plus className="h-4 w-4" /> New Fee Item
            </button>
            <button onClick={() => setOpenBill(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg">
              <Receipt className="h-4 w-4" /> Generate Bills
            </button>
            <button onClick={() => setOpenPayment(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-sky-600 text-white rounded-lg">
              <Wallet className="h-4 w-4" /> Record Payment
            </button>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Fee Items Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
                <th className="p-3">Name</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Category</th>
                <th className="p-3">Term</th>
                <th className="p-3">Year</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b last:border-0 dark:border-gray-700">
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3">{Number(item.amount).toFixed(2)}</td>
                  <td className="p-3">{item.category}</td>
                  <td className="p-3">{item.term}</td>
                  <td className="p-3">{item.year}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditing({ ...item })} className="px-2 py-1 border rounded-lg inline-flex items-center gap-1">
                        <Edit3 className="h-4 w-4" /> Edit
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="px-2 py-1 border rounded-lg text-rose-600 inline-flex items-center gap-1">
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td className="p-6 text-center text-gray-500 dark:text-gray-400" colSpan={6}>
                    No fee items found for {term} {year}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {openCreate && (
        <Modal onClose={() => setOpenCreate(false)} title="New Fee Item" icon={<Plus className="h-5 w-5" />}>
          <div className="grid gap-3">
            <Input label="Name" value={createPayload.name} onChange={v => setCreatePayload(s => ({ ...s, name: v }))} />
            <Input label="Amount" type="number" value={createPayload.amount} onChange={v => setCreatePayload(s => ({ ...s, amount: v }))} />
            <Input label="Category" value={createPayload.category} onChange={v => setCreatePayload(s => ({ ...s, category: v }))} />
            <div className="flex gap-2">
              <Select label="Term" value={createPayload.term} onChange={v => setCreatePayload(s => ({ ...s, term: v }))} options={TERMS} />
              <Select label="Year" value={createPayload.year} onChange={v => setCreatePayload(s => ({ ...s, year: v }))} options={YEARS} />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button className="px-3 py-2 border rounded-lg inline-flex items-center gap-2" onClick={() => setOpenCreate(false)}>
                <X className="h-4 w-4" /> Cancel
              </button>
              <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg inline-flex items-center gap-2" onClick={handleCreate}>
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editing && (
        <Modal onClose={() => setEditing(null)} title="Edit Fee Item" icon={<Edit3 className="h-5 w-5" />}>
          <div className="grid gap-3">
            <Input label="Name" value={editing.name} onChange={v => setEditing(s => ({ ...s, name: v }))} />
            <Input label="Amount" type="number" value={editing.amount} onChange={v => setEditing(s => ({ ...s, amount: Number(v) }))} />
            <Input label="Category" value={editing.category} onChange={v => setEditing(s => ({ ...s, category: v }))} />
            <div className="flex gap-2">
              <Select label="Term" value={editing.term} onChange={v => setEditing(s => ({ ...s, term: v }))} options={TERMS} />
              <Select label="Year" value={editing.year} onChange={v => setEditing(s => ({ ...s, year: v }))} options={YEARS} />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button className="px-3 py-2 border rounded-lg inline-flex items-center gap-2" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" /> Cancel
              </button>
              <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg inline-flex items-center gap-2" onClick={handleUpdate}>
                <CheckCircle2 className="h-4 w-4" /> Update
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Generate Bills Modal */}
      {openBill && (
        <Modal onClose={() => setOpenBill(false)} title="Generate Bills" icon={<Receipt className="h-5 w-5" />}>
          <div className="grid gap-3">
            <div className="flex gap-2">
              <Select label="Class" value={billPayload.className} onChange={v => setBillPayload(s => ({ ...s, className: v }))} options={MOCK_CLASSES} />
              <Select label="Term" value={billPayload.term} onChange={v => setBillPayload(s => ({ ...s, term: v }))} options={TERMS} />
              <Select label="Year" value={billPayload.year} onChange={v => setBillPayload(s => ({ ...s, year: v }))} options={YEARS} />
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Select Fee Items</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.filter(i => i.term === billPayload.term && i.year === billPayload.year).map(i => {
                  const checked = billPayload.items.includes(i.id);
                  return (
                    <label key={i.id} className="flex items-center gap-2 p-2 border rounded-lg">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setBillPayload(s => ({
                            ...s,
                            items: e.target.checked ? [...s.items, i.id] : s.items.filter(id => id !== i.id)
                          }));
                        }}
                      />
                      <span>{i.name} — {Number(i.amount).toFixed(2)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button className="px-3 py-2 border rounded-lg inline-flex items-center gap-2" onClick={() => setOpenBill(false)}>
                <X className="h-4 w-4" /> Cancel
              </button>
              <button className="px-3 py-2 bg-emerald-600 text-white rounded-lg inline-flex items-center gap-2" onClick={handleGenerateBills}>
                <Receipt className="h-4 w-4" /> Generate
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {openPayment && (
        <Modal onClose={() => setOpenPayment(false)} title="Record Payment" icon={<Wallet className="h-5 w-5" />}>
          <div className="grid gap-3">
            <Input label="Bill No." value={paymentPayload.billNo} onChange={v => setPaymentPayload(s => ({ ...s, billNo: v }))} />
            <Input label="Amount" type="number" value={paymentPayload.amount} onChange={v => setPaymentPayload(s => ({ ...s, amount: v }))} />
            <div className="flex gap-2">
              <Select label="Method" value={paymentPayload.method} onChange={v => setPaymentPayload(s => ({ ...s, method: v }))} options={["MoMo", "Card", "Cash", "Bank"]} />
              <Input label="Reference" value={paymentPayload.reference} onChange={v => setPaymentPayload(s => ({ ...s, reference: v }))} />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button className="px-3 py-2 border rounded-lg inline-flex items-center gap-2" onClick={() => setOpenPayment(false)}>
                <X className="h-4 w-4" /> Cancel
              </button>
              <button className="px-3 py-2 bg-sky-600 text-white rounded-lg inline-flex items-center gap-2" onClick={handleRecordPayment}>
                <CheckCircle2 className="h-4 w-4" /> Save Payment
              </button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}

function Modal({ title, icon, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-3">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            {icon}
            <h4 className="font-semibold">{title}</h4>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, type = "text", value, onChange }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="text-sm grid gap-1 flex-1">
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
