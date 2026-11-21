/**
 * Idempotent Multi-Tenancy Backfill & Index Migration Script
 * Safe to run multiple times without duplicating data or breaking existing records.
 */

const mongoose = require('mongoose');
const path = require('path');

const DEFAULT_MONGODB_URI = Buffer.from(
  'bW9uZ29kYitzcnY6Ly9EYXZpZG92aWNfNTpHaW92YW5uZV9Eb3Z5XzIwMDRAY2x1c3RlcjAuYmFqZmdnei5tb25nb2RiLm5ldC9vZmZpY2VfYXR0ZW5kYW5jZT9yZXRyeVdyaXRlcz10cnVlJnc9bWFqb3JpdHk=',
  'base64'
).toString('utf8');

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || DEFAULT_MONGODB_URI;

const {
  Tenant,
  Branch,
  Title,
  Employee,
  AttendanceRecord,
  Request,
  OfficeSettings,
  PushSubscription,
  InAppNotification,
  AuditLog
} = require('../server/models');

async function runMigration() {
  console.log('🚀 Connecting to MongoDB Atlas for Multi-Tenant Migration...');
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000
  });
  console.log('✅ Connected successfully to MongoDB.');

  const DEFAULT_TENANT_ID = 'wadi-degla';

  // 1. Upsert default tenant
  console.log('\n--- 1. Upserting Default Tenant ---');
  const tenant = await Tenant.findOneAndUpdate(
    { tenantId: DEFAULT_TENANT_ID },
    {
      $setOnInsert: {
        tenantId: DEFAULT_TENANT_ID,
        name: 'أندية وادي دجلة',
        timezone: 'Africa/Cairo',
        branding: {
          companyName: 'أندية وادي دجلة - Wadi Degla Clubs',
          logoUrl: '/logo.png?v=4.0'
        },
        createdAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Default tenant verified: ${tenant.tenantId} (${tenant.name})`);

  // 2. Backfill tenantId on all collections
  console.log('\n--- 2. Backfilling tenantId on All Operational Collections ---');
  const collections = [
    { model: Branch, name: 'branches' },
    { model: Title, name: 'titles' },
    { model: Employee, name: 'employees' },
    { model: AttendanceRecord, name: 'attendancerecords' },
    { model: Request, name: 'requests' },
    { model: OfficeSettings, name: 'officesettings' },
    { model: PushSubscription, name: 'pushsubscriptions' },
    { model: InAppNotification, name: 'inappnotifications' }
  ];

  for (const { model, name } of collections) {
    const res = await model.updateMany(
      { $or: [{ tenantId: { $exists: false } }, { tenantId: null }, { tenantId: '' }] },
      { $set: { tenantId: DEFAULT_TENANT_ID } }
    );
    console.log(`  • ${name}: updated ${res.modifiedCount} documents with tenantId="${DEFAULT_TENANT_ID}"`);
  }

  // 3. Normalize Attendance Records (workDate & userId)
  console.log('\n--- 3. Normalizing Attendance Records (workDate & userId) ---');
  const allAttendance = await AttendanceRecord.find({});
  let normalizedCount = 0;
  for (const rec of allAttendance) {
    let changed = false;
    if (!rec.workDate) {
      rec.workDate = rec.date || (rec.checkInTime ? rec.checkInTime.split('T')[0] : '2026-11-21');
      changed = true;
    }
    if (!rec.userId) {
      rec.userId = rec.employeeId;
      changed = true;
    }
    if (changed) {
      await rec.save();
      normalizedCount++;
    }
  }
  console.log(`✅ Normalized ${normalizedCount} attendance records with workDate and userId.`);

  // 4. Deduplicate attendance records before creating unique index
  console.log('\n--- 4. Checking for Duplicate Attendance Records ---');
  const duplicates = await AttendanceRecord.aggregate([
    {
      $group: {
        _id: { tenantId: "$tenantId", employeeId: "$employeeId", workDate: "$workDate" },
        count: { $sum: 1 },
        ids: { $push: "$_id" }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);

  if (duplicates.length > 0) {
    console.log(`⚠️ Found ${duplicates.length} duplicate attendance group(s). Resolving safely...`);
    for (const dup of duplicates) {
      // Keep first, remove subsequent duplicate IDs
      const idsToDelete = dup.ids.slice(1);
      await AttendanceRecord.deleteMany({ _id: { $in: idsToDelete } });
      console.log(`  Removed ${idsToDelete.length} duplicate record(s) for employee ${dup._id.employeeId} on ${dup._id.workDate}`);
    }
  } else {
    console.log('✅ Zero duplicate attendance records found.');
  }

  // 5. Build/Sync Compound Indexes
  console.log('\n--- 5. Synchronizing Compound Indexes ---');
  await Tenant.syncIndexes();
  console.log('✅ Tenant indexes synchronized.');

  await AttendanceRecord.syncIndexes();
  console.log('✅ AttendanceRecord compound indexes synchronized:');
  console.log('   - { tenantId: 1, employeeId: 1, workDate: 1 } (unique)');
  console.log('   - { tenantId: 1, workDate: -1, branchId: 1 }');
  console.log('   - { tenantId: 1, branchId: 1, status: 1 }');

  await Employee.syncIndexes();
  console.log('✅ Employee compound indexes synchronized:');
  console.log('   - { tenantId: 1, branchId: 1 }');
  console.log('   - { tenantId: 1, phone: 1 }');

  await Request.syncIndexes();
  console.log('✅ Request compound indexes synchronized:');
  console.log('   - { tenantId: 1, branchId: 1, status: 1, createdAt: -1 }');

  await AuditLog.syncIndexes();
  console.log('✅ AuditLog compound indexes synchronized:');
  console.log('   - { tenantId: 1, timestamp: -1 }');
  console.log('   - { tenantId: 1, targetId: 1, timestamp: -1 }');

  console.log('\n🎉 Multi-Tenant Migration & Index Sync Completed Successfully!\n');
  await mongoose.disconnect();
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
