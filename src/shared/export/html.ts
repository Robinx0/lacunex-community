import type { Block, CoverOptions, Report } from '@shared/types';
import { rendersFor } from '@shared/blocks';
import { escapeHtml as escape } from '@shared/util/text';
import { buildToc, type TocEntry } from '@shared/util/toc';
import { PREVIEW_PRINT_CSS } from './printStyles';

// Mirror of LEGACY_ID_ALIASES in coverRegistry.ts.
const COVER_ALIASES: Record<string, string> = {
  blackops: 'blackops-dark',
  corporate: 'corporate-light',
  minimal: 'minimal-light',
  aurora: 'blackops-dark',
  aerospace: 'blackops-dark',
  carbon: 'minimal-dark',
  crimson: 'corporate-light',
  manuscript: 'minimal-light',
  custom: 'minimal-light',
};

export interface RenderReportHtmlOptions {
  includeCover?: boolean;
  pagedLayout?: boolean;
  attachments?: Record<string, string>;
  pagedPolyfill?: string | null;
}

export function renderReportHtml(
  report: Report,
  options: RenderReportHtmlOptions = {},
): string {
  const m = report.meta;
  const accent = report.reportAccent ?? (report.reportTheme === 'dark' ? '#62d4f5' : '#1e40af');
  const includeCover = options.includeCover ?? true;
  const tocHtml = report.tocEnabled ? renderTocHtml(buildToc(report.blocks)) : '';
  const blockSrc = injectAttachmentDataUrls(report.blocks, options.attachments);
  const blocks = blockSrc.map((b) => rendersFor(b.type).toHtml(b)).join('\n');

  const year =
    m.endDate?.trim().slice(0, 4) ||
    m.startDate?.trim().slice(0, 4) ||
    String(new Date().getFullYear());
  const recipient = m.client?.trim() || m.distribution?.trim() || '';
  const footerLeftRaw = recipient
    ? `© ${year} — ${recipient}`
    : `© ${year}`;
  const footerLeft = cssEscapeContent(footerLeftRaw);

  // PagedConfig must exist before the polyfill runs. `before` waits
  // for images to decode then nudges any figure that won't fit on
  // its current page to the next one — break-inside: avoid alone is
  // unreliable for tall images in Chromium.
  const pagedConfigScript = options.pagedLayout
    ? `<script>
  window.PagedConfig = {
    before: async () => {
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map((img) => {
          if (img.complete && img.naturalHeight > 0) return Promise.resolve();
          if (typeof img.decode === 'function') {
            return img.decode().catch(() => null);
          }
          return new Promise((resolve) => {
            img.addEventListener('load', () => resolve(null));
            img.addEventListener('error', () => resolve(null));
          });
        }),
      );

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
    },
    after: () => { document.documentElement.dataset.pagedjsRendered = '1'; },
  };
</script>`
    : '';
  const pagedPolyfillScript =
    options.pagedLayout && options.pagedPolyfill
      ? `<script>${options.pagedPolyfill}</script>`
      : '';
  const pagedScripts = pagedConfigScript + pagedPolyfillScript;

  const pagedCss = options.pagedLayout ? PAGED_LAYOUT_CSS : '';

  // Per-page footer: copyright + recipient bottom-left, page number
  // bottom-right. `@page :first` skips the cover so it stays full-bleed.
  const footerColor = report.reportTheme === 'dark' ? '#94a3b8' : '#5e5d5a';
  const footerCss = options.pagedLayout
    ? `
@page {
  margin-bottom: 22mm;
  @bottom-left {
    content: "${footerLeft}";
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 9px;
    color: ${footerColor};
    vertical-align: top;
    padding-top: 6mm;
    text-align: left;
  }
  @bottom-right {
    content: counter(page);
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 9px;
    color: ${footerColor};
    vertical-align: top;
    padding-top: 6mm;
    text-align: right;
  }
}
@page :first {
  margin: 0;
  @bottom-left { content: none; }
  @bottom-right { content: none; }
}
`
    : '';

  // Tight CSP for the export document. Only data URLs, Google
  // Fonts, and our own inlined paged.js scripts are allowed.
  const exportCsp =
    "default-src 'none'; " +
    "img-src data: blob:; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; " +
    "script-src 'unsafe-inline'; " +
    // Google Fonts CSS is fetched via @import in PREVIEW_PRINT_CSS;
    // Chromium routes that through connect-src in packaged builds.
    "connect-src https://fonts.googleapis.com https://fonts.gstatic.com; " +
    "object-src 'none'; " +
    "frame-src 'none'; " +
    "base-uri 'none'; " +
    "form-action 'none'";

  return `<!doctype html>
<html lang="en" data-report-theme="${escape(report.reportTheme)}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${exportCsp}">
<title>${escape(m.project)}</title>
<style>
${PREVIEW_PRINT_CSS}
${pagedCss}
${footerCss}
:root { --paper-accent: ${escape(accent)}; }
</style>
${pagedScripts}
</head>
<!-- Snapshot: ${escape(report.id)} @ ${escape(String(report.updatedAt))} -->
<body>
${includeCover ? renderCoverHtml(report) : ''}
<div class="rb-paper rb-paper--body rb-paper-body">
  <header style="margin-bottom:24px;padding-bottom:12px;border-bottom:1px solid var(--paper-rule);">
    <p style="margin:0;font-family:'JetBrains Mono', ui-monospace, monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--paper-text-muted);">${escape(m.client)} · ${escape(m.docId)}</p>
    <p style="margin:4px 0 0;font-size:18px;font-weight:600;">${escape(m.project)}</p>
  </header>
  ${tocHtml}
  ${blocks}
  <footer style="margin-top:32px;padding-top:12px;border-top:1px solid var(--paper-rule);font-family:'JetBrains Mono', ui-monospace, monospace;font-size:10px;color:var(--paper-text-muted);display:flex;justify-content:space-between;">
    <span>${escape(m.classification)}</span>
    <span>v${escape(m.reportVersion)}</span>
  </footer>
</div>
</body>
</html>`;
}

// Escape a string for a CSS `content: "..."` value. Strips angle
// brackets too so user metadata can't break out of the <style> block.
function cssEscapeContent(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, ' ')
    .replace(/[<>]/g, '');
}

function injectAttachmentDataUrls(
  blocks: Block[],
  attachments: Record<string, string> | undefined,
): Block[] {
  if (!attachments) return blocks;
  return blocks.map((b) => {
    if (b.type !== 'screenshot') return b;
    const id = b.attrs?.['attachmentId'];
    if (typeof id !== 'string') return b;
    const dataUrl = attachments[id];
    if (!dataUrl) return b;
    return { ...b, attrs: { ...(b.attrs ?? {}), _dataUrl: dataUrl } };
  });
}

// Applied only when paged.js is active — mirrors paper background
// onto its page wrappers and hides our fallback bg layer.
const PAGED_LAYOUT_CSS = `
.pagedjs_pages { background: var(--paper-page-bg); }
.pagedjs_page { background: var(--paper-page-bg); }
.pagedjs_page_content { background: var(--paper-page-bg); }
body::before { display: none; }
`;

function renderTocHtml(entries: TocEntry[]): string {
  if (entries.length === 0) return '';
  const items = entries
    .map((e) => {
      return `<li class="toc-l${e.level}"><a href="#block-${escape(e.blockId)}" class="rb-paper-toc__entry"><span class="rb-paper-toc__text">${escape(e.text)}</span><span class="rb-paper-toc__leader" aria-hidden></span></a></li>`;
    })
    .join('');
  return `<nav class="rb-paper-toc" aria-label="Table of contents"><h2 class="rb-paper-toc__title">Table of Contents</h2><ol class="rb-paper-toc__list">${items}</ol></nav>`;
}

function renderCoverHtml(report: Report): string {
  const id = COVER_ALIASES[report.coverId] ?? report.coverId;
  const sheet = (inner: string): string =>
    `<div class="rb-paper rb-paper--cover" data-report-theme="${escape(report.reportTheme)}">${inner}</div>`;

  if (id === 'oscp-crimson') return sheet(renderOscpCover(report));
  if (id === 'spine-ink' || id.startsWith('spine')) return sheet(renderSpineCover(report));
  if (id.startsWith('corporate')) return sheet(renderCorporateCover(report));
  if (id.startsWith('minimal')) return sheet(renderMinimalCover(report));
  return sheet(renderBlackOpsCover(report));
}

// OSCP — mirrors CoverOscp.tsx.
function renderOscpCover(report: Report): string {
  const m = report.meta;
  const opts: CoverOptions = report.coverOptions ?? {
    logoDataUrl: null,
    logoSize: 0.3,
    textScale: 1,
    palette: null,
  };
  const osid = m.docId?.trim() || 'OS-XXXXX';
  const student = m.authors?.trim() || 'student@youremailaddress.com';
  const examDate =
    [m.startDate, m.endDate].filter((s) => s?.trim()).join(' → ') ||
    m.startDate?.trim() ||
    new Date().toISOString().slice(0, 10);
  const classification = m.classification?.trim() || 'CONFIDENTIAL';
  const version = m.reportVersion?.trim() ? `v${m.reportVersion.trim()}` : 'v1.0';
  const subtitle = m.project?.trim() || 'OSCP Exam Report';
  const palette = opts.palette ?? 'crimson';
  const textScale = opts.textScale ?? 1;
  const logoWidthCqw = Math.round((opts.logoSize ?? 0.18) * 100);

  const logoHtml = opts.logoDataUrl
    ? `<img class="rb-cover-os__logo" src="${escape(opts.logoDataUrl)}" alt="" aria-hidden style="width:${logoWidthCqw}cqw;">`
    : '';

  return `<div class="rb-cover rb-cover--oscp" data-cover-palette="${escape(palette)}" style="--os-scale:${textScale};">
    <div class="rb-cover-os__noise" aria-hidden></div>
    <header class="rb-cover-os__head">
      <span class="rb-cover-os__brand">Offensive Security</span>
      <span class="rb-cover-os__class">${escape(classification)}</span>
    </header>
    <main class="rb-cover-os__main">
      ${logoHtml}
      <p class="rb-cover-os__mark" aria-hidden>OSCP</p>
      <p class="rb-cover-os__eyebrow">Certified Professional</p>
      <h1 class="rb-cover-os__title">Exam Report</h1>
      <div class="rb-cover-os__rule" aria-hidden></div>
      <p class="rb-cover-os__sub">${escape(subtitle)}</p>
      <dl class="rb-cover-os__id">
        <div><dt>OSID</dt><dd>${escape(osid)}</dd></div>
        <div><dt>Student</dt><dd>${escape(student)}</dd></div>
      </dl>
    </main>
    <dl class="rb-cover-os__meta">
      <div><dt>Exam date</dt><dd>${escape(examDate)}</dd></div>
      <div><dt>Methodology</dt><dd>${escape(m.methodology || 'Offensive Security')}</dd></div>
      <div><dt>Version</dt><dd>${escape(version)}</dd></div>
      <div><dt>Distribution</dt><dd>${escape(m.distribution || 'Offensive Security · Student')}</dd></div>
    </dl>
    <footer class="rb-cover-os__foot">
      <span>Penetration Testing with Kali Linux</span>
      <span>${escape(classification)}</span>
    </footer>
  </div>`;
}

// Spine — mirrors CoverSpine.tsx.
function renderSpineCover(report: Report): string {
  const m = report.meta;
  const opts: CoverOptions = report.coverOptions ?? {
    logoDataUrl: null,
    logoSize: 0.3,
    textScale: 1,
    palette: null,
  };
  const examTitle =
    m.engagementType?.trim().replace(/\s+exam$/i, '').trim() ||
    m.engagementType?.trim() ||
    m.project?.trim() ||
    'Examination';
  const certBody = m.client?.trim() || 'Examining Body';
  const candidate = m.authors?.trim() || 'Candidate name';
  const certId = m.docId?.trim() || '—';
  const version = m.reportVersion?.trim() ? `v${m.reportVersion.trim()}` : 'v1.0';
  const methodology = m.methodology?.trim() || '—';
  const distribution = m.distribution?.trim() || certBody;
  const classification = m.classification?.trim() || 'CONFIDENTIAL';
  const examDate =
    [m.startDate, m.endDate].filter((s) => s?.trim()).join(' → ') ||
    m.startDate?.trim() ||
    m.endDate?.trim() ||
    new Date().toISOString().slice(0, 10);
  const year =
    m.endDate?.trim().slice(0, 4) ||
    m.startDate?.trim().slice(0, 4) ||
    new Date().getFullYear().toString();
  const palette = opts.palette ?? 'crimson';
  const textScale = opts.textScale ?? 1;
  const spineTop = opts.logoDataUrl
    ? `<img class="rb-cover-sp__spine-logo" src="${escape(opts.logoDataUrl)}" alt="" aria-hidden>`
    : `<span class="rb-cover-sp__spine-mark">§</span>`;

  return `<div class="rb-cover rb-cover--spine" data-cover-palette="${escape(palette)}" style="--sp-scale:${textScale};">
    <aside class="rb-cover-sp__spine" aria-hidden>
      ${spineTop}
      <span class="rb-cover-sp__spine-text">${escape(`Examination Report  ·  ${certBody}`)}</span>
      <span class="rb-cover-sp__spine-year">${escape(year)}</span>
    </aside>
    <section class="rb-cover-sp__main">
      <header class="rb-cover-sp__head">
        <span class="rb-cover-sp__brand">${escape(certBody)}</span>
        <span class="rb-cover-sp__class">${escape(classification)}</span>
      </header>
      <div class="rb-cover-sp__hero">
        <p class="rb-cover-sp__eyebrow">Examination Report</p>
        <h1 class="rb-cover-sp__title">${escape(examTitle)}</h1>
        <p class="rb-cover-sp__byline">presented by <span class="rb-cover-sp__candidate">${escape(candidate)}</span></p>
      </div>
      <dl class="rb-cover-sp__meta">
        <div><dt>Candidate ID</dt><dd>${escape(certId)}</dd></div>
        <div><dt>Version</dt><dd>${escape(version)}</dd></div>
        <div><dt>Examination period</dt><dd>${escape(examDate)}</dd></div>
        <div><dt>Methodology</dt><dd>${escape(methodology)}</dd></div>
      </dl>
      <footer class="rb-cover-sp__foot">
        <span>${escape(distribution)}</span>
        <span>№ ${escape(certId)}</span>
      </footer>
    </section>
  </div>`;
}

// BlackOps / Tradecraft — mirrors CoverBlackOps.tsx.
function renderBlackOpsCover(report: Report): string {
  const m = report.meta;
  const hero = m.client?.trim() || m.project || 'Untitled engagement';
  const sub = m.client?.trim() ? m.project : '';
  const classification = m.classification?.trim() || 'CONFIDENTIAL';
  const docTag = [m.docId, m.reportVersion ? `v${m.reportVersion}` : ''].filter(Boolean).join(' · ');
  const window_ = [m.startDate, m.endDate].filter(Boolean).join(' → ') || '—';

  return `<div class="rb-cover rb-cover--blackops">
    <div class="rb-cover-bo__grid" aria-hidden></div>
    <header class="rb-cover-bo__head">
      <span class="rb-cover-bo__class">${escape(classification)}</span>
      <span class="rb-cover-bo__doc">${escape(docTag || 'PT-DRAFT')}</span>
    </header>
    <main class="rb-cover-bo__main">
      <p class="rb-cover-bo__eyebrow">Penetration Test Report</p>
      <h1 class="rb-cover-bo__title">${escape(hero)}</h1>
      ${sub ? `<p class="rb-cover-bo__sub">re: ${escape(sub)}</p>` : ''}
    </main>
    <dl class="rb-cover-bo__meta">
      <div><dt>Engagement</dt><dd>${escape(m.engagementType || '—')}</dd></div>
      <div><dt>Window</dt><dd>${escape(window_)}</dd></div>
      <div><dt>Methodology</dt><dd>${escape(m.methodology || '—')}</dd></div>
      <div><dt>Lead</dt><dd>${escape(m.authors || '—')}</dd></div>
    </dl>
    <footer class="rb-cover-bo__foot">
      <span>${escape(m.distribution || '—')}</span>
      <span>${escape(classification)}</span>
    </footer>
  </div>`;
}

// Corporate / Boardroom — mirrors CoverCorporate.tsx.
function renderCorporateCover(report: Report): string {
  const m = report.meta;
  const hero = m.client?.trim() || m.project || 'Untitled engagement';
  const sub = m.client?.trim() ? m.project : '';
  const classification = m.classification?.trim() || 'CONFIDENTIAL';
  const engagementLine = [m.engagementType, m.methodology].filter((s) => s?.trim()).join(' · ');
  const period = [m.startDate, m.endDate].filter(Boolean).join(' — ') || '—';

  return `<div class="rb-cover rb-cover--corporate">
    <div class="rb-cover-co__strip" aria-hidden></div>
    <header class="rb-cover-co__head">
      <span class="rb-cover-co__eyebrow">Penetration Test Report</span>
      <span class="rb-cover-co__class">${escape(classification)}</span>
    </header>
    <main class="rb-cover-co__main">
      <h1 class="rb-cover-co__title">${escape(hero)}</h1>
      <hr class="rb-cover-co__rule">
      ${sub ? `<p class="rb-cover-co__sub">${escape(sub)}</p>` : ''}
      ${engagementLine ? `<p class="rb-cover-co__sub-meta">${escape(engagementLine)}</p>` : ''}
    </main>
    <table class="rb-cover-co__table" role="presentation"><tbody>
      <tr>
        <th scope="row">Document ID</th><td>${escape(m.docId || '—')}</td>
        <th scope="row">Version</th><td>v${escape(m.reportVersion || '0.1')}</td>
      </tr>
      <tr>
        <th scope="row">Period</th><td>${escape(period)}</td>
        <th scope="row">Authors</th><td>${escape(m.authors || '—')}</td>
      </tr>
      <tr>
        <th scope="row">Reviewers</th><td>${escape(m.reviewers || '—')}</td>
        <th scope="row">Distribution</th><td>${escape(m.distribution || '—')}</td>
      </tr>
    </tbody></table>
  </div>`;
}

// Minimal / Vellum — mirrors CoverMinimal.tsx.
function renderMinimalCover(report: Report): string {
  const m = report.meta;
  const hero = m.client?.trim() || m.project || 'Untitled engagement';
  const sub = m.client?.trim() ? m.project : '';
  const classification = m.classification?.trim() || 'CONFIDENTIAL';
  const docTag = m.docId || '—';
  const versionTag = m.reportVersion ? `v${m.reportVersion}` : 'v0.1';
  const period = [m.startDate, m.endDate].filter(Boolean).join(' — ') || '—';

  return `<div class="rb-cover rb-cover--minimal">
    <header class="rb-cover-mi__head">
      <span>${escape(classification)}</span>
      <span>${escape(docTag)}</span>
      <span>${escape(versionTag)}</span>
    </header>
    <main class="rb-cover-mi__main">
      <p class="rb-cover-mi__eyebrow">Penetration Test Report</p>
      <h1 class="rb-cover-mi__title">${escape(hero)}</h1>
      <hr class="rb-cover-mi__rule">
      ${sub ? `<p class="rb-cover-mi__sub">${escape(sub)}</p>` : ''}
      <dl class="rb-cover-mi__meta">
        <div><dt>Period</dt><dd>${escape(period)}</dd></div>
        <div><dt>Authors</dt><dd>${escape(m.authors || '—')}</dd></div>
        <div><dt>Methodology</dt><dd>${escape(m.methodology || '—')}</dd></div>
        <div><dt>Engagement</dt><dd>${escape(m.engagementType || '—')}</dd></div>
      </dl>
    </main>
    <footer class="rb-cover-mi__foot-row">
      <span>${escape(m.distribution || '—')}</span>
      <span>${escape(classification)}</span>
      <span>${escape(versionTag)}</span>
    </footer>
  </div>`;
}
