# 0004. A rollout is gated by scripted checks, never by live traffic

- Status: Accepted
- Date: 2026-11-12
- Decider: TJ, 2026-11-12: "Services should deploy with progressive delivery using argo rollouts to validate health before going live. Canary cannot measure production traffic because website will not have activity most of the time."
- Issues and PRs: none yet
- Cited in code as: none
- Guide: [`docs/PRD.md`](../PRD.md), PRD section 6, How every service runs

## Context

Argo Rollouts usually judges a canary by the error rate of the real requests it receives. This site is idle most of the time, so that measures nothing.

## Decision

A new version starts beside the old one with no visitor traffic. The rollout runs checks against it: the version it reports, its health check, the key pages and the API contract, and for `web` a headless browser that loads the world and confirms the first frame draws. Traffic moves only after every check passes, and a failed check aborts the rollout. `fetcher` is a CronJob and is not a Rollout.

## Evidence

2026-11-12: Bluebird's Rollout on the same cluster already runs this way, with `setCanaryScale` followed by its `version-check` and `api-test` analyses.

## Alternatives rejected

- A canary weighted by live traffic with an error-rate analysis. It needs traffic the site does not have.
- A plain Deployment with readiness probes. It checks that a pod starts, not that the site works.

## Consequences

The checks live with the chart in zimmertr/trailhead-helm. Every release waits for them, which adds minutes to a deploy.
