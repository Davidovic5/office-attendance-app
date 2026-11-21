const express = require('express');
const { db, calculateDistanceMeters } = require('./db');
const {
  signUserToken,
  authenticateUser,
  requireAuth,
  verifyDeviceLock,
  requirePermission,
  preventSelfLockout
} = require('./middleware/auth');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');

// Helpers for Relying Party ID & Origins
function getRPID(req) {
  const host = req.get('host') || req.hostname || 'localhost';
  return host.split(':')[0];
}

function getExpectedOrigins(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.get('host') || req.hostname;
  const origins = new Set([
    `${proto}://${host}`,
    `https://${host}`,
    `http://${host}`,
    'https://office-attendance-app-sand.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ]);
  return Array.from(origins);
}

const router = express.Router();

// Enforce Server-Side Multi-Tenant Isolation & Authentication on all routes
router.use(authenticateUser);

// 0. Branches & Sectors (الفروع والقطاعات)
router.get('/sectors', async (req, res) => {
  try {
    const sectors = await db.getSectors();
    res.json({ success: true, sectors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/branches', async (req, res) => {
  try {
    const branches = await db.getBranches();
    res.json({ success: true, branches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/branches/:id', requireAuth, requirePermission('manage_office_settings'), async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.updateBranch(id, req.body, req.tenantId, req.user);
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
    const { name, phone, sapNumber, pin, password, titleCode, jobTitle, branchId, sectorId, sectorName, weeklyOffDays, avatar, deviceId, deviceInfo } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: "الاسم ورقم الهاتف حقول إلزامية." });
    }

    if (weeklyOffDays && Array.isArray(weeklyOffDays)) {
      if (weeklyOffDays.length === 0 || weeklyOffDays.length > 2) {
        return res.status(400).json({ success: false, error: "يجب اختيار أيام الإجازة الأسبوعية (يومان كحد أقصى)." });
      }
    }

    const employee = await db.registerEmployee({
      name,
      phone,
      sapNumber: sapNumber || "",
      password: password || pin || "1234",
      pin: pin || password || "1234",
      titleCode: titleCode || "memberships_specialist",
      jobTitle: jobTitle || "Memberships Specialist",
      branchId: branchId || "branch_october2",
      sectorId: sectorId || "",
      sectorName: sectorName || "",
      weeklyOffDays: weeklyOffDays || ["friday", "saturday"],
      avatar: avatar || null,
      deviceId: deviceId || null,
      deviceInfo: deviceInfo || null
    }, req.tenantId);

    const token = signUserToken(employee, req.tenantId);

    res.json({
      success: true,
      message: "تم إنشاء حساب الموظف بنجاح!",
      employee,
      token
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { phone, identifier, sapNumber, pin, password, deviceId, deviceInfo } = req.body;
    const loginIdentifier = String(identifier || phone || sapNumber || "").trim();
    if (!loginIdentifier) {
      return res.status(400).json({ success: false, error: "يرجى إدخال رقم الهاتف أو كود SAP." });
    }

    const employee = await db.loginEmployee(loginIdentifier, password || pin || "", { deviceId, deviceInfo }, req.tenantId);
    const token = signUserToken(employee, req.tenantId);

    res.json({
      success: true,
      message: `مرحباً بك مجدداً يا ${employee.name}`,
      employee,
      token
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Session Token Recovery (Seamless token sync for existing active sessions)
router.post('/auth/session-token', async (req, res) => {
  try {
    const { userId, phone } = req.body;
    if (!userId && !phone) {
      return res.status(400).json({ success: false, error: "معرف الموظف أو رقم الهاتف مطلوب" });
    }
    let emp = null;
    if (userId) emp = await db.getEmployeeById(userId, req.tenantId);
    if (!emp && phone) emp = await db.getEmployeeByPhone(phone);
    if (!emp) {
      return res.status(404).json({ success: false, error: "الموظف غير موجود" });
    }
    const token = signUserToken(emp, req.tenantId);
    res.json({ success: true, token, employee: emp });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== WEBAUTHN / BIOMETRICS (Face ID & Touch ID) ====================

// 1. Generate Registration Options (when employee enables Face ID/Touch ID in profile)
router.post('/auth/webauthn/register-options', async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: "معرف الموظف مطلوب." });
    }

    const emp = await db.getEmployeeById(employeeId);
    if (!emp) {
      return res.status(404).json({ success: false, error: "الموظف غير موجود بالنظام." });
    }

    const rpID = getRPID(req);
    const options = await generateRegistrationOptions({
      rpName: 'أندية وادي دجلة - الحضور الذكي',
      rpID,
      userID: new TextEncoder().encode(emp.id),
      userName: emp.phone,
      userDisplayName: emp.name,
      attestationType: 'none',
      excludeCredentials: (emp.passkeys || []).map(p => ({
        id: p.id,
        transports: p.transports || []
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'preferred'
      }
    });

    await db.saveWebAuthnChallenge(options.challenge, { userId: emp.id, phone: emp.phone, type: 'registration' });
    res.json({ success: true, options });
  } catch (err) {
    console.error("WebAuthn register-options error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Verify Registration Response (save passkey public key to employee)
router.post('/auth/webauthn/register-verify', async (req, res) => {
  try {
    const { employeeId, response, deviceInfo } = req.body;
    if (!employeeId || !response) {
      return res.status(400).json({ success: false, error: "بيانات التحقق غير مكتملة." });
    }

    const emp = await db.getEmployeeById(employeeId);
    if (!emp) {
      return res.status(404).json({ success: false, error: "الموظف غير موجود." });
    }

    const rpID = getRPID(req);
    const expectedOrigins = getExpectedOrigins(req);

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: async (challenge) => {
        const doc = await db.consumeWebAuthnChallenge(challenge);
        return Boolean(doc);
      },
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID,
      requireUserVerification: false
    });

    if (!verification.verified) {
      return res.status(400).json({ success: false, error: "فشل التحقق من صحة بصمة الوجه / الإصبع." });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const passkeyData = {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports || (response.response && response.response.transports) || [],
      createdAt: new Date().toISOString(),
      deviceName: deviceInfo || 'Face ID / Touch ID'
    };

    const updatedEmp = await db.addPasskeyToEmployee(emp.id, passkeyData);
    res.json({
      success: true,
      message: "تم تفعيل تسجيل الدخول ببصمة الوجه / الإصبع (Face ID / Touch ID) بنجاح!",
      employee: updatedEmp
    });
  } catch (err) {
    console.error("WebAuthn register-verify error:", err);
    res.status(400).json({ success: false, error: err.message || "حدث خطأ أثناء حفظ البصمة." });
  }
});

// 3. Generate Authentication Options (for Face ID / Touch ID login)
router.post('/auth/webauthn/login-options', async (req, res) => {
  try {
    const { phone } = req.body;
    let allowCredentials = [];

    if (phone && phone.trim()) {
      const emp = await db.getEmployeeByPhone(phone.trim());
      if (emp) {
        if (!Array.isArray(emp.passkeys) || emp.passkeys.length === 0) {
          return res.status(400).json({
            success: false,
            error: "لم تقم بتفعيل بصمة الوجه (Face ID) لهذا الحساب بعد. يرجى تسجيل الدخول برقم الهاتف وكلمة المرور أولاً لتفعيلها بضغطة واحدة."
          });
        }
        allowCredentials = emp.passkeys.map(p => ({
          id: p.id,
          transports: p.transports || []
        }));
      }
    }

    const rpID = getRPID(req);
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred'
    });

    await db.saveWebAuthnChallenge(options.challenge, { phone: phone || '', type: 'authentication' });
    res.json({ success: true, options });
  } catch (err) {
    console.error("WebAuthn login-options error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Verify Authentication Response (Log in employee via Face ID / Touch ID)
router.post('/auth/webauthn/login-verify', async (req, res) => {
  try {
    const { response, deviceId, deviceInfo, phone } = req.body;
    if (!response || !response.id) {
      return res.status(400).json({ success: false, error: "استجابة البصمة غير صالحة." });
    }

    // Look up employee by passkey ID (or by phone)
    let emp = await db.getEmployeeByPasskeyId(response.id);
    if (!emp && phone) {
      emp = await db.getEmployeeByPhone(phone);
    }

    if (!emp || !Array.isArray(emp.passkeys)) {
      return res.status(404).json({
        success: false,
        error: "بيانات البصمة غير مسجلة أو لم يتم العثور على حساب مرتبط بها. يرجى تسجيل الدخول بالرقم والـ PIN أولاً لتفعيلها."
      });
    }

    const passkey = emp.passkeys.find(p => p.id === response.id);
    if (!passkey) {
      return res.status(404).json({
        success: false,
        error: "مفتاح البصمة غير مسجل لهذا الحساب."
      });
    }

    const rpID = getRPID(req);
    const expectedOrigins = getExpectedOrigins(req);

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: async (challenge) => {
        const doc = await db.consumeWebAuthnChallenge(challenge);
        return Boolean(doc);
      },
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID,
      credential: {
        id: passkey.id,
        publicKey: Buffer.from(passkey.publicKey, 'base64url'),
        counter: passkey.counter || 0,
        transports: passkey.transports || []
      },
      requireUserVerification: false
    });

    if (!verification.verified) {
      return res.status(400).json({ success: false, error: "فشل التحقق من البصمة." });
    }

    // Update signature counter
    await db.updatePasskeyCounter(emp.id, passkey.id, verification.authenticationInfo.newCounter);

    // Complete login session
    const loggedInEmployee = await db.loginEmployeeByPasskey(emp, { deviceId, deviceInfo });

    const token = signUserToken(loggedInEmployee, req.tenantId);

    res.json({
      success: true,
      message: `مرحباً بك مجدداً يا ${loggedInEmployee.name}`,
      employee: loggedInEmployee,
      token
    });
  } catch (err) {
    console.error("WebAuthn login-verify error:", err);
    res.status(400).json({ success: false, error: err.message || "فشل التحقق من البصمة." });
  }
});

// 5. Check Passkeys Status for an employee
router.get('/auth/webauthn/status', async (req, res) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) return res.status(400).json({ success: false, error: "معرف الموظف مطلوب." });

    const emp = await db.getEmployeeById(employeeId);
    if (!emp) return res.status(404).json({ success: false, error: "الموظف غير موجود." });

    const hasPasskey = Boolean(Array.isArray(emp.passkeys) && emp.passkeys.length > 0);
    res.json({
      success: true,
      hasPasskey,
      passkeysCount: emp.passkeys ? emp.passkeys.length : 0,
      passkeys: (emp.passkeys || []).map(p => ({
        id: p.id,
        createdAt: p.createdAt,
        deviceName: p.deviceName || 'الهاتف المعتمد'
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Remove a Passkey from employee profile
router.delete('/auth/webauthn/credentials', async (req, res) => {
  try {
    const { employeeId, credentialId } = req.body;
    if (!employeeId || !credentialId) {
      return res.status(400).json({ success: false, error: "البيانات غير مكتملة." });
    }

    await db.removePasskeyFromEmployee(employeeId, credentialId);
    res.json({ success: true, message: "تم إزالة البصمة بنجاح." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Profile (Avatar, Name, Weekly Off Days)
router.put('/auth/profile', async (req, res) => {
  try {
    const { employeeId, name, avatar, weeklyOffDays, jobTitle, branchId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: "رقم الموظف مطلوب." });
    }

    if (weeklyOffDays !== undefined) {
      if (!Array.isArray(weeklyOffDays) || weeklyOffDays.length === 0 || weeklyOffDays.length > 2) {
        return res.status(400).json({ success: false, error: "لا يمكن اختيار أكثر من يومين للإجازة الأسبوعية (الحد الأقصى يومان فقط)." });
      }
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

// Mandatory SAP Number Registration
router.post('/auth/set-sap-number', async (req, res) => {
  try {
    const { employeeId, sapNumber } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: "معرف الموظف مطلوب." });
    }
    const cleanSap = String(sapNumber || "").trim();
    if (!cleanSap) {
      return res.status(400).json({ success: false, error: "يرجى كتابة كود الـ SAP الخاص بك." });
    }

    const updated = await db.setEmployeeSapNumber(employeeId, cleanSap);
    res.json({
      success: true,
      message: "تم حفظ وتأكيد كود الـ SAP بنجاح!",
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

router.post('/settings', requireAuth, requirePermission('manage_office_settings'), async (req, res) => {
  try {
    const updated = await db.updateOfficeSettings(req.body, req.tenantId, req.user);
    res.json({ success: true, settings: updated, message: "تم تحديث إعدادات المكتب بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify Distance to Assigned Branch
router.post('/settings/verify-distance', async (req, res) => {
  try {
    const { latitude, longitude, branchId, employeeId } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, error: "إحداثيات الموقع مطلوبة" });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    let primaryBranch = branchId ? await db.getBranchById(branchId) : null;
    let missionBranch = null;

    if (employeeId && db.getActiveWorkMission) {
      const activeMission = await db.getActiveWorkMission(employeeId);
      if (activeMission && activeMission.missionBranchId) {
        missionBranch = await db.getBranchById(activeMission.missionBranchId);
      }
    }

    if (!primaryBranch && employeeId) {
      const emp = await db.getEmployeeById(employeeId);
      if (emp && emp.branchId) {
        primaryBranch = await db.getBranchById(emp.branchId);
      }
    }

    if (!primaryBranch && !missionBranch) {
      return res.status(404).json({ success: false, error: "الفرع المحدد غير موجود" });
    }

    let primaryDist = primaryBranch ? calculateDistanceMeters(lat, lon, primaryBranch.latitude, primaryBranch.longitude) : 999999;
    let isWithinPrimary = primaryBranch ? primaryDist <= primaryBranch.radiusMeters : false;

    let missionDist = missionBranch ? calculateDistanceMeters(lat, lon, missionBranch.latitude, missionBranch.longitude) : 999999;
    let isWithinMission = missionBranch ? missionDist <= missionBranch.radiusMeters : false;

    const isWithinOffice = isWithinPrimary || isWithinMission;
    const activeBranch = isWithinMission ? missionBranch : (primaryBranch || missionBranch);
    const distanceMeters = isWithinMission ? missionDist : primaryDist;

    let message = '';
    if (isWithinMission) {
      message = `أنت داخل نطاق فرع المأمورية (${missionBranch.name}) - المسافة: ${missionDist} م`;
    } else if (isWithinPrimary) {
      message = `أنت داخل نطاق فرعك الأساسي (${primaryBranch.name}) - المسافة: ${primaryDist} م`;
    } else {
      if (missionBranch && primaryBranch) {
        message = `أنت خارج النطاق! المسافة لفرعك (${primaryBranch.name}): ${primaryDist}م، ولفرع المأمورية (${missionBranch.name}): ${missionDist}م`;
      } else {
        message = `أنت خارج نطاق فرع (${activeBranch.name}) - المسافة: ${distanceMeters} م (المسموح به ${activeBranch.radiusMeters} م)`;
      }
    }

    res.json({
      success: true,
      branch: activeBranch,
      primaryBranch,
      missionBranch,
      hasWorkMission: Boolean(missionBranch),
      isWorkMission: isWithinMission,
      distanceMeters,
      allowedRadius: activeBranch.radiusMeters,
      isWithinOffice,
      message
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

router.put('/titles/:code/permissions', requireAuth, requirePermission('manage_titles_permissions'), preventSelfLockout, async (req, res) => {
  try {
    const { code } = req.params;
    const { permissions } = req.body;
    const updated = await db.updateTitlePermissions(code, permissions, req.tenantId, req.user);
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

// Reset Device Binding (فك ارتباط الجهاز لنقل الحساب لهاتف جديد)
router.post('/employees/:id/reset-device', requireAuth, requirePermission('manage_employees'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.resetEmployeeDevice(id, req.tenantId, req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Reset Employee Password by Admin/Manager (إعادة تعيين كلمة مرور الموظف بواسطة الإدارة)
router.post('/employees/:id/reset-password', requireAuth, requirePermission(['manage_employees', 'edit_employee_details']), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};
    const result = await db.resetEmployeePassword(id, newPassword, req.tenantId, req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update Employee Balances (تعديل رصيد الإجازات والأذونات للموظف)
router.put('/employees/:id/balances', requireAuth, requirePermission(['manage_employees', 'edit_employee_details']), async (req, res) => {
  try {
    const { id } = req.params;
    const { leaveBalance, permissionsBalanceHours } = req.body;
    const updated = await db.updateEmployeeBalances(id, { leaveBalance, permissionsBalanceHours }, req.tenantId, req.user);
    res.json({
      success: true,
      employee: updated,
      message: `تم تحديث رصيد الموظف (${updated.name}) بنجاح.`
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update Employee Full Details (تعديل بيانات ومسمى وفرع ورصيد الموظف)
router.put('/employees/:id/details', requireAuth, requirePermission(['edit_employee_details', 'manage_employees']), async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.updateEmployeeDetails(id, req.body, req.tenantId, req.user);
    res.json({
      success: true,
      employee: updated,
      message: `تم تحديث بيانات الموظف (${updated.name}) بنجاح.`
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete Employee by Admin/Authorized Manager (حذف حساب الموظف بصلاحية الحذف)
router.delete('/employees/:id', requireAuth, requirePermission('delete_employee'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.deleteEmployee(id, req.tenantId, req.user);
    res.json(result);
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

router.post('/attendance/check-in', verifyDeviceLock, async (req, res) => {
  try {
    const { employeeId, latitude, longitude, accuracy } = req.body;
    if (!employeeId || latitude == null || longitude == null) {
      return res.status(400).json({ success: false, error: "بيانات الموقع ورقم الموظف مطلوبة" });
    }

    const record = await db.checkIn(
      employeeId,
      parseFloat(latitude),
      parseFloat(longitude),
      accuracy != null ? parseFloat(accuracy) : null,
      req.tenantId
    );

    res.json({
      success: true,
      message: "تمام كدا انت دلوقتي في العمل! تم بدء وردية الـ 8 ساعات بنجاح.",
      record
    });
  } catch (err) {
    if (err.statusCode === 409 || err.code === 11000 || err.message?.includes('E11000')) {
      return res.status(409).json({
        success: false,
        error: err.message || "تم تسجيل حضورك اليوم بالفعل مسبقاً، ولا يمكن تكرار تسجيل الحضور في نفس اليوم."
      });
    }
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

router.post('/attendance/check-out', verifyDeviceLock, async (req, res) => {
  try {
    const { employeeId, latitude, longitude, accuracy, forceOverride, reason } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: "رقم الموظف مطلوب" });
    }
    if (latitude == null || longitude == null || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      return res.status(400).json({ success: false, error: "إحداثيات الموقع (GPS) مطلوبة لتسجيل الانصراف، ولا يمكن تسجيل الانصراف بدون تفعيل الموقع." });
    }

    const record = await db.checkOut(
      employeeId,
      parseFloat(latitude),
      parseFloat(longitude),
      Boolean(forceOverride),
      reason || "",
      accuracy != null ? parseFloat(accuracy) : null,
      req.tenantId,
      req.user
    );

    res.json({
      success: true,
      message: "تم تسجيل الانصراف بنجاح، شكراً لجهودك اليوم!",
      record
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
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

router.post('/requests/:id/review', requireAuth, requirePermission('approve_leaves_permissions'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewerId, status, reviewNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: "حالة الاعتماد غير صالحة" });
    }

    const reviewed = await db.reviewRequest(id, reviewerId || req.user?.userId || 'manager', status, reviewNote, req.user);
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

// 7. Web Push Notifications
router.get('/notifications/vapid-public-key', (req, res) => {
  res.json({
    success: true,
    publicKey: process.env.VAPID_PUBLIC_KEY || "BKDfJ-gm-z4cJNeyTTBe3cD_bPcugExOm9yLKbZQZ68s0lQADHy-pGzkJ_Mbuf7IlZL0B5elp4MVu8Xy_3LXGSk"
  });
});

router.post('/notifications/subscribe', async (req, res) => {
  try {
    const { employeeId, subscription, userAgent } = req.body;
    if (!employeeId || !subscription) {
      return res.status(400).json({ success: false, error: "employeeId and subscription are required." });
    }
    await db.savePushSubscription(employeeId, subscription, userAgent || req.headers['user-agent'] || '');
    res.json({ success: true, message: "تم تفعيل إشعارات الهاتف بنجاح" });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/notifications/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await db.removePushSubscription(endpoint);
    }
    res.json({ success: true, message: "تم إلغاء الاشتراك في الإشعارات" });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 8. In-App Notifications
router.get('/notifications', async (req, res) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: "employeeId is required" });
    }
    const data = await db.getInAppNotifications(employeeId);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/notifications/read', async (req, res) => {
  try {
    const { employeeId, notificationIds } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: "employeeId is required" });
    }
    const data = await db.markInAppNotificationsAsRead(employeeId, notificationIds);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
