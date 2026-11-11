const mongoose = require('mongoose');
const { Branch, Title, Employee, AttendanceRecord, Request, OfficeSettings } = require('./models');

// Calculate GPS distance using Haversine formula
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
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
  { id: 'branch_october2', code: 'october2', name: 'اكتوبر ٢', city: 'الجيزة', latitude: 29.9652734, longitude: 30.9634410, radiusMeters: 150 },
  { id: 'branch_lotus', code: 'lotus', name: 'اللوتس', city: 'القاهرة الجديدة', latitude: 30.0384, longitude: 31.4880, radiusMeters: 100 },
  { id: 'branch_assiut', code: 'assiut', name: 'اسيوط', city: 'أسيوط', latitude: 27.1809, longitude: 31.1837, radiusMeters: 120 },
  { id: 'branch_minya', code: 'minya', name: 'المنيا', city: 'المنيا', latitude: 28.0871, longitude: 30.7618, radiusMeters: 120 },
  { id: 'branch_alexandria', code: 'alexandria', name: 'اسكندرية', city: 'الإسكندرية', latitude: 31.2001, longitude: 29.9187, radiusMeters: 100 }
];

const DEFAULT_TITLES = [
  {
    id: "title_memberships_executive_director",
    code: "memberships_executive_director",
    name: "Memberships Executive Director (المدير التنفيذي للعضويات)",
    englishTitle: "Memberships Executive Director",
    arabicTitle: "المدير التنفيذي للعضويات",
    description: "صلاحيات تنفيذية عليا وشاملة لتعديل وتغيير أي شيء ولكافة الفروع والإدارات",
    color: "amber",
    permissions: {
      check_in_out: true,
      view_own_attendance: true,
      view_office_presence: true,
      request_leave: true,
      request_permission: true,
      approve_leaves_permissions: true,
      approve_early_checkout: true,
      manage_employees: true,
      manage_titles_permissions: true,
      manage_office_settings: true,
      view_reports: true,
      view_all_branches: true,
      override_early_checkout: true
    }
  },
  {
    id: "title_memberships_area_manager",
    code: "memberships_area_manager",
    name: "Memberships Area Manager (مدير منطقة العضويات)",
    englishTitle: "Memberships Area Manager",
    arabicTitle: "مدير منطقة العضويات",
    description: "إدارة ومتابعة فروع المنطقة واعتماد كافة طلبات الإجازات والأذونات والانصراف الطارئ والتقارير",
    color: "amber",
    permissions: {
      check_in_out: true,
      view_own_attendance: true,
      view_office_presence: true,
      request_leave: true,
      request_permission: true,
      approve_leaves_permissions: true,
      approve_early_checkout: true,
      manage_employees: true,
      manage_titles_permissions: true,
      manage_office_settings: true,
      view_reports: true,
      view_all_branches: true,
      override_early_checkout: true
    }
  },
  {
    id: "title_memberships_manager",
    code: "memberships_manager",
    name: "Memberships Manager (مدير العضويات)",
    englishTitle: "Memberships Manager",
    arabicTitle: "مدير العضويات",
    description: "الجهة المخولة حصرياً باعتماد طلبات الانصراف الطارئ والإجازات والأذونات وإدارة الفريق",
    color: "amber",
    permissions: {
      check_in_out: true,
      view_own_attendance: true,
      view_office_presence: true,
      request_leave: true,
      request_permission: true,
      approve_leaves_permissions: true,
      approve_early_checkout: true,
      manage_employees: true,
      manage_titles_permissions: false,
      manage_office_settings: true,
      view_reports: true,
      view_all_branches: true,
      override_early_checkout: true
    }
  },
  {
    id: "title_memberships_deputy_manager",
    code: "memberships_deputy_manager",
    name: "Memberships Deputy Manager (نائب مدير العضويات)",
    englishTitle: "Memberships Deputy Manager",
    arabicTitle: "نائب مدير العضويات",
    description: "متابعة الفريق ومراجعة الطلبات والتقارير - الانصراف الطارئ يتطلب موافقة مدير العضويات",
    color: "amber",
    permissions: {
      check_in_out: true,
      view_own_attendance: true,
      view_office_presence: true,
      request_leave: true,
      request_permission: true,
      approve_leaves_permissions: true,
      approve_early_checkout: false,
      manage_employees: false,
      manage_titles_permissions: false,
      manage_office_settings: false,
      view_reports: true,
      view_all_branches: true,
      override_early_checkout: false
    }
  },
  {
    id: "title_memberships_section_head",
    code: "memberships_section_head",
    name: "Memberships Section Head (رئيس قسم العضويات)",
    englishTitle: "Memberships Section Head",
    arabicTitle: "رئيس قسم العضويات",
    description: "إدارة فريق القسم واعتماد إجازاتهم وأذوناتهم ومتابعة الحضور - الانصراف الطارئ يتطلب موافقة مدير العضويات",
    color: "zinc",
    permissions: {
      check_in_out: true,
      view_own_attendance: true,
      view_office_presence: true,
      request_leave: true,
      request_permission: true,
      approve_leaves_permissions: true,
      approve_early_checkout: false,
      manage_employees: false,
      manage_titles_permissions: false,
      manage_office_settings: false,
      view_reports: true,
      view_all_branches: false,
      override_early_checkout: false
    }
  },
  {
    id: "title_memberships_senior_specialist",
    code: "memberships_senior_specialist",
    name: "Memberships Senior Specialist (أخصائي أول عضويات)",
    englishTitle: "Memberships Senior Specialist",
    arabicTitle: "أخصائي أول عضويات",
    description: "تسجيل الحضور والغياب بالـ GPS ومتابعة تقارير فرعه - الانصراف الطارئ يتطلب موافقة مدير العضويات",
    color: "zinc",
    permissions: {
      check_in_out: true,
      view_own_attendance: true,
      view_office_presence: true,
      request_leave: true,
      request_permission: true,
      approve_leaves_permissions: false,
      approve_early_checkout: false,
      manage_employees: false,
      manage_titles_permissions: false,
      manage_office_settings: false,
      view_reports: true,
      view_all_branches: false,
      override_early_checkout: false
    }
  },
  {
    id: "title_memberships_specialist",
    code: "memberships_specialist",
    name: "Memberships Specialist (أخصائي عضويات)",
    englishTitle: "Memberships Specialist",
    arabicTitle: "أخصائي عضويات",
    description: "تسجيل الحضور والانصراف بالـ GPS وتقديم طلبات الإجازات والأذونات والانصراف الطارئ",
    color: "zinc",
    permissions: {
      check_in_out: true,
      view_own_attendance: true,
      view_office_presence: true,
      request_leave: true,
      request_permission: true,
      approve_leaves_permissions: false,
      approve_early_checkout: false,
      manage_employees: false,
      manage_titles_permissions: false,
      manage_office_settings: false,
      view_reports: false,
      view_all_branches: false,
      override_early_checkout: false
    }
  }
];

// Serverless Mongoose connection caching
let cachedDb = global._mongoConnection || null;

async function connectToMongo(uri) {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  const conn = await mongoose.connect(uri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000
  });
  global._mongoConnection = conn;
  cachedDb = conn;

  // Auto seed on first run
  await seedMongoData();
  return conn;
}

async function seedMongoData() {
  // 1. Settings
  const settingsCount = await OfficeSettings.countDocuments();
  if (settingsCount === 0) {
    await OfficeSettings.create({
      companyName: "أندية وادي دجلة - Wadi Degla Clubs",
      shiftHours: 8,
      graceMinutes: 15,
      workStartTime: "09:00",
      workEndTime: "17:00"
    });
  }

  // 2. Branches
  for (const b of DEFAULT_BRANCHES) {
    await Branch.updateOne({ id: b.id }, { $set: b }, { upsert: true });
  }

  // 3. Titles
  const validCodes = DEFAULT_TITLES.map(t => t.code);
  await Title.deleteMany({ code: { $nin: validCodes } });
  for (const t of DEFAULT_TITLES) {
    await Title.updateOne({ code: t.code }, { $set: t }, { upsert: true });
  }

  // 4. Default Master Seed Employee if none exist
  const empCount = await Employee.countDocuments();
  if (empCount === 0) {
    await Employee.create([
      {
        id: "emp_1792955351678",
        name: "ديفيد جان",
        phone: "01010046078",
        password: "1111",
        pin: "1111",
        titleCode: "memberships_executive_director",
        jobTitle: "Memberships Executive Director",
        branchId: "branch_october2",
        weeklyOffDays: ["friday", "saturday"],
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
        leaveBalance: 21,
        permissionsBalanceHours: 6,
        createdAt: new Date().toISOString()
      }
    ]);
  }
}

class MongoDatabaseAdapter {
  constructor(uri) {
    this.uri = uri;
  }

  async ensureConnected() {
    if (!this.uri) return false;
    await connectToMongo(this.uri);
    return true;
  }

  async getOfficeSettings() {
    await this.ensureConnected();
    let s = await OfficeSettings.findOne().lean();
    if (!s) {
      s = await OfficeSettings.create({
        companyName: "أندية وادي دجلة - Wadi Degla Clubs",
        shiftHours: 8,
        graceMinutes: 15,
        workStartTime: "09:00",
        workEndTime: "17:00"
      });
    }
    return s;
  }

  async updateOfficeSettings(newSettings) {
    await this.ensureConnected();
    const updated = await OfficeSettings.findOneAndUpdate(
      {},
      { $set: newSettings },
      { new: true, upsert: true }
    ).lean();
    return updated;
  }

  async getBranches() {
    await this.ensureConnected();
    return Branch.find().lean();
  }

  async getBranchById(id) {
    await this.ensureConnected();
    const b = await Branch.findOne({ $or: [{ id }, { code: id }] }).lean();
    return b || DEFAULT_BRANCHES[0];
  }

  async updateBranch(id, branchData) {
    await this.ensureConnected();
    const updated = await Branch.findOneAndUpdate(
      { $or: [{ id }, { code: id }] },
      { $set: branchData },
      { new: true }
    ).lean();
    return updated;
  }

  async getTitles() {
    await this.ensureConnected();
    return Title.find().lean();
  }

  async updateTitlePermissions(code, permissions) {
    await this.ensureConnected();
    const updated = await Title.findOneAndUpdate(
      { code },
      { $set: { permissions } },
      { new: true }
    ).lean();
    return updated;
  }

  async getEmployees(branchId = null) {
    await this.ensureConnected();
    const query = (branchId && branchId !== 'all') ? { branchId } : {};
    const employees = await Employee.find(query).lean();
    const titles = await Title.find().lean();
    const branches = await Branch.find().lean();

    return employees.map(emp => {
      const titleObj = titles.find(t => t.code === emp.titleCode);
      const branchObj = branches.find(b => b.id === emp.branchId);
      return {
        ...emp,
        titleDetails: titleObj || null,
        branchDetails: branchObj || null,
        branchName: branchObj ? branchObj.name : 'غير محدد',
        permissions: titleObj ? titleObj.permissions : {}
      };
    });
  }

  async getEmployeeById(id) {
    await this.ensureConnected();
    const emp = await Employee.findOne({ id }).lean();
    if (!emp) return null;
    const titleObj = await Title.findOne({ code: emp.titleCode }).lean();
    const branchObj = await Branch.findOne({ id: emp.branchId }).lean();
    return {
      ...emp,
      titleDetails: titleObj || null,
      branchDetails: branchObj || null,
      branchName: branchObj ? branchObj.name : 'غير محدد',
      permissions: titleObj ? titleObj.permissions : {}
    };
  }

  async registerEmployee(empData) {
    await this.ensureConnected();
    const existing = await Employee.findOne({ phone: empData.phone.trim() });
    if (existing) {
      throw new Error(`رقم الهاتف (${empData.phone}) مسجل بالفعل لموظف آخر.`);
    }

    const newEmp = new Employee({
      id: "emp_" + Date.now(),
      name: empData.name.trim(),
      phone: empData.phone.trim(),
      password: (empData.password || empData.pin || "1234").trim(),
      pin: (empData.pin || empData.password || "1234").trim(),
      titleCode: empData.titleCode || "specialist",
      jobTitle: empData.jobTitle || "Specialist",
      branchId: empData.branchId || "branch_sheraton",
      weeklyOffDays: empData.weeklyOffDays || ["friday", "saturday"],
      avatar: empData.avatar || "",
      leaveBalance: 21,
      permissionsBalanceHours: 6,
      createdAt: new Date().toISOString()
    });

    await newEmp.save();
    return this.getEmployeeById(newEmp.id);
  }

  async loginEmployee(phone, password) {
    await this.ensureConnected();
    const emp = await Employee.findOne({ phone: phone.trim() }).lean();
    if (!emp) {
      throw new Error("رقم الهاتف غير مسجل بالنظام.");
    }

    const expectedPass = emp.password || emp.pin || "";
    if (expectedPass && expectedPass !== password.trim()) {
      throw new Error("كلمة المرور غير صحيحة.");
    }

    return this.getEmployeeById(emp.id);
  }

  async updateProfile(employeeId, { name, avatar, weeklyOffDays, jobTitle, branchId }) {
    await this.ensureConnected();
    const updates = {};
    if (name) updates.name = name.trim();
    if (avatar) updates.avatar = avatar;
    if (weeklyOffDays && Array.isArray(weeklyOffDays)) updates.weeklyOffDays = weeklyOffDays;
    if (jobTitle) updates.jobTitle = jobTitle;
    if (branchId) updates.branchId = branchId;

    await Employee.updateOne({ id: employeeId }, { $set: updates });
    return this.getEmployeeById(employeeId);
  }

  async changePassword(employeeId, oldPassword, newPassword) {
    await this.ensureConnected();
    const emp = await Employee.findOne({ id: employeeId });
    if (!emp) throw new Error("الموظف غير موجود.");

    const currentPass = emp.password || emp.pin || "";
    if (currentPass && currentPass !== oldPassword.trim()) {
      throw new Error("كلمة المرور الحالية غير صحيحة.");
    }

    if (!newPassword || newPassword.trim().length < 3) {
      throw new Error("كلمة المرور الجديدة يجب ألا تقل عن 3 خانات.");
    }

    emp.password = newPassword.trim();
    emp.pin = newPassword.trim();
    await emp.save();
    return { success: true, message: "تم تغيير كلمة المرور بنجاح!" };
  }

  async deleteEmployee(employeeId) {
    await this.ensureConnected();
    if (employeeId === "emp_admin") {
      throw new Error("لا يمكن حذف حساب الإدارة الرئيسي للنظام.");
    }

    const emp = await Employee.findOne({ id: employeeId });
    if (!emp) {
      throw new Error("الموظف غير موجود.");
    }

    await Employee.deleteOne({ id: employeeId });
    await AttendanceRecord.deleteMany({ employeeId });
    await Request.deleteMany({ employeeId });

    return { success: true, message: `تم حذف حساب "${emp.name}" نهائياً بنجاح.` };
  }

  async getTodayAttendance(dateStr = null, branchId = null) {
    await this.ensureConnected();
    const today = dateStr || new Date().toISOString().split('T')[0];
    const query = { date: today };
    if (branchId && branchId !== 'all') {
      query.branchId = branchId;
    }
    return AttendanceRecord.find(query).lean();
  }

  async checkIn(employeeId, latitude, longitude) {
    await this.ensureConnected();
    const today = new Date().toISOString().split('T')[0];
    const emp = await this.getEmployeeById(employeeId);
    if (!emp) throw new Error("الموظف غير موجود.");

    const branch = await this.getBranchById(emp.branchId);

    const existing = await AttendanceRecord.findOne({ employeeId, date: today, checkOutTime: null });
    if (existing) {
      throw new Error("الموظف مسجل حضور بالفعل وموجود في العمل حالياً.");
    }

    const distanceMeters = calculateDistanceMeters(latitude, longitude, branch.latitude, branch.longitude);
    if (distanceMeters > branch.radiusMeters) {
      throw new Error(
        `أنت خارج نطاق فرع (${branch.name})! المسافة بينك وبين الفرع ${distanceMeters} متر (المسموح به ${branch.radiusMeters} متر فقط).`
      );
    }

    const newRecord = new AttendanceRecord({
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
    });

    await newRecord.save();
    return newRecord.toObject();
  }

  async checkOut(employeeId, latitude, longitude, forceOverride = false, reason = "") {
    await this.ensureConnected();
    const today = new Date().toISOString().split('T')[0];
    const record = await AttendanceRecord.findOne({ employeeId, date: today, checkOutTime: null });
    if (!record) {
      throw new Error("لا يوجد تسجيل حضور نشط لهذا الموظف اليوم.");
    }

    const now = new Date();
    const checkInTime = new Date(record.checkInTime);
    const durationMinutes = Math.max(0, Math.floor((now - checkInTime) / 60000));
    const durationHours = durationMinutes / 60;

    const settings = await this.getOfficeSettings();
    const requiredHours = settings.shiftHours || 8;

    const hasPermission = await Request.findOne({
      employeeId,
      type: "permission",
      date: today,
      status: "approved"
    });

    const effectiveRequiredHours = hasPermission ? Math.max(requiredHours - 2, 0) : requiredHours;

    if (durationHours < effectiveRequiredHours) {
      const emp = await Employee.findOne({ id: employeeId }).lean();
      const isExecutiveOrManager = ['memberships_executive_director', 'memberships_area_manager', 'memberships_manager'].includes(emp?.titleCode);

      // Check if employee has an approved early checkout request from Memberships Manager
      const approvedEarlyReq = await Request.findOne({
        employeeId,
        type: "early_checkout",
        date: today,
        status: "approved"
      });

      if (!isExecutiveOrManager && !approvedEarlyReq) {
        const remainingMinutes = Math.ceil(effectiveRequiredHours * 60 - durationMinutes);
        const remHours = Math.floor(remainingMinutes / 60);
        const remMins = remainingMinutes % 60;
        throw new Error(
          `لا يمكن تسجيل الانصراف قبل إتمام ${effectiveRequiredHours} ساعات عمل (متبقي لديك: ${remHours} ساعة و ${remMins} دقيقة). يتطلب الانصراف المبكر تقديم طلب انصراف طارئ واعتماده من مدير العضويات (Memberships Manager).`
        );
      }

      if (approvedEarlyReq) {
        reason = approvedEarlyReq.reason || reason || "انصراف طارئ معتمد من مدير العضويات";
        forceOverride = true;
      }
    }

    record.checkOutTime = now.toISOString();
    record.durationMinutes = durationMinutes;
    record.completed8Hours = durationHours >= effectiveRequiredHours;
    record.status = "checked_out";
    record.checkOutNotes = forceOverride ? `انصراف استثنائي / مبكر: ${reason}` : "انصراف نظامي بعد إتمام ساعات العمل";
    if (forceOverride && reason) {
      record.earlyCheckoutReason = reason;
    }

    await record.save();
    return record.toObject();
  }

  async getLiveOfficeStatus(dateStr, branchId = null) {
    await this.ensureConnected();
    const today = dateStr || new Date().toISOString().split('T')[0];
    let employees = await this.getEmployees(branchId);

    const todayAttendance = await this.getTodayAttendance(today, branchId);
    const todayRequests = await Request.find({
      status: "approved",
      $or: [
        { date: today },
        { startDate: { $lte: today }, endDate: { $gte: today } }
      ]
    }).lean();

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

      const permission = todayRequests.find(r => r.employeeId === emp.id && r.type === "permission");
      if (permission) {
        result.summary.onPermissionCount++;
        result.onPermission.push({ employee: emp, permission });
        return;
      }

      const leave = todayRequests.find(r => r.employeeId === emp.id && r.type === "leave");
      if (leave) {
        result.summary.onLeaveCount++;
        const cat = leave.leaveType || 'other';
        if (result.onLeave[cat]) {
          result.onLeave[cat].push({ employee: emp, leave });
        } else {
          result.onLeave.other.push({ employee: emp, leave });
        }
        return;
      }

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

      result.summary.absentCount++;
      result.absent.push({ employee: emp });
    });

    return result;
  }

  async getRequests(filters = {}) {
    await this.ensureConnected();
    const query = {};
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;

    let list = await Request.find(query).sort({ requestedAt: -1 }).lean();

    if (filters.branchId && filters.branchId !== 'all') {
      const branchEmployees = await Employee.find({ branchId: filters.branchId }, { id: 1 }).lean();
      const branchEmpIds = new Set(branchEmployees.map(e => e.id));
      list = list.filter(r => branchEmpIds.has(r.employeeId));
    }

    const employees = await Employee.find().lean();
    const branches = await Branch.find().lean();

    return list.map(req => {
      const emp = employees.find(e => e.id === req.employeeId);
      const branch = emp ? branches.find(b => b.id === emp.branchId) : null;
      return {
        ...req,
        employeeName: emp ? emp.name : "موظف غير معروف",
        employeeJobTitle: emp ? emp.jobTitle : "",
        employeeBranch: branch ? branch.name : "",
        employeeAvatar: emp ? emp.avatar : ""
      };
    });
  }

  async createRequest(requestData) {
    await this.ensureConnected();
    if (requestData.type === 'early_checkout') {
      const today = requestData.date || new Date().toISOString().split('T')[0];
      requestData.date = today;

      const activeRecord = await AttendanceRecord.findOne({
        employeeId: requestData.employeeId,
        date: today,
        checkOutTime: null
      });
      if (!activeRecord) {
        throw new Error("لا يمكن تقديم طلب انصراف طارئ لعدم وجود تسجيل حضور نشط اليوم.");
      }

      const existingPending = await Request.findOne({
        employeeId: requestData.employeeId,
        type: 'early_checkout',
        date: today,
        status: 'pending'
      });
      if (existingPending) {
        throw new Error("لديك بالفعل طلب انصراف طارئ قيد المراجعة حالياً من مدير العضويات.");
      }
    }

    const newReq = new Request({
      id: "req_" + Date.now(),
      status: "pending",
      requestedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      ...requestData
    });
    await newReq.save();
    return newReq.toObject();
  }

  async reviewRequest(requestId, reviewerId, status, reviewNote) {
    await this.ensureConnected();
    const req = await Request.findOne({ id: requestId });
    if (!req) return null;

    req.status = status;
    req.reviewedBy = reviewerId;
    req.reviewedAt = new Date().toISOString();
    req.reviewNote = reviewNote || (status === 'approved' ? 'تمت الموافقة' : 'تم الرفض');

    if (status === 'approved' && req.type === 'leave' && req.leaveType !== 'weekly_off') {
      const emp = await Employee.findOne({ id: req.employeeId });
      if (emp && emp.leaveBalance > 0) {
        let daysToDeduct = 1;
        if (req.startDate && req.endDate) {
          const d1 = new Date(req.startDate);
          const d2 = new Date(req.endDate);
          const diffTime = d2.getTime() - d1.getTime();
          const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
          if (diffDays > 0) daysToDeduct = diffDays;
        }
        emp.leaveBalance = Math.max(0, emp.leaveBalance - daysToDeduct);
        await emp.save();
      }
    }

    if (status === 'approved' && req.type === 'permission') {
      const emp = await Employee.findOne({ id: req.employeeId });
      if (emp && emp.permissionsBalanceHours >= (req.permissionHours || 2)) {
        emp.permissionsBalanceHours = Math.max(0, emp.permissionsBalanceHours - (req.permissionHours || 2));
        await emp.save();
      }
    }

    if (req.type === 'early_checkout') {
      const reviewer = await Employee.findOne({ id: reviewerId }).lean();
      const canApproveEarly = ['memberships_manager', 'memberships_area_manager', 'memberships_executive_director'].includes(reviewer?.titleCode);
      if (!canApproveEarly) {
        throw new Error("عفواً، اعتماد طلبات الانصراف الطارئ صلاحية حصرية لمدير العضويات (Memberships Manager) والإدارة العليا.");
      }

      if (status === 'approved') {
        const today = req.date || new Date().toISOString().split('T')[0];
        const activeRecord = await AttendanceRecord.findOne({
          employeeId: req.employeeId,
          date: today,
          checkOutTime: null
        });

        if (activeRecord) {
          const now = new Date();
          const checkInTime = new Date(activeRecord.checkInTime);
          const durationMinutes = Math.max(0, Math.floor((now - checkInTime) / 60000));
          activeRecord.checkOutTime = now.toISOString();
          activeRecord.durationMinutes = durationMinutes;
          activeRecord.completed8Hours = false;
          activeRecord.status = "checked_out";
          activeRecord.checkOutNotes = `انصراف طارئ معتمد من مدير العضويات: ${req.reason}`;
          activeRecord.earlyCheckoutReason = req.reason;
          await activeRecord.save();
        }
      }
    }

    await req.save();
    return req.toObject();
  }

  async getMonthlyReport({ year, month, branchId = null, employeeId = null }) {
    await this.ensureConnected();
    const targetYear = parseInt(year, 10) || new Date().getFullYear();
    const targetMonth = parseInt(month, 10) || (new Date().getMonth() + 1);
    const monthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    let employees = await this.getEmployees(branchId);
    if (employeeId && employeeId !== 'all') {
      employees = employees.filter(e => e.id === employeeId);
    }

    const attQuery = { date: { $regex: `^${monthStr}` } };
    if (branchId && branchId !== 'all') attQuery.branchId = branchId;
    if (employeeId && employeeId !== 'all') attQuery.employeeId = employeeId;
    const attendance = await AttendanceRecord.find(attQuery).lean();

    const reqQuery = {
      status: 'approved',
      $or: [
        { date: { $regex: `^${monthStr}` } },
        { startDate: { $regex: `^${monthStr}` } }
      ]
    };
    if (employeeId && employeeId !== 'all') reqQuery.employeeId = employeeId;
    const requests = await Request.find(reqQuery).lean();

    const branches = await Branch.find().lean();

    const enrichedAttendance = attendance.map(r => {
      const emp = employees.find(e => e.id === r.employeeId);
      const branch = branches.find(b => b.id === r.branchId);
      return {
        ...r,
        employeeName: emp ? emp.name : 'موظف',
        jobTitle: emp ? emp.jobTitle : '',
        avatar: emp ? emp.avatar : '',
        branchName: branch ? branch.name : ''
      };
    }).sort((a, b) => b.date.localeCompare(a.date));

    const enrichedRequests = requests.map(r => {
      const emp = employees.find(e => e.id === r.employeeId);
      const branch = emp ? branches.find(b => b.id === emp.branchId) : null;
      return {
        ...r,
        employeeName: emp ? emp.name : 'موظف',
        jobTitle: emp ? emp.jobTitle : '',
        avatar: emp ? emp.avatar : '',
        branchName: branch ? branch.name : ''
      };
    }).sort((a, b) => (b.date || b.startDate).localeCompare(a.date || a.startDate));

    const employeeSummaries = employees.map(emp => {
      const empBranch = branches.find(b => b.id === emp.branchId);
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
  MongoDatabaseAdapter,
  calculateDistanceMeters,
  DAY_MAP,
  DEFAULT_BRANCHES,
  DEFAULT_TITLES
};
