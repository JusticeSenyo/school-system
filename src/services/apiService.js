// API Service Layer for School SaaS
// Connects to Oracle Cloud Database APIs

const API_BASE = 'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/school/api/v1';

class ApiService {
  constructor() {
    this.baseURL = API_BASE;
    this.token = localStorage.getItem('token');
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.token ? `Bearer ${this.token}` : '',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Authentication Methods
  async login(email, password) {
    return this.request(`/auth/login/?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, {
      method: 'GET',
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // Student Management
  async getStudents(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/students?${queryParams}`);
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
    return this.request(`/students/${studentId}`, {
      method: 'DELETE',
    });
  }

  // Teacher Management
  async getTeachers(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/teachers?${queryParams}`);
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

  // Course Management
  async getCourses(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/courses?${queryParams}`);
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

  // Assignment Management
  async getAssignments(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/assignments?${queryParams}`);
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

  // Grading System
  async getGrades(studentId, filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/students/${studentId}/grades?${queryParams}`);
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

  // Attendance Management
  async getAttendance(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/attendance?${queryParams}`);
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
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/students/${studentId}/attendance?${queryParams}`);
  }

  // Schedule Management
  async getSchedule(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/schedule?${queryParams}`);
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

  // Financial Management
  async getFinancialRecords(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/finance?${queryParams}`);
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

  // Notifications
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
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  // File Management
  async uploadFile(file, type = 'general') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.request('/files/upload', {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData, let browser set it
        'Authorization': this.token ? `Bearer ${this.token}` : '',
      },
      body: formData,
    });
  }

  async getFile(fileId) {
    return this.request(`/files/${fileId}`);
  }

  async deleteFile(fileId) {
    return this.request(`/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  // Reports and Analytics
  async getAnalytics(type, filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/analytics/${type}?${queryParams}`);
  }

  async generateReport(reportType, filters = {}) {
    return this.request('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ type: reportType, filters }),
    });
  }

  async getReports(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/reports?${queryParams}`);
  }

  // Communication
  async getMessages(userId, filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/users/${userId}/messages?${queryParams}`);
  }

  async sendMessage(messageData) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async getAnnouncements(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/announcements?${queryParams}`);
  }

  async createAnnouncement(announcementData) {
    return this.request('/announcements', {
      method: 'POST',
      body: JSON.stringify(announcementData),
    });
  }

  // Library Management
  async getBooks(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/library/books?${queryParams}`);
  }

  async borrowBook(bookId, studentId) {
    return this.request('/library/borrow', {
      method: 'POST',
      body: JSON.stringify({ bookId, studentId }),
    });
  }

  async returnBook(borrowId) {
    return this.request(`/library/return/${borrowId}`, {
      method: 'PUT',
    });
  }

  // Exam Management
  async getExams(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/exams?${queryParams}`);
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

  // Parent Portal
  async getParentStudents(parentId) {
    return this.request(`/parents/${parentId}/students`);
  }

  async getParentNotifications(parentId) {
    return this.request(`/parents/${parentId}/notifications`);
  }

  // Dashboard Data
  async getDashboardData(userType, userId) {
    return this.request(`/dashboard/${userType}/${userId}`);
  }

  // Update token after login
  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  // Clear token on logout
  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }
}

// Create a singleton instance
const apiService = new ApiService();

export default apiService;