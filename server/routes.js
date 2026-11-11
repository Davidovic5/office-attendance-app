const express = require('express');
const { db, calculateDistanceMeters } = require('./db');

const router = express.Router();

// 0. Branches (الفروع)
router.get('/branches', async (req, res) => {
  try {
    const branches = await db.getBranches();
    res.json({ success: true, branches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/branches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.updateBranch(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: "الفرع غير موجود" });
    }
    res.json({ success: true, branch: updated, message: `تم تحديث بيانات فرع "${updated.name}" بنجاح` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Authentication & Registration
router.post('/auth/register', async (req, res) => {
  try {
    const { name, phone, pin, password, titleCode, jobTitle, branchId, weeklyOffDays, avatar } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: "الاسم ورقم الهاتف حقول إلزامية." });
    }

    const employee = await db.registerEmployee({
      name,
      phone,
      password: password || pin || "1234",
      pin: pin || password || "1234",
      titleCode: titleCode || "specialist",
      jobTitle: jobTitle || "Specialist",
      branchId: branchId || "branch_sheraton",
      weeklyOffDays: weeklyOffDays || ["friday", "saturday"],
      avatar: avatar || null
    });

    res.json({
      success: true,
      message: "تم إنشاء حساب الموظف بنجاح!",
      employee
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { phone, pin, password } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: "يرجى إدخال رقم الهاتف." });
    }

    const employee = await db.loginEmployee(phone, password || pin || "");
    res.json({
      success: true,
      message: `مرحباً بك مجدداً يا ${employee.name}`,
      employee
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update Profile (Avatar, Name, Weekly Off Days)
router.put('/auth/profile', async (req, res) => {
  try {
    const { employeeId, name, avatar, weeklyOffDays, jobTitle, branchId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: "رقم الموظف مطلوب." });
    }

    const updated = await db.updateProfile(employeeId, { name, avatar, weeklyOffDays, jobTitle, branchId });
    res.json({
      success: true,
      message: "تم تحديث الملف الشخصي والصورة بنجاح!",
      employee: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Change Password
router.put('/auth/change-password', async (req, res) => {
  try {
    const { employeeId, oldPassword, newPassword } = req.body;
    if (!employeeId || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: "جميع حقول كلمة المرور مطلوبة." });
    }

    const updated = await db.changePassword(employeeId, oldPassword, newPassword);
    res.json({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح!",
      employee: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete Account (حذف الحساب)
router.delete('/auth/account', async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: "رقم الموظف مطلوب." });
    }

    const result = await db.deleteEmployee(employeeId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Monthly Reports & Attendance History (سجل وتقارير الحضور والإجازات الشهرية)
router.get('/reports/monthly', async (req, res) => {
  try {
    const { year, month, branchId, employeeId } = req.query;
    const report = await db.getMonthlyReport({ year, month, branchId, employeeId });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Office Settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await db.getOfficeSettings();
    const branches = await db.getBranches();
    res.json({ success: true, settings, branches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const updated = await db.updateOfficeSettings(req.body);
    res.json({ success: true, settings: updated, message: "تم تحديث إعدادات المكتب بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify Distance to Assigned Branch
router.post('/settings/verify-distance', async (req, res) => {
  try {
    const { latitude, longitude, branchId } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, error: "إحداثيات الموقع مطلوبة" });
    }

    const branch = await db.getBranchById(branchId);
    if (!branch) {
      return res.status(404).json({ success: false, error: "الفرع المحدد غير موجود" });
    }

    const distanceMeters = calculateDistanceMeters(
      parseFloat(latitude),
      parseFloat(longitude),
      branch.latitude,
      branch.longitude
    );
    const isWithinOffice = distanceMeters <= branch.radiusMeters;
    res.json({
      success: true,
      branch,
      distanceMeters,
      allowedRadius: branch.radiusMeters,
      isWithinOffice,
      message: isWithinOffice
        ? `أنت داخل نطاق فرع (${branch.name}) - المسافة: ${distanceMeters} م`
        : `أنت خارج نطاق فرع (${branch.name}) - المسافة: ${distanceMeters} م (المسموح به ${branch.radiusMeters} م)`
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 2. Titles & Permissions
router.get('/titles', async (req, res) => {
  try {
    const titles = await db.getTitles();
    res.json({ success: true, titles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/titles/:code/permissions', async (req, res) => {
  try {
    const { code } = req.params;
    const { permissions } = req.body;
    const updated = await db.updateTitlePermissions(code, permissions);
    if (!updated) {
      return res.status(404).json({ success: false, error: "المسمى الوظيفي غير موجود" });
    }
    res.json({
      success: true,
      title: updated,
      message: `تم تحديث صلاحيات "${updated.name}" بنجاح`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Employees
router.get('/employees', async (req, res) => {
  try {
    const { branchId } = req.query;
    const employees = await db.getEmployees(branchId);
    res.json({ success: true, employees });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/employees/:id', async (req, res) => {
  try {
    const emp = await db.getEmployeeById(req.params.id);
    if (!emp) return res.status(404).json({ success: false, error: "الموظف غير موجود" });
    res.json({ success: true, employee: emp });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/employees', async (req, res) => {
  try {
    const newEmp = await db.registerEmployee(req.body);
    res.json({ success: true, employee: newEmp, message: "تمت إضافة الموظف بنجاح" });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 4. Live Office Presence Dashboard (Filtered by Branch)
router.get('/status/live', async (req, res) => {
  try {
    const { date, branchId } = req.query;
    const status = await db.getLiveOfficeStatus(date, branchId);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Attendance (Check-in & Check-out with Branch GPS & 8-hour rule)
router.get('/attendance/today', async (req, res) => {
  try {
    const { date, branchId } = req.query;
    const records = await db.getTodayAttendance(date, branchId);
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/attendance/check-in', async (req, res) => {
  try {
    const { employeeId, latitude, longitude } = req.body;
    if (!employeeId || latitude == null || longitude == null) {
      return res.status(400).json({ success: false, error: "بيانات الموقع ورقم الموظف مطلوبة" });
    }

    const record = await db.checkIn(employeeId, parseFloat(latitude), parseFloat(longitude));
    res.json({
      success: true,
      message: "تمام كدا انت دلوقتي في العمل! تم بدء وردية الـ 8 ساعات بنجاح.",
      record
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/attendance/check-out', async (req, res) => {
  try {
    const { employeeId, latitude, longitude, forceOverride, reason } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: "رقم الموظف مطلوب" });
    }

    const record = await db.checkOut(
      employeeId,
      latitude != null ? parseFloat(latitude) : null,
      longitude != null ? parseFloat(longitude) : null,
      Boolean(forceOverride),
      reason || ""
    );

    res.json({
      success: true,
      message: "تم تسجيل الانصراف بنجاح، شكراً لجهودك اليوم!",
      record
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 6. Leaves & Permissions
router.get('/requests', async (req, res) => {
  try {
    const { employeeId, branchId, type, status } = req.query;
    const requests = await db.getRequests({ employeeId, branchId, type, status });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/requests', async (req, res) => {
  try {
    const { employeeId, type, leaveType, startDate, endDate, reason, permissionType, permissionHours, startTime, endTime } = req.body;
    if (!employeeId || !type || !reason) {
      return res.status(400).json({ success: false, error: "جميع الحقول الإلزامية يجب تعبئتها" });
    }

    const newReq = await db.createRequest(req.body);
    let message = "تم إرسال الطلب بنجاح";
    if (type === 'leave') {
      message = "تم إرسال طلب الإجازة بنجاح بانتظار الاعتماد";
    } else if (type === 'permission') {
      message = "تم إرسال طلب إذن الساعتين بنجاح بانتظار الاعتماد";
    } else if (type === 'early_checkout') {
      message = "تم إرسال طلب الانصراف الطارئ بنجاح بانتظار موافقة مدير العضويات (Memberships Manager)";
    }

    res.json({
      success: true,
      message,
      request: newReq
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/requests/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewerId, status, reviewNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: "حالة الاعتماد غير صالحة" });
    }

    const reviewed = await db.reviewRequest(id, reviewerId || 'manager', status, reviewNote);
    if (!reviewed) {
      return res.status(404).json({ success: false, error: "الطلب غير موجود" });
    }

    res.json({
      success: true,
      message: status === 'approved' ? "تم اعتماد الطلب بنجاح" : "تم رفض الطلب",
      request: reviewed
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
