export const roleBasedMenus = {
  admin: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Communication", path: "/dashboard/communication" },
    { label: "Manage Staff", path: "/dashboard/manage-staff" },
    { label: "Manage Students", path: "/dashboard/manage-students" },
    { label: "Attendance", path: "/dashboard/attendance" },
    {
      label: "Fees",
      children: [
        { label: "Manage Fees", path: "/dashboard/manage-fees" }, // ✅ Added
        { label: "Fees Report", path: "/dashboard/fees-report" },
        { label: "Print Bill", path: "/dashboard/print-bill" },
      ],
    },
    {
      label: "Academics",
      children: [
        { label: "Manage Class Teacher", path: "/dashboard/class-teacher" },
        { label: "Manage Subjects", path: "/dashboard/manage-subjects" },
        { label: "Manage Classes", path: "/dashboard/classes" },
      ],
    },
    {
      label: "Examination",
      children: [
        { label: "Print Exam Report", path: "/dashboard/print-exam-report" },
      ],
    },
    { label: "Settings", path: "/settings" },
  ],

  headteacher: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Communication", path: "/dashboard/communication" },
    { label: "Manage Staff", path: "/dashboard/manage-staff" },
    { label: "Manage Students", path: "/dashboard/manage-students" },
    {
      label: "Attendance",
      children: [
        { label: "Attendance Report", path: "/dashboard/attendance-report" },
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

  accountant: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Communication", path: "/dashboard/communication" },
    { label: "Manage Students", path: "/dashboard/manage-students" },
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

  teacher: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Communication", path: "/dashboard/communication" },
    { label: "Manage Students", path: "/dashboard/manage-students" },
    {
      label: "Attendance",
      children: [
        { label: "Manage Attendance", path: "/dashboard/manage-attendance" },
      ],
    },
    {
      label: "Examination",
      children: [
        { label: "Manage Exam Report", path: "/dashboard/manage-exam" },
      ],
    },
    { label: "Settings", path: "/settings" },
  ],

  owner: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Communication", path: "/dashboard/communication" },
    { label: "Manage Staff", path: "/dashboard/manage-staff" },
    { label: "Manage Students", path: "/dashboard/manage-students" },
    {
      label: "Attendance",
      children: [
        { label: "Attendance Report", path: "/dashboard/attendance-report" },
      ],
    },
    {
      label: "Fees",
      children: [
        { label: "Manage Fees", path: "/dashboard/manage-fees" }, // ✅ Added
        { label: "Fees Report", path: "/dashboard/fees-report" },
        { label: "Print Bill", path: "/dashboard/print-bill" },
      ],
    },
    {
      label: "Academics",
      children: [
        { label: "Manage Class Teacher", path: "/dashboard/class-teacher" },
        { label: "Manage Subjects", path: "/dashboard/manage-subjects" },
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
};
