const mongoose = require('mongoose');

// 1. Branch Schema
const BranchSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  city: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  radiusMeters: { type: Number, default: 100 }
});

// 2. Title & Permissions Schema
const TitleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  englishTitle: { type: String, required: true },
  arabicTitle: { type: String, required: true },
  description: { type: String, default: '' },
  color: { type: String, default: 'zinc' },
  permissions: {
    check_in_out: { type: Boolean, default: true },
    view_own_attendance: { type: Boolean, default: true },
    view_office_presence: { type: Boolean, default: true },
    request_leave: { type: Boolean, default: true },
    request_permission: { type: Boolean, default: true },
    approve_leaves_permissions: { type: Boolean, default: false },
    manage_employees: { type: Boolean, default: false },
    manage_titles_permissions: { type: Boolean, default: false },
    manage_office_settings: { type: Boolean, default: false },
    view_reports: { type: Boolean, default: false },
    view_all_branches: { type: Boolean, default: false },
    override_early_checkout: { type: Boolean, default: false }
  }
});

// 3. Employee Schema
const EmployeeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  pin: { type: String, default: '' },
  titleCode: { type: String, required: true, default: 'specialist' },
  jobTitle: { type: String, default: 'Specialist' },
  branchId: { type: String, required: true, default: 'branch_sheraton' },
  weeklyOffDays: { type: [String], default: ['friday', 'saturday'] },
  avatar: { type: String, default: '' },
  leaveBalance: { type: Number, default: 21 },
  permissionsBalanceHours: { type: Number, default: 6 },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

// 4. Attendance Record Schema
const AttendanceRecordSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true, index: true },
  branchId: { type: String, required: true },
  date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
  checkInTime: { type: String, required: true },
  checkOutTime: { type: String, default: null },
  status: { type: String, default: 'in_office' }, // 'in_office' | 'checked_out'
  latitude: { type: Number },
  longitude: { type: Number },
  distanceMeters: { type: Number, default: 0 },
  durationMinutes: { type: Number, default: 0 },
  completed8Hours: { type: Boolean, default: false },
  checkOutNotes: { type: String, default: '' }
});

// 5. Leave & Permission Request Schema
const RequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true, index: true },
  type: { type: String, required: true, enum: ['leave', 'permission'] },
  leaveType: { type: String, enum: ['sick', 'travel', 'annual', 'casual', 'weekly_off', 'other'], default: 'sick' },
  startDate: { type: String },
  endDate: { type: String },
  date: { type: String },
  permissionType: { type: String, enum: ['morning', 'evening', 'midday'], default: 'morning' },
  permissionHours: { type: Number, default: 2 },
  startTime: { type: String, default: '09:00' },
  endTime: { type: String, default: '11:00' },
  reason: { type: String, required: true },
  attachmentName: { type: String, default: null },
  status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
  requestedAt: { type: String, default: () => new Date().toISOString() },
  reviewedBy: { type: String, default: null },
  reviewedAt: { type: String, default: null },
  reviewNote: { type: String, default: null }
});

// 6. Office Settings Schema
const OfficeSettingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'أندية وادي دجلة - Wadi Degla Clubs' },
  shiftHours: { type: Number, default: 8 },
  graceMinutes: { type: Number, default: 15 },
  workStartTime: { type: String, default: '09:00' },
  workEndTime: { type: String, default: '17:00' }
});

const Branch = mongoose.models.Branch || mongoose.model('Branch', BranchSchema);
const Title = mongoose.models.Title || mongoose.model('Title', TitleSchema);
const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
const AttendanceRecord = mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', AttendanceRecordSchema);
const Request = mongoose.models.Request || mongoose.model('Request', RequestSchema);
const OfficeSettings = mongoose.models.OfficeSettings || mongoose.model('OfficeSettings', OfficeSettingsSchema);

module.exports = {
  Branch,
  Title,
  Employee,
  AttendanceRecord,
  Request,
  OfficeSettings
};
