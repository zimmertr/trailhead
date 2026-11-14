#!/bin/sh
# usage: sheet.sh <out.png> <columns> <cell width> <a.png> <b.png> ...
# Lays screenshots from out/ side by side in one image, for comparing frames.
D="$(cd "$(dirname "$0")" && pwd)"; OUT="$1"; COLS="$2"; CW="$3"; shift 3
docker run --rm -v "$D/out:/out" -e FILES="$*" -e OUT="$OUT" -e COLS="$COLS" -e CW="$CW" --entrypoint node trailhead-pixel-lab -e "
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const files = process.env.FILES.split(' '), cols = +process.env.COLS, cw = +process.env.CW;
const p = await b.newPage({ viewport: { width: cols * cw, height: 100 } });
await p.setContent('<body style=\"margin:0;background:#222;display:grid;grid-template-columns:repeat(' + cols + ',' + cw + 'px)\">' + files.map(f => '<img src=\"data:image/png;base64,' + fs.readFileSync('/out/' + f).toString('base64') + '\" style=\"width:' + cw + 'px;image-rendering:pixelated\">').join('') + '</body>');
await p.screenshot({ path: '/out/' + process.env.OUT, fullPage: true }); await b.close(); })();"
