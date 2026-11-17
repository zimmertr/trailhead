// Mount Monolith, painted. TJ wanted it at the level of a reference picture of Rainier from the south:
// broad and flat-topped, ribs of rock (cleavers) between glaciers, the glaciers broken by crevasses
// and stepping down in icefalls of blue blocks, a crack round the summit dome, the crater on top,
// Liberty Cap with a dark headwall under it, the Steamboat Prow, and Little Tahoma off the east flank.
// The cleavers, the glaciers' ends, the icefalls and the named features are placed here by hand; from
// the cleavers a small relief is built and lit from the west, so every face is lit or shaded the same
// way. Only the grain (snow in a gully, where a crevasse breaks off) is left to noise.
// The picture is MW by MH map pixels; x = MCX is the summit's column, and the base line is y = MH.
import { R, clamp, lerp, smooth, frac, hash, vnoise, bayer } from './core.js';

export const MW = 600, MH = 360, MCX = 300;

// The outline from the south, [x, y] in the picture: Liberty Cap's shoulder to the west, a broad top
// of three low bumps, a long east ridge down to a saddle and Little Tahoma's sharp tooth beyond it.
const SKY = [[0, 362], [30, 346], [70, 318], [110, 280], [150, 236], [186, 192], [214, 154], [236, 124], [252, 104], [264, 92], [274, 86], [284, 88], [294, 83], [306, 76], [320, 72], [334, 70], [350, 72], [364, 70], [378, 76], [392, 86], [408, 102], [426, 124], [444, 146], [458, 156], [468, 150], [476, 136], [482, 125], [489, 136], [500, 158], [520, 192], [548, 242], [574, 292], [600, 348], [604, 362]];
const along = (pts, x) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return lerp(y0, y1, (x - x0) / (x1 - x0)); } return pts[pts.length - 1][1]; };
export const skyline = x => along(SKY, x);
// The same outline as a share of the summit's height, by distance from the summit's column in map
// pixels: land.js shapes the mountain's heights to it, so the picture fits the ground it is laid on.
export const TOPY = 70;
export const monolithSky = du => clamp((MH - skyline(MCX + du)) / (MH - TOPY), 0, 1);

// The cleavers, west to east, [x, y, half-width]. The fourth is Gibraltar Rock, broad and dark; the
// sixth comes down off Little Tahoma; the Steamboat Prow is the wedge where the fifth meets the top.
const RIDGES = [
  [[238, 126, 2], [204, 190, 6], [164, 250, 9], [124, 310, 12], [94, 362, 14]],
  [[270, 100, 2], [252, 160, 5], [230, 222, 8], [214, 290, 10], [206, 362, 12]],
  [[302, 104, 2], [298, 168, 4], [290, 238, 7], [284, 300, 9], [280, 362, 10]],
  [[340, 82, 3], [350, 120, 9], [362, 160, 13], [369, 210, 12], [373, 270, 10], [378, 362, 11]],
  [[386, 104, 2], [406, 152, 5], [426, 212, 8], [441, 272, 10], [452, 362, 12]],
  [[412, 104, 1.5], [426, 118, 6], [440, 136, 7], [452, 150, 5]],
  [[482, 126, 3], [489, 180, 9], [498, 250, 11], [512, 362, 13]],
  [[524, 198, 3], [550, 262, 8], [576, 330, 11]]
];
// Where the ice ends, glacier by glacier from the west (between cleaver k-1 and k), and the icefalls,
// as a range of distance from the summit.
const SNOUT = [266, 300, 296, 334, 290, 316, 282, 306, 268];
const FALLS = { 2: [128, 186], 3: [150, 214], 4: [96, 150], 7: [120, 160] };
// The middle icefall, the large one low in the centre, is the one the avalanche bares (E5c).
export const MID_FALL = 3;
const SUM = [324, 70];
const rOf = (x, y) => Math.hypot((x - SUM[0]) * 0.72, y - SUM[1]);
// The summit snowfield: above this the glaciers have not begun.
const domeY = x => 96 + 0.0011 * (x - SUM[0]) * (x - SUM[0]);

function ridgeAt(r, y) {
  if (y < r[0][1] || y > r[r.length - 1][1]) return null;
  for (let i = 1; i < r.length; i++) if (y <= r[i][1]) { const [x0, y0, w0] = r[i - 1], [x1, y1, w1] = r[i], t = (y - y0) / (y1 - y0); return [lerp(x0, x1, t), lerp(w0, w1, t)]; }
  return null;
}

// Round 5 (T30): where glacier gi ends, for the moraine lake at its foot. The two cleavers either side of
// it on the row its ice ends (the next one along on the east where a short cleaver stops higher up), the
// column halfway between them, and snout(x): the last row of ice at column x, by the very rule the painting
// uses below. A glacier whose west cleaver stops above its snout row does not reach down that far (the
// painting gives those rows to the glacier west of it), so it has no end of its own here.
export function glacierEnd(gi) {
  const y = SNOUT[gi], l = ridgeAt(RIDGES[gi - 1], y); let r = null;
  for (let k = gi; k < RIDGES.length && !r; k++) r = ridgeAt(RIDGES[k], y);
  if (!l || !r) return null;
  const snout = x => SNOUT[gi] + 10 * vnoise(x / 9, gi, 907) - 6 * Math.sin(Math.PI * clamp((x - l[0]) / (r[0] - l[0]), 0, 1));
  return { gi, mid: Math.round((l[0] + r[0]) / 2), room: (r[0] - r[1]) - (l[0] + l[1]), snout };
}
// The glacier whose foot is above picture column x: the one between the nearest cleavers either side on
// the rows where the ice ends.
export function glacierOver(x) { let best = null; for (let gi = 1; gi < SNOUT.length; gi++) { const e = glacierEnd(gi); if (e && Math.abs(e.mid - x) < e.room / 2 && (!best || Math.abs(e.mid - x) < Math.abs(best.mid - x))) best = e; } return best; }
// The glaciers that end in moraine lakes (T30, TJ): the middle one, with the big icefall, whose lake is the
// new river's source, and the one above the old stream under the east foot (picture column 466, where that
// stream rose in round 4). The map (land.js) and the lake scene (lakeside.js) both read this list.
export const moraineLakes = () => [glacierEnd(MID_FALL), glacierOver(466)].filter(Boolean);

export function paintMonolith() {
  // own marks the mountain proper; the meadow at its foot is only a stand-in for the mockup, and in the
  // game the land's own meadow, trees and flowers are drawn there instead.
  const own = new Uint8Array(MW * MH), d = new Uint8Array(MW * MH), snow = R.snow, ice = R.serac, rock = R.mauve;
  // For each pixel of the middle icefall: its index, the plain snow that would lie there with no icefall,
  // and how far down the icefall it is (0 at its top, 1 at its foot).
  const cover = [];
  // The relief: each cleaver is a ridge with a sharp crest and slopes either side; between them the
  // glaciers lie in troughs. It is only used for light, so it is worked out at every pixel of the picture.
  const relief = new Float32Array(MW * MH), wob = (y, k) => 0.8 + 0.4 * vnoise(y / 7, k, 902);
  for (let y = 0; y < MH; y++) for (let k = 0; k < RIDGES.length; k++) {
    const q = ridgeAt(RIDGES[k], y); if (!q) continue;
    const [rx, rw] = q, W = rw * 2.6 * wob(y, k);
    for (let x = Math.max(0, Math.floor(rx - W)); x <= Math.min(MW - 1, Math.ceil(rx + W)); x++) { const t = 1 - Math.abs(x - rx) / W; if (t > 0) relief[y * MW + x] = Math.max(relief[y * MW + x], rw * 1.3 * Math.pow(t, 1.4)); }
  }
  const nearest = (x, y) => {
    let left = null, right = null, on = null;
    for (let k = 0; k < RIDGES.length; k++) {
      const q = ridgeAt(RIDGES[k], y); if (!q) continue;
      const [rx, rw] = q, dx = x - rx, w = rw * wob(y, k);
      if (Math.abs(dx) < w && (!on || Math.abs(dx) / w < Math.abs(on.dx) / on.w)) on = { k, dx, w };
      if (dx >= 0 && (!left || dx < x - left.x)) left = { x: rx, w: rw, k };
      if (dx < 0 && (!right || -dx < right.x - x)) right = { x: rx, w: rw, k };
    }
    return { left, right, on };
  };
  const snowC = (L, x, y) => snow[clamp(Math.round(L * 4.4 - 0.15 + (bayer(x, y) - 0.5) * 0.75), 0, 4)];
  const rockC = (L, x, y) => rock[clamp(Math.round(L * 3.8 + (bayer(x, y) - 0.5) * 0.7), 0, 4)];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const top = skyline(x); if (y < top) continue;
    own[y * MW + x] = 1;
    const i = y * MW + x, b = bayer(x, y), n = vnoise(x / 11, y / 9, 901), r = rOf(x, y);
    const dR = (relief[y * MW + Math.min(MW - 1, x + 1)] - relief[y * MW + Math.max(0, x - 1)]) / 2;
    // Light from the west: the east side of the mountain and the east face of every rib fall in shadow.
    let L = 0.66 - 0.34 * smooth(-40, 300, x - SUM[0]) + clamp(dR * 0.55, -0.45, 0.4) + 0.06 * (n - 0.5);
    // The upper slopes round over toward the summit and catch more light.
    L += 0.12 * smooth(150, 70, y);
    const { left, right, on } = nearest(x, y), gi = left ? left.k + 1 : 0;
    // Little Tahoma: a dark tooth with a lit west face and snow in its gullies.
    // Its foot is not cut off: lower down, snow takes over the rock patch by patch.
    { const tx = 482, ty = 125, dy = y - ty, hw = 1 + dy * 0.4 * (0.85 + 0.3 * vnoise(y / 6, 1, 930));
      if (dy >= 0 && dy < 80 && Math.abs(x - tx) < hw && vnoise(x / 4, y / 4, 931) > smooth(30, 80, dy)) {
        const west = x < tx - 1, lit = west ? 0.66 - dy * 0.003 : 0.12 + 0.1 * smooth(hw, 0, tx - x);
        d[i] = vnoise(x / 2.2, y / 6, 903) > 0.72 - 0.15 * smooth(20, 60, dy) ? snow[west ? 4 : 2] : rockC(lit, x, y); continue; } }
    // Liberty Cap's north side drops in a dark headwall (after the Willis Wall), with broken ledges of ice.
    { const wy = y - top, wb = 26 + 10 * vnoise(x / 8, 2, 904), sx = smooth(226, 236, x) * smooth(274, 262, x);
      if (wy > 6 && wy < wb * sx) { const ledge = vnoise(x / 10, y / 2.4, 905); d[i] = ledge > 0.7 ? snow[ledge > 0.8 ? 4 : 3] : ledge > 0.64 ? ice[2] : rockC(0.18 + 0.25 * n + 0.15 * smooth(260, 230, x), x, y); continue; } }
    // The crater on the summit: a shallow dish with a bright rim, its far wall in blue shadow.
    { const ex = (x - 330) / 24, ey = (y - 77) / 4.2, e = Math.hypot(ex, ey); if (e < 1.1) { d[i] = e > 0.82 ? snow[4] : ey < 0 ? ice[e > 0.4 ? 3 : 4] : snowC(0.62 + 0.2 * ex, x, y); continue; } }
    const dome = y < domeY(x);
    const snout = SNOUT[gi] + 10 * vnoise(x / 9, gi, 907) - 6 * Math.sin(Math.PI * (left && right ? clamp((x - left.x) / (right.x - left.x), 0, 1) : 0.5));
    const green = smooth(snout + 8 + 16 * vnoise(x / 7, 5, 928), snout + 34, y) * (0.7 + 0.6 * vnoise(x / 14, y / 10, 909));
    // Cleavers. High up they are ridges under snow; rock breaks through lower down, in patches, with
    // snow lingering in the gullies (early summer). In the meadow only their crest stays bare.
    if (on && !dome) {
      const s = on.dx / on.w, rag = 0.4 * (vnoise(x / 3, y / 4, 920 + on.k) - 0.5);
      let bare = lerp(-0.25, 0.95, smooth(118, 290, y)) + rag;
      if (vnoise(y / 16, on.k, 922) < 0.3 && y < 260) bare -= 0.5;
      if (green > 0.6) bare = Math.min(bare, rag + 0.2 - 0.4 * smooth(snout + 40, snout + 70, y));
      if (Math.abs(s) < bare) {
        if (green > 0.6) own[i] = 0;
        const gully = vnoise(x / 2.3, y / 9, 906 + on.k);
        d[i] = gully > 0.72 - 0.18 * smooth(240, 110, y) ? snow[s < 0 ? 4 : 2] : rockC(clamp(0.66 - 0.55 * (s + 1) / 2 + 0.3 * (L - 0.5), 0, 1), x, y);
        continue;
      }
    }
    // Below the ice: a band of dirty ice, then moraine and rock patched with old snow, then meadow with
    // clumps of fir toward the foot, and a stream of melt water wandering down from each snout.
    if (y > snout && !dome) {
      // In the game only a ragged band of moraine is kept; the land's own meadow comes up to meet it.
      if (y > snout + 5 + 14 * vnoise(x / 6, 6, 929)) own[i] = 0;
      if (left && right) { const mid = (left.x + right.x) / 2 + 6 * Math.sin(y / 10 + gi * 2); if (Math.abs(x - mid) < 0.9) { d[i] = ice[(y & 1) ? 2 : 3]; if (green > 0.6) own[i] = 0; continue; } }
      if (y < snout + 2.5) { d[i] = b < 0.55 ? ice[1] : rock[1]; continue; }
      const old = vnoise(x / 4, y / 5, 908);
      if (green > 0.6) { own[i] = 0; const fir = vnoise(x / 6, y / 5, 916) > 0.66; d[i] = fir ? R.conifer[clamp(Math.round(0.5 + 1.6 * L + (b - 0.5)), 0, 3)] : hash(x, y, 917) < 0.04 ? (hash(x, y, 918) < 0.5 ? R.lupine[2] : R.red[2]) : R.grass[clamp(Math.round(0.8 + 2.6 * L + (b - 0.5) * 0.8), 0, 4)]; continue; }
      d[i] = old > 0.72 ? snow[3] : rockC(0.28 + 0.45 * L + 0.2 * (hash(x >> 1, y >> 1, 910) - 0.5), x, y);
      continue;
    }
    // The bergschrund: a broken dark crack round the dome where the glaciers pull away from it.
    const bs = domeY(x) + 4 + 4 * vnoise(x / 16, 1, 911), open = vnoise(x / 7, 3, 912) > 0.3;
    if (open && y >= bs - 0.5 && y < bs + 0.5) { d[i] = snow[4]; continue; }
    if (open && y >= bs + 0.5 && y < bs + 1.6) { d[i] = ice[0]; continue; }
    if (open && y >= bs + 1.6 && y < bs + 2.6) { d[i] = ice[2]; continue; }
    if (dome) { d[i] = snowC(L + 0.04, x, y); continue; }
    // Glaciers. The ice bulges, so each is lit on its west side, and it is shaded where it meets the
    // rock to its east. It flows fastest down the middle, so its crevasses bow downhill.
    const a = left && right ? clamp((x - left.x) / (right.x - left.x), 0, 1) : 0.5;
    L += 0.1 * (0.5 - a) - (right ? 0.22 * smooth(right.w + 4, right.w, right.x - x) : 0);
    const bow = 9 * Math.sin(Math.PI * a), rr = r - bow;
    const fall = FALLS[gi];
    const fj = fall ? 14 * (vnoise(x / 10, gi, 927) - 0.5) : 0;
    // The ice as it would be with no icefall: crevasses in bands, otherwise snow.
    const plain = () => { const sp = 7 + 3 * smooth(140, 280, r), row = rr / sp, fr = frac(row), k = Math.floor(row);
      const zone = vnoise(r / 26, gi * 3.1, 921), seg = vnoise(a * 16 + k * 0.7, k, 915);
      if (zone > 0.55 && seg > 0.5 && a > 0.1 && a < 0.9) { const w = 1 / sp; if (fr < w) return snow[4]; if (fr < 2 * w) return ice[L > 0.45 ? 1 : 0]; if (fr < 3 * w && seg > 0.52) return ice[3]; }
      return snowC(L, x, y); };
    if (fall && rr > fall[0] + fj && rr < fall[1] + fj) {
      const before = d[i];
      // An icefall: blocks stepping down, each with a white top, a blue face lit from the west, a
      // shaded east side and a dark gap under it. Its edges are ragged, not ruled.
      const f0 = fall[0] + fj, f1 = fall[1] + fj, edge = smooth(f0, f0 + 16, rr) * smooth(f1, f1 - 16, rr) * smooth(0.02, 0.2, a) * smooth(0.98, 0.8, a);
      // Seracs: columns of uneven width, each stepped at its own height, so no two rows line up.
      // The columns wander and differ in width, the blocks differ in height, some are missing (deep
      // blue shadow shows through) and some are buried in snow.
      const wv = x / 7 + 1.1 * vnoise(rr / 7, gi, 919) + 0.5 * vnoise(x / 3, rr / 3, 925), col = Math.floor(wv), fx = frac(wv);
      const hgt = 4 + 5 * hash(col, gi, 923), off = hash(col, gi, 924) * hgt, row = Math.floor((rr + off) / hgt), fy = frac((rr + off) / hgt), blk = hash(col, row, 914);
      if (blk < edge * 0.8) {
        const topH = 0.22 + 0.25 * hash(col, row, 926);
        d[i] = fy < topH ? snow[blk < 0.2 ? 3 : 4] : fy > 0.86 ? ice[0] : fx > 0.75 ? ice[1] : fx < 0.2 ? ice[4] : blk < 0.12 ? snow[3] : ice[L > 0.5 ? 3 : 2];
      } else if (edge > 0.25) d[i] = blk < 0.85 ? ice[fy > 0.5 ? 0 : 1] : snowC(L - 0.2, x, y);
      if (d[i] !== before) { if (gi === MID_FALL) cover.push(i, plain(), Math.round(255 * clamp((rr - f0) / (f1 - f0), 0, 1))); continue; }
    }
    // Crevasses: short arcs across the ice, not everywhere: in bands where the glacier bends or steepens.
    d[i] = plain();
  }
  return { w: MW, h: MH, d, own, cx: MCX, cover };
}
