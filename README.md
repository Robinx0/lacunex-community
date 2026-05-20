<p align="center">
  <img src=".github/assets/banner.png" alt="Lacunex Community" width="100%">
</p>

<p align="center">
  <img src=".github/assets/logo.svg" alt="Lacunex" width="80" height="80">
</p>

<h1 align="center">Lacunex Community</h1>

<p align="center">
  A local-first desktop app for writing pentest, audit, incident, and
  consulting reports.
</p>

<p align="center">
  <a href="https://github.com/Robinx0/lacunex-community/releases/latest"><img src="https://img.shields.io/github/v/release/Robinx0/lacunex-community?label=download&color=5b4dd1" alt="Latest release"></a>
  <a href="https://github.com/Robinx0/lacunex-community/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-PolyForm%20Shield%201.0-blue.svg" alt="License: PolyForm Shield 1.0.0"></a>
  <img src="https://img.shields.io/badge/platforms-macOS%20%C2%B7%20Windows%20%C2%B7%20Linux-lightgrey" alt="Cross-platform">
</p>

Reports stay on your laptop. No cloud sync, no account, no telemetry.
Source-available under PolyForm Shield 1.0.0.

## Why this exists

Most security and audit reports get written in Word or Google Docs.
Both fight you. Findings end up as styled paragraphs, screenshots
drift out of place, severity colors have to be reapplied every time.

Lacunex treats those reports as their own document type. Findings are
real objects with their own fields, not paragraphs that happen to be
red. Screenshots, PoC steps, and other security-specific elements each
get a dedicated block. The cover matches the format you're writing:
pentest, audit, OSCP, consulting. The PDF comes out print-ready.

## Download

Installers for macOS, Windows, and Linux:
[Releases](https://github.com/Robinx0/lacunex-community/releases).
The 1.0 installers aren't code-signed yet, so the OS shows a one-time
warning on first launch.

## Features

**Block editor.** 21 block types: findings, screenshots, PoC steps,
code, callouts, HTTP request/response, severity badges, CVE refs,
tables, and more.

**Findings.** Each carries ID, severity, CVSS, CWE, status, body, PoC,
and remediation. Searchable across all your reports. Reusable as
templates.

**Eleven report scaffolds.** Pentest, audit, incident, consulting,
postmortem, OSCP exam, generic certification, and a few others. Two
finished samples in [`examples/`](./examples/).

**Five cover designs.** Built for the formats you write: pentest,
audit, consulting, OSCP, generic exam. Palette presets and logo upload.

**Exports.** PDF (print-ready, paginated, with covers), HTML, Markdown,
and Word `.docx`.

**Local AI, optional.** Hooks to [Ollama](https://ollama.com). No cloud
LLM, no API key.

## Install from source

Needs Node 20 or newer.

```bash
git clone https://github.com/Robinx0/lacunex-community.git
cd lacunex-community
npm install
npm run dev        # dev server with hot reload
```

Other scripts: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run package` (builds an installer for the current platform into
`release/`).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Security disclosures: use
GitHub's
[Private Vulnerability Reporting](https://github.com/Robinx0/lacunex-community/security/advisories/new).

## License

PolyForm Shield 1.0.0. Plain English:
[LICENSING.md](./LICENSING.md). Legal: [LICENSE](./LICENSE).
