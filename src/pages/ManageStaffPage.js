import React, { useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Download, Upload, UserCog, FileSpreadsheet, PlusCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

const ManageStaffPage = () => {
  const initialStaff = [
    { id: 1, name: "Mr. John Doe", role: "Teacher", email: "john@example.com" },
    { id: 2, name: "Ms. Mary Smith", role: "Admin", email: "mary@example.com" },
    { id: 3, name: "Mr. Kwame Badu", role: "Head Teacher", email: "badu@example.com" }
  ];

  const [staffList, setStaffList] = useState(initialStaff);
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? staffList.filter(s => s.role.toLowerCase() === filter.toLowerCase())
    : staffList;

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filtered);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staff");
    XLSX.writeFile(workbook, "staff_list.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Staff List", 14, 10);
    doc.autoTable({
      head: [["Name", "Role", "Email"]],
      body: filtered.map(s => [s.name, s.role, s.email])
    });
    doc.save("staff_list.pdf");
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      setStaffList(prev => [...prev, ...json]);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <DashboardLayout title="Manage Staff" subtitle="View, filter, and manage staff records">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 rounded-md text-sm border bg-white dark:bg-gray-900"
          >
            <option value="">All Roles</option>
            <option value="Teacher">Teacher</option>
            <option value="Admin">Admin</option>
            <option value="Head Teacher">Head Teacher</option>
          </select>

          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-md cursor-pointer hover:bg-green-700">
            <Upload size={16} /> Import Excel
            <input type="file" onChange={handleUpload} className="hidden" />
          </label>

          <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
            <Download size={16} /> Excel
          </button>
        </div>

        <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
          <PlusCircle size={16} /> Add New Staff
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-indigo-100 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Email</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((staff) => (
              <tr key={staff.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-2">{staff.name}</td>
                <td className="px-4 py-2">{staff.role}</td>
                <td className="px-4 py-2">{staff.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
};

export default ManageStaffPage;
