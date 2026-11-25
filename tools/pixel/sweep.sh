#!/bin/sh
# usage: sweep.sh <out folder> <width> <height> <day|dusk> <steps> <route> [route ...]
# Takes a still at every step along each route, into out/<folder>/. See sweep.mjs.
# WWW=<folder> sweeps another build instead, as in shot.sh.
cd "$(dirname "$0")" || exit; W="$(cd "${WWW:-../../web/www}" && pwd)"
docker image inspect trailhead-pixel-lab >/dev/null 2>&1 || docker build -q -t trailhead-pixel-lab . >/dev/null
docker run --rm --ipc=host -v "$W:/www:ro" -v "$PWD/out:/out" -v "$PWD/sweep.mjs:/lab/sweep.mjs:ro" --entrypoint node trailhead-pixel-lab /lab/sweep.mjs "$@" 2>&1 | grep -v '^\s*at '
