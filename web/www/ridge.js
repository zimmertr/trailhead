// The West Ridge of Proficiency Peak (section H), seen side-on from the south: the ridge rises left to
// right from a low knob of black blocks to the pale summit tower, and the three of them climb it in
// five pitches. Everything is worked out from how far along the scene is, so the timeline can be
// dragged either way. Heights (h) are measured up from the foot of the first pitch.
//
// The rock is built from blocks, the way the ridge is: each block a rounded or squared shape lit from
// the upper left, painted back to front, with a dark joint wherever one block meets another and an ink
// line against the sky. The lower ridge (pitches 1 to 4) is dark granite blotched with black lichen,
// with lime and rust patches; the tower is pale cream with long vertical cracks. Every landmark of the
// pitch list in ROUND4.md section 5 is one or more blocks below, in the order the route meets them.
import { clamp, lerp, smooth, frac, hash, vnoise, fbm, bayer, rng, R, INK, pick, BM, outline, DEBUG } from './core.js';
import { goat } from './fauna.js';
import { Strip, drawStrip, baseline, shell } from './side.js';
import { makeConifer, makeCloud, makeHuckleberry, huckClumps } from './sprites.js';
import { sideFig, frontFig, backFig, FEET, HANDS, KITS } from './tj.js';
import { makeCragPair, PAIR } from './people.js';
import { NAMES } from './content.js';

const W = 1500, UP = 520, DOWN = 380;
// The foot of the face: level with the start at the left, falling away to the right, so the drop
// under the climbers grows as they go.
const foot = x => x < 236 ? 8 : 8 - (x - 236) * 0.2 - 10 * vnoise(x / 40, 1, 700);
// The approach: a low knob of jumbled blocks and dwarf pine before the ridge starts.
const knob = x => 22 * Math.exp(-(((x - 112) / 48) ** 2)) + 4 * vnoise(x / 9, 2, 700) - 2;

// The landmarks, left to right. kind: dark (lower ridge), pale (tower), white (pitch 1's band), slab
// (pitch 3's tilted face). a, b: half width and half height; b2 the lower half's height when it
// differs (the egg); p: 2 is round, higher is squarer, below 2 is pointed; tilt in radians.
const LANDMARKS = {
  balanced: [{ x: 116, h: 27, a: 4, b: 4, p: 3, kind: 'plain', tone: 0.36 }, { x: 117, h: 37, a: 8, b: 6, p: 2.3, kind: 'pale', tone: 0.72 }],
  overhang: [{ x: 214, h: 9, a: 6, b: 8, p: 4, kind: 'plain', tone: 0.3 }, { x: 222, h: 21, a: 18, b: 6, p: 5, kind: 'plain', tone: 0.42, tilt: 0.06 }],
  roof: [{ x: 300, h: 136, a: 13, b: 9, p: 5, kind: 'plain', tone: 0.4 }, { x: 316, h: 149, a: 19, b: 7, p: 7, kind: 'plain', tone: 0.48 }, { x: 330, h: 162, a: 15, b: 7, p: 7, kind: 'plain', tone: 0.44, tilt: -0.05 }, { x: 318, h: 173, a: 11, b: 6, p: 6, kind: 'plain', tone: 0.5 }],
  corner: [{ x: 343, h: 164, a: 10, b: 15, p: 3.4, kind: 'plain', tone: 0.42 }, { x: 365, h: 167, a: 11, b: 16, p: 3.4, kind: 'plain', tone: 0.38 }],
  roof2: [{ x: 360, h: 188, a: 18, b: 7, p: 5, kind: 'plain', tone: 0.46, tilt: -0.04 }],
  gendarmes: [{ x: 396, h: 188, a: 12, b: 18, p: 4, kind: 'plain', tone: 0.36, tilt: 0.08 }, { x: 418, h: 192, a: 10, b: 21, p: 3.6, kind: 'plain', tone: 0.42, tilt: -0.06 }],
  step: [{ x: 440, h: 186, a: 9, b: 10, p: 2.4, kind: 'plain', tone: 0.44 }, { x: 461, h: 184, a: 6, b: 10, p: 4, kind: 'plain', tone: 0.3 }, { x: 470, h: 197, a: 16, b: 4, p: 8, kind: 'plain', tone: 0.55 }],
  platform: [{ x: 512, h: 195, a: 27, b: 7, p: 8, kind: 'plain', tone: 0.5 }, { x: 495, h: 205, a: 3, b: 4, p: 1.5, kind: 'plain', tone: 0.5 }, { x: 523, h: 206, a: 3, b: 5, p: 1.5, kind: 'plain', tone: 0.46 }],
  lip: [{ x: 594, h: 268, a: 12, b: 9, p: 2.4, kind: 'plain', tone: 0.44 }, { x: 610, h: 276, a: 12, b: 8, p: 2.2, kind: 'plain', tone: 0.4, tilt: 0.1 }],
  sidewalk: [{ x: 628, h: 256, a: 28, b: 6, p: 8, kind: 'plain', tone: 0.5 }],
  downclimb: [{ x: 664, h: 247, a: 12, b: 12, p: 3, kind: 'plain', tone: 0.4, tilt: -0.3 }],
  flake: [{ x: 694, h: 232, a: 17, b: 5, p: 7, kind: 'plain', tone: 0.5 }, { x: 686, h: 250, a: 5, b: 15, p: 2.2, kind: 'plain', tone: 0.52, tilt: 0.12 }],
  egg: [{ x: 722, h: 243, a: 16, b: 8, p: 5, kind: 'plain', tone: 0.4 }, { x: 742, h: 247, a: 12, b: 10, p: 4, kind: 'plain', tone: 0.36 }, { x: 731, h: 271, a: 15, b: 21, b2: 15, p: 2, kind: 'dark', tone: 0.5, tilt: -0.14 }],
  fins: [{ x: 774, h: 250, a: 13, b: 18, p: 1.25, kind: 'dark', tone: 0.46 }, { x: 799, h: 252, a: 12, b: 19, p: 1.25, kind: 'dark', tone: 0.5 }, { x: 823, h: 250, a: 11, b: 18, p: 1.25, kind: 'dark', tone: 0.44 }],
  downslab: [{ x: 857, h: 250, a: 18, b: 4, p: 6, kind: 'slab', tone: 0.5, tilt: -0.55 }],
  ledge: [{ x: 948, h: 263, a: 8, b: 13, p: 3, kind: 'plain', tone: 0.38 }, { x: 968, h: 267, a: 7, b: 14, p: 3, kind: 'plain', tone: 0.42 }, { x: 958, h: 246, a: 25, b: 6, p: 7, kind: 'plain', tone: 0.5 }, { x: 981, h: 257, a: 3, b: 5, p: 1.5, kind: 'plain', tone: 0.48 }],
  scramble: [{ x: 993, h: 262, a: 10, b: 8, p: 5, kind: 'plain', tone: 0.44 }, { x: 1001, h: 277, a: 9, b: 7, p: 5, kind: 'pale', tone: 0.6 }],
  capblock: [{ x: 1052, h: 374, a: 9, b: 6, p: 7, kind: 'pale', tone: 0.72 }],
  liebackflake: [{ x: 1030, h: 398, a: 6, b: 14, p: 2.2, kind: 'pale', tone: 0.74, tilt: -0.22 }, { x: 1040, h: 410, a: 11, b: 3, p: 8, kind: 'pale', tone: 0.78 }],
  pillars: [{ x: 1039, h: 430, a: 7, b: 19, p: 4, kind: 'pale', tone: 0.62, tilt: 0.08 }, { x: 1061, h: 430, a: 7, b: 18, p: 4, kind: 'pale', tone: 0.68 }, { x: 1050, h: 444, a: 5, b: 3, p: 3, kind: 'pale', tone: 0.5 }],
  summit: [{ x: 1044, h: 452, a: 12, b: 7, p: 4, kind: 'pale', tone: 0.66 }, { x: 1070, h: 456, a: 14, b: 8, p: 4, kind: 'pale', tone: 0.7 }, { x: 1093, h: 452, a: 11, b: 7, p: 4, kind: 'pale', tone: 0.62 }, { x: 1072, h: 469, a: 10, b: 7, p: 2.4, kind: 'pale', tone: 0.6, blotch: true }]
};

// The big faces under the landmarks: where the rock mass reaches up to, left to right. The lower ridge
// in broken, tilted steps, then the pale tower and its sheer south face, the second spire behind it.
const LOW = [[150, 4], [236, 10], [256, 62], [282, 118], [300, 128], [338, 146], [372, 172], [430, 172], [452, 182], [500, 188], [534, 194], [556, 236], [578, 262], [590, 258], [640, 250], [660, 236], [700, 232], [760, 244], [850, 246], [880, 240], [940, 240], [996, 252], [1004, 262]];
const TOWER = [[984, 256], [996, 290], [1008, 386], [1024, 388], [1030, 410], [1046, 412], [1048, 446], [1100, 446], [1112, 436], [1124, 360], [1140, 240], [1162, 110], [1186, 0]];
const along = (pts, x) => { for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, h0] = pts[i - 1], [x1, h1] = pts[i]; return lerp(h0, h1, (x - x0) / (x1 - x0)); } return null; };

function paintRidge(S) {
  const ID = new Uint16Array(S.w * S.h), at = (x, h) => (Math.round(-h) + S.up) * S.w + Math.round(x);
  const inside = (x, h) => x >= 0 && x < S.w && -h + S.up >= 0 && -h + S.up < S.h;
  // Texture by kind of rock, at a tone t from 0 (shadow) to 1 (lit).
  const tex = (kind, x, h, t) => {
    if (kind === 'white') return t > 0.9 ? R.gold[6] : t > 0.62 ? pick('white', (t - 0.62) / 0.3, x, h) : pick('gold', t + 0.2, x, h);
    if (kind === 'slab') return hash(x, h, 711) < 0.035 ? (hash(x, h, 712) < 0.5 ? INK : R.rock[0]) : pick('rock', 0.55 + t * 0.4, x, h);
    if (kind === 'pale') {
      if (vnoise(x / 2.6, h / 34, 705) > 0.86 && hash(x, h, 706) < 0.4) return R.moss[5];
      if (hash(x, h, 707) < 0.025) return R.granite[1];
      return t > 0.94 ? R.gold[6] : pick('granite', 0.32 + t * 0.66, x, h);
    }
    // Pitch 1's crack sits in a band of almost white rock.
    const d = x - (250 + 0.36 * h + 2 * Math.sin(h / 9));
    if (h > 6 && h < 106 && d > -10 - 3 * vnoise(h / 8, 5, 725) && d < 13 + 3 * vnoise(h / 8, 6, 725)) return tex('white', x, h, t + 0.3 - (d > 8 ? 0.12 : 0));
    // Black lichen in blotches, white specks, lime and rust patches: salt and pepper from afar.
    const l = kind === 'plain' ? 0 : fbm(x / 10, h / 10, 701, 3);
    if (l > 0.64) return hash(x, h, 702) < 0.35 ? INK : R.rock[0];
    if (l > 0.6 && bayer(x, h) < 0.5) return R.rock[0];
    if (hash(x, h, 703) < 0.025) return R.rock[4];
    if (fbm(x / 11, h / 11, 704, 2) > 0.82) return pick('moss', 0.72 + 0.2 * hash(x, h, 708), x, h);
    if (fbm(x / 9, h / 9, 709, 2) > 0.83) return hash(x, h, 710) < 0.5 ? R.tent[0] : R.dirt[1];
    return pick('rock', t, x, h);
  };
  let nid = 10;
  const PALE = new Uint8Array(65536);
  const put = (x, h, c, id) => { if (!inside(x, h)) return; S.set(x, -h, c); ID[at(x, h)] = id; };
  function block(o) {
    const id = ++nid; PALE[id] = o.kind === 'pale' ? 1 : 0; const { a, b, p } = o, b2 = o.b2 || b, ca = Math.cos(o.tilt || 0), sa = Math.sin(o.tilt || 0), r0 = Math.ceil(Math.max(a, b, b2) * 1.45);
    for (let h = Math.floor(o.h - r0); h <= o.h + r0; h++) for (let x = Math.floor(o.x - r0); x <= o.x + r0; x++) {
      const dx = x - o.x, dh = h - o.h, u = dx * ca + dh * sa, v = -dx * sa + dh * ca, bb = v >= 0 ? b : b2;
      // An angular outline: the edge pushed in and out by a few broad bumps round the block.
      const r = Math.pow(Math.abs(u) / a, p) + Math.pow(Math.abs(v) / bb, p), ang = Math.atan2(v / bb, u / a);
      if (r > 1 + (o.rough ?? 0.3) * (vnoise(ang * 1.6 + 10, id, 716) - 0.5) * 2) continue;
      if (o.sink !== false) { const sf = x >= 150 && x <= 1004 ? along(LOW, x) : x >= 984 && x <= 1185 ? along(TOWER, x) : null; if (sf != null && h < sf - 5) continue; }
      // Lit on its upper left edges, shaded on its lower right ones, flat in the middle; a top that faces
      // the sky is lighter still.
      // Two planes and a top, the way a block of granite catches the light: the face toward the upper
      // left lit, the right side in shade, a top facing the sky lighter still, crisp edges between them.
      const su = u / a, sv = v / bb, k = 0.2 + 0.35 * hash(id, 1, 717), side = su - (k + 0.3 * sv), topf = sv - (0.55 - 0.25 * su);
      let t = o.tone + 0.06 * (vnoise(x / 6, h / 6, 713 + id) - 0.5);
      if (topf > 0) t += topf < 0.08 ? 0.3 : 0.15; else if (side > 0) t -= side < 0.08 ? 0.26 : 0.17; else if (side > -0.1) t += 0.1;
      if (o.blotch && fbm(x / 4, h / 4, 714, 2) > 0.6) { put(x, h, hash(x, h, 715) < 0.5 ? R.rock[1] : R.rock[0], id); continue; }
      put(x, h, tex(o.kind, x, h, t), id);
    }
  }

  // Far right, behind everything: the darker, jagged ridge that carries on east, and the second spire.
  for (let x = 1120; x < W; x++) {
    const top = 150 + 70 * fbm(x / 60, 1, 716, 3) + 40 * Math.abs(Math.sin(x / 23 + 2 * vnoise(x / 30, 2, 717))) - 60 * smooth(1400, 1500, x);
    for (let h = Math.round(top); h > foot(x) - 30; h--) {
      const cell = Math.floor(x / 11 + 0.5 * vnoise(h / 30, 3, 718)), t = 0.2 + 0.18 * hash(cell, 1, 719) + 0.16 * smooth(top - 5, top, h) + 0.08 * (vnoise(x / 3, h / 30, 720) - 0.5);
      put(x, h, frac(x / 11 + 0.5 * vnoise(h / 30, 3, 718)) < 0.08 ? R.rock[0] : pick('rock', t, x, h), 4);
    }
  }
  block({ x: 1170, h: 70, a: 24, b: 190, p: 2.2, kind: 'pale', tone: 0.34, sink: false });

  // The lower ridge and the tower: big facets, each a tilted plane lit from the upper left, with a bright
  // edge where a lit facet meets a darker one and a dark crack on the shadow side. The lower ridge's
  // facets are slabs tilted along its bedding; the tower's are tall pillars. Deeper down the face is
  // in shade.
  const mass = (x0, x1, top, kind, cs, ch, rot, seed, box) => {
    const ca = Math.cos(rot), sa = Math.sin(rot);
    // Most blocks face near the face's own plane; one in five is a ledge facing the sky or a side in shade.
    const litOf = id => { const k = hash(id, 4, seed); let nx = (hash(id, 1, seed) - 0.5) * 0.8, ny = 0.25 + 0.45 * hash(id, 2, seed); if (k < 0.1) ny = 1.3; else if (k < 0.2) nx = 0.9; return (-0.55 * nx + 0.7 * ny + 0.45) / Math.sqrt(nx * nx + ny * ny + 1); };
    for (let x = x0; x <= x1; x++) {
      const tp = top(x); if (tp == null) continue;
      for (let h = Math.round(tp), hb = x < 236 ? knob(x) - 6 : lerp(knob(236) - 6, foot(x) - 46, smooth(236, 330, x)); h > hb; h--) {
        const u = x * ca + h * sa, v = -x * sa + h * ca;
        let top_, bot, lft, rgt, id;
        if (box) {
          // Blocks of every size: the nearest of a jittered grid of points, measured square, so cells come
          // out boxy; which side of the block a pixel is near says how it is lit.
          const iu = Math.floor(u / cs), iv = Math.floor(v / ch);
          let d1 = 1e9, d2 = 1e9, p1u = 0, p1v = 0, p2u = 0, p2v = 0;
          for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
            const cu = iu + i, cv = iv + j, pu = (cu + 0.1 + 0.8 * hash(cu, cv, seed)) * cs, pv = (cv + 0.1 + 0.8 * hash(cu, cv, seed + 1)) * ch;
            const dd = Math.max(Math.abs(u - pu), Math.abs(v - pv) * cs / ch);
            if (dd < d1) { d2 = d1; p2u = p1u; p2v = p1v; d1 = dd; p1u = pu; p1v = pv; id = cu * 7919 + cv; } else if (dd < d2) { d2 = dd; p2u = pu; p2v = pv; }
          }
          const e = (d2 - d1) * ch / cs * 1.2, du = p2u - p1u, dv = (p2v - p1v) * cs / ch;
          top_ = bot = lft = rgt = 99;
          if (Math.abs(dv) > Math.abs(du)) { if (dv > 0) top_ = e; else bot = e; } else { if (du > 0) rgt = e; else lft = e; }
        } else {
          // Joints: wavy bedding rows across the face, cut by cross-joints at their own skew and spacing.
          const rv = v / ch + 0.35 * vnoise(u / 90, 0, seed), iv = Math.floor(rv), fv = rv - iv;
          const w = cs * (0.5 + hash(iv, 0, seed + 3)), sk = 0.5 * (hash(iv, 1, seed + 3) - 0.5);
          const ru = (u + v * sk) / w + hash(iv, 2, seed + 3), iu = Math.floor(ru), fu = ru - iu;
          id = iv * 4099 + iu; top_ = (1 - fv) * ch; bot = fv * ch; lft = fu * w; rgt = (1 - fu) * w;
        }
        let t = 0.14 + 0.7 * litOf(id) - 0.22 * smooth(0, 220, tp - h) + 0.05 * (vnoise(x / 5, h / 5, seed + 2) - 0.5);
        // Each block: its top edge catches the light, a dark crack under it, its left edge lit, its right in shade.
        if (bot < 1.1 || rgt < 0.9) t = -1;
        else if (top_ < 1.3) t += 0.28;
        else if (lft < 1.2) t += 0.12;
        else if (bot < 3.2 || rgt < 2.2) t -= 0.09;
        const kd = kind === 'dark' && hash(id, 3, seed) > 0.35 ? 'plain' : kind;
        put(x, h, t < 0 ? (kind === 'pale' ? R.granite[1] : R.rock[0]) : tex(kd, x, h, t), kind === 'pale' ? 3 : 2);
      }
    }
  };
  mass(150, 1004, x => along(LOW, x) + 3 * vnoise(x / 7, 4, 721) + 5 * Math.abs(vnoise(x / 26, 5, 721) - 0.5), 'dark', 40, 22, -0.22, 750, true);
  // Above the white band the crack widens into the flaring off-width that ends under the roof.
  for (let h = 104; h < 132; h++) for (let x = 286; x < 300; x++) {
    const ow = x - (292 + 0.1 * (h - 106));
    if (ow > -2 - 2 * smooth(122, 132, h) && ow < 2) S.set(x, -h, ow < 1 ? INK : R.rock[1]); else if (ow >= 2 && ow < 3.5) S.set(x, -h, R.rock[4]);
  }
  // Pitch 1's crack up its band of almost white rock.
  for (let h = 8; h < 106; h++) { const x = Math.round(250 + 0.36 * h + 2 * Math.sin(h / 9)); S.set(x, -h, INK); S.set(x + 1, -h, R.gold[6]); }
  mass(984, 1185, x => along(TOWER, x), 'pale', 76, 12, Math.PI / 2 - 0.04, 760);
  // The off-width up the headwall, the finger crack in its open book beside it, and the two chimneys
  // to the summit, the left one closed by the chockstone with the hole under it.
  for (let h = 289; h < 384; h++) { const x = Math.round(1019 + 1.5 * Math.sin(h / 17)); for (let d = -2; d < 2; d++) S.set(x + d, -h, d < 0 ? INK : R.granite[1]); S.set(x + 2, -h, R.gold[6]); }
  for (let h = 291; h < 368; h++) { const x = Math.round(1046 + 0.08 * (h - 290)); S.set(x, -h, INK); for (let d = 1; d < 7; d++) { const c = S.get(x - d, -h); if (c) S.set(x - d, -h, R.granite[Math.max(1, Math.min(3, (hash(x - d, h, 765) * 3) | 0))]); } }
  for (let h = 413; h < 446; h++) for (const [x0, x1] of [[1047, 1053], [1068, 1072]]) for (let x = x0; x <= x1; x++) S.set(x, -h, x === x0 ? R.granite[1] : INK);
  // The approach knob, a heap of small black blocks, before the landmarks go on top.
  for (let x = 30, k = 0; x < 236; x += 9 + 9 * hash(k, 4, 732), k++) block({ x, h: knob(x) - 3, a: 6 + 6 * hash(k, 5, 732), b: 5 + 4 * hash(k, 6, 732), p: 2.4 + 2 * hash(k, 7, 732), kind: 'plain', tone: 0.3 + 0.16 * hash(k, 8, 732) });
  const taken = x => Object.values(LANDMARKS).flat().some(o => Math.abs(o.x - x) < o.a + 4);
  for (let x = 240, k = 0; x < 990; k++) {
    const a = 5 + 9 * hash(k, 1, 718), cx = x + a;
    if (!taken(cx)) block({ x: cx, h: along(LOW, cx) + 1, a, b: 4 + 6 * hash(k, 2, 718), p: 2.2 + 2.5 * hash(k, 3, 718), tilt: 0.4 * (hash(k, 4, 718) - 0.5), kind: hash(k, 5, 718) < 0.4 ? 'dark' : 'plain', tone: 0.34 + 0.16 * hash(k, 6, 718) });
    x += 2 * a - 2;
  }
  for (const name in LANDMARKS) for (const o of LANDMARKS[name]) block(o);
  // The slab of pitch 3: a tilted pale triangle whose left edge is the arete, flecked black.
  { const id = ++nid;
    for (let h = 196; h <= 268; h++) for (let x = 528; x <= 590; x++) {
      const k = (h - 196) / 72, xl = lerp(530, 577, k), xr = lerp(590, 580, k);
      if (x < xl || x > xr) continue;
      const t = 0.62 + 0.08 * (vnoise(x / 9, h / 5, 733) - 0.5) - 0.12 * smooth(xr - 6, xr, x) + (x - xl < 1.5 ? 0.3 : 0);
      put(x, h, x - xl < 1 ? R.rock[4] : tex('slab', x, h, t), id);
    } }

  // Joints and outlines: a dark line wherever one block meets another, ink against the sky.
  for (let y = 1; y < S.h - 1; y++) for (let x = 1; x < S.w - 1; x++) {
    const i = y * S.w + x, id = ID[i];
    if (!id) { if (!S.d[i] && (ID[i + 1] || ID[i - 1] || ID[i + S.w])) S.d[i] = INK; continue; }
    if (id < 10) continue;
    const up = ID[i - S.w], left = ID[i - 1];
    if ((up >= 10 && up !== id) || (left >= 10 && left !== id)) S.d[i] = PALE[id] || PALE[up] ? R.granite[1] : R.rock[0];
  }
  return ID;
}

// The ground: the knob's heather and dwarf pine at the left, talus and larches under the face.
function paintGround(S, things) {
  const rand = rng(735), grass = {};
  for (let x = 0; x < W; x++) {
    const f = x < 236 ? knob(x) : lerp(knob(236) - 4, foot(x) - 30, smooth(236, 330, x));
    for (let h = Math.round(f); h > -DOWN; h--) {
      if (S.get(x, -h)) continue;
      const depth = f - h, tal = (x > 220 ? 0.85 : 0.35) * smooth(0, 30, depth) * smooth(220, 40, depth);
      let c;
      if (hash(x >> 1, h >> 1, 736) < tal) c = pick('rock', 0.25 + 0.6 * hash(x >> 1, h >> 1, 737), x, h);
      else if (fbm(x / 26, h / 10, 748, 3) > 0.62) c = pick('rock', 0.5 + 0.3 * (fbm(x / 9, h / 5, 749, 2) - 0.5) - smooth(0, 300, depth) * 0.2, x, h, 0.6);
      else { grass[x + '.' + h] = 1; c = pick(fbm(x / 20, h / 9, 738, 2) > 0.55 ? 'moss' : 'grass', 0.45 + 0.4 * (fbm(x / 22, h / 12, 739, 3) - 0.5) - smooth(0, 300, depth) * 0.25, x, h, 0.35); }
      if (depth < 1.5 && !(hash(x >> 1, h >> 1, 736) < tal)) c = R.moss[2];
      S.set(x, -h, c);
    }
  }
  // Red huckleberry (round 5, T65): shrubs in clumps where the heather used to be painted red, and only
  // where a shrub's whole foot is on grass. The lower ones are nearer and bigger.
  const hucks = [0, 1, 2, 3, 4, 5].map(i => [0.8, 1.05, 1.35, 1.7].map(s => makeHuckleberry(680 + i, s)));
  for (const p of huckClumps(0, W, -40, DOWN, (x, y) => fbm(x / 9, -y / 4, 747, 3), (x, y) => [-5, 0, 5].every(d => grass[(x + d) + '.' + (-y)] && grass[(x + d) + '.' + (-y + 3)]), 750))
    S.stamp(hucks[p.v][p.s + (p.y > 120 ? 1 : 0)], p.x, p.y, p.flip);
  // Dwarf pine in knee-high mats on the knob and in the cracks low on the ridge; larches below.
  for (let n = 0; n < 40; n++) { const x = 20 + rand() * 240, h = (x < 236 ? knob(x) : along(LOW, x)) - rand() * 6; things.push({ pine: 3 + rand() * 5, x: Math.round(x), h: Math.round(h) }); }
  for (let n = 0; n < 22; n++) { const x = 250 + rand() * 900, f = foot(x) - 34 - rand() * 160, H = 14 + rand() * 26; things.push({ tree: makeConifer(740 + n, Math.round(H), Math.round(H / 2.6), 'larch', Math.max(4, Math.round(H / 3.2)), { ragged: 0.2, droop: 0.6 }), x: Math.round(x), h: Math.round(f) }); }
  flagLarch(S, 223, Math.round(knob(223)) - 1, 24, 739);
  // A few small larches rooted in cracks on the face, and grass in tufts along the crest and its ledges.
  // These are wind-flagged: a crooked trunk leaning east with its gold tufts mostly on the downwind side,
  // painted into the rock so they read as trees clinging to a crack, not as small standing statues.
  for (let x = 300 + rand() * 60; x < 960; x += 70 + rand() * 90) { const H = 9 + Math.round(rand() * 9); flagLarch(S, Math.round(x), Math.round(along(LOW, x) - 18 - rand() * 70), H, Math.round(x)); }
  for (let x = 250 + rand() * 20; x < 1000; x += 14 + rand() * 40) things.push({ tuft: 2 + Math.round(rand() * 3), x: Math.round(x), h: Math.round(along(LOW, x) + 2 - (rand() < 0.5 ? 0 : 20 + rand() * 80)) });
}

// Far peaks for now (H12 replaces them with the basin far below).
function paintFar() {
  const S = new Strip(900, 220, 10);
  for (let x = 0; x < 900; x++) {
    const top = -50 - 85 * fbm(x / 80, 1, 741, 4) - 30 * Math.abs(Math.sin(x / 37 + vnoise(x / 50, 2, 742)));
    for (let y = Math.round(top); y < 10; y++) S.set(x, y, y - top < 3 + 4 * vnoise(x / 5, 3, 743) && top < -100 ? R.farsnow[1] : pick('far', 0.5 + 0.3 * (vnoise(x / 6, y / 14, 744) - 0.5) - (y - top) * 0.002, x, y));
  }
  return S;
}

// A small larch flagged by the wind, painted straight into the strip at x, h (its root).
// The basin far below (H12): the larch basin he walked through, seen from the ridge, in the blue of
// distance like the far range but nearer, so it sinks faster as he climbs. Other granite peaks of
// the group stand up out of it; under them the basin's granite benches step down, each with a lit lip
// and a shaded riser; tarns lie on the benches; and the larches are gold dots in drifts along the
// benches and round the tarns. Placed by rule: peaks spread across the strip, tarns on bench flats,
// larches where the bench is flat and dry.
// Round 5, T70: one large tarn lies in the bottom of the basin, like Shield Lake under Prusik Peak, where
// the basin shows left of the ridge on the first two pitches. It has a ragged shore with bays, a granite
// point and an island, a dark far bank and pale slabs along the near one, larches thick round it, and an
// outlet that runs down the benches through two smaller tarns.
const LAKE = { x: 425, y: 62, a: 100, b: 12, point: 40, isle: -46 };
const lakeMid = x => LAKE.y + 4 * Math.sin((x - LAKE.x) / 46) + 6 * (vnoise(x / 50, 4, 781) - 0.5);
const lakeSpan = x => {
  const u = (x - LAKE.x) / LAKE.a; if (Math.abs(u) >= 1) return null;
  const hb = LAKE.b * Math.pow(1 - u * u, 0.55) * (0.55 + 0.9 * fbm(x / 30, 2, 782, 3)), m = lakeMid(x);
  return [m - 0.7 * hb, m + 1.3 * hb];
};
function inLake(x, y) {
  const sp = lakeSpan(x); if (!sp || y < sp[0] || y > sp[1]) return false;
  const pt = 1 - Math.abs(x - (LAKE.x + LAKE.point) - 0.8 * (sp[1] - y)) / 15; if (pt > 0 && y > sp[1] - (sp[1] - sp[0]) * 0.42 * Math.min(1, 2.4 * pt)) return false;
  return ((x - (LAKE.x + LAKE.isle)) / 9) ** 2 + ((y - (sp[0] + sp[1]) / 2 - 1) / 2.4) ** 2 >= 1;
}
function paintBasin() {
  const BW = 1200, S = new Strip(BW, 200, 260), rand = rng(760);
  const peaks = []; for (let k = 0; k < 5; k++) peaks.push({ x: 110 + k * 240 + 70 * hash(k, 1, 761), h: 50 + 60 * hash(k, 2, 761), w: 60 + 50 * hash(k, 3, 761) });
  const edge = x => 30 + 6 * vnoise(x / 40, 1, 762);
  for (let x = 0; x < BW; x++) {
    let h = 22 + 10 * fbm(x / 50, 1, 763, 3), lean = 0;
    for (const p of peaks) for (const dx of [x - p.x, x - p.x - BW, x - p.x + BW]) {
      const u = 1 - Math.abs(dx) / p.w; if (u <= 0) continue;
      const ph = p.h * Math.pow(u, 1.3) + 9 * (fbm(x / 9, p.h, 764, 3) - 0.5) * u;
      if (ph > h) { h = ph; lean = dx; }
    }
    const top = -Math.round(h), e = edge(x);
    for (let y = top; y < e; y++) {
      // Lit on the side toward the light (left), streaked down the faces, snow in the gullies up high.
      const lit = lean < 0 ? 0.44 : 0.2, t = lit + 0.18 * (vnoise(x / 3, y / 16, 765) - 0.5) - (y - top) * 0.0012;
      const snow = h > 85 && y - top < 4 + 6 * vnoise(x / 4, 2, 766) && vnoise(x / 2.5, y / 9, 767) > 0.45;
      S.set(x, y, snow ? R.farsnow[y - top < 2 ? 1 : 0] : pick('far', t, x, y));
    }
  }
  // The benches: stepped terraces down the basin, nearer ones taller.
  const flats = [];
  for (let x = 0; x < BW; x++) {
    const e = Math.round(edge(x));
    for (let y = e; y < 260; y++) {
      const v = (y - e) / 22 + 0.5 * vnoise(x / 70, 3, 768), b = Math.floor(v), u = v - b;
      let c;
      // A lit lip, a shaded riser, then the bench's flat, with the pale bare granite slabs the basin is
      // known for showing through in patches.
      // The lips are broken into ledges (unbroken, they read as swell on a sea: TJ, round 5).
      if (u < 0.1 && vnoise(x / 17, b * 7.3, 787) > 0.4) c = R.far[3]; else if (u < 0.32) c = pick('far', 0.04 + 0.08 * vnoise(x / 3, y, 769), x, y);
      else { const slab = fbm(x / 14, y / 5, 773, 3); c = slab > 0.64 ? (bayer(x, y) < (slab - 0.64) * 3 ? R.far[3] : R.far[2]) : pick('far', 0.32 + 0.16 * (vnoise(x / 11, y / 5, 770) - 0.5), x, y); if (u > 0.4 && u < 0.85 && (x & 3) === 0 && (y & 1) === 0) flats.push([x, y, b]); }
      S.set(x, y, c);
    }
  }
  const tree = (x, y) => {
    if (rand() < 0.1) { S.set(x, y, R.conifer[1]); S.set(x, y - 1, R.conifer[2]); S.set(x, y - 2, R.conifer[2]); return; }
    S.set(x, y, R.larch[1]); S.set(x, y - 1, R.larch[rand() < 0.5 ? 2 : 3]); S.set(x, y - 2, R.larch[rand() < 0.4 ? 4 : 3]); if (rand() < 0.5) S.set(x + 1, y - 1, R.larch[2]);
  };
  const pool = (x, y, a, b) => {
    for (let dy = -Math.ceil(b); dy <= Math.ceil(b); dy++) for (let dx = -Math.ceil(a); dx <= Math.ceil(a); dx++) {
      const q = (dx / a) ** 2 + (dy / b) ** 2; if (q > 1) continue;
      S.set(x + dx, y + dy, q > 0.75 && dy < 0 ? R.tarn[5] : dy === Math.round(-b * 0.3) && Math.abs(dx) < a * 0.5 ? R.tarn[5] : R.tarn[q < 0.3 ? 3 : 4]);
    }
  };
  // The large tarn. First the flat it lies on: the benches' lips and risers are cleared round it.
  const X0 = LAKE.x - LAKE.a - 30, X1 = LAKE.x + LAKE.a + 30, Y0 = LAKE.y - 26, Y1 = LAKE.y + 34;
  for (let x = X0; x <= X1; x++) for (let y = Y0; y <= Y1; y++) {
    const g = ((x - LAKE.x) / (LAKE.a + 26)) ** 2 + ((y - LAKE.y - 4) / (LAKE.b + 15)) ** 2;
    if (y < edge(x) + 3 || g > 0.8 + 0.35 * vnoise(x / 15, y / 5, 785)) continue;
    const slab = fbm(x / 14, y / 5, 773, 3);
    S.set(x, y, slab > 0.6 ? (bayer(x, y) < (slab - 0.6) * 3 ? R.far[3] : R.far[2]) : pick('far', 0.34 + 0.16 * (vnoise(x / 11, y / 5, 770) - 0.5), x, y));
  }
  // The water: the sky's light along the far shore, deeper toward the near one, a few bright streaks.
  for (let x = X0; x <= X1; x++) for (let y = Y0; y <= Y1; y++) {
    if (!inLake(x, y)) continue;
    const sp = lakeSpan(x), f = (y - sp[0]) / (sp[1] - sp[0]), n = bayer(x, y);
    let c = f < 0.07 ? R.tarn[5] : f < 0.22 ? (n < (f - 0.07) / 0.15 ? R.tarn[4] : R.tarn[5]) : f < 0.5 ? (n < (f - 0.22) / 0.28 ? R.tarn[3] : R.tarn[4]) : f < 0.82 ? R.tarn[3] : (n < (f - 0.82) / 0.18 ? R.tarn[2] : R.tarn[3]);
    if (f > 0.3 && f < 0.85 && hash(Math.floor((x + y * 5) / 9), y, 784) < 0.12) c = R.tarn[4];
    // The far bank's dark reflection lies along the water under it.
    if (!inLake(x, y - 1) && vnoise(x / 6, 3, 788) > 0.3) c = R.tarn[2];
    S.set(x, y, c);
  }
  // Its banks: dark where the far shore stands over the water, pale slabs along the near shore.
  for (let x = X0; x <= X1; x++) for (let y = Y0; y <= Y1; y++) {
    if (inLake(x, y)) continue;
    if (inLake(x, y + 1)) { S.set(x, y, R.far[0]); if (vnoise(x / 4, 1, 788) > 0.45) S.set(x, y - 1, R.far[0]); }
    else if (inLake(x, y - 1)) { S.set(x, y, R.far[3]); if (vnoise(x / 5, 2, 788) > 0.5) S.set(x, y + 1, R.far[3]); }
  }
  // The outlet: out of the near shore and down the benches, white where it drops over a riser, through
  // two smaller tarns.
  const OUT = [[LAKE.x - 16, 0], [LAKE.x + 2, 98], [LAKE.x + 38, 130]]; OUT[0][1] = Math.round(lakeSpan(OUT[0][0])[1]);
  for (let k = 1; k < OUT.length; k++) {
    const [ax, ay] = OUT[k - 1], [bx, by] = OUT[k];
    for (let y = ay; y <= by; y++) {
      const x = Math.round(lerp(ax, bx, (y - ay) / (by - ay)) + 3 * (vnoise(y / 5, k, 789) - 0.5) * 2), v = (y - Math.round(edge(x))) / 22 + 0.5 * vnoise(x / 70, 3, 768), u = v - Math.floor(v);
      if (!inLake(x, y)) S.set(x, y, u < 0.32 ? R.farsnow[1] : R.tarn[4]);
    }
  }
  const tarns = [{ x: LAKE.x, y: LAKE.y + 4, a: LAKE.a, b: 16, lake: true }, { x: OUT[1][0], y: OUT[1][1], a: 20, b: 3.2 }, { x: OUT[2][0], y: OUT[2][1], a: 27, b: 4.2 }];
  for (const t of tarns) if (!t.lake) pool(t.x, t.y, t.a, t.b);
  // Larches thick along both shores in clumps, a few on the point and the island.
  for (let i = 0; i < 230; i++) {
    const x = Math.round(LAKE.x + (rand() * 2 - 1) * (LAKE.a + 16)), far = rand() < 0.5, sp = lakeSpan(x) || [lakeMid(x), lakeMid(x)];
    const y = Math.round(far ? sp[0] - 2 - rand() * 6 : sp[1] + 3 + rand() * 9);
    if (vnoise(x / 20, far ? 1 : 2, 786) < 0.36 || y < edge(x) + 4 || inLake(x, y) || inLake(x, y - 2)) continue;
    tree(x, y);
  }
  for (const [dx, n] of [[LAKE.point, 5], [LAKE.isle, 4]]) for (let j = 0; j < n; j++) {
    const x = Math.round(LAKE.x + dx + (rand() - 0.5) * (dx === LAKE.isle ? 12 : 8)), sp = lakeSpan(x), y = Math.round(dx === LAKE.isle ? (sp[0] + sp[1]) / 2 + 1 : sp[1] - rand() * 4);
    if (!inLake(x, y) && !inLake(x, y - 1)) tree(x, y);
  }
  // Tarns, one on each of a few benches, turquoise with the sky's light along the far shore.
  for (let k = 0; k < 7; k++) {
    const [x, y] = flats[Math.floor(hash(k, 4, 771) * flats.length)], a = 14 + 22 * hash(k, 5, 771), b = 2.5 + 2.5 * hash(k, 6, 771);
    if (tarns.some(t => Math.abs(t.x - x) < t.a + a + 20 && Math.abs(t.y - y) < 18)) continue;
    tarns.push({ x, y, a, b }); pool(x, y, a, b);
  }
  // Larches: gold dots in drifts, thicker near the tarns, never on the water.
  // Each drift is a loose clump of a few trees; each tree a lit gold top over a deeper gold, a few of
  // them dark firs among the larches.
  for (let i = 0; i < 420; i++) {
    const [cx0, cy0] = flats[Math.floor(rand() * flats.length)];
    const near = tarns.some(t => Math.abs(cx0 - t.x) < t.a + 30 && Math.abs(cy0 - t.y) < 14);
    if (!near && vnoise(cx0 / 30, cy0 / 12, 772) < 0.45) continue;
    const n = 3 + Math.floor(rand() * 7);
    for (let j = 0; j < n; j++) {
      const x = Math.round(cx0 + (rand() - 0.5) * 18), y = Math.round(cy0 + (rand() - 0.5) * 5);
      if (tarns.some(t => t.lake ? inLake(x, y) || inLake(x, y - 2) : ((x - t.x) / (t.a + 2)) ** 2 + ((y - t.y) / (t.b + 2)) ** 2 < 1)) continue;
      tree(x, y);
    }
  }
  return S;
}
// The inversion (H13): from mid-height cloud gathers in the basin's hollows, first in patches, then
// filling it, until by the top they look down on a sea of cloud with peaks standing out of it. top is
// the screen row of the sea's surface, c how far it has gathered (0 to 1), sx the basin's scroll, so
// the billows stay with the ground under them and drift slowly east.
// rec, if given, gets the row of the surface in each column. mask, if given, is { snap, tops }: the
// screen as it was just after the far sea was drawn and that sea's surface rows; below its surface this
// sea is then drawn only over what was drawn in front of it since (rock, ground), so the near part of
// the sea and the far part read as one (round 5, T74).
function cloudSea(scr, top, c, t, sx, bot = 1e9, rec = null, mask = null) {
  if (c <= 0) { if (rec) rec.fill(32767); return; }
  const { VW, VH, fb } = scr;
  for (let x = 0; x < VW; x++) {
    const wx = x + sx, d = clamp((c * 1.8 - vnoise(wx / 150, 5, 775)) / 0.6, -1, 1);
    // Where it has not yet gathered the surface sags into a hollow; elsewhere it rises in rounded
    // billows that drift slowly east.
    const bil = 5 * vnoise(wx / 21 - t * 0.04, 1, 776) + 3 * Math.abs(Math.sin(wx / 7 + 3 * vnoise(wx / 30, 3, 776) - t * 0.15)) + 6 * d;
    const y0 = Math.round(top - bil + (d < 0 ? smooth(0, 1, -d) * 45 : 0));
    if (rec) rec[x] = y0;
    if (y0 >= VH) continue;
    cloudCol(fb, VW, VH, x, Math.max(0, y0), y0, wx, bot + Math.round(4 * vnoise(wx / 11, 9, 778) + 2 * Math.sin(wx / 5 + t * 0.2)), mask);
  }
}
// Under the cloud (H16a): grey, flat light from the cloud's underside fading darker toward the ground.
function gloom(scr, y0) {
  const { VW, VH, fb } = scr, N = R.nebel;
  for (let y = y0; y < VH; y++) {
    const f = clamp((y - y0) / 160, 0, 1) * 1.6, b = Math.floor(f), e = f - b, row = y * VW;
    for (let x = 0; x < VW; x++) fb[row + x] = N[3 - Math.min(2, b + (bayer(x, y) < e ? 1 : 0))];
  }
}
// One column of the cloud sea from its top down: a sunlit top, a soft shaded band under it, then
// the sea itself with the rolls of further billows in it, wider apart the nearer they are.
function cloudCol(fb, VW, VH, x, ys, y0, wx, yb = 1e9, mask = null) {
  const end = Math.min(VH, yb), under = mask ? mask.tops[x] : 1e9;
  for (let y = ys; y < end; y++) {
    if (y >= under && fb[y * VW + x] === mask.snap[y * VW + x]) continue;
    const k = y - y0, per = 6 + k * 0.12, roll = (k + 3 * vnoise(wx / 13, Math.floor(k / per), 777)) % per;
    let col = k < 1 ? R.white[1] : k < 3 ? R.farsnow[1] : k < 8 ? (bayer(x, y) < (k - 3) / 5 ? R.farsnow[0] : R.farsnow[1]) : R.farsnow[0];
    if (k >= 8 && roll < 1) col = R.farsnow[1]; else if (k >= 8 && roll < 2 && bayer(x, y) < 0.5) col = R.sky[4];
    // The underside, where there is one: a soft grey fringe.
    if (yb - y <= 4) col = yb - y <= 2 ? (bayer(x, y) < 0.5 ? R.nebel[3] : R.farsnow[0]) : R.nebel[3];
    fb[y * VW + x] = col;
  }
}
// A raven, seen from below and a little to the side: black, with a glint of blue on its back and
// fingered wing tips. 'hang' rides the updraft, wings out (two frames, tips a pixel up or down);
// 'peel' banks away with its wings half folded.
function raven(pose, f = 0) {
  const b = new BM(17, 9); b.ox = 8; b.oy = 4;
  if (pose === 'peel') {
    for (let i = -5; i <= 5; i++) { const y = 4 + Math.round(Math.abs(i) * 0.5) * (i < 0 ? 1 : -1); b.set(8 + i, y, INK); if (Math.abs(i) < 4) b.set(8 + i, y + 1, INK); }
    b.set(9, 3, R.navy[1]);
  } else {
    for (let i = -8; i <= 8; i++) {
      const a = Math.abs(i), y = 4 - (a > 2 ? (f ? 1 : 0) + (a > 6 ? (f ? 1 : -1) : 0) : 0);
      b.set(8 + i, y, INK); if (a < 6) b.set(8 + i, y + 1, INK); if (a > 6 && (a & 1)) b.set(8 + i, y - 1, INK);
    }
    b.set(7, 4, R.navy[1]); b.set(8, 4, R.navy[1]);
  }
  // A heavy bill out front and the wedge of the tail behind.
  b.set(13, 3, INK); b.set(14, 3, INK); b.set(3, 5, INK); b.set(2, 5, INK); b.set(2, 6, INK); b.set(3, 6, INK); b.set(1, 6, INK);
  return b;
}
function flagLarch(S, x, h, H, seed) {
  if (!S.get(x, -h)) return;
  const lean = 1.5 + 2 * hash(seed, 1, 771);
  for (let j = 0; j <= H; j++) { const tx = Math.round(x + lean * (j / H) ** 1.5); S.set(tx, -(h + j), j < H * 0.4 ? R.dirt[0] : INK); if (H > 16 && j < H * 0.5) S.set(tx + 1, -(h + j), R.dirt[1]); }
  for (let j = Math.round(H * 0.3); j <= H; j++) {
    if (hash(seed, j, 772) < 0.3 && j < H - 1) continue;
    const tx = Math.round(x + lean * (j / H) ** 1.5), L = Math.round((H - j) * 0.45 + 1 + 2 * hash(seed, j, 773)), back = hash(seed, j, 774) < 0.4 ? 1 : 0;
    for (let i = -back; i <= L; i++) { if (!i) continue; const c = j === H || i === L ? 4 : (i + j) & 1 ? 3 : 2; S.set(tx + i, -(h + j), R.larch[c]); S.set(tx + i, -(h + j - 1), S.get(tx + i, -(h + j - 1)) === R.larch[2] || S.get(tx + i, -(h + j - 1)) === R.larch[3] ? S.get(tx + i, -(h + j - 1)) : R.larch[1]); }
  }
}

// The line of the climb, from the walk in to the summit. Each point is where the feet are: x, h, then
// where it lies: 'w' on walking ground, 's' on the south face in front of the rock, 'c' on the crest,
// 'n' on the north side behind it (only the rope over the crest shows there); and a mark at the tie-in,
// the anchors (a1 to a4, top) and the fixed gear. It follows the landmarks drawn above, pitch by pitch.
const P1X = h => Math.round(250 + 0.36 * h + 2 * Math.sin(h / 9) - 2);
const ROUTE = [
  ...[10, 40, 70, 100, 130, 160, 190, 220].map(x => [x, Math.round(knob(x)) + 2, 'w']),
  [244, 8, 'w', 'tie'],
  // Pitch 1: the crack up the white band, the off-width, the belay under the roof.
  ...[16, 30, 44, 58, 72, 86, 100].map(h => [P1X(h), h, 's']), [293, 114, 's'], [294, 126, 's'], [296, 130, 's', 'a1'],
  // Pitch 2: along under the roof, up the corner, over the roof, down to the north side's trail and back,
  // the stride onto the jutting block, the platform.
  [318, 134, 's'], [338, 146, 's'], [352, 152, 's'], [354, 166, 's'], [356, 180, 's'], [360, 196, 'c'], [374, 196, 'c'],
  [382, 186, 'n'], [392, 174, 'n'], [426, 174, 'n'], [434, 182, 's'], [440, 197, 'c'], [456, 199, 'c'], [470, 201, 'c'], [488, 202, 'c'], [505, 202, 'c', 'a2'],
  // Pitch 3: the piton at the slab's foot, up its face beside the arete to the mercy hold, the sidewalk,
  // the down-climb, the flake.
  [532, 203, 's', 'piton'], [542, 210, 's'], [556, 236, 's'], [570, 258, 's'], [578, 266, 'c'], [592, 270, 'c'], [606, 263, 'c'], [650, 263, 'c'], [664, 253, 's'], [676, 240, 's'], [698, 238, 'c', 'a3'],
  // Pitch 4: round the egg hugging it, astride the fins, the slabby down-climb on the north side, the
  // grassy walk to the big ledge.
  [712, 252, 's'], [731, 254, 's'], [752, 258, 's'], [766, 262, 'c'], [774, 269, 'c'], [786, 263, 'c'], [799, 272, 'c'], [811, 264, 'c'], [823, 269, 'c'],
  [838, 258, 'n'], [856, 250, 'n'], [872, 247, 'c'], [930, 247, 'c'], [960, 253, 'c', 'a4'],
  // Pitch 5: the scramble, the off-width up the headwall to the bolt at its lip, the lieback flake, the
  // left chimney and the hole, the summit.
  [990, 271, 's'], [1002, 285, 's'], [1014, 290, 's'], [1018, 300, 's'], [1018, 382, 's'], [1022, 388, 's', 'bolt'], [1030, 396, 's'], [1038, 413, 's'], [1050, 416, 's'], [1050, 446, 's'], [1058, 460, 'c'], [1072, 477, 'c', 'top']
];
const DIST = [0]; for (let i = 1; i < ROUTE.length; i++) DIST.push(DIST[i - 1] + Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1]));
const LEN = DIST[DIST.length - 1], MARK = {}; ROUTE.forEach((p, i) => { if (p[3]) MARK[p[3]] = DIST[i]; });
// Where along the line a distance d falls: the point, where it lies, and which way and how steeply it goes.
function posAt(d) {
  d = clamp(d, 0, LEN); let i = 1; while (i < DIST.length - 1 && DIST[i] < d) i++;
  const a = ROUTE[i - 1], b = ROUTE[i], u = (d - DIST[i - 1]) / Math.max(1e-6, DIST[i] - DIST[i - 1]);
  return { x: lerp(a[0], b[0], u), h: lerp(a[1], b[1], u), where: u < 0.5 ? a[2] : b[2], dx: b[0] - a[0], dh: b[1] - a[1] };
}
const ANCHORS = ['tie', 'a1', 'a2', 'a3', 'a4', 'top'];
// The wide features the line goes up, as painted in paintRidge (x0, x1, h0, h1): the two off-widths
// (pitch 1's flaring one under the roof, pitch 5's up the headwall), the left summit chimney, and the
// hole under its chockstone at the top. On the line inside one, everyone climbs it its own way and
// slower (H9): arm bars and a knee in an off-width, back and feet in the chimney, a squeeze through
// the hole.
const FEATURES = { ow: [[286, 300, 104, 132], [1015, 1023, 289, 388]], chim: [[1046, 1054, 413, 440]], hole: [[1046, 1058, 440, 456]] };
const SLOW = { ow: 0.45, chim: 0.55, hole: 0.35 };
function styleAt(d) {
  const p = posAt(d);
  for (const k in FEATURES) for (const [x0, x1, h0, h1] of FEATURES[k]) if (p.x >= x0 && p.x <= x1 && p.h >= h0 && p.h < h1) return k;
  return null;
}
// Where along the line a style starts or stops, so a move can be cut there and each part timed at its pace.
const BOUNDS = []; { let prev = null; for (let d = 0; d <= LEN; d++) { const st = styleAt(d); if (st !== prev) BOUNDS.push(d); prev = st; } }
const FACE_BELAYS = ['a1', 'a2', 'a3', 'a4', 'top'].filter(m => posAt(MARK[m]).where === 's');
const below = d => { let k = 0; for (let i = 0; i < ANCHORS.length; i++) if (MARK[ANCHORS[i]] <= d + 1e-6) k = i; return ANCHORS[k]; };

// The script: who does what, when. Three of them, in the order they climb every pitch (round 5, T72): the
// black-haired man leads; the red-haired woman follows on his rope, trailing a second rope down to TJ;
// TJ comes last on that second rope and takes the gear out.
// Each has a track of moves (from, to along the line, in a pose); the tracks meet at
// sync points (no one sets off up a pitch until the anchor is built, and so on). Live ropes, the gear
// and the stops are kept beside them. Everything on the ridge is read off this at a moment of the
// scene, so the timeline can be dragged either way.
// The two followers climb differently (H7): TJ quick and steady, straight up the line, never stopping
// to rest; the woman slower and careful, wandering a little either side of it and stopping once a
// pitch to shake out an arm.
// On the ground they walk at the pace he came through the larch basin at (round 5, T68). On the rock
// they climb at six times round 4's pace (round 5, T69: TJ watched the scene at 4x and liked it better;
// round 6, note 21: half as fast again).
const SPEED = { walk: 78, lead: 66, tj: 102, red: 78 };
// How long each stop on a pitch takes, in seconds, at about a third of round 4's (and the climbing ones two
// thirds of that again in round 6, with the pace): placing a cam or clipping
// a fixed piece, swapping the ropes at one, taking one out or unclipping it, shaking out an arm, clipping
// in at a belay, taking a belay apart; hanging after a fall and shaking out after it, hanging after a
// slip; and the least any move takes. An anchor is `first` before its first piece goes in, `each` a
// piece, then `tie` to bring the slings together and tie in.
const BEAT = { place: 0.34, clip: 0.2, swap: 0.2, swapFixed: 0.14, clean: 0.27, unclip: 0.17, rest: 0.4, tieIn: 0.2, strip: 0.34, hang: 1.4, shake: 0.8, held: 1.0, least: 0.3 };
const ANC = { first: 0.14, each: 0.17, tie: 0.24 };
const WHO = ['tj', 'lead', 'red'];
const dAtX = x => { for (let i = 1; i < ROUTE.length; i++) if (ROUTE[i][0] >= x) return lerp(DIST[i - 1], DIST[i], clamp((x - ROUTE[i - 1][0]) / (ROUTE[i][0] - ROUTE[i - 1][0]), 0, 1)); return LEN; };
// Where each of them stands at an anchor: the leader on it, the woman a stride below, TJ a stride below
// her (closer, and on the crest they stood half inside one another). The last one up stands lowest, so
// nobody climbs through anybody.
const AT = { tj: -28, lead: 0, red: -14 };
const PACKS = dAtX(198), TIE = dAtX(231);
const PITCH = ['tie', 'a1', 'a2', 'a3', 'a4', 'top'];
// The wind (H11) comes from the west across the ridge, nothing at the foot and strong at the top. Above
// the flake belay at the slab's top, where the ridge turns exposed, everyone has their hood up.
const windy = h => smooth(140, 470, h), HOOD_H = posAt(MARK.a3).h;
// The holds (H10), as round 3 had them: two rows up the face, one for each hand, a hold every HC along
// the line. Each limb takes them in turn: a hand stays on its hold while the body rises past it, then
// reaches for the next, and a foot takes the hold its hand had two moves before; going down, the same
// moves run backwards. A hold is at hip height for someone whose feet are on the line there, a little
// to one side of it; in pitch 1's crack hands and feet go in the crack itself, and on the crest a hand
// takes the rock's top. Where a foot's hold lies just under the spot where someone stands at a belay,
// the foot goes onto that ledge as they step up and stays on it until they leave it; a hand that would
// reach past a ledge takes its lip.
const HC = 12, LIMB = [[0, -1, 9], [0.5, 1, 10], [0.25, 1, -14], [0.75, -1, -15]];
const pitchOf = d => ANCHORS.indexOf(below(d)) + 1;
// Where the line runs up beside an edge (the slab's arete) a hold that would be out in the air is
// moved across onto the rock; paintHolds finds those and keeps them here, keyed by d and side.
const HOLDX = new Map(), holdKey = (d, side) => Math.round(d) * 4 + side + 1;
function holdAt(d, side) {
  const p = posAt(d), face = p.where === 's' && !styleAt(d);
  if (!face) return { x: p.x + side * 3, h: p.h + 1, top: true };
  const crack = pitchOf(d) === 1, fx = HOLDX.get(holdKey(d, side));
  // Up a steep stretch a hold is at hip height; where the line lies back it comes down to the rock
  // underfoot, so a foot on a gentle ramp is on the ramp and not on a hold at someone's hip.
  const lift = 11 * smooth(0.45, 0.85, Math.abs(p.dh) / Math.max(1e-6, Math.hypot(p.dx, p.dh)));
  return { x: fx ?? p.x + (crack ? 2 + side * 1.5 : side * (4.5 + 3 * hash(Math.round(d / HC), side + 2, 791))), h: p.h + 1 + lift, crack, lift };
}
const STANDS = {}; for (const w of WHO) STANDS[w] = ANCHORS.map(m => MARK[m] + (m === 'tie' ? 0 : AT[w]));
// Hands and feet for someone whose feet are at d on the line, as offsets from the hips (backFig's
// order: left and right hand, left and right foot), each kept within an arm's or a leg's reach. On a
// slanting line the hands are up the slant and the feet down it, so the hips move bx across to sit
// between them. Feet stay a stride apart (together, with knees turned out, the legs made a ring), each
// hand on its own side, and nothing reaches out sideways where the line runs nearly flat.
function limbs(w, d) {
  const sg = posAt(d).dh < 0 ? -1 : 1, me = posAt(d), hip = me.h + 12, out = [];
  for (const [off, side, lead] of LIMB) {
    const foot = lead < 0, K = 2 * (foot ? lead + 24 : lead), u = sg > 0 ? d : K - d, ph = u / HC - off, n = Math.floor(ph), m = ph - n;
    const at = k => {
      const uh = (k + 1) * HC + lead, dh = sg > 0 ? uh : K - uh;
      if (!foot) {
        // Past a ledge the hand takes its lip.
        for (const a of ANCHORS) { const M = MARK[a]; if ((M - d) * sg > 0 && (dh - M) * sg > 0) { const q = posAt(M); return [q.x + side * 4, hip - q.h - 1]; } }
        const q = holdAt(dh, side); return [q.x, hip - q.h];
      }
      const q = holdAt(dh, side); let x = q.x, y = hip - q.h - (q.top ? 1 : 2);
      for (const sd of STANDS[w]) if (dh > sd - 16 && dh <= sd + 0.5) { const e = smooth(sd - 6, sd - 1, d), g = posAt(sd); x = lerp(x, g.x + side * 3, e); y = lerp(y, hip - g.h - 1, e); }
      return [x, y];
    };
    const a = at(n), b = at(n + 1), e = m > 0.7 ? (m - 0.7) / 0.3 : 0;
    out.push([lerp(a[0], b[0], e) - me.x + side * Math.sin(e * Math.PI) * 2, lerp(a[1], b[1], e), side, foot]);
  }
  const bx = clamp(Math.round(out.reduce((t, q) => t + q[0], 0) / 4), -4, 4);
  const fit = ([x, y, side, foot]) => {
    x -= bx;
    if (foot) { x = side * clamp(x * side, 4, 8); y = Math.max(4, y); } else x = side * clamp(x * side, -2, 9);
    const o = foot ? [side * 2, 0] : [side * 4, -9], r = foot ? 13.2 : 11.6, L = Math.hypot(x - o[0], y - o[1]);
    if (L > r) { x = o[0] + (x - o[0]) * r / L; y = o[1] + (y - o[1]) * r / L; }
    return [Math.round(x), Math.round(y)];
  };
  const [lh, rh, rf, lf] = out.map(fit);
  if (lh[0] > rh[0] - 2) lh[0] = rh[0] - 2;
  return { hands: [lh, rh], feet: [lf, rf], bx };
}
// The holds painted on the rock, exactly where hands and feet will go, each pitch its own kind: edges
// beside the crack on pitch 1 (the crack is the hold there), big flakes and jugs up the corner on pitch
// 2, pockets and thin edges on the slab, edges after; the "mercy hold" at the top of the slab and the
// big hold at the headwall's lip are jugs. Every one has a lit top and a shadow under it, and most
// carry a dab of chalk.
function paintHolds(S) {
  // The shadow under each is ink: the ridge's rock is busier than round 3's plain wall, and a grey
  // shadow was lost in its speckle.
  const lit = R.gold[6], dark = INK, dim = R.rock[0], mid = R.rock[1], put = (x, h, c) => { if (S.get(Math.round(x), -Math.round(h))) S.set(Math.round(x), -Math.round(h), c); };
  const KINDS = {
    edge: (x, h) => { for (let d = -2; d <= 2; d++) { put(x + d, h, lit); put(x + d, h - 1, dark); if (Math.abs(d) < 2) put(x + d, h - 2, dim); } },
    thin: (x, h) => { for (let d = -1; d <= 2; d++) { put(x + d, h, lit); put(x + d, h - 1, dark); } put(x, h - 2, dim); put(x + 1, h - 2, dim); },
    jug: (x, h) => { for (let d = -3; d <= 3; d++) { const e = Math.abs(d) === 3; put(x + d, h - (e ? 1 : 0), lit); put(x + d, h - 1 - (e ? 1 : 0), dark); if (!e) { put(x + d, h - 2, dark); put(x + d, h - 3, mid); } } put(x - 1, h + 1, lit); put(x, h + 1, lit); },
    flake: (x, h, side) => { for (let k = 0; k < 6; k++) { put(x + side * (k - 2), h - k, lit); put(x + side * (k - 3), h - k, dark); if (k > 1) put(x + side * (k - 4), h - k, dim); } },
    pocket: (x, h) => { for (let d = -1; d <= 1; d++) { put(x + d, h, dark); put(x + d, h - 1, dark); put(x + d, h - 2, lit); } put(x - 2, h - 1, dim); put(x + 2, h - 1, dim); put(x, h + 1, dim); }
  };
  const holds = [], rock = (x, h) => S.get(Math.round(x), -Math.round(h)) && S.get(Math.round(x) - 3, -Math.round(h)) && S.get(Math.round(x) + 3, -Math.round(h));
  HOLDX.clear();
  for (const [, side, lead] of LIMB.slice(0, 2)) for (let d = lead; d < LEN; d += HC) {
    const q = holdAt(d, side);
    if (!q.top && !rock(q.x, q.h)) { for (let k = 1; k < 16; k++) if (rock(q.x - side * k, q.h)) { q.x -= side * k; HOLDX.set(holdKey(d, side), q.x); break; } }
    if (q.top || q.lift < 6 || ANCHORS.some(a => Math.abs(d - MARK[a]) < 5)) continue;
    holds.push({ d, side, ...q, r: hash(Math.round(d), side, 792), p: pitchOf(d) });
  }
  let crest = MARK.piton + 10; while (posAt(crest).where !== 'c') crest++;
  const mercy = holds.filter(q => q.p === 3 && q.d < crest).reduce((a, q) => (!a || q.d > a.d ? q : a), null);
  const lip = holds.filter(q => q.p === 5 && q.d >= MARK.bolt).reduce((a, q) => (!a || q.d < a.d ? q : a), null);
  for (const q of holds) {
    if (q.crack && q.r < 0.45) continue;
    const x = Math.round(q.crack ? q.x + q.side * (4 + Math.round(q.r * 3)) : q.x), h = Math.round(q.h);
    const kind = q === mercy || q === lip ? 'jug' : q.crack ? 'thin' : q.p === 2 ? (q.r < 0.38 ? 'jug' : q.r < 0.74 ? 'flake' : 'edge') : q.p === 3 ? (q.r < 0.5 ? 'pocket' : 'thin') : 'edge';
    KINDS[kind](x, h, q.side);
    // Chalk on every hold, a smear over its top: on a classic every hold is chalked, and on this busy
    // rock it is what lets the line of holds be read from a distance, as round 3's plain wall did.
    put(x + q.side, h + 1, R.white[1]); put(x, h + 1, R.white[0]);
    if (hash(Math.round(q.d), q.side, 793) < 0.62) { put(x + 2 * q.side, h + 1, R.white[0]); if (q.r > 0.5) put(x, h + 2, R.white[0]); }
  }
}
// The gear on each pitch, by rule: so many cams spread evenly over the stretches where the line is on
// the face (never on the crest or behind it, where there is nothing to reach up to), plus the fixed
// piton and bolt, which are in the rock from the start. Pitch 3 is the piton and one tiny cam at the
// slab's foot and nothing above (the run-out is the point of the slab); pitch 4 has two, and the rope
// runs over the fins between them. Round 5, T69: fewer than round 4's four on pitches 1, 2 and 5, and
// still two or three on every pitch.
const GEAR = { 1: 3, 2: 3, 3: 0, 4: 2, 5: 2 };
function gearOn(p) {
  const d0 = MARK[PITCH[p - 1]], d1 = MARK[PITCH[p]], face = [], out = [];
  for (let d = d0 + 10; d < d1 - 8; d++) if (posAt(d).where === 's' && posAt(d - 10).where === 's') face.push(d);
  for (let i = 0; i < GEAR[p]; i++) { const d = face[Math.floor(face.length * (i + 0.5) / GEAR[p])]; out.push({ d, kind: styleAt(d) === 'ow' ? 'big' : 'cam' }); }
  if (p === 3) out.push({ d: MARK.piton + 2, kind: 'piton', fixed: true }, { d: MARK.piton + 6, kind: 'tiny' });
  if (p === 5) out.push({ d: MARK.bolt, kind: 'bolt', fixed: true });
  return out.sort((a, b) => a.d - b.d);
}
// Where the leader falls (H8): on the pitch with the longest run-out above its last piece on the face
// (the slab), halfway up it. On a slab he slides rather than drops, and with nothing but the piton and
// its backup at the slab's foot (TJ, section 5) he slides all the way down to them and hangs there,
// just above the ledge, sitting in his harness with his feet on the rock.
const FALL = (() => {
  let best = null;
  for (let p = 1; p <= 5; p++) {
    const last = Math.max(...gearOn(p).map(g => g.d)); let e = last;
    while (e < MARK[PITCH[p]] && posAt(e).where === 's') e++;
    if (!best || e - last > best.run) best = { p, last, run: e - last };
  }
  return { p: best.p, from: best.last + 0.5 * best.run, to: best.last + 2 };
})();
// Where the woman slips once and is held by the leader's belay from above (H7): the steepest stretch she
// follows on pitches 2 to 5, halfway up it; ties go to the first.
const SLIP = (() => {
  let best = null, bs = -1;
  for (let p = 2; p <= 5; p++) for (let i = 1; i < ROUTE.length; i++) {
    const A = ROUTE[i - 1], B = ROUTE[i];
    if (DIST[i - 1] < MARK[PITCH[p - 1]] || DIST[i] > MARK[PITCH[p]] || A[2] !== 's' || B[2] !== 's') continue;
    const st = Math.abs(B[1] - A[1]) / Math.max(Math.abs(B[0] - A[0]), 0.5);
    if (st > bs + 1e-6) { bs = st; best = { p, d: (DIST[i - 1] + DIST[i]) / 2 }; }
  }
  return best;
})();
// Where TJ comes off (round 5, T73: in real life he could not climb the off-width at the end): 30% of the
// way up pitch 5's off-width, after a struggle. He drops `drop` along the line as the rope stretches and
// swings out over the air left of the headwall. The other two then rig a 3:1 haul at the summit anchor
// (`rig` seconds) and yank on it together `yanks` times: each yank is a reach down the rope and a heave
// back, and lifts him a quarter of the way from where he hangs to his place at the belay, so the last
// one brings him to them.
const WHIP = (() => {
  let a = -1, b = -1; for (let d = Math.ceil(MARK.a4); d < MARK.top; d++) if (styleAt(d) === 'ow') { if (a < 0) a = d; b = d; }
  return { p: 5, ow0: a, at: a + 0.3 * (b - a), drop: 20 };
})();
const HAUL = { swing: 2.0, rig: 1.5, yanks: 4, reach: 0.4, heave: 0.5, lift: 0.3 };
// What each belay is built from (TJ, section 5): the sling-wrapped block backed up with two cams, the two
// slung horns, three cams by the flake, a horn, a cam and a nut, and the summit block.
const ANCHOR_KIT = { a1: ['block', 'cam', 'cam'], a2: ['horn', 'horn'], a3: ['cam', 'cam', 'cam'], a4: ['horn', 'cam', 'nut'], top: ['block'] };
// The summit's moves, in seconds after all three are up: TJ walks up beside the leader, they high five;
// she walks up below TJ and the two of them high five; she sits down.
const SUMMIT_LEN = 5.6, FIVES = [{ a: 'tj', b: 'lead', at: 1.9 }, { a: 'red', b: 'tj', at: 3.5 }], WALKS = { tj: [0, 1.2], red: [1.6, 2.9] };
// The descent (H16), in seconds after the summit: the leader walks over to the east edge of the top,
// slings a block there and throws the rope down; then one after another (the leader, the woman, TJ last)
// each steps to the edge, clips in, and zips down the first rappel into the cloud. Each next one sets
// off as the one before sinks out of sight. The scene ends as TJ goes under, and the round window
// closes to the map. The other rappels down the north side are in the cloud, unseen.
const ZIP = 2.6, DESC = { walk: { lead: [0, 1.2], tj: [1.0, 2.2], red: [1.6, 3.0] }, rig: [1.2, 3.4], toss: [3.4, 4.2], turn: { lead: 4.2, red: 7.6, tj: 11.0 } };
// Under the cloud (H16a, TJ's in-joke: their real rope stuck and had to be left), in seconds after the
// camera follows TJ into it: he comes down the last rappel out of the cloud's underside, unclips; all
// three pull the rope down; its tail whips up the face and jams in the flake that eats ropes; they
// heave on it three times, look at each other, shrug, and TJ walks off west round the tower's foot,
// the way back to the packs. Nobody climbs the stuck rope.
DESC.under = DESC.turn.tj + 1.5 + 0.8 * ZIP;
const UNDER = { out: 1.2, land: 3.0, unclip: 3.6, snag: 6.2, heave: [6.4, 9.4], look: 9.6, shrug: [11.0, 12.2], walk: 12.6 };
// The walk-off (round 5, T75, TJ: they rappelled onto a steep snow slope and traversed off it, four
// points on, with ice axes, TJ leading): after the shrug each in turn (TJ, the leader, the woman, `gap`
// seconds apart) walks to the ledge's outer end (`ledge` s), steps down onto the snow (`step` s), faces
// in and traverses down and across it at `v` px a second, in TJ's steps, until `off` px out, off the
// picture on a laptop screen. The scene ends when the last of them is there.
const SN = { gap: 2.2, ledge: 1.4, step: 0.5, v: 22, off: 330, order: { tj: 0, lead: 1, red: 2 } };
const DESC_LEN = DESC.under + UNDER.walk + 2 * SN.gap + SN.ledge + SN.step + SN.off / SN.v + 0.5;
function makeScript() {
  const tr = { tj: [], lead: [], red: [] }, ropes = [], stops = [], pro = [], anc = [];
  let slipAt = -1, fallAt = -1, whipAt = -1, haulAt = -1, rigAt = -1, upAt = -1; const yanks = [];
  const pos = { tj: 0, lead: MARK.tie, red: dAtX(183) }, pose = { tj: 'walk', lead: 'rack', red: 'sit' }, clock = { tj: 0, lead: 0, red: 0 };
  const go = (k, to, p, dur, after) => { tr[k].push({ t0: clock[k], t1: clock[k] + dur, d0: pos[k], d1: to, pose: p }); clock[k] += dur; pos[k] = to; pose[k] = after || p; };
  const move = (k, to, p, v, after) => {
    const d0 = pos[k], dir = Math.sign(to - d0);
    if (!dir) return go(k, to, p, BEAT.least, after);
    const cuts = BOUNDS.filter(b => (b - d0) * dir > 0 && (to - b) * dir > 0); if (dir < 0) cuts.reverse();
    const legs = []; let a = d0;
    for (const b of [...cuts, to]) { legs.push([b, Math.abs(b - a) / (v * (p === 'walk' ? 1 : SLOW[styleAt((a + b) / 2)] || 1))]); a = b; }
    const pad = Math.max(0, BEAT.least - legs.reduce((t, l) => t + l[1], 0));
    legs.forEach(([b, t], i) => { const last = i === legs.length - 1; go(k, b, p, t + (last ? pad : 0), last ? after : p); });
  };
  const hold = (k, until) => { if (until > clock[k] + 1e-6) go(k, pos[k], pose[k], until - clock[k]); };
  const sync = () => { const t = Math.max(clock.tj, clock.lead, clock.red); for (const k of WHO) hold(k, t); return t; };
  // He walks in over the knob past the balanced rock, puts his pack under the overhanging rock with
  // theirs, walks on to the start tree and ties in beside the leader, who is racking up; the woman,
  // eating by the packs, gets up and ties in too. Then he waits for Space, and they bump fists. She
  // belays the leader, so TJ then steps back to where she stood and she steps up to the foot of the climb.
  move('tj', PACKS, 'walk', SPEED.walk, 'stand'); go('tj', PACKS, 'drop', 0.6, 'stand'); move('tj', TIE, 'walk', SPEED.walk, 'stand');
  hold('red', clock.tj - 0.8); move('red', dAtX(214), 'walk', SPEED.walk, 'stand');
  // Helmets on and tied in, as one quick beat of about 2 s (round 5, T68): hands to the head, her helmet
  // on at `lidAt`, then the knots.
  const lidAt = sync() + 0.35; for (const k of ['tj', 'red']) go(k, pos[k], 'lid', 0.7, 'stand');
  go('tj', TIE, 'tie', 1.1, 'stand'); go('red', pos.red, 'tie', 1.1, 'stand');
  stops.push({ id: 'wait:belay', t: sync() });
  const bumpAt = clock.tj; go('tj', TIE, 'bump', 1.0, 'stand'); go('lead', pos.lead, 'bump', 1.0, 'stand');
  { const back = pos.red; hold('red', clock.tj); move('red', TIE, 'walk', SPEED.walk, 'belay'); move('tj', back, 'walk', SPEED.walk, 'stand'); }
  const CARD = { a1: 'platform-engineering', a3: 'site-reliability-engineering', a4: 'software-engineering' };
  for (let p = 1; p <= 5; p++) {
    const a = MARK[PITCH[p]], t0 = sync(), gear = gearOn(p);
    // The card opened at the last anchor stays readable until everyone is up and the next pitch starts.
    for (const st of stops) if (st.settle == null && st.id !== 'wait:belay') st.settle = t0;
    // The leader climbs on the woman's belay, stopping at each piece to place it (or clip it, if fixed),
    // then builds the anchor and takes her on belay from above. The second rope hangs between her and TJ.
    // A cam goes from the rack to his hand to the crack (in at t), then the rope is clipped (clip).
    for (const g of gear) {
      move('lead', Math.max(pos.lead, g.d - 15), 'lead', SPEED.lead); const s = clock.lead;
      const len = g.fixed ? BEAT.clip : BEAT.place; go('lead', pos.lead, 'place', len); pro.push({ ...g, p, t0: s, t: s + (g.fixed ? 0 : 0.6 * len), clip: s + (g.fixed ? 0.6 : 0.8) * len, gone: Infinity });
    }
    // On FALL's pitch he runs it out, comes off, slides down the slab past his last pieces until the rope
    // comes tight on them, hangs, shakes out, and goes again.
    if (p === FALL.p) {
      move('lead', FALL.from, 'lead', SPEED.lead); fallAt = clock.lead;
      go('lead', lerp(FALL.from, FALL.to, 0.35), 'fall', 0.35); go('lead', FALL.to, 'fall', 0.3);
      go('lead', FALL.to, 'hang', BEAT.hang); go('lead', FALL.to, 'rest', BEAT.shake);
    }
    // The anchor: each piece in turn, then the slings brought to one locking carabiner (te), then he
    // ties in to it and takes the followers in.
    move('lead', a, 'lead', SPEED.lead);
    { const kinds = ANCHOR_KIT[PITCH[p]], s0 = clock.lead; go('lead', a, 'anchor', ANC.first + ANC.each * kinds.length + ANC.tie, 'tbelay'); anc.push({ m: PITCH[p], kinds, t0: s0, te: s0 + ANC.first + ANC.each * kinds.length, gone: Infinity }); }
    pose.red = 'belay'; pose.tj = 'stand';
    // The woman holds the fall: braced, leaning back, looking up the rope.
    if (p === FALL.p) { hold('red', fallAt + 0.5); go('red', pos.red, 'catch', BEAT.hang + 0.2, 'belay'); }
    hold('red', clock.lead); hold('tj', clock.lead);
    ropes.push({ a: 'red', b: 'lead', t0, t1: clock.lead }, { a: 'tj', b: 'red', t0, t1: clock.lead, two: true, idle: true });
    const t1 = sync(), mine = pro.filter(g => g.p === p);
    // The woman comes second on the leader's rope, trailing the second rope, which TJ pays out from
    // below. At each piece she takes the leader's rope out of the carabiner and clips the second rope in
    // (at `swap`), so TJ's rope runs through every piece below her. At the top she clips in and takes
    // TJ on belay. On the way she rests once (halfway through the pieces, from pitch 2 on), and on SLIP's
    // pitch her foot goes: she drops a little, the rope comes tight, she hangs, then climbs on.
    let slip = 0;
    const up = to => {
      if (SLIP && p === SLIP.p && !slip && SLIP.d > pos.red && SLIP.d < to) { move('red', SLIP.d, 'climb', SPEED.red); slip = clock.red; go('red', SLIP.d - 9, 'slip', 0.3); go('red', pos.red, 'hang', BEAT.held); }
      move('red', Math.max(pos.red, to), 'climb', SPEED.red);
    };
    pose.tj = 'belay';
    mine.forEach((g, i) => { up(g.d - 6); go('red', pos.red, 'unclip', g.fixed ? BEAT.swapFixed : BEAT.swap); g.swap = clock.red - 0.1; if (p > 1 && i === Math.floor(mine.length / 2)) go('red', pos.red, 'rest', BEAT.rest); });
    up(a + AT.red); go('red', pos.red, 'anchor', BEAT.tieIn, 'tbelay');
    ropes.push({ a: 'lead', b: 'red', t0: t1, t1: clock.red }, { a: 'tj', b: 'red', t0: t1, t1: clock.red, two: true, trail: true });
    // The leader catches her: he braces and locks off the rope as it comes tight, then takes in again.
    // His job is then done until the next pitch: he belays her right up to the anchor, then rests.
    if (slip) { hold('lead', slip); go('lead', pos.lead, 'catch', 0.3 + BEAT.held, 'tbelay'); slipAt = slip; }
    hold('lead', clock.red); pose.lead = 'stand'; hold('tj', clock.red);
    // TJ comes last on the second rope, on her belay from above, and takes the gear out as he reaches
    // it; at the piton and the bolt he only unclips the carabiner, and they stay in the rock. Before he
    // leaves the anchor below (not the ground), he takes it apart; at the top he clips in, and then the
    // card opens, with everyone up.
    const t2 = clock.tj;
    if (p > 1) { go('tj', pos.tj, 'anchor', BEAT.strip); anc[p - 2].gone = clock.tj - 0.1; }
    // He climbs to `to` at pace v, taking out each piece he comes to on the way (every piece left, if all).
    const tjUp = (to, v, all) => {
      for (const g of mine) if (g.gone === Infinity && (all || g.d - 6 <= to)) { move('tj', Math.max(pos.tj, g.d - 6), 'climb', v); go('tj', pos.tj, 'clean', g.fixed ? BEAT.unclip : BEAT.clean); g.gone = clock.tj - 0.1; }
      if (!all) move('tj', Math.max(pos.tj, to), 'climb', v);
    };
    if (p === WHIP.p) {
      // The off-width beats him: slower and slower up it, a rest, a slide back, another rest, a last
      // lunge, and off. He drops, swings out and hangs.
      tjUp(WHIP.ow0, SPEED.tj); const span = WHIP.at - pos.tj;
      tjUp(WHIP.at - 0.6 * span, 0.5 * SPEED.tj); go('tj', pos.tj, 'rest', 0.5);
      tjUp(WHIP.at - 0.15 * span, 0.5 * SPEED.tj); go('tj', pos.tj - 0.15 * span, 'climb', 0.25); go('tj', pos.tj, 'rest', 0.5);
      tjUp(WHIP.at, 0.3 * SPEED.tj); go('tj', pos.tj, 'rest', 0.25);
      whipAt = clock.tj; go('tj', pos.tj - WHIP.drop, 'whip', 0.45, 'swing'); go('tj', pos.tj, 'swing', HAUL.swing);
      // She holds him; then the two of them rig the haul and yank on it together.
      hold('red', whipAt + 0.3); go('red', pos.red, 'catch', 1.2, 'tbelay'); hold('red', clock.tj); hold('lead', clock.tj);
      rigAt = clock.red; for (const k of ['lead', 'red']) go(k, pos[k], 'rig', HAUL.rig);
      haulAt = clock.red - 0.5; hold('tj', clock.red);
      const d0 = pos.tj, d1 = a + AT.tj;
      for (let j = 1; j <= HAUL.yanks; j++) {
        for (const k of ['lead', 'red']) { go(k, pos[k], 'pull', HAUL.reach); go(k, pos[k], 'heave', HAUL.heave); }
        hold('tj', clock.tj + HAUL.reach); const s0 = clock.tj, to = lerp(d0, d1, j / HAUL.yanks); yanks.push(s0);
        // He snatches each piece out as he is dragged past it.
        for (const g of mine) if (g.gone === Infinity && g.d <= to) g.gone = s0 + HAUL.lift * clamp((g.d - pos.tj) / (to - pos.tj), 0, 1);
        go('tj', to, 'hauled', HAUL.lift, 'swing'); hold('tj', clock.red);
      }
      upAt = clock.tj; pose.red = 'tbelay'; pose.lead = 'stand'; go('tj', pos.tj, 'anchor', BEAT.tieIn, 'stand');
      ropes.push({ a: 'red', b: 'tj', t0: t2, t1: haulAt, two: true }, { a: 'red', b: 'tj', t0: haulAt, t1: clock.tj, two: true, haul: true }, { a: 'lead', b: 'red', t0: t2, t1: haulAt, idle: true });
    } else {
      tjUp(0, SPEED.tj, true); move('tj', a + AT.tj, 'climb', SPEED.tj, 'stand'); go('tj', pos.tj, 'anchor', BEAT.tieIn, 'stand');
      ropes.push({ a: 'red', b: 'tj', t0: t2, t1: clock.tj, two: true }, { a: 'lead', b: 'red', t0: t2, t1: clock.tj, idle: true });
    }
    if (CARD[PITCH[p]]) stops.push({ id: CARD[PITCH[p]], t: clock.tj });
    hold('red', clock.tj); pose.red = 'stand';
  }
  // The summit (H15): once she is up, TJ steps up onto the top boulder beside the leader and they high
  // five; she comes up after him and he turns to high five her too; then she sits just below on the
  // next block and the card opens. The moves are drawn from SUMMIT_MOVES; the script only holds them.
  const sumT = sync(); for (const st of stops) if (st.settle == null && st.id !== 'wait:belay') st.settle = sumT;
  for (const k of WHO) go(k, pos[k], 'summit', SUMMIT_LEN);
  stops.push({ id: 'summit', t: sumT + SUMMIT_LEN - 0.4 });
  // The summit anchor comes down as they set off for the edge.
  const descT = sync(); for (const k of WHO) go(k, pos[k], 'desc', DESC_LEN); anc[anc.length - 1].gone = descT + 0.6;
  return { tr, ropes, stops, pro, anc, slipAt, fallAt, whipAt, haulAt, rigAt, upAt, yanks, bumpAt, sumT, descT, lidAt, dropAt: tr.tj[1].t0 + 0.35, dur: clock.tj };
}
const SCRIPT = makeScript(), DUR = SCRIPT.dur;
// How far TJ hangs out from the line at a moment after he comes off: out over the air and back to kick
// off the rock, less each time, and a smaller swing after each yank of the haul.
function swingAt(tau) {
  let t0 = SCRIPT.whipAt + 0.2, A = 30;
  for (const y of SCRIPT.yanks) if (tau >= y) { t0 = y; A = 6; }
  const v = Math.max(0, tau - t0);
  return { x: -A * Math.exp(-v / 1.3) * Math.abs(Math.sin(v * 2.3)), h: -2 * Math.exp(-v * 2.5) * Math.cos(v * 9) };
}
// Each of them at a moment: where along the line, in what pose, how far through it, whether moving;
// and the ropes that are live then.
function stateAt(tau) {
  const out = { ropes: SCRIPT.ropes.filter(r => tau >= r.t0 && tau < r.t1) };
  for (const k of WHO) {
    const list = SCRIPT.tr[k], m = list.find(s => tau < s.t1) || list[list.length - 1], u = clamp((tau - m.t0) / (m.t1 - m.t0), 0, 1);
    out[k] = { d: lerp(m.d0, m.d1, u), pose: m.pose, u, moving: m.d0 !== m.d1 && u < 1, dir: Math.sign(m.d1 - m.d0) };
  }
  return out;
}

const META = {
  name: 'wall',
  dur: () => DUR,
  stops: () => SCRIPT.stops.map(s => ({ id: s.id, at: s.t / DUR })),
  elev: (arg, q) => { const tau = q * DUR, top = posAt(LEN).h; return tau < SCRIPT.descT ? posAt(stateAt(tau).tj.d).h : top * (1 - smooth(0, DESC_LEN, tau - SCRIPT.descT)); },
  // The fist bump, and a click of metal as each piece goes in.
  cues: () => [{ at: (SCRIPT.bumpAt + 0.45) / DUR, name: 'slap' }, ...FIVES.map(v => ({ at: (SCRIPT.sumT + v.at) / DUR, name: 'slap' })), { at: (SCRIPT.sumT + 4.4) / DUR, name: 'summit' }, { at: SCRIPT.fallAt / DUR, name: 'fall' }, { at: (SCRIPT.fallAt + 0.65) / DUR, name: 'catch' }, { at: SCRIPT.whipAt / DUR, name: 'fall' }, { at: (SCRIPT.whipAt + 0.45) / DUR, name: 'catch' }, { at: (SCRIPT.haulAt - 0.4) / DUR, name: 'place' }, { at: SCRIPT.haulAt / DUR, name: 'place' }, ...SCRIPT.yanks.map(y => ({ at: y / DUR, name: 'catch' })), ...(SCRIPT.slipAt > 0 ? [{ at: SCRIPT.slipAt / DUR, name: 'fall' }, { at: (SCRIPT.slipAt + 0.35) / DUR, name: 'catch' }] : []), ...SCRIPT.pro.map(g => ({ at: g.t / DUR, name: 'place' })), ...[2.0, 2.8].map(v => ({ at: (SCRIPT.descT + v) / DUR, name: 'place' })), ...WHO.flatMap(w => [{ at: (SCRIPT.descT + DESC.turn[w] + 1.1) / DUR, name: 'place' }, { at: (SCRIPT.descT + DESC.turn[w] + 1.55) / DUR, name: 'glissade' }]), { at: (SCRIPT.descT + DESC.under + UNDER.unclip - 0.4) / DUR, name: 'place' }, { at: (SCRIPT.descT + DESC.under + UNDER.snag) / DUR, name: 'catch' }]
};

// Every drawing one of them needs, in their own kit. On the ground: walking, standing, crouched,
// racking up, tying in, the fist bump. Belaying side-on, facing the climber: from below, looking up
// and paying out; from above, looking down and taking in hand over hand. On the rock, seen from behind:
// climbing, placing a cam (the cam in the hand going into the crack), building an anchor, cleaning
// (a hand up at the piece, then at the harness clipping it on), and falling.
function kitFrames(kit, cord = R.teal) {
  const side = [0, 1, 2, 3, 4, 5].map(f => sideFig(kit, { feet: [FEET[f], FEET[(f + 3) % 6]], hands: [HANDS[f], HANDS[(f + 3) % 6]], bob: [0, -1, -1, 0, -1, -1][f] }));
  const knot = (b, cx, y) => { b.set(cx, y + 7, R.white[1]); b.set(cx - 1, y + 7, cord[2]); b.set(cx + 1, y + 7, cord[2]); b.set(cx + 1, y + 8, cord[1]); };
  const tying = f => frontFig(kit, { held: (b, cx, y) => { knot(b, cx, y); for (const [dx, dy] of f ? [[-2, 6], [2, 7]] : [[-2, 7], [2, 6]]) { b.set(cx + dx, y + dy, R.skin[2]); b.set(cx + dx + (dx < 0 ? -1 : 1), y + dy, R.teal[1]); } } });
  const holding = cam => (b, x, y) => { if (!cam || x < 22) return; b.set(x + 1, y, R.rock[4]); b.set(x + 2, y, R.rock[3]); b.set(x + 1, y + 1, R.red[1]); b.set(x + 1, y + 2, R.red[1]); };
  return {
    side, idle: sideFig(kit, { lean: 0 }), blow: [sideFig(kit, { lean: 0, hands: [[6, -4], [6, -2]] }), sideFig(kit, { lean: 0, hands: [[5, -2], [6, -5]] })], crouch: sideFig(kit, { crouch: 4, lean: 5, hands: [[6, 9], [3, 8]], look: 'down', feet: [[3, 8.5], [-3, 8.5]] }),
    rack: [sideFig(kit, { lean: 1, hands: [[3, 5], [1, 6]], look: 'down' }), sideFig(kit, { lean: 1, hands: [[2, 6], [3, 4]], look: 'down' })],
    tie: [tying(0), tying(1)],
    // A helmet going on: both hands up at its rim, then at the chin strap. The hands are drawn again over
    // the head, which would otherwise hide them.
    lid: [1, 0].map(up => sideFig(kit, { lean: 0, hands: up ? [[3, -5], [-1, -5]] : [[3, -2], [1, -3]], held: (b, sh) => {
      const k = typeof kit === 'string' ? KITS[kit] : kit;
      for (const [x, y, c] of up ? [[4, -5, k.top[1]], [4, -6, k.top[1]], [4, -7, k.top[2]], [4, -8, k.hand[1]], [4, -9, k.hand[1]], [-2, -8, k.hand[0]], [-2, -9, k.hand[0]]] : [[3, -2, k.hand[1]], [2, -2, k.hand[0]], [3, -1, k.top[2]]]) b.set(sh[0] + x, sh[1] + y, c);
    } })),
    // A high five, one hand up and forward; sitting on a block's edge with the legs forward.
    five: sideFig(kit, { lean: 0, hands: [[5, -6], [1, 5]] }), sit: sideFig(kit, { crouch: 6, lean: 2, hands: [[5, 3], [3, 4]], feet: [[6, 8.5], [3, 8.5]] }),
    bump: [sideFig(kit, { lean: 0, hands: [[1, 4], [-1, 6]] }), sideFig(kit, { lean: 1, hands: [[6, 4], [-1, 6]] })],
    belay: [sideFig(kit, { lean: 0, look: 'up', hands: [[4, -2], [0, 6]] }), sideFig(kit, { lean: 0, look: 'up', hands: [[5, 1], [1, 5]] })],
    tbelay: [sideFig(kit, { lean: 2, look: 'down', hands: [[5, 1], [2, 6]] }), sideFig(kit, { lean: 2, look: 'down', hands: [[3, 5], [5, 2]] })],
    holding: holding(true),
    place: [backFig(kit, { hands: [[-5, -13], [7, -9]], feet: [[-4, 12], [4, 11]], tool: holding(true) }), backFig(kit, { hands: [[-5, -12], [6, -16]], feet: [[-4, 12], [4, 11]] })],
    anchor: [0, 1].map(f => backFig(kit, { hands: [[-4, -14 + f], [4, -13 - f]], feet: [[-3, 12], [3, 12]] })),
    clean: [backFig(kit, { hands: [[-5, -13], [5, -9]], feet: [[-4, 12], [4, 11]] }), backFig(kit, { hands: [[-5, -13], [4, 1]], feet: [[-4, 12], [4, 11]], tool: holding(true) })],
    fall: [0, 1].map(f => backFig(kit, { hands: [[-8, -13 - f], [8, -14]], feet: [[-7, 9], [7, 8 + f]], tilt: 1 })),
    // In an off-width: one arm barred in the crack, a knee jammed in it, the other foot on its edge. In
    // the chimney: back to one wall, feet and hands pushing on the other. Through the hole: arms up,
    // narrow, squeezing.
    ow: [0, 1].map(f => backFig(kit, { hands: [[-3, -10 - f * 2], [5, -14 + f]], feet: [[-2, 6 + f], [6, 12 - f]] })),
    chim: [0, 1].map(f => backFig(kit, { hands: [[-8, -7 + f], [8, -9 - f]], feet: [[-7, 9 - f], [7, 8 + f]] })),
    hole: [0, 1].map(f => backFig(kit, { hands: [[-2, -19 + f], [2, -18 - f]], feet: [[-1, 12], [2, 12 - f]] })),
    // Shaking out an arm, hanging on the rope (sitting in the harness, knees up, feet on the rock, both
    // hands on the rope), and bracing to hold a fall.
    rest: [0, 1].map(f => backFig(kit, { hands: [[-5, -13], [6 + f, 3 - f * 2]], feet: [[-4, 12], [4, 11]] })),
    hang: backFig(kit, { hands: [[-2, -17], [3, -15]], feet: [[-6, 7], [5, 8]], tilt: -1 }),
    catch: { down: sideFig(kit, { lean: -1, crouch: 2, look: 'down', hands: [[4, 4], [1, 8]] }), up: sideFig(kit, { lean: -2, crouch: 2, look: 'up', hands: [[4, 0], [1, 7]] }) },
    // The descent: crouched at a block slinging it; throwing the rope out; at the edge, back to the drop,
    // threading the rope into the device at the harness; and rappelling, seen side-on, sitting back in
    // the harness with the legs straight out against the rock, the top hand on the rope above and the
    // brake hand low behind the hip, then bounding out with the knees bent.
    rig: [0, 1].map(f => sideFig(kit, { crouch: 4, lean: 4, look: 'down', hands: [[6, 7 - f], [4 + f, 6]], feet: [[3, 8.5], [-3, 8.5]] })),
    toss: sideFig(kit, { lean: 2, hands: [[7, -1], [6, 1]] }),
    clip: [0, 1].map(f => sideFig(kit, { lean: 1, look: 'down', hands: [[3, 4 - f], [2, 5]] })),
    // Pulling the rope down hand over hand, heaving on it with all their weight, and a shrug.
    pull: [sideFig(kit, { lean: -1, look: 'up', hands: [[4, -6], [3, -1]] }), sideFig(kit, { lean: -1, look: 'up', hands: [[4, -2], [4, -7]] })],
    heave: sideFig(kit, { lean: -3, crouch: 3, look: 'up', hands: [[5, -4], [4, -2]], feet: [[-3, 8.5], [3, 8.5]] }),
    shrug: frontFig(kit, { held: (b, cx, y) => { const K = typeof kit === 'string' ? KITS[kit] : kit; for (const sd of [-1, 1]) { for (let yy = y + 3; yy <= y + 7; yy++) { b.set(cx + 5 * sd, yy, 0); b.set(cx + 4 * sd, yy, 0); } b.set(cx + 5 * sd, y + 3, K.top[1]); b.set(cx + 6 * sd, y + 2, K.top[1]); b.set(cx + 7 * sd, y + 1, K.top[1]); b.set(cx + 8 * sd, y, K.hand[1]); b.set(cx + 9 * sd, y, K.hand[1]); } } }),
    rap: [sideFig(kit, { lean: -2, hands: [[3, -4], [-3, 6]], feet: [[8, 1], [7, 3]] }), sideFig(kit, { lean: -1, hands: [[3, -5], [-3, 6]], feet: [[6, 2], [5, 4]] })]
  };
}
// A piece of gear on the rock: a cam's lobes across the crack with its sling hanging below, a tiny cam,
// the rusty piton or the bolt's hanger. `open` is how far the lobes are spread (shut while it is
// carried, open once it is in), and the carabiner on the sling is drawn after the rope so the rope
// is seen running through it.
function drawPiece(scr, x, y, kind, open = 1) {
  if (kind === 'piton') { scr.set(x - 1, y, INK); scr.set(x, y, R.tent[0]); scr.set(x + 1, y, R.dirt[1]); scr.set(x + 1, y + 1, R.dirt[0]); return; }
  if (kind === 'bolt') { scr.set(x - 1, y, INK); scr.set(x, y, R.shoe[2]); scr.set(x, y + 1, R.shoe[1]); scr.set(x + 1, y + 1, INK); return; }
  // Silver lobes with a dark rim (spread across the crack once in), the stem, and a sling in the cam's
  // colour long enough to read as a coloured tick from far off.
  // A big cam for an off-width: wide lobes and a blue sling.
  const sl = kind === 'tiny' ? R.teal : kind === 'big' ? R.jay.slice(1) : R.red, w = kind === 'tiny' || !open ? 1 : kind === 'big' ? 3 : 2;
  for (let i = -w; i <= w; i++) { scr.set(x + i, y - 1, INK); scr.set(x + i, y, Math.abs(i) === w ? INK : (i + w) & 1 ? R.rock[4] : R.white[1]); }
  scr.set(x - 1, y + 1, INK); scr.set(x, y + 1, R.rock[3]); scr.set(x + 1, y + 1, INK);
  for (let j = 2; j < 5; j++) { scr.set(x - 1, y + j, sl[j < 4 ? 2 : 1]); scr.set(x, y + j, sl[1]); scr.set(x + 1, y + j, INK); }
}
// The carabiner: a small ring the rope passes through, at x, y (its middle).
function drawBiner(scr, x, y) { scr.set(x, y - 1, R.shoe[2]); scr.set(x + 1, y, R.shoe[1]); scr.set(x, y + 1, R.shoe[2]); scr.set(x - 1, y, INK); }
// Anchor slings in four colours, so each piece's sling can be followed to the master point.
const SLING = [R.kit, R.jay.slice(1), R.yellow.concat([R.yellow[1]]), R.red];
// One piece of an anchor (q, in the world): a cam, a nut (a small brass wedge on its wire), or a white
// sling round a horn or a block, lying along the rock's top (q.loop) and down both sides to a point
// below it (wider for a block). Returns the screen row its sling leaves from.
function anchorPiece(scr, q, kind, cx, rowOf) {
  const x = q.x - cx, y = rowOf(q.h);
  if (kind === 'cam') { drawPiece(scr, x, y, 'cam'); return y + 4; }
  if (kind === 'nut') { for (let i = -1; i <= 1; i++) scr.set(x + i, y - 1, INK); scr.set(x - 1, y, INK); scr.set(x, y, R.yellow[1]); scr.set(x + 1, y, INK); scr.set(x, y + 1, R.shoe[2]); scr.set(x, y + 2, R.shoe[1]); return y + 2; }
  for (const [lx, lh] of q.loop) scr.set(lx - cx, rowOf(lh), R.white[1]);
  const [l, r] = [q.loop[0], q.loop[q.loop.length - 1]], by = rowOf(q.bot);
  for (const [ex, eh] of [l, r]) { const n = Math.max(1, by - rowOf(eh)); for (let k = 1; k <= n; k++) scr.set(Math.round(lerp(ex, q.x, k / n)) - cx, rowOf(eh) + k, R.white[0]); }
  return by;
}
// A sling or tether: a one-pixel line in the light shade with the dark shade under it.
function strap(scr, x0, y0, x1, y1, ramp) {
  const n = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let k = 0; k <= n; k++) { const x = Math.round(lerp(x0, x1, k / n)), y = Math.round(lerp(y0, y1, k / n)); scr.set(x, y + 1, ramp[0]); scr.set(x, y, ramp[ramp.length - 1]); }
}
// Grit sliding down the slab from where he came off: six grains, each a little behind the one before,
// running down the slab beside his line faster and faster: tan chips of dirt and crystal, two pixels
// square (dark ones vanished into the slab's own speckle).
function grit(scr, e, cx, rowOf) {
  for (let i = 0; i < 6; i++) {
    const t = e - i * 0.08; if (t < 0) continue;
    const p = posAt(FALL.from - 2 - 55 * t * t), x = Math.round(p.x + 9 + (i % 3) * 2) - cx, y = rowOf(p.h + 4 + (i & 1) * 2);
    for (const [dx, dy, c] of [[0, 0, 1], [1, 0, 1], [0, 1, 0], [1, 1, 0]]) scr.set(x + dx, y + dy, R.dirt[c]);
  }
}
// A pack lying on its side under the overhang, in its owner's colour.
function makePack(ramp) {
  const b = new BM(10, 7); b.ox = 5; b.oy = 6;
  for (let y = 1; y < 6; y++) for (let x = 1 + (y < 2 ? 1 : 0); x < 9; x++) b.set(x, y, y === 3 ? ramp[0] : x < 4 ? ramp[2] : ramp[1]);
  outline(b, INK); return b;
}
// Hands meeting: a small star where they touch.
const spark = (scr, x, y, a) => { if (a < 0 || a > 0.22) return; const r = a < 0.08 ? 2 : 3; scr.set(x, y, R.white[1]); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { scr.set(x + dx, y + dy, R.white[1]); scr.set(x + dx * r, y + dy * r, R.yellow[1]); } };

// Cartoon wind lines: pale streaks with a curl at the front, blowing east across the view (TJ's
// reference: pale blue pixel swirls). More of them and faster the higher the camera, twice as many in
// a gust. Each lives 1.8 s: it draws itself in from the tail, travels, and wipes out from the tail.
function windLines(scr, t, W, g) {
  const { VW, VH } = scr, LIFE = 1.8, MAX = 12, n = Math.min(MAX, Math.round((1 + 5 * W) * (1 + g)));
  if (W < 0.08 && g === 0) return;
  for (let i = 0; i < n; i++) {
    const tt = t + i * LIFE / MAX, slot = Math.floor(tt / LIFE), age = tt - slot * LIFE, k = hash(slot, i, 796);
    const L = 22 + 22 * hash(slot, i, 797), v = 90 + 120 * W + 80 * g, x0 = Math.round(-40 + (VW + 40) * k + age * v - L), y0 = Math.round(12 + (VH - 70) * hash(slot, i, 798)), ph = 6 * k;
    const show = Math.min(1, age / 0.35), hide = Math.max(0, (age - LIFE + 0.5) / 0.5), r = 3 + 1.5 * k;
    windLine(scr, x0, y0, L, r, ph + t * 3, show, hide);
  }
}
function windLine(scr, x0, y0, L, r, ph, show, hide) {
  const N = L + 15, ex = x0 + L, ey = y0 + 1.6 * Math.sin(L / 7 + ph);
  for (let j = 0; j < N; j++) {
    const u = j / N; if (u > show || u < hide) continue;
    let x, y;
    if (j <= L) { x = x0 + j; y = y0 + 1.6 * Math.sin(j / 7 + ph); } else { const a = 0.3 + (j - L) * 0.35, rr = r * (1 - (j - L) / 19); x = ex + rr * Math.sin(a); y = ey - r + rr * Math.cos(a); }
    scr.set(Math.round(x), Math.round(y), u < 0.3 ? R.ice[3] : u < 0.65 ? R.farsnow[1] : R.white[1]);
  }
}
// A corner of a jacket snapping downwind, and loose hair streaming out from under a helmet.
function flap(scr, x, y, ramp, t, W, g, seed) {
  const len = Math.round((2 + 2.5 * W + 2 * g) * (0.6 + 0.4 * Math.sin(t * 17 + seed)));
  for (let i = 1; i <= len; i++) {
    const y1 = y + ((Math.floor(t * 12 + seed + i) & 1) && i > 1 ? 1 : 0);
    scr.set(x + i, y1 - 1, ramp[1]); if (i < len) scr.set(x + i, y1, ramp[0]); if (i === len) scr.set(x + i, y1, INK);
  }
}
function hair(scr, x, y, ramp, t, W, g, seed) {
  for (let row = 0; row < 3; row++) { const len = Math.round((3 + 3 * W + 3 * g - row) * (0.7 + 0.3 * Math.sin(t * 11 + seed + row))); for (let i = 1; i <= len; i++) scr.set(x + i, y + row + Math.round(0.8 * Math.sin(t * 14 + i + row * 2)), ramp[row === 1 ? 1 : row ? 0 : 2]); }
}
// Breath blown on cold hands, carried off downwind.
function puff(scr, x, y, u, t) {
  // Two breaths a blow, each a small cloud that swells as it drifts off and thins out.
  for (const b of [0.15, 0.6]) {
    const v = (u - b) / 0.4; if (v < 0 || v > 1) continue;
    const cx = x + Math.round(v * 10), cy = y - Math.round(v * 2 + 0.6 * Math.sin(t * 6)), r = 1 + Math.round(v * 1.5);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 0.5 && (v < 0.6 || ((dx + dy + Math.floor(t * 8)) & 1))) scr.set(cx + dx, cy + dy, dx * dx + dy * dy < r * r * 0.4 && v < 0.5 ? R.white[1] : R.farsnow[1]);
  }
}
function buildRidge() {
  const main = new Strip(W, UP, DOWN), things = [];
  const ID = paintRidge(main); paintGround(main, things);
  // The crest: the highest rock in every column, which the rope lies over where the route goes north.
  const CREST = new Int16Array(W);
  for (let x = 0; x < W; x++) { let y = 0; while (y < main.h && !ID[y * W + x]) y++; CREST[x] = main.up - y; }
  // Where each piece sits: in the nearest crack or joint (a dark pixel with rock above it and on both
  // sides, so never the outline against the sky) within reach of the spot above and beside his feet,
  // so every cam is seen in a real crack; failing that, on the rock below the spot. bi is the
  // carabiner's height.
  // Each anchor's pieces, by rule: spread across the rock beside the stance on the side the ridge rises
  // (so the leader, facing the rock, does not hide them), above it on the face, at the crest's top where
  // the belay is on the crest (measured from the stance, not the top of whatever block stands there); a cam or a nut in the nearest crack, a horn or a block slung at the
  // nearest high point of the rock's top. M is where their slings meet: below them on the face, at the
  // leader's waist on the crest.
  const isCrack = (x, y) => main.get(x, y) === INK && main.get(x, y - 2) && main.get(x - 2, y) && main.get(x + 2, y);
  const isTop = (x, y) => main.get(x, y) && !main.get(x, y - 1) && !main.get(x, y - 2);
  const ASPOT = SCRIPT.anc.map(A => {
    const a = posAt(MARK[A.m]), face = a.where === 's', n = A.kinds.length, used = [];
    const p = A.kinds.map((kd, i) => {
      const tx = Math.round(a.x) + 14 + Math.round((i - (n - 1) / 2) * (n > 2 ? 8 : 10)), th = Math.round(face ? a.h + 24 : a.h + 3);
      const test = kd === 'horn' || kd === 'block' ? isTop : isCrack;
      let best = null, bs = 1e9;
      for (let dh = -12; dh <= 9; dh++) for (let dx = -9; dx <= 9; dx++) {
        const x = tx + dx, y = -(th + dh);
        if (!test(x, y) || used.some(u => Math.abs(u - x) < 4)) continue;
        const sc = Math.hypot(dx, dh) - (test === isTop ? 2 * (CREST[x] - Math.min(CREST[x - 4], CREST[x + 4])) : 0);
        if (sc < bs) { bs = sc; best = { x, h: th + dh }; }
      }
      best = best || { x: tx, h: th }; used.push(best.x);
      if (test === isTop) {
        const w = kd === 'block' ? 4 : 2, top = x => { for (let d = 0; d <= 5; d++) for (const e of [d, -d]) if (isTop(x, -(best.h + e))) return best.h + e; return best.h; };
        best.loop = []; for (let i = -w; i <= w; i++) best.loop.push([best.x + i, top(best.x + i)]);
        best.bot = Math.min(best.loop[0][1], best.loop[2 * w][1]) - w;
      }
      return best;
    });
    const mx = Math.round(p.reduce((s2, q) => s2 + q.x, 0) / n);
    return { p, M: { x: mx, h: face ? Math.min(...p.map(q => q.h)) - 9 : Math.round(a.h + 10) } };
  });
  const SPOT = SCRIPT.pro.map(g => {
    const p = posAt(g.d), x0 = Math.round(p.x) + 4, h0 = Math.round(p.h + 14), dz = g.fixed ? 3 : 6;
    for (let r = 0; r < 8; r++) for (const dx of r ? [-r, r] : [0]) for (const dh of [0, 1, -1, 2, -2]) { const x = x0 + dx, y = -(h0 + dh); if (main.get(x, y) === INK && main.get(x, y - 2) && main.get(x - 2, y) && main.get(x + 2, y)) return { x: x0 + dx, h: h0 + dh, bi: h0 + dh - dz }; }
    let h = h0; while (h > p.h - 4 && !main.get(x0, -h)) h--;
    return { x: x0, h, bi: h - dz };
  });
  paintHolds(main);
  const far = paintFar(), basin = paintBasin(), clouds = [0, 1, 2].map(i => ({ bm: makeCloud(745 + i), x: i * 190, y: 20 + i * 46, v: 3 + i }));
  const pair = makeCragPair(), st = {}, focus = { x: 0, y: 0 };
  // The goat (H14) stands watching on top of the egg, the boulder the line hugs its way round on
  // pitch 4 (the highest of the egg's pieces, by rule), so it is off the line and looks down on them as
  // they edge round under it. It turns to watch whoever comes near.
  // Where they end up on top: the leader and TJ on the top boulder either side of the line's end, the
  // woman on the block just below it to the west, each on the rock's top there.
  const TOPX = ROUTE[ROUTE.length - 1][0], SUMMIT = { lead: TOPX + 7, tj: TOPX - 8, red: TOPX - 25 };
  for (const k in SUMMIT) { const x = SUMMIT[k]; SUMMIT[k] = { x, h: CREST[x] }; }
  // The descent (H16), placed by rule. The lip: going east from the top, the first place the rock
  // falls away more than 25 below within 6 across. EASTF: for each height, the rock's east edge there,
  // which the rappels go down. The anchor: the highest rock a few steps back from the lip, slung, with a
  // ring under it. Where each waits: back from the lip along the top. The cloud's top, as the camera
  // will frame the rappel, and from it how far each one drops, so they sink out of sight 80 % of the way
  // through their rappel.
  const LIPX = (() => { for (let x = TOPX + 10; x < TOPX + 120; x++) if (CREST[x + 6] < CREST[x] - 25) return x; return TOPX + 30; })(), LIPH = CREST[LIPX];
  const EASTF = new Int16Array(UP); for (let h = 0; h < UP; h++) { let x = Math.min(W - 1, LIPX + 160); while (x > LIPX - 12 && !ID[(main.up - h) * W + x]) x--; EASTF[h] = x; }
  const EAST = h => EASTF[clamp(Math.round(h), 0, UP - 1)];
  const RAPA = (() => {
    let x = LIPX - 5; for (let i = LIPX - 12; i <= LIPX - 5; i++) if (CREST[i] > CREST[x]) x = i;
    const loop = []; for (let i = -3; i <= 3; i++) loop.push([x + i, CREST[x + i] + 1]);
    return { x, h: CREST[x], loop, bot: Math.min(loop[0][1], loop[6][1]) - 3 };
  })();
  const EDGE = { x: LIPX - 1, h: CREST[LIPX - 1] }, WAIT = { lead: LIPX - 3, tj: LIPX - 15, red: LIPX - 26 };
  for (const k in WAIT) WAIT[k] = { x: WAIT[k], h: CREST[WAIT[k]] };
  const CAMD = LIPH - 50, CLOUDH = 0.88 * CAMD - 15 + 31 * smooth(220, 430, CAMD) + 10, HIP0 = EDGE.h + 4;
  const zease = u => u + 0.05 * Math.sin(6 * Math.PI * u), DROP = (HIP0 + 13 - (CLOUDH - 6)) / zease(0.8);
  // Under the cloud, by rule: the landing is where the east edge, going down from the lip, first meets
  // gentle ground; each stands there, TJ by the rock, the other two a step and two steps out. The
  // cloud's underside is 150 above the landing, and the flake that eats ropes is on the edge 55 above
  // it, painted into the rock: a sliver standing off the face with a dark crack behind it.
  const LH = Math.round(CLOUDH - 85), E0 = EAST(LH), CB = LH + 70, LX = EAST(LH + 8) + 8, LANDS = {};
  for (const [w, dx] of [['tj', 0], ['lead', 13], ['red', 25]]) LANDS[w] = { x: LX + dx, h: LH };
  // The snow slope (round 5, T75): steep snow seen face on, falling away under the ledge and east of it,
  // its upper edge rising east into the cloud's underside. XE is where they stand at the ledge's outer
  // end; the traverse runs from just below it down and across the face (snowAt: where along it, sp px
  // out). Painted once, kept apart and drawn only under the cloud, like the ledge.
  const XE = E0 + 44, snowAt = sp => ({ x: XE + 6 + sp, h: LH - 6 - 0.25 * sp });
  let SNOW = [];
  {
    // The tower's own east face at each row down from the ledge: the first gap going east from inside
    // the tower, never more than 3 px east of the row above (EAST is the last rock in a wide window,
    // which below the ledge is the spires beyond). Where the tower and a spire meet there is no gap,
    // and from there down the face is carried on at the lean it had over its last 12 rows.
    const solid = (x, h) => ID[(main.up - h) * W + x], FACE = new Map(), seen = [];
    for (let h = LH + 2, prev = E0 + 3, merged = false; h > LH - 562; h--) {
      let x = prev - 8; while (x < prev + 3 && solid(x + 1, h)) x++;
      if (merged || solid(x + 1, h)) { merged = true; const n = Math.min(12, seen.length - 1); x = Math.round(prev + (n > 0 ? (seen[seen.length - 1] - seen[seen.length - 1 - n]) / n : 0)); }
      else seen.push(x);
      FACE.set(h, x); prev = x;
    }
    for (let x = E0; x < E0 + 480; x++) {
      const tp = Math.min(CB + 30, x <= XE + 3 ? LH - 4 : Math.round(LH - 4 + 0.55 * (x - XE - 3) + 3 * (vnoise(x / 14, 1, 797) - 0.5) * 2));
      for (let h = tp; h > LH - 560; h--) {
        const f = FACE.get(h) ?? EAST(h); if (x <= f) continue;
        const k = tp - h, dd = clamp((LH - h) / 260, 0, 1), n = bayer(x, h);
        // Flat grey light under the cloud: pale snow with the fall line's runnels in it, a few rocks
        // standing out, and darker toward the bottom.
        let c = n < 0.25 + 0.6 * dd ? R.snow[1] : R.snow[2];
        if (dd > 0.55 && n < (dd - 0.55) * 1.5) c = R.snow[0];
        if (fbm(x / 2.5, h / 18, 798, 2) > 0.72) c = dd > 0.5 ? R.snow[0] : R.snow[1];
        if (fbm(x / 9, h / 6, 799, 3) > 0.8) c = pick('granite', 0.42 - 0.3 * dd, x, h);
        if (k === 0) c = R.snow[3]; else if (k === 1) c = R.snow[2];
        if (x === f + 1 && k > 0) c = INK;
        SNOW.push(x, h, c);
      }
      if (tp < CB + 30) SNOW.push(x, tp + 1, INK);
    }
    SNOW = Int32Array.from(SNOW);
  }
  // The ledge they land on: a shelf of the tower's pale rock standing out from the east face, lit on
  // top, thinning toward its end, ink under it and a dark joint where it meets the face. It is kept
  // apart and drawn only under the cloud, so it does not stick out of the tower all through pitch 5.
  const LEDGE = [];
  for (let x = E0 - 1; x <= E0 + 46; x++) {
    const u = (x - E0) / 46, th = Math.round(lerp(8, 3, u) + (u > 0.9 ? -2 * (u - 0.9) * 10 : 0)), top = LH - (u > 0.95 ? 1 : 0);
    for (let k = 0; k <= th; k++) {
      const h = top - k, c = k === 0 ? (hash(x, 1, 790) < 0.3 ? R.gold[6] : R.granite[5]) : k === th ? INK : pick('granite', 0.32 + 0.66 * (0.62 - 0.08 * k), x, h);
      LEDGE.push(x, h, x === E0 - 1 && k > 0 ? INK : c);
    }
    if (x === E0 + 46) for (let k = 0; k <= th; k++) LEDGE.push(x + 1, top - k, INK);
  }
  // The flake that eats ropes: a pale sliver standing off the face, with a dark slot behind it that
  // closes at its top, where a rope's end can jam.
  const FL = (() => {
    const hf = LH + 46;
    for (let j = 0; j < 18; j++) {
      const h = hf - 8 + j, e = EAST(h), joined = j >= 14, slot = j >= 1 && j < 14;
      for (let k = 1; k <= 6; k++) {
        let c;
        if (k <= 2) c = slot ? INK : joined && k <= 4 - (j - 14) ? pick('granite', 0.45, e + k, h) : 0;
        else if (k <= 5) c = j === 0 ? INK : joined && k > 4 - (j - 14) ? 0 : k === 3 ? R.gold[6] : pick('granite', 0.75 - 0.15 * (k - 3), e + k, h);
        else c = j < 14 ? INK : 0;
        if (c) main.set(e + k, -h, c);
      }
    }
    for (let k = 1; k <= 4; k++) main.set(EAST(hf + 10) + k, -(hf + 10), INK);
    return { x: EAST(hf + 3) + 2, h: hf + 3 };
  })();
  const underAt = (w, a) => {
    const L = LANDS[w];
    if (w === 'tj' && a < UNDER.land) {
      const u = clamp((a - UNDER.out) / (UNDER.land - UNDER.out), 0, 1), hip = lerp(CB + 10, L.h + 8, u + 0.04 * Math.sin(4 * Math.PI * u));
      const out = 3 * Math.abs(Math.sin(2 * Math.PI * u)) ** 3, e = smooth(0.8, 1, u);
      return { x: lerp(EAST(hip) + 8 + out, L.x, e), h: hip - 8, dp: u < 0.97 ? 'zip' : 'clip', push: out > 1, left: true, zu: 2 };
    }
    if (a < UNDER.land) return { x: L.x, h: L.h, dp: 'stand', left: true };
    if (a < UNDER.unclip) return { x: L.x, h: L.h, dp: w === 'tj' ? 'clip' : 'stand', left: true };
    if (a < UNDER.heave[0]) return { x: L.x, h: L.h, dp: 'pull', left: true };
    if (a < UNDER.heave[1]) return { x: L.x, h: L.h, dp: frac((a - UNDER.heave[0]) / 1.0) < 0.55 ? 'heave' : 'pull', left: true };
    if (a < UNDER.look) return { x: L.x, h: L.h, dp: 'stand', left: true };
    if (a < UNDER.shrug[0]) return { x: L.x, h: L.h, dp: 'stand', left: w !== 'tj' };
    if (a < UNDER.shrug[1]) return { x: L.x, h: L.h, dp: 'shrug', left: true };
    const s0 = UNDER.walk + SN.order[w] * SN.gap;
    if (a >= s0) {
      const b = a - s0;
      if (b < SN.ledge) return { x: lerp(L.x, XE, smooth(0, SN.ledge, b)), h: L.h, dp: 'walk', left: false };
      if (b < SN.ledge + SN.step) { const u = (b - SN.ledge) / SN.step; return { x: lerp(XE, XE + 6, u), h: lerp(LH, LH - 6, u), dp: 'snow', sp: 0, left: false }; }
      const sp = (b - SN.ledge - SN.step) * SN.v, q = snowAt(sp);
      return { x: q.x, h: q.h, dp: 'snow', sp, left: false };
    }
    return { x: L.x, h: L.h, dp: 'stand', left: a < s0 - 0.3 && (w !== 'tj' || a < UNDER.walk - 0.3) };
  };
  // Where one of them is v seconds into the descent, in what pose (dp), facing which way (left).
  const descAt = (w, v) => {
    if (v >= DESC.under) return underAt(w, v - DESC.under);
    const T = DESC.turn[w], wk = DESC.walk[w], wt = WAIT[w];
    if (v < T) {
      if (v < wk[1]) { const x = lerp(SUMMIT[w].x, wt.x, smooth(wk[0], wk[1], v)); return { x, h: CREST[Math.round(x)], dp: v > wk[0] ? 'walk' : 'stand', left: false }; }
      if (w === 'lead') return { x: wt.x, h: wt.h, dp: v < DESC.rig[1] ? 'rig' : v < DESC.toss[1] ? 'toss' : 'stand', left: v < DESC.rig[1] };
      return { x: wt.x, h: wt.h, dp: 'stand', left: false };
    }
    const a = v - T;
    if (a < 0.7) { const x = lerp(wt.x, EDGE.x, smooth(0, 0.7, a)); return { x, h: CREST[Math.round(x)], dp: w === 'lead' ? 'stand' : 'walk', left: false }; }
    if (a < 1.5) return { x: EDGE.x, h: EDGE.h, dp: 'clip', left: true };
    const u = Math.min(1.6, (a - 1.5) / ZIP), hip = HIP0 - DROP * zease(u), e = smooth(0, 0.14, u);
    const out = 3 * Math.abs(Math.sin(3 * Math.PI * u)) ** 3 * smooth(0.05, 0.2, u);
    return { x: lerp(EDGE.x, EAST(hip) + 8 + out, e), h: lerp(EDGE.h, hip - 8, e), dp: 'zip', push: out > 1, left: true, zu: u };
  };
  const GOAT = { stand: goat('stand'), look: goat('look') }, goatAt = (() => {
    const e = LANDMARKS.egg.reduce((m, q) => (q.h + q.b > m.h + m.b ? q : m)), x = Math.round(e.x);
    return { x, h: CREST[x] };
  })();
  // The raven (H14): one in each 36 seconds it rides the updraft over the crest ahead of the camera,
  // hanging almost still for six seconds, then croaks and peels away downwind. ravenGo: a start
  // button's raven, now.
  const RV = { slot: 36, len: 10 }, RB = { hang: [raven('hang', 0), raven('hang', 1)], peel: raven('peel') };
  let ravenGo = -1e9, ravenN = null, ravenAt = null, ravenHeard = null;
  // Clicks (round 6, note 10): the goat snorts and leaps on its boulder; the raven croaks and rolls over in the
  // air, as ravens do for the fun of it. Where each was drawn this frame, in view pixels, for a click to find.
  const poked = { goat: -99, raven: -99 }; let goatSeen = null, ravenSeen = null;
  // On the ridge all three wear helmets, one colour each with their hair showing below: his green, the
  // leader's red, the woman's white over her red hair. The leader carries the rack on his harness.
  const KIT = { tj: 'wall', lead: { ...PAIR[0], bare: false, hat: R.red, rack: true }, red: { ...PAIR[1], bare: false, hat: [R.white[0], R.white[1], R.white[1]] } };
  const KO = w => typeof KIT[w] === 'string' ? KITS[KIT[w]] : KIT[w], KH = {};
  for (const w of WHO) KH[w] = { ...KO(w), hood: true };
  // She sits and eats bare-headed, and her helmet goes on with his at the foot of the climb.
  const BARE = kitFrames(PAIR[1]);
  // On the snow, facing in, an ice axe in each hand: right axe up, left axe up, right foot up, left foot up.
  // The axe: held near the foot of its shaft, its head above the hand with the pick driven into the snow.
  const axe = (b, x, y) => { for (let k = 1; k <= 4; k++) b.set(x, y - k, R.bark[2]); for (let k = -1; k <= 2; k++) b.set(x + k, y - 5, R.rock[k === 2 ? 0 : 1]); b.set(x + 2, y - 4, R.rock[0]); b.set(x - 1, y - 6, R.rock[3]); };
  const SNOWF = {}; for (const w of WHO) SNOWF[w] = [[[-8, -16], [9, -21], [-4, 10], [4, 10]], [[-9, -21], [8, -16], [-4, 10], [4, 10]], [[-8, -18], [8, -18], [-4, 10], [5, 5]], [[-8, -18], [8, -18], [-5, 5], [4, 10]]].map(([a, b2, c, d]) => backFig(KIT[w], { hands: [a, b2], feet: [c, d], tool: axe }));
  const F = { tj: kitFrames(KIT.tj, R.blaze), lead: kitFrames(KIT.lead), red: kitFrames(KIT.red) }, FH = { tj: kitFrames(KH.tj, R.blaze), lead: kitFrames(KH.lead), red: kitFrames(KH.red) };
  // On the face their hands and feet are on the holds (H10). The drawings are made as they are needed
  // and kept: the limbs fall on whole pixels, so the same few come round again and again. right, when
  // given, is where the right hand is busy (placing, clipping, cleaning, shaking out) instead.
  const figs = new Map();
  const figAt = (w, lb, right, tool, hood) => {
    const l = { hands: [lb.hands[0], right || lb.hands[1]], feet: lb.feet };
    const key = w + l.hands.join() + ';' + l.feet.join() + (tool ? 't' : '') + (hood ? 'h' : '');
    let b = figs.get(key);
    if (!b) { if (figs.size > 900) figs.clear(); b = backFig(hood ? KH[w] : KIT[w], { ...l, tool: tool ? F[w].holding : undefined }); figs.set(key, b); }
    return b;
  };
  const packs = [makePack(R.teal), makePack(R.red), makePack([R.mustard[0], R.mustard[1], R.mustard[2]])], dropAt = SCRIPT.dropAt;
  const ropePts = [];
  let camX = 0, camH = 0, seaSnap = null, seaTops = null;
  // While a card is open at a belay (H17), the ridge plays on behind it at its own pace, the followers
  // climbing up, until everyone is at the anchor: ahead is how far it has got. When the visitor carries
  // on, the timeline jumps by that much (skip), so nothing is watched twice.
  let ahead = 0, aheadAt = -1;
  // A gust now and then: one in each 9 seconds, at a random point in its first 4, lasting 3; and the
  // debug menu's gust, now.
  const GUSTR = { slot: 9, len: 3 };
  let gustGo = -1e9, gustHeard = null;
  const gustAt = t => { if (t - gustGo >= 0 && t - gustGo < GUSTR.len) return [t - gustGo, 'go' + gustGo]; const n = Math.floor(t / GUSTR.slot), u = t - n * GUSTR.slot - 4 * hash(n, 3, 795); return u >= 0 && u < GUSTR.len ? [u, n] : null; };
  // The rappel rope: from the ring over the lip; while someone is on it, tight to their device and the
  // tail hanging below them; otherwise lying down the rock's east edge. Thrown, it uncoils down the edge.
  const rp = [];
  function descRope(scr, dv, P, cx, rowOf) {
    rp.length = 0;
    const lip = [LIPX + 1 - cx, rowOf(LIPH + 1)];
    rp.push(RAPA.x - cx, rowOf(RAPA.bot), ...lip);
    let on = null; for (const w of WHO) { const s = P[w]; if (s.dp === 'zip' && s.zu < 1 && (!on || s.zu < on.zu)) on = s; }
    if (on && on.zu > 0.02) {
      const dx = Math.round(on.x) - cx - 2, hh = on.h + 8; rp.push(dx, rowOf(hh));
      for (let h = hh - 6; h > hh - 260; h -= 6) rp.push(Math.max(dx, EAST(h) + 1 - cx), rowOf(h));
    } else {
      const e = smooth(DESC.toss[0], DESC.toss[1], dv), len = 260 * e;
      for (let d = 6; d < len; d += 6) { const h = LIPH - d, sw = 5 * (1 - e) * Math.sin(d / 9 + dv * 12) * (d / 60); rp.push(EAST(h) + 1 + Math.round(sw) - cx, rowOf(h)); }
    }
    rope(scr, rp, false);
  }
  // The rope under the cloud: both strands down the edge from the cloud to a pile at its foot; TJ on
  // it coming down; then strand A from their hands to the foot and up the edge, while the other strand's
  // tail whips up the edge (a little out from it), jams in the flake and hangs tight from it.
  const up = (out, h0, dx, cx, rowOf) => { for (let h = h0; h < CB + 40; h += 6) out.push(EAST(h) + dx - cx, rowOf(h)); };
  function underRope(scr, a, P, cx, rowOf) {
    const foot = LH + 2;
    rp.length = 0;
    if (a < UNDER.unclip && P.tj.dp === 'zip') {
      const dx = Math.round(P.tj.x) - 2, hh = P.tj.h + 8;
      rp.push(EAST(CB + 40) + 1 - cx, rowOf(CB + 40), dx - cx, rowOf(hh));
      for (let h = hh - 6; h > foot; h -= 6) rp.push(Math.max(dx, EAST(h) + 1) - cx, rowOf(h));
      rp.push(EAST(foot) + 3 - cx, rowOf(foot - 1));
      rope(scr, rp, false); return;
    }
    if (a < UNDER.unclip || a >= UNDER.shrug[0]) {
      if (a >= UNDER.walk) rp.push(EAST(foot) + 9 - cx, rowOf(foot - 1)); else rp.push(Math.round(P.lead.x) - 3 - cx, rowOf(P.lead.h + 1));
      rp.push(EAST(foot) + 2 - cx, rowOf(foot)); up(rp, foot + 6, 1, cx, rowOf); rope(scr, rp, false);
    } else {
      for (const w of ['red', 'lead', 'tj']) { const q = P[w]; rp.push(Math.round(q.x) - 5 - cx, rowOf(q.h + (q.dp === 'heave' ? 13 : 17))); }
      rp.push(EAST(foot + 10) + 1 - cx, rowOf(foot + 10)); up(rp, foot + 16, 1, cx, rowOf); rope(scr, rp, false);
    }
    // The other strand.
    rp.length = 0;
    if (a < UNDER.unclip) { rp.push(EAST(foot) + 6 - cx, rowOf(foot)); up(rp, foot + 6, 5, cx, rowOf); rope(scr, rp, true); return; }
    const e = smooth(UNDER.unclip, UNDER.snag, a) ** 1.4, th = lerp(foot, FL.h, e), stuck = a >= UNDER.snag;
    let tip;
    if (stuck) {
      // Jammed: the end hangs out under the slot, and from the slot the rope runs tight up into the cloud.
      tip = [FL.x + 4 - cx, rowOf(FL.h - 11)]; rp.push(...tip, FL.x + 2 - cx, rowOf(FL.h - 5), FL.x - cx, rowOf(FL.h), EAST(CB + 40) + 6 - cx, rowOf(CB + 40));
    } else {
      // Running: the end whips up the face, the last of the rope flailing behind it.
      for (let k = 0; k <= 6; k++) { const h = th + 4 * k, wob = 6 * (1 - k / 7) * Math.sin(a * 23 - k * 1.3); rp.push(EAST(h) + 6 + Math.round(wob) - cx, rowOf(h)); }
      tip = [rp[0], rp[1]]; up(rp, Math.ceil(th) + 30, 5, cx, rowOf);
    }
    rope(scr, rp, true);
    scr.set(tip[0], tip[1], R.white[1]); scr.set(tip[0], tip[1] + 1, R.white[1]);
    if (stuck) spark(scr, FL.x - cx, rowOf(FL.h), (a - UNDER.snag) * 0.5);
  }
  return {
    ...META,
    enter(scr, arg, q) { const p = posAt(stateAt(q * DUR).tj.d); camX = p.x; camH = p.h; st.y = null; },
    focus: () => focus,
    pick(sx, sy) {
      if (ravenSeen && Math.abs(sx - ravenSeen[0]) < 10 && sy > ravenSeen[1] - 8 && sy < ravenSeen[1] + 6) return { label: NAMES.ridge.raven, x: ravenSeen[0], y: ravenSeen[1] - 10, act: 'raven' };
      if (goatSeen && Math.abs(sx - goatSeen[0]) < 12 && sy > goatSeen[1] - 22 && sy < goatSeen[1] + 2) return { label: NAMES.ridge.goat, x: goatSeen[0], y: goatSeen[1] - 24, act: 'goat' };
      return null;
    },
    act(id, env) { if (!(id in poked)) return false; if (env.t - poked[id] > 1.5) { poked[id] = env.t; env.sfx(id === 'raven' ? 'croak' : 'snort'); } return true; },
    skip() { const a = ahead; ahead = 0; aheadAt = -1; return a; },
    trigger(name, t) { if (name === 'ridgegust') { gustGo = t; return true; } if (name === 'raven') { ravenGo = t; return true; } return false; },
    draw(scr, env, arg, q) {
      const tau0 = q * DUR, card = env.running ? null : SCRIPT.stops.find(st => st.settle && Math.abs(st.t - tau0) < 0.02);
      if (card) { if (aheadAt !== card.t) { aheadAt = card.t; ahead = 0; } ahead = Math.min(card.settle - card.t, ahead + env.dt); }
      else if (!env.running) { ahead = 0; aheadAt = -1; }
      const { VW, VH, fb } = scr, { t } = env, tau = tau0 + ahead, S = stateAt(tau), k = env.calm ? 1 : Math.min(1, env.dt * 5);
      // The camera holds on whoever is on the live end of a rope (between the two of them on pitch 1, and
      // between climber and belayer while someone hangs on the rope, so the catch is seen),
      // so it does not jump back to the belayer each time the climber stops; him the rest of the time.
      const held = r => OFF.includes(S[r.b].pose), mid = (p, q) => ({ x: (p.x + q.x) / 2, h: (p.h + q.h) / 2 });
      // A rope hanging slack between two at a stance, and the one she trails, do not lead the camera.
      const live = S.ropes.filter(r => !r.idle && !r.trail);
      const ends = live.length ? live.map(r => held(r) ? mid(posAt(S[r.a].d), posAt(S[r.b].d)) : posAt(S[r.b].d)) : [posAt(S.tj.d)], at = { x: ends.reduce((a, p) => a + p.x, 0) / ends.length, h: ends.reduce((a, p) => a + p.h, 0) / ends.length };
      const dv = tau - SCRIPT.descT;
      if (dv >= 0) { at.x = LIPX + 6; at.h = CAMD; }
      if (dv >= DESC.under) { at.x = LX + 24 + 70 * smooth(UNDER.walk + 1.4, UNDER.walk + 6, dv - DESC.under); at.h = LH + 45; }
      camX += (at.x - camX) * k; camH += (at.h - camH) * k;
      // The wind where the camera is, and the gust's strength; a whoosh as each gust arrives, louder
      // high up (none at the foot, where there is no wind to speak of).
      const gu = gustAt(t), g = gu ? Math.sin(Math.PI * gu[0] / GUSTR.len) : 0, wnd = tau - SCRIPT.descT >= DESC.under ? 0 : windy(camH), wob = 2.5 * wnd * (0.35 + g);
      if (gu && gu[1] !== gustHeard) { gustHeard = gu[1]; if (wnd > 0.12 || typeof gu[1] === 'string') env.sfx(wnd > 0.55 ? 'windHi' : 'wind'); }
      const base = baseline(scr, env.shown && !String(env.shown).startsWith('wait:'), st) - Math.round(VH * (scr.narrow ? 0.2 : 0.24)), cx = clamp(Math.round(camX - VW * (scr.narrow ? 0.5 : 0.45)), 0, W - VW), rowOf = hh => Math.round(base + camH - hh);
      const sb = R.skyband;
      for (let y = 0; y < VH; y++) {
        const f = clamp((y + 120 - camH * 0.25) / 330, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0, row = y * VW;
        if (e < 0.72 || b0 >= sb.length - 1) fb.fill(sb[b0], row, row + VW); else for (let xx = 0; xx < VW; xx++) fb[row + xx] = sb[b0 + (bayer(xx, y) < (e - 0.72) / 0.28 ? 1 : 0)];
      }
      for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v) % (VW + 140)) - 70, c.y + camH * 0.12 - 20);
      drawStrip(scr, far, 120 + cx * 0.15, base + camH * 0.08 + 60, false, R.far[1]);
      drawStrip(scr, basin, 300 + cx * 0.4, base + camH * 0.12 - 25, false, R.far[1]);
      const seaC = smooth(220, 430, camH), seaTop = base + camH * 0.12 - 25 + 40 - 31 * seaC, seaX = Math.round(300 + cx * 0.4);
      // The one cloud sea (round 5, T74): from when the haul starts its near part rises up the tower from
      // the bottom of the picture, always below TJ, until by the time he is up it stands at CLOUDH, the
      // height they rappel into it at. Below the far sea's surface it is drawn only over rock, so the
      // two are one sea.
      const rising = SCRIPT.haulAt > 0 && tau >= SCRIPT.haulAt && dv < DESC.under;
      if (rising && (!seaSnap || seaSnap.length !== fb.length)) seaSnap = new fb.constructor(fb.length);
      if (rising && (!seaTops || seaTops.length !== VW)) seaTops = new Int16Array(VW);
      cloudSea(scr, seaTop, seaC, t, seaX, 1e9, rising ? seaTops : null);
      if (rising) seaSnap.set(fb);
      const cbH = CB - 8 * Math.max(0, camH - (LH + 45));
      if (dv >= DESC.under) gloom(scr, Math.max(0, rowOf(cbH)));

      // One of them, in the pose the script gives, at their place on the line.
      const P = {};
      for (const w of WHO) { const s = S[w], p = posAt(s.d); P[w] = { ...s, ...p, steep: p.where === 's' && Math.abs(p.dh) > Math.abs(p.dx) * 0.8 }; }
      if (P.red.where === 's' && P.red.moving) P.red.x += 1.5 * Math.sin(P.red.d / 7);
      if (P.tj.pose === 'whip' || P.tj.pose === 'swing' || P.tj.pose === 'hauled') { const sw = swingAt(tau); P.tj.x += sw.x; P.tj.h += sw.h; }
      // For the haul the woman steps down the rope from the leader so the two pull one behind the other,
      // and each throws their weight back a step on every heave.
      { const apart = smooth(SCRIPT.rigAt, SCRIPT.rigAt + 0.4, tau) * (1 - smooth(SCRIPT.upAt, SCRIPT.upAt + 0.3, tau)); P.red.x -= 8 * apart; for (const w of ['lead', 'red']) P[w].x += P[w].pose === 'heave' ? 5 : P[w].pose === 'pull' ? -3 : 0; }
      // On the face, hands and feet on the holds, and the hips between them.
      for (const w of WHO) { P[w].hood = P[w].h >= HOOD_H; P[w].fig = null; }
      // On the summit each eases over to their spot as they walk up to it.
      const sv = tau - SCRIPT.sumT;
      if (sv >= 0) for (const w of WHO) { const wk = WALKS[w], e = wk ? smooth(wk[0], wk[1], sv) : 1; P[w].x = lerp(P[w].x, SUMMIT[w].x, e); P[w].h = lerp(P[w].h, SUMMIT[w].h, e); P[w].sv = sv; }
      if (dv >= 0) for (const w of WHO) Object.assign(P[w], descAt(w, dv));
      for (const w of WHO) { const s = P[w], on = ['lead', 'climb', 'place', 'clean', 'unclip', 'rest'].includes(s.pose) && !styleAt(s.d); s.lb = on ? limbs(w, s.d) : null; s.bx = on ? s.lb.bx : 0; }
      // At a belay on the face the followers hang staggered, each lower and further across the face from
      // the leader (never out over the air beside the ridge's edge), instead of one under the other's
      // feet; they ease over in their last few moves to it and back onto the line as they leave.
      for (const m of FACE_BELAYS) for (const w of ['tj', 'red']) {
        const e = smooth(0, 1, 1 - Math.abs(P[w].d - (MARK[m] + AT[w])) / 12);
        if (e > 0) { const a = posAt(MARK[m]); P[w].x = lerp(P[w].x, a.x + (w === 'red' ? 12 : 24), e); P[w].h = lerp(P[w].h, a.h - (w === 'red' ? 12 : 22), e); }
      }
      const bumping = S.tj.pose === 'bump';
      const rateOf = w => { const r = S.ropes.find(r => r.a === w); return r && S[r.b].moving; };
      const draw1 = w => {
        const s = P[w], fr = w === 'red' && tau < SCRIPT.lidAt ? BARE : (s.hood ? FH : F)[w], sx = Math.round(s.x) - cx, sy = rowOf(s.h);
        const put = (bm, x, y, f) => { scr.put(bm, x, y, f); s.fig = { x, y, f, back: bm.oy === 28, side: bm.oy === 36 }; };
        const u = s.u, flick = Math.floor(t * 3) & 1;
        if (s.pose === 'sit') { pair.snack(scr, 1, sx, sy, t, 0); return; }
        if (s.pose === 'summit') {
          const v = s.sv, wk = WALKS[w], five = FIVES.find(q => (q.a === w || q.b === w) && v > q.at - 0.5 && v < q.at + 0.5);
          if (wk && v > wk[0] && v < wk[1]) { put(fr.side[Math.floor(t * 9) % 6], sx, sy, false); return; }
          if (five) { const other = P[five.a === w ? five.b : five.a]; put(fr.five, sx, sy, other.x < s.x); return; }
          if (w === 'red' && v > 4.0) { put(fr.sit, sx, sy, false); return; }
          // Before her turn, TJ and the leader face each other; after the fives they face out, east.
          put(fr.idle, sx, sy, v < 1.4 && w === 'lead' ? true : v < 4.0 && w === 'red' ? false : false); return;
        }
        if (s.pose === 'desc') {
          if (s.dp === 'walk') { put(fr.side[Math.floor(t * 9) % 6], sx, sy, s.left); return; }
          if (s.dp === 'rig') { put(fr.rig[Math.floor(t * 3) & 1], sx, sy, true); return; }
          if (s.dp === 'toss') { put(fr.toss, sx, sy, false); return; }
          if (s.dp === 'clip') { put(fr.clip[Math.floor(t * 4) & 1], sx, sy, true); return; }
          if (s.dp === 'zip') { put(fr.rap[s.push ? 1 : 0], sx, sy, true); return; }
          if (s.dp === 'pull') { put(fr.pull[Math.floor(t * 4) & 1], sx, sy, true); return; }
          if (s.dp === 'heave') { put(fr.heave, sx, sy, true); return; }
          if (s.dp === 'shrug') { put(fr.shrug, sx, sy, false); return; }
          if (s.dp === 'snow') { put(SNOWF[w][Math.floor(s.sp / 3) % 4], sx, sy - 12, false); return; }
          // Waiting their turn, they watch the edge.
          put(fr.idle, sx, sy, s.left); return;
        }
        // Off the off-width: falling, then hanging on the rope while he swings and is hauled.
        if (s.pose === 'whip') { put(fr.fall[Math.floor(t * 20) & 1], sx, sy - 12, false); return; }
        if (s.pose === 'swing' || s.pose === 'hauled') { put(fr.hang, sx, sy - 12, false); return; }
        // The haul: crouched over the rope rigging it; then, facing the load, a reach down the rope and a heave back.
        if (s.pose === 'rig') { put(fr.rig[Math.floor(t * 3) & 1], sx, sy, true); return; }
        if (s.pose === 'pull') { put(fr.rig[0], sx, sy, true); return; }
        if (s.pose === 'heave') { put(fr.heave, sx, sy - (u < 0.5 ? 1 : 0), true); return; }
        if (s.pose === 'walk' || (s.moving && !s.steep && s.pose !== 'drop')) { put(env.moving && s.moving ? fr.side[Math.floor(s.d / 4.2) % 6] : fr.idle, sx, sy, s.dir < 0); return; }
        if (s.pose === 'drop') { put(u < 0.25 || u > 0.85 ? fr.idle : fr.crouch, sx, sy, true); return; }
        if (s.pose === 'rack') { put(fr.rack[Math.floor(t * 1.5) & 1], sx, sy, true); return; }
        if (s.pose === 'lid') { put(fr.lid[tau < SCRIPT.lidAt ? 0 : 1], sx, sy, false); return; }
        if (s.pose === 'tie') { put(fr.tie[Math.floor(t * 6) & 1], sx, sy, false); return; }
        if (s.pose === 'bump') { put(u < 0.2 || u > 0.85 ? fr.idle : fr.bump[u > 0.45 && u < 0.7 ? 1 : 0], sx, sy, w !== 'tj'); return; }
        if (s.pose === 'lead' || s.pose === 'climb') { const st = styleAt(s.d); if (st || !s.lb) put(st ? fr[st][Math.floor(s.d / 4) & 1] : fr.anchor[0], sx, sy - 12, false); else put(figAt(w, s.lb, null, 0, s.hood), sx + s.bx, sy - 12, false); return; }
        // Placing, clipping, cleaning and shaking out on the face: the left hand and both feet stay on
        // their holds while the right hand works.
        if (s.lb && (s.pose === 'place' || s.pose === 'clean' || s.pose === 'unclip' || s.pose === 'rest')) {
          const f = Math.floor(t * 4) & 1, R2 = s.pose === 'place' ? (u < 0.2 ? [[7, -9], 1] : [[6, -16], 0]) : s.pose === 'rest' ? [[6 + f, 3 - f * 2], 0] : s.pose === 'clean' && u >= 0.55 ? [[4, 1], 1] : [[5, -9], 0];
          put(figAt(w, s.lb, R2[0], R2[1], s.hood), sx + s.bx, sy - 12, false); return;
        }
        if (s.pose === 'place') { put(fr.place[u < 0.2 ? 0 : 1], sx, sy - 12, false); return; }
        if (s.pose === 'rest') { put(fr.rest[Math.floor(t * 4) & 1], sx, sy - 12, false); return; }
        if (s.pose === 'slip') { put(fr.fall[Math.floor(t * 20) & 1], sx, sy - 12, false); return; }
        if (s.pose === 'hang') { put(fr.hang, sx, sy - 12, false); return; }
        // Holding a fall from below lifts him off his feet a moment as the rope comes tight (round 3's catch).
        if (s.pose === 'catch') { const r = S.ropes.find(r => r.a === w), c = r && P[r.b]; const up = c && c.h > s.h; put(fr.catch[up ? 'up' : 'down'], sx, sy - (up && u < 0.2 ? 2 : 0), c ? c.x < s.x : true); return; }
        if (s.pose === 'unclip') { put(fr.clean[0], sx, sy - 12, false); return; }
        if (s.pose === 'clean') { put(fr.clean[u < 0.55 ? 0 : 1], sx, sy - 12, false); return; }
        if (s.pose === 'anchor') { put(fr.anchor[flick], sx, sy - 12, false); return; }
        if (s.pose === 'fall') { put(fr.fall[Math.floor(t * 20) & 1], sx, sy - 12, false); return; }
        // Belaying: side-on, facing whoever is on the rope; paying out from below, taking in from above.
        if (s.pose === 'belay' || s.pose === 'tbelay') { const r = S.ropes.find(r => r.a === w), c = r && P[r.b], face = c ? c.x < s.x : s.pose === 'tbelay'; put(fr[s.pose][rateOf(w) ? flick : 0], sx, sy, face); return; }
        // High up, someone waiting at a stance blows on their hands now and then, and the breath blows away.
        if (s.hood && !s.moving && s.pose === 'stand') { const kk = frac((t + 2.9 * WHO.indexOf(w)) / 7); if (kk < 0.32) { put(fr.blow[Math.floor(t * 3) & 1], sx, sy, false); puff(scr, sx + 8, sy - 18, kk / 0.32, t); return; } }
        put(fr.idle, sx, sy, false);
      };
      for (const w of WHO) if (P[w].where === 'n') draw1(w);
      drawStrip(scr, main, cx, base + camH, false, R.grass[0]);
      if (dv >= DESC.under) {
        paintMany(scr, SNOW, cx, rowOf(0));
        // The steps TJ kicks, a pit every 4 px behind him.
        if (P.tj.dp === 'snow') for (let sp = 0; sp < P.tj.sp - 2; sp += 4) { const q = snowAt(sp), x = Math.round(q.x) - cx, y = rowOf(Math.round(q.h)); scr.set(x, y, R.snow[1]); scr.set(x + 1, y, R.snow[0]); }
        paintPts(scr, LEDGE, cx, rowOf);
      }
      for (const th of things) {
        const sx = th.x - cx, sy = rowOf(th.h);
        if (sx < -40 || sx > VW + 40) continue;
        if (th.tree) for (const part of th.tree.parts) scr.blit(part.bm, sx + part.x, sy + part.y);
        else if (th.tuft) { for (let j = -th.tuft; j <= th.tuft; j++) for (let k2 = 0; k2 < th.tuft + 1 - Math.abs(j) + (j & 1); k2++) scr.set(sx + j, sy - k2, R.grass[k2 ? 3 : 1]); }
        else { const r = th.pine; for (let j = 0; j < r; j++) for (let dd = -r + j; dd <= r - j; dd++) scr.set(sx + dd, sy - j, R.conifer[(dd + j) & 1 ? 2 : 3 - (j > r / 2 ? 0 : 1)]); }
      }
      // The packs under the overhanging rock: theirs from the start, his once he has put it down.
      { const px = Math.round(posAt(PACKS).x) - cx + 2, py = rowOf(posAt(PACKS).h - 1); scr.put(packs[0], px - 6, py, false); scr.put(packs[1], px + 3, py + 1, true); if (tau > dropAt) scr.put(packs[2], px + 12, py + 1, false); }
      const pro = SCRIPT.pro, lit = i => tau >= pro[i].clip && tau < pro[i].gone;
      // The live ropes, from the belayer's hands through the carabiner of every piece clipped between
      // them, in order, to the climber's waist; where the line between two of those goes along or
      // behind the crest, over the crest along its upper hull. A piece holds the leader's rope until the
      // woman swaps the second rope into it, and the second rope from then until TJ takes it out.
      let haul = null;
      for (const r of S.ropes) {
        const a = P[r.a], c = P[r.b], lo = Math.min(a.d, c.d), hi = Math.max(a.d, c.d);
        // A leader's rope also runs up to the piece he has just clipped above his waist and back down,
        // and after a fall up to the pieces that held him and back down to where he hangs.
        // The rope she trails also runs up to the piece she has just swapped it into, above her waist.
        const via = []; if (!r.idle) for (let i = 0; i < pro.length; i++) if (lit(i) && (tau >= pro[i].swap) === !!r.two && pro[i].d > lo && pro[i].d < (c.d > a.d ? hi + (r.trail ? 10 : 80) : hi)) via.push(i);
        via.sort((i, j) => (pro[i].d - pro[j].d) * (c.d > a.d ? 1 : -1));
        const onRock = c.pose === 'lead' || c.pose === 'climb' || c.pose === 'place' || c.pose === 'clean' || c.pose === 'unclip' || c.pose === 'rest' || OFF.includes(c.pose);
        // The rope he is hauled on runs to the pulley at the summit anchor, not to her hands.
        const top = ASPOT[ASPOT.length - 1].M;
        const ends = [r.haul ? { d: a.d, x: top.x, h: top.h } : { d: a.d, x: Math.round(a.x) + (c.x > a.x ? 5 : -5), h: a.h + 9 }, ...via.map(i => ({ d: pro[i].d, x: SPOT[i].x, h: SPOT[i].bi })), { d: c.d, x: Math.round(c.x) + c.bx, h: c.h + (onRock ? 12 : 9) }];
        // Between two points it hangs free it sags: a leader's rope more (the belayer pays out ahead of
        // him), with a loop below him for a moment after each clip (he pulled up an armful to clip);
        // a follower's rope, taken in from above, only a little. Where it lies over the crest it does
        // not sag, and on a fall or a held follower it comes tight and straight.
        const lead = c.d > a.d, tight = OFF.includes(c.pose);
        let lastClip = -Infinity; for (const i of via) if (pro[i].clip <= tau) lastClip = Math.max(lastClip, pro[i].clip);
        // Slack between two at a stance hangs in a loop.
        const loop = r.idle ? 7 : lead && !r.trail ? 10 * smooth(0, 1, Math.max(0, 1 - (tau - lastClip) / 0.8)) : 0;
        ropePts.length = 0;
        for (let k = 0; k < ends.length; k++) {
          const x = ends[k].x - cx, y = rowOf(ends[k].h);
          if (k) {
            const n = ropePts.length; ropeOver(ropePts, ends[k - 1], ends[k], CREST, cx, rowOf);
            // Over the crest it rests on the high points and hangs a little between them.
            if (!tight) { const rest = ropePts.splice(n); for (let i = 0; i < rest.length; i += 2) { sagTo(ropePts, rest[i], rest[i + 1], lead ? 0.07 : 0.04, 0, wob, t); ropePts.push(rest[i], rest[i + 1]); } sagTo(ropePts, x, y, lead ? 0.07 : rest.length ? 0.04 : 0.03, k === ends.length - 1 ? loop : 0, wob, t); }
          }
          ropePts.push(x, y);
        }
        rope(scr, ropePts, r.two);
        if (r.haul) haul = haulRopes(scr, ropePts, [P.red, P.lead], cx, rowOf);
      }
      // The gear on the rock, over the rope so its sling shows and the rope runs into its carabiner, and
      // behind whoever is in front of it: a cam from when it is in until TJ takes it out; the
      // piton and the bolt always, with a carabiner from when the leader clips them until TJ unclips it.
      for (let i = 0; i < pro.length; i++) {
        const g = pro[i], sp = SPOT[i];
        if (g.fixed || (tau >= g.t && tau < g.gone)) drawPiece(scr, sp.x - cx, rowOf(sp.h), g.kind);
        if (g.fixed ? lit(i) : tau >= g.t && tau < g.gone) drawBiner(scr, sp.x - cx, rowOf(sp.bi));
      }
      // The anchors: each piece as it goes in, then its sling to the locking carabiner, until TJ
      // strips it; and a tether from the waist of whoever stands at a built anchor to that carabiner.
      SCRIPT.anc.forEach((A, k) => {
        if (tau < A.t0 + ANC.first || tau >= A.gone) return;
        const sp = ASPOT[k], mx = sp.M.x - cx, my = rowOf(sp.M.h);
        A.kinds.forEach((kd, i) => {
          if (tau < A.t0 + ANC.first + ANC.each * i) return;
          const q = sp.p[i], bot = anchorPiece(scr, q, kd, cx, rowOf);
          if (tau >= A.te) strap(scr, q.x - cx, bot, mx, my, SLING[i % SLING.length]);
        });
        if (tau < A.te) return;
        for (const w of WHO) {
          const s2 = P[w];
          if (s2.moving || Math.abs(s2.d - (MARK[A.m] + AT[w])) > 1.5) continue;
          const back = s2.pose === 'anchor' || s2.pose === 'clean';
          strap(scr, Math.round(s2.x) - cx + 1, rowOf(s2.h + (back ? 12 : 9)), mx, my, w === 'tj' ? R.blaze : R.teal);
        }
        drawBiner(scr, mx, my); scr.set(mx, my, R.white[1]);
      });
      // The haul's hardware, drawn small over the anchor: a pulley on its carabiner and a red rope grab
      // on the loaded rope below it.
      if (haul) { for (const [dx, dy, c] of [[0, 0, R.white[1]], [1, 0, R.rock[3]], [0, 1, R.rock[3]], [1, 1, R.rock[1]]]) scr.set(haul.mx + dx, haul.my + dy, c); for (const [dx, dy] of [[0, 0], [1, 0], [0, -1], [1, -1]]) scr.set(haul.gx + dx, haul.gy + dy, R.red[dy ? 2 : 1]); }
      if (dv > DESC.rig[0] + 0.8) {
        anchorPiece(scr, RAPA, 'block', cx, rowOf);
        if (dv > DESC.rig[0] + 1.6) { const rx = RAPA.x - cx, ry = rowOf(RAPA.bot); drawBiner(scr, rx, ry); }
      }
      if (dv > DESC.toss[0] && dv < DESC.under) descRope(scr, dv, P, cx, rowOf);
      if (dv >= DESC.under + 0.5) underRope(scr, dv - DESC.under, P, cx, rowOf);
      goatSeen = null;
      if (DEBUG.animals) { const gx = goatAt.x - cx, near = Math.abs(P.tj.x - goatAt.x) < 160, pg = t - poked.goat, leap = pg < 1.6 ? Math.round(8 * Math.abs(Math.sin(pg * Math.PI / 0.8))) : 0;
        if (gx > -30 && gx < VW + 30) { const gy = rowOf(goatAt.h) + 1; scr.put(near || pg < 1.6 ? GOAT.look : GOAT.stand, gx, gy - leap, pg < 1.6 ? pg > 0.8 : P.tj.x < goatAt.x); goatSeen = [gx, gy]; } }
      for (const w of WHO) if (P[w].where !== 'n') draw1(w);
      // Jackets snap downwind and loose hair streams from under a helmet once there is wind.
      if (wnd > 0.15) for (const w of WHO) {
        const s = P[w], fg = s.fig, ko = KO(w), sd = WHO.indexOf(w) * 2.3; if (!fg || s.where === 'n') continue;
        if (fg.back) { flap(scr, fg.x + 5, fg.y - 1, ko.top, t, wnd, g, sd); if (!s.hood && ko.long && ko.hair) hair(scr, fg.x + 4, fg.y - 13, ko.hair, t, wnd, g, sd); }
        else if (fg.side) { flap(scr, fg.x + 3, fg.y - 9, ko.top, t, wnd, g, sd); if (!s.hood && ko.long && ko.hair && fg.f) hair(scr, fg.x + 5, fg.y - 17, ko.hair, t, wnd, g, sd); }
      }
      // The near part of the cloud sea, in front of the rock and of anyone below its top. Going under, the
      // cloud's top races up out of sight as the camera sinks into it.
      if (dv >= DESC.under) cloudSea(scr, rowOf(CLOUDH + 6 * Math.max(0, CAMD - camH)), 1, t, seaX, rowOf(cbH));
      else if (rising) {
        let h = lerp(base + camH - VH - 4, CLOUDH, smooth(SCRIPT.haulAt, SCRIPT.upAt + 0.6, tau));
        if (tau < SCRIPT.upAt) h = Math.min(h, P.tj.h - 30);
        cloudSea(scr, rowOf(h), 1, t, seaX, 1e9, null, { snap: seaSnap, tops: seaTops });
      }
      // While he places a cam: in his raised hand, lobes shut, then pushed up into the crack.
      for (let i = 0; i < pro.length; i++) {
        const g = pro[i], sp = SPOT[i];
        if (g.fixed || tau < lerp(g.t0, g.t, 0.35) || tau >= g.t) continue;
        const e = smooth(lerp(g.t0, g.t, 0.55), g.t, tau), hx = Math.round(P.lead.x) + P.lead.bx + 6, hh = P.lead.h + 27;
        drawPiece(scr, Math.round(lerp(hx, sp.x, e)) - cx, rowOf(Math.round(lerp(hh, sp.h, e))), g.kind, 0);
      }
      // When he skates off the slab, grit his feet scraped loose skitters down it after him.
      if (SCRIPT.fallAt > 0 && tau > SCRIPT.fallAt && tau < SCRIPT.fallAt + 1.6) grit(scr, tau - SCRIPT.fallAt, cx, rowOf);
      if (tau >= SCRIPT.sumT) for (const v of FIVES) { const a = P[v.a], b = P[v.b]; spark(scr, Math.round((a.x + b.x) / 2) - cx, rowOf((a.h + b.h) / 2 + 20), (tau - SCRIPT.sumT - v.at + 0.15) * 0.8); }
      if (bumping) spark(scr, Math.round((P.tj.x + P.lead.x) / 2) - cx, rowOf(P.tj.h + 10), (P.tj.u - 0.45) * 0.8);
      // The raven: in from downwind, hanging in the updraft, then away.
      if (DEBUG.animals) {
        const go = t - ravenGo >= 0 && t - ravenGo < RV.len, n = go ? 'go' + ravenGo : Math.floor(t / RV.slot), u = go ? t - ravenGo : t - Math.floor(t / RV.slot) * RV.slot;
        if (u < RV.len && (go || wnd > 0.1)) {
          if (ravenN !== n) { ravenN = n; const x = Math.round(camX + 70); let h = 0; for (let i = -12; i <= 12; i++) h = Math.max(h, CREST[clamp(x + i, 0, W - 1)]); ravenAt = { x, h: h + 34 }; }
          let x = ravenAt.x, h = ravenAt.h + Math.sin(t * 1.3) * 1.5, bm = RB.hang[Math.floor(t * 1.6) & 1];
          if (u < 1.5) { const e = 1 - smooth(0, 1.5, u); x += 90 * e; h += 20 * e; }
          if (u > 7.5) { const e = (u - 7.5) / 2.5; x += 160 * e * e + 30 * e; h -= 120 * e * e; bm = RB.peel; if (ravenHeard !== n) { ravenHeard = n; env.sfx('kraa'); } }
          // Clicked, it tips over onto its back and rights itself, dropping a few pixels as it rolls.
          const pr = t - poked.raven, roll = pr < 1.2 ? pr / 1.2 : 1; if (roll < 1) h -= 6 * Math.sin(Math.PI * roll);
          const rx = Math.round(x) - cx, ry = rowOf(h);
          if (roll < 1 && roll > 0.25 && roll < 0.75) { for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i]; if (c) scr.set(rx - bm.ox + i, ry - bm.oy + (bm.h - 1 - j), c); } }
          else scr.put(bm, rx, ry, roll < 1 ? roll > 0.5 : u > 7.5);
          ravenSeen = [rx, ry - Math.round(bm.oy / 2)];
        } else ravenSeen = null;
      } else ravenSeen = null;
      windLines(scr, t, wnd, g);
      const me = P.tj; focus.x = Math.round(me.x) - cx; focus.y = rowOf(me.h) - 14;
    }
  };
}

// Pixels kept as a flat list of x, h, colour, drawn in the world.
// The same for a long list (x, h, colour triples in a typed array), with the screen row of h = 0 given.
function paintMany(scr, pts, cx, y0) {
  const { VW, VH, fb } = scr;
  for (let i = 0; i < pts.length; i += 3) { const x = pts[i] - cx, y = y0 - pts[i + 1]; if (x >= 0 && x < VW && y >= 0 && y < VH) fb[y * VW + x] = pts[i + 2]; }
}
function paintPts(scr, pts, cx, rowOf) { for (let i = 0; i < pts.length; i += 3) scr.set(pts[i] - cx, rowOf(pts[i + 1]), pts[i + 2]); }
// The upper hull of a run of points along the crest (x rising): the line a rope stretched over it takes.
function overHull(pts) {
  const out = [];
  for (const p of [...pts].sort((a, b) => a[0] - b[0])) { while (out.length > 1 && (out[out.length - 1][0] - out[out.length - 2][0]) * (p[1] - out[out.length - 2][1]) - (out[out.length - 1][1] - out[out.length - 2][1]) * (p[0] - out[out.length - 2][0]) >= 0) out.pop(); out.push(p); }
  return out;
}

// Between two points the rope passes (A then B, each with its distance d along the line): where the
// line between them goes along or behind the crest, the rope lies over the crest's top, so the points
// of the upper hull of the crest between them go in, in order from A to B. On the face it runs straight.
function ropeOver(out, A, B, CREST, cx, rowOf) {
  const lo = Math.min(A.d, B.d), hi = Math.max(A.d, B.d), x0 = Math.min(A.x, B.x), x1 = Math.max(A.x, B.x), run = [];
  for (let s = lo + 2; s < hi - 1; s += 3) { const p = posAt(s), x = Math.round(p.x); if (p.where !== 's' && p.where !== 'w' && x > x0 && x < x1) run.push([x, CREST[x] + 1]); }
  if (!run.length) return;
  const hull = overHull([[A.x, A.h], ...run, [B.x, B.h]]).slice(1, -1);
  if (A.x > B.x) hull.reverse();
  for (const [x, h] of hull) out.push(x - cx, rowOf(h));
}

// The points of a rope sagging from the last point in out to x1, y1: a curve below the straight line,
// slack times its length deep (at least a pixel and a half, so it is never ruler-straight, and at most
// 22). A steep span bows out sideways instead, away from the rock, as a slack rope up a crack does.
// loop is extra rope in pixels hanging straight down, below the lower end if need be.
function sagTo(out, x1, y1, slack, loop = 0, wob = 0, wt = 0) {
  const x0 = out[out.length - 2], y0 = out[out.length - 1], dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  if (len < 6) return;
  const s = Math.min(22, Math.max(1.5, slack * len)), n = Math.ceil(len / 3) + Math.round(loop / 2), fy = Math.abs(dx) / len, fx = Math.abs(dy) / len * 0.6;
  // In the wind a free span flaps: a wave across it, biggest in the middle.
  for (let i = 1; i < n; i++) { const u = i / n, b = 4 * u * (1 - u), o = s * b, f = wob * b * Math.sin(wt * 9 + u * 7 + x0 * 0.13); out.push(Math.round(x0 + dx * u - o * fx - dy / len * f), Math.round(y0 + dy * u + o * fy + loop * Math.sqrt(b) + dx / len * f)); }
}

// The poses in which someone is off the rock and on the rope: the rope is tight and the camera shows
// both ends of it.
const OFF = ['fall', 'hang', 'slip', 'whip', 'swing', 'hauled'];
// The 3:1 haul's ropes (round 5, T73), beside the loaded rope already drawn from the pulley at the anchor
// (pts starts there) down to him: back from the pulley to the rope grab down the load past the two who
// pull, and from there up through their hands, the nearer to the edge first. They face the load and pull
// back toward the anchor. Returns where the pulley and the grab are, for the hardware drawn over the ropes.
function haulRopes(scr, pts, who, cx, rowOf) {
  const mx = pts[0], my = pts[1]; let gx = mx, gy = my, left = 34;
  for (let i = 2; i < pts.length && left > 0; i += 2) { const L = Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]) || 1, u = Math.min(1, left / L); gx = Math.round(lerp(pts[i - 2], pts[i], u)); gy = Math.round(lerp(pts[i - 1], pts[i + 1], u)); left -= L; }
  rope(scr, [mx, my - 1, gx, gy - 1], true);
  const strand = [gx, gy];
  for (const q of who) strand.push(Math.round(q.x) - (q.pose === 'heave' ? 3 : 6) - cx, rowOf(q.h + (q.pose === 'heave' ? 13 : 6)));
  rope(scr, strand, true);
  return { mx, my, gx, gy };
}
// A rope through a list of screen points: dark edges, a bright core with a fleck every few pixels.
// The second rope, from the woman to TJ, is orange, so the two can be told apart.
function rope(scr, pts, two) {
  const px = [];
  for (let i = 2; i < pts.length; i += 2) {
    const x0 = pts[i - 2], y0 = pts[i - 1], x1 = pts[i], y1 = pts[i + 1], n = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k < n; k++) px.push(Math.round(lerp(x0, x1, k / n)), Math.round(lerp(y0, y1, k / n)));
  }
  for (let i = 0; i < px.length; i += 2) { const x = px[i], y = px[i + 1]; scr.set(x - 1, y, INK); scr.set(x + 1, y, INK); scr.set(x, y - 1, INK); scr.set(x, y + 1, INK); }
  for (let i = 0; i < px.length; i += 2) scr.set(px[i], px[i + 1], (i >> 1) % 5 ? (two ? R.blaze[1] : R.teal[2]) : R.white[1]);
}

export const makeRidge = () => shell(META, buildRidge, ['enter', 'focus', 'pick', 'act', 'draw', 'trigger', 'skip']);
