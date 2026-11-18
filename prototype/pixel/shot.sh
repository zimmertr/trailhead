#!/bin/sh
# usage: shot.sh <name.png> '<query>' [width] [height] [steps] [dpr] [me]
# Serves www/ in headless Chromium inside Docker and saves a screenshot to out/. WWW=<folder> serves another
# build instead, for example round 4's: WWW=../../../r4-ref/prototype/pixel/www ./shot.sh r4/x.png '...'
D="$(cd "$(dirname "$0")" && pwd)"
W="$(cd "${WWW:-$D/www}" && pwd)"
docker image inspect trailhead-pixel-lab >/dev/null 2>&1 || docker build -q -t trailhead-pixel-lab "$D" >/dev/null
mkdir -p "$D/out"
docker run --rm --ipc=host -v "$W:/www:ro" -v "$D/out:/out" -v "$D/shot.mjs:/lab/shot.mjs:ro" trailhead-pixel-lab "$@"
