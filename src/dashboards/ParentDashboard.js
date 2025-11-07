import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";

import {
  BookOpen,
  RefreshCw,
  BarChart2,
  AlertCircle,
  Megaphone,
  Calendar,
  GraduationCap,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  DollarSign,
  User,
  CalendarDays,
  ClipboardList,
  Phone,
  Mail,
  CreditCard,
  Settings,
  FileText,
  Home,
} from "lucide-react";

/* ------------ Mock Auth Context ------------ */
const useAuth = () => ({
  user: {
    id: "PAR001",
    user_id: "PAR001",
    parent_id: "PAR001",
    PARENT_ID: "PAR001",
    schoolId: "SCH001",
    school_id: "SCH001",
    name: "Jane Doe",
    email: "jane.doe@parent.com",
    phone: "+233 24 123 4567",
  },
  token: "mock-token",
});

/* ------------ ORDS base ------------ */
const HOST =
  "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

/* ------------ API Endpoints ------------ */
const API_ENDPOINTS = {
  PARENT_CHILDREN: `${HOST}/parent/get/children/`, // ?p_parent_id
  CHILD_ATTENDANCE: `${HOST}/report/get/student_attendance/`, // ?p_student_id&p_academic_year&p_term
  CHILD_GRADES: `${HOST}/academic/get/student_grades/`, // ?p_student_id&p_academic_year&p_term
  CHILD_ASSIGNMENTS: `${HOST}/assignment/get/student_assignments/`, // ?p_student_id
  TEACHERS: `${HOST}/staff/get/teachers/`, // ?p_school_id
  FEE_STATEMENT: `${HOST}/finance/get/parent_statement/`, // ?p_parent_id
  ANNOUNCEMENTS: `${HOST}/comms/dashboard/sent/`, // ?p_school_id
  SCHOOL_EVENTS: `${HOST}/academic/get/event/`, // ?p_school_id
};

/* ------------ Helpers ------------ */
const todayISO = () => new Date().toISOString().slice(0, 10);
const dateOnly = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const fmtWhen = (isoLike) => {
  if (!isoLike) return "";
  const d = new Date(isoLike);
  return isNaN(d.getTime()) ? String(isoLike) : d.toLocaleString();
};
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);

/* ------------ DUMMY DATA ------------ */
const DUMMY_CHILDREN = [
  {
    student_id: "STU001",
    name: "John Doe",
    student_number: "2024001",
    class_name: "Grade 10A",
    profile_image: null,
  },
  {
    student_id: "STU002",
    name: "Emily Doe",
    student_number: "2024002",
    class_name: "Grade 8B",
    profile_image: null,
  },
];

const DUMMY_ATTENDANCE = {
  STU001: Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const statuses = ["PRESENT", "PRESENT", "PRESENT", "PRESENT", "TARDY", "ABSENT"];
    return {
      attendance_date: date.toISOString().slice(0, 10),
      status: statuses[Math.floor(Math.random() * statuses.length)],
    };
  }),
  STU002: Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const statuses = ["PRESENT", "PRESENT", "PRESENT", "PRESENT", "PRESENT", "TARDY"];
    return {
      attendance_date: date.toISOString().slice(0, 10),
      status: statuses[Math.floor(Math.random() * statuses.length)],
    };
  }),
};

const DUMMY_GRADES = {
  STU001: [
    { subject_name: "Mathematics", assessment_name: "Mid-Term Exam", score: 85, max_score: 100, grade: "B+", date: "2024-09-15" },
    { subject_name: "English", assessment_name: "Essay", score: 92, max_score: 100, grade: "A", date: "2024-09-18" },
    { subject_name: "Physics", assessment_name: "Lab Report", score: 78, max_score: 100, grade: "B", date: "2024-09-20" },
  ],
  STU002: [
    { subject_name: "Mathematics", assessment_name: "Quiz", score: 88, max_score: 100, grade: "B+", date: "2024-09-16" },
    { subject_name: "Science", assessment_name: "Project", score: 95, max_score: 100, grade: "A", date: "2024-09-19" },
    { subject_name: "History", assessment_name: "Test", score: 82, max_score: 100, grade: "B+", date: "2024-09-21" },
  ],
};

const DUMMY_ASSIGNMENTS = {
  STU001: [
    { assignment_id: "ASG001", title: "Calculus Problem Set", subject: "Mathematics", due_date: "2024-10-30", status: "pending" },
    { assignment_id: "ASG002", title: "Lab Report", subject: "Physics", due_date: "2024-11-02", status: "pending" },
    { assignment_id: "ASG003", title: "Shakespeare Essay", subject: "English", due_date: "2024-10-26", status: "submitted" },
  ],
  STU002: [
    { assignment_id: "ASG004", title: "Science Project", subject: "Science", due_date: "2024-10-29", status: "pending" },
    { assignment_id: "ASG005", title: "History Essay", subject: "History", due_date: "2024-11-01", status: "pending" },
  ],
};

const DUMMY_TEACHERS = [
  { teacher_id: "TCH001", name: "Mr. John Smith", subject: "Mathematics", email: "j.smith@school.com", phone: "+233 24 111 1111" },
  { teacher_id: "TCH002", name: "Ms. Sarah Johnson", subject: "English", email: "s.johnson@school.com", phone: "+233 24 222 2222" },
  { teacher_id: "TCH003", name: "Dr. Michael Brown", subject: "Physics", email: "m.brown@school.com", phone: "+233 24 333 3333" },
  { teacher_id: "TCH004", name: "Mrs. Emily Davis", subject: "Chemistry", email: "e.davis@school.com", phone: "+233 24 444 4444" },
];

const DUMMY_FEE_STATEMENT = {
  total_fees: 5000,
  paid_amount: 3500,
  balance: 1500,
  transactions: [
    { transaction_id: "TXN001", date: "2024-09-01", description: "Term 3 Fees Payment", amount: 2000, type: "payment" },
    { transaction_id: "TXN002", date: "2024-08-15", description: "Term 3 Fees Payment", amount: 1500, type: "payment" },
    { transaction_id: "TXN003", date: "2024-08-01", description: "Term 3 Fees", amount: 5000, type: "charge" },
  ],
};

const DUMMY_ANNOUNCEMENTS = [
  {
    message_id: "MSG001",
    subject: "Parent-Teacher Meeting",
    body: "Dear parents, parent-teacher meetings will be held next week. Please schedule your appointments.",
    created_at: new Date().toISOString(),
    target_role: "PA",
  },
  {
    message_id: "MSG002",
    subject: "Sports Day Announcement",
    body: "Our annual sports day is scheduled for next month. All students are encouraged to participate!",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    target_role: "ALL",
  },
];

const DUMMY_EVENTS = [
  { event_id: "EVT001", event_name: "Mid-Term Exams Begin", event_date: new Date(2024, 9, 30).toISOString() },
  { event_id: "EVT002", event_name: "Parent-Teacher Meeting", event_date: new Date(2024, 10, 8).toISOString() },
  { event_id: "EVT003", event_name: "Sports Day", event_date: new Date(2024, 10, 15).toISOString() },
];

export default function ParentDashboard() {
  const { user, token } = useAuth() || {};
  const parentId = user?.id ?? user?.user_id ?? user?.parent_id ?? user?.PARENT_ID ?? null;
  const schoolId = user?.schoolId ?? user?.school_id ?? null;

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  // Data states
  const [children, setChildren] = useState(DUMMY_CHILDREN);
  const [selectedChild, setSelectedChild] = useState(DUMMY_CHILDREN[0]);
  const [attendance, setAttendance] = useState(DUMMY_ATTENDANCE);
  const [grades, setGrades] = useState(DUMMY_GRADES);
  const [assignments, setAssignments] = useState(DUMMY_ASSIGNMENTS);
  const [teachers, setTeachers] = useState(DUMMY_TEACHERS);
  const [feeStatement, setFeeStatement] = useState(DUMMY_FEE_STATEMENT);
  const [announcements, setAnnouncements] = useState(DUMMY_ANNOUNCEMENTS);
  const [events, setEvents] = useState(DUMMY_EVENTS);

  // UI states
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  /* ---- Load Data Functions ---- */
  const loadAllData = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      // TODO: Implement actual API calls
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const doFullRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  /* ---- Computed Stats ---- */
  const childAttendance = attendance[selectedChild?.student_id] || [];
  const childGrades = grades[selectedChild?.student_id] || [];
  const childAssignments = assignments[selectedChild?.student_id] || [];

  const attendanceStats = useMemo(() => {
    const present = childAttendance.filter((a) => a.status === "PRESENT").length;
    const tardy = childAttendance.filter((a) => a.status === "TARDY").length;
    const absent = childAttendance.filter((a) => a.status === "ABSENT").length;
    const total = childAttendance.length;
    const rate = pct(present, total);
    return { present, tardy, absent, total, rate };
  }, [childAttendance]);

  const gradeAverage = useMemo(() => {
    if (childGrades.length === 0) return 0;
    const sum = childGrades.reduce((acc, g) => acc + (g.score / g.max_score) * 100, 0);
    return Math.round((sum / childGrades.length) * 10) / 10;
  }, [childGrades]);

  const pendingAssignments = childAssignments.filter((a) => a.status === "pending");

  const todayAnnouncements = useMemo(() => {
    const today = todayISO();
    return announcements.filter((a) => dateOnly(a.created_at) === today);
  }, [announcements]);

  const feePercentagePaid = pct(feeStatement.paid_amount, feeStatement.total_fees);

  return (
    <DashboardLayout title="Parent">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl mb-6 shadow-lg border border-indigo-200/40 dark:border-indigo-900/30">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
        <div className="absolute -top-10 -right-8 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

        <div className="relative p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Users className="h-6 w-6 flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-2xl font-bold">Welcome, {user?.name}</h2>
                <p className="text-indigo-100 text-sm mt-1">
                  Parent Dashboard - Monitor your children's progress
                </p>
              </div>
            </div>

            <button
              onClick={doFullRefresh}
              title="Refresh"
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors px-4 py-2 rounded-lg border border-white/20"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {!!lastUpdated && (
            <div className="text-xs text-indigo-100/90 mt-3">
              Last updated: {lastUpdated}
            </div>
          )}
        </div>
      </div>

      {/* Children Selector */}
      {children.length > 1 && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Child
          </label>
          <div className="flex flex-wrap gap-2">
            {children.map((child) => (
              <button
                key={child.student_id}
                onClick={() => setSelectedChild(child)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedChild?.student_id === child.student_id
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <div className="text-left">
                    <div className="text-sm">{child.name}</div>
                    <div className="text-xs opacity-75">{child.class_name}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <nav className="flex gap-1">
          {[
            { id: "dashboard", label: "Dashboard", icon: Home },
            { id: "grades", label: "Grades & Reports", icon: Award },
            { id: "attendance", label: "Attendance", icon: Calendar },
            { id: "assignments", label: "Assignments", icon: ClipboardList },
            // { id: "teachers", label: "Teachers", icon: Users },
            { id: "fees", label: "Fees & Payments", icon: DollarSign },
            { id: "notices", label: "Notices", icon: Megaphone },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && (
        <div>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {attendanceStats.rate}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Attendance Rate
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {gradeAverage}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Grade Average
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {pendingAssignments.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Pending Assignments
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                GH₵{feeStatement.balance}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Fee Balance
              </div>
            </div>
          </div>

          {/* Two columns: Recent Activity & Announcements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Recent Grades */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold">Recent Grades</h3>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Avg: {gradeAverage}%
                  </span>
                </div>
              </div>

              <div className="p-4">
                {childGrades.length === 0 ? (
                  <div className="text-sm text-gray-600 dark:text-gray-300 text-center py-6">
                    No grades recorded yet.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {childGrades.slice(0, 5).map((g, idx) => {
                      const percentage = Math.round((g.score / g.max_score) * 100);
                      const color =
                        percentage >= 80
                          ? "text-emerald-600 dark:text-emerald-400"
                          : percentage >= 60
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400";
                      return (
                        <li
                          key={idx}
                          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                {g.subject_name}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {g.assessment_name}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className={`font-bold text-lg ${color}`}>
                                {g.grade}
                              </div>
                              <div className="text-xs text-gray-500">
                                {g.score}/{g.max_score}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Announcements */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-orange-500" />
                    <h3 className="font-semibold">
                      {showAllAnnouncements ? "All Announcements" : "Today's Announcements"}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAllAnnouncements(!showAllAnnouncements)}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    {showAllAnnouncements ? "Today Only" : "View All"}
                  </button>
                </div>
              </div>

              <div className="p-4 max-h-[400px] overflow-y-auto">
                {(showAllAnnouncements ? announcements : todayAnnouncements).length === 0 ? (
                  <div className="text-sm text-gray-600 dark:text-gray-300 text-center py-6">
                    {showAllAnnouncements ? "No announcements yet." : "No announcements today."}
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {(showAllAnnouncements ? announcements : todayAnnouncements).map((ann) => (
                      <li
                        key={ann.message_id}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3"
                      >
                        <div className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                          {ann.subject}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                          {ann.body}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{fmtWhen(ann.created_at)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-indigo-500" />
                  <h3 className="font-semibold">School Events</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                    className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    ‹ Prev
                  </button>

                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100 min-w-[140px] text-center">
                    {calMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}
                  </div>

                  <button
                    onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                    className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Next ›
                  </button>
                </div>
              </div>

              <BigCalendar monthStart={calMonth} events={events} />
            </div>
          </div>
        </div>
      )}

      {/* Grades & Reports Tab */}
      {activeTab === "grades" && (
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Grades & Academic Reports
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View {selectedChild?.name}'s academic performance and assessments
            </p>
          </div>

          {/* Grade Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Overall Average</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{gradeAverage}%</div>
              <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${gradeAverage}%` }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Assessments</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{childGrades.length}</div>
              <div className="text-sm text-gray-500 mt-2">This term</div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Highest Grade</div>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {childGrades.length > 0 ? Math.max(...childGrades.map(g => g.score / g.max_score * 100)).toFixed(0) + '%' : 'N/A'}
              </div>
              <div className="text-sm text-gray-500 mt-2">Best performance</div>
            </div>
          </div>

          {/* Detailed Grades */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h4 className="font-semibold">All Grades</h4>
            </div>
            <div className="p-4">
              {childGrades.length === 0 ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-300">
                  No grades available yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {childGrades.map((g, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{g.subject_name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{g.assessment_name}</div>
                        <div className="text-xs text-gray-500 mt-1">{new Date(g.date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{g.grade}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{g.score}/{g.max_score}</div>
                        <div className="text-xs text-gray-500">{Math.round((g.score / g.max_score) * 100)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === "attendance" && (
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Attendance Record
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track {selectedChild?.name}'s attendance history
            </p>
          </div>

          {/* Attendance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Attendance Rate</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{attendanceStats.rate}%</div>
              <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${attendanceStats.rate}%` }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Present Days</div>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{attendanceStats.present}</div>
              <div className="text-sm text-gray-500 mt-2">Out of {attendanceStats.total}</div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tardy</div>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{attendanceStats.tardy}</div>
              <div className="text-sm text-gray-500 mt-2">Late arrivals</div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Absent Days</div>
              <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">{attendanceStats.absent}</div>
              <div className="text-sm text-gray-500 mt-2">Total absences</div>
            </div>
          </div>

          {/* Attendance History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h4 className="font-semibold">Recent Attendance (Last 30 Days)</h4>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {childAttendance.slice(0, 30).map((att, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-center ${att.status === "PRESENT"
                        ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
                        : att.status === "TARDY"
                          ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
                          : "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800"
                      }`}
                  >
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {new Date(att.attendance_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className={`text-sm font-semibold ${att.status === "PRESENT"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : att.status === "TARDY"
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-rose-700 dark:text-rose-300"
                      }`}>
                      {att.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === "assignments" && (
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Assignments
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track {selectedChild?.name}'s homework and assignments
            </p>
          </div>

          {/* Assignment Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Pending</div>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {childAssignments.filter(a => a.status === 'pending').length}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Submitted</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {childAssignments.filter(a => a.status === 'submitted').length}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {childAssignments.length}
              </div>
            </div>
          </div>

          {/* Assignments List */}
          <div className="space-y-4">
            {childAssignments.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-8 text-center">
                <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-300">No assignments at the moment.</p>
              </div>
            ) : (
              childAssignments.map((assignment) => {
                const isOverdue = new Date(assignment.due_date) < new Date() && assignment.status === 'pending';
                return (
                  <div
                    key={assignment.assignment_id}
                    className={`bg-white dark:bg-gray-800 rounded-xl shadow border p-5 ${isOverdue ? 'border-red-300 dark:border-red-700' : 'border-gray-100 dark:border-gray-700'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {assignment.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {assignment.subject}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </span>
                          {isOverdue && (
                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                              <AlertTriangle className="h-4 w-4" />
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${assignment.status === 'submitted'
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}>
                        {assignment.status === 'submitted' ? 'Submitted' : 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Teachers Tab */}
      {activeTab === "teachers" && (
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Teachers & Contacts
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Contact information for {selectedChild?.name}'s teachers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teachers.map((teacher) => (
              <div
                key={teacher.teacher_id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-900/20">
                    <User className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {teacher.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {teacher.subject}
                    </p>
                    <div className="space-y-2">
                      <a
                        href={`mailto:${teacher.email}`}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        <Mail className="h-4 w-4" />
                        {teacher.email}
                      </a>
                      <a
                        href={`tel:${teacher.phone}`}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        <Phone className="h-4 w-4" />
                        {teacher.phone}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fees & Payments Tab */}
      {activeTab === "fees" && (
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Fees & Payments
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View and manage fee payments
            </p>
          </div>

          {/* Fee Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Fees</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                GH₵{feeStatement.total_fees.toLocaleString()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Amount Paid</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                GH₵{feeStatement.paid_amount.toLocaleString()}
              </div>
              <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div
                  className="h-full bg-green-600 rounded-full"
                  style={{ width: `${feePercentagePaid}%` }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Balance Due</div>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                GH₵{feeStatement.balance.toLocaleString()}
              </div>
              {feeStatement.balance > 0 && (
                <button className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
                  Make Payment
                </button>
              )}
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h4 className="font-semibold">Transaction History</h4>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {feeStatement.transactions.map((txn) => (
                  <div
                    key={txn.transaction_id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${txn.type === 'payment'
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : 'bg-gray-50 dark:bg-gray-900/20'
                        }`}>
                        <CreditCard className={`h-5 w-5 ${txn.type === 'payment'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                          }`} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {txn.description}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(txn.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${txn.type === 'payment'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-900 dark:text-white'
                      }`}>
                      {txn.type === 'payment' ? '-' : '+'}GH₵{txn.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notices Tab */}
      {activeTab === "notices" && (
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Notices & Announcements
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Important updates and communications from the school
            </p>
          </div>

          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-8 text-center">
                <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-300">No announcements at the moment.</p>
              </div>
            ) : (
              announcements.map((ann) => (
                <div
                  key={ann.message_id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-orange-50 dark:bg-orange-900/20 flex-shrink-0">
                      <Megaphone className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {ann.subject}
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                        {ann.body}
                      </p>
                      <div className="text-xs text-gray-500">
                        {fmtWhen(ann.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage your account and preferences
            </p>
          </div>

          <div className="space-y-6">
            {/* Profile Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={user?.phone || ''}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Notification Preferences</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Email Notifications</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">SMS Notifications</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Grade Updates</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Attendance Alerts</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
              </div>
            </div>

            {/* Security */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Security</h4>
              <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ------------ Calendar Component ------------ */
function BigCalendar({ monthStart, events }) {
  const y = monthStart.getFullYear();
  const m = monthStart.getMonth();
  const first = new Date(y, m, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysPrev = startDay;
  const totalCells = Math.ceil((daysPrev + daysInMonth) / 7) * 7;

  const byDate = new Map();
  (events || []).forEach((e) => {
    const d = dateOnly(e.event_date);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(e);
  });

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - daysPrev + 1;
    const dateObj = new Date(y, m, dayNum);
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    const iso = dateObj.toISOString().slice(0, 10);
    const e = byDate.get(iso) || [];
    cells.push({ iso, dayNum: dateObj.getDate(), inMonth, events: e });
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
        <div
          key={d}
          className="text-xs font-medium text-gray-600 dark:text-gray-300 px-2 py-1 text-center"
        >
          {d}
        </div>
      ))}
      {cells.map((c, idx) => (
        <div
          key={idx}
          className={`min-h-[80px] rounded-lg border p-2 overflow-hidden ${c.inMonth
              ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              : "bg-gray-50 dark:bg-gray-800/50 border-gray-200/60 dark:border-gray-700/60 opacity-70"
            }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {c.dayNum}
            </div>
            {c.iso === todayISO() && (
              <span className="text-[10px] px-1 rounded bg-indigo-600 text-white">
                Today
              </span>
            )}
          </div>

          <div className="space-y-1">
            {c.events.slice(0, 2).map((ev) => (
              <div
                key={ev.event_id}
                className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-100 border border-indigo-100 dark:border-indigo-800 truncate"
                title={ev.event_name}
              >
                • {ev.event_name}
              </div>
            ))}
            {c.events.length > 2 && (
              <div className="text-[10px] text-gray-500">
                +{c.events.length - 2} more
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}