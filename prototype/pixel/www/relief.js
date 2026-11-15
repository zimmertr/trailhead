// Shows the round 4 map whole: relief.html?labels=1&crop=x,y&scale=k&trees=0
import { DAY } from './core.js';
import { buildLand, NW, NH, VD, SY } from './land.js';

const q = new URLSearchParams(location.search), t0 = performance.now(), L = buildLand(), g = L.g.slice();
// The scene draws these each frame; here they are stamped on once, far to near.
if (q.get('trees') !== '0') for (const th of L.things) {
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
window.__dbg = (x, y) => { const v = L.depth[y * NW + x]; return JSON.stringify([L.MATS[L.mat[y * NW + x]], v, L.hAt(x, v), L.hAt(x + 1, v) - L.hAt(x - 1, v), L.hAt(x, v + 1) - L.hAt(x, v - 1)]); };
window.__info = { NW, NH, ms: Math.round(performance.now() - t0), live: L.things.length }; window.__ready = true;
