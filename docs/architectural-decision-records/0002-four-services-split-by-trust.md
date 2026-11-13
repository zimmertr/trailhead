# 0002. The backend is four services split by trust, not by feature

- Status: Accepted
- Date: 2026-11-12
- Decider: TJ, 2026-11-12. He chose "Split by trust: web, api, admin, fetcher" and said he was "open minded to a 12-factor/microservices approach to this web app instead of a micro-monolith".
- Issues and PRs: none yet
- Cited in code as: none
- Guide: [`docs/PRD.md`](../PRD.md), The trust boundaries constraint in the Issues section

## Context

The site needs project numbers from GitHub, later a summit register with an approval panel, and later numbers from Strava. Those need a public API, a private panel and something that holds tokens. One backend would put the panel and the tokens in the process that faces the internet.

## Decision

`web` is nginx with static files. `api` is public, holds no tokens and makes no outbound calls. `admin` is reachable from the home network only. `fetcher` is a CronJob and the only workload that holds tokens. They share one Postgres, each with its own database role. The public API answers on the same site under `/api`.

## Evidence

No dated measurement.

## Alternatives rejected

- One backend serving the API, the admin pages behind a login and the timed fetches. Fewest parts, but the admin surface and the tokens sit in the internet-facing process.
- A further split by feature, with a service and a database each for project numbers and the register. More to build, deploy and watch than a personal site needs.

## Consequences

The chart's routes and Istio policies hold the boundaries: no public route reaches `admin` or `fetcher`. It costs four images and four deployables where one would run.
