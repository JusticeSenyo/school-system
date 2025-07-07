// Enhanced AddFeesPage.js with Back button, Edit and Delete support
import React, { useState } from 'react';
import { nanoid } from 'nanoid';
import { useNavigate } from 'react-router-dom';
import OnboardingProgressBar from '../components/OnboardingProgressBar';

const AddFeesPage = () => {
  const navigate = useNavigate();

  const [feeType, setFeeType] = useState('');
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [fees, setFees] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [editedFee, setEditedFee] = useState({ type: '', amount: '', term: 'Term 1' });

  const handleAddFee = (e) => {
    e.preventDefault();
    if (!feeType.trim() || !amount.trim()) return;
    const newFee = {
      id: nanoid(),
      type: feeType.trim(),
      amount: parseFloat(amount),
      term,
    };
    setFees([...fees, newFee]);
    setFeeType('');
    setAmount('');
    setTerm('Term 1');
  };

  const startEdit = (fee) => {
    setEditingId(fee.id);
    setEditedFee({ type: fee.type, amount: fee.amount, term: fee.term });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditedFee({ type: '', amount: '', term: 'Term 1' });
  };

  const saveEdit = (id) => {
    const updatedFees = fees.map((f) =>
      f.id === id ? { ...f, ...editedFee, amount: parseFloat(editedFee.amount) } : f
    );
    setFees(updatedFees);
    cancelEdit();
  };

  const deleteFee = (id) => {
    setFees(fees.filter((f) => f.id !== id));
  };

  return (
    <div className="min-h-screen bg-blue-50 p-6 flex justify-center items-start">
      <div className="w-full max-w-4xl bg-white p-10 rounded-xl shadow-xl">
        <OnboardingProgressBar />

        <h2 className="text-3xl font-bold text-center text-indigo-700 mb-2">Set Up School Fees</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Define tuition and other fee structures for each academic term.
        </p>

        <form
          onSubmit={handleAddFee}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <input
            type="text"
            placeholder="Fee Type (e.g. Tuition, PTA)"
            value={feeType}
            onChange={(e) => setFeeType(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400"
            required
          />
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400"
            required
          />
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400"
          >
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
            >
              Add Fee
            </button>
          </div>
        </form>

        {fees.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3">Fee Breakdown</h3>
            <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2 text-left">Type</th>
                  <th className="border px-3 py-2 text-left">Amount</th>
                  <th className="border px-3 py-2 text-left">Term</th>
                  <th className="border px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((fee) => (
                  <tr key={fee.id} className="bg-white">
                    {editingId === fee.id ? (
                      <>
                        <td className="border px-3 py-2">
                          <input
                            type="text"
                            value={editedFee.type}
                            onChange={(e) => setEditedFee({ ...editedFee, type: e.target.value })}
                            className="w-full border rounded px-2 py-1"
                          />
                        </td>
                        <td className="border px-3 py-2">
                          <input
                            type="number"
                            value={editedFee.amount}
                            onChange={(e) => setEditedFee({ ...editedFee, amount: e.target.value })}
                            className="w-full border rounded px-2 py-1"
                          />
                        </td>
                        <td className="border px-3 py-2">
                          <select
                            value={editedFee.term}
                            onChange={(e) => setEditedFee({ ...editedFee, term: e.target.value })}
                            className="w-full border rounded px-2 py-1"
                          >
                            <option>Term 1</option>
                            <option>Term 2</option>
                            <option>Term 3</option>
                          </select>
                        </td>
                        <td className="border px-3 py-2 space-x-2">
                          <button
                            onClick={() => saveEdit(fee.id)}
                            className="text-green-600 hover:underline"
                          >Save</button>
                          <button
                            onClick={cancelEdit}
                            className="text-gray-500 hover:underline"
                          >Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border px-3 py-2">{fee.type}</td>
                        <td className="border px-3 py-2">GHS {fee.amount.toFixed(2)}</td>
                        <td className="border px-3 py-2">{fee.term}</td>
                        <td className="border px-3 py-2 space-x-3">
                          <button
                            onClick={() => startEdit(fee)}
                            className="text-indigo-600 hover:underline"
                          >Edit</button>
                          <button
                            onClick={() => deleteFee(fee.id)}
                            className="text-red-600 hover:underline"
                          >Delete</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between items-center border-t pt-6">
          <button
            onClick={() => navigate('/setup/classes-subjects')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            ← Back to Classes
          </button>

          <button
            onClick={() => navigate('/setup/students')}
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition"
          >
            Continue to Add Students →
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddFeesPage;
