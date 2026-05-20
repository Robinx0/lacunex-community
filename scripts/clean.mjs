#!/usr/bin/env node
// Clears build output (out/, release/) and Vite's pre-bundle cache.
// Does not touch node_modules or user data.
import { rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TARGETS = ['out', 'node_modules/.vite', 'release'];

let removed = 0;
for (const t of TARGETS) {
  const full = join(ROOT, t);
  try {
    rmSync(full, { recursive: true, force: true });
    console.log(`✓ ${t}`);
    removed += 1;
  } catch (err) {
    console.error(`✗ ${t} — ${err instanceof Error ? err.message : String(err)}`);
  }
}
console.log(`\n[clean] ${removed}/${TARGETS.length} target(s) removed.`);
console.log('[clean] Next: `npm run dev` to rebuild from scratch.');
