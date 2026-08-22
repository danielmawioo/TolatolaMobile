#!/usr/bin/env node
/**
 * Generate Android adaptive icon foreground per guideline:
 * - 1024×1024 canvas
 * - Logo inside 640×640 safe area (centered), with padding so it doesn't look zoomed
 *
 * Usage: node scripts/generate-adaptive-icon.js
 * Requires: npm install --save-dev sharp
 *
 * Reads assets/images/icon.png (or SOURCE path below), outputs assets/images/adaptive-icon.png
 */

const path = require('path');
const fs = require('fs');

const CANVAS = 1024;
const SAFE_AREA = 640;
const SOURCE = path.join(__dirname, '..', 'assets', 'images', 'icon.png');
const OUT = path.join(__dirname, '..', 'assets', 'images', 'adaptive-icon.png');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (_) {
    console.error('This script requires "sharp". Install with: npm install --save-dev sharp');
    process.exit(1);
  }

  if (!fs.existsSync(SOURCE)) {
    console.error('Source icon not found:', SOURCE);
    process.exit(1);
  }

  const meta = await sharp(SOURCE).metadata();
  const w = meta.width || 512;
  const h = meta.height || 512;
  const scale = SAFE_AREA / Math.max(w, h);
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);
  const x = Math.round((CANVAS - newW) / 2);
  const y = Math.round((CANVAS - newH) / 2);

  const resized = await sharp(SOURCE)
    .resize(newW, newH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left: x, top: y }])
    .png()
    .toFile(OUT);

  console.log('Written:', OUT);
  console.log('Canvas:', CANVAS + '×' + CANVAS + ', logo in', SAFE_AREA + '×' + SAFE_AREA, 'safe area');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
