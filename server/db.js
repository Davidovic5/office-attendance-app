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

function getInitialData() {
  const today = new Date().toISOString().split('T')[0];

  return {
    officeSettings: {
      officeName: "المكتب الرئيسي - المقر العام",
      latitude: 30.0444,
      longitude: 31.2357,
      radiusMeters: 100, // النطاق المسموح به بالأمتار
      shiftHours: 8,     // ساعات العمل المطلوبة
      graceMinutes: 15,  // فترة سماح الدخول
      workStartTime: "09:00",
      workEndTime: "17:00"
    },
    titles: [
      {
        id: "title_manager",
        code: "manager",
        name: "مدير المكتب / المدير العام",
        description: "صلاحيات كاملة لإدارة المكتب والموظفين والإعدادات",
        color: "indigo",
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
          override_early_checkout: true
        }
      },
      {
        id: "title_supervisor",
        code: "supervisor",
        name: "رئيس قسم / مشرف",
        description: "إدارة ومتابعة حضور فريق العمل واعتماد طلباتهم",
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
          override_early_checkout: false
        }
      },
      {
        id: "title_hr",
        code: "hr",
        name: "مسؤول موارد بشرية (HR)",
        description: "متابعة الحضور والأرصدة والإجازات وكشوفات الحضور",
        color: "amber",
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
          override_early_checkout: false
        }
      },
      {
        id: "title_employee",
        code: "employee",
        name: "موظف",
        description: "تسجيل الحضور وتقديم طلبات الإجازات والأذونات",
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
          override_early_checkout: false
        }
      }
    ],
    employees: [
      {
        id: "emp_1",
        name: "أحمد عبد الله",
        titleCode: "manager",
        jobTitle: "مدير عام المكتب",
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
        titleCode: "supervisor",
        jobTitle: "رئيس قسم الحسابات",
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
        titleCode: "hr",
        jobTitle: "أخصائية موارد بشرية",
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
        titleCode: "employee",
        jobTitle: "مهندس برمجيات",
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
        titleCode: "employee",
        jobTitle: "مسؤولة علاقات عامة",
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
        titleCode: "employee",
        jobTitle: "مسؤول مشتريات وتوريدات",
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
        titleCode: "employee",
        jobTitle: "مصممة جرافيك",
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
        titleCode: "employee",
        jobTitle: "محاسب مالي",
        phone: "01166667777",
        pin: "1234",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80",
        weeklyOffDays: ["sunday", "monday"], // أيام بديلة لاختبار الإجازات
        leaveBalance: 15,
        permissionsBalanceHours: 6
      }
    ],
    // سجلات الحضور
    attendanceRecords: [
      {
        id: "att_1",
        employeeId: "emp_1",
        date: today,
        checkInTime: `${today}T08:50:00.000Z`,
        checkOutTime: null,
        status: "in_office",
        latitude: 30.0444,
        longitude: 31.2357,
        distanceMeters: 12,
        durationMinutes: 240,
        completed8Hours: false
      },
      {
        id: "att_2",
        employeeId: "emp_2",
        date: today,
        checkInTime: `${today}T09:05:00.000Z`,
        checkOutTime: null,
        status: "in_office",
        latitude: 30.0443,
        longitude: 31.2356,
        distanceMeters: 25,
        durationMinutes: 225,
        completed8Hours: false
      },
      {
        id: "att_3",
        employeeId: "emp_5",
        date: today,
        checkInTime: `${today}T09:00:00.000Z`,
        checkOutTime: null,
        status: "in_office",
        latitude: 30.0445,
        longitude: 31.2358,
        distanceMeters: 18,
        durationMinutes: 230,
        completed8Hours: false
      }
    ],
    // طلبات الإجازات والأذونات
    requests: [
      {
        id: "req_1",
        employeeId: "emp_4",
        type: "leave",
        leaveType: "sick",
        startDate: today,
        endDate: today,
        reason: "نزلة معوية حادة وزيارة الطبيب",
        status: "approved",
        attachmentName: "medical_report_omar.pdf",
        requestedAt: `${today}T07:30:00.000Z`,
        reviewedBy: "emp_1",
        reviewedAt: `${today}T08:00:00.000Z`,
        reviewNote: "ألف سلامة، معتمد مع الرعاية."
      },
      {
        id: "req_2",
        employeeId: "emp_6",
        type: "leave",
        leaveType: "travel",
        startDate: today,
        endDate: today,
        reason: "مأمورية عمل وسفر لفرع الإسكندرية لاستلام شحنة التوريدات",
        status: "approved",
        attachmentName: "mission_order.pdf",
        requestedAt: `${today}T08:00:00.000Z`,
        reviewedBy: "emp_1",
        reviewedAt: `${today}T08:15:00.000Z`,
        reviewNote: "بالتوفيق في المأمورية."
      },
      {
        id: "req_3",
        employeeId: "emp_7",
        type: "permission",
        permissionType: "morning",
        permissionHours: 2,
        date: today,
        startTime: "09:00",
        endTime: "11:00",
        reason: "تجديد بطاقة الرقم القومي في السجل المدني",
        status: "approved",
        requestedAt: `${today}T08:10:00.000Z`,
        reviewedBy: "emp_1",
        reviewedAt: `${today}T08:20:00.000Z`,
        reviewNote: "معتمد من 9 إلى 11 صباحاً."
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
        // Ensure employees have weeklyOffDays and pin
        this.data.employees.forEach(e => {
          if (!e.weeklyOffDays) e.weeklyOffDays = ["friday", "saturday"];
          if (!e.pin) e.pin = "1234";
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

  getTitles() {
    return this.data.titles;
  }

  updateTitlePermissions(titleCode, newPermissions) {
    const title = this.data.titles.find(t => t.code === titleCode);
    if (!title) return null;
    title.permissions = { ...title.permissions, ...newPermissions };
    this.save();
    return title;
  }

  getEmployees() {
    return this.data.employees.map(emp => {
      const titleObj = this.data.titles.find(t => t.code === emp.titleCode);
      return {
        ...emp,
        titleDetails: titleObj || null,
        permissions: titleObj ? titleObj.permissions : {}
      };
    });
  }

  getEmployeeById(id) {
    const emp = this.data.employees.find(e => e.id === id);
    if (!emp) return null;
    const titleObj = this.data.titles.find(t => t.code === emp.titleCode);
    return {
      ...emp,
      titleDetails: titleObj || null,
      permissions: titleObj ? titleObj.permissions : {}
    };
  }

  registerEmployee(data) {
    const { name, phone, pin, titleCode, jobTitle, weeklyOffDays, avatar } = data;
    
    // Check if phone already registered
    const existing = this.data.employees.find(e => e.phone === phone);
    if (existing) {
      throw new Error("رقم الهاتف مسجل بالفعل لموظف آخر.");
    }

    const titleObj = this.data.titles.find(t => t.code === titleCode) || this.data.titles.find(t => t.code === 'employee');

    const newEmp = {
      id: "emp_" + Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      pin: pin ? pin.trim() : "1234",
      titleCode: titleObj ? titleObj.code : "employee",
      jobTitle: jobTitle ? jobTitle.trim() : (titleObj ? titleObj.name : "موظف"),
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

  getTodayAttendance(dateStr) {
    const today = dateStr || new Date().toISOString().split('T')[0];
    return this.data.attendanceRecords.filter(r => r.date === today);
  }

  checkIn(employeeId, latitude, longitude) {
    const today = new Date().toISOString().split('T')[0];
    const settings = this.data.officeSettings;

    const existing = this.data.attendanceRecords.find(r => r.employeeId === employeeId && r.date === today);
    if (existing && !existing.checkOutTime) {
      throw new Error("الموظف مسجل حضور بالفعل وموجود في العمل حالياً.");
    }

    const distanceMeters = calculateDistanceMeters(
      latitude,
      longitude,
      settings.latitude,
      settings.longitude
    );

    if (distanceMeters > settings.radiusMeters) {
      throw new Error(
        `أنت خارج نطاق المكتب! المسافة بينك وبين المكتب ${distanceMeters} متر (الحد المسموح به ${settings.radiusMeters} متر فقط).`
      );
    }

    const newRecord = {
      id: "att_" + Date.now(),
      employeeId,
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

  getLiveOfficeStatus(dateStr) {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const employees = this.getEmployees();
    const todayAttendance = this.getTodayAttendance(today);
    const todayRequests = this.data.requests.filter(
      r => r.status === "approved" && (r.date === today || (r.startDate <= today && r.endDate >= today))
    );

    // Get current day of week key (e.g. 'friday', 'sunday', etc.)
    const dateObj = new Date(today);
    const dayKey = DAY_MAP[dateObj.getDay()];

    const result = {
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
      // 1. Check attendance in office
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

      // 2. Check approved permission for today
      const permission = todayRequests.find(r => r.employeeId === emp.id && r.type === "permission");
      if (permission) {
        result.summary.onPermissionCount++;
        result.onPermission.push({
          employee: emp,
          permission
        });
        return;
      }

      // 3. Check approved leave for today
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

      // 4. Auto-detect Scheduled Weekly Off for this employee!
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

      // 5. Otherwise: Absent
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
  DAY_MAP
};
