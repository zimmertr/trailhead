# 0012. The PR builds the images through yggdrasil's docker-build module, and the smoke tests run in a job of their own

- Status: Accepted. Supersedes [0007](0007-the-pr-builds-the-images-in-its-own-job.md)
- Date: 2026-11-21
- Decider: TJ, in https://github.com/zimmertr/yggdrasil/issues/133, whose step 10 has trailhead drop its own `Image (...)` jobs. On the smoke tests, 2026-11-21: their own `Smoke (<service>)` job, the recommended option.
- Issues and PRs: https://github.com/zimmertr/yggdrasil/issues/133
- Cited in code as: none
- Guide: [`CLAUDE.md`](../../CLAUDE.md), Rules

## Context

[0007](0007-the-pr-builds-the-images-in-its-own-job.md) copied yggdrasil's `docker-build` steps into an `Image (<service>)` job, because the module built only `<context>/Dockerfile` and every image here builds from the repo root with its Dockerfile in its folder. yggdrasil v3.0.0's `docker-build` takes the release module's `images` list, `file` included, and builds each entry as a matrix job. Its `lighthouse` module audits an image that `docker-build` saved. Neither runs a smoke test against a running image: `docker-build` runs a container-structure-test file, which can't check a server's answers.

## Decision

- `pr.yml`'s `Docker Build` job calls `docker-build` with the release's four images and the build arguments `make image` passes, and saves each as `trailhead-<service>-image`. The checks are `Docker Build / Docker Build (zimmertr/trailhead-<service>)`.
- `Smoke (<service>)` loads each saved image and runs `make smoke`, unchanged.
- `Lighthouse` calls the `lighthouse` module with `.github/lighthouserc.json`, which now names the two URLs itself. The check is `Lighthouse / Lighthouse`.
- `Browser Smoke & Axe` loads the saved web image, as before.
- The image's size is no longer written to the run's summary. The module doesn't report it.

## Evidence

- 2026-11-21: yggdrasil's `docker-build.yml` at v3.0.0 reads `image`, `context`, `file`, `cache` and `structure-test` from each entry, and saves an image as `<name>-image` with the local tag `<name>:pr-scan`, which is the tag `make smoke`, `make browser-run` and `make lighthouse-run` already use.

## Alternatives rejected

- Porting the smoke tests to container-structure-test files: they would lose every check of what the server answers, its headers and its redirects.
- Dropping the smoke tests for `Browser Smoke & Axe`, `Lighthouse` and `Compose`: those don't start the api, admin or fetcher images on their own, or check the web image's headers.

## Consequences

- A change to how the images are linted, built or scanned happens in yggdrasil, and reaches this repo through Renovate's bump of the pin.
- The images list is written twice, in `pr.yml` and `release.yml`, because they are separate workflows. A new image joins both.
