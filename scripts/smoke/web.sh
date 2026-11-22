#!/usr/bin/env bash
# What only the built web image shows. Run as `make smoke SERVICE=web` or by
# the PR's image job, with the image's tag as the one argument.
set -euo pipefail
IMAGE="$1"
. "$(dirname "$0")/lib.sh"

name="smoke-web-$$"
trap 'docker stop "$name" >/dev/null 2>&1 || true' EXIT
# Read-only with one writable /tmp, as the chart runs it.
docker run -d --rm --name "$name" -p 18080:8080 --read-only --tmpfs /tmp "$IMAGE" >/dev/null
url=http://127.0.0.1:18080
wait_for "$url/healthz"

check "/healthz answers" "$(curl -fsS "$url/healthz")" "ok"
check "the build argument reaches /version.json" "$(curl -fsS "$url/version.json" | jq -r .version)" "0.0.0-ci"
check "/version.json carries the commit" "$(curl -fsS "$url/version.json" | jq -r '.commit | length > 0')" "true"
check "the home page is the pixel world" "$(curl -fsS "$url/" | grep -c '<canvas id="c"')" "1"
check "the home page names the API for live stars" "$(curl -fsS "$url/" | grep -c '<meta name="trailhead:stars" content="/api/v1/projects">')" "1"
check "the game's modules are served as JavaScript" "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$url/app.js")" "200 application/javascript; charset=utf-8"
check "the baked ground is served" "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$url/ground.png")" "200 image/png"
check "the render tools' own pages are not served" "$(curl -s -o /dev/null -w '%{http_code}' "$url/relief.html")" "404"
check "/fonts redirects to /fonts/ without naming a host" "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$url/fonts")" "301 $url/fonts/"
check "a missing page is a 404" "$(curl -s -o /dev/null -w '%{http_code}' "$url/nowhere")" "404"
for path in / /app.js /healthz /nowhere /version.json; do
  headers=$(curl -s -D - -o /dev/null "$url$path")
  check "$path carries the policy" "$(grep -ci "^content-security-policy: default-src 'none'" <<<"$headers")" "1"
  check "$path carries nosniff" "$(grep -ci '^x-content-type-options: nosniff' <<<"$headers")" "1"
done
check "the server does not name its version" "$(curl -s -D - -o /dev/null "$url/" | grep -ci '^server: nginx/')" "0"
check "the third-party license file is served as text" \
  "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$url/third-party-licenses.txt")" "200 text/plain; charset=utf-8"
licenses=$(curl -fsS "$url/third-party-licenses.txt")
check "it carries the fonts' licence" "$(grep -c 'SIL OPEN FONT LICENSE' <<<"$licenses")" "1"
check "the image carries the repository's LICENSE" "$(docker exec "$name" head -1 /usr/share/doc/trailhead/LICENSE)" "# PolyForm Noncommercial License 1.0.0"
check "it runs as the chart's user" "$(docker exec "$name" id -u)" "10001"
finish
