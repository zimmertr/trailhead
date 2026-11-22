// Scenery drawings shared by the world map: sea stacks, sagebrush, charred snags and the gold big-leaf
// maples along the forest trail. They came out of round 3's terrain.js unchanged.
import { clamp, sq, frac, rng, hash, vnoise, R, pick, BM, outline, INK } from './core.js';
import { clump, makeSnag } from './sprites.js';

function blobTree(seed, name, H, trunk, n, r0) {
  const rand = rng(seed), W = 30, b = new BM(W, H + 2); b.ox = W >> 1; b.oy = H;
  for (let y = Math.round(H * 0.3); y <= H; y++) { b.set(b.ox - 1, y, R[trunk][2]); b.set(b.ox, y, R[trunk][1]); }
  const cs = []; for (let k = 0; k < n; k++) cs.push([b.ox + (rand() - 0.5) * (W - 16), H * 0.3 + (rand() - 0.5) * H * 0.3, r0 + rand() * 2]);
  cs.sort((a, c) => a[1] - c[1]);
  for (const [x, y, r] of cs) { const c = clump(r, name, rand, 0); for (let j = 0; j < c.h; j++) for (let i = 0; i < c.w; i++) { const v = c.d[j * c.w + i]; if (v) b.set(Math.round(x - c.cx) + i, Math.round(y - c.cy) + j, v); } }
  outline(b, INK);
  return b;
}
// A sea stack is drawn from its top down to the water. Its waterline curves, lowest in the middle,
// the rock is dark and wet for the last rows above it, and the outline stops there: an outline
// under the rock is what made a stack look set down on top of the sea.
// After the picture it was redrawn from (art pass D02, design/art/D02): columns of basalt standing side
// by side, each a few pixels wide with a dark joint between and its own breaks across, lit on its left
// edge, the whole stack lit on the left and dark on the right; its sides step in at ledges as it rises,
// each ledge's top catching the light; turf on the top, and on a tall one a small tree bent by the wind.
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

function sageBush(seed) {
  const b = new BM(11, 7); b.ox = 5; b.oy = 6;
  for (let y = 0; y < 6; y++) for (let x = 0; x < 11; x++) { const nx = (x - 5) / 5, ny = (y - 4) / 3.4; if (nx * nx + ny * ny > 1 + 0.4 * (hash(x, y, seed) - 0.5)) continue; b.set(x, y, R.sage[clamp(Math.round(2.2 - nx * 1.2 - ny * 1.4 + (hash(x, y, seed + 1) - 0.5)), 1, 3)]); }
  outline(b, R.sage[0]);
  return b;
}
// The burn's darker dead trees (A13): charred black, one in three still in its bark.
const charred = seed => makeSnag(seed, seed % 3 === 0 ? 'bark' : 'char');

export { blobTree, seaStack, sageBush, charred };
