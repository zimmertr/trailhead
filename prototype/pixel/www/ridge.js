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
import { clamp, lerp, smooth, frac, hash, vnoise, fbm, bayer, rng, R, INK, pick } from './core.js';
import { Strip, drawStrip, baseline, shell } from './side.js';
import { makeConifer, makeCloud } from './sprites.js';
import { makeRunner, backFig } from './tj.js';
import { makeCragPair } from './people.js';

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
  things.push({ tree: makeConifer(739, 26, 10, 'larch', 8, { ragged: 0.3, droop: 0.6 }), x: 240, h: 6 });
  // A few small larches rooted in cracks on the face, and grass in tufts along the crest and its ledges.
  for (let x = 300 + rand() * 60; x < 960; x += 70 + rand() * 90) { const H = 9 + Math.round(rand() * 9); things.push({ tree: makeConifer(760 + Math.round(x), H, Math.round(H / 2.4), 'larch', Math.max(3, Math.round(H / 3)), { ragged: 0.4, droop: 0.6 }), x: Math.round(x), h: Math.round(along(LOW, x) - 18 - rand() * 70) }); }
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
  [838, 258, 'n'], [856, 250, 'n'], [872, 247, 's'], [930, 247, 'c'], [960, 253, 'c', 'a4'],
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
const below = d => { let k = 0; for (let i = 0; i < ANCHORS.length; i++) if (MARK[ANCHORS[i]] <= d + 1e-6) k = i; return ANCHORS[k]; };

const DUR = 60;
const META = {
  name: 'wall',
  dur: () => DUR,
  stops: () => [['wait:belay', 'tie'], ['platform-engineering', 'a1'], ['site-reliability-engineering', 'a3'], ['software-engineering', 'a4'], ['summit', 'top']].map(([id, m]) => ({ id, at: MARK[m] / LEN * 0.96 + 0.02 })),
  elev: (arg, q) => posAt(clamp((q - 0.02) / 0.96, 0, 1) * LEN).h,
  cues: () => []
};

function buildRidge() {
  const main = new Strip(W, UP, DOWN), things = [];
  const ID = paintRidge(main); paintGround(main, things);
  // The crest: the highest rock in every column, which the rope lies over where the route goes north.
  const CREST = new Int16Array(W);
  for (let x = 0; x < W; x++) { let y = 0; while (y < main.h && !ID[y * W + x]) y++; CREST[x] = main.up - y; }
  const far = paintFar(), clouds = [0, 1, 2].map(i => ({ bm: makeCloud(745 + i), x: i * 190, y: 20 + i * 46, v: 3 + i }));
  const run = makeRunner('wall'), pair = makeCragPair(), st = {}, focus = { x: 0, y: 0 };
  const climbs = [0, 1, 2, 3].map(f => backFig('wall', { hands: [[-5, -12 - (f & 1 ? 3 : 0)], [5, -12 - (f & 1 ? 0 : 3)]], feet: [[-4, 11 + (f & 1 ? 0 : 2)], [4, 11 + (f & 1 ? 2 : 0)]] }));
  const ropePts = [];
  let camX = 0, camH = 0;
  const dOf = q => clamp((q - 0.02) / 0.96, 0, 1) * LEN;
  return {
    ...META,
    enter(scr, arg, q) { const p = posAt(dOf(q)); camX = p.x; camH = p.h; st.y = null; },
    focus: () => focus,
    pick: () => null,
    act: () => false,
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t } = env, d = dOf(q), me = posAt(d), k = env.calm ? 1 : Math.min(1, env.dt * 6);
      camX += (me.x - camX) * k; camH += (me.h - camH) * k;
      const base = baseline(scr, env.shown, st) - Math.round(VH * (scr.narrow ? 0.2 : 0.24)), cx = clamp(Math.round(camX - VW * (scr.narrow ? 0.5 : 0.45)), 0, W - VW), rowOf = hh => Math.round(base + camH - hh);
      const sb = R.skyband;
      for (let y = 0; y < VH; y++) {
        const f = clamp((y + 120 - camH * 0.25) / 330, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0, row = y * VW;
        if (e < 0.72 || b0 >= sb.length - 1) fb.fill(sb[b0], row, row + VW); else for (let xx = 0; xx < VW; xx++) fb[row + xx] = sb[b0 + (bayer(xx, y) < (e - 0.72) / 0.28 ? 1 : 0)];
      }
      for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v) % (VW + 140)) - 70, c.y + camH * 0.12 - 20);
      drawStrip(scr, far, 120 + cx * 0.15, base + camH * 0.3 + 40, false, R.far[1]);
      // Him: walking where the line is level or on walking ground, climbing where it is steep; drawn
      // before the rock when he is on the north side, so the crest hides him.
      const steep = me.where !== 'w' && me.where !== 'c' && Math.abs(me.dh) > Math.abs(me.dx) * 0.8;
      const drawMe = () => {
        const sx = Math.round(me.x) - cx, sy = rowOf(me.h);
        if (steep) scr.put(climbs[Math.floor(d / 6) & 3], sx, sy - 12, false);
        else scr.put(env.moving ? run.side[Math.floor(d / 4.2) % 6] : run.sideIdle[0], sx, sy, me.dx < 0);
        focus.x = sx; focus.y = sy - 14;
      };
      if (me.where === 'n') drawMe();
      drawStrip(scr, main, cx, base + camH, false, R.grass[0]);
      for (const th of things) {
        const sx = th.x - cx, sy = rowOf(th.h);
        if (sx < -40 || sx > VW + 40) continue;
        if (th.tree) for (const part of th.tree.parts) scr.blit(part.bm, sx + part.x, sy + part.y);
        else if (th.tuft) { for (let j = -th.tuft; j <= th.tuft; j++) for (let k = 0; k < th.tuft + 1 - Math.abs(j) + (j & 1); k++) scr.set(sx + j, sy - k, R.grass[k ? 3 : 1]); }
        else { const r = th.pine; for (let j = 0; j < r; j++) for (let dd = -r + j; dd <= r - j; dd++) scr.set(sx + dd, sy - j, R.conifer[(dd + j) & 1 ? 2 : 3 - (j > r / 2 ? 0 : 1)]); }
      }
      // His belayer stands at the anchor below him, and the rope runs up the line from the belayer's hands
      // to his waist. Where the line goes behind the crest, the rope lies over the crest instead.
      const am = below(d), ad = MARK[am], ap = posAt(ad), bel = pair.belay[0], bf = env.moving ? (Math.floor(t * 3) & 1 ? bel.b : bel.a) : bel.ready;
      const bx = Math.round(ap.x) - cx - 6, by = rowOf(ap.h) - 13;
      scr.put(bf, bx, by, false);
      if (d > ad + 2) {
        ropePts.length = 0;
        ropePts.push(bx + bf.grip[0], by + bf.grip[1]);
        // Over the crest a loaded rope does not follow every dip: it runs straight from one high point to
        // the next, so each run behind the crest takes the crest's upper hull.
        let run = [];
        const flush = () => { if (!run.length) return; for (const [x, h] of overHull(run)) ropePts.push(x - cx, rowOf(h)); run = []; };
        for (let s = ad + 3; s < d; s += 3) { const p = posAt(s); if (p.where === 'n') { const x = Math.round(p.x); run.push([x, CREST[x] + 1]); } else { flush(); ropePts.push(Math.round(p.x) - cx, rowOf(p.h + 6)); } }
        flush();
        ropePts.push(Math.round(me.x) - cx, rowOf(me.h + (steep ? 12 : 9)));
        rope(scr, ropePts);
      }
      if (me.where !== 'n') drawMe();
    }
  };
}

// The upper hull of a run of points along the crest (x rising): the line a rope stretched over it takes.
function overHull(pts) {
  const out = [];
  for (const p of [...pts].sort((a, b) => a[0] - b[0])) { while (out.length > 1 && (out[out.length - 1][0] - out[out.length - 2][0]) * (p[1] - out[out.length - 2][1]) - (out[out.length - 1][1] - out[out.length - 2][1]) * (p[0] - out[out.length - 2][0]) >= 0) out.pop(); out.push(p); }
  return out;
}

// A rope through a list of screen points: dark edges, a bright core with a fleck every few pixels.
function rope(scr, pts) {
  const px = [];
  for (let i = 2; i < pts.length; i += 2) {
    const x0 = pts[i - 2], y0 = pts[i - 1], x1 = pts[i], y1 = pts[i + 1], n = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k < n; k++) px.push(Math.round(lerp(x0, x1, k / n)), Math.round(lerp(y0, y1, k / n)));
  }
  for (let i = 0; i < px.length; i += 2) { const x = px[i], y = px[i + 1]; scr.set(x - 1, y, INK); scr.set(x + 1, y, INK); scr.set(x, y - 1, INK); scr.set(x, y + 1, INK); }
  for (let i = 0; i < px.length; i += 2) scr.set(px[i], px[i + 1], (i >> 1) % 5 ? R.teal[2] : R.white[1]);
}

export const makeRidge = () => shell(META, buildRidge, ['enter', 'focus', 'pick', 'act', 'draw']);
