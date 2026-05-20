import { app } from 'electron';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

let userDataOverride: string | null = null;

/**
 * Override the userData root. Used by tests so they don't pollute the real
 * Electron data directory. Pass null to revert to Electron's default.
 */
export function setUserDataRoot(root: string | null): void {
  userDataOverride = root;
}

export function getUserDataRoot(): string {
  if (userDataOverride) return userDataOverride;
  return app.getPath('userData');
}

export function getDatabasePath(): string {
  const root = getUserDataRoot();
  mkdirSync(root, { recursive: true });
  return join(root, 'lacunex.db');
}

export function getAttachmentsRoot(reportId?: string): string {
  const root = getUserDataRoot();
  const base = join(root, 'attachments');
  const target = reportId ? join(base, reportId) : base;
  mkdirSync(target, { recursive: true });
  return target;
}
