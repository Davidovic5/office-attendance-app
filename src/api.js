// API Service for Office Attendance App

const BASE_URL = '/api';

export const api = {
  // Branches
  async getBranches() {
    const res = await fetch(`${BASE_URL}/branches`);
    return res.json();
  },

  async updateBranch(id, data) {
    const res = await fetch(`${BASE_URL}/branches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Auth
  async login(phone, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, pin: password }),
    });
    return res.json();
  },

  async register(data) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateProfile(employeeId, profileData) {
    const res = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, ...profileData }),
    });
    return res.json();
  },

  async changePassword(employeeId, oldPassword, newPassword) {
    const res = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, oldPassword, newPassword }),
    });
    return res.json();
  },

  async deleteAccount(employeeId) {
    const res = await fetch(`${BASE_URL}/auth/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId }),
    });
    return res.json();
  },

  // Monthly Reports & Logs (سجل وتقارير الحضور والإجازات الشهرية)
  async getMonthlyReport(year, month, branchId = null, employeeId = null) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    if (branchId) params.append('branchId', branchId);
    if (employeeId) params.append('employeeId', employeeId);
    const res = await fetch(`${BASE_URL}/reports/monthly?${params.toString()}`);
    return res.json();
  },

  // Office Settings
  async getSettings() {
    const res = await fetch(`${BASE_URL}/settings`);
    return res.json();
  },

  async updateSettings(settings) {
    const res = await fetch(`${BASE_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  async verifyDistance(latitude, longitude, branchId) {
    const res = await fetch(`${BASE_URL}/settings/verify-distance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude, branchId }),
    });
    return res.json();
  },

  // Titles & Permissions
  async getTitles() {
    const res = await fetch(`${BASE_URL}/titles`);
    return res.json();
  },

  async updateTitlePermissions(code, permissions) {
    const res = await fetch(`${BASE_URL}/titles/${code}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions }),
    });
    return res.json();
  },

  // Employees
  async getEmployees(branchId = null) {
    const url = branchId ? `${BASE_URL}/employees?branchId=${branchId}` : `${BASE_URL}/employees`;
    const res = await fetch(url);
    return res.json();
  },

  async addEmployee(empData) {
    const res = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(empData),
    });
    return res.json();
  },

  // Live Presence with Branch Filter
  async getLiveStatus(date, branchId = null) {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (branchId) params.append('branchId', branchId);
    const res = await fetch(`${BASE_URL}/status/live?${params.toString()}`);
    return res.json();
  },

  // Attendance
  async getTodayAttendance(branchId = null) {
    const url = branchId ? `${BASE_URL}/attendance/today?branchId=${branchId}` : `${BASE_URL}/attendance/today`;
    const res = await fetch(url);
    return res.json();
  },

  async checkIn(employeeId, latitude, longitude) {
    const res = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, latitude, longitude }),
    });
    return res.json();
  },

  async checkOut(employeeId, latitude, longitude, forceOverride = false, reason = '') {
    const res = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, latitude, longitude, forceOverride, reason }),
    });
    return res.json();
  },

  // Requests (Leaves & Permissions)
  async getRequests(filters = {}) {
    const params = new URLSearchParams();
    if (filters.employeeId) params.append('employeeId', filters.employeeId);
    if (filters.branchId) params.append('branchId', filters.branchId);
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    const res = await fetch(`${BASE_URL}/requests?${params.toString()}`);
    return res.json();
  },

  async createRequest(reqData) {
    const res = await fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqData),
    });
    return res.json();
  },

  async reviewRequest(requestId, reviewerId, status, reviewNote) {
    const res = await fetch(`${BASE_URL}/requests/${requestId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerId, status, reviewNote }),
    });
    return res.json();
  },
};
