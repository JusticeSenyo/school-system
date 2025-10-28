// src/pages/student-dashboard/index.jsx
import React from "react";
import DashboardLayout from "./../../components/dashboard/DashboardLayout";

export default function onlineQuizzes() {
  console.log("✅ Student Dashboard loaded");

  return (
    <DashboardLayout title="Student Dashboard">
      <div
        style={{
          background: "red",
          color: "white",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2rem",
        }}
      >
        <h1>Hello World from Student Dashboard</h1>
        <p>If you see this, routing & layout are working ✅</p>
      </div>
    </DashboardLayout>
  );
}
