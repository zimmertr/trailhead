#!/bin/sh
# usage: sound.sh <label> [earlier label]
# The audio lab. Measures how loud every tune through every set of instruments, every effect and every place's
# bed is, and whether anything clips, and writes out/sound/<label>.json. With an earlier label it also says
# what changed. See sound.mjs. WWW=<folder> measures another build instead, as in shot.sh.
cd "$(dirname "$0")" || exit; W="$(cd "${WWW:-../../web/www}" && pwd)"
docker image inspect trailhead-pixel-lab >/dev/null 2>&1 || docker build -q -t trailhead-pixel-lab . >/dev/null
mkdir -p out
docker run --rm --ipc=host -v "$W:/www:ro" -v "$PWD/out:/out" -v "$PWD/sound.mjs:/lab/sound.mjs:ro" --entrypoint node trailhead-pixel-lab /lab/sound.mjs "$@" 2>&1 | grep -v '^\s*at '
