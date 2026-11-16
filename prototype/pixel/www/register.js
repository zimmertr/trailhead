// The trail register up close (L2), after TJ's photographs: looking into the box on its post at the
// Trailhead with its front folded down on two chains into a desk. The book lies open on the floor of the
// box, held by a clip; a map of the trails hangs behind glass on the back wall; the pencil lies on the
// desk on its string. The scene opens on the box shut and the front swinging down. The words on the
// pages are the page's own (app.js lays them over the rectangles pages() reports).
import { clamp, smooth, hash, bayer, R, INK } from './core.js';

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

// The map behind glass on the back wall: the three trails from the Trailhead, the lake, the peak.
function paintMap(fb, L) {
  const { VW, back, n } = L, w = n ? 70 : 54, h = Math.min(back.y1 - back.y0 - 6, n ? 46 : 22), x0 = back.x0 + (n ? 10 : 22), y0 = back.y0 + 3;
  if (h < 10) return;
  for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) {
    const edge = y === y0 - 1 || y === y0 + h || x === x0 - 1 || x === x0 + w;
    let c = edge ? INK : bayer(x, y) < 0.25 ? R.gold[5] : R.gold[6];
    const u = (x - x0) / w, v = (y - y0) / h;
    if (!edge && Math.hypot((u - 0.28) * 2.2, v - 0.42) < 0.2) c = R.water[3];
    if (!edge && v > 0.12 && v < 0.5 && Math.abs(u - 0.62) < (v - 0.12) * 0.5) c = v < 0.2 ? R.white[1] : R.rock[2];
    if (!edge && v > 0.15 && u > 0.8 && hash(x, y, 883) > 0.55) c = R.rock[3];
    fb[y * VW + x] = c;
  }
  // Trails, dotted from the Trailhead at the bottom: to the lake, to the peak, to the Spires.
  const T = [x0 + w * 0.5, y0 + h - 2];
  for (const [ex, ey, col] of [[x0 + w * 0.36, y0 + h * 0.48, R.red[1]], [x0 + w * 0.62, y0 + h * 0.52, R.yellow[0]], [x0 + w * 0.86, y0 + h * 0.2, R.pink[1]]])
    for (let s = 0; s <= 1; s += 1 / 40) if (((s * 40) | 0) % 2 === 0) { const x = Math.round(T[0] + (ex - T[0]) * s), y = Math.round(T[1] + (ey - T[1]) * s + Math.sin(s * 6) * 1.5); fb[y * VW + x] = col; }
  // The glass catches the light.
  for (let k = 0; k < Math.min(w, h) * 0.6; k++) { const x = x0 + 3 + k, y = y0 + h - 3 - k; if (y > y0 && x < x0 + w) fb[y * VW + x] = R.white[1]; }
  // Pencils standing in a tin on the right of the back wall.
  const tx = VW - 1 - back.x0 - (n ? 22 : 30), ty = back.y1 - 1;
  for (let k = 0; k < 3; k++) for (let y = ty - (n ? 18 : 12) + k * 2; y < ty - 6; y++) fb[y * VW + tx + 2 + k * 2] = [R.yellow[1], R.red[1], R.yellow[1]][k];
  for (let y = ty - 7; y <= ty; y++) for (let x = tx; x <= tx + 8; x++) fb[y * VW + x] = x === tx || x === tx + 8 || y === ty ? INK : x < tx + 3 ? R.rock[4] : R.rock[3];
}

// The book: cloth cover, two pages with the block of pages showing at their edges, the gutter's shadow,
// printed rules, and the clip at the top.
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
      if (under || side) c = (y + x) % 2 ? R.gold[5] : R.gold[4];
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
}

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
      fb[y * VW + x] = y >= yE - 1 ? (y === yE ? INK : R.wood[2]) : (y - yH) % 10 === 3 ? R.wood[2] : y - yH < 3 ? R.wood[4] : R.wood[3];
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
    paintBox(pic, L); paintMap(pic, L); paintBook(pic, L);
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
    pages: () => L && { left: L.left, right: L.right, pitch: L.pitch, top: Math.round(L.pitch * 1.6) },
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
