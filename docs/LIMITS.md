# Limits

Every cap, timeout and size bound, and why. The numbers live in the code named in each row; this page gives the reasons and doesn't restate them.

| Bound | Where | Why |
|---|---|---|
| Requests per client per minute on `/api` | `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` in [`api/src/limits.ts`](../api/src/limits.ts) | A visitor's page asks for the projects once; the budget leaves room for a reload storm and still stops a scraper. The buckets live in each replica's memory, so across three replicas a client can get up to three times the budget. Probes are exempt |
| Projects cache age | `PROJECTS_MAX_AGE_S` in the same file | The fetcher writes new numbers about once an hour; a few minutes of caching spares the database and costs nothing |
| Request body | `MAX_BODY_BYTES` in [`common/src/http.ts`](../common/src/http.ts), `client_max_body_size` in [`web/nginx.conf`](../web/nginx.conf) | No route takes a body yet, so anything larger is refused with a `413` before it's read |
| Database pool, connect timeout, statement timeout | `POOL_MAX`, `CONNECT_TIMEOUT_MS`, `STATEMENT_TIMEOUT_MS` in [`common/src/db.ts`](../common/src/db.ts) | A handful of short queries per service; a probe or a visitor is better served by a fast `503` than a hung request. Three api pods, an admin, a fetcher and a canary stay well under Postgres's 100 connections |
| GitHub read timeout | `REQUEST_TIMEOUT_MS` in [`fetcher/src/github.ts`](../fetcher/src/github.ts) | GitHub answers in well under a second; this covers a slow day without letting one stuck read hold the job |
| Analytics message length | `MAX_MESSAGE` in [`web/src/analytics.ts`](../web/src/analytics.ts) | Long enough to tell errors apart, short enough that a message can't carry a page of someone's data |
| The fetcher's run | `fetcher.activeDeadlineSeconds` and `backoffLimit` in the chart's `values.yaml` | A run is twelve reads; one still going after the deadline has hung |
| First-screen weight and timings | [`.github/lighthouserc.json`](../.github/lighthouserc.json) | Measured on the image the PR builds, so a change that makes the pages heavier or slower fails its PR. See below |

## The Lighthouse budgets

Measured 2026-11-13 on the image https://github.com/zimmertr/trailhead/pull/20 built, Lighthouse 12 through `@lhci/cli` 0.15.1, its mobile preset, three runs each, every run identical in bytes:

| Page | Total | Script | Font | Stylesheet | Document | First paint | Largest paint | Layout shift |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 199,441 B | 162,605 B | 32,632 B | 1,879 B | 1,451 B | 1,680 to 1,689 ms | 2,157 to 2,240 ms | 0 |
| `/page/` | 40,784 B | 1,979 B | 32,632 B | 1,879 B | 3,420 B | 1,201 to 1,207 ms | 1,201 to 1,207 ms | 0.019 |

The plain page scored 1.0 in every category. The home page scored 1.0 in all but performance (0.68), whose blocking time (6.3 s) is the placeholder's software-rendered WebGL drawing every frame on a throttled runner with no GPU. So the performance score is held on the plain page alone, and the 3D is measured by frame rate and load time instead (PRD section 8). Each byte budget is today's number plus room for a change that pays for itself; the timings are looser, since the runner's CPU is part of them. Re-measure and move a number when a change earns it; never widen one to turn a red run green.
