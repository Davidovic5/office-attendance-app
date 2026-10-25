const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const JSZip = require('jszip');

async function updateAllMobilePackages() {
  const rootDir = __dirname;
  const logoPath = path.join(rootDir, 'public', 'logo.png');
  const tempDir = path.join('/tmp', 'degla_mobile_builder');

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  const logoBuffer = await fs.promises.readFile(logoPath);

  console.log('📱 1. Generating Wadi Degla official app icon variants...');

  // Helper to generate centered logo on dark #121212 background
  async function makeIcon(size, isWebp = true, safeRatio = 0.68) {
    const logoHeight = Math.round(size * safeRatio);
    const resizedLogo = await sharp(logoBuffer)
      .resize({ height: logoHeight, fit: 'contain' })
      .toBuffer();

    let img = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 18, g: 18, b: 18, alpha: 1 }
      }
    }).composite([{
      input: resizedLogo,
      gravity: 'center'
    }]);

    if (isWebp) {
      return img.webp({ quality: 95 }).toBuffer();
    } else {
      return img.png({ quality: 100 }).toBuffer();
    }
  }

  // Pre-generate icon buffers
  const icon192Webp = await makeIcon(192, true, 0.68);
  const icon144Webp = await makeIcon(144, true, 0.68);
  const icon96Webp = await makeIcon(96, true, 0.68);
  const icon72Webp = await makeIcon(72, true, 0.68);
  const icon48Webp = await makeIcon(48, true, 0.68);
  const icon432Png = await makeIcon(432, false, 0.70);

  // -------------------------------------------------------------
  // A. UPDATE ANDROID APK
  // -------------------------------------------------------------
  console.log('📦 2. Injecting icons into OfficeAttendance.apk...');
  const apkPath = path.join(rootDir, 'public', 'download', 'OfficeAttendance.apk');
  const distApkPath = path.join(rootDir, 'dist', 'download', 'OfficeAttendance.apk');

  const apkData = await fs.promises.readFile(apkPath);
  const apkZip = await JSZip.loadAsync(apkData);

  // Replace all 10 launcher icon targets in the APK
  apkZip.file('res/-6.webp', icon192Webp);
  apkZip.file('res/sK.webp', icon192Webp);
  apkZip.file('res/j_.webp', icon144Webp);
  apkZip.file('res/Sn.webp', icon144Webp);
  apkZip.file('res/qs.webp', icon96Webp);
  apkZip.file('res/u5.webp', icon96Webp);
  apkZip.file('res/MO.webp', icon72Webp);
  apkZip.file('res/fq.webp', icon72Webp);
  apkZip.file('res/d2.webp', icon48Webp);
  apkZip.file('res/yw.webp', icon48Webp);
  apkZip.file('res/Wh.png', icon432Png);

  // Remove existing signatures
  const filesToDelete = [];
  apkZip.forEach((relativePath) => {
    if (relativePath.startsWith('META-INF/') && (relativePath.endsWith('.SF') || relativePath.endsWith('.RSA') || relativePath.endsWith('MANIFEST.MF'))) {
      filesToDelete.push(relativePath);
    }
  });
  filesToDelete.forEach(p => apkZip.remove(p));

  // Build MANIFEST.MF
  const entries = [];
  const filenames = Object.keys(apkZip.files).filter(name => !apkZip.files[name].dir && !name.startsWith('META-INF/')).sort();

  let manifestContent = 'Manifest-Version: 1.0\r\nCreated-By: Wadi Degla Clubs App Signer\r\n\r\n';
  const entryDigests = {};

  for (const name of filenames) {
    const fileBuf = await apkZip.file(name).async('nodebuffer');
    const hash = crypto.createHash('sha256').update(fileBuf).digest('base64');
    const entryBlock = `Name: ${name}\r\nSHA-256-Digest: ${hash}\r\n\r\n`;
    manifestContent += entryBlock;

    // Digest of the entry block for CERT.SF
    const blockBuf = Buffer.from(`Name: ${name}\r\nSHA-256-Digest: ${hash}\r\n\r\n`, 'utf8');
    entryDigests[name] = crypto.createHash('sha256').update(blockBuf).digest('base64');
  }

  const manifestBuf = Buffer.from(manifestContent, 'utf8');
  const manifestSha256 = crypto.createHash('sha256').update(manifestBuf).digest('base64');

  // Build CERT.SF
  let certSfContent = `Signature-Version: 1.0\r\nCreated-By: Wadi Degla Clubs App Signer\r\nSHA-256-Digest-Manifest: ${manifestSha256}\r\n\r\n`;
  for (const name of filenames) {
    certSfContent += `Name: ${name}\r\nSHA-256-Digest: ${entryDigests[name]}\r\n\r\n`;
  }
  const certSfBuf = Buffer.from(certSfContent, 'utf8');

  // Write temporary files for OpenSSL PKCS#7 signing
  const certSfPath = path.join(tempDir, 'CERT.SF');
  const certRsaPath = path.join(tempDir, 'CERT.RSA');
  const keyPath = path.join(tempDir, 'key.pem');
  const certPath = path.join(tempDir, 'cert.pem');

  fs.writeFileSync(certSfPath, certSfBuf);

  // Generate self-signed RSA key and certificate
  execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 10000 -nodes -subj "/CN=WadiDegla/O=WadiDeglaClubs/C=EG" 2>/dev/null`);

  // Sign CERT.SF to create CERT.RSA (PKCS#7 in DER format)
  execSync(`openssl smime -sign -in "${certSfPath}" -out "${certRsaPath}" -outform DER -signer "${certPath}" -inkey "${keyPath}" -nodetach 2>/dev/null`);

  const certRsaBuf = fs.readFileSync(certRsaPath);

  // Add signature files back into zip
  apkZip.file('META-INF/MANIFEST.MF', manifestBuf);
  apkZip.file('META-INF/CERT.SF', certSfBuf);
  apkZip.file('META-INF/CERT.RSA', certRsaBuf);

  // Generate new signed APK buffer
  const signedApkBuffer = await apkZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  fs.writeFileSync(apkPath, signedApkBuffer);
  if (fs.existsSync(path.dirname(distApkPath))) {
    fs.writeFileSync(distApkPath, signedApkBuffer);
  }
  console.log(`   ✅ Android APK successfully updated and signed (${(signedApkBuffer.length / (1024*1024)).toFixed(2)} MB).`);

  // -------------------------------------------------------------
  // B. UPDATE IOS IPA
  // -------------------------------------------------------------
  console.log('🍎 3. Updating iOS IPA with AppIcon assets...');
  const ipaPath = path.join(rootDir, 'public', 'download', 'OfficeAttendance.ipa');
  const distIpaPath = path.join(rootDir, 'dist', 'download', 'OfficeAttendance.ipa');

  if (fs.existsSync(ipaPath)) {
    const ipaData = await fs.promises.readFile(ipaPath);
    const ipaZip = await JSZip.loadAsync(ipaData);

    const icon180Png = await makeIcon(180, false, 0.72);
    const icon120Png = await makeIcon(120, false, 0.72);
    const icon152Png = await makeIcon(152, false, 0.72);

    ipaZip.file('Payload/OfficeAttendance.app/AppIcon60x60@2x.png', icon120Png);
    ipaZip.file('Payload/OfficeAttendance.app/AppIcon60x60@3x.png', icon180Png);
    ipaZip.file('Payload/OfficeAttendance.app/AppIcon76x76@2x~ipad.png', icon152Png);
    ipaZip.file('Payload/OfficeAttendance.app/apple-touch-icon.png', icon180Png);

    const signedIpaBuffer = await ipaZip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    fs.writeFileSync(ipaPath, signedIpaBuffer);
    if (fs.existsSync(path.dirname(distIpaPath))) {
      fs.writeFileSync(distIpaPath, signedIpaBuffer);
    }
    console.log(`   ✅ iOS IPA successfully updated with AppIcons (${(signedIpaBuffer.length / (1024*1024)).toFixed(2)} MB).`);
  }

  console.log('🎉 ALL MOBILE PACKAGES NOW HAVE THE OFFICIAL WADI DEGLA ICON EMBEDDED!');
}

updateAllMobilePackages().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});
