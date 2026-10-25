const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

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
    id: "title_general_manager",
    code: "general_manager",
    name: "General Manager (المدير العام)",
    englishTitle: "General Manager",
    arabicTitle: "المدير العام",
    description: "صلاحيات شاملة لكافة الفروع والإدارات والإعدادات",
    color: "purple",
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
    description: "إدارة العمليات والاعتماد والمتابعة لكافة الأقسام والفروع",
    color: "indigo",
    permissions: {
      check_in_out: true,
      view_own_attendance: true,
      view_office_presence: true,
      request_leave: true,
      request_permission: true,
      approve_leaves_permissions: true,
      manage_employees: true,
      manage_titles_permissions: false,
      manage_office_settings: false,
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
    description: "إدارة فريق الفرع والقسم واعتماد إجازاتهم وأذوناتهم",
    color: "blue",
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
    description: "تسجيل الحضور ومتابعة فريق العمل وتقديم الطلبات",
    color: "teal",
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
    description: "تسجيل الحضور والغياب وتقديم طلبات الإجازات والأذونات",
    color: "emerald",
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
  const today = new Date().toISOString().split('T')[0];

  return {
    officeSettings: {
      companyName: "إدارة المكاتب والشركات المتعددة الفروع",
      shiftHours: 8,
      graceMinutes: 15,
      workStartTime: "09:00",
      workEndTime: "17:00"
    },
    branches: DEFAULT_BRANCHES,
    titles: DEFAULT_TITLES,
    employees: [
      {
        id: "emp_1",
        name: "أحمد عبد الله",
        titleCode: "deputy_manager",
        jobTitle: "Deputy manager",
        branchId: "branch_sheraton",
        phone: "01011112222",
        pin: "1234",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        weeklyOffDays: ["friday", "saturday"],
        leaveBalance: 21,
        permissionsBalanceHours: 6
      },
      {
        id: "emp_2",
        name: "محمد طارق",
        titleCode: "section_head",
        jobTitle: "Section head - الحسابات",
        branchId: "branch_sheraton",
        phone: "01033334444",
        pin: "1234",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        weeklyOffDays: ["friday", "saturday"],
        leaveBalance: 18,
        permissionsBalanceHours: 4
      },
      {
        id: "emp_3",
        name: "سارة محمود",
        titleCode: "section_head",
        jobTitle: "Section head - الموارد البشرية",
        branchId: "branch_maadi",
        phone: "01055556666",
        pin: "1234",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
        weeklyOffDays: ["friday", "saturday"],
        leaveBalance: 20,
        permissionsBalanceHours: 6
      },
      {
        id: "emp_4",
        name: "عمر خالد",
        titleCode: "senior_specialist",
        jobTitle: "Senior Specialist - تقنية المعلومات",
        branchId: "branch_october1",
        phone: "01077778888",
        pin: "1234",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
        weeklyOffDays: ["friday", "saturday"],
        leaveBalance: 14,
        permissionsBalanceHours: 2
      },
      {
        id: "emp_5",
        name: "ياسمين حسن",
        titleCode: "specialist",
        jobTitle: "Specialist - خدمة العملاء",
        branchId: "branch_lotus",
        phone: "01099990000",
        pin: "1234",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80",
        weeklyOffDays: ["friday", "saturday"],
        leaveBalance: 17,
        permissionsBalanceHours: 6
      },
      {
        id: "emp_6",
        name: "كريم شريف",
        titleCode: "senior_specialist",
        jobTitle: "Senior Specialist - المشتريات",
        branchId: "branch_alexandria",
        phone: "01122223333",
        pin: "1234",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
        weeklyOffDays: ["friday", "saturday"],
        leaveBalance: 12,
        permissionsBalanceHours: 4
      },
      {
        id: "emp_7",
        name: "مروة عادل",
        titleCode: "specialist",
        jobTitle: "Specialist - التصميم",
        branchId: "branch_assiut",
        phone: "01144445555",
        pin: "1234",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
        weeklyOffDays: ["friday", "saturday"],
        leaveBalance: 19,
        permissionsBalanceHours: 4
      },
      {
        id: "emp_8",
        name: "حسام الدين",
        titleCode: "specialist",
        jobTitle: "Specialist - الحسابات",
        branchId: "branch_minya",
        phone: "01166667777",
        pin: "1234",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80",
        weeklyOffDays: ["sunday", "monday"],
        leaveBalance: 15,
        permissionsBalanceHours: 6
      }
    ],
    attendanceRecords: [
      {
        id: "att_1",
        employeeId: "emp_1",
        branchId: "branch_sheraton",
        date: today,
        checkInTime: `${today}T08:50:00.000Z`,
        checkOutTime: null,
        status: "in_office",
        latitude: 30.1025,
        longitude: 31.3780,
        distanceMeters: 10,
        durationMinutes: 240,
        completed8Hours: false
      },
      {
        id: "att_2",
        employeeId: "emp_2",
        branchId: "branch_sheraton",
        date: today,
        checkInTime: `${today}T09:05:00.000Z`,
        checkOutTime: null,
        status: "in_office",
        latitude: 30.1024,
        longitude: 31.3781,
        distanceMeters: 18,
        durationMinutes: 225,
        completed8Hours: false
      }
    ],
    requests: [
      {
        id: "req_1",
        employeeId: "emp_4",
        branchId: "branch_october1",
        type: "leave",
        leaveType: "sick",
        startDate: today,
        endDate: today,
        reason: "نزلة معوية وزيارة الطبيب",
        status: "approved",
        attachmentName: "medical_report.pdf",
        requestedAt: `${today}T07:30:00.000Z`,
        reviewedBy: "emp_1",
        reviewedAt: `${today}T08:00:00.000Z`,
        reviewNote: "ألف سلامة، معتمد."
      }
    ]
  };
}

class Database {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_PATH)) {
      const data = getInitialData();
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
      this.data = data;
    } else {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        this.data = JSON.parse(raw);

        // Ensure branches exist
        if (!this.data.branches || this.data.branches.length === 0) {
          this.data.branches = DEFAULT_BRANCHES;
        }

        // Ensure titles reflect the exact hierarchy
        this.data.titles = DEFAULT_TITLES;

        // Ensure all employees have a branchId
        this.data.employees.forEach(emp => {
          if (!emp.branchId) emp.branchId = 'branch_sheraton';
          if (!emp.weeklyOffDays) emp.weeklyOffDays = ['friday', 'saturday'];
        });

        this.save();
      } catch (err) {
        console.error("Error reading database, creating fresh one:", err);
        this.data = getInitialData();
        this.save();
      }
    }
  }

  save() {
    fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
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
    const { name, phone, pin, titleCode, jobTitle, branchId, weeklyOffDays, avatar } = data;
    
    const existing = this.data.employees.find(e => e.phone === phone);
    if (existing) {
      throw new Error("رقم الهاتف مسجل بالفعل لموظف آخر.");
    }

    const titleObj = this.data.titles.find(t => t.code === titleCode) || this.data.titles[this.data.titles.length - 1];
    const branchObj = this.data.branches.find(b => b.id === branchId || b.code === branchId) || this.data.branches[0];

    const newEmp = {
      id: "emp_" + Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      pin: pin ? pin.trim() : "1234",
      titleCode: titleObj ? titleObj.code : "specialist",
      jobTitle: jobTitle ? jobTitle.trim() : (titleObj ? titleObj.englishTitle : "Specialist"),
      branchId: branchObj ? branchObj.id : "branch_sheraton",
      weeklyOffDays: Array.isArray(weeklyOffDays) && weeklyOffDays.length > 0 ? weeklyOffDays : ["friday", "saturday"],
      avatar: avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80`,
      leaveBalance: 21,
      permissionsBalanceHours: 6,
      createdAt: new Date().toISOString()
    };

    this.data.employees.push(newEmp);
    this.save();
    return this.getEmployeeById(newEmp.id);
  }

  loginEmployee(phone, pin) {
    const emp = this.data.employees.find(e => e.phone === phone.trim());
    if (!emp) {
      throw new Error("رقم الهاتف غير مسجل بالنظام.");
    }

    if (emp.pin && emp.pin !== pin.trim()) {
      throw new Error("رمز الدخول (PIN) غير صحيح.");
    }

    return this.getEmployeeById(emp.id);
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

    // Verify GPS distance against the employee's assigned branch coordinates!
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

  // Branch-Filtered Live Presence
  getLiveOfficeStatus(dateStr, branchId = null) {
    const today = dateStr || new Date().toISOString().split('T')[0];
    let employees = this.getEmployees();
    
    // Filter employees by branch if branchId specified
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
}

module.exports = {
  db: new Database(),
  calculateDistanceMeters,
  DAY_MAP,
  DEFAULT_BRANCHES,
  DEFAULT_TITLES
};
