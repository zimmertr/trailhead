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
import { clamp, lerp, smooth, frac, hash, vnoise, fbm, bayer, rng, R, INK, pick, BM, outline } from './core.js';
import { Strip, drawStrip, baseline, shell } from './side.js';
import { makeConifer, makeCloud } from './sprites.js';
import { sideFig, frontFig, backFig, FEET, HANDS } from './tj.js';
import { makeCragPair, PAIR } from './people.js';

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
  const rand = rng(735);
  for (let x = 0; x < W; x++) {
    const f = x < 236 ? knob(x) : lerp(knob(236) - 4, foot(x) - 30, smooth(236, 330, x));
    for (let h = Math.round(f); h > -DOWN; h--) {
      if (S.get(x, -h)) continue;
      const depth = f - h, tal = (x > 220 ? 0.85 : 0.35) * smooth(0, 30, depth) * smooth(220, 40, depth);
      let c;
      if (hash(x >> 1, h >> 1, 736) < tal) c = pick('rock', 0.25 + 0.6 * hash(x >> 1, h >> 1, 737), x, h);
      else if (fbm(x / 26, h / 10, 748, 3) > 0.62) c = pick('rock', 0.5 + 0.3 * (fbm(x / 9, h / 5, 749, 2) - 0.5) - smooth(0, 300, depth) * 0.2, x, h, 0.6);
      else { const bf = fbm(x / 9, h / 4, 747, 3); c = bf > 0.72 ? R.red[bf > 0.8 && hash(x, h, 746) < 0.5 ? 1 : 0] : pick(fbm(x / 20, h / 9, 738, 2) > 0.55 ? 'moss' : 'grass', 0.45 + 0.4 * (fbm(x / 22, h / 12, 739, 3) - 0.5) - smooth(0, 300, depth) * 0.25, x, h, 0.35); }
      if (depth < 1.5 && !(hash(x >> 1, h >> 1, 736) < tal)) c = R.moss[2];
      S.set(x, -h, c);
    }
  }
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
    const top = -60 - 110 * fbm(x / 80, 1, 741, 4) - 40 * Math.abs(Math.sin(x / 37 + vnoise(x / 50, 2, 742)));
    for (let y = Math.round(top); y < 10; y++) S.set(x, y, y - top < 3 + 4 * vnoise(x / 5, 3, 743) && top < -120 ? R.farsnow[1] : pick('far', 0.5 + 0.3 * (vnoise(x / 6, y / 14, 744) - 0.5) - (y - top) * 0.002, x, y));
  }
  return S;
}

// A small larch flagged by the wind, painted straight into the strip at x, h (its root).
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
const FACE_BELAYS = ['a1', 'a2', 'a3', 'a4', 'top'].filter(m => posAt(MARK[m]).where === 's');
const below = d => { let k = 0; for (let i = 0; i < ANCHORS.length; i++) if (MARK[ANCHORS[i]] <= d + 1e-6) k = i; return ANCHORS[k]; };

// The script: who does what, when. Three of them: TJ, the black-haired man who leads every pitch, and the
// red-haired woman. Each has a track of moves (from, to along the line, in a pose); the tracks meet at
// sync points (no one sets off up a pitch until the anchor is built, and so on). Live ropes, the gear
// and the stops are kept beside them. Everything on the ridge is read off this at a moment of the
// scene, so the timeline can be dragged either way.
// The two followers climb differently (H7): TJ quick and steady, straight up the line, never stopping
// to rest; the woman slower and careful, wandering a little either side of it and stopping once a
// pitch to shake out an arm.
const SPEED = { walk: 24, lead: 11, tj: 17, red: 13 };
const WHO = ['tj', 'lead', 'red'];
const dAtX = x => { for (let i = 1; i < ROUTE.length; i++) if (ROUTE[i][0] >= x) return lerp(DIST[i - 1], DIST[i], clamp((x - ROUTE[i - 1][0]) / (ROUTE[i][0] - ROUTE[i - 1][0]), 0, 1)); return LEN; };
// Where each of them stands at an anchor: the leader on it, TJ a stride below, the woman a stride below
// him (closer, and on the crest they stood half inside one another).
const AT = { tj: -14, lead: 0, red: -28 };
const PACKS = dAtX(198), TIE = dAtX(231);
const PITCH = ['tie', 'a1', 'a2', 'a3', 'a4', 'top'];
// The gear on each pitch, by rule: so many cams spread evenly over the stretches where the line is on
// the face (never on the crest or behind it, where there is nothing to reach up to), plus the fixed
// piton and bolt, which are in the rock from the start. Pitch 3 is the piton and one tiny cam at the
// slab's foot and nothing above (the run-out is the point of the slab); pitch 4 has two, and the rope
// runs over the fins between them.
const GEAR = { 1: 4, 2: 4, 3: 0, 4: 2, 5: 4 };
function gearOn(p) {
  const d0 = MARK[PITCH[p - 1]], d1 = MARK[PITCH[p]], face = [], out = [];
  for (let d = d0 + 10; d < d1 - 8; d++) if (posAt(d).where === 's' && posAt(d - 10).where === 's') face.push(d);
  for (let i = 0; i < GEAR[p]; i++) out.push({ d: face[Math.floor(face.length * (i + 0.5) / GEAR[p])], kind: 'cam' });
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
// Where the woman slips once and is held (H7): the steepest stretch she follows on a pitch where TJ
// belays her from above (pitches 2 to 5), halfway up it; ties go to the first.
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
// What each belay is built from (TJ, section 5): the sling-wrapped block backed up with two cams, the two
// slung horns, three cams by the flake, a horn, a cam and a nut, and the summit block.
const ANCHOR_KIT = { a1: ['block', 'cam', 'cam'], a2: ['horn', 'horn'], a3: ['cam', 'cam', 'cam'], a4: ['horn', 'cam', 'nut'], top: ['block'] };
function makeScript() {
  const tr = { tj: [], lead: [], red: [] }, ropes = [], stops = [], pro = [], anc = [];
  let slipAt = -1, fallAt = -1;
  const pos = { tj: 0, lead: MARK.tie, red: dAtX(183) }, pose = { tj: 'walk', lead: 'rack', red: 'sit' }, clock = { tj: 0, lead: 0, red: 0 };
  const go = (k, to, p, dur, after) => { tr[k].push({ t0: clock[k], t1: clock[k] + dur, d0: pos[k], d1: to, pose: p }); clock[k] += dur; pos[k] = to; pose[k] = after || p; };
  const move = (k, to, p, v, after) => go(k, to, p, Math.max(0.8, Math.abs(to - pos[k]) / v), after);
  const hold = (k, until) => { if (until > clock[k] + 1e-6) go(k, pos[k], pose[k], until - clock[k]); };
  const sync = () => { const t = Math.max(clock.tj, clock.lead, clock.red); for (const k of WHO) hold(k, t); return t; };
  // He walks in over the knob past the balanced rock, puts his pack under the overhanging rock with
  // theirs, walks on to the start tree and ties in beside the leader, who is racking up; the woman,
  // eating by the packs, gets up and ties in too. Then he waits for Space, and they bump fists.
  move('tj', PACKS, 'walk', SPEED.walk, 'stand'); go('tj', PACKS, 'drop', 0.9, 'stand'); move('tj', TIE, 'walk', SPEED.walk, 'stand');
  hold('red', clock.tj - 1.3); move('red', dAtX(214), 'walk', 30, 'stand');
  sync(); go('tj', TIE, 'tie', 1.4, 'belay'); go('red', pos.red, 'tie', 1.4, 'stand');
  stops.push({ id: 'wait:belay', t: sync() });
  const bumpAt = clock.tj; go('tj', TIE, 'bump', 1.0, 'belay'); go('lead', pos.lead, 'bump', 1.0, 'lead');
  const CARD = { a1: 'platform-engineering', a3: 'site-reliability-engineering', a4: 'software-engineering' };
  for (let p = 1; p <= 5; p++) {
    const a = MARK[PITCH[p]], t0 = sync(), gear = gearOn(p);
    // The leader climbs on TJ's belay, stopping at each piece to place it (or clip it, if fixed), then
    // builds the anchor and takes the followers on belay from above.
    // A cam goes from the rack to his hand to the crack (in at t), then the rope is clipped (clip).
    for (const g of gear) {
      move('lead', Math.max(pos.lead, g.d - 15), 'lead', SPEED.lead); const s = clock.lead;
      go('lead', pos.lead, 'place', g.fixed ? 0.6 : 1.2); pro.push({ ...g, p, t0: s, t: s + (g.fixed ? 0 : 0.7), clip: s + (g.fixed ? 0.35 : 0.95), gone: Infinity });
    }
    // On FALL's pitch he runs it out, comes off, slides down the slab past his last pieces until the rope
    // comes tight on them, hangs, shakes out, and goes again.
    if (p === FALL.p) {
      move('lead', FALL.from, 'lead', SPEED.lead); fallAt = clock.lead;
      go('lead', lerp(FALL.from, FALL.to, 0.35), 'fall', 0.35); go('lead', FALL.to, 'fall', 0.3);
      go('lead', FALL.to, 'hang', 2.2); go('lead', FALL.to, 'rest', 1.6);
    }
    // The anchor: each piece in turn, then the slings brought to one locking carabiner (te), then he
    // ties in to it and takes the followers in.
    move('lead', a, 'lead', SPEED.lead);
    { const kinds = ANCHOR_KIT[PITCH[p]], s0 = clock.lead; go('lead', a, 'anchor', 0.7 * kinds.length + 1.3, 'tbelay'); anc.push({ m: PITCH[p], kinds, t0: s0, te: s0 + 0.5 + 0.7 * kinds.length, gone: Infinity }); }
    pose.tj = 'belay';
    // TJ holds the fall: braced, leaning back, looking up the rope.
    if (p === FALL.p) { hold('tj', fallAt + 0.5); go('tj', pos.tj, 'catch', 2.2, 'belay'); }
    hold('tj', clock.lead); ropes.push({ a: 'tj', b: 'lead', t0, t1: clock.lead });
    const t1 = sync(), mine = pro.filter(g => g.p === p);
    // The woman comes last and takes the gear out as she reaches it; at the piton and the bolt she
    // only unclips the carabiner, and they stay in the rock.
    // Before she leaves the anchor below (not the ground), she takes it apart; at the top she clips in.
    // On the way she rests once (halfway through her pieces, from pitch 2 on), and on SLIP's pitch her
    // foot goes: she drops a little, the rope comes tight, she hangs, then climbs on.
    let slip = 0;
    const up = to => {
      if (SLIP && p === SLIP.p && !slip && SLIP.d > pos.red && SLIP.d < to) { move('red', SLIP.d, 'climb', SPEED.red); slip = clock.red; go('red', SLIP.d - 9, 'slip', 0.3); go('red', pos.red, 'hang', 1.6); }
      move('red', Math.max(pos.red, to), 'climb', SPEED.red);
    };
    const clean = () => {
      if (p > 1) { go('red', pos.red, 'anchor', 1.4); anc[p - 2].gone = clock.red - 0.2; }
      mine.forEach((g, i) => { up(g.d - 6); go('red', pos.red, 'clean', g.fixed ? 0.6 : 1.0); g.gone = clock.red - 0.3; if (p > 1 && i === Math.floor(mine.length / 2)) go('red', pos.red, 'rest', 1.6); });
      up(a + AT.red); pose.red = 'stand'; go('red', pos.red, 'anchor', 0.8, 'stand');
    };
    if (p === 1) {
      // Pitch 1: both followers at once on two ropes, the woman a few moves behind. Each piece has both
      // ropes through it: he stops to unclip his and leaves the piece for her, so the two stay a body
      // length or so apart instead of him running away from her. He clips in to the anchor, and then
      // the card opens.
      for (const g of mine) if (!g.fixed && g.d - 6 > pos.tj) { move('tj', g.d - 6, 'climb', SPEED.tj); go('tj', pos.tj, 'unclip', 0.8); }
      move('tj', a + AT.tj, 'climb', SPEED.tj, 'stand'); go('tj', pos.tj, 'anchor', 1.0, 'stand'); stops.push({ id: CARD.a1, t: clock.tj });
      hold('red', t1 + 1.8); clean();
      ropes.push({ a: 'lead', b: 'tj', t0: t1, t1: clock.tj }, { a: 'lead', b: 'red', t0: t1, t1: clock.red, two: true });
    } else {
      // Then caterpillar: the leader brings TJ up, then TJ brings the woman up.
      move('tj', a + AT.tj, 'climb', SPEED.tj, 'tbelay'); go('tj', pos.tj, 'anchor', 1.0, 'tbelay'); ropes.push({ a: 'lead', b: 'tj', t0: t1, t1: clock.tj });
      // The leader's job is done until the next pitch: he belays TJ right up to the anchor, then rests.
      hold('lead', clock.tj); pose.lead = 'stand';
      if (CARD[PITCH[p]]) stops.push({ id: CARD[PITCH[p]], t: clock.tj });
      hold('red', clock.tj); const t2 = clock.red; clean(); ropes.push({ a: 'tj', b: 'red', t0: t2, t1: clock.red });
      // TJ catches her: he braces and locks off the rope as it comes tight, then takes in again.
      if (slip) { hold('tj', slip); go('tj', pos.tj, 'catch', 2.0, 'tbelay'); slipAt = slip; }
      if (p === 5) stops.push({ id: 'summit', t: clock.red });
    }
  }
  sync(); pose.tj = pose.lead = pose.red = 'stand'; for (const k of WHO) go(k, pos[k], 'stand', 4);
  return { tr, ropes, stops, pro, anc, slipAt, fallAt, bumpAt, dropAt: tr.tj[1].t0 + 0.5, dur: clock.tj };
}
const SCRIPT = makeScript(), DUR = SCRIPT.dur;
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
  elev: (arg, q) => posAt(stateAt(q * DUR).tj.d).h,
  // The fist bump, and a click of metal as each piece goes in.
  cues: () => [{ at: (SCRIPT.bumpAt + 0.45) / DUR, name: 'slap' }, { at: SCRIPT.fallAt / DUR, name: 'fall' }, { at: (SCRIPT.fallAt + 0.65) / DUR, name: 'catch' }, ...(SCRIPT.slipAt > 0 ? [{ at: SCRIPT.slipAt / DUR, name: 'fall' }, { at: (SCRIPT.slipAt + 0.35) / DUR, name: 'catch' }] : []), ...SCRIPT.pro.map(g => ({ at: g.t / DUR, name: 'place' }))]
};

// Every drawing one of them needs, in their own kit. On the ground: walking, standing, crouched,
// racking up, tying in, the fist bump. Belaying side-on, facing the climber: from below, looking up
// and paying out; from above, looking down and taking in hand over hand. On the rock, seen from behind:
// climbing, placing a cam (the cam in the hand going into the crack), building an anchor, cleaning
// (a hand up at the piece, then at the harness clipping it on), and falling.
function kitFrames(kit) {
  const side = [0, 1, 2, 3, 4, 5].map(f => sideFig(kit, { feet: [FEET[f], FEET[(f + 3) % 6]], hands: [HANDS[f], HANDS[(f + 3) % 6]], bob: [0, -1, -1, 0, -1, -1][f] }));
  const knot = (b, cx, y) => { b.set(cx, y + 7, R.white[1]); b.set(cx - 1, y + 7, R.teal[2]); b.set(cx + 1, y + 7, R.teal[2]); b.set(cx + 1, y + 8, R.teal[1]); };
  const tying = f => frontFig(kit, { held: (b, cx, y) => { knot(b, cx, y); for (const [dx, dy] of f ? [[-2, 6], [2, 7]] : [[-2, 7], [2, 6]]) { b.set(cx + dx, y + dy, R.skin[2]); b.set(cx + dx + (dx < 0 ? -1 : 1), y + dy, R.teal[1]); } } });
  const holding = cam => (b, x, y) => { if (!cam) return; b.set(x + 1, y, R.rock[4]); b.set(x + 2, y, R.rock[3]); b.set(x + 1, y + 1, R.red[1]); b.set(x + 1, y + 2, R.red[1]); };
  const climb = f => backFig(kit, { hands: [[-5, -12 - (f & 1 ? 3 : 0)], [5, -12 - (f & 1 ? 0 : 3)]], feet: [[-4, 11 + (f & 1 ? 0 : 2)], [4, 11 + (f & 1 ? 2 : 0)]] });
  return {
    side, idle: sideFig(kit, { lean: 0 }), crouch: sideFig(kit, { crouch: 4, lean: 5, hands: [[6, 9], [3, 8]], look: 'down', feet: [[3, 8.5], [-3, 8.5]] }),
    rack: [sideFig(kit, { lean: 1, hands: [[3, 5], [1, 6]], look: 'down' }), sideFig(kit, { lean: 1, hands: [[2, 6], [3, 4]], look: 'down' })],
    tie: [tying(0), tying(1)],
    bump: [sideFig(kit, { lean: 0, hands: [[1, 4], [-1, 6]] }), sideFig(kit, { lean: 1, hands: [[6, 4], [-1, 6]] })],
    belay: [sideFig(kit, { lean: 0, look: 'up', hands: [[4, -2], [0, 6]] }), sideFig(kit, { lean: 0, look: 'up', hands: [[5, 1], [1, 5]] })],
    tbelay: [sideFig(kit, { lean: 2, look: 'down', hands: [[5, 1], [2, 6]] }), sideFig(kit, { lean: 2, look: 'down', hands: [[3, 5], [5, 2]] })],
    climb: [0, 1, 2, 3].map(climb),
    place: [backFig(kit, { hands: [[-5, -13], [7, -9]], feet: [[-4, 12], [4, 11]], tool: holding(true) }), backFig(kit, { hands: [[-5, -12], [6, -16]], feet: [[-4, 12], [4, 11]] })],
    anchor: [0, 1].map(f => backFig(kit, { hands: [[-4, -14 + f], [4, -13 - f]], feet: [[-3, 12], [3, 12]] })),
    clean: [backFig(kit, { hands: [[-5, -13], [5, -9]], feet: [[-4, 12], [4, 11]] }), backFig(kit, { hands: [[-5, -13], [4, 1]], feet: [[-4, 12], [4, 11]], tool: holding(true) })],
    fall: [0, 1].map(f => backFig(kit, { hands: [[-8, -13 - f], [8, -14]], feet: [[-7, 9], [7, 8 + f]], tilt: 1 })),
    // Shaking out an arm, hanging on the rope (sitting in the harness, knees up, feet on the rock, both
    // hands on the rope), and bracing to hold a fall.
    rest: [0, 1].map(f => backFig(kit, { hands: [[-5, -13], [6 + f, 3 - f * 2]], feet: [[-4, 12], [4, 11]] })),
    hang: backFig(kit, { hands: [[-2, -17], [3, -15]], feet: [[-6, 7], [5, 8]], tilt: -1 }),
    catch: { down: sideFig(kit, { lean: -1, crouch: 2, look: 'down', hands: [[4, 4], [1, 8]] }), up: sideFig(kit, { lean: -2, crouch: 2, look: 'up', hands: [[4, 0], [1, 7]] }) }
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
  const sl = kind === 'tiny' ? R.teal : R.red, w = kind === 'tiny' || !open ? 1 : 2;
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
  const far = paintFar(), clouds = [0, 1, 2].map(i => ({ bm: makeCloud(745 + i), x: i * 190, y: 20 + i * 46, v: 3 + i }));
  const pair = makeCragPair(), st = {}, focus = { x: 0, y: 0 };
  // On the ridge all three wear helmets, one colour each with their hair showing below: his green, the
  // leader's red, the woman's white over her red hair. The leader carries the rack on his harness.
  const F = { tj: kitFrames('wall'), lead: kitFrames({ ...PAIR[0], bare: false, hat: R.red, rack: true }), red: kitFrames({ ...PAIR[1], bare: false, hat: [R.white[0], R.white[1], R.white[1]] }) };
  const packs = [makePack(R.teal), makePack(R.red), makePack([R.mustard[0], R.mustard[1], R.mustard[2]])], dropAt = SCRIPT.dropAt;
  const ropePts = [];
  let camX = 0, camH = 0;
  return {
    ...META,
    enter(scr, arg, q) { const p = posAt(stateAt(q * DUR).tj.d); camX = p.x; camH = p.h; st.y = null; },
    focus: () => focus,
    pick: () => null,
    act: () => false,
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t } = env, tau = q * DUR, S = stateAt(tau), k = env.calm ? 1 : Math.min(1, env.dt * 5);
      // The camera holds on whoever is on the live end of a rope (between the two of them on pitch 1, and
      // between climber and belayer while someone hangs on the rope, so the catch is seen),
      // so it does not jump back to the belayer each time the climber stops; him the rest of the time.
      const held = r => S[r.b].pose === 'slip' || S[r.b].pose === 'hang' || S[r.b].pose === 'fall', mid = (p, q) => ({ x: (p.x + q.x) / 2, h: (p.h + q.h) / 2 });
      const ends = S.ropes.length ? S.ropes.map(r => held(r) ? mid(posAt(S[r.a].d), posAt(S[r.b].d)) : posAt(S[r.b].d)) : [posAt(S.tj.d)], at = { x: ends.reduce((a, p) => a + p.x, 0) / ends.length, h: ends.reduce((a, p) => a + p.h, 0) / ends.length };
      camX += (at.x - camX) * k; camH += (at.h - camH) * k;
      const base = baseline(scr, env.shown && !String(env.shown).startsWith('wait:'), st) - Math.round(VH * (scr.narrow ? 0.2 : 0.24)), cx = clamp(Math.round(camX - VW * (scr.narrow ? 0.5 : 0.45)), 0, W - VW), rowOf = hh => Math.round(base + camH - hh);
      const sb = R.skyband;
      for (let y = 0; y < VH; y++) {
        const f = clamp((y + 120 - camH * 0.25) / 330, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0, row = y * VW;
        if (e < 0.72 || b0 >= sb.length - 1) fb.fill(sb[b0], row, row + VW); else for (let xx = 0; xx < VW; xx++) fb[row + xx] = sb[b0 + (bayer(xx, y) < (e - 0.72) / 0.28 ? 1 : 0)];
      }
      for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v) % (VW + 140)) - 70, c.y + camH * 0.12 - 20);
      drawStrip(scr, far, 120 + cx * 0.15, base + camH * 0.3 + 40, false, R.far[1]);

      // One of them, in the pose the script gives, at their place on the line.
      const P = {};
      for (const w of WHO) { const s = S[w], p = posAt(s.d); P[w] = { ...s, ...p, steep: p.where === 's' && Math.abs(p.dh) > Math.abs(p.dx) * 0.8 }; }
      if (P.red.where === 's' && P.red.moving) P.red.x += 1.5 * Math.sin(P.red.d / 7);
      // At a belay on the face the followers hang staggered, each lower and further across the face from
      // the leader (never out over the air beside the ridge's edge), instead of one under the other's
      // feet; they ease over in their last few moves to it and back onto the line as they leave.
      for (const m of FACE_BELAYS) for (const w of ['tj', 'red']) {
        const e = smooth(0, 1, 1 - Math.abs(P[w].d - (MARK[m] + AT[w])) / 12);
        if (e > 0) { const a = posAt(MARK[m]); P[w].x = lerp(P[w].x, a.x + (w === 'tj' ? 12 : 24), e); P[w].h = lerp(P[w].h, a.h - (w === 'tj' ? 12 : 22), e); }
      }
      const bumping = S.tj.pose === 'bump';
      const rateOf = w => { const r = S.ropes.find(r => r.a === w); return r && S[r.b].moving; };
      const draw1 = w => {
        const s = P[w], fr = F[w], sx = Math.round(s.x) - cx, sy = rowOf(s.h);
        const u = s.u, flick = Math.floor(t * 3) & 1;
        if (s.pose === 'sit') { pair.snack(scr, 1, sx, sy, t, 0); return; }
        if (s.pose === 'walk' || (s.moving && !s.steep && s.pose !== 'drop')) { scr.put(env.moving && s.moving ? fr.side[Math.floor(s.d / 4.2) % 6] : fr.idle, sx, sy, s.dir < 0); return; }
        if (s.pose === 'drop') { scr.put(u < 0.25 || u > 0.85 ? fr.idle : fr.crouch, sx, sy, true); return; }
        if (s.pose === 'rack') { scr.put(fr.rack[Math.floor(t * 1.5) & 1], sx, sy, true); return; }
        if (s.pose === 'tie') { scr.put(fr.tie[Math.floor(t * 6) & 1], sx, sy, false); return; }
        if (s.pose === 'bump') { scr.put(u < 0.2 || u > 0.85 ? fr.idle : fr.bump[u > 0.45 && u < 0.7 ? 1 : 0], sx, sy, w !== 'tj'); return; }
        if (s.pose === 'lead' || s.pose === 'climb') { scr.put(fr.climb[Math.floor(s.d / 6) & 3], sx, sy - 12, false); return; }
        if (s.pose === 'place') { scr.put(fr.place[u < 0.2 ? 0 : 1], sx, sy - 12, false); return; }
        if (s.pose === 'rest') { scr.put(fr.rest[Math.floor(t * 4) & 1], sx, sy - 12, false); return; }
        if (s.pose === 'slip') { scr.put(fr.fall[Math.floor(t * 20) & 1], sx, sy - 12, false); return; }
        if (s.pose === 'hang') { scr.put(fr.hang, sx, sy - 12, false); return; }
        // Holding a fall from below lifts him off his feet a moment as the rope comes tight (round 3's catch).
        if (s.pose === 'catch') { const r = S.ropes.find(r => r.a === w), c = r && P[r.b]; const up = c && c.h > s.h; scr.put(fr.catch[up ? 'up' : 'down'], sx, sy - (up && u < 0.2 ? 2 : 0), c ? c.x < s.x : true); return; }
        if (s.pose === 'unclip') { scr.put(fr.clean[0], sx, sy - 12, false); return; }
        if (s.pose === 'clean') { scr.put(fr.clean[u < 0.55 ? 0 : 1], sx, sy - 12, false); return; }
        if (s.pose === 'anchor') { scr.put(fr.anchor[flick], sx, sy - 12, false); return; }
        if (s.pose === 'fall') { scr.put(fr.fall[Math.floor(t * 20) & 1], sx, sy - 12, false); return; }
        // Belaying: side-on, facing whoever is on the rope; paying out from below, taking in from above.
        if (s.pose === 'belay' || s.pose === 'tbelay') { const r = S.ropes.find(r => r.a === w), c = r && P[r.b], face = c ? c.x < s.x : s.pose === 'tbelay'; scr.put(fr[s.pose][rateOf(w) ? flick : 0], sx, sy, face); return; }
        scr.put(fr.idle, sx, sy, false);
      };
      for (const w of WHO) if (P[w].where === 'n') draw1(w);
      drawStrip(scr, main, cx, base + camH, false, R.grass[0]);
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
      // behind the crest, over the crest along its upper hull.
      for (const r of S.ropes) {
        const a = P[r.a], c = P[r.b], lo = Math.min(a.d, c.d), hi = Math.max(a.d, c.d);
        // A leader's rope also runs up to the piece he has just clipped above his waist and back down,
        // and after a fall up to the pieces that held him and back down to where he hangs.
        const via = []; for (let i = 0; i < pro.length; i++) if (lit(i) && pro[i].d > lo && pro[i].d < (c.d > a.d ? hi + 80 : hi)) via.push(i);
        via.sort((i, j) => (pro[i].d - pro[j].d) * (c.d > a.d ? 1 : -1));
        const onRock = c.pose === 'lead' || c.pose === 'climb' || c.pose === 'place' || c.pose === 'clean' || c.pose === 'unclip' || c.pose === 'rest' || c.pose === 'slip' || c.pose === 'hang';
        const ends = [{ d: a.d, x: Math.round(a.x) + (c.x > a.x ? 5 : -5), h: a.h + 9 }, ...via.map(i => ({ d: pro[i].d, x: SPOT[i].x, h: SPOT[i].bi })), { d: c.d, x: Math.round(c.x), h: c.h + (onRock ? 12 : 9) }];
        // Between two points it hangs free it sags: a leader's rope more (the belayer pays out ahead of
        // him), with a loop below him for a moment after each clip (he pulled up an armful to clip);
        // a follower's rope, taken in from above, only a little. Where it lies over the crest it does
        // not sag, and on a fall or a held follower it comes tight and straight.
        const lead = c.d > a.d, tight = c.pose === 'fall' || c.pose === 'hang' || c.pose === 'slip';
        let lastClip = -Infinity; for (const i of via) if (pro[i].clip <= tau) lastClip = Math.max(lastClip, pro[i].clip);
        const loop = lead ? 10 * smooth(0, 1, Math.max(0, 1 - (tau - lastClip) / 2.2)) : 0;
        ropePts.length = 0;
        for (let k = 0; k < ends.length; k++) {
          const x = ends[k].x - cx, y = rowOf(ends[k].h);
          if (k) {
            const n = ropePts.length; ropeOver(ropePts, ends[k - 1], ends[k], CREST, cx, rowOf);
            if (ropePts.length === n && !tight) sagTo(ropePts, x, y, lead ? 0.07 : 0.03, k === ends.length - 1 ? loop : 0);
          }
          ropePts.push(x, y);
        }
        rope(scr, ropePts, r.two);
      }
      // The gear on the rock, over the rope so its sling shows and the rope runs into its carabiner, and
      // behind whoever is in front of it: a cam from when it is in until the woman takes it out; the
      // piton and the bolt always, with a carabiner from when he clips them until she unclips it.
      for (let i = 0; i < pro.length; i++) {
        const g = pro[i], sp = SPOT[i];
        if (g.fixed || (tau >= g.t && tau < g.gone)) drawPiece(scr, sp.x - cx, rowOf(sp.h), g.kind);
        if (g.fixed ? lit(i) : tau >= g.t && tau < g.gone) drawBiner(scr, sp.x - cx, rowOf(sp.bi));
      }
      // The anchors: each piece as it goes in, then its sling to the locking carabiner, until the woman
      // strips it; and a tether from the waist of whoever stands at a built anchor to that carabiner.
      SCRIPT.anc.forEach((A, k) => {
        if (tau < A.t0 + 0.5 || tau >= A.gone) return;
        const sp = ASPOT[k], mx = sp.M.x - cx, my = rowOf(sp.M.h);
        A.kinds.forEach((kd, i) => {
          if (tau < A.t0 + 0.5 + 0.7 * i) return;
          const q = sp.p[i], bot = anchorPiece(scr, q, kd, cx, rowOf);
          if (tau >= A.te) strap(scr, q.x - cx, bot, mx, my, SLING[i % SLING.length]);
        });
        if (tau < A.te) return;
        for (const w of WHO) {
          const s2 = P[w];
          if (s2.moving || Math.abs(s2.d - (MARK[A.m] + AT[w])) > 1.5) continue;
          const back = s2.pose === 'anchor' || s2.pose === 'clean';
          strap(scr, Math.round(s2.x) - cx + 1, rowOf(s2.h + (back ? 12 : 9)), mx, my, w === 'red' ? R.blaze : R.teal);
        }
        drawBiner(scr, mx, my); scr.set(mx, my, R.white[1]);
      });
      for (const w of WHO) if (P[w].where !== 'n') draw1(w);
      // While he places a cam: in his raised hand, lobes shut, then pushed up into the crack.
      for (let i = 0; i < pro.length; i++) {
        const g = pro[i], sp = SPOT[i];
        if (g.fixed || tau < g.t0 + 0.25 || tau >= g.t) continue;
        const e = smooth(g.t0 + 0.4, g.t, tau), hx = Math.round(P.lead.x) + 6, hh = P.lead.h + 27;
        drawPiece(scr, Math.round(lerp(hx, sp.x, e)) - cx, rowOf(Math.round(lerp(hh, sp.h, e))), g.kind, 0);
      }
      // When he skates off the slab, grit his feet scraped loose skitters down it after him.
      if (SCRIPT.fallAt > 0 && tau > SCRIPT.fallAt && tau < SCRIPT.fallAt + 1.6) grit(scr, tau - SCRIPT.fallAt, cx, rowOf);
      if (bumping) spark(scr, Math.round((P.tj.x + P.lead.x) / 2) - cx, rowOf(P.tj.h + 10), (P.tj.u - 0.45) * 0.8);
      const me = P.tj; focus.x = Math.round(me.x) - cx; focus.y = rowOf(me.h) - 14;
    }
  };
}

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
function sagTo(out, x1, y1, slack, loop = 0) {
  const x0 = out[out.length - 2], y0 = out[out.length - 1], dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  if (len < 6) return;
  const s = Math.min(22, Math.max(1.5, slack * len)), n = Math.ceil(len / 3) + Math.round(loop / 2), fy = Math.abs(dx) / len, fx = Math.abs(dy) / len * 0.6;
  for (let i = 1; i < n; i++) { const u = i / n, b = 4 * u * (1 - u), o = s * b; out.push(Math.round(x0 + dx * u - o * fx), Math.round(y0 + dy * u + o * fy + loop * Math.sqrt(b))); }
}

// A rope through a list of screen points: dark edges, a bright core with a fleck every few pixels.
// The second rope on pitch 1 is orange, so the two followers' ropes can be told apart.
function rope(scr, pts, two) {
  const px = [];
  for (let i = 2; i < pts.length; i += 2) {
    const x0 = pts[i - 2], y0 = pts[i - 1], x1 = pts[i], y1 = pts[i + 1], n = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k < n; k++) px.push(Math.round(lerp(x0, x1, k / n)), Math.round(lerp(y0, y1, k / n)));
  }
  for (let i = 0; i < px.length; i += 2) { const x = px[i], y = px[i + 1]; scr.set(x - 1, y, INK); scr.set(x + 1, y, INK); scr.set(x, y - 1, INK); scr.set(x, y + 1, INK); }
  for (let i = 0; i < px.length; i += 2) scr.set(px[i], px[i + 1], (i >> 1) % 5 ? (two ? R.blaze[1] : R.teal[2]) : R.white[1]);
}

export const makeRidge = () => shell(META, buildRidge, ['enter', 'focus', 'pick', 'act', 'draw']);
