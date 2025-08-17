import React, { useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Upload, Download, FileSpreadsheet, PlusCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

const ManageStudentsPage = () => {
  const [students, setStudents] = useState([
    { id: 1, name: "Alice Johnson", class: "Grade 5", parent: "Mrs. Johnson" },
    { id: 2, name: "Bob Smith", class: "Grade 6", parent: "Mr. Smith" }
  ]);

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(students);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "students_list.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Students List", 14, 10);
    doc.autoTable({
      head: [["Name", "Class", "Parent"]],
      body: students.map(s => [s.name, s.class, s.parent])
    });
    doc.save("students_list.pdf");
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      setStudents(prev => [...prev, ...json]);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <DashboardLayout title="Manage Students" subtitle="Manage enrollment, guardianship and records">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-md cursor-pointer hover:bg-green-700">
            <Upload size={16} /> Import Excel
            <input type="file" onChange={handleUpload} className="hidden" />
          </label>
          <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
            <Download size={16} /> Excel
          </button>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
          <PlusCircle size={16} /> Add New Student
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-indigo-100 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Parent</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-2">{student.name}</td>
                <td className="px-4 py-2">{student.class}</td>
                <td className="px-4 py-2">{student.parent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
};

export default ManageStudentsPage;
