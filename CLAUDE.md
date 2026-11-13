# trailhead

TJ's site, tjzimmerman.com, as one small low-poly 3D planet that a visitor runs and climbs through. It is four services (`web`, `api`, `admin`, `fetcher`) and a Postgres database, on TJ's Kubernetes cluster. Start with [`docs/PRD.md`](docs/PRD.md).

## Documentation

| Page | What belongs there |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | What the site is, every place and feature, the parts they share, the services and the build plan |
| [`docs/architectural-decision-records/`](docs/architectural-decision-records/README.md) | One record per decision that shapes the site. The README is the index and says how to write one |

The chart is in [zimmertr/trailhead-helm](https://github.com/zimmertr/trailhead-helm). Record: [0003](docs/architectural-decision-records/0003-the-chart-lives-in-its-own-repo.md)

## Rules

- **One small planet.** Every place sits on the same sphere, and an object keeps its place and its look everywhere. Add nothing to fill the planet out. Record: [0001](docs/architectural-decision-records/0001-the-world-is-one-small-planet.md)
- **One progress number.** A route has one number, and the character's position, his pose and the camera are computed from it. Nothing is simulated frame to frame. Record: [0007](docs/architectural-decision-records/0007-one-progress-number-drives-everything.md)
- **Four services, split by trust.** `api` holds no tokens and makes no outbound calls, `admin` is never reachable from the internet, and only `fetcher` holds tokens. Record: [0002](docs/architectural-decision-records/0002-four-services-split-by-trust.md)
- **A rollout is gated by scripted checks**, never by live traffic. Record: [0004](docs/architectural-decision-records/0004-rollouts-are-gated-by-scripted-checks.md)
- **The words are written once**, in the content files, in third person. The 3D cards, the plain page and the API read the same data.
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
- The PR title is `type(scope): summary`; the `PR Title` check refuses anything else.
- Actions are pinned to commit SHAs with the version in a comment. Renovate bumps them.
