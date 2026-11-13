# One target per check CI runs, each in Docker, so nothing needs installing on
# the host and a red check reruns here the same way (project.md, Local
# development in Docker). docs/DEVELOPMENT.md walks through them.

# The Node major lives in .node-version alone; tests/dockerfiles.test.ts holds
# the Dockerfiles to it.
NODE_IMAGE := node:$(shell cat .node-version)-alpine
POSTGRES_IMAGE := postgres:18-alpine
# Read off @playwright/test in e2e/package.json, so a Renovate bump moves the
# image too: each release pins its own Chromium.
PLAYWRIGHT_VERSION := $(shell sed -n 's/.*"@playwright\/test": "\([0-9.]*\)".*/\1/p' e2e/package.json)
PLAYWRIGHT_IMAGE := mcr.microsoft.com/playwright:v$(PLAYWRIGHT_VERSION)-noble
HADOLINT_IMAGE := hadolint/hadolint:v2.15.1-alpine
TRIVY_IMAGE := aquasec/trivy:0.76.2

# The repo mounted at /repo, in UTC, as CI runs it.
NODE := docker run --rm -v "$(CURDIR)":/repo -w /repo -e TZ=UTC $(NODE_IMAGE) sh -c
INSTALL := npm ci --ignore-scripts && npm run content
SERVICES := web api admin fetcher
SERVICE ?= web
IMAGE ?= trailhead-$(SERVICE):pr-scan
# A sentinel, not a real version: each smoke test asserts this exact string
# comes back, which proves the build argument reached the endpoint.
BUILD_ARGS := --build-arg APP_VERSION=0.0.0-ci --build-arg APP_COMMIT=$(shell git rev-parse HEAD 2>/dev/null || echo dev) --build-arg APP_BUILT_AT=1970-01-01T00:00:00Z

.PHONY: content lint typecheck test coverage test-db check-openapi openapi lock check-unused \
	image images hadolint smoke scan browser browser-run lighthouse lighthouse-run compose-smoke up down

# Builds content/dist/content.json from the Markdown, and fails on a problem.
content:
	$(NODE) "$(INSTALL)"

# ESLint (its own package, record 0012), then its self-test.
lint:
	$(NODE) "npm ci --prefix tools/eslint --ignore-scripts && $(INSTALL) && tools/eslint/node_modules/.bin/eslint --config tools/eslint/eslint.config.js --max-warnings 0 . && node tools/eslint/selftest.js"

typecheck:
	$(NODE) "$(INSTALL) && npm run typecheck"

# The unit suite with line and branch coverage. No floor, on purpose: a
# threshold rewards tests that run a line without asserting on it.
test:
	$(NODE) "$(INSTALL) && npm run coverage"

# The database suite, against a throwaway Postgres on a network of its own.
# One shell, so the names are unique to this run and the trap removes both.
# The wait is over TCP, because the image's first start serves its socket
# alone while it initialises, then restarts.
test-db:
	@set -e; name=trailhead-db-$$(od -An -N4 -tu4 /dev/urandom | tr -d ' '); \
	trap 'docker rm -f $$name >/dev/null 2>&1; docker network rm $$name-net >/dev/null 2>&1' EXIT; \
	docker network create $$name-net >/dev/null; \
	docker run -d --rm --name $$name --network $$name-net -e POSTGRES_PASSWORD=test $(POSTGRES_IMAGE) >/dev/null; \
	for _ in $$(seq 60); do docker exec $$name pg_isready -q -h localhost -U postgres && break; sleep 1; done; \
	docker run --rm --network $$name-net -v "$(CURDIR)":/repo -w /repo -e TZ=UTC -e TEST_DATABASE_URL=postgresql://postgres:test@$$name/postgres $(NODE_IMAGE) \
		sh -c "$(INSTALL) && npm run test:db"

check-openapi:
	$(NODE) "$(INSTALL) && npm run check:openapi"

# Not a check: rewrites api/openapi.json from the routes.
openapi:
	$(NODE) "$(INSTALL) && npm run openapi"

# Not a check: rewrites both lockfiles from the manifests. A pin change
# ships with its lock in the same PR.
lock:
	$(NODE) "npm install --package-lock-only --ignore-scripts && npm install --package-lock-only --ignore-scripts --prefix tools/eslint"

# Not in CI: unused files, exports and dependencies. Run it before a refactor
# lands.
check-unused:
	$(NODE) "$(INSTALL) && npm run unused"

# One image, as the PR's image job builds it: `make image SERVICE=api`.
image:
	docker build -f $(SERVICE)/Dockerfile $(BUILD_ARGS) -t $(IMAGE) .

images:
	@for s in $(SERVICES); do $(MAKE) --no-print-directory image SERVICE=$$s || exit 1; done

hadolint:
	@for s in $(SERVICES); do echo "$$s/Dockerfile"; docker run --rm -i $(HADOLINT_IMAGE) hadolint - < $$s/Dockerfile || exit 1; done

# What only a built image shows: scripts/smoke/<service>.sh against it.
smoke:
	bash scripts/smoke/$(SERVICE).sh $(IMAGE)

# Fixable Critical or High fail, as the release would refuse them.
scan:
	docker run --rm -v /var/run/docker.sock:/var/run/docker.sock $(TRIVY_IMAGE) image --ignore-unfixed --severity CRITICAL,HIGH --exit-code 1 $(IMAGE)

# The browser suite and axe against the built web image. browser-run expects
# the image to exist, which is how CI calls it after loading the image job's
# artifact. The browser shares the site's network namespace and reaches it on
# localhost, which browsers treat as a secure origin, as they will the HTTPS
# site; a plain-HTTP hostname would make Chrome ignore and complain about the
# Cross-Origin-Opener-Policy header.
browser:
	$(MAKE) image SERVICE=web
	$(MAKE) browser-run

browser-run:
	@set -e; name=trailhead-e2e-$$(od -An -N4 -tu4 /dev/urandom | tr -d ' '); \
	trap 'docker stop $$name >/dev/null 2>&1' EXIT; \
	docker run -d --rm --name $$name --read-only --tmpfs /tmp trailhead-web:pr-scan >/dev/null; \
	docker run --rm --network container:$$name --ipc=host -v "$(CURDIR)":/repo -w /repo -e BASE_URL=http://localhost:8080 $(PLAYWRIGHT_IMAGE) \
		sh -c "npm ci --ignore-scripts -w content -w e2e && npm run content && cd e2e && npx playwright test"

# Lighthouse's budgets (.github/lighthouserc.json) against the built web image,
# on localhost for the reason above. As root, so it can write its report into
# the mounted repo; Chrome runs with --no-sandbox already.
lighthouse:
	$(MAKE) image SERVICE=web
	$(MAKE) lighthouse-run

lighthouse-run:
	@set -e; name=trailhead-lh-$$(od -An -N4 -tu4 /dev/urandom | tr -d ' '); \
	trap 'docker stop $$name >/dev/null 2>&1' EXIT; \
	docker run -d --rm --name $$name --read-only --tmpfs /tmp trailhead-web:pr-scan >/dev/null; \
	docker run --rm --user root --network container:$$name -v "$(CURDIR)":/repo -w /repo -e CHROME_PATH=/usr/bin/chromium-browser --entrypoint sh zenika/alpine-chrome:with-node \
		-c "npx -y @lhci/cli@0.15.1 autorun --config=.github/lighthouserc.json --collect.url=http://localhost:8080/ --collect.url=http://localhost:8080/page/"

# The whole thing, from docker-compose.yml, checked from outside. The
# fetcher stays down: it would call GitHub.
compose-smoke:
	@set -e; trap 'docker compose down -v >/dev/null 2>&1' EXIT; \
	docker compose up -d --build --wait postgres migrate web api admin; \
	bash scripts/smoke/compose.sh

up:
	docker compose up --build

down:
	docker compose down -v
