# Licensing in plain English

> The legally binding text is in [LICENSE](./LICENSE). This file is a
> summary. If anything here disagrees with `LICENSE`, the `LICENSE`
> wins.

Lacunex Community is released under the
[PolyForm Shield License 1.0.0](https://polyformproject.org/licenses/shield/1.0.0/).
It's source-available — you can read, fork, modify, and redistribute
the code — with one carve-out: you can't ship a product that competes
with Lacunex using Lacunex's source.

## What you can do

- Use Lacunex personally for your own engagements, audits, postmortems,
  client reports, research, or study.
- Use Lacunex inside your company to write reports for clients or for
  the internal team. Paid consultants delivering reports to clients are
  fine — that's professional services, not competition.
- Modify the source and run your modified copy for any purpose that
  isn't competing.
- Distribute Lacunex (modified or not), as long as recipients also get
  the license terms and any `Required Notice:` lines.
- Fork the repository publicly. Keep the license, preserve the
  copyright notice, give your fork a different name, and don't ship it
  as a competing product.
- Read the source to audit it, learn from it, or check what it does
  with your data.
- Open a pull request.

## What you can't do

- Ship a product that competes with Lacunex using its source — paid or
  free, hosted or shrink-wrapped. PolyForm's noncompete clause is
  intentionally broad: it doesn't matter whether your thing is a
  library, a service, a CLI, or a hosted SaaS; if a buyer would treat
  it as a substitute for Lacunex, it competes.
- Resell Lacunex under the Lacunex name or under a name people would
  confuse for it.
- Suggest, on a fork or derivative, that the Lacunex project made it or
  endorsed it.

## What counts as "competing"

If someone choosing between your thing and Lacunex would pick yours
instead of installing Lacunex, your thing competes.

| Scenario | Allowed? |
|---|---|
| Freelance pentester writing reports for clients in Lacunex, billing for time. | Yes. Professional services. |
| 10-person consultancy installs Lacunex on every laptop for client deliverables. | Yes. Internal use, no resale. |
| Take Lacunex, slap an agency logo on it, sell to other pentesters as "AcmeReports". | No. That's a competing product. |
| Host Lacunex on your own server so your team can write reports in a browser. | Yes for your internal team. No if you sell hosted access to outsiders. |
| Embed Lacunex's editor as a module inside a vulnerability-management platform you sell. | No. Substantially similar functionality in a commercial product. |
| Fork Lacunex publicly to fix a bug or add a feature for yourself. | Yes. Keep the license, preserve notices, don't name it Lacunex, don't sell it as a competitor. |
| Fork Lacunex, rename it "PentestPad", republish for free on GitHub. | No. PolyForm's noncompete applies even when the fork is free. |
| Run a college security course where students install Lacunex on their laptops. | Yes. Non-commercial education. |

## Trademark

"Lacunex", the Lacunex logo, and the distinctive cover designs shipped
with the software are trademarks of the Lacunex project. You can say
truthfully that your fork is "based on Lacunex". You cannot publish a
derivative product *as* Lacunex.

## Why this license

The two licenses I considered before settling on PolyForm Shield:

- **MIT / Apache 2.0**: lets a cloud provider host Lacunex as a managed
  service tomorrow and keep all the revenue. That's what happened to
  MongoDB, Elastic, and Redis. Not a survival shape for a solo dev.
- **AGPL**: in theory forces a competing host to open-source their
  changes. In practice, enterprise legal teams refuse to touch AGPL
  because the network-use copyleft is hard to bound. I'd lose the
  auditors and consultants who matter most.

PolyForm Shield lets people read, fork, modify, run, audit, and even
redistribute. The only thing it stops is shipping a competing product.
The text is short, drafted by Heather Meeker (one of the Apache 2.0
co-authors), and recognized by SPDX.

## Questions

Open an issue or start a
[GitHub Discussion](https://github.com/robinx0/lacunex-community/discussions).
Security disclosures go through
[CONTRIBUTING.md → Reporting security issues](./CONTRIBUTING.md#reporting-security-issues).

---

*This page hasn't been reviewed by a lawyer. If you're operating at
serious commercial scale and have questions about how this applies to
your situation, get independent legal advice.*
