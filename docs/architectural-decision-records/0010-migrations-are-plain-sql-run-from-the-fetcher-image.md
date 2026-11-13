# 0010. Migrations are plain SQL, run by the fetcher image's `migrate.js`, with the grants reapplied every run

- Status: Accepted
- Date: 2026-11-12
- Decider: TJ, through the foundation brief (2026-11-12): "Plain SQL migrations and a way to run them". Where they run was chosen in https://github.com/zimmertr/trailhead/pull/20.
- Issues and PRs: https://github.com/zimmertr/trailhead/pull/20
- Cited in code as: none
- Guide: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md), Database

## Context

The schema needs one way to reach every database (compose, the throwaway test database, the cluster), and the chart creates the three service roles after the tables may already exist.

## Decision

- `db/migrations/NNNN_words.sql`, applied in name order, each in its own transaction, recorded with its SHA-256 in `schema_migrations`, under an advisory lock. A migration that changed after it ran stops the run.
- `db/grants.sql` runs after every migration run and grants each role that exists what its service needs.
- The runner (`common/src/migrate.ts`) ships in the fetcher image as `node migrate.js`, run with the database owner's login. The fetcher image is the one that already runs as a job.

## Evidence

No dated measurement.

## Alternatives rejected

- A migration tool (node-pg-migrate, Flyway, Atlas). Another dependency or image for one table.
- A fifth image for migrations. One more thing to build, scan and release.
- Grants inside a migration. A role created after that migration ran would never get them.

## Consequences

The database suite tests the runner, the schema's constraints and each role's grants. The chart must run `node migrate.js` from the fetcher image with the owner's login before a rollout; as of trailhead-helm's first chart (https://github.com/zimmertr/trailhead-helm/pull/3) it doesn't yet.
