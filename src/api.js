// API Service for Office Attendance App

const BASE_URL = '/api';

export const api = {
  // Auth
  async login(phone, pin) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, pin }),
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

  async verifyDistance(latitude, longitude) {
    const res = await fetch(`${BASE_URL}/settings/verify-distance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
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
  async getEmployees() {
    const res = await fetch(`${BASE_URL}/employees`);
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

  // Live Presence
  async getLiveStatus(date) {
    const url = date ? `${BASE_URL}/status/live?date=${date}` : `${BASE_URL}/status/live`;
    const res = await fetch(url);
    return res.json();
  },

  // Attendance
  async getTodayAttendance() {
    const res = await fetch(`${BASE_URL}/attendance/today`);
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
