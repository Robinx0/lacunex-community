import { BrowserWindow, app, session } from 'electron';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Report } from '@shared/types';
import { renderReportHtml } from '@shared/export/html';

let pagedPolyfillCache: string | null | undefined;

async function loadPagedPolyfill(): Promise<string> {
  if (typeof pagedPolyfillCache === 'string') return pagedPolyfillCache;
  const polyfillPath = join(
    app.getAppPath(),
    'node_modules',
    'pagedjs',
    'dist',
    'paged.polyfill.js',
  );
  try {
    const source = await readFile(polyfillPath, 'utf8');
    pagedPolyfillCache = source;
    return source;
  } catch {
    throw new Error(
      `Per-page layout engine (paged.js) is not installed.\n\nRun \`npm install\` in the CE project root, then retry the export. Looked for: ${polyfillPath}`,
    );
  }
}

// HTML is staged to a temp file rather than a data: URL — Chromium caps
// data: URLs at ~2 MB on some platforms and base64 screenshots blow past that.
export async function buildReportPdf(
  report: Report,
  options: { includeCover?: boolean; pagedLayout?: boolean } = {},
): Promise<Buffer> {
  const pagedPolyfill = options.pagedLayout ? await loadPagedPolyfill() : null;
  const html = renderReportHtml(report, { ...options, pagedPolyfill });

  const stagingDir = await mkdtemp(join(tmpdir(), 'lacunex-pdf-'));
  const htmlPath = join(stagingDir, 'report.html');
  await writeFile(htmlPath, html, 'utf8');

  // Isolated session to bypass defaultSession CSP for paged.js.
  const pdfSession = session.fromPartition(`pdf-export-${Date.now()}`);

  const win = new BrowserWindow({
    show: false,
    width: 816,
    height: 1056,
    webPreferences: {
      // Onscreen-render hidden — offscreen:true is incompatible with
      // printToPDF's capture timing in current Electron and produces
      // blank pages intermittently. show:false keeps the window
      // invisible while using standard rendering.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      session: pdfSession,
    },
  });

  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) console.warn('[pdf-export]', message);
  });
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('[pdf-export] render process gone:', details.reason);
  });

  try {
    await win.loadFile(htmlPath);
    // Bounded fonts.ready — caps at 5s so a slow/blocked Google
    // Fonts request can't stall the export. After the cap we render
    // with fallback fonts instead of waiting indefinitely.
    await win.webContents.executeJavaScript(
      'Promise.race([document.fonts && document.fonts.ready, new Promise((r) => setTimeout(r, 5000))]).then(() => true).catch(() => true)',
    );

    // Wait for images to decode (data: URLs report complete=true before
    // naturalHeight is set), then annotate page breaks for tall figures —
    // CSS break-inside:avoid is unreliable in Chromium auto-pagination.
    await win.webContents.executeJavaScript(`
      (async () => {
        const imgs = Array.from(document.images);
        await Promise.all(imgs.map((img) => {
          if (img.complete && img.naturalHeight > 0) return Promise.resolve();
          if (typeof img.decode === 'function') {
            return img.decode().catch(() => null);
          }
          return new Promise((resolve) => {
            img.addEventListener('load', () => resolve(null));
            img.addEventListener('error', () => resolve(null));
          });
        }));

        const PAGE_H_MM = 263;
        const MM_PER_PX = 25.4 / 96;
        const body = document.querySelector('.rb-paper--body');
        if (body) {
          for (let pass = 0; pass < 8; pass++) {
            const bodyTop = body.getBoundingClientRect().top;
            let changed = false;
            for (const fig of document.querySelectorAll('figure')) {
              if (fig.dataset.pagedShifted === '1') continue;
              const rect = fig.getBoundingClientRect();
              const yMM = (rect.top - bodyTop) * MM_PER_PX;
              const hMM = rect.height * MM_PER_PX;
              const yInPage = yMM - Math.floor(yMM / PAGE_H_MM) * PAGE_H_MM;
              const remainingMM = PAGE_H_MM - yInPage;
              if (hMM > remainingMM && hMM <= PAGE_H_MM) {
                fig.style.breakBefore = 'page';
                fig.style.pageBreakBefore = 'always';
                fig.dataset.pagedShifted = '1';
                changed = true;
              }
            }
            if (!changed) break;
          }
        }
        return true;
      })();
    `);

    if (options.pagedLayout) {
      await waitForPagedJs(win);
    }

    // Force two paint cycles so Chromium has flushed the DOM to the
    // compositor before printToPDF captures. Without this, hidden
    // windows occasionally produce blank pages because the render
    // scheduler hasn't painted yet.
    await win.webContents.executeJavaScript(
      'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))',
    );

    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'none' },
      preferCSSPageSize: true,
    });
    return pdf;
  } finally {
    if (!win.isDestroyed()) win.destroy();
    await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function waitForPagedJs(win: BrowserWindow): Promise<void> {
  // 12s deadline. Beyond this paged.js is almost certainly stuck;
  // fall through and let printToPDF capture whatever exists rather
  // than keeping the export modal spinning.
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    const done = (await win.webContents.executeJavaScript(
      "document.documentElement.dataset.pagedjsRendered === '1'",
    )) as boolean;
    if (done) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 150));
  }
  // Timeout — fall through and capture whatever Chromium rendered.
}
