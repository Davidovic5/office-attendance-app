const fs = require('fs');
const path = require('path');

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const ORIGINAL_DB_PATH = path.join(__dirname, 'data.json');
const DB_PATH = IS_SERVERLESS ? path.join('/tmp', 'data.json') : ORIGINAL_DB_PATH;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || 'Davidovic5/office-attendance-app';

// Haversine formula to compute distance between 2 GPS coordinates in meters
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

const DAY_MAP = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

const DEFAULT_BRANCHES = [
  { id: 'branch_sheraton', code: 'sheraton', name: 'شيراتون', city: 'القاهرة', latitude: 30.1025, longitude: 31.3780, radiusMeters: 100 },
  { id: 'branch_maadi', code: 'maadi', name: 'المعادي', city: 'القاهرة', latitude: 29.9602, longitude: 31.2568, radiusMeters: 100 },
  { id: 'branch_october1', code: 'october1', name: 'اكتوبر ١', city: 'الجيزة', latitude: 29.9723, longitude: 30.9421, radiusMeters: 100 },
  { id: 'branch_october2', code: 'october2', name: 'اكتوبر ٢', city: 'الجيزة', latitude: 29.9510, longitude: 30.9150, radiusMeters: 100 },
  { id: 'branch_lotus', code: 'lotus', name: 'اللوتس', city: 'القاهرة الجديدة', latitude: 30.0384, longitude: 31.4880, radiusMeters: 100 },
  { id: 'branch_assiut', code: 'assiut', name: 'اسيوط', city: 'أسيوط', latitude: 27.1809, longitude: 31.1837, radiusMeters: 120 },
  { id: 'branch_minya', code: 'minya', name: 'المنيا', city: 'المنيا', latitude: 28.0871, longitude: 30.7618, radiusMeters: 120 },
  { id: 'branch_alexandria', code: 'alexandria', name: 'اسكندرية', city: 'الإسكندرية', latitude: 31.2001, longitude: 29.9187, radiusMeters: 100 }
];

const DEFAULT_TITLES = [
  {
    id: "title_sector_manager",
    code: "sector_manager",
    name: "Sector Manager (مدير القطاع)",
    englishTitle: "Sector Manager",
    arabicTitle: "مدير القطاع",
    description: "صلاحيات شاملة وكاملة لتعديل وتغيير أي شيء ولكافة الفروع والإدارات",
    color: "amber",
    permissions: {
      check_in_out: true,
      view_own_attendance: true,
      view_office_presence: true,
      request_leave: true,
      request_permission: true,
      approve_leaves_permissions: true,
      manage_employees: true,
      manage_titles_permissions: true,
      manage_office_settings: true,
      view_reports: true,
      view_all_branches: true,
      override_early_checkout: true
    }
  },
  {
    id: "title_deputy_manager",
    code: "deputy_manager",
    name: "Deputy manager (نائب المدير)",
    englishTitle: "Deputy manager",
    arabicTitle: "نائب المدير",
    description: "كامل الصلاحيات وحق تعديل وتغيير أي شيء وكافة الفروع والإدارات",
    color: "amber",
    permissions: {
      check_in_out: true,
      view_own_attendance: true,
      view_office_presence: true,
      request_leave: true,
      request_permission: true,
      approve_leaves_permissions: true,
      manage_employees: true,
      manage_titles_permissions: true,
      manage_office_settings: true,
      view_reports: true,
      view_all_branches: true,
      override_early_checkout: true
    }
  },
  {
    id: "title_section_head",
    code: "section_head",
    name: "Section head (رئيس قسم)",
    englishTitle: "Section head",
    arabicTitle: "رئيس قسم",
    description: "إدارة فريق القسم واعتماد إجازاتهم وأذوناتهم ومتابعة الحضور",
    color: "amber",
    permissions: {
      check_in_out: true,
      view_own_attendance: true,
      view_office_presence: true,
      request_leave: true,
      request_permission: true,
      approve_leaves_permissions: true,
      manage_employees: false,
      manage_titles_permissions: false,
      manage_office_settings: false,
      view_reports: true,
      view_all_branches: false,
      override_early_checkout: false
    }
  },
  {
    id: "title_senior_specialist",
    code: "senior_specialist",
    name: "Senior Specialist (أخصائي أول)",
    englishTitle: "Senior Specialist",
    arabicTitle: "أخصائي أول",
    description: "تسجيل الحضور ومتابعة الأعمال وتقديم طلبات الإجازات والأذونات",
    color: "zinc",
    permissions: {
      check_in_out: true,
      view_own_attendance: true,
      view_office_presence: true,
      request_leave: true,
      request_permission: true,
      approve_leaves_permissions: false,
      manage_employees: false,
      manage_titles_permissions: false,
      manage_office_settings: false,
      view_reports: false,
      view_all_branches: false,
      override_early_checkout: false
    }
  },
  {
    id: "title_specialist",
    code: "specialist",
    name: "Specialist (أخصائي)",
    englishTitle: "Specialist",
    arabicTitle: "أخصائي",
    description: "تسجيل الحضور والغياب بالـ GPS وتقديم طلبات الإجازات والأذونات",
    color: "zinc",
    permissions: {
      check_in_out: true,
      view_own_attendance: true,
      view_office_presence: true,
      request_leave: true,
      request_permission: true,
      approve_leaves_permissions: false,
      manage_employees: false,
      manage_titles_permissions: false,
      manage_office_settings: false,
      view_reports: false,
      view_all_branches: false,
      override_early_checkout: false
    }
  }
];

function getInitialData() {
  return {
    officeSettings: {
      companyName: "أندية وادي دجلة - Wadi Degla Clubs",
      shiftHours: 8,
      graceMinutes: 15,
      workStartTime: "09:00",
      workEndTime: "17:00"
    },
    branches: DEFAULT_BRANCHES,
    titles: DEFAULT_TITLES,
    // Clean initial employees: Just one primary Admin / Sector Manager account
    employees: [
      {
        id: "emp_admin",
        name: "مدير قطاع أندية وادي دجلة",
        titleCode: "sector_manager",
        jobTitle: "Sector Manager",
        branchId: "branch_sheraton",
        phone: "01000000000",
        password: "admin",
        pin: "admin",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80",
        weeklyOffDays: ["friday", "saturday"],
        leaveBalance: 30,
        permissionsBalanceHours: 10,
        createdAt: new Date().toISOString()
      }
    ],
    // Clean slate: Zero fake attendance records
    attendanceRecords: [],
    // Clean slate: Zero fake requests
    requests: []
  };
}

class Database {
  constructor() {
    this.init();
  }

  init() {
    // If running on Vercel / serverless, copy bundled data.json to /tmp if not present
    if (IS_SERVERLESS && !fs.existsSync(DB_PATH)) {
      if (fs.existsSync(ORIGINAL_DB_PATH)) {
        try {
          fs.copyFileSync(ORIGINAL_DB_PATH, DB_PATH);
        } catch (e) {
          console.warn("Could not copy initial data.json to /tmp:", e);
        }
      }
    }

    // Always start with clean data if reset requested or if invalid
    if (!fs.existsSync(DB_PATH)) {
      const data = getInitialData();
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
      this.data = data;
    } else {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        this.data = JSON.parse(raw);
        if (!this.data.branches || this.data.branches.length === 0) {
          this.data.branches = DEFAULT_BRANCHES;
        }
        this.data.titles = DEFAULT_TITLES;
        this.save();
      } catch (err) {
        console.error("Error reading database, creating fresh one:", err);
        this.data = getInitialData();
        this.save();
      }
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.warn("Could not write local DB file:", err.message);
    }
    // Async background sync to GitHub repo
    this.syncToGitHub();
  }

  async syncToGitHub() {
    if (!GITHUB_TOKEN || !GITHUB_REPO) return;
    try {
      const contentBase64 = Buffer.from(JSON.stringify(this.data, null, 2), 'utf8').toString('base64');
      const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/server/data.json`, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'OfficeAttendanceApp'
        }
      });
      let sha = '';
      if (getRes.ok) {
        const json = await getRes.json();
        sha = json.sha;
      }
      await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/server/data.json`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'OfficeAttendanceApp'
        },
        body: JSON.stringify({
          message: 'chore(db): auto-sync attendance records [skip ci]',
          content: contentBase64,
          sha: sha || undefined
        })
      });
    } catch (e) {
      // Background sync errors do not block API responses
    }
  }

  // Force clean all dummy records
  cleanSampleData() {
    const data = getInitialData();
    this.data = data;
    this.save();
    return this.data;
  }

  getOfficeSettings() {
    return this.data.officeSettings;
  }

  updateOfficeSettings(newSettings) {
    this.data.officeSettings = { ...this.data.officeSettings, ...newSettings };
    this.save();
    return this.data.officeSettings;
  }

  // Branches
  getBranches() {
    return this.data.branches;
  }

  getBranchById(id) {
    return this.data.branches.find(b => b.id === id || b.code === id) || this.data.branches[0];
  }

  updateBranch(id, branchData) {
    const idx = this.data.branches.findIndex(b => b.id === id || b.code === id);
    if (idx === -1) return null;
    this.data.branches[idx] = { ...this.data.branches[idx], ...branchData };
    this.save();
    return this.data.branches[idx];
  }

  // Titles & Permissions
  getTitles() {
    return this.data.titles;
  }

  updateTitlePermissions(code, permissions) {
    const title = this.data.titles.find(t => t.code === code);
    if (!title) return null;
    title.permissions = { ...title.permissions, ...newPermissions };
    this.save();
    return title;
  }

  // Employees
  getEmployees(branchId = null) {
    let list = this.data.employees;
    if (branchId && branchId !== 'all') {
      list = list.filter(e => e.branchId === branchId);
    }
    return list.map(emp => {
      const titleObj = this.data.titles.find(t => t.code === emp.titleCode);
      const branchObj = this.data.branches.find(b => b.id === emp.branchId);
      return {
        ...emp,
        titleDetails: titleObj || null,
        branchDetails: branchObj || null,
        branchName: branchObj ? branchObj.name : 'غير محدد',
        permissions: titleObj ? titleObj.permissions : {}
      };
    });
  }

  getEmployeeById(id) {
    const emp = this.data.employees.find(e => e.id === id);
    if (!emp) return null;
    const titleObj = this.data.titles.find(t => t.code === emp.titleCode);
    const branchObj = this.data.branches.find(b => b.id === emp.branchId);
    return {
      ...emp,
      titleDetails: titleObj || null,
      branchDetails: branchObj || null,
      branchName: branchObj ? branchObj.name : 'غير محدد',
      permissions: titleObj ? titleObj.permissions : {}
    };
  }

  registerEmployee(data) {
    const { name, phone, password, pin, titleCode, jobTitle, branchId, weeklyOffDays, avatar } = data;
    
    const existing = this.data.employees.find(e => e.phone === phone.trim());
    if (existing) {
      throw new Error("رقم الهاتف مسجل بالفعل لموظف آخر.");
    }

    const titleObj = this.data.titles.find(t => t.code === titleCode) || this.data.titles[this.data.titles.length - 1];
    const branchObj = this.data.branches.find(b => b.id === branchId || b.code === branchId) || this.data.branches[0];

    const pass = (password || pin || '1234').trim();

    const newEmp = {
      id: "emp_" + Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      password: pass,
      pin: pass,
      titleCode: titleObj ? titleObj.code : "specialist",
      jobTitle: jobTitle ? jobTitle.trim() : (titleObj ? titleObj.englishTitle : "Specialist"),
      branchId: branchObj ? branchObj.id : "branch_sheraton",
      weeklyOffDays: Array.isArray(weeklyOffDays) && weeklyOffDays.length > 0 ? weeklyOffDays : ["friday", "saturday"],
      avatar: avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80`,
      leaveBalance: 21,
      permissionsBalanceHours: 6,
      createdAt: new Date().toISOString()
    };

    this.data.employees.push(newEmp);
    this.save();
    return this.getEmployeeById(newEmp.id);
  }

  loginEmployee(phone, password) {
    const emp = this.data.employees.find(e => e.phone === phone.trim());
    if (!emp) {
      throw new Error("رقم الهاتف غير مسجل بالنظام.");
    }

    const expectedPass = emp.password || emp.pin || "";
    if (expectedPass && expectedPass !== password.trim()) {
      throw new Error("كلمة المرور غير صحيحة.");
    }

    return this.getEmployeeById(emp.id);
  }

  changePassword(employeeId, oldPassword, newPassword) {
    const emp = this.data.employees.find(e => e.id === employeeId);
    if (!emp) throw new Error("الموظف غير موجود.");

    const currentPass = emp.password || emp.pin || "";
    if (currentPass && currentPass !== oldPassword.trim()) {
      throw new Error("كلمة المرور الحالية غير صحيحة.");
    }

    if (!newPassword || newPassword.trim().length < 3) {
      throw new Error("كلمة المرور الجديدة يجب أن تكون 3 خانات على الأقل.");
    }

    emp.password = newPassword.trim();
    emp.pin = newPassword.trim();
    this.save();
    return this.getEmployeeById(employeeId);
  }

  updateProfile(employeeId, profileData) {
    const emp = this.data.employees.find(e => e.id === employeeId);
    if (!emp) throw new Error("الموظف غير موجود.");

    if (profileData.name) emp.name = profileData.name.trim();
    if (profileData.avatar) emp.avatar = profileData.avatar;
    if (profileData.weeklyOffDays) emp.weeklyOffDays = profileData.weeklyOffDays;
    if (profileData.jobTitle) emp.jobTitle = profileData.jobTitle.trim();
    if (profileData.branchId) emp.branchId = profileData.branchId;

    this.save();
    return this.getEmployeeById(employeeId);
  }

  getTodayAttendance(dateStr, branchId = null) {
    const today = dateStr || new Date().toISOString().split('T')[0];
    let records = this.data.attendanceRecords.filter(r => r.date === today);
    if (branchId && branchId !== 'all') {
      records = records.filter(r => r.branchId === branchId);
    }
    return records;
  }

  checkIn(employeeId, latitude, longitude) {
    const today = new Date().toISOString().split('T')[0];
    const emp = this.getEmployeeById(employeeId);
    if (!emp) throw new Error("الموظف غير موجود.");

    const branch = this.getBranchById(emp.branchId);

    const existing = this.data.attendanceRecords.find(r => r.employeeId === employeeId && r.date === today);
    if (existing && !existing.checkOutTime) {
      throw new Error("الموظف مسجل حضور بالفعل وموجود في العمل حالياً.");
    }

    const distanceMeters = calculateDistanceMeters(
      latitude,
      longitude,
      branch.latitude,
      branch.longitude
    );

    if (distanceMeters > branch.radiusMeters) {
      throw new Error(
        `أنت خارج نطاق فرع (${branch.name})! المسافة بينك وبين الفرع ${distanceMeters} متر (المسموح به ${branch.radiusMeters} متر فقط).`
      );
    }

    const newRecord = {
      id: "att_" + Date.now(),
      employeeId,
      branchId: branch.id,
      date: today,
      checkInTime: new Date().toISOString(),
      checkOutTime: null,
      status: "in_office",
      latitude,
      longitude,
      distanceMeters,
      durationMinutes: 0,
      completed8Hours: false
    };

    this.data.attendanceRecords.push(newRecord);
    this.save();
    return newRecord;
  }

  checkOut(employeeId, latitude, longitude, forceOverride = false, reason = "") {
    const today = new Date().toISOString().split('T')[0];
    const record = this.data.attendanceRecords.find(
      r => r.employeeId === employeeId && r.date === today && !r.checkOutTime
    );

    if (!record) {
      throw new Error("لا يوجد تسجيل حضور نشط لهذا الموظف اليوم.");
    }

    const checkInDate = new Date(record.checkInTime);
    const now = new Date();
    const durationMs = now - checkInDate;
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    const durationHours = durationMinutes / 60;

    const requiredHours = this.data.officeSettings.shiftHours || 8;

    const hasPermission = this.data.requests.some(
      req =>
        req.employeeId === employeeId &&
        req.type === "permission" &&
        req.date === today &&
        req.status === "approved"
    );

    const effectiveRequiredHours = hasPermission ? Math.max(requiredHours - 2, 0) : requiredHours;

    if (durationHours < effectiveRequiredHours && !forceOverride) {
      const remainingMinutes = Math.ceil(effectiveRequiredHours * 60 - durationMinutes);
      const remHours = Math.floor(remainingMinutes / 60);
      const remMins = remainingMinutes % 60;
      throw new Error(
        `لا يمكنك تسجيل الانصراف قبل إتمام ${effectiveRequiredHours} ساعات عمل! متبقي لديك: ${remHours} ساعة و ${remMins} دقيقة.`
      );
    }

    record.checkOutTime = now.toISOString();
    record.durationMinutes = durationMinutes;
    record.completed8Hours = durationHours >= effectiveRequiredHours;
    record.status = "checked_out";
    record.checkOutNotes = forceOverride ? `انصراف استثنائي / مبكر: ${reason}` : "انصراف نظامي بعد إتمام ساعات العمل";

    this.save();
    return record;
  }

  getLiveOfficeStatus(dateStr, branchId = null) {
    const today = dateStr || new Date().toISOString().split('T')[0];
    let employees = this.getEmployees();
    
    if (branchId && branchId !== 'all') {
      employees = employees.filter(e => e.branchId === branchId);
    }

    const todayAttendance = this.getTodayAttendance(today);
    const todayRequests = this.data.requests.filter(
      r => r.status === "approved" && (r.date === today || (r.startDate <= today && r.endDate >= today))
    );

    const dateObj = new Date(today);
    const dayKey = DAY_MAP[dateObj.getDay()];

    const result = {
      filterBranchId: branchId || 'all',
      summary: {
        totalEmployees: employees.length,
        inOfficeCount: 0,
        onLeaveCount: 0,
        onPermissionCount: 0,
        absentCount: 0
      },
      inOffice: [],
      onPermission: [],
      onLeave: {
        weekly_off: [],
        sick: [],
        travel: [],
        annual: [],
        other: []
      },
      absent: []
    };

    employees.forEach(emp => {
      // 1. In Office
      const attendance = todayAttendance.find(a => a.employeeId === emp.id && !a.checkOutTime);
      if (attendance) {
        result.summary.inOfficeCount++;
        result.inOffice.push({
          employee: emp,
          attendance,
          checkInTime: attendance.checkInTime,
          durationMinutes: attendance.durationMinutes
        });
        return;
      }

      // 2. Permission
      const permission = todayRequests.find(r => r.employeeId === emp.id && r.type === "permission");
      if (permission) {
        result.summary.onPermissionCount++;
        result.onPermission.push({ employee: emp, permission });
        return;
      }

      // 3. Approved Leave
      const leave = todayRequests.find(r => r.employeeId === emp.id && r.type === "leave");
      if (leave) {
        result.summary.onLeaveCount++;
        const leaveCategory = leave.leaveType || 'other';
        if (result.onLeave[leaveCategory]) {
          result.onLeave[leaveCategory].push({ employee: emp, leave });
        } else {
          result.onLeave.other.push({ employee: emp, leave });
        }
        return;
      }

      // 4. Scheduled Weekly Off
      if (emp.weeklyOffDays && emp.weeklyOffDays.includes(dayKey)) {
        result.summary.onLeaveCount++;
        result.onLeave.weekly_off.push({
          employee: emp,
          leave: {
            reason: "يوم عطلة أسبوعية مجدول للموظف",
            leaveType: "weekly_off"
          }
        });
        return;
      }

      // 5. Absent
      result.summary.absentCount++;
      result.absent.push({ employee: emp });
    });

    return result;
  }

  getRequests(filters = {}) {
    let list = [...this.data.requests];
    if (filters.employeeId) {
      list = list.filter(r => r.employeeId === filters.employeeId);
    }
    if (filters.branchId && filters.branchId !== 'all') {
      list = list.filter(r => {
        const emp = this.getEmployeeById(r.employeeId);
        return emp && emp.branchId === filters.branchId;
      });
    }
    if (filters.type) {
      list = list.filter(r => r.type === filters.type);
    }
    if (filters.status) {
      list = list.filter(r => r.status === filters.status);
    }
    return list.map(req => {
      const emp = this.getEmployeeById(req.employeeId);
      return {
        ...req,
        employeeName: emp ? emp.name : "موظف غير معروف",
        employeeJobTitle: emp ? emp.jobTitle : "",
        employeeBranch: emp ? emp.branchName : "",
        employeeAvatar: emp ? emp.avatar : ""
      };
    }).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  }

  createRequest(requestData) {
    const newReq = {
      id: "req_" + Date.now(),
      status: "pending",
      requestedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      ...requestData
    };
    this.data.requests.unshift(newReq);
    this.save();
    return newReq;
  }

  reviewRequest(requestId, reviewerId, status, reviewNote) {
    const req = this.data.requests.find(r => r.id === requestId);
    if (!req) return null;
    req.status = status;
    req.reviewedBy = reviewerId;
    req.reviewedAt = new Date().toISOString();
    req.reviewNote = reviewNote || (status === 'approved' ? 'تمت الموافقة' : 'تم الرفض');

    if (status === 'approved' && req.type === 'leave' && req.leaveType !== 'weekly_off') {
      const emp = this.data.employees.find(e => e.id === req.employeeId);
      if (emp && emp.leaveBalance > 0) {
        emp.leaveBalance = Math.max(0, emp.leaveBalance - 1);
      }
    }

    if (status === 'approved' && req.type === 'permission') {
      const emp = this.data.employees.find(e => e.id === req.employeeId);
      if (emp && emp.permissionsBalanceHours >= (req.permissionHours || 2)) {
        emp.permissionsBalanceHours = Math.max(0, emp.permissionsBalanceHours - (req.permissionHours || 2));
      }
    }

    this.save();
    return req;
  }

  deleteEmployee(employeeId) {
    const idx = this.data.employees.findIndex(e => e.id === employeeId);
    if (idx === -1) {
      throw new Error("الموظف غير موجود.");
    }
    const emp = this.data.employees[idx];
    if (emp.id === "emp_admin") {
      throw new Error("لا يمكن حذف حساب الإدارة الرئيسي للنظام.");
    }

    this.data.employees.splice(idx, 1);
    this.data.attendanceRecords = this.data.attendanceRecords.filter(r => r.employeeId !== employeeId);
    this.data.requests = this.data.requests.filter(r => r.employeeId !== employeeId);
    this.save();
    return { success: true, message: `تم حذف حساب "${emp.name}" نهائياً بنجاح.` };
  }

  getMonthlyReport({ year, month, branchId = null, employeeId = null }) {
    const targetYear = parseInt(year, 10) || new Date().getFullYear();
    const targetMonth = parseInt(month, 10) || (new Date().getMonth() + 1);
    const monthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    
    // Days in this month
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    // Filter employees
    let employees = this.getEmployees(branchId);
    if (employeeId && employeeId !== 'all') {
      employees = employees.filter(e => e.id === employeeId);
    }

    // Filter attendance records for this month
    let attendance = this.data.attendanceRecords.filter(r => r.date && r.date.startsWith(monthStr));
    if (branchId && branchId !== 'all') {
      attendance = attendance.filter(r => r.branchId === branchId);
    }
    if (employeeId && employeeId !== 'all') {
      attendance = attendance.filter(r => r.employeeId === employeeId);
    }

    // Filter approved leaves & permissions for this month
    let requests = this.data.requests.filter(r => {
      if (r.status !== 'approved') return false;
      const d = r.date || r.startDate || '';
      return d.startsWith(monthStr);
    });
    if (employeeId && employeeId !== 'all') {
      requests = requests.filter(r => r.employeeId === employeeId);
    }

    // Enrich attendance records with employee info
    const enrichedAttendance = attendance.map(r => {
      const emp = this.getEmployeeById(r.employeeId);
      const branch = this.getBranchById(r.branchId);
      return {
        ...r,
        employeeName: emp ? emp.name : 'موظف',
        jobTitle: emp ? emp.jobTitle : '',
        avatar: emp ? emp.avatar : '',
        branchName: branch ? branch.name : ''
      };
    }).sort((a, b) => b.date.localeCompare(a.date));

    // Enrich requests with employee info
    const enrichedRequests = requests.map(r => {
      const emp = this.getEmployeeById(r.employeeId);
      const branch = emp ? this.getBranchById(emp.branchId) : null;
      return {
        ...r,
        employeeName: emp ? emp.name : 'موظف',
        jobTitle: emp ? emp.jobTitle : '',
        avatar: emp ? emp.avatar : '',
        branchName: branch ? branch.name : ''
      };
    }).sort((a, b) => (b.date || b.startDate).localeCompare(a.date || a.startDate));

    // Per-employee monthly summary matrix
    const employeeSummaries = employees.map(emp => {
      const empBranch = this.getBranchById(emp.branchId);
      const empAtt = attendance.filter(r => r.employeeId === emp.id);
      const empReq = requests.filter(r => r.employeeId === emp.id);

      let totalMinutes = 0;
      let presentDays = 0;
      let leavesCount = 0;
      let permissionsHours = 0;

      empAtt.forEach(r => {
        presentDays++;
        totalMinutes += (r.durationMinutes || 0);
      });

      empReq.forEach(r => {
        if (r.type === 'leave') {
          leavesCount++;
        } else if (r.type === 'permission') {
          permissionsHours += (r.permissionHours || 2);
        }
      });

      const totalHours = (totalMinutes / 60).toFixed(1);

      // Daily calendar matrix for this employee
      const dailyBreakdown = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dStr = `${monthStr}-${String(day).padStart(2, '0')}`;
        const dayDate = new Date(`${dStr}T12:00:00Z`);
        const dayOfWeekIndex = dayDate.getUTCDay();
        const dayKey = DAY_MAP[dayOfWeekIndex];
        const isFuture = dStr > todayStr;

        const dayAtt = empAtt.find(r => r.date === dStr);
        const dayLeave = empReq.find(r => r.type === 'leave' && dStr >= r.startDate && dStr <= r.endDate);
        const dayPerm = empReq.find(r => r.type === 'permission' && r.date === dStr);
        const isWeeklyOff = emp.weeklyOffDays && emp.weeklyOffDays.includes(dayKey);

        let status = 'absent';
        let label = 'غائب';
        let detail = '';

        if (isFuture) {
          status = 'future';
          label = 'قادم';
        } else if (dayAtt) {
          status = 'present';
          const hrs = (dayAtt.durationMinutes ? (dayAtt.durationMinutes / 60).toFixed(1) : 0);
          label = `حاضر (${hrs}س)`;
          detail = `${dayAtt.checkInTime ? new Date(dayAtt.checkInTime).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : ''} - ${dayAtt.checkOutTime ? new Date(dayAtt.checkOutTime).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : 'في العمل'}`;
        } else if (dayLeave) {
          status = 'leave';
          label = dayLeave.leaveType === 'sick' ? 'مرضي' : (dayLeave.leaveType === 'travel' ? 'سفر' : (dayLeave.leaveType === 'annual' ? 'سنوي' : 'إجازة'));
          detail = dayLeave.reason || '';
        } else if (dayPerm) {
          status = 'permission';
          label = 'إذن ساعتين';
          detail = `${dayPerm.startTime} - ${dayPerm.endTime}`;
        } else if (isWeeklyOff) {
          status = 'weekly_off';
          label = 'عطلة أسبوعية';
        }

        dailyBreakdown.push({
          day,
          date: dStr,
          dayKey,
          status,
          label,
          detail,
          att: dayAtt || null,
          leave: dayLeave || null,
          perm: dayPerm || null
        });
      }

      return {
        employee: {
          id: emp.id,
          name: emp.name,
          jobTitle: emp.jobTitle,
          branchName: empBranch ? empBranch.name : '',
          avatar: emp.avatar,
          phone: emp.phone,
          weeklyOffDays: emp.weeklyOffDays
        },
        presentDays,
        totalMinutes,
        totalHours,
        leavesCount,
        permissionsHours,
        dailyBreakdown
      };
    });

    const monthNamesAr = [
      'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const monthLabel = `${monthNamesAr[targetMonth - 1]} ${targetYear}`;

    return {
      year: targetYear,
      month: targetMonth,
      monthStr,
      monthLabel,
      daysInMonth,
      attendance: enrichedAttendance,
      requests: enrichedRequests,
      employeeSummaries
    };
  }
}

module.exports = {
  db: new Database(),
  calculateDistanceMeters,
  DAY_MAP,
  DEFAULT_BRANCHES,
  DEFAULT_TITLES
};
