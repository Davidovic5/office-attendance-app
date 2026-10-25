const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// API Routes
app.use('/api', routes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dedicated Download Handler for Mobile Apps (Android APK & iOS IPA / mobileconfig)
const distPath = path.resolve(__dirname, '..', 'dist');

app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;

  // Dynamically generate Apple mobileconfig with current domain/IP
  if (filename === 'OfficeAttendance.mobileconfig') {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host');
    const fullUrl = `${proto}://${host}`;

    const iconFile = path.resolve(__dirname, '..', 'public', 'apple-touch-icon.png');
    let iconXml = '';
    if (fs.existsSync(iconFile)) {
      const iconBase64 = fs.readFileSync(iconFile).toString('base64');
      iconXml = `            <key>Icon</key>\n            <data>${iconBase64}</data>`;
    }

    const configContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>PayloadIdentifier</key>
            <string>com.office.attendance.webclip</string>
            <key>PayloadUUID</key>
            <string>8A7A213D-0544-42E4-A57C-DAE6114EEFB6</string>
            <key>PayloadDisplayName</key>
            <string>أندية وادي دجلة</string>
            <key>PayloadDescription</key>
            <string>تطبيق تسجيل حضور وانصراف موظفي أندية وادي دجلة بالـ GPS</string>
            <key>PayloadOrganization</key>
            <string>أندية وادي دجلة - Wadi Degla Clubs</string>
            <key>URL</key>
            <string>${fullUrl}</string>
            <key>Label</key>
            <string>وادي دجلة</string>
            <key>IsRemovable</key>
            <true/>
            <key>FullScreen</key>
            <true/>
            <key>Precomposed</key>
            <true/>
${iconXml ? iconXml + '\n' : ''}        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>أندية وادي دجلة - الحضور والانصراف</string>
    <key>PayloadIdentifier</key>
    <string>com.office.attendance.profile</string>
    <key>PayloadOrganization</key>
    <string>أندية وادي دجلة - Wadi Degla Clubs</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>B8A7A213-0544-42E4-A57C-DAE6114EEFB6</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

    res.setHeader('Content-Type', 'application/x-apple-aspen-config; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="OfficeAttendance.mobileconfig"');
    return res.send(configContent);
  }

  const filePath = path.resolve(distPath, 'download', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('ملف التطبيق غير موجود');
  }

  const stat = fs.statSync(filePath);

  if (filename.endsWith('.apk')) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  } else if (filename.endsWith('.ipa')) {
    res.setHeader('Content-Type', 'application/octet-stream');
  }

  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

// Serve static frontend in production
app.use(express.static(distPath));

// Fallback for SPA routing in Express 5
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/download')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'), err => {
    if (err) res.status(200).send("API Server running. Start Vite dev server for frontend.");
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Office Attendance Server running on http://localhost:${PORT}`);
});
