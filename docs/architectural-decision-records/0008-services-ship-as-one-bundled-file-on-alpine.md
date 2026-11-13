# 0008. Each Node service ships as one bundled file on Alpine, and web as static files on unprivileged nginx Alpine

- Status: Accepted
- Date: 2026-11-12
- Decider: TJ, through the foundation brief (2026-11-12): "One Dockerfile per service: multi-stage, minimal base, linux/amd64, non-root user, works with a read-only root filesystem". The base images and the bundling were chosen in https://github.com/zimmertr/trailhead/pull/20.
- Issues and PRs: https://github.com/zimmertr/trailhead/pull/20
- Cited in code as: none
- Guide: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md), Images

## Context

Four images go to GHCR and run with a read-only root filesystem as uid 10001 (the chart's `podSecurityContext`). The standards want the base with the fewest findings that have no fix, and an image that holds only what runs.

## Decision

- `api`, `admin` and `fetcher` are Fastify 5 (api, admin) and plain Node on Node 26, bundled by esbuild into one ES module file per entry point (`tools/bundle.ts`). The runtime image is `node:26-alpine` with npm, npx and yarn removed, holding the bundle, its `third-party-licenses.txt`, `LICENSE` and, for the fetcher, `db/`. No `node_modules`.
- `web` is `nginxinc/nginx-unprivileged:1.30-alpine` serving Vite's output, with nginx writing only under `/tmp`.
- Every image runs `apk upgrade` after its build arguments and ends as `USER 10001:10001`.

## Evidence

Trivy 0.76.2 on 2026-11-12, every severity, vulnerabilities only:

| Image | Findings | With a fix | Without a fix | Fixable Critical or High |
|---|---:|---:|---:|---:|
| `node:26-alpine` | 20 | 20 | 0 | 6 |
| `node:26-slim` | 226 | 22 | 204 | 8 |
| `gcr.io/distroless/nodejs26-debian13` | 59 | 0 | 59 | 0 |
| `nginxinc/nginx-unprivileged:1.30-alpine` | 61 | 61 | 0 | 13 |
| `nginxinc/nginx-unprivileged:1.30` | 559 | 63 | 496 | 5 |

Every Alpine finding has a fix, which `apk upgrade` and the removal of npm take. The Debian images carry hundreds no one can act on. Distroless has no package manager, so its 59 wait on Google's rebuild.

## Alternatives rejected

- Distroless Node. Fewer files, but 59 findings with no fix and no shell for the smoke tests.
- Shipping `node_modules` with `npm ci --omit=dev`. A larger image and every package's files for a scanner to read, where the bundle holds only the code that runs.
- Express or plain `node:http` for the services. Fastify brings response schemas that drop unlisted fields, a body limit, and a rate-limit plugin.

## Consequences

`tests/dockerfiles.test.ts` holds the four Dockerfiles to one Node digest, `.node-version`'s major, the upgrade after the build arguments, and a numbered user. A package with no license file stops the build (`tools/licenses.ts`). The bundle banner gives CommonJS dependencies a `require`.
