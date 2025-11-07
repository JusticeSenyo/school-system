import React, { useEffect, useState } from "react";
import DashboardLayout from "./../../components/dashboard/DashboardLayout";

import {
  Users,
  RefreshCw,
  Mail,
  Phone,
  User,
  BookOpen,
  MapPin,
  Clock,
  MessageSquare,
  Video,
  Calendar,
  Search,
  Filter,
  XCircle,
  Send,
} from "lucide-react";

/* ------------ Mock Auth Context ------------ */
const useAuth = () => ({
  user: {
    id: "PAR001",
    user_id: "PAR001",
    parent_id: "PAR001",
    schoolId: "SCH001",
    school_id: "SCH001",
    name: "Jane Doe",
    student_id: "STU001", // For students
  },
  token: "mock-token",
});

/* ------------ ORDS base ------------ */
const HOST =
  "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

/* ------------ API Endpoints ------------ */
const API_ENDPOINTS = {
  TEACHERS: `${HOST}/staff/get/teachers/`, // ?p_school_id
  STUDENT_TEACHERS: `${HOST}/staff/get/student_teachers/`, // ?p_student_id
  SEND_MESSAGE: `${HOST}/comms/send/message/`, // POST
  SCHEDULE_MEETING: `${HOST}/comms/schedule/meeting/`, // POST
};

/* ------------ DUMMY DATA ------------ */
const DUMMY_TEACHERS = [
  {
    teacher_id: "TCH001",
    name: "Mr. John Smith",
    subject: "Mathematics",
    email: "j.smith@school.com",
    phone: "+233 24 111 1111",
    office: "Room 101",
    department: "Mathematics",
    office_hours: "Mon-Fri, 2:00 PM - 4:00 PM",
    profile_image: null,
    specialization: "Calculus & Algebra",
    years_experience: 12,
    qualifications: "MSc Mathematics, BSc Mathematics Education",
  },
  {
    teacher_id: "TCH002",
    name: "Ms. Sarah Johnson",
    subject: "English Language & Literature",
    email: "s.johnson@school.com",
    phone: "+233 24 222 2222",
    office: "Room 102",
    department: "Languages",
    office_hours: "Mon-Fri, 1:00 PM - 3:00 PM",
    profile_image: null,
    specialization: "Creative Writing & Literature Analysis",
    years_experience: 8,
    qualifications: "MA English Literature, BA English",
  },
  {
    teacher_id: "TCH003",
    name: "Dr. Michael Brown",
    subject: "Physics",
    email: "m.brown@school.com",
    phone: "+233 24 333 3333",
    office: "Lab 1",
    department: "Sciences",
    office_hours: "Tue-Thu, 3:00 PM - 5:00 PM",
    profile_image: null,
    specialization: "Quantum Physics & Mechanics",
    years_experience: 15,
    qualifications: "PhD Physics, MSc Applied Physics",
  },
  {
    teacher_id: "TCH004",
    name: "Mrs. Emily Davis",
    subject: "Chemistry",
    email: "e.davis@school.com",
    phone: "+233 24 444 4444",
    office: "Lab 2",
    department: "Sciences",
    office_hours: "Mon-Wed, 2:30 PM - 4:30 PM",
    profile_image: null,
    specialization: "Organic Chemistry",
    years_experience: 10,
    qualifications: "MSc Chemistry, BSc Chemistry",
  },
  {
    teacher_id: "TCH005",
    name: "Mr. David Wilson",
    subject: "Biology",
    email: "d.wilson@school.com",
    phone: "+233 24 555 5555",
    office: "Lab 3",
    department: "Sciences",
    office_hours: "Mon-Fri, 1:30 PM - 3:30 PM",
    profile_image: null,
    specialization: "Molecular Biology & Genetics",
    years_experience: 11,
    qualifications: "MSc Biology, BSc Biological Sciences",
  },
  {
    teacher_id: "TCH006",
    name: "Ms. Lisa Taylor",
    subject: "History",
    email: "l.taylor@school.com",
    phone: "+233 24 666 6666",
    office: "Room 201",
    department: "Humanities",
    office_hours: "Tue-Thu, 2:00 PM - 4:00 PM",
    profile_image: null,
    specialization: "World History & African History",
    years_experience: 9,
    qualifications: "MA History, BA History & Politics",
  },
  {
    teacher_id: "TCH007",
    name: "Mr. Robert Anderson",
    subject: "Computer Science",
    email: "r.anderson@school.com",
    phone: "+233 24 777 7777",
    office: "Computer Lab",
    department: "Technology",
    office_hours: "Mon-Fri, 3:00 PM - 5:00 PM",
    profile_image: null,
    specialization: "Programming & Software Development",
    years_experience: 7,
    qualifications: "MSc Computer Science, BSc IT",
  },
  {
    teacher_id: "TCH008",
    name: "Mrs. Patricia Martinez",
    subject: "French",
    email: "p.martinez@school.com",
    phone: "+233 24 888 8888",
    office: "Room 105",
    department: "Languages",
    office_hours: "Mon-Wed-Fri, 1:00 PM - 3:00 PM",
    profile_image: null,
    specialization: "French Language & Culture",
    years_experience: 13,
    qualifications: "MA French Studies, BA French Language",
  },
];

const DUMMY_DEPARTMENTS = [
  "All Departments",
  "Mathematics",
  "Sciences",
  "Languages",
  "Humanities",
  "Technology",
];

export default function TeachersContacts() {
  const { user, token } = useAuth() || {};
  const schoolId = user?.schoolId ?? user?.school_id ?? null;

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [teachers, setTeachers] = useState(DUMMY_TEACHERS);

  // UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments");
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  // Message form
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);

  // Meeting form
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingPurpose, setMeetingPurpose] = useState("");
  const [scheduling, setScheduling] = useState(false);

  /* ---- Load Data Function ---- */
  const loadTeacherData = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // TODO: Uncomment and implement actual API call
      // const response = await fetch(`${API_ENDPOINTS.TEACHERS}?p_school_id=${schoolId}`);
      // const data = await response.json();
      // setTeachers(data.items || []);

      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error("Error loading teacher data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageBody.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setSending(true);
    try {
      // TODO: Implement API call to send message
      // const response = await fetch(API_ENDPOINTS.SEND_MESSAGE, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     teacher_id: selectedTeacher.teacher_id,
      //     sender_id: user.id,
      //     subject: messageSubject,
      //     body: messageBody
      //   })
      // });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert("Message sent successfully!");
      setShowMessageModal(false);
      setMessageSubject("");
      setMessageBody("");
      setSelectedTeacher(null);
    } catch (error) {
      alert("Error sending message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!meetingDate || !meetingTime || !meetingPurpose.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setScheduling(true);
    try {
      // TODO: Implement API call to schedule meeting
      // const response = await fetch(API_ENDPOINTS.SCHEDULE_MEETING, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     teacher_id: selectedTeacher.teacher_id,
      //     parent_id: user.id,
      //     meeting_date: meetingDate,
      //     meeting_time: meetingTime,
      //     purpose: meetingPurpose
      //   })
      // });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert("Meeting request sent successfully!");
      setShowMeetingModal(false);
      setMeetingDate("");
      setMeetingTime("");
      setMeetingPurpose("");
      setSelectedTeacher(null);
    } catch (error) {
      alert("Error scheduling meeting. Please try again.");
    } finally {
      setScheduling(false);
    }
  };

  const doFullRefresh = async () => {
    setRefreshing(true);
    await loadTeacherData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadTeacherData();
  }, []);

  // Filter teachers
  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment =
      selectedDepartment === "All Departments" ||
      teacher.department === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  // Group by department
  const teachersByDepartment = filteredTeachers.reduce((acc, teacher) => {
    if (!acc[teacher.department]) {
      acc[teacher.department] = [];
    }
    acc[teacher.department].push(teacher);
    return acc;
  }, {});

  return (
    <DashboardLayout title="Teacher Contacts">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl mb-6 shadow-lg border border-teal-200/40 dark:border-teal-900/30">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-700" />
        <div className="absolute -top-10 -right-8 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

        <div className="relative p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6" />
              <div>
                <h2 className="text-2xl font-bold">Teachers & Contacts</h2>
                <p className="text-teal-100 text-sm mt-1">
                  Connect with your teachers and schedule meetings
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
            <div className="text-xs text-teal-100/90 mt-3">
              Last updated: {lastUpdated}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20">
              <Users className="h-5 w-5 text-green-600 dark:text-teal-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {teachers.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total Teachers
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-900/20">
              <BookOpen className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {Object.keys(teachersByDepartment).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Departments
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            24/7
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Available Support
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, subject, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Department Filter */}
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none appearance-none"
            >
              {DUMMY_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Teachers List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Loading teachers...</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-12 text-center">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No teachers found
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(teachersByDepartment).map(([department, deptTeachers]) => (
            <div key={department}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                {department} Department ({deptTeachers.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deptTeachers.map((teacher) => (
                  <div
                    key={teacher.teacher_id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow overflow-hidden"
                  >
                    <div className="p-5">
                      {/* Teacher Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 rounded-full bg-teal-50 dark:bg-teal-900/20 flex-shrink-0">
                          <User className="h-8 w-8 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                            {teacher.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {teacher.subject}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {teacher.years_experience} years experience
                          </p>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2 mb-4">
                        <a
                          href={`mailto:${teacher.email}`}
                          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                        >
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{teacher.email}</span>
                        </a>
                        <a
                          href={`tel:${teacher.phone}`}
                          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                        >
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span>{teacher.phone}</span>
                        </a>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span>{teacher.office}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs">{teacher.office_hours}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedTeacher(teacher);
                            setShowMessageModal(true);
                          }}
                          className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTeacher(teacher);
                            setShowMeetingModal(true);
                          }}
                          className="flex-1 py-2 px-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Calendar className="h-4 w-4" />
                          Meet
                        </button>
                      </div>

                      {/* View Details */}
                      <button
                        onClick={() => {
                          setSelectedTeacher(teacher);
                          setShowDetailsModal(true);
                        }}
                        className="w-full mt-3 text-sm text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        View Full Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Teacher Details Modal */}
      {showDetailsModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Teacher Profile</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedTeacher(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="p-4 rounded-full bg-teal-50 dark:bg-teal-900/20">
                  <User className="h-12 w-12 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    {selectedTeacher.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {selectedTeacher.subject}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs rounded-full">
                      {selectedTeacher.department}
                    </span>
                    <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                      {selectedTeacher.years_experience} years exp.
                    </span>
                  </div>
                </div>
              </div>

              {/* Specialization */}
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Specialization</h5>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedTeacher.specialization}
                </p>
              </div>

              {/* Qualifications */}
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Qualifications</h5>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedTeacher.qualifications}
                </p>
              </div>

              {/* Contact Information */}
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-3">Contact Information</h5>
                <div className="space-y-3">
                  <a
                    href={`mailto:${selectedTeacher.email}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Mail className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    <span className="text-sm text-gray-900 dark:text-white">{selectedTeacher.email}</span>
                  </a>
                  <a
                    href={`tel:${selectedTeacher.phone}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Phone className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    <span className="text-sm text-gray-900 dark:text-white">{selectedTeacher.phone}</span>
                  </a>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <MapPin className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    <span className="text-sm text-gray-900 dark:text-white">{selectedTeacher.office}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <Clock className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    <span className="text-sm text-gray-900 dark:text-white">{selectedTeacher.office_hours}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowMessageModal(true);
                  }}
                  className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Send Message
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowMeetingModal(true);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Schedule Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showMessageModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Send Message</h3>
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setSelectedTeacher(null);
                  setMessageSubject("");
                  setMessageBody("");
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-teal-50 dark:bg-teal-900/20">
                  <User className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedTeacher.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedTeacher.subject}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  placeholder="Enter message subject"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message *
                </label>
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  rows={6}
                  placeholder="Type your message here..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMessageModal(false);
                    setSelectedTeacher(null);
                    setMessageSubject("");
                    setMessageBody("");
                  }}
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showMeetingModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Schedule Meeting</h3>
              <button
                onClick={() => {
                  setShowMeetingModal(false);
                  setSelectedTeacher(null);
                  setMeetingDate("");
                  setMeetingTime("");
                  setMeetingPurpose("");
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-teal-50 dark:bg-teal-900/20">
                  <User className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedTeacher.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedTeacher.subject}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {selectedTeacher.office_hours}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Date *
                </label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Time *
                </label>
                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Purpose of Meeting *
                </label>
                <textarea
                  value={meetingPurpose}
                  onChange={(e) => setMeetingPurpose(e.target.value)}
                  rows={4}
                  placeholder="Briefly describe what you'd like to discuss..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> This is a meeting request. The teacher will confirm the availability and send you a confirmation.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMeetingModal(false);
                    setSelectedTeacher(null);
                    setMeetingDate("");
                    setMeetingTime("");
                    setMeetingPurpose("");
                  }}
                  disabled={scheduling}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleMeeting}
                  disabled={scheduling}
                  className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {scheduling ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4" />
                      Request Meeting
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