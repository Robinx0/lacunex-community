import { app, BrowserWindow, nativeTheme, shell, session, type WebContents } from 'electron';
import { join } from 'node:path';
import { APP_NAME } from '@shared/constants';
import { openDatabase, type DatabaseHandle } from './db/connection';
import { getDatabasePath, getAttachmentsRoot } from './lib/paths';
import { NodeFileIO } from './lib/io';
import { ReportService } from './services/ReportService';
import { TemplateService } from './services/TemplateService';
import { FindingService } from './services/FindingService';
import { AttachmentService } from './services/AttachmentService';
import { ExportService } from './services/ExportService';
import { AIService } from './services/AIService';
import { registerIpcHandlers, unregisterIpcHandlers } from './ipc';
import { seedReportsIfEmpty } from './lib/seed';
import { seedFindingTemplatesIfEmpty } from './lib/findingTemplates';
import { seedReportSectionTemplatesIfMissing } from './lib/reportTemplates';
import { setupAutoUpdater, teardownAutoUpdater } from './lib/updater';
import { createSplashWindow, dismissSplash } from './lib/splash';
import { installApplicationMenu } from './lib/menu';

const isDev = !app.isPackaged;

let dbHandle: DatabaseHandle | null = null;

function initDatabaseAndIpc(): void {
  if (dbHandle) return;
  dbHandle = openDatabase({ filename: getDatabasePath() });
  const reports = new ReportService(dbHandle.db);
  const templates = new TemplateService(dbHandle.db);
  const findings = new FindingService(dbHandle.db);
  const attachments = new AttachmentService(dbHandle.db, NodeFileIO, {
    rootDir: () => getAttachmentsRoot(),
    reportDir: (reportId) => getAttachmentsRoot(reportId),
  });
  const exports = new ExportService(reports, attachments);
  const ai = new AIService();
  seedReportsIfEmpty(reports);
  seedFindingTemplatesIfEmpty(templates);
  seedReportSectionTemplatesIfMissing(templates);
  registerIpcHandlers({ reports, templates, findings, attachments, exports, ai });
}

// Strict CSP for renderer responses. Dev relaxes script-src and
// connect-src so Vite HMR works. Renderer-to-Ollama goes through main
// IPC, so the renderer never needs connect-src localhost. No cloud LLM
// host is in the allowlist: if a regression ever introduces a renderer
// fetch to one, CSP fails it closed.
function installSecurityHeaders(): void {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self'";
  const connectSrc = isDev
    ? "connect-src 'self' ws://localhost:* wss://localhost:* http://localhost:* https://localhost:*"
    : "connect-src 'self'";
  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    connectSrc,
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'none'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ');
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  // Deny every powerful permission by default — pentest reports never need
  // camera, mic, geolocation, notifications, or clipboard-read. Locked here
  // rather than per-request so a future BrowserWindow inherits the policy.
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
}

/**
 * Block in-place navigation and webview attachment on every WebContents
 * (the main window plus any future offscreen / preview windows). The
 * preload only runs for the initial document — letting the renderer
 * navigate to `https://attacker/` would leak the contextBridge `lacunex`
 * surface to attacker JS until the next reload.
 */
function hardenWebContents(contents: WebContents): void {
  contents.on('will-navigate', (event, url) => {
    const allowedDevOrigin = process.env['ELECTRON_RENDERER_URL'];
    if (isDev && allowedDevOrigin && url.startsWith(allowedDevOrigin)) return;
    event.preventDefault();
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
}

/**
 * Resolve the path to `build/icon.png` for both dev (project root) and
 * packaged (app.asar) builds. `app.getAppPath()` returns the project
 * root in dev and the asar archive in production; Electron's asar
 * transparency lets `BrowserWindow({ icon })` read either form.
 *
 * The icon is bundled into the app via `package.json#build.files`. It
 * controls the taskbar (Windows / Linux) and Dock (macOS dev — packaged
 * macOS uses the `.icns` derived from this PNG by electron-builder).
 */
function resolveAppIconPath(): string {
  return join(app.getAppPath(), 'build', 'icon.png');
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: APP_NAME,
    icon: resolveAppIconPath(),
    backgroundColor: '#191919',
    show: false,
    // No native menu bar — all configuration is consolidated in the
    // renderer's Settings modal (gear icon in the topbar). See
    // src/main/lib/menu.ts for the rationale.
    autoHideMenuBar: true,
    webPreferences: {
      // Preload is emitted as CommonJS with `.cjs` extension (see
      // electron.vite.config.ts → preload.build.rollupOptions). The
      // sandboxed renderer context can only run CJS preload scripts;
      // ESM (`.mjs` or bare `.js` under `"type": "module"`) throws
      // `Cannot use import statement outside a module` at runtime.
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // The auto-show on `ready-to-show` is intentionally NOT wired here —
  // app.whenReady coordinates main-window reveal with the splash
  // dismissal so the user never sees a bare main window flash up
  // before the splash has finished its minimum display time.

  window.webContents.setWindowOpenHandler((details) => {
    if (/^https?:\/\//.test(details.url)) void shell.openExternal(details.url);
    return { action: 'deny' };
  });
  hardenWebContents(window.webContents);

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Open DevTools automatically in dev so the user can see console
  // output + Network + React errors without hunting for the menu /
  // shortcut. Detached so it lives in its own window and doesn't
  // squeeze the main UI.
  if (isDev) {
    window.webContents.once('did-finish-load', () => {
      window.webContents.openDevTools({ mode: 'detach' });
    });
    // Forward main-process console output to the renderer DevTools
    // console as well, so frontend AND backend logs end up in one
    // visible place during development.
    window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      // Optional: prefix renderer messages with [renderer] so they
      // stand out from main-process logs that get printed to the
      // terminal. Keeping this lightweight — no remote dispatch.
      const tag = level === 3 ? '[renderer:error]' : level === 2 ? '[renderer:warn]' : '[renderer]';
      console.log(`${tag} ${message}  (${sourceId}:${line})`);
    });
  }

  return window;
}

// Two GUI launches against the same userData dir would race the migration
// runner and the WAL. Hold a single-instance lock and focus the existing
// window when a second launch is attempted.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [first] = BrowserWindow.getAllWindows();
    if (first) {
      if (first.isMinimized()) first.restore();
      first.focus();
    }
  });
}

// Catch every WebContents (offscreen export windows, future tooling)
// and apply the same navigation guard the main window gets.
app.on('web-contents-created', (_event, contents) => hardenWebContents(contents));

void app.whenReady().then(() => {
  app.setName(APP_NAME);
  // Force Electron's reported color scheme to dark. On Windows 11 this
  // tells the OS to paint the immersive title bar (the bar with the
  // close / minimize / maximize buttons) in dark mode so it blends
  // with our chrome instead of stamping a stark white strip across
  // the top of the window. The native window controls stay where they
  // are — only their background color changes. macOS picks this up via
  // `prefers-color-scheme`; Linux respects it where the WM allows.
  nativeTheme.themeSource = 'dark';

  // Install the application menu (File / Edit / View / Go / Window /
  // Help). Menu items push typed actions over IPC; the renderer's
  // useAppActions hook dispatches them. Must happen before
  // createMainWindow on macOS so the menu is attached to the first
  // window from launch.
  installApplicationMenu();

  // Show the splash first thing — it covers the visual gap until the
  // main window's renderer is ready-to-show. Min display time is
  // enforced in dismissSplash().
  createSplashWindow();

  // macOS Dock icon — `BrowserWindow({ icon })` only governs window
  // chrome, not the Dock. In dev mode without this, the Dock shows the
  // generic Electron icon. In packaged macOS, the .icns derived by
  // electron-builder takes precedence and this call is harmless.
  if (process.platform === 'darwin' && app.dock) {
    try {
      app.dock.setIcon(resolveAppIconPath());
    } catch {
      // setIcon throws if the file is missing — non-fatal.
    }
  }
  installSecurityHeaders();
  initDatabaseAndIpc();
  const mainWindow = createMainWindow();

  // When the main renderer is ready, dismiss the splash. dismissSplash
  // enforces the minimum splash duration, then reveals the main window
  // and fades the splash out. We pass `mainWindow.show` as the reveal
  // callback so timing is coordinated.
  mainWindow.once('ready-to-show', () => {
    dismissSplash(() => mainWindow.show());
  });

  // Fire-and-forget — auto-update failures must never block app launch.
  void setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const win = createMainWindow();
      win.once('ready-to-show', () => win.show());
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  teardownAutoUpdater();
  unregisterIpcHandlers();
  dbHandle?.close();
  dbHandle = null;
});
