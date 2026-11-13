# Development

CI is the test runner: branch, open a draft PR, push small commits, and read the checks. Everything also runs locally, in Docker, through `make`, so nothing is installed on the host and a red check reruns the same way it ran in CI.

## Run it

```sh
docker compose up --build
```

The site is on http://localhost:8080 (the plain page at `/page/`), the API on http://localhost:8081, the admin panel on http://localhost:8082, and the API's metrics on http://localhost:9464/metrics. `migrate` applies the database's migrations and exits, then `fetcher` reads the six projects' numbers from GitHub once and exits; set `GITHUB_TOKEN` in your shell to send a token. `make down` removes the containers and the database.

## Checks

Each target is what one CI job runs ([CICD.md](CICD.md)).

| Target | Runs |
|---|---|
| `make lint` | ESLint over the repo with `--max-warnings 0`, then `tools/eslint/selftest.js`, which fails unless each custom rule trips on its fixture. ESLint has its own package on TypeScript 6 (record [0012](architectural-decision-records/0012-eslint-runs-on-typescript-6-in-its-own-package.md)) |
| `make typecheck` | `tsc` (TypeScript 7) over the Node side and over `web/` |
| `make test` | The unit suite with line and branch coverage, HTML in `coverage/unit/` |
| `make test-db` | The database suite against a throwaway Postgres it starts and removes |
| `make check-openapi` | Fails when `api/openapi.json` differs from the routes. `make openapi` rewrites it |
| `make image SERVICE=api` | One image, as the PR builds it. `make images` builds all four |
| `make smoke SERVICE=api` | `scripts/smoke/<service>.sh` against the built image |
| `make scan SERVICE=api` | Trivy over the built image, failing on a fixable Critical or High |
| `make hadolint` | hadolint over the four Dockerfiles |
| `make browser` | Builds the web image, then the Playwright suite and axe against it |
| `make lighthouse` | Builds the web image, then Lighthouse's budgets against it |
| `make compose-smoke` | `docker-compose.yml` up, checked from outside, then down |
| `make check-unused` | Knip over the workspaces. Not in CI: run it before a refactor lands |
| `make lock` | Rewrites both lockfiles from the manifests. A pin change ships with its lock |

## The workspaces

npm workspaces, one lockfile at the root, Node's major in `.node-version` alone. Every dependency is an exact pin, and every install passes `--ignore-scripts` (`tests/locks.test.ts`). A new runtime dependency also needs its row in [`NOTICES.md`](../NOTICES.md); `tests/notices.test.ts` fails until it has one.

TypeScript runs as written: Node strips the types of `.ts` files, so scripts run with `node file.ts`, and imports spell the `.ts` extension. Only erasable syntax is allowed (no enums or namespaces).

## Writing tests

- Tests sit in each workspace's `test/`, beside the code they cover, and in `tests/` for the repo-wide checks. A database test is named `*.db.test.ts` and runs only in `make test-db`.
- Each suite builds its fakes in its own `test/fixtures.ts`: content files in `content/test/fixtures.ts`, store rows in `api/test/fixtures.ts`, every GitHub answer (and failure) in `fetcher/test/fixtures.ts`. Tests compose them and never spell a fake inline.
- No test touches the network. GitHub is always the fake fetch from the fixtures; the database suite gets a fresh database per file from `common/test/database.ts`.
- Time is fixed: every suite runs in UTC, and dates come from `START` and `daysAfterStart` in `common/test/fixtures.ts`.
- Coverage has no floor. A file left out of it carries its reason beside the exclusion in `vitest.config.ts`.

## Content

The words live in `content/` ([`content/CLAUDE.md`](../content/CLAUDE.md)). `npm run content` checks them and writes `content/dist/content.json`; every target runs it first. New user-facing words need TJ's approval before they ship.
