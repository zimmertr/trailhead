#!/usr/bin/env bash
# What only the built api image shows. No database is started, so the checks
# that need one see the 503 a visitor would.
set -euo pipefail
IMAGE="$1"
. "$(dirname "$0")/lib.sh"
. "$(dirname "$0")/node.sh"

name="smoke-api-$$"
trap 'docker stop "$name" >/dev/null 2>&1 || true' EXIT
docker run -d --rm --name "$name" -p 18081:8080 -p 19464:9464 --read-only \
  -e DATABASE_URL=postgresql://nobody:nothing@127.0.0.1:1/none "$IMAGE" >/dev/null
url=http://127.0.0.1:18081
wait_for "$url/healthz"

check "/healthz answers" "$(curl -fsS "$url/healthz" | jq -r .status)" "ok"
check "the build argument reaches /api/version" "$(curl -fsS "$url/api/version" | jq -r .version)" "0.0.0-ci"
check "/readyz is 503 with no database" "$(curl -s -o /dev/null -w '%{http_code}' "$url/readyz")" "503"
check "the projects answer unavailable with no database" "$(curl -s "$url/api/v1/projects" | jq -r .error.code)" "unavailable"
check "a 404 answers in the error shape" "$(curl -s "$url/api/nope" | jq -r .error.code)" "not_found"
check "a 404 carries the policy" "$(curl -s -D - -o /dev/null "$url/api/nope" | grep -ci "^content-security-policy: default-src 'none'")" "1"
check "an oversized body is a 413" "$(head -c 4096 /dev/zero | curl -s -o /dev/null -w '%{http_code}' -X POST --data-binary @- -H 'content-type: application/octet-stream' "$url/api/v1/projects")" "413"
check "the metrics answer on their own port" "$(curl -fsS http://127.0.0.1:19464/metrics | grep -c '^# TYPE trailhead_api_requests_total counter')" "1"
check "the license file is served" "$(curl -s -o /dev/null -w '%{http_code}' "$url/api/third-party-licenses.txt")" "200"
check "the logs carry no address" "$(docker logs "$name" 2>&1 | grep -cE '127\.0\.0\.1|172\.[0-9]+\.' || true)" "0"
node_image_checks "$IMAGE" api
finish
