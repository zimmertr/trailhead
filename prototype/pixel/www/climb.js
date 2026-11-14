// Sideproject Spires, the climbs: six short routes seen from the side, one per project, each
// with its own crux on the way up and its own thing on the summit to click. All six end the same
// way: he sits down and glissades back to camp.
import { clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, DAY, N, INK, SHADE, LIGHT, pick, BM, outline, disc, thick } from './core.js';
import { Strip, drawStrip, baseline } from './side.js';
import { makeTent, makeFlag, clump, makeCloud } from './sprites.js';
import { bluebird, speck, goat } from './fauna.js';
import { sideFig, frontFig } from './tj.js';

const W = 1000, OFF = 320, UP = 340, DOWN = 240, SX = 262, DUR = 8.6;
const T_UP = 0.5, T_SUM = 5.0, T_PUSH = 5.5, T_BOT = 7.9;

// Each route: the line of the slope from camp (0, 0) to the summit flat and off the far side,
// what kind of ground it is, and what stands on top.
const ROUTES = {
  bluebird: { kind: 'ridge', top: 'Weather station', pts: [[0, 0], [50, -10], [110, -52], [170, -100], [230, -140], [262, -150], [304, -150], [330, -112], [400, -10], [500, 120]] },
  tks: { kind: 'icefall', top: 'The hut', pts: [[0, 0], [40, -6], [58, -30], [96, -32], [112, -64], [152, -66], [168, -100], [208, -102], [224, -130], [262, -138], [304, -138], [330, -100], [400, 0], [500, 120]] },
  'hevy-garmin-sync': { kind: 'ice', top: 'Weight bench', pts: [[0, 0], [70, -14], [122, -30], [138, -112], [152, -126], [230, -146], [262, -150], [304, -150], [330, -112], [400, -10], [500, 120]] },
  trailhead: { kind: 'bridge', top: 'Survey marker', gap: [150, 176], pts: [[0, 0], [80, -30], [140, -64], [150, -66], [176, -72], [230, -128], [262, -146], [304, -146], [330, -110], [400, -10], [500, 120]] },
  yggdrasil: { kind: 'ladder', top: 'The world tree', gap: [130, 160], pts: [[0, 0], [70, -20], [130, -56], [160, -76], [220, -124], [262, -146], [304, -146], [330, -110], [400, -10], [500, 120]] },
  'kubernetes-manifests': { kind: 'wands', top: 'The cairn', pts: [[0, 0], [90, -26], [170, -74], [230, -120], [262, -140], [304, -140], [330, -104], [400, 0], [500, 120]] }
};
const hOf = (pts, x) => { if (x <= 0) return 0; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return lerp(y0, y1, (x - x0) / (x1 - x0)); } return pts[pts.length - 1][1]; };

function paint(cfg, seed) {
  const S = new Strip(W, UP, DOWN), { pts, kind, gap } = cfg;
  for (let sx = 0; sx < W; sx++) {
    const x = sx - OFF, inGap = gap && x > gap[0] && x < gap[1];
    const y0 = Math.round(hOf(pts, x) + (x > 0 && x < SX ? 1.5 * (vnoise(x / 7, 1, seed) - 0.5) : 0)), slope = hOf(pts, x + 3) - hOf(pts, x - 3);
    const steep = slope < -9, far = slope > 2;
    for (let y = inGap ? y0 + 6 : y0; y < DOWN; y++) {
      const d = y - y0; let c;
      if (inGap && d < 80) { const e = Math.min(x - gap[0], gap[1] - x); if (e > 3 + d * 0.06 + 2 * vnoise(y / 5, x, seed + 1)) continue; c = pick('glac', 0.42 - d * 0.006 + (x - gap[0] < 6 ? 0.2 : -0.1), sx, y); }
      else if (kind === 'ice' && steep && d < 26) c = Math.abs(frac(y / 9 + vnoise(x / 3, 1, seed + 2)) - 0.5) < 0.06 ? R.glac[1] : pick('glac', 0.5 - d * 0.014 + 0.3 * (vnoise(x / 2, y / 14, seed + 3) - 0.5), sx, y);
      else if (kind === 'icefall' && steep && d < 30) c = (y % 6 === 0) ? R.glac[1] : pick('glac', 0.62 - d * 0.012 + 0.2 * (vnoise(x / 3, y / 3, seed + 4) - 0.5), sx, y, 0.5);
      else if (far && d > 3 + 5 * vnoise(sx / 5, y / 9, seed + 5) && vnoise(sx / 7, y / 26, seed + 10) > 0.3) c = Math.abs(frac(sx / 9 + vnoise(sx / 30, y / 30, seed + 11)) - 0.5) < 0.05 ? R.granite[0] : pick('granite', 0.34 + 0.3 * (vnoise(sx / 2.4, y / 14, seed + 6) - 0.5) - d * 0.0015, sx, y, 0.8);
      else if (!far && d > 9 && kind !== 'wands' && fbm((sx + y * 1.6) / 46, (y - sx * 0.25) / 9, seed + 5, 3) > 0.63) c = pick('granite', 0.62 - 0.5 * frac((y - sx * 0.25) / 9) + 0.2 * (vnoise(sx / 3, y / 3, seed + 6) - 0.5), sx, y, 0.8);
      else c = d < 1 ? R.snow[far ? 3 : 4] : far ? pick('glac', 0.72 - d * 0.004 + 0.12 * (vnoise(sx / 9, y / 4, seed + 7) - 0.5), sx, y, 0.6) : (Math.abs(frac((y + sx * 0.3) / 13 + 0.4 * vnoise(sx / 20, y / 20, seed + 8)) - 0.5) < 0.03 && d > 4 ? R.snow[2] : pick('snow', 0.86 + slope * 0.02 - d * 0.002 + 0.14 * (vnoise(sx / 8, y / 5, seed + 9) - 0.5), sx, y, 0.5));
      S.set(sx, y, c);
    }
    if (!inGap) S.set(sx, y0 - 1, INK);
  }
  if (kind === 'ridge') for (let x = 236; x < 300; x++) { const y0 = Math.round(hOf(pts, x)); for (let k = 0; k < 4 - Math.abs(x - 300) * 0.02; k++) S.set(x + OFF + k + 6, y0 + k + (x > 292 ? x - 292 : 0), R.snow[4]); }
  return S;
}

// What stands on each summit. Small sprites, drawn where he stops.
function ell(b, cx, cy, rx, ry, fn) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const nx = (x - cx) / rx, ny = (y - cy) / ry; if (nx * nx + ny * ny <= 1) b.set(x, y, fn(nx, ny, x, y)); } }
const TOPS = {
  ridge(f) { const b = new BM(20, 34); b.ox = 10; b.oy = 33; for (let y = 6; y < 34; y++) b.set(10, y, R.rock[y & 7 ? 3 : 2]); for (let x = 6; x < 15; x++) { b.set(x, 33, R.rock[1]); b.set(x, 20, R.rock[2]); } for (let y = 21; y < 27; y++) for (let x = 12; x < 18; x++) b.set(x, y, y === 21 ? R.white[1] : R.navy[2]); for (let y = 15; y < 20; y++) for (let x = 3; x < 9; x++) b.set(x, y, R.white[x === 3 ? 0 : 1]); const a = [[-5, 0], [-3, -1], [0, -1], [3, -1]][f & 3]; for (const s of [-1, 1]) { thick(b, 10, 6, 10 + s * a[0] + (s > 0 ? a[1] * -3 : 0), 6 + (s > 0 ? 0 : 0), 1, R.rock[3]); b.set(10 + s * (4 + (f & 1)), 5, R.red[1]); b.set(10 + s * (4 + (f & 1)), 6, R.red[0]); } b.set(10, 3, R.rock[4]); b.set(11, 2, R.red[1]); b.set(12, 2, R.red[1]); outline(b, INK); return b; },
  icefall(f) { const b = new BM(30, 28); b.ox = 15; b.oy = 27; for (let y = 10; y < 28; y++) for (let x = 3; x < 27; x++) b.set(x, y, x < 15 ? R.wood[y & 3 ? 3 : 2] : R.wood[y & 3 ? 2 : 1]); for (let j = 0; j < 10; j++) for (let x = 1 + j * 1.3; x < 29 - j * 1.3; x++) b.set(x, 10 - j, j > 7 ? R.snow[4] : R.red[x < 15 ? 1 : 0]); for (let y = 13; y < 26; y++) for (let x = 8; x < 20; x++) b.set(x, y, R.navy[0]); for (let r = 0; r < 4; r++) { for (let x = 9; x < 19; x++) b.set(x, 14 + r * 3, R.rock[1]); b.set(17, 14 + r * 3, f === 'green' ? R.kit[2] : (f + r) & 1 ? R.red[2] : R.red[1]); b.set(15, 14 + r * 3, f === 'green' ? R.kit[1] : R.red[0]); } outline(b, INK); return b; },
  ice() { const b = new BM(34, 20); b.ox = 17; b.oy = 19; for (let x = 6; x < 26; x++) { b.set(x, 13, R.navy[2]); b.set(x, 14, R.navy[1]); } for (const x of [8, 23]) for (let y = 15; y < 20; y++) b.set(x, y, R.rock[2]); for (const x of [5, 6]) for (let y = 3; y < 20; y++) b.set(x, y, R.rock[3]); b.set(7, 4, R.rock[3]); b.set(4, 4, R.rock[3]); outline(b, INK); return b; },
  bridge() { const b = new BM(18, 12); b.ox = 9; b.oy = 11; ell(b, 9, 8, 8, 3.4, (nx, ny, x, y) => pick('rock', 0.6 - ny * 0.4, x, y)); ell(b, 9, 5.4, 3, 1.3, (nx, ny) => ny < -0.2 ? R.yellow[1] : R.mustard[1]); b.set(9, 5, R.mustard[0]); outline(b, INK); return b; },
  ladder() { const rand = rng(77), b = new BM(64, 66); b.ox = 32; b.oy = 65; for (let y = 22; y < 66; y++) { const hw = 3 + (y > 56 ? (y - 56) * 0.8 : 0) + Math.sin(y / 5); for (let dx = -hw; dx <= hw; dx++) b.set(32 + dx + Math.round(2 * Math.sin(y / 9)), y, dx < -0.5 ? R.moss[3] : pick('bark', 0.6 - dx / hw * 0.4, dx | 0, y)); } for (const [dx, dy, len] of [[-1, 30, 16], [1, 34, 14], [-1, 40, 10], [1, 26, 18]]) thick(b, 32, dy, 32 + dx * len, dy - len * 0.6, 2, R.bark[1]); outline(b, INK); for (let k = 0; k < 11; k++) { const a = k / 11 * 6.283, r = k < 3 ? 6 : 17, c = clump(5.5 + rand() * 3, 'moss', rand, 0); const px = Math.round(32 + Math.cos(a) * r * 1.25 - c.cx), py = Math.round(17 + Math.sin(a) * r * 0.62 - c.cy); for (let j = 0; j < c.h; j++) for (let i = 0; i < c.w; i++) { const v = c.d[j * c.w + i]; if (v) b.set(px + i, py + j, v); } } return b; },
  wands() { const b = new BM(20, 20); b.ox = 10; b.oy = 19; for (const [x, y, r, s] of [[10, 16, 5, 1], [6, 16, 3.4, 2], [14, 16, 3, 3], [9, 11, 3.6, 4], [12, 7, 2.8, 5]]) ell(b, x, y, r, r * 0.62, (nx, ny, px, py) => pick('rock', 0.62 - ny * 0.4 - nx * 0.2 + s * 0.02, px, py)); outline(b, INK); return b; }
};
const stone = (() => { const b = new BM(7, 6); b.ox = 3; b.oy = 5; ell(b, 3, 3, 2.6, 1.8, (nx, ny, x, y) => pick('rock', 0.7 - ny * 0.4, x, y)); outline(b, INK); return b; })();

export function makeClimb() {
  const strips = {}, tops = {};
  const slope = (() => { const cfg = { kind: 'slope', pts: [[0, 0], [60, -12], [160, -62], [300, -150], [420, -236], [640, -400]] }; return { cfg, S: paint(cfg, 300) }; })();
  const far = new Strip(900, 200, 60);
  for (let x = 0; x < 900; x++) { const top = -70 - 110 * fbm(x / 60, 1.3, 240, 4) * (0.5 + 0.5 * Math.abs(Math.sin(x / 70))); for (let y = Math.round(top); y < 60; y++) far.set(x, y, y - top < 5 + 4 * vnoise(x / 5, 1, 241) ? R.farsnow[fbm((x + 2) / 60, 1.3, 240, 4) > fbm((x - 2) / 60, 1.3, 240, 4) ? 0 : 1] : pick('far', 0.5 + 0.4 * (vnoise(x / 5, y / 12, 242) - 0.5), x, y)); }
  // The rest of the massif stands behind whichever summit he is on.
  const mid = new Strip(900, 260, 80);
  { const tops = []; for (let k = 0; k < 9; k++) tops.push({ cx: 30 + k * 104 + hash(k, 1, 260) * 40, top: -230 + hash(k, 2, 260) * 150, sl: 1.5 + hash(k, 3, 260) * 1.1 });
    const sky = (s, i, x) => { const dx = Math.abs(x - s.cx); return s.top + dx * s.sl * (x < s.cx ? 1.1 : 0.92) + 6 * (1 - Math.exp(-dx / 2.5)) + 9 * (vnoise(x / 5, i * 3.1, 261) - 0.5) * Math.min(1, dx / 4) - 6 * Math.max(0, vnoise(x / 2.4, i, 262) - 0.62) / 0.38 * Math.min(1, dx / 5); };
    const order = tops.map((s, i) => i).sort((a, c) => tops[a].top - tops[c].top);
    for (const i of order) { const s = tops[i]; for (let x = 0; x < 900; x++) { const t0 = Math.round(sky(s, i, x)); if (t0 >= 80) continue; for (let y = t0; y < 80; y++) {
      const d = y - t0, face = x < s.cx ? 0.16 : -0.18, fr = frac((x - s.cx) / Math.max(3, y - s.top) * 2.6 + 0.3 * vnoise(x / 6, y / 6, 263 + i));
      const rock = Math.abs(x - s.cx - 3 * Math.sin(y / 11 + i * 2)) < 2 + (y - s.top) * 0.09 + 3 * (vnoise(x / 3, y / 5, 264 + i) - 0.5);
      const ice = (!rock && d > 12 + 9 * vnoise(x / 7, 4, 265)) || (fr > 0.62 && fr < 0.76 && d > 6 && !rock);
      mid.set(x, y, ice ? pick('glac', 0.62 + face * 0.8 + 0.2 * (vnoise(x / 4, y / 4, 266) - 0.5), x, y, 0.6) : d < 1 ? R.granite[1] : pick('granite', 0.5 + face + (fr < 0.5 ? 0.1 : -0.1) + 0.16 * (vnoise(x / 3, y / 5, 267) - 0.5), x, y, 0.8)); } } }
  }
  const WALK = [[3, 8.5], [1, 8.5], [-2, 8.5], [-3, 7], [-1, 6.5], [2, 7]];
  const axe = (b, sh, hands, hip) => { const hx = sh[0] + hands[0][0], hy = sh[1] + hands[0][1]; for (let y = hy; y < hip[1] + 9; y++) b.set(hx + 1, y, R.rock[3]); b.set(hx, hy - 1, R.rock[4]); b.set(hx + 2, hy - 1, R.rock[4]); b.set(hx + 3, hy, R.rock[4]); b.set(hx - 1, hy - 1, R.blaze[1]); };
  const tool = (b, sh, hands) => { for (const h of hands) { const hx = sh[0] + h[0], hy = sh[1] + h[1]; b.set(hx + 1, hy - 1, R.rock[3]); b.set(hx + 1, hy - 2, R.rock[3]); b.set(hx + 2, hy - 3, R.rock[4]); b.set(hx + 3, hy - 3, R.rock[4]); b.set(hx + 4, hy - 2, R.rock[4]); b.set(hx, hy, R.blaze[1]); } };
  const fig = {
    walk: [0, 1, 2, 3, 4, 5].map(f => sideFig('alpine', { feet: [WALK[f], WALK[(f + 3) % 6]], hands: [[4, 4 - (f % 3 === 0 ? 1 : 0)], [-2, 6]], bob: f % 3 === 1 ? -1 : 0, lean: 2, held: axe })),
    wind: [0, 1, 2, 3, 4, 5].map(f => sideFig('alpine', { feet: [WALK[f], WALK[(f + 3) % 6]], hands: [[4, 4], [3, 0]], bob: f % 3 === 1 ? -1 : 0, lean: 4, look: 'down', held: axe })),
    ice: [0, 1].map(f => sideFig('alpine', { feet: f ? [[4, 5], [3, 8]] : [[4, 8], [3, 5]], hands: f ? [[6, -9], [5, -3]] : [[6, -3], [5, -9]], lean: 3, look: 'up', elbowFwd: true, held: tool })),
    jump: sideFig('alpine', { feet: [[5, 5], [-4, 6]], hands: [[5, -5], [-4, -3]], lean: 3 }),
    crawl: [0, 1].map(f => sideFig('alpine', { feet: f ? [[1, 6], [-4, 6]] : [[-1, 6], [-2, 6]], crouch: 3, hands: f ? [[7, 5], [4, 6]] : [[5, 6], [6, 5]], lean: 6, look: 'down' })),
    sit: [0, 1].map(f => sideFig('alpine', { feet: [[8, 3], [7, 4 + f]], crouch: 6, lean: -2, hands: [[2, 4], [-4, 2 - f]], held: (b, sh, hands, hip) => { for (let k = 0; k < 7; k++) b.set(sh[0] - 4 - k, sh[1] + 2 - f + k, R.rock[3]); } })),
    stand: frontFig('alpine'), cheer: frontFig('alpine', { swing: -9 }),
    hit: [sideFig('alpine', { hands: [[-3, -2], [-1, 6]], lean: 0 }), sideFig('alpine', { hands: [[7, 1], [-1, 6]], lean: 2 })],
    press: [0, 1].map(f => { const b = new BM(34, 22); b.ox = 17; b.oy = 21; for (let x = 8; x < 22; x++) { b.set(x, 13, R.kit[1]); b.set(x, 12, R.kit[2]); b.set(x, 14, R.kit[0]); } for (let x = 22; x < 28; x++) b.set(x, 13, R.rock[1]); thick(b, 26, 13, 29, 19, 2, R.rock[0]); b.set(30, 20, R.bark[1]); disc(b, 6, 11, 3, (nx, ny) => ny < -0.2 ? R.kit[2] : R.skin[2]); const by = f ? 3 : 8; thick(b, 12, 11, 12, by + 1, 2, R.kit[1]); thick(b, 16, 11, 16, by + 1, 2, R.kit[0]); for (let x = 3; x < 26; x++) b.set(x, by, R.rock[4]); for (const x of [3, 4, 24, 25]) for (let y = by - 3; y <= by + 3; y++) b.set(x, y, R.navy[0]); outline(b, INK); return b; })
  };
  const tents = [makeTent('tent'), makeTent('red')], flag = [makeFlag(0), makeFlag(1)], bb = [bluebird(0), bluebird(1)];
  const squirrel = (() => { const b = new BM(7, 5); b.ox = 3; b.oy = 4; b.set(1, 2, R.blaze[0]); b.set(2, 2, R.blaze[1]); b.set(3, 2, R.blaze[1]); b.set(4, 1, R.blaze[1]); b.set(5, 1, INK); b.set(0, 0, R.blaze[2]); b.set(0, 1, R.blaze[1]); b.set(1, 1, R.blaze[1]); b.set(2, 3, R.blaze[0]); b.set(4, 3, R.blaze[0]); return b; })();

  const st = {}, focus = { x: 0, y: 0 };
  const clouds = [0, 1, 2, 3].map(i => ({ bm: makeCloud(640 + i), x: i * 170 + 40, y: 0.1 + (i % 3) * 0.13 + i * 0.02, v: 2.5 + i * 1.2 }));
  let cam = { x: 0, y: 0 }, last = { camX: 0, base: 0, id: '' }, egg = -99, hutGreen = -99;
  const get = id => { if (!strips[id]) strips[id] = paint(ROUTES[id], 250 + Object.keys(ROUTES).indexOf(id) * 13); return strips[id]; };

  // Distance along the slope, so steep ground takes longer than easy ground.
  const arcs = {};
  function along(id, u) {
    const pts = ROUTES[id].pts;
    if (!arcs[id]) { const a = [0]; for (let x = 1; x <= SX; x++) a.push(a[x - 1] + Math.hypot(1, (hOf(pts, x) - hOf(pts, x - 1)) * 1.5)); arcs[id] = a; }
    const a = arcs[id], want = u * a[SX]; let lo = 0, hi = SX;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m] < want) lo = m; else hi = m; }
    return lo + (want - a[lo]) / Math.max(1e-6, a[hi] - a[lo]);
  }
  function where(id, tau) {
    const cfg = ROUTES[id], pts = cfg.pts;
    if (tau < T_UP) { const x = -34 + 34 * tau / T_UP; return { ph: 'up', x, y: 0, mode: 'walk' }; }
    if (tau <= T_SUM) {
      const x = along(id, (tau - T_UP) / (T_SUM - T_UP)); let y = hOf(pts, x), mode = 'walk';
      const sl = hOf(pts, x + 2) - hOf(pts, x - 2);
      if (sl < -7) mode = 'ice';
      if (cfg.kind === 'ridge') mode = 'wind';
      if (cfg.gap && x > cfg.gap[0] - 4 && x < cfg.gap[1] + 2) {
        const u = (x - cfg.gap[0] + 4) / (cfg.gap[1] - cfg.gap[0] + 6);
        if (cfg.kind === 'bridge') { mode = 'jump'; y = lerp(hOf(pts, cfg.gap[0] - 4), hOf(pts, cfg.gap[1] + 2), u) - Math.sin(u * Math.PI) * 16; }
        else { mode = 'crawl'; y = lerp(hOf(pts, cfg.gap[0]), hOf(pts, cfg.gap[1]), clamp((x - cfg.gap[0]) / (cfg.gap[1] - cfg.gap[0]), 0, 1)) - 2; }
      }
      return { ph: 'up', x, y, mode };
    }
    if (tau < T_PUSH) return { ph: 'up', x: SX, y: hOf(pts, SX), mode: 'stand' };
    if (tau < T_BOT) { const u = (tau - T_PUSH) / (T_BOT - T_PUSH), e = 1 - sq(1 - u) * 0.25 - u * 0.75 + 0, x = 400 * (1 - (u * 0.75 + 0.25 * (1 - sq(1 - u)))); return { ph: 'down', x, y: hOf(slope.cfg.pts, x), mode: 'sit' }; }
    const u = (tau - T_BOT) / (DUR - T_BOT); return { ph: 'down', x: -u * 34, y: 0, mode: 'walk', back: true };
  }

  return {
    name: 'climb',
    dur: () => DUR,
    stops: arg => [{ id: arg.id, at: T_SUM / DUR }],
    elev: (arg, q) => -where(arg.id, q * DUR).y,
    cues(arg) {
      const cfg = ROUTES[arg.id], out = [{ at: T_PUSH / DUR, name: 'glissade' }, { at: (T_BOT - 0.05) / DUR, name: 'step' }];
      if (cfg.gap) for (let tau = T_UP; tau < T_SUM; tau += 0.02) if (where(arg.id, tau).x > cfg.gap[0] - 4) { out.push({ at: tau / DUR, name: cfg.kind === 'bridge' ? 'crack' : 'step' }); if (cfg.kind === 'bridge') out.push({ at: (tau + 0.05) / DUR, name: 'jump' }); break; }
      if (cfg.kind === 'ridge') out.push({ at: 0.6 / DUR, name: 'wind' });
      return out;
    },
    enter(scr, arg, q) { const w = where(arg.id, q * DUR); cam.x = w.x; cam.y = w.y; st.y = null; egg = -99; },
    focus: () => focus,
    pick(sx, sy) {
      if (last.ph !== 'up') return null;
      const cfg = ROUTES[last.id], x = sx + last.camX - OFF, y = sy - last.base, ty = hOf(cfg.pts, SX + 24);
      if (Math.abs(x - SX - 24) < 20 && y < ty + 3 && y > ty - (cfg.kind === 'ladder' ? 66 : 34)) return { label: cfg.top, x: SX + 24 + OFF - last.camX, y: last.base + ty - (cfg.kind === 'ladder' ? 68 : 36), act: 'egg' };
      if (cfg.kind === 'bridge' && Math.abs(x - 163) < 14 && Math.abs(y + 60) < 30) return { label: 'Tech Debt Crevasse', x: sx, y: sy - 8 };
      if (cfg.kind === 'ridge' && x > 100 && x < 250 && Math.abs(y - hOf(cfg.pts, x)) < 8) return { label: 'Race Condition Ridge', x: sx, y: sy - 8 };
      return null;
    },
    act(id, env) { if (id === 'egg' && env.shown && env.t - egg > 5.5) { egg = env.t; env.sfx('egg'); env.found('egg:' + last.id); return true; } return false; },
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t } = env, id = arg.id, cfg = ROUTES[id], kind = cfg.kind;
      const tau = q * DUR, me = where(id, tau), S = me.ph === 'up' ? get(id) : slope.S, pts = me.ph === 'up' ? cfg.pts : slope.cfg.pts;
      cam.x += (me.x - cam.x) * Math.min(1, env.dt * 8); cam.y += (me.y - cam.y) * Math.min(1, env.dt * 6);
      const anchor = scr.narrow ? 0.5 : me.ph === 'up' ? 0.52 : 0.6;
      const camX = Math.round(cam.x + OFF - VW * anchor + env.look.x * 0.4), base = baseline(scr, env.shown, st) - Math.round(cam.y) - (scr.narrow ? 0 : 20);
      last = { camX, base, id, ph: me.ph };
      const up = clamp((tau - T_UP) / (T_SUM - T_UP), 0, 1);
      const storm = kind === 'ridge' && me.ph === 'up' ? 1 - smooth(0.5, 0.86, up) : 0;
      const white = kind === 'wands' && me.ph === 'up' ? smooth(0.08, 0.22, up) * (1 - smooth(0.8, 0.96, up)) : 0;

      // Sky: blue, or the grey of the storm it clears from.
      const sb = R.skyband;
      for (let y = 0; y < VH; y++) {
        const f = clamp((y + 60 + cam.y * 0.3) / 320, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0, row = y * VW;
        // The storm is long banks of cloud driven sideways, dark above and paler toward the horizon; it
        // thins in patches as he gains height.
        for (let x = 0; x < VW; x++) fb[row + x] = storm > 0 && bayer(x, y) < storm * 1.6 - 0.5 * fbm((x + t * 40) / 70, y / 30, 253, 3) ? pick('rock', 0.2 + 0.55 * fbm((x + t * 60) / 110, y / 17, 254, 4) + 0.3 * y / VH, x, y, 1.1) : sb[Math.min(sb.length - 1, b0 + (e > 0.72 && bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0))];
      }
      st.storm = storm;
      // Fair-weather cloud drifting high over the range, when there is sky to see.
      if (storm < 0.3 && white < 0.3) for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v - camX * 0.06) % (VW + 140) + VW + 140) % (VW + 140) - 70, c.y * VH * 0.5 + 12 + cam.y * 0.12);
      drawStrip(scr, far, 200 + camX * 0.15, base + 40 + cam.y * 0.8 + 30);
      drawStrip(scr, mid, 120 + camX * 0.42, base + cam.y * 0.55 + 46, false, 0);
      // A sea of cloud below the summits.
      for (let y = Math.max(0, Math.round(base + cam.y * 0.8 + 60)); y < VH; y++) { const row = y * VW, d = clamp((y - (base + cam.y * 0.8 + 60)) / 80, 0, 1); for (let x = 0; x < VW; x++) { const n = fbm((x + camX * 0.3 + t * 4) / 60, y / 14, 243, 3); if (n > 0.6 - d * 0.3) fb[row + x] = n > 0.68 - d * 0.3 ? R.white[1] : R.sky[4]; } }
      // The icefall's seracs stand behind the route like racks, their lights blinking.
      if (kind === 'icefall' && me.ph === 'up') for (let k = 0; k < 9; k++) {
        const x = 20 + k * 31 + hash(k, 1, 244) * 12, hh = 40 + hash(k, 2, 244) * 34, ww = 13 + hash(k, 3, 244) * 8, gy = hOf(pts, x) + 6, sx = Math.round(x + OFF - camX);
        for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) { const c = j % 6 === 5 ? R.glac[1] : i < 2 ? R.glac[5] : i > ww - 3 ? R.glac[2] : R.glac[j < 2 ? 5 : 3 + ((i + j) & 1 && j % 6 === 2 ? 1 : 0)]; scr.set(sx + i, Math.round(base + gy - hh + j), c); }
        for (let r = 1; r < hh / 6 - 1; r++) { const on = frac(t * (0.7 + hash(k, r, 245)) + hash(r, k, 246)) < 0.6; scr.set(sx + ww - 4, Math.round(base + gy - hh + r * 6 + 2), on ? R.kit[2] : R.kit[0]); if (hash(k, r, 247) < 0.4) scr.set(sx + ww - 6, Math.round(base + gy - hh + r * 6 + 2), frac(t * 2.3 + r) < 0.5 ? R.yellow[1] : R.mustard[0]); }
      }
      drawStrip(scr, S, camX, base, false, R.snow[1]);
      const X = x => Math.round(x + OFF - camX), Y = y => Math.round(base + y);
      // His tracks stay in the snow behind him: boot prints on the way up, one long groove on the way down.
      if (me.ph === 'up') { for (let x = -30; x < me.x - 3; x += 4) { if (cfg.gap && x > cfg.gap[0] - 6 && x < cfg.gap[1] + 6) continue; const y = hOf(pts, x), sl = hOf(pts, x + 2) - hOf(pts, x - 2); if (sl < -7) continue; scr.set(X(x), Y(y) + 2, R.snow[1]); scr.set(X(x) + 1, Y(y) + 2, R.snow[2]); } }
      else if (me.mode === 'sit') for (let x = Math.ceil(me.x) + 4; x < 400; x++) { const y = hOf(pts, x); scr.set(X(x), Y(y) + 2, R.snow[2]); if (x & 1) scr.set(X(x), Y(y) + 3, R.snow[3]); }
      // Spindrift blows off the top.
      if (me.ph === 'up' && white < 0.3) for (let k = 0; k < 34; k++) { const a = frac(t * (0.5 + storm) + k / 34), x0 = SX + 38 + (k % 5) * 3, y0 = hOf(pts, x0) - 1; const x = X(x0 + a * (46 + 30 * storm) + 4 * Math.sin(a * 9 + k)), y = Y(y0 - a * 13 - 3 * Math.sin(a * 5 + k * 2)); if (bayer(x, y) > a * 0.9) scr.set(x, y, a < 0.4 ? R.white[1] : R.snow[3]); }
      // Snow driven flat across everything while the storm lasts.
      if (storm > 0.05) for (let k = 0; k < 150 * storm; k++) { const sp = 220 + hash(k, 1, 255) * 160, x = Math.round(VW + 20 - frac(hash(k, 2, 255) + t * sp / (VW + 40)) * (VW + 40)), y = Math.round(frac(hash(k, 3, 255) + t * 0.11) * VH), len = 2 + (k % 4); for (let j = 0; j < len; j++) scr.set(x + j, y - (j >> 2), j ? R.snow[3] : R.white[1]); }

      if (me.ph === 'up') {
        // The crux of each route.
        if (kind === 'bridge') {
          const [g0, g1] = cfg.gap, broke = clamp((me.x - g0 + 2) / 6, 0, 1), y0 = hOf(pts, g0), y1 = hOf(pts, g1);
          for (let x = g0; x <= g1; x++) { const u = (x - g0) / (g1 - g0), fall = broke > 0 ? sq(Math.max(0, tau - T_UP - (T_SUM - T_UP) * 0.5 - u * 0.25)) * 260 * (0.6 + hash(x, 1, 248)) + (broke > 0 ? 0 : 0) : 0, by = lerp(y0, y1, u) + Math.sin(u * Math.PI) * 3; const drop = me.x > g0 - 2 ? Math.max(0, (me.x - g0 + 2) / (g1 - g0 + 4) - u * 0.5) * 120 * (0.5 + hash(x, 2, 248)) : 0; for (let j = 0; j < 5; j++) scr.set(X(x), Y(by + j + drop), j === 0 ? R.snow[4] : R.snow[2 + (j < 3 ? 1 : 0)]); }
        }
        if (kind === 'ladder') { const [g0, g1] = cfg.gap, y0 = hOf(pts, g0), y1 = hOf(pts, g1); for (let x = g0 - 4; x <= g1 + 4; x++) { const u = (x - g0) / (g1 - g0), y = lerp(y0, y1, u); scr.set(X(x), Y(y), R.rock[4]); scr.set(X(x), Y(y + 2), R.rock[2]); if ((x - g0) % 4 === 0) scr.set(X(x), Y(y + 1), R.rock[3]); } for (const [x, y] of [[g0 - 5, y0], [g1 + 5, y1]]) { scr.set(X(x), Y(y - 3), R.blaze[1]); scr.set(X(x), Y(y - 2), R.rock[3]); scr.set(X(x), Y(y - 1), R.rock[3]); } }
        // The thing on the summit, and whatever it does when clicked.
        const tx = SX + 24, ty = hOf(pts, tx), u = t - egg;
        if (kind === 'icefall') scr.put(TOPS.icefall(t - hutGreen < 8 ? 'green' : Math.floor(t * 3) & 1), X(tx), Y(ty), false);
        else if (kind === 'ridge') scr.put(TOPS.ridge(Math.floor(t * (storm > 0.3 ? 14 : 5)) & 3), X(tx), Y(ty), false);
        else if (kind !== 'wands') scr.put((tops[kind] = tops[kind] || TOPS[kind]()), X(tx), Y(ty), false);
        if (kind === 'wands') { tops.wands = tops.wands || TOPS.wands(); scr.put(tops.wands, X(tx), Y(ty), false); const off = u < 3.4; if (off && u > 0.5) { const a = clamp((u - 0.5) / 0.6, 0, 1), back = clamp((u - 2.4) / 0.7, 0, 1), px = lerp(tx + 2, tx + 16, a - back), py = ty - 14 + (a - back) * 13 - Math.sin((a < 1 ? a : back) * Math.PI) * (a < 1 ? 5 : 12); scr.put(stone, X(px), Y(py), false); } else scr.put(stone, X(tx + 2), Y(ty - 14), false); }
        if (kind === 'ladder') { scr.put(speck(u < 4.5 && u > 3 ? Math.floor(t * 8) & 1 : 0), X(tx), Y(ty - 64), false); if (u < 6) { const lit = Math.floor(clamp(u / 3, 0, 1) * 9), sq2 = clamp(u / 3, 0, 1); for (let k = 0; k < 9; k++) { const a = k / 9, lx = tx + Math.sin(k * 2.1) * (3 + a * 13), ly = ty - 6 - a * 52; if (k < lit && (u < 4.6 || (Math.floor(t * 6) & 1))) { scr.set(X(lx), Y(ly), R.white[1]); scr.set(X(lx) - 1, Y(ly), R.yellow[1]); scr.set(X(lx) + 1, Y(ly), R.yellow[1]); scr.set(X(lx), Y(ly) - 1, R.yellow[1]); scr.set(X(lx), Y(ly) + 1, R.yellow[1]); } } if (u < 3) scr.put(squirrel, X(tx + Math.sin(sq2 * 9 * 2.1 / 1) * (3 + sq2 * 10)), Y(ty - 4 - sq2 * 54), Math.cos(sq2 * 19) < 0); } }
        if (kind === 'icefall' && u < 4) { if (u > 0.45 && hutGreen < egg) hutGreen = t; if (u > 0.45) for (let k = 0; k < 16; k++) { const a = u - 0.45, vx = (hash(k, 1, 249) - 0.4) * 60, vy = -50 - hash(k, 2, 249) * 50, px = tx - 4 + vx * a, py = ty - 12 + vy * a + 70 * a * a, c = [R.jay[2], R.lupine[1], R.kit[2], R.blaze[1], R.teal[2], R.yellow[1], R.red[1], R.white[1]][k & 7]; if (py < ty + 2) { scr.set(X(px), Y(py), c); scr.set(X(px) + 1, Y(py), c); scr.set(X(px), Y(py) + 1, k & 1 ? c : INK); scr.set(X(px) + 1, Y(py) + 1, c); } } }
        if (kind === 'ridge' && u < 4.6) { const a = u * 3.2, r = 14 + (u > 3.4 ? (u - 3.4) * 80 : 0), cxp = me.x + (u < 0.8 ? (0.8 - u) * 120 : 0) + (u > 3.4 ? (u - 3.4) * 60 : 0); scr.put(bb[Math.floor(t * 10) & 1], X(cxp + Math.cos(a) * r), Y(me.y - 26 + Math.sin(a) * 6 - (u > 3.4 ? (u - 3.4) * 50 : 0)), Math.sin(a) > 0); }
        if (kind === 'bridge' && u < 4.5) {
          // The survey marker shows how the world is put together: its pixel grid and every colour in the palette.
          for (let y = 0; y < VH; y++) for (let x = (y % 8 === 0) ? 0 : (8 - (camX % 8)) % 8; x < VW; x += (y % 8 === 0) ? 2 : 8) if ((x + y) & 1 || y % 8) { const i = y * VW + x; fb[i] = LIGHT[fb[i]] === fb[i] ? SHADE[fb[i]] : LIGHT[fb[i]]; }
          for (let i = 1; i < N; i++) for (let j = 0; j < 5; j++) { scr.set(6 + i, 16 + j, i); if (6 + i + 0 < VW && scr.narrow) scr.set(6 + (i % 140), 16 + j + Math.floor(i / 140) * 6, i); }
          if (!st.told || t - st.told > 5) { st.told = t; env.emit({ type: 'say', text: (N - 1) + ' colours, ' + VW + ' x ' + VH + ' pixels, every one drawn in code' }); }
        }
      } else {
        // Camp at the bottom of the glissade.
        scr.put(tents[0], X(-46), Y(-1), false); scr.put(tents[1], X(-66), Y(1), false);
      }
      // Wands mark the way through the whiteout.
      if (kind === 'wands' && me.ph === 'up') {
        for (let y = 0; y < VH; y++) { const row = y * VW; for (let x = 0; x < VW; x++) if (bayer(x + Math.floor(t * 30 + y / 9), y) < white * 0.93) fb[row + x] = fbm((x + t * 60) / 40, y / 20, 250, 2) > 0.5 ? R.snow[4] : R.snow[3]; }
        for (let wx = 20; wx < SX; wx += 38) { if (Math.abs(wx - me.x) > 64 && white > 0.5) continue; const wy = hOf(pts, wx); for (let j = 1; j < 15; j++) scr.set(X(wx), Y(wy - j), R.wood[3]); const fl = Math.floor(t * 6 + wx) & 1; for (let i = 1; i < 5; i++) for (let j = 0; j < 3; j++) scr.set(X(wx) + i, Y(wy - 15 + j + (fl && i > 2 ? 1 : 0)), R.blaze[j === 0 ? 2 : 1]); scr.set(X(wx), Y(wy - 15), R.wood[4]); }
      }

      // Himself.
      const d = me.x, sx = X(me.x), sy = Y(me.y);
      const stopId = env.shown && !env.moving ? env.shown : null, u = t - egg;
      let bm, flip = false, dy = 0;
      if (stopId || me.mode === 'stand') {
        bm = fig.stand;
        if (u < 5) { if (kind === 'icefall') bm = fig.hit[u > 0.3 && u < 0.6 ? 1 : 0]; else if (kind === 'ice' && u > 0.4 && u < 4.2) { bm = null; scr.put(fig.press[Math.floor((u - 0.4) * 1.6) & 1], X(SX + 24), Y(hOf(pts, SX + 24) - 4), false); } else if (kind === 'wands' && u < 1.2) bm = fig.hit[u > 0.35 && u < 0.7 ? 1 : 0]; else if (kind === 'ridge' || kind === 'ladder') bm = u > 3 ? fig.cheer : fig.stand; }
      } else if (me.mode === 'sit') { bm = fig.sit[Math.floor(t * 8) & 1]; flip = true; dy = 2; for (let k = 0; k < 14; k++) { const a = frac(t * 2.4 + k / 14); scr.set(Math.round(sx + 6 + a * 30 + hash(k, 1, 251) * 6), Math.round(sy - 2 - a * (8 + hash(k, 2, 251) * 16) + a * a * 10), a < 0.6 ? R.white[1] : R.snow[3]); } }
      else if (me.mode === 'ice') bm = fig.ice[Math.floor(d / 5) & 1];
      else if (me.mode === 'jump') bm = fig.jump;
      else if (me.mode === 'crawl') bm = fig.crawl[Math.floor(d / 4) & 1];
      else { bm = (me.mode === 'wind' && storm > 0.25 ? fig.wind : fig.walk)[env.moving ? Math.floor(Math.abs(d) / 3.6) % 6 : 1]; flip = !!me.back; }
      if (bm) { scr.put(bm, sx, sy + dy, flip); }
      focus.x = sx; focus.y = sy - 14;
      if (env.done['spire:' + id] && me.ph === 'up') scr.blit(flag[Math.floor(t * 5) & 1], X(SX + 4), Y(hOf(pts, SX + 4)) - 15);

      // Spindrift tearing across the ridge until the weather breaks.
      if (storm > 0) for (let k = 0; k < 90 * storm; k++) { const x = Math.round(((hash(k, 1, 252) * (VW + 80) - t * (180 + hash(k, 3, 252) * 140)) % (VW + 80) + VW + 80) % (VW + 80)) - 40, y = Math.round(hash(k, 2, 252) * VH + 6 * Math.sin(t * 3 + k)); for (let i = 0; i < 3 + (k & 3); i++) scr.set(x + i, y, R.white[1]); }
      // He pushes off in a burst of snow, and the glissade is under way.
      const puff = 1 - Math.abs(tau - (T_PUSH + 0.02)) / 0.28;
      if (puff > 0) for (let y = 0; y < VH; y++) { const row = y * VW; for (let x = 0; x < VW; x++) if (bayer(x, y) < puff * 1.3) fb[row + x] = R.snow[4]; }
    }
  };
}
