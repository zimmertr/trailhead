#!/bin/sh
# usage: refs.sh <www folder> <out name> [views...]
# Renders the standard set of views from any build of the game into out/<out name>/, so two builds can be
# laid side by side with sheet.sh. Round 5 compares every change with round 4's final build:
#   git archive archive/pixel-r4-final prototype/pixel/www | tar -x -C ../r4-ref
#   ./refs.sh ../r4-ref/prototype/pixel/www r4        # once
#   ./refs.sh www new home dusk lake-0.35             # the views an item touched
# With no views given it renders all of them. Each view is "<name>|<query>|<width>|<height>|<steps>|<dpr>".
set -e
D="$(cd "$(dirname "$0")" && pwd)"
WWW="$(cd "$1" && pwd)"; OUT="$2"; shift 2
docker image inspect trailhead-pixel-lab >/dev/null 2>&1 || docker build -q -t trailhead-pixel-lab "$D" >/dev/null
mkdir -p "$D/out/$OUT"
views() {
  echo "home||1440|900|wait=2500|1"
  echo "home-phone||390|844|wait=2500|2"
  echo "dusk|dusk=1|1440|900|wait=2500|1"
  echo "wide||1920|1080|wait=1500;wheel=960,540,2400;wait=1500|1"
  echo "wide-dusk|dusk=1|1920|1080|wait=1500;wheel=960,540,2400;wait=1500|1"
  for r in lake stack spires; do for p in 0.05 0.2 0.35 0.5 0.65 0.8 0.95; do
    echo "$r-$p|route=$r&p=$p|1440|900|wait=2500|1"
    echo "$r-$p-dusk|route=$r&p=$p&dusk=1|1440|900|wait=2500|1"
  done; done
  for s in bluebird tks hevy-garmin-sync trailhead yggdrasil kubernetes-manifests; do for p in 0.15 0.5 0.85 1; do
    echo "spire-$s-$p|route=spire:$s&p=$p|1440|900|wait=2500|1"
  done; done
  echo "offroute|#no-such-trail|1440|900|wait=2500|1"
}
views | while IFS='|' read -r name q w h steps dpr; do
  if [ $# -gt 0 ]; then keep=0; for v in "$@"; do [ "$v" = "$name" ] && keep=1; done; [ $keep = 1 ] || continue; fi
  docker run --rm --ipc=host -v "$WWW:/www:ro" -v "$D/out:/out" -v "$D/shot.mjs:/lab/shot.mjs:ro" trailhead-pixel-lab "$OUT/$name.png" "$q" "$w" "$h" "$steps" "$dpr" \
    | grep -E 'ready in|error|warning' | sed "s#^#$name: #" || true
done
