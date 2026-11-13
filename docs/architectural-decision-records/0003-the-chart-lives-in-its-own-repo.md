# 0003. The Helm chart lives in its own repo

- Status: Accepted
- Date: 2026-11-12
- Decider: TJ, 2026-11-12: "I think we should have a separate repo for the helm chart now, it has grown in scope."
- Issues and PRs: none yet
- Cited in code as: none
- Guide: [`docs/PRD.md`](../PRD.md), The docs table

## Context

The chart was planned inside this repo, as hevy-garmin-sync keeps its own. Then it grew to four workloads with Rollouts, analysis templates, disruption budgets, a database cluster and Istio policies.

## Decision

The chart is in zimmertr/trailhead-helm, public and GPL-3.0, published as an OCI artifact, as zimmertr/bluebird-helm is for Bluebird. This repo holds the services and their images. Both stay under TJ's personal account.

## Evidence

No dated measurement.

## Alternatives rejected

- The chart in a `chart/` folder here. One PR could change code and chart together, but chart changes would release with every code merge.
- An organization holding both repos. Nothing calls for it yet.

## Consequences

A change that touches a service and its chart is two PRs. The chart releases on its own schedule.
