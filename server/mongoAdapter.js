const mongoose = require('mongoose');
const { Branch, Title, Employee, AttendanceRecord, Request, OfficeSettings, PushSubscription, WebAuthnChallenge } = require('./models');

// Configure VAPID for Web Push Notifications (Works even when app is closed on mobile)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BKDfJ-gm-z4cJNeyTTBe3cD_bPcugExOm9yLKbZQZ68s0lQADHy-pGzkJ_Mbuf7IlZL0B5elp4MVu8Xy_3LXGSk";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "-CF2u_m7I2mFHqknnMkYRDkIE0gXvD69zW63PEA0tzM";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@wadidegla.com";

let webPush = null;
try {
  webPush = require('web-push');
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  console.warn("VAPID setup warning:", e.message);
}

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

const DEFAULT_SECTORS = [
  {
    id: 'sector_west_cairo',
    name: 'قطاع غرب القاهرة',
    branchIds: ['branch_maadi', 'branch_october1', 'branch_october2']
  },
  {
    id: 'sector_east_cairo',
    name: 'قطاع شرق القاهرة',
    branchIds: ['branch_nakheel', 'branch_lotus']
  },
  {
    id: 'sector_east_delta',
    name: 'قطاع شرق الدلتا',
    branchIds: ['branch_sheraton', 'branch_damietta', 'branch_mansoura']
  },
  {
    id: 'sector_alex_tanta',
    name: 'قطاع اسكندرية وطنطا',
    branchIds: ['branch_alexandria', 'branch_tanta']
  },
  {
    id: 'sector_upper_egypt',
    name: 'قطاع الصعيد',
    branchIds: ['branch_minya', 'branch_assiut']
  }
];

const DEFAULT_BRANCHES = [
  // قطاع غرب القاهرة
  { id: 'branch_maadi', code: 'maadi', name: 'المعادي', city: 'القاهرة', latitude: 29.9602, longitude: 31.2568, radiusMeters: 100, sectorId: 'sector_west_cairo', sectorName: 'قطاع غرب القاهرة' },
  { id: 'branch_october1', code: 'october1', name: 'اكتوبر ١', city: 'الجيزة', latitude: 29.9723, longitude: 30.9421, radiusMeters: 100, sectorId: 'sector_west_cairo', sectorName: 'قطاع غرب القاهرة' },
  { id: 'branch_october2', code: 'october2', name: 'اكتوبر ٢', city: 'الجيزة', latitude: 29.9652734, longitude: 30.9634410, radiusMeters: 150, sectorId: 'sector_west_cairo', sectorName: 'قطاع غرب القاهرة' },

  // قطاع شرق القاهرة
  { id: 'branch_nakheel', code: 'nakheel', name: 'النخيل', city: 'القاهرة الجديدة', latitude: 30.0465, longitude: 31.4425, radiusMeters: 120, sectorId: 'sector_east_cairo', sectorName: 'قطاع شرق القاهرة' },
  { id: 'branch_lotus', code: 'lotus', name: 'اللوتس', city: 'القاهرة الجديدة', latitude: 30.0384, longitude: 31.4880, radiusMeters: 100, sectorId: 'sector_east_cairo', sectorName: 'قطاع شرق القاهرة' },

  // قطاع شرق الدلتا
  { id: 'branch_sheraton', code: 'sheraton', name: 'شيراتون', city: 'القاهرة', latitude: 30.1025, longitude: 31.3780, radiusMeters: 100, sectorId: 'sector_east_delta', sectorName: 'قطاع شرق الدلتا' },
  { id: 'branch_damietta', code: 'damietta', name: 'دمياط', city: 'دمياط الجديدة', latitude: 31.4365, longitude: 31.6705, radiusMeters: 150, sectorId: 'sector_east_delta', sectorName: 'قطاع شرق الدلتا' },
  { id: 'branch_mansoura', code: 'mansoura', name: 'المنصورة', city: 'المنصورة', latitude: 31.0535, longitude: 31.3785, radiusMeters: 150, sectorId: 'sector_east_delta', sectorName: 'قطاع شرق الدلتا' },

  // قطاع اسكندرية وطنطا
  { id: 'branch_alexandria', code: 'alexandria', name: 'اسكندرية', city: 'الإسكندرية', latitude: 31.2001, longitude: 29.9187, radiusMeters: 120, sectorId: 'sector_alex_tanta', sectorName: 'قطاع اسكندرية وطنطا' },
  { id: 'branch_tanta', code: 'tanta', name: 'طنطا', city: 'طنطا', latitude: 30.7925, longitude: 31.0012, radiusMeters: 120, sectorId: 'sector_alex_tanta', sectorName: 'قطاع اسكندرية وطنطا' },

  // قطاع الصعيد
  { id: 'branch_minya', code: 'minya', name: 'المنيا', city: 'المنيا', latitude: 28.0871, longitude: 30.7618, radiusMeters: 120, sectorId: 'sector_upper_egypt', sectorName: 'قطاع الصعيد' },
  { id: 'branch_assiut', code: 'assiut', name: 'اسيوط', city: 'أسيوط', latitude: 27.1809, longitude: 31.1837, radiusMeters: 120, sectorId: 'sector_upper_egypt', sectorName: 'قطاع الصعيد' }
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
    order: 1,
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
      override_early_checkout: true,
      edit_employee_details: true
    }
  },
  {
    id: "title_memberships_area_manager",
    code: "memberships_area_manager",
    name: "Memberships Area Manager (مدير منطقة العضويات)",
    englishTitle: "Memberships Area Manager",
    arabicTitle: "مدير منطقة العضويات",
    description: "إدارة ومتابعة فروع القطاع التابع له فقط واعتماد كافة طلبات الإجازات والأذونات والانصراف والتقارير",
    color: "amber",
    order: 2,
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
      manage_office_settings: false,
      view_reports: true,
      view_all_branches: false,
      override_early_checkout: true,
      edit_employee_details: false
    }
  },
  {
    id: "title_memberships_manager",
    code: "memberships_manager",
    name: "Memberships Manager (مدير العضويات)",
    englishTitle: "Memberships Manager",
    arabicTitle: "مدير العضويات",
    description: "الجهة المخولة حصرياً بالفرع باعتماد طلبات الانصراف الطارئ والإجازات والأذونات وإدارة الفريق لفرعه فقط",
    color: "amber",
    order: 3,
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
      view_all_branches: false,
      override_early_checkout: true,
      edit_employee_details: false
    }
  },
  {
    id: "title_memberships_deputy_manager",
    code: "memberships_deputy_manager",
    name: "Memberships Deputy Manager (نائب مدير العضويات)",
    englishTitle: "Memberships Deputy Manager",
    arabicTitle: "نائب مدير العضويات",
    description: "متابعة فريق الفرع ومراجعة الطلبات والتقارير لفرعه فقط - الانصراف الطارئ والإجازات تتطلب موافقة مدير العضويات",
    color: "amber",
    order: 4,
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
      override_early_checkout: false,
      edit_employee_details: false
    }
  },
  {
    id: "title_memberships_section_head",
    code: "memberships_section_head",
    name: "Memberships Section Head (رئيس قسم العضويات)",
    englishTitle: "Memberships Section Head",
    arabicTitle: "رئيس قسم العضويات",
    description: "إدارة فريق القسم ومتابعة الحضور - الانصراف الطارئ والإجازات تتطلب موافقة مدير العضويات",
    color: "zinc",
    order: 5,
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
      override_early_checkout: false,
      edit_employee_details: false
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
    order: 6,
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
      override_early_checkout: false,
      edit_employee_details: false
    }
  },
  {
    id: "title_memberships_specialist",
    code: "memberships_specialist",
    name: "Memberships Specialist (أخصائي عضويات)",
    englishTitle: "Memberships Specialist",
    arabicTitle: "أخصائي عضويات",
    description: "تسجيل الحضور والانصراف بالـ GPS وتقديم طلبات الإجازات والأذونات",
    color: "zinc",
    order: 7,
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
      override_early_checkout: false,
      edit_employee_details: false
    }
  }
];

// Serverless Mongoose connection caching
let cachedDb = global._mongoConnection || null;
let connectingPromise = null;
let isSeeding = false;

async function connectToMongo(uri) {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 10,
    minPoolSize: 1,
    socketTimeoutMS: 20000,
    connectTimeoutMS: 10000
  }).then(conn => {
    global._mongoConnection = conn;
    cachedDb = conn;
    connectingPromise = null;

    if (!global._mongoSeeded) {
      global._mongoSeeded = true;
      checkAndSeedIfEmpty().catch(err => {
        console.error("Background seed check warning:", err.message);
      });
    }

    return conn;
  }).catch(err => {
    connectingPromise = null;
    throw err;
  });

  return connectingPromise;
}

async function checkAndSeedIfEmpty() {
  if (isSeeding) return;
  isSeeding = true;
  try {
    const branchCount = await Branch.estimatedDocumentCount();
    if (branchCount > 0) {
      // Database already seeded and healthy.
      return;
    }
    await seedMongoData();
  } catch (err) {
    console.error("checkAndSeedIfEmpty error:", err);
  } finally {
    isSeeding = false;
  }
}

async function seedMongoData() {
  try {
    // 1. Settings
    const settingsCount = await OfficeSettings.estimatedDocumentCount();
    if (settingsCount === 0) {
      await OfficeSettings.create({
        companyName: "أندية وادي دجلة - Wadi Degla Clubs",
        shiftHours: 8,
        graceMinutes: 15,
        workStartTime: "09:00",
        workEndTime: "17:00"
      });
    }

    // 2. Branches (Parallel execution)
    const existingBranches = await Branch.find({}, { id: 1 }).lean();
    const existingBranchIds = new Set(existingBranches.map(b => b.id));
    const missingBranches = DEFAULT_BRANCHES.filter(b => !existingBranchIds.has(b.id));
    if (missingBranches.length > 0) {
      await Branch.insertMany(missingBranches);
    }

    // 3. Titles (Parallel execution)
    const validCodes = DEFAULT_TITLES.map(t => t.code);
    await Title.deleteMany({ code: { $nin: validCodes } });
    const existingTitles = await Title.find({}, { code: 1 }).lean();
    const existingTitleCodes = new Set(existingTitles.map(t => t.code));
    const missingTitles = DEFAULT_TITLES.filter(t => !existingTitleCodes.has(t.code));
    if (missingTitles.length > 0) {
      await Title.insertMany(missingTitles);
    }
    await Title.updateOne(
      { code: "memberships_executive_director", "permissions.edit_employee_details": { $ne: true } },
      { $set: { "permissions.edit_employee_details": true } }
    );

    // 4. Master Ghost Super Admin
    const existingAdmin = await Employee.findOne({ phone: "01010046078" });
    if (!existingAdmin) {
      await Employee.create({
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
        leaveBalance: 30,
        permissionsBalanceHours: 10,
        isSuperAdmin: true,
        isGhost: true,
        createdAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("seedMongoData error:", err);
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
    const titles = await Title.find().lean();
    return titles.map(t => {
      const defaultTitle = DEFAULT_TITLES.find(dt => dt.code === t.code);
      const defaultPerms = defaultTitle ? defaultTitle.permissions : {};
      return {
        ...t,
        permissions: {
          ...defaultPerms,
          ...(t.permissions || {})
        }
      };
    });
  }

  async updateTitlePermissions(code, permissions) {
    await this.ensureConnected();
    const doc = await Title.findOne({ code });
    if (!doc) return null;
    const currentPerms = doc.permissions ? (doc.permissions.toObject ? doc.permissions.toObject() : doc.permissions) : {};
    doc.permissions = { ...currentPerms, ...permissions };
    doc.markModified('permissions');
    await doc.save();
    return doc.toObject ? doc.toObject() : doc;
  }

  async getSectors() {
    return DEFAULT_SECTORS;
  }

  async getEmployees(branchId = null, includeGhost = false) {
    await this.ensureConnected();
    let query = {};
    if (!includeGhost) {
      query.phone = { $ne: "01010046078" };
      query.isGhost = { $ne: true };
    }
    if (branchId && branchId !== 'all') {
      if (Array.isArray(branchId)) {
        query.branchId = { $in: branchId };
      } else if (branchId.includes(',')) {
        query.branchId = { $in: branchId.split(',') };
      } else {
        query.branchId = branchId;
      }
    }
    const [employees, titles, branches] = await Promise.all([
      Employee.find(query).lean(),
      Title.find().lean(),
      Branch.find().lean()
    ]);

    return employees.map(emp => {
      const titleObj = titles.find(t => t.code === emp.titleCode);
      const branchObj = branches.find(b => b.id === emp.branchId);
      const isSuper = Boolean(emp.isSuperAdmin || emp.phone === "01010046078");
      return {
        ...emp,
        isSuperAdmin: isSuper,
        isGhost: isSuper ? true : Boolean(emp.isGhost),
        titleDetails: titleObj || null,
        branchDetails: branchObj || null,
        branchName: branchObj ? branchObj.name : 'غير محدد',
        permissions: isSuper
          ? {
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
          : (titleObj ? titleObj.permissions : {})
      };
    });
  }

  async getEmployeeById(id) {
    await this.ensureConnected();
    const emp = await Employee.findOne({ id }).lean();
    if (!emp) return null;
    const [titleObj, branchObj] = await Promise.all([
      Title.findOne({ code: emp.titleCode }).lean(),
      Branch.findOne({ id: emp.branchId }).lean()
    ]);
    const isSuper = Boolean(emp.isSuperAdmin || emp.phone === "01010046078");
    return {
      ...emp,
      isSuperAdmin: isSuper,
      isGhost: isSuper ? true : Boolean(emp.isGhost),
      titleDetails: titleObj || null,
      branchDetails: branchObj || null,
      branchName: branchObj ? branchObj.name : 'غير محدد',
      permissions: isSuper
        ? {
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
        : (titleObj ? titleObj.permissions : {})
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
      titleCode: empData.titleCode || "memberships_specialist",
      jobTitle: empData.jobTitle || "Memberships Specialist",
      branchId: empData.branchId || "branch_october2",
      sectorId: empData.sectorId || "",
      sectorName: empData.sectorName || "",
      weeklyOffDays: empData.weeklyOffDays || ["friday", "saturday"],
      avatar: empData.avatar || "",
      leaveBalance: empData.leaveBalance !== undefined ? empData.leaveBalance : 30,
      permissionsBalanceHours: empData.permissionsBalanceHours !== undefined ? empData.permissionsBalanceHours : 2,
      boundDeviceId: empData.deviceId || null,
      deviceInfo: empData.deviceInfo || null,
      deviceBoundAt: empData.deviceId ? new Date().toISOString() : null,
      createdAt: new Date().toISOString()
    });

    await newEmp.save();

    const [titleObj, branchObj] = await Promise.all([
      Title.findOne({ code: newEmp.titleCode }).lean(),
      Branch.findOne({ id: newEmp.branchId }).lean()
    ]);

    return {
      ...newEmp.toObject(),
      isSuperAdmin: false,
      isGhost: false,
      titleDetails: titleObj || null,
      branchDetails: branchObj || null,
      branchName: branchObj ? branchObj.name : 'غير محدد',
      permissions: titleObj ? titleObj.permissions : {}
    };
  }

  async _enrichEmployee(emp, deviceContext = null) {
    const cleanPhone = emp.phone ? emp.phone.trim() : '';
    const isSuper = (cleanPhone === "01010046078" || emp.isSuperAdmin);

    // Device binding check (Super Admin can login from any device, no restriction)
    if (!isSuper && deviceContext && deviceContext.deviceId) {
      if (!emp.boundDeviceId) {
        emp.boundDeviceId = deviceContext.deviceId;
        emp.deviceInfo = deviceContext.deviceInfo || 'جهاز الهاتف المسجل';
        emp.deviceBoundAt = new Date().toISOString();
        await emp.save();
      } else if (emp.boundDeviceId !== deviceContext.deviceId) {
        const boundDate = emp.deviceBoundAt ? new Date(emp.deviceBoundAt).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : '';
        throw new Error(`عذراً، هذا الحساب مرتبط بجهاز آخر بالفعل (${emp.deviceInfo || 'الهاتف المعتمد الأول'} - ${boundDate}). لا يُسمح بتسجيل الدخول من أكثر من جهاز. يرجى مراجعة إدارة النادي لفك ارتباط جهازك القديم ونقله للجهاز الجديد.`);
      }
    }

    const [titleObj, branchObj] = await Promise.all([
      Title.findOne({ code: emp.titleCode }).lean(),
      Branch.findOne({ id: emp.branchId }).lean()
    ]);

    const empObj = emp.toObject ? emp.toObject() : emp;
    return {
      ...empObj,
      isSuperAdmin: isSuper,
      isGhost: isSuper ? true : Boolean(emp.isGhost),
      titleDetails: titleObj || null,
      branchDetails: branchObj || null,
      branchName: branchObj ? branchObj.name : 'غير محدد',
      permissions: isSuper
        ? {
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
        : (titleObj ? titleObj.permissions : {})
    };
  }

  async loginEmployee(phone, password, deviceContext = null) {
    await this.ensureConnected();
    const cleanPhone = phone.trim();
    const emp = await Employee.findOne({ phone: cleanPhone });
    if (!emp) {
      throw new Error("رقم الهاتف غير مسجل بالنظام.");
    }

    const expectedPass = emp.password || emp.pin || "";
    if (expectedPass && expectedPass !== password.trim()) {
      throw new Error("كلمة المرور غير صحيحة.");
    }

    return await this._enrichEmployee(emp, deviceContext);
  }

  async getEmployeeById(employeeId) {
    await this.ensureConnected();
    return await Employee.findOne({ id: employeeId });
  }

  async getEmployeeByPhone(phone) {
    await this.ensureConnected();
    return await Employee.findOne({ phone: phone.trim() });
  }

  async getEmployeeByPasskeyId(credentialId) {
    await this.ensureConnected();
    return await Employee.findOne({ 'passkeys.id': credentialId });
  }

  async addPasskeyToEmployee(employeeId, passkeyData) {
    await this.ensureConnected();
    const emp = await Employee.findOne({ id: employeeId });
    if (!emp) throw new Error("الموظف غير موجود بالنظام.");
    if (!emp.passkeys) emp.passkeys = [];
    emp.passkeys = emp.passkeys.filter(p => p.id !== passkeyData.id);
    emp.passkeys.push(passkeyData);
    emp.markModified('passkeys');
    await emp.save();
    return emp;
  }

  async removePasskeyFromEmployee(employeeId, credentialId) {
    await this.ensureConnected();
    const emp = await Employee.findOne({ id: employeeId });
    if (!emp) throw new Error("الموظف غير موجود بالنظام.");
    if (emp.passkeys) {
      emp.passkeys = emp.passkeys.filter(p => p.id !== credentialId);
      emp.markModified('passkeys');
      await emp.save();
    }
    return emp;
  }

  async updatePasskeyCounter(employeeId, credentialId, newCounter) {
    await this.ensureConnected();
    const emp = await Employee.findOne({ id: employeeId });
    if (!emp || !emp.passkeys) return;
    const pk = emp.passkeys.find(p => p.id === credentialId);
    if (pk) {
      pk.counter = newCounter;
      emp.markModified('passkeys');
      await emp.save();
    }
  }

  async saveWebAuthnChallenge(challenge, metadata = {}) {
    await this.ensureConnected();
    try {
      await WebAuthnChallenge.create({
        challenge,
        userId: metadata.userId || '',
        phone: metadata.phone || '',
        type: metadata.type || 'authentication'
      });
    } catch (e) {
      console.warn("Could not persist WebAuthnChallenge:", e.message);
    }
  }

  async consumeWebAuthnChallenge(challenge) {
    await this.ensureConnected();
    try {
      return await WebAuthnChallenge.findOneAndDelete({ challenge });
    } catch (e) {
      return null;
    }
  }

  async loginEmployeeByPasskey(emp, deviceContext = null) {
    await this.ensureConnected();
    return await this._enrichEmployee(emp, deviceContext);
  }

  async resetEmployeeDevice(employeeId) {
    await this.ensureConnected();
    const emp = await Employee.findOne({ id: employeeId });
    if (!emp) throw new Error("الموظف غير موجود.");
    emp.boundDeviceId = null;
    emp.deviceInfo = null;
    emp.deviceBoundAt = null;
    await emp.save();
    return { success: true, message: `تم فك ارتباط الجهاز للموظف (${emp.name}) بنجاح. يمكنه الآن تسجيل الدخول من جهازه الجديد وسيتم اعتماده تلقائياً.` };
  }

  async updateEmployeeBalances(employeeId, { leaveBalance, permissionsBalanceHours }) {
    await this.ensureConnected();
    const emp = await Employee.findOne({ id: employeeId });
    if (!emp) throw new Error("الموظف غير موجود.");
    if (leaveBalance !== undefined && leaveBalance !== null) emp.leaveBalance = Number(leaveBalance);
    if (permissionsBalanceHours !== undefined && permissionsBalanceHours !== null) emp.permissionsBalanceHours = Number(permissionsBalanceHours);
    await emp.save();
    return this.getEmployeeById(employeeId);
  }

  async updateEmployeeDetails(employeeId, data) {
    await this.ensureConnected();
    const emp = await Employee.findOne({ id: employeeId });
    if (!emp) throw new Error("الموظف غير موجود.");

    // Ghost Super Admin Protection
    if (emp.phone === "01010046078" || emp.isSuperAdmin) {
      throw new Error("لا يمكن تعديل بيانات مدير النظام العام.");
    }

    if (data.name && data.name.trim()) {
      emp.name = data.name.trim();
    }
    if (data.phone && data.phone.trim()) {
      const cleanPhone = data.phone.trim();
      const existing = await Employee.findOne({ phone: cleanPhone, id: { $ne: employeeId } });
      if (existing) {
        throw new Error(`رقم الهاتف (${cleanPhone}) مسجل بالفعل لموظف آخر.`);
      }
      emp.phone = cleanPhone;
    }
    if (data.titleCode) {
      const titleObj = await Title.findOne({ code: data.titleCode }).lean();
      if (titleObj) {
        emp.titleCode = titleObj.code;
        emp.jobTitle = titleObj.englishTitle || titleObj.name;
      }
    }
    if (data.branchId) {
      const branchObj = await Branch.findOne({ id: data.branchId }).lean();
      if (branchObj) {
        emp.branchId = branchObj.id;
      }
    }
    if (data.sectorId !== undefined) {
      emp.sectorId = data.sectorId || '';
      emp.sectorName = data.sectorName || '';
    }
    if (data.weeklyOffDays && Array.isArray(data.weeklyOffDays)) {
      emp.weeklyOffDays = data.weeklyOffDays;
    }
    if (data.leaveBalance !== undefined && data.leaveBalance !== null) {
      emp.leaveBalance = Number(data.leaveBalance);
    }
    if (data.permissionsBalanceHours !== undefined && data.permissionsBalanceHours !== null) {
      emp.permissionsBalanceHours = Number(data.permissionsBalanceHours);
    }

    await emp.save();
    return this.getEmployeeById(employeeId);
  }

  // Push Notifications Management
  async savePushSubscription(employeeId, subscription, userAgent = '') {
    await this.ensureConnected();
    if (!subscription || !subscription.endpoint) {
      throw new Error("بيانات الاشتراك في الإشعارات غير مكتملة.");
    }
    return PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        employeeId,
        subscription,
        userAgent,
        createdAt: new Date()
      },
      { upsert: true, new: true }
    );
  }

  async removePushSubscription(endpoint) {
    await this.ensureConnected();
    return PushSubscription.deleteOne({ endpoint });
  }

  async sendPushNotification(employeeId, payload) {
    if (!webPush) return { sentCount: 0 };
    await this.ensureConnected();
    const subs = await PushSubscription.find({ employeeId }).lean();
    if (!subs || subs.length === 0) return { sentCount: 0 };

    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    let sentCount = 0;

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webPush.sendNotification(sub.subscription, payloadStr);
          sentCount++;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await PushSubscription.deleteOne({ endpoint: sub.endpoint }).catch(() => {});
          } else {
            console.warn(`Push delivery warning to employee ${employeeId}:`, err.message);
          }
        }
      })
    );

    return { sentCount };
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

    const existing = await AttendanceRecord.findOne({ employeeId, date: today, checkOutTime: null });
    if (existing) {
      throw new Error("الموظف مسجل حضور بالفعل وموجود في العمل حالياً.");
    }

    // Check if employee has an approved work_mission for today
    const missionReq = await Request.findOne({
      employeeId,
      type: 'leave',
      leaveType: 'work_mission',
      status: 'approved',
      $or: [
        { missionDate: today },
        { date: today },
        { startDate: { $lte: today }, endDate: { $gte: today } }
      ]
    }).lean();

    const activeBranchId = (missionReq && missionReq.missionBranchId) ? missionReq.missionBranchId : emp.branchId;
    const branch = await this.getBranchById(activeBranchId);
    if (!branch) {
      throw new Error("الفرع المحدد غير موجود بالنظام.");
    }

    const distanceMeters = calculateDistanceMeters(latitude, longitude, branch.latitude, branch.longitude);
    if (distanceMeters > branch.radiusMeters) {
      const missionText = missionReq ? ` (مأمورية عمل معتمدة بفرع ${branch.name})` : '';
      throw new Error(
        `أنت خارج نطاق فرع (${branch.name})${missionText}! المسافة بينك وبين الفرع ${distanceMeters} متر (المسموح به ${branch.radiusMeters} متر فقط).`
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

    if (latitude == null || longitude == null) {
      throw new Error("لا يمكن تسجيل الانصراف بدون إرسال إحداثيات موقعك الجغرافي الحقيقي (GPS).");
    }

    const branch = await Branch.findOne({ id: record.branchId });
    if (!branch) {
      throw new Error("بيانات فرع الحضور غير متوفرة.");
    }

    // STRICT GEOFENCE ENFORCEMENT ON CHECKOUT
    const distanceMeters = calculateDistanceMeters(latitude, longitude, branch.latitude, branch.longitude);
    if (distanceMeters > branch.radiusMeters) {
      throw new Error(
        `عذراً، أنت خارج النطاق الجغرافي لفرع (${branch.name}) بمسافة ${distanceMeters} متر! (الحد الأقصى المسموح به: ${branch.radiusMeters} متر). لا يُسمح بتسجيل الانصراف إطلاقاً إلا من داخل حدود الفرع.`
      );
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
    record.checkOutLatitude = latitude;
    record.checkOutLongitude = longitude;
    record.checkOutDistanceMeters = distanceMeters;
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
        casual: [],
        work_mission: [],
        weekly_rest_compensation: [],
        holiday_compensation: [],
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
      result.absent.push({
        ...emp,
        employee: emp
      });
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
      let bQuery = {};
      if (Array.isArray(filters.branchId)) {
        bQuery = { branchId: { $in: filters.branchId } };
      } else if (filters.branchId.includes(',')) {
        bQuery = { branchId: { $in: filters.branchId.split(',') } };
      } else {
        bQuery = { branchId: filters.branchId };
      }
      const branchEmployees = await Employee.find(bQuery, { id: 1 }).lean();
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

    const emp = await Employee.findOne({ id: requestData.employeeId }).lean();
    if (emp && emp.branchId) {
      requestData.branchId = emp.branchId;
    }

    if (requestData.type === 'leave' && requestData.leaveType === 'work_mission') {
      if (!requestData.missionBranchId) {
        throw new Error("يرجى تحديد الفرع المتوجه إليه في مأمورية العمل.");
      }
      if (emp && emp.branchId && requestData.missionBranchId === emp.branchId) {
        throw new Error("لا يمكن تقديم مأمورية عمل على نفس فرع العمل الأساسي الخاص بك.");
      }
    }

    // Validation: Prevent taking leave on employee's weekly off days (exempting work_mission, weekly_rest_compensation, holiday_compensation)
    if (requestData.type === 'leave' && !['work_mission', 'weekly_rest_compensation', 'holiday_compensation'].includes(requestData.leaveType)) {
      const empOffDays = (emp && emp.weeklyOffDays) || ['friday', 'saturday'];
      const startDateStr = requestData.startDate || requestData.date;
      const endDateStr = requestData.endDate || startDateStr;

      if (startDateStr) {
        const DAY_INDEX_TO_ID = {
          0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday'
        };
        const DAY_NAMES_AR = {
          sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت'
        };

        const parseDay = (dStr) => {
          const parts = dStr.split('-').map(Number);
          const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
          return DAY_INDEX_TO_ID[d.getDay()];
        };

        if (startDateStr === endDateStr) {
          const dayId = parseDay(startDateStr);
          if (empOffDays.includes(dayId)) {
            const dayName = DAY_NAMES_AR[dayId] || dayId;
            throw new Error(`عذراً، يوم (${dayName}) يوافق يوم إجازتك الأسبوعية بالفعل، لا يمكنك تقديم طلب إجازة فيه.`);
          }
        } else {
          const startDayId = parseDay(startDateStr);
          const endDayId = parseDay(endDateStr);
          if (empOffDays.includes(startDayId)) {
            const startName = DAY_NAMES_AR[startDayId] || startDayId;
            throw new Error(`عذراً، تاريخ بداية الإجازة يوافق يوم إجازتك الأسبوعية (${startName}). يرجى تحديد البداية من يوم عمل فعلي.`);
          }
          if (empOffDays.includes(endDayId)) {
            const endName = DAY_NAMES_AR[endDayId] || endDayId;
            throw new Error(`عذراً، تاريخ نهاية الإجازة يوافق يوم إجازتك الأسبوعية (${endName}). يرجى تحديد النهاية بيوم عمل فعلي.`);
          }
        }
      }
    }

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

    // Send background push notification to managers even when phone/app is closed
    try {
      const empName = emp ? emp.name : 'موظف';
      let title = `طلب جديد: ${empName}`;
      let body = '';

      if (requestData.type === 'early_checkout') {
        body = `طلب انصراف طارئ جديد يحتاج إلى موافقة.`;
      } else if (requestData.type === 'permission') {
        const pType = requestData.permissionType === 'morning' ? 'إذن تأخير صباحي' : 'إذن انصراف مبكر';
        body = `طلب ${pType} (${requestData.permissionHours || 2} س) - سبب: ${requestData.reason || ''}`;
      } else {
        const leaveNames = {
          annual: 'إجازة سنوية',
          sick: 'إجازة مرضية',
          casual: 'إجازة عارضة',
          work_mission: `مأمورية عمل بفرع ${requestData.missionBranchName || ''}`,
          weekly_rest_compensation: 'بدل راحة أسبوعية',
          holiday_compensation: `بدل إجازة عيد (${requestData.holidayName || ''})`
        };
        const lName = leaveNames[requestData.leaveType] || 'إجازة';
        body = `طلب ${lName} - سبب: ${requestData.reason || ''}`;
      }

      const managerQuery = {
        $or: [
          { branchId: emp?.branchId, titleCode: 'memberships_manager' },
          { sectorId: emp?.sectorId, titleCode: 'memberships_area_manager' },
          { titleCode: 'memberships_executive_director' },
          { phone: '01010046078' }
        ]
      };
      const managers = await Employee.find(managerQuery, { id: 1 }).lean();
      const targetEmpIds = [...new Set(managers.map(m => m.id).filter(id => id !== requestData.employeeId))];

      for (const mgrId of targetEmpIds) {
        this.sendPushNotification(mgrId, {
          title,
          body,
          icon: '/icon-192.png',
          url: '/?tab=leaves'
        }).catch(() => {});
      }
    } catch (pushErr) {
      console.warn("Push error on createRequest:", pushErr.message);
    }

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

    if (status === 'approved' && req.type === 'leave') {
      const nonDeductible = ['work_mission', 'weekly_rest_compensation', 'holiday_compensation', 'weekly_off'];
      if (!nonDeductible.includes(req.leaveType)) {
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

    // Send background push notification to the employee
    try {
      const isApproved = status === 'approved';
      const statusTitle = isApproved ? 'تمت الموافقة على طلبك ✅' : 'تم رفض طلبك ❌';
      let reqTypeText = 'الطلب';
      if (req.type === 'early_checkout') reqTypeText = 'الانصراف الطارئ';
      else if (req.type === 'permission') reqTypeText = 'إذن العمل';
      else reqTypeText = 'الإجازة';

      const bodyText = `تم الرد على طلب (${reqTypeText}) الخاص بك. ${reviewNote ? 'ملاحظة الإدارة: ' + reviewNote : ''}`;

      this.sendPushNotification(req.employeeId, {
        title: statusTitle,
        body: bodyText,
        icon: '/icon-192.png',
        url: '/?tab=leaves'
      }).catch(() => {});
    } catch (pushErr) {
      console.warn("Push error on reviewRequest:", pushErr.message);
    }

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
    if (branchId && branchId !== 'all') {
      if (Array.isArray(branchId)) {
        attQuery.branchId = { $in: branchId };
      } else if (branchId.includes(',')) {
        attQuery.branchId = { $in: branchId.split(',') };
      } else {
        attQuery.branchId = branchId;
      }
    }
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

    const enrichedAttendance = attendance
      .filter(r => employees.some(e => e.id === r.employeeId))
      .map(r => {
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

    const enrichedRequests = requests
      .filter(r => employees.some(e => e.id === r.employeeId))
      .map(r => {
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
          const inTime = dayAtt.checkInTime ? new Date(dayAtt.checkInTime).toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' }) : '';
          const outTime = dayAtt.checkOutTime ? new Date(dayAtt.checkOutTime).toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' }) : 'في العمل';
          detail = `${inTime} - ${outTime}`;
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
  DEFAULT_SECTORS,
  DEFAULT_BRANCHES,
  DEFAULT_TITLES
};
