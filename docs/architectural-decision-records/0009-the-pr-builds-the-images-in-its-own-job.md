# 0009. The PR checks build the four images in a job of the repo's own

- Status: Accepted
- Date: 2026-11-12
- Decider: git is the source: the author of https://github.com/zimmertr/trailhead/pull/20, under the brief's "Copy their conventions and CI wiring".
- Issues and PRs: https://github.com/zimmertr/trailhead/pull/20
- Cited in code as: none
- Guide: [`docs/CICD.md`](../CICD.md), Pull request checks

## Context

Every image builds from the repo root, because the one lockfile and the content sit there, with its Dockerfile in its own folder (`web/Dockerfile`, `api/Dockerfile` and so on). yggdrasil's `docker-build` module (v1.2.9) takes a `context` and builds `<context>/Dockerfile`; it has no input for a Dockerfile elsewhere. Its `release` module does take `file`.

## Decision

`pr.yml`'s `Image (<service>)` job runs the module's steps for each of the four images: hadolint, the linux/amd64 build (`make image`), the smoke test (`make smoke`), a sticky Trivy comment, and a failure on any fixable Critical or High, with the module's pinned actions. This is the shape Bluebird already uses for its second image (`Planet Fill`). The release goes through the `release` module with `file` per image.

## Evidence

No dated measurement. `docker-build.yml` at v1.2.9: `dockerfile: ${{ inputs.context }}/Dockerfile` for hadolint and no `file` passed to `docker/build-push-action`.

## Alternatives rejected

- One root Dockerfile with a target per service. The release module passes no `target` or extra build argument, so it could build only one of them.
- Each service folder as its own build context. The lock and the content would need copying into every folder.

## Consequences

The job copies the module's steps, which cicd.md asks callers not to do, so a change to the module doesn't reach it by itself. A `file` input on yggdrasil's `docker-build` would let the job become four module calls (`Docker Build (<service>) / Docker Build`), and this record would be superseded.
