import React, { useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';

const sampleStudents = [
  { id: 1, name: 'Alice Johnson' },
  { id: 2, name: 'Bob Smith' },
  { id: 3, name: 'Emily Brown' },
];

const ManageAttendancePage = () => {
  const [attendance, setAttendance] = useState({});

  const handleAttendanceChange = (id, status) => {
    setAttendance(prev => ({ ...prev, [id]: status }));
  };

  return (
    <DashboardLayout title="Manage Attendance" subtitle="Take attendance for your class">
      <div className="mb-4 flex gap-3 flex-wrap">
        <select className="px-3 py-2 rounded border border-gray-300">
          <option>Select Class</option>
          <option>Grade 5</option>
          <option>Grade 6</option>
        </select>
        <input type="date" className="px-3 py-2 rounded border border-gray-300" />
        <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Mark All Present</button>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <table className="min-w-full">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="p-3 border-b">Student Name</th>
              <th className="p-3 border-b">Status</th>
            </tr>
          </thead>
          <tbody>
            {sampleStudents.map(student => (
              <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="p-3 border-b">{student.name}</td>
                <td className="p-3 border-b">
                  <select
                    value={attendance[student.id] || ''}
                    onChange={e => handleAttendanceChange(student.id, e.target.value)}
                    className="px-3 py-1 border rounded"
                  >
                    <option value="">Select</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 text-right">
          <button className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Submit Attendance</button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageAttendancePage;
