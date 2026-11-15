#!/bin/sh
# usage: bake.sh
# Works the map's ground out ahead of time and writes www/ground.png (see bake.mjs). Run it after a
# change to the ground in www/terrain.js or to the palette, and commit the file it writes.
D="$(cd "$(dirname "$0")" && pwd)"
docker image inspect trailhead-pixel-lab >/dev/null 2>&1 || docker build -q -t trailhead-pixel-lab "$D" >/dev/null
docker run --rm --ipc=host -v "$D/www:/www" -v "$D/bake.mjs:/lab/bake.mjs:ro" --entrypoint node trailhead-pixel-lab /lab/bake.mjs
