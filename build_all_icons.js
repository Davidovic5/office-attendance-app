const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateAllIcons() {
  const logoPath = path.resolve(__dirname, 'public', 'logo.png');
  const publicDir = path.resolve(__dirname, 'public');
  const distDir = path.resolve(__dirname, 'dist');

  console.log('🎨 Generating Wadi Degla Club App Icons...');

  // 1. Standard App Icon 512x512 (for iOS / Android standard / PWA)
  // Background: #121212 (Shield Black)
  const logoBuffer = await fs.promises.readFile(logoPath);
  
  // Resize logo for 512x512 with safe padding (height 340px)
  const resizedLogo = await sharp(logoBuffer)
    .resize({ height: 340, fit: 'contain' })
    .toBuffer();

  const icon512 = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 18, g: 18, b: 18, alpha: 1 }
    }
  })
  .composite([
    {
      input: resizedLogo,
      gravity: 'center'
    }
  ])
  .png({ quality: 100 })
  .toBuffer();

  // 2. Maskable Icon 512x512 (Android adaptive icons with extra safe margin, height 280px)
  const maskableResizedLogo = await sharp(logoBuffer)
    .resize({ height: 280, fit: 'contain' })
    .toBuffer();

  const iconMaskable512 = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 18, g: 18, b: 18, alpha: 1 }
    }
  })
  .composite([
    {
      input: maskableResizedLogo,
      gravity: 'center'
    }
  ])
  .png({ quality: 100 })
  .toBuffer();

  // 3. Apple Touch Icon 180x180
  const appleTouchIcon = await sharp(icon512)
    .resize(180, 180)
    .png()
    .toBuffer();

  // 4. Icon 192x192
  const icon192 = await sharp(icon512)
    .resize(192, 192)
    .png()
    .toBuffer();

  // 5. Favicon 32x32 and 16x16
  const favicon32 = await sharp(icon512)
    .resize(32, 32)
    .png()
    .toBuffer();

  const favicon16 = await sharp(icon512)
    .resize(16, 16)
    .png()
    .toBuffer();

  // Save to public/
  await fs.promises.writeFile(path.join(publicDir, 'icon-512.png'), icon512);
  await fs.promises.writeFile(path.join(publicDir, 'icon-maskable-512.png'), iconMaskable512);
  await fs.promises.writeFile(path.join(publicDir, 'icon-192.png'), icon192);
  await fs.promises.writeFile(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);
  await fs.promises.writeFile(path.join(publicDir, 'favicon-32.png'), favicon32);
  await fs.promises.writeFile(path.join(publicDir, 'favicon-16.png'), favicon16);
  await fs.promises.writeFile(path.join(publicDir, 'favicon.ico'), favicon32);

  // Also save to dist/ if dist exists
  if (fs.existsSync(distDir)) {
    await fs.promises.writeFile(path.join(distDir, 'icon-512.png'), icon512);
    await fs.promises.writeFile(path.join(distDir, 'icon-maskable-512.png'), iconMaskable512);
    await fs.promises.writeFile(path.join(distDir, 'icon-192.png'), icon192);
    await fs.promises.writeFile(path.join(distDir, 'apple-touch-icon.png'), appleTouchIcon);
    await fs.promises.writeFile(path.join(distDir, 'favicon-32.png'), favicon32);
    await fs.promises.writeFile(path.join(distDir, 'favicon-16.png'), favicon16);
    await fs.promises.writeFile(path.join(distDir, 'favicon.ico'), favicon32);
  }

  console.log('✅ Generated Web & iOS PNG icons:');
  console.log('   - icon-512.png');
  console.log('   - icon-maskable-512.png');
  console.log('   - icon-192.png');
  console.log('   - apple-touch-icon.png');
  console.log('   - favicon-32.png');
  console.log('   - favicon.ico');

  return {
    icon512,
    iconMaskable512,
    appleTouchIcon,
    icon192
  };
}

generateAllIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
