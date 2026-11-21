# Limits

Every cap, timeout and size bound, and why. The numbers live in the code named in each row; this page gives the reasons and doesn't restate them.

| Bound | Where | Why |
|---|---|---|
| Requests per client per minute on `/api` | `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` in [`api/src/limits.ts`](../api/src/limits.ts) | A visitor's page asks for the projects once; the budget leaves room for a reload storm and still stops a scraper. The buckets live in each replica's memory, so across three replicas a client can get up to three times the budget. Probes are exempt |
| Projects cache age | `PROJECTS_MAX_AGE_S` in the same file | The fetcher writes new numbers about once an hour; a few minutes of caching spares the database and costs nothing |
| Request body | `MAX_BODY_BYTES` in [`common/src/http.ts`](../common/src/http.ts), `client_max_body_size` in [`web/nginx.conf`](../web/nginx.conf) | No route takes a body yet, so anything larger is refused with a `413` before it's read |
| Database pool, connect timeout, statement timeout | `POOL_MAX`, `CONNECT_TIMEOUT_MS`, `STATEMENT_TIMEOUT_MS` in [`common/src/db.ts`](../common/src/db.ts) | A handful of short queries per service; a probe or a visitor is better served by a fast `503` than a hung request. Three api pods, an admin, a fetcher and a canary stay well under Postgres's 100 connections |
| GitHub read timeout | `REQUEST_TIMEOUT_MS` in [`fetcher/src/github.ts`](../fetcher/src/github.ts) | GitHub answers in well under a second; this covers a slow day without letting one stuck read hold the job |
| The fetcher's run | `fetcher.activeDeadlineSeconds` and `backoffLimit` in the chart's `values.yaml` | A run is twelve reads; one still going after the deadline has hung |
| First-screen weight and timings | [`.github/lighthouserc.json`](../.github/lighthouserc.json) | Measured on the image the PR builds, so a change that makes the pages heavier or slower fails its PR. See below |

## The Lighthouse budgets

Measured 2026-11-21 on the web image round 6 builds (the pixel world, item A2), Lighthouse 12 through `@lhci/cli` 0.15.1, its mobile preset, three runs, every run identical in bytes:

| Page | Total | Script | Font | Stylesheet | Document | First paint | Largest paint | Layout shift |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 2,091,412 B | 449,618 B | 50,190 B | 10,585 B | 2,266 B | 1,652 ms | 2,702 to 2,703 ms | 0.046 |

It scores 1.0 in accessibility, best practices and SEO. Performance (0.64) is not held: its blocking time (5.6 s) is the world drawing every frame on a throttled runner, and the world is measured by frame time and load time instead (`tools/pixel/check.sh`). Most of the total is `ground.png`, the baked map (1.5 MB). Each byte budget is today's number plus about 15% for a change that pays for itself; the timings are looser, since the runner's CPU is part of them. The 3D page's budgets of 2026-11-13 were replaced because the page they measured is gone, not to turn a red run green. Re-measure and move a number when a change earns it; never widen one to turn a red run green.
