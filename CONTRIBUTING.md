# Contributing

Lacunex is a small project and every PR matters. A few notes before you
open one.

## Quick start

1. Fork and clone.
2. `npm install`. The postinstall runs `electron-rebuild` for
   `better-sqlite3`.
3. `npm run dev` opens the Electron window with HMR.
4. `npm test`, `npm run lint`, `npm run typecheck`. Keep them green.

## What I'll accept

- Bug fixes. Smaller PRs land faster.
- Documentation improvements.
- New built-in section templates for additional report types (Project
  Status, Research Report, Executive Brief, and so on). The seeded set
  lives in [src/main/lib/reportTemplates.ts](./src/main/lib/reportTemplates.ts).
  Add a new entry following the existing pattern. Polished real-shape
  content beats generic skeletons — aim for the quality of the
  Engineering Postmortem and Audit Gap templates already in there.
- Missing tests for existing features.
- Performance improvements with before/after numbers.
- Accessibility improvements: screen-reader support, keyboard nav,
  contrast, focus rings, etc.
- Sample reports for [`examples/`](./examples/) covering under-represented
  verticals (consulting, audit gap, research). One polished sample is
  worth more than three skeletal ones.

## What I won't accept

- Forks renamed and republished as competing products. Those aren't
  contributions, they're violations of the noncompete and trademark
  clauses in the [LICENSE](./LICENSE).
- Major refactors without a prior issue. Rejecting a 3,000-line PR
  is bad for everyone's mood. Open an issue first.

## Contributor terms

Important: by submitting a PR you agree to the terms below. For
non-trivial contributions I may ask you to acknowledge this in a
comment on the PR before merging.

By contributing you grant the Lacunex project:

1. A perpetual, worldwide, royalty-free, irrevocable license to use,
   reproduce, modify, distribute, sublicense, and otherwise exploit
   your contribution as part of the Lacunex software, under the same
   terms as the rest of the software (currently PolyForm Shield 1.0.0)
   and under any license the maintainer adopts for the project in the
   future.
2. A patent license equivalent to the patent grant in Apache 2.0
   Section 3, covering any patents you control that would be
   necessarily infringed by your contribution as merged into Lacunex.

You keep the copyright on your contribution and can use it however you
like elsewhere.

### What you're confirming when you contribute

By opening a PR you confirm:

- The contribution is your original work, or it's properly attributed
  and the original license is compatible (e.g. MIT or Apache 2.0 with
  attribution preserved).
- You have the legal right to grant the licenses above. You're not
  contributing code your employer owns without their permission.
- You're not contributing code under copyleft licenses (GPL, AGPL,
  SSPL) without flagging it explicitly. Those aren't compatible with
  PolyForm Shield's distribution model.

### Why ask for this at all

Without explicit terms, every contributor keeps copyright on their PR
and I'd have no clear permission to keep redistributing it as the
project evolves. This has bitten projects before (MongoDB, MariaDB,
Mongoose) and I'd rather be explicit up front.

If you're not comfortable with these terms, please don't submit a PR.
Open an issue describing what you'd like to change and we'll discuss.

## Code style

- Strict TypeScript everywhere. No `any`, no `@ts-ignore`.
- Tailwind first, shadcn primitives second, custom CSS only when
  neither works.
- One component per file, soft cap at ~300 lines.
- Comments explain *why*, not *what*. If the comment paraphrases the
  code, delete the comment.
- Run `npm run lint && npm run typecheck && npm test` before pushing.
  CI runs the same and they must pass before merge.

## Reporting security issues

Please don't open a public issue for security vulnerabilities. Use
GitHub's
[Private Vulnerability Reporting](https://github.com/robinx0/lacunex-community/security/advisories/new)
on this repository instead. I aim to acknowledge within 48 hours and
will credit you in the release notes (unless you'd rather stay
anonymous) once a fix has shipped.

## Code of conduct

Be decent. Disagreements happen, ad-hominem attacks don't. I reserve
the right to close or hide PRs and issues from contributors who treat
the community badly.

## Questions

Open an issue or start a
[GitHub Discussion](https://github.com/robinx0/lacunex-community/discussions).
