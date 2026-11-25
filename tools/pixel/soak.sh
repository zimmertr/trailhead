#!/bin/sh
# usage: soak.sh <label> [minutes] [case ...]
# The map and each scene left running at eight times speed for a simulated hour, with checks for animals
# stuck, on top of each other or where they may not stand, errors on the console, a scene that broke and a
# heap that grows. Writes out/soak/<label>.json. See soak.mjs. WWW=<folder> soaks another build instead.
cd "$(dirname "$0")" || exit; W="$(cd "${WWW:-../../web/www}" && pwd)"
docker image inspect trailhead-pixel-lab >/dev/null 2>&1 || docker build -q -t trailhead-pixel-lab . >/dev/null
mkdir -p out
docker run --rm --ipc=host -v "$W:/www:ro" -v "$PWD/out:/out" -v "$PWD/soak.mjs:/lab/soak.mjs:ro" --entrypoint node trailhead-pixel-lab /lab/soak.mjs "$@" 2>&1 | grep -v '^\s*at '
