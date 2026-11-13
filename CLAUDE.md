# trailhead

TJ's site, tjzimmerman.com, as one small low-poly 3D planet that a visitor runs and climbs through. It is four services (`web`, `api`, `admin`, `fetcher`) and a Postgres database, on TJ's Kubernetes cluster. Start with [`docs/PRD.md`](docs/PRD.md).

## Documentation

| Page | What belongs there |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | What the site is, every place and feature, the parts they share, the services and the build plan |
| [`docs/architectural-decision-records/`](docs/architectural-decision-records/README.md) | One record per decision that shapes the site. The README is the index and says how to write one |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | The components, the images, the database and its roles |
| [`docs/API.md`](docs/API.md) | The API's routes, its error shape, and what its version promises |
| [`docs/CICD.md`](docs/CICD.md) | Every check, the release, the weekly scan, and every secret |
| [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) | Every environment variable each program reads, and who sets it |
| [`docs/DATA.md`](docs/DATA.md) | GitHub's API: what the fetcher reads, its quirks and its terms |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | The `make` targets, the workspaces, and how to write tests |
| [`docs/LIMITS.md`](docs/LIMITS.md) | Every cap and timeout, and why |
| [`docs/STYLES.md`](docs/STYLES.md) | The plain page's look, its tokens, and what the tests hold |
| [`docs/TRAFFIC.md`](docs/TRAFFIC.md) | Routes in, client identity, headers, and every outbound call |
| [`docs/USAGE.md`](docs/USAGE.md) | What a visitor and TJ see, and what to do when it breaks |
| [`NOTICES.md`](NOTICES.md) | The bundled software and data, with their licenses |
| [`content/CLAUDE.md`](content/CLAUDE.md), [`common/CLAUDE.md`](common/CLAUDE.md), [`web/CLAUDE.md`](web/CLAUDE.md), [`api/CLAUDE.md`](api/CLAUDE.md), [`admin/CLAUDE.md`](admin/CLAUDE.md), [`fetcher/CLAUDE.md`](fetcher/CLAUDE.md) | Each workspace's modules and what each owns |

The chart is in [zimmertr/trailhead-helm](https://github.com/zimmertr/trailhead-helm). Record: [0003](docs/architectural-decision-records/0003-the-chart-lives-in-its-own-repo.md)

## Rules

- **One small planet.** Every place sits on the same sphere, and an object keeps its place and its look everywhere. Add nothing to fill the planet out. Record: [0001](docs/architectural-decision-records/0001-the-world-is-one-small-planet.md)
- **One progress number.** A route has one number, and the character's position, his pose and the camera are computed from it. Nothing is simulated frame to frame. Record: [0007](docs/architectural-decision-records/0007-one-progress-number-drives-everything.md)
- **Four services, split by trust.** `api` holds no tokens and makes no outbound calls, `admin` is never reachable from the internet, and only `fetcher` holds tokens. Record: [0002](docs/architectural-decision-records/0002-four-services-split-by-trust.md)
- **A rollout is gated by scripted checks**, never by live traffic. Record: [0004](docs/architectural-decision-records/0004-rollouts-are-gated-by-scripted-checks.md)
- **The words are written once**, in the content files, in third person. The 3D cards, the plain page and the API read the same data, `content/dist/content.json`, and the pages are written from it at build time. Record: [0011](docs/architectural-decision-records/0011-the-pages-are-written-from-the-content-at-build-time.md)
- **Each Node service ships as one bundled file on Alpine; web is static files on unprivileged nginx.** Every image runs as uid 10001 with a read-only root filesystem. Record: [0008](docs/architectural-decision-records/0008-services-ship-as-one-bundled-file-on-alpine.md)
- **Every image builds from the repo root with its Dockerfile in its folder**, so the PR builds them in its own `Image (<service>)` job. Record: [0009](docs/architectural-decision-records/0009-the-pr-builds-the-images-in-its-own-job.md)
- **Migrations are plain SQL in `db/`, run by the fetcher image's `node migrate.js`**; a migration that has run is never edited. Record: [0010](docs/architectural-decision-records/0010-migrations-are-plain-sql-run-from-the-fetcher-image.md)
- **ESLint has its own package on TypeScript 6** (`tools/eslint/`), and each custom rule has a fixture its self-test checks. Record: [0012](docs/architectural-decision-records/0012-eslint-runs-on-typescript-6-in-its-own-package.md)
- **The API counts clients by `CF-Connecting-IP` alone**, through `clientBucket`; nothing reads or logs a socket address. Record: [0013](docs/architectural-decision-records/0013-client-identity-comes-from-cf-connecting-ip-alone.md)
- **Every colour has one owner**: `web/src/styles/tokens.css` for the pages, `web/src/world/palette.ts` for the canvas. The tests and the linter refuse one anywhere else.
- **A new runtime dependency** is an exact pin, gets its row in `NOTICES.md`, and ships with its lock.
- **Low-poly throughout.** Places differ by colour and environment, never by rendering style.
- **A merge is a release.** Prefer fewer, larger PRs.
- The README is TJ's: keep it accurate and in his voice, and never restructure it.

## Issues

File issues with the `create-issue` skill from zimmertr/ai-config. It reads the four things below from this section.

- **The reader**: TJ, who owns the site and reads TypeScript.
- **The gates**: every required check passes; the docs page that owns the topic changes in the same PR; the README changes only to stay accurate; a change to the 3D site or its build states load time and frame rate before and after; new behaviour arrives with its tests and coverage is reported.
- **The constraints**: everything builds, runs and tests in Docker; words on the site live only in the content files, in third person, and new user-facing text needs TJ's approval before it ships; `api` holds no tokens and makes no outbound calls, `admin` is never reachable from the internet, and only `fetcher` holds tokens.
- **The areas**: `site` (the 3D world, its interface and the plain page), `content` (the words), `services` (`api`, `admin`, `fetcher` and the database), `infra` (CI, images, the chart and observability), `security`.

## Working in this repo

- Work in a fresh clone in the session's scratchpad, never in TJ's checkout. Branch from the latest `origin/main`.
- Everything reaches main through a squash-merged PR. Never push to main.
- Every check CI runs is a `make` target that runs in Docker ([`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)). Never run npm or node on the host.
- The PR title is `type(scope): summary`; the `PR Title` check refuses anything else.
- Actions are pinned to commit SHAs with the version in a comment. Renovate bumps them.
