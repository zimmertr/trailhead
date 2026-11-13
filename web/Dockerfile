# The web image (ghcr.io/zimmertr/trailhead-web): the 3D site and the plain
# page, served by nginx. Built from the repo root, which holds the one
# lockfile and the content the pages are written from:
#   docker build -f web/Dockerfile .
# The four Dockerfiles share one shape, and tests/dockerfiles.test.ts holds
# them to it. Records 0008, 0009 and 0011.

# The build stage writes both pages from the content and bundles them with
# Vite, along with the license text of every package in the bundle.
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
# script, and Vite's native tools find their binaries without one.
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts -w content -w web
COPY tools/ tools/
COPY content/ content/
COPY web/ web/
RUN npm run build -w content && npm run build -w web

# The unprivileged nginx build, which listens on 8080 and needs no root.
# Alpine, by measured findings (record 0008).
FROM nginxinc/nginx-unprivileged:1.30-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03
LABEL org.opencontainers.image.title="trailhead-web" \
      org.opencontainers.image.description="The 3D site and the plain page of tjzimmerman.com" \
      org.opencontainers.image.source="https://github.com/zimmertr/trailhead" \
      org.opencontainers.image.licenses="PolyForm-Noncommercial-1.0.0"
COPY web/nginx.conf /etc/nginx/nginx.conf
COPY web/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /repo/web/dist/ /usr/share/nginx/html/
COPY LICENSE /usr/share/doc/trailhead/LICENSE
# Below every COPY on purpose: APP_COMMIT changes on every build, and BuildKit
# keys a RUN on every ARG in scope, so the upgrade under it runs against
# Alpine's index of the day while nothing above it rebuilds (security.md 10).
# version.json is written here, from the same two values, for the rollout's
# version check and the trail conditions board.
ARG APP_VERSION=dev
ARG APP_COMMIT=dev
ARG APP_BUILT_AT=dev
USER root
RUN apk upgrade --no-cache \
    && addgroup -S -g 10001 trailhead \
    && adduser -S -D -H -u 10001 -G trailhead trailhead \
    && printf '{"version":"%s","commit":"%s"}\n' "${APP_VERSION}" "${APP_COMMIT}" > /usr/share/nginx/html/version.json
# uid and gid 10001, what the chart runs every pod as, by number so
# runAsNonRoot can check it. nginx writes only under /tmp (nginx.conf).
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]
