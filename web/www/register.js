// The trail register up close (L2), after TJ's photographs: looking into the box on its post at the
// Trailhead with its front folded down on two chains into a desk. The book lies open on the floor of the
// box, held by a clip; a map of the trails hangs behind glass on the back wall; the pencil lies on the
// desk on its string. The scene opens on the box shut and the front swinging down. The words on the
// pages are the page's own (app.js lays them over the rectangles pages() reports).
import { clamp, smooth, hash, fbm, bayer, R, INK } from './core.js';

const SWING = 0.75;   // seconds the front takes to fold down
const DUR = 1.2;

// Where everything goes, for a screen this size. pitch: the ruled lines' spacing, about 24 page pixels
// whatever the screen, so the handwriting laid over them later reads the same on a phone.
function layout(VW, VH, S) {
  const n = VW < VH, rim = n ? 4 : 6, deep = n ? 8 : 18;
  const yH = Math.round(VH - VH * (n ? 0.1 : 0.15));
  const back = { x0: rim + deep, x1: VW - 1 - rim - deep, y0: rim + deep, y1: Math.round(VH * (n ? 0.14 : 0.18)) };
  const bx0 = n ? 7 : Math.round(VW * 0.09), bx1 = VW - 1 - bx0, by0 = back.y1 + (n ? 8 : 7), by1 = yH - 5, mid = (bx0 + bx1) >> 1, cv = 3;
  const left = { x: bx0 + cv, y: by0 + cv, w: mid - 3 - bx0 - cv, h: by1 - by0 - 2 * cv - 2 };
  const right = { x: mid + 3, y: left.y, w: bx1 - cv - mid - 3, h: left.h };
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  const pitch = Math.max(7, Math.round(24 * dpr / S));
  return { n, rim, deep, yH, back, bx0, bx1, by0, by1, mid, left, right, pitch, VW, VH };
}

// The box's inside: rim, ceiling, side walls, back wall, floor. Everything here is still, so it is
// painted once per screen size and copied each frame.
function paintBox(fb, L) {
  const { VW, VH, rim, yH, back } = L;
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
    let c;
    if (y >= yH) c = R.wood[2];   // the box's lower front, hidden once the desk is down
    else if (x < rim || x > VW - 1 - rim || y < rim) c = x < rim || y < rim && x < VW / 2 ? R.wood[4] : R.wood[3];
    else {
      const t = clamp((y - back.y1) / (yH - back.y1), 0, 1);
      const el = y < back.y0 ? Math.min(y, back.x0) : y <= back.y1 ? back.x0 : Math.round(back.x0 + (rim - back.x0) * t);
      const er = y < back.y0 ? Math.max(VW - 1 - y, back.x1) : y <= back.y1 ? back.x1 : Math.round(back.x1 + (VW - 1 - rim - back.x1) * t);
      if (y < back.y0 && x > y && x < VW - 1 - y) c = R.wood[0];   // the underside of the lid
      else if (x < el) c = R.wood[1];
      else if (x > er) c = R.wood[0];
      else if (y <= back.y1) { const k = (x - back.x0) % 13; c = k === 0 ? R.wood[0] : k === 1 || hash(x, (y / 16) | 0, 881) > 0.95 ? R.wood[2] : R.wood[1]; }
      else c = R.wood[2];
    }
    fb[y * VW + x] = c;
  }
  // The rim's inner edge and the hinge.
  for (let x = rim; x < VW - rim; x++) fb[rim * VW + x] = INK;
  for (let y = rim; y < yH; y++) { fb[y * VW + rim] = INK; fb[y * VW + VW - 1 - rim] = INK; }
}

// The box drawn after a generated picture of it (round 6, note 9; its prompt and seed in design/art/register/log.jsonl): boards of uneven width
// with their own grain, which bends round each knot, and nail heads on the back wall; planks on the lid; the
// floor's planks. Light from the upper left, so a groove's right side catches it (lightBox shades the rest).
function paintBoxCode(fb, L) {
  paintBox(fb, L);
  const { VW, rim, yH, back } = L, W = R.wood, set = (x, y, c) => { fb[y * VW + x] = c; }, bh = back.y1 - back.y0;
  for (let bx = back.x0; bx < back.x1;) {
    const bw = 11 + ((hash(bx, 0, 891) * 6) | 0), pale = hash(bx, 1, 891) > 0.8;
    // A knot in about one board in seven, where the wall is tall enough to hold one, off the board's middle.
    const knot = bh >= 12 && bw >= 12 && hash(bx, 3, 897) > 0.86, kx = bx + 4 + ((hash(bx, 5, 897) * (bw - 8)) | 0), ky = back.y0 + 5 + ((hash(bx, 4, 897) * (bh - 10)) | 0);
    for (let x = bx; x < Math.min(back.x1 + 1, bx + bw); x++) for (let y = back.y0; y <= back.y1; y++) {
      let c = x === bx ? W[0] : x === bx + 1 ? W[2] : pale ? W[2] : W[1];
      if (x > bx + 1) {
        // The grain is read from a little to the side near a knot, so its streaks part round it.
        let gx = x;
        if (knot) { const dx = x - kx, dy = y - ky, push = Math.max(0, 1 - Math.abs(dx) / 7); gx = x - (dx < 0 ? 1 : -1) * Math.round(4 * Math.exp(-(dy * dy) / 30) * push); }
        const r = hash(gx, ((y + ((hash(gx, 2, 893) * 9) | 0)) / 5) | 0, 895);
        if (r > 0.9) c = pale ? W[1] : W[2]; else if (r < 0.06) c = W[0];
      }
      set(x, y, c);
    }
    if (knot) for (let dy = -5; dy <= 5; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.hypot(dx / 2.2, dy / 3.2), x = kx + dx, y = ky + dy;
      if (y < back.y0 || y > back.y1 || x <= bx + 1 || x >= bx + bw) continue;
      if (d < 0.35) set(x, y, W[0]);
      else if (d < 0.75) set(x, y, dx < 0 && dy < 0 ? W[3] : W[2]);
      else if (d < 1.05) set(x, y, W[0]);
      else if (d > 1.45 && d < 1.75 && Math.abs(dy) > Math.abs(dx) && hash(x, y, 898) > 0.3) set(x, y, W[0]);
    }
    if (bx + 4 < back.x1) for (const ny of [back.y0 + 4, back.y1 - 2]) { set(bx + 3, ny, W[3]); set(bx + 4, ny + 1, W[0]); }
    bx += bw;
  }
  // The lid: planks running back, their edges catching the light.
  for (let k = 1; k < 6; k++) {
    const x0 = VW * k / 6, x1 = back.x0 + (back.x1 - back.x0) * k / 6;
    for (let y = rim + 1; y < back.y0; y++) { const x = Math.round(x0 + (x1 - x0) * (y - rim) / (back.y0 - rim)); if (x > y && x < VW - 1 - y) set(x, y, W[1]); }
  }
  // The floor's planks, closer together toward the back, each front edge lit.
  for (let k = 1; k < 7; k++) {
    const y = Math.round(back.y1 + (yH - back.y1) * (k / 7) ** 1.5), t = (y - back.y1) / (yH - back.y1);
    const el = Math.round(back.x0 + (rim - back.x0) * t), er = Math.round(back.x1 + (VW - 1 - rim - back.x1) * t);
    for (let x = el; x <= er; x++) { set(x, y, W[1]); if (y + 1 < yH) set(x, y + 1, W[3]); }
  }
  // Grain on the lit rim.
  for (let y = 0; y < yH; y++) for (let x = 1; x < rim; x++) if (hash(x, (y / 6) | 0, 899) > 0.82) set(x, y, W[3]);
}

// A wood colour a step or two lighter (k > 0) or darker; anything that is not wood is left alone.
const woodStep = (c, k) => { const s = R.wood.indexOf(c); return s < 0 ? c : R.wood[clamp(s + k, 0, 4)]; };
// The light inside the box, from the upper left, dithered between the wood's steps: the right-hand wall, which
// faces the light, lit and the left-hand one in shade; a shadow under the lid along the top of the back wall,
// which darkens toward the right; the floor darker toward the back. Then the side walls' seams.
function lightBox(fb, L) {
  const { VW, rim, yH, back } = L, bw = back.x1 - back.x0;
  for (let y = rim + 1; y < yH; y++) for (let x = rim + 1; x < VW - 1 - rim; x++) {
    const t = clamp((y - back.y1) / (yH - back.y1), 0, 1);
    const el = y < back.y0 ? Math.min(y, back.x0) : y <= back.y1 ? back.x0 : Math.round(back.x0 + (rim - back.x0) * t);
    const er = y < back.y0 ? Math.max(VW - 1 - y, back.x1) : y <= back.y1 ? back.x1 : Math.round(back.x1 + (VW - 1 - rim - back.x1) * t);
    let l;
    if (y < back.y0 && x > y && x < VW - 1 - y) continue;   // the lid's underside is already the darkest wood
    else if (x < el) l = -0.55 - 0.35 * (x - rim) / Math.max(1, back.x0 - rim);
    else if (x > er) l = 1.25 - 0.6 * (VW - 1 - rim - x) / Math.max(1, VW - 1 - rim - back.x1);
    else if (y <= back.y1) { const d = y - back.y0; l = 0.45 - 0.9 * (x - back.x0) / bw - (d < 5 ? (5 - d) / 3 : 0); }
    else l = -0.6 + 0.9 * t;
    // Flat bands of light, dithered only where one band meets the next: dither across a whole wall reads as speckle.
    const lo = Math.floor(l), k = lo + (clamp((l - lo - 0.5) / 0.24 + 0.5, 0, 1) > bayer(x, y) ? 1 : 0);
    if (k) fb[y * VW + x] = woodStep(fb[y * VW + x], k);
  }
  const W = R.wood, set = (x, y, c) => { fb[y * VW + x] = c; };
  for (const side of [-1, 1]) for (const u of [1 / 3, 2 / 3]) {
    const xi = side < 0 ? Math.round(rim + u * (back.x0 - rim)) : Math.round(VW - 1 - rim - u * (VW - 1 - rim - back.x1));
    const top = Math.round(rim + u * (back.y0 - rim)) + 1, bot = Math.round(yH + u * (back.y1 - yH)) - 1;
    for (let y = top; y <= bot; y++) { set(xi, y, W[0]); if (side < 0) set(xi + 1, y, W[2]); }
  }
}

// Where the trail conditions notice is pinned (round 6, note 23): on the back wall right of the map, as tall
// as the wall allows. The page lays the notice itself over this box, and it opens the whole board.
function boardAt(L) {
  const { back, n } = L, x = back.x0 + (n ? 10 : 22) + (n ? 70 : 54) + (n ? 8 : 14), y = back.y0 + 3;
  return { x, y, w: Math.max(0, Math.min(back.x1 - (n ? 8 : 22) - x, n ? 120 : 140)), h: Math.max(0, back.y1 - back.y0 - 6) };
}
// The map behind glass on the back wall, in a metal frame with a screw in each corner, hung from a nail by a
// wire: the forest, the lake, the peak, the three trails from the Trailhead with a dot where you are, a legend
// box, and the glass catching the light. Its frame shades the wall below and to the right of it.
function paintMap(fb, L) {
  const { VW, back, n } = L, w = n ? 70 : 54, h = Math.min(back.y1 - back.y0 - 6, n ? 46 : 22), x0 = back.x0 + (n ? 10 : 22), y0 = back.y0 + 3;
  if (h < 10) return;
  const set = (x, y, c) => { fb[y * VW + x] = c; };
  for (let y = y0 + 1; y <= y0 + h + 2; y++) set(x0 + w + 2, y, woodStep(fb[y * VW + x0 + w + 2], -1));
  for (let x = x0; x <= x0 + w + 2; x++) set(x, y0 + h + 2, woodStep(fb[(y0 + h + 2) * VW + x], -1));
  for (let y = y0 - 2; y <= y0 + h + 1; y++) for (let x = x0 - 2; x <= x0 + w + 1; x++) {
    const ring = Math.max(x0 - 1 - x, x - x0 - w, y0 - 1 - y, y - y0 - h);
    let c;
    if (ring >= 2) c = INK;
    else if (ring === 1) c = x === x0 - 2 || y === y0 - 2 ? INK : y === y0 + h + 1 || x === x0 + w + 1 ? INK : R.rock[x < x0 + w / 2 && y < y0 + h / 2 ? 3 : 2];
    else if (ring === 0) c = R.rock[1];
    else {
      const u = (x - x0) / w, v = (y - y0) / h;
      c = bayer(x, y) < 0.25 ? R.gold[5] : R.gold[6];
      if (fbm(x / 7, y / 5, 884, 2) > 0.56 && v > 0.3) c = bayer(x, y) < 0.5 ? R.grass[3] : R.grass[4];
      if (Math.hypot((u - 0.28) * 2.2, v - 0.42) < 0.2) c = Math.hypot((u - 0.28) * 2.2, v - 0.42) > 0.16 ? R.water[4] : R.water[3];
      if (v > 0.12 && v < 0.5 && Math.abs(u - 0.62) < (v - 0.12) * 0.5) c = v < 0.2 ? R.white[1] : u < 0.62 ? R.rock[3] : R.rock[2];
      if (v > 0.15 && u > 0.8 && hash(x, y, 883) > 0.55) c = R.rock[3];
      if (u < 0.3 && v > 0.68) c = y === Math.round(y0 + h * 0.68) || x === Math.round(x0 + w * 0.3) ? R.rock[2] : (y - y0) % 3 === 0 && u > 0.04 && u < 0.26 && v > 0.74 ? R.rock[2] : R.white[1];
    }
    set(x, y, c);
  }
  for (const [sx, sy] of [[x0 - 1, y0 - 1], [x0 + w, y0 - 1], [x0 - 1, y0 + h], [x0 + w, y0 + h]]) set(sx, sy, R.rock[4]);
  // The wire from the frame's top corners to a nail above its middle.
  const nx = x0 + (w >> 1), ny = Math.max(back.y0 + 1, y0 - 4);
  for (let k = 0; k <= 1; k += 1 / 40) { set(Math.round(x0 + 2 + (nx - x0 - 2) * k), Math.round(y0 - 2 + (ny - y0 + 2) * k), R.rock[3]); set(Math.round(x0 + w - 3 + (nx - x0 - w + 3) * k), Math.round(y0 - 2 + (ny - y0 + 2) * k), R.rock[3]); }
  set(nx, ny, INK); set(nx - 1, ny - 1, R.rock[4]);
  // Trails, dotted from the Trailhead at the bottom: to the lake, to the peak, to the Spires, and you are here.
  const T = [x0 + w * 0.5, y0 + h - 2];
  for (const [ex, ey, col] of [[x0 + w * 0.36, y0 + h * 0.48, R.red[1]], [x0 + w * 0.62, y0 + h * 0.52, R.yellow[0]], [x0 + w * 0.86, y0 + h * 0.2, R.pink[1]]])
    for (let s = 0; s <= 1; s += 1 / 40) if (((s * 40) | 0) % 2 === 0) { const x = Math.round(T[0] + (ex - T[0]) * s), y = Math.round(T[1] + (ey - T[1]) * s + Math.sin(s * 6) * 1.5); set(x, y, col); }
  const [tx, ty] = [Math.round(T[0]), Math.round(T[1])];
  for (const [dx, dy] of [[0, 0], [1, 0], [0, -1], [1, -1]]) set(tx + dx, ty + dy, R.red[1]);
  // The glass catches the light: two streaks from the lower left.
  for (const [o, len] of [[3, 0.6], [8, 0.3]]) for (let k = 0; k < Math.min(w, h) * len; k++) { const x = x0 + o + k, y = y0 + h - 3 - k; if (y > y0 && x < x0 + w) set(x, y, R.white[1]); }
}

// A tin of pencils on the right of the back wall: the tin lit down its left side, ribbed, five pencils of
// different colours standing at different heights, sharpened, two of them leaning.
function paintTin(fb, L) {
  const { VW, back, n } = L, tw = n ? 10 : 12, th = n ? 9 : 11, tx = VW - 1 - back.x0 - (n ? 22 : 34), ty = back.y1 - 1;
  const set = (x, y, c) => { if (y >= back.y0) fb[y * VW + x] = c; };
  const P = [[R.yellow[1], R.yellow[0], 9, 0], [R.red[1], R.red[0], 7, 1], [R.grass[3], R.grass[2], 10, 0], [R.water[3], R.water[2], 6, -1], [R.wood[3], R.wood[2], 8, 0]];
  P.forEach(([lit, dark, up, lean], k) => {
    const x = tx + 1 + k * 2, top = ty - th - up;
    for (let y = top; y < ty - th + 2; y++) {
      const sx = x + (y < top + up / 2 ? lean : 0);
      if (y === top) set(sx, y, INK);
      else if (y < top + 3) { set(sx, y, R.wood[4]); set(sx + 1, y, y === top + 1 ? R.wood[4] : R.wood[3]); }
      else { set(sx, y, lit); set(sx + 1, y, dark); }
    }
  });
  for (let y = ty - th; y <= ty; y++) for (let x = tx; x < tx + tw; x++) {
    const c = x === tx || x === tx + tw - 1 || y === ty ? INK : y === ty - th ? R.rock[4] : y === ty - th + 1 ? INK
      : x === tx + 1 ? R.rock[4] : x >= tx + tw - 3 ? R.rock[x === tx + tw - 2 ? 1 : 2] : (y - ty + th) % 4 === 0 ? R.rock[2] : R.rock[3];
    set(x, y, c);
  }
  for (let x = tx + tw; x < tx + tw + 2; x++) for (let y = ty - th + 2; y <= ty; y++) set(x, y, woodStep(fb[y * VW + x], -1));
}

// The book: cloth cover, two pages with the block of pages showing in layers at their edges, the gutter's
// shadow, the pages dipping into the spine at the top and curling up a little at their outer edges, printed
// rules, and the clip at the top.
function paintBook(fb, L) {
  const { VW, bx0, bx1, by0, by1, mid, left, right, pitch } = L;
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) fb[y * VW + x] = x === bx0 || x === bx1 || y === by0 || y === by1 ? INK : y < by0 + 2 || x < bx0 + 2 ? R.navy[2] : R.navy[1];
  for (const pg of [left, right]) {
    const outer = pg === left ? -1 : 1;
    for (let y = pg.y; y < pg.y + pg.h + 2; y++) for (let x = pg.x - 1; x <= pg.x + pg.w; x++) {
      const gut = pg === left ? pg.x + pg.w - x : x - pg.x, under = y >= pg.y + pg.h, side = outer < 0 ? x === pg.x - 1 : x === pg.x + pg.w;
      let c = hash(x, y, 885) > 0.99 ? R.gold[5] : R.gold[6];
      if (gut < 3) c = gut < 1 ? R.gold[3] : R.gold[4];
      else if (gut < 9) c = bayer(x, y) < (9 - gut) / 7 ? R.gold[5] : R.gold[6];
      else if (gut > pg.w - 4) c = bayer(x, y) < (gut - pg.w + 4) / 6 ? R.gold[5] : c;
      if (under || side) c = under ? ((y - pg.y - pg.h + (x >> 2)) % 2 ? R.gold[4] : R.gold[5]) : (x + (y >> 2)) % 2 ? R.gold[5] : R.gold[4];
      if (!under && gut < 12 && y - pg.y < Math.round(3 * (1 - gut / 12) ** 2)) c = R.navy[1];
      fb[y * VW + x] = c;
    }
    // Printed rules: a heading band, then one rule every pitch, a red margin on the outer side.
    const top = pg.y + Math.round(pitch * 1.6);
    for (let y = top; y < pg.y + pg.h - 4; y += pitch) for (let x = pg.x + 4; x < pg.x + pg.w - 6; x++) fb[y * VW + x] = R.water[4];
    for (let x = pg.x + 4; x < pg.x + pg.w - 6; x++) fb[(top - 2) * VW + x] = R.red[2];
    const mx = pg === left ? pg.x + 10 : pg.x + Math.round(pg.w * 0.24);
    for (let y = pg.y + 3; y < pg.y + pg.h - 3; y++) fb[y * VW + mx] = pg === left ? R.red[2] : R.water[4];
  }
  for (let y = by0 + 1; y < by1; y++) fb[y * VW + mid] = INK;
  // The clip at the top of the gutter, its wire handle standing up.
  const cw = L.n ? 10 : 12;
  for (let y = by0 - 3; y <= by0 + 4; y++) for (let x = mid - cw; x <= mid + cw; x++) fb[y * VW + x] = y === by0 - 3 || y === by0 + 4 || x === mid - cw || x === mid + cw ? INK : y < by0 ? R.rock[4] : R.rock[3];
  for (let y = by0 - 9; y < by0 - 3; y++) { fb[y * VW + mid - cw + 3 + ((by0 - 3 - y) >> 1)] = R.rock[2]; fb[y * VW + mid + cw - 3 - ((by0 - 3 - y) >> 1)] = R.rock[2]; }
  for (let x = mid - cw + 6; x <= mid + cw - 6; x++) fb[(by0 - 9) * VW + x] = R.rock[2];
  for (let y = by0 + 3; y <= by1 + 3; y++) for (let x = bx1 + 1; x <= bx1 + 3; x++) fb[y * VW + x] = woodStep(fb[y * VW + x], x === bx1 + 1 ? -2 : -1);
  for (let y = by1 + 1; y <= by1 + 3; y++) for (let x = bx0 + 3; x <= bx1; x++) fb[y * VW + x] = woodStep(fb[y * VW + x], y === by1 + 1 ? -2 : -1);
  // The ribbon marker hanging out of the foot of the spine.
  for (let y = by1 - 2; y <= by1 + 3; y++) for (let x = mid - 1; x <= mid + 2; x++) fb[y * VW + x] = y === by1 + 3 && (x === mid || x === mid + 1) ? R.wood[2] : x === mid + 2 ? R.red[0] : R.red[1];
}

// Streaks of grain along the desk's planks, a few pixels long, darker and lighter.
const deskGrain = (x, y) => { const r = hash(((x + hash(0, y, 1203) * 9) / 6) | 0, y, 1201); return r > 0.9 ? R.wood[2] : r < 0.05 ? R.wood[4] : R.wood[3]; };
// The front of the box swinging down on its hinge. a: 0 shut, 1 down as a desk. Shut it shows its
// outside (the plaque); past halfway its inside, lit by the sky. The chains take its weight at the end.
function paintFront(fb, L, a, bounce) {
  const { VW, VH, yH } = L, th = a * Math.PI, up = yH - L.rim, down = VH - yH;
  const yE = Math.round(th < Math.PI / 2 ? yH - up * Math.cos(th) : yH - down * Math.cos(th) + bounce);
  if (th < Math.PI / 2) {
    const h = yH - yE; if (h <= 0) return;
    for (let y = yE; y < yH; y++) for (let x = 0; x < VW; x++) {
      const v = (y - yE) / h, pl = Math.abs(x - VW / 2) < VW * 0.2 && v > 0.2 && v < 0.42;
      fb[y * VW + x] = y === yE ? INK : pl ? (v < 0.31 ? R.white[1] : R.white[0]) : x < 4 ? R.wood[3] : (y - yE) % 11 === 0 ? R.wood[1] : R.wood[2];
    }
  } else {
    for (let y = yH; y < Math.min(VH, yE + 1); y++) for (let x = 0; x < VW; x++)
      fb[y * VW + x] = y >= yE - 1 ? (y === yE ? INK : R.wood[2]) : (y - yH) % 10 === 3 ? R.wood[2] : y - yH < 3 ? R.wood[4] : deskGrain(x, y);
    // The chains, from high on the box's sides to the desk's outer corners.
    if (a > 0.85) for (const s of [1, -1]) {
      const x0 = s > 0 ? L.rim + 3 : VW - 1 - L.rim - 3, y0 = yH - Math.round((yH - L.back.y1) * 0.55), x1 = s > 0 ? 2 : VW - 3, y1 = Math.min(VH - 2, yE - 2);
      for (let k = 0; k <= 1; k += 1 / 60) { const x = Math.round(x0 + (x1 - x0) * k), y = Math.round(y0 + (y1 - y0) * k); if (y >= 0 && y < VH && x >= 0 && x < VW) fb[y * VW + x] = ((k * 60) | 0) % 3 ? R.rock[3] : R.rock[1]; }
    }
  }
  for (let x = 0; x < VW; x++) fb[yH * VW + x] = x % 40 < 6 ? R.rock[3] : INK;
}

// The pencil on its string, tied to a screw eye low on the box's left side. It lies on the desk, point to
// the right, until the visitor may sign; then it lies on the left-hand page, ready to write with (L4).
function paintPencil(fb, L, onPage) {
  const { VW, VH, yH, bx0, rim, left } = L, len = L.n ? 36 : 46;
  const [x0, y0, ang] = onPage ? [left.x + Math.round(left.w * 0.72), left.y + Math.round(left.h * 0.66), Math.PI - 0.5] : [bx0 + (L.n ? 56 : 84), Math.min(VH - 6, yH + Math.round((VH - yH) * 0.55)), Math.PI + 0.3];
  const dx = Math.cos(ang), dy = Math.sin(ang);
  for (let s = 0; s < len; s++) {
    const x = Math.round(x0 + dx * s), y = Math.round(y0 + dy * s);
    const c = s < 2 ? INK : s < 6 ? R.wood[4] : s < len - 6 ? R.yellow[1] : s < len - 3 ? R.rock[3] : R.pink[1];
    fb[y * VW + x] = c; fb[(y + 1) * VW + x] = s < 2 ? INK : s < 6 ? R.wood[3] : s < len - 6 ? R.yellow[0] : s < len - 3 ? R.rock[2] : R.pink[0];
    fb[(y + 2) * VW + x] = INK;
  }
  const ex = Math.round(x0 + dx * len), ey = Math.round(y0 + dy * len), sx = rim + 4, sy = yH - 3;
  fb[(sy - 1) * VW + sx] = R.rock[3]; fb[sy * VW + sx - 1] = R.rock[3]; fb[sy * VW + sx + 1] = R.rock[3]; fb[(sy + 1) * VW + sx] = R.rock[3];
  for (let k = 0; k <= 1; k += 1 / 120) { const x = Math.round(ex + (sx - ex) * k), y = Math.round(ey + (sy - ey) * k + Math.sin(k * Math.PI) * 4); if (y >= 0 && y < VH) fb[y * VW + x] = R.white[0]; }
}

export function makeRegisterScene() {
  let pic = null, L = null, key = '';
  const focus = { x: 0, y: 0 };
  const build = scr => {
    const k = scr.VW + 'x' + scr.VH + 'x' + scr.S; if (k === key) return; key = k;
    L = layout(scr.VW, scr.VH, scr.S); pic = new Uint8Array(scr.VW * scr.VH);
    paintBoxCode(pic, L); lightBox(pic, L); paintMap(pic, L); paintTin(pic, L); paintBook(pic, L);
  };
  return {
    name: 'register',
    dur: () => DUR,
    stops: () => [],
    elev: () => 0,
    cues: () => [{ at: 0.02, name: 'creak' }, { at: SWING / DUR, name: 'catch' }],
    enter(scr) { build(scr); },
    focus: () => focus,
    // The pages, in screen pixels of this scene, for the words laid over them.
    pages: () => L && { left: L.left, right: L.right, pitch: L.pitch, top: Math.round(L.pitch * 1.6), board: boardAt(L) },
    draw(scr, env, arg, q) {
      build(scr);
      scr.fb.set(pic);
      const s = q * DUR, a = smooth(0, 1, clamp(s / SWING, 0, 1)), bounce = s > SWING && s < SWING + 0.25 ? Math.round(2 * Math.sin((s - SWING) / 0.25 * Math.PI)) : 0;
      paintFront(scr.fb, L, a, bounce);
      if (a >= 1) paintPencil(scr.fb, L, env.done && env.done.lake && env.done.stack && env.done.spires);
      focus.x = scr.VW >> 1; focus.y = scr.VH >> 1;
    }
  };
}
