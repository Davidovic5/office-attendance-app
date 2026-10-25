const express = require('express');
const { db, calculateDistanceMeters } = require('./db');

const router = express.Router();

// 0. Authentication & Registration (تسجيل الدخول وتسجيل موظف جديد)
router.post('/auth/register', (req, res) => {
  try {
    const { name, phone, pin, titleCode, jobTitle, weeklyOffDays, avatar } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: "الاسم ورقم الهاتف حقول إلزامية." });
    }

    const employee = db.registerEmployee({
      name,
      phone,
      pin: pin || "1234",
      titleCode: titleCode || "employee",
      jobTitle: jobTitle || "موظف",
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
    const { phone, pin } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: "يرجى إدخال رقم الهاتف." });
    }

    const employee = db.loginEmployee(phone, pin || "");
    res.json({
      success: true,
      message: `مرحباً بك مجدداً يا ${employee.name}`,
      employee
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 1. Office Settings
router.get('/settings', (req, res) => {
  try {
    const settings = db.getOfficeSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/settings', (req, res) => {
  try {
    const updated = db.updateOfficeSettings(req.body);
    res.json({ success: true, settings: updated, message: "تم تحديث إعدادات المكتب بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Distance calculation test helper
router.post('/settings/verify-distance', (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const settings = db.getOfficeSettings();
    const distanceMeters = calculateDistanceMeters(
      parseFloat(latitude),
      parseFloat(longitude),
      settings.latitude,
      settings.longitude
    );
    const isWithinOffice = distanceMeters <= settings.radiusMeters;
    res.json({
      success: true,
      distanceMeters,
      allowedRadius: settings.radiusMeters,
      isWithinOffice,
      message: isWithinOffice
        ? `أنت داخل نطاق المكتب (المسافة: ${distanceMeters} م)`
        : `أنت خارج نطاق المكتب (المسافة: ${distanceMeters} م - المسموح به ${settings.radiusMeters} م)`
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
    const employees = db.getEmployees();
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

// 4. Live Office Presence Dashboard
router.get('/status/live', (req, res) => {
  try {
    const { date } = req.query;
    const status = db.getLiveOfficeStatus(date);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Attendance (Check-in & Check-out with GPS & 8-hour rule)
router.get('/attendance/today', (req, res) => {
  try {
    const { date } = req.query;
    const records = db.getTodayAttendance(date);
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
    const { employeeId, type, status } = req.query;
    const requests = db.getRequests({ employeeId, type, status });
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
