#!/bin/sh
# usage: check.sh <item> [earlier item]
# One command for the checks every item gets before it is ticked (ROUND5.md section 9):
#   1. every file in www/ parses,
#   2. the game opens on every route with nothing on its console (make prototype-smoke),
#   3. the slowest view there is, the whole map zoomed out at Dusk with every event running, draws inside a frame,
#   4. where every trail, sign and animal is, written to out/check/<item>.json and compared with the check before.
# It ends with one line, "check <item>: passed" or what failed, and its exit code says the same.
D="$(cd "$(dirname "$0")" && pwd)"; ITEM="$1"
[ -n "$ITEM" ] || { echo "usage: check.sh <item> [earlier item]"; exit 2; }
docker image inspect trailhead-pixel-lab >/dev/null 2>&1 || docker build -q -t trailhead-pixel-lab "$D" >/dev/null
mkdir -p "$D/out/check"; FAILED=""

BAD=$(docker run --rm -v "$D/www:/www:ro" --entrypoint sh trailhead-pixel-lab -c 'for f in /www/*.js; do node --input-type=module --check < "$f" 2>&1 | sed "s#^#$f: #" | head -3; done')
if [ -z "$BAD" ]; then echo "syntax: every file parses"; else echo "syntax:"; echo "$BAD"; FAILED="$FAILED syntax"; fi

SMOKE=$(make -C "$D/../.." prototype-smoke 2>&1)
if echo "$SMOKE" | grep -q '^ *[0-9]* passed' && ! echo "$SMOKE" | grep -q '^ *[0-9]* failed'; then echo "browser:$(echo "$SMOKE" | grep '^ *[0-9]* passed')"; else echo "browser:"; echo "$SMOKE" | grep -v '^npm\|^$' | tail -40; FAILED="$FAILED browser"; fi

# 13.5 ms is what round 4's final build took here, 16.7 ms is one frame at 60 a second.
EV='start=shower,breach,blow,ferry,tide,orcas,eagle,osprey,serac,avalanche,squall,lens,tumble,devil,star&dusk=1'
OUT='wheel=720,200,240;wheel=720,200,240;wheel=720,200,240;wheel=720,200,240;wheel=720,200,240;wait=1500'
MS=$("$D/frames.sh" check/time.png "$EV" 1440 900 "wait=4000;$OUT;time=800" 1 '0,0,10,10' 1 10 2>&1 | sed -n 's/^time: \([0-9.]*\) ms.*/\1/p')
case "$MS" in
  '') echo "frame time: could not be measured"; FAILED="$FAILED frame-time";;
  *) echo "frame time: $MS ms a frame, zoomed out at Dusk (round 4: 13.5, the limit: 16.7)"
     [ "$(echo "$MS" | awk '{ print ($1 > 16.7) }')" = 1 ] && FAILED="$FAILED frame-time";;
esac

docker run --rm --ipc=host -v "$D/www:/www:ro" -v "$D/out:/out" -v "$D/check.mjs:/lab/check.mjs:ro" --entrypoint node trailhead-pixel-lab /lab/check.mjs "$@" || FAILED="$FAILED places"

if [ -z "$FAILED" ]; then echo "check $ITEM: passed"; else echo "check $ITEM: FAILED ($(echo "$FAILED" | sed 's/ /, /g'))"; exit 1; fi
