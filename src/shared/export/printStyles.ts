// Mirror of the paper / cover / finding / TOC selectors from
// report-themes.css. The export pipeline can't reach that file at
// runtime, so changes there must be ported here.
export const PREVIEW_PRINT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

[data-report-theme='light'] {
  --paper-bg: #ffffff;
  --paper-page-bg: #ffffff;
  --paper-text: #0f172a;
  --paper-text-muted: #475569;
  --paper-text-subtle: #94a3b8;
  --paper-border: rgba(15, 23, 42, 0.12);
  --paper-rule: rgba(15, 23, 42, 0.18);
  --paper-tint: rgba(15, 23, 42, 0.04);
}
[data-report-theme='dark'] {
  --paper-bg: #0a0c10;
  --paper-page-bg: #11151b;
  --paper-text: #e6edf3;
  --paper-text-muted: #94a3b8;
  --paper-text-subtle: #5b6573;
  --paper-border: rgba(255, 255, 255, 0.1);
  --paper-rule: rgba(255, 255, 255, 0.18);
  --paper-tint: rgba(255, 255, 255, 0.04);
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--paper-page-bg); }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.65;
  color: var(--paper-text);
  -webkit-font-smoothing: antialiased;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  position: relative;
}

/* Fixed full-bleed layer painted under every page so the @page
   body margin gutter shares the paper color. */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background: var(--paper-page-bg);
  z-index: -1;
}

/* Base paper — no overflow rule here; cover and body each set
   their own (see below). Clipping at this level breaks paged.js
   figure pagination. */
.rb-paper {
  background: var(--paper-page-bg);
  color: var(--paper-text);
}

/* Cover variant fills its parent .rb-paper--cover sheet. */
.rb-cover {
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* Cover sheet — full A4 height so the background reaches the
   page break (letter aspect-ratio leaves a gap on A4). */
.rb-paper--cover {
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  container-type: inline-size;
  container-name: cover;
  page-break-after: always;
  break-after: page;
  width: 100%;
  height: 100vh;
  page: cover;
}

.rb-paper--body {
  /* Must stay visible — clipping here breaks figure pagination. */
  overflow: visible;
  page: body;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.65;
}

.rb-paper-body h1 {
  font-size: 26px;
  font-weight: 700;
  margin: 24px 0 12px;
  border-bottom: 1px solid var(--paper-rule);
  padding-bottom: 8px;
  color: var(--paper-accent);
}
.rb-paper-body h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 18px 0 8px;
  color: var(--paper-text);
}
.rb-paper-body h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 14px 0 6px;
  color: var(--paper-text);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.rb-paper-body p { margin: 0 0 8px; color: var(--paper-text); }
.rb-paper-body ul,
.rb-paper-body ol { padding-left: 22px; margin: 4px 0 10px; }
.rb-paper-body li { margin: 0 0 4px; color: var(--paper-text); }
.rb-paper-body li > p { margin: 0; }
.rb-paper-body ul ul,
.rb-paper-body ol ol,
.rb-paper-body ul ol,
.rb-paper-body ol ul { margin: 4px 0; }
.rb-paper-body blockquote {
  border-left: 3px solid var(--paper-accent);
  padding-left: 14px;
  margin: 10px 0;
  color: var(--paper-text-muted);
  font-style: italic;
}
.rb-paper-body pre {
  background: var(--paper-tint);
  border: 1px solid var(--paper-border);
  padding: 12px 14px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  color: var(--paper-text);
  /* Wrap long lines + break unbreakable tokens (URLs, hashes)
     so they don't clip at the page edge in print. */
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  tab-size: 2;
}
.rb-paper-body pre code {
  white-space: inherit;
  word-break: inherit;
  overflow-wrap: inherit;
}
.rb-paper-body hr { border: 0; border-top: 1px solid var(--paper-rule); margin: 16px 0; }
.rb-paper-body a { color: var(--paper-accent); }

/* Callout */
.rb-paper-callout {
  padding: 10px 14px;
  margin: 10px 0;
  border-radius: 4px;
  background: var(--paper-tint);
  border-left: 2px solid var(--paper-accent);
  page-break-inside: avoid;
}
.rb-paper-callout strong { display: block; margin-bottom: 4px; font-size: 12px; }

/* Finding card */
.rb-paper-finding {
  border: 1px solid var(--paper-border);
  border-left: 3px solid var(--paper-accent);
  border-radius: 4px;
  padding: 14px 16px;
  margin: 14px 0;
  background: var(--paper-tint);
  page-break-inside: avoid;
}
.rb-paper-finding__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
}
.rb-paper-finding__id {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  color: var(--paper-text-muted);
}
.rb-paper-finding__title { font-weight: 600; flex: 1; font-size: 15px; }
.rb-paper-finding__meta {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--paper-rule);
  font-size: 11px;
}
.rb-paper-finding__meta dt {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--paper-text-muted);
  text-transform: uppercase;
  margin: 0;
}
.rb-paper-finding__meta dd { margin: 2px 0 0; color: var(--paper-text); }
.rb-paper-finding__body { margin-top: 8px; font-size: 13px; }

/* TOC — editorial title, indented hierarchy, dotted leaders. */
.rb-paper-toc {
  margin: 0 0 32px;
  padding: 0;
  background: transparent;
  border: none;
  page-break-after: always;
  break-after: page;
}
.rb-paper-toc__title {
  margin: 0 0 18px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--paper-rule);
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--paper-accent);
}
.rb-paper-toc__list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
}
.rb-paper-toc__list li {
  margin: 0;
  padding: 2px 0;
}
.rb-paper-toc__list .toc-l2 { padding-left: 22px; }
.rb-paper-toc__list .toc-l3 { padding-left: 44px; }

.rb-paper-toc__entry {
  display: flex;
  align-items: baseline;
  gap: 8px;
  text-decoration: none;
  color: var(--paper-text);
  width: 100%;
}
.rb-paper-toc__text {
  font-family: 'Inter', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.rb-paper-toc__list .toc-l1 .rb-paper-toc__entry {
  font-weight: 600;
  color: var(--paper-text);
}
.rb-paper-toc__list .toc-l2 .rb-paper-toc__entry,
.rb-paper-toc__list .toc-l3 .rb-paper-toc__entry {
  font-weight: 400;
  color: var(--paper-text-muted);
}
.rb-paper-toc__leader {
  flex: 1 1 auto;
  min-width: 12px;
  height: 1px;
  border-bottom: 1px dotted var(--paper-text-subtle);
  position: relative;
  bottom: 4px;
  margin: 0 2px;
}

/* OSCP cover — crimson default + palette variants. */
.rb-cover--oscp {
  --os-bg: #dc143c;
  --os-bg-deep: #9a0d29;
  --os-fg: #ffffff;
  --os-fg-muted: rgba(255, 255, 255, 0.78);
  --os-fg-subtle: rgba(255, 255, 255, 0.55);
  --os-rule: rgba(255, 255, 255, 0.42);
  --os-rule-soft: rgba(255, 255, 255, 0.18);
  --os-scale: 1;
  background:
    radial-gradient(ellipse at 80% 0%, rgba(255, 255, 255, 0.08), transparent 55%),
    radial-gradient(ellipse at 0% 100%, rgba(0, 0, 0, 0.22), transparent 60%),
    linear-gradient(160deg, var(--os-bg) 0%, var(--os-bg-deep) 100%);
  color: var(--os-fg);
  padding: clamp(18px, 5.2cqw, 40px) clamp(20px, 6cqw, 44px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  gap: clamp(10px, 2.4cqw, 18px);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}
.rb-cover--oscp[data-cover-palette='midnight'] { --os-bg: #1a2b5c; --os-bg-deep: #0a1230; }
.rb-cover--oscp[data-cover-palette='forest'] { --os-bg: #1a4d3a; --os-bg-deep: #0b2a1f; }
.rb-cover--oscp[data-cover-palette='royal'] { --os-bg: #4527a0; --os-bg-deep: #261253; }
.rb-cover--oscp[data-cover-palette='graphite'] { --os-bg: #2d2f33; --os-bg-deep: #14161a; }
.rb-cover--oscp[data-cover-palette='amber'] { --os-bg: #9c4a00; --os-bg-deep: #5a2900; }
.rb-cover-os__noise {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(0deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%);
  pointer-events: none;
  z-index: 0;
}
.rb-cover-os__head {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: clamp(12px, 3.3cqw, 24px);
  padding-bottom: clamp(10px, 2.4cqw, 18px);
  border-bottom: 2px solid var(--os-rule);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: calc(clamp(9px, 1.5cqw, 11px) * var(--os-scale));
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--os-fg);
  position: relative; z-index: 1;
}
.rb-cover-os__brand { font-weight: 600; }
.rb-cover-os__class { color: var(--os-fg-muted); font-weight: 500; }
.rb-cover-os__main {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  text-align: center;
  gap: clamp(8px, 1.8cqw, 14px);
  padding: clamp(12px, 3cqw, 22px) 0;
  min-height: 0;
}
.rb-cover-os__logo {
  display: block;
  width: auto; height: auto;
  max-width: 60%;
  max-height: clamp(80px, 22cqw, 180px);
  margin-bottom: clamp(6px, 1.4cqw, 14px);
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
}
.rb-cover-os__mark {
  margin: 0;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 700;
  font-size: calc(clamp(56px, 18cqw, 132px) * var(--os-scale));
  line-height: 0.85; letter-spacing: -0.04em;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.18);
}
/* Shrink the OSCP mark when a logo is also present. */
.rb-cover-os__main:has(.rb-cover-os__logo) .rb-cover-os__mark {
  font-size: calc(clamp(40px, 12cqw, 88px) * var(--os-scale));
  letter-spacing: -0.03em;
}
.rb-cover-os__eyebrow {
  margin: 0;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: calc(clamp(9px, 1.6cqw, 12px) * var(--os-scale));
  letter-spacing: 0.32em; text-transform: uppercase;
  color: var(--os-fg-muted); font-weight: 500;
}
.rb-cover-os__title {
  margin: 0;
  font-family: 'Inter', sans-serif;
  font-size: calc(clamp(24px, 7.6cqw, 56px) * var(--os-scale));
  font-weight: 700; line-height: 1.02; letter-spacing: -0.02em;
  color: var(--os-fg);
}
.rb-cover-os__rule {
  width: clamp(48px, 12cqw, 88px);
  height: 2px; background: var(--os-fg);
  margin: clamp(4px, 1cqw, 8px) auto;
}
.rb-cover-os__sub {
  margin: 0;
  font-family: 'Inter', sans-serif;
  font-size: calc(clamp(12px, 2cqw, 15px) * var(--os-scale));
  color: var(--os-fg-muted); font-style: italic; font-weight: 400;
}
.rb-cover-os__id {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(8px, 2cqw, 16px) clamp(20px, 5cqw, 40px);
  margin: clamp(10px, 2.4cqw, 18px) 0 0;
  padding: clamp(10px, 2.4cqw, 18px) clamp(14px, 3.6cqw, 26px);
  border: 1px solid var(--os-rule);
  background: rgba(0, 0, 0, 0.18);
  border-radius: 4px; text-align: left;
  width: min(560px, 80%);
}
.rb-cover-os__id div { min-width: 0; }
.rb-cover-os__id dt {
  margin: 0 0 clamp(2px, 0.6cqw, 4px);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: calc(clamp(8px, 1.3cqw, 10px) * var(--os-scale));
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--os-fg-subtle); font-weight: 500;
}
.rb-cover-os__id dd {
  margin: 0;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: calc(clamp(11px, 1.9cqw, 14px) * var(--os-scale));
  color: var(--os-fg); font-weight: 600; word-break: break-word;
}
.rb-cover-os__meta {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(10px, 2.4cqw, 18px) clamp(16px, 4cqw, 28px);
  padding-top: clamp(14px, 3.2cqw, 22px);
  border-top: 1px solid var(--os-rule-soft);
  position: relative; z-index: 1;
}
.rb-cover-os__meta div { min-width: 0; }
.rb-cover-os__meta dt {
  margin: 0 0 clamp(3px, 0.8cqw, 5px);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: calc(clamp(8px, 1.3cqw, 9px) * var(--os-scale));
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--os-fg-subtle); font-weight: 500;
}
.rb-cover-os__meta dd {
  margin: 0;
  font-family: 'Inter', sans-serif;
  font-size: calc(clamp(10px, 1.7cqw, 12px) * var(--os-scale));
  color: var(--os-fg); font-weight: 500; word-break: break-word;
}
.rb-cover-os__foot {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: clamp(12px, 3.3cqw, 24px);
  padding-top: clamp(10px, 2.4cqw, 16px);
  border-top: 2px solid var(--os-rule);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: calc(clamp(8px, 1.4cqw, 10px) * var(--os-scale));
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--os-fg-muted);
  position: relative; z-index: 1;
}

/* Spine — cream main field + colored book-spine on the left. */
.rb-cover--spine {
  --sp-bg: #f4efe2; --sp-bg-soft: #ede7d6;
  --sp-fg: #1a1a1d; --sp-fg-muted: #5e5d5a; --sp-fg-subtle: #97948c;
  --sp-rule: rgba(26, 26, 29, 0.16); --sp-rule-soft: rgba(26, 26, 29, 0.08);
  --sp-spine-bg: #10172a; --sp-spine-fg: #f4efe2; --sp-spine-accent: #c9a86a;
  --sp-scale: 1;
  background: var(--sp-bg); color: var(--sp-fg);
  display: grid;
  grid-template-columns: clamp(60px, 14cqw, 130px) 1fr;
  grid-template-rows: 1fr;
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
  position: relative;
}
.rb-cover--spine[data-cover-palette='crimson']  { --sp-spine-bg: #8a1029; --sp-spine-accent: #f3d9a8; }
.rb-cover--spine[data-cover-palette='midnight'] { --sp-spine-bg: #10172a; --sp-spine-accent: #c9a86a; }
.rb-cover--spine[data-cover-palette='forest']   { --sp-spine-bg: #143025; --sp-spine-accent: #d8c995; }
.rb-cover--spine[data-cover-palette='royal']    { --sp-spine-bg: #2a1860; --sp-spine-accent: #d8c08a; }
.rb-cover--spine[data-cover-palette='graphite'] { --sp-spine-bg: #1c1d20; --sp-spine-accent: #e0c98a; }
.rb-cover--spine[data-cover-palette='amber']    { --sp-spine-bg: #5a2900; --sp-spine-accent: #f1d59c; }
.rb-cover-sp__spine {
  background: var(--sp-spine-bg); color: var(--sp-spine-fg);
  display: grid; grid-template-rows: auto 1fr auto;
  padding: clamp(20px, 5cqw, 36px) 0;
  box-shadow: inset -8px 0 16px rgba(0, 0, 0, 0.25);
}
.rb-cover-sp__spine-mark {
  text-align: center;
  font-family: 'EB Garamond', Georgia, serif;
  font-size: calc(clamp(22px, 5cqw, 40px) * var(--sp-scale));
  color: var(--sp-spine-accent); line-height: 1;
}
.rb-cover-sp__spine-logo {
  display: block; width: 76%; max-width: 100%;
  max-height: clamp(48px, 10cqw, 96px);
  margin: 0 auto; object-fit: contain;
}
.rb-cover-sp__spine-text {
  writing-mode: vertical-rl; transform: rotate(180deg);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: calc(clamp(8px, 1.4cqw, 11px) * var(--sp-scale));
  letter-spacing: 0.38em; text-transform: uppercase;
  color: var(--sp-spine-fg); font-weight: 500;
  justify-self: center; align-self: center;
  margin: clamp(12px, 3cqw, 24px) 0; white-space: nowrap;
}
.rb-cover-sp__spine-year {
  text-align: center;
  font-family: 'EB Garamond', Georgia, serif;
  font-weight: 600;
  font-size: calc(clamp(16px, 3.6cqw, 28px) * var(--sp-scale));
  color: var(--sp-spine-accent); letter-spacing: 0.02em;
}
.rb-cover-sp__main {
  display: grid; grid-template-rows: auto 1fr auto auto;
  gap: clamp(14px, 3cqw, 24px);
  padding: clamp(24px, 6cqw, 52px) clamp(24px, 6cqw, 48px) clamp(20px, 4.6cqw, 36px);
  min-width: 0;
}
.rb-cover-sp__head {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: clamp(12px, 3cqw, 24px);
  padding-bottom: clamp(10px, 2.4cqw, 18px);
  border-bottom: 1px solid var(--sp-rule);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: calc(clamp(8px, 1.4cqw, 10.5px) * var(--sp-scale));
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--sp-fg-muted);
}
.rb-cover-sp__brand { color: var(--sp-fg); font-weight: 600; }
.rb-cover-sp__class { color: var(--sp-spine-bg); font-weight: 600; }
.rb-cover-sp__hero {
  display: flex; flex-direction: column;
  align-items: flex-start; justify-content: center;
  gap: clamp(8px, 2cqw, 16px);
  min-height: 0;
  padding: clamp(8px, 2.4cqw, 20px) 0;
}
.rb-cover-sp__eyebrow {
  margin: 0;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: calc(clamp(9px, 1.6cqw, 12px) * var(--sp-scale));
  letter-spacing: 0.36em; text-transform: uppercase;
  color: var(--sp-fg-muted); font-weight: 500;
}
.rb-cover-sp__title {
  margin: 0;
  font-family: 'EB Garamond', Georgia, serif;
  font-weight: 600;
  font-size: calc(clamp(46px, 13cqw, 120px) * var(--sp-scale));
  line-height: 0.96; letter-spacing: -0.018em;
  color: var(--sp-fg);
  background-image: linear-gradient(var(--sp-spine-bg), var(--sp-spine-bg));
  background-repeat: no-repeat;
  background-size: clamp(64px, 14cqw, 110px) 4px;
  background-position: 0 100%;
  padding-bottom: clamp(8px, 1.6cqw, 14px);
}
.rb-cover-sp__byline {
  margin: 0; font-family: 'Inter', sans-serif;
  font-size: calc(clamp(11px, 2cqw, 14px) * var(--sp-scale));
  color: var(--sp-fg-muted);
}
.rb-cover-sp__candidate {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  color: var(--sp-fg);
}
.rb-cover-sp__meta {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(10px, 2.4cqw, 18px) clamp(18px, 4cqw, 30px);
  padding: clamp(14px, 3.2cqw, 22px) clamp(16px, 3.6cqw, 26px);
  background: var(--sp-bg-soft);
  border: 1px solid var(--sp-rule);
  border-radius: 2px;
}
.rb-cover-sp__meta div { min-width: 0; }
.rb-cover-sp__meta dt {
  margin: 0 0 clamp(2px, 0.6cqw, 4px);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: calc(clamp(8px, 1.3cqw, 10px) * var(--sp-scale));
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--sp-fg-subtle); font-weight: 500;
}
.rb-cover-sp__meta dd {
  margin: 0; font-family: 'Inter', sans-serif;
  font-size: calc(clamp(11px, 1.8cqw, 13.5px) * var(--sp-scale));
  color: var(--sp-fg); font-weight: 500; word-break: break-word;
}
.rb-cover-sp__foot {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: clamp(12px, 3cqw, 24px);
  padding-top: clamp(10px, 2.4cqw, 16px);
  border-top: 1px solid var(--sp-rule);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: calc(clamp(8px, 1.3cqw, 10px) * var(--sp-scale));
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--sp-fg-muted);
}

/* BlackOps / Tradecraft cover */
.rb-cover--blackops {
  --bo-bg: #0a0c10; --bo-fg: #c8ced6; --bo-fg-muted: #6b7585;
  --bo-fg-subtle: #4a5260; --bo-accent: #62d4f5;
  --bo-grid: rgba(98, 212, 245, 0.06);
  --bo-rule: rgba(98, 212, 245, 0.18);
  background: var(--bo-bg);
  color: var(--bo-fg);
  position: relative;
  padding: clamp(20px, 7.8cqw, 56px) clamp(20px, 7.8cqw, 56px) clamp(16px, 5.6cqw, 40px);
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
}
[data-report-theme='light'] .rb-cover--blackops {
  --bo-bg: #f4f3ee; --bo-fg: #0a0c10; --bo-fg-muted: #5b6573;
  --bo-fg-subtle: #8a8e94; --bo-accent: #0a3a5c;
  --bo-grid: rgba(10, 58, 92, 0.07);
  --bo-rule: rgba(10, 58, 92, 0.22);
}
.rb-cover-bo__grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(0deg, var(--bo-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--bo-grid) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(ellipse at 50% 65%, black 30%, transparent 80%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 65%, black 30%, transparent 80%);
  pointer-events: none;
  z-index: 0;
}
.rb-cover-bo__head {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: clamp(12px, 3.3cqw, 24px);
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(8px, 1.4cqw, 10px);
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--bo-accent);
  position: relative; z-index: 1;
}
.rb-cover-bo__doc { color: var(--bo-fg-muted); }
.rb-cover-bo__main { align-self: end; position: relative; z-index: 1; padding-top: clamp(24px, 8.9cqw, 64px); }
.rb-cover-bo__eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(9px, 1.5cqw, 11px);
  letter-spacing: 0.26em; text-transform: uppercase;
  color: var(--bo-accent);
  margin: 0 0 clamp(10px, 2.5cqw, 18px);
  font-weight: 500;
}
.rb-cover-bo__title {
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(22px, 7.2cqw, 52px);
  font-weight: 700; line-height: 1.02; letter-spacing: -0.015em;
  margin: 0; color: var(--bo-fg);
}
.rb-cover-bo__sub {
  margin: clamp(8px, 1.9cqw, 14px) 0 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(10px, 1.8cqw, 13px);
  color: var(--bo-fg-muted); letter-spacing: 0.02em;
}
.rb-cover-bo__meta {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: clamp(10px, 2.5cqw, 18px) clamp(16px, 4.4cqw, 32px);
  margin: clamp(18px, 5cqw, 36px) 0 clamp(12px, 3.3cqw, 24px);
  position: relative; z-index: 1;
}
.rb-cover-bo__meta div { min-width: 0; }
.rb-cover-bo__meta dt {
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(8px, 1.3cqw, 9px);
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--bo-fg-subtle);
  margin-bottom: clamp(4px, 0.8cqw, 6px);
  font-weight: 500;
}
.rb-cover-bo__meta dd { margin: 0; font-size: clamp(10px, 1.7cqw, 12px); color: var(--bo-fg); font-weight: 500; }
.rb-cover-bo__foot {
  border-top: 1px solid var(--bo-rule);
  padding-top: clamp(8px, 1.9cqw, 14px);
  display: flex; justify-content: space-between; align-items: baseline;
  gap: clamp(12px, 3.3cqw, 24px);
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(8px, 1.4cqw, 10px);
  letter-spacing: 0.18em;
  color: var(--bo-fg-subtle);
  text-transform: uppercase;
  position: relative; z-index: 1;
}

/* Corporate / Boardroom cover */
[data-report-theme='light'] .rb-cover--corporate, .rb-cover--corporate {
  --co-bg: #f5f3ed; --co-fg: #0d1726; --co-fg-muted: #5d6a7f;
  --co-fg-subtle: #8a93a3; --co-accent: #1d3a5f; --co-rule: #c8c5bd; --co-strip-fg: #ffffff;
}
[data-report-theme='dark'] .rb-cover--corporate {
  --co-bg: #14171c; --co-fg: #ede9df; --co-fg-muted: #a39c8c;
  --co-fg-subtle: #6e6859; --co-accent: #c9a86a; --co-rule: #2c2f36; --co-strip-fg: #14171c;
}
.rb-cover--corporate {
  background: var(--co-bg); color: var(--co-fg); padding: 0;
  font-family: 'Inter', sans-serif;
  display: grid; grid-template-rows: auto auto 1fr auto;
  -webkit-font-smoothing: antialiased;
}
.rb-cover-co__strip { height: clamp(8px, 2cqw, 14px); background: var(--co-accent); }
.rb-cover-co__head {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: clamp(12px, 3.3cqw, 24px);
  padding: clamp(14px, 3.9cqw, 28px) clamp(20px, 7.8cqw, 56px) 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(8px, 1.4cqw, 10px); letter-spacing: 0.22em; text-transform: uppercase;
}
.rb-cover-co__eyebrow { color: var(--co-fg-muted); font-weight: 500; }
.rb-cover-co__class { color: var(--co-accent); font-weight: 600; }
.rb-cover-co__main { padding: clamp(20px, 7.8cqw, 56px); align-self: end; display: flex; flex-direction: column; }
.rb-cover-co__title {
  font-family: 'Inter', sans-serif;
  font-size: clamp(22px, 7cqw, 50px); font-weight: 700;
  margin: 0; line-height: 1.04; letter-spacing: -0.022em; color: var(--co-fg);
}
.rb-cover-co__rule {
  border: 0; border-top: 3px solid var(--co-accent);
  width: clamp(40px, 10cqw, 72px);
  margin: clamp(12px, 3.1cqw, 22px) 0 clamp(10px, 2.5cqw, 18px);
}
.rb-cover-co__sub { margin: 0 0 8px; color: var(--co-fg-muted); font-size: clamp(13px, 2.4cqw, 17px); font-style: italic; line-height: 1.4; max-width: 80%; }
.rb-cover-co__sub-meta { margin: 0; color: var(--co-fg-subtle); font-family: 'JetBrains Mono', monospace; font-size: clamp(9px, 1.5cqw, 11px); letter-spacing: 0.14em; text-transform: uppercase; }
.rb-cover-co__table {
  margin: 0 clamp(20px, 7.8cqw, 56px) clamp(20px, 7.8cqw, 56px);
  border-collapse: collapse;
  width: calc(100% - 2 * clamp(20px, 7.8cqw, 56px));
  font-size: clamp(9px, 1.5cqw, 11px);
  font-family: 'Inter', sans-serif;
}
.rb-cover-co__table th, .rb-cover-co__table td {
  border-top: 1px solid var(--co-rule);
  padding: clamp(6px, 1.4cqw, 10px) clamp(8px, 2cqw, 14px);
  text-align: left; color: var(--co-fg); vertical-align: baseline;
}
.rb-cover-co__table tr:last-child td, .rb-cover-co__table tr:last-child th { border-bottom: 1px solid var(--co-rule); }
.rb-cover-co__table th {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600; color: var(--co-fg-muted);
  letter-spacing: 0.16em; text-transform: uppercase;
  font-size: clamp(8px, 1.3cqw, 9px); width: 18%; background: transparent;
}
.rb-cover-co__table td { font-weight: 500; }

/* Minimal / Vellum cover */
[data-report-theme='light'] .rb-cover--minimal, .rb-cover--minimal {
  --mi-bg: #fafaf7; --mi-fg: #0a0a0c; --mi-fg-muted: #6e6e6c;
  --mi-rule: #d6d4cc; --mi-accent: #0a0a0c;
}
[data-report-theme='dark'] .rb-cover--minimal {
  --mi-bg: #0e0e10; --mi-fg: #ededec; --mi-fg-muted: #93908a; --mi-rule: #2a2a2c; --mi-accent: #ededec;
}
.rb-cover--minimal {
  background: var(--mi-bg); color: var(--mi-fg);
  padding: clamp(24px, 8.9cqw, 64px) clamp(24px, 8.9cqw, 64px) clamp(20px, 7.8cqw, 56px);
  display: grid; grid-template-rows: auto 1fr auto;
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
}
.rb-cover-mi__head { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: clamp(12px, 3.3cqw, 24px); padding-bottom: clamp(10px, 2.8cqw, 20px); border-bottom: 1px solid var(--mi-rule); font-family: 'JetBrains Mono', monospace; font-size: clamp(8px, 1.4cqw, 10px); letter-spacing: 0.16em; text-transform: uppercase; color: var(--mi-fg-muted); }
.rb-cover-mi__head > :nth-child(2) { text-align: center; }
.rb-cover-mi__head > :nth-child(3) { text-align: right; }
.rb-cover-mi__main { align-self: center; padding-top: clamp(20px, 6.7cqw, 48px); padding-bottom: clamp(20px, 6.7cqw, 48px); }
.rb-cover-mi__eyebrow { margin: 0 0 clamp(14px, 3.9cqw, 28px); font-family: 'JetBrains Mono', monospace; font-size: clamp(9px, 1.5cqw, 11px); letter-spacing: 0.26em; text-transform: uppercase; color: var(--mi-fg-muted); font-weight: 500; }
.rb-cover-mi__title { font-family: 'EB Garamond', Georgia, serif; font-size: clamp(24px, 8.4cqw, 60px); font-weight: 500; margin: 0; line-height: 1.04; letter-spacing: -0.01em; color: var(--mi-fg); }
.rb-cover-mi__rule { border: 0; border-top: 1px solid var(--mi-accent); width: clamp(32px, 7.8cqw, 56px); margin: clamp(12px, 3.1cqw, 22px) 0 clamp(10px, 2.5cqw, 18px); }
.rb-cover-mi__sub { margin: 0; font-family: 'EB Garamond', serif; font-size: clamp(12px, 2.2cqw, 16px); color: var(--mi-fg-muted); font-style: italic; line-height: 1.4; }
.rb-cover-mi__meta { margin: clamp(18px, 5cqw, 36px) 0 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(8px, 1.9cqw, 14px); font-family: 'JetBrains Mono', monospace; font-size: clamp(9px, 1.5cqw, 11px); color: var(--mi-fg); }
.rb-cover-mi__foot-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: clamp(8px, 2.2cqw, 16px); font-family: 'JetBrains Mono', monospace; font-size: clamp(8px, 1.4cqw, 10px); letter-spacing: 0.16em; text-transform: uppercase; color: var(--mi-fg-muted); }
.rb-cover-mi__foot-row > :nth-child(2) { text-align: center; }
.rb-cover-mi__foot-row > :nth-child(3) { text-align: right; }

/* A4 with named pages routed by .rb-paper--cover / --body. */
@page { size: A4; margin: 0; }
@page cover { size: A4; margin: 0; }
@page body  { size: A4; margin: 18mm 16mm 16mm; }

/* Pagination rules at top level (not inside @media print) so
   paged.js sees them during its layout pass. */
h1, h2, h3 { break-after: avoid; page-break-after: avoid; }
.rb-paper-finding, .rb-paper-callout { break-inside: avoid; page-break-inside: avoid; }
figure {
  display: block !important;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
  max-width: 100% !important;
}
figure img {
  display: block !important;
  max-width: 100% !important;
  max-height: 240mm !important;
  width: auto !important;
  height: auto !important;
  object-fit: contain !important;
}
`;
