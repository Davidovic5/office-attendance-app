const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateAllIcons() {
  const userUploadPath = '/Users/davidovic/.gemini/antigravity/brain/e8a7a213-d054-42e4-a57c-dae6114eefb6/.user_uploaded/media_1795068444600_36b5b137.png';
  const publicDir = path.resolve(__dirname, 'public');
  const distDir = path.resolve(__dirname, 'dist');

  console.log('🎨 Reading high-resolution 3D Gold Shield Logo...');
  const rawSource = await fs.promises.readFile(userUploadPath);
  
  // Save as canonical public/logo.png
  await fs.promises.writeFile(path.join(publicDir, 'logo.png'), rawSource);
  if (fs.existsSync(distDir)) {
    await fs.promises.writeFile(path.join(distDir, 'logo.png'), rawSource);
  }

  // Trim transparent excess borders around the shield
  const trimmedBuffer = await sharp(rawSource).trim().toBuffer();
  const trimmedMeta = await sharp(trimmedBuffer).metadata();
  console.log(`   Trimmed shield size: ${trimmedMeta.width}x${trimmedMeta.height}`);

  // Helper to compose shield centered onto #09090b background
  async function makeIcon(size, shieldHeight) {
    const resizedShield = await sharp(trimmedBuffer)
      .resize({ height: shieldHeight, fit: 'contain' })
      .toBuffer();

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 9, g: 9, b: 11, alpha: 1 } // #09090b luxury dark background
      }
    })
    .composite([
      {
        input: resizedShield,
        gravity: 'center'
      }
    ])
    .png({ quality: 100 })
    .toBuffer();
  }

  // 1. Standard App Icon 512x512 - Bold presentation (height 430px = ~84%)
  const icon512 = await makeIcon(512, 430);

  // 2. Android Maskable Icon 512x512 - Fits within Android adaptive safe zone circle (height 370px)
  const iconMaskable512 = await makeIcon(512, 370);

  // 3. Apple Touch Icon 180x180 - iOS Home Screen (height 152px)
  const appleTouchIcon = await makeIcon(180, 152);

  // 4. Android Standard 192x192 (height 160px)
  const icon192 = await makeIcon(192, 160);

  // 5. Favicons 32x32 and 16x16
  const favicon32 = await sharp(appleTouchIcon).resize(32, 32).png().toBuffer();
  const favicon16 = await sharp(appleTouchIcon).resize(16, 16).png().toBuffer();

  // Save to public/
  await fs.promises.writeFile(path.join(publicDir, 'icon-512.png'), icon512);
  await fs.promises.writeFile(path.join(publicDir, 'icon-maskable-512.png'), iconMaskable512);
  await fs.promises.writeFile(path.join(publicDir, 'icon-192.png'), icon192);
  await fs.promises.writeFile(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);
  await fs.promises.writeFile(path.join(publicDir, 'favicon-32.png'), favicon32);
  await fs.promises.writeFile(path.join(publicDir, 'favicon-16.png'), favicon16);
  await fs.promises.writeFile(path.join(publicDir, 'favicon.ico'), favicon32);

  // Also sync to dist/
  if (fs.existsSync(distDir)) {
    await fs.promises.writeFile(path.join(distDir, 'icon-512.png'), icon512);
    await fs.promises.writeFile(path.join(distDir, 'icon-maskable-512.png'), iconMaskable512);
    await fs.promises.writeFile(path.join(distDir, 'icon-192.png'), icon192);
    await fs.promises.writeFile(path.join(distDir, 'apple-touch-icon.png'), appleTouchIcon);
    await fs.promises.writeFile(path.join(distDir, 'favicon-32.png'), favicon32);
    await fs.promises.writeFile(path.join(distDir, 'favicon-16.png'), favicon16);
    await fs.promises.writeFile(path.join(distDir, 'favicon.ico'), favicon32);
  }

  console.log('✅ Generated all app icon variants with the new 3D Gold Shield Logo!');
}

generateAllIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
