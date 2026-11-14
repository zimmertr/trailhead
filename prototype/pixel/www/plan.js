// A workbench page: one still picture of the whole world map, for looking at its layout.
// plan.html?crop=x,y,w,h&scale=3 magnifies one part. Nothing here is used by the site.
import { DAY, R } from './core.js';
import { makeSignpost, makeSmallSign, makeKiosk, makeTent, makeElk, makeBird } from './sprites.js';
import { bear, goat, marmot } from './fauna.js';
import { makeStack, makeMassif, makePeak } from './world.js';
import { buildTerrain, NW, NH, PEAK, STACK, SPIRES } from './terrain.js';

const peak = makePeak(), W = buildTerrain(peak), { g, spots: S, make } = W, at = (x, y) => y * NW + x;
const things = W.things.slice(), put = (bm, x, y, lift = 0) => things.push({ bm, x, y, lift });
put(peak, PEAK.x, PEAK.y); put(makeStack(), STACK.x, STACK.y); put(makeMassif(), SPIRES.x, SPIRES.y);
for (const [x, y, c] of S.tents) put(makeTent(c), x, y);
put(makeSignpost(), ...S.signpost); put(makeKiosk(), ...S.kiosk); put(make.ferry(), ...S.ferry); put(make.whale(), ...S.whale);
for (const [x, y] of S.signs) put(makeSmallSign(), x, y);
for (const [x, y, d] of S.elk) put(makeElk(!!d), x, y);
put(bear(false), ...S.bear); for (const [x, y] of S.marmots) put(marmot('sun'), x, y);
for (const [x, y, kid] of S.goats) put(goat('stand', !!kid), x, y);
for (const [x, y, d] of S.sheep) put(make.sheep(!!d), x, y);
for (const [x, y, chip] of S.squirrels) put(make.squirrel(!!chip), x, y);
for (const [x, y] of S.birds) put(makeBird(x & 1), x, y + 400, 400);
const blit = (bm, sx, sy) => { sx = Math.round(sx); sy = Math.round(sy); for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i], x = sx + i, y = sy + j; if (c && x >= 0 && y >= 0 && x < NW && y < NH) g[at(x, y)] = c; } };
things.sort((a, b) => a.y - b.y);
for (const th of things) {
  if (th.tree) for (const p of th.tree.parts) blit(p.bm, th.x + p.x, th.y + p.y);
  else blit(th.bm, th.x - (th.bm.ox || 0), th.y - (th.bm.oy || 0) - (th.lift || 0));
}
// The boot track on the ice, and the mist over everything.
W.trackPts.forEach(([px, py], n) => {
  const f = n / (W.trackPts.length - 1), x = Math.round(px), y = Math.round(py);
  if (f > 0.55 && n % (f > 0.8 ? 7 : 4) > 1) return;
  g[at(x, y)] = R.glac[1]; if (f < 0.4) { g[at(x + 1, y)] = R.glac[1]; g[at(x, y + 1)] = R.glac[2]; g[at(x - 1, y)] = R.glac[3]; } else if (f < 0.7) g[at(x + 1, y)] = R.glac[2];
});
for (let i = 0; i < g.length; i++) if (W.mist[i]) g[i] = W.mist[i];

const c = document.getElementById('c'), q = new URLSearchParams(location.search), sc = +(q.get('scale') || 1);
c.width = NW; c.height = NH; c.style.width = NW * sc + 'px'; c.style.height = NH * sc + 'px';
if (q.get('crop')) { const [x, y] = q.get('crop').split(',').map(Number); c.style.marginLeft = -x * sc + 'px'; c.style.marginTop = -y * sc + 'px'; }
const ctx = c.getContext('2d'), img = ctx.createImageData(NW, NH);
// The glints on water cycle through the palette in the scene; here they are simply lit.
const lit = new Set(R.glint);
for (let i = 0; i < g.length; i++) { const p = DAY[lit.has(g[i]) ? R.water[5] : g[i]] || [255, 0, 255]; img.data[i * 4] = p[0]; img.data[i * 4 + 1] = p[1]; img.data[i * 4 + 2] = p[2]; img.data[i * 4 + 3] = 255; }
ctx.putImageData(img, 0, 0);
window.__info = { NW, NH }; window.__ready = true;
