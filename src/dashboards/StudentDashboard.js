import React, { useEffect, useMemo, useState } from "react";

import DashboardLayout from "../components/dashboard/DashboardLayout";

import { Link } from "react-router-dom";
import {
  BookOpen,
  RefreshCw,
  BarChart2,
  AlertCircle,
  Megaphone,
  Inbox,
  Mail,
  MessageSquare,
  CalendarDays,
  GraduationCap,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Video,
  FileText,
  Upload,
  ExternalLink,
  User,
  Calendar,
  ClipboardList,
} from "lucide-react";

/* ------------ Mock Auth Context ------------ */
const useAuth = () => ({
  user: {
    id: "STU001",
    user_id: "STU001",
    student_id: "STU001",
    STUDENT_ID: "STU001",
    schoolId: "SCH001",
    school_id: "SCH001",
    name: "John Doe",
    class_id: "CLS001",
    class_name: "Grade 10A",
    student_number: "2024001",
    email: "john.doe@student.school.com",
  },
  token: "mock-token",
});

/* ------------ ORDS base ------------ */
const HOST =
  "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

/* ------------ API Endpoints (for future implementation) ------------ */
// TODO: Configure these endpoints based on your actual API structure
const API_ENDPOINTS = {
  // Student Info
  STUDENT_INFO: `${HOST}/student/get/info/`, // ?p_student_id
  STUDENT_SUBJECTS: `${HOST}/academic/get/student_subjects/`, // ?p_student_id
  STUDENT_TIMETABLE: `${HOST}/academic/get/student_timetable/`, // ?p_student_id&p_day

  // Attendance & Grades
  STUDENT_ATTENDANCE: `${HOST}/report/get/student_attendance/`, // ?p_student_id&p_academic_year&p_term
  STUDENT_GRADES: `${HOST}/academic/get/student_grades/`, // ?p_student_id&p_academic_year&p_term

  // Online Exams
  STUDENT_EXAMS: `${HOST}/exam/get/student_exams/`, // ?p_student_id&p_status (upcoming/active/completed)
  EXAM_START: `${HOST}/exam/start/`, // POST with exam_id, student_id
  EXAM_SUBMIT: `${HOST}/exam/submit/`, // POST with exam_id, student_id, answers

  // Online Classes
  ONLINE_CLASSES: `${HOST}/class/get/online_classes/`, // ?p_student_id&p_date
  JOIN_CLASS_VALIDATE: `${HOST}/class/validate_link/`, // POST with class_link

  // Assignments
  STUDENT_ASSIGNMENTS: `${HOST}/assignment/get/student_assignments/`, // ?p_student_id&p_status
  ASSIGNMENT_SUBMIT: `${HOST}/assignment/submit/`, // POST with assignment_id, student_id, file
  ASSIGNMENT_HISTORY: `${HOST}/assignment/get/submissions/`, // ?p_student_id

  // Communications & Events
  ANNOUNCEMENTS: `${HOST}/comms/dashboard/sent/`, // ?p_school_id
  SCHOOL_EVENTS: `${HOST}/academic/get/event/`, // ?p_school_id

  // Academic Config
  ACADEMIC_YEARS: `${HOST}/academic/get/years/`, // ?p_school_id
  ACADEMIC_TERMS: `${HOST}/academic/get/terms/`, // ?p_school_id
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

/* ------------ DUMMY DATA (Replace with API calls) ------------ */
const DUMMY_STUDENT_INFO = {
  name: "John Doe",
  student_number: "2024001",
  class_name: "Grade 10A",
  email: "john.doe@student.school.com",
  phone: "+233 24 123 4567",
  guardian_name: "Jane Doe",
  guardian_phone: "+233 24 987 6543",
};

const DUMMY_SUBJECTS = [
  { subject_id: "SUB001", subject_name: "Mathematics", teacher_name: "Mr. Smith", room: "Room 101" },
  { subject_id: "SUB002", subject_name: "English", teacher_name: "Ms. Johnson", room: "Room 102" },
  { subject_id: "SUB003", subject_name: "Physics", teacher_name: "Dr. Brown", room: "Lab 1" },
  { subject_id: "SUB004", subject_name: "Chemistry", teacher_name: "Mrs. Davis", room: "Lab 2" },
  { subject_id: "SUB005", subject_name: "Biology", teacher_name: "Mr. Wilson", room: "Lab 3" },
  { subject_id: "SUB006", subject_name: "History", teacher_name: "Ms. Taylor", room: "Room 201" },
];

const DUMMY_TIMETABLE = [
  { period: 1, time: "08:00 - 09:00", subject: "Mathematics", teacher: "Mr. Smith", room: "Room 101" },
  { period: 2, time: "09:00 - 10:00", subject: "English", teacher: "Ms. Johnson", room: "Room 102" },
  { period: 3, time: "10:00 - 11:00", subject: "Physics", teacher: "Dr. Brown", room: "Lab 1" },
  { period: 4, time: "11:30 - 12:30", subject: "Chemistry", teacher: "Mrs. Davis", room: "Lab 2" },
  { period: 5, time: "12:30 - 13:30", subject: "Biology", teacher: "Mr. Wilson", room: "Lab 3" },
];

const DUMMY_ATTENDANCE = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - i);
  const statuses = ["PRESENT", "PRESENT", "PRESENT", "PRESENT", "TARDY", "ABSENT"];
  return {
    attendance_date: date.toISOString().slice(0, 10),
    status: statuses[Math.floor(Math.random() * statuses.length)],
  };
});

const DUMMY_GRADES = [
  { subject_name: "Mathematics", assessment_name: "Mid-Term Exam", score: 85, max_score: 100, date: "2024-09-15", grade: "B+" },
  { subject_name: "English", assessment_name: "Essay Assignment", score: 92, max_score: 100, date: "2024-09-18", grade: "A" },
  { subject_name: "Physics", assessment_name: "Lab Report", score: 78, max_score: 100, date: "2024-09-20", grade: "B" },
  { subject_name: "Chemistry", assessment_name: "Quiz 1", score: 88, max_score: 100, date: "2024-09-22", grade: "B+" },
  { subject_name: "Biology", assessment_name: "Project", score: 95, max_score: 100, date: "2024-09-25", grade: "A" },
];

const DUMMY_ONLINE_EXAMS = [
  {
    exam_id: "EX001",
    exam_name: "Mathematics Mid-Term Exam",
    subject: "Mathematics",
    start_date: "2024-10-30",
    end_date: "2024-10-30",
    duration: 120,
    status: "upcoming",
    total_marks: 100,
  },
  {
    exam_id: "EX002",
    exam_name: "English Essay Test",
    subject: "English",
    start_date: "2024-11-02",
    end_date: "2024-11-02",
    duration: 90,
    status: "upcoming",
    total_marks: 100,
  },
];

const DUMMY_ONLINE_CLASSES = [
  {
    class_id: "CL001",
    subject: "Mathematics",
    teacher: "Mr. Smith",
    scheduled_time: "2024-10-25T10:00:00",
    duration: 60,
    status: "scheduled",
    has_link: true,
  },
  {
    class_id: "CL002",
    subject: "Physics",
    teacher: "Dr. Brown",
    scheduled_time: "2024-10-25T14:00:00",
    duration: 60,
    status: "scheduled",
    has_link: false,
  },
];

const DUMMY_ASSIGNMENTS = [
  {
    assignment_id: "ASG001",
    title: "Calculus Problem Set",
    subject: "Mathematics",
    teacher: "Mr. Smith",
    due_date: "2024-10-28",
    status: "pending",
    total_marks: 50,
    description: "Complete problems 1-20 from Chapter 5",
  },
  {
    assignment_id: "ASG002",
    title: "Lab Report - Pendulum Motion",
    subject: "Physics",
    teacher: "Dr. Brown",
    due_date: "2024-10-30",
    status: "pending",
    total_marks: 30,
    description: "Write a detailed lab report on pendulum motion experiment",
  },
  {
    assignment_id: "ASG003",
    title: "Essay - Shakespeare Analysis",
    subject: "English",
    teacher: "Ms. Johnson",
    due_date: "2024-10-26",
    status: "submitted",
    total_marks: 40,
    submitted_date: "2024-10-25",
    grade: 35,
  },
];

const DUMMY_ANNOUNCEMENTS = [
  {
    message_id: "MSG001",
    subject: "Parent-Teacher Meeting Reminder",
    body: "Dear parents and students, this is a reminder that parent-teacher meetings will be held next week.",
    created_at: new Date().toISOString(),
    target_role: "ST",
    has_email: "Y",
    has_sms: "N",
  },
  {
    message_id: "MSG002",
    subject: "Sports Day Announcement",
    body: "Our annual sports day is scheduled for next month. All students are encouraged to participate!",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    target_role: "ALL",
    has_email: "Y",
    has_sms: "Y",
  },
];

const DUMMY_EVENTS = [
  { event_id: "EVT001", event_name: "Mid-Term Exams Begin", event_date: new Date(2024, 9, 30).toISOString() },
  { event_id: "EVT002", event_name: "Science Fair", event_date: new Date(2024, 10, 5).toISOString() },
  { event_id: "EVT003", event_name: "Sports Day", event_date: new Date(2024, 10, 15).toISOString() },
];

/* ------------ Simple DashboardLayout ------------ */
// function DashboardLayout({ title, children }) {
//   return (
//     <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
//       <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
//         <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
//           {title}
//         </h1>
//         {children}
//       </div>
//     </div>
//   );
// }

/* ------------ Main Component ------------ */
export default function StudentDashboard() {
  const { user, token } = useAuth() || {};
  const studentId = user?.id ?? user?.user_id ?? user?.student_id ?? user?.STUDENT_ID ?? null;
  const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  // TODO: Inject API data here - Student Info
  const [studentInfo, setStudentInfo] = useState(DUMMY_STUDENT_INFO);

  // TODO: Inject API data here - Subjects
  const [subjects, setSubjects] = useState(DUMMY_SUBJECTS);

  // TODO: Inject API data here - Timetable
  const [timetable, setTimetable] = useState(DUMMY_TIMETABLE);

  // TODO: Inject API data here - Attendance
  const [attendance, setAttendance] = useState(DUMMY_ATTENDANCE);

  // TODO: Inject API data here - Grades
  const [grades, setGrades] = useState(DUMMY_GRADES);

  // TODO: Inject API data here - Online Exams
  const [onlineExams, setOnlineExams] = useState(DUMMY_ONLINE_EXAMS);

  // TODO: Inject API data here - Online Classes
  const [onlineClasses, setOnlineClasses] = useState(DUMMY_ONLINE_CLASSES);

  // TODO: Inject API data here - Assignments
  const [assignments, setAssignments] = useState(DUMMY_ASSIGNMENTS);

  // TODO: Inject API data here - Announcements
  const [announcements, setAnnouncements] = useState(DUMMY_ANNOUNCEMENTS);

  // TODO: Inject API data here - Events
  const [events, setEvents] = useState(DUMMY_EVENTS);

  // Academic year/term
  const [yearId, setYearId] = useState("2024");
  const [termId, setTermId] = useState("Term 3");

  // UI states
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // overview, exams, classes, assignments, profile
  const [calMonth, setCalMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // Online class join modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [classLink, setClassLink] = useState("");

  // Assignment submission modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionNotes, setSubmissionNotes] = useState("");

  /* ---- Computed Stats ---- */
  const attendanceStats = useMemo(() => {
    const present = attendance.filter((a) => a.status === "PRESENT").length;
    const tardy = attendance.filter((a) => a.status === "TARDY").length;
    const absent = attendance.filter((a) => a.status === "ABSENT").length;
    const total = attendance.length;
    const rate = pct(present, total);
    return { present, tardy, absent, total, rate };
  }, [attendance]);

  const gradeAverage = useMemo(() => {
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + (g.score / g.max_score) * 100, 0);
    return Math.round((sum / grades.length) * 10) / 10;
  }, [grades]);

  const todayAnnouncements = useMemo(() => {
    const today = todayISO();
    return announcements.filter((a) => dateOnly(a.created_at) === today);
  }, [announcements]);

  const pendingAssignments = useMemo(() => {
    return assignments.filter((a) => a.status === "pending");
  }, [assignments]);

  const upcomingExams = useMemo(() => {
    return onlineExams.filter((e) => e.status === "upcoming");
  }, [onlineExams]);

  /* ---- Load Data Functions ---- */
  // TODO: Replace these with actual API calls
  const loadAllData = async () => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // TODO: Uncomment and implement actual API calls
      // const studentData = await fetch(`${API_ENDPOINTS.STUDENT_INFO}?p_student_id=${studentId}`);
      // const subjectsData = await fetch(`${API_ENDPOINTS.STUDENT_SUBJECTS}?p_student_id=${studentId}`);
      // const attendanceData = await fetch(`${API_ENDPOINTS.STUDENT_ATTENDANCE}?p_student_id=${studentId}&p_academic_year=${yearId}&p_term=${termId}`);
      // etc...

      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async () => {
    // TODO: Implement API call to validate and join class
    if (!classLink.trim()) {
      alert("Please enter a class link");
      return;
    }

    try {
      // TODO: API call to validate link
      // const response = await fetch(API_ENDPOINTS.JOIN_CLASS_VALIDATE, {
      //   method: 'POST',
      //   body: JSON.stringify({ class_link: classLink, student_id: studentId })
      // });

      // If valid, open in new window
      window.open(classLink, "_blank");
      setShowJoinModal(false);
      setClassLink("");
    } catch (error) {
      alert("Invalid class link. Please check and try again.");
    }
  };

  const handleSubmitAssignment = async () => {
    // TODO: Implement API call to submit assignment
    if (!submissionFile) {
      alert("Please select a file to submit");
      return;
    }

    try {
      // TODO: API call to submit assignment
      // const formData = new FormData();
      // formData.append('file', submissionFile);
      // formData.append('assignment_id', selectedAssignment.assignment_id);
      // formData.append('student_id', studentId);
      // formData.append('notes', submissionNotes);
      // 
      // const response = await fetch(API_ENDPOINTS.ASSIGNMENT_SUBMIT, {
      //   method: 'POST',
      //   body: formData
      // });

      alert("Assignment submitted successfully!");
      setShowSubmitModal(false);
      setSelectedAssignment(null);
      setSubmissionFile(null);
      setSubmissionNotes("");
      loadAllData(); // Refresh data
    } catch (error) {
      alert("Error submitting assignment. Please try again.");
    }
  };

  const handleStartExam = (exam) => {
    // TODO: Implement navigation to exam page
    // Navigate to exam taking interface
    console.log("Starting exam:", exam.exam_id);
    alert(`Starting exam: ${exam.exam_name}\nThis will navigate to the exam interface.`);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const doFullRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };
  const role = "student";


  /* ------------ Render ------------ */
  return (
    <DashboardLayout title="Student">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-lg sm:rounded-xl lg:rounded-2xl mb-4 sm:mb-6 lg:mb-8 shadow-lg border border-emerald-200/40 dark:border-emerald-900/30">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-700" />
        <div className="absolute -top-10 -right-8 sm:-top-16 sm:-right-10 h-32 w-32 sm:h-48 sm:w-48 lg:h-56 lg:w-56 rounded-full bg-white/10 blur-3xl" />

        <div className="relative p-4 sm:p-5 md:p-6 lg:p-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 flex-shrink-0" />
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-tight truncate">
                Welcome, {studentInfo.name}
              </h2>
            </div>

            <button
              onClick={doFullRefresh}
              title="Refresh"
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base bg-white/15 hover:bg-white/25 transition-colors px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg border border-white/20 whitespace-nowrap self-start sm:self-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden xs:inline">Refresh</span>
            </button>
          </div>

          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-emerald-100 mt-2 sm:mt-2.5 md:mt-3 leading-relaxed max-w-3xl">
            {studentInfo.class_name} • Student #: {studentInfo.student_number}
          </p>

          {!!lastUpdated && (
            <div className="text-[11px] sm:text-xs md:text-sm text-emerald-100/90 mt-1.5 sm:mt-2 md:mt-2.5">
              Last updated: {lastUpdated}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: BarChart2 },
            { id: "exams", label: "Online Exams", icon: FileText },
            { id: "classes", label: "Online Classes", icon: Video },
            { id: "assignments", label: "Assignments", icon: ClipboardList },
            { id: "profile", label: "My Info", icon: User },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                  ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
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
      {activeTab === "overview" && (
        <div>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {attendanceStats.rate}%
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Attendance Rate
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {gradeAverage}%
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Grade Average
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {pendingAssignments.length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Pending Assignments
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {upcomingExams.length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Upcoming Exams
              </div>
            </div>
          </div>

          {/* Today's Timetable */}
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-500" />
                <h3 className="font-semibold">Today's Timetable</h3>
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>

              <div className="p-4">
                {/* TODO: Inject API data here - Today's timetable based on current day */}
                {timetable.length === 0 ? (
                  <div className="text-sm text-gray-600 dark:text-gray-300 text-center py-6">
                    No classes scheduled for today.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timetable.map((period) => (
                      <div
                        key={period.period}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                      >
                        <div className="flex-shrink-0 w-16 text-center">
                          <div className="text-xs text-gray-600 dark:text-gray-400">Period {period.period}</div>
                          <div className="text-xs font-medium text-gray-900 dark:text-white">{period.time}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white text-sm">{period.subject}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {period.teacher} • {period.room}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Two columns: Grades & Announcements */}
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
                {/* TODO: Inject API data here - Recent grades from API */}
                {grades.length === 0 ? (
                  <div className="text-sm text-gray-600 dark:text-gray-300 text-center py-6">
                    No grades recorded yet.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {grades.slice(0, 5).map((g, idx) => {
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
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    {showAllAnnouncements ? "Today Only" : "View All"}
                  </button>
                </div>
              </div>

              <div className="p-4 max-h-[400px] overflow-y-auto">
                {/* TODO: Inject API data here - Announcements from API */}
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-3 sm:p-4 md:p-6 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 flex-shrink-0" />
                  <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white">
                    School Events
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <button
                    onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                    className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-xs sm:text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="hidden sm:inline">‹ Prev</span>
                    <span className="sm:hidden">‹</span>
                  </button>

                  <div className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100 text-center px-2 min-w-[110px] sm:min-w-[140px]">
                    {calMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}
                  </div>

                  <button
                    onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                    className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-xs sm:text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="hidden sm:inline">Next ›</span>
                    <span className="sm:hidden">›</span>
                  </button>
                </div>
              </div>

              {/* TODO: Inject API data here - School events from API */}
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <div className="min-w-[300px] sm:min-w-[480px] md:min-w-[640px] lg:min-w-[720px] xl:min-w-[800px] 2xl:min-w-[900px] px-3 sm:px-0">
                  <BigCalendar monthStart={calMonth} events={events} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Online Exams Tab */}
      {activeTab === "exams" && (
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Online Exams</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View and take your scheduled online examinations
            </p>
          </div>

          {/* TODO: Inject API data here - Online exams from API */}
          {onlineExams.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-300">No exams scheduled at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {onlineExams.map((exam) => (
                <div
                  key={exam.exam_id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {exam.exam_name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{exam.subject}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${exam.status === "upcoming"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : exam.status === "active"
                            ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
                        }`}>
                        {exam.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4" />
                        <span>Duration: {exam.duration} minutes</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>Date: {new Date(exam.start_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Award className="h-4 w-4" />
                        <span>Total Marks: {exam.total_marks}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartExam(exam)}
                      disabled={exam.status !== "active"}
                      className={`w-full py-2.5 rounded-lg font-medium transition-colors ${exam.status === "active"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        }`}
                    >
                      {exam.status === "active" ? "Start Exam" : "Not Available Yet"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Online Classes Tab */}
      {activeTab === "classes" && (
        <div>
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Online Classes</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Join your scheduled online classes or enter a class link
              </p>
            </div>
            <button
              onClick={() => setShowJoinModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              <Video className="h-4 w-4" />
              Join Class
            </button>
          </div>

          {/* TODO: Inject API data here - Scheduled online classes from API */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {onlineClasses.map((cls) => (
              <div
                key={cls.class_id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{cls.subject}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{cls.teacher}</p>
                  </div>
                  <Video className="h-5 w-5 text-emerald-500" />
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(cls.scheduled_time).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span>Duration: {cls.duration} minutes</span>
                  </div>
                </div>

                <button
                  disabled={!cls.has_link}
                  className={`w-full py-2.5 rounded-lg font-medium transition-colors ${cls.has_link
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    }`}
                >
                  {cls.has_link ? "Join Class" : "Link Not Available"}
                </button>
              </div>
            ))}
          </div>

          {onlineClasses.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-8 text-center">
              <Video className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-300 mb-4">No classes scheduled at the moment.</p>
              <button
                onClick={() => setShowJoinModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                <Video className="h-4 w-4" />
                Join with Link
              </button>
            </div>
          )}
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === "assignments" && (
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">My Assignments</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View and submit your assignments
            </p>
          </div>

          {/* TODO: Inject API data here - Student assignments from API */}
          {assignments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-8 text-center">
              <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-300">No assignments at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => {
                const isOverdue = new Date(assignment.due_date) < new Date() && assignment.status === "pending";
                const daysUntilDue = Math.ceil((new Date(assignment.due_date) - new Date()) / (1000 * 60 * 60 * 24));

                return (
                  <div
                    key={assignment.assignment_id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {assignment.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {assignment.subject} • {assignment.teacher}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${assignment.status === "submitted"
                            ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : isOverdue
                              ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          }`}>
                          {assignment.status === "submitted" ? "Submitted" : isOverdue ? "Overdue" : "Pending"}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                        {assignment.description}
                      </p>

                      <div className="flex items-center justify-between text-sm mb-4">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Calendar className="h-4 w-4" />
                            Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Award className="h-4 w-4" />
                            {assignment.total_marks} marks
                          </span>
                        </div>
                        {assignment.status === "pending" && !isOverdue && (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {daysUntilDue} days left
                          </span>
                        )}
                      </div>

                      {assignment.status === "submitted" ? (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-green-700 dark:text-green-300">
                              Submitted on {new Date(assignment.submitted_date).toLocaleDateString()}
                            </span>
                            {assignment.grade && (
                              <span className="font-semibold text-green-700 dark:text-green-300">
                                Grade: {assignment.grade}/{assignment.total_marks}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedAssignment(assignment);
                            setShowSubmitModal(true);
                          }}
                          className="w-full py-2.5 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                        >
                          Submit Assignment
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Student Information</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your personal and academic information
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Info */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-emerald-500" />
                  Personal Information
                </h4>
                {/* TODO: Inject API data here - Student personal info from API */}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-xs text-gray-600 dark:text-gray-400 mb-1">Full Name</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{studentInfo.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-600 dark:text-gray-400 mb-1">Student Number</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{studentInfo.student_number}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-600 dark:text-gray-400 mb-1">Class</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{studentInfo.class_name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-600 dark:text-gray-400 mb-1">Email</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{studentInfo.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-600 dark:text-gray-400 mb-1">Phone</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{studentInfo.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-600 dark:text-gray-400 mb-1">Guardian</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{studentInfo.guardian_name}</dd>
                  </div>
                </dl>
              </div>

              {/* Subjects */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-500" />
                  My Subjects ({subjects.length})
                </h4>
                {/* TODO: Inject API data here - Student subjects from API */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {subjects.map((subject) => (
                    <div
                      key={subject.subject_id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900"
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                        {subject.subject_name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {subject.teacher_name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="space-y-6">
              {/* Academic Performance */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-emerald-500" />
                  Academic Performance
                </h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Grade Average</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{gradeAverage}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all"
                        style={{ width: `${gradeAverage}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{attendanceStats.rate}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${attendanceStats.rate}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {attendanceStats.present}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Present</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {attendanceStats.tardy}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Tardy</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                          {attendanceStats.absent}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Absent</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Academic Info */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Academic Year</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Term</span>
                    <span className="font-medium text-gray-900 dark:text-white">{termId}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Join Online Class</h3>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setClassLink("");
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter the class link provided by your teacher to join the online session.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Class Link
                </label>
                <input
                  type="text"
                  value={classLink}
                  onChange={(e) => setClassLink(e.target.value)}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setClassLink("");
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinClass}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Join Class
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Assignment Modal */}
      {showSubmitModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Submit Assignment</h3>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  setSelectedAssignment(null);
                  setSubmissionFile(null);
                  setSubmissionNotes("");
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="font-medium text-gray-900 dark:text-white mb-1">
                {selectedAssignment.title}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedAssignment.subject} • Due: {new Date(selectedAssignment.due_date).toLocaleDateString()}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload File *
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    onChange={(e) => setSubmissionFile(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-10 w-10 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {submissionFile ? submissionFile.name : "Click to upload or drag and drop"}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      PDF, DOC, DOCX, ZIP (max 10MB)
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any comments or notes about your submission..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSubmitModal(false);
                    setSelectedAssignment(null);
                    setSubmissionFile(null);
                    setSubmissionNotes("");
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAssignment}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Submit
                </button>
              </div>
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
    <div className="grid grid-cols-7 gap-1 sm:gap-2">
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
          className={`min-h-[80px] sm:min-h-[92px] rounded-lg border p-2 overflow-hidden ${c.inMonth
              ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              : "bg-gray-50 dark:bg-gray-800/50 border-gray-200/60 dark:border-gray-700/60 opacity-70"
            }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {c.dayNum}
            </div>
            {c.iso === todayISO() && (
              <span className="text-[10px] px-1 rounded bg-emerald-600 text-white">
                Today
              </span>
            )}
          </div>

          <div className="space-y-1">
            {c.events.slice(0, 2).map((ev) => (
              <div
                key={ev.event_id}
                className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-100 border border-emerald-100 dark:border-emerald-800 truncate"
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