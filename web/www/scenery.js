// Scenery drawings shared by the world map: sea stacks, sagebrush, charred snags and the gold big-leaf
// maples along the forest trail. They came out of round 3's terrain.js unchanged.
import { sq, frac, rng, hash, vnoise, R, pick, BM, outline, INK } from './core.js';
import { clump, makeSnag } from './sprites.js';

function blobTree(seed, name, H, trunk, n, r0) {
  const rand = rng(seed), W = 30, b = new BM(W, H + 2); b.ox = W >> 1; b.oy = H;
  for (let y = Math.round(H * 0.3); y <= H; y++) { b.set(b.ox - 1, y, R[trunk][2]); b.set(b.ox, y, R[trunk][1]); }
  const cs = []; for (let k = 0; k < n; k++) cs.push([b.ox + (rand() - 0.5) * (W - 16), H * 0.3 + (rand() - 0.5) * H * 0.3, r0 + rand() * 2]);
  cs.sort((a, c) => a[1] - c[1]);
  for (const [x, y, r] of cs) { const c = clump(r, name, rand, 0, 'pad'); for (let j = 0; j < c.h; j++) for (let i = 0; i < c.w; i++) { const v = c.d[j * c.w + i]; if (v) b.set(Math.round(x - c.cx) + i, Math.round(y - c.cy) + j, v); } }
  outline(b, INK);
  return b;
}
// A sea stack, from its top down to the water: the outline stops at the waterline, since an outline under
// the rock made a stack look set down on top of the sea. Columns of basalt, stepping in at lit ledges (art pass D02).
function seaStack(seed, H, W) {
  const b = new BM(W + 8, H + 9); b.ox = (W >> 1) + 4; b.oy = H + 6;
  const foot = x => H - 3 + Math.round(3 * (1 - sq(x / (W / 2 + 1))));
  const step = y => Math.floor(vnoise(y / 7, seed, 111) * 3) / 3;
  const half = y => W / 2 * (0.42 + 0.58 * Math.pow(y / H, 0.7)) + 1.6 * step(y) - 0.6;
  for (let y = 0; y < H; y++) {
    const hw = half(y), ledge = half(y - 1) < hw - 0.6;
    for (let x = -Math.ceil(hw); x <= hw; x++) {
      const wet = foot(x) - y; if (wet <= 0) continue;
      const col = Math.floor((x + 40) / 3.5), cx = frac((x + 40) / 3.5), brk = frac((y + 7 * hash(col, 1, seed)) / (7 + 5 * hash(col, 2, seed))) < 0.1 && hash(col, y >> 2, seed + 5) < 0.6;
      let v = 0.62 - x / hw * 0.5 + 0.12 * (hash(col, 3, seed) - 0.5);
      if (cx < 0.3) v += x < 0 ? 0.3 : 0.14;
      let c = cx > 0.78 || brk ? R.basalt[0] : pick('basalt', v, x, y, 0.5);
      if (ledge && x < hw - 1) c = R.basalt[x < 0 ? 3 : 2];
      if (y < 3) c = R.conifer[x < 0 ? 3 : y === 0 ? 2 : 1];
      if (wet <= 2) c = R.basalt[0]; else if (wet <= 4 && c !== R.basalt[0]) c = pick('basalt', v - 0.3, x, y, 0.5);
      b.set(b.ox + x, y + 7, c);
    }
  }
  if (H >= 26) {
    // A small tree on the top, bent away from the sea wind: a crooked trunk and a flat crown of needles.
    const lean = hash(seed, 4, 112) < 0.5 ? -1 : 1, tx = b.ox + Math.round(lean * W * 0.12);
    for (let j = 0; j < 4; j++) b.set(tx + (j > 1 ? lean : 0), 6 - j, R.bark[j < 2 ? 1 : 0]);
    for (let i = -3; i <= 3; i++) { b.set(tx + lean + i, 2, R.conifer[i < 0 ? 3 : 1]); if (Math.abs(i) < 3) b.set(tx + lean + i + lean, 1, R.conifer[i < 0 ? 4 : 2]); }
  } else { b.set(b.ox - 1, 6, R.conifer[2]); b.set(b.ox - 1, 5, R.conifer[3]); b.set(b.ox + 2, 6, R.conifer[1]); }
  outline(b, INK);
  for (let x = -(W >> 1) - 4; x <= (W >> 1) + 4; x++) for (let y = foot(x); y < H + 2; y++) if (b.get(b.ox + x, y + 7) === INK) b.set(b.ox + x, y + 7, 0);
  return b;
}

// A sagebrush (art pass D11): a ragged dome of lobes. Only its lower right is outlined, so the lit side stays soft.
function sageBush(seed) {
  const b = new BM(11, 7); b.ox = 5; b.oy = 6;
  const lobes = [[5, 2.8, 3.1], [2.4 + hash(seed, 1, 851), 3.4, 2.5], [7.7 - hash(seed, 2, 851), 3.3, 2.6], [3.8 + 2.4 * hash(seed, 3, 851), 1.6, 2]];
  for (let y = 0; y < 6; y++) for (let x = 0; x < 11; x++) {
    let best = null; for (const L of lobes) { const d = Math.hypot(x - L[0], (y - L[1]) * 1.15) / L[2]; if (d <= 1 && (!best || L[1] < best[0][1] - 0.01 || d < best[1])) best = [L, d]; }
    if (!best) continue;
    const [L, d] = best, edge = d > 0.86;
    // The broken edge: some of a lobe's rim is gaps between twigs.
    if (edge && y < 4 && hash(x, y, seed + 7) < 0.22) continue;
    const lx = (x - L[0]) / L[2], ly = (y - L[1]) / L[2], gx = (x - 5) / 5, gy = (y - 2.5) / 3.5;
    const v = 0.74 - 0.32 * lx - 0.3 * ly - 0.26 * gx - 0.3 * gy + 0.22 * (hash(x, y, seed + 1) - 0.5);
    const gap = !edge && v < 0.62 && hash(x, y, seed + 3) < 0.1;
    b.set(x, y, gap ? R.sage[0] : R.sage[v > 0.78 ? 3 : v > 0.5 ? 2 : v > 0.24 ? 1 : 0]);
  }
  // The woody stems under the crown, and its dark lower right edge.
  for (const sx of [4, 6 + (hash(seed, 4, 851) < 0.5 ? 0 : 1)]) for (let y = 4; y < 7; y++) if (!b.get(sx, y) || y > 4) b.set(sx, y, R.gold[y === 6 ? 1 : 2]);
  if (hash(seed, 5, 851) < 0.6) b.set(5, 6, R.gold[1]);
  outline(b, (x, y) => (x > 5 || y > 3) && y < 6 ? R.sage[0] : 0);
  return b;
}
// The burn's darker dead trees (A13): charred black, one in three still in its bark.
const charred = seed => makeSnag(seed, seed % 3 === 0 ? 'bark' : 'char');

export { blobTree, seaStack, sageBush, charred };
