/**
 * Builds every app icon, splash and web icon from the owner's logo (docs/brand).
 * Run after the logo changes: npm run generate:brand -w @prime-garage/mobile
 *
 * Source: docs/brand/logo-transparent.webp (emblem on a transparent background).
 * Brand colors: orange, white and black (src/lib/theme.ts).
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const mobile = path.resolve(here, '..');
const source = path.resolve(mobile, '../../docs/brand/logo-transparent.webp');
const BLACK = { r: 10, g: 10, b: 10, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

/** Logo with faint edge noise removed and trimmed to its content. */
async function loadLogo() {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) if (data[i] < 10) data[i] = 0;
  return sharp(data, { raw: info }).trim({ threshold: 0 }).png().toBuffer();
}

/** Logo `logoWidth` px wide, centered on a `size` square (transparent or black). */
async function square(logo, size, logoWidth, background) {
  const scaled = await sharp(logo).resize({ width: logoWidth }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: scaled, gravity: 'centre' }])
    .png({ compressionLevel: 9, palette: true, quality: 95, effort: 10 });
}

/**
 * White silhouette of the light parts (gear, letters, orange strokes) for Android themed icons
 * and the notification icon, which only use the alpha channel.
 */
async function silhouette(logo) {
  const { data, info } = await sharp(logo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    const light = 0.2126 * r + 0.7152 * g + 0.0722 * b > 110;
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = light ? a : 0;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

const out = (p) => path.join(mobile, p);
const logo = await loadLogo();
const mono = await silhouette(logo);

const jobs = [
  // In-app logo (login screen)
  [sharp(logo).resize({ width: 900 }).png({ compressionLevel: 9, palette: true, quality: 95, effort: 10 }), 'assets/brand-logo.png'],
  // iOS and default app icon: no transparency allowed, black background
  [await square(logo, 1024, 900, BLACK), 'assets/icon.png'],
  // Android adaptive icon: content inside the 66% safe zone, background color in app.config.ts
  [await square(logo, 1024, 640, CLEAR), 'assets/android-icon-foreground.png'],
  [await square(mono, 1024, 640, CLEAR), 'assets/android-icon-monochrome.png'],
  // Splash (shown on black, see app.config.ts)
  [await square(logo, 1024, 1000, CLEAR), 'assets/splash-icon.png'],
  // Android notification icon: white silhouette only
  [await square(mono, 96, 92, CLEAR), 'assets/notification-icon.png'],
  // Web favicon and PWA icons (logo kept inside the maskable safe circle)
  [await square(logo, 64, 62, BLACK), 'assets/favicon.png'],
  [await square(logo, 192, 150, BLACK), 'public/logo192.png'],
  [await square(logo, 512, 400, BLACK), 'public/logo512.png'],
];
for (const [img, file] of jobs) {
  await img.toFile(out(file));
  console.log('wrote', file);
}
