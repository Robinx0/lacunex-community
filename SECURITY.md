# Reporting a vulnerability

Please do not open a public issue for security vulnerabilities. Use
GitHub's
[Private Vulnerability Reporting](https://github.com/robinx0/lacunex-community/security/advisories/new)
on this repository to send a private report.

I aim to acknowledge new reports within 48 hours. Once a fix has
shipped you'll be credited in the release notes (unless you'd prefer
to stay anonymous).

## Scope

Reports about the following are in-scope:

- Renderer/main IPC boundary issues (path traversal, schema bypass,
  contextBridge surface escapes).
- Attachment storage path containment.
- Logo / image input validation (file-type checks, MIME parsing).
- Update-channel integrity (`electron-updater` against GitHub Releases).
- Database integrity (SQLite migrations, FTS queries).
- Renderer Content Security Policy escapes.

Out-of-scope:

- Anything requiring a malicious user already having full write access
  to the user's `attachments/` folder or SQLite DB on disk.
- Anything requiring a malicious user already having shell on the
  machine running Lacunex.
- Issues in `node_modules/`-vendored dependencies that are tracked
  upstream and don't have a Lacunex-specific exploitable path.

## Supported versions

Only the latest minor release receives security fixes. After v2.0
lands, v1.x will receive critical fixes for six months.
