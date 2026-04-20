// Rasterises a Fire-shaped template image for the macOS menu-bar tray.
//
// Apple's HIG requires template images: pure-black + transparent, with the OS
// inverting them for dark menu bars. The filename convention `*Template.png`
// (and the matching `@2x`) makes Electron treat them as templates
// automatically — no `setTemplateImage(true)` call needed at runtime.
//
// Run with: node electron-src/scripts/generate-tray-icon.cjs
// Requires `sharp` (already in ignite-frontend devDependencies).

const path = require('node:path');
const fs = require('node:fs/promises');
const sharp = require(path.resolve(__dirname, '../../node_modules/sharp'));

// Fire (fill) path from @phosphor-icons/core, viewBox 0 0 256 256.
const FIRE_PATH =
  'M143.38,17.85a8,8,0,0,0-12.63,3.41l-22,60.41L84.59,58.26a8,8,0,0,0-11.93.89C51,87.53,40,116.08,40,144a88,88,0,0,0,176,0C216,84.55,165.21,36,143.38,17.85Zm40.51,135.49a57.6,57.6,0,0,1-46.56,46.55A7.65,7.65,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68Z';

// Adds ~6% padding (the phosphor Fire is drawn inside a ~176×180 area of the
// 256 viewBox already, so total insets around the tray-size canvas stay small).
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <path d="${FIRE_PATH}" fill="black" />
</svg>
`;

const OUT_DIR = path.resolve(__dirname, '../assets');

const render = async (size, suffix) => {
  const outPath = path.join(OUT_DIR, `trayIconTemplate${suffix}.png`);
  await sharp(Buffer.from(svg))
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
  const stats = await fs.stat(outPath);
  console.log(`  ${path.basename(outPath)} — ${size}×${size} (${stats.size} bytes)`);
};

(async () => {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log('Generating macOS tray template icons…');
  await render(22, '');    // 22×22 @1x
  await render(44, '@2x'); // 44×44 @2x
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
