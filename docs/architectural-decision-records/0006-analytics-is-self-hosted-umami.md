# 0006. Analytics is self-hosted Umami, and errors and performance are its events

- Status: Accepted
- Date: 2026-11-12
- Decider: TJ, 2026-11-12. He chose Umami ("Umami, and file an issue on Bluebird to also integrate with Umami") and, for errors, "As analytics events, alert in Grafana".
- Issues and PRs: none yet
- Cited in code as: none
- Guide: [`docs/PRD.md`](../PRD.md), Requirement 13, Observed from day one

## Context

TJ wants to know when people visit, what they use most, where they leave and how long they stay, along with error rate, CPU and memory, from the first release. The cluster has Prometheus, Grafana, Alertmanager and CloudNativePG, and no analytics tool.

## Decision

Umami runs on the cluster with its own Postgres and is shared with Bluebird Forecast (https://github.com/zimmertr/bluebird/issues/929). The site sends an event per milestone reached, map opened, egg found and section left, and sends errors, frame-rate samples and load times as events too. Grafana shows them beside each service's CPU and memory, and Alertmanager warns when the error rate jumps.

## Evidence

No dated measurement.

## Alternatives rejected

- Plausible. It needs ClickHouse as well as Postgres.
- Events posted to the site's own API. It would rebuild sessions and funnels that Umami has.
- A separate error tracker such as GlitchTip. Better stack traces, and one more app and database to run.

## Consequences

Umami is deployed from zimmertr/Kubernetes-Manifests, not from this repo. Errors arrive without full stack traces.
