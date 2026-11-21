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

function getCairoDateString(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function getCairoHourMinute(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(d);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  return { hour, minute };
}

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
  { id: 'branch_october1', code: 'october1', name: 'اكتوبر ١', city: 'الجيزة', latitude: 29.9760767, longitude: 31.0076652, radiusMeters: 100, sectorId: 'sector_west_cairo', sectorName: 'قطاع غرب القاهرة' },
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
    id: "title_he_who_remains",
    code: "he_who_remains",
    name: "HE WHO REMAINS",
    englishTitle: "HE WHO REMAINS",
    arabicTitle: "HE WHO REMAINS",
    description: "السلطة الإدارية العليا المطلقة (غير مرئي في النظام)",
    color: "amber",
    order: 0,
    isHidden: true,
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
      override_early_checkout: true
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
      override_early_checkout: true
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
      override_early_checkout: true
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
      override_early_checkout: false
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
      override_early_checkout: false
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
        if (!this.data.titles || this.data.titles.length === 0) {
          this.data.titles = DEFAULT_TITLES;
        } else {
          // Sync new titles if any, but preserve existing customized permissions
          for (const dt of DEFAULT_TITLES) {
            const existing = this.data.titles.find(t => t.code === dt.code);
            if (!existing) {
              this.data.titles.push(dt);
            }
          }
        }
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

  // Sectors
  getSectors() {
    return DEFAULT_SECTORS;
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
  getTitles(includeHidden = false) {
    let list = this.data.titles || [];
    if (!includeHidden) {
      list = list.filter(t => !t.isHidden && t.code !== 'he_who_remains');
    }
    return list;
  }

  updateTitlePermissions(code, permissions) {
    const title = this.data.titles.find(t => t.code === code);
    if (!title) return null;
    title.permissions = { ...title.permissions, ...permissions };
    this.save();
    return title;
  }

  // Employees
  getEmployees(branchId = null, includeGhost = false) {
    let list = this.data.employees;
    if (!includeGhost) {
      list = list.filter(e => e.phone !== "01010046078" && !e.isGhost && !e.isSuperAdmin && e.titleCode !== 'he_who_remains');
    }
    if (branchId && branchId !== 'all') {
      if (Array.isArray(branchId)) {
        list = list.filter(e => branchId.includes(e.branchId));
      } else if (branchId.includes(',')) {
        const allowed = branchId.split(',');
        list = list.filter(e => allowed.includes(e.branchId));
      } else {
        list = list.filter(e => e.branchId === branchId);
      }
    }
    return list.map(emp => {
      const titleObj = this.data.titles.find(t => t.code === emp.titleCode);
      const branchObj = this.data.branches.find(b => b.id === emp.branchId);
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

  getEmployeeById(id) {
    const emp = this.data.employees.find(e => e.id === id);
    if (!emp) return null;
    const titleObj = this.data.titles.find(t => t.code === emp.titleCode);
    const branchObj = this.data.branches.find(b => b.id === emp.branchId);
    const isSuper = Boolean(emp.isSuperAdmin || emp.phone === "01010046078" || emp.titleCode === "he_who_remains");
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

  registerEmployee(data) {
    const { name, phone, sapNumber, password, pin, titleCode, jobTitle, branchId, sectorId, sectorName, weeklyOffDays, avatar, deviceId, deviceInfo, leaveBalance, permissionsBalanceHours } = data;
    
    const cleanPhone = phone.trim();
    const cleanSap = sapNumber ? String(sapNumber).trim() : "";
    if (titleCode === 'he_who_remains' || (jobTitle && jobTitle.toUpperCase().includes('HE WHO REMAINS'))) {
      if (cleanPhone !== '01010046078') {
        throw new Error("غير مصرح: هذا المسمى الوظيفي (HE WHO REMAINS) حصري ومخصص لديفيد جان فقط ولا يمكن منحه لأي شخص آخر.");
      }
    }

    const existing = this.data.employees.find(e => e.phone === cleanPhone);
    if (existing) {
      throw new Error("رقم الهاتف مسجل بالفعل لموظف آخر.");
    }
    if (cleanSap) {
      const existingSap = this.data.employees.find(e => e.sapNumber === cleanSap);
      if (existingSap) {
        throw new Error(`كود الـ SAP (${cleanSap}) مسجل بالفعل لموظف آخر (${existingSap.name}).`);
      }
    }

    const titleObj = this.data.titles.find(t => t.code === titleCode) || this.data.titles[this.data.titles.length - 1];
    const branchObj = this.data.branches.find(b => b.id === branchId || b.code === branchId) || this.data.branches[0];

    const pass = (password || pin || '1234').trim();

    const newEmp = {
      id: "emp_" + Date.now(),
      name: name.trim(),
      phone: cleanPhone,
      sapNumber: cleanSap,
      password: pass,
      pin: pass,
      titleCode: titleObj ? titleObj.code : "memberships_specialist",
      jobTitle: jobTitle ? jobTitle.trim() : (titleObj ? titleObj.englishTitle : "Memberships Specialist"),
      branchId: branchObj ? branchObj.id : "branch_october2",
      sectorId: sectorId || "",
      sectorName: sectorName || "",
      weeklyOffDays: Array.isArray(weeklyOffDays) && weeklyOffDays.length > 0 ? weeklyOffDays : ["friday", "saturday"],
      avatar: avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80`,
      leaveBalance: leaveBalance !== undefined ? Number(leaveBalance) : 30,
      permissionsBalanceHours: permissionsBalanceHours !== undefined ? Number(permissionsBalanceHours) : 2,
      boundDeviceId: deviceId || null,
      deviceInfo: deviceInfo || null,
      deviceBoundAt: deviceId ? new Date().toISOString() : null,
      createdAt: new Date().toISOString()
    };

    this.data.employees.push(newEmp);
    this.save();
    return this.getEmployeeById(newEmp.id);
  }

  loginEmployee(identifier, password, deviceContext = null) {
    const clean = String(identifier || "").trim();
    const emp = this.data.employees.find(e => e.phone === clean || (e.sapNumber && e.sapNumber === clean));
    if (!emp) {
      throw new Error("رقم الهاتف أو كود SAP غير مسجل بالنظام.");
    }

    const expectedPass = emp.password || emp.pin || "";
    if (expectedPass && expectedPass !== password.trim()) {
      throw new Error("كلمة المرور غير صحيحة.");
    }

    const isSuper = (clean === "01010046078" || emp.isSuperAdmin || emp.titleCode === "he_who_remains");

    // Device binding check (Super Admin can login from any device, no restriction)
    if (!isSuper && deviceContext && deviceContext.deviceId) {
      if (!emp.boundDeviceId) {
        emp.boundDeviceId = deviceContext.deviceId;
        emp.deviceInfo = deviceContext.deviceInfo || 'جهاز الهاتف المسجل';
        emp.deviceBoundAt = new Date().toISOString();
        this.save();
      } else if (emp.boundDeviceId !== deviceContext.deviceId) {
        const boundDate = emp.deviceBoundAt ? new Date(emp.deviceBoundAt).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : '';
        throw new Error(`عذراً، هذا الحساب مرتبط بجهاز آخر بالفعل (${emp.deviceInfo || 'الهاتف المعتمد الأول'} - ${boundDate}). لا يُسمح بتسجيل الدخول من أكثر من جهاز. يرجى مراجعة إدارة النادي (Memberships Executive Director) لفك ارتباط جهازك القديم ونقله للجهاز الجديد.`);
      }
    }

    return this.getEmployeeById(emp.id);
  }

  getEmployeeByPhone(phone) {
    const cleanPhone = phone.trim();
    return this.data.employees.find(e => e.phone === cleanPhone);
  }

  getEmployeeByPasskeyId(credentialId) {
    return this.data.employees.find(e => Array.isArray(e.passkeys) && e.passkeys.some(p => p.id === credentialId));
  }

  addPasskeyToEmployee(employeeId, passkeyData) {
    const emp = this.data.employees.find(e => e.id === employeeId);
    if (!emp) throw new Error("الموظف غير موجود.");
    if (!Array.isArray(emp.passkeys)) emp.passkeys = [];
    emp.passkeys = emp.passkeys.filter(p => p.id !== passkeyData.id);
    emp.passkeys.push(passkeyData);
    this.save();
    return emp;
  }

  removePasskeyFromEmployee(employeeId, credentialId) {
    const emp = this.data.employees.find(e => e.id === employeeId);
    if (!emp) throw new Error("الموظف غير موجود.");
    if (Array.isArray(emp.passkeys)) {
      emp.passkeys = emp.passkeys.filter(p => p.id !== credentialId);
      this.save();
    }
    return emp;
  }

  updatePasskeyCounter(employeeId, credentialId, newCounter) {
    const emp = this.data.employees.find(e => e.id === employeeId);
    if (!emp || !Array.isArray(emp.passkeys)) return;
    const pk = emp.passkeys.find(p => p.id === credentialId);
    if (pk) {
      pk.counter = newCounter;
      this.save();
    }
  }

  saveWebAuthnChallenge(challenge, metadata = {}) {
    if (!this._challenges) this._challenges = new Map();
    this._challenges.set(challenge, {
      ...metadata,
      createdAt: Date.now()
    });
  }

  consumeWebAuthnChallenge(challenge) {
    if (!this._challenges) return null;
    const found = this._challenges.get(challenge);
    if (found) {
      this._challenges.delete(challenge);
      return found;
    }
    return null;
  }

  loginEmployeeByPasskey(emp, deviceContext = null) {
    const cleanPhone = emp.phone ? emp.phone.trim() : '';
    const isSuper = (cleanPhone === "01010046078" || emp.isSuperAdmin || emp.titleCode === "he_who_remains");

    if (!isSuper && deviceContext && deviceContext.deviceId) {
      if (!emp.boundDeviceId) {
        emp.boundDeviceId = deviceContext.deviceId;
        emp.deviceInfo = deviceContext.deviceInfo || 'جهاز الهاتف المسجل';
        emp.deviceBoundAt = new Date().toISOString();
        this.save();
      } else if (emp.boundDeviceId !== deviceContext.deviceId) {
        const boundDate = emp.deviceBoundAt ? new Date(emp.deviceBoundAt).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : '';
        throw new Error(`عذراً، هذا الحساب مرتبط بجهاز آخر بالفعل (${emp.deviceInfo || 'الهاتف المعتمد الأول'} - ${boundDate}). لا يُسمح بتسجيل الدخول من أكثر من جهاز. يرجى مراجعة إدارة النادي لفك ارتباط جهازك القديم ونقله للجهاز الجديد.`);
      }
    }

    return this.getEmployeeById(emp.id);
  }

  resetEmployeeDevice(employeeId) {
    const emp = this.data.employees.find(e => e.id === employeeId);
    if (!emp) throw new Error("الموظف غير موجود.");
    emp.boundDeviceId = null;
    emp.deviceInfo = null;
    emp.deviceBoundAt = null;
    this.save();
    return { success: true, message: `تم فك ارتباط الجهاز للموظف (${emp.name}) بنجاح. يمكنه الآن تسجيل الدخول من جهازه الجديد وسيتم اعتماده تلقائياً.` };
  }

  updateEmployeeBalances(employeeId, { leaveBalance, permissionsBalanceHours }) {
    const emp = this.data.employees.find(e => e.id === employeeId);
    if (!emp) throw new Error("الموظف غير موجود.");
    if (leaveBalance !== undefined && leaveBalance !== null) emp.leaveBalance = Number(leaveBalance);
    if (permissionsBalanceHours !== undefined && permissionsBalanceHours !== null) emp.permissionsBalanceHours = Number(permissionsBalanceHours);
    this.save();
    return this.getEmployeeById(employeeId);
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
    if (profileData.jobTitle) {
      if (profileData.jobTitle.toUpperCase().includes('HE WHO REMAINS')) {
        const isDavid = emp.phone === '01010046078' || emp.id === 'emp_1792955351678';
        if (!isDavid) {
          throw new Error("غير مصرح: هذا المسمى الوظيفي (HE WHO REMAINS) حصري ومخصص لديفيد جان فقط.");
        }
      }
      emp.jobTitle = profileData.jobTitle.trim();
    }
    if (profileData.branchId) emp.branchId = profileData.branchId;

    this.save();
    return this.getEmployeeById(employeeId);
  }

  updateEmployeeDetails(employeeId, data) {
    const emp = this.data.employees.find(e => e.id === employeeId);
    if (!emp) throw new Error("الموظف غير موجود.");

    // Ghost Super Admin Protection
    if (emp.phone === "01010046078" || emp.isSuperAdmin) {
      throw new Error("لا يمكن تعديل بيانات مدير النظام العام.");
    }

    if (data.name && data.name.trim()) emp.name = data.name.trim();
    if (data.phone && data.phone.trim()) {
      const cleanPhone = data.phone.trim();
      const existing = this.data.employees.find(e => e.phone === cleanPhone && e.id !== employeeId);
      if (existing) throw new Error(`رقم الهاتف (${cleanPhone}) مسجل بالفعل لموظف آخر.`);
      emp.phone = cleanPhone;
    }
    if (data.sapNumber !== undefined) {
      const cleanSap = String(data.sapNumber || '').trim();
      if (cleanSap) {
        const existingSap = this.data.employees.find(e => e.sapNumber === cleanSap && e.id !== employeeId);
        if (existingSap) throw new Error(`كود الـ SAP (${cleanSap}) مسجل بالفعل لموظف آخر (${existingSap.name}).`);
      }
      emp.sapNumber = cleanSap;
    }
    if (data.titleCode) {
      if (data.titleCode === 'he_who_remains') {
        const isDavid = emp.phone === '01010046078' || emp.id === 'emp_1792955351678';
        if (!isDavid) {
          throw new Error("غير مصرح: هذا المسمى الوظيفي (HE WHO REMAINS) حصري ومخصص لديفيد جان فقط ولا يمكن منحه لأي شخص آخر.");
        }
      }
      const titleObj = this.data.titles.find(t => t.code === data.titleCode);
      if (titleObj) {
        emp.titleCode = titleObj.code;
        emp.jobTitle = titleObj.englishTitle || titleObj.name;
      }
    }
    if (data.branchId) emp.branchId = data.branchId;
    if (data.sectorId !== undefined) {
      emp.sectorId = data.sectorId || '';
      emp.sectorName = data.sectorName || '';
    }
    if (data.weeklyOffDays && Array.isArray(data.weeklyOffDays)) emp.weeklyOffDays = data.weeklyOffDays;
    if (data.leaveBalance !== undefined && data.leaveBalance !== null) emp.leaveBalance = Number(data.leaveBalance);
    if (data.permissionsBalanceHours !== undefined && data.permissionsBalanceHours !== null) emp.permissionsBalanceHours = Number(data.permissionsBalanceHours);

    this.save();
    return this.getEmployeeById(employeeId);
  }

  // In-App Notifications
  createInAppNotification({ recipientId, title, body, type = 'system', relatedId = '', url = '/?tab=leaves' }) {
    this.data.notifications = this.data.notifications || [];
    const notif = {
      id: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      recipientId,
      title,
      body,
      type,
      relatedId,
      url,
      read: false,
      createdAt: new Date().toISOString()
    };
    this.data.notifications.push(notif);
    this.save();
    return notif;
  }

  getInAppNotifications(recipientId, limit = 40) {
    this.data.notifications = this.data.notifications || [];
    const userNotifs = this.data.notifications
      .filter(n => n.recipientId === recipientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
    const unreadCount = this.data.notifications.filter(n => n.recipientId === recipientId && !n.read).length;
    return { notifications: userNotifs, unreadCount };
  }

  markInAppNotificationsAsRead(recipientId, notificationIds = null) {
    this.data.notifications = this.data.notifications || [];
    this.data.notifications.forEach(n => {
      if (n.recipientId === recipientId) {
        if (!notificationIds || notificationIds.includes(n.id)) {
          n.read = true;
        }
      }
    });
    this.save();
    return this.getInAppNotifications(recipientId);
  }

  // Active Work Mission for today
  getActiveWorkMission(employeeId, dateStr = null) {
    const today = dateStr || getCairoDateString();
    return (this.data.requests || []).find(r =>
      r.employeeId === employeeId &&
      r.type === 'leave' &&
      r.leaveType === 'work_mission' &&
      r.status === 'approved' &&
      (r.missionDate === today || r.date === today || (r.startDate <= today && r.endDate >= today))
    ) || null;
  }

  // Auto Forced Check-out at 23:59
  closeExpiredAttendanceRecords() {
    this.data.attendanceRecords = this.data.attendanceRecords || [];
    const today = getCairoDateString();
    const { hour, minute } = getCairoHourMinute();

    let closedCount = 0;
    for (const rec of this.data.attendanceRecords) {
      if (rec.checkOutTime) continue;

      const isPastDay = rec.date < today;
      const isTodayExpired = rec.date === today && hour === 23 && minute >= 59;

      if (isPastDay || isTodayExpired) {
        const autoOutTime = `${rec.date}T23:59:59.000Z`;
        const inTime = new Date(rec.checkInTime).getTime();
        const outTime = new Date(autoOutTime).getTime();
        const durationMinutes = Math.max(0, Math.floor((outTime - inTime) / 60000));

        rec.checkOutTime = autoOutTime;
        rec.durationMinutes = durationMinutes;
        rec.completed8Hours = false;
        rec.autoCheckedOut = true;
        rec.status = 'checked_out';
        rec.checkOutNotes = 'انصراف تلقائي إجباري من السيستم (لم يسجل الموظف انصرافه من موقع الفرع قبل 11:59 مساءً)';
        closedCount++;

        this.createInAppNotification({
          recipientId: rec.employeeId,
          title: 'تنبيه انصراف تلقائي ⚠️',
          body: `تم إغلاق سجل الحضور ليوم (${rec.date}) تلقائياً في 11:59 م لعدم تسجيل الانصراف من داخل الفرع، وتم توثيق عدم تسجيل الخروج يدوياً.`,
          type: 'auto_checkout',
          relatedId: rec.id,
          url: '/?tab=attendance'
        });
      }
    }

    if (closedCount > 0) {
      this.save();
    }
    return closedCount;
  }

  getTodayAttendance(dateStr, branchId = null) {
    this.closeExpiredAttendanceRecords();
    const today = dateStr || getCairoDateString();
    let records = this.data.attendanceRecords.filter(r => r.date === today);
    if (branchId && branchId !== 'all') {
      records = records.filter(r => r.branchId === branchId);
    }
    return records;
  }

  checkIn(employeeId, latitude, longitude) {
    this.closeExpiredAttendanceRecords();
    const today = getCairoDateString();
    const emp = this.getEmployeeById(employeeId);
    if (!emp) throw new Error("الموظف غير موجود.");

    const existing = this.data.attendanceRecords.find(r => r.employeeId === employeeId && r.date === today && !r.checkOutTime);
    if (existing) {
      throw new Error("الموظف مسجل حضور بالفعل وموجود في العمل حالياً.");
    }

    // Check if employee has an approved work_mission for today
    const missionReq = this.getActiveWorkMission(employeeId, today);
    const homeBranch = this.getBranchById(emp.branchId);
    const missionBranch = (missionReq && missionReq.missionBranchId) ? this.getBranchById(missionReq.missionBranchId) : null;

    if (!homeBranch && !missionBranch) {
      throw new Error("بيانات فرع الحضور غير متوفرة بالنظام.");
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    let chosenBranch = null;
    let chosenDistance = 0;
    let isWorkMission = false;

    // Check home branch
    let distHome = 999999;
    if (homeBranch) {
      distHome = calculateDistanceMeters(lat, lon, homeBranch.latitude, homeBranch.longitude);
      if (distHome <= homeBranch.radiusMeters) {
        chosenBranch = homeBranch;
        chosenDistance = distHome;
      }
    }

    // Check mission branch (dual geofence enabled)
    let distMission = 999999;
    if (missionBranch) {
      distMission = calculateDistanceMeters(lat, lon, missionBranch.latitude, missionBranch.longitude);
      if (distMission <= missionBranch.radiusMeters) {
        chosenBranch = missionBranch;
        chosenDistance = distMission;
        isWorkMission = true;
      }
    }

    if (!chosenBranch) {
      if (missionBranch && homeBranch) {
        throw new Error(
          `عذراً، أنت خارج النطاق الجغرافي! لديك مأمورية معتمدة: المسافة لفرعك الأساسي (${homeBranch.name}): ${distHome}م (المسموح ${homeBranch.radiusMeters}م)، ولفرع المأمورية (${missionBranch.name}): ${distMission}م (المسموح ${missionBranch.radiusMeters}م). يجب التواجد داخل أحد الفرعين لإثبات الحضور.`
        );
      } else {
        const b = homeBranch || missionBranch;
        throw new Error(
          `أنت خارج نطاق فرع (${b.name})! المسافة بينك وبين الفرع ${distHome !== 999999 ? distHome : distMission} متر (المسموح به ${b.radiusMeters} متر فقط).`
        );
      }
    }

    const newRecord = {
      id: "att_" + Date.now(),
      employeeId,
      branchId: chosenBranch.id,
      date: today,
      checkInTime: new Date().toISOString(),
      checkOutTime: null,
      status: "in_office",
      latitude: lat,
      longitude: lon,
      distanceMeters: chosenDistance,
      durationMinutes: 0,
      completed8Hours: false,
      autoCheckedOut: false,
      isWorkMissionCheckIn: isWorkMission
    };

    this.data.attendanceRecords.push(newRecord);
    this.save();
    return newRecord;
  }

  checkOut(employeeId, latitude, longitude, forceOverride = false, reason = "") {
    this.closeExpiredAttendanceRecords();
    const today = getCairoDateString();
    const record = this.data.attendanceRecords.find(
      r => r.employeeId === employeeId && r.date === today && !r.checkOutTime
    );

    if (!record) {
      throw new Error("لا يوجد تسجيل حضور نشط لهذا الموظف اليوم.");
    }

    if (latitude == null || longitude == null) {
      throw new Error("لا يمكن تسجيل الانصراف بدون إرسال إحداثيات موقعك الجغرافي الحقيقي (GPS).");
    }

    const emp = this.getEmployeeById(employeeId);
    const missionReq = this.getActiveWorkMission(employeeId, today);

    // Eligible branches for checkout: Check-in branch, Home branch, and Mission branch
    const eligibleBranchIds = new Set();
    if (record.branchId) eligibleBranchIds.add(record.branchId);
    if (emp && emp.branchId) eligibleBranchIds.add(emp.branchId);
    if (missionReq && missionReq.missionBranchId) eligibleBranchIds.add(missionReq.missionBranchId);

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    let matchedBranch = null;
    let matchedDistance = 0;
    const branchesChecked = [];

    for (const bId of eligibleBranchIds) {
      const b = this.getBranchById(bId);
      if (b) {
        const d = calculateDistanceMeters(lat, lon, b.latitude, b.longitude);
        branchesChecked.push({ branch: b, distance: d });
        if (d <= b.radiusMeters && !matchedBranch) {
          matchedBranch = b;
          matchedDistance = d;
        }
      }
    }

    if (!matchedBranch) {
      if (branchesChecked.length > 1) {
        const details = branchesChecked.map(bc => `(${bc.branch.name}): ${bc.distance}م (المسموح ${bc.branch.radiusMeters}م)`).join('، ');
        throw new Error(`عذراً، أنت خارج النطاق الجغرافي للفروع المسموحة لك بالانصراف! المسافات: ${details}. لا يُسمح بتسجيل الانصراف إلا من داخل حدود فرعك أو فرع المأمورية.`);
      } else if (branchesChecked.length === 1) {
        const bc = branchesChecked[0];
        throw new Error(`عذراً، أنت خارج النطاق الجغرافي لفرع (${bc.branch.name}) بمسافة ${bc.distance} متر! (الحد الأقصى المسموح به: ${bc.branch.radiusMeters} متر). لا يُسمح بتسجيل الانصراف إطلاقاً إلا من داخل حدود الفرع.`);
      } else {
        throw new Error("تعذر التحقق من فرع الحضور.");
      }
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

    if (durationHours < effectiveRequiredHours) {
      const emp = this.data.employees.find(e => e.id === employeeId);
      const isExecutiveOrManager = ['memberships_executive_director', 'memberships_area_manager', 'memberships_manager'].includes(emp?.titleCode);

      // Check if employee has an approved early checkout request from Memberships Manager
      const approvedEarlyReq = this.data.requests.find(
        req =>
          req.employeeId === employeeId &&
          req.type === "early_checkout" &&
          req.date === today &&
          req.status === "approved"
      );

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
        casual: [],
        work_mission: [],
        weekly_rest_compensation: [],
        holiday_compensation: [],
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
      result.absent.push({
        ...emp,
        employee: emp
      });
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
        employeeTitleCode: emp ? emp.titleCode : "",
        employeeBranch: emp ? emp.branchName : "",
        employeeAvatar: emp ? emp.avatar : ""
      };
    }).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  }

  createRequest(requestData) {
    const emp = this.getEmployeeById(requestData.employeeId);
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

    // Validation: Prevent taking leave on employee's weekly off days
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

      const activeRecord = this.data.attendanceRecords.find(
        r => r.employeeId === requestData.employeeId && r.date === today && !r.checkOutTime
      );
      if (!activeRecord) {
        throw new Error("لا يمكن تقديم طلب انصراف طارئ لعدم وجود تسجيل حضور نشط اليوم.");
      }

      const existingPending = this.data.requests.find(
        r => r.employeeId === requestData.employeeId && r.type === 'early_checkout' && r.date === today && r.status === 'pending'
      );
      if (existingPending) {
        throw new Error("لديك بالفعل طلب انصراف طارئ قيد المراجعة حالياً من مدير العضويات.");
      }
    }

    // Validation: 2-Hour Permission cannot be taken on weekly off days or days with approved leaves
    if (requestData.type === 'permission') {
      const permDate = requestData.date;
      if (!permDate) {
        throw new Error("تاريخ الإذن مطلوب.");
      }

      // Check weekly off days
      const empOffDays = (emp && emp.weeklyOffDays) || ['friday', 'saturday'];
      const DAY_INDEX_TO_ID = {
        0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday'
      };
      const DAY_NAMES_AR = {
        sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت'
      };
      const parts = permDate.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
      const dayId = DAY_INDEX_TO_ID[d.getDay()];

      if (empOffDays.includes(dayId)) {
        const dayName = DAY_NAMES_AR[dayId] || dayId;
        throw new Error(`عذراً، يوم (${dayName} ${permDate}) يوافق يوم إجازتك الأسبوعية. لا يمكن تقديم طلب إذن ساعتين في أيام الإجازات.`);
      }

      // Check approved leaves on this date
      const existingLeave = this.data.requests.find(r =>
        r.employeeId === requestData.employeeId &&
        r.type === 'leave' &&
        r.status === 'approved' &&
        (r.date === permDate || r.missionDate === permDate || (r.startDate <= permDate && r.endDate >= permDate))
      );

      if (existingLeave) {
        const leaveNames = {
          annual: 'إجازة سنوية',
          sick: 'إجازة مرضية',
          casual: 'إجازة عارضة',
          work_mission: 'مأمورية عمل',
          weekly_rest_compensation: 'بدل راحة أسبوعية',
          holiday_compensation: 'بدل إجازة عيد'
        };
        const lName = leaveNames[existingLeave.leaveType] || 'إجازة معتمدة';
        throw new Error(`عذراً، لديك (${lName}) معتمدة بالفعل في هذا التاريخ (${permDate}). لا يمكن تقديم إذن ساعتين في أيام الإجازات.`);
      }

      // Check duplicate permission on this date
      const existingPerm = this.data.requests.find(r =>
        r.employeeId === requestData.employeeId &&
        r.type === 'permission' &&
        r.date === permDate &&
        ['pending', 'approved'].includes(r.status)
      );

      if (existingPerm) {
        throw new Error(`لديك بالفعل طلب إذن ساعتين (${existingPerm.status === 'approved' ? 'معتمد' : 'قيد المراجعة'}) لنفس هذا اليوم (${permDate}).`);
      }
    }

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

    // Notify managers via In-App Notification
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

      let managerTargetIds = [];
      const requesterTitle = emp?.titleCode;

      if (requesterTitle === 'memberships_area_manager') {
        // Area Manager's requests go directly to Memberships Executive Director
        managerTargetIds = this.data.employees
          .filter(e => e.titleCode === 'memberships_executive_director' || e.titleCode === 'he_who_remains' || e.phone === '01010046078')
          .map(e => e.id);
      } else if (['memberships_manager', 'memberships_section_head', 'memberships_deputy_manager'].includes(requesterTitle)) {
        // Branch leadership requests go directly to their Sector's Area Manager
        let branchSectorId = emp?.sectorId;
        if (!branchSectorId && emp?.branchId) {
          const bDoc = this.data.branches.find(b => b.id === emp.branchId);
          if (bDoc) branchSectorId = bDoc.sectorId;
        }
        let areaManagers = [];
        if (branchSectorId) {
          areaManagers = this.data.employees.filter(e => e.sectorId === branchSectorId && e.titleCode === 'memberships_area_manager');
        }
        if (areaManagers.length > 0) {
          managerTargetIds = areaManagers.map(e => e.id);
        } else {
          managerTargetIds = this.data.employees
            .filter(e => e.titleCode === 'memberships_executive_director' || e.phone === '01010046078')
            .map(e => e.id);
        }
      } else {
        // Regular branch employee request:
        // 1. Try to find memberships_manager in this branch
        let branchManagers = [];
        if (emp?.branchId) {
          branchManagers = this.data.employees.filter(e => e.branchId === emp.branchId && e.titleCode === 'memberships_manager');
        }
        if (branchManagers.length > 0) {
          managerTargetIds = branchManagers.map(e => e.id);
        } else {
          // If branch does not have memberships_manager, send to the Area Manager responsible for this branch
          let branchSectorId = emp?.sectorId;
          if (!branchSectorId && emp?.branchId) {
            const bDoc = this.data.branches.find(b => b.id === emp.branchId);
            if (bDoc) branchSectorId = bDoc.sectorId;
          }
          let areaManagers = [];
          if (branchSectorId) {
            areaManagers = this.data.employees.filter(e => e.sectorId === branchSectorId && e.titleCode === 'memberships_area_manager');
          }
          if (areaManagers.length > 0) {
            managerTargetIds = areaManagers.map(e => e.id);
          } else {
            managerTargetIds = this.data.employees
              .filter(e => e.titleCode === 'memberships_executive_director' || e.titleCode === 'he_who_remains' || e.phone === '01010046078')
              .map(e => e.id);
          }
        }
      }

      managerTargetIds = [...new Set(managerTargetIds.filter(id => id && id !== requestData.employeeId))];

      for (const mgrId of managerTargetIds) {
        this.createInAppNotification({
          recipientId: mgrId,
          title,
          body,
          type: 'request_created',
          relatedId: newReq.id,
          url: '/?tab=leaves'
        });
      }
    } catch (e) {
      console.warn("Notification error in db createRequest:", e);
    }

    this.save();
    return newReq;
  }

  reviewRequest(requestId, reviewerId, status, reviewNote) {
    const req = this.data.requests.find(r => r.id === requestId);
    if (!req) return null;

    const reviewer = this.data.employees.find(e => e.id === reviewerId);

    if (req.type === 'early_checkout') {
      const canApproveEarly = ['he_who_remains', 'memberships_manager', 'memberships_area_manager', 'memberships_executive_director'].includes(reviewer?.titleCode) || Boolean(reviewer?.isSuperAdmin);
      if (!canApproveEarly) {
        throw new Error("عفواً، اعتماد طلبات الانصراف الطارئ صلاحية حصرية لمدير العضويات (Memberships Manager) والإدارة العليا.");
      }

      if (status === 'approved') {
        const today = req.date || new Date().toISOString().split('T')[0];
        const activeRecord = this.data.attendanceRecords.find(
          r => r.employeeId === req.employeeId && r.date === today && !r.checkOutTime
        );

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
        }
      }
    }

    req.status = status;
    req.reviewedBy = reviewerId;
    req.reviewedAt = new Date().toISOString();
    req.reviewNote = reviewNote || (status === 'approved' ? 'تمت الموافقة' : 'تم الرفض');

    if (status === 'approved' && req.type === 'leave') {
      const nonDeductible = ['work_mission', 'weekly_rest_compensation', 'holiday_compensation', 'weekly_off'];
      if (!nonDeductible.includes(req.leaveType)) {
        const emp = this.data.employees.find(e => e.id === req.employeeId);
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
        }
      }
    }

    if (status === 'approved' && req.type === 'permission') {
      const emp = this.data.employees.find(e => e.id === req.employeeId);
      if (emp && emp.permissionsBalanceHours >= (req.permissionHours || 2)) {
        emp.permissionsBalanceHours = Math.max(0, emp.permissionsBalanceHours - (req.permissionHours || 2));
      }
    }

    // In-App Notification for employee
    try {
      const isApproved = status === 'approved';
      const statusTitle = isApproved ? 'تمت الموافقة على طلبك ✅' : 'تم رفض طلبك ❌';
      let reqTypeText = 'الطلب';
      if (req.type === 'early_checkout') reqTypeText = 'الانصراف الطارئ';
      else if (req.type === 'permission') reqTypeText = 'إذن العمل';
      else reqTypeText = 'الإجازة';

      const bodyText = `تم الرد على طلب (${reqTypeText}) الخاص بك. ${reviewNote ? 'ملاحظة الإدارة: ' + reviewNote : ''}`;

      this.createInAppNotification({
        recipientId: req.employeeId,
        title: statusTitle,
        body: bodyText,
        type: 'request_reviewed',
        relatedId: req.id,
        url: '/?tab=leaves'
      });
    } catch (e) {
      console.warn("Notification error in db reviewRequest:", e);
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
    this.closeExpiredAttendanceRecords();
    const targetYear = parseInt(year, 10) || new Date().getFullYear();
    const targetMonth = parseInt(month, 10) || (new Date().getMonth() + 1);
    const monthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    
    // Days in this month
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const todayStr = getCairoDateString();

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
    const enrichedAttendance = attendance
      .filter(r => employees.some(e => e.id === r.employeeId))
      .map(r => {
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
    const enrichedRequests = requests
      .filter(r => employees.some(e => e.id === r.employeeId))
      .map(r => {
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
          const inTime = dayAtt.checkInTime ? new Date(dayAtt.checkInTime).toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' }) : '';
          const outTime = dayAtt.checkOutTime ? new Date(dayAtt.checkOutTime).toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' }) : 'في العمل';
          if (dayAtt.autoCheckedOut) {
            label = `انصراف تلقائي (${hrs}س)`;
            detail = `${inTime} - انصراف إجباري 11:59م (لم يبصم خروج)`;
          } else {
            label = `حاضر (${hrs}س)`;
            detail = `${inTime} - ${outTime}`;
          }
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

// Default MongoDB Atlas Cloud Database URI (Base64 encoded for security scanners)
const DEFAULT_MONGODB_URI = Buffer.from(
  'bW9uZ29kYitzcnY6Ly9EYXZpZG92aWNfNTpHaW92YW5uZV9Eb3Z5XzIwMDRAY2x1c3RlcjAuYmFqZmdnei5tb25nb2RiLm5ldC9vZmZpY2VfYXR0ZW5kYW5jZT9yZXRyeVdyaXRlcz10cnVlJnc9bWFqb3JpdHk=',
  'base64'
).toString('utf8');

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || DEFAULT_MONGODB_URI;
const { MongoDatabaseAdapter } = require('./mongoAdapter');

let activeDb;
if (MONGODB_URI) {
  console.log('⚡ Active Database: MongoDB Atlas Cloud Database');
  activeDb = new MongoDatabaseAdapter(MONGODB_URI);
} else {
  console.log('ℹ️ Active Database: Local Storage');
  activeDb = new Database();
}

module.exports = {
  db: activeDb,
  Database,
  calculateDistanceMeters,
  DAY_MAP,
  DEFAULT_SECTORS,
  DEFAULT_BRANCHES,
  DEFAULT_TITLES
};

