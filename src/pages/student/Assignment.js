import React, { useEffect, useState } from "react";
import DashboardLayout from "./../../components/dashboard/DashboardLayout";
import {
  ClipboardList,
  Calendar,
  Award,
  RefreshCw,
  Upload,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  User,
  Download,
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
  STUDENT_ASSIGNMENTS: `${HOST}/assignment/get/student_assignments/`, // ?p_student_id&p_status
  ASSIGNMENT_SUBMIT: `${HOST}/assignment/submit/`, // POST with assignment_id, student_id, file
  ASSIGNMENT_HISTORY: `${HOST}/assignment/get/submissions/`, // ?p_student_id
  ASSIGNMENT_DOWNLOAD: `${HOST}/assignment/download/`, // ?p_assignment_id
};

/* ------------ DUMMY DATA ------------ */
const DUMMY_ASSIGNMENTS = [
  {
    assignment_id: "ASG001",
    title: "Calculus Problem Set",
    subject: "Mathematics",
    teacher: "Mr. Smith",
    due_date: "2024-10-30",
    assigned_date: "2024-10-15",
    status: "pending",
    total_marks: 50,
    description: "Complete problems 1-20 from Chapter 5. Show all your work and provide clear explanations for each solution.",
    has_attachment: true,
    attachment_name: "calculus_problems.pdf",
  },
  {
    assignment_id: "ASG002",
    title: "Lab Report - Pendulum Motion",
    subject: "Physics",
    teacher: "Dr. Brown",
    due_date: "2024-11-02",
    assigned_date: "2024-10-18",
    status: "pending",
    total_marks: 30,
    description: "Write a detailed lab report on the pendulum motion experiment conducted in class. Include hypothesis, methodology, observations, and conclusions.",
    has_attachment: true,
    attachment_name: "lab_guidelines.pdf",
  },
  {
    assignment_id: "ASG003",
    title: "Essay - Shakespeare Analysis",
    subject: "English",
    teacher: "Ms. Johnson",
    due_date: "2024-10-26",
    assigned_date: "2024-10-10",
    status: "submitted",
    total_marks: 40,
    submitted_date: "2024-10-25",
    grade: 35,
    feedback: "Excellent analysis of the themes. Well-structured essay with good supporting evidence.",
    description: "Analyze the major themes in Shakespeare's Hamlet. Your essay should be 1500-2000 words.",
  },
  {
    assignment_id: "ASG004",
    title: "Chemical Equations Worksheet",
    subject: "Chemistry",
    teacher: "Mrs. Davis",
    due_date: "2024-10-25",
    assigned_date: "2024-10-12",
    status: "overdue",
    total_marks: 25,
    description: "Balance the chemical equations provided in the worksheet and identify the type of reaction for each.",
    has_attachment: true,
    attachment_name: "equations_worksheet.pdf",
  },
  {
    assignment_id: "ASG005",
    title: "Cell Structure Diagram",
    subject: "Biology",
    teacher: "Mr. Wilson",
    due_date: "2024-10-20",
    assigned_date: "2024-10-05",
    status: "submitted",
    total_marks: 20,
    submitted_date: "2024-10-19",
    grade: 18,
    feedback: "Great attention to detail. Minor labeling errors on mitochondria.",
    description: "Create a detailed labeled diagram of a plant cell showing all major organelles.",
  },
  {
    assignment_id: "ASG006",
    title: "World War II Research Paper",
    subject: "History",
    teacher: "Ms. Taylor",
    due_date: "2024-11-05",
    assigned_date: "2024-10-20",
    status: "pending",
    total_marks: 60,
    description: "Research and write a comprehensive paper on a specific aspect of World War II. Minimum 3000 words with proper citations.",
    has_attachment: false,
  },
];

export default function Assignments() {
  const { user, token } = useAuth() || {};
  const studentId = user?.id ?? user?.user_id ?? user?.student_id ?? user?.STUDENT_ID ?? null;

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [assignments, setAssignments] = useState(DUMMY_ASSIGNMENTS);
  const [filterStatus, setFilterStatus] = useState("all"); // all, pending, submitted, overdue

  // Assignment submission modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Assignment details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsAssignment, setDetailsAssignment] = useState(null);

  /* ---- Load Data Function ---- */
  const loadAssignmentData = async () => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // TODO: Uncomment and implement actual API call
      // const statusParam = filterStatus === 'all' ? '' : filterStatus;
      // const response = await fetch(`${API_ENDPOINTS.STUDENT_ASSIGNMENTS}?p_student_id=${studentId}&p_status=${statusParam}`);
      // const data = await response.json();
      // setAssignments(data.items || []);

      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error("Error loading assignment data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!submissionFile) {
      alert("Please select a file to submit");
      return;
    }

    setSubmitting(true);
    try {
      // TODO: Implement API call to submit assignment
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

      // Simulate submission
      await new Promise((resolve) => setTimeout(resolve, 1500));

      alert("Assignment submitted successfully!");
      setShowSubmitModal(false);
      setSelectedAssignment(null);
      setSubmissionFile(null);
      setSubmissionNotes("");
      loadAssignmentData(); // Refresh data
    } catch (error) {
      alert("Error submitting assignment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadAttachment = (assignment) => {
    // TODO: Implement API call to download attachment
    // window.open(`${API_ENDPOINTS.ASSIGNMENT_DOWNLOAD}?p_assignment_id=${assignment.assignment_id}`, '_blank');

    alert(`Downloading: ${assignment.attachment_name}\nThis will trigger the actual download in production.`);
  };

  const doFullRefresh = async () => {
    setRefreshing(true);
    await loadAssignmentData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadAssignmentData();
  }, [filterStatus]);

  // Filter assignments based on selected status
  const filteredAssignments = filterStatus === "all"
    ? assignments
    : assignments.filter(assignment => {
      if (filterStatus === "overdue") {
        return new Date(assignment.due_date) < new Date() && assignment.status === "pending";
      }
      return assignment.status === filterStatus;
    });

  // Calculate stats
  const pendingCount = assignments.filter(a => a.status === "pending").length;
  const submittedCount = assignments.filter(a => a.status === "submitted").length;
  const overdueCount = assignments.filter(a =>
    new Date(a.due_date) < new Date() && a.status === "pending"
  ).length;

  const getDaysUntilDue = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusBadge = (assignment) => {
    const isOverdue = new Date(assignment.due_date) < new Date() && assignment.status === "pending";

    if (isOverdue) {
      return { text: "Overdue", className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" };
    }
    if (assignment.status === "submitted") {
      return { text: "Submitted", className: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" };
    }
    return { text: "Pending", className: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" };
  };

  return (
    <DashboardLayout title="Assignments">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl mb-6 shadow-lg border border-green-200/40 dark:border-green-900/30">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-700" />
        <div className="absolute -top-10 -right-8 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

        <div className="relative p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-6 w-6" />
              <div>
                <h2 className="text-2xl font-bold">My Assignments</h2>
                <p className="text-green-100 text-sm mt-1">
                  View, submit, and track your assignments
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
            <div className="text-xs text-green-100/90 mt-3">
              Last updated: {lastUpdated}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {pendingCount}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Pending Assignments
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {submittedCount}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Submitted
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {overdueCount}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Overdue
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 overflow-x-auto">
          {[
            { id: "all", label: "All Assignments" },
            { id: "pending", label: "Pending" },
            { id: "submitted", label: "Submitted" },
            { id: "overdue", label: "Overdue" },
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

      {/* Assignments List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-green-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Loading assignments...</p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-12 text-center">
          <ClipboardList className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No assignments found
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {filterStatus === "all"
              ? "You don't have any assignments at the moment."
              : `No ${filterStatus} assignments available.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => {
            const isOverdue = new Date(assignment.due_date) < new Date() && assignment.status === "pending";
            const daysUntilDue = getDaysUntilDue(assignment.due_date);
            const statusBadge = getStatusBadge(assignment);

            return (
              <div
                key={assignment.assignment_id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow border overflow-hidden hover:shadow-lg transition-shadow ${isOverdue
                    ? "border-red-300 dark:border-red-700"
                    : "border-gray-100 dark:border-gray-700"
                  }`}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                        {assignment.title}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>{assignment.subject}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {assignment.teacher}
                        </span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-3 ${statusBadge.className}`}>
                      {statusBadge.text}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
                    {assignment.description}
                  </p>

                  {/* Details */}
                  <div className="flex flex-wrap gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Award className="h-4 w-4 flex-shrink-0" />
                      <span>{assignment.total_marks} marks</span>
                    </div>
                    {assignment.status === "pending" && !isOverdue && daysUntilDue >= 0 && (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>{daysUntilDue === 0 ? "Due today" : `${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''} left`}</span>
                      </div>
                    )}
                    {isOverdue && (
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>{Math.abs(daysUntilDue)} day{Math.abs(daysUntilDue) > 1 ? 's' : ''} overdue</span>
                      </div>
                    )}
                  </div>

                  {/* Attachment */}
                  {assignment.has_attachment && (
                    <div className="mb-4">
                      <button
                        onClick={() => handleDownloadAttachment(assignment)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        {assignment.attachment_name}
                      </button>
                    </div>
                  )}

                  {/* Submission Info or Actions */}
                  {assignment.status === "submitted" ? (
                    <div className="space-y-3">
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-green-700 dark:text-green-300 font-medium">
                            Submitted on {new Date(assignment.submitted_date).toLocaleDateString()}
                          </span>
                          {assignment.grade !== undefined && (
                            <span className="font-semibold text-green-700 dark:text-green-300">
                              Grade: {assignment.grade}/{assignment.total_marks}
                            </span>
                          )}
                        </div>
                        {assignment.feedback && (
                          <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                            <span className="font-medium">Feedback:</span> {assignment.feedback}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setDetailsAssignment(assignment);
                          setShowDetailsModal(true);
                        }}
                        className="text-sm text-green-600 dark:text-green-400 hover:underline"
                      >
                        View Details
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setDetailsAssignment(assignment);
                          setShowDetailsModal(true);
                        }}
                        className="flex-1 py-2.5 rounded-lg font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setShowSubmitModal(true);
                        }}
                          className="flex-1 py-2.5 rounded-lg font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center justify-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Submit Assignment
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Assignment Modal */}
      {showSubmitModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
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

            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="font-medium text-gray-900 dark:text-white mb-2">
                {selectedAssignment.title}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>{selectedAssignment.subject} • {selectedAssignment.teacher}</div>
                <div>Due: {new Date(selectedAssignment.due_date).toLocaleDateString()}</div>
                <div>Total Marks: {selectedAssignment.total_marks}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload File *
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-green-500 dark:hover:border-green-500 transition-colors">
                  <input
                    type="file"
                    onChange={(e) => setSubmissionFile(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.zip,.rar"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-10 w-10 text-gray-400 mb-2" />
                    {submissionFile ? (
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{submissionFile.name}</span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {(submissionFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Click to upload or drag and drop
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          PDF, DOC, DOCX, ZIP (max 10MB)
                        </span>
                      </>
                    )}
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
                  rows={4}
                  placeholder="Add any comments or notes about your submission..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
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
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAssignment}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Submit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Details Modal */}
      {showDetailsModal && detailsAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assignment Details</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setDetailsAssignment(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Assignment Info */}
              <div>
                <h4 className="font-semibold text-xl text-gray-900 dark:text-white mb-2">
                  {detailsAssignment.title}
                </h4>
                <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {detailsAssignment.subject}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {detailsAssignment.teacher}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Description</h5>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {detailsAssignment.description}
                </p>
              </div>

              {/* Key Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Assigned Date</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(detailsAssignment.assigned_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Due Date</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(detailsAssignment.due_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Marks</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {detailsAssignment.total_marks}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {detailsAssignment.status}
                  </div>
                </div>
              </div>

              {/* Attachment */}
              {detailsAssignment.has_attachment && (
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">Attachment</h5>
                  <button
                    onClick={() => handleDownloadAttachment(detailsAssignment)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    {detailsAssignment.attachment_name}
                  </button>
                </div>
              )}

              {/* Submission Info */}
              {detailsAssignment.status === "submitted" && (
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">Submission Information</h5>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700 dark:text-green-300">
                        Submitted on {new Date(detailsAssignment.submitted_date).toLocaleDateString()}
                      </span>
                      {detailsAssignment.grade !== undefined && (
                        <span className="text-lg font-bold text-green-700 dark:text-green-300">
                          {detailsAssignment.grade}/{detailsAssignment.total_marks}
                        </span>
                      )}
                    </div>

                    {detailsAssignment.grade !== undefined && (
                      <div className="h-2 bg-green-200 dark:bg-green-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-600 dark:bg-green-500 rounded-full transition-all"
                          style={{ width: `${(detailsAssignment.grade / detailsAssignment.total_marks) * 100}%` }}
                        />
                      </div>
                    )}

                    {detailsAssignment.feedback && (
                      <div className="pt-3 border-t border-green-200 dark:border-green-800">
                        <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                          Teacher's Feedback
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {detailsAssignment.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setDetailsAssignment(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Close
                </button>
                {detailsAssignment.status !== "submitted" && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedAssignment(detailsAssignment);
                      setShowSubmitModal(true);
                    }}
                    className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Submit Assignment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}