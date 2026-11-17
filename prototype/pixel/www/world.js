// The world map: the top-down view of the Trailhead and its three destinations.
import { DEBUG, TAU, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, bayer, R, DAY, RAMP_OF, STEP_OF, INK, SHADE, LIGHT, KIND, BM, makePath } from './core.js';
import { breeze, veilTable } from './core.js';
import { makeCloud, makeSignpost, makeSmallSign, makeKiosk, makeLookout, makeTent, makeJournal, makeBird, makeFlag, makeRegister } from './sprites.js';
import { SIGNS, NAMES, DEST_NAMES } from './content.js';
import { makeCats } from './cats.js';
import { makeCritters } from './critters.js';
import { makeEvents, drawLens, startLens } from './events.js';
import { makeRunner } from './tj.js';
import { buildTerrain, NW as WW, NH as WH, T } from './land.js';
// How much of the bottom of the window the timeline bar covers, in page pixels: from its top edge down, measured
// from its layout once it shows (F9; 32 of its own pixels, the old guess, was a third too tall on a big window and
// let rows past the map's foot show above it). Read again only when the page is resized or the bar comes or goes.
let barAt = -1, barH = 0;
const barCss = () => { const el = document.getElementById('bar'), up = !!el && !el.hidden && el.offsetHeight > 0, key = (innerWidth * 1e4 + innerHeight) * 2 + (up ? 1 : 0); if (barAt !== key) { barAt = key; barH = up ? innerHeight - el.offsetTop : 32 * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) || 2); } return barH; };
// The opening frame (F5a). At twice one-to-one the Trailhead and the three destinations rarely all fit, so
// the frame is the one that shows the most destination names, then the largest share of each destination's
// country (each counts the same, however big), with the Trailhead and its name in view above the timeline bar. Ground under the junction
// sign (sign: its box in map pixels from the view's corner) does not count. Ties go to the frame nearest
// the Trailhead's own, so a screen that fits everything still centres on it.
function openFrame(T, boxes, names, VW, VH, WW, WH, bar, sign) {
  const x0 = Math.max(VW / 2, T.x - VW / 2 + 40), x1 = Math.min(WW - VW / 2, T.x + VW / 2 - 40);
  // Down as far as his feet clear the bar by 14; up as far as his name stays 50 inside the top.
  const y0 = Math.max(VH / 2, T.y + 14 + bar - VH / 2), y1 = Math.max(y0, Math.min(WH - VH / 2 + bar, T.y - 50 + VH / 2));
  let best = -1, bx = T.x, by = T.y;
  for (let cy = y0; cy <= y1; cy += 6) for (let cx = x0; cx <= x1; cx += 6) {
    const ox = cx - VW / 2, oy = cy - VH / 2; let s = 0;
    for (const b of boxes) {
      if (b.x1 < b.x0) continue;
      const w = Math.max(0, Math.min(b.x1, ox + VW) - Math.max(b.x0, ox)), h = Math.max(0, Math.min(b.y1, oy + VH - bar) - Math.max(b.y0, oy));
      let a = w * h;
      if (a && sign) { const sw = Math.max(0, Math.min(b.x1, ox + sign.x1) - Math.max(b.x0, ox + sign.x0)), sh = Math.max(0, Math.min(b.y1, oy + sign.y1) - Math.max(b.y0, oy + sign.y0)); a -= sw * sh; }
      s += a / ((b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1));
    }
    for (const n of names) { const x = n.x - ox, y = n.y - oy; if (x > 30 && x < VW - 30 && y > 12 && y < VH - bar - 8 && !(sign && x > sign.x0 - 30 && x < sign.x1 + 30 && y > sign.y0 - 8 && y < sign.y1 + 8)) s += 4; }
    s -= Math.hypot(cx - T.x, cy - T.y) * 1e-5;
    if (s > best) { best = s; bx = cx; by = cy; }
  }
  return { x: bx, y: by };
}
// ---------------------------------------------------------------------------------------------
// The world. Pixel coordinates, x east, y south. North is up the screen, so the three
// destinations stand along the top of the meadow: the forest and Reflection Lake on the left,
// Proficiency Peak in the middle, Sideproject Spires on the right. The ground itself, every biome and
// everything rooted in it, comes from land.js; this file adds what moves and what is clicked.

const KM = 0.008; // kilometres per pixel along a trail, for the sign's distances
const RUN = 78; // pixels a second

// ---------------------------------------------------------------------------------------------
// The scene. Built once; drawn for whichever stretch of trail (a leg) he is on.

// Everything on the map that stands still or only sways: trees, ferns, flags, signs, rocks. Kept out of
// draw(): that function is too big for the browser to optimise, and with E5b2's denser forest the
// sprite loops inside it cost about 19 ms a frame against under 4 when they run here.
// Trees have one function of their own, taking plain numbers, so it only ever sees tree parts.
function drawTree(scr, parts, x, y, clip, v, tq, ox, oy, dl, clipBlit) {
  for (let n = 0; n < parts.length; n++) {
    const part = parts[n], [wx, wy] = breeze(x + (part.lx || 0), y + part.y, tq, part.sway);
    if (clip) clipBlit(part.bm, x + part.x + wx, y + part.y + wy, v, dl); else blitRuns(scr.fb, scr.VW, scr.VH, part.bm, x + part.x + wx - ox, y + part.y + wy - oy);
  }
}
// A tree part drawn by its solid runs only (E11): zoomed out the map shows about 22,000 parts, nearly
// five million pixels a frame, many of them clear, so each bitmap's runs are found once and kept on it.
function runsOf(bm) { const r = []; for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { if (!bm.d[j * bm.w + i]) continue; let n = 1; while (i + n < bm.w && bm.d[j * bm.w + i + n]) n++; r.push(j, i, n); i += n; } return bm.runs = Int16Array.from(r); }
function blitRuns(fb, VW, VH, bm, sx, sy) {
  sx = Math.round(sx); sy = Math.round(sy); if (sx >= VW || sy >= VH || sx + bm.w <= 0 || sy + bm.h <= 0) return;
  const R = bm.runs || runsOf(bm), d = bm.d, w = bm.w;
  for (let r = 0; r < R.length; r += 3) { const y = sy + R[r]; if (y < 0 || y >= VH) continue; let x = sx + R[r + 1], n = R[r + 2], si = R[r] * w + R[r + 1]; if (x < 0) { si -= x; n += x; x = 0; } if (x + n > VW) n = VW - x; for (let di = y * VW + x, e = di + n; di < e; di++, si++) fb[di] = d[si]; }
}
// Everything that stands, back to front (E11). What never moves is sorted once (still); only what moves
// (mov: the animals, him, the cats, the ferry) is sorted each frame and merged in, an equal row putting
// the still thing first as the one sort over all of them did. Sorting all 6,400 cost 2.5 ms zoomed out.
function standing(still, moves, mov, out, ox, oy, VW, VH, done) {
  const seen = th => { if (th.flag && !done[th.flag]) return false; if (((th.kind === 'tree' && !th.t.tree.low) || th.isTree) && !DEBUG.trees || (th.critter && !DEBUG.animals)) return false;
    const w = th.kind === 'tree' ? th.t.tree.w + 8 : th.bm.w, h = (th.kind === 'tree' ? th.t.tree.h + 10 : th.bm.h) + (th.lift || 0); return !(th.x + w < ox || th.x - w > ox + VW || th.y - h > oy + VH || th.y + 4 < oy); };
  for (const th of moves) if (seen(th)) mov.push(th);
  mov.sort((a, b) => a.y - b.y);
  out.length = 0; let k = 0;
  for (const th of still) { if (!seen(th)) continue; while (k < mov.length && mov[k].y < th.y) out.push(mov[k++]); out.push(th); }
  while (k < mov.length) out.push(mov[k++]);
}
function drawStill(scr, th, tq, ox, oy, dl, clipBlit, flags, t) {
  if (th.fern) {
    const [wx] = breeze(th.x, th.y, tq, 0.6);
    scr.blit(th.bm, th.x - th.bm.ox + wx - ox, th.y - th.bm.oy - oy);
  } else if (th.flag) {
    scr.blit(flags[Math.floor(t * 5) & 1], th.x - 2 - ox, th.y - th.lift - 15 - oy);
  } else if (th.lift) {
    scr.blit(th.bm, th.x - th.bm.ox - ox, th.y - th.lift - th.bm.oy - oy);
    if (th.rope) for (let j = 1; j < 12; j++) scr.set(th.x + Math.round(j * 0.25) - ox, th.y - 70 + j - oy, R.yellow[0]);
  } else if (th.clip) clipBlit(th.bm, th.x - th.bm.ox, th.y - th.bm.oy, th.v, dl); else scr.blit(th.bm, th.x - th.bm.ox - ox, th.y - th.bm.oy - oy);
}
// The last light on the foothills at Dusk (E5j), laid over the finished picture: warm on the hills' upper
// west faces and on the tree tops along their crests, while the valleys round them go a step darker
// first (the valleys are in the Dusk copy of the ground, below). H holds the rest of land.js's hillLight
// as a list: for each row of the map, its marked pixels' columns and values, so a frame visits only those.
function duskHills(fb, VW, VH, ox, oy, H, ground, mix, WARM) {
  const y0 = Math.max(0, -oy), y1 = Math.min(VH, WH - oy), { rows, xs, vals } = H;
  for (let y = y0; y < y1; y++) { const wy = y + oy, row = y * VW, wrow = wy * WW;
    for (let k = rows[wy], e = rows[wy + 1]; k < e; k++) { const x = xs[k] - ox; if (x < 0) continue; if (x >= VW) break; const m = vals[k], wi = wrow + xs[k], b = bayer(xs[k], wy), i = row + x;
      if (m < 16) { if (b < mix * m * 0.08) fb[i] = WARM[fb[i]]; }
      else if (fb[i] !== ground[wi] && b < mix * (m - 32) * 0.1) fb[i] = WARM[fb[i]]; } }
}
// The fog of the inversion (E5e), laid over the finished picture the way the mist is: each pixel swapped
// for its own colour seen through fog, in seven strengths and then plain white, by how thick it lies
// there (W.fog) and how much of it is in. Whatever stands (a crown, an animal) shows through two steps
// clearer than the ground under it, so the summits' trees stand out of the fog in the valleys. Only the
// sea goes wholly white. It parts round him as the mist does. G is the ground the frame was drawn from
// (GW west of the weather's edge when it is wet), to tell what stands.
function fogPass(fb, VW, VH, ox, oy, F, G, GW, wetOn, VEIL, w, here, k8, X0, X1) {
  const y0 = Math.max(0, -oy), y1 = Math.min(VH, WH - oy);
  for (let y = y0; y < y1; y++) { const wy = y + oy; if (X0[wy] < 0) continue;
    const fr = w.front + 26 * Math.sin(wy / 37 + w.n) + 14 * Math.sin(wy / 11 + 2 * w.n), xa = Math.max(X0[wy] - ox, 0), xb = Math.min(X1[wy] + 1, Math.ceil(fr + 70), VW + ox) - ox;
    const row = y * VW, wrow = wy * WW, his = here !== null && wy > here.y - 23 && wy < here.y + 3, hx = here !== null ? here.x : 0, we = wetOn ? fr : -1;
    for (let x = xa; x < xb; x++) { const wx = x + ox, f = F[wrow + wx]; if (f < 72 || (his && wx > hx - 9 && wx < hx + 9)) continue;
      const i = row + x, gate = fr + 70 - wx, under = wx < we ? GW[wrow + wx] : G[wrow + wx];
      let l = Math.floor(f * k8 * (gate >= 90 ? 1 : gate / 90) + bayer(wx, wy) - 0.5) - (fb[i] !== under ? 2 : 0); if (l <= 0) continue; if (l >= 8 && f < 230) l = 7;
      fb[i] = l >= 8 ? (hash(wx >> 4, wy >> 2, 231) > 0.74 ? R.fog[1] : R.fog[2]) : VEIL[(l - 1) * 256 + fb[i]]; } }
}
// The marine layer's deck (E5e), laid on the same way: each pixel swapped for its own colour seen through
// fog, up to the strongest veil, by how deep in the deck its spot lies (land.js's deck), how far in the
// deck is and a slow churn. Things standing in it are hidden with the ground, so the hills' trees go into
// the cloud. Behind the deck's edge only, which never reaches Reflection Lake.
function deckPass(fb, VW, VH, ox, oy, M, VEIL, CHURN, w, t, k, X0, X1) {
  const y0 = Math.max(0, -oy), y1 = Math.min(VH, WH - oy), cx = Math.floor(t * 3), cy = Math.floor(t * 1.2);
  for (let y = y0; y < y1; y++) { const wy = y + oy; if (X0[wy] < 0) continue;
    const fr = w.front + 26 * Math.sin(wy / 37 + w.n) + 14 * Math.sin(wy / 11 + 2 * w.n), xa = Math.max(X0[wy] - ox, 0), xb = Math.min(X1[wy] + 1, Math.ceil(fr + 50), VW + ox) - ox, row = y * VW, wrow = wy * WW, crow = ((wy + cy) & 63) * 128;
    for (let x = xa; x < xb; x++) { const wx = x + ox, m = M[wrow + wx]; if (m < 14) continue; const gate = fr + 50 - wx;
      let l = Math.floor(m * (70 + 1.1 * CHURN[crow + ((wx + cx) & 127)]) * k * (gate >= 60 ? 1 : gate / 60) + bayer(wx, wy) - 0.5); if (l <= 0) continue; if (l > 7) l = 7;
      fb[row + x] = VEIL[(l - 1) * 256 + fb[row + x]]; } }
}
// The drizzle under the deck: short streaks, light and steady, slanting east, over the rainforest and the
// sea behind the deck's edge. Each streak is pale over dark ground and grey over the pale deck (STREAK), so
// it shows on both.
function drizzle(scr, ox, oy, t, w, F, M, frontAt, STREAK) {
  const { VW, VH, fb } = scr, n = Math.round(900 * w.rain);
  for (let i = 0; i < n; i++) {
    const life = t / 0.5 + (i * 0.618) % 1, c = Math.floor(life), h = hash(i, c, 5150), x = Math.round(ox + hash(i, c, 5151) * VW + (life - c) * 2), y = Math.round(oy + h * VH + (life - c) * 6);
    if (x < 0 || y < 0 || x >= WW || y >= WH || !(F[y * WW + x] || M[y * WW + x]) || x > frontAt(y, w)) continue;
    for (let j = 0; j < 4; j++) { const X = x + (j >> 1) - ox, Y = y + j - oy; if (X >= 0 && Y >= 0 && X < VW && Y < VH) { const k = Y * VW + X; fb[k] = STREAK[fb[k]]; } }
  }
}
// After the drizzle, while the fog lingers, a pale drop now and then falls from a crown in the rainforest.
function drip(scr, ox, oy, t, w, D, frontAt) {
  if (!D.length) return;
  for (let k = 0; k < 90; k++) {
    const life = t / 0.7 + hash(k, 1, 5160), c = Math.floor(life), q = life - c, [x, y0, foot] = D[(hash(k, c, 5161) * D.length) | 0];
    if (hash(k, c, 5162) > w.drip || x > frontAt(y0, w)) continue;
    const y = Math.round(y0 + q * q * Math.min(12, foot - y0));
    scr.set(x - ox, y - oy, q < 0.8 ? R.white[1] : R.fog[2]); if (q > 0.15 && q < 0.8) scr.set(x - ox, y - 1 - oy, R.fog[1]);
    if (q > 0.85) { scr.set(x - 1 - ox, y - oy, R.fog[1]); scr.set(x + 1 - ox, y - oy, R.fog[1]); }
  }
}
// ---- the avalanche on Mount Monolith's middle icefall (E5c) ----
// The cover of snow over the icefall, drawn on the bare seracs of the ground: a pixel is covered once
// the cover has built past its own threshold (the top of the icefall first, as the spindrift settles
// from above). Before it goes, a crack opens across its top and the slab below the crack creeps down.
function coverPass(fb, VW, VH, ox, oy, A, cover, crack, creep, crackC) {
  const { AX, AY, snow, q, thr, cx, x0, x1 } = A, half = Math.max(cx - x0, x1 - cx) + 1;
  for (let j = 0; j < AX.length; j++) {
    if (thr[j] >= cover) continue;
    const x = AX[j] - ox; if (x < 0 || x >= VW) continue;
    const below = q[j] > 16, y = AY[j] - oy + (below ? creep : 0); if (y < 0 || y >= VH) continue;
    fb[y * VW + x] = crack > 0 && q[j] > 12 && q[j] <= 20 && Math.abs(AX[j] - cx) < crack * half ? crackC : snow[j];
  }
}
// The slab once it gives way: it breaks into blocks that slide off faster and faster, each its own way,
// and comes apart into powder.
function slabPass(fb, VW, VH, ox, oy, A, a) {
  const { AX, AY, snow } = A, gone = smooth(0.4, 2.6, a);
  for (let j = 0; j < AX.length; j++) {
    const X = AX[j], Y = AY[j], h = hash(X >> 2, Y >> 2, 4801), off = Math.round(2 + a * a * 16 * (0.75 + 0.5 * h)), y = Y + off - oy, x = X + Math.round((h - 0.5) * a * 6) - ox;
    if (x < 0 || y < 0 || x >= VW || y >= VH || bayer(X, Y + off) < gone * (0.7 + 0.6 * h)) continue;
    fb[y * VW + x] = snow[j];
  }
}
// A round cloud of powder, lit from above: white on top, blue-grey snow shade under, with no outline so
// that puffs laid over each other merge into one billowing cloud. Used for the avalanche's cloud and the
// plume off the summit.
function puffAt(fb, VW, VH, ox, oy, cx, cy, r, al, sq) {
  for (let dy = -Math.ceil(r); dy <= r * 0.7; dy++) { const y = Math.round(cy + dy) - oy; if (y < 0 || y >= VH) continue;
    for (let dx = -Math.ceil(r * sq); dx <= r * sq; dx++) { const x = Math.round(cx + dx) - ox; if (x < 0 || x >= VW) continue; const d = Math.hypot(dx / sq, dy) / r; if (d > 1 || bayer(x + ox, y + oy) >= al * (1.3 - d * d)) continue;
      const f = (dy + r) / (1.7 * r) + 0.25 * (bayer(x + ox + 1, y + oy) - 0.5); fb[y * VW + x] = f < 0.36 ? R.snow[4] : f < 0.62 ? R.snow[3] : R.snow[2]; } }
}
// Every waterfall and rapid moves (E8a): white water streams down it in streaks that slide down the
// screen, and at its foot the water churns. P and F: the falls' and the feet's pixels as x and y.
function whiteWater(fb, VW, VH, ox, oy, P, F, t) {
  const W1 = R.white[1], W3 = R.water[3], W4 = R.water[4], sh = t * 26;
  for (let k = 0; k < P.x.length; k++) { const sx = P.x[k] - ox, sy = P.y[k] - oy; if (sx < 0 || sy < 0 || sx >= VW || sy >= VH) continue;
    const s = frac((P.y[k] - sh) / P.p[k] + P.o[k]); fb[sy * VW + sx] = s < (P.e[k] ? 0.45 : 0.7) ? W1 : s < 0.9 ? W4 : W3; }
  const beat = Math.floor(t * 7);
  for (let k = 0; k < F.x.length; k++) { const sx = F.x[k] - ox, sy = F.y[k] - oy; if (sx < 1 || sy < 0 || sx >= VW - 1 || sy >= VH - 1) continue;
    for (let d = 0; d < 3; d++) { const h = hash(F.x[k] * 3 + d, beat, 5201); if (h < 0.45) fb[(sy + (d >> 1)) * VW + sx + (d === 1 ? 1 : d === 2 ? -1 : 0)] = h < 0.3 ? W1 : W4; } }
}

export function makeWorld() {
  const W = buildTerrain(), { g: ground, spots, forestAmt } = W;
  const paths = {}; for (const k of ['lake', 'stack', 'spires']) paths[k] = makePath({ pts: W.trails[k], stops: [] });
  // The few steps from the junction to the register's east side, where he stands to fold its front down (L2).
  { const [rx, ry] = W.spots.register; paths.register = makePath({ pts: [[T.x, T.y], [(T.x + rx + 9) / 2, (T.y + ry + 1) / 2 + 1], [rx + 9, ry + 1]], stops: [] });
    // Its points with their depth, as the trails carry, so ground nearer than him still stands in front.
    W.lines.register = [...Array(9).keys()].map(k => { const p = paths.register.at(k / 8); return [p.x, p.y, W.vAt(p.x, p.y)]; }); }
  // Shafts of light slant through the forest, and give out where the mist takes over in the west.
  const shaftMask = new Uint8Array(WW * WH);
  for (let y = 300; y < WH; y++) for (let x = 0; x < 760; x++) {
    if (forestAmt(x, y) < 0.7) continue;
    const band = frac((x * 0.55 + y) / 64);
    if (band < 0.15 && vnoise((x * 0.55 + y) / 64, (y - x * 0.4) / 40, 77) > 0.42 + smooth(430, 200, x) * 0.4) shaftMask[y * WW + x] = band < 0.05 || band > 0.1 ? 1 : 2;
  }

  // Everything that stands up, sorted by its feet each frame.
  // The last light at Dusk (D16): the tips of the Spires and of Proficiency Peak catch the sun after the
  // land below has lost it, as Mount Monolith's snow does. For each column, the top of each landmark; a
  // band below it is lit with the snow's dusk colours, one step lighter than the rock's own, thinning
  // downward through a dither. GLOW maps a colour to the snow step of the same lightness.
  const tipTop = [6, 7].map(k => { const top = new Int16Array(WW).fill(-1); for (let x = 0; x < WW; x++) for (let y = 0; y < WH; y++) if (W.dest[y * WW + x] === k) { top[x] = y; break; } return top; });
  // The warm light on the hills: only the lit half of each colour (the sunny side of a crown, the lit
  // tips of the canopy) turns to ochre, so by Dusk the faces glint rust while the shade between stays
  // blue and the trees keep their shapes. Ink, water, sky and lit glass keep theirs.
  const WARM = new Uint8Array(256).map((_, c) => { const r = c && R[RAMP_OF[c]], k = RAMP_OF[c]; if (!r || c === INK || KIND[c] === 4 || k === 'sky' || k === 'lamp' || k === 'water') return c; const f = STEP_OF[c] / Math.max(1, r.length - 1); return f < 0.5 ? c : R.ochre[f < 0.8 ? 2 : 3]; });
  // The valleys round the hills go a step darker at Dusk, through a dither. That never changes, so it is
  // done once, in a copy of the ground drawn instead of it once the light is half gone; done each frame
  // it cost 2 ms.
  // Made the first time Dusk is drawn (M3), so a visit by Day never pays for it.
  let groundDuskC = null;
  const groundDusk = () => { if (groundDuskC) return groundDuskC; const groundDusk = groundDuskC = ground.slice(); for (let i = 0; i < ground.length; i++) { const m = W.hillLight[i]; if (m >= 16 && m < 32 && bayer(i % WW, (i / WW) | 0) < (m - 16) * 0.05) groundDusk[i] = SHADE[ground[i]]; } return groundDuskC; };
  let gNow = ground;
  const keep = m => m && (m < 16 || m >= 32);
  const HLIT = (() => { const M = W.hillLight, rows = new Int32Array(WH + 1); let n = 0; for (let i = 0; i < M.length; i++) if (keep(M[i])) n++;
    const xs = new Int16Array(n), vals = new Uint8Array(n); n = 0;
    for (let y = 0; y < WH; y++) { rows[y] = n; for (let x = 0; x < WW; x++) { const m = M[y * WW + x]; if (keep(m)) { xs[n] = x; vals[n++] = m; } } } rows[WH] = n; return { rows, xs, vals }; })();
  const TIP_H = [26, 34], GLOW = new Uint8Array(256).map((_, c) => { const r = c && R[RAMP_OF[c]]; if (!r) return c; const k = Math.min(R.snow.length - 1, Math.round((STEP_OF[c] + 1) / r.length * (R.snow.length - 1)) + 1); return R.snow[k]; });
  // The lenticular cloud (E3) over Mount Monolith's summit: its clock and its drawing are in events.js,
  // shared with the lake scene.
  const lenticular = (scr, ox, oy, t) => drawLens(scr, spots.summit[0], spots.summit[1], t, 1, ox, oy);
  // The serac fall (E4): every 40 to 50 seconds, the first about 15 seconds after the page opens (E5a), a block of ice breaks off one of the icefalls (spots.seracs),
  // tumbles down the slope under it with a puff of powder following and spreading, and a low rumble comes
  // a moment later, as sound would from that far off. Never twice running from the same place.
  // serac=<seconds> in the address starts the clock that far on, for screenshots.
  const SER = spots.seracs; let serAhead = typeof location !== 'undefined' ? +(/[?&]serac=([\d.]+)/.exec(location.search) || [])[1] || 0 : 0; const SLOT = 40;
  const serAt = n => { let k = Math.floor(hash(0, 1, 4741) * SER.length); for (let m = 1; m <= n; m++) k = (k + 1 + Math.floor(hash(m, 2, 4741) * (SER.length - 1))) % SER.length; return k; };
  let rumbled = -1;
  function seracFall(scr, ox, oy, t, env) {
    if (SER.length < 2) return;
    const T = t + serAhead + SLOT - 15, n = Math.floor(T / SLOT), a = T - n * SLOT - 10 * hash(n, 3, 4741); if (a < 0 || a > 4.5) return;
    const sk = serAt(n); if (midSerac[sk] && AVA.cover > 0.5) return;
    const [sx, sy] = SER[sk], fall = 40, path = q => [sx + Math.round(2 * Math.sin(q * 5 + n)), sy + Math.round(fall * Math.pow(q, 1.6))];
    const on = sx - ox > -20 && sx - ox < scr.VW + 20 && sy - oy > -40 && sy - oy < scr.VH + 10;
    if (on && a > 0.9 && rumbled !== n) { rumbled = n; env.sfx('rumble'); }
    const dot = (x, y, c) => { const vx = x - ox, vy = y - oy; if (vx >= 0 && vy >= 0 && vx < scr.VW && vy < scr.VH) scr.fb[vy * scr.VW + vx] = c; };
    // The puffs: one where each stretch of the fall was passed, growing and fading from when it was made.
    for (let k = 0; k < 5; k++) { const age = a - 0.3 - k * 0.25; if (age < 0) continue; const [px, py] = path(Math.min(1, k / 4)), r = 2 + 8 * Math.min(1, age / 3), al = smooth(4.2, 0.6, age);
      for (let dy = -Math.ceil(r); dy <= r * 0.6; dy++) for (let dx = -Math.ceil(r * 1.3); dx <= r * 1.3; dx++) { const d = Math.hypot(dx / 1.3, dy) / r; if (d > 1 || bayer(px + dx, py + dy - Math.round(age * 2)) >= al * (1.3 - d * d)) continue; dot(px + dx, py + dy - Math.round(age * 2), dy > r * 0.25 || d > 0.82 ? R.snow[1] : d < 0.5 ? R.white[1] : R.snow[3]); } }
    // The block itself, until it is lost in its own powder.
    if (a < 1.4) { const [bx, by] = path(a / 1.4); for (let i = -2; i <= 1; i++) { dot(bx + i, by - 1, R.white[1]); dot(bx + i, by, R.serac[i < 1 ? 2 : 1]); dot(bx + i, by + 1, R.serac[0]); } }
  }
  // The avalanche (E5c). The middle icefall begins each visit under a cover of snow. About 40 s in (and
  // whenever the debug button says) it warns: a crack across the top, a creep of a pixel or two, a few
  // bits trickling off its foot, a breath, and then it goes: the slab breaks and slides, a cloud of powder
  // pours down the glacier and billows, a deep rumble, a fan of debris at the glacier's foot that fades
  // over a minute. The blue seracs it leaves fall in turn with the other icefalls'. From then on a plume
  // of spindrift streams off the summit now and then and drifts down onto the icefall, each one leaving
  // it whiter, until it is buried and looks like plain snow again, and a while later it can go again.
  // It lives as long as the page does, through scene changes; a reload starts it covered.
  const AV = W.avalanche ? (() => { const A = W.avalanche, n = A.at.length, AX = new Int16Array(n), AY = new Int16Array(n), thr = new Float32Array(n);
    for (let j = 0; j < n; j++) { AX[j] = A.at[j] % WW; AY[j] = (A.at[j] / WW) | 0; thr[j] = Math.min(0.999, 0.55 * hash(AX[j], AY[j], 4790) + 0.44 * A.q[j] / 255); }
    return { ...A, AX, AY, thr, set: new Set(A.at) }; })() : null;
  const AVA = { phase: 'covered', start: 40, cover: 1, plume: -1, nextPlume: 0, gone: false, heard: -1 };
  const AV_RELEASE = 4.2, PLUMES = 7;
  const midSerac = SER.map(([x, y]) => !!AV && [0, 1, 2, 3].some(d => AV.set.has((y + d) * WW + x)));
  function avalancheStep(t, env, on) {
    if (!AV) return;
    if (AVA.phase === 'covered' && t >= AVA.start) { AVA.phase = 'falling'; AVA.gone = false; }
    if (AVA.phase === 'falling') { const a = t - AVA.start;
      if (a >= AV_RELEASE && !AVA.gone) { AVA.gone = true; AVA.cover = 0; if (on) env.sfx('avalanche'); }
      if (a > 75) { AVA.phase = 'bare'; AVA.nextPlume = t + 15; } }
    if (AVA.phase === 'bare') {
      if (AVA.plume < 0 && t >= AVA.nextPlume) AVA.plume = t;
      if (AVA.plume >= 0 && t - AVA.plume > 9) { AVA.plume = -1; AVA.cover = Math.min(1, AVA.cover + 1 / PLUMES); AVA.nextPlume = t + 18 + 10 * hash(Math.floor(t), 2, 4791);
        if (AVA.cover >= 0.999) { AVA.cover = 1; AVA.phase = 'covered'; AVA.start = t + 45; } }
    }
  }
  function avalancheCover(fb, VW, VH, ox, oy, t) {
    if (!AV || AV.x1 < ox || AV.x0 > ox + VW || AV.y1 + 4 < oy || AV.y0 > oy + VH) return;
    let crack = 0, creep = 0;
    if (AVA.phase === 'falling') { const a = t - AVA.start; if (a >= AV_RELEASE) return; crack = smooth(0, 1.4, a); creep = a < 1.6 ? 0 : a < 2.2 ? 1 : 2; }
    if (AVA.cover > 0) coverPass(fb, VW, VH, ox, oy, AV, AVA.cover, crack, creep, R.serac[0]);
  }
  function avalancheFx(scr, ox, oy, t) {
    if (!AV) return;
    const { fb, VW, VH } = scr, w = AV.x1 - AV.x0, ym = (AV.y0 + AV.y1) / 2, [fx, fy] = AV.foot;
    if (AVA.phase === 'falling') { const a = t - AVA.start;
      // A few bits of snow trickle off the slab's foot before it goes.
      if (a > 2.4 && a < AV_RELEASE + 0.3) for (let k = 0; k < 6; k++) { const s = (a - 2.4 - k * 0.27); if (s < 0 || s > 0.9) continue; const x = AV.cx + Math.round((hash(k, 1, 4802) - 0.5) * w * 0.7) - ox, y = AV.y1 + 2 + Math.round(s * s * 30) - oy; if (x >= 0 && y >= 0 && x < VW && y < VH) fb[y * VW + x] = R.white[1]; }
      if (a >= AV_RELEASE) { const b = a - AV_RELEASE;
        if (b < 3) slabPass(fb, VW, VH, ox, oy, AV, b);
        // The powder: puffs thrown off along the way down, each growing, rising and thinning.
        for (let k = 0; k < 34; k++) { const te = k * 0.13, age = b - te; if (age < 0) continue; const u = k / 33, h = hash(k, 3, 4803), grow = Math.min(1, age / 2.5);
          const r = (4 + 17 * Math.sqrt(grow)) * (0.7 + 0.6 * h) * (0.8 + 0.5 * u), al = smooth(18, 4, age) * 0.97;
          if (al > 0.02) puffAt(fb, VW, VH, ox, oy, AV.cx + (h - 0.5) * w * (1.1 - 0.3 * u) * (1 + 0.5 * grow), lerp(ym, fy, Math.pow(u, 1.1)) - age * 2, r, al, 1.35); }
        // The debris: a fan of snow at the foot of the glacier, fading over a minute.
        const den = smooth(5, 9, b) * smooth(70, 35, b);
        if (den > 0.01) for (let dy = -2; dy <= 8; dy++) for (let dx = -Math.round(w * 0.45); dx <= w * 0.45; dx++) { const e = (dx / (w * 0.45)) ** 2 + ((dy + 2) / 10) ** 2; if (e > 1) continue; const x = fx + dx - ox, y = fy + dy - oy; if (x < 0 || y < 0 || x >= VW || y >= VH || bayer(fx + dx, fy + dy) >= den * (1.1 - e)) continue; fb[y * VW + x] = hash(fx + dx, fy + dy, 4804) < 0.5 ? R.white[1] : R.snow[3]; }
      } }
    // The plume: spindrift torn off the summit by the wind, streaming east against the sky as a banner
    // (white on the snow would not show), and a fall of fine snow sinking out of it onto the icefall.
    if (AVA.plume >= 0) { const p = t - AVA.plume, [sx, sy] = spots.summit, head = Math.min(1, p / 4), al = smooth(0, 1.2, p) * smooth(9, 6.5, p);
      for (let k = 0; k <= 20; k++) { const u = k / 20; if (u > head) break; const x = sx + 6 + 120 * u + p * 3, y = sy - 4 + 14 * u * u + 2 * Math.sin(u * 9 + p);
        puffAt(fb, VW, VH, ox, oy, x, y, 2 + 6 * u, al * (0.9 - 0.45 * u), 2.4); }
      for (let k = 0; k < 40; k++) { const h = hash(k, 7, 4805), born = 1 + 6 * h, q = (p - born) / 3; if (q < 0 || q > 1) continue; const u = 0.15 + 0.6 * hash(k, 8, 4805);
        const x0 = sx + 6 + 120 * u, y0 = sy + 14 * u * u, tx = AV.x0 + (AV.x1 - AV.x0) * hash(k, 9, 4805), x = Math.round(lerp(x0, tx, q) + 3 * Math.sin(q * 7 + k)) - ox, y = Math.round(lerp(y0, AV.y0 + 4, q)) - oy;
        if (x >= 0 && y >= 0 && x < VW && y < VH && al > 0.3) fb[y * VW + x] = (k & 1) ? R.snow[2] : R.snow[1]; } }
  }
  // ---- the weather in the west: the marine layer (E5e) ----
  // Rain in the Northwest seldom comes as a storm. A low grey deck rolls in off the sea ten seconds after
  // the page opens and settles onto the rainforest's hills, hiding their tops and their trees, with a
  // light steady drizzle under it, and stops short of Reflection Lake. Then it lifts and thins, and leaves
  // white fog in the valleys with the summits standing out of it (the inversion), the trees dripping for
  // a while; that burns off too. About two minutes in all, then half a minute clear. rain=<seconds> moves
  // the clock on, for screenshots, and the debug panel's Shower button starts one now.
  const RAIN = { roll: 15, settle: 40, gone: 120, gap: 30 }; RAIN.cycle = RAIN.gone + RAIN.gap;
  let rainAhead = typeof location !== 'undefined' ? +(/[?&]rain=([\d.]+)/.exec(location.search) || [])[1] || 0 : 0;
  // Reflection Lake's water (the core of its country): the deck never reaches it.
  let lx0 = WW, lx1 = 0, ly0 = WH, ly1 = 0;
  for (let i = 0; i < W.dest.length; i++) if (W.dest[i] === 5) { const x = i % WW, y = (i / WW) | 0; if (x < lx0) lx0 = x; if (x > lx1) lx1 = x; if (y < ly0) ly0 = y; if (y > ly1) ly1 = y; }
  const weather = t => {
    const T = t + rainAhead + RAIN.cycle - 10, n = Math.floor(T / RAIN.cycle), s = T - n * RAIN.cycle, reach = lx0 - 50 - 50 * hash(n, 1, 5101);
    return { n, s, reach,
      front: lerp(-80, reach, smooth(0, RAIN.settle, s)),
      deck: smooth(0, RAIN.roll, s) * smooth(78, 64, s),
      rain: smooth(10, 18, s) * smooth(74, 64, s),
      wet: smooth(12, 40, s) * smooth(125, 80, s),
      fog: smooth(74, 90, s) * smooth(RAIN.gone, 102, s),
      drip: smooth(68, 74, s) * smooth(108, 92, s) };
  };
  // The deck's edge is not a straight line: row by row it bulges ahead and lags behind.
  const frontAt = (wy, w) => w.front + 26 * Math.sin(wy / 37 + w.n) + 14 * Math.sin(wy / 11 + 2 * w.n);
  // How much of the fog that lies at a spot is in, for the mist and the sea's bank (critters.js).
  const fogIn = (wx, wy, w) => Math.max(w.fog, w.deck * 0.8) * clamp((frontAt(wy, w) + 70 - wx) / 90, 0, 1);
  // The deck's churn: a tile of soft noise, wider than tall as stratus is, that slides slowly through it
  // so it never sits still. It wraps without a seam: each spot blends the noise there with the noise a
  // tile away, by how near the tile's edge it lies. (A first tile of small cells read as polka dots.)
  const CHURN = new Uint8Array(128 * 64).map((_, i) => { const x = i & 127, y = i >> 7, n = (a, b) => 0.65 * vnoise(a / 30, b / 11, 5131) + 0.35 * vnoise(a / 13, b / 6, 5132), u = x / 128, v = y / 64;
    return Math.round(255 * ((1 - u) * (1 - v) * n(x, y) + u * (1 - v) * n(x - 128, y) + (1 - u) * v * n(x, y - 64) + u * v * n(x - 128, y - 64))); });
  // The drips: where a tree in the rainforest holds its crown, for drops to fall from after the drizzle.
  const DRIPS = W.things.filter(th => th.tree && !th.tree.low && th.x < 800 && forestAmt(th.x, th.y) > 0.5).map(th => [th.x + Math.round((hash(th.x, th.y, 5140) - 0.5) * th.tree.w * 0.6), th.y - Math.round(th.tree.h * (0.35 + 0.3 * hash(th.x, th.y, 5141))), th.y]);
  // Wet ground under the rain: a step darker through a dither, drying after. Water stays as it is.
  const WATERY = KIND[R.water[3]];
  // That never changes but for where the deck's edge is, so it is done once, in copies of the ground (by
  // Day and at Dusk) drawn west of the edge once the drizzle has wet it; done each frame it cost 4 ms.
  const wetOf = g => { const o = g.slice(); for (let y = 0; y < WH; y++) for (let x = 0; x < 900; x++) { const i = y * WW + x; if (W.depth[i] > 1e8 || KIND[g[i]] === WATERY || bayer(x, y) >= 0.25) continue; o[i] = SHADE[g[i]]; } return o; };
  // Each copy is made the first time the rain needs it (M3), not at the page's start.
  let groundWet = null, groundDuskWet = null;
  const wetCopy = dusk => dusk ? groundDuskWet || (groundDuskWet = wetOf(groundDusk())) : groundWet || (groundWet = wetOf(ground));
  // The veils the fog and the deck lay on, from faint to the strongest (westVeil, above makeWorld).
  const FOGV = [0.12, 0.26, 0.4, 0.53, 0.65, 0.76, 0.86].map(veilTable);
  // For each row of the picture, the columns the fog and the deck can reach, so a frame only visits those.
  // A deck value under 14 never shows even at its thickest (the dither never lifts it to the first veil),
  // so it is left out. The fog is left out under 72: there it was only the faintest veils on the hills'
  // slopes, which cost frame time and blurred the summits that should stand out of it.
  const span = (A, lo) => { const X0 = new Int16Array(WH).fill(-1), X1 = new Int16Array(WH).fill(-1); for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (A[y * WW + x] >= lo) { if (X0[y] < 0) X0[y] = x; X1[y] = x; } return [X0, X1]; };
  const [FX0, FX1] = span(W.fog, 72), [DX0, DX1] = span(W.deck, 14);
  // The veils as one flat table, seven of 256: entry (l - 1) * 256 + c is colour c through veil l.
  const VEIL = new Uint8Array(7 * 256); FOGV.forEach((t, k) => VEIL.set(t, k * 256));
  // A drizzle streak's colour over each colour: grey over light ones, pale over dark ones.
  const STREAK = new Uint8Array(256).map((_, c) => { const p = DAY[c] || [0, 0, 0]; return 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2] > 150 ? R.nebel[1] : R.fog[1]; });
  // A cloud drawn in pixels: rounded lobes along a flat base, tallest in the middle, white with the sky's
  // blue underneath (the fair-weather clouds).
  const puff = (w, h, seed) => {
    const r = rng(seed), b = new BM(w, h); b.ox = w >> 1; b.oy = h - 1;
    const n = Math.max(3, Math.round(w / 13)), base = h - 2, lobes = [];
    for (let k = 0; k < n; k++) { const f = (k + 0.5) / n; lobes.push([w * (0.1 + 0.8 * f) + (r() - 0.5) * 5, base - h * (0.2 + 0.42 * Math.sin(Math.PI * f) * (0.7 + 0.3 * r())), h * (0.22 + 0.14 * r()) + h * 0.16 * Math.sin(Math.PI * f)]); }
    for (let y = 0; y <= base; y++) for (let x = 0; x < w; x++) {
      if (!lobes.some(([lx, ly, lr]) => sq(x - lx) + sq((y - ly) * 1.25) <= lr * lr)) continue;
      const q = y / base, d = bayer(x, y);
      b.set(x, y, q < 0.6 ? R.white[1] : q < 0.82 ? (d < 0.5 ? R.white[1] : R.sky[4]) : R.sky[3]);
    }
    return b;
  };
  // The small fair-weather clouds that cast the drifting shadows, each its shadow's size, FAIR_ALT above it.
  const FAIR_ALT = 64, FAIR = [0, 1, 2, 3].map(k => { const cw = 40 + 16 * hash(k, 1, 91), chh = 11 + 5 * hash(k, 2, 91); return { cw, chh, y: Math.round(620 + hash(k, 3, 91) * 380), bm: puff(Math.round(cw * 1.9), Math.round(chh * 2.4), 610 + k) }; });
  const fairX = (k, t) => ((k * 310 + t * (5 + k * 1.3)) % (WW + 300)) - 150;
  const things = [];
  for (const th of W.things) things.push(th.tree ? { kind: 'tree', t: th, x: th.x, y: th.y } : th);
  const put = (bm, x, y, extra = {}) => things.push({ bm, x: Math.round(x), y: Math.round(y), ...extra });
  put(makeSignpost(), spots.signpost[0], spots.signpost[1]);
  for (const s of spots.signs) put(makeSmallSign(), s[0], s[1]);
  put(makeJournal(), spots.journal[0], spots.journal[1]); put(makeKiosk(), spots.kiosk[0], spots.kiosk[1]);
  const REGS = [...Array(16).keys()].map(k => makeRegister(k & 7, k > 7)), regBox = { bm: REGS[0], x: spots.register[0], y: spots.register[1] }; things.push(regBox);
  if (spots.lookout) put(makeLookout(), spots.lookout[0], spots.lookout[1]);
  for (const [x, y, c] of spots.tents) put(makeTent(c), x, y);
  // The falls' and the feet's pixels, as x and y, with each column's own offset so the streaks are not in step.
  // Each column streams at its own length (p) and phase (o); the fall's edges (e) show more blue.
  const xy = (I, off) => { const n = I.length, x = new Int16Array(n), y = new Int16Array(n), o = new Float32Array(n), p = new Float32Array(n), e = new Uint8Array(n), S = new Set(I);
    for (let k = 0; k < n; k++) { x[k] = I[k] % WW; y[k] = (I[k] / WW) | 0; if (off) { o[k] = hash(x[k], 0, 5202); p[k] = 7 + hash(x[k], 1, 5203) * 6; e[k] = !S.has(I[k] - 1) || !S.has(I[k] + 1) ? 1 : 0; } } return { x, y, o, p, e }; };
  const WWP = W.whiteWater ? xy(W.whiteWater.fall, true) : null, WWF = W.whiteWater ? xy(W.whiteWater.foot) : null;
  // At Dusk the tents glow from inside (E8): the fabric warm, brightest low down and at the door.
  const tentGlow = spots.tents.map(([x, y, c]) => { const b = makeTent(c); for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) { const k = j * b.w + i, v = b.d[k]; if (!v || v === INK) continue; b.d[k] = v === R.ink[0] || (j > b.h * 0.55 && bayer(i, j) < (j / b.h - 0.4) * 1.6) ? R.lamp[1] : R.lamp[0]; } return { b, x, y }; });
  // Headlamps (E8): at Dusk a party of eight climbs the boot track from base camp up the Spires' glacier
  // for an early start, already clear of camp when the light goes, two ropes of four, a step apart on the rope and a gap between the ropes, moving
  // up for 6 s and stopping 4 s to rest, over and over; at the top of the track they fade out and the
  // next party sets off from camp. A lamp turns away now and then and dims. Each climber is a dark figure
  // under the light, since the snow still holds the afterglow and a light alone does not show on it.
  // Hidden where the ground in front stands over the track.
  const TRK = (() => { const P = W.trackUp || []; if (P.length < 2) return null; const s = [0]; for (let k = 1; k < P.length; k++) s.push(s[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1])); return { P, s, L: s[s.length - 1] }; })();
  const lampAt = d => { const { P, s } = TRK; let a = 0, b = s.length - 1; while (b - a > 1) { const m = (a + b) >> 1; if (s[m] < d) a = m; else b = m; } const q = (d - s[a]) / Math.max(1e-6, s[b] - s[a]); return [P[a][0] + (P[b][0] - P[a][0]) * q, P[a][1] + (P[b][1] - P[a][1]) * q, P[a][2] + (P[b][2] - P[a][2]) * q]; };
  const GAP = [0, 5, 10, 15, 27, 32, 37, 42]; let duskT = null;
  function headlamps(scr, ox, oy, t, mix) {
    if (!TRK || mix < 0.5) { duskT = null; return; } if (duskT === null) duskT = t;
    const r = Math.max(0, t - duskT - 4), cyc = Math.floor(r / 10), walk = cyc * 6 + Math.min(6, r - cyc * 10), lead = (50 + walk * 4) % (TRK.L + 60);
    for (let k = 0; k < GAP.length; k++) { const d = lead - GAP[k]; if (d < 0 || d > TRK.L) continue; const [x, y, v] = lampAt(d), sx = Math.round(x) - ox, sy = Math.round(y) - 2 - oy;
      if (sx < 0 || sy < 0 || sx >= scr.VW || sy >= scr.VH || W.depth[Math.round(y) * WW + Math.round(x)] < v - 4) continue;
      const fade = smooth(TRK.L, TRK.L - 20, d) * smooth(0, 6, d) * smooth(0.5, 0.75, mix); if (bayer(sx + ox, sy + oy) > fade) continue;
      const dim = hash(k, Math.floor(t * 1.3), 4901) < 0.12; scr.set(sx, sy + 1, INK); scr.set(sx, sy + 2, INK); scr.set(sx, sy, dim ? R.lamp[0] : R.lamp[1]); if (!dim) { const [ax, ay] = lampAt(Math.min(TRK.L, d + 3)); scr.set(Math.round(ax) - ox, Math.round(ay) - 2 - oy, R.lamp[0]); } }
  }
  // The animals look after themselves: see critters.js. Where each one lives comes from land.js.
  const crit = makeCritters(W);
  const ev = makeEvents(W);
  for (const it of crit.items) things.push(it);
  const birds = [makeBird(0), makeBird(1)];
  const clouds = [0, 1, 2, 3, 4, 5].map(i => ({ bm: makeCloud(600 + i), x: i * 330 + 40, y: 50 + (i & 1) * 70 + i * 18, v: 3 + (i % 4) }));
  const runner = makeRunner('trail');
  const kit = makeCats(); window.__cats = kit;
  const flags = [makeFlag(0), makeFlag(1)];
  const FLAGS = spots.flags;
  for (const k in FLAGS) things.push({ flag: k, bm: flags[0], x: FLAGS[k].x, y: FLAGS[k].y, lift: FLAGS[k].lift });
  // The top of the boot track lies behind the Spires on the map, so it is drawn again over them.
  const trackPix = W.trackPix;
  // His footprints stay on a finished trail: a pair of dark dots every few steps.
  const prints = {};
  for (const k in paths) {
    const P = paths[k], out = [];
    for (let d = 6, n = 0; d < P.len - 4; d += 5, n++) { const a = P.at(d / P.len), l = Math.hypot(a.dx, a.dy) || 1, s = n & 1 ? 1 : -1; out.push([Math.round(a.x - a.dy / l * s), Math.round(a.y + a.dx / l * s)]); }
    prints[k] = out;
  }

  // Where the lake loop goes into the trees and where it comes back out by the lake.
  const lakeIn = (() => { const P = paths.lake; for (let q = 0; q < 1; q += 0.002) { const a = P.at(q); if (forestAmt(a.x, a.y) > 0.75) return q; } return 0.2; })();
  // The walk to base camp leaves the map for its own side-on scene (section J) once the trail has done
  // two fifths of its climb: from there on it is the high traverse and the moraine. Height on the map is
  // read the way the land lays it out: a pixel's row plus its depth, less for higher ground.
  const spiresIn = (() => { const P = paths.spires, h = q => { const a = P.at(q); return -(W.vAt(a.x, a.y) + a.y); }, h0 = h(0), h1 = h(1); for (let q = 0; q < 1; q += 0.002) if (h(q) - h0 >= 0.4 * (h1 - h0)) return q; return 0.5; })();
  const lakeOut = (() => { const P = paths.lake; let best = 0, bd = 1e9; for (let q = 0.5; q < 1; q += 0.002) { const a = P.at(q), d = Math.hypot(a.x - spots.lakeShore[0], a.y - spots.lakeShore[1]); if (d < bd) { bd = d; best = q; } } return best; })();

  // Where each place's name is pinned: over the signpost, on the lake's near shore, on the wall's rim, on the ice under the summits.
  const PLACES = [{ id: 'trailhead', x: T.x - 4, y: T.y - 31 }, ...['lake', 'stack', 'spires'].map(id => ({ id, x: spots.places[id][0], y: spots.places[id][1] }))];
  // How far from the camera he is on a trail, from the trail's own points.
  const vOn = (path, x, y) => { let best = 0, bd = 1e9; for (const p of W.lines[path]) { const d = Math.abs(p[0] - x) + Math.abs(p[1] - y); if (d < bd) { bd = d; best = p[2]; } } return best; };
  const saved = new Uint8Array(25 * 34);
  // The destinations rise a little, each with its whole country, when the pointer rests on one or it is
  // tapped (D12a, D12b). W.dest holds the destination's number (1 to 3) and 4 on the landmark itself.
  const lifted = [0, 0, 0, 0]; let tapped = 0, tapUntil = 0;
  const destUnder = (wx, wy) => { wx = Math.round(wx); wy = Math.round(wy); return wx < 0 || wy < 0 || wx >= WW || wy >= WH ? 0 : W.dest[wy * WW + wx] & 3; };
  // How far something standing at a spot is raised: as much as the ground under its feet.
  const liftAt = (x, y) => { if (x === undefined) return 0; const k = destUnder(x, y); return k ? Math.round(2 * lifted[k]) : 0; };
  // Redraws destination k d pixels higher, from what the ground pass put in the frame. Rows are read top
  // to bottom, so a row is always read before anything is written over it. Where it has left its foot
  // the ground goes dark, softer one row further down: a shadow under a place that has stepped up. While
  // it is up the country round the landmark is a step brighter; the landmark has its contrast already.
  // A step brighter, except the two lightest steps of a colour, which would go flat white (the ice did).
  const BRIGHT = new Uint8Array(256).map((_, c) => c && R[RAMP_OF[c]] && STEP_OF[c] < R[RAMP_OF[c]].length - 2 ? LIGHT[c] : c);
  function liftDest(scr, k, d, ox, oy) {
    const { VW, VH, fb } = scr, b = W.destBox[k], D = W.dest;
    const x0 = Math.max(b.x0, ox), x1 = Math.min(b.x1, ox + VW - 1), y0 = Math.max(b.y0, oy + d), y1 = Math.min(b.y1, oy + VH - 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const m = D[y * WW + x]; if ((m & 3) !== k) continue; const c = fb[(y - oy) * VW + (x - ox)]; fb[(y - oy - d) * VW + (x - ox)] = m & 4 ? c : BRIGHT[c]; }
    for (let y = Math.max(b.y0, oy); y <= Math.min(b.y1 + 1, oy + VH - 1); y++) for (let x = x0; x <= x1; x++) {
      const w = y * WW + x; if (y >= WH) continue; const here = (D[w] & 3) === k, under = y + d < WH && (D[w + d * WW] & 3) === k;
      if (here && !under) { const i = (y - oy) * VW + (x - ox); fb[i] = SHADE[SHADE[fb[i]]]; }
      else if (!here && y > 0 && (D[w - WW] & 3) === k && ((x + y) & 1)) { const i = (y - oy) * VW + (x - ox); fb[i] = SHADE[fb[i]]; }
    }
  }
  const cam = { x: T.x, y: 0 };
  let facing = 'down', flip = false, last = { ox: 0, oy: 0, VW: 1, VH: 1 }, focus = { x: 0, y: 0 };
  const list = [], mov = []; let still = null, moves = null;
  // The view from the Trailhead. On an upright phone the junction sign covers the lower half, so
  // the view sits lower to keep him above it, past the bottom edge of the map if it has to.
  // A wide view taller than about 600 pixels (the opening view) rests lower, down to the near edge of the
  // map, so the meadow, the lake and all three destinations are in frame under the skyline.
  // Since E5h the Trailhead stands low in the meadow, so a wide view sets him just above the timeline bar
  // (about a fifth of the view up from its bottom), which leaves the skyline in frame above the destinations.
  // Since F5a the wide view's rest is openFrame's, worked out again only when the view's size changes.
  let openKey = -1, openAt = null, openCover = 0;
  // On the few steps to the register and back (L6) the junction sign is put away, but the view keeps the frame
  // it had with the sign up, so it does not pan off and back again. regTrip is set as each frame is drawn.
  let signAt = null, regTrip = false;
  const vista = scr => {
    if (regTrip && signAt && signAt.size === scr.VW * 1e4 + scr.VH) return signAt.at;
    // Worked out again when the sign comes, goes or changes height too: it is not up on the first frames, it is
    // taller until its font has loaded, and closing it frees ground.
    const el = document.getElementById('fork'), up = !!el && !el.hidden, key = (scr.VW * 1e4 + scr.VH) * 1e4 + (up ? el.offsetTop + 1 : 0);
    if (key !== openKey) {
      // The sign's layout box, not its drawn one: it slides in when it first shows, and a box measured mid-slide is wrong.
      openKey = key; const k = (window.devicePixelRatio || 1) / scr.S;
      const sign = up && el.offsetWidth ? { x0: el.offsetLeft * k, x1: (el.offsetLeft + el.offsetWidth) * k, y0: el.offsetTop * k, y1: (el.offsetTop + el.offsetHeight) * k } : null;
      // On an upright phone the sign spans the width, so everything below its top counts as covered, like the bar (F8).
      openCover = scr.narrow && sign ? scr.VH - sign.y0 : barCss() * k;
      openAt = scr.narrow && sign ? openFrame(T, W.destBox, PLACES.slice(1), scr.VW, scr.VH, WW, WH + (scr.VH - sign.y0), scr.VH - sign.y0 + 4, null)
        : openFrame(T, W.destBox, PLACES.slice(1), scr.VW, scr.VH, WW, WH, barCss() * k, sign);
      if (sign) signAt = { size: scr.VW * 1e4 + scr.VH, at: openAt };
    }
    return openAt;
  };
  // Left alone at the Trailhead the view looks round (F5a; it was a sideways sway before): from the opening it
  // goes to each destination in the order of the junction sign, rests there, and comes home, over and over.
  // A destination's rest puts its name a little above the middle, right of the sign, so its peaks and its country show.
  // On an upright phone the sign spans the bottom, so the name sits 40% of the way down what shows above it, centred across the narrow view (F8). Skipped when everything is in frame.
  const ROUND = { hold: 5, go: 3.5 };
  const lookRound = (scr, t, hx, hy) => {
    const { VW, VH } = scr, stops = [[hx, hy]];
    for (let k = 1; k <= 3; k++) { const b = W.destBox[k], p = PLACES[k], cx = scr.narrow ? p.x : (b.x0 + b.x1) / 2 - VW * 0.1, cy = scr.narrow ? p.y + VH / 2 - 0.4 * (VH - openCover) : p.y + VH * 0.06; if (p.x - hx < -VW / 2 + 40 || p.x - hx > VW / 2 - 40 || p.y - hy < -VH / 2 + 20 || p.y - hy > VH / 2 - 60) stops.push([cx, cy]); }
    if (stops.length < 2) return [hx, hy];
    const leg = ROUND.hold + ROUND.go, n = stops.length, i = Math.floor(t / leg) % n, u = smooth(ROUND.hold, leg, t % leg), a = stops[i], b = stops[(i + 1) % n];
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  };
  let past = 0, nowT = 0;
  // walkTo: a leg that is walked over that part of its time and then stood still (the register, L2).
  const where = (leg, q) => { if (leg.walkTo) q = Math.min(1, q / leg.walkTo); const P = paths[leg.path], a = P.at(lerp(leg.from, leg.to, q)), s = leg.to < leg.from ? -1 : 1; return { x: a.x, y: a.y, dx: a.dx * s, dy: a.dy * s, P }; };
  const target = (scr, here, env) => {
    // env.lead: the hand-off from the opening frame to following him, eased over 2 seconds in pixel.js (F6).
    const v = vista(scr), k = !env || env.lead === undefined ? smooth(0, 60, Math.hypot(here.x - T.x, here.y - T.y)) : env.lead;
    return [lerp(v.x, here.x, k), lerp(v.y, here.y - 24, k)];
  };

  return {
    name: 'world', paths, lakeIn, lakeOut, spiresIn, T, WW, WH,
    // For the trail map sheet (L9): the peak's summit and the six Spires summits on the map, and the picture's
    // frame: the box round the Trailhead and the three destinations' countries with a margin, widened to the
    // sheet's shape (8 by 5) and kept on the map.
    peakTop: [spots.flags.stack.x, spots.flags.stack.y - spots.flags.stack.lift], spireTops: spots.spireTops,
    mapFrame() {
      let x0 = T.x, x1 = T.x, y0 = T.y, y1 = T.y;
      for (let k = 1; k <= 3; k++) { const b = W.destBox[k]; if (b.x1 < 0) continue; x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x1); y0 = Math.min(y0, b.y0); y1 = Math.max(y1, b.y1); }
      x0 -= 40; x1 += 40; y0 -= 30; y1 += 40;
      let w = x1 - x0, h = y1 - y0; if (w / h < 1.6) { const d = h * 1.6 - w; x0 -= d / 2; w = h * 1.6; } else { const d = w / 1.6 - h; y0 -= d / 2; h = w / 1.6; }
      w = Math.min(w, WW); h = Math.min(h, WH); x0 = clamp(x0, 0, WW - w); y0 = clamp(y0, 0, WH - h);
      return { x: Math.round(x0), y: Math.round(y0), w: Math.round(w), h: Math.round(h) };
    },
    // The distances (L8), all read off the map's own trails at one scale, as a trail sign gives them: to the
    // lake's shore along the loop (where it comes out by the water), to the foot of the peak's ridge, to base
    // camp; and the lake loop all the way round, for the trail map. Round 3 wrote the lake's 5.2 by hand.
    lengths: () => { const km = (k, f = 1) => Math.round(paths[k].len * f * KM * 10) / 10; return { lake: km('lake', lakeOut), loop: km('lake'), stack: km('stack'), spires: km('spires') }; },
    dur: leg => leg.secs || Math.abs(leg.to - leg.from) * paths[leg.path].len / RUN,
    stops: () => [],
    // North on the map is uphill, which is all the profile along the bottom needs.
    elev: (leg, q) => (T.y - where(leg, q).y) * 0.8,
    // One frame of the map from a fixed spot, without him: the picture on the trail map.
    still(scr, x, y, env) {
      const keep = [cam.x, cam.y, last, focus, facing, flip];
      this.draw(scr, { ...env, dt: 0, moving: false, home: false, idle: 0, look: { x: 0, y: 0 }, hideMe: true, fixed: { x, y } }, { path: 'lake', from: 0, to: 0 }, 0);
      [cam.x, cam.y, last, focus, facing, flip] = keep;
    },
    // Back from the register's close-up (L6) the view opens on the Trailhead's own frame, not one leaning toward him.
    enter(scr, leg, q) { regTrip = leg.path === 'register'; const [tx, ty] = target(scr, where(leg, q), regTrip ? { lead: 0 } : undefined); cam.x = tx; cam.y = ty; },
    focus: () => focus,
    // The spot of the map under a point of the screen.
    at: (sx, sy) => ({ x: sx + last.ox, y: sy + last.oy }),
    // The four places he can be sent to, for the page to pin a name on. The page keeps a name on screen
    // when its place is out of view.
    // A place's tag rises and brightens with it when it lifts (E5j): lift is how far up it is, 0 to 1.
    labels() { return PLACES.map(d => { const k = W.DEST.indexOf(d.id), l = k > 0 ? lifted[k] : 0; return { id: 'go:' + d.id, name: DEST_NAMES[d.id], x: d.x - last.ox, y: d.y - last.oy - 2 * l, lift: l }; }); },
    // What is under a point of the screen: a sign with a name, the kiosk, a cat.
    pick(sx, sy) {
      const wx = sx + last.ox, wy = sy + last.oy;
      for (const s of spots.signs) if (Math.abs(wx - s[0]) < 8 && wy > s[1] - 17 && wy < s[1] + 3) return { label: SIGNS[s[2]], x: s[0] - last.ox, y: s[1] - 18 - last.oy };
      const c = kit.pick(wx, wy); if (c) return { label: c.label, x: c.wx - last.ox, y: c.wy - last.oy, act: c.act };
      if (spots.lookout) { const [lx, ly] = spots.lookout; if (Math.abs(wx - lx) < 9 && wy > ly - 30 && wy < ly + 2) return { label: NAMES.lookout, x: lx - last.ox, y: ly - 31 - last.oy }; }
      { const [rx, ry] = spots.register; if (Math.abs(wx - rx) < 6 && wy > ry - 21 && wy < ry + 2) return { label: NAMES.register, x: rx - last.ox, y: ry - 21 - last.oy, act: 'register' }; }
      { const [kx, ky] = spots.kiosk; if (Math.abs(wx - kx) < 14 && wy > ky - 27 && wy < ky + 3) return { label: NAMES.kiosk, x: kx - last.ox, y: ky - 27 - last.oy, act: 'kiosk' }; }
      // The tide pool to find (E7), only while the low water has left it.
      { const p = crit.findPool(nowT); if (p && Math.abs(wx - p.x) <= p.rx + 2 && Math.abs(wy - p.y) <= 4) return { label: NAMES.tidepool, x: p.x - last.ox, y: p.y - 6 - last.oy, act: 'pool' }; }
      { const k = destUnder(wx, wy); if (k) return { label: DEST_NAMES[W.DEST[k]], named: true, x: sx, y: sy, act: 'dest:' + W.DEST[k] }; }
      return null;
    },
    // The debug panel's start buttons (E5f): each moves its event's clock so the event begins now.
    trigger(name, t) {
      if (name === 'shower') { const n = Math.floor((t + rainAhead + RAIN.cycle - 10) / RAIN.cycle) + 1; rainAhead = n * RAIN.cycle - t - RAIN.cycle + 10; return true; }
      if (name === 'avalanche') { if (!AV) return false; AVA.phase = 'covered'; AVA.cover = 1; AVA.plume = -1; AVA.start = t; return true; }
      if (name === 'serac') { if (SER.length < 2) return false; const n = Math.floor((t + serAhead + SLOT - 15) / SLOT) + 1; serAhead = n * SLOT + 10 * hash(n, 3, 4741) - t - SLOT + 15; return true; }
      if (name === 'lens') return startLens(t);
      return ev.trigger(name, t) || crit.trigger(name, t);
    },
    act(id, env) { if (id === 'pool') { env.found('tidepool'); return false; } if (id.startsWith('dest:')) { const k = W.DEST.indexOf(id.slice(5)); if (lifted[k] > 0.5) return false; tapped = k; tapUntil = env.t + 3; return true; } return id.startsWith('cat:') ? kit.click(id.slice(4), env) : false; },
    draw(scr, env, leg, q) {
      const { VW, VH, fb } = scr, { t, tq, dt } = env; nowT = t;
      regTrip = leg.path === 'register';
      const here = where(leg, q);
      if (env.moving && Math.abs(here.dx) + Math.abs(here.dy) > 0.01) {
        if (Math.abs(here.dx) > Math.abs(here.dy) * 0.7) { facing = 'side'; flip = here.dx < 0; } else facing = here.dy < 0 ? 'up' : 'down';
      }
      if (env.home) facing = 'down';

      // Camera: the whole view from the Trailhead, then follow him.
      let [tx, ty] = target(scr, here, env);
      if (env.home && env.idle > 4 && !env.calm && Math.abs(env.look.x) + Math.abs(env.look.y) < 1) [tx, ty] = lookRound(scr, env.idle - 4, tx, ty);
      const damp = env.calm ? 1 : 1 - Math.exp(-dt * 3.2);
      cam.x += (tx - cam.x) * damp; cam.y += (ty - cam.y) * damp;
      // A zoom step keeps one spot of the map under the pointer: the camera goes straight to its new rest and the dragged view makes up the difference.
      if (env.anchor && !env.fixed) { const a = env.anchor; cam.x = tx; cam.y = ty; env.look.x = a.wx - a.sx + VW / 2 - cam.x; env.look.y = a.wy - a.sy + VH / 2 - cam.y; env.anchor = null; }
      // How far a drag may take the view: the hard limits below keep the edge of the world out of sight,
      // and the last 26 pixels before them push back.
      // The timeline bar covers the bottom of the view, so the view may go that much further down and the
      // bottom of the map (the river's mouth, the dry corner) can be brought up above it (D11).
      const bar = barCss() / scr.S;
      if (!env.fixed) { const M = 26, b = { x0: Math.min(0, VW / 2 + M - cam.x), x1: Math.max(0, WW - VW / 2 - M - cam.x), y0: Math.min(0, VH / 2 + M - cam.y), y1: Math.max(0, WH - VH / 2 - M + bar - cam.y) }; if (VW >= WW) b.x0 = b.x1 = 0; env.lookBox = b; }
      let cx = cam.x + env.look.x, cy = cam.y + env.look.y;
      cx = VW >= WW ? WW / 2 : clamp(cx, VW / 2, WW - VW / 2);
      past += ((scr.narrow && env.home ? VH * 0.34 : 0) - past) * (env.fixed ? 0 : Math.min(1, dt * 4));
      // Down, the view may go past the map's foot by what the bar (and on a phone the panels) cover. The
      // limit closes smoothly as the view grows to the map's height, so a zoom out never jumps at the end (F4).
      cy = clamp(cy, VH / 2, Math.max(VH / 2, WH - VH / 2 + past + bar));
      const ox = env.fixed ? env.fixed.x : Math.round(cx - VW / 2), oy = env.fixed ? env.fixed.y : Math.round(cy - VH / 2);
      last = { ox, oy, VW, VH };
      // The night sky is pinned to the world's own sky, laid out over a height that keeps the aurora in its dark upper part.
      scr.sky = { ox, oy, w: WW, h: 330, moon: [1180, 60] };

      // Ground. West of the weather's edge, once the drizzle has wet it, the wet copy.
      gNow = env.mix > 0.5 ? groundDusk() : ground;
      const sky = weather(t), wetOn = DEBUG.clouds && sky.wet > 0.3, gWet = wetOn ? wetCopy(env.mix > 0.5) : gNow;
      for (let y = 0; y < VH; y++) {
        const wy = oy + y, row = y * VW;
        if (wy < 0) { fb.fill(R.skyband[0], row, row + VW); continue; }
        if (wy >= WH) { const my = 2 * WH - 1 - wy, a = Math.max(0, ox), b = Math.min(WW, ox + VW); fb.fill(R.grass[2], row, row + VW); if (my >= 470 && b > a) fb.set(gNow.subarray(my * WW + a, my * WW + b), row + (a - ox)); continue; }
        const a = Math.max(0, ox), b = Math.min(WW, ox + VW);
        if (a > ox) fb.fill(wy < 330 ? R.sky[2] : R.grass[2], row, row + (a - ox));
        if (b < ox + VW) fb.fill(wy < 330 ? R.sky[2] : R.grass[2], row + (b - ox), row + VW);
        if (b > a) { const e = wetOn ? clamp(Math.round(frontAt(wy, sky)), a, b) : a; if (e > a) fb.set(gWet.subarray(wy * WW + a, wy * WW + e), row + (a - ox)); if (b > e) fb.set(gNow.subarray(wy * WW + e, wy * WW + b), row + (e - ox)); }
      }
      // With the Trees switch off, the snags and shadows painted into the ground give way to what lay under them.
      if (!DEBUG.trees) for (let y = Math.max(0, -oy); y < Math.min(VH, WH - oy); y++) { const wy = y + oy, row = y * VW; for (let x = Math.max(0, -ox); x < Math.min(VW, WW - ox); x++) { const c = W.bare[wy * WW + x + ox]; if (c) fb[row + x] = c; } }
      avalancheStep(t, env, !!AV && AV.cx - ox > -40 && AV.cx - ox < VW + 40 && AV.y0 - oy > -60 && AV.y0 - oy < VH);
      avalancheCover(fb, VW, VH, ox, oy, t);
      crit.weather(Math.max(sky.fog, sky.deck * 0.8), (x, y) => fogIn(x, y, sky));
      if (env.mix > 0.02) for (let n = 0; n < 2; n++) { const top = tipTop[n], H = TIP_H[n], k = 6 + n;
        for (let x = Math.max(0, ox); x < Math.min(WW, ox + VW); x++) { const y0 = top[x]; if (y0 < 0) continue;
          for (let y = Math.max(y0, oy); y < Math.min(y0 + H, oy + VH, WH); y++) { if (W.dest[y * WW + x] !== k) continue; const d = (y - y0) / H; if (bayer(x, y) < env.mix * Math.pow(1 - d, 0.8)) { const i = (y - oy) * VW + (x - ox); fb[i] = GLOW[fb[i]]; } } } }
      crit.sea(scr, ox, oy, t); if (WWP) whiteWater(fb, VW, VH, ox, oy, WWP, WWF, t); crit.falls(scr, ox, oy, t);
      crit.update(dt, t, env.hideMe ? null : here);
      if (DEBUG.clouds) for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v) % (WW + 120)) - 60 - ox, c.y - oy);
      if (DEBUG.clouds) lenticular(scr, ox, oy, t);
      seracFall(scr, ox, oy, t, env);
      avalancheFx(scr, ox, oy, t);
      for (const k in prints) if (env.done[k]) for (const [x, y] of prints[k]) { const sx = x - ox, sy = y - oy; if (sx >= 0 && sy >= 0 && sx < VW && sy < VH && KIND[fb[sy * VW + sx]] >= 3 && KIND[fb[sy * VW + sx]] !== 4) { const i = sy * VW + sx; fb[i] = KIND[fb[i]] === 3 ? R.dirt[0] : SHADE[fb[i]]; } }
      { const over = env.ptr && !env.fixed ? destUnder(env.ptr[0] + ox, env.ptr[1] + oy) : 0, want = over || (t < tapUntil ? tapped : 0);
        for (let k = 1; k < 4; k++) { lifted[k] += ((k === want ? 1 : 0) - lifted[k]) * Math.min(1, dt * 9); const d = Math.round(2 * lifted[k]); if (d > 0) liftDest(scr, k, d, ox, oy); } }

      // Everything that stands, back to front.
      // The Trees switch hides trees, not the flowers, bushes and sage that sway like them (marked low).
      if (!still) { still = things.filter(th => !th.critter).sort((a, b) => a.y - b.y); moves = things.filter(th => th.critter); }
      mov.length = 0;
      if (!env.hideMe) mov.push({ me: true, x: here.x, y: here.y });
      { const fh = crit.ferryHull(t, ox, oy, VW, VH); if (fh) mov.push({ ferryHull: true, y: fh.y }); }
      kit.update(env, here, scr.narrow && !env.fixed, env.home && !env.fixed ? oy + (scr.narrow ? VH * 0.56 : VH - 38) : 0);
      for (const it of kit.items()) mov.push(it);
      // Once he is at the box, its front is down (L2).
      regBox.bm = REGS[(env.done.lake ? 1 : 0) | (env.done.stack ? 2 : 0) | (env.done.spires ? 4 : 0) | (leg.path === 'register' && leg.to === 1 && q > 0.8 ? 8 : 0)];
      standing(still, moves, mov, list, ox, oy, VW, VH, env.done);
      // A tree that nearer ground partly hides is drawn only where the land under each pixel is no
      // nearer than the tree itself (D6a), so it can sway and still stand behind the slope in front.
      const OY = oy, DEP = W.depth, clipBlit = (bm, sx, sy, v, dy = 0) => { sx = Math.round(sx); sy = Math.round(sy); const lim = v - 3; for (let j = 0; j < bm.h; j++) { const y = sy + j, vy = y - oy - dy; if (vy < 0 || vy >= VH || y < 0 || y >= WH) continue; for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i]; if (!c) continue; const x = sx + i, vx = x - ox; if (vx < 0 || vx >= VW || x < 0 || x >= WW || DEP[y * WW + x] < lim) continue; fb[vy * VW + vx] = c; } } };
      for (const th of list) {
        const dl = liftAt(th.x, th.y), oy = OY + dl;
        if (th.me) {
          const set = env.moving && !(leg.walkTo && q > leg.walkTo) ? (facing === 'side' ? runner.side : facing === 'up' ? runner.up : runner.down) : (facing === 'side' ? runner.sideIdle : facing === 'up' ? runner.upIdle : runner.downIdle);
          const bm = set[Math.floor(Math.abs(leg.to - leg.from) * q * here.P.len / (facing === 'side' ? 4.2 : 5)) % set.length];
          // Ground nearer the camera than he is stands in front of him: what was there is put back over him.
          const X = Math.round(th.x - ox), Y = Math.round(th.y - oy), vMe = vOn(leg.path, th.x, th.y), x0 = Math.max(0, X - 12), x1 = Math.min(VW - 1, X + 12), y0 = Math.max(0, Y - 30), y1 = Math.min(VH - 1, Y + 3);
          { let n = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) saved[n++] = fb[y * VW + x]; }
          scr.shadow(X, Y, 5, 2);
          scr.put(bm, th.x - ox, th.y - oy, flip && facing === 'side');
          { let n = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++, n++) if (W.vAt(x + ox, y + OY) < vMe - 3) fb[y * VW + x] = saved[n]; }
          focus = { x: Math.round(th.x - ox), y: Math.round(th.y - oy) - 14 };
        } else if (th.ferryHull) {
          crit.drawHull(scr, ox, oy, t);
        } else if (th.cat) {
          kit.drawOne(scr, th.cat, ox, oy, t);
        } else if (th.critter) {
          crit.draw(scr, th, ox, oy, t);
        } else if (th.kind === 'tree') { const T = th.t; drawTree(scr, T.tree.parts, T.x, T.y, !!T.clip, T.v || 0, tq, ox, oy, dl, clipBlit); }
        else drawStill(scr, th, tq, ox, oy, dl, clipBlit, flags, t);
      }

      ev.draw(scr, ox, oy, t, env.mix || 0);
      if (env.mix > 0.02) duskHills(fb, VW, VH, ox, oy, HLIT, gNow, env.mix, WARM);
      // Cloud shadows cross the meadow: everything under one goes a step darker, with a soft edge. Each is
      // cast by a small fair-weather cloud drifting above it (E5a), drawn after the mist.
      for (let k = 0; DEBUG.clouds && k < 4; k++) {
        const { cw, chh } = FAIR[k], cxw = fairX(k, t) + 8, cyw = FAIR[k].y;
        const y0 = Math.max(0, Math.round(cyw - chh - oy)), y1 = Math.min(VH - 1, Math.round(cyw + chh - oy)), x0 = Math.max(0, Math.round(cxw - cw - ox)), x1 = Math.min(VW - 1, Math.round(cxw + cw - ox));
        for (let y = y0; y <= y1; y++) { const wy = y + oy; if (wy < 560) continue; for (let x = x0; x <= x1; x++) {
          const nx = (x + ox - cxw) / cw, ny = (wy - cyw) / chh, d = nx * nx + ny * ny + 0.22 * Math.sin(nx * 7 + k) * Math.sin(ny * 5 + k * 2);
          if (d < 0.82 || (d < 1 && ((x + ox + wy) & 1))) { const i = y * VW + x; fb[i] = SHADE[fb[i]]; }
        } }
      }
      // The boot track on the glacier, then the mist over the forest and the fog bank off the coast.
      for (const [x, y, c] of trackPix) scr.set(x - ox, y - oy, c);
      if (DEBUG.mist && sky.fog > 0.01) fogPass(fb, VW, VH, ox, oy, W.fog, gNow, gWet, wetOn, VEIL, sky, env.hideMe ? null : here, sky.fog * 8 / 255, FX0, FX1);
      if (DEBUG.clouds && sky.deck > 0.06) deckPass(fb, VW, VH, ox, oy, W.deck, VEIL, CHURN, sky, t, sky.deck * 7.4 / 255 / 255, DX0, DX1);
      if (DEBUG.mist) crit.mist(scr, ox, oy, t, env.hideMe ? null : here);
      if (DEBUG.clouds && sky.rain > 0.02) drizzle(scr, ox, oy, t, sky, W.fog, W.deck, frontAt, STREAK);
      if (DEBUG.clouds && sky.drip > 0.02) drip(scr, ox, oy, t, sky, DRIPS, frontAt);
      if (DEBUG.clouds) { for (let k = 0; k < 4; k++) scr.blit(FAIR[k].bm, Math.round(fairX(k, t)) - FAIR[k].bm.ox - ox, FAIR[k].y - FAIR_ALT - FAIR[k].bm.oy - oy); }
      kit.drawOver(scr, ox, oy, t);
      if (env.mix > 0.5) for (const g of tentGlow) { scr.put(g.b, g.x - ox, g.y - oy, false); for (let dx = -7; dx <= 7; dx++) for (let dy = 1; dy <= 2; dy++) if (bayer(g.x + dx, g.y + dy) < 0.4 * (1 - Math.abs(dx) / 8) * smooth(0.5, 0.8, env.mix)) scr.set(g.x + dx - ox, g.y + dy - oy, R.lamp[0]); }
      headlamps(scr, ox, oy, t, env.mix);
      // Smoke from the stove at base camp, drifting off with the wind.
      for (let k = 0; k < 6; k++) {
        const age = frac(t * 0.35 + k / 6), x = Math.round(spots.tents[0][0] + 9 + age * 10 + Math.sin(age * 6 + k) * 1.5) - ox, y = Math.round(spots.tents[0][1] - age * 26) - oy;
        if (x < 1 || y < 1 || x >= VW - 1 || y >= VH - 1) continue;
        const c = age < 0.5 ? R.white[1] : R.white[0];
        fb[y * VW + x] = c; if (age > 0.3) fb[y * VW + x + 1] = c;
      }
      if (DEBUG.animals) crit.over(scr, ox, oy, t, env);
      // Birds cross the sky in a loose V, flapping a few times a second.
      for (let k = 0; DEBUG.animals && k < 4; k++) {
        const bx = ((t * 22 + k * 11) % (WW + 200)) - 100, by = 250 + 8 * Math.sin(t * 0.7) + [0, 5, 9, 4][k];
        scr.blit(birds[(Math.floor(t * 3) + k) & 1], bx - [0, -9, 9, -17][k] - 3 - ox, by - 2 - oy);
      }
      // Butterflies over the flowers by the Trailhead.
      for (let k = 0; DEBUG.animals && k < 3; k++) {
        const bx = Math.round(T.x - 96 + k * 88 + 14 * Math.sin(t * 0.6 + k * 2)), by = Math.round(T.y + 10 - (k % 3) * 22 + 6 * Math.sin(t * 1.1 + k));
        const sx = bx - ox, sy = by - oy, col = k % 3 ? R.white[1] : R.yellow[1];
        if (sx < 1 || sy < 1 || sx >= VW - 1 || sy >= VH - 1) continue;
        const open = (Math.floor(t * 5) + k) & 1;
        fb[sy * VW + sx] = INK; fb[sy * VW + sx - 1] = col; fb[sy * VW + sx + 1] = col;
        if (open) { fb[(sy - 1) * VW + sx - 1] = col; fb[(sy - 1) * VW + sx + 1] = col; }
      }
      // Fireflies blink in the forest once the light goes.
      if (env.mix > 0.4) for (let k = 0; k < 110; k++) {
        const fx = Math.round(20 + hash(k, 1, 90) * 640 + 6 * Math.sin(t * 0.6 + k)), fy = Math.round(420 + hash(k, 2, 90) * 640 + 4 * Math.sin(t * 0.8 + k * 1.7));
        if (forestAmt(fx, fy) < 0.5 || frac(t * 0.4 + hash(k, 3, 90)) > 0.55) continue;
        scr.set(fx - ox, fy - oy, R.yellow[1]);
      }
      // Shafts of light slant down through the forest canopy: every other pixel one step lighter.
      for (let y = 0; y < VH; y++) {
        const wy = oy + y; if (wy < 300 || wy >= WH) continue;
        for (let x = (y + oy + ox) & 1; x < VW; x += 2) {
          const wx = ox + x; if (wx < 0 || wx >= WW || !shaftMask[wy * WW + wx]) continue;
          const i = y * VW + x; fb[i] = shaftMask[wy * WW + wx] === 2 ? LIGHT[LIGHT[fb[i]]] : LIGHT[fb[i]];
        }
      }
      // The debug panel's outlines, over the finished map.
      if (!env.fixed && (DEBUG.roam || DEBUG.trails || DEBUG.camera)) {
        const dot = (x, y, c) => scr.set(Math.round(x) - ox, Math.round(y) - oy, c);
        const oval = (a, c) => { const n = Math.ceil((a.rx + a.ry) * 2); for (let k = 0; k < n; k += 2) dot(a.x + Math.cos(k / n * TAU) * a.rx, a.y + Math.sin(k / n * TAU) * a.ry, c); };
        const box = (b, c, step) => { for (let x = b.x0; x <= b.x1; x += step) { dot(x, b.y0, c); dot(x, b.y1, c); } for (let y = b.y0; y <= b.y1; y += step) { dot(b.x0, y, c); dot(b.x1, y, c); } };
        // Red ovals: where each animal wanders and each flock circles. Pink boxes: where the cats keep to.
        if (DEBUG.roam) { for (const a of crit.areas()) oval(a, R.red[1]); for (const b of kit.areas()) box(b, R.pink[1], 2); }
        // Each trail as the line he actually follows, with a knot every twenty pixels, and a white cross
        // where the lake loop goes into the forest and where it comes back out.
        if (DEBUG.trails) {
          for (const [k, c] of [['lake', R.red[1]], ['stack', R.yellow[1]], ['spires', R.pink[2]]]) { const P = paths[k]; for (let d = 0; d <= P.len; d++) { const a = P.at(d / P.len); dot(a.x, a.y, c); if (d % 20 === 0) { dot(a.x + 1, a.y, c); dot(a.x - 1, a.y, c); dot(a.x, a.y + 1, c); dot(a.x, a.y - 1, c); } } }
          for (const q of [lakeIn, lakeOut]) { const a = paths.lake.at(q); for (let k = -3; k <= 3; k++) { dot(a.x + k, a.y + k, R.white[1]); dot(a.x + k, a.y - k, R.white[1]); } }
        }
        // Yellow: where the middle of the view may go. Orange: where a drag starts to be pushed back.
        // White: the edge of the world. Yellow cross: where the camera rests. White cross: the middle of the view.
        if (DEBUG.camera) {
          box({ x0: VW / 2, x1: WW - VW / 2, y0: VH / 2, y1: WH - VH / 2 + past }, R.yellow[1], 2);
          box({ x0: VW / 2 + 26, x1: WW - VW / 2 - 26, y0: VH / 2 + 26, y1: WH - VH / 2 - 26 }, R.blaze[1], 3);
          box({ x0: 0, x1: WW - 1, y0: 0, y1: WH - 1 }, R.white[1], 1);
          for (let k = -4; k <= 4; k++) { dot(cam.x + k, cam.y, R.yellow[1]); dot(cam.x, cam.y + k, R.yellow[1]); dot(ox + VW / 2 + k, oy + VH / 2, R.white[1]); dot(ox + VW / 2, oy + VH / 2 + k, R.white[1]); }
        }
      }
    }
  };
}

