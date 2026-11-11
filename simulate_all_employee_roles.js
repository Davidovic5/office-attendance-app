const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const url = new URL(path, BASE_URL);
  const bodyData = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null;
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (bodyData) {
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request(url, {
      method: options.method || 'GET',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

async function runSimulation() {
  console.log("=====================================================================");
  console.log("🚀 STARTING FULL REALISTIC EMPLOYEE SIMULATION (ALL 5 ROLES & BUTTONS)");
  console.log("=====================================================================\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const issuesFound = [];

  function assert(condition, testName, details = "") {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details}`);
      failedTests++;
      issuesFound.push({ testName, details });
    }
  }

  const timestamp = Date.now().toString().slice(-4);

  try {
    // =================================================================
    // STAGE 1: System Baseline & Configuration Verification
    // =================================================================
    console.log("🔹 [STAGE 1] System Baseline & Configuration");
    const health = await request('/api/health');
    assert(health.status === 200 && health.data.status === 'ok', "API Health Check 200 OK");

    const settingsRes = await request('/api/settings');
    assert(settingsRes.status === 200 && settingsRes.data.settings.shiftHours === 8, "Office Settings loaded with 8-hour shift");

    const branchesRes = await request('/api/branches');
    assert(branchesRes.status === 200 && branchesRes.data.branches.length === 8, "All 8 Wadi Degla branches verified in DB");

    const titlesRes = await request('/api/titles');
    assert(titlesRes.status === 200 && titlesRes.data.titles.length === 5, "All 5 exact job titles/positions verified in DB");

    const titlesMap = {};
    titlesRes.data.titles.forEach(t => { titlesMap[t.code] = t; });

    // =================================================================
    // STAGE 2: Role 1 Simulation - Sector Manager (مدير القطاع)
    // =================================================================
    console.log("\n🔹 [STAGE 2] Role 1 Simulation: Sector Manager (مدير القطاع)");
    const emp1Data = {
      name: `أحمد النجار_${timestamp}`,
      phone: `0101111${timestamp}`,
      password: "pass_sector_1234",
      titleCode: "sector_manager",
      branchId: "branch_sheraton",
      weeklyOffDays: ["friday", "saturday"],
      avatar: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    };

    const regEmp1 = await request('/api/auth/register', { method: 'POST', body: emp1Data });
    assert(regEmp1.status === 200 && regEmp1.data.success, "Sector Manager: Account Registration");
    const emp1 = regEmp1.data.employee;

    // Verify 100% full permissions
    assert(
      emp1.permissions.manage_office_settings === true &&
      emp1.permissions.manage_titles_permissions === true &&
      emp1.permissions.approve_leaves_permissions === true &&
      emp1.permissions.override_early_checkout === true,
      "Sector Manager: Full permissions profile confirmed"
    );

    // Profile update: change avatar & off days
    const updateEmp1 = await request('/api/auth/profile', {
      method: 'PUT',
      body: {
        employeeId: emp1.id,
        avatar: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M9Qz8DAwMAABBgB/6aQAAAAAElFTkSuQmCC",
        weeklyOffDays: ["friday", "sunday"]
      }
    });
    assert(updateEmp1.status === 200 && updateEmp1.data.employee.weeklyOffDays.includes("sunday"), "Sector Manager: Profile Update (Avatar & Off Days)");

    // Change Password
    const changePassEmp1 = await request('/api/auth/change-password', {
      method: 'PUT',
      body: {
        employeeId: emp1.id,
        oldPassword: "pass_sector_1234",
        newPassword: "ahmed_new_secret_99"
      }
    });
    assert(changePassEmp1.status === 200, "Sector Manager: Password Change Successful");

    // Re-login with new password
    const loginEmp1 = await request('/api/auth/login', {
      method: 'POST',
      body: { phone: emp1Data.phone, password: "ahmed_new_secret_99" }
    });
    assert(loginEmp1.status === 200 && loginEmp1.data.employee.name.includes("أحمد النجار"), "Sector Manager: Login with New Password");

    // GPS Geofence Check-In (Sheraton coords: 30.1025, 31.3780)
    // 1) Outside branch
    const checkInEmp1Far = await request('/api/attendance/check-in', {
      method: 'POST',
      body: { employeeId: emp1.id, latitude: 29.9602, longitude: 31.2568 } // in Maadi instead of Sheraton
    });
    assert(checkInEmp1Far.status === 400 && checkInEmp1Far.data.error.includes("خارج نطاق"), "Sector Manager: Block Check-in Outside Sheraton");

    // 2) Inside Sheraton branch
    const checkInEmp1Near = await request('/api/attendance/check-in', {
      method: 'POST',
      body: { employeeId: emp1.id, latitude: 30.10251, longitude: 31.37801 }
    });
    assert(checkInEmp1Near.status === 200 && checkInEmp1Near.data.message.includes("تمام كدا انت دلوقتي في العمل"), "Sector Manager: Check-in Inside Sheraton Succeeded");

    // Check-out: Early checkout without override must fail
    const checkOutEmp1Early = await request('/api/attendance/check-out', {
      method: 'POST',
      body: { employeeId: emp1.id, latitude: 30.1025, longitude: 31.3780, forceOverride: false }
    });
    assert(checkOutEmp1Early.status === 400 && checkOutEmp1Early.data.error.includes("لا يمكنك تسجيل الانصراف قبل إتمام"), "Sector Manager: Lock Early Checkout without Override");

    // Check-out: Early checkout with override & valid reason
    const checkOutEmp1Override = await request('/api/attendance/check-out', {
      method: 'POST',
      body: {
        employeeId: emp1.id,
        latitude: 30.1025,
        longitude: 31.3780,
        forceOverride: true,
        reason: "اجتماع طارئ مع مجلس الإدارة خارج المقر"
      }
    });
    assert(checkOutEmp1Override.status === 200 && checkOutEmp1Override.data.record.status === "checked_out", "Sector Manager: Early Checkout with Override Approved");

    // Submit Leave Request (3-day annual leave)
    const leaveEmp1 = await request('/api/requests', {
      method: 'POST',
      body: {
        employeeId: emp1.id,
        type: 'leave',
        leaveType: 'annual',
        startDate: '2026-12-01',
        endDate: '2026-12-03',
        reason: "إجازة سنوية اعتيادية"
      }
    });
    assert(leaveEmp1.status === 200 && leaveEmp1.data.request.status === 'pending', "Sector Manager: Submit 3-day Annual Leave");

    // Submit Permission Request (2-hour morning permission)
    const permEmp1 = await request('/api/requests', {
      method: 'POST',
      body: {
        employeeId: emp1.id,
        type: 'permission',
        permissionType: 'morning',
        permissionHours: 2,
        date: '2026-12-04',
        startTime: '09:00',
        endTime: '11:00',
        reason: "ظرف صباحي عائلي"
      }
    });
    assert(permEmp1.status === 200 && permEmp1.data.request.type === 'permission', "Sector Manager: Submit Morning Permission (2 Hours)");

    // =================================================================
    // STAGE 3: Role 2 Simulation - Deputy Manager (نائب المدير)
    // =================================================================
    console.log("\n🔹 [STAGE 3] Role 2 Simulation: Deputy Manager (نائب المدير)");
    const emp2Data = {
      name: `سارة إبراهيم_${timestamp}`,
      phone: `0102222${timestamp}`,
      password: "pass_deputy_1234",
      titleCode: "deputy_manager",
      branchId: "branch_maadi",
      weeklyOffDays: ["friday", "saturday"]
    };

    const regEmp2 = await request('/api/auth/register', { method: 'POST', body: emp2Data });
    assert(regEmp2.status === 200 && regEmp2.data.success, "Deputy Manager: Account Registration");
    const emp2 = regEmp2.data.employee;

    // Check-in inside Maadi (Maadi coords: 29.9602, 31.2568)
    const checkInEmp2 = await request('/api/attendance/check-in', {
      method: 'POST',
      body: { employeeId: emp2.id, latitude: 29.96021, longitude: 31.25681 }
    });
    assert(checkInEmp2.status === 200, "Deputy Manager: Check-in Inside Maadi");

    // Deputy Manager approves Sector Manager's Leave & Permission
    const approveLeave1 = await request(`/api/requests/${leaveEmp1.data.request.id}/review`, {
      method: 'POST',
      body: {
        reviewerId: emp2.id,
        status: 'approved',
        reviewNote: "معتمد من نائب المدير"
      }
    });
    assert(approveLeave1.status === 200 && approveLeave1.data.request.status === 'approved', "Deputy Manager: Approve Sector Manager's Leave Request");

    const approvePerm1 = await request(`/api/requests/${permEmp1.data.request.id}/review`, {
      method: 'POST',
      body: {
        reviewerId: emp2.id,
        status: 'approved',
        reviewNote: "معتمد لساعتين صباحاً"
      }
    });
    assert(approvePerm1.status === 200 && approvePerm1.data.request.status === 'approved', "Deputy Manager: Approve Sector Manager's Permission");

    // Verify Sector Manager's balances were deducted properly
    const emp1Refreshed = await request(`/api/employees/${emp1.id}`);
    assert(emp1Refreshed.status === 200 && emp1Refreshed.data.employee.leaveBalance === 18, "Sector Manager: Leave Balance accurately deducted (21 - 3 = 18 days)");
    assert(emp1Refreshed.status === 200 && emp1Refreshed.data.employee.permissionsBalanceHours === 4, "Sector Manager: Permission Balance accurately deducted (6 - 2 = 4 hours)");

    // Submit Deputy Manager's sick leave with attachment name
    const sickLeaveEmp2 = await request('/api/requests', {
      method: 'POST',
      body: {
        employeeId: emp2.id,
        type: 'leave',
        leaveType: 'sick',
        startDate: '2026-11-25',
        endDate: '2026-11-25',
        reason: "نزلة معوية حادة",
        attachmentName: "تقرير_طبي_مستشفى_دجلة.pdf"
      }
    });
    assert(sickLeaveEmp2.status === 200 && sickLeaveEmp2.data.request.attachmentName.includes(".pdf"), "Deputy Manager: Submit Sick Leave with Medical Report Attachment");

    // =================================================================
    // STAGE 4: Role 3 Simulation - Section Head (رئيس قسم)
    // =================================================================
    console.log("\n🔹 [STAGE 4] Role 3 Simulation: Section Head (رئيس قسم)");
    const emp3Data = {
      name: `محمود عبد العزيز_${timestamp}`,
      phone: `0103333${timestamp}`,
      password: "pass_head_1234",
      titleCode: "section_head",
      branchId: "branch_october1",
      weeklyOffDays: ["friday", "saturday"]
    };

    const regEmp3 = await request('/api/auth/register', { method: 'POST', body: emp3Data });
    assert(regEmp3.status === 200 && regEmp3.data.success, "Section Head: Account Registration");
    const emp3 = regEmp3.data.employee;

    // Section Head permissions check
    assert(
      emp3.permissions.approve_leaves_permissions === true &&
      emp3.permissions.view_reports === true &&
      emp3.permissions.manage_office_settings === false &&
      emp3.permissions.manage_titles_permissions === false,
      "Section Head: Specific department permissions confirmed"
    );

    // Section Head check-in inside October 1 (coords: 29.9723, 30.9421)
    const checkInEmp3 = await request('/api/attendance/check-in', {
      method: 'POST',
      body: { employeeId: emp3.id, latitude: 29.97231, longitude: 30.94211 }
    });
    assert(checkInEmp3.status === 200, "Section Head: Check-in Inside October 1");

    // Section Head reviews Deputy Manager's sick leave request
    const approveSick2 = await request(`/api/requests/${sickLeaveEmp2.data.request.id}/review`, {
      method: 'POST',
      body: {
        reviewerId: emp3.id,
        status: 'approved',
        reviewNote: "ألف سلامة، معتمد من رئيس القسم"
      }
    });
    assert(approveSick2.status === 200 && approveSick2.data.request.status === 'approved', "Section Head: Review & Approve Sick Leave Request");

    // =================================================================
    // STAGE 5: Role 4 Simulation - Senior Specialist (أخصائي أول)
    // =================================================================
    console.log("\n🔹 [STAGE 5] Role 4 Simulation: Senior Specialist (أخصائي أول)");
    const emp4Data = {
      name: `رنا الشريف_${timestamp}`,
      phone: `0104444${timestamp}`,
      password: "pass_senior_1234",
      titleCode: "senior_specialist",
      branchId: "branch_lotus",
      weeklyOffDays: ["friday", "saturday"]
    };

    const regEmp4 = await request('/api/auth/register', { method: 'POST', body: emp4Data });
    assert(regEmp4.status === 200 && regEmp4.data.success, "Senior Specialist: Account Registration");
    const emp4 = regEmp4.data.employee;

    // Check permissions
    assert(
      emp4.permissions.approve_leaves_permissions === false &&
      emp4.permissions.view_reports === true &&
      emp4.permissions.manage_office_settings === false,
      "Senior Specialist: Can view reports but cannot approve leaves"
    );

    // Check-in inside Lotus (coords: 30.0384, 31.4880)
    const checkInEmp4 = await request('/api/attendance/check-in', {
      method: 'POST',
      body: { employeeId: emp4.id, latitude: 30.03841, longitude: 31.48801 }
    });
    assert(checkInEmp4.status === 200, "Senior Specialist: Check-in Inside Lotus");

    // Submit Casual Leave (عارضة)
    const casualLeave4 = await request('/api/requests', {
      method: 'POST',
      body: {
        employeeId: emp4.id,
        type: 'leave',
        leaveType: 'casual',
        startDate: '2026-11-28',
        endDate: '2026-11-28',
        reason: "ظرف عائلي مفاجئ (عارضة)"
      }
    });
    assert(casualLeave4.status === 200 && casualLeave4.data.request.leaveType === 'casual', "Senior Specialist: Submit Casual Leave (عارضة)");

    // =================================================================
    // STAGE 6: Role 5 Simulation - Specialist (أخصائي)
    // =================================================================
    console.log("\n🔹 [STAGE 6] Role 5 Simulation: Specialist (أخصائي)");
    const emp5Data = {
      name: `يوسف ممدوح_${timestamp}`,
      phone: `0105555${timestamp}`,
      password: "pass_spec_1234",
      titleCode: "specialist",
      branchId: "branch_alexandria",
      weeklyOffDays: ["friday", "saturday"]
    };

    const regEmp5 = await request('/api/auth/register', { method: 'POST', body: emp5Data });
    assert(regEmp5.status === 200 && regEmp5.data.success, "Specialist: Account Registration");
    const emp5 = regEmp5.data.employee;

    // Check permissions
    assert(
      emp5.permissions.approve_leaves_permissions === false &&
      emp5.permissions.view_reports === false &&
      emp5.permissions.manage_office_settings === false,
      "Specialist: Base role permissions verified"
    );

    // Geofencing Check-in inside Alexandria (coords: 31.2001, 29.9187)
    const checkInEmp5 = await request('/api/attendance/check-in', {
      method: 'POST',
      body: { employeeId: emp5.id, latitude: 31.20011, longitude: 29.91871 }
    });
    assert(checkInEmp5.status === 200, "Specialist: Check-in Inside Alexandria Branch");

    // Submit Evening Permission (2 hours)
    const permEmp5 = await request('/api/requests', {
      method: 'POST',
      body: {
        employeeId: emp5.id,
        type: 'permission',
        permissionType: 'evening',
        permissionHours: 2,
        date: '2026-11-29',
        startTime: '15:00',
        endTime: '17:00',
        reason: "ارتباط موعد طبي مسائي"
      }
    });
    assert(permEmp5.status === 200 && permEmp5.data.request.permissionType === 'evening', "Specialist: Submit Evening Permission (2 Hours)");

    // Section Head approves Specialist's permission
    const approvePerm5 = await request(`/api/requests/${permEmp5.data.request.id}/review`, {
      method: 'POST',
      body: {
        reviewerId: emp3.id,
        status: 'approved',
        reviewNote: "موافق عليها"
      }
    });
    assert(approvePerm5.status === 200, "Section Head: Approve Specialist's Permission");

    // =================================================================
    // STAGE 7: Multi-Branch Isolation & Live Presence Dashboard
    // =================================================================
    console.log("\n🔹 [STAGE 7] Multi-Branch Isolation & Live Presence");

    // Check Alexandria live presence: must include Youssef, must NOT include Ahmed or Sara
    const alexLive = await request('/api/status/live?branchId=branch_alexandria');
    assert(alexLive.status === 200 && alexLive.data.status.filterBranchId === 'branch_alexandria', "Live Presence: Query Alexandria Branch");
    const alexNames = (alexLive.data.status.inOffice || []).map(i => i.employee.name);
    assert(alexNames.some(n => n.includes("يوسف ممدوح")), "Live Presence: Alexandria contains Specialist Youssef");
    assert(!alexNames.some(n => n.includes("أحمد النجار")), "Branch Isolation: Sector Manager does not leak into Alexandria");

    // Check Lotus live presence: contains Rana
    const lotusLive = await request('/api/status/live?branchId=branch_lotus');
    const lotusNames = (lotusLive.data.status.inOffice || []).map(i => i.employee.name);
    assert(lotusNames.some(n => n.includes("رنا الشريف")), "Live Presence: Lotus contains Senior Specialist Rana");

    // Check All Branches live presence
    const allLive = await request('/api/status/live?branchId=all');
    assert(allLive.status === 200 && allLive.data.status.summary.inOfficeCount >= 3, "Live Presence: Total In-Office count across all clubs");

    // =================================================================
    // STAGE 8: Monthly Reports & Analytics Audit
    // =================================================================
    console.log("\n🔹 [STAGE 8] Monthly Reports & Analytics Audit");
    const now = new Date();
    const reportRes = await request(`/api/reports/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
    assert(reportRes.status === 200 && reportRes.data.success, "Monthly Reports: Fetch Current Month Report");
    assert(reportRes.data.report.attendance.length > 0, "Monthly Reports: Attendance records populated");
    assert(reportRes.data.report.requests.length > 0, "Monthly Reports: Requests populated in report");
    assert(reportRes.data.report.employeeSummaries.length >= 5, "Monthly Reports: Employee summaries calculated for all 5 roles");

    // Filter report by Alexandria
    const alexReport = await request(`/api/reports/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}&branchId=branch_alexandria`);
    assert(alexReport.status === 200 && alexReport.data.report.employeeSummaries.some(s => s.employee.name.includes("يوسف ممدوح")), "Monthly Reports: Branch-Specific Filtering (Alexandria)");

    // =================================================================
    // STAGE 9: Management Controls - Branches, Settings & Permissions
    // =================================================================
    console.log("\n🔹 [STAGE 9] Management Controls (Settings, Branches, Titles)");

    // 1) Update Settings
    const updateSettings = await request('/api/settings', {
      method: 'POST',
      body: {
        companyName: "أندية وادي دجلة الرياضية - Wadi Degla",
        shiftHours: 8,
        graceMinutes: 20
      }
    });
    assert(updateSettings.status === 200 && updateSettings.data.settings.graceMinutes === 20, "Settings: Update Company Grace Period to 20 mins");

    // 2) Update Branch GPS & Radius
    const updateBranchRes = await request('/api/branches/branch_lotus', {
      method: 'PUT',
      body: {
        name: "اللوتس التجمع",
        city: "القاهرة الجديدة",
        latitude: 30.0384,
        longitude: 31.4880,
        radiusMeters: 150
      }
    });
    assert(updateBranchRes.status === 200 && updateBranchRes.data.branch.radiusMeters === 150, "Branches: Update Lotus Branch Radius to 150m");

    // 3) Update Title Permissions
    const updateTitleRes = await request('/api/titles/senior_specialist/permissions', {
      method: 'PUT',
      body: {
        permissions: {
          ...titlesMap['senior_specialist'].permissions,
          view_reports: true,
          override_early_checkout: true
        }
      }
    });
    assert(updateTitleRes.status === 200 && updateTitleRes.data.title.permissions.override_early_checkout === true, "Titles: Grant Early Checkout to Senior Specialist");

    // Revert Lotus and Senior Specialist to defaults
    await request('/api/branches/branch_lotus', {
      method: 'PUT',
      body: { name: "اللوتس", city: "القاهرة الجديدة", latitude: 30.0384, longitude: 31.4880, radiusMeters: 100 }
    });
    await request('/api/titles/senior_specialist/permissions', {
      method: 'PUT',
      body: { permissions: titlesMap['senior_specialist'].permissions }
    });

    // =================================================================
    // STAGE 10: Native App Downloads (Android & iOS)
    // =================================================================
    console.log("\n🔹 [STAGE 10] Mobile App Packages Distribution");
    const apkRes = await request('/download/OfficeAttendance.apk');
    assert(apkRes.status === 200 && apkRes.headers['content-type'].includes('vnd.android.package-archive'), "Mobile Download: Android APK file delivery 200 OK");

    const iosRes = await request('/download/OfficeAttendance.mobileconfig');
    assert(iosRes.status === 200 && iosRes.headers['content-type'].includes('application/x-apple-aspen-config'), "Mobile Download: Apple mobileconfig profile 200 OK");

    const ipaRes = await request('/download/OfficeAttendance.ipa');
    assert(ipaRes.status === 200, "Mobile Download: iOS IPA file delivery 200 OK");

    // =================================================================
    // STAGE 11: Account Deletion & Cleanup
    // =================================================================
    console.log("\n🔹 [STAGE 11] Account Deletion & Cleanup");
    const deleteRes = await request('/api/auth/account', {
      method: 'DELETE',
      body: { employeeId: emp5.id }
    });
    assert(deleteRes.status === 200 && deleteRes.data.success, "Account Deletion: Delete Employee Account (Specialist Youssef)");

    const reLoginDeleted = await request('/api/auth/login', {
      method: 'POST',
      body: { phone: emp5Data.phone, password: "pass_spec_1234" }
    });
    assert(reLoginDeleted.status === 400 && reLoginDeleted.data.error.includes("غير مسجل"), "Account Deletion: Deleted employee cannot log in");

  } catch (err) {
    console.error("FATAL SIMULATION ERROR:", err);
  }

  console.log("\n=====================================================================");
  console.log(`🏁 SIMULATION COMPLETED: ${passedTests} / ${totalTests} PASSED`);
  if (failedTests > 0) {
    console.error(`⚠️ FAILED TESTS (${failedTests}):`);
    issuesFound.forEach(i => console.error(`  - ${i.testName}: ${i.details}`));
  } else {
    console.log("🎉 ALL REALISTIC SCENARIOS PASSED WITH 100% SUCCESS!");
  }
  console.log("=====================================================================\n");

  process.exit(failedTests > 0 ? 1 : 0);
}

runSimulation();
