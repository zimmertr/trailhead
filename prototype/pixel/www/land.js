// Round 4's map (ROUND4.md, section 4a), for the scene and for relief.html, which shows it whole.
// The world is a height for every spot (u east, v away from the camera). A spot is drawn at screen
// (u, SY - v - height), nearest first, so ground and mountains are one surface and near slopes hide
// far ones.
import { R, INK, BM, outline, KIND, SHADE, LIGHT, RAMP_OF, STEP_OF, veilTable, TAU, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, pick, catmull } from './core.js';
import { paintMonolith, monolithSky, moraineLakes, MW as PMW, MH as PMH, MCX as PMCX, TOPY as PTOPY } from './monolith.js';
import { blobTree, seaStack, sageBush, charred } from './scenery.js';
import { ferry, whale, sheep, squirrel } from './mapfauna.js';
import { makeDriftwood, makeFlowers, swaying, makeMaple, makeTwisted, makeAspen, makePonderosa, makeSpruce, makeFir, makeConifer, makeSnag, makeBoulder, makeBush, makeFern, makeLog, makeLodgepole, makeJuniper, makeWhitebark, makeShrub } from './sprites.js';

const NW = 1920, SH = 1080, VD = 740, SY = SH + 52;
const rdg = n => 1 - Math.abs(2 * n - 1);
const prof = pts => x => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [xa, ha] = pts[i - 1], [xb, hb] = pts[i]; return lerp(ha, hb, (x - xa) / (xb - xa)); } return pts[pts.length - 1][1]; };
// Proficiency Peak's outline, after Prusik's south face (used below and drawn again in the larch basin, larches.js).
const PP = prof([[-75, 0], [-70, 0.14], [-63, 0.2], [-58, 0.34], [-51, 0.4], [-46, 0.58], [-41, 0.63], [-31, 0.62], [-27, 0.53], [-22, 0.62], [-16, 0.8], [-9, 0.9], [-5, 0.97], [-3, 1], [3, 1], [5, 0.94], [10, 0.9], [15, 0.8], [21, 0.76], [24, 0.68], [29, 0.71], [33, 0.6], [39, 0.62], [44, 0.5], [50, 0.53], [55, 0.4], [61, 0.36], [66, 0.2], [75, 0]]);

export { NW, SH as NH, VD, SY, PP as PROFICIENCY };
// B is the bake (readBake, below): with it, the heights, the water and the picture are read, not worked out.
export function buildLand(B = null) {
// ---- the pieces a layout is made of ---------------------------------------------------------------
const F = [], C = { lakes: [], trails: [] };
// While lift is set, a piece's heights are measured from that ground and not from sea level.
let lift = null;
const add = (mat, u0, u1, v0, v1, fn) => { const l = lift; F.push({ mat, u0, u1, v0, v1, fn: l ? (u, v) => { const h = fn(u, v); return h > 0 ? h + l(u, v) : 0; } : fn }); };
// A single mountain: a cone with a rough foot, jagged if asked.
const horn = (mat, cu, cv, ru, rv, H, o = {}) => add(mat, cu - ru * 1.1, cu + ru * 1.1, cv - rv * 1.1, cv + rv * 1.1, (u, v) => {
  const d = Math.hypot((u - cu) / ru, (v - cv) / rv) + 0.12 * (vnoise(u / 14, v / 14, cu) - 0.5); if (d >= 1) return 0;
  return H * Math.pow(1 - d, o.pow || 0.9) * (1 + (o.jag || 0) * (rdg(vnoise(u / 9, v / 11, cu + 7)) - 0.5));
});
// A range: a ridge running east and west at one depth, whose skyline is a row of blunt pyramids of
// uneven height. env gives the height wanted at each u.
function range(mat, u0, u1, cv, env, seed, o = {}) {
  const r = rng(seed), peaks = [], D = o.front || 56, B = o.back || 40;
  for (let cx = u0; cx <= u1;) { const h = env(cx) * (0.8 + 0.4 * r()), w = h * ((o.wide || 0.55) + 0.3 * r()); peaks.push([cx, h, w * (0.8 + 0.4 * r()), w * (0.8 + 0.4 * r()), 3 + 6 * r()]); cx += w * (0.7 + 0.5 * r()); }
  const high = u => { let best = 0; for (const [cx, h, wl, wr, cap] of peaks) { const t = Math.max(0, Math.abs(u - cx) - cap / 2) / (u < cx ? wl : wr); if (t < 1) best = Math.max(best, h * (1 - Math.pow(t, o.pow || 1.1))); } return best <= 0 ? 0 : Math.max(0, best + (o.jag || 4) * (sq(rdg(vnoise(u / 4, seed, 811))) - 0.5)); };
  add(mat, u0 - 110, u1 + 110, cv - D - 14, cv + B + 8, (u, v) => { const hi = high(u); if (hi <= 0) return 0; const vv = v + 10 * (vnoise(u / 11, seed, 830) - 0.5), f = vv < cv ? (vv - (cv - D)) / D : (cv + B - vv) / B; return f <= 0 ? 0 : hi * Math.pow(f, 0.75); });
}
// A level with a steep edge: a bench, a basin floor, a mesa, a field of ice. tilt lifts its far side.
const plateau = (mat, cu, cv, ru, rv, H, edge = 0.1, tilt = 0) => add(mat, cu - ru * 1.4, cu + ru * 1.4, cv - rv * 1.4, cv + rv * 1.4, (u, v) => (H + tilt * (v - cv)) * smooth(1 + edge, 1, Math.hypot((u - cu) / ru, (v - cv) / rv) + 0.16 * (vnoise(u / 30, v / 20, cu + 3) - 0.5)));
// Mount Monolith, after Rainier: a dome with a nearly flat top, a shoulder to the west and a small
// dark tooth low on the east flank. Its lower slopes run out into the land round it.
let VOLC = null;
const VP = prof([[0, 1], [0.07, 0.985], [0.14, 0.94], [0.25, 0.8], [0.4, 0.58], [0.55, 0.4], [0.7, 0.25], [0.85, 0.11], [1, 0]]);
// The ribs of rock (cleavers) that fan down from below the summit dome, with a glacier between each
// pair. t is 1 on a rib's crest and 0 in the middle of a glacier; each rib has its own strength (amp)
// and they wander a little as they come down, so no two are alike.
function vrelief(u, v) {
  const { cu, cv, ru, rv } = VOLC, du = (u - cu) / ru, dv = (v - cv) / rv, d = Math.hypot(du, dv), a = Math.atan2(dv, du);
  const fan = a * 13 / TAU + 0.5 * (vnoise(du * 3 + 5, dv * 3 + 5, 571) - 0.5) + 0.35 * d * Math.sin(2 * a), k = Math.floor(fan);
  return { d, k, t: 1 - Math.abs(frac(fan) - 0.5) * 2, amp: 0.55 + 0.9 * hash(k & 15, 3, 572), face: Math.abs(Math.sin(a)) };
}
function volcano(cu, cv, ru, rv, H) {
  VOLC = { cu, cv, ru, rv, H };
  add('volc', cu - ru, cu + ru, cv - rv, cv + rv, (u, v) => {
    const du = (u - cu) / ru, dv = (v - cv) / rv, d = Math.hypot(du, dv) + 0.04 * (vnoise(u / 40, v / 40, 559) - 0.5); if (d >= 1) return 0;
    // A round dome, stretched column by column so that what shows against the sky is the outline of the
    // painted mountain (monolith.js).
    const round = VP(Math.abs(du)), want = monolithSky((u - cu) * 300 / ru), fit = round > 0.06 ? clamp(want / round, 0.55, 1.5) : 1;
    const Q = vrelief(u, v), rib = 0.07 * smooth(0.12, 0.3, Q.d) * smooth(0.98, 0.72, Q.d) * Q.amp * (Math.pow(Q.t, 3) - 0.25);
    return H * VP(Math.max(0, d)) * lerp(1, fit, smooth(0.9, 0.3, Math.abs(dv))) * (1 + rib + 0.03 * (vnoise(u / 18, v / 18, 560) - 0.5));
  });
}
// Sideproject Spires, after the Southern Pickets: one wall with six blunt summits, in the order of
// the projects from west to east. It rises from the cirque at its foot; buttresses stand forward.
let SP = null;
// Snow gullies up the wall to the notches between the summits: [offset, how high it reaches, a number to tell them apart].
const GULLY = [[-80, 0.46, 1], [-40, 0.7, 0], [-9, 0.6, 2], [60, 0.56, 1]];
const SUMMITS = [[-94, 0.66, 26, 30, 8], [-60, 0.84, 24, 20, 5], [-24, 1, 26, 22, 9], [10, 0.86, 18, 20, 5], [42, 0.95, 22, 26, 8], [82, 0.7, 24, 34, 10]];
function spires(cu, cv, base, H, thin = 1, wide = 1) {
  SP = { cu, cv, base, H, wide, top: cu + SUMMITS[2][0] * wide, west: SUMMITS[0][0] };
  const high = dx => {
    let best = H * (0.28 + 0.2 * smooth(160, 90, Math.abs(dx)));
    SUMMITS.forEach(([o, hh, wl, wr, cap], k) => { const u = Math.max(0, Math.abs(dx - o) - cap / 2) / (dx < o ? wl : wr), v = H * hh * (1 - 0.3 * Math.pow(u, 1.05)) - (dx - o) * (k & 1 ? 0.12 : -0.1) * (u === 0 ? 1 : 0); if (u < 2 && v > best) best = v; });
    return (best + (5 * sq(rdg(vnoise(dx / 4, 6, 811))) - 2.5 - 9 * smooth(0.74, 0.92, vnoise(dx / 6, 7, 812))) * smooth(0.3, 0.5, best / H)) * smooth(165, 120, Math.abs(dx));
  };
  add('wall', cu - 170 * wide, cu + 170 * wide, cv - 70, cv + 50, (u, v) => {
    const dx = (u - cu) / wide, vv = v + 9 * (vnoise(u / 10, 3, 830) - 0.5) + 7 * Math.max(...SUMMITS.map(([o]) => Math.max(0, 1 - Math.abs(dx - o) / 14)));
    const f = vv < cv ? smooth(cv - 36 * thin, cv - 4, vv) : smooth(cv + 44 * thin, cv, vv);
    return f <= 0 ? 0 : base * smooth(0, 0.3, f) * smooth(165, 120, Math.abs(dx)) + high(dx) * Math.pow(f, 0.7);
  });
}
// Proficiency Peak, after Prusik Peak's south face: a thin fin of granite that shows the camera its
// wall. A lower flat-topped tower on the left, a prow to a small summit block, a serrated ridge right.
let PF = null;
function proficiency(cu, cv, base, w, hgt) {
  PF = { cu, cv, base, w, hgt };
  add('fin', cu - w / 2 - 2, cu + w / 2 + 2, cv - 12, cv + 62, (u, v) => { const p = PP((u - cu) * 150 / w), f = v < cv ? smooth(cv - 8, cv, v) : smooth(cv + 58, cv + 10, v); return p <= 0 || f <= 0 ? 0 : base * smooth(0, 0.4, f) + (hgt * p + 2 * (vnoise(u / 3, 4, 900) - 0.5)) * f; });
}

// Its foot (D9): a fan of talus spilled from the wall onto the step in front, widest at its toe, and a
// patch of old snow lying in the shade where the lower tower meets the prow. d is how far in front of
// the wall's foot a spot lies.
const talusAt = (u, v) => { if (!PF) return 0; const d = PF.cv - 7 - v + 4 * (vnoise(u / 9, 2, 905) - 0.5); if (d < -2 || d > 50) return 0; const dx = u - PF.cu + 8, hw = PF.w * 0.38 + d * 0.6 + 8 * (vnoise(v / 7, 5, 906) - 0.5); return smooth(48, 20, d) * smooth(hw, hw - 22, Math.abs(dx)) * smooth(-2, 2, d); };
const snowPatch = (u, v) => { if (!PF) return false; const d = PF.cv - 7 - v, dx = u - PF.cu; return Math.hypot((dx + 30) / 20, (d - 5) / 8) + 0.35 * (vnoise(u / 4, v / 3, 907) - 0.5) < 1; };
// ---- the layout (ROUND4.md, section 4a) -----------------------------------------------------------
// Above 0 is sea. The shore follows TJ's line (E5b, ROUND4.md section 10): from the foot of the Legacy
// Range at the map's west edge, curving down through what was the middle of the rainforest, to the
// river's mouth by the map's foot. SHORE is that line as [u, v] at the water's edge; it is smoothed
// between its points and runs on straight past its ends. The value is the distance from the line
// times 1.3, the scale the old straight shore had, so the rules that read it (the beach, the stacks,
// the whale's water) keep their meaning.
const SHORE = [[20, 627], [95, 512], [170, 477], [210, 437], [220, 407], [255, 347], [320, 272], [330, 237], [360, 192], [420, 162], [470, 147], [545, 142], [595, 97], [650, 2]];
const SHV = (() => {
  const lo = -320, n = NW + 640, line = prof(SHORE), [a0, a1] = SHORE, [b0, b1] = SHORE.slice(-2).reverse(), raw = new Float32Array(n), V = new Float32Array(n), K = new Float32Array(n);
  for (let k = 0; k < n; k++) { const u = k + lo; raw[k] = u < a0[0] ? a0[1] + (u - a0[0]) * (a1[1] - a0[1]) / (a1[0] - a0[0]) : u > b0[0] ? b0[1] + (u - b0[0]) * (b0[1] - b1[1]) / (b0[0] - b1[0]) : line(u); }
  // Two passes of a running mean round off the corners of the drawn line.
  const mean = (src, dst) => { for (let k = 0; k < n; k++) { let s = 0, m = 0; for (let d = -18; d <= 18; d++) { const j = k + d; if (j >= 0 && j < n) { s += src[j]; m++; } } dst[k] = s / m; } };
  mean(raw, V); mean(V.slice(), V);
  for (let k = 0; k < n; k++) { const s = (V[Math.min(n - 1, k + 1)] - V[Math.max(0, k - 1)]) / 2; K[k] = 1.3 / Math.sqrt(1 + s * s); }
  return { lo, n, V, K };
})();
const coast = (u, v) => { const x = clamp(u - SHV.lo, 0, SHV.n - 1.001), k = Math.floor(x), f = x - k; return (lerp(SHV.V[k], SHV.V[k + 1], f) - v) * lerp(SHV.K[k], SHV.K[k + 1], f) + 40 * (fbm(u / 80, v / 80, 80, 3) - 0.5); };
// The tableland of the dry corner: the shape of the ground (its rise, its mesas, the coulee) and where
// the east rivers may leave the map. Above 0 it rises; it grows higher toward the corner. Since E5g it
// shapes the ground only; what grows and what colour the ground is follow TJ's line (BORDER).
const dryS0 = (u, v) => (u - 1380) / 540 - v / 430 + 0.4 * (fbm(u / 150, v / 120, 207, 3) - 0.5);
const dryAmt0 = (u, v) => smooth(-0.04, 0.2, dryS0(u, v));
// TJ's line (E5g, his marked map of 2026-11-16, section 10): everything east of it is the dry side.
// Traced from his picture into map coordinates, from the foot of the Enchantment plateau at the east
// edge, down past the end of the Stack's bench and the meadow's east half, to the map's foot.
const BORDER = [[1990, 640], [1913, 593], [1783, 551], [1681, 454], [1620, 435], [1544, 392], [1496, 358], [1462, 297], [1442, 254], [1421, 163], [1408, 82], [1402, -60]];
const borderU = v => { for (let k = 1; k < BORDER.length; k++) { const [u0, v0] = BORDER[k - 1], [u1, v1] = BORDER[k]; if (v <= v0 && v >= v1) return lerp(u0, u1, (v0 - v) / (v0 - v1)); } return v > BORDER[0][1] ? BORDER[0][0] + (v - BORDER[0][1]) * 2 : BORDER[BORDER.length - 1][0]; };
// How far east of the line a spot lies, with an uneven edge (TJ: edges of country are never even).
const eastOf = (u, v) => u - borderU(v) + 44 * (fbm(u / 90, v / 70, 211, 3) - 0.5) + 18 * (fbm(u / 22, v / 16, 213, 2) - 0.5);
// North of about 330 the dry side rolls into wild golden grass hills (his NE); south of it is sage (his SE).
const northAmt = (u, v) => smooth(290, 430, v + 70 * (fbm(u / 120, v / 90, 212, 2) - 0.5));
const dryAmt = (u, v) => smooth(-34, 70, eastOf(u, v));
const sageAmt = (u, v) => smooth(30, 150, eastOf(u, v)) * (1 - northAmt(u, v));
// The dry forest (ponderosa, lodgepole, aspen, juniper) runs along the line, from a little way into
// the meadow to well onto the dry side, and up onto the bench under the plateau.
const eastAmt = (u, v) => { const e = eastOf(u, v); return smooth(-120, -40, e) * smooth(240, 140, e); };
// Low ridges through the rainforest, one behind another, with hollows between them for the fog to
// lie in. They run mostly east and west. Since E5b they are only the small folds on the foothills.
const RA = 14, ridges = (u, v) => RA * rdg(fbm((v + 0.25 * u) / 85, u / 260, 31, 2)) * smooth(-24, -110, coast(u, v)) * (1 - 0.45 * smooth(600, 730, v) * smooth(420, 300, u));
const wet = (u, v, e) => smooth(e + 130, e - 110, u);
const edgeE = 590, crestH = (c, a, b) => u => a + b * Math.exp(-sq((u - c) / 150));
// It keeps its last answer (M3): the map is worked out a row at a time, where the depth stays the same.
let feV = NaN, feE = 0;
const forestEdge = v => v === feV ? feE : (feV = v, feE = edgeE - 96 * (fbm(v / 110, 2.3, 3, 3) - 0.5) + 30 * (fbm(v / 24, 7.1, 5, 2) - 0.5) + 44 * smooth(440, 260, v));
// The rainforest's foothills (E5b2), after TJ's two photographs (ROUND4.md section 10) and his note:
// three big rounded hills wholly under forest, in a line down the forest from the top left to the river's
// mouth, with the lake loop's forest stretch in the valley between the two larger. By rule, from that
// stretch of the trail: the largest stands behind it (toward the Legacy Range), the second in front of
// it, and a small third in front of that where the strip of forest between the shore and the forest's
// east edge still has room. Each sits in the middle of the strip at its depth, as wide as about half
// the strip. Their slopes stay gentle enough for trees. Worked out once, when the heights are.
const shoreU = v => { for (let k = 0; k < SHV.n; k++) if (SHV.V[k] <= v) return k + SHV.lo; return NW; };
let HILLS = null;
const hillList = () => {
  if (HILLS) return HILLS;
  const lu = C.lakes[0][0], pts = C.trails[0].filter(([u]) => u < lu - 60), v0 = Math.min(...pts.map(p => p[1])), v1 = Math.max(...pts.map(p => p[1]));
  const hill = (cv, rv, H) => { const a = Math.max(-40, shoreU(cv) + 20), b = forestEdge(cv) - 10, w = b - a; return w < 60 ? null : { cu: (a + b) / 2, cv, ru: 0.42 * w + 30, rv, H, back: 1 }; };
  const A = hill(Math.min(VD - 80, v1 + 112), 120, 70), B = hill(v0 - 96, 100, 62), D = B && hill(B.cv - B.rv - 46, 56, 34);
  // The largest runs back unbroken into the foot of the Legacy Range, so no trough lies behind it.
  if (A) A.back = 1.9;
  return (HILLS = [A, B, D].filter(Boolean));
};
const hills = (u, v) => { let best = 0; for (const { cu, cv, ru, rv, H, back } of hillList()) { const d2 = sq((u - cu) / ru) + sq((v - cv) / (v > cv ? rv * back : rv)); if (d2 < 1) best = Math.max(best, H * sq(1 - d2)); } return best * smooth(forestEdge(v) + 50, forestEdge(v) - 30, u) * offVolc(u, v); };
// A hill ends where Mount Monolith's own foot begins: piled onto the volcano's slope it made a bare ramp
// too steep for trees.
const offVolc = (u, v) => VOLC ? smooth(0.8, 1.02, Math.hypot((u - VOLC.cu) / VOLC.ru, (v - VOLC.cv) / VOLC.rv)) : 1;
// How far up its hill a spot stands, 0 at the foot and 1 on the summit, for the trees (E5b2).
const hillUp = (u, v) => { let best = 0; for (const { cu, cv, ru, rv, back } of hillList()) { const d2 = sq((u - cu) / ru) + sq((v - cv) / (v > cv ? rv * back : rv)); if (d2 < 1) best = Math.max(best, sq(1 - d2)); } return best; };
// The Trailhead (E5h): in the open meadow below the old spot, TJ's orange box of 2026-11-16 traced
// into map coordinates the same way as his coast line and his border.
Object.assign(C, { T: [1098, 186], PK: [660, 440, 210, 110], PK2: [985, 482, 78, 52], LB: [1610, 566, 330, 110], camp: [1022, 526] });
// The Trailhead stands on a low, broad rise: the divide between the water that runs west to the sea
// and the water that runs east into the dry country. The whole land tilts gently toward the camera.
const divU = v => 1075 + (310 - v) * 0.22;
const regional = (u, v) => (8 + 0.02 * v + 10 * Math.exp(-sq((u - divU(v)) / 250))) * smooth(-8, -150, coast(u, v));
// The dry country is a basalt tableland that rises out of the meadow. On it stand the scabland's benches
// (D10): flat-topped mesas of basalt in one or two steps, whose cliffs face the camera, since a rise that
// climbs toward the camera hides its own riser. In the far corner they give way to low, rolling Palouse hills.
const palAmt = (u, v) => { const e = eastOf(u, v); return smooth(50, 150, e) * northAmt(u, v); };
const mesa = (u, v) => { const k = fbm(u / 64, v / 34, 36, 3) + 0.04 * (vnoise(u / 6, v / 4, 37) - 0.5); return 12 * (smooth(0.52, 0.545, k) + smooth(0.63, 0.655, k)) * smooth(0.12, 0.3, dryS0(u, v)) * (1 - palAmt(u, v)); };
const plate = (u, v) => { const raw = 34 * smooth(0.02, 0.4, dryS0(u, v)) + 10 * fbm(u / 80, v / 60, 33, 2) * dryAmt0(u, v), b = raw + mesa(u, v); return b; };
// The glacier: where its middle runs, how wide it is and how high its surface stands, by depth. It
// starts under the Spires' wall, breaks over a rock step (the icefall) and ends in a broad snout in its
// lake (E8c), not a point.
const GL = { top: 616, toe: 503, fall: [556, 578], cu: v => 1072 + 7 * Math.sin((v - 500) / 24), w: v => lerp(30, 112, smooth(522, 592, v)) * smooth(498, 506, v), h: v => 28 + 0.3 * (v - 500) + 10 * smooth(556, 576, v) };
// Base camp's rock island (round 5, T48, TJ: "suddenly camp is surrounded by nunataks, situated on teh
// glacier"): a low island of rock in the middle of the tongue, ten below the foot of the icefall, so the
// map's camp is where the camp scene shows it: on the ice, the icefall behind it, rock either side.
const NUN = (() => { const v = GL.fall[0] - 10; return [Math.round(GL.cu(v)), v, 15, 6]; })();
const isleAt = (u, v) => Math.hypot((u - NUN[0]) / NUN[2], (v - NUN[1]) / NUN[3]) + 0.2 * (vnoise(u / 5, v / 4, 861) - 0.5);
C.isle = NUN; C.island = [NUN[0] + 9, NUN[1] - 3];
const glD = (u, v) => Math.abs(u - GL.cu(v)) + 6 * (vnoise(u / 9, v / 9, 9) - 0.5);
// Between the volcano and the granite the whole ground climbs to the foot of the Spires, so the crest
// is one mass with its neighbours. The glacier's bed is cut into it.
const zone = u => smooth(830, 930, u) * smooth(1330, 1250, u);
const apron = (u, v) => {
  const a = 0.34 * Math.max(0, Math.min(v, 624) - 432 - 16 * (fbm(u / 70, 3, 301, 2) - 0.5)) * zone(u) * smooth(712, 660, v); if (a <= 0) return 0;
  const cut = v > GL.toe - 6 && v < GL.top + 8 ? smooth(GL.w(v) + 22, GL.w(v) - 8, glD(u, v)) : 0;
  return Math.max(1, a + 9 * (fbm(u / 44, v / 40, 302, 3) - 0.5) * smooth(440, 500, v) - 12 * cut);
};
const under = (u, v) => regional(u, v) + 0.11 * Math.max(0, v - 400) * smooth(480, 640, u) * (1 - zone(u)) + ridges(u, v) * wet(u, v, 590) + (u < 760 ? hills(u, v) * smooth(-20, -90, coast(u, v)) : 0) + plate(u, v);
const base = (u, v) => under(u, v) + apron(u, v);
// The forested foothills in front of the Legacy Range are hills(), above (E5b2).
volcano(640, 600, 300, 150, 290);
// Foothills round the volcano's foot, so it rises out of forest and not off a lawn.
for (const [cu, cv, ru, rv, H] of [[500, 478, 96, 44, 42], [770, 474, 84, 40, 38], [858, 530, 70, 52, 46], [420, 540, 80, 52, 44]]) horn('land', cu, cv, ru, rv, H, { pow: 1.15 });
// Round 5 (T30, TJ: "increase the size of reflection lake"): the lake is about 1.6 times as wide and a
// little deeper than round 4's (46 by 14), its south shore where it was so the lakeshore trail still runs
// along it, and the bench it sits on is widened to hold it.
plateau('land', 640, 438, 136, 38, 30, 0.1); C.bench = F[F.length - 1];
C.lakes.push([640, 444, 74, 18, 'lake']);
// Its west end rises gently from behind Little Tahoma, so no peak of it stands alone beside the tooth.
range('crest', 800, NW + 60, 716, u => (112 + 20 * vnoise(u / 70, 1, 64)) * lerp(0.35, 1, smooth(820, 930, u)), 64, { front: 40, back: 18 });
range('crest', 800, 930, 660, crestH(1070, 120, 60), 61);
lift = under; spires(1070, 648, 70, 115, 1, 1.2); lift = null;
range('crest', 1232, 1300, 664, crestH(1070, 120, 60), 62);
range('crest', 1336, NW + 40, 676, u => (112 + 24 * vnoise(u / 90, 2, 65)) * (1 - 0.42 * Math.exp(-sq((u - 1430) / 90))), 63, { pow: 1.25, jag: 6, front: 50 });
lift = under;
add('ice', 940, 1204, GL.toe - 2, GL.top + 6, (u, v) => { const w = GL.w(v), d = glD(u, v); return v < GL.toe || v > GL.top + 4 || d >= w ? 0 : GL.h(v) - 6 * sq(d / w) - 8 * smooth(GL.toe + 8, GL.toe, v); });
add('moraine', NUN[0] - 20, NUN[0] + 20, NUN[1] - 10, NUN[1] + 10, (u, v) => { const e = isleAt(u, v); return e >= 1 ? 0 : GL.h(NUN[1]) + 2 + 2.5 * smooth(1, 0.6, e); });
// What holds the ice in: rock arms of the Spires high up, a moraine on each side lower down. Each
// stands above the ice at its edge and runs out into the slope beyond.
const rim = hi => (u, v) => {
  if (v < GL.toe - 4 || v > GL.top + 10 || (v >= 548) !== hi) return 0;
  const out = glD(u, v) - GL.w(v), wide = lerp(30, 84, smooth(540, 600, v)); if (out < -5 || out > wide) return 0;
  return lerp(GL.h(v) + lerp(7, 30, smooth(520, 610, v)), apron(u, v), Math.pow(clamp(out / wide, 0, 1), 0.8));
};
add('moraine', 930, 1214, GL.toe - 4, 548, rim(false)); add('land', 880, 1264, 548, GL.top + 10, rim(true));
// The shelf base camp is on, on the glacier's west moraine. The lake at the glacier's snout is PRO, below.
plateau('moraine', 1020, 526, 22, 8, 44, 0.35);
lift = null;
// The Spires' glacier ends in its lake (E8c, after TJ's photograph): the snout runs into milky water, and
// the terminal moraine is the low rim that holds the lake on the near side. Ice, water, moraine.
const PRO = (() => { const rv = 8, ru = 32; return { cu: Math.round(GL.cu(GL.toe)), cv: GL.toe - rv + 4, ru, rv }; })(); // its far edge runs a little under the snout, so no rim shows between
C.lakes.push([PRO.cu, PRO.cv, PRO.ru, PRO.rv, 'silt']);
// The granite country: three steps. Larches from the second step up, Proficiency Peak on the second.
plateau('gran', 1745, 598, 150, 42, 110, 0.08); plateau('gran', 1471, 574, 205, 50, 84, 0.08); C.step2 = F[F.length - 1];
plateau('land', 1446, 480, 215, 50, 46, 0.1); plateau('land', 1712, 492, 150, 38, 54, 0.1);
proficiency(1430, 594, 84, 164, 132);
// Tarns: milky on the top step, turquoise on the second, clear on the first.
C.lakes.push([1790, 592, 16, 5, 'milk'], [1702, 600, 20, 6, 'milk'], [1752, 620, 12, 4, 'milk'], [1558, 582, 14, 5, 'tarn'], [1498, 550, 18, 6, 'tarn'], [1346, 572, 22, 7, 'tarn'], [1438, 480, 13, 4, 'pond'], [1562, 488, 15, 5, 'pond']);
// Where water starts. Each has a first stretch drawn by hand (off a lake, over a lip, tarn to tarn),
// after which it finds its own way downhill. w is how much water it carries.
C.src = [
  { w: 3, lead: null }, // set by rule below: off Reflection Lake's lowest shore (E8b)
  { w: 2, lead: null }, // set by rule below: through the moraine rim of the Spires' lake (E8c)
  { w: 0.6, lead: [[952, 536], [950, 520]] },
  { w: 0.8, lead: [[806, 512], [812, 498]] },
  { w: 1, lead: null }, // set by rule below: snowmelt from the foot of the Legacy Range (E5b2)
  { w: 1.6, lead: [[1790, 590], [1745, 588], [1702, 598], [1668, 588], [1632, 578], [1596, 582], [1558, 580], [1528, 566], [1498, 552], [1480, 544], [1466, 524], [1458, 506], [1438, 482], [1424, 462], [1420, 442]] },
  { w: 0.6, lead: [[1562, 486], [1540, 470], [1524, 452], [1516, 436]] },
  { w: 0.5, lead: [[1346, 568], [1336, 548], [1326, 530]] }
];
// Round 5 (T30, TJ: "a second glacier river leaving mount rainier and feeding into Reflection Lake. This
// river and the other river leaving the mountain to the right of it should form from terminal moraine lakes
// ... That then flow into Reflection lake"). Two moraine lakes at the foot of Monolith's glaciers: one under
// the middle glacier (the big one with the icefall, left of the summit's east ridge), the new river's
// source, and one under the glacier above the old stream's head (C.src[3]). Their columns come from the
// painting (monolith.js); each stream starts on the ground straight below its lake and both are stopped
// where they reach Reflection Lake (toLake), so the lake keeps its one outflow at the fall.
const MONO_OX = VOLC.cu - PMCX;
const TARNS = moraineLakes().map((end, k) => ({ end, src: k ? 3 : C.src.length })); C.tarns = TARNS;
for (const t of TARNS) { const u = MONO_OX + t.end.mid; if (t.src === C.src.length) C.src.push({ w: 0.8, lead: [[u, 512], [u + 2, 498]] }); else C.src[t.src].lead = [[u, 512], [u + 6, 498]]; C.src[t.src].toLake = true; }
// Shallow valleys for it to find, either side of the Trailhead's rise, and the coulee that takes the
// east creek out through the dry country.
C.dig = [
  { d: 6, w: 46, pts: [[1086, 474], [1062, 442], [1014, 406], [988, 366], [934, 338], [906, 292], [852, 262], [800, 268], [748, 232], [692, 216], [642, 176], [586, 166], [522, 130], [472, 96], [412, 86], [352, 60]], end: 0.5 },
  { d: 6, w: 46, pts: [[1420, 440], [1386, 400], [1332, 372], [1302, 330], [1322, 286], [1376, 262], [1440, 250], [1500, 232]], end: 11 }
];
// The old stream under Monolith's east foot ran down past the lake to the east. Now it goes to the lake
// (T30): a shallow valley from where its first stretch ends to the lake's east end, for it to find.
{ const t = TARNS.find(t => t.src === 3), L = C.lakes[0]; if (t) { const a = C.src[3].lead[C.src[3].lead.length - 1], b = [L[0] + L[2] - 4, L[1]]; C.dig.push({ d: 6, w: 30, pts: [a, [lerp(a[0], b[0], 0.35), lerp(a[1], b[1], 0.45)], [lerp(a[0], b[0], 0.7), lerp(a[1], b[1], 0.8)], b] }); } }
C.coulee = [[1500, 232], [1556, 204], [1612, 176], [1662, 130], [1726, 106], [1782, 64], [1852, 40], [1926, 8]];
C.trails = [
  [[880, 392], [830, 388], [770, 386], [725, 384], [700, 384], [668, 380], [630, 376], [590, 378], [540, 390], [490, 384], [440, 360], [390, 354], [340, 370], [300, 410], [270, 450], [262, 490], [290, 520], [330, 530], [380, 515], [420, 500], [460, 492], [496, 470], [530, 448], [560, 436], [590, 434], [640, 424], [676, 420], [712, 424], [748, 426], [772, 414], [800, 402], [840, 394], [880, 392]],
  [[978, 438], [962, 462], [984, 482], [1004, 498], [1018, 512], [1022, 526], [1040, 534], [1062, 540], C.island, [1080, 560], [1072, 578], [1068, 600]],
  [[1340, 410], [1372, 436], [1392, 450], [1378, 462], [1402, 474], [1422, 500], [1434, 516], [1432, 524], [1432, 532], [1430, 546], [1432, 562], [1436, 578]]
];
// The lake grew (T30), so the loop's points along its south shore step back to keep 5 clear of the water.
{ const [cu, cv, ru, rv] = C.lakes[0]; for (const p of C.trails[0]) { const x = (p[0] - cu) / ru; if (Math.abs(x) >= 1 || p[1] > cv) continue; const shore = cv - rv * Math.sqrt(1 - x * x) - 5; if (p[1] > shore) p[1] = Math.round(shore); } }
const [TU, TV] = C.T;

// ---- heights --------------------------------------------------------------------------------------
const MATS = ['land', 'volc', 'crest', 'wall', 'ice', 'moraine', 'gran', 'fin'], hg = new Float32Array(NW * VD), mg = new Uint8Array(NW * VD), at = (u, v) => v * NW + u;
if (B) { hg.set(B.hg); mg.set(B.mg); } else {
for (let v = 0; v < VD; v++) for (let u = 0; u < NW; u++) hg[at(u, v)] = coast(u, v) > 0 ? 0 : Math.max(0, base(u, v));
// A hill that the sea has reached since the shore moved (E5b) runs down to the beach, not out of the water.
for (const f of F) { const m = MATS.indexOf(f.mat); for (let v = Math.max(0, Math.floor(f.v0)); v < Math.min(VD, f.v1); v++) for (let u = Math.max(0, Math.floor(f.u0)); u < Math.min(NW, f.u1); u++) { const h = f.fn(u, v) * (u < 760 && f.mat === 'land' ? smooth(-6, -60, coast(u, v)) : 1), i = at(u, v); if (h > hg[i]) { hg[i] = h; mg[i] = m; } } }
}
// The golden hills in the dry side's north-east (E5g): rounded swells rolling one behind another, laid on
// after every piece so they roll over the east end of the bench as well as the low ground.
if (!B) for (let v = 280; v < VD; v++) for (let u = 1300; u < NW; u++) { const i = at(u, v); if (MATS[mg[i]] !== 'land' || hg[i] <= 0) continue; const p = palAmt(u, v); if (p > 0.01) hg[i] += p * 22 * sq(clamp((fbm(u / 42, v / 16, 34, 2) - 0.38) / 0.3, 0, 1)); }
const hAt = (u, v) => hg[at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1))];
// A valley's line is bent as it goes, so no reach of it is ruled. Its two ends stay where they are.
const wander = (all, amp, seed) => { let len = 0; const total = all.reduce((t, p, n) => t + (n ? Math.hypot(p[0] - all[n - 1][0], p[1] - all[n - 1][1]) : 0), 0); return all.map(([u, v], n) => { if (n) len += Math.hypot(u - all[n - 1][0], v - all[n - 1][1]); const a = all[Math.max(0, n - 4)], b = all[Math.min(all.length - 1, n + 4)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, k = amp * (2 * vnoise(len / 70, seed, 77) - 1 + 0.5 * Math.sin(len / 26 + seed)) * smooth(0, 50, len) * smooth(total, total - 50, len); return [u - (b[1] - a[1]) / l * k, v + (b[0] - a[0]) / l * k * 0.6]; }); };
// The rainforest's stream (E5b2) gets a valley of its own: from its snowmelt start at the foot of the
// Legacy Range, down between the largest foothill and Mount Monolith, west along the valley the lake
// loop runs in (between the two larger hills), and out to the sea. By rule from the hills.
{ const [A, Bh] = hillList(), su = Math.round(A.cu + A.ru * 0.8), vm = Bh ? Math.round((A.cv - A.rv + Bh.cv + Bh.rv) / 2) : 440, sh = shoreU(vm), um = Math.round((sh + forestEdge(vm)) / 2);
  C.dig.push({ d: 8, w: 30, pts: [[su, VD - 6], [su - 14, VD - 80], [su - 40, vm + 70], [um + 60, vm + 12], [um, vm], [sh + 40, vm - 6], [sh - 20, vm - 10]], end: 0.6 }); }
for (const g of C.dig) g.line = wander(catmull(g.pts), 16, g.pts.length);
// Valleys: the ground is lowered along a line, most in the middle.
if (!B) for (const { d, w, line } of C.dig) {
  const k = new Float32Array(NW * VD);
  for (const [pu, pv] of line) for (let dv = -w; dv <= w; dv++) for (let du = -w; du <= w; du++) { const u = Math.round(pu + du), v = Math.round(pv + dv), dd = Math.hypot(du, dv); if (dd < w && u >= 0 && v >= 0 && u < NW && v < VD) k[at(u, v)] = Math.max(k[at(u, v)], sq(1 - dd / w)); }
  for (let i = 0; i < k.length; i++) if (k[i] && MATS[mg[i]] === 'land' && hg[i] > 0) hg[i] = Math.max(0.5, hg[i] - d * k[i]);
}
// Then each is cut to an even grade from its start to its end, so the way out never climbs: this is
// what takes the west river through the forest's ridges.
if (!B) for (const { line, end } of C.dig) {
  const all = line, h0 = hAt(all[0][0], all[0][1]), last = all[all.length - 1], h1 = end ?? hAt(last[0], last[1]);
  all.forEach(([pu, pv], n) => { if (n % 2) return; const bed = lerp(h0, h1, n / (all.length - 1)); for (let dv = -56; dv <= 56; dv++) for (let du = -56; du <= 56; du++) { const u = Math.round(pu + du), v = Math.round(pv + dv); if (u < 0 || v < 0 || u >= NW || v >= VD) continue; const i = at(u, v); if (MATS[mg[i]] !== 'land' || hg[i] <= 0) continue; const t = Math.max(0.5, bed + Math.max(0, Math.hypot(du, dv) - 12) * 0.2); if (hg[i] > t) hg[i] = t; } });
}
// The coulee: a flat floor, a cliff, a bench, a second cliff. It deepens as the tableland rises.
if (!B) { const all = catmull(C.coulee); all.forEach(([pu, pv], n) => { const floor = lerp(11, 2.5, n / (all.length - 1)); for (let dv = -44; dv <= 44; dv++) for (let du = -44; du <= 44; du++) { const u = Math.round(pu + du), v = Math.round(pv + dv); if (u < 0 || v < 0 || u >= NW || v >= VD) continue; const d = Math.hypot(du, dv) + 9 * (fbm(u / 23, v / 23, 440, 2) - 0.5), rise = d < 13 ? 0 : d < 18 ? 14 * (d - 13) / 5 : d < 33 ? 14 + (d - 18) * 0.07 : d < 39 ? 15 + 15 * (d - 33) / 6 : 1e9; if (hg[at(u, v)] > floor + rise) hg[at(u, v)] = floor + rise; } }); }
// The lake at the snout: its level a little above the ground in front, the ice let down to meet it, no
// ground in the lake higher than the water, and a low rim of moraine round it where there is no ice.
if (!B) { const { cu, cv, ru, rv } = PRO, LV = hAt(cu, cv - rv - 14) + 4, MI = MATS.indexOf('moraine'), II = MATS.indexOf('ice');
  for (let v = cv - rv - 16; v <= GL.toe + 24; v++) for (let u = cu - ru - 20; u <= cu + ru + 20; u++) { const i = at(u, v), x = (u - cu) / ru, y = (v - cv) / rv, e = Math.hypot(x, y);
    if (mg[i] === II) { const t = LV + 3 + Math.max(0, v - GL.toe) * 1.4; if (hg[i] > t) hg[i] = t; continue; }
    if (e < 1) { if (hg[i] > LV) hg[i] = LV; continue; }
    const out = (e - 1) * lerp(rv, ru, Math.abs(x) / e); if (out > 12) continue; const crest = LV + 2 - Math.max(0, out - 2) * 0.8; if (hg[i] < crest) { hg[i] = crest; mg[i] = MI; } } }
// Still water is level, so a lake flattens the ground under it to the height of its shore.
const ISLE = [C.lakes[0][0] - 14, C.lakes[0][1] + 3], isle = (u, v) => Math.hypot((u - ISLE[0]) / 7, (v - ISLE[1]) / 3.2); C.lakeIsle = ISLE; C.glToe = [GL.cu(GL.toe), GL.toe];
const lakeRim = (u, v) => { for (const [cu, cv, ru, rv, kind] of C.lakes) { const d = Math.hypot((u - cu) / ru, (v - cv) / rv) + 0.16 * (vnoise(u / 9, v / 5, 4) - 0.5); if (d >= 1 && d < 1 + 2.2 / Math.min(ru, 8 * rv)) return kind; } return null; };
const lakeAt = (u, v) => { for (const [cu, cv, ru, rv, kind] of C.lakes) if (Math.hypot((u - cu) / ru, (v - cv) / rv) + 0.16 * (vnoise(u / 9, v / 5, 4) - 0.5) < 1) return kind; return null; };
// The talus fan stands a little proud of the step, highest against the wall.
if (!B && PF) for (let v = PF.cv - 45; v <= PF.cv; v++) for (let u = PF.cu - 110; u <= PF.cu + 110; u++) { const t = talusAt(u, v); if (t > 0 && MATS[mg[at(u, v)]] === 'gran') hg[at(u, v)] += 6 * t * t; }
// Reflection Lake's bench tips down to the west, toward the forest's stream (E8b, TJ: its low end looks to
// be the west side), so the lake's lowest shore is its west end and it drains from there.
const BENCH_TILT = 4;
if (!B) { const [cu, , ru] = C.lakes[0], b = C.bench, u0 = b.u0, u1 = b.u1; for (let v = Math.max(0, Math.floor(b.v0)); v < Math.min(VD, b.v1); v++) for (let u = Math.max(0, Math.floor(u0)); u < Math.min(NW, u1); u++) { const i = at(u, v); if (MATS[mg[i]] !== 'land') continue; hg[i] -= BENCH_TILT * clamp((cu + ru - u) / (cu + ru - u0), 0, 1) * smooth(22, 29, hg[i]); } }
// A lake's level is its lowest shore.
const lowShore = (cu, cv, ru, rv) => { let m = 1e9; for (let a = 0; a < 360; a += 3) { const t = a * Math.PI / 180; m = Math.min(m, hAt(cu + Math.cos(t) * (ru + 2), cv + Math.sin(t) * (rv + 2))); } return m; };
if (!B) for (const [cu, cv, ru, rv] of C.lakes) { const lv = cu === C.lakes[0][0] ? lowShore(cu, cv, ru, rv) : hAt(cu, cv - rv); for (let v = Math.floor(cv - rv - 2); v <= cv + rv + 2; v++) for (let u = Math.floor(cu - ru - 2); u <= cu + ru + 2; u++) if (lakeAt(u, v)) hg[at(u, v)] = lv; }
// Reflection Lake spills over a step (D4): the ground in front of its outlet's lip is dropped, so the
// stream falls instead of running down a slope. The drop fades out sideways and far ahead, where the
// land falls away on its own. lipKeep stops the stream wearing the lip back into a notch.
// The outlet is at the bench's low (west) end. From there the stream takes the shortest way to the
// bench's front edge and spills over it (LIP), heading out that way (LIPD), so the fall faces the eye:
// a fall off the west edge is seen side-on, a grey seam with no water in it.
let LIPD = [0, -1];
const LIP = (() => { const [cu, cv, ru] = C.lakes[0], lvl = hAt(cu, cv), su = cu - ru + 2, sv = cv; let best = null;
  for (let a = 245; a <= 295; a += 5) { const t = a * Math.PI / 180, du = Math.cos(t), dv = Math.sin(t); let d = 0; while (d < 120 && hAt(su + du * d, sv + dv * d) >= lvl - 0.5) d++; if (!best || d < best.d) best = { d, du, dv }; }
  const { d, du, dv } = best; LIPD = [du, dv]; C.src[0].lead = [[su + 8, sv], [su, sv], [su + du * (d - 4), sv + dv * (d - 4)], [su + du * (d + 6), sv + dv * (d + 6)]];
  return [Math.round(su + du * (d - 1)), Math.round(sv + dv * (d - 1))]; })();
const FALL = 10;
const lipKeep = new Uint8Array(NW * VD);
if (!B) { const [lu, lv] = LIP, [du, dv] = LIPD; for (let v = Math.max(0, lv - 84); v <= Math.min(VD - 1, lv + 84); v++) for (let u = Math.max(0, lu - 84); u <= Math.min(NW - 1, lu + 84); u++) {
  const i = at(u, v), ru = u - lu, rv = v - lv, side = Math.abs(ru * dv - rv * du), ahead = ru * du + rv * dv + 1.5 * (vnoise((u * -dv + v * du) / 5, 1, 444) - 0.5); if (MATS[mg[i]] !== 'land' || lakeAt(u, v)) continue;
  if (ahead > 0) hg[i] = Math.max(0.5, hg[i] - FALL * smooth(40, 20, side) * smooth(0, 1.5, ahead) * smooth(76, 26, ahead)); else if (side < 16 && ahead > -10) lipKeep[i] = 1;
} }
// ---- water finds its own way ----------------------------------------------------------------------
// Every spot drains to a lower neighbour. Hollows are filled first, by flooding inward from the sea
// and from the dry corner's edge, lowest ground first, so no stream dead-ends. Worked at half size.
// A little noise on the heights makes a stream wander where the ground is flat.
const trail = new Uint8Array(NW * VD), water = new Uint8Array(NW * VD), routes = [];
if (B) water.set(B.water); else {
  const RW = NW >> 1, RH = VD >> 1, N = RW * RH, fill = new Float32Array(N), down = new Int32Array(N).fill(-2), flow = new Float32Array(N), hk = [], hi = [];
  const push = (k, i) => { let n = hk.length; hk.push(k); hi.push(i); while (n > 0) { const p = (n - 1) >> 1; if (hk[p] <= k) break; hk[n] = hk[p]; hi[n] = hi[p]; n = p; } hk[n] = k; hi[n] = i; };
  const pop = () => { const top = hi[0], k = hk.pop(), i = hi.pop(), len = hk.length; if (len) { let n = 0; for (;;) { let c = 2 * n + 1; if (c >= len) break; if (c + 1 < len && hk[c + 1] < hk[c]) c++; if (hk[c] >= k) break; hk[n] = hk[c]; hi[n] = hi[c]; n = c; } hk[n] = k; hi[n] = i; } return top; };
  let dig = () => 0;
  const rh = i => { const u = (i % RW) * 2, v = ((i / RW) | 0) * 2; return hg[at(u, v)] + 3 * (fbm(u / 40, v / 30, 410, 3) - 0.5) - dig(u, v); };
  const flood = () => { fill.fill(0); down.fill(-2); flow.fill(0); hk.length = 0; hi.length = 0; routes.length = 0;
  for (let i = 0; i < N; i++) { const ru = i % RW, rv = (i / RW) | 0, u = ru * 2, v = rv * 2; if (coast(u, v) > 0) { down[i] = -1; fill[i] = 0; push(0, i); } else if ((rv === 0 || ru === RW - 1) && dryAmt0(u, v) > 0.2) { down[i] = -1; fill[i] = rh(i); push(fill[i], i); } }
  while (hk.length) { const c = pop(), cu = c % RW, cv = (c / RW) | 0; for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) { const nu = cu + du, nv = cv + dv; if ((!du && !dv) || nu < 0 || nv < 0 || nu >= RW || nv >= RH) continue; const n = nv * RW + nu; if (down[n] !== -2) continue; fill[n] = Math.max(rh(n), fill[c] + (du && dv ? 0.0028 : 0.002)); down[n] = c; push(fill[n], n); } }
  // Follow each source down to an outlet, adding its water to every spot it passes.
  for (const s of C.src) { const lead = catmull(s.lead), [lu, lv] = lead[lead.length - 1], cells = []; let i = (Math.round(lv) >> 1) * RW + (Math.round(lu) >> 1), guard = 0; while (i >= 0 && guard++ < 8000) { cells.push(i); flow[i] += s.w; if (down[i] < 0) break;
      // A stream that runs into Reflection Lake (T30): once it comes within the lake's surroundings it goes
      // the last stretch straight into the water, and stops there.
      if (s.toLake) { const [cu, cv, ru, rv] = C.lakes[0], u = (i % RW) * 2, v = ((i / RW) | 0) * 2; if (Math.hypot((u - cu) / (ru + 100), (v - cv) / (rv + 50)) < 1) { let x = u, y = v; const tu = clamp(u, cu - ru * 0.7, cu + ru * 0.7), tv = cv; for (let n = 0; n < 200 && lakeAt(Math.round(x), Math.round(y)) !== 'lake'; n++) { const d = Math.hypot(tu - x, tv - y) || 1; x += 2 * (tu - x) / d; y += 2 * (tv - y) / d; const j = (Math.round(y) >> 1) * RW + (Math.round(x) >> 1); if (j !== cells[cells.length - 1]) { cells.push(j); flow[j] += s.w; } } break; } }
      i = down[i]; } routes.push({ s, lead, cells }); }
  };
  // The Spires' lake spills through a notch in its moraine rim, at the rim's middle, toward the eye.
  C.src[1].lead = [[PRO.cu + 2, PRO.cv], [PRO.cu + 2, PRO.cv - PRO.rv - 1], [PRO.cu + 3, PRO.cv - PRO.rv - 9]];
  // The stream in the rainforest (E5b2) starts as snowmelt at the foot of the Legacy Range, on the east
  // flank of the largest foothill, and finds its own way down between the hills to the sea.
  { const A = hillList()[0], su = Math.round(A.cu + A.ru * 0.8); C.src.find(s => !s.lead).lead = [[su, VD - 6], [su - 7, VD - 40], [su - 14, VD - 80]]; }
  // The stream under the Spires' west arm (E8b, E on TJ's map) seeps out at the foot of the glacier's west
  // moraine, as melt water does: from where it rose before, along its row to the moraine.
  { const s = C.src[2], [u0, v0] = s.lead[0]; let u = u0; while (u < u0 + 120 && MATS[mg[at(u, v0)]] !== 'moraine') u++; if (u < u0 + 120) s.lead = [[u - 3, v0], [Math.round((u + u0) / 2), v0 - 5], ...s.lead.slice(1)]; }
  flood();
  // The lower west river reaches the sea at the bottom edge of the map, out of sight, so the land gives it
  // a shallow valley of its own (D11): from where its trunk first comes within 150 of the near edge, it
  // runs west, falling a little, to the beach. The water is routed again over that valley.
  { const A = routes[1].cells.map(i => [(i % RW) * 2, ((i / RW) | 0) * 2]).find(([, v]) => v < 150); if (A) { const hA = hAt(A[0], A[1]), floor = u => hA * clamp((u - A[0] + 300) / 300, 0, 1) - 6; dig = (u, v) => u > A[0] + 8 ? 0 : Math.max(0, hAt(u, v) - floor(u)) * smooth(14, 4, Math.abs(v - A[1] + 0.06 * (A[0] - u))) * smooth(A[0] + 8, A[0] - 12, u); flood();
    for (let u = Math.max(0, A[0] - 340); u <= A[0] + 30; u++) for (let v = Math.max(0, A[1] - 70); v <= Math.min(VD - 1, A[1] + 50); v++) { const d = Math.abs(v - A[1] + 0.06 * (A[0] - u)), i = at(u, v); if (d > 44 || coast(u, v) > 0 || MATS[mg[i]] !== 'land') continue; const t = Math.max(0.6, floor(u) + 6) + 0.3 * d, k = smooth(A[0] + 30, A[0] - 10, u); if (hg[i] > t) hg[i] = lerp(hg[i], t, k); } } }
  // Read from the land as it was before any stream cut its bed, so every stream sees the same ground.
  const hg0 = hg.slice(), h0 = (u, v) => hg0[at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1))];
  const flatFor = (u, v) => { let m = 0; for (const [du, dv] of [[0, 0], [12, 0], [-12, 0], [0, 10], [0, -10]]) m = Math.max(m, Math.hypot(h0(u + du + 3, v + dv) - h0(u + du - 3, v + dv), h0(u + du, v + dv + 3) - h0(u + du, v + dv - 3)) / 6); return m; };
  const wander = (u, v) => { const i = at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1)); if (MATS[mg[i]] !== 'land' || hg0[i] > 40 || coast(u, v) > -24) return 0; const k = smooth(0.5, 0.18, flatFor(u, v)) * smooth(-24, -64, coast(u, v)); return k && 13 * k * (2 * fbm(u / 34, v / 26, 455, 2) - 1); };
  // T24: the swing fades out over the last stretch before the beach. It used to stop dead where the sand
  // began, and the channel on the sand jumped sideways off the end of the river, a patch of water on its own.
  const wide = f => 0.5 + 0.8 * Math.sqrt(f), flowAt = (u, v) => { let f = 0; const ru = Math.round(u) >> 1, rv = Math.round(v) >> 1; for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) { const nu = ru + du, nv = rv + dv; if (nu >= 0 && nv >= 0 && nu < RW && nv < RH) f = Math.max(f, flow[nv * RW + nu]); } return f; };
  for (const r of routes) {
    const sparse = r.cells.filter((_, n) => n % 4 === 0 || n === r.cells.length - 1).map(i => [(i % RW) * 2, ((i / RW) | 0) * 2]);
    const run = sparse.length > 2 ? catmull([r.lead[r.lead.length - 1], ...sparse.slice(1)]) : [];
    r.pts = [...r.lead.map(([u, v]) => [u, v, wide(r.s.w)]), ...run.map(([u, v]) => [u, v, wide(Math.max(r.s.w, flowAt(u, v)))])];
    // On ground that stays flat for some way round, a river wanders from side to side (D6). The swing
    // is read from where the water is, not how far it has run, so two streams sharing a bed swing as one.
    r.pts = r.pts.map((p, n) => { if (n < r.lead.length || n < 4 || n > r.pts.length - 5) return p; const [u, v] = p, a = r.pts[n - 4], b = r.pts[n + 4], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, s = wander(u, v); return s ? [u - dy / L * s, v + dx / L * s * 0.7, p[2]] : p; });
    // The water keeps a strip of grass between itself and the foot of a cliff (E8b, H on TJ's map): on
    // level ground with a rise of 6 or more within 10 behind it, the channel moves out toward the eye, eased
    // in and out along the stream so the course itself is unchanged and a fall still leaves its lip.
    { const out = r.pts.map(([u, v], n) => { if (n < r.lead.length) return 0; const h = h0(u, v); if (Math.abs(h0(u, v + 2) - h0(u, v - 2)) > 3) return 0; let s = 0; for (let k = 2; k <= 10; k += 2) if (h0(u, v + k) - h - k * 0.6 > 6) s = Math.max(s, 13 - k); return s; });
      r.pts = r.pts.map((p, n) => { let t = 0, c = 0; for (let m = n - 6; m <= n + 6; m++) if (m >= 0 && m < out.length) { t += out[m]; c++; } const o = t / c; return o ? [p[0], p[1] - o, p[2]] : p; }); }
    // Its bed never climbs: where the way out of a hollow crosses higher ground the stream cuts a
    // notch through it, with banks that open out.
    let bed = 1e9;
    for (let [pu, pv, pr] of r.pts) {
      bed = Math.min(bed, hAt(pu, pv)); pr += 1.5 * smooth(-36, 0, coast(pu, pv)); const W = Math.ceil(pr + 9);
      for (let dv = -W; dv <= W; dv++) for (let du = -W; du <= W; du++) { const u = Math.round(pu + du), v = Math.round(pv + dv); if (u < 0 || v < 0 || u >= NW || v >= VD) continue; const i = at(u, v), m = MATS[mg[i]], d = Math.hypot(du, dv); if (d > W || (m !== 'land' && m !== 'moraine' && m !== 'gran')) continue; const t = Math.max(0.4, bed + Math.max(0, d - pr) * 0.9); if (hg[i] > t && !lipKeep[i]) hg[i] = t; /* T17: the lip keeps its height, but the stream still runs over it to the fall */ if (d <= pr + 1 && (hg[i] > 0 || coast(u, v) > -40)) water[i] = Math.max(water[i], d <= pr ? 2 : 1); }
    }
  }
}
// A small lake that a stream has cut through is level again (round 5, T17): the pond on the east creek
// stood 11 above the bed the creek arrived on, so the creek cut a trench through it and only the trench
// showed, a V of water with grass in its middle. The lake settles to its lowest point and the ground
// round it falls to the water in a shallow bowl. Reflection Lake keeps its own lip (LIP, above).
if (!B) for (const [cu, cv, ru, rv] of C.lakes.slice(1)) {
  const e = (u, v) => Math.hypot((u - cu) / ru, (v - cv) / rv) + 0.16 * (vnoise(u / 9, v / 5, 4) - 0.5), box = (fn, pad) => { for (let v = Math.max(0, Math.floor(cv - rv - pad)); v <= Math.min(VD - 1, cv + rv + pad); v++) for (let u = Math.max(0, Math.floor(cu - ru - pad)); u <= Math.min(NW - 1, cu + ru + pad); u++) fn(u, v, at(u, v)); };
  let lo = 1e9, hi = -1e9; box((u, v, i) => { if (e(u, v) < 1) { lo = Math.min(lo, hg[i]); hi = Math.max(hi, hg[i]); } }, 2);
  if (hi - lo < 1) continue;
  box((u, v, i) => { const d = e(u, v); if (d < 1) { hg[i] = lo; return; } const out = (d - 1) * lerp(rv, ru, Math.abs((u - cu) / ru) / d), m = MATS[mg[i]]; if (out < 22 && (m === 'land' || m === 'moraine' || m === 'gran')) hg[i] = Math.min(hg[i], lo + 0.4 + out * 0.55); }, 24);
}
// The heights are kept to 32nds of a pixel, baked or not, so the map read from a bake is the same map.
if (!B) for (let i = 0; i < hg.length; i++) hg[i] = Math.round(hg[i] * 32) / 32;
// The waterfall off the lake's lip, in picture terms: its column, where it leaves the lip and where it lands.
// The lip is found on the ground as it was before the stream cut its bed, which a bake does not keep, so
// a bake carries the fall itself (round 5, T17: read from the baked ground it came out 7 px to the west,
// and the moving white water ran down bare rock beside the painted fall).
const FALLS = B && B.falls ? B.falls : (() => { const [lu, lv] = LIP, [du, dv] = LIPD, top = hAt(lu - du, lv - dv); let k = 0; while (k < 14 && hAt(lu + du * (k + 1), lv + dv * (k + 1)) < hAt(lu + du * k, lv + dv * k) - 0.4) k++; const eu = Math.round(lu + du * k), ev = Math.round(lv + dv * k), bot = hAt(eu, ev);
  return top - bot < 3 ? [] : [{ x: Math.round(lu + du * k / 2), y0: Math.round(SY - lv - top), y1: Math.round(SY - ev - bot), v: ev }]; })();
function stamp(mask, pts, r0, r1) { pts.forEach(([pu, pv], n) => { const rr = lerp(r0, r1, n / (pts.length - 1)), R2 = Math.ceil(rr + 1); for (let dv = -R2; dv <= R2; dv++) for (let du = -R2; du <= R2; du++) { const d = Math.hypot(du, dv), u = Math.round(pu + du), v = Math.round(pv + dv), k = d <= rr ? 2 : d <= rr + 1 ? 1 : 0; if (k && u >= 0 && v >= 0 && u < NW && v < VD && mask[at(u, v)] < k) mask[at(u, v)] = k; } }); }
// The way from the Trailhead to each trail's own country (E5h; TJ chose to lay all three out again when
// the Trailhead moved): the easiest way over the land, worked out on a grid of 4 by 4. Steep ground costs
// far more than flat, running water more again (it is crossed at a footbridge), and ground another trail
// already takes costs less, so the three share a path out of the Trailhead and then fork. Each ends where
// its own country begins: the lake loop's junction, the climb to base camp, the foot of the Stack's
// switchbacks. C.lead holds how many points of each trail are this new approach.
C.lead = [];
{ const G = 4, GW = Math.ceil(NW / G), GH = Math.ceil(VD / G), N = GW * GH, used = new Uint8Array(N), cost = new Float64Array(N), from = new Int32Array(N);
  const cell = (u, v) => clamp(Math.round(v / G), 0, GH - 1) * GW + clamp(Math.round(u / G), 0, GW - 1);
  // Small rises, boggy spots and rocks the eye does not see: an uneven cost over the ground, so on the
  // flat a trail bends the way a worn path does instead of running ruled straight.
  const ok = new Uint8Array(N), wetC = new Uint8Array(N), hC = new Float32Array(N), rough = new Float32Array(N);
  for (let k = 0; k < N; k++) { const u = Math.min(NW - 1, (k % GW) * G), v = Math.min(VD - 1, ((k / GW) | 0) * G), i = at(u, v), m = MATS[mg[i]]; hC[k] = hg[i]; wetC[k] = water[i] ? 1 : 0; rough[k] = 1.6 * sq(smooth(0.42, 0.72, fbm(u / 70, v / 46, 216, 3))); ok[k] = (m === 'land' || m === 'moraine' || m === 'volc' || m === 'gran') && !lakeAt(u, v) && coast(u, v) < -24 ? (m === 'gran' ? 2 : 1) : 0; }
  const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1], [2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
  // avoid: ground another trail already takes costs more, not less, so a new trail keeps its own line (T6).
  const route = (a, b, avoid = false) => {
    const s0 = cell(...a), goal = cell(...b); cost.fill(Infinity); from.fill(-1); cost[s0] = 0;
    const hk = [], hv = []; const push = (k, c) => { let n = hk.length; hk.push(k); hv.push(c); while (n) { const p = (n - 1) >> 1; if (hv[p] <= hv[n]) break; [hk[p], hk[n]] = [hk[n], hk[p]]; [hv[p], hv[n]] = [hv[n], hv[p]]; n = p; } };
    const pop = () => { const k = hk[0], last = hk.length - 1; hk[0] = hk[last]; hv[0] = hv[last]; hk.pop(); hv.pop(); let n = 0; for (;;) { const l = 2 * n + 1, r = l + 1; let m = n; if (l < hk.length && hv[l] < hv[m]) m = l; if (r < hk.length && hv[r] < hv[m]) m = r; if (m === n) break; [hk[m], hk[n]] = [hk[n], hk[m]]; [hv[m], hv[n]] = [hv[n], hv[m]]; n = m; } return k; };
    push(s0, 0);
    while (hk.length) { const k = pop(); if (k === goal) break; const c0 = cost[k], x = k % GW, y = (k / GW) | 0;
      for (const [dx, dy] of STEPS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const j = ny * GW + nx; if (!ok[j] && j !== goal) continue;
        const d = Math.hypot(dx, dy) * G, sl = Math.abs(hC[j] - hC[k]) / d, c = c0 + d * (1 + rough[j] + 14 * sl * sl + (sl > 0.7 ? 30 : 0) + (ok[j] === 2 ? 1 : 0)) * (used[j] ? (avoid ? 3 : 0.5) : 1) + (wetC[j] && !wetC[k] ? 60 : 0);
        if (c < cost[j]) { cost[j] = c; from[j] = k; push(j, c); } } }
    const path = []; for (let k = goal; k >= 0; k = from[k]) path.push(k); path.reverse();
    for (const k of path) used[k] = 1;
    // Every fourth cell, the ends exact; the trail's curve smooths the rest.
    const pts = path.filter((_, n) => n % 4 === 0).map(k => [(k % GW) * G, ((k / GW) | 0) * G]); pts[0] = [...a]; pts.push([...b]); return pts;
  };
  // Round 5 (T6, TJ): exactly three trails leave the Trailhead, and the Proficiency trail its own way east as
  // before. The lake trip stays a loop: out by a new bottom trail that crosses the open meadow to where the
  // old trail goes in under the forest's edge, through the forest to the lake as before, and home along the
  // lakeshore to the bridge junction and down the old trail. The old trail's lower stretch from the
  // junction west to the forest's edge is gone, and so is the way from the junction north to base camp: a new trail goes
  // straight there from the Trailhead, up to the right and north along the east side of the big stand of
  // firs in the middle of the meadow. The new trails are steered by points read from the land.
  // Where two stretches meet, a point within 5 of the next one is dropped, so the curve has no kink there.
  const join = (...parts) => parts.reduce((all, p, n) => n ? [...all.slice(0, -1), ...p] : [...p], []).filter((p, n, a) => n === a.length - 1 || Math.hypot(a[n + 1][0] - p[0], a[n + 1][1] - p[1]) >= 5);
  const loop0 = C.trails[0], spires0 = C.trails[1], ci0 = spires0.findIndex(p => p[0] === C.camp[0] && p[1] === C.camp[1]);
  C.loop0 = loop0;
  const oldLead = route(C.T, loop0[0]), stackLead = route(C.T, C.trails[2][0]);
  // Where the old trail goes into the forest on its way west: its first point west of the forest's edge.
  // (Corrected 2026-11-16: this was the trail's low point 200 further west, deep in the forest, and the new
  // trail hugged the bottom of the map to reach it. TJ's line crosses the meadow to the forest's edge.)
  const westEnd = loop0.reduce((m, p, n) => p[0] < loop0[m][0] ? n : m, 0);
  const iF = loop0.findIndex((p, n) => n > 0 && n < westEnd && p[0] < forestEdge(p[1])), F = loop0[iF];
  // TJ's line leaves the Trailhead going west nearly level and then climbs north-west: a point a little short
  // of halfway, set toward the camera by a third of the whole climb, bows it that way.
  const foot = [Math.round(lerp(TU, F[0], 0.45)), Math.round(lerp(TV, F[1], 0.45) - 0.3 * (F[1] - TV))];
  const bottom = route(foot, F, true); C.bottom = bottom;
  C.trails[0] = join(route(C.T, foot, true), bottom, loop0.slice(iF), oldLead.slice().reverse());
  C.lead[0] = 0;
  // The big stand of firs: where the fir clumps' own noise (as they are planted below) runs thick. Halfway up
  // between the Trailhead and camp, its east edge is where that noise falls off east of the straight line.
  const clump = (u, v) => fbm(u / 46, v / 40, 71, 3), midV = Math.round(TV + 0.5 * (C.camp[1] - TV)), midU = Math.round(TU + 0.5 * (C.camp[0] - TU));
  const east = (() => { let inStand = false; for (let u = midU - 40; u < midU + 260; u += 2) { const c = clump(u, midV); if (c > 0.6) inStand = true; else if (inStand && c < 0.55) return u + 16; } return midU + 60; })();
  // w1 sits up and a little right of the Trailhead, so the trail leaves going up (the sign's arrow), apart
  // from the Proficiency trail going right.
  const w1 = [Math.round(TU + 0.3 * (east - TU)), Math.round(TV + 0.3 * (midV - TV))], w2 = [east, midV];
  // It comes up to camp by the old approach's last stretch, on the moraine's west side, as TJ drew it.
  const iA = Math.max(0, ci0 - 2);
  C.trails[1] = join(route(C.T, w1, true), route(w1, w2, true), route(w2, spires0[iA], true), spires0.slice(iA));
  C.lead[1] = 0;
  C.trails[2] = join(stackLead, C.trails[2]); C.lead[2] = stackLead.length - 1; }
// The Spires trail's tread ends on the moraine, where it meets the ice (C.camp, where the tents stood until
// round 5). Beyond it the way goes on as a boot track: straight across the tongue to base camp on its
// island (C.island), and from there up the ice (D13), as in round 3: it switches back and forth up the fall
// line, a trench as wide as the trail that narrows toward the wall, and over its last fifth breaks up into
// single prints. track: 2 on its floor, 1 on its edge. trackF: how far along it a spot is, 1 where it
// leaves the moraine to 201 at its end. TRACK_UP: its middle line from the island up, for the headlamps (E8).
const TRACK_UP = [], trailPts = [], track = new Uint8Array(NW * VD), trackF = new Uint8Array(NW * VD);
C.trails.forEach((t, k) => {
  const ci = k === 1 ? t.findIndex(p => p[0] === C.camp[0] && p[1] === C.camp[1]) : -1;
  const all = catmull(ci > 0 ? t.slice(0, ci + 1) : t); stamp(trail, all, 1.9, 1.9); trailPts.push(...all);
  if (ci <= 0) return;
  const up = catmull(t.slice(ci)), L = up.reduce((s, p, n) => n ? s + Math.hypot(p[0] - up[n - 1][0], p[1] - up[n - 1][1]) : 0, 0); let len = 0;
  const far = p => Math.hypot(p[0] - C.island[0], p[1] - C.island[1]), isl = up.reduce((m, p, n) => far(p) < far(up[m]) ? n : m, 0); let fI = 0;
  up.forEach(([pu, pv], n) => {
    if (n) len += Math.hypot(pu - up[n - 1][0], pv - up[n - 1][1]);
    if (n === isl) fI = len / L;
    const f = len / L, zz = n < isl ? 0 : 6 * (4 * Math.abs(frac((len - fI * L) / 26 + 0.25) - 0.5) - 1) * smooth(fI + 0.03, fI + 0.18, f), rr = lerp(1.9, 0.8, f), R2 = Math.ceil(rr + 1);
    if (n >= isl) TRACK_UP.push([pu + zz, pv]);
    for (let dv = -R2; dv <= R2; dv++) for (let du = -R2; du <= R2; du++) { const d = Math.hypot(du, dv), u = Math.round(pu + zz + du), v = Math.round(pv + dv), kk = d <= rr ? 2 : d <= rr + 1 ? 1 : 0; if (kk && u >= 0 && v >= 0 && u < NW && v < VD && track[at(u, v)] < kk) { track[at(u, v)] = kk; trackF[at(u, v)] = 1 + Math.round(f * 200); } }
  });
});
// Near its end the boot track breaks up into single prints: true in the gaps between them.
const printGap = i => { const tf = (trackF[i] - 1) / 200; return tf > 0.8 && Math.floor(tf * 70) % 3 === 0; };
// Where a trail crosses running water there is a footbridge: the stretch of trail over the water and a
// few steps of bank at either end, as round 3 had them (D4).
const BRIDGES = [];
for (const t of C.trails) {
  const P = catmull(t); let run = null;
  const end = () => { if (run) { const pts = P.slice(Math.max(0, run[0] - 9), run[1] + 10).map(([u, v]) => [u, Math.round(SY - v - hAt(u, v)), v]); const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); BRIDGES.push({ pts, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), v0: Math.min(...pts.map(p => p[2])), v1: Math.max(...pts.map(p => p[2])) }); } run = null; };
  P.forEach(([u, v], n) => { const i = at(Math.round(u), Math.round(v)); if (water[i] && !lakeAt(u, v)) { if (!run) run = [n, n]; run[1] = n; } else if (run && n - run[1] > 30) end(); });
  end();
}
const nearTrail = (u, v, r) => { for (let i = 0; i < trailPts.length; i += 3) { const p = trailPts[i]; if (Math.abs(p[0] - u) < r && Math.abs(p[1] - v) < r) return true; } return false; };
// The fire lookout (E5j, TJ: on a summit cleared of trees; round 5, T10: on Off By One Peak): the top of the
// highest foothill, where no trail crosses. The top is the hill's crest as the picture shows it, the spot
// that stands highest on the picture, not its highest ground: the big hill runs back into the Legacy Range,
// so its highest ground lies halfway down its face as drawn. Its top is cleared: grass and a little rock,
// and nothing that grows stands on it.
const LOOK = (() => {
  for (const h of [...hillList()].sort((a, b) => b.H - a.H)) {
    let top = null, hi = -1;
    for (let v = Math.round(h.cv - h.rv * 0.6); v <= Math.min(VD - 16, h.cv + h.rv * h.back); v += 2) for (let u = Math.round(h.cu - h.ru * 0.6); u <= h.cu + h.ru * 0.6; u += 2) {
      if (u < 8 || v < 8 || u >= NW - 8 || water[at(u, v)] || nearTrail(u, v, 16)) continue; const y = v + hAt(u, v); if (y > hi) { hi = y; top = [u, v]; } }
    if (!top) continue;
    const [u, v] = top; let seen = true; for (let w = 0; w < v - 2 && seen; w++) if (w + hAt(u, w) >= hi) seen = false;
    if (seen) return top;
  }
  return null;
})();
// The clearing reaches further behind the tower than in front, so no crown stands against its cab on the skyline.
const lookAmt = (u, v) => LOOK ? smooth(1.05, 0.65, Math.hypot((u - LOOK[0]) / 21, (v - LOOK[1]) / (v > LOOK[1] ? 24 : 14))) : 0;

// ---- what the ground is made of -------------------------------------------------------------------
const wob = (u, v, s, a) => a * (fbm(u / 70, v / 60, s, 3) - 0.5);
const ell = ([cu, cv, ru, rv], u, v) => Math.hypot((u - cu) / ru, (v - cv) / rv);
const parkAmt = (u, v) => Math.max(smooth(1.25, 0.8, ell(C.PK, u, v) + wob(u, v, 202, 0.4)), smooth(1.2, 0.8, ell(C.PK2, u, v) + wob(u, v, 203, 0.4)));
// How thick the flowers grow (round 5, T21): one field that every flower placement reads, in four levels,
// each found by rule from the land so it follows the land if that changes.
//   most (1):      from Mount Monolith's foot down round Reflection Lake and its bench, and across to base camp
//   medium (0.5):  along the rivers, as far as the dry side
//   small (0.25):  the open meadow round the Trailhead, and the meadow's corner by the forest at the map's foot
//   sparse (0.06): the rest of the open meadows. None in the forest, the burn, the larches or the dry side.
// RIVD is how far the nearest water is, on a grid of 4 px, counted to 60 px.
const RIVD = (() => { const G = 4, GW = Math.ceil(NW / G), GH = Math.ceil(VD / G), D = new Uint8Array(GW * GH).fill(15);
  for (let v = 0; v < VD; v++) for (let u = 0; u < NW; u++) if (water[v * NW + u]) D[(v >> 2) * GW + (u >> 2)] = 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const i = y * GW + x; let d = D[i]; if (x && D[i - 1] + 1 < d) d = D[i - 1] + 1; if (y && D[i - GW] + 1 < d) d = D[i - GW] + 1; D[i] = d; }
  for (let y = GH - 1; y >= 0; y--) for (let x = GW - 1; x >= 0; x--) { const i = y * GW + x; let d = D[i]; if (x < GW - 1 && D[i + 1] + 1 < d) d = D[i + 1] + 1; if (y < GH - 1 && D[i + GW] + 1 < d) d = D[i + GW] + 1; D[i] = d; }
  return (u, v) => G * D[clamp(v >> 2, 0, GH - 1) * GW + clamp(u >> 2, 0, GW - 1)]; })();
const flowerMost = (u, v) => { const L = C.lakes[0], K = C.camp, ax = L[0] + L[2], ay = L[1], bx = K[0] - 30, by = K[1] - 40, t = clamp(((u - ax) * (bx - ax) + (v - ay) * (by - ay)) / (sq(bx - ax) + sq(by - ay)), 0, 1);
  return Math.max(smooth(1.5, 1.32, ell([VOLC.cu, VOLC.cv, VOLC.ru, VOLC.rv], u, v) + wob(u, v, 202, 0.3)) * smooth(690, 640, v + hAt(u, v)),
    smooth(1.2, 0.8, Math.hypot(u - lerp(ax, bx, t), (v - lerp(ay, by, t)) * 1.5) / 78 + wob(u, v, 203, 0.4))); };
const flowerAmt = (u, v) => { const most = flowerMost(u, v); if (most >= 1) return 1;
  const meadow = forestAmt(u, v) < 0.2 && dryAmt(u, v) < 0.2 && larchAmt(u, v) < 0.2 && burnAmt(u, v) < 0.2, fe = forestEdge(v);
  return Math.max(most, 0.5 * smooth(42, 18, RIVD(Math.round(u), Math.round(v)) + wob(u, v, 207, 16)) * smooth(0.5, 0.15, dryAmt(u, v)),
    meadow ? Math.max(0.06, 0.25 * Math.max(smooth(260, 90, Math.hypot(u - TU, (v - TV) * 1.4)), smooth(1.2, 0.8, Math.hypot((u - fe - 110) / 60, (v - 120) / 48) + wob(u, v, 208, 0.4)))) : 0); };
// The drifts where the flowers grow thickest: a slow field picks lupine, paintbrush, white, or heather and
// plain turf. null elsewhere, where the flowers are scattered by the dice.
const DRIFT = (u, v) => { if (flowerMost(u, v) < 0.45) return null; const k = vnoise(u / 58, v / 34, 470) + 0.08 * (vnoise(u / 9, v / 6, 471) - 0.5); return k < 0.36 ? 'lupine' : k < 0.5 ? 'heather' : k < 0.68 ? 'red' : 'white'; };
const forestAmt = (u, v) => { const e = forestEdge(v); return smooth(e + 40, e - 24, u + 30 * (fbm(u / 30, v / 30, 8, 2) - 0.5)) * smooth(-6, -30, coast(u, v)) * (1 - 0.9 * smooth(1.1, 0.7, ell(C.PK, u, v))); };
// Larches are trees of the high country: none below the second granite step.
const larchAmt = (u, v) => smooth(1.2, 0.85, ell(C.LB, u, v) + wob(u, v, 204, 0.35)) * smooth(62, 74, hAt(u, v));
// The old burn lies on the bench at the foot of the Enchantment plateau's cliff (E5g, TJ's red box), at
// the top of the dry forest, where the rivers off the plateau come down through it.
const burnAmt = (u, v) => { const a = u - 1592, b = v - 492; return smooth(1.1, 0.72, Math.hypot((a * 0.9 - b * 0.43) / 140, (a * 0.43 + b * 0.9) / 62) + wob(u, v, 210, 0.5)) * smooth(100, 84, hAt(u, v)); };
// The fog of the rainforest: nothing in the east, building westward until only white is left. It
// lies in the hollows, so this is the height it fills the forest to: measured from the ground under
// the foothills (E5b), it fills the valleys between them and leaves their summits standing out.
const fogAmt = (u, v) => smooth(edgeE + 20, 90, u + wob(u, v, 201, 60) + 170 * (fbm(u / 150, v / 110, 236, 2) - 0.5)) * (lakeAt(u, v) ? 0 : 1);
const fogTop = (u, v) => { const f = fogAmt(u, v); return f <= 0.02 ? -1 : hAt(u, v) - ridges(u, v) - (u < 760 ? hills(u, v) : 0) + 27 * f - 3 + 5 * f * (fbm(u / 50, v / 30, 220, 2) - 0.5); };
const seaFog = (u, v) => smooth(300, 30, u + wob(u, v, 201, 110)) * (0.75 + 0.5 * fbm(u / 90, v / 40, 226, 2));
const HILLHAZE = veilTable(0.28);
// The colour of one spot of ground. hh is the height of the bit being drawn, which on a cliff runs
// from the cliff's foot to its lip.
function colour(u, v, hh, x, y) {
  const i = at(u, v), mat = MATS[mg[i]], n1 = hash(u, v, 31) - 0.5, uu = clamp(u, 1, NW - 2), vv = clamp(v, 1, VD - 2);
  const du = hg[at(uu + 1, vv)] - hg[at(uu - 1, vv)], dv = hg[at(uu, vv + 1)] - hg[at(uu, vv - 1)], steep = Math.hypot(du, dv) / 2;
  // The sun is in the west: slopes that face west or the camera are lit.
  const L = clamp(0.5 + 0.17 * clamp(du, -2.5, 2.5) + 0.06 * clamp(dv, -2.5, 2.5), 0, 1);
  const cs = coast(u, v);
  if (cs > 0) return cs < 3 + 2 * vnoise(u / 9, v / 9, 85) ? R.sea[5] : pick('sea', 0.75 - smooth(0, 150, cs) * 0.6 + 0.12 * (vnoise(u / 14, v / 3, 86) - 0.5), x, y);
  if (cs > -24 - 8 * vnoise(u / 20, v / 20, 87)) return water[i] ? (water[i] === 1 ? R.sand[0] : hash(x, y, 4733) < 0.07 ? R.glint[(x + y) & 3] : R.water[(x + 2 * y) % 5 < 2 ? 4 : 3]) : R.sand[cs > -4 ? 0 : hash(u, v, 88) < 0.25 ? 1 : 2];
  const lk = lakeAt(u, v);
  if (lk === 'lake' && isle(u, v) < 1) return pick('grass', 0.55 + 0.3 * n1, x, y);
  if (lk) return lk === 'tarn' ? pick('tarn', 0.3 + 0.4 * vnoise(u / 6, v / 3, 8), x, y) : lk === 'silt' ? pick('glac', 0.5 + 0.2 * vnoise(u / 5, v / 3, 8), x, y, 0.5) : lk === 'milk' ? (bayer(x, y) < 0.4 ? R.glac[3] : pick('tarn', 0.7 + 0.25 * vnoise(u / 6, v / 3, 8), x, y)) : pick('water', 0.3 + 0.3 * vnoise(u / 6, v / 2, 8), x, y);
  // Where a trail crosses water there is a footbridge: a deck of planks with a dark edge.
  if (water[i] && trail[i] && mat !== 'ice') return trail[i] === 2 ? ((u + 2 * v) % 3 === 0 ? R.dirt[1] : R.dirt[2]) : R.dirt[0];
  // White water where the stream itself falls, read from the water's own surface, not from its banks,
  // so a low river between high banks near the sea stays blue (D11).
  const wh = (a, b) => water[at(a, b)] ? hg[at(a, b)] : hg[at(uu, vv)], fall = water[i] ? Math.hypot(wh(uu + 1, vv) - wh(uu - 1, vv), wh(uu, vv + 1) - wh(uu, vv - 1)) / 2 : 0;
  if (water[i]) return fall > 0.55 ? (hash(x, y >> 1, 5) < 0.72 ? R.white[1] : R.water[4]) : water[i] === 2 ? (hash(x, y, 9) < 0.08 ? R.glint[(x + y) & 3] : R.water[y & 1 ? 3 : 4]) : R.water[1];
  const rim = lakeRim(u, v); if (rim) return rim === 'lake' ? R.dirt[hash(x, y, 3) < 0.3 ? 3 : 4] : R.rock[hash(x >> 1, y >> 1, 3) < 0.5 ? 2 : 3];
  // The boot track up the ice: a trench with its floor in shade; where it crosses rock, a worn line.
  if (track[i] && !trail[i] && !printGap(i)) return mat === 'ice' ? (track[i] === 1 ? R.glac[3] : hash(x, y, 16) < 0.3 ? R.glac[2] : R.glac[1]) : track[i] === 1 ? R.rock[1] : R.rock[hash(x, y, 6) < 0.3 ? 4 : 3];
  // A trail goes from dirt to rock over a few paces, not at a line (D13): how much of its tread is rock
  // comes from how much of the ground round it is not soil, how steep it is and how high, and each pixel
  // picks dirt or rock by that share with a dither.
  // Iron rungs (round 5, T64, after the rungs above Snow Lake on the way into the Enchantments): where the
  // trail climbs a granite cliff, its face keeps the slab and takes a rung every third pixel up, as wide as
  // the trail's tread. Without this every trail spot on the cliff's edge painted the whole face below it.
  const rungs = trail[i] && mat === 'gran' && hg[i] - hh > 1.5;
  if (rungs && trail[i] === 2) return y % 3 === 0 ? R.rock[0] : R.rock[hash(x, y, 6) < 0.3 ? 3 : 4];
  if (trail[i] && mat !== 'ice' && !rungs) {
    let hard = 0; for (const [a, b] of [[-5, 0], [5, 0], [0, -5], [0, 5], [-4, -4], [4, 4], [-4, 4], [4, -4]]) { const m = MATS[mg[at(clamp(u + a, 0, NW - 1), clamp(v + b, 0, VD - 1))]]; if (m !== 'land' && m !== 'ice') hard++; }
    // On the forested foothills (E5b) the slope is soil under the trees, so steepness alone does not make it rock.
    const share = clamp((mat !== 'land' ? 0.5 : 0) + hard / 16 + smooth(0.5, 0.95, steep) * (u < 760 && hills(u, v) > 2 ? 0.15 : 1) + 0.5 * smooth(60, 100, hh), 0, 1), rock = bayer(x, y) < share * 1.1 - 0.05;
    if (trail[i] === 2) return rock ? R.rock[hash(u, v, 6) < 0.3 ? 4 : 3] : hash(u, v, 5) < 0.1 ? R.dirt[2] : R.dirt[3];
    return rock ? R.rock[1] : R.dirt[1];
  }
  if (trail[i] === 2 && !rungs) return R.glac[1];
  if (trail[i] === 1 && !rungs) return R.glac[3];
  if (mat === 'ice') {
    // Under the wall the ice gapes away from the rock. Above the icefall it is snow with a few long
    // crevasses, the icefall is broken blocks, and the tongue below is bare blue ice crevassed across.
    if (MATS[mg[at(u, Math.min(VD - 1, v + 3))]] === 'wall' && hash(u >> 3, 1, 852) < 0.85) return R.glac[0];
    if (v > GL.fall[1]) return frac((v + 0.2 * u) / 11 + 0.5 * vnoise(u / 12, v / 12, 853)) < 0.08 && vnoise(u / 30, v / 8, 854) > 0.5 ? R.glac[3] : R.snow[L > 0.45 ? 4 : 3];
    if (v >= GL.fall[0]) { const row = Math.floor((v * 2 + hh) / 4), k = hash((u + row * 5) >> 2, row, 855); return k < 0.24 ? R.glac[1] : k < 0.5 ? R.glac[3] : k < 0.8 ? R.glac[4] : R.snow[4]; }
  }
  if (mat === 'ice') return frac((v * 0.9 + 0.3 * u) / 7 + 0.4 * vnoise(u / 8, v / 8, 817)) < 0.14 ? R.glac[2] : pick('glac', 0.45 + 0.4 * L + 0.2 * vnoise(u / 6, v / 4, 818), x, y, 0.6);
  // Base camp's island: bare rock, its top in the light and its face in shade, a dark line where it meets the ice.
  if (mat === 'moraine' && isleAt(u, v) < 1.4) { const e = isleAt(u, v); return hg[i] - hh > 0.8 ? R.rock[hash(x >> 1, y, 14) < 0.35 ? 1 : 0] : e > 0.62 && v < NUN[1] - 1 ? R.rock[hash(x >> 1, y, 14) < 0.3 ? 2 : 1] : R.rock[hash(x >> 1, y >> 1, 13) < 0.3 ? 3 : 4]; }
  if (mat === 'moraine') return steep > 0.7 ? pick('rock', 0.12 + 0.4 * vnoise(x / 3, hh / 10, 97), x, y, 0.7) : hash(u >> 1, v >> 1, 12) < 0.25 && isleAt(u, v) > 1.4 ? pick('grass', 0.4, x, y) : pick('rock', 0.2 + 0.7 * hash(u >> 1, v >> 1, 13), x, y);
  if (mat === 'wall' || mat === 'crest') {
    // Dark rock; snow lies where the slope lets it, and on the ledges of the walls. Toward the dry
    // east the same rock is a step paler and cleaner and holds less snow.
    const east = smooth(1240, 1600, u + 80 * (vnoise(u / 60, hh / 40, 840) - 0.5)), pale = bayer(x, y) < east * 0.9 ? 1 : 0;
    const flute = vnoise(x / 2.5, hh / 16, 813), rock = R.rock[clamp(Math.round(L * 2.6) + (flute > 0.64 ? 1 : flute < 0.34 ? -1 : 0), 0, 3) + pale], band = (x + (y >> 3) * 3) >> 2, row = hh / 7 + hash(band, 0, 814) * 7;
    // Snow lies in streaks down the gullies and on the ledges, more of it on the faces the light reaches.
    const streak = 0.62 * vnoise(x / 2.6, hh / 18, 815) + 0.38 * vnoise(x / 8, hh / 8, 819), lie = 0.5 + 0.2 * smooth(120, 60, hh) + 0.18 * east - 0.16 * (L - 0.5) - 0.12 * smooth(1.2, 0.6, steep);
    if (mat === 'crest') return hh > 62 + 34 * vnoise(x / 14, 3, 816) + 46 * east && streak > lie ? R.snow[L > 0.55 ? 4 : L > 0.35 ? 3 : 2] : hh < 44 + 20 * vnoise(u / 20, v / 20, 827) ? pick('conifer', 0.2 + 0.5 * L, x, y) : rock;
    // Snow gullies run up the wall from the ice to the notches between its summits.
    { const dx = (u - SP.cu) / SP.wide, up = hh - SP.base - under(SP.cu, SP.cv - 34) - 4; for (const [o, top, k] of GULLY) { const t = up / (top * SP.H); if (t > 0 && t < 1 && Math.abs(dx - o - 3 * Math.sin(hh / 9 + k)) < 1 + k * 0.5 + (3 + 2 * k) * sq(1 - t)) return R.snow[L > 0.4 ? 4 : 3]; } }
    if (steep < 0.9) return R.snow[L > 0.5 ? 4 : 3];
    return frac(row) < 0.15 && hash(band, Math.floor(row), 815) < 0.26 ? R.snow[L > 0.4 ? 4 : 3] : rock;
  }
  if (mat === 'volc') {
    // Lit from the west; the east flank turns away into blue shadow.
    const { cu, ru } = VOLC, b = bayer(x, y), Q = vrelief(u, v), ew = (u - cu) / ru;
    const lit = clamp(L - 0.3 * smooth(0, 0.8, ew) + 0.12 * smooth(0, -0.8, ew), 0, 1);
    const rock = (dk = 0) => R.rock[clamp(Math.round(lit * 3.2 + (b - 0.5) * 0.9) - dk, 0, 3)];
    // The ice, the ribs, Little Tahoma and the crater are painted (monolith.js) and laid over this ground
    // afterwards. What shows below the painting is the mountain's lower slopes: scree here and there
    // in the meadow, then the forest.
    if (vnoise(u / 7, v / 5, 584) > 0.86 - 0.08 * smooth(0.2, 0.4, VP(Math.min(1, Q.d)))) return rock(vnoise(x / 3, hh / 3, 583) > 0.6 ? 1 : 0);
    if (forestAmt(u, v) > 0.4) return pick('moss', 0.2 + 0.35 * lit, x, y);
    // Its meadow keeps the parkland's drifts: blooms of the drift's own kind, thick, and a few red elsewhere.
    const dk = DRIFT(u, v), bloom = dk === 'lupine' ? R.lupine[1] : dk === 'red' ? R.red[1] : dk === 'white' ? R.white[1] : dk === 'heather' ? R.pink[0] : R.red[1];
    return hash(u, v, 586) < 0.012 + 0.024 * flowerAmt(u, v) ? bloom : pick('grass', 0.4 + 0.35 * lit + 0.15 * n1, x, y, 0.4);
  }
  if (mat === 'gran' || mat === 'fin') {
    // Talus: blocks of the wall's own granite, lit on top and dark in the gaps, thinning out at the fan's
    // edge; the old snow lies on it in the shade.
    const ta = mat === 'gran' ? talusAt(u, v) : 0;
    if (ta > 0 && steep < 1.4) {
      if (ta > 0.3 && snowPatch(u, v)) return hash(x, y, 908) < 0.1 ? R.snow[2] : R.snow[L > 0.4 ? 4 : 3];
      if (bayer(x, y) < ta * 1.6) { const yy = y + Math.floor(3 * hash(x >> 2, 0, 911)), by = (yy / 3) | 0, bx = ((x + 2.6 * hash(by, 1, 912)) / (3 + ((hash(by, 2, 913) * 3) | 0))) | 0, q = hash(bx, by, 909), row = yy - by * 3; if (q < 0.14) return R.rock[0]; return row === 2 ? R.rock[q < 0.5 ? 0 : 1] : R.rock[clamp(Math.round(1.4 + 2.2 * L + 1.2 * (q - 0.5) + (row === 0 ? 1 : 0)), 1, 4)]; }
    }
    if (steep > 0.75 || mat === 'fin') { const crack = vnoise(x / 2.2, hh / 26, 902), streak = vnoise(x / 5, hh / 40, 903); const k = clamp(Math.round(1.5 + 2.9 * L + (streak > 0.62 ? -1.1 : 0) + (crack > 0.74 ? -1.4 : crack < 0.2 ? 0.5 : 0) + (b2(x, y) - 0.5) * 0.9), 0, 5); return k === 5 ? R.gold[6] : R.rock[k]; }
    const slab = fbm(u / 22, v / 11, 96, 3);
    return slab > 0.4 ? pick('rock', 0.82 + 0.4 * (slab - 0.5) + 0.2 * n1, x, y, 0.7) : hash(u, v, 98) < 0.06 ? R.red[1] : pick('grass', 0.42 + 0.2 * n1, x, y, 0.4);
  }
  // The ground behind the crest, glimpsed between its peaks against the sky, is more mountain, not meadow.
  if (u > 760 && v > 684) return hh > 128 && vnoise(x / 3, hh / 12, 829) > 0.45 + 0.3 * smooth(1240, 1700, u) ? R.snow[L > 0.5 ? 4 : 3] : pick('rock', 0.3 + 0.45 * L + 0.15 * vnoise(x / 3, hh / 10, 97), x, y, 0.7);
  // On the foothills (E5b) no forest floor shows: between the trees lies more canopy, lit by the slope
  // with the sun in the west, so each hill's shape shows through its forest as in TJ's photographs.
  // The lookout's summit (E5j): short grass with rock breaking through, the clearing's edge ragged.
  if (lookAmt(u, v) > 0.5 + 0.5 * (bayer(x, y) - 0.5)) return vnoise(u / 4, v / 3, 251) > 0.64 ? pick('rock', 0.35 + 0.45 * L, x, y, 0.7) : pick('grass', 0.3 + 0.45 * L + 0.1 * n1, x, y, 0.4);
  const fa = forestAmt(u, v), hl = u < 760 && fa > 0.45 ? hills(u, v) : 0;
  // The canopy is the pointed tops of conifers, row behind row: each lit on its west side, dark gaps
  // between them. The slope's light is made stronger than on open ground so the hills' faces part, and
  // the farthest rows take a little of the haze, so the hills stand one behind another.
  if (hl > 2 + 10 * bayer(x, y)) { const row = y >> 2, cx = (x + Math.floor(5 * hash(row, 0, 242))) / 5, k = Math.floor(cx), fx = frac(cx) - 0.5, fy = (y & 3) / 3 - 0.5 + 0.34 * (hash(k, row, 244) - 0.5), top = Math.abs(fx) < 0.1 + 0.42 * (fy + 0.5), lit = clamp(0.5 + 1.9 * (L - 0.5), 0, 1);
    const c = pick('conifer', 0.06 + 0.58 * lit + (!top ? -0.2 : fx < 0.05 && fy < 0.15 ? 0.14 : 0) + 0.12 * (hash(k, row, 243) - 0.5), x, y);
    return bayer(x + 1, y) < 0.45 * smooth(470, 740, v) ? HILLHAZE[c] : c; }
  // Land. A step in it shows the rock of its own country.
  // The golden hills' swells are grass to their crests, lit and shaded, never rock.
  if (steep > 1.05 && palAmt(u, v) > 0.3) return pick('dry', 0.12 + 0.95 * L, x, y, 0.5);
  if (steep > 1.05) return dryAmt0(u, v) > 0.3 ? ((x >> 1) % 4 === 0 ? R.basalt[0] : R.basalt[1 + (hash(x >> 1, 0, 91) * 2.9 | 0)]) : u > 1190 ? pick('rock', 0.36 + 0.42 * vnoise(x / 3, hh / 10, 97) + 0.15 * L, x, y, 0.7) : ((ld, ck) => ld < 0.22 && hash(x, y, 100) < 0.75 ? pick('moss', 0.3 + 0.35 * L, x, y) : ck > 0.74 ? R.rock[0] : pick('rock', 0.14 + 0.5 * vnoise(x / 3, hh / 5, 97) + 0.25 * L, x, y, 0.7))(frac(hh / 4.5 + 0.7 * vnoise(x / 9, 3, 98)), vnoise(x / 2.2, hh / 9, 99));
  const sh = (L - 0.5) * 0.5, blot = s => 0.5 + 0.85 * (fbm(u / 32, v / 21, s, 3) - 0.5) + 0.2 * n1;
  if (fa > 0.5 + 0.2 * n1) { const shaft = fbm(u / 34 + v / 70, v / 26, 21, 3); return pick('moss', 0.16 + 0.3 * fbm(u / 18, v / 18, 22, 3) + smooth(0.56, 0.7, shaft) * 0.4 + sh * 0.4, x, y); }
  const bu = burnAmt(u, v), da = dryAmt(u, v);
  if (larchAmt(u, v) > blot(181) && bu < 0.5) { const slab = fbm(u / 22, v / 11, 96, 3); return slab > 0.58 ? pick('rock', 0.85 + 0.2 * n1, x, y, 0.7) : hash(u, v, 98) < 0.06 ? R.red[1] : hash(u, v, 99) < 0.05 ? R.larch[3] : pick('grass', 0.42 + sh + 0.2 * n1, x, y, 0.4); }
  if (bu > blot(182)) { for (let k = 0; k < 9; k++) { const tall = 6 + Math.floor(hash(u, v - k, 132) * 3.99); if (k < tall && hash(u, v - k, 101) < 0.008 + 0.09 * smooth(0.5, 0.66, fbm(u / 30, (v - k) / 15, 131, 3))) return k < 2 ? R.grass[1] : k === tall - 1 ? R.fireweed[1] : R.fireweed[0]; } return fbm(u / 24, v / 16, 100, 3) > 0.56 ? pick('grass', 0.3, x, y, 0.5) : pick('ash', 0.4 + 0.5 * fbm(u / 14, v / 9, 102, 3), x, y); }
  if (da > blot(183) && palAmt(u, v) > blot(184)) return pick('dry', 0.22 + 0.95 * L + 0.18 * (fbm(u / 60, v / 40, 185, 2) - 0.5), x, y, 0.5);
  if (da > blot(183)) { const sg = sageAmt(u, v); return hash(u >> 1, v >> 1, 103) < 0.04 + sg * 0.3 ? R.sage[1 + (hash(u, v, 104) < 0.5 ? 0 : 1)] : pick('dry', 0.5 + 0.5 * (fbm(u / 24, v / 14, 105, 3) - 0.5) + sh + sg * 0.1, x, y); }
  // High ground with no forest on it goes from meadow to bare rock and then snow.
  if (hh > 96 + 30 * vnoise(u / 30, v / 30, 828)) return hh > 150 ? R.snow[L > 0.5 ? 4 : 3] : pick('rock', 0.3 + 0.5 * L, x, y);
  return pick('grass', 0.56 + 0.55 * (fbm(u / 26, v / 26, 31, 3) - 0.5) + 0.14 * (hash(x >> 1, y >> 1, 32) - 0.5) + sh - fa * 0.45 + da * 0.2, x, y, 0.3);
}
function b2(x, y) { return bayer(x, y); }

// ---- the picture ----------------------------------------------------------------------------------
const g = new Uint8Array(NW * SH), mb = new Uint8Array(NW * SH).fill(255), zb = new Float32Array(NW * SH).fill(1e9), px = (x, y) => y * NW + x;
const skyAt = (x, y) => { const sb = R.skyband, f = clamp(y / 340, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0; return sb[Math.min(sb.length - 1, b0 + (e > 0.72 && bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0))]; };
const painted = new Uint8Array(NW * SH);
// How thick the fog lies on each pixel of the picture when a shower has brought it in (E5), 0 to 255,
// thicker the farther back the ground is, so each rank stands paler than the one in front of it.
// The fog is weather: the scene lays it on while it is in, and nothing is painted white for good.
const fogField = new Uint8Array(NW * SH);
// What the ground shows with the Trees switch off, where a tree is painted into it (a snag in the fog, a
// tree's shadow): the colour that lay there before, 0 elsewhere. inked holds what the tree put there, so a
// pixel something else painted over afterwards is left alone.
const bare = new Uint8Array(NW * SH), inked = new Uint8Array(NW * SH), treeInk = (i, c) => { if (!bare[i]) bare[i] = g[i]; g[i] = inked[i] = c; };
// T79a: where a river reaches the sea, the lying fog and the marine layer's deck thin over its mouth and its
// way across the sand, so the water shows through onto the beach when the marine layer is in. MOUTHS is that
// reach as points, found from the rivers themselves, each with how much fog it leaves: least across the sand,
// and all of it again where the river comes out of the trees (at Dusk a clear strip in the forest shows as a
// dark line through the pale fog). The thinning stops at the water's edge (mouthFog's last term), so the fog
// on the sea is left whole.
const MOUTHS = [];
for (const r of routes) {
  const P = r.pts || [], end = P.findIndex(([u, v]) => u < 800 && coast(u, v) > -2); if (end < 0) continue;
  for (let n = end; n >= 0 && coast(P[n][0], P[n][1]) > -32; n--) MOUTHS.push([P[n][0], P[n][1], 0.3 + 0.7 * smooth(-14, -30, coast(P[n][0], P[n][1]))]);
}
const mouthFog = (u, v, cs) => { let f = 1; for (const [a, b, least] of MOUTHS) { const e = lerp(least, 1, smooth(4, 15, Math.hypot(a - u, b - v))); if (e < f) f = e; } return lerp(f, 1, smooth(-3, 5, cs)); };
if (B) { g.set(B.g); mb.set(B.mb); zb.set(B.zb); painted.set(B.painted); bare.set(B.bare); fogField.set(B.fog); } else {
for (let y = 0; y < SH; y++) for (let x = 0; x < NW; x++) g[px(x, y)] = skyAt(x, y);
// The far ranges, which really are a backdrop: pale, beyond the last of the ground.
function farRow(u0, u1, baseY, env, seed, snowy, list) {
  const r = rng(seed), peaks = list || []; if (!list) for (let cx = u0; cx < u1;) { const h = env(cx) * (0.75 + 0.5 * r()), w = h * (1.2 + 0.7 * r()); peaks.push([cx, h, w]); cx += w * (0.5 + 0.4 * r()); }
  const F = R.far, FS = R.farsnow;
  for (let x = Math.max(0, u0 - 80); x < Math.min(NW, u1 + 80); x++) {
    let best = 0, bc = 0, bh = 1; for (const [cx, h, w] of peaks) { const t = h * Math.pow(Math.max(0, 1 - Math.abs(x - cx) / w), 0.85) + 1.5 * (vnoise(x / 4, cx, 700) - 0.5); if (t > best) { best = t; bc = cx; bh = h; } }
    // A row without snow is forested foothills: its skyline is a saw of tree tops.
    if (!snowy) best += 2.2 * (1 - Math.abs(frac(x / 4 + 0.5 * hash(x >> 2, seed, 707)) - 0.5) * 2) - 1;
    const top = Math.round(baseY - best);
    for (let y = Math.max(0, top); y <= baseY + 30 && y < SH; y++) {
      const d = y - top, dd = y - (baseY - bh), rel = dd / bh, b = bayer(x, y), side = x < bc ? -1 : 1;
      // The main ridge runs down from each summit and wanders; spurs branch off it down both faces.
      const rx = bc + dd * (0.1 + 0.18 * (hash(Math.round(bc), seed, 701) - 0.5)) + 6 * (vnoise(dd / 14, bc, 702) - 0.5), west = x < rx;
      const spur = frac((x - rx) * 0.075 - side * dd * 0.055 + 0.35 * vnoise(x / 18, dd / 18, 703)), edge = spur < 0.1;
      let c;
      if (!snowy) c = d === 0 ? F[1] : (west ? (b < 0.7 ? F[2] : F[3]) : (b < 0.75 ? F[1] : F[2]));
      else {
        // The crest's grey rock, a step or two paler for the distance (round 5, T27: it was a blue wash, with snow
        // halfway down). Snow lies only high up, above a line that wanders and comes lower in the gullies as
        // small glaciers, with a few streaks below it. The faces the western light reaches are the paler ones.
        // The haze of the distance is the palest far blue dithered in, thicker toward the range's foot.
        const gully = vnoise(x / 10, dd / 16, 704), snowR = 0.2 + 0.1 * (vnoise(x / 30, seed, 705) - 0.5) + 0.26 * (0.5 - gully), K = R.rock;
        if (rel < snowR) c = west ? (edge ? K[4] : FS[1]) : (edge ? FS[1] : spur < 0.5 ? FS[0] : b < 0.5 ? FS[0] : K[4]);
        else if (rel < 0.62 && vnoise(x / 3, dd / 10, 706) > 0.74 + 0.3 * rel) c = FS[0];
        else { const flute = vnoise(x / 2.5, dd / 12, 708); c = west ? K[edge ? 2 : flute > 0.6 ? 4 : 3] : K[edge ? 3 : flute > 0.7 ? 3 : flute < 0.22 ? 1 : 2]; if (b < 0.08 + 0.4 * smooth(0.35, 1.25, rel)) c = F[3]; }
        if (d === 0) c = K[2];
      }
      g[px(x, y)] = c;
    }
  }
}
const HZ = SY - VD - 26;
// The Legacy Range: a broad massif of several summits, with lower peaks in front of it and round it.
farRow(0, 480, HZ - 22, null, 41, true, [[200, 86, 120], [128, 64, 90], [268, 70, 84], [330, 50, 80], [64, 48, 84], [4, 36, 80], [400, 34, 76]]);
farRow(0, 600, HZ - 6, null, 45, false, [[40, 26, 60], [150, 22, 50], [245, 18, 40], [300, 28, 64], [430, 24, 60], [520, 30, 70]]);
// A nearer rank of forested foothills, lower, so the range rises out of ridges of trees.
farRow(0, 560, HZ + 6, null, 46, false, [[90, 16, 60], [210, 12, 50], [330, 17, 70], [470, 14, 60]]);
farRow(520, 1700, HZ + 20, x => 46 + 20 * vnoise(x / 90, 2, 43), 43, true);
farRow(1640, NW + 40, HZ + 24, () => 26, 44, false);
// The ground and the mountains, one column at a time from the near edge to the far one. A spot is
// drawn only where nothing nearer already stands in front of it.
for (let u = 0; u < NW; u++) {
  let minY = SH;
  for (let v = 0; v < VD; v++) {
    const h = hg[at(u, v)], sy = Math.round(SY - v - h); if (sy >= minY) continue;
    const ft = fogTop(u, v), fa = ft > -1 ? forestAmt(u, v) : 0, cs = u < 800 ? coast(u, v) : -99, wet = water[at(u, v)];
    // When the fog is in it lies thick on the sea and the beach (thinner over a river's mouth, so the
    // water still reads), over the forest in the west, and deepest in the hollows up to its level.
    const lying = u >= 800 ? 0 : (cs > -15 ? Math.min(1, seaFog(u, v) * 1.1 * (wet ? 0.45 : 1)) : smooth(0.16, 0.6, fogAmt(u, v)) * smooth(0.3, 0.5, forestAmt(u, v)) * 0.4) * (cs > -50 && cs < 5 ? mouthFog(u, v, cs) : 1);
    for (let y = Math.max(0, sy); y < minY; y++) {
      const hh = SY - v - y, hollow = fa > 0.4 && hh < ft ? 0.8 * Math.min(wet ? 0.3 : 1, 0.2 + (ft - hh) / 4) : 0;
      mb[px(u, y)] = mg[at(u, v)]; g[px(u, y)] = colour(u, v, hh, u, y); if (u < 760 && v > 560 && water[at(u, v)] && bayer(u, y) < 0.55 * smooth(560, 740, v)) g[px(u, y)] = HILLHAZE[g[px(u, y)]]; fogField[px(u, y)] = Math.round(255 * Math.max(lying, hollow) * (0.55 + 0.45 * v / VD));
      zb[px(u, y)] = v;
    }
    minY = sy;
  }
}

let MONO_OY = 0;
// Mount Monolith is painted (monolith.js) and laid over its own ground, one map pixel to one picture
// pixel. Where the painted outline stands a little above the ground it is drawn over the sky behind,
// at the mountain's depth, so anything nearer still stands in front. Its stand-in meadow is left out:
// the land's own meadow, trees and flowers are drawn there. The whole painting stands at the mountain's
// depth, so nothing behind the mountain can be drawn over it, and nothing is planted on it (painted).
{
  const P = paintMonolith(), { cu, cv, H } = VOLC, VI = MATS.indexOf('volc'), ox = cu - PMCX;
  // Line the picture up with the ground: the row of the picture's summit goes where the ground's top is.
  const tops = [];
  for (let x = cu - 40; x <= cu + 40; x += 4) { let y = 0; while (y < SH && mb[px(x, y)] !== VI) y++; const pxl = x - ox, sk = Math.ceil(monolithSky(pxl - PMCX) ? PMH - monolithSky(pxl - PMCX) * (PMH - PTOPY) : PMH); if (y < SH) tops.push(y - sk); }
  tops.sort((a, b) => a - b); const oy = tops.length ? tops[tops.length >> 1] : SY - cv - H - PTOPY; MONO_OY = oy;
  for (let py = 0; py < PMH; py++) for (let qx = 0; qx < PMW; qx++) {
    const k = py * PMW + qx, c = P.d[k], x = ox + qx, y = oy + py; if (x < 0 || y < 0 || x >= NW || y >= SH) continue;
    const i = px(x, y);
    // Above the painted outline the mountain's own ground would poke out: the sky goes back there.
    if (!c) { if (mb[i] === VI && py < PMH - 40) { g[i] = skyAt(x, y); mb[i] = 255; zb[i] = 1e9; } continue; }
    if (!P.own[k]) continue;
    if (mb[i] === VI) { g[i] = c; zb[i] = Math.min(zb[i], cv); painted[i] = 1; }
    else if (zb[i] > cv) { g[i] = c; zb[i] = cv; mb[i] = VI; painted[i] = 1; }
  }
}

// The moraine lakes (T30) and the streams out of them. Each lake is painted into the mountain's picture
// where its glacier ends: milky teal water whose far edge is the ice itself, no gravel between (round 4's
// reference of a glacier ending in its lake), held on the near side by a low grey rim of moraine with a
// notch at its middle. From the notch a thread of melt water wanders down, white where it tumbles, to where
// the lake's stream first shows on the land; its column and its foot are read from the land.
{
  const paint = (x, y, c) => { if (x >= 0 && y >= 0 && x < NW && y < SH) { g[px(x, y)] = c; painted[px(x, y)] = 1; } };
  for (const t of TARNS) {
    const e = t.end, hw = Math.round(clamp(e.room * 0.42, 14, 24)), rv = Math.max(4, Math.round(hw * 0.34)), xc = MONO_OX + e.mid;
    // The water's top row at each column is the first row below the ice there, so the ice meets it.
    const topAt = x => MONO_OY + Math.floor(e.snout(x - MONO_OX)) + 1, yc = topAt(xc) + rv - 1;
    for (let dx = -hw - 2; dx <= hw + 2; dx++) { const x = xc + dx, f = Math.abs(dx) / hw;
      const yTop = topAt(x), yBot = yc + Math.round(rv * Math.sqrt(Math.max(0, 1 - f * f)) + 0.6 * (vnoise(x / 4, 3, 951) - 0.5));
      if (f < 1) for (let y = yTop; y <= yBot; y++) paint(x, y, bayer(x, y) < 0.4 ? R.glac[3] : pick('tarn', 0.7 + 0.25 * vnoise(x / 6, y / 3, 952), x, y));
      // The rim: a low bank of moraine along the near shore and round the ends, pale on top, and a notch
      // at the middle where the stream leaves.
      if (Math.abs(dx) <= 1) { paint(x, yBot + 1, R.water[2]); continue; }
      const rimTop = f < 1 ? yBot + 1 : yTop + Math.round((f - 1) * 4);
      for (let k = 0; k < 3; k++) paint(x, rimTop + k, k === 2 ? R.mauve[0] : k ? R.rock[1] : R.rock[hash(x, 3, 953) < 0.5 ? 2 : 3]);
    }
    t.notch = [xc, yc + rv + 2];
    const r = routes[t.src], hd = r && r.pts.find(([u, v]) => water[at(Math.round(u), Math.round(v))] && MATS[mg[at(Math.round(u), Math.round(v))]] === 'land');
    if (!hd) continue;
    const x0 = Math.round(hd[0]), y0 = Math.round(SY - hd[1] - hAt(hd[0], hd[1])), [x1, y1] = t.notch;
    if (y1 < y0) for (let y = y1; y <= y0; y++) { const q = (y - y1) / (y0 - y1), x = Math.round(lerp(x1, x0, q) + (9 * Math.sin(q * 7.5 + t.src) + 1.6 * Math.sin(y / 5)) * Math.sin(q * Math.PI)); for (let dx = 0; dx <= 1; dx++) paint(x + dx, y, hash(x + dx, y >> 1, 471) < 0.3 ? R.white[1] : dx ? R.water[2] : R.water[3]); paint(x - 1, y, R.water[1]); paint(x + 2, y, R.water[1]); }
  } }

// Where a stream runs off a cliff (T17): two points of its course that both show water, the lower one far
// down the picture from the upper for the little way between them, have the cliff face between. A fall is
// painted down that face, white streaks on blue, as wide as the stream, so the water above and the water
// below are one stream. The lake's own fall (FALLS) is drawn and moved by the map, so it is left alone.
{ const seen = (u, v) => { const ui = Math.round(u), vi = Math.round(v); return ui >= 0 && vi >= 0 && ui < NW && vi < VD && water[at(ui, vi)] > 0; };
  const yOf = (u, v) => Math.round(SY - v - hAt(u, v));
  for (const r of routes) { const P = r.pts; for (let n = 1; n < P.length; n++) {
    const [u0, v0, w0] = P[n - 1], [u1, v1] = P[n], x0 = Math.round(u0), x1 = Math.round(u1), y0 = yOf(u0, v0), y1 = yOf(u1, v1), step = Math.hypot(u1 - u0, v1 - v0);
    if (y1 - y0 < step + 4 || !seen(u0, v0) || !seen(u1, v1)) continue;
    if (FALLS.some(f => Math.abs(f.x - (x0 + x1) / 2) < 10 && y1 > f.y0 - 6 && y0 < f.y1 + 6)) continue;
    const half = Math.max(1, Math.round((w0 || 1) * 0.8));
    for (let y = y0; y <= y1; y++) { const q = (y - y0) / Math.max(1, y1 - y0), x = Math.round(lerp(x0, x1, q)); for (let dx = -half; dx <= half; dx++) { if (x + dx < 0 || x + dx >= NW || y < 0 || y >= SH) continue; const i = px(x + dx, y); g[i] = hash(x + dx, (y + 2 * dx) >> 1, 472) < 0.45 ? R.white[1] : Math.abs(dx) === half ? R.water[2] : R.water[3]; } }
  } } }

// The snout's face: the ice standing at the snout's own depth just above the water is a blue and white
// ice cliff, streaked down its height, darker where it meets the lake.
{ const II = MATS.indexOf('ice'); for (let x = PRO.cu - PRO.ru; x <= PRO.cu + PRO.ru; x++) { let y = 0; while (y < SH && !(zb[px(x, y)] < VD && lakeAt(x, Math.round(zb[px(x, y)])) === 'silt')) y++; if (y >= SH) continue;
  for (let k = 1; k <= 12; k++) { const i = px(x, y - k); if (mb[i] !== II || zb[i] > GL.toe + 7) break; const top = k === 12 || mb[px(x, y - k - 1)] !== II || zb[px(x, y - k - 1)] > GL.toe + 7; g[i] = top ? R.white[1] : k === 1 ? R.serac[0] : hash(x, 0, 482) < 0.3 ? R.serac[1] : (x & 1) ? R.serac[3] : R.serac[2]; } } }
// Ice broken off the snout floats in the Spires' lake, thickest against the ice (E8c, TJ's photograph).
for (let y = 0; y < SH - 1; y++) for (let x = PRO.cu - PRO.ru; x <= PRO.cu + PRO.ru; x++) { const i = px(x, y), v = zb[i]; if (v >= VD || lakeAt(x, Math.round(v)) !== 'silt') continue;
  const near = (v - (PRO.cv - PRO.rv)) / (2 * PRO.rv); if (hash(x >> 1, y, 481) > 0.2 * near * near) continue; g[i] = R.white[1]; if (lakeAt(x + 1, Math.round(v))) g[px(x + 1, y)] = R.white[1]; g[px(x, y + 1)] = R.water[4]; }

// ---- detail on the ground, as round 3 had it ------------------------------------------------------
// These work on the finished picture. A pixel belongs to the ground at one spot (zb, its depth), so
// each touch keeps to one stretch of ground and never reaches across the edge of a nearer slope.
const sameGround = (i, j) => Math.abs(zb[i] - zb[j]) < 4;
// The plunge pool at the foot of the waterfall, white where the water lands.
for (const F of FALLS) for (let dy = -2; dy <= 2; dy++) for (let dx = -6; dx <= 6; dx++) { const e = (dx / 6) ** 2 + (dy / 2.2) ** 2; if (e > 1) continue; const x = F.x + dx, y = F.y1 + dy + 1; if (x < 0 || y < 0 || x >= NW || y >= SH) continue; g[px(x, y)] = e < 0.35 && hash(x, y, 461) < 0.6 ? R.white[1] : e > 0.75 ? R.water[1] : R.water[2]; }
// The footbridges' decks: planks across with a dark seam, a beam along each edge.
for (const br of BRIDGES) {
  const [ax, ay] = br.pts[0], [bx, by] = br.pts[br.pts.length - 1], len = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / len, uy = (by - ay) / len;
  let nx = -uy, ny = ux; if (ny < 0) { nx = -nx; ny = -ny; }
  for (let y = Math.floor(br.y0) - 6; y <= br.y1 + 6; y++) for (let x = Math.floor(br.x0) - 6; x <= br.x1 + 6; x++) {
    const t = (x - ax) * ux + (y - ay) * uy, d = (x - ax) * nx + (y - ay) * ny; if (t < -0.5 || t > len + 0.5 || Math.abs(d) > 3 || x < 0 || y < 0 || x >= NW || y >= SH) continue;
    g[px(x, y)] = d > 2 ? R.wood[1] : d < -2 ? R.wood[2] : Math.floor(t + 0.5) % 3 === 0 ? R.wood[2] : R.wood[hash(Math.floor((t + 0.5) / 3), Math.floor(br.x0), 60) < 0.4 ? 4 : 3];
  }
}
// Reflection Lake mirrors what stands behind it, squashed and broken by ripples: snow as pale water,
// forest as dark water, rock in between. The shore keeps its own colour.
{
  const lake = C.lakes[0], top = new Int16Array(NW).fill(-1), SUMY = SY - VOLC.cv - VOLC.H;
  for (let y = 0; y < SH; y++) for (let x = Math.floor(lake[0] - lake[2] - 4); x <= lake[0] + lake[2] + 4; x++) { const v = zb[px(x, y)]; if (v < VD && top[x] < 0 && lakeAt(x, v) === 'lake') top[x] = y; }
  for (let x = 0; x < NW; x++) if (top[x] >= 0) for (let y = top[x] + 1; y < SH; y++) {
    const i = px(x, y), v = zb[i]; if (v >= VD || lakeAt(x, v) !== 'lake' || isle(x, v) < 1.2) { if (y > top[x] + 30) break; continue; }
    if (lakeAt(x, v - 2) !== 'lake' || lakeAt(x + 2, v) !== 'lake' || lakeAt(x - 2, v) !== 'lake') continue;
    // The first rows mirror the near shore; further out, Mount Monolith, upside down and squashed into the
    // rest of the lake, faint: only its snow shows, as pale water every other pixel.
    const r = y - top[x], sx = Math.round(x + 1.5 * Math.sin(y * 1.7));
    if (r > 3) { const sy2 = Math.round(top[x] - 12 - (r - 3) * (top[x] - 12 - SUMY) / 9); if (sy2 >= 0 && sx >= 0 && sx < NW && ((x + y) & 1) && (y & 1)) { const k2 = RAMP_OF[g[px(sx, sy2)]]; if (k2 === 'snow' || k2 === 'serac') { g[i] = R.water[4]; continue; } } }
    const sy = Math.round(top[x] - r * 3.2 - 2); if (sy < 0 || sx < 0 || sx >= NW || !(y & 1 || hash(x, y, 8) < 0.6)) continue;
    const c = g[px(sx, sy)], k = RAMP_OF[c]; if (!k || k === 'skyband' || k === 'sky') continue;
    g[i] = k === 'snow' || k === 'farsnow' || k === 'glac' ? R.water[4] : k === 'conifer' || k === 'moss' || k === 'grass' || k === 'mist' ? R.water[1] : R.water[2];
  }
}
// Tufts of grass: a small arch with a dark root.
{
  const r0 = rng(5);
  for (let n = 0; n < 30000; n++) {
    const x = 2 + (r0() * (NW - 4)) | 0, y = 300 + (r0() * (SH - 302)) | 0, i = px(x, y), k = KIND[g[i]]; if ((k !== 1 && k !== 2) || mb[i] !== 0) continue;
    if (KIND[g[i - NW]] !== k || KIND[g[i - 2 * NW]] !== k || !sameGround(i, i - 2 * NW)) continue;
    const r = R[k === 1 ? 'grass' : 'moss']; g[i - 2 * NW] = r[r.length - 1]; g[i - NW - 1] = r[r.length - 2]; g[i - NW + 1] = r[r.length - 2]; g[i] = r[1];
  }
}
// Wildflowers are not painted into the ground any more: they are things that stand up and sway (D5a,
// below, with the trees).
// Small driftwood along the beach: bleached branches, each with its shadow under it (round 5, T8: they were
// the grey of rock).
{
  const rand = rng(44390);
  for (let n = 0; n < 700; n++) {
    const x = (rand() * 700) | 0, y = 500 + ((rand() * (SH - 500)) | 0), v = zb[px(x, y)]; if (v >= VD) continue;
    const cs = coast(x, v); if (cs > -3 || cs < -13) continue;
    const len = 6 + rand() * 12, a = (rand() - 0.5) * 0.9 + 0.6;
    for (let k = 0; k < len; k++) { const qx = Math.round(x + Math.cos(a) * k), qy = Math.round(y + Math.sin(a) * k * 0.5); if (qx > 0 && qy > 0 && qx < NW && qy < SH - 1 && !water[at(qx, Math.round(zb[px(qx, qy)]))] && sameGround(px(x, y), px(qx, qy))) { g[px(qx, qy)] = R.gold[k % 5 === 3 ? 4 : 6]; g[px(qx, qy + 1)] = R.sand[0]; } }
  }
}
// A dark line where a wall or the granite fin stands against something farther off, so the Spires
// and Proficiency Peak read as shapes of their own.
for (let y = 1; y < SH - 1; y++) for (let x = 1; x < NW - 1; x++) {
  const i = px(x, y), m = MATS[mb[i]]; if (m !== 'fin' && m !== 'wall') continue;
  if (zb[i - NW] > zb[i] + 14 || zb[i - 1] > zb[i] + 14 || zb[i + 1] > zb[i] + 14) g[i] = INK;
}
}
// Mount Monolith's icefalls and the snow that covers each until its avalanche (E5c; all of them since round
// 5, T11). The ground keeps the bare blue seracs; the scene draws the cover over them. The painting is worked
// out again here, since a bake holds only the finished picture, and lined up with the picture by where its
// icefalls match the ground best. Each covered pixel keeps the plain snow that would lie there, which
// icefall it is in and how far down it (monolith.js packs the last two into one byte).
// One face for each icefall with enough of it showing, west to east. q: how far down the face each pixel is
// (0 to 252). top and low: the middle of its top and of its foot, and (ux, uy) the way from one to the other,
// which is the way its snow slides. foot: where that snow runs out, on down the glacier along the same line.
function coverFaces(at, snow, qf) {
  const faces = [];
  for (let k = 0; k < 4; k++) {
    const A = [], S = [], Q = []; let x0 = NW, x1 = 0, y0 = SH, y1 = 0, tx = 0, ty = 0, tn = 0, bx = 0, by = 0, bn = 0;
    for (let j = 0; j < at.length; j++) { if (qf[j] >> 6 !== k) continue; const q = (qf[j] & 63) * 4, x = at[j] % NW, y = (at[j] / NW) | 0;
      A.push(at[j]); S.push(snow[j]); Q.push(q); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      if (q < 50) { tx += x; ty += y; tn++; } if (q > 200) { bx += x; by += y; bn++; } }
    // A sliver of an icefall that shows from behind a ridge (under 400 pixels) is no face: it stays as painted.
    if (A.length < 400 || !tn || !bn) continue;
    const top = [tx / tn, ty / tn], low = [bx / bn, by / bn], L = Math.hypot(low[0] - top[0], low[1] - top[1]) || 1, ux = (low[0] - top[0]) / L, uy = (low[1] - top[1]) / L;
    let d = 0, miss = 0, last = 0; while (d < 170 && miss < 3) { d++; const x = Math.round(low[0] + ux * d), y = Math.round(low[1] + uy * d); if (x < 1 || y < 1 || x >= NW - 1 || y >= SH - 1) break; const r = RAMP_OF[g[px(x, y)]]; if (r === 'snow' || r === 'serac') { miss = 0; last = d; } else miss++; }
    faces.push({ k, at: Int32Array.from(A), snow: Uint8Array.from(S), q: Uint8Array.from(Q), x0, x1, y0, y1, cx: Math.round(low[0]), top, low, ux, uy, foot: [Math.round(low[0] + ux * last), Math.round(low[1] + uy * last)] });
  }
  return faces.sort((a, b) => a.cx - b.cx);
}
const MONO_COVER = (() => {
  // From the bake (M3): the plain snow and the packed byte of each covered pixel, kept as two planes, so the
  // painting is not worked out again at every start.
  if (B && B.monoSnow) { const at = [], snow = [], qf = []; for (let i = 0; i < NW * SH; i++) if (B.monoSnow[i]) { at.push(i); snow.push(B.monoSnow[i]); qf.push(B.monoQ[i]); } return coverFaces(at, snow, qf); }
  const P = paintMonolith(), ox = VOLC.cu - PMCX, n = P.cover.length / 3; if (!n) return [];
  const fit = oy => { let m = 0; for (let j = 0; j < n; j += 5) { const k = P.cover[3 * j], x = ox + k % PMW, y = oy + ((k / PMW) | 0); if (x >= 0 && y >= 0 && x < NW && y < SH && g[px(x, y)] === P.d[k]) m++; } return m; };
  const guess = Math.round(SY - VOLC.cv - VOLC.H - PTOPY); let oy = guess, best = -1;
  for (let o = guess - 200; o <= guess + 200; o++) { const m = fit(o); if (m > best) { best = m; oy = o; } }
  const at = [], snow = [], qf = [];
  for (let j = 0; j < n; j++) { const k = P.cover[3 * j], x = ox + k % PMW, y = oy + ((k / PMW) | 0); if (x < 0 || y < 0 || x >= NW || y >= SH || g[px(x, y)] !== P.d[k]) continue; at.push(px(x, y)); snow.push(P.cover[3 * j + 1]); qf.push(P.cover[3 * j + 2]); }
  return coverFaces(at, snow, qf);
})();
// Each destination and its country (D12a, D12b), worked out from the heights, materials and depth the
// bake already holds, so it costs nothing to keep. First on the map, by rules from the land:
// 1 Reflection Lake: the lake, the bench it lies on (where the bench is the ground), and the lake loop's last
//   300 or so through the trees on its way in and out, with the ground between its two stretches.
// 2 Proficiency Peak: the fin and the second granite step it stands on (where the step is the ground; the
//   higher step behind is not). Its cliff is added on the picture, below.
// 3 The Spires: the wall, and the glacier's watershed: every spot from which water runs down past the
//   tarn at the glacier's toe and out of the bowl, so the edge follows the arms' crests. Water is routed
//   downhill the standard way (a priority flood from the edge of a box round the bowl: lowest first, each
//   spot draining to the spot it was reached from), which needs no hollow filled by hand.
// The areas come from the bake when there is one; only bake.sh works them out.
const dest = new Uint8Array(NW * SH), DEST = ['', 'lake', 'stack', 'spires'], destBox = DEST.map(() => ({ x0: NW, x1: -1, y0: SH, y1: -1 }));
const reg = new Uint8Array(NW * VD);
if (!B) { const box = (P, fn) => { for (let v = Math.max(0, Math.floor(P.v0)); v <= Math.min(VD - 1, Math.ceil(P.v1)); v++) for (let u = Math.max(0, Math.floor(P.u0)); u <= Math.min(NW - 1, Math.ceil(P.u1)); u++) fn(u, v, at(u, v)); };
  const [lu, , lru] = C.lakes[0], FIN = MATS.indexOf('fin'), WALL = MATS.indexOf('wall');
  box(C.bench, (u, v, i) => { const f = C.bench.fn(u, v); if ((f > 3 && hg[i] >= f - 3 && hg[i] < f + 10) || lakeAt(u, v) === 'lake') reg[i] = 1; });
  // The loop's band runs the whole loop (E5b2; it stopped 300 west of the lake while fog hid the rest), narrows
  // to nothing over its last 60 to the west, so the country ends in a round end,
  // and every column of it is filled between its highest and lowest spot: the ground between the stretches.
  { const W0 = Math.min(...C.loop0.map(p => p[0])) - 30, top = new Int16Array(NW).fill(VD), bot = new Int16Array(NW).fill(-1);
    for (const [pu, pv] of catmull(C.loop0)) { if (pu >= lu + lru || pu < W0) continue; const r = 22 * Math.sqrt(smooth(W0, W0 + 60, pu)), r2 = r * r; for (let dv = -22; dv <= 22; dv++) for (let du = -22; du <= 22; du++) { if (du * du + dv * dv > r2) continue; const u = Math.round(pu + du), v = Math.round(pv + dv); if (u >= 0 && v >= 0 && u < NW && v < VD) { reg[at(u, v)] = 1; top[u] = Math.min(top[u], v); bot[u] = Math.max(bot[u], v); } } }
    for (let u = 0; u < NW; u++) for (let v = top[u] + 1; v < bot[u]; v++) if (!reg[at(u, v)]) reg[at(u, v)] = 1; }
  box(C.step2, (u, v, i) => { const f = C.step2.fn(u, v); if ((f > 3 && hg[i] >= f - 3 && hg[i] < f + 16) || mg[i] === FIN) reg[i] = 2; });
  { const tarn = C.lakes.find(l => l[4] === 'silt'), X0 = Math.max(0, Math.round(SP.cu - 330)), X1 = Math.min(NW - 1, Math.round(SP.cu + 330)), Y0 = Math.max(0, tarn[1] - 80), w = X1 - X0 + 1, h = VD - Y0;
    const key = new Float32Array(w * h), from = new Int32Array(w * h).fill(-1), done = new Uint8Array(w * h), order = [], heap = [];
    const push = k => { heap.push(k); let n = heap.length - 1; while (n > 0) { const p = (n - 1) >> 1; if (key[heap[p]] <= key[k]) break; heap[n] = heap[p]; n = p; } heap[n] = k; };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { let n = 0; const kl = key[last]; for (;;) { const l = 2 * n + 1, r = l + 1; let m = -1, km = kl; if (l < heap.length && key[heap[l]] < km) { m = l; km = key[heap[l]]; } if (r < heap.length && key[heap[r]] < km) m = r; if (m < 0) break; heap[n] = heap[m]; n = m; } heap[n] = last; } return top; };
    for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) if (a === 0 || b === 0 || a === w - 1 || b === h - 1) { const k = b * w + a; key[k] = hg[at(X0 + a, Y0 + b)]; done[k] = 1; push(k); }
    while (heap.length) { const k = pop(), a = k % w, b = (k - a) / w; order.push(k); for (let db = -1; db <= 1; db++) for (let da = -1; da <= 1; da++) { const aa = a + da, bb = b + db; if (aa < 0 || bb < 0 || aa >= w || bb >= h) continue; const n = bb * w + aa; if (done[n]) continue; done[n] = 1; from[n] = k; key[n] = Math.max(hg[at(X0 + aa, Y0 + bb)], key[k] + 1e-4); push(n); } }
    // The bowl's mouth: from the tarn's lowest spot, follow the water down until it is 60 nearer the camera
    // than the tarn. A spot belongs if it drains, sooner or later, to the mouth: walked in the order the
    // flood reached them, each spot after the one it drains to.
    let mouth = -1; for (const k of order) { const a = k % w, b = (k - a) / w; if (lakeAt(X0 + a, Y0 + b) === 'silt') { mouth = k; break; } }
    while (mouth >= 0 && from[mouth] >= 0 && Y0 + Math.floor(mouth / w) > tarn[1] - 60) mouth = from[mouth];
    const inn = new Uint8Array(w * h);
    for (const k of order) { const a = k % w, b = (k - a) / w; inn[k] = k === mouth || (from[k] >= 0 && inn[from[k]]) ? 1 : 0; if (inn[k] && !reg[at(X0 + a, Y0 + b)]) reg[at(X0 + a, Y0 + b)] = 3; }
    for (let i = 0; i < reg.length; i++) if (mg[i] === WALL) reg[i] = 3;
    // The bowl's bare ground goes with it too (ice, moraine and the arms' rock between the wall's two ends,
    // above the mouth), so a face of an arm that sheds its water the other way does not stay behind.
    const rock = new Set(['ice', 'moraine', 'crest'].map(m => MATS.indexOf(m))), A0 = Math.round(SP.cu - 170 * SP.wide), A1 = Math.round(SP.cu + 170 * SP.wide), mv = Y0 + Math.floor(mouth / w), q = [];
    for (let v = mv; v < VD; v++) for (let u = A0; u <= A1; u++) if (reg[at(u, v)] === 3) q.push(at(u, v));
    while (q.length) { const i = q.pop(), u = i % NW, v = (i - u) / NW; for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const uu = u + du, vv = v + dv; if (uu < A0 || uu > A1 || vv < mv || vv >= VD) continue; const j = at(uu, vv); if (reg[j] || !rock.has(mg[j])) continue; reg[j] = 3; q.push(j); } } } }
// Then on the picture: each pixel takes the number of the spot of the map drawn there, plus 4 where it is
// the landmark itself (the lake's water and island, the fin, the wall).
{ const WALL = MATS.indexOf('wall'), FIN = MATS.indexOf('fin'), LANDM = MATS.indexOf('land');
  if (!B) {
  for (let y = 0; y < SH; y++) for (let x = 0; x < NW; x++) {
    const i = px(x, y), m = mb[i], v = zb[i]; if (m === 255 || !(v < VD)) continue;
    const core = m === FIN ? 2 : m === WALL ? 3 : m === LANDM && lakeAt(x, v) === 'lake' ? 1 : 0, k = core ? core | 4 : reg[at(x, Math.min(VD - 1, Math.round(v)))];
    if (k) dest[i] = k;
  }
  // A face that drops from a country (the step's cliff, the bench's bank) belongs to it down to its foot:
  // down each column from the country's lowest pixel, for as long as the ground there is near upright
  // (the depth changes by less than a third of a pixel from one row to the next).
  for (let x = 0; x < NW; x++) for (let y = 0; y < SH - 1; y++) {
    const i = px(x, y), k = dest[i] & 3; if (!k || dest[i + NW]) continue;
    for (let j = i + NW, n = 0; j < NW * SH && n < 160 && !dest[j] && zb[j] < VD && Math.abs(zb[j] - zb[j - NW]) < 0.34; j += NW, n++) dest[j] = k;
  }
  }
  if (B) dest.set(B.dest);
  for (let y = 0; y < SH; y++) for (let x = 0; x < NW; x++) { const k = dest[px(x, y)] & 3; if (!k) continue; const b = destBox[k]; if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; } }
// The landmarks keep a step of contrast and the dark edge of D12a: all round the lake and the fin; for the
// Spires only the skyline and the foot of the wall, with no seam where it runs into the crest (TJ's
// choice). A country gets a dark edge only where it already has a real one: against something farther
// behind it (a skyline, a ridge crest) or at the foot of a face (a cliff, a bank). Across meadow and
// forest it has none; the lift and the shadow under it show where it ends.
if (!B) {
  const out = new Uint8Array(NW * SH), CREST = MATS.indexOf('crest');
  for (let y = 1; y < SH - 1; y++) for (let x = 1; x < NW - 1; x++) {
    const i = px(x, y), d = dest[i]; if (!d) continue; const k = d & 3, same = j => (dest[j] & 3) === k;
    if (d === 5) { if (dest[i - 1] !== 5 || dest[i + 1] !== 5 || dest[i - NW] !== 5 || dest[i + NW] !== 5) out[i] = 1; continue; }
    const below = i + NW;
    if (d & 4 && dest[below] !== d && zb[below] < zb[i] - 1 && !(k === 3 && mb[below] === CREST)) out[i] = 1;
    if ((!same(i - NW) && zb[i - NW] > zb[i] + 14) || (!same(i - 1) && zb[i - 1] > zb[i] + 14) || (!same(i + 1) && zb[i + 1] > zb[i] + 14)) out[i] = 1;
    if (!same(below) && zb[below] < zb[i] - 1 && Math.abs(zb[i] - zb[i - NW]) < 0.5) out[i] = 1;
  }
  // The lake is only brightened: deepening its dark steps as well turned the water navy, and round 3's
  // lake read as a bright sheet. The rock of the fin and the wall gets both, lit faces up and gullies down.
  const bolder = c => { const n = R[RAMP_OF[c]].length, s = STEP_OF[c]; return s >= n * 0.45 ? LIGHT[c] : s <= n * 0.25 ? SHADE[c] : c; };
  for (let i = 0; i < dest.length; i++) { const d = dest[i]; if (!d) continue; g[i] = out[i] || g[i] === INK ? INK : d === 5 ? LIGHT[g[i]] : d & 4 ? bolder(g[i]) : g[i]; }
}
const RANKTREES = [];
const riverFront = (u, v) => { if (coast(u, v) < -170) return false; for (let dv = 1; dv <= 34; dv += 3) for (let du = -8; du <= 8; du += 4) { const uu = Math.round(u + du), vv = Math.round(v + dv); if (uu >= 0 && vv >= 0 && uu < NW && vv < VD && water[at(uu, vv)] && coast(uu, vv) < 0) return true; } return false; };
// ---- the rainforest's ranks ---------------------------------------------------------------------
// After TJ's photographs: rows of conifers stand one behind another along the foothills' upper slopes
// and crests (E5b2; before, wherever the fog used to lie), so the rows arch over each hill and show its
// shape. They are the kinds of the drier summits: mostly Douglas fir and western hemlock, some Sitka
// spruce toward the sea, a few redcedar.
// The Northwest's conifers, told apart at the map's size (E5b2, TJ: a variety, as on the Olympic
// Peninsula). Douglas fir: tall, narrow, dark, uneven gappy tiers. Western hemlock: yellower green,
// soft drooping tiers, its leader nodding over. Sitka spruce: blue-green, dense and stiff. Western
// redcedar: yellow-green, broad, its tips hanging, a red-brown trunk flared at the foot.
const SPRUCE_RAMP = [R.conifer[0], R.hill[0], R.hill[1], R.hill[2], R.mist[3]], CEDAR_RAMP = [R.moss[1], R.moss[2], R.moss[3], R.pine[3], R.moss[4]];
const KINDS_NW = {
  douglas: (s, H) => makeConifer(s, H, Math.round(H * 0.36), 'conifer', Math.max(5, Math.round(H / 7)), { ragged: 1 }),
  hemlock: (s, H) => makeConifer(s, H, Math.round(H * 0.46), 'pine', Math.max(5, Math.round(H / 6.5)), { droop: 1.8, nod: true }),
  spruce: (s, H) => makeConifer(s, H, Math.round(H * 0.5), SPRUCE_RAMP, Math.max(6, Math.round(H / 5.5))),
  cedar: (s, H) => makeConifer(s, H, Math.round(H * 0.56), CEDAR_RAMP, Math.max(5, Math.round(H / 7)), { droop: 2.6, bark: 'pbark' })
};
// How wet the forest is at a spot, 0 to 1 (E5b2, after the Olympic Peninsula): wettest by the sea and on
// the valley floors, along the trail too, drier up the hills and toward the forest's east edge.
const wetAt = (u, v) => clamp(0.55 * smooth(-260, -30, coast(u, v)) + 0.5 * (1 - hillUp(u, v)) - 0.45 * smooth(forestEdge(v) - 220, forestEdge(v), u) + (nearTrail(u, v, 40) ? 0.3 : 0), 0, 1);
const ridgeRow = (u, v) => coast(u, v) < -18 && forestAmt(u, v) > 0.3 && hillUp(u, v) > 0.32 + 0.12 * (vnoise(u / 40, v / 30, 238) - 0.5);
{
  const rr = rng(2311);
  // Tall in the nearest ranks, smaller and with fewer tiers the farther back they stand (D6a).
  const SIZES = [24, 28, 33, 38, 44, 50, 57, 64], lib = {};
  const kindOf = (u, v) => { const w = wetAt(u, v), k = rr(); return k < 0.08 + 0.3 * w * smooth(-200, -40, coast(u, v)) ? 'spruce' : k < 0.5 ? 'douglas' : k < 0.86 ? 'hemlock' : 'cedar'; };
  const tree = (x0, base, v) => {
    const want = (64 - 34 * smooth(0, VD, v)) * (0.8 + 0.4 * vnoise(x0 / 23, v / 17, 237)), n = SIZES.reduce((b, H, j) => Math.abs(H - want) < Math.abs(SIZES[b] - want) ? j : b, 0), kind = kindOf(x0, v);
    const set = (lib[kind] || (lib[kind] = []))[n] || (lib[kind][n] = [0, 1].map(i => KINDS_NW[kind](360 + n * 7 + i + kind.length * 50, SIZES[n])));
    const t = set[(rr() * set.length) | 0]; if (!riverFront(x0, v)) RANKTREES.push({ t, x: x0, y: base, v });
  };
  // The ranks, far to near. Each is a line across the forest at one distance from the camera.
  for (let c = VD + 170; c > -60; c -= 26 + rr() * 12) {
    const seed = Math.round(c), vOf = u => c - 0.25 * u + 10 * (vnoise(u / 60, seed, 232) - 0.5);
    for (let u = 2 + rr() * 5; u < 700; u += 6 + rr() * 5) {
      const v = vOf(u); if (v < 2 || v >= VD - 1 || !ridgeRow(u, v)) continue;
      if (fbm(u / 26, seed / 7, 233, 2) < 0.15 || rr() > 0.85) continue;
      tree(Math.round(u), Math.round(SY - v - hAt(u, v)), v);
    }
  }
}
// ---- things that stand up -------------------------------------------------------------------------
// put and plant still take where the fog lies (f) from their callers; since E5 nothing is paled by it for good.
const STACKS = [], things = [], put = (bm, u, v, f, tree) => things.push({ bm, u: Math.round(u), v: Math.round(v), isTree: tree }), plant = (tree, u, v) => things.push({ tree, u: Math.round(u), v: Math.round(v) });
const wet8 = (u, v) => { for (let dv = -3; dv <= 6; dv += 3) for (let du = -9; du <= 9; du += 3) if (water[at(clamp(u + du, 0, NW - 1), clamp(v + dv, 0, VD - 1))]) return true; return false; };
const slope = (u, v) => Math.hypot(hAt(u + 2, v) - hAt(u - 2, v), hAt(u, v + 2) - hAt(u, v - 2)) / 4;
const open = (u, v, max = 0.8) => u > 2 && u < NW - 2 && v > 1 && v < VD - 2 && coast(u, v) < -32 && !lakeAt(u, v) && !water[at(Math.round(u), Math.round(v))] && !wet8(Math.round(u), Math.round(v)) && slope(u, v) < max && !nearTrail(u, v, 9) && Math.hypot(u - TU, (v - TV) * 1.4) > 46;
{
  // Each placement loop below starts its own dice (D14): rand is set afresh before each, so a roll added to
  // or taken from one loop never moves what another places. A new loop gets a seed of its own the same way.
  let rand = rng(2026), any = a => a[(rand() * a.length) | 0], land = (u, v) => MATS[mg[at(Math.round(u), Math.round(v))]] === 'land';
  const wooded = (u, v) => { const i = at(Math.round(u), Math.round(v)), m = MATS[mg[i]], h = hg[i]; return m === 'land' ? h - (u < 760 ? hills(u, v) : 0) < 100 &&!(u > 760 && v > 684) : m === 'volc' ? VP(Math.min(1, vrelief(u, v).d)) < 0.17 + 0.05 * vnoise(u / 30, v / 30, 588) : m === 'crest' ? h < 48 : false; };
  const twisted = Array.from({ length: 5 }, (_, i) => makeTwisted(1200 + i));
  // Distance and height (D6a). The map has no perspective, so a tree far back or high up is drawn as a
  // smaller, plainer conifer, paled a little by the haze: at the back of the map about half size, and
  // shrinking further toward the treeline. Picked by where it stands, never by the dice, so nothing else moves.
  const shrinkAt = (u, v) => clamp(0.62 * smooth(520, 735, v) + 0.35 * smooth(70, 115, hAt(u, v)), 0, 0.72);
  const SMALL = [10, 13, 16, 20, 24, 29, 35, 42], smallOf = {};
  const sized = (t, u, v, ramp = 'conifer') => { const k = shrinkAt(u, v); if (k < 0.12) return t; const lib = smallOf[ramp] || (smallOf[ramp] = SMALL.map((H, n) => Array.from({ length: 3 }, (_, i) => makeConifer(1400 + n * 5 + i + ramp.length * 100, H, Math.round(H * 0.48) + 1, ramp, Math.max(3, Math.round(H / 7)))))); const want = (t.h || 40) * (1 - k), n = SMALL.reduce((b, H, j) => Math.abs(H - want) < Math.abs(SMALL[b] - want) ? j : b, 0), set = lib[n]; return { ...set[(hash(u | 0, v | 0, 5931) * set.length) | 0], haze: k }; };
  // Glades: the near rainforest opens into clearings here and there, so it reads as stands of trees.
  const glade = (u, v) => fogAmt(u, v) < 0.3 && fbm(u / 40, v / 30, 78, 3) < 0.34;
  const maples = Array.from({ length: 6 }, (_, i) => makeMaple(100 + i)), spruces = Array.from({ length: 6 }, (_, i) => makeSpruce(200 + i)), firs = Array.from({ length: 8 }, (_, i) => makeFir(300 + i));
  const bigleaf = Array.from({ length: 4 }, (_, i) => blobTree(800 + i, i & 1 ? 'larch' : 'sun', 36 + i * 2, 'bark', 5, 5.5));
  const larches = Array.from({ length: 6 }, (_, i) => { const r = rng(900 + i); return makeConifer(900 + i, 24 + (r() * 14 | 0), 10 + (r() * 4 | 0), 'larch', 6); });
  const pines = Array.from({ length: 5 }, (_, i) => makePonderosa(820 + i)), aspens = Array.from({ length: 7 }, (_, i) => makeAspen(600 + i)), snags = Array.from({ length: 5 }, (_, i) => makeSnag(730 + i));
  // The rainforest (E5b2, after the Olympic Peninsula): below the ranks on the hills, a mix picked by how
  // wet the spot is. Wet (by the sea, the valley floors, the trail): mostly mossy maples, Sitka spruce
  // and redcedar, with a gold bigleaf maple now and then. Drier (up the hills, the east edge): mostly
  // Douglas fir and hemlock, with some moss. A dark twisted maple stands here and there in the wettest.
  const NWT = {}; for (const [k, lo, hi] of [['douglas', 54, 70], ['hemlock', 44, 58], ['spruce', 48, 62], ['cedar', 40, 54]]) NWT[k] = Array.from({ length: 5 }, (_, i) => { const r = rng(1600 + i * 13 + k.length); return KINDS_NW[k](1600 + i * 13 + k.length, lo + (r() * (hi - lo) | 0)); });
  rand = rng(6101);
  for (let gv = -30; gv < VD; gv += 9) for (let gu = -10; gu < edgeE + 180; gu += 9) {
    const u = clamp(gu + rand() * 9, 3, NW - 4), v = clamp(gv + rand() * 9, 2, VD - 3), fa = forestAmt(u, v), r = rand();
    // A hill's flank is steep where it falls to the forest's edge, and trees stand on it anyway.
    if (rand() > fa * 0.78 || !open(u, v, u < 760 && hills(u, v) > 2 ? 2.6 : 1.3) || !wooded(u, v)) continue;
    // The ranks hold the hills' upper slopes.
    if (ridgeRow(u, v) || glade(u, v) || riverFront(u, v)) continue;
    const w = wetAt(u, v), pm = 0.05 + 0.36 * w, pg = pm + (w > 0.55 ? 0.04 : 0), ps = pg + 0.05 + 0.26 * w, pc = ps + 0.12 + 0.06 * w;
    if (r < pm) { plant(sized(w > 0.85 && hash(u | 0, v | 0, 5911) < 0.06 ? twisted[(hash(u | 0, v | 0, 5912) * twisted.length) | 0] : any(maples), u, v), u, v); continue; }
    if (r < pg) { if (shrinkAt(u, v) >= 0.12) plant(sized({ h: 40 }, u, v), u, v); else put(any(bigleaf), u, v, 0, true); continue; }
    plant(sized(any(NWT[r < ps ? 'spruce' : r < pc ? 'cedar' : r < pc + 0.24 + 0.2 * (1 - w) ? 'douglas' : 'hemlock']), u, v), u, v);
  }
  // Firs in clumps over the parkland, the meadows and the lower slopes of the crest.
  rand = rng(6102);
  for (let n = 0; n < 5200; n++) {
    const u = edgeE - 60 + rand() * 1000, v = rand() * VD, pa = parkAmt(u, v), h = hAt(u, v);
    if (fbm(u / 46, v / 40, 71, 3) < (pa > 0.4 || h > 20 ? 0.55 : 0.61) || forestAmt(u, v) > 0.2 || !open(u, v, 1.1) || h > 80) continue;
    if (!wooded(u, v)) continue;
    if (rand() < Math.max(larchAmt(u, v), dryAmt(u, v) * 1.2, burnAmt(u, v), eastAmt(u, v) * 0.8)) continue;
    // Round the Trailhead the meadow opens out (D6): clear grass near it, and further off only the
    // thickest clumps, with open ground between them. Checked after the dice so nothing else moves.
    const fir = any(firs), dT = Math.hypot(u - TU, (v - TV) * 1.4);
    if (dT < 70 || fbm(u / 46, v / 40, 71, 3) < (pa > 0.4 || h > 20 ? 0.55 : 0.61) + 0.09 * smooth(300, 110, dT)) continue;
    plant(sized(fir, u, v), u, v);
  }
  // Mount Monolith's lower flanks: firs in clumps up to the meadows under the ice, spruce where the
  // rainforest reaches round its west side.
  rand = rng(6103);
  for (let n = 0; n < 2600; n++) {
    const u = VOLC.cu + (rand() * 2 - 1) * VOLC.ru, v = VOLC.cv + (rand() * 2 - 1) * VOLC.rv;
    if (MATS[mg[at(Math.round(u), Math.round(v))]] !== 'volc' || !wooded(u, v) || fbm(u / 34, v / 26, 589, 3) < 0.5 || !open(u, v, 1.6)) continue;
    plant(sized(forestAmt(u, v) > 0.3 && rand() < 0.6 ? any(spruces) : any(firs), u, v), u, v, fogAmt(u, v));
  }
  rand = rng(6104);
  for (let n = 0; n < 5200; n++) {
    const u = C.LB[0] - C.LB[2] - 50 + rand() * (C.LB[2] * 2 + 100), v = C.LB[1] - C.LB[3] - 40 + rand() * (C.LB[3] * 2 + 80), m = MATS[mg[at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1))]], hi = m === 'gran';
    if (m === 'fin' || m === 'crest' || rand() > larchAmt(u, v) * (hi ? (hAt(u, v) > 98 ? 0.16 : 0.5) : 0.8) || fbm(u / 40, v / 30, 120, 3) < (hi ? 0.5 : 0.52) || !open(u, v, 0.7)) continue;
    if (rand() < burnAmt(u, v) * 1.2) { if (rand() < 0.4) put(any(snags), u, v); continue; }
    { const lt = sized(any(larches), u, v, 'larch'); if (talusAt(u, v) < 0.08) plant(lt, u, v); }
  }
  // More larches on the upper plateau (round 5, T22), in groups: each group stands by one of the plateau's
  // tarns or 50 px or more from the last group, so open slab lies between them and the plateau still reads
  // as granite. Their own dice, so no other tree moves.
  { const lr = rng(6112), anyL = a => a[(lr() * a.length) | 0], upper = (u, v) => MATS[mg[at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1))]] === 'gran' && hAt(u, v) > 98 && larchAmt(u, v) > 0.25, groups = [];
    const tarnNear = (u, v) => C.lakes.some(([cu, cv, ru, rv]) => { const d = Math.hypot((u - cu) / (ru + 16), (v - cv) / (rv + 10)); return d > 0.75 && d < 1.25; });
    for (let n = 0; n < 4000 && groups.length < 9; n++) {
      const cu = C.LB[0] - C.LB[2] + lr() * C.LB[2] * 2, cv = C.LB[1] - C.LB[3] + lr() * C.LB[3] * 2, size = 5 + (lr() * 5 | 0);
      if (!upper(cu, cv) || !open(cu, cv, 0.7) || (groups.length < 5 && !tarnNear(cu, cv)) || groups.some(([p, q]) => Math.hypot(p - cu, (q - cv) * 1.6) < 50)) continue;
      groups.push([cu, cv]);
      for (let k = 0; k < size; k++) { const a = lr() * 6.283, d = Math.sqrt(lr()) * 8, u = cu + Math.cos(a) * d * 1.6, v = cv + Math.sin(a) * d * 0.8, lt = sized(anyL(larches), u, v, 'larch'); if (upper(u, v) && open(u, v, 0.7) && talusAt(u, v) < 0.08) plant(lt, u, v); }
    } }
  const step1 = (u, v) => { const h = hAt(u, v); return u > 1215 && v > 424 && v < 540 ? smooth(36, 42, h) * smooth(66, 58, h) : 0; };
  const band = (u, v) => Math.max(eastAmt(u, v), step1(u, v)) * (1 - larchAmt(u, v)) * (1 - burnAmt(u, v)) * (1 - 0.85 * sageAmt(u, v));
  rand = rng(6105);
  // Aspen groves: a set number of them, each where the aspen country is (picked by its share), at least 26
  // apart, so how many there are does not hang on the luck of a few rolls. No aspen stands on the dry side
  // of the dry edge (round 5, T23): a tree whose own spot is dry ground is left out, and the dice roll on
  // as before so no other tree moves.
  const groves = [];
  for (let n = 0; n < 6000 && groves.length < 36; n++) {
    const cu = 1160 + rand() * 700, cv = rand() * 540, size = 8 + (rand() * 6 | 0), here = rand() < band(cu, cv) * (1 - 0.6 * dryAmt(cu, cv)) && !groves.some(([p, q]) => Math.hypot(p - cu, (q - cv) * 1.6) < 26);
    if (!here) continue; groves.push([cu, cv]);
    for (let k = 0; k < size; k++) { const a = rand() * 6.283, d = Math.sqrt(rand()) * 9, u = cu + Math.cos(a) * d * 1.5, v = cv + Math.sin(a) * d * 0.8; if (here && open(u, v) && land(u, v)) { const t = any(aspens); if (dryAmt(u, v) < 0.3) plant(t, u, v); } }
  }
  // The dry forest along TJ's line (E5g): ponderosa in the open, lodgepole in close stands, western
  // juniper where it gives out to sage, whitebark pine high on the bench under the plateau. Thinner than
  // the rainforest, thicker than the scattered pines before it.
  const lodge = Array.from({ length: 6 }, (_, i) => makeLodgepole(960 + i)), junipers = Array.from({ length: 5 }, (_, i) => makeJuniper(980 + i)), whitebarks = Array.from({ length: 4 }, (_, i) => makeWhitebark(990 + i));
  const stood = [];
  rand = rng(6106);
  for (let n = 0; n < 3400; n++) {
    const u = 1240 + rand() * 680, v = rand() * 600, stand = fbm(u / 50, v / 36, 215, 3);
    if (rand() > band(u, v) * (0.14 + 0.5 * smooth(0.45, 0.65, stand)) || !open(u, v) || !land(u, v) || hash(u | 0, v | 0, 5941) < palAmt(u, v)) continue;
    const h = hAt(u, v), kind = h > 60 && rand() < 0.5 ? 'wb' : sageAmt(u, v) > 0.25 || (eastOf(u, v) > 150 && rand() < 0.5) ? 'jun' : stand > 0.55 ? 'lodge' : 'pond';
    const gu = kind === 'lodge' ? 9 : kind === 'jun' ? 12 : 20, gv = kind === 'lodge' ? 7 : kind === 'jun' ? 9 : 16;
    if (stood.some(([a, b, g, k]) => Math.abs(a - u) < Math.max(g, gu) && Math.abs(b - v) < Math.max(k, gv))) continue;
    stood.push([u, v, gu, gv]);
    plant(any(kind === 'wb' ? whitebarks : kind === 'jun' ? junipers : kind === 'lodge' ? lodge : pines), u, v);
  }
  rand = rng(6107);
  for (let n = 0; n < 520; n++) { const u = 1440 + rand() * 330, v = 400 + rand() * 200; if (rand() < burnAmt(u, v) && open(u, v) && land(u, v)) put(any(snags), u, v, 0, true); }
  // New growth in the burn (E5g, TJ): along the rivers off the plateau, slide alder and manzanita are
  // leafing out among the snags and the fireweed. Thick by the water, a few farther off.
  { const shrubs = [0, 1, 2].map(i => makeShrub(1000 + i, 'alder')).concat([0, 1].map(i => makeShrub(1010 + i, 'manz'))), SHR = new Map(shrubs.map(b => [b, swaying(b)]));
    const toWater = (u, v) => { let d = 30; for (let dv = -30; dv <= 30; dv += 2) for (let du = -30; du <= 30; du += 2) { const uu = Math.round(u + du), vv = Math.round(v + dv); if (uu >= 0 && vv >= 0 && uu < NW && vv < VD && water[at(uu, vv)]) d = Math.min(d, Math.hypot(du, dv)); } return d; };
    const gr = rng(6114);
    for (let n = 0; n < 1600; n++) { const u = 1440 + gr() * 330, v = 400 + gr() * 200; if (burnAmt(u, v) < 0.3 || !open(u, v) || !land(u, v)) continue; const w = toWater(u, v); if (gr() > 0.85 * smooth(28, 6, w) + 0.03) continue; plant(SHR.get(shrubs[w < 14 && gr() < 0.7 ? (gr() * 3) | 0 : 3 + ((gr() * 2) | 0)]), u, v); } }
  // Round 3's furniture of the ground: boulders and bushes in the open, granite slabs among the larches,
  // sage in the dry corner, ferns and logs on the forest floor, sea stacks off the beach, a fir on the island.
  const boulders = Array.from({ length: 6 }, (_, i) => makeBoulder(500 + i, 3 + i * 0.8));
  const slabs = Array.from({ length: 4 }, (_, i) => { const b = makeBoulder(520 + i, 5 + i * 1.5); for (let k = 0; k < b.d.length; k++) if (b.d[k] && b.d[k] !== INK) b.d[k] = R.granite[clamp(R.rock.indexOf(b.d[k]) + 1, 1, 5)]; return b; });
  const bushes = [0, 1, 2].map(i => makeBush(700 + i, 'huck')).concat([0, 1, 2].map(i => makeBush(710 + i, 'heather')), [0, 1].map(i => makeBush(720 + i, 'green')));
  // Each bush's top sways in the wind (D5a); SWAY gives its swaying version.
  const SWAY = new Map(bushes.map(b => [b, swaying(b)]));
  const sages = [0, 1, 2].map(i => sageBush(850 + i)), burnt = Array.from({ length: 4 }, (_, i) => charred(740 + i)), young = Array.from({ length: 4 }, (_, i) => makeConifer(940 + i, 9 + i * 2, 6, 'kit', 3));
  const ferns = Array.from({ length: 6 }, (_, i) => makeFern(400 + i)), logs = Array.from({ length: 6 }, (_, i) => makeLog(i));
  const meadowy = (u, v) => forestAmt(u, v) < 0.3 && burnAmt(u, v) < 0.3 && dryAmt(u, v) < 0.3 && Math.hypot(u - TU, (v - TV) * 1.4) > 40;
  rand = rng(6108);
  for (let n = 0; n < 700; n++) { const u = 420 + rand() * 1200, v = rand() * 640; if (!open(u, v) || !meadowy(u, v)) continue; const m = MATS[mg[at(Math.round(u), Math.round(v))]]; if ((m !== 'land' && m !== 'moraine') || isleAt(u, v) < 1.4) continue; const rock = m === 'moraine' || rand() < 0.3; if (rock) put(any(boulders), u, v); else plant(SWAY.get(any(bushes)), u, v); }
  // The parkland's heather grows in clumps where the drifts leave room for it, and a few boulders lie
  // about (D5). Their own dice, so nothing planted before them moves, and the boulders have theirs (round 5, T21).
  const soil = (u, v) => { const m = MATS[mg[at(Math.round(u), Math.round(v))]]; return m === 'land' || m === 'volc'; };
  { const hr = rng(4711), br = rng(4712), heath = bushes.slice(3, 6), anyH = a => a[(hr() * a.length) | 0], anyB = a => a[(br() * a.length) | 0];
    for (let n = 0; n < 3400; n++) { const u = 400 + hr() * 720, v = 340 + hr() * 300; if (DRIFT(u, v) !== 'heather' || hr() > 0.55 || !open(u, v) || !meadowy(u, v) || !soil(u, v)) continue; plant(SWAY.get(anyH(heath)), u, v); }
    // Wildflowers in clumps (D5a): thick in the parkland's drifts, scattered through the other meadows,
    // each clump a little drawing of stems whose blooms sway on their own.
    // Flowers grow on slopes a tree could not stand on, so they keep to their own rule.
    const bloomy = (u, v) => u > 2 && u < NW - 2 && v > 1 && v < VD - 2 && coast(u, v) < -32 && !lakeAt(u, v) && !water[at(Math.round(u), Math.round(v))] && slope(u, v) < 2.4 && !nearTrail(u, v, 5);
    const fr = rng(11), FL = {}; for (const k of ['lupine', 'red', 'white', 'yellow']) FL[k] = Array.from({ length: 4 }, (_, i) => makeFlowers(k, 1300 + i * 7 + k.length));
    for (let n = 0; n < 9000; n++) {
      const cu = fr() * NW, cv = fr() * VD, type = fr(), dw = DRIFT(cu, cv), count = (dw ? 3 : 2) + (fr() * (dw ? 6 : 4) | 0), m = MATS[mg[at(Math.round(cu), Math.round(cv))]];
      if ((m !== 'land' && m !== 'volc') || !bloomy(cu, cv) || forestAmt(cu, cv) > 0.25) continue;
      // How many take is flowerAmt's to say (T21): thickest in the drifts, thin in the heather's own ground.
      const want = (dw === 'heather' ? 0.25 : dw ? 1.2 : 1) * flowerAmt(cu, cv);
      if (fr() > want) continue;
      for (let k = 0; k < count; k++) {
        const u = cu + (fr() - 0.5) * 18, v = cv + (fr() - 0.5) * 10; if (!bloomy(u, v)) continue;
        const kind = DRIFT(u, v) || (type < 0.5 ? 'lupine' : type < 0.75 ? 'red' : type < 0.9 ? 'white' : 'yellow'); if (kind === 'heather') continue;
        plant(FL[kind][(fr() * 4) | 0], u, v);
      }
    }
    for (let n = 0; n < 400; n++) { const u = C.PK[0] + (br() * 2 - 1) * C.PK[2], v = C.PK[1] + (br() * 2 - 1) * C.PK[3]; if (parkAmt(u, v) < 0.6 || br() > 0.12 || !open(u, v, 1) || !meadowy(u, v)) continue; put(anyB(boulders), u, v); } }
  rand = rng(6109);
  for (let n = 0; n < 300; n++) { const u = 1240 + rand() * 680, v = 380 + rand() * 320; if (MATS[mg[at(Math.round(u), Math.round(v))]] === 'gran' && open(u, v, 0.7) && rand() < 0.5) put(any(slabs), u, v); }
  // Big blocks lie about the talus fan, on dice of their own (D9).
  if (PF) { const tr = rng(910); for (let n = 0; n < 260; n++) { const u = PF.cu - 100 + tr() * 200, v = PF.cv - 42 + tr() * 38, k = (tr() * 3) | 0; if (talusAt(u, v) > 0.35 && tr() < 0.22 && !snowPatch(u, v) && MATS[mg[at(Math.round(u), Math.round(v))]] === 'gran') put(boulders[k], u, v); } }
  const SAGE = new Map(sages.map(b => [b, swaying(b)]));
  rand = rng(6110);
  for (let n = 0; n < 900; n++) { const u = 1300 + rand() * 620, v = rand() * 480; if (rand() < sageAmt(u, v) * 0.5 && open(u, v) && land(u, v)) plant(SAGE.get(any(sages)), u, v); }
  // The sage flats (D10): bushes thick where the pines have given out, thinning onto the Palouse.
  { const sr = rng(4720); for (let n = 0; n < 5200; n++) { const u = 1300 + sr() * 620, v = sr() * 480, k = (sr() * sages.length) | 0; if (sr() < sageAmt(u, v) * 0.55 * (1 - 0.8 * palAmt(u, v)) && open(u, v) && land(u, v)) plant(SAGE.get(sages[k]), u, v); } }
  rand = rng(6111);
  for (let n = 0; n < 400; n++) { const u = 1440 + rand() * 330, v = 400 + rand() * 200; if (rand() < burnAmt(u, v) && open(u, v) && land(u, v)) { if (rand() < 0.5) put(any(burnt), u, v, 0, true); else plant(any(young), u, v); } }
  rand = rng(6112);
  for (let n = 0; n < 4000; n++) { const u = rand() * 720, v = rand() * VD; if (forestAmt(u, v) > 0.6 && fogAmt(u, v) < 0.25 && hills(u, v) < 3 && open(u, v, 1.1) && wooded(u, v)) things.push({ bm: any(ferns), u: Math.round(u), v: Math.round(v), fern: true }); }
  rand = rng(6113);
  for (let n = 0; n < 120; n++) { const u = rand() * 720, v = rand() * VD; if (forestAmt(u, v) > 0.7 && fogAmt(u, v) < 0.25 && hills(u, v) < 3 && open(u, v, 0.8) && wooded(u, v)) put(any(logs), u, v); }
  // Driftwood above the high-water line (round 5, T8): eight logs' worth of drawings, each at its own angle.
  // The dice are rolled as they were, so every log lies where its blob lay.
  { const dr = rng(4730), drift = Array.from({ length: 8 }, (_, i) => makeDriftwood(i));
    for (let n = 0; n < 2600; n++) { const u = dr() * 700, v = dr() * VD, k = (dr() * 8) | 0, c = coast(u, v); if (c > -20 && c < -9 && dr() < 0.2 && !water[at(Math.round(u), Math.round(v))]) put(drift[k], u, v); }
    // More of it, on dice of their own: a Pacific beach is lined with driftwood. Each lies 26 px or more from
    // the next, on dry sand in the same band above the high-water line.
    const more = rng(4734), lie = things.filter(t => drift.includes(t.bm)).map(t => [t.u, t.v]);
    for (let n = 0; n < 3000 && lie.length < 16; n++) { const u = more() * 700, v = more() * VD, k = (more() * 8) | 0, c = coast(u, v); if (c > -20 && c < -9 && !water[at(Math.round(u), Math.round(v))] && !lie.some(([p, q]) => Math.hypot(p - u, (q - v) * 1.5) < 26)) { put(drift[k], u, v); lie.push([u, v]); } } }
  // Sea stacks stand well out from the beach (E5b, TJ: they had crept in against the shore), in four
  // small groups along the coast as on the Olympic coast: a tall one and one or two lower beside it.
  rand = rng(6114);
  { const groups = []; for (let n = 0; n < 6000 && groups.length < 4; n++) { const u = rand() * 700, v = rand() * VD, c = coast(u, v); if (c < 44 || c > 96 || groups.some(([a, b]) => Math.hypot(a - u, b - v) < 130)) continue; groups.push([u, v]);
    for (let j = 0, m = 0, k = 2 + (rand() < 0.5 ? 1 : 0); j < 60 && m < k; j++) { const su = m ? u + (rand() - 0.5) * 80 : u, sv = m ? v + (rand() - 0.5) * 50 : v; if (coast(su, sv) < 30 || coast(su, sv) > 104 || STACKS.some(([a, b]) => Math.hypot(a - su, (b - sv) * 1.5) < 18)) continue; m++; STACKS.push([su, sv]); const H = (m === 1 ? 32 : 14) + (rand() * 20 | 0); put(seaStack(STACKS.length, H, Math.round(H * 0.45)), su, sv); } } }
  plant(any(firs), ISLE[0], ISLE[1]);
}
// Surf breaks white round the foot of each sea stack, broken into dashes (D11).
if (!B) for (const [su, sv] of STACKS) { const fy = Math.round(SY - sv - hAt(su, sv)); for (let a = 0; a < 6.283; a += 0.05) { const x = Math.round(su + Math.cos(a) * 9), y = Math.round(fy + 1 + Math.sin(a) * 3); if (x < 0 || y < 0 || x >= NW || y >= SH || hash(Math.round(a * 9), 0, 4731) < 0.25) continue; const i = px(x, y); if (coast(x, zb[i]) > 0) g[i] = Math.sin(a) > 0 ? R.white[1] : R.white[0]; } }
// Far first. A thing that nearer ground partly hides is painted into the ground picture for good,
// clipped where it is hidden. Every other thing is handed to the scene whole, to be drawn each frame.
// Nothing grows on the lookout's cleared summit (E5j). Taken out after every roll of the dice, so
// nothing else moves.
for (const list of [things, RANKTREES]) for (let k = list.length - 1; k >= 0; k--) { const th = list[k], u = th.u ?? th.x; if (lookAmt(u, th.v) > 0.2) list.splice(k, 1); }
things.sort((a, b) => b.v - a.v);
const live = [], HAZE = [0.1, 0.18, 0.27, 0.36].map(veilTable);
for (const th of things) {
  const h = hAt(th.u, th.v), fy = Math.round(SY - th.v - h);
  if (fy >= 0 && fy < SH && painted[px(Math.round(th.u), fy)]) continue;
  const blit = (bm, sx, sy) => { for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i], x = sx + i, y = sy + j; if (!c || x < 0 || y < 0 || x >= NW || y >= SH || zb[px(x, y)] < th.v - 3) continue; g[px(x, y)] = c; } };
  const each = fn => { if (th.tree) for (const p of th.tree.parts) fn(p.bm, th.u + p.x, fy + p.y); else fn(th.bm, th.u - (th.bm.ox || 0), fy - (th.bm.oy || 0)); };
  let n = 0, seen = 0;
  each((bm, sx, sy) => { for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { if (!bm.d[j * bm.w + i]) continue; n++; const x = sx + i, y = sy + j; if (x >= 0 && y >= 0 && x < NW && y < SH && zb[px(x, y)] >= th.v - 3) seen++; } });
  if (th.tree || th.isTree) {
    if (seen < n * 0.12) continue;
    const hz = th.tree && th.tree.haze ? HAZE[clamp(Math.floor(th.tree.haze * 5.5) - 1, 0, 3)] : null, veil = bm => { if (!hz) return bm; const o = new BM(bm.w, bm.h); o.ox = bm.ox; o.oy = bm.oy; for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i]; if (c) o.d[j * bm.w + i] = hz[c]; } return o; };
    const clip = seen < n;
    if (th.tree) live.push({ tree: hz ? { ...th.tree, parts: th.tree.parts.map(p => ({ ...p, bm: veil(p.bm) })) } : th.tree, x: th.u, y: fy, v: th.v, clip });
    else live.push({ bm: veil(th.bm), x: th.u, y: fy, v: th.v, isTree: true, clip });
    continue;
  }
  if (seen >= n * 0.97) { live.push(th.tree ? { tree: th.tree, x: th.u, y: fy, v: th.v } : { bm: th.bm, x: th.u, y: fy, v: th.v, fern: th.fern, isTree: th.isTree }); continue; }
  if (!B && seen >= n * 0.12) each(blit);
}
// The ranks' trees are handed to the scene whole where enough of each shows, clipped by nearer ground.
for (const F of RANKTREES) { let n = 0, seen = 0; for (const p of F.t.parts) for (let j = 0; j < p.bm.h; j++) for (let i = 0; i < p.bm.w; i++) { if (!p.bm.d[j * p.bm.w + i]) continue; const x = F.x + p.x + i, y = F.y + p.y + j; n++; if (x >= 0 && y >= 0 && x < NW && y < SH && zb[px(x, y)] >= F.v - 3) seen++; }
  if (seen >= n * 0.12) live.push({ tree: F.t, x: F.x, y: F.y, v: F.v, clip: true }); }

if (!B) for (const th of live) {
  if (!th.tree && !th.isTree) continue;
  const rx = (th.tree ? th.tree.w : th.bm.w) * 0.42;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -Math.ceil(rx); dx <= rx; dx++) { if (sq(dx / rx) + sq(dy / 3.2) > 1) continue; const x = th.x + dx + 2, y = th.y + dy - 1; if (x < 0 || y < 0 || x >= NW || y >= SH) continue; const i = px(x, y); if (Math.abs(zb[i] - th.v) < 5 && g[i] !== INK) { if (th.tree && th.tree.low) g[i] = SHADE[g[i]]; else treeInk(i, SHADE[g[i]]); } }
}
if (!B) for (let i = 0; i < bare.length; i++) if (bare[i] && g[i] !== inked[i]) bare[i] = 0;
// Each footbridge's rails are things of their own: the far rail sorts behind him as he crosses and the
// near rail in front, so he is seen to run between them.
for (const br of BRIDGES) {
  const [ax, ay] = br.pts[0], [bx, by] = br.pts[br.pts.length - 1], len = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / len, uy = (by - ay) / len;
  let nx = -uy, ny = ux; if (ny < 0) { nx = -nx; ny = -ny; }
  const X0 = Math.floor(br.x0) - 7, Y0 = Math.floor(br.y0) - 13, bw = Math.ceil(br.x1) - X0 + 8, bh = Math.ceil(br.y1) - Y0 + 9;
  const rail = (side, sortY, v) => {
    const b = new BM(bw, bh), qx = t => ax + ux * t + nx * side * 3 - X0, qy = t => ay + uy * t + ny * side * 3 - Y0; b.ox = 0; b.oy = sortY - Y0;
    for (const t of [1, len / 2, len - 1]) for (let h = 0; h < 4; h++) b.set(qx(t), Math.round(qy(t)) - h, R.wood[2]);
    for (let t = 0; t <= len; t += 0.5) b.set(qx(t), Math.round(qy(t)) - 4, R.wood[4]);
    outline(b, INK); live.push({ bm: b, x: X0, y: sortY, v });
  };
  rail(-1, Math.floor(Math.min(ay, by)) - 3, br.v1); rail(1, Math.ceil(Math.max(ay, by)) + 4, br.v0);
}
const toY = (u, v) => Math.round(SY - v - hAt(u, v));
return { mesa, eastAmt, g, depth: zb, mat: mb, bare, fogField, mouthFog, stacks: STACKS, dest, destBox, DEST, hg, mg, painted, falls: FALLS, glFall: GL.fall, monoCover: MONO_COVER, trackUp: TRACK_UP, MATS, hAt, toY, things: live, C, lookout: LOOK, hills, hillUp, hillList, forestEdge, volc: VOLC, spires: SP, peak: PF, routes, water, trail, coast, forestAmt, fogAmt, dryAmt, sageAmt, parkAmt, flowerAmt, larchAmt, burnAmt, lakeAt, slope, matAt: (u, v) => MATS[mg[at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1))]] };
}

// ---- for the scene --------------------------------------------------------------------------------
// The scene works in positions on the map picture: x across, y down. Below is the land in those terms,
// under the names the scene took from round 3's terrain.js. Every position is worked out from the
// layout above, so moving a place there moves everything that belongs to it.
// The ground takes seconds to work out, so bake.sh works it out ahead of time into ground.png: the
// picture, the depth and what each pixel is made of, which pixels are painted mountain, then the heights,
// the materials and the water of the map. A bake is used only if it was made from the same source as
// this page (sourceSig); otherwise the land is worked out here, which is slow, not wrong.
export async function sourceSig() {
  const seen = new Set(), queue = ['./land.js']; let h = 2166136261;
  while (queue.length) {
    const f = queue.shift(); if (seen.has(f)) continue; seen.add(f);
    const t = await (await fetch(new URL(f, import.meta.url))).text();
    for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0;
    for (const m of t.matchAll(/from '(\.\/[\w.]+\.js)'/g)) queue.push(m[1]);
  }
  return h.toString(16);
}
export const BAKE_ROWS = 13 * SH + 4 * VD;
// Whether the bake was used, and if not, why: read by the page's __info, so a host that serves the files
// differently (an artifact, a CDN) can be asked instead of guessed at.
export const BAKE = { used: false, note: '' };
async function readBake() {
  if (globalThis.__noBake) { BAKE.note = 'switched off'; return null; }
  try {
    const res = await fetch(new URL('./ground.png', import.meta.url)); if (!res.ok) { BAKE.note = 'ground.png answered ' + res.status; return null; }
    const b = new Uint8Array(await res.arrayBuffer()), dv = new DataView(b.buffer), parts = []; let w = 0, h = 0, sig = '', falls = null;
    for (let p = 8; p + 12 <= b.length;) {
      const n = dv.getUint32(p), type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
      if (type === 'IHDR') { w = dv.getUint32(p + 8); h = dv.getUint32(p + 12); }
      else if (type === 'IDAT') parts.push(b.subarray(p + 8, p + 8 + n));
      else if (type === 'tEXt') { const t = String.fromCharCode(...b.subarray(p + 8, p + 8 + n)); if (t.startsWith('sig\0')) sig = t.slice(4); else if (t.startsWith('falls\0')) falls = JSON.parse(t.slice(6)); }
      p += 12 + n;
    }
    const want = await sourceSig();
    if (w !== NW || h !== BAKE_ROWS || sig !== want) { BAKE.note = 'made from other source: ground.png ' + sig + ' ' + w + 'x' + h + ', this page ' + want + ' ' + NW + 'x' + BAKE_ROWS; if (location.hostname === 'localhost') console.warn('ground.png no longer matches the map: run ./bake.sh'); return null; }
    const px = new Uint8Array(await new Response(new Blob(parts).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
    if (px.length !== (w + 1) * h) { BAKE.note = 'ground.png is cut short'; return null; }
    // One plane after another, each as wide as the map; every row starts with a 0 (stored as it is).
    let y0 = 0; const plane = rows => { const a = new Uint8Array(NW * rows); for (let y = 0; y < rows; y++) a.set(px.subarray((y0 + y) * (w + 1) + 1, (y0 + y + 1) * (w + 1)), y * NW); y0 += rows; return a; };
    const g = plane(SH), zh = plane(SH), zl = plane(SH), mb = plane(SH), painted = plane(SH), hh = plane(VD), hl = plane(VD), mg = plane(VD), water = plane(VD), bare = plane(SH), dest = plane(SH), fog = plane(SH), hillLight = plane(SH), deck = plane(SH), monoSnow = plane(SH), monoQ = plane(SH), mist = plane(SH);
    const zb = new Float32Array(NW * SH), hg = new Float32Array(NW * VD);
    for (let i = 0; i < zb.length; i++) { const q = zh[i] << 8 | zl[i]; zb[i] = q === 65535 ? 1e9 : q / 64; }
    for (let i = 0; i < hg.length; i++) hg[i] = (hh[i] << 8 | hl[i]) / 32;
    BAKE.used = true;
    return { g, zb, mb, painted, hg, mg, water, bare, dest, fog, hillLight, deck, monoSnow, monoQ, mist, falls };
  } catch (e) { BAKE.note = 'could not be read: ' + e.message; console.warn('ground.png could not be read', e); return null; }
}
// The bake is kept as well: buildTerrain takes the hills' evening light and the cloud deck from it (M3).
const BAKED = await readBake();
export const LAND = buildLand(BAKED);
const C = LAND.C, sxy = (u, v) => [Math.round(u), LAND.toY(u, v)];
// How far from the camera the ground drawn at a spot of the picture is. Sky is past everything.
const vAt = (x, y) => { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= NW || y >= SH ? 1e9 : LAND.depth[y * NW + x]; };
// The highest row of the picture where a column shows one kind of ground: a summit's top.
const topOf = (x, kind) => { const k = LAND.MATS.indexOf(kind); x = Math.round(x); for (let y = 0; y < SH; y++) if (LAND.mat[y * NW + x] === k) return y; return 0; };
export const OX = 0, OY = 0;
export const T = { x: C.T[0], y: LAND.toY(C.T[0], C.T[1]) };
// The trail conditions board and the register stand together just north-east of the junction, the register on
// the board's left (TJ, round 5 B2). The register clears his right shoulder so he never hides it, and the board
// moved east by the box's width to make room. The cats keep to both (cats.js).
export const REG = { x: C.T[0] + 16, y: LAND.toY(C.T[0] + 16, C.T[1] + 22) };
export const KIOSK = { x: REG.x + 23, y: LAND.toY(REG.x + 23, C.T[1] + 22) };
// ---- where things live ----------------------------------------------------------------------------
// Every sign and every animal on the map is placed by a rule read from the land: the kind of ground,
// its height, how far it is from a trail, whether it can be seen. No position is written down, so a
// change to the land takes them all with it. Positions here are in the world (u east, v away from the
// camera) until the end, where they become spots on the picture.
function habitat() {
  const S = LAND, at = (u, v) => clamp(Math.round(v), 0, VD - 1) * NW + clamp(Math.round(u), 0, NW - 1), rnd = rng(4040);
  // How far each spot is from the nearest trail, in pixels up to 255, worked out once.
  const tdist = new Uint8Array(NW * VD).fill(255);
  for (let i = 0; i < tdist.length; i++) if (S.trail[i]) tdist[i] = 0;
  for (let v = 0; v < VD; v++) for (let u = 0; u < NW; u++) { const i = v * NW + u; let d = tdist[i]; if (u) d = Math.min(d, tdist[i - 1] + 1); if (v) d = Math.min(d, tdist[i - NW] + 1, u ? tdist[i - NW - 1] + 1 : 255, u < NW - 1 ? tdist[i - NW + 1] + 1 : 255); tdist[i] = d; }
  for (let v = VD - 1; v >= 0; v--) for (let u = NW - 1; u >= 0; u--) { const i = v * NW + u; let d = tdist[i]; if (u < NW - 1) d = Math.min(d, tdist[i + 1] + 1); if (v < VD - 1) d = Math.min(d, tdist[i + NW] + 1, u < NW - 1 ? tdist[i + NW + 1] + 1 : 255, u ? tdist[i + NW - 1] + 1 : 255); tdist[i] = d; }
  const trailFar = (u, v) => tdist[at(u, v)];
  const fromT = (u, v) => Math.hypot(u - C.T[0], (v - C.T[1]) * 1.4);
  // Ground an animal or a sign can stand on: dry land, off the water and the trail, not too steep.
  const firm = (u, v, steep = 0.8) => u > 3 && u < NW - 3 && v > 2 && v < VD - 2 && !S.water[at(u, v)] && S.coast(u, v) < -32 && !S.lakeAt(u, v) && S.slope(u, v) < steep;
  // A spot shows on the picture if the ground drawn there is that spot and nothing nearer stands in front
  // of the few pixels above it (a sign's board, an animal's back).
  const shows = (u, v, up = 18) => { const x = Math.round(u), y = S.toY(u, v); if (x < 16 || x >= NW - 40 || y < up + 2 || y >= SH - 3) return false; if (Math.abs(S.depth[y * NW + x] - v) > 4) return false; for (let k = 5; k <= up; k += 6) if (S.depth[(y - k) * NW + x] < v - 3) return false; return true; };
  // Points over the whole world in an order the dice choose, so what is found first is never one corner.
  const GRID = []; for (let v = 3; v < VD - 3; v += 5) for (let u = 3; u < NW - 3; u += 5) GRID.push([u + rnd() * 5, v + rnd() * 5]);
  for (let i = GRID.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0, t = GRID[i]; GRID[i] = GRID[j]; GRID[j] = t; }
  const taken = [], apartFrom = (list, u, v, d) => list.every(([a, b]) => Math.hypot(a - u, (b - v) * 1.4) >= d);
  // The first n spots that keep a rule, apart from each other and from whatever was placed before.
  const find = (n, rule, apart = 40, from = GRID) => { const out = []; for (const [u, v] of from) { if (out.length >= n) break; if (apartFrom(out, u, v, apart) && apartFrom(taken, u, v, 34) && rule(u, v)) out.push([u, v]); } taken.push(...out); return out; };
  // The spot that scores best among those that keep a rule.
  const best = (rule, score, from = GRID) => { let top = null, s0 = -Infinity; for (const [u, v] of from) { if (!rule(u, v)) continue; const s = score(u, v); if (s > s0) { s0 = s; top = [u, v]; } } if (top) taken.push(top); return top; };
  // Spots just beside a trail, between two fractions of its length, on either side of it.
  const beside = (k, a, b, off = 12) => { const P = catmull(C.trails[k]), out = []; for (let n = Math.floor(P.length * a); n < P.length * b - 1; n += 4) { const [u0, v0] = P[n], [u1, v1] = P[n + 1], l = Math.hypot(u1 - u0, v1 - v0) || 1; for (const s of [1, -1]) out.push([u0 - (v1 - v0) / l * off * s, v0 + (u1 - u0) / l * off * s]); } return out; };
  const coulee = (u, v) => { let d = 1e9; for (const [a, b] of catmull(C.coulee)) d = Math.min(d, Math.hypot(a - u, b - v)); return d; };
  const signable = (u, v) => apartFrom(taken, u, v, 70) && firm(u, v, 0.9) && trailFar(u, v) >= 4 && shows(u, v, 20) && S.g[S.toY(u, v) * NW + Math.round(u)] !== R.fog[2];
  const ring = (p, r0, r1) => GRID.filter(([u, v]) => { const d = Math.hypot(u - p[0], (v - p[1]) * 1.4); return d >= r0 && d <= r1; });
  const sp = S.spires, vo = S.volc, tarn = S.C.lakes.find(l => l[4] === 'tarn'), wsum = [sp.cu + sp.west * sp.wide, sp.cv];
  // The col: the lowest point on the line from Mount Monolith's summit to the west end of the Spires.
  let col = null; for (let t = 0.25, lo = 1e9; t < 0.95; t += 0.01) { const u = lerp(vo.cu, wsum[0], t), v = lerp(vo.cv, wsum[1], t) - 60, h = S.hAt(u, v); if (h < lo) { lo = h; col = [u, v]; } }
  const SIGNS = {
    'yak-shave': find(1, (u, v) => signable(u, v) && S.forestAmt(u, v) < 0.1 && S.parkAmt(u, v) < 0.3, 0, beside(0, 0.12, 0.35)),
    'stack-trace': find(1, (u, v) => signable(u, v) && S.forestAmt(u, v) > 0.45 && S.forestAmt(u, v) < 0.8, 0, beside(0, 0.2, 0.8)),
    monorepo: find(1, (u, v) => signable(u, v) && S.forestAmt(u, v) > 0.85 && S.fogAmt(u, v) < 0.3, 60, beside(0, 0.2, 0.9)),
    'scope-creep': find(1, (u, v) => signable(u, v) && S.matAt(u, v) === 'moraine', 0, beside(1, 0.7, 1)),
    segfault: find(1, (u, v) => signable(u, v) && S.slope(u, v) > 0.35, 0, beside(1, 0.45, 0.75)),
    'merge-conflict': col ? find(1, signable, 0, ring(col, 0, 50)) : [],
    rollback: find(1, (u, v) => signable(u, v) && S.matAt(u, v) === 'land' && S.hAt(u, v) > 40 && S.hAt(u, v) < 66, 0, beside(2, 0.4, 0.8)),
    'feature-flag': tarn ? find(1, signable, 0, ring(tarn, tarn[2] + 6, tarn[2] + 24)) : [],
    hotfix: find(1, (u, v) => S.burnAmt(u, v) > 0.6 && signable(u, v)),
    postmortem: find(1, (u, v) => S.burnAmt(u, v) > 0.55 && signable(u, v), 70),
    'cron-job': find(1, (u, v) => S.dryAmt(u, v) > 0.3 && signable(u, v) && coulee(u, v) > 40 && coulee(u, v) < 56),
    'tech-debt': find(1, (u, v) => S.sageAmt(u, v) > 0.7 && signable(u, v) && coulee(u, v) > 90),
    // Off By One Peak: the top of the highest of the forested foothills round Mount Monolith's foot.
    'off-by-one': [best((u, v) => Math.hypot((u - vo.cu) / vo.ru, (v - vo.cv) / vo.rv) < 1.4 && S.matAt(u, v) === 'land' && S.hAt(u, v) < vo.H * 0.3 && signable(u, v), (u, v) => S.hAt(u, v))].filter(Boolean),
    dependency: find(1, (u, v) => signable(u, v) && S.hAt(u, v) > 80, 0, beside(2, 0.85, 1)),
    'cache-miss': find(1, (u, v) => { const c = S.coast(u, v); return c > -14 && c < -7 && shows(u, v, 20) && S.g[S.toY(u, v) * NW + Math.round(u)] !== R.fog[2]; }),
    latency: find(1, (u, v) => { const c = S.coast(u, v); return c > -14 && c < -7 && shows(u, v, 20) && S.g[S.toY(u, v) * NW + Math.round(u)] !== R.fog[2]; }, 160)
  };
  // The elk herd keeps to a roomy flat in the parkland well away from the Trailhead.
  const roomy = (u, v) => [[-26, 0], [26, 0], [0, -18], [0, 18]].every(([a, b]) => firm(u + a, v + b, 0.5));
  // Round 5 (T6): the bottom trail passes them on its way to the forest, as the old lower trail did in round
  // 4, so among the roomy parkland flats they take the one nearest its western half.
  const B = C.bottom.slice(Math.floor(C.bottom.length / 3)), toB = (u, v) => Math.min(...B.map(p => Math.hypot(u - p[0], v - p[1])));
  const herd = best((u, v) => S.parkAmt(u, v) > 0.5 && S.forestAmt(u, v) < 0.15 && fromT(u, v) > 120 && trailFar(u, v) > 16 && firm(u, v, 0.5) && shows(u, v, 12) && roomy(u, v), (u, v) => S.parkAmt(u, v) + 0.3 * rnd() - toB(u, v) / 60);
  // Marmots sun on rocks: parkland or moraine with a steep bit of ground right beside them.
  const rocky = (u, v) => [[-6, 0], [6, 0], [0, 5], [0, -5]].some(([a, b]) => S.slope(u + a, v + b) > 0.9);
  // Two of them sun on boulders in the parkland between Reflection Lake and Mount Monolith (T43): flower
  // meadow 20 to 50 beyond the lake's far shore and no further east or west than 20 past its ends, 14 clear of
  // the trail and of any stream, in plain sight, 60 apart. The meadow there is the mountain's steep lower slope, so
  // the ground may be steeper than other animals' (up to 2). buildTerrain puts a boulder under each.
  // None lies where glacier ice or snow is drawn behind it or beside it (T29, TJ: a full-size marmot against ice
  // that is meant to look small and far away).
  const iceBehind = (u, v) => { const x = Math.round(u), y = S.toY(u, v); for (let k = -2; k <= 16; k += 2) for (const a of [-10, 0, 10]) { const r = RAMP_OF[S.g[clamp(y - k, 0, SH - 1) * NW + clamp(x + a, 0, NW - 1)]]; if (r === 'glac' || r === 'snow' || r === 'farsnow') return true; } return false; };
  const lakeM = C.lakes[0], streamNear = (u, v) => { for (let b = -12; b <= 12; b += 4) for (let a = -12; a <= 12; a += 4) if (S.water[at(u + a, v + b)]) return true; return false; };
  const parkMarmots = find(2, (u, v) => S.parkAmt(u, v) > 0.5 && (S.matAt(u, v) === 'land' || S.matAt(u, v) === 'volc') && v > lakeM[1] + lakeM[3] + 20 && v < lakeM[1] + lakeM[3] + 50 && Math.abs(u - lakeM[0]) < lakeM[2] + 20 && trailFar(u, v) > 14 && !streamNear(u, v) && firm(u, v, 2) && shows(u, v, 16) && !iceBehind(u, v), 60);
  // The third keeps to the moraine's rocks, or failing that the parkland's.
  const onRocks = mor => (u, v) => (mor ? S.matAt(u, v) === 'moraine' : S.parkAmt(u, v) > 0.3) && firm(u, v, 1.2) && shows(u, v, 8) && rocky(u, v) && !iceBehind(u, v) && apartFrom(parkMarmots, u, v, 140);
  const rockMarmot = find(1, onRocks(true)), marmots = [...parkMarmots, ...(rockMarmot.length ? rockMarmot : find(1, onRocks(false)))];
  // Goats on the granite: one nanny and kid on the step under Proficiency Peak, one pair higher up.
  const slab = (lo, hi) => (u, v) => S.matAt(u, v) === 'gran' && S.hAt(u, v) > lo && S.hAt(u, v) < hi && firm(u, v, 0.7) && shows(u, v, 12);
  const goats = [...find(1, slab(74, 100)), ...find(1, slab(100, 160))];
  // Bighorn sheep in one band on top of a basalt bench of the dry country (T35), picking along its edges: each
  // stands on a bench's top within 16 of where it drops away, with 16 of level top to one side of it to walk along. The band's bench is the nearest to the head of
  // the coulee, where they lived until round 5, that holds four of them.
  const benchTop = (u, v) => S.mesa(u, v) > 10 && S.dryAmt(u, v) > 0.5 && firm(u, v, 0.8), onBench = (u, v) => benchTop(u, v) && shows(u, v, 12) && [-1, 1].some(sd => benchTop(u + sd * 8, v) && benchTop(u + sd * 16, v));
  const byEdge = (u, v) => onBench(u, v) && [[0, -6], [0, -12], [0, -16], [-12, 0], [12, 0], [0, 12]].some(([a, b]) => S.mesa(u + a, v + b) < S.mesa(u, v) - 8);
  const benchPts = GRID.filter(([u, v]) => byEdge(u, v)), headD = (u, v) => Math.hypot(u - C.coulee[0][0], (v - C.coulee[0][1]) * 1.4);
  const lead = benchPts.filter(([u, v]) => { const near = benchPts.filter(([a, b]) => Math.hypot(a - u, (b - v) * 1.4) <= 70 && apartFrom(taken, a, b, 34)); const got = [[u, v]]; for (const p of near) if (apartFrom(got, p[0], p[1], 20)) got.push(p); return got.length >= 4 && apartFrom(taken, u, v, 34); }).sort((p, q) => headD(...p) - headD(...q))[0];
  const sheep = lead ? find(4, byEdge, 20, [lead, ...ring(lead, 14, 70)]) : [];
  // The moose (T35): a bull and a calf in the riverside woods, the aspen and pine country east of the Proficiency
  // trail and short of the dry ground, below the Enchantments' cliff, between the two rivers that come down off it
  // (one within 120 to the west and one within 120 to the east). Of the roomy spots there, well off the trail and
  // with six trees or more within 70, the one that stands most in the open (farthest from any tree's foot, up to
  // 26), so that they are seen among the trees and not lost behind them.
  const rivers = (u, v) => [-1, 1].every(sd => { for (let d = 8; d <= 120; d += 4) if (S.water[at(u + sd * d, v)]) return true; return false; });
  const boles = S.things.filter(t => t.tree && !t.tree.low && S.eastAmt(t.x, t.v) > 0.4);
  const moose = best((u, v) => S.eastAmt(u, v) > 0.6 && S.dryAmt(u, v) < 0.15 && S.burnAmt(u, v) < 0.1 && S.larchAmt(u, v) < 0.1 && S.hAt(u, v) < 36 && trailFar(u, v) > 30 && firm(u, v, 0.5) && shows(u, v, 18) && roomy(u, v) && rivers(u, v),
    (u, v) => { let d = 26, n = 0; for (const t of boles) { const dd = Math.hypot(t.x - u, (t.v - v) * 1.4); if (dd < d) d = dd; if (dd < 70) n++; } return n >= 6 ? d + 0.01 * n : -1; });
  // Squirrels and chipmunks in the open meadow near trees, a bear at the edge of the forest.
  const squirrels = find(7, (u, v) => S.forestAmt(u, v) < 0.3 && S.dryAmt(u, v) < 0.3 && S.larchAmt(u, v) < 0.2 && S.hAt(u, v) < 45 && trailFar(u, v) > 6 && fromT(u, v) > 50 && firm(u, v) && shows(u, v, 6), 70);
  const bear = find(1, (u, v) => S.forestAmt(u, v) > 0.12 && S.forestAmt(u, v) < 0.35 && S.hAt(u, v) < 35 && S.dryAmt(u, v) < 0.2 && fromT(u, v) > 160 && firm(u, v, 0.6) && shows(u, v, 12))[0];
  // The black bear family's home (T34): the largest open patch inside the fir stand below the Spires' outflow
  // waterfall (the glacier's toe). Open: no tree's foot within 12. Inside the stand: a tree within 55 on every
  // one of the eight sides. Below the fall: 40 to 150 nearer the camera than its lip and up to 150 east of it,
  // the side the Proficiency trail lies on. And 12 clear of the trail, which crosses the stand. The spot
  // farthest from any tree wins; its third number is that distance, the room the family has.
  const bearHome = (() => {
    const [fu, fv] = C.glToe, firs = S.things.filter(t => t.tree && Math.abs(t.x - fu) < 220 && t.v > fv - 220 && t.v < fv + 30); let top = null;
    for (let v = fv - 150; v <= fv - 40; v += 3) for (let u = fu; u <= fu + 150; u += 3) {
      if (!firm(u, v, 0.5) || trailFar(u, v) < 12 || !shows(u, v, 12)) continue;
      let d = 1e9, sides = 0; for (const t of firs) { const du = t.x - u, dv = (t.v - v) * 1.4, dd = Math.hypot(du, dv); if (dd < d) d = dd; if (dd < 55) sides |= 1 << (Math.floor((Math.atan2(dv, du) + Math.PI) / (Math.PI / 4)) % 8); }
      if (d >= 12 && sides === 255 && (!top || d > top[2])) top = [u, v, d];
    }
    if (top) taken.push(top); return top; })();
  // In the sea: jellyfish in open water beyond the surf (T26), the whale farther out, the ferry's course past both.
  const clearSea = new Set(R.sea), sea = (lo, hi) => (u, v) => { const c = S.coast(u, v); return c > lo && c < hi && S.toY(u, v) < SH - 50 && shows(u, v, 4) && clearSea.has(S.g[S.toY(u, v) * NW + Math.round(u)]) && clearSea.has(S.g[(S.toY(u, v) - 6) * NW + Math.round(u)]); };
  const jelly = find(8, sea(50, 110), 26), whale = best(sea(90, 150), (u, v) => -Math.abs(S.coast(u, v) - 115) + 6 * rnd());
  // The timed events of E5k. Tumbleweeds start in open sage with 120 of firm ground east of them, the way
  // the wind rolls them; dust devils spin up on bare dry flats, in the north and the middle of the dry
  // corner (T13): its east and south edges lie under the menus, the timeline and the sign. The corner is
  // measured on the picture from its own dry ground, and a spot must leave its devil the room it wanders in
  // (18 west of where it starts, 54 east) on level dry ground in plain sight, clear of the creek and the elk.
  const tumbles = find(3, (u, v) => S.sageAmt(u, v) > 0.6 && firm(u, v, 0.5) && shows(u, v, 6) && [30, 60, 90, 120].every(d => firm(u + d, v, 0.9)), 60);
  const dryFlat = (u, v) => S.dryAmt(u, v) > 0.6 && S.sageAmt(u, v) > 0.3 && firm(u, v, 0.4);
  const DRY = GRID.filter(([u, v]) => dryFlat(u, v) && S.toY(u, v) < SH), dxs = DRY.map(p => p[0]), dys = DRY.map(p => S.toY(...p));
  const dryX = f => lerp(Math.min(...dxs), Math.max(...dxs), f), dryY = f => lerp(Math.min(...dys), Math.max(...dys), f);
  const WANDER = Array.from({ length: 13 }, (_, k) => k * 6 - 18);
  const devils = DRY.length ? find(3, (u, v) => { const y = S.toY(u, v); return u > dryX(0.2) && u < dryX(0.5) && y > dryY(0.1) && y < dryY(0.6) && (!herd || apartFrom([herd], u, v, 90)) && WANDER.every(d => dryFlat(u + d, v) && shows(u + d, v, 40) && Math.abs(S.toY(u + d, v) - y) <= 4); }, 90) : [];
  const out = (u, v) => [Math.round(u), S.toY(u, v)];
  // The rainforest's owl, faint light and eyes left the map in E5b (too small to find among the trees);
  // E5d puts them in the forest scene. Crows still circle over the forest's sunny edge, and keep to low forest on plain ground, so they circle against trees and not the mountain's ice.
  const crows = find(1, (u, v) => S.forestAmt(u, v) > 0.6 && S.forestAmt(u, v) < 0.9 && S.fogAmt(u, v) < 0.15 && S.matAt(u, v) === 'land' && S.hAt(u, v) < 30 && shows(u, v, 4), 0)[0];
  // The ferry's course runs along the coast just outside the farthest sea stack (E5b), so it never
  // passes through one and stays as near the shore, and as long in view, as that allows: from past the
  // west edge of the map to past its foot.
  const lane = Math.max(60, ...S.stacks.map(([u, v]) => S.coast(u, v))) + 46;
  const seaV = u => { for (let v = 0; v < VD; v++) if (S.coast(u, v) < lane) return v; return VD; }, seaU = v => { for (let u = 0; u < NW; u++) if (S.coast(u, v) < lane) return u; return 0; };
  const footV = S.toY(0, 0) - SH - 28, ferry = [[-30, S.toY(-30, seaV(-30))], [seaU(footV), SH + 28]];
  const herdAt = herd ? out(...herd) : null;
  return {
    tdist, firm,
    signs: Object.entries(SIGNS).filter(([, p]) => p && p.length).map(([k, p]) => [...out(...p[0]), k]),
    elk: herdAt ? [[herdAt[0], herdAt[1], 0], [herdAt[0] + 34, herdAt[1] + 14, 1], [herdAt[0] - 20, herdAt[1] + 26, 1], [herdAt[0] + 16, herdAt[1] + 40, 0]] : [],
    marmots: marmots.map((p, n) => [...out(...p), n < parkMarmots.length ? 1 : 0, Math.round(p[1])]),
    goats: goats.flatMap(p => { const [x, y] = out(...p); return [[x, y, 0], [x + 16, y + 6, 1]]; }),
    sheep: sheep.map((p, n) => [...out(...p), n & 1]),
    squirrels: squirrels.map((p, n) => [...out(...p), n % 3 === 0 ? 1 : 0]),
    bear: bear ? out(...bear) : out(...C.T),
    moose: moose ? out(...moose) : null,
    bearHome: bearHome ? [...out(bearHome[0], bearHome[1]), Math.round(bearHome[2])] : null,
    jelly: jelly.map((p, n) => [...out(...p), n % 3 ? 0 : 1]),
    whale: whale ? out(...whale) : [0, 0],
    ferry,
    tumbles: tumbles.map(([u, v]) => ({ x: Math.round(u), ys: Int16Array.from({ length: 141 }, (_, d) => S.toY(u + d, v)) })),
    devils: devils.map(p => out(...p)),
    // Birds circle over the elk's parkland, the dry corner and the granite; gulls over the sea by the beach.
    flocks: [
      crows && { cx: out(...crows)[0], cy: out(...crows)[1], rx: 40, ry: 14, n: 4, lift: 26, w: 0.33 },
      herdAt && { cx: herdAt[0], cy: herdAt[1] + 40, rx: 130, ry: 44, n: 3, lift: 56, w: 0.14 },
      ...find(1, (u, v) => S.sageAmt(u, v) > 0.6 && shows(u, v, 4), 0).map(p => ({ cx: out(...p)[0], cy: out(...p)[1], rx: 90, ry: 36, n: 1, lift: 84, w: 0.11, glide: true })),
      goats.length && { cx: out(...goats[0])[0], cy: out(...goats[0])[1], rx: 70, ry: 26, n: 1, lift: 70, w: -0.13, glide: true },
      ...find(1, sea(24, 50), 0).map(p => ({ cx: out(...p)[0], cy: out(...p)[1], rx: 80, ry: 30, n: 2, lift: 34, w: -0.16, gull: true })),
      ...find(1, sea(4, 20), 120).map(p => ({ cx: out(...p)[0], cy: out(...p)[1], rx: 34, ry: 14, n: 1, lift: 22, w: 0.25, gull: true }))
    ].filter(Boolean)
  };
}
export function buildTerrain() {
  // Each trail as points on the picture, close together, each with its depth.
  const line = pts => catmull(pts).filter((_, n, a) => n % 6 === 0 || n === a.length - 1).map(([u, v]) => [u, LAND.toY(u, v), v]);
  // The lake loop ends where it began: back along its first stretch to the junction. The Spires trail
  // ends at base camp on its island; what lies beyond is the boot track up the ice.
  // The lake loop runs from the Trailhead round to the Trailhead (T6), so it needs no way home added.
  const camp = C.trails[1].findIndex(p => p[0] === C.island[0] && p[1] === C.island[1]) + 1;
  const lines = { lake: line(C.trails[0]), stack: line(C.trails[2]), spires: line(C.trails[1].slice(0, camp)) };
  const H = habitat(), lake = C.lakes[0], peak = LAND.peak, sp = LAND.spires, shore = sxy(lake[0] + lake[2] + 8, lake[1] + 2);
  const flagOn = (x, v, kind) => { const y = LAND.toY(x, v); return { x: Math.round(x), y, lift: y - topOf(x, kind) }; };
  const spots = {
    signpost: sxy(C.T[0] - 4, C.T[1] + 8), kiosk: [KIOSK.x, KIOSK.y], register: [REG.x, REG.y],
    // Where a serac can break off (E4): the white top of a block in one of Mount Monolith's icefalls (its
    // serac blue just under snow), or the upper lip of the Spires' icefall (its glacier in glFall's
    // upper third), with ice or snow of the same ground for 40 pixels below to fall down. At least 46 apart; up to
    // two on each of the volcano's icefalls, which the opening view shows, and three on the Spires.
    seracs: (() => { const VI = LAND.MATS.indexOf('volc'), ICE = LAND.MATS.indexOf('ice'), r = rng(4740), out = [];
      const ICY = { snow: 1, serac: 1, glac: 1, ice: 1 }, below = (x, y, m) => { for (let d = 1; d <= 40; d++) { const j = (y + d) * NW + x; if (y + d >= SH || LAND.mat[j] !== m || !ICY[RAMP_OF[LAND.g[j]]]) return false; } return true; };
      const onMono = (x, y) => { const i = y * NW + x; return LAND.mat[i] === VI && RAMP_OF[LAND.g[i]] === 'snow' && RAMP_OF[LAND.g[i + NW]] === 'serac' && RAMP_OF[LAND.g[i + 3 * NW]] === 'serac' && below(x, y, VI); };
      const onSpires = (x, y) => { const i = y * NW + x, v = LAND.depth[i]; return LAND.mat[i] === ICE && v > LAND.glFall[1] - 8 && v <= LAND.glFall[1] && RAMP_OF[LAND.g[i]] === 'glac' && below(x, y, ICE); };
      // On the volcano, two on each icefall that can slide (round 5, T11: a face drops seracs only once its snow
      // has gone, so every face needs its own), at least 20 apart and in the upper two thirds of the face, so the block tumbles down over the ice. Then three
      // on the Spires, 46 apart.
      for (const A of LAND.monoCover) { let mine = 0; for (let n = 0; n < 8000 && mine < 2; n++) { const j = (r() * A.at.length) | 0, i = A.at[j], x = i % NW, y = (i / NW) | 0; if (A.q[j] < 170 && onMono(x, y) && !out.some(([a, b]) => Math.hypot(a - x, b - y) < 20)) { out.push([x, y]); mine++; } } }
      { let mine = 0; for (let n = 0; n < 60000 && mine < 3; n++) { const x = 4 + (r() * (NW - 8)) | 0, y = 8 + (r() * (SH - 60)) | 0; if (onSpires(x, y) && !out.some(([a, b]) => Math.hypot(a - x, b - y) < 46)) { out.push([x, y]); mine++; } } }
      return out; })(),
    // Mount Monolith's summit: the highest pixel of the painted volcano, where the lenticular cloud sits (E3).
    summit: (() => { let best = [LAND.volc.cu, 1e9]; for (let x = Math.round(LAND.volc.cu - 160); x <= LAND.volc.cu + 160; x += 2) { const y = topOf(x, 'volc'); if (y > 0 && y < best[1]) best = [x, y]; } return best; })(),
    // One tent (round 5, T49: "TJ and Kayti share tents"), on the island in the glacier (T48).
    tents: [[...sxy(C.isle[0] - 3, C.isle[1] - 2), 'tent']],
    journal: sxy(lake[0] + lake[2] + 16, lake[1] - 6), lakeShore: shore,
    // The osprey (round 5, T16): Reflection Lake as an oval on the picture, and where it dives: the middle of
    // the lake's widest open water, half way from the island to the east shore and a third of the way from
    // the lake's middle to its near shore.
    osprey: { lake: [...sxy(lake[0], lake[1]), lake[2], lake[3]], dive: sxy((C.lakeIsle[0] + 7 + lake[0] + lake[2]) / 2, lake[1] - lake[3] / 3) },
    // Where each destination's name is pinned: on the lake, on Proficiency Peak's wall, on the ice under the Spires.
    places: { lake: [lake[0], LAND.toY(lake[0], lake[1]) - 8], stack: [peak.cu, topOf(peak.cu, 'fin') + 44], spires: [sp.cu + 10, LAND.toY(sp.cu, 598)] },
    // A flag for each finished destination: at the lake shore, on Proficiency Peak, on the Spires' highest summit.
    // The six projects' summits on the map's Spires (L9): the six highest tops along the wall's skyline, at least
    // a ninth of its width apart, west to east in the order of the climbs.
    spireTops: (() => { const cols = []; for (let x = Math.max(1, Math.round(sp.cu - 420)); x < Math.min(NW - 1, sp.cu + 420); x++) { const t = topOf(x, 'wall'); if (t > 0) cols.push([x, t]); }
      if (cols.length < 6) return []; const gap = (cols[cols.length - 1][0] - cols[0][0]) / 9, picks = [];
      for (const c of [...cols].sort((a, b) => a[1] - b[1])) { if (picks.length === 6) break; if (picks.every(p => Math.abs(p[0] - c[0]) >= gap)) picks.push(c); }
      return picks.sort((a, b) => a[0] - b[0]); })(),
    flags: { lake: { x: shore[0], y: shore[1], lift: 0 }, stack: flagOn(peak.cu, peak.cv - 9, 'fin'), spires: flagOn(sp.top, sp.cv - 34, 'wall') },
    // Signs and animals, each placed by its rule (habitat, above).
    signs: H.signs, elk: H.elk, goats: H.goats, sheep: H.sheep, marmots: H.marmots, squirrels: H.squirrels, bear: H.bear, bearHome: H.bearHome, moose: H.moose, jelly: H.jelly, whale: H.whale, ferry: H.ferry, tumbles: H.tumbles, devils: H.devils,
    // The fire lookout on its cleared summit (E5j).
    lookout: LAND.lookout ? sxy(...LAND.lookout) : null
  };
  // The light on the foothills at Dusk (E5j), after the evening light in TJ's photographs: the sun is low
  // in the west, so a hill's crest and the west end of its skyline catch it and the rest is in shade.
  // For each pixel of the picture: how much of that warm rim it catches (1 to 15: the few pixels below a
  // hill's skyline on the picture, more toward its west end), how soon it goes dark (16 to 31: the
  // valleys round and between the hills), or how much light the tree tops standing up to 16 pixels past the skyline
  // catch (32 to 47; world.js lights only what stands there, not the farther ground behind).
  const hillLight = BAKED ? BAKED.hillLight : (() => { const M = new Uint8Array(NW * SH), HL = LAND.hillList(); if (!HL.length) return M;
    const X1 = Math.min(NW, Math.round(Math.max(...HL.map(h => h.cu + h.ru))) + 60), FE = Float32Array.from({ length: VD }, (_, v) => LAND.forestEdge(v));
    for (let y = 0; y < SH; y++) for (let x = 0; x < X1; x++) { const i = y * NW + x, v = LAND.depth[i]; if (v >= VD || LAND.coast(x, v) > -24) continue;
      const up = LAND.hillUp(x, v); let d2 = 9; for (const h of HL) d2 = Math.min(d2, sq((x - h.cu) / h.ru) + sq((v - h.cv) / h.rv));
      const e = FE[Math.min(VD - 1, Math.round(v))], dark = smooth(0.3, 0.02, up) * smooth(3.2, 1.4, d2) * smooth(e + 40, e - 30, x); if (dark > 0.04) M[i] = 16 + Math.round(dark * 15);
    }
    // The skyline of each hill on the picture: a hill pixel with farther ground (or sky) straight above it.
    for (let x = 0; x < X1; x++) for (let y = 13; y < SH - 12; y++) { const i = y * NW + x, v = LAND.depth[i]; if (v >= VD || LAND.depth[i - NW] < v + 8 || LAND.hills(x, v) < 6) continue;
      let h = HL[0]; for (const q of HL) if (sq((x - q.cu) / q.ru) + sq((v - q.cv) / q.rv) < sq((x - h.cu) / h.ru) + sq((v - h.cv) / h.rv)) h = q;
      const west = smooth(h.cu + h.ru * 0.45, h.cu - h.ru * 0.35, x) * smooth(0.12, 0.45, LAND.hillUp(x, v)); if (west < 0.05) continue;
      for (let k = 0; k <= 9; k++) { const j = i + k * NW; if (Math.abs(LAND.depth[j] - v) > 14 + k * 3) break; const r = west * (1 - k / 10); if (r > 0.05) M[j] = Math.max(M[j] < 16 ? M[j] : 0, 1 + Math.round(r * 14)); }
      for (let k = 1; k <= 16 && y - k > 0; k++) { const j = i - k * NW; if (M[j] < 32 || M[j] > 47) M[j] = 32 + Math.round(west * 14 * (1 - k / 20)); }
    }
    return M; })();
  const forestAmt = (x, y) => { const v = vAt(x, y); return v > VD ? 0 : LAND.forestAmt(x, v); };
  const coast = (x, y) => { const v = vAt(x, y); return v > VD ? -999 : LAND.coast(x, v); };
  // Nothing nearer stands in front of a sign's board or the trail conditions board.
  for (const [sx, sy, , half = 7] of [...spots.signs, [KIOSK.x, KIOSK.y, 'kiosk', 15], [REG.x, REG.y, 'register', 7], ...(spots.lookout ? [[...spots.lookout, 'lookout', 9]] : [])]) for (let i = LAND.things.length - 1; i >= 0; i--) {
    const th = LAND.things[i], w = th.tree ? th.tree.w : th.bm.w, h = th.tree ? th.tree.h : th.bm.h;
    if (th.y > sy - 3 && th.y - h < sy + 1 && Math.abs(th.x - sx) < w / 2 + half) LAND.things.splice(i, 1);
  }
  // A boulder under each parkland marmot (T43), with the flowers or heather that grew on the spot taken away.
  // The marmot's third number becomes how high the boulder's top stands, so that it lies on it.
  { const rock = makeBoulder(531, 5.5);
    for (const mm of spots.marmots) if (mm[2]) {
      for (let i = LAND.things.length - 1; i >= 0; i--) { const th = LAND.things[i]; if (!(th.tree ? th.tree.low : th.bm.h < 14)) continue; const w = th.tree ? th.tree.w : th.bm.w; if (Math.abs(th.y - mm[1]) < 7 && Math.abs(th.x - mm[0]) < (w + rock.w) / 2) LAND.things.splice(i, 1); }
      LAND.things.push({ bm: rock, x: mm[0], y: mm[1], v: mm[3] }); mm[2] = rock.h - 5;
    } }
  // The sea's corner, for the swells and the wash on the beach (critters.js): how wide and how tall the
  // corner is, found from the shore; then for each spot of it, whether a swell shows there and when, or
  // how far it is from the water's edge. cs: how far out from the high-water line each spot of sea and
  // beach lies (plus 4, up to 250), for the tide (E6).
  const seaW = (() => { for (let u = 0; u < NW; u++) { let wet = false; for (let v = 0; v < 70 && !wet; v += 2) wet = LAND.coast(u, v) > -8; if (!wet) return u + 8; } return NW; })();
  const seaTop = (() => { let top = 0; for (let u = 0; u < seaW; u += 2) for (let v = top; v < VD; v++) if (LAND.coast(u, v) > -8) top = v; return Math.max(0, LAND.toY(0, top) - 8); })();
  const SEA = { y0: seaTop, w: seaW, h: SH - seaTop }; for (const k of ['ph', 'gate', 'shore', 'cs']) SEA[k] = new Uint8Array(SEA.w * SEA.h);
  const wet = new Set(R.sea), fog = new Set(R.fog);
  for (let y = SEA.y0; y < SH; y++) for (let x = 0; x < SEA.w; x++) {
    const i = y * NW + x, v = LAND.depth[i]; if (v >= VD || fog.has(LAND.g[i])) continue;
    const cs = LAND.coast(x, v), j = (y - SEA.y0) * SEA.w + x;
    if (cs > -4) SEA.cs[j] = Math.min(250, Math.round(cs + 4));
    if (cs > -4 && cs < 8) SEA.shore[j] = 1 + Math.round((cs + 4) * 8);
    else if (cs >= 8 && wet.has(LAND.g[i]) && vnoise(x / 22, y / 9, 85) > (cs < 60 ? 0.4 : 0.54)) { SEA.gate[j] = cs < 40 ? 2 : 1; SEA.ph[j] = Math.floor(frac((cs + 7 * Math.sin(x / 37 + y / 61)) / 24) * 240); }
  }
  const open = (x, y) => { const v = vAt(x, y); return v < VD && H.firm(x, v, 1.0); };
  const nearTrail = (x, y, r) => { const v = vAt(x, y); return v < VD && H.tdist[Math.round(v) * NW + Math.round(x)] < r; };
  const flat = l => l.map(p => [p[0], p[1]]);
  // Where the marine layer lies when it is in (E5e), for each pixel of the picture, 0 to 255: over the sea
  // and the beach evenly, fading out over the open sea past 90 to 170 from the shore (it cost frame time
  // and added nothing there); over the rainforest by height, so the hills' upper slopes and their trees are
  // in the cloud and the valley floors stay under it; and in a band just above each skyline it covers
  // (the deck's own top), thinning upward. Only the rainforest's own ground takes it, never Mount
  // Monolith, the far ranges or the meadow.
  const deck = BAKED ? BAKED.deck : (() => { const M = new Uint8Array(NW * SH), X1 = 860, LANDM = LAND.MATS.indexOf('land');
    for (let y = 0; y < SH; y++) for (let x = 0; x < X1; x++) { const i = y * NW + x, v = LAND.depth[i]; if (v >= VD) continue;
      const cs = LAND.coast(x, v); let d;
      if (cs > -30) d = (0.6 + 0.25 * smooth(-30, 60, cs)) * smooth(170, 90, cs);
      else { if (LAND.mat[i] !== LANDM) continue; const fa = LAND.forestAmt(x, v); if (fa < 0.3) continue; d = smooth(6, 52, LAND.hAt(x, v)) * smooth(0.3, 0.6, fa); }
      if (cs > -50 && cs < 5) d *= LAND.mouthFog(x, v, cs);
      if (d > 0.02) M[i] = Math.round(d * 255);
    }
    for (let x = 0; x < X1; x++) for (let y = 1; y < SH; y++) { const i = y * NW + x; if (M[i] < 60 || M[i - NW]) continue; for (let k = 1; k <= 22 && y - k >= 0; k++) { const j = i - k * NW; if (M[j]) break; M[j] = Math.round(M[i] * (1 - k / 24)); } }
    return M; })();
  // Every waterfall and rapid (E8a): the white water painted where a stream falls (white, or the pale blue
  // beside white within two rows), over running water, found from the finished picture so it holds
  // whether the ground was baked or worked out. fall: its pixels; foot: those with plain water below, where
  // it churns.
  const falls = (() => { const W1 = R.white[1], W4 = R.water[4], N = NW * SH, M = new Uint8Array(N);
    for (let i = NW * 2; i < N - NW * 2; i++) { const c = LAND.g[i]; if (c !== W1 && c !== W4) continue; const v = LAND.depth[i]; if (v >= VD || !LAND.water[Math.round(v) * NW + (i % NW)]) continue;
      if (c === W4 && ![-2, -1, 1, 2].some(d => LAND.g[i + d * NW] === W1)) continue; M[i] = 1; }
    const fall = [], foot = []; for (let i = 0; i < N - NW; i++) if (M[i]) { fall.push(i); if (!M[i + NW]) { const v = LAND.depth[i + NW]; if (v < VD && LAND.water[Math.round(v) * NW + (i % NW)]) foot.push(i + NW); } }
    return { fall: Int32Array.from(fall), foot: Int32Array.from(foot) }; })();
  return { g: LAND.g, bare: LAND.bare, fog: LAND.fogField, hillLight, deck, whiteWater: falls, avalanche: LAND.monoCover, trackUp: LAND.trackUp.map(([u, v]) => [Math.round(u), Math.round(LAND.toY(u, v)), v]), vAt, depth: LAND.depth, dest: LAND.dest, destBox: LAND.destBox, DEST: LAND.DEST, things: LAND.things, falls: LAND.falls, spots, lines, trails: { lake: flat(lines.lake), stack: flat(lines.stack), spires: flat(lines.spires) }, trackPix: [], forestAmt, coast, open, nearTrail, sea: SEA, mist: BAKED ? unpackMist(BAKED.mist) : mistBox(H), flocks: H.flocks, make: { ferry, whale, sheep, squirrel } };
}

// Where the drifting mist may go (critters.js draws it). The mist comes out of the standing fog in the
// west, drifts east over the forest and thins away before the forest ends, so what it needs from the
// land is, for each screen row, where the standing fog gives out (edge) and where the sea meets the
// beach (shore, -1 on rows with no sea), and a coarse picture, two pixels to a cell, of where it may
// lie: 0 anywhere in the forest, 1 only thinly (over the trail, just in from the beach, over open
// ground), 2 not at all (the sea and the beach, the sky, the mountains).
// The mist's layout in one plane of the bake (M3): where it starts and how far east it reaches, each row's
// fog edge and shore (two bytes each, the shore one up so that none is 0), then the gate of each cell.
export function packMist(M, out) {
  const put2 = (o, v) => { out[o] = v >> 8 & 255; out[o + 1] = v & 255; };
  put2(0, M.y0); put2(2, M.x1);
  for (let y = 0; y < SH; y++) { put2(4 + 2 * y, M.edge[y]); put2(4 + 2 * SH + 2 * y, M.shore[y] + 1); }
  out.set(M.gate, 4 + 4 * SH);
}
function unpackMist(P) {
  const get2 = o => P[o] << 8 | P[o + 1], y0 = get2(0), x1 = get2(2), edge = new Int16Array(SH), shore = new Int16Array(SH);
  for (let y = 0; y < SH; y++) { edge[y] = get2(4 + 2 * y); shore[y] = get2(4 + 2 * SH + 2 * y) - 1; }
  const M = { x1, y0, w: x1 >> 1, h: Math.ceil((SH - y0) / 2), edge, shore };
  M.gate = P.slice(4 + 4 * SH, 4 + 4 * SH + M.w * M.h);
  return M;
}
function mistBox(H) {
  const at = (x, y) => y * NW + x, landMat = LAND.MATS.indexOf('land');
  const isFoggy = (x, y) => { const v = LAND.depth[at(x, y)]; return v < VD && LAND.fogAmt(x, v) > 0.35 && LAND.coast(x, v) < -10; };
  const woods = (x, y) => { const v = LAND.depth[at(x, y)]; return v < VD && LAND.forestAmt(x, v) > 0.3; };
  // The rows the forest covers, and how far east the mist can reach on any of them.
  let y0 = SH; for (let y = 0; y < SH && y0 === SH; y += 2) for (let x = 0; x < 700; x += 3) if (woods(x, y)) { y0 = Math.max(0, y - 16); break; }
  const raw = new Float32Array(SH).fill(-1), edge = new Int16Array(SH), shore = new Int16Array(SH).fill(-1);
  // Every other row and every other column is plenty for an edge that is smoothed anyway.
  for (let y = y0; y < SH; y++) {
    if ((y - y0) & 1) { shore[y] = shore[y - 1]; continue; }
    for (let x = 0; x < 760; x += 2) if (woods(x, y) && !isFoggy(x, y)) { raw[y] = x; break; }
    const v0 = LAND.depth[at(0, y)];
    if (v0 < VD && LAND.coast(0, v0) > 0) for (let x = 1; x < 760; x += 2) { const v = LAND.depth[at(x, y)]; if (v < VD && LAND.coast(x, v) < 0) { shore[y] = x; break; } }
  }
  // The fog's edge is smoothed over 41 rows so a bank keeps its shape as it leaves the fog.
  for (let y = y0; y < SH; y++) { let s = 0, n = 0; for (let d = -20; d <= 20; d++) { const r = raw[y + d]; if (y + d >= y0 && y + d < SH && r >= 0) { s += r; n++; } } edge[y] = n ? Math.round(s / n) : 0; }
  let x1 = 0; for (let y = y0; y < SH; y++) x1 = Math.max(x1, edge[y] + 340); x1 = Math.min(NW, x1 + (x1 & 1));
  const M = { x1, y0, w: x1 >> 1, h: Math.ceil((SH - y0) / 2), edge, shore };
  M.gate = new Uint8Array(M.w * M.h);
  for (let cy = 0; cy < M.h; cy++) for (let cx = 0; cx < M.w; cx++) {
    const x = cx * 2 + 1, y = Math.min(SH - 1, y0 + cy * 2 + 1), i = at(x, y), v = LAND.depth[i];
    let g = 0;
    if (v >= VD || LAND.mat[i] !== landMat) g = 2;
    else {
      const cs = LAND.coast(x, v) + 16 * vnoise(y / 6, 5, 135);
      // Over the standing fog it adds nothing but grey, so it lies there thinly or not at all.
      const f = LAND.fogAmt(x, v);
      if (cs > -10 || f > 0.62) g = 2; else if (cs > -42 || f > 0.4 || LAND.forestAmt(x, v) < 0.25 || LAND.lakeAt(x, v) || H.tdist[Math.round(v) * NW + x] < 7) g = 1;
    }
    M.gate[cy * M.w + cx] = g;
  }
  return M;
}
