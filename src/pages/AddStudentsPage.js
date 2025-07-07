// Enhanced AddStudentsPage.js with Edit/Delete support and navigation
import React, { useState } from 'react';
import { nanoid } from 'nanoid';
import { useNavigate } from 'react-router-dom';
import OnboardingProgressBar from '../components/OnboardingProgressBar';

const AddStudentsPage = () => {
  const navigate = useNavigate();

  const [student, setStudent] = useState({
    fullName: '',
    studentId: '',
    classLevel: '',
    gender: 'Male',
  });

  const [students, setStudents] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editStudent, setEditStudent] = useState({});

  const classOptions = [
    'KG 1', 'KG 2',
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
    'JHS 1', 'JHS 2', 'JHS 3',
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStudent((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!student.fullName || !student.studentId || !student.classLevel) return;

    const newEntry = { ...student, id: nanoid() };
    setStudents([...students, newEntry]);

    setStudent({
      fullName: '',
      studentId: '',
      classLevel: '',
      gender: 'Male',
    });
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditStudent({ ...s });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditStudent((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdit = () => {
    setStudents(students.map(s => s.id === editingId ? editStudent : s));
    setEditingId(null);
    setEditStudent({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditStudent({});
  };

  const deleteStudent = (id) => {
    setStudents(students.filter(s => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-blue-50 p-6 flex justify-center items-start">
      <div className="w-full max-w-4xl bg-white p-10 rounded-xl shadow-xl">
        <OnboardingProgressBar />

        <h2 className="text-3xl font-bold text-center text-indigo-700 mb-2">
          Add Students
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Register new students with their unique ID, class level, and gender.
        </p>

        <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            value={student.fullName}
            onChange={handleChange}
            className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400"
            required
          />
          <input
            type="text"
            name="studentId"
            placeholder="Student ID"
            value={student.studentId}
            onChange={handleChange}
            className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400"
            required
          />
          <select
            name="classLevel"
            value={student.classLevel}
            onChange={handleChange}
            className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400"
            required
          >
            <option value="">Select Class</option>
            {classOptions.map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
          <select
            name="gender"
            value={student.gender}
            onChange={handleChange}
            className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400"
          >
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
            >
              Add Student
            </button>
          </div>
        </form>

        {students.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3">Student List</h3>
            <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2 text-left">Full Name</th>
                  <th className="border px-3 py-2 text-left">Student ID</th>
                  <th className="border px-3 py-2 text-left">Class</th>
                  <th className="border px-3 py-2 text-left">Gender</th>
                  <th className="border px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, index) => (
                  <tr key={s.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {editingId === s.id ? (
                      <>
                        <td className="border px-3 py-2">
                          <input
                            name="fullName"
                            value={editStudent.fullName}
                            onChange={handleEditChange}
                            className="w-full border rounded px-2 py-1"
                          />
                        </td>
                        <td className="border px-3 py-2">
                          <input
                            name="studentId"
                            value={editStudent.studentId}
                            onChange={handleEditChange}
                            className="w-full border rounded px-2 py-1"
                          />
                        </td>
                        <td className="border px-3 py-2">
                          <select
                            name="classLevel"
                            value={editStudent.classLevel}
                            onChange={handleEditChange}
                            className="w-full border rounded px-2 py-1"
                          >
                            {classOptions.map((cls) => (
                              <option key={cls} value={cls}>{cls}</option>
                            ))}
                          </select>
                        </td>
                        <td className="border px-3 py-2">
                          <select
                            name="gender"
                            value={editStudent.gender}
                            onChange={handleEditChange}
                            className="w-full border rounded px-2 py-1"
                          >
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                          </select>
                        </td>
                        <td className="border px-3 py-2 space-x-2">
                          <button onClick={saveEdit} className="text-green-600 text-sm hover:underline">Save</button>
                          <button onClick={cancelEdit} className="text-gray-500 text-sm hover:underline">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border px-3 py-2">{s.fullName}</td>
                        <td className="border px-3 py-2">{s.studentId}</td>
                        <td className="border px-3 py-2">{s.classLevel}</td>
                        <td className="border px-3 py-2">{s.gender}</td>
                        <td className="border px-3 py-2 space-x-2">
                          <button onClick={() => startEdit(s)} className="text-indigo-600 text-sm hover:underline">Edit</button>
                          <button onClick={() => deleteStudent(s.id)} className="text-red-600 text-sm hover:underline">Delete</button>
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
            onClick={() => navigate('/setup/fees')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            ← Back to Fees
          </button>
          <button
            onClick={() => navigate('/setup/complete')}
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition"
          >
            Finish Setup →
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddStudentsPage;