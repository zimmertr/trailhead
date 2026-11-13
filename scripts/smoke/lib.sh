# Shared by the smoke tests: a check that prints ok or FAIL and keeps going,
# so one run shows every failure, and a wait for a port to answer.
fail=0

check() { # label, actual, expected
  if [ "$2" = "$3" ]; then
    echo "  ok    $1"
  else
    echo "  FAIL  $1 (want '$3', got '$2')"
    fail=1
  fi
}

wait_for() { # url
  for _ in $(seq 1 30); do
    curl -fsS "$1" >/dev/null 2>&1 && return 0
    sleep 1
  done
  echo "  FAIL  nothing answered $1"
  exit 1
}

finish() {
  [ "$fail" -eq 0 ] || echo "::error::The smoke test failed. See the failures above."
  exit "$fail"
}
