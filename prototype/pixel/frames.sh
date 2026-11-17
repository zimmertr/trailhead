#!/bin/sh
# usage: frames.sh <out.png> '<query>' <width> <height> '<steps>' [dpr] [clip] [columns] [cell width]
# Films the prototype frame by frame in headless Chromium inside Docker and saves one sheet of frames to out/.
# See frames.mjs for the steps. Example: a second of the first pitch of The Stack, ten frames, cropped round him:
#   ./frames.sh pitch1.png 'route=stack' 1440 900 'scrub=0.15;key=Space;film=10x100' 1 me:120x100
D="$(cd "$(dirname "$0")" && pwd)"
docker image inspect trailhead-pixel-lab >/dev/null 2>&1 || docker build -q -t trailhead-pixel-lab "$D" >/dev/null
mkdir -p "$D/out"
docker run --rm --ipc=host -e CALM -v "$D/www:/www:ro" -v "$D/out:/out" -v "$D/frames.mjs:/lab/frames.mjs:ro" --entrypoint node trailhead-pixel-lab /lab/frames.mjs "$@"
