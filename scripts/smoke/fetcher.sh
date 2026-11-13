#!/usr/bin/env bash
# What only the built fetcher image shows. The fetch itself would call
# GitHub, so it isn't run here; the migrations are, against a throwaway
# Postgres, twice, since a second run must change nothing.
set -euo pipefail
IMAGE="$1"
. "$(dirname "$0")/lib.sh"
. "$(dirname "$0")/node.sh"

name="smoke-fetcher-$$"
trap 'docker stop "$name-db" >/dev/null 2>&1 || true; docker network rm "$name-net" >/dev/null 2>&1 || true' EXIT
docker network create "$name-net" >/dev/null
docker run -d --rm --name "$name-db" --network "$name-net" -e POSTGRES_PASSWORD=test postgres:18-alpine >/dev/null
for _ in $(seq 60); do docker exec "$name-db" pg_isready -q -h localhost -U postgres && break; sleep 1; done
db="postgresql://postgres:test@$name-db/postgres"

check "it refuses to start without a database setting" "$(docker run --rm --read-only "$IMAGE" >/dev/null 2>&1; echo $?)" "1"
check "the refusal is one structured line" "$(docker run --rm --read-only "$IMAGE" 2>/dev/null | jq -r '.level + ": " + .err.message')" "fatal: DATABASE_URL is required"
check "the migrations apply" "$(docker run --rm --read-only --network "$name-net" -e DATABASE_URL="$db" "$IMAGE" node migrate.js | jq -rs 'map(select(.msg == "the database is up to date"))[0].applied')" "1"
check "a second run applies nothing" "$(docker run --rm --read-only --network "$name-net" -e DATABASE_URL="$db" "$IMAGE" node migrate.js | jq -rs 'map(select(.msg == "the database is up to date"))[0].applied')" "0"
check "the table exists" "$(docker exec "$name-db" psql -U postgres -tAc "SELECT to_regclass('project_stats') IS NOT NULL")" "t"
node_image_checks "$IMAGE" fetcher
finish
