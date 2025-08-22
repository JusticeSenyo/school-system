// API Service Layer for School SaaS
// Connects to Oracle Cloud Database APIs

export const API_BASE =
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/school/api/v1';

class ApiService {
  constructor() {
    this.baseURL = API_BASE;
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }

  clearToken() {
    this.setToken(null);
  }

  // Ensure we always pick up the freshest token (e.g., updated by AuthContext)
  getAuthHeader() {
    const latest = localStorage.getItem('token') || this.token;
    if (latest && latest !== this.token) this.token = latest;
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const isFormData = options.body instanceof FormData;
    const baseHeaders = isFormData
      ? { ...this.getAuthHeader(), ...(options.headers || {}) }
      : {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(),
          ...(options.headers || {}),
        };

    const config = {
      method: options.method || 'GET',
      ...options,
      headers: baseHeaders,
    };

    // Fetch
    const res = await fetch(url, config);

    // Try to parse JSON even on non-2xx
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const message =
        (data && (data.message || data.error)) ||
        `HTTP error! status: ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      err.body = data;
      throw err;
    }

    return data;
  }

  // ------------- Auth -------------

  // UPDATED: use staff login endpoint
  async login(email, password) {
    // ORDS GET with query params (as you’ve been using)
    return this.request(
      `/auth/login/staff/?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      { method: 'GET' }
    );
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // ---------- Staff (NEW) ----------

  // GET /staff?role=AD&status=ACTIVE&search=kwame
  async getStaff(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).length) params.append(k, v);
    });
    const qs = params.toString();
    return this.request(`/staff${qs ? `?${qs}` : ''}`);
  }

  // GET /staff/:id
  async getStaffById(userId) {
    return this.request(`/staff/${encodeURIComponent(userId)}`);
  }

  // POST /add/staff/
  // payload: { creator_user_id, full_name, email, password, role, status }
  async addStaff(payload) {
    return this.request('/add/staff/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // PUT /staff/:id
  // data can include { full_name, email, role, status }
  async updateStaff(userId, data) {
    return this.request(`/staff/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // -------- Students --------

  async getStudents(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.request(`/students${qs ? `?${qs}` : ''}`);
  }

  async getStudent(studentId) {
    return this.request(`/students/${studentId}`);
  }

  async createStudent(studentData) {
    return this.request('/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  }

  async updateStudent(studentId, studentData) {
    return this.request(`/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    });
  }

  async deleteStudent(studentId) {
    return this.request(`/students/${studentId}`, { method: 'DELETE' });
  }

  // -------- Teachers --------

  async getTeachers(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.request(`/teachers${qs ? `?${qs}` : ''}`);
  }

  async getTeacher(teacherId) {
    return this.request(`/teachers/${teacherId}`);
  }

  async createTeacher(teacherData) {
    return this.request('/teachers', {
      method: 'POST',
      body: JSON.stringify(teacherData),
    });
  }

  async updateTeacher(teacherId, teacherData) {
    return this.request(`/teachers/${teacherId}`, {
      method: 'PUT',
      body: JSON.stringify(teacherData),
    });
  }

  // -------- Courses --------

  async getCourses(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.request(`/courses${qs ? `?${qs}` : ''}`);
  }

  async getCourse(courseId) {
    return this.request(`/courses/${courseId}`);
  }

  async createCourse(courseData) {
    return this.request('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  }

  async updateCourse(courseId, courseData) {
    return this.request(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  }

  async getCourseStudents(courseId) {
    return this.request(`/courses/${courseId}/students`);
  }

  async enrollStudent(courseId, studentId) {
    return this.request(`/courses/${courseId}/students`, {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    });
  }

  // -------- Assignments --------

  async getAssignments(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.request(`/assignments${qs ? `?${qs}` : ''}`);
  }

  async getAssignment(assignmentId) {
    return this.request(`/assignments/${assignmentId}`);
  }

  async createAssignment(assignmentData) {
    return this.request('/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  async updateAssignment(assignmentId, assignmentData) {
    return this.request(`/assignments/${assignmentId}`, {
      method: 'PUT',
      body: JSON.stringify(assignmentData),
    });
  }

  async getAssignmentSubmissions(assignmentId) {
    return this.request(`/assignments/${assignmentId}/submissions`);
  }

  async submitAssignment(assignmentId, submissionData) {
    return this.request(`/assignments/${assignmentId}/submissions`, {
      method: 'POST',
      body: JSON.stringify(submissionData),
    });
  }

  // -------- Grades --------

  async getGrades(studentId, filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.request(`/students/${studentId}/grades${qs ? `?${qs}` : ''}`);
  }

  async createGrade(gradeData) {
    return this.request('/grades', {
      method: 'POST',
      body: JSON.stringify(gradeData),
    });
  }

  async updateGrade(gradeId, gradeData) {
    return this.request(`/grades/${gradeId}`, {
      method: 'PUT',
      body: JSON.stringify(gradeData),
    });
  }

  async getGradeBook(courseId) {
    return this.request(`/courses/${courseId}/gradebook`);
  }

  // ------ Attendance ------

  async getAttendance(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.request(`/attendance${qs ? `?${qs}` : ''}`);
  }

  async recordAttendance(attendanceData) {
    return this.request('/attendance', {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    });
  }

  async updateAttendance(attendanceId, attendanceData) {
    return this.request(`/attendance/${attendanceId}`, {
      method: 'PUT',
      body: JSON.stringify(attendanceData),
    });
  }

  async getStudentAttendance(studentId, filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.request(`/students/${studentId}/attendance${qs ? `?${qs}` : ''}`);
  }

  // -------- Schedule --------

  async getSchedule(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.request(`/schedule${qs ? `?${qs}` : ''}`);
  }

  async createSchedule(scheduleData) {
    return this.request('/schedule', {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    });
  }

  async updateSchedule(scheduleId, scheduleData) {
    return this.request(`/schedule/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(scheduleData),
    });
  }

  // -------- Finance --------

  async getFinancialRecords(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.request(`/finance${qs ? `?${qs}` : ''}`);
  }

  async createPayment(paymentData) {
    return this.request('/finance/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async getStudentFinances(studentId) {
    return this.request(`/students/${studentId}/finances`);
  }

  async createInvoice(invoiceData) {
    return this.request('/finance/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  }

  // ------ Notifications ------

  async getNotifications(userId) {
    return this.request(`/users/${userId}/notifications`);
  }

  async createNotification(notificationData) {
    return this.request('/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  }

  async markNotificationRead(notificationId) {
    return this.request(`/notifications/${notificationId}/read`, { method: 'PUT' });
  }

  // -------- Files --------

  async uploadFile(file, type = 'general') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.request('/files/upload', {
      method: 'POST',
      // Do not set Content-Type here; browser sets boundary
      headers: { ...this.getAuthHeader() },
      body: formData,
    });
  }

  async getFile(fileId) {
    return this.request(`/files/${fileId}`);
  }

  async deleteFile(fileId) {
    return this.request(`/files/${fileId}`, { method: 'DELETE' });
  }

  // ------ Reports / Analytics ------

  async getAnalytics(type, filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.request(`/analytics/${type}${qs ? `?${qs}` : ''}`);
  }

  async generateReport(reportType, filters = {}) {
    return this.request('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ type: reportType, filters }),
    });
  }

  async getReports(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.request(`/reports${qs ? `?${qs}` : ''}`);
  }

  // ------ Comms ------

  async getMessages(userId, filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.request(`/users/${userId}/messages${qs ? `?${qs}` : ''}`);
  }

  async sendMessage(messageData) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async getAnnouncements(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.request(`/announcements${qs ? `?${qs}` : ''}`);
  }

  async createAnnouncement(announcementData) {
    return this.request('/announcements', {
      method: 'POST',
      body: JSON.stringify(announcementData),
    });
  }

  // ------ Library ------

  async getBooks(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.request(`/library/books${qs ? `?${qs}` : ''}`);
  }

  async borrowBook(bookId, studentId) {
    return this.request('/library/borrow', {
      method: 'POST',
      body: JSON.stringify({ bookId, studentId }),
    });
  }

  async returnBook(borrowId) {
    return this.request(`/library/return/${borrowId}`, { method: 'PUT' });
  }

  // ------ Exams ------

  async getExams(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.request(`/exams${qs ? `?${qs}` : ''}`);
  }

  async createExam(examData) {
    return this.request('/exams', {
      method: 'POST',
      body: JSON.stringify(examData),
    });
  }

  async scheduleExam(examId, scheduleData) {
    return this.request(`/exams/${examId}/schedule`, {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    });
  }

  // ------ Parent Portal ------

  async getParentStudents(parentId) {
    return this.request(`/parents/${parentId}/students`);
  }

  async getParentNotifications(parentId) {
    return this.request(`/parents/${parentId}/notifications`);
  }

  // ------ Dashboard ------

  async getDashboardData(userType, userId) {
    return this.request(`/dashboard/${userType}/${userId}`);
  }
}

// Singleton
const apiService = new ApiService();
export default apiService;
