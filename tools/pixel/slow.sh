#!/bin/sh
# usage: slow.sh <label> [rate] [width] [height] [only]
# How long a frame takes on a slow phone: every scene, by Day and at Dusk, in a phone's window with the
# processor slowed four times. Writes out/slow/<label>.json. See slow.mjs. WWW=<folder> times another build.
# PROFILE=1 also says which functions the time went to.
cd "$(dirname "$0")" || exit; W="$(cd "${WWW:-../../web/www}" && pwd)"
docker image inspect trailhead-pixel-lab >/dev/null 2>&1 || docker build -q -t trailhead-pixel-lab . >/dev/null
mkdir -p out
docker run --rm --ipc=host -e PROFILE -v "$W:/www:ro" -v "$PWD/out:/out" -v "$PWD/slow.mjs:/lab/slow.mjs:ro" --entrypoint node trailhead-pixel-lab /lab/slow.mjs "$@" 2>&1 | grep -v '^\s*at '
