# The checks every Node service image shares: run as the unprivileged user,
# carry the LICENSE and a license file naming each direct dependency.
node_image_checks() { # image, service
  check "$2 runs as the unprivileged user" "$(docker run --rm --entrypoint id "$1" -u)" "10001"
  check "$2 carries the repository's LICENSE" "$(docker run --rm --entrypoint head "$1" -1 /app/LICENSE)" "# PolyForm Noncommercial License 1.0.0"
  check "$2 ships no npm" "$(docker run --rm --entrypoint sh "$1" -c 'command -v npm || echo none')" "none"
  local licenses unlisted=""
  licenses=$(docker run --rm --entrypoint cat "$1" /app/third-party-licenses.txt)
  for dep in $(jq -r '.dependencies // {} | keys[] | select(startswith("@trailhead/") | not)' "$2/package.json" common/package.json); do
    grep -qE "^${dep} [0-9.]+$" <<<"$licenses" || unlisted="$unlisted $dep"
  done
  check "$2's license file names every direct dependency" "$unlisted" ""
}
