# Examples

Polished sample reports authored in Lacunex Community and exported to
Markdown. They show what finished deliverables look like, not the editor
surface.

| File | Vertical | Template used | Word count |
|---|---|---|---|
| [engineering-postmortem.md](./engineering-postmortem.md) | SRE / DevOps | Engineering Postmortem | ~1,100 |
| [security-incident-report.md](./security-incident-report.md) | Security / IR | Security Incident Report | ~1,800 |

## How to use these

- If you're considering installing the app: read these first. If your
  team writes reports that look anything like these, Lacunex will fit.
- If you're a contributor: the templates these came from live in
  [`src/main/lib/reportTemplates.ts`](../src/main/lib/reportTemplates.ts).
  Adding a new template (Project Status, Research Report, Executive
  Brief) is one of the easier first contributions.
- If you're already a user: open Lacunex, click **+ New report**, pick
  the matching template type. Replace the placeholders with your real
  engagement.

## What these samples don't show

These are markdown exports for skim-readability. The desktop app also
renders:

- PDF with a styled cover (Tradecraft, Boardroom, Vellum, OSCP Crimson,
  or Spine Ink), clean page breaks, and a footer.
- HTML with embedded screenshots, tables, and finding cards.
- Word (`.docx`) with proper heading levels for downstream formatting.

The PDF, Word, and HTML output looks noticeably more polished than
markdown can. To see those formats, run the desktop app and use
**File → Export**.

## On screenshots

No editor screenshots ship with this folder yet. If you want a quick
visual, clone the repo and run `npm install && npm run dev`. The reports
above were authored in roughly 20 minutes each, mostly typing into the
template scaffolds.

## Realism note

The scenarios are fictional but realistic. Names, IPs, domains, employee
handles, and dollar figures are invented. Don't pattern-match these
against any real incident.
