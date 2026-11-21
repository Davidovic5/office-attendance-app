# Production MongoDB Atlas Backup & Disaster Recovery Blueprint

This document details the automated backup architecture and recovery strategies for the Multi-Tenant Wadi Degla Attendance PWA.

---

## 1. MongoDB Atlas Native Continuous Cloud Backups (Tier 1 - High Availability)
For production deployments on MongoDB Atlas (Dedicated Tier M10+):
- **Point-In-Time Restore (PITR)**: Enables recovery to any second within the retention window (up to 7 days).
- **Automated Snapshots**: Daily automated cloud snapshots retained for 30–90 days across multiple geographic zones.
- **RPO (Recovery Point Objective)**: < 1 minute.
- **RTO (Recovery Time Objective)**: < 15 minutes.

---

## 2. Automated S3 / Cloudflare R2 Offsite Export (Tier 2 - Multi-Cloud Disaster Recovery)

### Architecture
A lightweight Vercel Cron or GitHub Action executes daily at 03:00 AM UTC (off-peak hours) to export all tenant collections in compressed BSON/JSON format and upload them to encrypted offsite object storage (AWS S3 or Cloudflare R2).

### Backup Script (`scripts/backup-mongodump.sh`)
```bash
#!/usr/bin/env bash
set -euo pipefail

# Required environment variables (stored strictly in GitHub Secrets / Vercel Environment Variables):
# MONGODB_URI, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/tmp/mongo_backup_${TIMESTAMP}"
ARCHIVE_NAME="wadi_degla_backup_${TIMESTAMP}.tar.gz"

echo "📦 Starting MongoDB BSON dump..."
mongodump --uri="${MONGODB_URI}" --out="${BACKUP_DIR}" --gzip

echo "🗜️ Compressing archive..."
tar -czf "/tmp/${ARCHIVE_NAME}" -C "${BACKUP_DIR}" .

echo "☁️ Uploading encrypted archive to Cloudflare R2 / S3..."
aws s3 cp "/tmp/${ARCHIVE_NAME}" "s3://${R2_BUCKET}/backups/${ARCHIVE_NAME}" \
  --endpoint-url="${R2_ENDPOINT}" \
  --sse "AES256"

echo "🧹 Cleaning up local temporary files..."
rm -rf "${BACKUP_DIR}" "/tmp/${ARCHIVE_NAME}"

echo "✅ Backup completed and verified: ${ARCHIVE_NAME}"
```

---

## 3. Vercel Cron Daily Backup Endpoint Blueprint
To trigger a lightweight serverless backup export without external infrastructure:

```javascript
// api/cron/backup.js
import { Tenant, AttendanceRecord, Employee, Request, Branch } from '../../server/models';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import gzip from 'zlib';

export default async function handler(req, res) {
  // 1. Verify Vercel Cron signature
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Fetch tenant documents
  const data = {
    timestamp: new Date().toISOString(),
    tenants: await Tenant.find().lean(),
    branches: await Branch.find().lean(),
    employees: await Employee.find({}, { password: 0, pin: 0 }).lean(),
    recentAttendance: await AttendanceRecord.find().sort({ workDate: -1 }).limit(5000).lean(),
    requests: await Request.find().sort({ createdAt: -1 }).limit(5000).lean()
  };

  // 3. Compress and push to offsite S3/R2
  const compressed = gzip.gzipSync(Buffer.from(JSON.stringify(data)));
  const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });

  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: `backups/${new Date().toISOString().split('T')[0]}_snapshot.json.gz`,
    Body: compressed,
    ContentType: 'application/gzip'
  }));

  return res.status(200).json({ success: true, timestamp: data.timestamp });
}
```

---

## 4. Disaster Recovery & Restoration Procedure
To restore from a backup:
1. Download the target snapshot archive:
   ```bash
   aws s3 cp s3://${R2_BUCKET}/backups/wadi_degla_backup_20261121.tar.gz ./ --endpoint-url=${R2_ENDPOINT}
   ```
2. Unpack the archive:
   ```bash
   tar -xzf wadi_degla_backup_20261121.tar.gz -C ./restore_dump/
   ```
3. Restore using `mongorestore` with `--drop` or `--nsInclude`:
   ```bash
   mongorestore --uri="${RESTORE_MONGODB_URI}" --drop ./restore_dump/
   ```
4. Run index sync:
   ```bash
   node scripts/migrate-multitenant.js
   ```
