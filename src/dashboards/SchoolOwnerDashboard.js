import React from "react";

const SchoolOwnerDashboard = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-indigo-600 mb-4">
        Welcome to the School Owner Dashboard 🏫
      </h1>
      <p className="text-gray-600 mb-6">
        Oversee the school’s general performance and strategic decisions.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <DashboardCard title="Total Students" value="850" />
        <DashboardCard title="Total Staff" value="60" />
        <DashboardCard title="Term Revenue" value="GHS 120,000" />
      </div>
    </div>
  );
};

const DashboardCard = ({ title, value }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
    <h3 className="text-sm text-gray-500 dark:text-gray-400">{title}</h3>
    <p className="text-xl font-bold text-indigo-600 dark:text-white">{value}</p>
  </div>
);

export default SchoolOwnerDashboard;
