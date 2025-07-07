// Enhanced AddUsersPage.js with Edit/Delete support and navigation
import React, { useState } from 'react';
import { nanoid } from 'nanoid';
import { useNavigate } from 'react-router-dom';
import OnboardingProgressBar from '../components/OnboardingProgressBar';

const AddUsersPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    role: 'ADMIN',
    username: '',
    email: '',
    phone: '',
  });

  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const roles = ['ADMIN', 'HEAD_TEACHER', 'ACCOUNTANT', 'TEACHER'];

  const generatePassword = () => Math.random().toString(36).slice(-8);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    const newUser = {
      id: nanoid(),
      ...formData,
      password: generatePassword(),
    };
    setUsers((prev) => [...prev, newUser]);
    setFormData({
      fullName: '',
      role: 'ADMIN',
      username: '',
      email: '',
      phone: '',
    });
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditData({ ...user });
  };

  const handleEditChange = (e) => {
    setEditData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const saveEdit = () => {
    setUsers(users.map((u) => (u.id === editingId ? { ...editData } : u)));
    setEditingId(null);
    setEditData({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const deleteUser = (id) => {
    setUsers(users.filter((u) => u.id !== id));
  };

  return (
    <div className="min-h-screen bg-blue-50 p-6 flex justify-center items-start">
      <div className="w-full max-w-4xl bg-white p-10 rounded-xl shadow-xl">
        <OnboardingProgressBar />

        <h2 className="text-3xl font-bold text-center text-indigo-700 mb-2">
          Add Users & Assign Roles
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Add school staff such as Admins, Head Teachers, Accountants, and Teachers.
        </p>

        <form onSubmit={handleAddUser} className="space-y-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="fullName"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={handleChange}
              className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              required
            />
            <input
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              required
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
            <input
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="md:col-span-2 border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="text-right pt-4">
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition"
            >
              Add User
            </button>
          </div>
        </form>

        {users.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3">Generated Credentials</h3>
            <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2 text-left">Full Name</th>
                  <th className="border px-3 py-2 text-left">Role</th>
                  <th className="border px-3 py-2 text-left">Username</th>
                  <th className="border px-3 py-2 text-left">Password</th>
                  <th className="border px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {editingId === user.id ? (
                      <>
                        <td className="border px-3 py-2">
                          <input
                            value={editData.fullName}
                            name="fullName"
                            onChange={handleEditChange}
                            className="w-full border rounded px-2 py-1"
                          />
                        </td>
                        <td className="border px-3 py-2">
                          <select
                            name="role"
                            value={editData.role}
                            onChange={handleEditChange}
                            className="w-full border rounded px-2 py-1"
                          >
                            {roles.map((r) => (
                              <option key={r} value={r}>{r.replace('_', ' ')}</option>
                            ))}
                          </select>
                        </td>
                        <td className="border px-3 py-2">
                          <input
                            value={editData.username}
                            name="username"
                            onChange={handleEditChange}
                            className="w-full border rounded px-2 py-1"
                          />
                        </td>
                        <td className="border px-3 py-2">{user.password}</td>
                        <td className="border px-3 py-2 space-x-2">
                          <button onClick={saveEdit} className="text-green-600 hover:underline text-sm">Save</button>
                          <button onClick={cancelEdit} className="text-gray-500 hover:underline text-sm">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border px-3 py-2">{user.fullName}</td>
                        <td className="border px-3 py-2">{user.role}</td>
                        <td className="border px-3 py-2">{user.username}</td>
                        <td className="border px-3 py-2">{user.password}</td>
                        <td className="border px-3 py-2 space-x-2">
                          <button onClick={() => startEdit(user)} className="text-indigo-600 hover:underline text-sm">Edit</button>
                          <button onClick={() => deleteUser(user.id)} className="text-red-600 hover:underline text-sm">Delete</button>
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
            onClick={() => navigate('/setup/school-details')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            ← Back to School Details
          </button>
          <button
            onClick={() => navigate('/setup/classes-subjects')}
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition"
          >
            Continue to Classes & Subjects →
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddUsersPage;
