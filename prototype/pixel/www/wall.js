// Proficiency Peak: a granite big wall climbed face-on, the camera rising with him. One route, three
// pitches with a ledge after each, the summit, then the rappel. Everything he does is worked out
// from how far along the route he is, so the timeline can be dragged either way.
import { clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, INK, SHADE, pick } from './core.js';
import { Strip, drawStrip, baseline } from './side.js';
import { makeFir, makeSpruce, makeBoulder, makeCloud, makeFlag, makeBush } from './sprites.js';
import { speck } from './fauna.js';
import { makeRunner, sideFig, frontFig, backFig } from './tj.js';
import { NAMES } from './content.js';
import { makeCragPair } from './people.js';

const W = 1340, RX = 760, UP = 500, DOWN = 250;
const H1 = 110, H2 = 220, ROOF = 292, H3 = 326, HS = 360, C = 12;
// He stands on a ledge with his feet on it, so his hips are LEG above it; the top is the rim he stands on.
const LEG = 12, TOP = HS + 4, LEDGES = [H1, H2, H3, TOP];
// When the climbing starts, when the hold breaks, when he is on top, when the rappel lands, and the end.
const T_GO = 3.7, T_BREAK = 9.7, T_TOP = 18.3, T_LAND = 22.1, DUR = 25.8;
// Seconds into the scene, and how high his hips are by then. Before the climbing he walks up, picks up the
// end of the rope, ties in, waits, and bumps fists with the belayer; after the rappel he slaps hands with
// both friends on his way out.
const KEYS = [[0, 0, 'walk'], [0.9, 0, 'pick'], [1.5, 0, 'tie'], [2.5, 0, 'bump'], [3.3, 0, 'step'], [T_GO, 0, 'climb'], [7.7, H1 + LEG, 'climb'], [T_BREAK, 170, 'fall'], [10, 148, 'hang'], [10.7, 148, 'climb'], [13.1, H2 + LEG, 'climb'], [15.3, 286, 'roof'], [16.5, 308, 'climb'], [17.1, H3 + LEG, 'climb'], [T_TOP, TOP + LEG, 'rappel'], [T_LAND, 0, 'land'], [22.45, 0, 'over'], [22.9, 0, 'five1'], [23.6, 0, 'back'], [24.2, 0, 'five2'], [24.9, 0, 'out'], [DUR, 0, 'out']];
// The first stop has no card: he waits there, tied in, for Space or Start.
const STOPS = [['wait:belay', 2.5], ['platform-engineering', 7.7], ['site-reliability-engineering', 13.1], ['software-engineering', 17.1], ['summit', T_TOP]];
const PRO = [16, 36, 56, 76, 96, H1, 128, 146, 164, 186, 206, H2, 238, 256, 274, 300, 314, H3];
const FLAKE = 176;
// The two at the foot: where the belayer's hips are, and where the other one's feet rest.
const BX = RX - 23, BS = -3, SX = RX + 40, SS = -15;
// On the ground: where he stands to tie in (beside the belayer), how far down the grass his feet are
// there, where the end of the rope lies waiting, and where he stands to reach the one sitting down.
const TIE = RX - 5, FEET = -12, END = [RX + 3, -13], BY = RX + 22;
const GROUND = { walk: 1, pick: 1, tie: 1, bump: 1, step: 1, land: 1, over: 1, five1: 1, back: 1, five2: 1, out: 1 };

const route = s => RX + (s < H1 ? 0 : 6 * Math.sin((s - H1) / 28) * smooth(H1, H1 + 20, s));
const edge = s => RX + 124 + 9 * vnoise(s / 34, 1, 160) + 5 * Math.sin(s / 61) - 30 * smooth(HS - 60, HS + 4, s);
// Where the hold at height hs is: the left (-1) or right (1) hand takes it, and two moves later the foot
// of the same side stands on it. On the first pitch hands and feet go in the crack instead.
const holdX = (side, hs) => route(hs) + side * (hs < H1 - 4 ? 1.4 : 4.5 + 3 * hash(Math.round(hs / C), side + 2, 191));
const rim = x => HS + 4 + Math.round((9 * (vnoise(x / 19, 2, 161) - 0.5) + 4 * (vnoise(x / 5, 3, 161) - 0.5)) * smooth(14, 44, Math.abs(x - RX)) - 14 * smooth(RX - 140, RX - 420, x) - 7 * smooth(RX + 40, RX + 110, x));

function paintWall(S) {
  const cracks = [RX - 392, RX - 300, RX - 214, RX - 131, RX - 62, RX + 44, RX + 88];
  for (let x = 0; x < W; x++) {
    const top = rim(x);
    for (let s = top; s >= -3; s--) {
      if (x > edge(s)) continue;
      const y = -s;
      // Big pale panels, long vertical grain, darker where water runs off the rim.
      let v = 0.64 + 0.26 * (fbm(x / 70, y / 90, 162, 3) - 0.5) + 0.12 * (vnoise(x / 4, y / 46, 163) - 0.5) + 0.08 * (vnoise(x / 17, y / 9, 164) - 0.5);
      if (vnoise(x / 3.2, 3, 165) > 0.74 && top - s < 40 + 190 * vnoise(x / 7, 5, 166)) v -= 0.26;
      if (vnoise(x / 6, 7, 167) > 0.8 && s < 150) v += 0.16;
      // Overlaps: a lit lip with shade under it, here and there across the face.
      const lap = frac(s / 37 + 0.6 * vnoise(x / 40, 2, 168)), lapOn = vnoise(x / 30, Math.floor(s / 37 + 0.6 * vnoise(x / 40, 2, 168)), 169) > 0.55;
      if (lapOn) { if (lap < 0.03) v = 0.97; else if (lap > 0.9) v -= 0.16 * (lap - 0.9) / 0.1 + 0.06; }
      for (const cx of cracks) { const d = x - (cx + 5 * Math.sin(y / 31 + cx)); if (d > -0.8 && d < 0.6 && s < top - 8 && vnoise(cx, y / 60, 170) > 0.25) v = 0.12; else if (d >= 0.6 && d < 1.8 && s < top - 8) v += 0.14; }
      // The line of the route: the crack of the first pitch, and the roof on the third.
      if (s < H1 - 2 && s > 2) { const d = x - RX; if (Math.abs(d) < 1.1) v = 0.08; else if (d >= 1.1 && d < 2.6) v = 0.93; else if (d < -1.1 && d > -3.5) v -= 0.12; }
      const rd = Math.abs(x - RX - 10), rb = ROOF + 2 * vnoise(x / 9, 1, 171);
      if (rd < 78) { if (s <= rb && s > rb - 11) v = 0.05 + 0.2 * (rb - s) / 11 * (rd > 66 ? 2 : 1); else if (s > rb && s < rb + 2) v = 0.98; else if (s <= rb - 11 && s > rb - 26) v -= 0.17 * (1 - (rb - 11 - s) / 15); }
      for (const [h, hw] of [[H1, 30], [H2, 34], [H3, 26]]) { const d = Math.abs(x - route(h)); if (d < hw + 3 * vnoise(x / 5, h, 172)) { if (s <= h && s > h - 2) v = 1; else if (s <= h - 2 && s > h - 7) v = 0.16 + (h - 2 - s) * 0.04; } }
      if (x > edge(s) - 9) v += 0.16 - (edge(s) - x) * 0.012;
      if (top - s < 2) v += 0.2;
      // Water streaks (CHECKPOINT 2: the wall in Proficiency Peak's granite as the map paints its fin, cool grey `rock`
      // lit to `gold`'s near-white, after Prusik's south face, darker grey wherever water runs; round 3's warm ochre
      // stains on tan read as Yosemite).
      const warm = fbm(x / 13, y / 34, 173, 3) > 0.64 && v > 0.42 && v < 0.86 && hash(x, s, 1) < 0.8;
      // Lichen: pale sage where the rock stays damp, in drifts that run down the face.
      const lichen = v > 0.34 && v < 0.9 && fbm(x / 7, y / 19, 176, 3) > 0.66 && vnoise(x / 64, y / 110, 177) > 0.56 && hash(x, s, 3) < 0.7;
      S.set(x, y, lichen ? pick('mist', 0.42 + v * 0.5, x, y) : (warm ? pick('rock', v * 0.62, x, y) : v > 0.88 ? R.gold[6] : pick('rock', v / 0.88, x, y)));
    }
    if (x <= edge(top)) S.set(x, -top - 1, INK);
  }
  for (let s = HS + 6; s > -3; s--) { const e = Math.round(edge(s)); S.set(e + 1, -s, INK); }
  // The holds, exactly where his hands and feet will go. Every one has a top the light catches and a
  // shadow under it, and each pitch has its own kind: edges beside the crack on the first, big flakes and
  // jugs on the second, pockets and thin edges on the third. Most carry a dab of chalk.
  const lit = R.gold[6], dark = R.rock[0], dim = R.rock[1], mid = R.rock[2], put = (x, s, c) => S.set(Math.round(x), -Math.round(s), c);
  const KINDS = {
    edge: (x, s) => { for (let d = -2; d <= 2; d++) { put(x + d, s, lit); put(x + d, s - 1, dark); if (Math.abs(d) < 2) put(x + d, s - 2, dim); } },
    thin: (x, s) => { for (let d = -1; d <= 1; d++) { put(x + d, s, lit); put(x + d, s - 1, dark); } },
    jug: (x, s) => { for (let d = -3; d <= 3; d++) { put(x + d, s + (Math.abs(d) === 3 ? -1 : 0), lit); put(x + d, s - 1 - (Math.abs(d) === 3 ? 1 : 0), dark); if (Math.abs(d) < 3) { put(x + d, s - 2, dark); put(x + d, s - 3, mid); } } put(x - 1, s + 1, lit); put(x, s + 1, lit); },
    flake: (x, s, side) => { for (let k = 0; k < 6; k++) { put(x + side * (k - 2), s - k, lit); put(x + side * (k - 3), s - k, dark); if (k > 1) put(x + side * (k - 4), s - k, dim); } },
    pocket: (x, s) => { for (let d = -1; d <= 1; d++) { put(x + d, s, dark); put(x + d, s - 1, dark); put(x + d, s - 2, lit); } put(x - 2, s - 1, dim); put(x + 2, s - 1, dim); put(x, s + 1, dim); }
  };
  for (const side of [-1, 1]) for (let hs = side < 0 ? 21 : 22; hs < HS - 2; hs += C) {
    if (LEDGES.some(h => Math.abs(hs - h) < 5) || (hs > ROOF - 14 && hs < ROOF + 4)) continue;
    const r = hash(hs, side, 174), x = hs < H1 - 4 ? RX + side * (5 + Math.round(r * 3)) : holdX(side, hs);
    // Beside the crack only now and then: the crack is the route there.
    if (hs < H1 - 4 && r < 0.45) continue;
    const kind = hs < H1 - 4 ? 'thin' : hs < H2 ? (r < 0.38 ? 'jug' : r < 0.74 ? 'flake' : 'edge') : hs < H3 ? (r < 0.5 ? 'pocket' : r < 0.8 ? 'thin' : 'edge') : 'edge';
    KINDS[kind](Math.round(x), hs, side);
    if (hash(hs, side, 175) < 0.62) { put(x + side, hs + 1, R.white[1]); if (r > 0.5) put(x, hs + 2, R.white[0]); }
  }
  // Bushes on the ledges, trees along the rim.
  const rand = rng(8);
  for (let x = 6; x < RX + 60; x += 7 + rand() * 16) { if (Math.abs(x - RX) < 26) continue; const h = 5 + rand() * 9, t = rim(x); for (let j = 0; j < h; j++) for (let dx = -Math.floor(j / 2.4); dx <= Math.floor(j / 2.4); dx++) S.set(x + dx, -t - h + j, R.conifer[dx < 0 ? 3 : 1]); }
  for (const [h, dx] of [[H1, -18], [H2, 22], [H2, -24], [H3, 15]]) { const b = makeBush(60 + h + dx, 'green'); S.stamp(b, route(h) + dx, -h); }
  // A few firs that found a foothold on the face, each on its own small ledge, well away from the line.
  for (const [x, sLedge, h] of [[RX - 196, 148, 13], [RX - 96, 262, 10], [RX + 78, 196, 9], [RX - 292, 74, 15], [RX - 330, 236, 11], [RX - 150, 44, 12]]) {
    if (x > edge(sLedge) - 12) continue;
    for (let dx = -7; dx <= 7; dx++) { S.set(x + dx, -sLedge, R.rock[4]); S.set(x + dx, -sLedge + 1, R.rock[1]); if (Math.abs(dx) < 6) S.set(x + dx, -sLedge + 2, R.gold[2]); }
    for (let j = 0; j < h; j++) { const w = Math.floor(j / 2.2); for (let dx = -w; dx <= w; dx++) S.set(x + dx, -sLedge - h + j - 1, R.conifer[dx < 0 ? 3 : dx === w && w ? 0 : 1]); }
    S.set(x, -sLedge - 1, R.bark[1]); S.set(x - 4, -sLedge - 1, R.moss[4]); S.set(x + 3, -sLedge - 1, R.moss[5]); S.set(x + 5, -sLedge - 1, R.moss[4]);
  }
}

function paintGround(S, things) {
  const rand = rng(81);
  for (let x = 0; x < W; x++) for (let y = 0; y < DOWN; y++) {
    const tal = smooth(70, 0, y + 14 * (vnoise(x / 26, 3, 175) - 0.5)) * smooth(RX + 300, RX + 150, x);
    const trail = Math.abs(y - 7 - 2 * Math.sin(x / 40)) < 3.2 && x < RX + 8;
    let c;
    if (trail) c = hash(x, y, 176) < 0.08 ? R.rock[2] : pick('dirt', 0.56 + 0.25 * (vnoise(x / 5, y / 2, 177) - 0.5), x, y, 0.7);
    else if (hash(x >> 1, y >> 1, 178) < tal * 0.92) c = pick('rock', 0.2 + 0.7 * hash(x >> 1, y >> 1, 179) - y * 0.002, x, y);
    else c = pick('grass', 0.55 + 0.5 * (fbm(x / 24, y / 13, 180, 3) - 0.5) + 0.12 * (hash(x >> 1, y >> 1, 181) - 0.5) - y * 0.001, x, y, 0.3);
    if (y < 2 && !trail) c = SHADE[c];
    S.set(x, y, c);
  }
  const boulders = [3, 4, 6, 8, 11].map((r, i) => makeBoulder(170 + i, r)), firs = Array.from({ length: 5 }, (_, i) => makeFir(320 + i)), spruces = [makeSpruce(240), makeSpruce(241)];
  for (let n = 0; n < 150; n++) { const x = rand() * W, y = 3 + sq(rand()) * 230; if (Math.abs(y - 8) < 9 && x < RX + 20) continue; things.push({ bm: boulders[Math.min(4, (rand() * 3 + y / 70) | 0)], x: Math.round(x), s: -Math.round(y) }); }
  for (let n = 0; n < 46; n++) { const x = rand() * W, y = 16 + rand() * 220; if (Math.abs(x - RX) < 50 && y < 60) continue; things.push({ tree: y > 80 && rand() < 0.5 ? spruces[n & 1] : firs[(rand() * 5) | 0], x: Math.round(x), s: -Math.round(y) }); }
}

// The valley beyond the edge of the wall: far walls with a waterfall, forest, a river.
function paintValley() {
  const S = new Strip(640, 330, 90);
  for (let x = 0; x < 640; x++) {
    const ridge = -150 - 60 * fbm(x / 90, 1, 182, 4) - 30 * Math.exp(-sq((x - 420) / 60));
    const wallTop = -70 - 90 * smooth(140, 330, x) * (0.75 + 0.25 * vnoise(x / 26, 2, 183)) - 26 * vnoise(x / 13, 3, 184);
    for (let y = Math.round(Math.min(ridge, wallTop)); y < 90; y++) {
      let c;
      if (y < wallTop && y >= ridge) c = y - ridge < 4 && ridge < -180 ? R.farsnow[1] : pick('far', 0.45 + 0.3 * (vnoise(x / 6, y / 14, 185) - 0.5), x, y);
      else if (y < wallTop) continue;
      else if (y < 14 + 10 * vnoise(x / 30, 4, 186)) c = Math.abs(x - 452 - 3 * Math.sin(y / 9)) < 1.3 && y > wallTop + 6 ? R.farsnow[1] : pick('far', 0.72 + 0.3 * (vnoise(x / 5, y / 24, 187) - 0.5) - (vnoise(x / 3, 5, 188) > 0.7 ? 0.2 : 0), x, y);
      else if (Math.abs(y - 58 - 9 * Math.sin(x / 50)) < 2.2) c = R.water[4];
      else c = pick('hill', 0.3 + 0.7 * vnoise(x / 3, y / 2.4, 189), x, y);
      S.set(x, y, c);
    }
  }
  return S;
}

export function makeWall() {
  const main = new Strip(W, UP, DOWN), things = [];
  paintWall(main); paintGround(main, things);
  const valley = paintValley();
  const clouds = [0, 1, 2].map(i => ({ bm: makeCloud(620 + i), x: i * 190, y: 20 + i * 46, v: 3 + i }));
  const run = makeRunner('wall'), flag = [makeFlag(0), makeFlag(1)], swift = [speck(0), speck(1)];
  // The pika moved to the larch basin (G7); its two rocks stay in the talus.
  const pikaX = RX - 86;
  things.push({ bm: makeBoulder(190, 8), x: pikaX, s: -12 }, { bm: makeBoulder(191, 5), x: pikaX + 22, s: -15 });
  const prop = {
    'platform-engineering': (b, cx, y) => { for (const [dx, c] of [[-7, R.rock[3]], [-6, R.red[1]], [-8, R.rock[2]]]) b.set(cx + dx, y + 1 + (dx & 1), c); b.set(cx - 7, y - 1, R.rock[4]); b.set(cx - 7, y, R.teal[2]); },
    'site-reliability-engineering': (b, cx, y) => { b.set(cx + 5, y + 2, INK); b.set(cx + 6, y + 2, R.kit[2]); b.set(cx + 5, y + 3, INK); },
    'software-engineering': (b, cx, y) => { for (let i = -3; i <= 3; i++) for (let j = 3; j < 7; j++) b.set(cx + i, y + j, i === 0 ? R.white[0] : j === 6 ? R.red[1] : R.white[1]); b.set(cx - 2, y + 4, R.red[1]); b.set(cx + 2, y + 5, R.navy[1]); },
    summit: null
  };
  const stand = {};
  for (const id in prop) stand[id] = frontFig('wall', id === 'summit' ? { swing: -9 } : { swing: id === 'site-reliability-engineering' ? -3 : 0, held: prop[id] });
  stand.idle = frontFig('wall');
  // On the ground with the rope. The knot at his waist: a turn of rope with a tail.
  const knot = (b, cx, y) => { b.set(cx, y + 7, R.white[1]); b.set(cx - 1, y + 7, R.teal[2]); b.set(cx + 1, y + 7, R.teal[2]); b.set(cx + 1, y + 8, R.teal[1]); };
  const tying = f => frontFig('wall', { held: (b, cx, y) => { knot(b, cx, y); for (const [dx, dy] of f ? [[-2, 6], [2, 7]] : [[-2, 7], [2, 6]]) { b.set(cx + dx, y + dy, R.skin[2]); b.set(cx + dx + (dx < 0 ? -1 : 1), y + dy, R.sun[1]); b.set(cx + dx + (dx < 0 ? -2 : 2), y + dy - 1, R.sun[1]); } } });
  const act = {
    reach: sideFig('wall', { crouch: 3, lean: 5, hands: [[5, 9], [1, 6]], look: 'down', feet: [[2, 8.5], [-3, 8.5]] }),
    lift: sideFig('wall', { lean: 2, hands: [[4, 5], [-1, 6]], look: 'down' }),
    tie: [tying(0), tying(1)], tied: frontFig('wall', { held: knot }),
    side: sideFig('wall', { lean: 0, held: (b, sh, hands, hip) => { b.set(hip[0] + 2, hip[1] - 1, R.white[1]); b.set(hip[0] + 3, hip[1] - 1, R.teal[2]); } }), free: sideFig('wall', { lean: 0 }),
    // A fist drawn back and put out, and a hand raised and brought forward for a high five.
    bump: [sideFig('wall', { lean: 0, hands: [[1, 4], [-1, 6]] }), sideFig('wall', { lean: 1, hands: [[6, 4], [-1, 6]] })],
    five: [sideFig('wall', { lean: 0, hands: [[1, -5], [-1, 6]], elbowFwd: true }), sideFig('wall', { lean: 1, hands: [[6, -2], [-1, 6]], elbowFwd: true })],
    low: [sideFig('wall', { lean: 0, hands: [[1, -3], [-1, 6]], elbowFwd: true }), sideFig('wall', { lean: 2, hands: [[6, -1], [-1, 6]], look: 'down', elbowFwd: true })]
  };
  // Hands meeting: a small star where they touch.
  const spark = (scr, x, y, a) => { if (a < 0 || a > 0.22) return; const r = a < 0.08 ? 2 : 3; scr.set(x, y, R.white[1]); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { scr.set(x + dx, y + dy, R.white[1]); scr.set(x + dx * r, y + dy * r, R.yellow[1]); } for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) scr.set(x + dx * (r - 1), y + dy * (r - 1), R.yellow[1]); };

  const pair = makeCragPair();
  const st = { who: 0 }, focus = { x: 0, y: 0 };
  let camS = 0, last = { camX: 0, base: 0 };
  const list = [];

  // Where he is and what he is doing at a moment of the scene.
  function at(tau) {
    let i = 0; while (i < KEYS.length - 2 && tau >= KEYS[i + 1][0]) i++;
    const [t0, s0, mode] = KEYS[i], [t1, s1] = KEYS[i + 1], u = clamp((tau - t0) / (t1 - t0), 0, 1);
    return { mode, u, s: mode === 'fall' ? lerp(s0, s1, u * u) : lerp(s0, s1, u), tau };
  }
  // The four limbs take turns: each stays on its hold while the body rises past, then reaches for the next.
  // A foot takes the hold its hand had two moves before. Where a hold would lie just under a ledge and his
  // hips are already above it, the foot is on the ledge instead, so he steps onto every ledge on the way
  // up and stands on it until his hips have left; the same holds going down. Past the rim there is no
  // rock to hold, so his hands come down to it and then to his sides.
  function limbs(s) {
    const out = [];
    for (const [off, side, lead] of [[0, -1, 9], [0.5, 1, 10], [0.25, 1, -14], [0.75, -1, -15]]) {
      const ph = s / C - off, n = Math.floor(ph), m = ph - n, foot = lead < 0;
      const hold = k => {
        let hs = (k + 1) * C + lead; const x = holdX(side, hs) + (foot && hs < H1 - 4 ? side * 1.5 : 0) - route(s);
        if (foot) for (const h of LEDGES) { if (hs > h - 14 && hs <= h + 3) hs = lerp(hs, h, smooth(h + 1 + side, h + 5 + side, s)); }
        else hs = Math.min(hs, TOP - 1);
        return [x, hs];
      };
      const a = hold(n), b = hold(n + 1), u = m > 0.7 ? (m - 0.7) / 0.3 : 0;
      let p = [lerp(a[0], b[0], u) + side * Math.sin(u * Math.PI) * 2, -(lerp(a[1], b[1], u) - s)];
      if (!foot) { const k = smooth(TOP - 6, TOP + 8, s); p = [lerp(p[0], side * 6, k), lerp(p[1], -2, k)]; }
      out.push([Math.round(p[0]), Math.round(p[1])]);
    }
    return { hands: [out[0], out[1]], feet: [out[3], out[2]] };
  }

  return {
    name: 'wall',
    dur: () => DUR,
    stops: () => STOPS.map(([id, t]) => ({ id, at: t / DUR })),
    elev: (arg, q) => at(q * DUR).s,
    // Gear goes in on the way up, the hold breaks, the rope catches, and the rappel hums.
    cues() {
      const out = [{ at: T_BREAK / DUR, name: 'crack' }, { at: (T_BREAK + 0.05) / DUR, name: 'fall' }, { at: 10 / DUR, name: 'catch' }, { at: (T_TOP + 0.2) / DUR, name: 'glissade' }];
      // The rope coming off the ground, and the three times hands meet.
      out.push({ at: 1.3 / DUR, name: 'step' }, { at: (2.5 + 0.8 * 0.5) / DUR, name: 'slap' }, { at: (22.9 + 0.7 * 0.45) / DUR, name: 'slap' }, { at: (24.2 + 0.7 * 0.45) / DUR, name: 'slap' });
      let k = 0; for (let tau = T_GO; tau < T_TOP && k < PRO.length; tau += 0.02) { const a = at(tau); if (a.mode !== 'fall' && a.s >= PRO[k]) { out.push({ at: tau / DUR, name: 'place' }); k++; } }
      return out;
    },
    // Which of the two belays is a coin toss on every visit.
    enter(scr, arg, q) { camS = at(q * DUR).s; st.y = null; st.who = Math.random() < 0.5 ? 0 : 1; },
    focus: () => focus,
    pick(sx, sy) {
      const wx = sx + last.camX, s = last.base + camS - sy;
      if (Math.abs(wx - route(H2)) < 34 && Math.abs(s - H2) < 8) return { label: NAMES.wall.ledge, x: sx, y: sy - 10 };
      if (Math.abs(wx - RX - 10) < 78 && s > ROOF - 12 && s < ROOF + 3) return { label: NAMES.wall.roof, x: sx, y: sy - 10 };
      if (wx < RX + 150 && s < 0 && s > -70 && Math.abs(wx - RX) > 20) return { label: NAMES.wall.scree, x: sx, y: sy - 10 };
      return null;
    },
    act() { return false; },
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t } = env;
      const tau = q * DUR, me = at(tau), s = me.s;
      camS += (s - camS) * Math.min(1, env.dt * 7);
      const anchor = scr.narrow ? 0.5 : 0.58, camX = Math.round(RX - VW * anchor + env.look.x * 0.4);
      // While he waits to be told to climb there is no card open, so the picture sits where it does when he runs.
      const base = baseline(scr, env.shown && !String(env.shown).startsWith('wait:'), st) + (scr.narrow ? 0 : -16), rowOf = h => Math.round(base + camS - h);
      last = { camX, base };

      // Sky, deeper the higher he gets, then the valley, then the wall itself.
      const sb = R.skyband;
      for (let y = 0; y < VH; y++) {
        const f = clamp((y + 120 - camS * 0.25) / 330, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0, row = y * VW;
        if (e < 0.72 || b0 >= sb.length - 1) fb.fill(sb[b0], row, row + VW); else for (let x = 0; x < VW; x++) fb[row + x] = sb[b0 + (bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0)];
      }
      for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v) % (VW + 140)) - 70, c.y + camS * 0.12 - 20);
      drawStrip(scr, valley, 150 + camX * 0.3, base + camS * 0.42 - 26, false, R.hill[0]);
      // A falcon turns over the valley.
      { const a = t * 0.5; scr.put(swift[Math.floor(t * 2) & 1], RX + 220 - camX + Math.cos(a) * 46, base + camS * 0.5 - 150 + Math.sin(a) * 14, Math.sin(a) > 0); }
      drawStrip(scr, main, camX, base + camS, false, R.grass[1]);

      // The belayer pays rope out as he moves, locks off when he falls, and is lifted a little by the catch.
      const cut = tau >= T_TOP, ground = !!GROUND[me.mode], u = me.u;
      // On the ground, before and after the climb: where he is, how far down the grass his feet are, which
      // way he faces and what he is doing.
      let gx = TIE, gs = FEET, gbm = null, gflip = false;
      const stride = (from, to) => env.moving ? run.side[Math.floor(Math.abs(to - from) * u / 4.2) % 6] : run.sideIdle[0];
      if (me.mode === 'walk') { gx = lerp(RX - 62, TIE, u); gs = lerp(-8, FEET, u); gbm = stride(RX - 62, TIE); }
      else if (me.mode === 'pick') gbm = u < 0.2 ? act.free : u < 0.6 ? act.reach : act.lift;
      else if (me.mode === 'tie') gbm = u > 0.9 ? act.tied : act.tie[Math.floor(u * 7) & 1];
      else if (me.mode === 'bump') { gflip = u >= 0.04; gbm = u < 0.04 ? act.tied : u < 0.25 || u > 0.85 ? act.side : act.bump[u > 0.45 && u < 0.7 ? 1 : 0]; }
      else if (me.mode === 'step') { gx = lerp(TIE, RX, smooth(0, 0.7, u)); gbm = u < 0.7 ? stride(TIE, RX + 6) : null; }
      else if (me.mode === 'land') { gx = RX + 1; gbm = stand.idle; }
      else if (me.mode === 'over') { gx = lerp(RX + 1, BY, u); gs = FEET - u; gbm = stride(RX + 1, BY); }
      else if (me.mode === 'five1') { gx = BY; gs = FEET - 1; gbm = u < 0.15 || u > 0.8 ? act.free : act.low[u > 0.4 && u < 0.65 ? 1 : 0]; }
      else if (me.mode === 'back') { gx = lerp(BY, TIE, u); gs = FEET - 1 + u; gflip = true; gbm = stride(BY, TIE); }
      else if (me.mode === 'five2') { gflip = true; gbm = u < 0.15 || u > 0.8 ? act.free : act.five[u > 0.4 && u < 0.65 ? 1 : 0]; }
      else if (me.mode === 'out') { gx = lerp(TIE, RX - 62, u); gs = lerp(FEET, -8, u); gflip = true; gbm = stride(TIE, RX - 62); }
      const bel = pair.belay[st.who], turned = pair.side[st.who];
      const bf = cut || me.mode === 'walk' || me.mode === 'pick' ? bel.rest : me.mode === 'fall' || me.mode === 'hang' ? bel.lock : ground ? bel.ready : env.moving && (Math.floor(tau * 3) & 1) ? bel.b : bel.a;
      // The belayer turns side-on to him for the fist bump before the climb and the high five after it.
      let bside = null;
      if (me.mode === 'bump' && u > 0.1 && u < 0.92) bside = u < 0.25 || u > 0.85 ? turned.stand : turned.bump[u > 0.45 && u < 0.7 ? 1 : 0];
      if (me.mode === 'five2' && u > 0.05 && u < 0.9) bside = u < 0.15 || u > 0.8 ? turned.stand : turned.five[u > 0.4 && u < 0.65 ? 1 : 0];
      const bs = BS + (me.mode === 'hang' ? 2 : 0), grip = bside ? [5, 4] : bf.grip, brake = bside ? [2, 5] : bf.brake;
      // The rope: from the pile through the belayer's hands, up through every piece he has placed or
      // clipped, to him. On the way down it hangs from the top instead. Dark edges, bright core.
      const pts = [], gear = [];
      const seg = (x0, h0, x1, h1, bow, sag) => { const n = Math.max(1, Math.abs(h1 - h0), Math.abs(x1 - x0)); for (let k = 0; k <= n; k++) { const u = k / n, w = Math.sin(u * Math.PI); pts.push(Math.round(lerp(x0, x1, u) + w * bow) - camX, rowOf(lerp(h0, h1, u) - w * sag)); } };
      const high = cut ? HS : tau >= 10.7 && tau < 13.1 ? Math.max(s, 170) : s;
      // On the way down he takes his gear out as he passes it, so nothing is left hanging on the wall.
      for (const h of PRO) {
        if (h > high - 4 && !cut) break;
        if (cut && (ground || h > s - 6)) continue;
        gear.push([Math.round(route(h)) + (h < H1 ? 0 : 4), h]);
      }
      if (cut) seg(route(HS) + 1, HS + 2, route(HS) + 1, -2, 0, 0);
      else {
        seg(BX + brake[0], bs - brake[1] - 1, BX - 10, BS - 13, 0, 0);
        let px = BX + grip[0], ph = bs - grip[1] + 1;
        if (ground && gbm) {
          // His end of the rope lies on the grass until he picks it up; then it is in his hand, then at his waist.
          const waist = [gx + (gflip ? -2 : 2), gs + 8], k = me.mode === 'pick' ? smooth(0.4, 1, u) : me.mode === 'walk' ? 0 : 1;
          if (k <= 0) { seg(px, ph, BX + 9, END[1], 0, 0); seg(BX + 9, END[1], END[0], END[1], 0, 0); }
          else seg(px, ph, lerp(END[0], waist[0], k), lerp(END[1], waist[1], k), 0, 3);
        }
        else { for (const [x, h] of gear) { seg(px, ph, x, h, 1.5, 0); px = x; ph = h; } seg(px, ph, route(s), s - 1, 1.5, 0); }
      }
      for (let i = 0; i < pts.length; i += 2) { const x = pts[i], y = pts[i + 1]; scr.set(x - 1, y, INK); scr.set(x + 1, y, INK); scr.set(x, y - 1, INK); scr.set(x, y + 1, INK); }
      for (let i = 0; i < pts.length; i += 2) scr.set(pts[i], pts[i + 1], (i >> 1) % 5 ? R.teal[2] : R.white[1]);
      for (const [x, h] of gear) if (h !== H1 && h !== H2 && h !== H3) { const y = rowOf(h); scr.set(x - camX, y, R.rock[4]); scr.set(x - camX, y + 1, h < H1 ? R.red[1] : R.rock[2]); scr.set(x - camX - 1, y, INK); scr.set(x - camX + 1, y + 1, INK); }
      // The hold that breaks on the second pitch: there before, a pale scar after, falling in between.
      { const fx = Math.round(route(FLAKE)) + 6 - camX, fy = rowOf(FLAKE); if (tau < T_BREAK) { scr.set(fx, fy, R.gold[6]); scr.set(fx + 1, fy, R.gold[6]); scr.set(fx, fy + 1, R.gold[1]); scr.set(fx + 1, fy + 1, R.gold[1]); } else { scr.set(fx, fy, R.gold[6]); scr.set(fx + 1, fy + 1, R.gold[5]); const u = tau - T_BREAK; if (u < 1.2) { const yy = fy + Math.round(240 * u * u), xx = fx + Math.round(u * 14); scr.set(xx, yy, R.gold[3]); scr.set(xx + ((Math.floor(u * 20) & 1) ? 1 : 0), yy + ((Math.floor(u * 20) & 1) ? 0 : 1), R.gold[1]); } } }

      list.length = 0;
      for (const th of things) if (th.x + 40 > camX && th.x - 40 < camX + VW) list.push(th);
      list.sort((a, b) => b.s - a.s);
      for (const th of list) {
        const sx = th.x - camX, sy = rowOf(th.s);
        if (th.tree) for (const part of th.tree.parts) scr.blit(part.bm, sx + part.x, sy + part.y); else scr.put(th.bm, sx, sy, false);
      }
      // Swifts work the face.
      for (let k = 0; k < 4; k++) { const a = t * (0.7 + k * 0.13) + k * 2; scr.put(swift[(Math.floor(t * 7) + k) & 1], RX - 120 + k * 60 + Math.sin(a) * 90 - camX, rowOf(110 + k * 70 + Math.sin(a * 1.7) * 30), Math.cos(a) < 0); }

      // The two at the foot. He walks in and out behind the belayer, and climbs in front.
      // The one sitting holds a hand up for him when he comes over after the rappel.
      pair.snack(scr, 1 - st.who, SX - camX, rowOf(SS), t, me.mode === 'five1' && u > 0.15 && u < 0.8 ? (u > 0.4 && u < 0.65 ? 2 : 1) : 0);
      if (!cut) scr.put(pair.pile, BX - 10 - camX, rowOf(BS - 14), false);
      const belayer = () => { scr.shadow(BX - camX, rowOf(BS - 13), 6, 1); if (bside) scr.put(bside, BX + 3 - camX, rowOf(BS - 13), false); else scr.put(bf, BX - camX, rowOf(bs), false); };
      const behind = ground && gbm;
      if (!behind) belayer();

      // Himself.
      const mx = route(s) - camX, my = rowOf(s);
      let bm, by = my, bx = mx, flip = false;
      const stopId = env.shown && !env.moving && stand[env.shown] ? env.shown : null;
      if (behind) { bm = gbm; bx = Math.round(gx) - camX; by = rowOf(gs); flip = gflip; }
      else if (stopId) {
        // Standing on a ledge his feet are on it, which is where they were when he climbed onto it.
        bm = stand[stopId]; by = rowOf(stopId === 'summit' ? TOP : s - LEG);
      } else if (me.mode === 'fall') bm = backFig('wall', { hands: [[-8, -13 - (Math.floor(t * 20) & 1)], [8, -14]], feet: [[-7, 9], [7, 8 + (Math.floor(t * 20) & 1)]], tilt: 1 });
      else if (me.mode === 'hang') { const sw = Math.round(Math.sin(me.u * 9) * 3 * (1 - me.u)); bx += sw; bm = backFig('wall', { hands: [[-1, -13], [1, -10]], feet: [[-4, 12], [4, 11]] }); by += Math.round(Math.sin(me.u * 12) * 2 * (1 - me.u)); }
      else if (me.mode === 'rappel') { const hop = frac(tau * 2.2); bm = backFig('wall', { hands: [[-1, -5], [2, 1]], feet: [[-7, hop < 0.5 ? 4 : 7], [7, hop < 0.5 ? 4 : 7]], headY: 1 }); bx += 1; }
      else {
        const l = limbs(s);
        if (me.mode === 'roof') { const sw = Math.round(Math.sin(tau * 9) * 3); l.feet = [[-3 + sw, 12], [3 + sw, 11]]; }
        bm = backFig('wall', l);
      }
      scr.put(bm, bx, by, flip);
      if (behind) belayer();
      // Where hands meet: the fist bump, the slap with the one sitting, the high five with the belayer.
      if (me.mode === 'bump') spark(scr, TIE - 8 - camX, rowOf(-2), (u - 0.45) * 0.8);
      if (me.mode === 'five1') spark(scr, RX + 30 - camX, rowOf(2), (u - 0.4) * 0.7);
      if (me.mode === 'five2') spark(scr, TIE - 8 - camX, rowOf(4), (u - 0.4) * 0.7);
      focus.x = Math.round(bx); focus.y = Math.round(by) - 10;
      // The flag goes in on the summit and stays.
      if (cut || env.done.stack) scr.blit(flag[Math.floor(t * 5) & 1], Math.round(route(HS)) + 9 - camX, rowOf(HS + 4) - 15);
    }
  };
}
