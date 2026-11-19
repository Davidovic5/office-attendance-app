const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
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
  const trimmedLogoBuffer = await sharp(logoBuffer).trim().toBuffer();

  console.log('📱 1. Generating Wadi Degla official app icon variants from 3D Gold Shield...');

  // Helper to generate centered logo on dark #09090b background
  async function makeIcon(size, safeRatio = 0.84) {
    const logoHeight = Math.round(size * safeRatio);
    const resizedLogo = await sharp(trimmedLogoBuffer)
      .resize({ height: logoHeight, fit: 'contain' })
      .toBuffer();

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 9, g: 9, b: 11, alpha: 1 }
      }
    }).composite([{
      input: resizedLogo,
      gravity: 'center'
    }]).png({ quality: 100 }).toBuffer();
  }

  const icon192Png = await makeIcon(192, 0.84);
  const icon512Png = await makeIcon(512, 0.84);

  // Setup Keystore
  const keystorePath = path.join(tempDir, 'release.keystore');
  execSync(`keytool -genkeypair -v -keystore "${keystorePath}" -alias degla -keyalg RSA -keysize 2048 -validity 10000 -storepass wadidegla -keypass wadidegla -dname "CN=WadiDegla, OU=Clubs, O=WadiDegla, C=EG" 2>/dev/null`);

  const apksignerPath = '/Users/davidovic/Library/Android/sdk/build-tools/34.0.0/apksigner';
  const zipalignPath = '/Users/davidovic/Library/Android/sdk/build-tools/34.0.0/zipalign';

  async function processApk(apkFileName) {
    console.log(`📦 Processing APK: ${apkFileName}...`);
    const apkPath = path.join(rootDir, 'public', 'download', apkFileName);
    const distApkPath = path.join(rootDir, 'dist', 'download', apkFileName);

    if (!fs.existsSync(apkPath)) return;

    const apkData = await fs.promises.readFile(apkPath);
    const apkZip = await JSZip.loadAsync(apkData);

    // Replace icon
    apkZip.file('res/drawable/icon.png', icon192Png);

    // Strip old META-INF signatures
    const toDelete = [];
    apkZip.forEach((rel) => {
      if (rel.startsWith('META-INF/')) toDelete.push(rel);
    });
    toDelete.forEach(p => apkZip.remove(p));

    const unsignedBuffer = await apkZip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const unsignedPath = path.join(tempDir, `unsigned_${apkFileName}`);
    const alignedPath = path.join(tempDir, `aligned_${apkFileName}`);
    fs.writeFileSync(unsignedPath, unsignedBuffer);

    // Zipalign 4
    execSync(`"${zipalignPath}" -p -f 4 "${unsignedPath}" "${alignedPath}"`);

    // Sign with apksigner (v1, v2, v3 enabled)
    execSync(`"${apksignerPath}" sign --ks "${keystorePath}" --ks-pass pass:wadidegla --ks-key-alias degla --key-pass pass:wadidegla --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true "${alignedPath}"`);

    // Verify
    const verifyOut = execSync(`"${apksignerPath}" verify --verbose "${alignedPath}"`).toString();
    console.log(`   Verification: ${verifyOut.includes('Verified using v1') && verifyOut.includes('Verified using v2') ? 'OK (v1+v2+v3)' : 'Check needed'}`);

    const signedData = fs.readFileSync(alignedPath);
    fs.writeFileSync(apkPath, signedData);
    if (fs.existsSync(path.dirname(distApkPath))) {
      fs.writeFileSync(distApkPath, signedData);
    }
    console.log(`   ✅ ${apkFileName} successfully updated and signed (${(signedData.length / 1024).toFixed(1)} KB)`);
  }

  await processApk('OfficeAttendance.apk');
  await processApk('WadiDeglaAttendance.apk');

  // -------------------------------------------------------------
  // B. UPDATE IOS IPA
  // -------------------------------------------------------------
  console.log('🍎 3. Updating iOS IPA with AppIcon assets...');
  const ipaPath = path.join(rootDir, 'public', 'download', 'OfficeAttendance.ipa');
  const distIpaPath = path.join(rootDir, 'dist', 'download', 'OfficeAttendance.ipa');

  if (fs.existsSync(ipaPath)) {
    const ipaData = await fs.promises.readFile(ipaPath);
    const ipaZip = await JSZip.loadAsync(ipaData);

    const icon180Png = await makeIcon(180, 0.72);
    const icon120Png = await makeIcon(120, 0.72);
    const icon152Png = await makeIcon(152, 0.72);

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

  console.log('🎉 ALL MOBILE PACKAGES NOW HAVE THE OFFICIAL 3D WADI DEGLA GOLD EMBLEM!');
}

updateAllMobilePackages().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});
