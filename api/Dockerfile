# The api image (ghcr.io/zimmertr/trailhead-api). Built from the repo root, which
# holds the one lockfile and the content every image reads:
#   docker build -f api/Dockerfile .
# The four Dockerfiles share one shape, and tests/dockerfiles.test.ts holds
# them to it. Records 0008 and 0009.

# The build stage bundles the service with esbuild into one file and writes
# the license text of every package in that bundle beside it.
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS build
WORKDIR /repo
COPY package.json package-lock.json .npmrc ./
# Every workspace's manifest, so npm can read the whole lock; only the ones
# named below are installed.
COPY content/package.json content/
COPY common/package.json common/
COPY web/package.json web/
COPY api/package.json api/
COPY admin/package.json admin/
COPY fetcher/package.json fetcher/
COPY e2e/package.json e2e/
# --ignore-scripts, and the same in .npmrc: nothing here needs an install
# script, and esbuild finds its own binary without one.
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts --include-workspace-root -w content -w common -w api
COPY tools/ tools/
COPY content/ content/
COPY common/ common/
COPY api/ api/
RUN npm run build -w content && node tools/bundle.ts api api/src/main.ts

# Alpine over Debian, and the bundle over node_modules, by measured findings
# (record 0008).
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5
LABEL org.opencontainers.image.title="trailhead-api" \
      org.opencontainers.image.description="The public API behind tjzimmerman.com" \
      org.opencontainers.image.source="https://github.com/zimmertr/trailhead" \
      org.opencontainers.image.licenses="PolyForm-Noncommercial-1.0.0"
ENV NODE_ENV=production
WORKDIR /app
# The bundle needs Node alone. npm, npx and yarn ship in the base image with
# dependencies of their own that scanners flag, and nothing here runs them.
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*
COPY --from=build /repo/dist/api/ ./
COPY LICENSE ./LICENSE
# Below every COPY on purpose: APP_COMMIT changes on every build, and BuildKit
# keys a RUN on every ARG in scope, so the upgrade under it runs against
# Alpine's index of the day while nothing above it rebuilds (security.md 10).
ARG APP_VERSION=dev
ARG APP_COMMIT=dev
ARG APP_BUILT_AT=dev
ENV APP_VERSION=${APP_VERSION} \
    APP_COMMIT=${APP_COMMIT}
RUN apk upgrade --no-cache
# The base image's unprivileged user, by number, so Kubernetes' runAsNonRoot
# can check it without reading /etc/passwd.
USER 1000:1000
EXPOSE 8080 9464
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8080/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "main.js"]
