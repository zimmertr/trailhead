// Scenery and animal sprites that more than one scene uses.
import { TAU, clamp, lerp, sq, rng, hash, vnoise, bayer, R, INK, BM, outline, litBack, disc, thick, pick } from './core.js';

// ---------------------------------------------------------------------------------------------
// Trees. Each is a still trunk plus leaf clumps that move on their own, a pixel at a time, as in
// the usual 2D wind technique: a wave runs along the wind, gusts widen it, and still air stops it.

// A clump of leaves (art pass D03, after a bigleaf maple and an aspen grove painted for the game): many
// small clusters of leaves inside the clump's outline, each lit on its upper left and shaded under, the
// lower ones laid over the upper so each shows a lit top against the shade above, with dark pockets
// between them and a broken edge. shape: 'pad' (a maple's flat sprays), 'tuft' (a pine's spiky needle
// clumps), 'tall' (an aspen's upright clusters) or round (a juniper's). The clusters come from hash,
// never rand, so the trees that share rand with their clumps draw the same trunks as before.
function clump(r, name, rand, hang, shape = '') {
  const S = Math.ceil(r * 2.6) + 4, b = new BM(S, S + hang), c = S / 2;
  const blobs = [[0, 0, r]];
  for (let k = 0; k < 3; k++) { const a = rand() * TAU; blobs.push([Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.5, r * (0.5 + rand() * 0.2)]); }
  // name is a ramp's name, or a list of colours from dark to light where one ramp does not hold them all.
  const ramp = Array.isArray(name) ? name : R[name], top = ramp.length - 1;
  const seed = Math.round(blobs[1][0] * 977 + blobs[2][1] * 613 + r * 41) & 0xffff;
  const inBlob = (dx, dy, g) => blobs.some(([bx, by, br]) => sq(dx - bx) + sq(dy - by) <= sq(br + g));
  const flat = shape === 'pad' ? 0.62 : shape === 'tall' ? 1.35 : 1, lr0 = shape === 'pad' ? clamp(r * 0.46, 1.6, 3.2) : clamp(r * (shape === 'tuft' ? 0.3 : 0.36), 1.3, 2.7), lobes = [];
  for (let k = 0, n = Math.round(r * r * (shape === 'tuft' ? 0.62 : shape === 'pad' ? 0.32 : 0.5)) + 4; k < n * 3 && lobes.length < n; k++) {
    const a = hash(k, 1, seed) * TAU, d = Math.sqrt(hash(k, 2, seed)) * r * 1.15, lx = Math.cos(a) * d, ly = Math.sin(a) * d * (shape === 'tall' ? 1.1 : 0.9);
    if (!inBlob(lx, ly, -0.6)) continue;
    const lr = lr0 * (0.8 + 0.45 * hash(k, 3, seed));
    lobes.push([lx, ly, lr, lr * flat]);
  }
  lobes.sort((p, q) => p[1] - q[1]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - c, dy = y - c;
    let own = -1;
    for (let k = lobes.length - 1; k >= 0; k--) { const [lx, ly, lr, ry] = lobes[k]; if (sq((dx - lx) / lr) + sq((dy - ly) / ry) <= 1) { own = k; break; } }
    if (own < 0) { if (inBlob(dx, dy, -1.8)) b.set(x, y, ramp[1]); continue; }
    const [lx, ly, lr, ry] = lobes[own], ux = (dx - lx) / lr, uy = (dy - ly) / ry;
    const nx = dx / (r * 1.3), ny = dy / (r * 1.2);
    let v = 0.42 + 0.3 * (-0.55 * nx - 0.78 * ny) + 0.44 * (-0.45 * ux - (shape === 'pad' ? 0.95 : 0.75) * uy) + (hash(x, y, seed + 7) - 0.5) * 0.14;
    if (uy < -0.35 && ux < 0.3 && hash(x, y, seed + 9) < 0.4) v += 0.18;
    // A maple's pad is dark along its underside, so each reads as a layer over the one below.
    if (shape === 'pad' && uy > 0.55) v -= 0.28;
    b.set(x, y, ramp[clamp(Math.round(v * top + (bayer(x, y) - 0.5) * 0.45), 1, top)]);
  }
  // A pine's needles stick out past each tuft's edge, up and to the sides.
  if (shape === 'tuft') for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
    const v = b.get(x, y); if (!v || v === ramp[1]) continue;
    for (const [ox, oy] of [[0, -1], [-1, 0], [1, 0], [-1, -1], [1, -1]]) if (!b.get(x + ox, y + oy) && hash(x * 3 + ox, y * 5 + oy, seed + 11) < 0.22) b.set(x + ox, y + oy, v);
  }
  // The dark edge goes only under and right of the clump; its lit top and left meet the sky.
  const edge = [];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (!b.get(x, y) && (b.get(x, y - 1) || b.get(x - 1, y) || (b.get(x + 1, y) && hash(x, y, seed + 13) < 0.5 && y > c))) edge.push([x, y]);
  for (const [x, y] of edge) b.set(x, y, ramp[0]);
  // Moss hangs from the limbs of the rainforest maples.
  for (let k = 0; k < hang && k < 4; k++) {
    const x = Math.round(c + (rand() - 0.5) * r * 1.4); let y = S - 1; while (y > 0 && !b.get(x, y)) y--;
    const len = 2 + (rand() * hang) | 0;
    for (let j = 1; j <= len; j++) b.set(x, y + j, j === len ? R.moss[4] : R.moss[5]);
  }
  b.cx = c; b.cy = c;
  return b;
}
function makeMaple(seed) {
  const rand = rng(seed), H = 38 + (rand() * 10 | 0), W = 34;
  const trunk = new BM(W, H + 2);
  const bx = W / 2, top = [bx + (rand() - 0.5) * 6, H * 0.42];
  const mid = [bx + (rand() - 0.5) * 8, H * 0.72];
  const barkCol = (x, y) => (x < bx - 0.5 + (y < H * 0.6 ? 1 : 0)) || hash(x, y, 3) < 0.35 ? R.moss[hash(x, y, 4) < 0.5 ? 4 : 3] : R.bark[hash(x, y, 5) < 0.5 ? 1 : 2];
  for (let t = 0; t <= 1; t += 0.02) {
    const p = t < 0.5 ? [lerp(bx, mid[0], t * 2), lerp(H, mid[1], t * 2)] : [lerp(mid[0], top[0], t * 2 - 1), lerp(mid[1], top[1], t * 2 - 1)];
    const wdt = t < 0.08 ? 6 : t < 0.5 ? 4 : 3;
    for (let dx = 0; dx < wdt; dx++) trunk.set(p[0] - wdt / 2 + dx, p[1], barkCol(Math.round(p[0] - wdt / 2 + dx), Math.round(p[1])));
  }
  for (const s of [-1, 1]) thick(trunk, mid[0], mid[1] - 2, mid[0] + s * (6 + rand() * 4), H * 0.36, 2, R.moss[4]);
  outline(trunk, INK);
  const parts = [{ bm: trunk, x: -Math.round(bx), y: -H, sway: 0 }];
  const n = 6 + (rand() * 3 | 0), cs = [];
  for (let k = 0; k < n; k++) cs.push([top[0] + (rand() - 0.5) * 22, H * 0.3 + (rand() - 0.5) * 18, 5 + rand() * 2.5]);
  // A darker copy of the canopy sits behind the clumps, so a lifted clump shows shadowed leaves, not sky.
  const inside = new BM(W, H);
  for (const [x, y, r] of cs) disc(inside, x, y, r - 2, () => R.moss[1]);
  parts.push({ bm: inside, x: -Math.round(bx), y: -H, sway: 0 });
  cs.sort((a, c) => a[1] - c[1]);
  for (const [x, y, r] of cs) { const bm = clump(r, 'moss', rand, 6, 'pad'); parts.push({ bm, x: Math.round(x - bm.cx - bx), y: Math.round(y - bm.cy - H), sway: 1, lx: x - bx }); }
  return { parts, h: H, w: W };
}
// A conifer: a trunk and tiers of branches that sway. name is a ramp's name, or a list of colours from
// dark to light. o tells the Northwest's kinds apart (E5b2): bark (the trunk's ramp; a redcedar's is
// red-brown and flares at the foot), droop (how far each tier's tips hang; cedar and hemlock droop),
// nod (a hemlock's leader bends over at the top), ragged (a Douglas fir's tiers are uneven and gappy).
function makeConifer(seed, H, W, name, tiers, o = {}) {
  const rand = rng(seed), parts = [], bark = R[o.bark || 'bark'], droop = o.droop || 1;
  const trunk = new BM(7, H + 1);
  for (let y = Math.round(H * 0.2); y <= H; y++) { trunk.set(2, y, bark[2]); trunk.set(3, y, bark[1]); if (y > H - 4 || (o.bark && y > H - 7)) trunk.set(4, y, bark[1]); if (o.bark && y > H - 4) trunk.set(1, y, bark[2]); }
  outline(trunk, INK);
  parts.push({ bm: trunk, x: -3, y: -H, sway: 0 });
  const ramp = Array.isArray(name) ? name : R[name];
  for (let i = 0; i < tiers; i++) {
    if (o.ragged && i > 1 && i < tiers - 1 && rand() < 0.22) continue;
    const f = (i + 1) / tiers, hw = Math.max(1.5, W / 2 * Math.pow(f, 0.9) + (rand() - 0.5) * 1.5 * (1 + 2.5 * (o.ragged || 0))), th = 4 + (f > 0.5 ? 1 : 0), hang = Math.ceil(2.5 * droop);
    if (o.tufts) { parts.push(tuftTier(seed, i, f, hw, th, droop, ramp, H, tiers, o, rand)); continue; }
    const bm = new BM(Math.ceil(hw * 2) + 5, th + 5 + hang), cx = bm.w / 2;
    for (let dx = -Math.floor(hw); dx <= Math.ceil(hw); dx++) {
      const a = Math.abs(dx) / hw; if (a > 1) continue;
      const y0 = 1 + a * a * 2.5 * droop, t = th * (1 - a * 0.55);
      for (let j = 0; j < t; j++) {
        let v = 0.78 - j / th * 0.6 - dx / hw * 0.2 + (hash(dx, j + i * 7, seed) - 0.5) * 0.3;
        bm.set(cx + dx, y0 + j + 1, ramp[clamp(Math.round(v * (ramp.length - 1) + (bayer(dx & 3, j) - 0.5) * 0.7), 1, ramp.length - 1)]);
      }
    }
    if (i === 0) { if (o.nod) { bm.set(cx, 1, ramp[3]); bm.set(cx + 1, 0, ramp[2]); bm.set(cx + 2, 0, ramp[2]); bm.set(cx + 3, 1, ramp[2]); } else { bm.set(cx, 0, ramp[2]); bm.set(cx, 1, ramp[3]); } }
    outline(bm, ramp[0]);
    const y = -H + 2 + i * (H * 0.82 * (o.crown || 1)) / tiers;
    parts.push({ bm, x: Math.round(-cx + 0.5), y: Math.round(y - 1), sway: 1 - f * 0.6, lx: 0 });
  }
  return { parts, h: H, w: W };
}
// One layer of branches for the scenes' big conifers (art pass D01, after design/art/D01): not a plate but
// two branches, each its own length, drooping from the trunk, hung with tufts of needles of uneven depth so
// the underside is jagged, ragged at the tips, a needle or two hanging below; lit on the left and along the
// top, dark underneath, in patches two pixels across. `open` (the larches) leaves the trunk showing and
// keeps the sprays thin. The map's small trees keep the plates, which read right at their size.
function tuftTier(seed, i, f, hw, th, droop, ramp, H, tiers, o, rand) {
  const hl = Math.max(1.5, hw * (0.72 + 0.56 * rand())), hr = Math.max(1.5, hw * (0.72 + 0.56 * rand())), hang = Math.ceil(2.5 * droop) + 6;
  // A larch is open: now and then a whole layer is missing and the trunk shows.
  const skip = o.open && i > 0 && hash(i, 5, seed) < 0.3;
  const bm = new BM(Math.ceil(Math.max(hl, hr) * 2) + 7, th + 8 + hang), cx = Math.floor(bm.w / 2), n = ramp.length - 1;
  for (let dx = -Math.floor(hl); dx <= Math.ceil(hr); dx++) {
    const hs = dx < 0 ? hl : hr, a = Math.abs(dx) / hs; if (skip || a > 1 || dx === 0 && o.open) continue;
    if (a > 0.7 && hash(dx, i, seed + 1) < 0.35) continue;
    const y0 = o.open ? 1 + Math.pow(a, 1.4) * 5 : 1 + a * a * 2.5 * droop;
    if (o.open) {
      // A larch's spray: a thin drooping twig, gold needles along it a pixel or two deep, more hanging at the tip.
      const t = 1 + (hash(dx >> 1, i, seed) > 0.45 ? 1 : 0) + (a > 0.75 && hash(dx, i, seed + 4) < 0.5 ? 1 : 0);
      for (let j = 0; j < t; j++) bm.set(cx + dx, Math.round(y0 + j + 1), ramp[clamp(Math.round((0.85 - j * 0.35 - dx / hs * 0.15 + 0.2 * (hash(dx, j + i, seed + 2) - 0.5)) * n), 1, n)]);
      continue;
    }
    const t = Math.max(1, (th + 1.5) * (1 - a * 0.5) * (0.5 + 0.65 * hash(dx >> 1, i, seed)));
    for (let j = 0; j < t; j++) {
      const v = 0.82 - j / t * 0.65 - dx / hs * 0.18 + (j === 0 && dx <= 0 ? 0.12 : 0) + 0.26 * (hash(dx >> 1, (j + i * 7) >> 1, seed + 2) - 0.5);
      bm.set(cx + dx, Math.round(y0 + j + 1), ramp[clamp(Math.round(v * n + (bayer(dx & 3, j) - 0.5) * 0.6), 1, n)]);
    }
    if (hash(dx, i, seed + 3) < 0.22) bm.set(cx + dx, Math.round(y0 + t + 1), ramp[1]);
  }
  if (i === 0) { bm.set(cx, 0, ramp[2]); bm.set(cx, 1, ramp[3]); }
  // The dark edge only under and beside a layer, never along its top, so a layer runs into the one above
  // instead of standing apart as a pill, and its underside is the shadow on the layer below.
  const d = bm.d.slice();
  for (let y = 0; y < bm.h; y++) for (let x = 0; x < bm.w; x++) {
    if (d[y * bm.w + x]) continue;
    const up = y > 0 && d[(y - 1) * bm.w + x], side = (x > 0 && d[y * bm.w + x - 1]) || (x < bm.w - 1 && d[y * bm.w + x + 1]);
    if (up || (side && y > 1)) bm.d[y * bm.w + x] = ramp[0];
  }
  const y = -H + 2 + i * (H * 0.82 * (o.crown || 1)) / tiers;
  return { bm, x: -cx, y: Math.round(y - 1), sway: 1 - f * 0.6, lx: 0 };
}
// The crown of a broadleaf or a pine: a dark copy of the canopy behind the clumps (so a lifted clump
// shows shadowed leaves, not sky), then the clumps from the top down.
function crown(parts, cs, colours, dark, W, H, bx, rand, shape = '') {
  const inside = new BM(W, H);
  for (const [x, y, r] of cs) disc(inside, x, y, r - 2, () => dark);
  parts.push({ bm: inside, x: -bx, y: -H, sway: 0 });
  cs.sort((a, c) => a[1] - c[1]);
  for (const [x, y, r] of cs) { const bm = clump(r, colours, rand, 0, shape); parts.push({ bm, x: Math.round(x - bm.cx - bx), y: Math.round(y - bm.cy - H), sway: 1, lx: x - bx }); }
}
// A quaking aspen in autumn: a thin white trunk with dark marks where limbs were, and a small round
// crown of yellow leaves. They are planted in groves.
// A dark, crooked maple of the deep rainforest, where the fog begins: the trunk bends over and back,
// low limbs reach out with a kink in each, the leaves are few and dark, and long beards of moss hang
// from the limbs.
function makeTwisted(seed) {
  const rand = rng(seed), H = 30 + (rand() * 8 | 0), W = 36, bx = W / 2, lean = rand() < 0.5 ? -1 : 1;
  const trunk = new BM(W, H + 2);
  const pts = [[bx, H], [bx + lean * (3 + rand() * 3), H * 0.68], [bx - lean * (2 + rand() * 2), H * 0.44], [bx + lean * (3 + rand() * 3), H * 0.24]];
  const col = (x, y) => hash(x, y, 7) < 0.4 ? R.moss[hash(x, y, 8) < 0.5 ? 2 : 1] : R.bark[hash(x, y, 9) < 0.6 ? 0 : 1];
  for (let k = 1; k < pts.length; k++) for (let t = 0; t <= 1; t += 0.04) {
    const x = lerp(pts[k - 1][0], pts[k][0], t), y = lerp(pts[k - 1][1], pts[k][1], t), w = k === 1 ? (t < 0.2 ? 5 : 4) : k === 2 ? 3 : 2;
    for (let dx = 0; dx < w; dx++) { const px = Math.round(x - w / 2 + dx), py = Math.round(y); trunk.set(px, py, col(px, py)); }
  }
  const ends = [];
  for (let k = 1; k < pts.length; k++) {
    const side = k & 1 ? -lean : lean, [x0, y0] = pts[k], kx = x0 + side * (4 + rand() * 4), ky = y0 - 1 - rand() * 3, ex = kx + side * (3 + rand() * 4), ey = ky + 1 + rand() * 3;
    thick(trunk, x0, y0, kx, ky, k === 1 ? 2 : 1, R.bark[0]); thick(trunk, kx, ky, ex, ey, 1, R.bark[0]); ends.push([kx, ky], [ex, ey]);
  }
  // Beards of moss, from the kinks and the ends of the limbs.
  for (const [x, y] of ends) { const len = 3 + (rand() * 7 | 0); for (let j = 1; j <= len; j++) trunk.set(Math.round(x + (j > 4 ? (j & 1) : 0)), Math.round(y) + j, j === len ? R.moss[2] : R.moss[j & 1 ? 3 : 4]); }
  outline(trunk, INK);
  const parts = [{ bm: trunk, x: -Math.round(bx), y: -H, sway: 0 }], dark = [R.moss[0], R.moss[1], R.moss[2], R.moss[3]];
  const cs = [pts[3], ...ends.filter((_, n) => n & 1)].slice(0, 4).map(([x, y]) => [x + (rand() - 0.5) * 4, y - 2 - rand() * 3, 3 + rand() * 1.5]);
  for (const [x, y, r] of cs) { const bm = clump(r, dark, rand, 5, 'pad'); parts.push({ bm, x: Math.round(x - bm.cx - bx), y: Math.round(y - bm.cy - H), sway: 1, lx: x - bx }); }
  return { parts, h: H, w: W };
}
// A clump of wildflowers for the map (D5a): a few stems with a bloom on each, the blooms a part of their
// own so they sway on still stems. kind: 'lupine' (a blue spike), 'red' (paintbrush), 'white', 'yellow'.
// Each clump stands on a low mound of its own leaves, lit on the left and dark only at its lower right
// (art pass D04, after a meadow painted for the game), and each kind has its own head: lupine a short spike
// dark at its foot and pale at its tip, paintbrush a tuft lit on top and shaded right, white and yellow dots.
function makeFlowers(kind, seed) {
  const rand = rng(seed), stems = new BM(9, 7), blooms = new BM(9, 7), n = 3 + (rand() * 3 | 0), G = R.grass;
  for (let x = 1; x < 8; x++) {
    const tall = x > 1 && x < 7 ? 1 + (hash(x, 1, seed) < 0.55 ? 1 : 0) : hash(x, 2, seed) < 0.5 ? 1 : 0;
    for (let j = 0; j < tall; j++) stems.set(x, 6 - j, j === 0 && x > 4 ? G[1] : x < 4 && j === tall - 1 && hash(x, 3, seed) < 0.6 ? G[4] : x < 5 ? G[3] : G[2]);
  }
  for (let k = 0; k < n; k++) {
    // Neighbouring stems alternate short and tall, so their heads never join into a dash.
    const x = 1 + Math.round(k * 7 / n + rand()), hgt = 2 + (k & 1) + (rand() * 2 | 0) + (k & 1 && kind !== 'lupine' ? 1 : 0), y0 = 6 - hgt;
    for (let y = 5; y > y0; y--) stems.set(x, y, G[2]);
    if (kind === 'lupine') { blooms.set(x, y0, R.lupine[0]); blooms.set(x, y0 - 1, R.lupine[1]); if (rand() < 0.5) blooms.set(x, y0 - 2, R.lupine[2]); }
    else if (kind === 'red') { blooms.set(x, y0, R.red[1]); blooms.set(x, y0 - 1, R.red[2]); if (rand() < 0.6) blooms.set(x + 1, y0, R.red[0]); }
    else if (kind === 'white') { blooms.set(x, y0, R.white[1]); if (rand() < 0.5) blooms.set(x + 1, y0 + 1, R.white[0]); }
    else { blooms.set(x, y0, R.yellow[1]); if (rand() < 0.4) blooms.set(x + 1, y0, R.yellow[0]); }
  }
  return { parts: [{ bm: stems, x: -4, y: -6, sway: 0 }, { bm: blooms, x: -4, y: -6, sway: 1, lx: 0 }], h: 7, w: 9, low: true };
}
// Skunk cabbage (round 6, C3): three big upright leaves, bright green, with a yellow hooded flower among
// them, as it grows in the rainforest's bogs. Its leaves sway.
function makeSkunkCabbage(seed) {
  const rand = rng(seed), b = new BM(9, 7), G = R.grass; b.ox = 4; b.oy = 6;
  for (const [cx, lean] of [[2, -1], [6, 1], [4, 0]]) { const h = 4 + (rand() * 2 | 0); for (let j = 0; j < h; j++) { const w = j < h - 1 ? 1 : 0; for (let i = -w; i <= w; i++) b.set(cx + i + Math.round(lean * j / 3), 6 - j, j < 1 ? G[1] : i === -w ? G[4] : G[3]); } }
  const fx = 3 + (rand() * 3 | 0); b.set(fx, 4, R.yellow[0]); b.set(fx, 3, R.yellow[1]); b.set(fx + 1, 3, R.yellow[0]); b.set(fx, 2, R.yellow[1]);
  return swaying(b, 4);
}
// Fireweed (round 6, I1): two to four tall stalks, green at the foot and magenta above, the tip of each
// paler, as the burn's ground used to have them painted in. The top sways.
function makeFireweed(seed) {
  const rand = rng(seed), b = new BM(7, 10), n = 2 + (rand() * 3 | 0); b.ox = 3; b.oy = 9;
  for (let k = 0; k < n; k++) { const x = clamp(Math.round(k * 5 / Math.max(1, n - 1) + rand()), 0, 6), tall = 6 + (rand() * 4 | 0);
    for (let j = 0; j < tall; j++) b.set(x, 9 - j, j < 2 ? R.grass[1] : j === tall - 1 ? R.fireweed[1] : R.fireweed[0]); }
  return swaying(b, 6);
}
// A still drawing made to sway like a tree: its top rows are a part that leans, its foot stays put.
function swaying(bm, cut = Math.round(bm.h * 0.55)) {
  const top = new BM(bm.w, cut), foot = new BM(bm.w, bm.h - cut);
  for (let y = 0; y < bm.h; y++) for (let x = 0; x < bm.w; x++) { const c = bm.d[y * bm.w + x]; if (c) (y < cut ? top : foot).set(x, y < cut ? y : y - cut, c); }
  return { parts: [{ bm: foot, x: -bm.ox, y: cut - bm.oy, sway: 0 }, { bm: top, x: -bm.ox, y: -bm.oy, sway: 0.8, lx: 0 }], h: bm.h, w: bm.w, low: true };
}
// The owl in the rainforest, on a broken stub: pose 'open', 'blink' or 'turn' (its head round to one side).
function makeOwl(pose) {
  const b = new BM(5, 15), F = R.fur, eye = pose === 'blink' ? F[1] : R.yellow[1];
  for (let y = 6; y < 15; y++) for (let x = 1; x <= 2; x++) b.set(x, y, hash(x, y, 31) < 0.3 ? R.moss[2] : R.bark[x === 1 ? 0 : 1]);
  b.set(2, 5, R.bark[1]);
  b.set(1, 0, F[2]); b.set(3, 0, F[2]);
  for (let x = 0; x <= 4; x++) { b.set(x, 1, F[2]); b.set(x, 2, x === 2 ? R.yellow[0] : F[3]); b.set(x, 3, x === 0 || x === 4 ? F[1] : F[2]); }
  for (let x = 1; x <= 3; x++) b.set(x, 4, F[x === 2 ? 2 : 1]);
  if (pose === 'turn') { b.set(3, 1, eye); b.set(4, 2, R.yellow[0]); b.set(2, 2, F[3]); } else { b.set(1, 1, eye); b.set(3, 1, eye); }
  b.ox = 2; b.oy = 14;
  return b;
}
function makeAspen(seed) {
  const rand = rng(seed), H = 23 + (rand() * 14 | 0), W = 22, bx = W >> 1, lean = (rand() - 0.5) * 3;
  const trunk = new BM(W, H + 2), tx = y => bx + Math.round(lean * (1 - y / H));
  for (let y = Math.round(H * 0.25); y <= H; y++) { trunk.set(tx(y), y, R.white[1]); trunk.set(tx(y) + 1, y, R.white[0]); }
  for (let y = H - 2 - (rand() * 3 | 0); y > H * 0.3; y -= 3 + (rand() * 4 | 0)) { const two = rand() < 0.35; trunk.set(tx(y) + (rand() < 0.5 || two ? 0 : 1), y, R.basalt[0]); if (two) trunk.set(tx(y) + 1, y, R.basalt[1]); }
  outline(trunk, INK);
  // The crown is narrow and upright, after the aspen grove painted for D03: clusters stacked up the
  // trunk, close to it, and a small one on top for the point.
  const r0 = 3.6 + rand() * 1.2, parts = [{ bm: trunk, x: -bx, y: -H, sway: 0 }], cs = [[tx(H * 0.25) + 0.5, H * 0.22, r0 * 0.9]];
  for (let k = 2 + (rand() * 3 | 0); k > 0; k--) cs.push([tx(H * 0.3) + 0.5 + (rand() - 0.5) * 5, H * (0.16 + rand() * 0.32), 2.6 + rand() * 1.4]);
  cs.push([tx(H * 0.2) + 0.5, H * 0.22 - r0 * 1.1, r0 * 0.6]);
  crown(parts, cs, [R.mustard[0], R.mustard[1], R.aspen[0], R.aspen[1]], R.mustard[0], W, H, bx, rand, 'tall');
  return { parts, h: H, w: 13 };
}
// A ponderosa pine: a tall straight trunk of orange-brown bark broken into plates, bare for half its
// height, and an open crown of dark needle clumps at the ends of its limbs with sky between them.
function makePonderosa(seed) {
  const rand = rng(seed), H = 44 + (rand() * 14 | 0), W = 32, bx = W >> 1;
  const trunk = new BM(W, H + 2);
  for (let y = Math.round(H * 0.14); y <= H; y++) for (let dx = 0; dx < (y > H * 0.5 ? 3 : 2); dx++) trunk.set(bx - 1 + dx, y, (y + dx * 2 + seed) % 4 === 0 ? R.pbark[0] : dx === 0 ? R.pbark[2] : R.pbark[1]);
  trunk.set(bx - 2, H, R.pbark[1]); trunk.set(bx + 2, H, R.pbark[0]);
  const cs = [[bx, H * 0.1, 3.8 + rand()]];
  let side = rand() < 0.5 ? -1 : 1;
  for (let y = H * 0.17; y < H * 0.54; y += 4.5 + rand() * 3) {
    const cx = bx + side * (4 + rand() * 3 + 5 * y / H), cy = y - 1 - rand() * 2;
    thick(trunk, bx, y + 3, cx, cy + 1, 1, R.pbark[0]); cs.push([cx, cy, 3.3 + rand() * 1.5]); side = -side;
  }
  // A dead limb or two below the crown.
  for (let k = 1 + (rand() * 2 | 0); k > 0; k--) { const y = H * (0.56 + rand() * 0.14), s = rand() < 0.5 ? -1 : 1; thick(trunk, bx, y, bx + s * (3 + rand() * 2), y - 1, 1, R.pbark[0]); }
  outline(trunk, INK);
  const parts = [{ bm: trunk, x: -bx, y: -H, sway: 0 }];
  crown(parts, cs, [R.conifer[0], R.pine[0], R.pine[1], R.pine[2], R.pine[3]], R.conifer[0], W, H, bx, rand, 'tuft');
  return { parts, h: H, w: 20 };
}
// The dry side's trees (E5g). A lodgepole pine: tall, straight and thin, crowded in stands, its needles
// only in the top half with the trunk bare below.
const makeLodgepole = (seed, tufts = false) => { const r = rng(seed); return makeConifer(seed, 34 + (r() * 14 | 0), 8 + (r() * 3 | 0), 'pine', 6, { crown: 0.55, tufts }); };
// A western juniper: low and gnarled, a twisting trunk of shaggy grey-brown bark under dense clumps of
// blue-grey foliage. It grows where the pines give out to sage.
function makeJuniper(seed) {
  const rand = rng(seed), H = 13 + (rand() * 6 | 0), W = 20, bx = W >> 1, lean = rand() < 0.5 ? -1 : 1;
  const trunk = new BM(W, H + 2), pts = [[bx, H], [bx + lean * (1 + rand() * 2), H * 0.62], [bx - lean * (1 + rand() * 2), H * 0.36]];
  for (let k = 1; k < pts.length; k++) thick(trunk, pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], k === 1 ? 2 : 1, k === 1 ? R.ochre[0] : R.rock[1]);
  thick(trunk, pts[1][0], pts[1][1], pts[1][0] + lean * 5, pts[1][1] - 3, 1, R.ochre[0]);
  outline(trunk, INK);
  const parts = [{ bm: trunk, x: -bx, y: -H, sway: 0 }], cs = [[pts[2][0], H * 0.28, 4 + rand()], [pts[1][0] + lean * 5, pts[1][1] - 4, 3.4 + rand()]];
  if (rand() < 0.6) cs.push([pts[2][0] - lean * 3, H * 0.42, 3.2 + rand()]);
  crown(parts, cs, [R.hill[0], R.hill[1], R.sage[1], R.sage[2], R.sage[3]], R.hill[0], W, H, bx, rand);
  return { parts, h: H, w: 14 };
}
// A whitebark pine, high on the bench and the plateau's rim: several pale grey trunks from one foot,
// spreading, with dark clumps of needles at their ends, bent by the wind.
function makeWhitebark(seed) {
  const rand = rng(seed), H = 20 + (rand() * 8 | 0), W = 26, bx = W >> 1, cs = [];
  const trunk = new BM(W, H + 2);
  for (let k = 0, n = 2 + (rand() * 2 | 0); k < n; k++) { const ex = bx + (k - (n - 1) / 2) * (5 + rand() * 3), ey = H * (0.18 + rand() * 0.2); thick(trunk, bx, H, ex, ey, k === 0 ? 2 : 1, R.rock[hash(k, seed, 3) < 0.5 ? 3 : 4]); cs.push([ex, ey - 1, 3 + rand() * 1.2]); }
  outline(trunk, INK);
  const parts = [{ bm: trunk, x: -bx, y: -H, sway: 0 }];
  crown(parts, cs, [R.conifer[0], R.conifer[1], R.pine[1], R.pine[2], R.pine[3]], R.conifer[0], W, H, bx, rand, 'tuft');
  return { parts, h: H, w: 18 };
}
// New growth in the burn (E5g): slide alder, a low tangle of bright fresh leaves along the water, and
// manzanita, its red-brown stems showing through small dark leaves.
function makeShrub(seed, kind) {
  const rand = rng(seed), b = new BM(14, 10); b.ox = 7; b.oy = 9;
  if (kind === 'manz') for (let k = 0; k < 4; k++) thick(b, 7, 9, 7 + (rand() - 0.5) * 10, 3 + rand() * 3, 0, R.pbark[1 + (k & 1)]);
  const r = kind === 'alder' ? 3.4 + rand() * 1.6 : 2.8 + rand() * 1.2;
  for (let y = 0; y < 10; y++) for (let x = 0; x < 14; x++) {
    const nx = (x - 7) / (r * 1.3), ny = (y - (9 - r * 0.7)) / (r * 0.8);
    if (nx * nx + ny * ny > 1 + 0.5 * (vnoise(x / 2, y / 2, seed) - 0.5)) continue;
    if (kind === 'manz' && hash(x, y, seed) < 0.35) continue;
    const v = 0.6 - nx * 0.3 - ny * 0.4 + (hash(x, y, seed + 1) - 0.5) * 0.4;
    b.set(x, y, kind === 'alder' ? R.kit[clamp(Math.round(v * 2.4), 0, 2)] : R.pine[clamp(Math.round(1 + v * 2), 1, 3)]);
  }
  outline(b, kind === 'alder' ? R.moss[2] : R.conifer[0]);
  return b;
}
// The scenes pass tufts (D01); the map keeps the plates.
const makeSpruce = (seed, tufts = false) => { const r = rng(seed); return makeConifer(seed, 52 + (r() * 16 | 0), 26 + (r() * 8 | 0), 'conifer', 9, { tufts }); };
const makeFir = (seed, tufts = false) => { const r = rng(seed); return makeConifer(seed, 22 + (r() * 12 | 0), 9 + (r() * 4 | 0), 'conifer', 6, { tufts }); };

function makeFern(seed) {
  const rand = rng(seed), b = new BM(11, 7); b.ox = 5; b.oy = 6;
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k - 2) * 0.55 + (rand() - 0.5) * 0.2;
    for (let j = 1; j <= 4 + (k === 2 ? 1 : 0); j++) {
      const x = 5 + Math.cos(a) * j * 1.2, y = 6 + Math.sin(a) * j * 0.9 + (Math.abs(k - 2) > 1 ? j * 0.25 : 0);
      b.set(x, y, j > 3 ? R.moss[5] : R.moss[4]);
    }
  }
  return b;
}
function makeBoulder(seed, r) {
  const rand = rng(seed), b = new BM(Math.ceil(r * 2.4) + 4, Math.ceil(r * 1.6) + 4); b.ox = b.w >> 1; b.oy = b.h - 2;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const nx = (x - b.ox) / (r * 1.15), ny = (y - (b.oy - r * 0.6)) / (r * 0.7);
    if (nx * nx + ny * ny > 1 + 0.25 * (vnoise(x / 2, y / 2, seed) - 0.5) || y > b.oy) continue;
    b.set(x, y, pick('rock', 0.6 - nx * 0.25 - ny * 0.3 + (rand() - 0.5) * 0.15, x, y));
  }
  outline(b, INK);
  return b;
}
// A fallen log, lying a little off the level: a round cut end showing its rings, furrowed bark,
// moss in patches along the top and the stub of a branch. In the burn it lies bare and silver.
function makeLog(seed = 0, bare = false) {
  const rand = rng(960 + seed), len = 15 + (rand() * 8 | 0), tilt = (rand() < 0.5 ? -1 : 1) * (1 + rand() * 1.5), rad = 2.6;
  const b = new BM(len + 9, 15); b.ox = b.w >> 1; b.oy = 12;
  const bark = bare ? [R.rock[1], R.rock[2], R.rock[3], R.rock[4]] : R.bark, cut = bare ? [R.rock[2], R.rock[3], R.rock[4]] : [R.wood[2], R.wood[3], R.wood[4]];
  const cy = t => 7.5 + tilt * (t / len - 0.5);
  for (let t = 0; t < len; t++) {
    const c = cy(t), top = Math.round(c - rad), groove = hash(t, seed, 63) < 0.3, moss = bare ? 0 : vnoise(t / 3, seed, 64);
    for (let y = top; y <= Math.round(c + rad); y++) { const v = (y - c) / rad; b.set(3 + t, y, bark[v < -0.45 ? (groove ? 2 : 3) : v < 0.35 ? (groove ? 1 : 2) : groove ? 0 : 1]); }
    if (moss > 0.45) { b.set(3 + t, top, R.moss[5]); if (moss > 0.6) b.set(3 + t, top + 1, R.moss[4]); }
  }
  const st = 2 + Math.round(len * (0.25 + 0.3 * rand())), sy = Math.round(cy(st) - rad);
  b.set(3 + st, sy - 1, bark[2]); b.set(2 + st, sy - 2, bark[2]); b.set(2 + st, sy - 3, bark[3]);
  const ex = 3 + len, ec = Math.round(cy(len));
  for (let dy = -3; dy <= 3; dy++) for (let dx = -2; dx <= 2; dx++) { const e = Math.hypot(dx / 2.3, dy / 3.3); if (e <= 1) b.set(ex + dx, ec + dy, e > 0.7 ? cut[1] : e < 0.25 ? cut[0] : cut[2]); }
  outline(b, INK);
  if (rand() < 0.5) { const d = b.d.slice(); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) b.d[y * b.w + x] = d[y * b.w + b.w - 1 - x]; b.ox = b.w - 1 - b.ox; }
  return b;
}
// Driftwood on the beach (round 5, T8: the logs were a forest log painted pale, and read as blobs). A
// sun-bleached trunk lying at its own angle: silver on top, grain running along it, a darker underside,
// one end broken off in splinters with a crack running in from it, the other a root wad or a snapped butt,
// the stub of a branch or two, and its shadow on the sand. Thicker at the butt, as a tree is.
function makeDriftwood(seed = 0) {
  const rand = rng(4800 + seed), len = 18 + (rand() * 14 | 0), slope = (rand() - 0.5) * 0.76, rad = 2 + rand() * 0.9, roots = rand() < 0.5, G = R.gold;
  const W = len + 16, H = Math.ceil(Math.abs(slope) * len) + 18, b = new BM(W, H), x0 = 8, cy = t => H / 2 + slope * (t - len / 2), rAt = t => rad * (1 - 0.35 * t / len);
  for (let t = 0; t < len; t++) {
    const c = cy(t), r = rAt(t), y0 = Math.round(c - r), y1 = Math.round(c + r), splinter = Math.max(0, (t - (len - 4)) / 3);
    for (let y = y0; y <= y1; y++) {
      if (splinter && hash(t, y, seed + 71) < 0.5 * splinter) continue;
      const j = y - Math.round(c), grain = vnoise(t / 7 + j * 2.7, j * 5.3, seed + 72), knot = hash(t >> 1, j, seed + 73) < 0.04;
      // A16, after a picture of Olympic coast driftwood: silver where the sun catches its top, a warm brown-grey
      // underneath, long dark cracks along the grain.
      const crack = j < 0 && hash(Math.floor((t + 9 * hash(j, 1, seed + 74)) / 9), j, seed + 75) < 0.3 && t % 9 > 1;
      b.set(x0 + t, y, y === y1 ? R.ochre[1] : y === y0 ? G[6] : y === y1 - 1 && r > 1.8 ? R.ochre[2] : crack ? G[2] : knot ? G[2] : j > 0 ? (grain > 0.5 ? G[3] : G[4]) : grain > 0.62 ? G[4] : grain < 0.3 ? G[6] : G[5]);
    }
  }
  // The crack: a dark line in from the broken end, along the grain.
  { const n = 3 + (rand() * 3 | 0); for (let k = 0; k < n; k++) { const t = len - 1 - k; b.set(x0 + t, Math.round(cy(t)), G[1]); } }
  // Branch stubs: bleached like the trunk, standing off its upper side.
  for (let k = 0, n = 1 + (rand() < 0.5 ? 1 : 0); k < n; k++) {
    const t = Math.round(len * (0.25 + 0.5 * rand())), top = Math.round(cy(t) - rAt(t)), lean = rand() < 0.5 ? -1 : 1, tall = 2 + (rand() * 3 | 0);
    for (let q = 1; q <= tall; q++) b.set(x0 + t + lean * Math.floor(q / 2), top - q, q === tall ? G[6] : q === 1 ? G[3] : G[5]);
  }
  if (roots) {
    // A root wad: the torn roots fan out from the butt, pale at their tips, with the dark of the hollow between.
    const c = cy(0);
    for (let k = 0, n = 5; k < n; k++) { const a = Math.PI + (k - (n - 1) / 2) * 0.52 + (rand() - 0.5) * 0.2, L = 3 + rand() * 2.5; for (let q = 0; q <= L; q++) b.set(x0 - 1 + Math.cos(a) * q, c + Math.sin(a) * q * 1.15, q < 1 ? G[2] : q > L - 1 ? G[6] : G[4]); }
    for (const [dx, dy] of [[-1, 0], [0, 0], [-1, -1], [0, 1], [-2, 0]]) b.set(x0 + dx, c + dy, dx === -1 && dy === 0 ? R.wood[0] : R.wood[2]);
  } else {
    // A snapped butt: the end grain a step darker, with its heart darker still.
    const c = cy(0), r = Math.round(rAt(0)); for (let dy = -r; dy <= r; dy++) b.set(x0 - 1, c + dy, dy === 0 ? G[2] : G[3]);
  }
  // Outlined in the wood's own dark, not in ink: ink round a log this thin is most of what shows.
  outline(b, G[1]);
  b.ox = W >> 1; b.oy = Math.min(H - 1, Math.round(H / 2 + rad + 2));
  if (rand() < 0.5) { const d = b.d.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b.d[y * W + x] = d[y * W + W - 1 - x]; b.ox = W - 1 - b.ox; }
  // Its shadow, on the sand below and to the east of it, drawn after any flip so it always falls away from
  // the sun: a dark band under the log and a lighter one beyond it.
  { const solid = b.d.slice(); for (let x = 0; x < W - 3; x++) for (let y = H - 4; y >= 0; y--) if (solid[y * W + x]) { for (const [dx, dy, c] of [[0, 1, R.ochre[0]], [1, 1, R.ochre[0]], [2, 1, R.ochre[1]], [1, 2, R.ochre[1]], [2, 2, R.ochre[1]], [3, 2, R.sand[0]], [2, 3, R.sand[0]]]) { const i = (y + dy) * W + x + dx; if (!solid[i] && !b.d[i]) b.d[i] = c; } break; } }
  return b;
}
function makeCloud(seed) {
  const rand = rng(seed), b = new BM(56, 20); b.ox = 0; b.oy = 0;
  const blobs = []; for (let k = 0; k < 6; k++) blobs.push([8 + k * 8 + rand() * 4, 12 - rand() * 6 - (k > 1 && k < 4 ? 4 : 0), 5 + rand() * 4]);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    if (!blobs.some(([bx, by, r]) => sq(x - bx) + sq((y - by) * 1.3) <= r * r) || y > 16) continue;
    b.set(x, y, y > 12 ? R.sky[3] : (y > 10 && bayer(x, y) > 0.5) ? R.sky[4] : R.white[1]);
  }
  return b;
}

// Signs and small built things.
// The junction sign (art pass D05): a square post lit on the west and two planks, each lit along its top,
// with a line of grain and an arrow-shaped tip, and a dot of colour for the trail it points to.
function makeSignpost() {
  const b = new BM(19, 22); b.ox = 9; b.oy = 21;
  for (let y = 5; y < 22; y++) { b.set(8, y, R.wood[3]); b.set(9, y, R.wood[1]); }
  const plank = (x0, x1, y, dir, dot) => {
    for (let x = x0; x <= x1; x++) { b.set(x, y, R.wood[4]); b.set(x, y + 1, (x * 7) % 5 === 1 ? R.wood[2] : R.wood[3]); b.set(x, y + 2, R.wood[1]); }
    const tip = dir < 0 ? x0 - 1 : x1 + 1; b.set(tip, y, R.wood[4]); b.set(tip, y + 1, R.wood[3]); b.set(tip + dir, y + 1, R.wood[3]); b.set(tip, y + 2, R.wood[1]);
    b.set(dir < 0 ? x1 - 1 : x0 + 1, y + 1, dot);
  };
  plank(2, 8, 6, -1, R.water[3]);
  plank(10, 16, 10, 1, R.snow[4]);
  for (let y = 1; y < 5; y++) { b.set(8, y, R.wood[4]); b.set(9, y, R.wood[2]); }
  b.set(8, 0, R.wood[4]); b.set(9, 2, R.gold[5]);
  for (const [x, y, c] of [[6, 21, 2], [7, 20, 3], [7, 21, 1], [10, 21, 2], [11, 21, 1], [10, 20, 3]]) b.set(x, y, R.rock[c]);
  outline(b, INK);
  return b;
}
// A small trail sign (art pass D05): a plank framed lit on its top and west, dots of lettering, on a post
// lit on the west with a rock at its foot.
function makeSmallSign() {
  const b = new BM(13, 16); b.ox = 6; b.oy = 15;
  for (let y = 6; y < 16; y++) { b.set(6, y, R.wood[3]); b.set(7, y, R.wood[1]); }
  for (let y = 2; y < 7; y++) for (let x = 1; x < 12; x++) b.set(x, y, y === 2 || x === 1 ? R.wood[4] : y === 6 || x === 11 ? R.wood[1] : R.wood[3]);
  for (let x = 3; x < 10; x += 2) b.set(x, 4, R.wood[1]);
  for (let x = 3; x < 8; x += 2) b.set(x, 5, R.wood[2]);
  b.set(5, 15, R.rock[3]); b.set(8, 15, R.rock[2]);
  outline(b, INK);
  return b;
}
// The Trailhead's kiosk (art pass D05, after a kiosk painted for the game): a red roof shingled in rows,
// lit on its west slope and dark on its east, over a dark eave that shades the top of the board; a framed
// board with four pinned notes lined with writing and a small trail map; square posts lit on the west,
// with rocks at their feet. The same size and foot as before.
function makeKiosk() {
  const b = new BM(26, 26); b.ox = 13; b.oy = 25;
  for (const x0 of [3, 21]) for (let y = 9; y < 26; y++) { b.set(x0, y, R.wood[3]); b.set(x0 + 1, y, y % 5 === 2 ? R.wood[0] : R.wood[1]); }
  // The board: a frame lit on its top and west, dark inside.
  for (let y = 10; y < 21; y++) for (let x = 6; x < 20; x++) b.set(x, y, y === 10 || x === 6 ? R.wood[3] : y === 20 || x === 19 ? R.wood[1] : y === 11 ? R.wood[0] : R.wood[1]);
  for (let x = 7; x < 19; x++) if (x % 3 === 0) b.set(x, 15, R.wood[0]);
  const note = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) b.set(x, y, x === x0 + w - 1 ? R.white[0] : (y - y0) % 2 === 1 && x > x0 && x < x0 + w - 1 ? R.rock[3] : R.white[1]); b.set(x0 + 1, y0, R.yellow[1]); };
  note(7, 12, 4, 4); note(7, 17, 4, 3); note(16, 12, 3, 4); note(13, 17, 5, 3);
  // The trail map: green ground, a tan trail across it and a red mark where you stand.
  for (let y = 12; y < 16; y++) for (let x = 12; x < 15; x++) b.set(x, y, x === 14 || y === 15 ? R.grass[2] : R.grass[3]);
  for (const [x, y] of [[12, 14], [13, 13], [14, 12]]) b.set(x, y, R.dirt[4]);
  b.set(13, 14, R.red[1]);
  // The roof: courses of shingles widening down from the ridge, the lower edge of each course darker.
  for (let j = 0; j < 7; j++) { const x0 = 7 - j, x1 = 18 + j, w = x1 - x0;
    for (let x = x0; x <= x1; x++) { const t = (x - x0) / w, lit = t < 0.34 ? 2 : t < 0.7 ? 1 : 0; b.set(x, j + 1, R.red[clamp(lit - (j % 2), 0, 2)]); }
    b.set(x0, j + 1, R.red[2]); }
  for (let x = 1; x <= 24; x++) { b.set(x, 8, R.wood[0]); if (x > 4 && x < 21) b.set(x, 9, R.wood[0]); }
  for (const [x, y, c] of [[1, 25, 2], [2, 24, 3], [2, 25, 1], [5, 25, 2], [6, 25, 1], [20, 25, 3], [23, 25, 2], [24, 24, 3], [24, 25, 1]]) b.set(x, y, R.rock[c]);
  outline(b, INK);
  return b;
}
// The fire lookout (E5j): a cab on a short timber tower, after the lookouts of the Cascades. A catwalk
// with a rail runs round the cab, windows go all the way round under a hipped roof, and a lightning rod
// stands on top. The glass is the lamp ramp, so it shows the sky by day and glows at Dusk.
function makeLookout() {
  const W = 17, H = 31, c = 8, foot = H - 1, deck = H - 13, b = new BM(W, H); b.ox = c; b.oy = foot;
  // The roof: hipped, lit on the west, its eaves a dark line; the rod after the outline.
  for (let r = 0; r < 5; r++) { const y = deck - 14 + r, hw = Math.round(0.5 + r * 1.5); for (let x = c - hw; x <= c + hw; x++) b.set(x, y, r === 4 ? R.navy[0] : x < c ? R.navy[2] : x === c ? R.navy[1] : R.navy[1]); }
  // The cab: a frame, a band of windows with mullions, a low wall under them.
  for (let y = deck - 9; y <= deck - 1; y++) for (let x = c - 5; x <= c + 5; x++) {
    const win = y >= deck - 8 && y <= deck - 4 && x > c - 5 && x < c + 5 && (x - c + 6) % 3 !== 0;
    b.set(x, y, win ? (y === deck - 8 || x === c - 3 && y < deck - 5 ? R.lamp[1] : R.lamp[0]) : y === deck - 9 ? R.wood[1] : x < c ? R.wood[3] : R.wood[2]);
  }
  // The catwalk and its rail, standing out past the cab.
  for (let x = c - 7; x <= c + 7; x++) { b.set(x, deck, R.wood[3]); b.set(x, deck - 3, R.wood[x < c ? 4 : 3]); }
  for (const x of [c - 7, c - 4, c + 4, c + 7]) { b.set(x, deck - 1, R.wood[2]); b.set(x, deck - 2, R.wood[2]); }
  outline(b, INK);
  b.set(c, deck - 15, R.rock[3]); b.set(c, deck - 16, R.rock[2]);
  // The tower: four legs splayed toward the foot, the near pair lit on the west, the far pair inside them
  // in shade, two stages of cross braces. Drawn after the outline so the gaps stay open.
  for (let y = deck + 1; y <= foot; y++) { const s = Math.round(3 + 3 * (y - deck) / (foot - deck)); b.set(c - s + 2, y, R.wood[0]); b.set(c + s - 2, y, R.wood[0]); b.set(c - s, y, R.wood[3]); b.set(c + s, y, R.wood[1]); b.set(c + s + 1, y, INK); }
  for (const [y0, y1] of [[deck + 1, deck + 6], [deck + 6, foot - 1]]) { const sp = y => 3 + 3 * (y - deck) / (foot - deck); thick(b, c - sp(y0), y0, c + sp(y1), y1, 1, R.wood[1]); thick(b, c + sp(y0), y0, c - sp(y1), y1, 1, R.wood[1]); }
  for (let x = c - 5; x <= c + 5; x++) b.set(x, deck + 1, R.wood[0]);
  return b;
}
function makeTent(c) {
  const b = new BM(16, 11); b.ox = 8; b.oy = 10;
  for (let y = 0; y < 10; y++) for (let x = 8 - y * 0.75; x <= 8 + y * 0.75; x++) b.set(x, y + 1, x < 8 ? R[c][2] : R[c][1]);
  for (let y = 6; y < 10; y++) b.set(8, y + 1, R.ink[0]);
  outline(b, INK);
  return b;
}
function makeJournal() {
  const b = makeBoulder(81, 6);
  const x = b.ox - 2, y = b.oy - 8;
  for (let dx = 0; dx < 5; dx++) { b.set(x + dx, y, R.white[1]); b.set(x + dx, y + 1, R.red[1]); }
  b.set(x + 2, y, R.white[0]);
  return b;
}

// The runner, drawn from a pose each frame: a chibi with a big head, as SNES sprites are, then
// outlined in one pass.
// An elk for the map, facing left: a buff body, a dark neck, head and legs, a pale rump, and on a bull
// a rack swept back over the shoulders. step 1 and 2 are the two walking frames.
function makeElk(headDown, step = 0, bull = true) {
  const b = new BM(30, 30); b.ox = 15; b.oy = 29;
  const oval = (cx, cy, rx, ry, fn) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const nx = (x - cx) / rx, ny = (y - cy) / ry; if (nx * nx + ny * ny <= 1) { const c = fn(nx, ny, x, y); if (c) b.set(x, y, c); } } };
  const buff = (nx, ny, x, y) => pick('dirt', 0.66 - ny * 0.3 + nx * 0.05, x, y, 0.5), dark = (nx, ny, x, y) => pick('bark', 0.5 - ny * 0.35, x, y, 0.5);
  // Long thin legs; the near and far ones swing opposite ways when it walks.
  for (const [lx, far] of [[9, 1], [12, 0], [19, 1], [22, 0]]) { const sw = step ? (far ? 1 : -1) * (step === 1 ? 1 : -1) : 0, c = R.bark[far ? 0 : 1]; for (let y = 19; y < 29; y++) b.set(lx + (y > 23 ? sw : 0), y, c); if (!far) for (let y = 19; y < 24; y++) b.set(lx - 1, y, c); }
  oval(15.5, 17.5, 8, 4, buff); oval(13, 20, 4, 2, buff);
  oval(22.4, 16.5, 2.2, 2.8, nx => nx > -0.1 ? R.white[0] : 0);
  const hx = headDown ? 5 : 4, hy = headDown ? 25 : 9;
  if (headDown) thick(b, 10, 18, 7, 23, 3, R.bark[1]); else thick(b, 10, 16, 6, 10, 3, R.bark[1]);
  oval(10.5, 18.5, 2.4, 3.4, dark);
  oval(hx, hy, 2.8, 1.8, dark); b.set(hx - 3, hy + 1, R.bark[0]); b.set(hx, hy - 1, INK);
  if (!bull) { b.set(hx + 3, hy - 2, R.bark[2]); b.set(hx + 4, hy - 3, R.bark[2]); }
  litBack(b);
  outline(b, INK);
  // The rack goes on after the outline, so it stays thin: the far antler a shade darker, then the near one.
  if (bull) {
    const rack = headDown ? [[2, -2], [3, -3], [3, -4], [4, -5], [4, -6], [5, -7], [5, -8], [2, -5], [1, -6], [3, -7], [2, -8], [4, -9]] : [[2, -2], [3, -3], [3, -4], [4, -5], [5, -5], [6, -6], [7, -6], [8, -7], [3, -6], [3, -7], [5, -7], [5, -8], [9, -8], [7, -8]];
    for (const [dx, c] of [[2, R.dirt[3]], [0, R.white[0]]]) for (const [x, y] of rack) b.set(hx + x + dx, hy + y, c);
  }
  return b;
}
// A moose, facing left like the elk and a head taller: a dark body on long pale legs, a hump over the shoulders,
// a long head with a drooping nose and a bell under the throat. The bull carries broad palmate antlers (T35, TJ: "so
// that one can have antlers"). The calf is small, red-brown and all legs.
function makeMoose(calf, headDown, step = 0) {
  const b = calf ? new BM(26, 24) : new BM(40, 38); b.ox = calf ? 13 : 20; b.oy = b.h - 1;
  const oval = (cx, cy, rx, ry, fn) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const nx = (x - cx) / rx, ny = (y - cy) / ry; if (nx * nx + ny * ny <= 1) { const c = fn(nx, ny, x, y); if (c) b.set(x, y, c); } } };
  const coat = calf ? (nx, ny, x, y) => pick('bark', 0.68 - ny * 0.3 + nx * 0.05, x, y, 0.5) : (nx, ny, x, y) => pick('fur', 0.42 - ny * 0.34 + 0.16 * (hash(x, y, 14) - 0.5), x, y, 0.6);
  const dark = calf ? R.bark[1] : R.fur[1], sock = calf ? R.bark[2] : R.dirt[3];
  if (calf) {
    for (const [lx, far] of [[8, 1], [10, 0], [16, 1], [18, 0]]) { const sw = step ? (far ? 1 : -1) * (step === 1 ? 1 : -1) : 0; for (let y = 13; y < 23; y++) b.set(lx + (y > 18 ? sw : 0), y, y > 17 ? sock : R.bark[far ? 0 : 1]); }
    oval(13, 11.5, 5.4, 3, coat);
    const hx = headDown ? 5 : 4.5, hy = headDown ? 19 : 7;
    if (headDown) thick(b, 8, 12, 6, 17, 3, dark); else thick(b, 8, 10, 6, 8, 3, dark);
    oval(hx, hy, 2.6, 1.7, coat); b.set(hx - 2, hy + 1, dark); b.set(hx - 3, hy + 1, dark); b.set(hx - 1, hy - 1, INK); b.set(hx + 2, hy - 2, R.bark[2]); b.set(hx + 3, hy - 3, R.bark[2]);
    litBack(b); outline(b, INK); return b;
  }
  // The legs: dark above the knee, pale below; the near and far ones swing opposite ways when it walks.
  for (const [lx, far] of [[12, 1], [15, 0], [26, 1], [29, 0]]) { const sw = step ? (far ? 1 : -1) * (step === 1 ? 1 : -1) : 0; for (let y = 21; y < 37; y++) b.set(lx + (y > 29 ? sw : 0), y, y > 28 ? sock : R.fur[far ? 0 : 1]); if (!far) for (let y = 21; y < 29; y++) b.set(lx - 1, y, R.fur[1]); }
  oval(21, 19.5, 9.5, 4.6, coat); oval(14.5, 17, 4.6, 5, coat); oval(28, 19, 3.4, 4.4, coat);
  const hx = headDown ? 6 : 6, hy = headDown ? 30 : 14;
  if (headDown) thick(b, 12, 19, 9, 27, 5, dark); else thick(b, 12, 16, 9, 14, 5, dark);
  oval(hx, hy, 3.6, 2.1, coat); oval(hx - 2.4, hy + 1.6, 2.2, 1.9, coat);
  b.set(hx + 1, hy - 1, INK); b.set(hx + 4, hy - 3, dark); b.set(hx + 5, hy - 3, dark);
  if (!headDown) { b.set(hx + 4, hy + 4, dark); b.set(hx + 4, hy + 5, dark); }
  litBack(b);
  outline(b, INK);
  // The antlers go on after the outline, as the elk's do: a broad palm with points along its top, the far one a shade darker.
  const palm = [[3, -3], [4, -4], [2, -5], [3, -5], [4, -5], [5, -5], [6, -5], [7, -5], [8, -5], [3, -6], [4, -6], [5, -6], [6, -6], [7, -6], [8, -6], [9, -6], [3, -7], [5, -7], [7, -7], [9, -7], [10, -7], [1, -4], [0, -5]];
  for (const [dx, dy, c] of [[-4, 0, R.dirt[3]], [0, 0, R.white[0]]]) for (const [x, y] of palm) b.set(hx + x + dx, hy + y + dy, c);
  return b;
}
function makeSlug() {
  const b = new BM(8, 4); b.ox = 4; b.oy = 3;
  for (let x = 1; x < 7; x++) b.set(x, 2, R.yellow[1]);
  for (let x = 2; x < 6; x++) b.set(x, 1, R.yellow[1]);
  b.set(6, 1, R.yellow[0]); b.set(7, 0, R.yellow[0]);
  outline(b, INK);
  return b;
}
function makeBird(f) {
  const b = new BM(7, 4); b.ox = 3; b.oy = 2;
  const ys = f ? [0, 1, 2, 2, 2, 1, 0] : [2, 2, 1, 2, 1, 2, 2];
  ys.forEach((y, x) => b.set(x, y, INK));
  return b;
}
function makeCat(name, pose, seed) {
  const b = new BM(16, 12); b.ox = 8; b.oy = 11;
  const ramp = R[name], col = (x, y, v) => {
    if (name === 'tortie') { const n = vnoise(x / 2.2, y / 2.2, seed); return n > 0.62 ? ramp[3] : n > 0.5 ? ramp[2] : ramp[v > 0.6 ? 1 : 0]; }
    return ramp[clamp(Math.round(v * 3), 0, 3)];
  };
  const crouch = pose === 'crouch', leap = pose === 'leap';
  const bodyY = crouch ? 8.5 : leap ? 6 : 7.5, bodyR = leap ? 4.2 : 3.4;
  for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) {
    const nx = (x - 7) / (bodyR * (leap ? 1.4 : 1.15)), ny = (y - bodyY) / (bodyR * 0.85);
    if (nx * nx + ny * ny <= 1) b.set(x, y, col(x, y, 0.65 - ny * 0.3 - nx * 0.1));
  }
  const hx = leap ? 12 : crouch ? 11 : 10, hy = crouch ? 7 : leap ? 4.5 : 4;
  disc(b, hx, hy, 2.6, (nx, ny, x, y) => col(x, y, 0.75 - ny * 0.3));
  b.set(hx - 2, hy - 3, ramp[name === 'tortie' ? 0 : 1]); b.set(hx + 1, hy - 3, ramp[name === 'tortie' ? 2 : 1]);
  b.set(hx + 1, hy - 0.5, name === 'tortie' ? R.yellow[1] : R.yellow[1]);
  const tail = pose === 'sitB' ? [[3, 9], [1, 7], [1, 5]] : pose === 'sitA' ? [[3, 9], [1, 9], [0, 7]] : [[3, bodyY], [1, bodyY - 1], [0, bodyY - 3]];
  for (const [x, y] of tail) { b.set(x, y, col(x, y, 0.5)); b.set(x + 1, y, col(x + 1, y, 0.4)); }
  if (!leap) for (const x of [5, 9]) b.set(x, 11, col(x, 11, 0.3));
  outline(b, name === 'nebel' ? (x, y) => (hash(x, y, 2) < 0.3 ? R.nebel[1] : INK) : INK);
  return b;
}


// A dead tree of Postmortem Burn (A13, after a picture of a burned Cascade forest a few years on): a
// straight, tapering trunk, two pixels wide below and one above, lit on its left by the sun in the upper
// left and dark on its right. Silver ones are weathered grey with paler streaks, charred ones black with a
// few patches of bronze bark left, bark ones still in their brown bark. The top is a fine spike, a snapped
// jagged end or a crown of short stubs angled up; a few more stubs stand lower down. The dark edge is only
// on the shaded right, so trunks standing close read one by one instead of as a tangle.
function makeSnag(seed, kind = 'silver') {
  const rand = rng(seed), H = 20 + (rand() * 12 | 0), b = new BM(13, H + 2); b.ox = 6; b.oy = H;
  const C = kind === 'char' ? [R.basalt[0], R.basalt[1], R.basalt[2], R.basalt[3]] : kind === 'bark' ? [R.bark[0], R.bark[1], R.bark[2], R.bark[3]] : [R.rock[1], R.rock[2], R.rock[3], R.rock[4]];
  const top = rand(), spike = top < 0.4, snapped = top >= 0.4 && top < 0.75, cut = snapped ? Math.round(H * (0.12 + 0.12 * rand())) : 1, thin = Math.round(H * (spike ? 0.4 : 0.22));
  for (let y = cut; y <= H; y++) {
    const streak = hash(seed, y >> 2, 21) < 0.3, patch = kind === 'char' && hash(seed, y >> 1, 22) < 0.1;
    b.set(6, y, patch ? R.bark[2] : y < thin ? C[2] : streak && kind === 'silver' ? C[3] : C[2]);
    if (y >= thin) b.set(7, y, patch ? R.bark[1] : C[1]);
    if (y >= thin) b.set(6, y, patch ? R.bark[3] : streak ? C[3] : C[2]);
  }
  if (snapped) { b.set(7, cut, C[1]); b.set(6, cut - 1, C[2]); }
  // Stubs: short limbs angled up, more at the top of a crowned snag.
  const stubs = 2 + (rand() * 3 | 0) + (!spike && !snapped ? 2 : 0);
  for (let k = 0; k < stubs; k++) { const y = Math.round(cut + 2 + rand() * (H * 0.55)), s = k & 1 ? 1 : -1, len = 1 + (rand() * 2.5 | 0), x0 = s > 0 ? 7 : 6;
    for (let d = 1; d <= len; d++) b.set(x0 + s * d, y - Math.floor(d * 0.7), s < 0 ? C[3] : C[1]); }
  // The dark edge on the shaded right only.
  const o = b.d.slice(); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w - 1; x++) if (b.d[y * b.w + x] && !b.d[y * b.w + x + 1]) o[y * b.w + x + 1] = INK;
  b.d = o;
  return b;
}
// A low shrub. Huckleberry going red, or heather in flower.
function makeBush(seed, kind) {
  const rand = rng(seed), r = 3 + rand() * 2, b = new BM(14, 10); b.ox = 7; b.oy = 9;
  for (let y = 0; y < 10; y++) for (let x = 0; x < 14; x++) {
    const nx = (x - 7) / (r * 1.25), ny = (y - (9 - r * 0.7)) / (r * 0.8);
    if (nx * nx + ny * ny > 1 + 0.4 * (vnoise(x / 2, y / 2, seed) - 0.5) || y > 9) continue;
    const v = 0.6 - nx * 0.3 - ny * 0.4 + (hash(x, y, seed) - 0.5) * 0.4;
    b.set(x, y, kind === 'huck' ? (hash(x, y, seed + 2) < 0.3 ? R.red[v > 0.55 ? 1 : 0] : R.moss[clamp(Math.round(1 + v * 3), 1, 4)]) : kind === 'heather' ? (hash(x, y, seed + 1) < 0.4 ? R.pink[v > 0.5 ? 2 : 1] : R.moss[v > 0.5 ? 4 : 3]) : R.moss[clamp(Math.round(2 + v * 3), 2, 5)]);
  }
  outline(b, R.moss[1]);
  return b;
}
// Red huckleberry in autumn (round 5, T65): a low shrub. A heap of leaves in its own shade, stems fanning
// out of it with leaves in pairs up to their tips, crimson below and orange where the light catches them (it
// comes from the upper left), and a dark line under it where it meets the ground. size scales it: nearer
// the viewer it is bigger.
function makeHuckleberry(seed, size = 1) {
  const rand = rng(seed), w = Math.round((9 + rand() * 6) * size), h = Math.round((5 + rand() * 3) * size), b = new BM(w + 8, h + 5); b.ox = (w + 8) >> 1; b.oy = h + 3;
  const cx = b.ox, by = b.oy;
  const tone = (x, y, o) => { const lit = (cx - x) / w + (by - y) / h + 0.25 * (o - 0.5); return lit > 0.78 ? (o < 0.6 ? R.blaze[1] : R.red[1]) : lit > 0.36 ? (o < 0.2 ? R.blaze[1] : R.red[1]) : R.red[0]; };
  for (let y = by - 1; y > by - h * 0.6; y--) { const half = (w / 2) * Math.sqrt(Math.max(0, 1 - sq((by - y) / (h * 0.6)))); for (let x = Math.ceil(cx - half); x <= cx + half; x++) if (rand() < (y === by - 1 ? 0.6 : 0.9)) b.set(x, y, tone(x, y, rand() * 0.6)); }
  const n = 4 + Math.round(w / 4);
  for (let k = 0; k < n; k++) {
    const a = ((k + 0.5) / n - 0.5) * 2.2 + (rand() - 0.5) * 0.3, L = h * (0.8 + 0.3 * rand()) * (1 - 0.25 * Math.abs(a)), x0 = cx + (k / (n - 1) - 0.5) * w * 0.4;
    for (let s = 0; s <= L; s++) {
      const x = x0 + Math.sin(a) * s, y = by - 1 - Math.cos(a) * s, o = rand();
      if (s < L * 0.35) { if (!b.get(x, y)) b.set(x, y, R.bark[1]); continue; }
      b.set(x, y, tone(x, y, o)); if (s % 2 < 1) b.set(x + (k & 1 ? 1 : -1), y, tone(x, y, o));
    }
    b.set(x0 + Math.sin(a) * L, by - 1 - Math.cos(a) * L, a < 0.4 ? R.red[2] : R.blaze[1]);
  }
  for (let x = 0; x < b.w; x++) for (let y = by; y >= by - 2; y--) if (b.get(x, y)) { b.set(x, y + 1, INK); break; }
  return b;
}
// Where huckleberry grows, in clumps: each cell of a coarse grid may hold one clump, at a spot of its own
// inside it, if `grows` is high there. A clump is a big shrub with two to four smaller ones close round it.
// `ok` says whether a shrub may stand at a spot. Returns the shrubs as { x, y, v: which drawing, s: 0 small
// to 2 big, flip }, sorted so the upper ones come first. Nothing here throws a scene's own dice.
function huckClumps(x0, x1, y0, y1, grows, ok, seed) {
  const out = [];
  for (let gx = x0; gx < x1; gx += 46) for (let gy = y0; gy < y1; gy += 22) {
    const cx = gx + Math.floor(hash(gx, gy, seed) * 46), cy = gy + Math.floor(hash(gx, gy, seed + 1) * 22);
    if (grows(cx, cy) < 0.55) continue;
    for (let k = 0, n = 3 + Math.floor(hash(gx, gy, seed + 2) * 3); k < n; k++) {
      const x = cx + (k ? Math.round((hash(gx + k, gy, seed + 3) - 0.5) * 34) : 0), y = cy + (k ? Math.round((hash(gx + k, gy, seed + 4) - 0.5) * 12) : 0);
      if (ok(x, y)) out.push({ x, y, v: Math.floor(hash(gx + k, gy, seed + 5) * 6), s: k ? (hash(gx + k, gy, seed + 6) < 0.5 ? 0 : 1) : 2, flip: hash(gx + k, gy, seed + 7) < 0.5 });
    }
  }
  return out.sort((p, q) => p.y - q.y);
}
// A summit flag on a pole, in two frames so it can flutter.
// The trail register (L1), after TJ's photographs: a small wooden box on a post, its lid sloping over a
// pale plaque, its front a flap that folds down into a desk (the dark line is the hinge), rocks piled round
// the foot of the post. Three pennants on the post, one for each destination (the lake blue, the peak
// yellow, the Spires red), pale until that destination is done. mask: bit 0 the lake, 1 the peak, 2 the Spires.
function makeRegister(mask, open = false) {
  const b = new BM(15, 24); b.ox = 6; b.oy = 23;
  // The lid, lit on the west, overhanging the front and the side.
  for (let x = 3; x <= 11; x++) b.set(x, 1, x < 6 ? R.wood[4] : R.wood[3]);
  for (let x = 2; x <= 12; x++) b.set(x, 2, x < 5 ? R.wood[4] : R.wood[3]);
  for (let x = 1; x <= 13; x++) b.set(x, 3, R.wood[1]);
  // The front (x 2 to 9) and its side in shade (x 10 to 12).
  // Planks with a dark seam between them (art pass D05) and a band of shade under the lid.
  for (let y = 4; y <= 12; y++) for (let x = 2; x <= 12; x++) b.set(x, y, x > 9 ? (y === 12 || y === 4 ? R.wood[0] : R.wood[1]) : y === 12 || y === 4 ? R.wood[1] : x === 2 ? R.wood[3] : x === 6 ? R.wood[1] : R.wood[2]);
  // The plaque, lettered, and the hinge where the front folds down into a desk.
  for (let x = 3; x <= 8; x++) { b.set(x, 5, R.white[1]); b.set(x, 6, x % 2 ? R.wood[1] : R.white[0]); b.set(x, 7, R.white[0]); }
  for (let x = 2; x <= 9; x++) b.set(x, 10, R.wood[0]);
  b.set(9, 9, R.rock[3]);
  // Open (L2): the front is down as a desk standing out toward you, the book showing inside.
  if (open) {
    for (let y = 4; y <= 10; y++) for (let x = 2; x <= 9; x++) b.set(x, y, y >= 8 ? (x === 5 ? R.gold[4] : R.white[1]) : y === 7 ? R.white[0] : R.wood[0]);
    for (let y = 11; y <= 13; y++) for (let x = 1; x <= 10; x++) b.set(x, y, y === 13 ? R.wood[2] : R.wood[4]);
    b.set(1, 7, R.rock[3]); b.set(10, 7, R.rock[3]);
  }
  // The post and the rocks piled round its foot.
  for (let y = 13; y <= 22; y++) { b.set(5, y, R.wood[3]); b.set(6, y, y % 4 === 1 ? R.wood[0] : R.wood[1]); }
  for (const [x, y, c] of [[2, 22, 2], [3, 21, 3], [3, 22, 1], [4, 22, 2], [7, 22, 2], [8, 22, 1], [8, 21, 3]]) b.set(x, y, R.rock[c]);
  outline(b, INK);
  // The pennants, after the outline so they stand clear of the post.
  [[R.water[3], R.water[1]], [R.yellow[1], R.yellow[0]], [R.red[1], R.red[0]]].forEach(([lit, dark], k) => {
    const on = mask >> k & 1, y = 13 + 3 * k, L = on ? lit : R.white[1], D = on ? dark : R.white[0];
    for (let x = 8; x <= 10; x++) b.set(x, y, L); b.set(11, y, D); b.set(8, y + 1, D); b.set(9, y + 1, D);
  });
  return b;
}
function makeFlag(f, ramp = R.red) {
  const b = new BM(12, 16); b.ox = 2; b.oy = 15;
  for (let y = 1; y < 16; y++) b.set(2, y, R.shoe[1]);
  for (let x = 0; x < 7; x++) { const dy = f ? (x > 3 ? 1 : 0) : (x > 1 && x < 5 ? 1 : 0); for (let y = 0; y < 4 - (x > 4 ? 1 : 0); y++) b.set(3 + x, 1 + y + dy, ramp[y === 0 ? 2 : y === 3 ? 0 : 1]); }
  outline(b, INK);
  return b;
}

export { makeRegister, makeMoose };
export { makeDriftwood, makeSnag, makeBush, makeHuckleberry, huckClumps, makeLodgepole, makeJuniper, makeWhitebark, makeShrub, makeFlag, clump, makeMaple, makeTwisted, makeOwl, makeFlowers, makeFireweed, makeSkunkCabbage, swaying, makeAspen, makePonderosa, makeConifer, makeSpruce, makeFir, makeFern, makeBoulder, makeLog, makeCloud, makeSignpost, makeSmallSign, makeKiosk, makeLookout, makeTent, makeJournal, makeElk, makeSlug, makeBird, makeCat };
