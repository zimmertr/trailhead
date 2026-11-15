// A workbench page: one still picture of the whole world map, for looking at its layout.
// plan.html?crop=x,y,w,h&scale=3 magnifies one part. Nothing here is used by the site.
import { DAY, R, Screen } from './core.js';
import { makeSignpost, makeSmallSign, makeKiosk, makeTent, makeBird } from './sprites.js';
import { makeStack, makeMassif, makePeak } from './world.js';
import { makeCritters } from './critters.js';
import { buildTerrain, NW, NH, PEAK, STACK, SPIRES } from './terrain.js';

const peak = makePeak(), W = buildTerrain(peak), { g, spots: S, make } = W, at = (x, y) => y * NW + x;
// The scene's own drawing code paints straight onto the map: a screen the size of the world.
const scr = Object.assign(Object.create(Screen.prototype), { VW: NW, VH: NH, fb: g }), crit = makeCritters(W, { bear: true });
crit.sea(scr, 0, 0, 0);
const things = W.things.concat(crit.items), put = (bm, x, y, lift = 0) => things.push({ bm, x, y, lift });
put(peak, PEAK.x, PEAK.y); put(makeStack(), STACK.x, STACK.y); put(makeMassif(), SPIRES.x, SPIRES.y);
for (const [x, y, c] of S.tents) put(makeTent(c), x, y);
put(makeSignpost(), ...S.signpost); put(makeKiosk(), ...S.kiosk);
for (const [x, y] of S.signs) put(makeSmallSign(), x, y);
for (const [x, y] of S.birds) put(makeBird(x & 1), x, y + 400, 400);
const blit = (bm, sx, sy) => scr.blit(bm, sx, sy);
things.sort((a, b) => a.y - b.y);
for (const th of things) {
  if (th.tree) for (const p of th.tree.parts) blit(p.bm, th.x + p.x, th.y + p.y);
  else if (th.critter) crit.draw(scr, th, 0, 0, 0);
  else blit(th.bm, th.x - (th.bm.ox || 0), th.y - (th.bm.oy || 0) - (th.lift || 0));
}
crit.over(scr, 0, 0, 0);
// The boot track on the ice, and the mist over everything.
W.trackPts.forEach(([px, py], n) => {
  const f = n / (W.trackPts.length - 1), x = Math.round(px), y = Math.round(py);
  if (f > 0.55 && n % (f > 0.8 ? 7 : 4) > 1) return;
  g[at(x, y)] = R.glac[1]; if (f < 0.4) { g[at(x + 1, y)] = R.glac[1]; g[at(x, y + 1)] = R.glac[2]; g[at(x - 1, y)] = R.glac[3]; } else if (f < 0.7) g[at(x + 1, y)] = R.glac[2];
});
crit.mist(scr, 0, 0, 0, null);

const c = document.getElementById('c'), q = new URLSearchParams(location.search), sc = +(q.get('scale') || 1);
c.width = NW; c.height = NH; c.style.width = NW * sc + 'px'; c.style.height = NH * sc + 'px';
if (q.get('crop')) { const [x, y] = q.get('crop').split(',').map(Number); c.style.marginLeft = -x * sc + 'px'; c.style.marginTop = -y * sc + 'px'; }
const ctx = c.getContext('2d'), img = ctx.createImageData(NW, NH);
// The glints on water cycle through the palette in the scene; here they are simply lit.
const lit = new Set(R.glint);
for (let i = 0; i < g.length; i++) { const p = DAY[lit.has(g[i]) ? R.water[5] : g[i]] || [255, 0, 255]; img.data[i * 4] = p[0]; img.data[i * 4 + 1] = p[1]; img.data[i * 4 + 2] = p[2]; img.data[i * 4 + 3] = 255; }
ctx.putImageData(img, 0, 0);
window.__info = { NW, NH }; window.__ready = true;
