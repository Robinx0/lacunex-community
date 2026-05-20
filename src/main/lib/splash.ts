import { app, BrowserWindow } from 'electron';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Branded splash screen shown during app boot.
 *
 * Lifecycle:
 *   createSplashWindow()  — call from app.whenReady() before any heavy
 *                            init. Shows a 320×320 transparent frameless
 *                            window with the CE logo.
 *   dismissSplash(showMain) — call when the main window emits
 *                              ready-to-show. Waits for the minimum
 *                              display time to elapse, fires `showMain`
 *                              to reveal the main window, then fades
 *                              and closes the splash.
 *
 * Why an HTML splash and not a native image:
 *  - Single render path that uses the same SVG as the app icon.
 *  - Lets us animate (CSS pulse) without shipping an animation library.
 *  - Loads via `data:` URL — no static-file plumbing in dev or asar
 *    resolution in production beyond reading the source SVG once.
 *
 * The CSP in the embedded HTML is intentionally tight (`default-src
 * 'none'`) — the splash never executes scripts, only renders the
 * static SVG and CSS we control. If a future developer is tempted to
 * inject a "loading… 47%" counter or similar, route it through main
 * IPC, don't loosen the CSP.
 */

const SPLASH_MIN_MS = 1000;

let splashWindow: BrowserWindow | null = null;
let splashShownAt = 0;

function readSourceSvg(): string {
  try {
    return readFileSync(join(app.getAppPath(), 'build', 'source.svg'), 'utf8');
  } catch {
    // Graceful fallback. The splash still shows — just empty. Better
    // than blocking app launch on a missing asset.
    return '';
  }
}

function buildSplashHtml(): string {
  const svg = readSourceSvg();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: transparent;
      -webkit-user-select: none;
      cursor: default;
      overflow: hidden;
    }
    .splash {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: rise 240ms ease-out both;
    }
    .icon {
      width: 220px;
      height: 220px;
      animation: pulse 1.6s ease-in-out infinite;
      filter: drop-shadow(0 24px 48px rgba(0, 0, 0, 0.55));
    }
    .icon svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    @keyframes rise {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1);    opacity: 1;    }
      50%      { transform: scale(1.04); opacity: 0.92; }
    }
  </style>
</head>
<body>
  <div class="splash">
    <div class="icon">${svg}</div>
  </div>
</body>
</html>`;
}

export function createSplashWindow(): BrowserWindow {
  splashWindow = new BrowserWindow({
    width: 320,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  splashWindow.removeMenu();

  const html = buildSplashHtml();
  void splashWindow.loadURL(
    `data:text/html;charset=UTF-8,${encodeURIComponent(html)}`,
  );

  splashWindow.once('ready-to-show', () => {
    splashShownAt = Date.now();
    splashWindow?.show();
  });

  return splashWindow;
}

/**
 * Dismiss the splash. Waits until the minimum display time has elapsed,
 * then fires `onReveal` (typically `mainWindow.show()`), then fades the
 * splash to opacity 0 over ~180ms and destroys it.
 *
 * Safe to call multiple times — second and subsequent calls no-op.
 */
export function dismissSplash(onReveal: () => void = () => {}): void {
  if (!splashWindow || splashWindow.isDestroyed()) {
    onReveal();
    return;
  }
  const elapsed = Date.now() - splashShownAt;
  const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
  setTimeout(() => {
    onReveal();
    fadeOutAndClose();
  }, wait);
}

function fadeOutAndClose(): void {
  const win = splashWindow;
  splashWindow = null;
  if (!win || win.isDestroyed()) return;

  // Drop alwaysOnTop before fade so the just-shown main window doesn't
  // visually flicker behind a fading splash on Windows.
  try {
    win.setAlwaysOnTop(false);
  } catch {
    // ignore — safe to skip if the window is already being torn down
  }

  const STEPS = 9;
  const STEP_MS = 20;
  let i = STEPS;
  const tick = () => {
    if (win.isDestroyed()) return;
    i -= 1;
    try {
      win.setOpacity(Math.max(0, i / STEPS));
    } catch {
      // ignore
    }
    if (i > 0) {
      setTimeout(tick, STEP_MS);
    } else {
      try {
        win.close();
      } catch {
        // ignore
      }
    }
  };
  setTimeout(tick, STEP_MS);
}
