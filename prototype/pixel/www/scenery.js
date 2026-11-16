// Scenery drawings shared by the world map: sea stacks, sagebrush, charred snags and the gold big-leaf
// maples along the forest trail. They came out of round 3's terrain.js unchanged.
import { clamp, sq, rng, hash, vnoise, R, pick, BM, outline, INK } from './core.js';
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
function seaStack(seed, H, W) {
  const b = new BM(W + 4, H + 4); b.ox = (W >> 1) + 2; b.oy = H + 1;
  const foot = x => H - 3 + Math.round(3 * (1 - sq(x / (W / 2 + 1))));
  for (let y = 0; y < H; y++) {
    const hw = W / 2 * (0.45 + 0.55 * Math.pow(y / H, 0.6)) + 1.5 * (vnoise(y / 4, seed, 110) - 0.5);
    for (let x = -Math.ceil(hw); x <= hw; x++) {
      const wet = foot(x) - y; if (wet <= 0) continue;
      const v = 0.62 - x / hw * 0.4 + 0.3 * (vnoise(x / 2, y / 5, seed) - 0.5);
      b.set(b.ox + x, y + 2, y < 3 ? R.conifer[x < 0 ? 3 : 1] : wet <= 2 ? R.basalt[0] : pick('basalt', wet <= 4 ? v - 0.3 : v, x, y));
    }
  }
  b.set(b.ox - 1, 1, R.conifer[2]); b.set(b.ox - 1, 0, R.conifer[3]); b.set(b.ox + 2, 1, R.conifer[1]);
  outline(b, INK);
  for (let x = -(W >> 1) - 2; x <= (W >> 1) + 2; x++) for (let y = foot(x); y < H + 2; y++) if (b.get(b.ox + x, y + 2) === INK) b.set(b.ox + x, y + 2, 0);
  return b;
}

function sageBush(seed) {
  const b = new BM(11, 7); b.ox = 5; b.oy = 6;
  for (let y = 0; y < 6; y++) for (let x = 0; x < 11; x++) { const nx = (x - 5) / 5, ny = (y - 4) / 3.4; if (nx * nx + ny * ny > 1 + 0.4 * (hash(x, y, seed) - 0.5)) continue; b.set(x, y, R.sage[clamp(Math.round(2.2 - nx * 1.2 - ny * 1.4 + (hash(x, y, seed + 1) - 0.5)), 1, 3)]); }
  outline(b, R.sage[0]);
  return b;
}
const charred = seed => { const s = makeSnag(seed); for (let i = 0; i < s.d.length; i++) if (s.d[i] && s.d[i] !== INK) s.d[i] = hash(i, seed, 5) < 0.55 ? R.basalt[1] : R.rock[3]; return s; };

export { blobTree, seaStack, sageBush, charred };
