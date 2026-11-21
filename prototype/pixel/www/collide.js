// Where each kind of mover may be (T7, round 5): one shared answer for everything that moves on the map, so
// the ferry and the orcas keep off the sea stacks and the bared flats, the whale stays in deep water, the
// jellyfish beyond the surf, and the land animals off the buildings.
//
// The sea is read from the sea's own grid (SEA.cs: how far out from the high-water line each spot lies) and
// the tide's height at the time asked, so nothing is redrawn per tide step: depth is a subtraction. The sea
// stacks are a distance field, worked out once: how far each spot of sea lies from the nearest stack's foot.
// Land is the land's own rule for firm open ground (W.open) and a clearance round the buildings.
//
// canBe(kind, x, y, t, r): may a mover of that kind and radius r stand there at time t ({ ebb } in place of t
//   asks about a given height of the tide, for example the lowest).
// steer(kind, x, y, dx, dy, t, r): the heading nearest (dx, dy) that keeps it clear for a few steps, or null.
// clear(kind, x, y, t, r, probe): the nearest point it may stand on, pushed out to deeper water and away from
//   the stacks (or [x, y] if it is clear already, null if none is near). probe lists extra offsets that must
//   be clear too, for a long hull.
import { NW, NH } from './land.js';

// depth: water it needs under it at the current tide, in the sea grid's units (pixels out from the waterline).
// stack: room it keeps from a stack's foot.
const KINDS = {
  boat: { sea: true, depth: 18, stack: 5 },
  whale: { sea: true, depth: 40, stack: 10 },
  swimmer: { sea: true, depth: 22, stack: 6 },
  floater: { sea: true, depth: 26, stack: 4 },
  land: { sea: false },
  flyer: { free: true }
};
export const COLLIDE_KINDS = Object.keys(KINDS);

export function makeCollide(W, { ebbAt, stacks }) {
  const SEA = W.sea, SW = SEA.w, SH = SEA.h, Y0 = SEA.y0;
  const csAt = (x, y) => { x = Math.round(x); y = Math.round(y) - Y0; return x < 0 || x >= SW || y < 0 || y >= SH ? 0 : SEA.cs[y * SW + x]; };
  // The stacks' distance field, over the sea grid. Each stack's foot is an oval as wide as its drawing at its
  // foot row and half as deep, standing on the row its feet are on.
  const sd = new Float32Array(SW * SH).fill(1e4);
  for (const s of stacks) {
    const rx = s.half + 0.5, ry = Math.max(2.5, s.half * 0.5), cx = s.x, cy = s.y - ry + 1;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const j = (y - Y0) * SW + x; if (x < 0 || x >= SW || y < Y0 || y >= Y0 + SH) continue;
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) sd[j] = 0;
    }
  }
  chamfer(sd, SW, SH);
  const sdAt = (x, y) => { x = Math.round(x); y = Math.round(y) - Y0; return x < 0 || x >= SW || y < 0 || y >= SH ? 1e4 : sd[y * SW + x]; };
  // The buildings land animals keep clear of, with the room each needs.
  const S = W.spots, built = [[S.kiosk, 20], [S.register, 12], [S.lookout, 14]].filter(([p]) => p);

  // How much room a mover has there, in pixels: below 0 it may not be there. For the sea kinds, the lesser of
  // the water's depth to spare and the room from the nearest stack.
  function room(kind, x, y, t, r = 0) {
    const K = KINDS[kind];
    if (K.free) return 1e4;
    if (K.sea) { const c = csAt(x, y); if (!c) return -1e4; return Math.min(c - 4 - (typeof t === 'number' ? ebbAt(t) : t.ebb) - K.depth - r, sdAt(x, y) - K.stack - r); }
    if (x < 4 || y < 4 || x >= NW - 4 || y >= NH - 4 || !W.open(x, y)) return -1;
    let m = 1e4; for (const [p, need] of built) m = Math.min(m, Math.hypot(x - p[0], (y - p[1]) * 1.6) - need - r);
    return m;
  }
  const canBe = (kind, x, y, t, r = 0) => room(kind, x, y, t, r) >= 0;
  function steer(kind, x, y, dx, dy, t, r = 0) {
    const n = Math.hypot(dx, dy) || 1, a0 = Math.atan2(dy / n, dx / n), L = Math.max(6, r + 4);
    for (let k = 0; k <= 8; k++) for (const side of k ? [1, -1] : [1]) {
      const a = a0 + side * k * Math.PI / 9, ux = Math.cos(a), uy = Math.sin(a);
      if (canBe(kind, x + ux * L / 2, y + uy * L / 2, t, r) && canBe(kind, x + ux * L, y + uy * L, t, r)) return [ux, uy];
    }
    return null;
  }
  // The room at a point for a mover that must also clear each of the probe offsets from it.
  const roomAll = (kind, x, y, t, r, probe) => { let m = room(kind, x, y, t, r); if (probe) for (const [px, py] of probe) m = Math.min(m, room(kind, x + px, y + py, t, r)); return m; };
  function clear(kind, x, y, t, r = 0, probe = null) {
    let m = roomAll(kind, x, y, t, r, probe); if (m >= 0) return [x, y];
    // Up the slope of the room, a step at a time: out to deeper water and away from the stacks.
    for (let i = 0; i < 40 && m < 0; i++) {
      const e = 2, gx = roomAll(kind, x + e, y, t, r, probe) - roomAll(kind, x - e, y, t, r, probe), gy = roomAll(kind, x, y + e, t, r, probe) - roomAll(kind, x, y - e, t, r, probe), g = Math.hypot(gx, gy);
      if (!g) return null;
      const step = Math.min(6, Math.max(1, -m)); x += gx / g * step; y += gy / g * step; m = roomAll(kind, x, y, t, r, probe);
    }
    return m >= 0 ? [x, y] : null;
  }
  // The debug overlay: every spot of the view the kind may not be on, tinted.
  // For a sea kind only the sea and the beach are tinted, since no boat is asked about dry land.
  function overlay(scr, kind, ox, oy, t, c) {
    const { VW, VH } = scr, sea = KINDS[kind].sea;
    for (let y = 0; y < VH; y += 1) for (let x = (y & 1); x < VW; x += 2) if ((!sea || csAt(x + ox, y + oy)) && !canBe(kind, x + ox, y + oy, t)) scr.set(x, y, c);
  }
  return { canBe, steer, clear, room, overlay, kinds: COLLIDE_KINDS };
}

// A two-pass distance transform: each cell gets roughly its distance in pixels from the nearest zero.
function chamfer(d, w, h) {
  const A = 1, B = Math.SQRT2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const j = y * w + x; let v = d[j]; if (!v) continue;
    if (x > 0) v = Math.min(v, d[j - 1] + A); if (y > 0) { v = Math.min(v, d[j - w] + A); if (x > 0) v = Math.min(v, d[j - w - 1] + B); if (x < w - 1) v = Math.min(v, d[j - w + 1] + B); } d[j] = v; }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const j = y * w + x; let v = d[j]; if (!v) continue;
    if (x < w - 1) v = Math.min(v, d[j + 1] + A); if (y < h - 1) { v = Math.min(v, d[j + w] + A); if (x < w - 1) v = Math.min(v, d[j + w + 1] + B); if (x > 0) v = Math.min(v, d[j + w - 1] + B); } d[j] = v; }
}
