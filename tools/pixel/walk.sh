#!/bin/sh
# usage: walk.sh <out tag> <width> <height> <auto|day|dusk> <route> [route ...]   (CALM=1 for reduced motion)
# Walks each route through every stop on the page's clock and prints what went wrong. See walk.mjs.
cd "$(dirname "$0")" || exit; W="$(cd "${WWW:-../../web/www}" && pwd)"
docker run --rm --ipc=host -e CALM="${CALM:-}" -v "$W:/www:ro" -v "$PWD/out:/out" -v "$PWD/walk.mjs:/lab/walk.mjs:ro" --entrypoint node trailhead-pixel-lab /lab/walk.mjs "$@" 2>&1 | grep -v '^\s*at '
