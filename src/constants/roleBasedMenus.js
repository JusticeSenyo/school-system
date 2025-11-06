// src/constants/roleBasedMenus.js
export const roleBasedMenus = Object.freeze({
  admin: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Communication", path: "/dashboard/communication" },

    // ✅ Only AD & HT can see/manage events
    { label: "Manage Events", path: "/dashboard/manage-events" },

    { label: "Manage Staff", path: "/dashboard/manage-staff" },
    { label: "Manage Students", path: "/dashboard/manage-students" },
    {
      label: "Attendance",
      children: [{ label: "Attendance Report", path: "/dashboard/attendance" }],
    },
    {
      label: "Fees",
      children: [
        { label: "Manage Fees", path: "/dashboard/manage-fees" },
        { label: "Fees Report", path: "/dashboard/fees-report" },
        { label: "Print Bill", path: "/dashboard/print-bill" },
      ],
    },
    {
      label: "Academics",
      children: [
        { label: "Manage Academic Years", path: "/dashboard/academic-years" },
        { label: "Manage Academic Terms", path: "/dashboard/academic-terms" },
        { label: "Manage Class Teacher", path: "/dashboard/class-teacher" },
        { label: "Manage Subjects", path: "/dashboard/manage-subjects" },
        { label: "Assign Subjects", path: "/dashboard/assign-subjects" },
        { label: "Manage Classes", path: "/dashboard/classes" },
      ],
    },
    {
      label: "Examination",
      children: [
        { label: "Print Exam Report", path: "/dashboard/print-exam-report" },
        { label: "Grading Scale Setup", path: "/dashboard/exams/scale" },
      ],
    },
    { label: "Settings", path: "/settings" },
  ],

  headteacher: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Communication", path: "/dashboard/communication" },

    // ✅ Only AD & HT can see/manage events
    { label: "Manage Events", path: "/dashboard/manage-events" },

    // Removed: { label: "Manage Staff", path: "/dashboard/manage-staff" },
    { label: "Manage Students", path: "/dashboard/manage-students" },
    {
      label: "Attendance",
      children: [{ label: "Attendance Report", path: "/dashboard/attendance-report" }],
    },
    {
      label: "Examination",
      children: [
        { label: "Manage Exam Report", path: "/dashboard/manage-exam" },
        { label: "Print Exam Report", path: "/dashboard/print-exam-report" },
      ],
    },
    { label: "Settings", path: "/settings" },
  ],

  // Accountant: NO Communication, NO Manage Students, NO Manage Events
  accountant: [
    { label: "Dashboard", path: "/dashboard" },
    {
      label: "Fees",
      children: [
        { label: "Manage Fees", path: "/dashboard/manage-fees" },
        { label: "Fees Report", path: "/dashboard/fees-report" },
        { label: "Print Bill", path: "/dashboard/print-bill" },
      ],
    },
    { label: "Settings", path: "/settings" },
  ],

  // Teacher: NO Manage Events
  teacher: [
    { label: "Dashboard", path: "/dashboard" },
    {
      label: "Examination",
      children: [{ label: "Enter Scores", path: "/dashboard/exams/enter-scores" }],
    },
    { label: "Settings", path: "/settings" },
  ],

  student: [
    { label: "Dashboard", path: "/test-student" },
    {
      label: "online activities",
      children: [
        // { label: "Classes", path: "/student-dashboard/assignments" },
        { label: "Quizzes/exams", path: "/test-student/onlineQuizzes" },
        { label: "Lessons", path: "/test-student/OnlineLessons" },
      ]
    },
    { label: "assignments", path: "/test-student/Assignment" },
    // { label: "Profile", path: "/student-dashboard/profile" },
  ],
parent: [
  {
  label : "dashboard", path: "/test-parent"},
  {
  label : "teachers", path: "/Teachers/Teachers"},
  {
  label : "fees & payments", path: "/Teachers/Fees"},
  {
  label : "notices", path: "/Teachers/Notices"},

],
  

  // Owner: NO Manage Events (per your requirement)
  owner: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Communication", path: "/dashboard/communication" },
    { label: "Manage Staff", path: "/dashboard/manage-staff" },
    { label: "Manage Students", path: "/dashboard/manage-students" },
    {
      label: "Attendance",
      children: [{ label: "Attendance Report", path: "/dashboard/attendance-report" }],
    },
    {
      label: "Fees",
      children: [
        { label: "Manage Fees", path: "/dashboard/manage-fees" },
        { label: "Fees Report", path: "/dashboard/fees-report" },
        { label: "Print Bill", path: "/dashboard/print-bill" },
      ],
    },
    {
      label: "Academics",
      children: [
        { label: "Manage Academic Years", path: "/dashboard/academic-years" },
        { label: "Manage Academic Terms", path: "/dashboard/academic-terms" },
        { label: "Manage Class Teacher", path: "/dashboard/class-teacher" },
        { label: "Manage Subjects", path: "/dashboard/manage-subjects" },
        { label: "Assign Subjects", path: "/dashboard/assign-subjects" },
        { label: "Manage Classes", path: "/dashboard/classes" },
      ],
    },
    {
      label: "Examination",
      children: [
        { label: "Manage Exam Report", path: "/dashboard/manage-exam" },
        { label: "Print Exam Report", path: "/dashboard/print-exam-report" },
      ],
    },
    { label: "Settings", path: "/settings" },
  ],
});

export function getMenusForRole(role) {
  const r = String(role || "").toLowerCase();
  return Array.isArray(roleBasedMenus[r]) ? roleBasedMenus[r] : [];
}
