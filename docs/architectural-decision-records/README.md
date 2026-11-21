# Architectural decision records

One file for each design decision: what was decided, when, who decided, and the evidence that settled it. A record sits beside the `CLAUDE.md` rule that states the decision today and does not replace it. The guide tells a session what to do. The record keeps why, and since when.

## Write a record

- Copy [`0000-template.md`](0000-template.md) to `NNNN-slug.md` with the next free number. Numbers have four digits and are never reused. (On 2026-11-21 TJ had the records pruned to the ones that still hold and renumbered from 0001; git keeps the old set, up to tag `archive/pixel-r5-final`.) The slug is the decision in a few lowercase words joined by hyphens.
- The title is the decision, as one sentence.
- Take the date and the decider from the conversation or issue that settled it, quoting the decider where the words exist. When nothing records them, use the merge date and the author of the PR that shipped it, and say that git is the source.
- Give every observation the date it was made.
- `Cited in code as` lists the issue and PR numbers that source comments cite for the decision, so a search for `#20` finds the record and the code together.
- Link the record from its `CLAUDE.md` rule as ` Record: [NNNN](docs/architectural-decision-records/NNNN-slug.md)`, right after the sentence that states the decision.
- A decision ships in the same PR as its record. A PR that makes a decision without one is not done.

## Cite a record

A record is evidence, not authority. Cite it for its measurements and its reasons, never as a rule that forbids a change. When today's facts call for a different answer, the new judgement is a superseding record. The maintainer, 2026-10-21: "We only make decisions based on technical problems and UX. Not old ADRs."

## Supersede a record

A new record that reverses an old one says `Supersedes NNNN` in its status line. The old record changes its status line to `Superseded by NNNN` and nothing else. The `CLAUDE.md` link moves to the new record in the same PR.

## Index

| Record | Decision | Date | Status |
|---|---|---|---|
| [0001](0001-the-world-is-pixel-art-on-rails-served-as-plain-javascript.md) | The world is pixel art on rails, and `web` serves it as plain JavaScript | 2026-11-14 | Accepted |
| [0002](0002-one-progress-number-drives-everything.md) | Position, pose and camera are computed from one progress number | 2026-11-12 | Accepted |
| [0003](0003-four-services-split-by-trust.md) | The backend is four services split by trust, not by feature | 2026-11-12 | Accepted |
| [0004](0004-the-chart-lives-in-its-own-repo.md) | The Helm chart lives in its own repo | 2026-11-12 | Accepted |
| [0005](0005-rollouts-are-gated-by-scripted-checks.md) | A rollout is gated by scripted checks, never by live traffic | 2026-11-12 | Accepted |
| [0006](0006-services-ship-as-one-bundled-file-on-alpine.md) | Each Node service ships as one bundled file on Alpine, and web as static files on unprivileged nginx Alpine | 2026-11-12 | Accepted |
| [0007](0007-the-pr-builds-the-images-in-its-own-job.md) | The PR checks build the four images in a job of the repo's own | 2026-11-12 | Accepted |
| [0008](0008-migrations-are-plain-sql-run-from-the-fetcher-image.md) | Migrations are plain SQL, run by the fetcher image's `migrate.js`, with the grants reapplied every run | 2026-11-12 | Accepted |
| [0009](0009-the-content-compiles-to-one-json-file.md) | The content compiles to one JSON file that the services build from | 2026-11-12 | Accepted |
| [0010](0010-eslint-runs-on-typescript-6-in-its-own-package.md) | ESLint runs on TypeScript 6 in a package of its own, while the repo type-checks with TypeScript 7 | 2026-11-12 | Accepted |
| [0011](0011-client-identity-comes-from-cf-connecting-ip-alone.md) | The API's rate limit counts clients by CF-Connecting-IP alone | 2026-11-12 | Accepted |
