import { app, BrowserWindow } from 'electron';
import type pkg from 'electron-updater';

/**
 * Auto-update wiring for Lacunex Community.
 *
 * Behavior:
 *   - Skips entirely in dev mode (`!app.isPackaged`).
 *   - Checks GitHub Releases at the publish provider configured in
 *     `package.json#build.publish`.
 *   - Auto-downloads new versions in the background.
 *   - Auto-installs on next quit (does NOT force-restart mid-session).
 *   - Forwards lifecycle events to the renderer via IPC for UI surfacing
 *     (banner, "restart to update" prompt). Renderer wiring is optional —
 *     if the renderer ignores these events, the silent update path still
 *     works.
 *
 * Why GitHub Releases as the provider: free, durable, and matches our
 * open-source distribution story for CE. Pro will gain a separate
 * channel later (S3 bucket or self-hosted) so Pro updates can ride
 * behind a license-key check.
 *
 * Cadence: one check on app-ready, then every 6 hours while the app is
 * running. Long-running sessions still get updates without polling so
 * aggressively that we hit GitHub's rate limits.
 */
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

let intervalHandle: NodeJS.Timeout | null = null;

export async function setupAutoUpdater(): Promise<void> {
  if (!app.isPackaged) return;

  // Lazy-load — `electron-updater` pulls in heavy native deps that
  // shouldn't load in dev (where we skip anyway).
  const mod: typeof pkg = await import('electron-updater');
  const { autoUpdater } = mod;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('error', (err) => {
    // Network failures during update check are routine — log, don't crash.
    console.warn('[updater] error:', err.message);
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[updater] update-available:', info.version);
    broadcast('updater:update-available', info);
  });

  autoUpdater.on('update-not-available', () => {
    // Silent — no-op for the user.
  });

  autoUpdater.on('download-progress', (progress) => {
    broadcast('updater:download-progress', progress);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[updater] update-downloaded:', info.version);
    broadcast('updater:update-downloaded', info);
  });

  // Initial check on app start (failure is silent).
  void autoUpdater.checkForUpdates().catch((err) => {
    console.warn('[updater] initial check failed:', err);
  });

  intervalHandle = setInterval(() => {
    void autoUpdater.checkForUpdates().catch(() => {
      /* network blip — next interval will retry */
    });
  }, SIX_HOURS_MS);
}

export function teardownAutoUpdater(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

/**
 * Broadcast a single message to the first available renderer. The app
 * is single-window today; if that ever changes, swap to
 * `BrowserWindow.getAllWindows().forEach(...)`.
 */
function broadcast(channel: string, payload: unknown): void {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win || win.isDestroyed()) return;
  win.webContents.send(channel, payload);
}
