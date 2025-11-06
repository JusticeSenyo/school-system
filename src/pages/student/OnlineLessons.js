import React, { useEffect, useState } from "react";
import DashboardLayout from "./../../components/dashboard/DashboardLayout";
import {
  Video,
  Clock,
  Calendar,
  RefreshCw,
  ExternalLink,
  XCircle,
  User,
  AlertCircle,
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
  ONLINE_CLASSES: `${HOST}/class/get/online_classes/`, // ?p_student_id&p_date
  JOIN_CLASS_VALIDATE: `${HOST}/class/validate_link/`, // POST with class_link
};

/* ------------ DUMMY DATA ------------ */
const DUMMY_ONLINE_CLASSES = [
  {
    class_id: "CL001",
    subject: "Mathematics",
    teacher: "Mr. Smith",
    scheduled_time: "2024-10-29T10:00:00",
    duration: 60,
    status: "scheduled",
    has_link: true,
    meeting_link: "https://meet.google.com/abc-defg-hij",
    topic: "Calculus - Derivatives and Integration",
  },
  {
    class_id: "CL002",
    subject: "Physics",
    teacher: "Dr. Brown",
    scheduled_time: "2024-10-29T14:00:00",
    duration: 60,
    status: "scheduled",
    has_link: true,
    meeting_link: "https://zoom.us/j/123456789",
    topic: "Mechanics - Newton's Laws of Motion",
  },
  {
    class_id: "CL003",
    subject: "English",
    teacher: "Ms. Johnson",
    scheduled_time: "2024-10-30T09:00:00",
    duration: 45,
    status: "scheduled",
    has_link: false,
    topic: "Literature - Shakespeare's Sonnets",
  },
  {
    class_id: "CL004",
    subject: "Chemistry",
    teacher: "Mrs. Davis",
    scheduled_time: "2024-10-30T11:00:00",
    duration: 90,
    status: "scheduled",
    has_link: true,
    meeting_link: "https://meet.google.com/xyz-abcd-efg",
    topic: "Chemical Reactions and Equations",
  },
  {
    class_id: "CL005",
    subject: "Biology",
    teacher: "Mr. Wilson",
    scheduled_time: "2024-10-28T15:00:00",
    duration: 60,
    status: "completed",
    has_link: true,
    topic: "Cell Biology and Genetics",
  },
];

export default function OnlineClasses() {
  const { user, token } = useAuth() || {};
  const studentId = user?.id ?? user?.user_id ?? user?.student_id ?? user?.STUDENT_ID ?? null;

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [onlineClasses, setOnlineClasses] = useState(DUMMY_ONLINE_CLASSES);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Join class modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [classLink, setClassLink] = useState("");
  const [validatingLink, setValidatingLink] = useState(false);

  /* ---- Load Data Function ---- */
  const loadClassData = async () => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // TODO: Uncomment and implement actual API call
      // const response = await fetch(`${API_ENDPOINTS.ONLINE_CLASSES}?p_student_id=${studentId}&p_date=${selectedDate}`);
      // const data = await response.json();
      // setOnlineClasses(data.items || []);

      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error("Error loading class data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (cls) => {
    if (!cls.has_link || !cls.meeting_link) {
      alert("Meeting link is not available for this class yet.");
      return;
    }

    // Open the meeting link in a new window
    window.open(cls.meeting_link, "_blank");
  };

  const handleJoinWithLink = async () => {
    if (!classLink.trim()) {
      alert("Please enter a class link");
      return;
    }

    setValidatingLink(true);
    try {
      // TODO: Implement API call to validate link
      // const response = await fetch(API_ENDPOINTS.JOIN_CLASS_VALIDATE, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ class_link: classLink, student_id: studentId })
      // });
      // const data = await response.json();
      // if (data.valid) { ... }

      // Simulate validation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // If valid, open in new window
      window.open(classLink, "_blank");
      setShowJoinModal(false);
      setClassLink("");
    } catch (error) {
      alert("Invalid class link. Please check and try again.");
    } finally {
      setValidatingLink(false);
    }
  };

  const doFullRefresh = async () => {
    setRefreshing(true);
    await loadClassData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadClassData();
  }, [selectedDate]);

  // Filter classes by date and status
  const todayClasses = onlineClasses.filter(
    (cls) => cls.scheduled_time.slice(0, 10) === new Date().toISOString().slice(0, 10)
  );
  const upcomingClasses = onlineClasses.filter(
    (cls) => new Date(cls.scheduled_time) > new Date() && cls.status === "scheduled"
  );
  const completedClasses = onlineClasses.filter((cls) => cls.status === "completed");

  const getTimeUntil = (scheduledTime) => {
    const now = new Date();
    const classTime = new Date(scheduledTime);
    const diff = classTime - now;

    if (diff < 0) return "Started";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `In ${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) return `In ${hours}h ${minutes}m`;
    if (minutes > 0) return `In ${minutes}m`;
    return "Starting soon";
  };

  return (
    <DashboardLayout title="Online Classes">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl mb-6 shadow-lg border border-blue-200/40 dark:border-blue-900/30">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-700" />
        <div className="absolute -top-10 -right-8 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

        <div className="relative p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="h-6 w-6" />
              <div>
                <h2 className="text-2xl font-bold">Online Classes</h2>
                <p className="text-blue-100 text-sm mt-1">
                  Join your scheduled virtual classes or enter a meeting link
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowJoinModal(true)}
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors px-4 py-2 rounded-lg border border-white/20"
              >
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Join Class</span>
              </button>

              <button
                onClick={doFullRefresh}
                title="Refresh"
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors px-4 py-2 rounded-lg border border-white/20"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {!!lastUpdated && (
            <div className="text-xs text-blue-100/90 mt-3">
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
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {todayClasses.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Classes Today
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-900/20">
              <Clock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {upcomingClasses.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Upcoming Classes
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/20">
              <Video className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {completedClasses.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Completed
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="mb-6 flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Date:</span>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Classes List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Loading classes...</p>
        </div>
      ) : onlineClasses.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-12 text-center">
          <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No classes scheduled
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            There are no online classes scheduled for the selected date.
          </p>
          <button
            onClick={() => setShowJoinModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Video className="h-4 w-4" />
            Join with Link
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {onlineClasses.map((cls) => {
            const isToday = cls.scheduled_time.slice(0, 10) === new Date().toISOString().slice(0, 10);
            const isPast = new Date(cls.scheduled_time) < new Date();

            return (
              <div
                key={cls.class_id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow border overflow-hidden hover:shadow-lg transition-shadow ${isToday && !isPast
                    ? "border-blue-300 dark:border-blue-700"
                    : "border-gray-100 dark:border-gray-700"
                  }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                          {cls.subject}
                        </h4>
                        {isToday && !isPast && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {cls.topic}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <User className="h-4 w-4" />
                        <span>{cls.teacher}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-4">
                      {!isPast && (
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {getTimeUntil(cls.scheduled_time)}
                        </span>
                      )}
                      {isPast && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mb-5 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(cls.scheduled_time).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>Duration: {cls.duration} minutes</span>
                    </div>
                  </div>

                  {cls.has_link ? (
                    <button
                      onClick={() => handleJoinClass(cls)}
                      disabled={isPast}
                      className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isPast
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                    >
                      <Video className="h-4 w-4" />
                      {isPast ? "Class Ended" : "Join Class"}
                      {!isPast && <ExternalLink className="h-4 w-4" />}
                    </button>
                  ) : (
                    <div className="w-full py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Meeting link not available yet</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Join Online Class
              </h3>
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
              Enter the class meeting link provided by your teacher to join the online session.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meeting Link
                </label>
                <input
                  type="text"
                  value={classLink}
                  onChange={(e) => setClassLink(e.target.value)}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                  onClick={handleJoinWithLink}
                  disabled={validatingLink}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {validatingLink ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4" />
                      Join Class
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}