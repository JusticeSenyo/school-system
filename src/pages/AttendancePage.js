import React from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';

const AttendancePage = () => {
  const reports = [
    { class: 'Grade 5', present: 28, absent: 2, date: '2025-08-10', teacher: 'Mr. Smith' },
    { class: 'Grade 6', present: 30, absent: 0, date: '2025-08-10', teacher: 'Mrs. Jane' },
  ];

  return (
    <DashboardLayout title="Attendance Report" subtitle="Track daily attendance across all classes">
      <div className="mb-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <select className="px-3 py-2 rounded border border-gray-300">
            <option>All Classes</option>
            <option>Grade 5</option>
            <option>Grade 6</option>
          </select>
          <input type="date" className="px-3 py-2 rounded border border-gray-300" />
        </div>
        <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Export PDF</button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="p-3 border-b">Class</th>
              <th className="p-3 border-b">Present</th>
              <th className="p-3 border-b">Absent</th>
              <th className="p-3 border-b">Date</th>
              <th className="p-3 border-b">Marked By</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="p-3 border-b">{item.class}</td>
                <td className="p-3 border-b text-green-600 font-bold">{item.present}</td>
                <td className="p-3 border-b text-red-500 font-bold">{item.absent}</td>
                <td className="p-3 border-b">{item.date}</td>
                <td className="p-3 border-b">{item.teacher}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
};

export default AttendancePage;
