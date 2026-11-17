#!/bin/sh
# usage: sheet.sh <out.png> <columns> <cell width> <a.png> <b.png> ...
# Lays screenshots from out/ side by side in one image, for comparing frames.
# CROP=x,y,w,h in the environment shows only that part of each screenshot, enlarged to the cell.
D="$(cd "$(dirname "$0")" && pwd)"; OUT="$1"; COLS="$2"; CW="$3"; shift 3
docker run --rm -v "$D/out:/out" -e FILES="$*" -e OUT="$OUT" -e COLS="$COLS" -e CW="$CW" -e CROP="$CROP" --entrypoint node trailhead-pixel-lab -e "
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const files = process.env.FILES.trim().split(/ +/), cols = +process.env.COLS, cw = +process.env.CW;
const crop = process.env.CROP ? process.env.CROP.split(',').map(Number) : null, k = crop ? cw / crop[2] : 1;
const p = await b.newPage({ viewport: { width: cols * cw, height: 100 } });
const src = f => 'data:image/png;base64,' + fs.readFileSync('/out/' + f).toString('base64');
const cell = f => crop
  ? '<div style=\"width:' + cw + 'px;height:' + Math.round(crop[3] * k) + 'px;overflow:hidden;position:relative\"><img src=\"' + src(f) + '\" style=\"position:absolute;left:' + (-crop[0] * k) + 'px;top:' + (-crop[1] * k) + 'px;transform-origin:0 0;transform:scale(' + k + ');image-rendering:pixelated\"></div>'
  : '<img src=\"' + src(f) + '\" style=\"width:' + cw + 'px;image-rendering:pixelated\">';
await p.setContent('<body style=\"margin:0;background:#222;display:grid;gap:2px;grid-template-columns:repeat(' + cols + ',' + cw + 'px)\">' + files.map(cell).join('') + '</body>');
await p.screenshot({ path: '/out/' + process.env.OUT, fullPage: true }); await b.close(); })();"
