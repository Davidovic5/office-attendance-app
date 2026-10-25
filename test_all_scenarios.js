const http = require('http');

const BASE_URL = 'http://localhost:3001';

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

async function runTests() {
  console.log("=================================================");
  console.log("🧪 TESTING WADI DEGLA ATTENDANCE SYSTEM");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('/api/health');
    assert(health.status === 200 && health.data.status === 'ok', "Health Check Endpoint");

    // 2. Logo endpoint check
    const logo = await request('/logo.png');
    assert(logo.status === 200 && logo.headers['content-type'].includes('image/png'), "Wadi Degla Logo Asset 200 OK");

    // 3. Branches endpoint check
    const branchesRes = await request('/api/branches');
    assert(branchesRes.status === 200 && branchesRes.data.branches.length === 8, "8 Branches Loaded Properly");
    const branchNames = branchesRes.data.branches.map(b => b.name);
    assert(branchNames.includes('شيراتون') && branchNames.includes('المعادي') && branchNames.includes('اللوتس') && branchNames.includes('اسكندرية'), "Key Branches Present");

    // 4. Job Hierarchy Titles check
    const titlesRes = await request('/api/titles');
    const titleCodes = titlesRes.data.titles.map(t => t.code);
    assert(
      titleCodes.includes('sector_manager') &&
      titleCodes.includes('deputy_manager') &&
      titleCodes.includes('section_head') &&
      titleCodes.includes('senior_specialist') &&
      titleCodes.includes('specialist'),
      "Job Hierarchy Matches Exact Structure (Sector Manager, Deputy manager, Section head, Senior Specialist, Specialist)"
    );

    const sectorMgr = titlesRes.data.titles.find(t => t.code === 'sector_manager');
    const deputyMgr = titlesRes.data.titles.find(t => t.code === 'deputy_manager');
    const allPermissionsTrue = (t) => Object.values(t.permissions).every(val => val === true);
    assert(allPermissionsTrue(sectorMgr) && allPermissionsTrue(deputyMgr), "First two roles (Sector Manager & Deputy manager) have 100% full permissions");

    // 5. Auth: Register New Employee in El Lotus Branch
    const testPhone = "01099991122_" + Date.now();
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: "كريم سامي",
        phone: testPhone,
        pin: "5555",
        titleCode: "senior_specialist",
        jobTitle: "Senior Specialist - التسويق",
        branchId: "branch_lotus",
        weeklyOffDays: ["friday", "saturday"]
      }
    });
    assert(regRes.status === 200 && regRes.data.success, "Register New Employee in Lotus Branch");
    const newEmpId = regRes.data.employee.id;

    // 6. Auth: Duplicate Phone Protection
    const dupRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: "شخص مكرر",
        phone: testPhone,
        pin: "1234"
      }
    });
    assert(dupRes.status === 400 && dupRes.data.error.includes("مسجل بالفعل"), "Prevent Duplicate Phone Registration");

    // 7. Auth: Login Valid
    const loginValid = await request('/api/auth/login', {
      method: 'POST',
      body: { phone: testPhone, pin: "5555" }
    });
    assert(loginValid.status === 200 && loginValid.data.employee.name === "كريم سامي", "Login with Correct Credentials");

    // 8. Auth: Login Wrong PIN
    const loginWrongPin = await request('/api/auth/login', {
      method: 'POST',
      body: { phone: testPhone, pin: "0000" }
    });
    assert(loginWrongPin.status === 400 && loginWrongPin.data.error.includes("غير صحيح"), "Reject Login with Invalid PIN");

    // 9. Profile Update: Update Avatar & Off Days
    const profileRes = await request('/api/auth/profile', {
      method: 'PUT',
      body: {
        employeeId: newEmpId,
        avatar: "data:image/jpeg;base64,mockAvatarDataForTesting",
        weeklyOffDays: ["saturday", "sunday"]
      }
    });
    assert(profileRes.status === 200 && profileRes.data.success && profileRes.data.employee.avatar.includes("mockAvatarData"), "Update Profile Avatar and Weekly Off Days");

    // 10. Password Change: Change Password and Login with New One
    const changePassRes = await request('/api/auth/change-password', {
      method: 'PUT',
      body: {
        employeeId: newEmpId,
        oldPassword: "5555",
        newPassword: "newsecretpassword88"
      }
    });
    assert(changePassRes.status === 200 && changePassRes.data.success, "Change Password Successfully");

    const loginWithNewPass = await request('/api/auth/login', {
      method: 'POST',
      body: { phone: testPhone, password: "newsecretpassword88" }
    });
    assert(loginWithNewPass.status === 200 && loginWithNewPass.data.success, "Login with New Changed Password");

    // 11. GPS Geofencing: Check-in outside Lotus Branch (trying from Alexandria)
    const checkInFar = await request('/api/attendance/check-in', {
      method: 'POST',
      body: {
        employeeId: newEmpId,
        latitude: 31.2001, // Alexandria
        longitude: 29.9187
      }
    });
    assert(checkInFar.status === 400 && checkInFar.data.error.includes("خارج نطاق"), "Block Check-In Outside Assigned Branch");

    // 12. GPS Geofencing: Check-in inside Lotus Branch (Lotus coords: 30.0384, 31.4880)
    const checkInNear = await request('/api/attendance/check-in', {
      method: 'POST',
      body: {
        employeeId: newEmpId,
        latitude: 30.03841,
        longitude: 31.48802
      }
    });
    assert(checkInNear.status === 200 && checkInNear.data.message.includes("تمام كدا انت دلوقتي في العمل"), "Allow Check-In Inside Branch Range with Success Message");

    // 13. 8-Hour Rule: Immediate Checkout Lock
    const checkOutEarly = await request('/api/attendance/check-out', {
      method: 'POST',
      body: {
        employeeId: newEmpId,
        latitude: 30.0384,
        longitude: 31.4880,
        forceOverride: false
      }
    });
    assert(checkOutEarly.status === 400 && checkOutEarly.data.error.includes("لا يمكنك تسجيل الانصراف قبل إتمام"), "Block Check-Out Before 8 Hours");

    // 14. 8-Hour Rule: Early Checkout with Valid Override & Reason
    const checkOutOverride = await request('/api/attendance/check-out', {
      method: 'POST',
      body: {
        employeeId: newEmpId,
        latitude: 30.0384,
        longitude: 31.4880,
        forceOverride: true,
        reason: "ظرف صحي طارئ وموافقة رئيس القسم"
      }
    });
    assert(checkOutOverride.status === 200 && checkOutOverride.data.record.status === "checked_out", "Allow Early Checkout with Documented Reason");

    // 15. Branch Isolation: Presence in Lotus vs Maadi
    const presenceLotus = await request('/api/status/live?branchId=branch_lotus');
    assert(presenceLotus.status === 200 && presenceLotus.data.status.filterBranchId === 'branch_lotus', "Fetch Lotus Branch Live Presence");

    const presenceMaadi = await request('/api/status/live?branchId=branch_maadi');
    const maadiEmpNames = presenceMaadi.data.status.absent.concat(presenceMaadi.data.status.inOffice).map(i => i.employee.name);
    assert(!maadiEmpNames.includes("كريم سامي"), "Branch Isolation: Lotus Employee Does Not Leak into Maadi Branch");

    // 16. Leaves & Permissions Workflow: Submit Request
    const leaveReq = await request('/api/requests', {
      method: 'POST',
      body: {
        employeeId: newEmpId,
        type: "leave",
        leaveType: "sick",
        startDate: "2026-10-26",
        endDate: "2026-10-26",
        reason: "نزلة برد شديدة واستراحة طبية",
        attachmentName: "medical_cert.pdf"
      }
    });
    assert(leaveReq.status === 200 && leaveReq.data.request.status === "pending", "Submit Leave Request with Attachment");
    const reqId = leaveReq.data.request.id;

    // 17. Review Request: Approval by Manager
    const reviewRes = await request(`/api/requests/${reqId}/review`, {
      method: 'POST',
      body: {
        reviewerId: "emp_admin",
        status: "approved",
        reviewNote: "ألف سلامة، معتمد."
      }
    });
    assert(reviewRes.status === 200 && reviewRes.data.request.status === "approved", "Manager Approves Leave Request");

    // 18. Mobile Downloads: Android APK 200 OK
    const apkRes = await request('/download/OfficeAttendance.apk');
    assert(apkRes.status === 200 && apkRes.headers['content-type'] === 'application/vnd.android.package-archive', "Android APK Download 200 OK");

    // 19. Mobile Downloads: iPhone mobileconfig 200 OK
    const configRes = await request('/download/OfficeAttendance.mobileconfig');
    assert(configRes.status === 200 && configRes.raw.includes('<string>http://localhost:3001</string>'), "iPhone mobileconfig Download 200 OK with Dynamic Host");

    // 20. Mobile Downloads: iPhone IPA 200 OK
    const ipaRes = await request('/download/OfficeAttendance.ipa');
    assert(ipaRes.status === 200, "iPhone IPA Download 200 OK");

    // 21. Monthly Report: Fetch Monthly Attendance & Leaves Report
    const reportRes = await request('/api/reports/monthly?year=2026&month=10');
    assert(
      reportRes.status === 200 &&
      reportRes.data.success &&
      reportRes.data.report.employeeSummaries.length > 0 &&
      reportRes.data.report.monthLabel.includes('أكتوبر'),
      "Monthly Reports API returns attendance & leaves logs"
    );

    // 22. Delete Account: Delete Employee Account
    const deleteRes = await request('/api/auth/account', {
      method: 'DELETE',
      body: { employeeId: newEmpId }
    });
    assert(deleteRes.status === 200 && deleteRes.data.success, "Delete Employee Account API 200 OK");

    // Verify employee was deleted and cannot login
    const loginDeleted = await request('/api/auth/login', {
      method: 'POST',
      body: { phone: testPhone, pin: "5555" }
    });
    assert(loginDeleted.status === 400 && loginDeleted.data.error.includes("غير مسجل"), "Deleted Employee is removed and cannot log in");

    console.log("\n=================================================");
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Fatal Test Error:", err);
    process.exit(1);
  }
}

runTests();
