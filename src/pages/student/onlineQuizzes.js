import React, { useEffect, useState } from "react";
import DashboardLayout from "./../../components/dashboard/DashboardLayout";
import {
  FileText,
  Clock,
  Calendar,
  Award,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
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
  },
  token: "mock-token",
});

/* ------------ ORDS base ------------ */
const HOST =
  "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

/* ------------ API Endpoints ------------ */
const API_ENDPOINTS = {
  STUDENT_EXAMS: `${HOST}/exam/get/student_exams/`, // ?p_student_id&p_status (upcoming/active/completed)
  EXAM_START: `${HOST}/exam/start/`, // POST with exam_id, student_id
  EXAM_SUBMIT: `${HOST}/exam/submit/`, // POST with exam_id, student_id, answers
};

/* ------------ DUMMY DATA ------------ */
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
    description: "Comprehensive exam covering chapters 1-5",
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
    description: "Essay writing and comprehension test",
  },
  {
    exam_id: "EX003",
    exam_name: "Physics Quiz",
    subject: "Physics",
    start_date: "2024-10-29",
    end_date: "2024-10-29",
    duration: 60,
    status: "active",
    total_marks: 50,
    description: "Quick assessment on mechanics and motion",
  },
  {
    exam_id: "EX004",
    exam_name: "Chemistry Lab Assessment",
    subject: "Chemistry",
    start_date: "2024-10-20",
    end_date: "2024-10-20",
    duration: 90,
    status: "completed",
    total_marks: 80,
    score: 72,
    description: "Practical chemistry assessment",
  },
  {
    exam_id: "EX005",
    exam_name: "Biology Final Exam",
    subject: "Biology",
    start_date: "2024-10-15",
    end_date: "2024-10-15",
    duration: 150,
    status: "completed",
    total_marks: 100,
    score: 88,
    description: "Comprehensive biology examination",
  },
];

export default function OnlineExams() {
  const { user, token } = useAuth() || {};
  const studentId = user?.id ?? user?.user_id ?? user?.student_id ?? user?.STUDENT_ID ?? null;

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [onlineExams, setOnlineExams] = useState(DUMMY_ONLINE_EXAMS);
  const [filterStatus, setFilterStatus] = useState("all"); // all, upcoming, active, completed

  /* ---- Load Data Function ---- */
  const loadExamData = async () => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // TODO: Uncomment and implement actual API call
      // const response = await fetch(`${API_ENDPOINTS.STUDENT_EXAMS}?p_student_id=${studentId}&p_status=${filterStatus}`);
      // const data = await response.json();
      // setOnlineExams(data.items || []);

      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error("Error loading exam data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (exam) => {
    // TODO: Implement navigation to exam page or API call to start exam
    console.log("Starting exam:", exam.exam_id);
    alert(`Starting exam: ${exam.exam_name}\nThis will navigate to the exam interface.`);

    // Example API call structure:
    // const response = await fetch(API_ENDPOINTS.EXAM_START, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ exam_id: exam.exam_id, student_id: studentId })
    // });
  };

  const doFullRefresh = async () => {
    setRefreshing(true);
    await loadExamData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadExamData();
  }, [filterStatus]);

  // Filter exams based on selected status
  const filteredExams = filterStatus === "all"
    ? onlineExams
    : onlineExams.filter(exam => exam.status === filterStatus);

  // Group exams by status
  const upcomingExams = onlineExams.filter(e => e.status === "upcoming");
  const activeExams = onlineExams.filter(e => e.status === "active");
  const completedExams = onlineExams.filter(e => e.status === "completed");

  const getStatusBadge = (status) => {
    const styles = {
      upcoming: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      active: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      completed: "bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
    };
    return styles[status] || styles.upcoming;
  };

  return (
    <DashboardLayout title="Online Exams">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl mb-6 shadow-lg border border-purple-200/40 dark:border-purple-900/30">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-700" />
        <div className="absolute -top-10 -right-8 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

        <div className="relative p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6" />
              <div>
                <h2 className="text-2xl font-bold">Online Examinations</h2>
                <p className="text-purple-100 text-sm mt-1">
                  View and take your scheduled online exams
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
            <div className="text-xs text-purple-100/90 mt-3">
              Last updated: {lastUpdated}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {upcomingExams.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Upcoming Exams
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {activeExams.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Active Now
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/20">
              <CheckCircle2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {completedExams.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Completed
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 overflow-x-auto">
          {[
            { id: "all", label: "All Exams" },
            { id: "active", label: "Active" },
            { id: "upcoming", label: "Upcoming" },
            { id: "completed", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${filterStatus === tab.id
                  ? "border-green-600 text-green-600 dark:text-green-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Exams List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Loading exams...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No exams found
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {filterStatus === "all"
              ? "No exams scheduled at the moment."
              : `No ${filterStatus} exams available.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredExams.map((exam) => (
            <div
              key={exam.exam_id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                      {exam.exam_name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{exam.subject}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-3 ${getStatusBadge(exam.status)}`}>
                    {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                  </span>
                </div>

                {/* Description */}
                {exam.description && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    {exam.description}
                  </p>
                )}

                {/* Details */}
                <div className="space-y-2.5 mb-5">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span>Duration: {exam.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>Date: {new Date(exam.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Award className="h-4 w-4 flex-shrink-0" />
                    <span>Total Marks: {exam.total_marks}</span>
                  </div>
                </div>

                {/* Score (for completed exams) */}
                {exam.status === "completed" && exam.score !== undefined && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Your Score</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {exam.score}/{exam.total_marks}
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 dark:bg-purple-500 rounded-full transition-all"
                        style={{ width: `${(exam.score / exam.total_marks) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={() => handleStartExam(exam)}
                  disabled={exam.status !== "active"}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${exam.status === "active"
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : exam.status === "upcoming"
                        ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-default"
                    }`}
                >
                  {exam.status === "active"
                    ? "Start Exam"
                    : exam.status === "upcoming"
                      ? "Not Available Yet"
                      : "Completed"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}