const express = require('express');
const { db, calculateDistanceMeters } = require('./db');

const router = express.Router();

// 0. Branches (الفروع)
router.get('/branches', (req, res) => {
  try {
    const branches = db.getBranches();
    res.json({ success: true, branches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/branches/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updated = db.updateBranch(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: "الفرع غير موجود" });
    }
    res.json({ success: true, branch: updated, message: `تم تحديث بيانات فرع "${updated.name}" بنجاح` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Authentication & Registration
router.post('/auth/register', (req, res) => {
  try {
    const { name, phone, pin, titleCode, jobTitle, branchId, weeklyOffDays, avatar } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: "الاسم ورقم الهاتف حقول إلزامية." });
    }

    const employee = db.registerEmployee({
      name,
      phone,
      pin: pin || "1234",
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

router.post('/auth/login', (req, res) => {
  try {
    const { phone, pin, password } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: "يرجى إدخال رقم الهاتف." });
    }

    const employee = db.loginEmployee(phone, password || pin || "");
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
router.put('/auth/profile', (req, res) => {
  try {
    const { employeeId, name, avatar, weeklyOffDays, jobTitle, branchId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: "رقم الموظف مطلوب." });
    }

    const updated = db.updateProfile(employeeId, { name, avatar, weeklyOffDays, jobTitle, branchId });
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
router.put('/auth/change-password', (req, res) => {
  try {
    const { employeeId, oldPassword, newPassword } = req.body;
    if (!employeeId || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: "جميع حقول كلمة المرور مطلوبة." });
    }

    const updated = db.changePassword(employeeId, oldPassword, newPassword);
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
router.delete('/auth/account', (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: "رقم الموظف مطلوب." });
    }

    const result = db.deleteEmployee(employeeId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Monthly Reports & Attendance History (سجل وتقارير الحضور والإجازات الشهرية)
router.get('/reports/monthly', (req, res) => {
  try {
    const { year, month, branchId, employeeId } = req.query;
    const report = db.getMonthlyReport({ year, month, branchId, employeeId });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Office Settings
router.get('/settings', (req, res) => {
  try {
    const settings = db.getOfficeSettings();
    const branches = db.getBranches();
    res.json({ success: true, settings, branches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/settings', (req, res) => {
  try {
    const updated = db.updateOfficeSettings(req.body);
    res.json({ success: true, settings: updated, message: "تم تحديث إعدادات الشركة بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Distance calculation test helper for a specific branch
router.post('/settings/verify-distance', (req, res) => {
  try {
    const { latitude, longitude, branchId } = req.body;
    const branch = db.getBranchById(branchId || 'branch_sheraton');
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
router.get('/titles', (req, res) => {
  try {
    const titles = db.getTitles();
    res.json({ success: true, titles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/titles/:code/permissions', (req, res) => {
  try {
    const { code } = req.params;
    const { permissions } = req.body;
    const updated = db.updateTitlePermissions(code, permissions);
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
router.get('/employees', (req, res) => {
  try {
    const { branchId } = req.query;
    const employees = db.getEmployees(branchId);
    res.json({ success: true, employees });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/employees/:id', (req, res) => {
  try {
    const emp = db.getEmployeeById(req.params.id);
    if (!emp) return res.status(404).json({ success: false, error: "الموظف غير موجود" });
    res.json({ success: true, employee: emp });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/employees', (req, res) => {
  try {
    const newEmp = db.registerEmployee(req.body);
    res.json({ success: true, employee: newEmp, message: "تمت إضافة الموظف بنجاح" });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 4. Live Office Presence Dashboard (Filtered by Branch)
router.get('/status/live', (req, res) => {
  try {
    const { date, branchId } = req.query;
    const status = db.getLiveOfficeStatus(date, branchId);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Attendance (Check-in & Check-out with Branch GPS & 8-hour rule)
router.get('/attendance/today', (req, res) => {
  try {
    const { date, branchId } = req.query;
    const records = db.getTodayAttendance(date, branchId);
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/attendance/check-in', (req, res) => {
  try {
    const { employeeId, latitude, longitude } = req.body;
    if (!employeeId || latitude == null || longitude == null) {
      return res.status(400).json({ success: false, error: "بيانات الموقع ورقم الموظف مطلوبة" });
    }

    const record = db.checkIn(employeeId, parseFloat(latitude), parseFloat(longitude));
    res.json({
      success: true,
      message: "تمام كدا انت دلوقتي في العمل! تم بدء وردية الـ 8 ساعات بنجاح.",
      record
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/attendance/check-out', (req, res) => {
  try {
    const { employeeId, latitude, longitude, forceOverride, reason } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: "رقم الموظف مطلوب" });
    }

    const record = db.checkOut(
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
router.get('/requests', (req, res) => {
  try {
    const { employeeId, branchId, type, status } = req.query;
    const requests = db.getRequests({ employeeId, branchId, type, status });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/requests', (req, res) => {
  try {
    const { employeeId, type, leaveType, startDate, endDate, reason, permissionType, permissionHours, startTime, endTime } = req.body;
    if (!employeeId || !type || !reason) {
      return res.status(400).json({ success: false, error: "جميع الحقول الإلزامية يجب تعبئتها" });
    }

    const newReq = db.createRequest(req.body);
    res.json({
      success: true,
      message: type === 'leave' ? "تم إرسال طلب الإجازة بنجاح بانتظار الاعتماد" : "تم إرسال طلب إذن الساعتين بنجاح بانتظار الاعتماد",
      request: newReq
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/requests/:id/review', (req, res) => {
  try {
    const { id } = req.params;
    const { reviewerId, status, reviewNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: "حالة الاعتماد غير صالحة" });
    }

    const reviewed = db.reviewRequest(id, reviewerId || 'manager', status, reviewNote);
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
