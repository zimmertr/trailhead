#!/usr/bin/env bash
# What only the built admin image shows.
set -euo pipefail
IMAGE="$1"
. "$(dirname "$0")/lib.sh"
. "$(dirname "$0")/node.sh"

name="smoke-admin-$$"
trap 'docker stop "$name" >/dev/null 2>&1 || true' EXIT
docker run -d --rm --name "$name" -p 18082:8080 --read-only \
  -e DATABASE_URL=postgresql://nobody:nothing@127.0.0.1:1/none "$IMAGE" >/dev/null
url=http://127.0.0.1:18082
wait_for "$url/healthz"

check "/healthz answers" "$(curl -fsS "$url/healthz" | jq -r .status)" "ok"
check "the build argument reaches /version" "$(curl -fsS "$url/version" | jq -r .version)" "0.0.0-ci"
check "/readyz is 503 with no database" "$(curl -s -o /dev/null -w '%{http_code}' "$url/readyz")" "503"
check "the placeholder page answers" "$(curl -fsS "$url/" | grep -c '<h1>Trailhead admin</h1>')" "1"
check "the page carries the policy" "$(curl -s -D - -o /dev/null "$url/" | grep -ci "^content-security-policy: default-src 'none'")" "1"
check "the license file is served" "$(curl -s -o /dev/null -w '%{http_code}' "$url/third-party-licenses.txt")" "200"
node_image_checks "$IMAGE" admin
finish
