# Privacy Policy

**Last updated: 2026-05-24**

Lacunex Community is a local-first desktop application. This policy
describes what data the app handles and what it does not.

## Data collected by Lacunex

**None.** Lacunex does not collect, transmit, or store any personal
information, usage data, telemetry, crash reports, or analytics about
you or your activity.

There is no user account. There is no sign-up. There is no login.

## Data you create with Lacunex

Reports you write in Lacunex are stored locally on your device in a
SQLite database file plus an `attachments/` folder. These files live
in your operating system's app-data directory:

- **Windows:** `%APPDATA%\Lacunex Community\`
- **macOS:** `~/Library/Application Support/Lacunex Community/`
- **Linux:** `~/.config/Lacunex Community/`

Your reports never leave your device unless you explicitly export them
(to PDF, HTML, Markdown, or Word) and share the exported file yourself.

## Network connections

Lacunex makes only the following network calls:

1. **Update checks.** Every six hours after launch, Lacunex queries
   GitHub Releases (`api.github.com`) to check for a newer version.
   No personal information is sent. You can disable this check in
   the app's Settings.

2. **Local AI (optional).** If you install [Ollama](https://ollama.com)
   and enable AI assist, Lacunex sends your selected text to your
   local Ollama instance at `http://127.0.0.1:11434`. This is your own
   machine, not a remote server. No cloud LLM is ever contacted.

3. **Image attachments.** None. Images are stored locally only.

## Third-party services

Lacunex does not use any third-party analytics, advertising,
fingerprinting, crash reporting, or telemetry services.

## Children's privacy

Lacunex is not directed at children under 13. It does not collect any
information from any user regardless of age.

## Changes to this policy

If this policy changes, the updated date at the top of this document
will reflect the change. Any change will be limited to the description
of data handling; the underlying commitment to local-only operation
will not.

## Contact

For privacy questions, open an issue at
[github.com/Robinx0/lacunex-community/issues](https://github.com/Robinx0/lacunex-community/issues)
or use GitHub's
[Private Vulnerability Reporting](https://github.com/Robinx0/lacunex-community/security/advisories/new)
if your question is sensitive.
