// Shows the round 4 map whole: relief.html?labels=1&crop=x,y&scale=k&trees=0
import { DAY } from './core.js';
import { LAND, buildTerrain, NW, NH, VD } from './land.js';
import { makeSignpost, makeKiosk, makeTent, makeRegister } from './sprites.js';

const q = new URLSearchParams(location.search), L = LAND, W = buildTerrain(), g = L.g.slice();
// The scene draws these each frame; here they are stamped on once, far to near.
const S = W.spots, extra = [{ bm: makeSignpost(), x: S.signpost[0], y: S.signpost[1] }, { bm: makeKiosk(), x: S.kiosk[0], y: S.kiosk[1] }, { bm: makeRegister(0), x: S.register[0], y: S.register[1] }, ...S.tents.map(([x, y, c]) => ({ bm: makeTent(c), x, y }))];
if (q.get('trees') !== '0') for (const th of [...L.things, ...extra].sort((a, b) => a.y - b.y)) {
  const stamp = (bm, sx, sy) => { for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i], x = sx + i, y = sy + j; if (c && x >= 0 && y >= 0 && x < NW && y < NH) g[y * NW + x] = c; } };
  if (th.tree) for (const p of th.tree.parts) stamp(p.bm, th.x + p.x, th.y + p.y); else stamp(th.bm, th.x - (th.bm.ox || 0), th.y - (th.bm.oy || 0));
}
const c = document.getElementById('c'), sc = +(q.get('scale') || 1);
c.width = NW; c.height = NH; c.style.width = NW * sc + 'px'; c.style.height = NH * sc + 'px';
if (q.get('crop')) { const [x, y] = q.get('crop').split(',').map(Number); c.style.marginLeft = -x * sc + 'px'; c.style.marginTop = -y * sc + 'px'; }
const ctx = c.getContext('2d'), img = ctx.createImageData(NW, NH);
for (let i = 0; i < g.length; i++) { const p = DAY[g[i]] || [255, 0, 255]; img.data[i * 4] = p[0]; img.data[i * 4 + 1] = p[1]; img.data[i * 4 + 2] = p[2]; img.data[i * 4 + 3] = 255; }
ctx.putImageData(img, 0, 0);
if (q.get('labels')) {
  ctx.font = '10px monospace'; ctx.textBaseline = 'middle';
  const tag = (t, u, v, lift = 0) => { const y = L.toY(u, v) - lift, w = ctx.measureText(t).width + 8; ctx.fillStyle = '#1a1424'; ctx.fillRect(Math.round(u - w / 2), y - 7, w, 14); ctx.fillStyle = '#fff3d0'; ctx.fillText(t, Math.round(u - w / 2) + 4, y + 1); };
  const C = L.C;
  tag('Trailhead', C.T[0], C.T[1] - 16); tag('Reflection Lake', C.lakes[0][0], C.lakes[0][1], 16); tag('base camp', C.camp[0] - 44, C.camp[1], 4);
  tag('Mount Monolith', L.volc.cu, L.volc.cv, 14); tag('Sideproject Spires', L.spires.cu, L.spires.cv, 14); tag('Proficiency Peak', L.peak.cu, L.peak.cv + 4, 14); tag('Legacy Range', 200, VD - 1, 96); tag('coulee', 1690, 118, 30);
}
// spots=1 marks where the rules in land.js put every sign and animal, and where the flocks circle.
if (q.get('spots')) {
  ctx.font = '9px monospace'; ctx.textBaseline = 'middle';
  const S = W.spots, mark = (x, y, t, c) => { ctx.fillStyle = c; ctx.fillRect(x - 2, y - 2, 5, 5); if (t) { const w = ctx.measureText(t).width + 4; ctx.fillStyle = '#1a1424'; ctx.fillRect(x + 4, y - 6, w, 11); ctx.fillStyle = c; ctx.fillText(t, x + 6, y); } };
  for (const [x, y, k] of S.signs) mark(x, y, k, '#f4d048');
  for (const k of ['elk', 'goats', 'sheep', 'marmots', 'squirrels', 'jelly']) S[k].forEach(([x, y], n) => mark(x, y, n ? '' : k, '#ff6ad5'));
  mark(S.bear[0], S.bear[1], 'bear', '#ff6ad5'); mark(S.whale[0], S.whale[1], 'whale', '#7cf'); mark(S.ferry[0][0] + 34, S.ferry[0][1], 'ferry from', '#7cf'); mark(S.ferry[1][0], S.ferry[1][1] - 34, 'ferry to', '#7cf');
  for (const F of W.flocks) { ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.ellipse(F.cx, F.cy, F.rx, F.ry, 0, 0, 7); ctx.stroke(); }
}
window.__dbg = (x, y) => { const v = L.depth[y * NW + x]; return JSON.stringify([L.MATS[L.mat[y * NW + x]], v, L.hAt(x, v), L.hAt(x + 1, v) - L.hAt(x - 1, v), L.hAt(x, v + 1) - L.hAt(x, v - 1)]); };
window.__info = { NW, NH, live: L.things.length }; window.__ready = true;
