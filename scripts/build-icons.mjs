#!/usr/bin/env node
/**
 * Render `build/source.svg` into the platform-specific icon files
 * electron-builder consumes:
 *
 *   build/icon.png   1024×1024 — used directly on Linux; electron-builder
 *                                derives macOS .icns and Windows .ico from
 *                                this PNG when the matching files are
 *                                absent.
 *
 * Optional follow-ups (run on a Mac for best fidelity):
 *
 *   build/icon.icns  multi-resolution macOS icon (16-1024)
 *   build/icon.ico   multi-resolution Windows icon (16-256)
 *
 * Both can be derived from icon.png using iconutil / imagemagick; see
 * build/README.md. A 1024x1024 icon.png is the minimum viable for
 * releases. Sharp is in devDependencies so `npm install` is the only
 * setup contributors need before running `npm run gen:icons`. If sharp
 * is unavailable on a contributor's platform the dynamic import below
 * fails with a clear hint.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = join(ROOT, 'build', 'source.svg');
// Two output locations:
//   - build/icon.png       — consumed by electron-builder at package
//                             time (taskbar/Dock for the installed app)
//                             and read by main/index.ts at runtime via
//                             app.getAppPath() for the BrowserWindow icon.
//   - src/renderer/public/ — served by Vite as `/icon.png` so the
//                             renderer's <link rel="icon"> in
//                             index.html resolves to a real file in
//                             both dev and production renderer bundles.
const OUT_PNG = join(ROOT, 'build', 'icon.png');
const OUT_PUBLIC_PNG = join(ROOT, 'src', 'renderer', 'public', 'icon.png');

if (!existsSync(SRC)) {
  console.error(`[build-icons] source SVG missing: ${SRC}`);
  process.exit(1);
}

let sharpModule;
try {
  sharpModule = await import('sharp');
} catch {
  console.error('[build-icons] failed to load sharp.');
  console.error('  Sharp is in devDependencies. If npm install succeeded but');
  console.error('  this still fails, the native prebuild may be missing for');
  console.error('  your platform. Try:');
  console.error('    npm rebuild sharp');
  process.exit(1);
}
const sharp = sharpModule.default;

const png = await sharp(SRC, { density: 384 })
  .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toBuffer();

const { writeFileSync } = await import('node:fs');
writeFileSync(OUT_PNG, png);
mkdirSync(dirname(OUT_PUBLIC_PNG), { recursive: true });
writeFileSync(OUT_PUBLIC_PNG, png);

console.log(`[build-icons] wrote 1024×1024 → ${OUT_PNG}`);
console.log(`[build-icons] wrote 1024×1024 → ${OUT_PUBLIC_PNG}`);
console.log(
  '[build-icons] electron-builder auto-derives icon.icns / icon.ico on package.',
);
