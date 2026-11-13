#!/usr/bin/env bash
# `make compose-smoke`: the stack docker-compose.yml brings up, checked from
# the host on the ports it publishes.
set -euo pipefail
. "$(dirname "$0")/lib.sh"

check "the site answers" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/)" "200"
check "the plain page answers" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/page/)" "200"
check "the api is ready, so it reached the database" "$(curl -fsS http://127.0.0.1:8081/readyz | jq -r .status)" "ok"
check "the api lists the six projects" "$(curl -fsS http://127.0.0.1:8081/api/v1/projects | jq '.projects | length')" "6"
check "with no numbers before the first fetch" "$(curl -fsS http://127.0.0.1:8081/api/v1/projects | jq '[.projects[].stars] | unique')" "[
  null
]"
check "the admin panel is ready" "$(curl -fsS http://127.0.0.1:8082/readyz | jq -r .status)" "ok"
check "the metrics answer" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:9464/metrics)" "200"
finish
