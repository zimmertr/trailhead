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
check "the home page is written from the content" "$(curl -fsS "$url/" | grep -c '<p>is a principal platform engineer')" "1"
check "the plain page answers at /page/" "$(curl -s -o /dev/null -w '%{http_code}' "$url/page/")" "200"
check "/page redirects to /page/ without naming a host" "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$url/page")" "301 $url/page/"
check "a missing page is a 404" "$(curl -s -o /dev/null -w '%{http_code}' "$url/nowhere")" "404"
for path in / /page/ /healthz /nowhere /version.json; do
  headers=$(curl -s -D - -o /dev/null "$url$path")
  check "$path carries the policy" "$(grep -ci "^content-security-policy: default-src 'none'" <<<"$headers")" "1"
  check "$path carries nosniff" "$(grep -ci '^x-content-type-options: nosniff' <<<"$headers")" "1"
done
asset=$(curl -fsS "$url/" | grep -o '/assets/[^"]*\.js' | head -1)
check "assets are cached for good, with the headers" \
  "$(curl -s -D - -o /dev/null "$url$asset" | grep -ciE '^(cache-control: public, max-age=31536000, immutable|x-frame-options: DENY)')" "2"
check "the server does not name its version" "$(curl -s -D - -o /dev/null "$url/" | grep -ci '^server: nginx/')" "0"
check "the third-party license file is served as text" \
  "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$url/third-party-licenses.txt")" "200 text/plain; charset=utf-8"
licenses=$(curl -fsS "$url/third-party-licenses.txt")
check "it names three.js" "$(grep -cE '^three [0-9.]+$' <<<"$licenses")" "1"
check "it names the typeface" "$(grep -cE '^@fontsource/national-park [0-9.]+$' <<<"$licenses")" "1"
check "the image carries the repository's LICENSE" "$(docker exec "$name" head -1 /usr/share/doc/trailhead/LICENSE)" "# PolyForm Noncommercial License 1.0.0"
check "it runs as the chart's user" "$(docker exec "$name" id -u)" "10001"
finish
