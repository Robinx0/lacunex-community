# Changelog

All notable changes to Lacunex Community are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-05-16

First public release.

### Editor

- Block editor with 21 block types: paragraphs, headings, lists, code blocks (with syntax highlighting), callouts, findings, screenshots, PoC steps, HTTP request/response, severity badges, asset chips, CVE references, tables, and more.
- Slash command palette (`/`) with keyboard navigation and automatic positioning above/below the cursor.
- Paste and drag-drop support for images from the clipboard or OS file manager.
- Editable figure numbers on screenshot blocks.
- Code blocks wrap long lines instead of clipping.

### Templates

Report wizard options, available from **+ New report**:

- Engineering Postmortem
- Security Incident
- Audit Gap Assessment (SOC 2 / ISO 27001 / HIPAA / PCI / NIST)
- Consulting Assessment
- Project Status Report
- Research Report
- Executive Brief
- Pentest Engagement
- Exam Report - OSCP
- Exam Report - Generic (for CRTP, CRTO, OSEP, OSWP, PNPT, eJPT, eCPPT, etc.)
- Blank report

### Covers and presentation

- Five built-in cover designs: Tradecraft, Boardroom, Vellum (each with light/dark variants), OSCP Crimson, and Spine Ink.
- Palette presets per cover.
- Optional logo upload (PNG, JPG, GIF, WebP up to 256 KB) with adjustable size.
- Cover-text scale slider for compact or generous typography.
- Auto-generated Table of Contents from H1/H2/H3 headings, with dotted leader lines and indented hierarchy.
- Live cover preview updates as you edit metadata.

### Exports

- PDF, HTML, Markdown, and Word (`.docx`).
- PDF pagination uses [paged.js](https://pagedjs.org) for predictable per-page layout. Figures never split across pages, long code lines wrap, and images decode before pagination so figure heights measure correctly.
- Per-page footer: copyright and recipient name bottom-left, page number bottom-right.
- Embedded Inter, JetBrains Mono, and EB Garamond fonts so PDFs render consistently across systems.

### AI assist (optional)

- Suggest remediation, improve clarity, summarize. Runs against a local Ollama instance.
- No cloud calls. If Ollama is not installed, the rest of the app works unchanged.

### Security

- Strict Content Security Policy on the renderer.
- Sandboxed renderer (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`) with a preload-based `contextBridge` surface.
- All IPC inputs and outputs validated through Zod schemas.
- Path containment enforced on every attachment read/write/delete.
- Logo data URLs validated at the storage boundary; only PNG/JPG/GIF/WebP accepted.
- All renderer permissions denied by default.

### Build and distribution

- GitHub Actions workflow builds installers for macOS (DMG, x64 + arm64), Windows (NSIS, x64), and Linux (AppImage, x64) on every `v*.*.*` tag.
- Auto-update via `electron-updater` pointed at GitHub Releases (6-hour check interval).

[1.0.0]: https://github.com/robinx0/lacunex-community/releases/tag/v1.0.0
