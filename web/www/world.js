// The world map: the top-down view of the Trailhead and its three destinations.
import { DEBUG, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, bayer, R, DAY, RAMP_OF, STEP_OF, INK, SHADE, LIGHT, KIND, BM, makePath } from './core.js';
import { breeze, gustOver, askGust, veilTable, saw } from './core.js';
import { makeCloud, makeSmallSign, makeKiosk, makeLookout, makeTent, makeJournal, makeFlag, makeRegister } from './sprites.js';
import { speck } from './fauna.js';
import { SIGNS, NAMES, DEST_NAMES, UI } from './content.js';
import { makeCats } from './cats.js';
import { makeCritters } from './critters.js';
import { checkRules } from './rules.js';
import { makeEvents, drawLens, startLens, inView } from './events.js';
import { makeLife } from './life.js';
import { makeRunner } from './tj.js';
import { buildTerrain, NW as WW, NH as WH, T } from './land.js';
import { faceSnow } from './monolith.js';
// How much of the bottom of the window the timeline bar covers, in page pixels: from its top edge down, measured
// from its layout once it shows (F9; 32 of its own pixels, the old guess, was a third too tall on a big window and
// let rows past the map's foot show above it). Read again only when the page is resized or the bar comes or goes.
let barAt = -1, barH = 0;
const barCss = () => { const el = document.getElementById('bar'), up = !!el && !el.hidden && el.offsetHeight > 0, key = (innerWidth * 1e4 + innerHeight) * 2 + (up ? 1 : 0); if (barAt !== key) { barAt = key; barH = up ? innerHeight - el.offsetTop : 32 * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) || 2); } return barH; };
// The opening frame (F5a). He stands a little below and right of the middle of what shows above the timeline
// bar (or above the junction sign on an upright phone), so the eye finds him at once (round 6, note 7). Within
// that, the frame is the one that shows the most destination names, then the largest share of each
// destination's country (each counts the same, however big). Ground under the junction sign (sign: its box
// in map pixels from the view's corner) does not count. Ties go to the frame that puts him nearest the
// middle of his window.
const OPEN_X = [0.52, 0.66], OPEN_Y = [0.56, 0.72];
function openFrame(T, boxes, names, VW, VH, WW, WH, bar, sign) {
  // Where the view's centre may be for him to stand in his window: x and y on screen are OPEN_X of the
  // width and OPEN_Y of the height left above the bar. The map's edges come first if they disagree.
  const H = VH - bar, inX = [VW / 2, WW - VW / 2], inY = [VH / 2, Math.max(VH / 2, WH - VH / 2 + bar)];
  const cxs = [T.x + VW / 2 - OPEN_X[1] * VW, T.x + VW / 2 - OPEN_X[0] * VW], cys = [T.y + VH / 2 - OPEN_Y[1] * H, T.y + VH / 2 - OPEN_Y[0] * H];
  const clampTo = (v, r) => Math.min(r[1], Math.max(r[0], v));
  const x0 = clampTo(cxs[0], inX), x1 = Math.max(x0, clampTo(cxs[1], inX)), y0 = clampTo(cys[0], inY), y1 = Math.max(y0, clampTo(cys[1], inY));
  const mx = T.x + VW / 2 - (OPEN_X[0] + OPEN_X[1]) / 2 * VW, my = T.y + VH / 2 - (OPEN_Y[0] + OPEN_Y[1]) / 2 * H;
  let best = -1, bx = T.x, by = T.y;
  for (let cy = y0; cy <= y1; cy += 3) for (let cx = x0; cx <= x1; cx += 3) {
    const ox = cx - VW / 2, oy = cy - VH / 2; let s = 0;
    for (const b of boxes) {
      if (b.x1 < b.x0) continue;
      const w = Math.max(0, Math.min(b.x1, ox + VW) - Math.max(b.x0, ox)), h = Math.max(0, Math.min(b.y1, oy + VH - bar) - Math.max(b.y0, oy));
      let a = w * h;
      if (a && sign) { const sw = Math.max(0, Math.min(b.x1, ox + sign.x1) - Math.max(b.x0, ox + sign.x0)), sh = Math.max(0, Math.min(b.y1, oy + sign.y1) - Math.max(b.y0, oy + sign.y0)); a -= sw * sh; }
      s += a / ((b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1));
    }
    for (const n of names) { const x = n.x - ox, y = n.y - oy; if (x > 30 && x < VW - 30 && y > 12 && y < VH - bar - 8 && !(sign && x > sign.x0 - 30 && x < sign.x1 + 30 && y > sign.y0 - 8 && y < sign.y1 + 8)) s += 4; }
    s -= Math.hypot(cx - mx, cy - my) * 1e-5;
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
// it shows on both. Every streak belongs to a patch of the world (RCW by RCH map pixels, one streak to a
// patch) and falls there, so the rain stays with the land under it when the view pans or zooms (T14). A
// streak starts anywhere in its patch and the one beside it, so the patches never show as a grid.
const RCW = 20, RCH = 13;
function drizzle(scr, ox, oy, t, w, F, M, frontAt, STREAK) {
  const { VW, VH, fb } = scr, gx0 = Math.max(0, Math.floor((ox - 4) / RCW) - 2), gx1 = Math.min(Math.floor((ox + VW) / RCW), Math.floor((w.front + 42) / RCW)), gy0 = Math.max(0, Math.floor((oy - 10) / RCH) - 2), gy1 = Math.min(Math.floor((oy + VH) / RCH), Math.floor(WH / RCH));
  for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
    const id = gy * 97 + gx, life = t / 0.5 + hash(id, 3, 5149), c = Math.floor(life), q = life - c;
    if (hash(id, c, 5150) > w.rain) continue;
    const x = Math.round(gx * RCW + hash(id, c, 5151) * 2 * RCW + q * 2), y = Math.round(gy * RCH + hash(id, c, 5152) * 2 * RCH + q * 6);
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
// ---- the avalanches on Mount Monolith's icefalls (E5c; all of them since round 5) ----
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
// The slab once it gives way: it breaks into blocks that slide off down the face's own line (ux, uy), faster
// and faster, each its own way, and comes apart into powder.
function slabPass(fb, VW, VH, ox, oy, A, a) {
  const { AX, AY, snow, ux, uy } = A, gone = smooth(0.4, 2.6, a);
  for (let j = 0; j < AX.length; j++) {
    const X = AX[j], Y = AY[j], h = hash(X >> 2, Y >> 2, 4801), off = 2 + a * a * 16 * (0.75 + 0.5 * h), y = Math.round(Y + off * uy) - oy, x = Math.round(X + off * ux + (h - 0.5) * a * 6) - ox;
    if (x < 0 || y < 0 || x >= VW || y >= VH || bayer(X, Math.round(Y + off)) < gone * (0.7 + 0.6 * h)) continue;
    fb[y * VW + x] = snow[j];
  }
}
// A round cloud of powder, lit from above: white on top, blue-grey snow shade under, with no outline so
// that puffs laid over each other merge into one billowing cloud. Used for the avalanche's cloud and the
// plume off the summit.
function puffAt(fb, VW, VH, ox, oy, cx, cy, r, al, sq, heavy) {
  for (let dy = -Math.ceil(r); dy <= r * 0.7; dy++) { const y = Math.round(cy + dy) - oy; if (y < 0 || y >= VH) continue;
    for (let dx = -Math.ceil(r * sq); dx <= r * sq; dx++) { const x = Math.round(cx + dx) - ox; if (x < 0 || x >= VW) continue; const d2 = (dx * dx / (sq * sq) + dy * dy) / (r * r); if (d2 > 1 || bayer(x + ox, y + oy) >= al * (1.3 - d2)) continue;
      const f = (dy + r) / (1.7 * r) + 0.25 * (bayer(x + ox + 1, y + oy) - 0.5); fb[y * VW + x] = heavy ? (f < 0.26 ? R.snow[4] : f < 0.46 ? R.snow[3] : f < 0.72 ? R.snow[2] : R.snow[1]) : f < 0.36 ? R.snow[4] : f < 0.62 ? R.snow[3] : R.snow[2]; } }
}
// The summit squall's curtain of falling snow (round 5, T20): a haze of pale snow colours laid through a
// dither over the mountain under the cloud, thickest under the middle of the cloud and thinning to the sides
// and downward. It hangs from the cloud's base (y0) as half an oval rx wide and ry deep, leaning east with
// the wind, in slanting bands that slide down it, so it is seen to fall. (A first try with the fog's colours
// tinted the snow green.)
// (Frame time: each row is walked only between the curtain's own edges, the bands come from a table of sines
// and each column's share of the wave is worked out once a frame. Done pixel by pixel with two sines each it
// cost 3 ms.)
const SINE = new Float32Array(256).map((_, i) => Math.sin(i / 256 * 6.283185)), COLW = new Float32Array(4096);
function squallVeil(fb, VW, VH, ox, oy, cx, y0, rx, ry, den, t) {
  const ya = Math.max(0, Math.round(y0) - oy), yb = Math.min(VH, Math.round(y0 + ry) - oy), K = 256 / 6.283185, sh = t * 30, S2 = R.snow[2], S3 = R.snow[3];
  for (let x = 0; x < VW && x < 4096; x++) { const wx = x + ox; COLW[x] = (wx * 0.5 / 4.5 + 2 * Math.sin(wx / 17)) * K; }
  for (let y = ya; y < yb; y++) { const wy = y + oy, v = (wy - y0) / ry, row = y * VW, mid = cx + 0.25 * (wy - y0), half = rx * Math.sqrt(Math.max(0, 1 - v * v * 0.8)), rowW = (wy - sh) / 4.5 * K, v2 = v * v * 0.8;
    for (let x = Math.max(0, Math.ceil(mid - half) - ox), xb = Math.min(VW, Math.floor(mid + half) - ox); x < xb; x++) { const wx = x + ox, u = (wx - mid) / rx, bay = bayer(wx, wy);
      const al = den * (1 - u * u - v2) * (0.62 + 0.38 * SINE[(rowW + COLW[x]) & 255]) * 0.7; if (bay >= al) continue;
      fb[row + x] = bay < al * 0.45 ? S3 : S2; } }
}
// The flakes in it: each falls down its own line of the curtain and starts again at the cloud, drawn in a
// colour that shows on what is behind it (FLAKE: grey-blue on snow, white on rock and sky).
const FLK = 1500, FLH = new Float32Array(FLK * 3).map((_, i) => hash(Math.floor(i / 3), 1 + i % 3, 4811));
function squallFlakes(fb, VW, VH, ox, oy, FLAKE, cx, y0, rx, ry, den, t) {
  const n = Math.round(FLK * den);
  for (let k = 0; k < n; k++) { const fall = frac(FLH[3 * k + 1] + t * (0.15 + 0.1 * FLH[3 * k + 2])), wy = y0 + fall * ry, wx = cx + (FLH[3 * k] * 2 - 1) * rx * Math.sqrt(Math.max(0, 1 - fall * fall * 0.8)) + 0.25 * (wy - y0) + 2 * SINE[(t * 80 + k * 41) & 255];
    const x = Math.round(wx) - ox, y = Math.round(wy) - oy; if (x < 0 || y < 0 || x >= VW || y >= VH - 1) continue; fb[y * VW + x] = FLAKE[fb[y * VW + x]]; if (k & 1) fb[(y + 1) * VW + x] = FLAKE[fb[(y + 1) * VW + x]]; }
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

const RING_W = 7, RING_H = 4;
// What the rain did to the lakes in the last frame, for the checks: the rings it drew, and whether a fish may jump.
const WET = { rings: 0, fish: true };
// Still water moves too (round 8, C6, TJ), drawn over the ground each frame after pictures of a calm alpine
// lake in a breeze: short level ripples that drift east and come and go, a few glints in patches where the
// light catches, now and then a gust that crosses from the west as a darker, ruffled band and wipes the
// reflection out as it goes, and in the clear lakes a fish that jumps and leaves two rings.
// L: the lakes, each with its pixels (x, y), its box, a mask of its water over that box, and the spots a
// fish can rise at. glint: how much the water glitters (less at Dusk). fish: whether the animals show.
// rain (round 8, H6): how hard it rains (k), where the weather's edge is in each row (front), and the lake
// the drizzle carries to at half strength (light: Reflection Lake, as its lakeside shows). Water in the
// rain loses its glints to the grey sky, drops open rings on it, and no fish jumps there.
function stillWater(fb, VW, VH, ox, oy, L, t, glint, fish, calmL, calm, rain) {
  const W = R.water, WHITE = R.white[1], beat = Math.floor(t * 4);
  WET.rings = 0; WET.fish = true;
  for (let n = 0; n < L.length; n++) { const l = L[n]; if (l.x1 < ox || l.x0 >= ox + VW || l.y1 < oy || l.y0 >= oy + VH) continue;
    const lake = l.kind === 'lake', w = l.x1 - l.x0 + 1, ym = (l.y0 + l.y1) / 2, edge = !rain ? -1e9 : l === rain.light ? 1e9 : rain.front(ym), rk = l.x0 >= edge ? 0 : l === rain.light ? 0.5 * rain.k : rain.k, dull = glint * (1 - rk);
    // The gust: one every 16 to 26 s, a slanted band about a third of the lake wide, patchy inside.
    const every = 16 + 10 * hash(n, 0, 6101), tg = t + every * hash(n, 1, 6101), gk = Math.floor(tg / every), gu = tg - gk * every, cross = 3.5 + w / 30, bw = Math.max(7, 0.32 * w);
    const front = gu < cross ? Math.floor(l.x0 - bw + (w + 2 * bw) * gu / cross) : null;
    for (let k = 0; k < l.x.length; k++) { const x = l.x[k], y = l.y[k], sx = x - ox, sy = y - oy; if (sx < 0 || sy < 0 || sx >= VW || sy >= VH) continue;
      // A dead calm (round 8, E2): the gusts, the ripples and the glints leave this lake patch by patch, and it lies like glass.
      if (calm > 0 && l === calmL && hash(x >> 2, y >> 1, 6140) < calm) continue;
      const i = sy * VW + sx, c = fb[i], wet = RAMP_OF[c] === 'water';
      if (front !== null) { const a = 1 - Math.abs(x + 0.7 * (y - ym) - front) / bw;
        // Ruffled water is short dashes, and they travel with the band.
        if (a > 0 && hash((x - front + (y & 1)) >> 1, y, 6104) < 1.5 * a * (0.35 + 0.65 * vnoise(x / 8, y / 2.5 + gk, 6102))) { fb[i] = lake && !wet ? (hash(x >> 1, y, 6103) < 0.25 ? W[2] : W[1]) : SHADE[c]; continue; } }
      // A ripple: a dash two or three long in a cell of four that slides east, each row at its own pace.
      const xs = x + Math.floor(t * (1.5 + (y % 3))), h = hash(xs >> 2, y, 6110 + n);
      if (h < 0.065 && (xs & 3) < 2 + (h * 1000 & 1) && frac(h * 211 + t * 0.3) < 0.55) fb[i] = lake ? (wet ? W[3] : W[2]) : LIGHT[c];
      else if (glint > 0 && hash(x, y, 6120 + beat) < (x < edge ? dull : glint) * 0.012 && vnoise(x / 13, y / 4, 6121 + n) > 0.62) fb[i] = WHITE;
    }
    // Rain rings: each drop lands in its own patch of the lake (RING_W by RING_H), a white dot that opens to
    // a pale pair two apart, then four apart, thinner and dimmer, and is gone in half a second.
    if (rk > 0.05) for (let gy = Math.floor(Math.max(l.y0, oy) / RING_H); gy * RING_H <= Math.min(l.y1, oy + VH - 1); gy++) for (let gx = Math.floor(Math.max(l.x0, ox) / RING_W); gx * RING_W <= Math.min(l.x1, ox + VW - 1, edge); gx++) {
      const id = gy * 311 + gx, age = t / 0.5 + hash(id, 1, 6150), c = Math.floor(age), q = age - c; if (hash(id, c, 6151) > rk * 0.55) continue;
      const x = gx * RING_W + Math.floor(hash(id, c, 6152) * RING_W), y = gy * RING_H + Math.floor(hash(id, c, 6153) * RING_H), r = q < 0.3 ? 0 : q < 0.65 ? 1 : 2; if (x + 2 >= edge) continue;
      for (const dx of r ? [-r, r] : [0]) { const X = x + dx, a = X - l.x0, b = y - l.y0, sx = X - ox, sy = y - oy;
        if (a < 0 || a >= w || b < 0 || y > l.y1 || !l.m[b * w + a] || sx < 0 || sy < 0 || sx >= VW || sy >= VH || (r === 2 && hash(X, c, 6154) < 0.4)) continue;
        const i = sy * VW + sx, v = fb[i]; WET.rings++; fb[i] = !r ? WHITE : lake ? (r === 1 ? W[4] : RAMP_OF[v] === 'water' ? W[3] : W[2]) : r === 1 ? LIGHT[LIGHT[v]] : LIGHT[v]; } }
    if (rk > 0.3) WET.fish = false;
    if (!fish || !l.spots.length || rk > 0.3) continue;
    // The fish: every 9 to 20 s it leaves the water at one of the lake's spots, arcs five pixels up and six
    // along, head first up and head first down, and drops back with a splash. A ring spreads from where it
    // left and another from where it landed: pale on dark water, dark where the water is pale with the
    // mountain's reflection. The fish is a trout, brown and gold with a flash of its side, to stand off the blue.
    const fe = 9 + 11 * hash(n, 2, 6130), tf = t + fe * hash(n, 3, 6130), fk = Math.floor(tf / fe), u = tf - fk * fe; if (u > 2.6) continue;
    const s = l.spots[Math.floor(hash(n, fk, 6131) * l.spots.length)], fx0 = s % l.w + l.x0, fy0 = (s / l.w | 0) + l.y0, dir = hash(n, fk, 6132) < 0.5 ? -1 : 1, AIR = 0.6, FAR = 6 * dir;
    const on = (x, y) => { const sx = x - ox, sy = y - oy; return sx >= 0 && sy >= 0 && sx < VW && sy < VH ? sy * VW + sx : -1; }, put = (x, y, c) => { const i = on(x, y); if (i >= 0) fb[i] = c; };
    const inWater = (x, y) => x >= l.x0 && x <= l.x1 && y >= l.y0 && y <= l.y1 && l.m[(y - l.y0) * l.w + x - l.x0];
    for (const [cx, u0] of [[fx0, 0.05], [fx0 + FAR, AIR]]) { const a = u - u0; if (a < 0 || a > 2) continue;
      for (const r of a > 0.6 ? [2 + 4.5 * a, 1 + 2.4 * a] : [2 + 4.5 * a]) { const ry = Math.max(1, 0.33 * r), N = Math.ceil(5 * r);
        for (let j = 0; j < N; j++) { const an = j / N * 6.2832, x = Math.round(cx + r * Math.cos(an)), y = Math.round(fy0 + ry * Math.sin(an)), i = inWater(x, y) && hash(x, y, 6133) > a / 2 ? on(x, y) : -1; if (i < 0) continue;
          const c = fb[i]; fb[i] = lake ? (RAMP_OF[c] === 'water' && STEP_OF[c] <= 2 ? (a < 0.7 ? WHITE : W[4]) : W[1]) : a < 0.7 ? WHITE : LIGHT[LIGHT[c]]; } } }
    if (u < AIR) { const q = u / AIR, x = fx0 + Math.round(FAR * q), y = fy0 - Math.round(5 * Math.sin(q * Math.PI)), tip = q < 0.4 ? -1 : q < 0.6 ? 0 : 1;
      put(x - 2 * dir, y - tip, R.wood[0]); put(x - dir, y - tip, R.wood[2]); put(x, y, R.dirt[3]); put(x + dir, y, R.shoe[2]); put(x + 2 * dir, y + tip, R.wood[1]);
      if (q < 0.3) { put(fx0, fy0, WHITE); put(fx0 - 1, fy0 - 1, WHITE); put(fx0 + 1, fy0 - 1, WHITE); } }
    else if (u < AIR + 0.25) { const x = fx0 + FAR; put(x, fy0, WHITE); put(x - 1, fy0 - 1, WHITE); put(x + 1, fy0 - 1, WHITE); put(x, fy0 - 2, WHITE); }
  }
}

export function makeWorld() {
  const W = buildTerrain(), { g: ground, spots, forestAmt } = W;
  const paths = {}; for (const k of ['lake', 'stack', 'spires']) paths[k] = makePath({ pts: W.trails[k], stops: [] });
  // The few steps from the junction to the register's east side, where he stands to fold its front down (L2).
  { const [rx, ry] = W.spots.register; paths.register = makePath({ pts: [[T.x, T.y], [(T.x + rx + 9) / 2, (T.y + ry + 1) / 2 + 1], [rx + 9, ry + 1]], stops: [] });
    // Its points with their depth, as the trails carry, so ground nearer than him still stands in front.
    W.lines.register = [...Array(9).keys()].map(k => { const p = paths.register.at(k / 8); return [p.x, p.y, W.vAt(p.x, p.y)]; }); }
  // The colours of open lake water, with the pale ones of the mountain's reflection in it.
  const LAKEC = new Uint8Array(256); for (const k of ['water', 'ice', 'snow', 'glac', 'far']) for (const c of R[k]) LAKEC[c] = 1;
  // Shafts of light slant through the forest, and give out where the mist takes over in the west.
  const shaftMask = new Uint8Array(WW * WH);
  for (let y = 300; y < WH; y++) for (let x = 0; x < 760; x++) {
    if (forestAmt(x, y) < 0.7) continue;
    shaftMask[y * WW + x] = 4;
    const band = frac((x * 0.55 + y) / 64);
    if (band < 0.15 && vnoise((x * 0.55 + y) / 64, (y - x * 0.4) / 40, 77) > 0.42 + smooth(430, 200, x) * 0.4) shaftMask[y * WW + x] = 4 | (band < 0.05 || band > 0.1 ? 1 : 2);
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
  // The alpenglow's colours, after pictures of it (R8-E2): at the tips the rock's lit steps go to orange and its shade
  // to dusky rose; below them, lit rock to peach, half-lit to rose and shade to dusky rose. All are colours with a
  // Dusk of their own (the lamp's orange, the snow's evening steps): a ramp without one goes dark at Dusk.
  const ALPEN = [[R.lamp[0], R.ochre[3], R.snow[1]], [R.snow[3], R.snow[2], R.snow[1]]].map(to => new Uint8Array(256).map((_, c) => { const r = c && R[RAMP_OF[c]]; if (!r || c === INK) return c; const f = STEP_OF[c] / Math.max(1, r.length - 1); return to[f > 0.5 ? 0 : f > 0.2 ? 1 : 2]; }));
  // The lenticular cloud (E3) over Mount Monolith's summit: its clock and its drawing are in events.js,
  // shared with the lake scene.
  const lenticular = (scr, ox, oy, t) => drawLens(scr, spots.summit[0], spots.summit[1], t, 1, ox, oy);
  // The serac fall (E4): every 40 to 50 seconds, the first about 15 seconds after the page opens (E5a), a block of ice breaks off one of the icefalls (spots.seracs),
  // tumbles down the slope under it with a puff of powder following and spreading, and a low rumble comes
  // a moment later, as sound would from that far off. Never twice running from the same place, and never
  // from a face of Mount Monolith that is still under snow (round 5, T11): each fall picks, as it starts,
  // among the spots on bare ice.
  // serac=<seconds> in the address starts the clock that far on, for screenshots.
  const SER = spots.seracs; let serAhead = typeof location !== 'undefined' ? +(/[?&]serac=([\d.]+)/.exec(location.search) || [])[1] || 0 : 0; const SLOT = 40;
  let serPick = { n: -1, k: -1 };
  const serAt = n => { if (serPick.n === n) return serPick.k; const ok = SER.map((_, k) => k).filter(k => serFace[k] < 0 || FACE[serFace[k]].cover <= 0.5), pool = ok.length > 1 ? ok.filter(k => k !== serPick.k) : ok;
    serPick = { n, k: pool.length ? pool[Math.floor(hash(n, 2, 4741) * pool.length)] : -1 }; return serPick.k; };
  let rumbled = -1;
  function seracFall(scr, ox, oy, t, env) {
    if (SER.length < 2) return;
    const T = t + serAhead + SLOT - 15, n = Math.floor(T / SLOT), a = T - n * SLOT - 10 * hash(n, 3, 4741); if (a < 0 || a > 4.5) return;
    const sk = serAt(n); if (sk < 0) return;
    const [sx, sy] = SER[sk], fall = 40, path = q => [sx + Math.round(2 * Math.sin(q * 5 + n)), sy + Math.round(fall * Math.pow(q, 1.6))];
    const on = sx - ox > -20 && sx - ox < scr.VW + 20 && sy - oy > -40 && sy - oy < scr.VH + 10;
    if (on && a > 0.9 && rumbled !== n) { rumbled = n; env.sfx('rumble'); }
    if (a > 0.2 && a < 3 && inView(scr, sx - ox, sy - oy)) saw('serac');
    const dot = (x, y, c) => { const vx = x - ox, vy = y - oy; if (vx >= 0 && vy >= 0 && vx < scr.VW && vy < scr.VH) scr.fb[vy * scr.VW + vx] = c; };
    // The puffs: one where each stretch of the fall was passed, growing and fading from when it was made.
    for (let k = 0; k < 5; k++) { const age = a - 0.3 - k * 0.25; if (age < 0) continue; const [px, py] = path(Math.min(1, k / 4)), r = 2 + 8 * Math.min(1, age / 3), al = smooth(4.2, 0.6, age);
      for (let dy = -Math.ceil(r); dy <= r * 0.6; dy++) for (let dx = -Math.ceil(r * 1.3); dx <= r * 1.3; dx++) { const d = Math.hypot(dx / 1.3, dy) / r; if (d > 1 || bayer(px + dx, py + dy - Math.round(age * 2)) >= al * (1.3 - d * d)) continue; dot(px + dx, py + dy - Math.round(age * 2), dy > r * 0.25 || d > 0.82 ? R.snow[1] : d < 0.5 ? R.white[1] : R.snow[3]); } }
    // The block itself, until it is lost in its own powder.
    if (a < 1.4) { const [bx, by] = path(a / 1.4); for (let i = -2; i <= 1; i++) { dot(bx + i, by - 1, R.white[1]); dot(bx + i, by, R.serac[i < 1 ? 2 : 1]); dot(bx + i, by + 1, R.serac[0]); } }
  }
  // The avalanches (E5c; on every icefall since round 5, T11). Each of Mount Monolith's icefalls begins a
  // visit under a cover of snow. About 40 s in, and then every 60 to 120 s (and whenever a debug button
  // says), one of the faces still under snow, picked at random, warns: a crack across the top, a creep of a
  // pixel or two, a few bits trickling off its foot, a breath, and then it goes: the slab breaks and slides,
  // a cloud of powder pours down the glacier and billows, a deep rumble, a fan of debris at the glacier's
  // foot that fades over a minute. Never two at once. The blue seracs a slide leaves can fall like any
  // other icefall's; a face still under snow drops none.
  // The summit squall (round 5, T20) puts the snow back. It comes only when every face is bare, 60 to 120 s
  // after the last one slid: a bank of cloud builds on the summit and hides it, snow falls from it over the
  // upper mountain for about 15 s, the bare faces whiten under the falling snow from their tops down, and
  // the cloud thins and lifts off east with a banner of spindrift streaming from the summit. Then every face
  // is under snow and the round starts over. (Round 4 built the snow up a little at a time from plumes off
  // the summit; TJ: "The way the snow just accumulates on it again looks a bit strange.")
  // It all lives as long as the page does, through scene changes; a reload starts every face covered.
  const AVS = (W.avalanche || []).map((A, f) => { const n = A.at.length, AX = new Int16Array(n), AY = new Int16Array(n), thr = new Float32Array(n);
    for (let j = 0; j < n; j++) { AX[j] = A.at[j] % WW; AY[j] = (A.at[j] / WW) | 0; thr[j] = Math.min(0.999, 0.55 * hash(AX[j], AY[j], 4790) + 0.44 * A.q[j] / 255); }
    return { ...A, f, AX, AY, thr, set: new Set(A.at) }; });
  // Each face: 'covered', 'falling' (from its warning until its debris has faded) or 'bare'.
  const FACE = AVS.map(() => ({ phase: 'covered', start: 0, cover: 1, gone: false }));
  const AVA = { next: 40, count: 0, last: 0, squall: -1, squallAt: -1 };
  const AV_RELEASE = 4.2, AV_LONG = 75, AV_GAP = [60, 120];
  // The squall, in seconds from its start: the cloud has built by build, the faces whiten over white, the
  // snow stops and the cloud starts to clear at clear, and all is over at end.
  const SQ = { build: 6, white: [10, 21], clear: 21, end: 30 };
  // A face with no snow on it, or with its slab already gone.
  const bareNow = F => F.phase === 'bare' || (F.phase === 'falling' && F.gone);
  const snowyFaces = () => FACE.map((F, f) => F.phase === 'covered' ? f : -1).filter(f => f >= 0);
  // What the lake scene shows of the same mountain (monolith.js): an icefall is under snow there while its
  // face here is more than half covered. An icefall that is no face on the map stays bare, as it is painted.
  const tellLake = () => { const on = faceSnow.on.map((_, k) => { const f = AVS.findIndex(A => A.k === k); return f >= 0 && FACE[f].cover > 0.5; }); if (on.some((v, k) => v !== faceSnow.on[k])) { faceSnow.on = on; faceSnow.rev++; } };
  tellLake();
  const slide = (f, t) => { const F = FACE[f]; F.phase = 'falling'; F.start = t; F.gone = false; F.cover = 1; AVA.count++; AVA.last = t; AVA.next = t + lerp(AV_GAP[0], AV_GAP[1], hash(AVA.count, 6, 4792)); };
  // Which face a serac's spot is on (-1: none of Monolith's, so the Spires' icefall, which is always bare).
  const serFace = SER.map(([x, y]) => AVS.findIndex(A => [0, 1, 2, 3].some(d => A.set.has((y + d) * WW + x))));
  function startSquall(t, env, ox, oy, VW, VH) { AVA.squall = t; const [sx, sy] = spots.summit; if (env && sx - ox > -60 && sx - ox < VW + 60 && sy - oy > -80 && sy - oy < VH) env.sfx('wind'); }
  function avalancheStep(t, env, ox, oy, VW, VH) {
    if (!AVS.length) return;
    if (t >= AVA.next) { const snowy = snowyFaces(); if (snowy.length) slide(snowy[Math.floor(hash(AVA.count, 5, 4792) * snowy.length)], t); }
    FACE.forEach((F, f) => { if (F.phase !== 'falling') return; const a = t - F.start, A = AVS[f];
      if (a >= AV_RELEASE && A.cx - ox > 8 && A.cx - ox < VW - 8 && A.y0 - oy > 0 && A.y0 - oy < VH - 8) saw('avalanche');
      if (a >= AV_RELEASE && !F.gone) { F.gone = true; F.cover = 0; if (A.cx - ox > -40 && A.cx - ox < VW + 40 && A.y0 - oy > -60 && A.y0 - oy < VH) env.sfx('avalanche'); }
      if (a > AV_LONG) F.phase = 'bare'; });
    // Every face bare: the squall is due 60 to 120 s after the last slide began.
    if (AVA.squall < 0) { if (!FACE.every(bareNow)) AVA.squallAt = -1; else { if (AVA.squallAt < 0) AVA.squallAt = AVA.last + lerp(AV_GAP[0], AV_GAP[1], hash(AVA.count, 9, 4792)); if (t >= AVA.squallAt) startSquall(t, env, ox, oy, VW, VH); } }
    if (AVA.squall >= 0) { const q = t - AVA.squall, w = smooth(SQ.white[0], SQ.white[1], q);
      // Every face that is not under snow whitens together, and is a covered face again once it is white.
      for (const F of FACE) if (F.phase !== 'covered' && (F.phase !== 'falling' || F.gone)) { F.cover = Math.max(F.cover, w); if (w >= 1) { F.cover = 1; F.phase = 'covered'; } }
      if (q >= SQ.end) { AVA.squall = -1; AVA.squallAt = -1; AVA.next = t + lerp(AV_GAP[0], AV_GAP[1], hash(AVA.count, 7, 4792)); } }
    tellLake();
  }
  function avalancheCover(fb, VW, VH, ox, oy, t) {
    AVS.forEach((A, f) => { const F = FACE[f]; if (F.cover <= 0 || A.x1 < ox || A.x0 > ox + VW || A.y1 + 4 < oy || A.y0 > oy + VH) return;
      let crack = 0, creep = 0;
      // (A face whose slab has gone has cover again only once the squall is whitening it.)
      if (F.phase === 'falling' && !F.gone) { const a = t - F.start; crack = smooth(0, 1.4, a); creep = a < 1.6 ? 0 : a < 2.2 ? 1 : 2; }
      coverPass(fb, VW, VH, ox, oy, A, F.cover, crack, creep, R.serac[0]); });
  }
  // One face's slide, a seconds after its warning began.
  function slideFx(scr, ox, oy, A, a) {
    const { fb, VW, VH } = scr, w = A.x1 - A.x0, [fx, fy] = A.foot, mx = (A.top[0] + A.low[0]) / 2, my = (A.top[1] + A.low[1]) / 2, sd = 4800 + 20 * A.f;
    // A few bits of snow trickle off the slab's foot before it goes.
    if (a > 2.4 && a < AV_RELEASE + 0.3) for (let k = 0; k < 6; k++) { const s = (a - 2.4 - k * 0.27); if (s < 0 || s > 0.9) continue; const o = (hash(k, 1, sd + 2) - 0.5) * w * 0.7, x = Math.round(A.low[0] + o + A.ux * s * s * 30) - ox, y = Math.round(A.low[1] + 2 + A.uy * s * s * 30) - oy; if (x >= 0 && y >= 0 && x < VW && y < VH) fb[y * VW + x] = R.white[1]; }
    if (a < AV_RELEASE) return; const b = a - AV_RELEASE;
    if (b < 3) slabPass(fb, VW, VH, ox, oy, A, b);
    // The powder: puffs thrown off along the way down, each growing, rising and thinning.
    for (let k = 0; k < 34; k++) { const te = k * 0.13, age = b - te; if (age < 0) continue; const u = k / 33, h = hash(k, 3, sd + 3), grow = Math.min(1, age / 2.5), v = Math.pow(u, 1.1);
      const r = (4 + 17 * Math.sqrt(grow)) * (0.7 + 0.6 * h) * (0.8 + 0.5 * u), al = smooth(18, 4, age) * 0.97, side = (h - 0.5) * w * (1.1 - 0.3 * u) * (1 + 0.5 * grow);
      if (al > 0.02) puffAt(fb, VW, VH, ox, oy, lerp(mx, fx, v) + side * A.uy, lerp(my, fy, v) - side * A.ux - age * 2, r, al, 1.35); }
    // The debris: a fan of snow at the foot of the glacier, fading over a minute.
    const den = smooth(5, 9, b) * smooth(70, 35, b);
    if (den > 0.01) for (let dy = -2; dy <= 8; dy++) for (let dx = -Math.round(w * 0.45); dx <= w * 0.45; dx++) { const e = (dx / (w * 0.45)) ** 2 + ((dy + 2) / 10) ** 2; if (e > 1) continue; const x = fx + dx - ox, y = fy + dy - oy; if (x < 0 || y < 0 || x >= VW || y >= VH || bayer(fx + dx, fy + dy) >= den * (1.1 - e)) continue; fb[y * VW + x] = hash(fx + dx, fy + dy, sd + 4) < 0.5 ? R.white[1] : R.snow[3]; }
  }
  function avalancheFx(scr, ox, oy, t) {
    if (!AVS.length) return;
    const { fb, VW, VH } = scr;
    FACE.forEach((F, f) => { if (F.phase === 'falling') slideFx(scr, ox, oy, AVS[f], t - F.start); });
    if (AVA.squall < 0) return;
    const q = t - AVA.squall, [sx, sy] = spots.summit, grow = smooth(0, SQ.build, q), fade = smooth(SQ.end, SQ.clear, q), den = smooth(SQ.build - 3, SQ.build + 2, q) * smooth(SQ.clear + 2, SQ.clear - 3, q);
    // The snow falling under the cloud, from its base down past the foot of the lowest face.
    if (den > 0.02) { const y0 = sy + 4, ry = Math.max(...AVS.map(A => A.y1)) + 30 - y0; squallVeil(fb, VW, VH, ox, oy, sx, y0, 150, ry, den, t); squallFlakes(fb, VW, VH, ox, oy, FLAKE, sx, y0, 150, ry, den, t); }
    // The cloud: a bank that builds on the summit and hides it down to the dome's shoulders, heavier under
    // than a fair-weather cloud and slowly churning. As it clears it thins, lifts and moves off east.
    if (grow * fade > 0.02) { const off = 1 - fade, wide = 0.4 + 0.6 * grow, big = 0.55 + 0.45 * grow, al = grow * fade;
      // Its base, low on the dome's shoulders, then its bright top over the summit.
      for (let k = 0; k < 12; k++) { const u = k / 11 * 2 - 1, h = hash(k, 1, 4812); puffAt(fb, VW, VH, ox, oy, sx + u * 122 * wide + 5 * Math.sin(t * 0.45 + k * 1.7) + off * 34, sy + 12 + 20 * u * u + (h - 0.5) * 8 - off * 18, (13 + 9 * (1 - u * u) + 4 * h) * big, al * (0.85 + 0.15 * (1 - Math.abs(u))), 1.9, true); }
      for (let k = 0; k < 9; k++) { const u = k / 8 * 2 - 1, h = hash(k, 2, 4812); puffAt(fb, VW, VH, ox, oy, sx + u * 88 * wide + 4 * Math.sin(t * 0.6 + k * 2.3) + off * 40, sy - 5 + 11 * u * u + (h - 0.5) * 8 - off * 22, (12 + 10 * (1 - u * u) + 3 * h) * big, al * (0.85 + 0.15 * (1 - Math.abs(u))), 1.9); } }
    // As it clears, spindrift is torn off the summit by the wind and streams east against the sky as a banner.
    const p = q - SQ.clear + 2; if (p > 0) { const head = Math.min(1, p / 4), al = smooth(0, 1.2, p) * smooth(SQ.end - SQ.clear + 2, SQ.end - SQ.clear - 1, p);
      for (let k = 0; k <= 20; k++) { const u = k / 20; if (u > head) break; puffAt(fb, VW, VH, ox, oy, sx + 6 + 120 * u + p * 3, sy - 4 + 14 * u * u + 2 * Math.sin(u * 9 + p), 2 + 6 * u, al * (0.9 - 0.45 * u), 2.4); } }
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
  // A snowflake's colour over each colour (the summit squall): grey-blue over light ones, white over dark ones.
  const FLAKE = new Uint8Array(256).map((_, c) => { const p = DAY[c] || [0, 0, 0]; return 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2] > 170 ? R.snow[1] : R.white[1]; });
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
  // fairOff: how far the debug panel has moved the first of them on, to bring its shadow over a spot (E1).
  let fairOff = 0;
  const fairX = (k, t) => ((k * 310 + t * (5 + k * 1.3) + (k ? 0 : fairOff)) % (WW + 300)) - 150;
  let lastHere = { x: T.x, y: T.y };
  // Where each side scene's country is on the map, for the weather over it (sky): the lake's west shore, and
  // the ends of the peak's trail and of the Spires'.
  const PLACE = { lake: [lx0, (ly0 + ly1) >> 1], peak: W.trails.stack[W.trails.stack.length - 1], spires: W.trails.spires[W.trails.spires.length - 1] };
  const things = [];
  for (const th of W.things) things.push(th.tree ? { kind: 'tree', t: th, x: th.x, y: th.y } : th);
  const put = (bm, x, y, extra = {}) => things.push({ bm, x: Math.round(x), y: Math.round(y), ...extra });
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
  // The lakes for stillWater. A fish rises only in clear water (not in glacial silt), at a spot with water
  // six pixels either side and two above and below, so its arc and its rings stay on the lake.
  const STILL = W.still.map(l => { const { x, y } = xy(l.px), x0 = Math.min(...x), x1 = Math.max(...x), y0 = Math.min(...y), y1 = Math.max(...y), w = x1 - x0 + 1, m = new Uint8Array(w * (y1 - y0 + 1)), spots = [];
    for (let k = 0; k < x.length; k++) m[(y[k] - y0) * w + x[k] - x0] = 1;
    const wet = (a, b) => a >= 0 && b >= 0 && a < w && b <= y1 - y0 && m[b * w + a];
    if (l.kind === 'lake' || l.kind === 'tarn' || l.kind === 'pond') for (let k = 0; k < x.length; k++) { const a = x[k] - x0, b = y[k] - y0; if (wet(a - 6, b) && wet(a + 6, b) && wet(a, b - 2) && wet(a, b + 2) && wet(a - 3, b - 1) && wet(a + 3, b + 1)) spots.push(b * w + a); }
    return { kind: l.kind, x, y, x0, x1, y0, y1, w, m, spots }; });
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
      const dim = hash(k, Math.floor(t * 1.3), 4901) < 0.12; scr.set(sx, sy + 1, INK); scr.set(sx, sy + 2, INK); scr.set(sx, sy, dim ? R.lamp[0] : R.lamp[1]); if (fade > 0.8 && inView(scr, sx, sy)) saw('headlamps'); if (!dim) { const [ax, ay] = lampAt(Math.min(TRK.L, d + 3)); scr.set(Math.round(ax) - ox, Math.round(ay) - 2 - oy, R.lamp[0]); } }
  }
  // The animals look after themselves: see critters.js. Where each one lives comes from land.js.
  const crit = makeCritters(W); window.__crit = crit;
  let pokeAt = [0, 0];   // where the last animal under the pointer was, so a click on it knows which way to flee
  // For the browser suite: every engine rule the map breaks (rules.js).
  window.__rules = () => checkRules(W.things, crit.items, crit.collide);
  const ev = makeEvents(W, crit.collide), life = makeLife(W, STILL); window.__life = life; window.__wet = Object.assign(WET, window.__wet);
  // Where the beach's driftwood gathers and where its logs lie (H7), for the checks.
  window.__jams = { spots: W.jams, logs: W.things.filter(th => th.bm && th.bm.what === 'drift').map(th => [th.x, th.y]) };
  for (const it of crit.items) things.push(it);
  const birds = [speck(0), speck(1)];
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
  // The Peak's trail leaves the map where it comes up the step into Postmortem Burn (round 8, C2), a quarter
  // of its climb done: the larch basin's scene begins in the burn.
  const stackIn = (() => { const P = paths.stack, h = q => { const a = P.at(q); return -(W.vAt(a.x, a.y) + a.y); }, h0 = h(0), h1 = h(1); for (let q = 0; q < 1; q += 0.002) if (h(q) - h0 >= 0.25 * (h1 - h0)) return q; return 0.6; })();
  const lakeOut = (() => { const P = paths.lake; let best = 0, bd = 1e9; for (let q = 0.5; q < 1; q += 0.002) { const a = P.at(q), d = Math.hypot(a.x - spots.lakeShore[0], a.y - spots.lakeShore[1]); if (d < bd) { bd = d; best = q; } } return best; })();
  // Between the two the map is not shown: the forest scene stands for the trail from lakeIn to the lake's outlet
  // (lakeMid: where the trail comes nearest the lake's west end) and the lakeshore scene for the rest (round 5, F5).
  const lakeMid = (() => { const P = paths.lake; let best = lakeIn, bd = 1e9; for (let q = lakeIn; q < lakeOut; q += 0.002) { const a = P.at(q), d = Math.hypot(a.x - spots.lakeWest[0], a.y - spots.lakeWest[1]); if (d < bd) { bd = d; best = q; } } return best; })();

  // Where each place's name is pinned: over the junction, a little to his left so it clears the register's box
  // beside the board (round 5 B2), on the lake's near shore, on the wall's rim, on the ice under the summits.
  const PLACES = [{ id: 'trailhead', x: T.x - 12, y: T.y - 31 }, ...['lake', 'stack', 'spires'].map(id => ({ id, x: spots.places[id][0], y: spots.places[id][1] }))];
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
  // It starts after 2 minutes with no input at all (T2, round 5): an idle animation, never part of the opening.
  // Any key, click, tap, wheel or drag stops it, and the camera eases back to him. tour=<seconds> in the
  // address starts it sooner, for screenshots.
  const ROUND = { hold: 5, go: 3.5 }, TOUR = (typeof location !== 'undefined' && +(/[?&]tour=([\d.]+)/.exec(location.search) || [])[1]) || 120;
  const lookRound = (scr, t, hx, hy) => {
    const { VW, VH } = scr, stops = [[hx, hy]];
    for (let k = 1; k <= 3; k++) { const b = W.destBox[k], p = PLACES[k], cx = scr.narrow ? p.x : (b.x0 + b.x1) / 2 - VW * 0.1, cy = scr.narrow ? p.y + VH / 2 - 0.4 * (VH - openCover) : p.y + VH * 0.06; if (p.x - hx < -VW / 2 + 40 || p.x - hx > VW / 2 - 40 || p.y - hy < -VH / 2 + 20 || p.y - hy > VH / 2 - 60) stops.push([cx, cy]); }
    if (stops.length < 2) return [hx, hy];
    const leg = ROUND.hold + ROUND.go, n = stops.length, i = Math.floor(t / leg) % n, u = smooth(ROUND.hold, leg, t % leg), a = stops[i], b = stops[(i + 1) % n];
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  };
  // The page never opens on a pan (T1). A new view size (the first frame, the canvas growing once the fonts
  // are in, a turned phone) puts the camera straight at its rest, and so does the sign settling in during the
  // first 3 seconds or while the web fonts are still loading (it is taller until its font loads). Later changes,
  // such as closing the sign, still ease. sized, seenKey: what the camera last settled for; born: its first frame.
  let past = 0, nowT = 0, sized = '', seenKey = null, born = null;
  // walkTo: a leg that is walked over that part of its time and then stood still (the register, L2).
  const where = (leg, q) => { if (leg.walkTo) q = Math.min(1, q / leg.walkTo); const P = paths[leg.path], a = P.at(lerp(leg.from, leg.to, q)), s = leg.to < leg.from ? -1 : 1; return { x: a.x, y: a.y, dx: a.dx * s, dy: a.dy * s, P }; };
  // Which way he faces (T37): from where the trail takes him over the next 32 pixels (and the 8 behind), not
  // the step under his feet, since a trail drawn on a diagonal steps sideways and up in turn, and the zigzag
  // up a cliff is one climb. Then with some give: he turns to
  // walk up or down the screen only when the way ahead is nearly upright, back to his side only when it
  // leans clearly sideways, and to his other side only when it leans clearly the other way. In between he
  // keeps the way he faced.
  function face(leg, q) {
    if (leg.walkTo) q = Math.min(1, q / leg.walkTo);
    const P = paths[leg.path], s = leg.to < leg.from ? -1 : 1, u = lerp(leg.from, leg.to, q), a = P.at(clamp(u - s * 8 / P.len, 0, 1)), b = P.at(clamp(u + s * 32 / P.len, 0, 1));
    let dx = b.x - a.x, dy = b.y - a.y; const n = Math.hypot(dx, dy);
    if (n < 3) return;
    dx /= n; dy /= n;
    if (facing === 'side') {
      if (Math.abs(dx) < 0.3) facing = dy < 0 ? 'up' : 'down';
      else if ((dx < 0) !== flip && Math.abs(dx) > 0.55) flip = dx < 0;
    } else if (Math.abs(dx) > 0.6) { facing = 'side'; flip = dx < 0; }
    else if (Math.abs(dx) < 0.3) facing = dy < 0 ? 'up' : 'down';
  }
  const target = (scr, here, env) => {
    // env.lead: the hand-off from the opening frame to following him, eased over 2 seconds in pixel.js (F6).
    const v = vista(scr), k = !env || env.lead === undefined ? smooth(0, 60, Math.hypot(here.x - T.x, here.y - T.y)) : env.lead;
    return [lerp(v.x, here.x, k), lerp(v.y, here.y - 24, k)];
  };

  // The roam areas' colours, one per kind, none of them a colour of the ground (T32).
  const ROAM_C = { elk: R.yellow[1], moose: R.lupine[2], goat: R.white[1], sheep: R.lamp[0], bear: R.pink[2], marmot: R.sky[4] || R.white[0], squirrel: R.red[1], gulls: R.jay[3], birds: R.aurora[2] };
  function roamArea(scr, a, ox, oy) {
    const c = ROAM_C[a.kind] || R.white[1], cx = a.x - ox, cy = a.y - oy, x0 = Math.floor(cx - a.rx - 2), x1 = Math.ceil(cx + a.rx + 2), y0 = Math.floor(cy - a.ry - 2), y1 = Math.ceil(cy + a.ry + 2);
    if (x1 < 0 || y1 < 0 || x0 >= scr.VW || y0 >= scr.VH) return;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const q = Math.hypot((x - cx) / a.rx, (y - cy) / a.ry), edge = (1 - q) * Math.min(a.rx, a.ry);
      if (edge < -2 || edge > 1.2 && ((x + y) & 3)) continue;
      scr.set(x, y, edge < 0 ? c : edge < 1.2 ? INK : c);
    }
    tinyText(scr, Math.round(cx), Math.round(cy - a.ry - 9), (UI.debug.animals[a.kind] || a.kind).toUpperCase(), c);
  }
  // The spawn menu (C4): each map animal with its homes, each named after the nearest place the map names
  // (a joke sign within 160 pixels, else the nearest of the four places, as "near ..." or "east of ...").
  const placeName = (x, y) => {
    let best = null, bd = 160; for (const [sx, sy, id] of spots.signs) { const d = Math.hypot(sx - x, sy - y); if (d < bd && SIGNS[id]) { bd = d; best = SIGNS[id].split(',')[0]; } }
    if (best) return best;
    let pd = 1e9, at = null; for (const p of PLACES) { const d = Math.hypot(p.x - x, p.y - y); if (d < pd) { pd = d; at = p; } }
    const dx = x - at.x, dy = y - at.y, way = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north');
    return (pd < 150 ? UI.debug.near : way + ' of') + (at.id === 'trailhead' ? ' the ' : ' ') + DEST_NAMES[at.id];
  };
  // A name that comes up twice in one animal's list gets a number, so every choice reads differently.
  const spawnList = () => crit.homes().map(({ kind, homes }) => { const names = homes.map(([x, y]) => placeName(x, y)), seen = {};
    return { kind, name: UI.debug.animals[kind] || kind, homes: names.map(n => names.filter(m => m === n).length > 1 ? n + ' ' + (seen[n] = (seen[n] || 0) + 1) : n) }; });

  return {
    name: 'world', paths, spawnList, spawn: (kind, i) => { const ok = crit.spawn(kind, i); for (const it of crit.items) if (!things.includes(it)) { things.push(it); still = null; } return ok; }, lakeIn, lakeMid, lakeOut, spiresIn, stackIn, T, WW, WH,
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
    // Which way he faces, for the test scripts (B8): 'side-l', 'side-r', 'up' or 'down'.
    pose: () => facing === 'side' ? (flip ? 'side-l' : 'side-r') : facing,
    // The four places he can be sent to, for the page to pin a name on. The page keeps a name on screen
    // when its place is out of view.
    // A place's tag rises and brightens with it when it lifts (E5j): lift is how far up it is, 0 to 1.
    labels() { return PLACES.map(d => { const k = W.DEST.indexOf(d.id), l = k > 0 ? lifted[k] : 0; return { id: 'go:' + d.id, name: DEST_NAMES[d.id], x: d.x - last.ox, y: d.y - last.oy - 2 * l, lift: l }; }); },
    // What is under a point of the screen: a sign with a name, the kiosk, a cat.
    pick(sx, sy) {
      const wx = sx + last.ox, wy = sy + last.oy;
      for (const s of spots.signs) if (Math.abs(wx - s[0]) < 8 && wy > s[1] - 17 && wy < s[1] + 3) return { label: SIGNS[s[2]], x: s[0] - last.ox, y: s[1] - 18 - last.oy };
      const c = kit.pick(wx, wy); if (c) return { label: c.label, x: c.wx - last.ox, y: c.wy - last.oy, act: c.act };
      // Every animal on the map answers a click (round 6, note 10); critters.js says which is under the point.
      { const a = crit.pick(wx, wy, last.ox, last.oy); if (a) { pokeAt = [wx, wy]; return { label: a.label, x: a.wx - last.ox, y: a.wy - last.oy, act: a.act }; } }
      if (spots.lookout) { const [lx, ly] = spots.lookout; if (Math.abs(wx - lx) < 9 && wy > ly - 30 && wy < ly + 2) return { label: NAMES.lookout, x: lx - last.ox, y: ly - 31 - last.oy }; }
      // The register's box and the conditions board beside it are one thing to click (round 8, F1; TJ's note 6):
      // one box round the pair and the gap between them, one name tag over its middle in the register's own
      // words. It opens the register's scene, where the notebook, the conditions and the map open from.
      { const [rx, ry] = spots.register, [kx, ky] = spots.kiosk, x0 = Math.min(rx - 6, kx - 14), x1 = Math.max(rx + 6, kx + 14), y0 = Math.min(ry - 21, ky - 27), y1 = Math.max(ry + 2, ky + 3);
        if (wx > x0 && wx < x1 && wy > y0 && wy < y1) return { label: NAMES.register, x: Math.round((x0 + x1) / 2) - last.ox, y: y0 - last.oy, act: 'register' }; }
      // The tide pool to find (E7), only while the low water has left it.
      { const p = crit.findPool(nowT); if (p && Math.abs(wx - p.x) <= p.rx + 3 && Math.abs(wy - p.y) <= p.ry + 3) return { label: NAMES.tidepool, x: p.x - last.ox, y: p.y - p.ry - 5 - last.oy, act: 'pool' }; }
      { const k = destUnder(wx, wy); if (k) return { label: DEST_NAMES[W.DEST[k]], named: true, x: sx, y: sy, act: 'dest:' + W.DEST[k] }; }
      return null;
    },
    // Where a map event happens (round 6, note 26): the face or the serac that falls, the summit, the edge of
    // the marine layer, or what the animals and the timed events say. And how far to look from where the
    // camera rests to put a point of the map in the middle of the view.
    where(name) {
      if (/^ava\d$/.test(name)) { const A = AVS[+name[3]]; return A ? [A.AX[A.AX.length >> 1], A.AY[A.AY.length >> 1]] : null; }
      if (name === 'avalanche') return AVS.length ? [AVS[AVS.length >> 1].AX[AVS[AVS.length >> 1].AX.length >> 1], AVS[AVS.length >> 1].AY[AVS[AVS.length >> 1].AY.length >> 1]] : null;
      if (name === 'serac') return SER.length ? [SER[0][0], SER[0][1]] : null;
      if (name === 'squall' || name === 'lens') return spots.summit || null;
      if (name === 'shower') return [lx0 - 50, (ly0 + ly1) >> 1];
      return crit.where(name) || ev.where(name) || life.where(name);
    },
    // The weather at a moment, for the side scenes. The marine layer (the forest's rain and fog, note 13), and
    // for the other scenes (round 8, E1) what else the map's sky is doing: snow, while the squall is over the
    // volcano; banner, the spindrift as it clears; the map's gusts and the shadows of its fair-weather
    // clouds over a place ('lake', 'peak' or 'spires'). gust answers as gustOver does; shade answers how far
    // a shadow has crossed the place, from 1 (coming in from the west) to -1 (gone east), or null.
    sky: t => { const w = weather(t), q = AVA.squall >= 0 ? t - AVA.squall : -1;
      w.snow = q < 0 ? 0 : smooth(SQ.build - 3, SQ.build + 2, q) * smooth(SQ.clear + 2, SQ.clear - 3, q);
      w.banner = q < 0 ? 0 : smooth(SQ.clear - 4, SQ.clear + 1, q) * smooth(SQ.end, SQ.end - 4, q);
      w.gust = place => gustOver(PLACE[place][0], PLACE[place][1], t);
      w.shade = place => { for (let k = 0; k < 4; k++) { const u = (PLACE[place][0] - fairX(k, t) - 8) / (FAIR[k].cw * 2.2); if (u > -1 && u < 1) return u; } return null; };
      return w; },
    lookFor: (x, y) => [x - cam.x, y - cam.y],
    // The debug panel's start buttons (E5f): each moves its event's clock so the event begins now.
    // The weather's own buttons work in every scene (round 8, E1; TJ: the weather is managed from the debug
    // panel). place: the side scene's country ('lake', 'peak' or 'spires'); on the map, where he stands.
    trigger(name, t, place) {
      const spot = PLACE[place] || [lastHere.x, lastHere.y];
      // A gust that reaches the spot now; the first fair-weather cloud, moved to just west of it so that its
      // shadow comes over; and a clear sky: the marine layer gone and the squall over.
      if (name === 'gustnow') { askGust(spot[0], spot[1], t); return true; }
      if (name === 'shade') { const span = WW + 300, want = spot[0] - 8 - FAIR[0].cw * 1.4 + 150; fairOff = ((want - t * 5) % span + span) % span; return true; }
      if (name === 'clear') { const s = weather(t).s; if (s < RAIN.gone) rainAhead += RAIN.gone + 1 - s; if (AVA.squall >= 0) AVA.squall = t - SQ.end; return true; }
      if (name === 'shower') { const n = Math.floor((t + rainAhead + RAIN.cycle - 10) / RAIN.cycle) + 1; rainAhead = n * RAIN.cycle - t - RAIN.cycle + 10; return true; }
      // An avalanche now: on a face still under snow, picked at random (any face, covered again first, if none
      // is), or on the face asked for (ava0 is the westernmost).
      if (name === 'avalanche' || /^ava\d$/.test(name)) { let f = name === 'avalanche' ? -1 : +name[3]; if (!AVS.length || f >= AVS.length) return false;
        if (f < 0) { const snowy = snowyFaces(), pool = snowy.length ? snowy : AVS.map((_, k) => k); f = pool[Math.floor(hash(Math.floor(t * 10), 8, 4792) * pool.length)]; }
        AVA.squall = -1; slide(f, t); return true; }
      // The summit squall now: it puts the snow back on every bare face.
      if (name === 'squall') { if (!AVS.length) return false; startSquall(t); return true; }
      if (name === 'serac') { if (SER.length < 2) return false; const n = Math.floor((t + serAhead + SLOT - 15) / SLOT) + 1; serAhead = n * SLOT + 10 * hash(n, 3, 4741) - t - SLOT + 15; return true; }
      if (name === 'lens') return startLens(t);
      return ev.trigger(name, t) || crit.trigger(name, t) || life.trigger(name, t);
    },
    act(id, env) { if (id === 'pool') { env.found('tidepool'); return false; } if (id.startsWith('dest:')) { const k = W.DEST.indexOf(id.slice(5)); if (lifted[k] > 0.5) return false; tapped = k; tapUntil = env.t + 3; return true; } if (/^(animal|orca|jelly|flock|air):|^whale$/.test(id)) { const snd = crit.click(id, pokeAt[0], pokeAt[1], env.t); if (snd) env.sfx(snd); return true; } return id.startsWith('cat:') ? kit.click(id.slice(4), env) : false; },
    draw(scr, env, leg, q) {
      const { VW, VH, fb } = scr, { t, tq, dt } = env; nowT = t;
      regTrip = leg.path === 'register';
      const here = where(leg, q); lastHere = here;
      if (env.moving) face(leg, q);
      if (env.home) facing = 'down';

      // Camera: the whole view from the Trailhead, then follow him.
      let [tx, ty] = target(scr, here, env);
      env.touring = env.home && env.idle > TOUR && !env.calm && Math.abs(env.look.x) + Math.abs(env.look.y) < 1;
      if (env.touring) [tx, ty] = lookRound(scr, env.idle - TOUR, tx, ty);
      if (born === null) born = t;
      const size = VW + 'x' + VH + (scr.narrow ? 'n' : ''), jump = env.home && (size !== sized || ((t - born < 3 || (document.fonts && document.fonts.status === 'loading')) && openKey !== seenKey)); sized = size; seenKey = openKey;
      const damp = env.calm || jump ? 1 : 1 - Math.exp(-dt * 3.2);
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
      past += ((scr.narrow && env.home ? VH * 0.34 : 0) - past) * (env.fixed ? 0 : jump ? 1 : Math.min(1, dt * 4));
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
      avalancheStep(t, env, ox, oy, VW, VH);
      avalancheCover(fb, VW, VH, ox, oy, t);
      crit.weather(Math.max(sky.fog, sky.deck * 0.8), (x, y) => fogIn(x, y, sky));
      // The alpenglow (round 8, E2): for a while at Dusk the Spires' last light reaches three times as far down
      // the towers and turns warm, orange at the tips and rose below, where the usual glow is the snow's cool pink.
      const glow = life.alpenglow(t), calm = life.calm(t); if (calm > 0.8 && life.lake && inView(scr, (life.lake.x0 + life.lake.x1) / 2 - ox, (life.lake.y0 + life.lake.y1) / 2 - oy, 0)) saw('calm');
      if (glow > 0.5 && tipTop[1].some((y, x) => y >= 0 && inView(scr, x - ox, y - oy + 20, 0))) saw('alpenglow');
      if (env.mix > 0.02) for (let n = 0; n < 2; n++) { const top = tipTop[n], warm = n ? glow : 0, H = Math.round(TIP_H[n] * (1 + 2.2 * warm)), k = 6 + n;
        for (let x = Math.max(0, ox); x < Math.min(WW, ox + VW); x++) { const y0 = top[x]; if (y0 < 0) continue;
          for (let y = Math.max(y0, oy); y < Math.min(y0 + H, oy + VH, WH); y++) { if (W.dest[y * WW + x] !== k) continue; const d = (y - y0) / H; if (bayer(x, y) < env.mix * Math.pow(1 - d, 0.8)) { const i = (y - oy) * VW + (x - ox); fb[i] = warm > 0 && bayer(x + 2, y + 1) < warm ? ALPEN[d < 0.3 ? 0 : 1][fb[i]] : GLOW[fb[i]]; } } } }
      crit.sea(scr, ox, oy, t); if (WWP) whiteWater(fb, VW, VH, ox, oy, WWP, WWF, t); stillWater(fb, VW, VH, ox, oy, STILL, t, 1 - 0.8 * env.mix, DEBUG.animals, life.lake, calm, DEBUG.clouds && sky.rain > 0.05 ? { k: sky.rain, front: y => frontAt(y, sky), light: life.lake } : null); life.ice(scr, ox, oy, t); crit.falls(scr, ox, oy, t);
      crit.update(dt, t, env.hideMe ? null : here, env.hour);
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
      { const fh = crit.ferryHull(t, ox, oy, VW, VH); if (fh) { mov.push({ ferryHull: true, y: fh.y }); if (inView(scr, fh.x0 - ox + 12, fh.y - oy)) saw('ferry'); } }
      kit.update(env, here, scr.narrow && !env.fixed, env.home && !env.fixed ? oy + (scr.narrow ? VH * 0.56 : VH - 38) : 0);
      for (const it of kit.items()) mov.push(it);
      // Once he is at the box, its front is down (L2).
      regBox.bm = REGS[(env.done.lake ? 1 : 0) | (env.done.stack ? 2 : 0) | (env.done.spires ? 4 : 0) | (leg.path === 'register' && leg.to === 1 && q > 0.8 ? 8 : 0)];
      standing(still, moves, mov, list, ox, oy, VW, VH, env.done);
      // A tree that nearer ground partly hides is drawn only where the land under each pixel is no
      // nearer than the tree itself (D6a), so it can sway and still stand behind the slope in front.
      // It visits only the bitmap's solid runs, as blitRuns does (round 6, K3: C3's trees in the hills' empty
      // patches all come this way, and visiting their clear pixels too cost about 1 ms a frame zoomed out).
      const OY = oy, DEP = W.depth, clipBlit = (bm, sx, sy, v, dy = 0) => { sx = Math.round(sx); sy = Math.round(sy); const lim = v - 3, RN = bm.runs || runsOf(bm), d = bm.d, w = bm.w; for (let r = 0; r < RN.length; r += 3) { const j = RN[r], y = sy + j, vy = y - oy - dy; if (vy < 0 || vy >= VH || y < 0 || y >= WH) continue; for (let i = RN[r + 1], e = i + RN[r + 2]; i < e; i++) { const x = sx + i, vx = x - ox; if (vx < 0 || vx >= VW || x < 0 || x >= WW || DEP[y * WW + x] < lim) continue; fb[vy * VW + vx] = d[j * w + i]; } } };
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

      if (crit.sounds.length) { for (const name of crit.sounds) env.sfx(name); crit.sounds.length = 0; }
      ev.draw(scr, ox, oy, t, env.mix || 0); life.draw(scr, ox, oy, t, env, DEBUG.clouds ? sky : null);
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
      // The conditions board's weather, the tide and the cats, when they are in the view (round 8, F2).
      if (DEBUG.clouds && frontAt(oy + VH / 2, sky) > ox + 40) { if (sky.deck > 0.5) saw('marine'); if (sky.rain > 0.5) saw('rain'); }
      { const p = crit.findPool(t); if (p && inView(scr, p.x - ox, p.y - oy, -60)) saw('tide'); }
      if (kit.items().some(c => inView(scr, c.x - ox, c.y - oy))) saw('cats');
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
          const wx = ox + x; if (wx < 0 || wx >= WW || !(shaftMask[wy * WW + wx] & 3)) continue;
          const i = y * VW + x; fb[i] = (shaftMask[wy * WW + wx] & 3) === 2 ? LIGHT[LIGHT[fb[i]]] : LIGHT[fb[i]];
        }
      }
      // A sunbreak (round 8, E2): a gap in the cloud lets the sun onto the rainforest for a while. Where its
      // light falls the canopy is a step lighter, and slanting rays stand in it, bright with a core of gold.
      const sb = life.sunbreak(t);
      if (sb) { const RX = 78, RY = 46, GOLD = R.sun[2];
        if (sb.a > 0.6 && inView(scr, sb.x - ox, sb.y - oy, 0)) saw('sunbreak');
        for (let y = Math.max(0, Math.round(sb.y - RY) - oy); y <= Math.min(VH - 1, Math.round(sb.y + RY) - oy); y++) { const wy = oy + y; if (wy < 300 || wy >= WH) continue;
          for (let x = Math.max(0, Math.round(sb.x - RX) - ox); x <= Math.min(VW - 1, Math.round(sb.x + RX) - ox); x++) { const wx = ox + x, m = wx < WW ? shaftMask[wy * WW + wx] : 0; if (!m) continue;
            const d = sq((wx - sb.x) / RX) + sq((wy - sb.y) / RY); if (d >= 1) continue;
            const w = (1 - d) * sb.a, i = y * VW + x, b = bayer(wx, wy), ray = frac((wx * 0.55 + wy) / 22);
            if (ray < 0.1 && b < w * 0.95) fb[i] = GOLD; else if (ray < 0.32 && b < w * 1.4) fb[i] = LIGHT[LIGHT[fb[i]]]; else if (b < w * 0.85) fb[i] = LIGHT[fb[i]]; } } }
      // A dead calm (round 8, E2): Reflection Lake is a mirror. What stands above each stretch of open water
      // (the far bank and its flowers, the island's tree) stands upside down in it, a step darker, fading with depth.
      if (calm > 0.05 && life.lake) { const l = life.lake;
        for (let wx = Math.max(l.x0, ox); wx <= Math.min(l.x1, ox + VW - 1); wx++) { let edge = -1;
          for (let wy = Math.max(l.y0, oy + 1); wy <= Math.min(l.y1, oy + VH - 1); wy++) { const i = (wy - oy) * VW + wx - ox;
            if (!l.m[(wy - l.y0) * l.w + wx - l.x0] || !LAKEC[fb[i]]) { edge = -1; continue; }
            if (edge < 0) edge = wy; const dd = wy - edge, sy = edge - 1 - dd; if (sy < oy) continue;
            const s = fb[(sy - oy) * VW + wx - ox]; if (!LAKEC[s] && s !== INK && bayer(wx, wy) < calm * 0.6 * smooth(30, 3, dd)) fb[i] = SHADE[s]; } } }
      // The debug panel's outlines, over the finished map.
      // Where the chosen kind of mover may not go (collide.js), tinted, under the outlines.
      if (DEBUG.collide) crit.collide.overlay(scr, DEBUG.collide, ox, oy, t, R.red[1]);
      // Where a click sent him (T3): a red cross hovering over the spot on the trail, gone when he gets there.
      if (env.walkMark) { const mx = Math.round(env.walkMark.x) - ox, my = Math.round(env.walkMark.y) - oy, bob = Math.floor(t * 3) & 1;
        const X = [], Y = my - 4 - bob; for (let k = -3; k <= 3; k++) for (const d of [0, 1]) X.push([mx + k + d, Y + k], [mx + k + d, Y - k]);
        for (const [x, y] of X) for (const [ax, ay] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) scr.set(x + ax, y + ay, INK);
        for (const [x, y] of X) scr.set(x, y, R.red[1]); scr.set(mx, my, INK); scr.set(mx + 1, my, INK); }
      if (!env.fixed && (DEBUG.roam || DEBUG.trails || DEBUG.camera)) {
        const dot = (x, y, c) => scr.set(Math.round(x) - ox, Math.round(y) - oy, c);
        const box = (b, c, step) => { for (let x = b.x0; x <= b.x1; x += step) { dot(x, b.y0, c); dot(x, b.y1, c); } for (let y = b.y0; y <= b.y1; y += step) { dot(b.x0, y, c); dot(b.x1, y, c); } };
        // Where each animal wanders and each flock circles (T32): its own bright colour, two pixels wide with a
        // dark inner edge, a light dithered fill and its name. Pink boxes: where the cats keep to.
        if (DEBUG.roam) { for (const a of crit.areas()) roamArea(scr, a, ox, oy); for (const b of kit.areas()) box(b, R.pink[1], 2); }
        // Each trail as the line he actually follows, with a knot every twenty pixels, and a white cross
        // where the lake loop goes into the forest and where it comes back out.
        if (DEBUG.trails) {
          for (const [k, c] of [['lake', R.red[1]], ['stack', R.yellow[1]], ['spires', R.pink[2]]]) { const P = paths[k]; for (let d = 0; d <= P.len; d++) { const a = P.at(d / P.len); dot(a.x, a.y, c); if (d % 20 === 0) { dot(a.x + 1, a.y, c); dot(a.x - 1, a.y, c); dot(a.x, a.y + 1, c); dot(a.x, a.y - 1, c); } } }
          for (const q of [lakeIn, lakeOut]) { const a = paths.lake.at(q); for (let k = -3; k <= 3; k++) { dot(a.x + k, a.y + k, R.white[1]); dot(a.x + k, a.y - k, R.white[1]); } }
        }
        // Yellow: where the middle of the view may go. Orange: where a drag starts to be pushed back.
        // White: the edge of the world. Yellow cross: where the camera rests. White cross: the middle of the view.
        // Drawn bold since round 6 (note 24), as the roam areas are: two pixels of colour with a dark inner
        // edge, and each line's name inside its top left corner.
        if (DEBUG.camera) {
          const L = UI.debug.cameraLines;
          boldBox(scr, { x0: VW / 2, x1: WW - VW / 2, y0: VH / 2, y1: WH - VH / 2 + past }, R.yellow[1], ox, oy, L[0]);
          boldBox(scr, { x0: VW / 2 + 26, x1: WW - VW / 2 - 26, y0: VH / 2 + 26, y1: WH - VH / 2 - 26 }, R.blaze[1], ox, oy, L[1]);
          boldBox(scr, { x0: 0, x1: WW - 1, y0: 0, y1: WH - 1 }, R.white[1], ox, oy, L[2]);
          for (let k = -4; k <= 4; k++) { dot(cam.x + k, cam.y, R.yellow[1]); dot(cam.x, cam.y + k, R.yellow[1]); dot(ox + VW / 2 + k, oy + VH / 2, R.white[1]); dot(ox + VW / 2, oy + VH / 2 + k, R.white[1]); }
        }
      }
    }
  };
}

// A debug outline in the roam areas' style (round 6, note 24): a rectangle of the map two pixels wide in its
// colour with a dark inner edge, drawn only where it is on screen, and its name inside the top left corner.
function boldBox(scr, b, c, ox, oy, label) {
  const X0 = Math.round(b.x0) - ox, X1 = Math.round(b.x1) - ox, Y0 = Math.round(b.y0) - oy, Y1 = Math.round(b.y1) - oy, { VW, VH } = scr;
  const xa = Math.max(X0, -3), xb = Math.min(X1, VW + 3), ya = Math.max(Y0, -3), yb = Math.min(Y1, VH + 3);
  const put = (x, y, k) => { if (x >= 0 && y >= 0 && x < VW && y < VH) scr.set(x, y, k < 2 ? c : INK); };
  for (let x = xa; x <= xb; x++) for (let k = 0; k < 3; k++) { if (Y0 + k <= Y1) put(x, Y0 + k, k); if (Y1 - k >= Y0) put(x, Y1 - k, k); }
  for (let y = ya; y <= yb; y++) for (let k = 0; k < 3; k++) { put(X0 + k, y, k); put(X1 - k, y, k); }
  if (label && X1 > 0 && Y1 > 0 && X0 < VW && Y0 < VH) tinyText(scr, Math.max(X0, 0) + 6 + label.length * 2, Math.max(Y0, 0) + 6, label.toUpperCase(), c);
}
// A 3 by 5 pixel letter set for the debug labels on the map (T32), with a dark box behind for contrast.
const GLYPHS = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111' };
function tinyText(scr, cx, y, str, c) {
  const w = str.length * 4 - 1, x0 = cx - (w >> 1);
  for (let j = -1; j <= 5; j++) for (let i = -1; i <= w; i++) scr.set(x0 + i, y + j, INK);
  for (let n = 0; n < str.length; n++) { const g = GLYPHS[str[n]]; if (!g) continue; for (let k = 0; k < 15; k++) if (g[k] === '1') scr.set(x0 + n * 4 + (k % 3), y + ((k / 3) | 0), c); }
}
