// The trail register seen from a step back (B01, the art pass): the box on its posts as the generated picture
// of it has it (its prompt and seed in design/art/register/log.jsonl), laid out as blockout layout B, which
// TJ picked on 2026-11-22. A tall back wall with the map of the world behind glass and the trail conditions
// pinned beside it, a tin of pencils at its real size, the book open on the shelf at an angle with its real
// words on the pages, and the front folded down below as a desk. register.js shows this first; a click on
// the book zooms into the page view.
import { clamp, hash, bayer, R, INK } from './core.js';
import { LAND, T } from './land.js';

// The hands and inks the book is written in, one per entry in turn (app.js lays the page view's words in
// the same ones).
export const HANDS = [['Caveat', 1.06], ['Kalam', 0.8], ['Patrick Hand', 0.92], ['Gochi Hand', 0.86]], INKS = ['#22409a', '#1c1a24', '#5f5f6a'];
// 2026-11-12 written as 11/12.
export const shortDate = d => { const m = /^\d{4}-(\d\d)-(\d\d)/.exec(d || ''); return m ? +m[1] + '/' + +m[2] : ''; };

// The picture's layout, measured on it (1024 by 640), and the phone's own tall layout (390 by 844).
const PIC = { postL: 30, postR: 995, beam: 32, back: [140, 46, 832, 385], hinge: 605, map: [240, 104, 250, 212], notice: [530, 118, 136, 106], cup: [695, 268, 110, 118, 185], book: [368, 262, 772, 598, 150, 885] };
const PHONE = { postL: 10, postR: 380, beam: 56, back: [44, 74, 346, 430], hinge: 700, map: [62, 96, 266, 170], notice: [62, 280, 140, 76], cup: [268, 316, 60, 114, 258], book: [462, 62, 328, 690, 16, 374], pencil: [90, 760] };

// Where everything goes on a screen this size. On a wide screen the picture's layout is scaled to fit,
// leaving room for the desk below; on a tall one the phone's layout is stretched to the screen.
export function kioskLayout(VW, VH) {
  const n = VW < VH;
  let X, Y, P;
  if (!n) { const s = Math.min(VW * 0.41 / 480, VH * 0.827 / 605); X = x => Math.round(VW / 2 + (x - 512.5) * s); Y = y => Math.round(y * s); P = PIC; }
  else { X = x => Math.round(x * VW / 390); Y = y => Math.round(y * VH / 844); P = PHONE; }
  const box = ([x, y, w, h]) => ({ x: X(x), y: Y(y), w: X(x + w) - X(x), h: Y(y + h) - Y(y) });
  const [ty, tx0, tx1, by, bx0, bx1] = P.book;
  return {
    n, VW, VH, pl: X(P.postL), pr: X(P.postR), bt: Y(P.beam), yH: Y(P.hinge),
    back: { x0: X(P.back[0]), y0: Y(P.back[1]), x1: X(P.back[2]), y1: Y(P.back[3]) },
    map: box(P.map), notice: box(P.notice), cup: { ...box(P.cup), top: Y(P.cup[4]) },
    book: { ty: Y(ty), tx0: X(tx0), tx1: X(tx1), by: Y(by), bx0: X(bx0), bx1: X(bx1) },
    pen: P.pencil ? [X(P.pencil[0]), Y(P.pencil[1])] : null
  };
}

const W = R.wood;
// A wood colour a step or two lighter (k > 0) or darker; anything that is not wood is left alone.
export const woodStep = (c, k) => { const s = W.indexOf(c); return s < 0 ? c : W[clamp(s + k, 0, 4)]; };
// Flat bands of light, dithered only where one band meets the next: dither across a whole wall reads as speckle.
const band = (l, x, y) => { const lo = Math.floor(l); return lo + (clamp((l - lo - 0.5) / 0.24 + 0.5, 0, 1) > bayer(x, y) ? 1 : 0); };

// The back wall's boards (round 6, note 9): uneven widths, each with its own grain, which bends round a knot
// in about one board in seven, and two nail heads.
export function boards(fb, VW, x0, x1, y0, y1) {
  const set = (x, y, c) => { fb[y * VW + x] = c; }, bh = y1 - y0;
  for (let bx = x0; bx < x1;) {
    const bw = 11 + ((hash(bx, 0, 891) * 6) | 0), pale = hash(bx, 1, 891) > 0.8;
    const knot = bh >= 12 && bw >= 12 && hash(bx, 3, 897) > 0.86, kx = bx + 4 + ((hash(bx, 5, 897) * (bw - 8)) | 0), ky = y0 + 5 + ((hash(bx, 4, 897) * (bh - 10)) | 0);
    for (let x = bx; x < Math.min(x1 + 1, bx + bw); x++) for (let y = y0; y <= y1; y++) {
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
      if (y < y0 || y > y1 || x <= bx + 1 || x >= bx + bw) continue;
      if (d < 0.35) set(x, y, W[0]);
      else if (d < 0.75) set(x, y, dx < 0 && dy < 0 ? W[3] : W[2]);
      else if (d < 1.05) set(x, y, W[0]);
      else if (d > 1.45 && d < 1.75 && Math.abs(dy) > Math.abs(dx) && hash(x, y, 898) > 0.3) set(x, y, W[0]);
    }
    if (bx + 4 < x1) for (const ny of [y0 + 4, y1 - 2]) { set(bx + 3, ny, W[3]); set(bx + 4, ny + 1, W[0]); }
    bx += bw;
  }
}

// The world as the zoomed-out map shows it, shrunk to w by h: each pixel takes the ground's commonest
// colour under it (the ground holds the mountains, the lake, the coast and the trails), then the trees are
// dotted on in their own colours. Kept, since the world does not change.
const thumbs = new Map(), treeCol = new Map();
function worldThumb(w, h) {
  const key = w + 'x' + h; if (thumbs.has(key)) return thumbs.get(key);
  const NW = 1920, NH = 1080, top = 150, ch = NH - top, cw = Math.min(NW, Math.round(ch * w / h)), cx0 = clamp(Math.round(T.x - cw / 2), 0, NW - cw), f = cw / w, fy = ch / h;
  const out = new Uint8Array(w * h), cnt = new Uint16Array(256);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const xs = Math.floor(cx0 + x * f), xe = Math.max(xs + 1, Math.floor(cx0 + (x + 1) * f)), ys = Math.floor(top + y * fy), ye = Math.max(ys + 1, Math.floor(top + (y + 1) * fy));
    let best = 0, bc = 0;
    for (let yy = ys; yy < ye; yy++) for (let xx = xs; xx < xe; xx++) { const c = LAND.g[yy * NW + xx]; if (++cnt[c] > best) { best = cnt[c]; bc = c; } }
    for (let yy = ys; yy < ye; yy++) for (let xx = xs; xx < xe; xx++) cnt[LAND.g[yy * NW + xx]] = 0;
    out[y * w + x] = bc;
  }
  for (const th of LAND.things) {
    if (!th.tree || th.tree.h < 10) continue;   // flowers and shrubs are things too; only the trees show
    // A tree's colour is the commonest in its crown (all its parts but the trunk, which comes first).
    const bm = th.tree.parts[0].bm;
    let c = treeCol.get(bm);
    if (c === undefined) { const n = new Map(), ps = th.tree.parts.length > 1 ? th.tree.parts.slice(1) : th.tree.parts; for (const q of ps) for (const v of q.bm.d) if (v && v !== INK) n.set(v, (n.get(v) || 0) + 1); c = [...n].sort((p, q) => q[1] - p[1])[0]?.[0] || 0; treeCol.set(bm, c); }
    const x = Math.round((th.x - cx0) / f), y = Math.round((th.y - th.tree.h * 0.4 - top) / fy);
    if (c && x >= 0 && y >= 0 && x < w && y < h) out[y * w + x] = c;
  }
  thumbs.set(key, out);
  return out;
}

// The pages as they lie flat, drawn with the hands themselves on a canvas, then read back as which of a few
// things each pixel is: paper, a rule, the margin, the heading, or one of the inks.
const FW = 560, FH = 560, PITCH = 26, TOP = 44;
const PAPER = [240, 234, 219], RULE = [122, 182, 228], MARGIN = [232, 120, 96], HEAD = [138, 90, 74];
const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
const REFS = [PAPER, RULE, MARGIN, HEAD, ...INKS.map(hex)];   // 0 paper, 1 rule, 2 margin, 3 heading, 4-6 inks
const css = c => 'rgb(' + c.join(',') + ')';
function flatPage(draw) {
  const cv = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(FW, FH) : Object.assign(document.createElement('canvas'), { width: FW, height: FH });
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = css(PAPER); g.fillRect(0, 0, FW, FH);
  draw(g);
  const px = g.getImageData(0, 0, FW, FH).data, cls = new Uint8Array(FW * FH);
  for (let i = 0; i < cls.length; i++) {
    const r = px[i * 4], gr = px[i * 4 + 1], b = px[i * 4 + 2];
    let best = 1e9, k = 0; REFS.forEach((c, j) => { const d = (r - c[0]) ** 2 + (gr - c[1]) ** 2 + (b - c[2]) ** 2; if (d < best) { best = d; k = j; } });
    cls[i] = k;
  }
  return cls;
}
const rules = (g, margin, col) => {
  g.fillStyle = css(RULE); for (let y = TOP; y < FH - 10; y += PITCH) g.fillRect(8, y, FW - 16, 2);
  if (margin) { g.fillStyle = css(MARGIN); g.fillRect(margin, 8, 2, FH - 20); }
  if (col) { g.fillStyle = css(RULE); g.fillRect(col, 8, 2, FH - 20); }
};
function wrap(g, text, width) {
  const lines = []; let cur = '';
  for (const wd of String(text).split(/\s+/)) { const t = (cur + ' ' + wd).trim(); if (g.measureText(t).width <= width || !cur) cur = t; else { lines.push(cur); cur = wd; } }
  if (cur) lines.push(cur);
  return lines;
}
// left: { lines: [[text, box?, done?] ...], sig } or null for a blank page; right: the entries.
function pageTextures(content) {
  const left = flatPage(g => {
    rules(g, 24);
    if (!content.left) return;
    g.font = '500 25px "Caveat", cursive'; g.fillStyle = css(REFS[5]); g.strokeStyle = css(REFS[5]);
    let r = 0; const x = 40, at = () => TOP - 3 + r * PITCH;
    for (const [text, box, done] of content.left) {
      if (text === null) { r++; continue; }
      const ix = box ? x + 28 : x;
      if (box) { g.lineWidth = 2; g.strokeRect(x + 8, at() - 13, 10, 10); if (done) { g.strokeStyle = css(REFS[4]); g.beginPath(); g.moveTo(x + 9, at() - 9); g.lineTo(x + 13, at() - 4); g.lineTo(x + 21, at() - 18); g.stroke(); g.strokeStyle = css(REFS[5]); } }
      for (const ln of wrap(g, text, FW - ix - 16)) { g.fillText(ln, ix, at()); r++; }
    }
    if (content.sig) g.fillText(content.sig, FW - 70, at());
  });
  const col = 120;
  const right = flatPage(g => {
    rules(g, 0, col);
    g.fillStyle = css(MARGIN); g.fillRect(8, TOP - PITCH - 2, FW - 16, 2);
    g.font = '15px "Patrick Hand", cursive'; g.fillStyle = css(HEAD);
    g.fillText(content.head[0], 14, TOP - PITCH - 6); g.fillText(content.head[1], col + 8, TOP - PITCH - 6);
    let r = 0; const at = () => TOP - 3 + r * PITCH;
    content.right.forEach((e, i) => {
      const [font, fz] = e.pending ? ['Patrick Hand', 0.92] : HANDS[(i + 1) % HANDS.length], ink = e.pending ? 6 : 4 + [0, 1, 2][(i * 2 + 1) % 3];
      g.font = Math.round(26 * fz) + 'px "' + font + '", cursive'; g.fillStyle = css(REFS[ink]);
      if (r * PITCH > FH - TOP - PITCH) return;
      g.fillText(e.date, 14, at());
      for (const ln of wrap(g, e.name + '  ' + e.note, FW - col - 24)) { g.fillText(ln, col + 8, at()); r++; }
    });
  });
  return [left, right];
}

// One page laid onto the book in perspective: its top and bottom edges level, narrower at the back. Each
// pixel looks at nine points of the flat page and takes an ink if two of them are ink, so thin strokes
// survive the shrinking; otherwise the margin or a rule if three are, else paper, shaded into the gutter.
const CLS = () => [R.gold[6], R.water[4], R.red[2], R.wood[2], R.jay[1], INK, R.rock[1]];
function warpPage(fb, VW, cls, tl, tr, br, bl, gutterRight) {
  const C = CLS(), ty = tl[1], by = bl[1], wt = tr[0] - tl[0], wb = br[0] - bl[0], sub = [1 / 6, 0.5, 5 / 6], votes = new Uint8Array(7);
  for (let y = Math.ceil(ty); y < by; y++) {
    const v0 = (y + 0.5 - ty) / (by - ty), xl0 = tl[0] + (bl[0] - tl[0]) * v0, xr0 = tr[0] + (br[0] - tr[0]) * v0;
    for (let x = Math.floor(Math.min(tl[0], bl[0])); x <= Math.ceil(Math.max(tr[0], br[0])); x++) {
      if (x < 0 || x >= VW) continue;
      votes.fill(0); let inside = 0;
      for (const sy of sub) {
        const v = (y + sy - ty) / (by - ty), s = v * wb / (v * wb + (1 - v) * wt), xl = tl[0] + (bl[0] - tl[0]) * v, xr = tr[0] + (br[0] - tr[0]) * v;
        for (const sx of sub) { const u = (x + sx - xl) / (xr - xl); if (u < 0 || u >= 1 || s < 0 || s >= 1) continue; inside++; votes[cls[Math.floor(s * FH) * FW + Math.floor(u * FW)]]++; }
      }
      if (inside < 5) continue;
      let c, ink = 0, k = 4; for (let j = 4; j < 7; j++) { ink += votes[j]; if (votes[j] > votes[k]) k = j; }
      if (ink >= 2) c = C[k];
      else if (votes[2] >= 3) c = C[2];
      else if (votes[3] >= 3) c = C[3];
      else if (votes[1] >= 3) c = C[1];
      else { const g = gutterRight ? xr0 - x : x - xl0; c = g < 1.5 ? R.gold[4] : g < 4 ? R.gold[5] : g < 7 && bayer(x, y) < (7 - g) / 6 ? R.gold[5] : C[0]; }
      fb[y * VW + x] = c;
    }
  }
}

// Which part of the box a pixel inside its opening is: the lid's underside, a side wall, the back wall or the floor.
function part(K, x, y) {
  const { pl, pr, bt, yH, back: b } = K;
  if (y < b.y0) { const l = pl + (b.x0 - pl) * (y - bt) / (b.y0 - bt), r = pr + (b.x1 - pr) * (y - bt) / (b.y0 - bt); return x < l ? 'L' : x > r ? 'R' : 'lid'; }
  if (y > b.y1) { const t = (y - b.y1) / (yH - b.y1), l = b.x0 + (pl - b.x0) * t, r = b.x1 + (pr - b.x1) * t; return x < l ? 'L' : x > r ? 'R' : 'floor'; }
  return x < b.x0 ? 'L' : x > b.x1 ? 'R' : 'back';
}

export function paintKiosk(fb, K, content) {
  const { VW, VH, pl, pr, bt, yH, back: b } = K;
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < VW && y < VH) fb[y * VW + x] = c; }, get = (x, y) => fb[y * VW + x];
  // The posts and the beam the box hangs from, with their grain, lit from the left.
  for (let y = 0; y < yH; y++) for (let x = 0; x < VW; x++) {
    if (x > pl && x < pr && y > bt) continue;
    let c;
    if (y <= bt && x > pl - 2 && x < pr + 2) { const r = hash((x / 14) | 0, y, 1301); c = y === bt - 1 ? W[2] : y < 2 ? W[4] : r > 0.95 ? W[2] : r < 0.02 ? W[4] : W[3]; }
    else { const r = hash(x, (y / 16) | 0, 1302), edge = x < pl ? pl - x : x - pr; c = edge === 1 ? (x < pl ? W[2] : W[4]) : r > 0.95 ? W[2] : r < 0.02 ? W[4] : W[3]; if (x < pl && x % 64 === 0 || x > pr && (VW - x) % 64 === 0) c = W[1]; }
    fb[y * VW + x] = c;
  }
  // The posts are planks too, the back wall's boards two steps lighter in the daylight outside the box.
  for (const [x0, x1] of [[0, pl - 2], [pr + 2, VW - 1]]) {
    if (x1 - x0 < 4) continue;
    boards(fb, VW, x0, x1, bt + 1, yH - 1);
    for (let y = bt + 1; y < yH; y++) for (let x = x0; x <= x1; x++) fb[y * VW + x] = woodStep(fb[y * VW + x], 2);
  }
  // Inside: lid, walls, floor, then the back wall's boards.
  for (let y = bt + 1; y < yH; y++) for (let x = pl + 1; x < pr; x++) {
    const p = part(K, x, y);
    let c;
    if (p === 'lid') c = W[0];
    else if (p === 'L') { const u = (x - pl) / Math.max(1, b.x0 - pl); c = W[clamp(1 + band(0.7 - 1.4 * u, x, y), 0, 4)]; }
    else if (p === 'R') { const u = (pr - x) / Math.max(1, pr - b.x1); c = W[clamp(3 + band(1.2 - 0.9 * u, x, y), 0, 4)]; }
    else if (p === 'floor') { const t = (y - b.y1) / (yH - b.y1); c = W[2 + band(-0.4 + 1.2 * t, x, y)]; }
    else c = W[1];
    fb[y * VW + x] = c;
  }
  boards(fb, VW, b.x0, b.x1, b.y0, b.y1);
  // The light on the back wall: from the upper left, so it darkens to the right, and the lid shades its top.
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { const d = y - b.y0, k = band(0.3 - 0.6 * (x - b.x0) / (b.x1 - b.x0) - (d < 6 ? (6 - d) / 3 : 0), x, y); if (k) fb[y * VW + x] = woodStep(get(x, y), k); }
  // The lid's planks running back, and the side walls' seams.
  for (let k = 1; k < 6; k++) for (let y = bt + 1; y < b.y0; y++) { const t = (y - bt) / (b.y0 - bt), x = Math.round(pl + (pr - pl) * k / 6 + ((b.x0 + (b.x1 - b.x0) * k / 6) - (pl + (pr - pl) * k / 6)) * t); if (part(K, x, y) === 'lid') set(x, y, W[1]); }
  for (const side of [-1, 1]) for (const u of [1 / 3, 2 / 3]) {
    const x0 = side < 0 ? pl : pr, x1 = side < 0 ? b.x0 : b.x1, xi = Math.round(x0 + (x1 - x0) * u), top = Math.round(bt + (b.y0 - bt) * u) + 1, bot = Math.round(yH + (b.y1 - yH) * u) - 1;
    for (let y = top; y <= bot; y++) { set(xi, y, W[0]); if (side < 0) set(xi + 1, y, W[2]); else set(xi - 1, y, W[3]); }
  }
  // The floor's planks, closer together toward the back, each front edge lit.
  for (let k = 1; k < 5; k++) {
    const y = Math.round(b.y1 + (yH - b.y1) * (k / 5) ** 1.5), t = (y - b.y1) / (yH - b.y1), l = Math.round(b.x0 + (pl - b.x0) * t), r = Math.round(b.x1 + (pr - b.x1) * t);
    for (let x = l; x <= r; x++) { set(x, y, W[1]); set(x, y + 1, W[3]); }
  }
  for (let x = b.x0; x <= b.x1; x++) { set(x, b.y0, W[0]); set(x, b.y1, W[0]); }
  for (let y = b.y0; y <= b.y1; y++) { set(b.x0, y, W[0]); set(b.x1, y, W[0]); }
  for (let x = pl; x <= pr; x++) set(x, bt, INK);
  for (let y = bt; y < yH; y++) { set(pl, y, INK); set(pr, y, INK); }

  paintWallMap(fb, K); paintNotice(fb, K); paintCup(fb, K); paintKioskBook(fb, K, content);
}

// The map behind glass, hung from a nail on two wires: the world itself shrunk into it, a legend along its
// foot, a metal frame with a screw in each corner, and the glass catching the light in two streaks.
function paintWallMap(fb, K) {
  const { VW, map: m, back: b } = K, set = (x, y, c) => { fb[y * VW + x] = c; };
  const nx = m.x + (m.w >> 1), ny = Math.max(b.y0 + 2, m.y - Math.round(m.h * 0.18));
  for (const cx of [m.x + Math.round(m.w * 0.15), m.x + m.w - Math.round(m.w * 0.15)]) for (let k = 0; k <= 1; k += 1 / 80) set(Math.round(cx + (nx - cx) * k), Math.round(m.y + (ny - m.y) * k), R.rock[3]);
  set(nx, ny, INK); set(nx - 1, ny - 1, R.rock[4]);
  for (let y = m.y + 2; y <= m.y + m.h + 2; y++) for (let x = m.x + 2; x <= m.x + m.w + 2; x++) if (x > m.x + m.w || y > m.y + m.h) set(x, y, woodStep(fb[y * VW + x], -2));
  for (let y = m.y; y <= m.y + m.h; y++) for (let x = m.x; x <= m.x + m.w; x++) {
    const ring = Math.min(x - m.x, m.x + m.w - x, y - m.y, m.y + m.h - y);
    set(x, y, ring === 0 ? INK : ring === 1 ? (x - m.x < m.w / 2 && y - m.y < m.h / 2 ? R.rock[4] : R.rock[3]) : ring === 2 ? R.rock[2] : R.rock[1]);
  }
  for (const [sx, sy] of [[m.x + 1, m.y + 1], [m.x + m.w - 1, m.y + 1], [m.x + 1, m.y + m.h - 1], [m.x + m.w - 1, m.y + m.h - 1]]) set(sx, sy, R.rock[0]);
  const ix = m.x + 3, iy = m.y + 3, iw = m.w - 5, ih = m.h - 5, lh = Math.max(5, Math.round(ih * 0.22)), mh = ih - lh;
  const th = worldThumb(iw, mh);
  for (let y = 0; y < mh; y++) for (let x = 0; x < iw; x++) set(ix + x, iy + y, th[y * iw + x] || R.white[1]);
  // The legend: a rule above it, three coloured keys with their lines, and a box on the right.
  for (let y = iy + mh; y < iy + ih; y++) for (let x = ix; x < ix + iw; x++) set(x, y, y === iy + mh ? R.rock[2] : R.white[1]);
  const step = Math.max(2, Math.floor((lh - 3) / 3));
  [R.red[1], R.pink[1], R.yellow[0]].forEach((c, k) => { const y = iy + mh + 2 + k * step; if (y >= iy + ih - 1) return; for (let x = 0; x < 6; x++) set(ix + 3 + x, y, c); for (let x = 0; x < iw * 0.28; x++) set(ix + 12 + x, y, R.rock[2]); });
  for (let y = iy + mh + 1; y < iy + ih - 1; y++) set(ix + Math.round(iw * 0.58), y, R.rock[2]);
  // The glass: two streaks from the lower left, on every other pixel, so the map shows through.
  for (const [o, len] of [[Math.round(iw * 0.08), 0.55], [Math.round(iw * 0.16), 0.3]]) for (let k = 0; k < Math.min(iw, mh) * len; k++) { const x = ix + o + k, y = iy + mh - 2 - k; if (y > iy && x < ix + iw && (x + y) % 2) set(x, y, R.white[1]); }
}

// The trail conditions, pinned beside the map: a white card with a red pin, a red heading and lines of
// writing. The page lays the notice's own words over it where there is room for them.
function paintNotice(fb, K) {
  const { VW, notice: m } = K, set = (x, y, c) => { fb[y * VW + x] = c; };
  for (let y = m.y + 2; y <= m.y + m.h + 2; y++) for (let x = m.x + 2; x <= m.x + m.w + 2; x++) if (x > m.x + m.w || y > m.y + m.h) set(x, y, woodStep(fb[y * VW + x], -2));
  for (let y = m.y; y <= m.y + m.h; y++) for (let x = m.x; x <= m.x + m.w; x++) set(x, y, x === m.x || y === m.y || x === m.x + m.w || y === m.y + m.h ? INK : x > m.x + m.w - 3 || y > m.y + m.h - 3 ? R.white[0] : R.white[1]);
  for (let x = m.x + 5; x < m.x + m.w * 0.7; x++) { set(x, m.y + 6, R.red[1]); set(x, m.y + 7, R.red[1]); }
  for (let k = 0; m.y + 13 + k * 6 < m.y + m.h - 4; k++) for (let x = m.x + 5; x < m.x + m.w * (0.62 - (k % 3) * 0.1); x++) set(x, m.y + 13 + k * 6, R.rock[2]);
  const px = m.x + (m.w >> 1); set(px, m.y + 1, R.red[0]); set(px - 1, m.y, R.red[1]); set(px, m.y, R.red[1]); set(px - 1, m.y + 1, R.red[1]);
}

// The tin of pencils on the shelf by the book: ribbed, lit down its left side, its rim a dark ring, and five
// pencils of different colours standing at different heights, sharpened, two of them leaning.
function paintCup(fb, K) {
  const { VW, cup: c } = K, set = (x, y, v) => { if (x >= 0 && x < VW && y >= 0) fb[y * VW + x] = v; };
  const pw = Math.max(2, Math.round(c.w / 16)), P = [[R.yellow[1], R.yellow[0], 0, 0], [R.red[1], R.red[0], 0.45, -1], [R.grass[3], R.grass[2], 0.1, 0], [R.water[3], R.water[2], 0.6, 1], [R.wood[4], R.wood[3], 0.3, 0]];
  P.forEach(([lit, dark, drop, lean], k) => {
    const x0 = c.x + Math.round(c.w * (0.14 + k * 0.17)), top = c.top + Math.round((c.y - c.top) * drop * 0.6), tip = Math.max(3, pw * 2);
    for (let y = top; y < c.y + 3; y++) {
      const sx = x0 + Math.round(lean * (c.y - y) / 8);
      for (let i = 0; i < pw; i++) {
        let v;
        if (y < top + tip) { const half = Math.round((y - top) / tip * pw / 2); if (Math.abs(i - (pw - 1) / 2) > half + 0.5) continue; v = y < top + 2 ? INK : R.wood[4]; }
        else v = i < pw / 2 ? lit : dark;
        set(sx + i, y, v);
      }
    }
  });
  for (let y = c.y + 2; y <= c.y + c.h + 2; y++) for (let x = c.x + c.w + 1; x <= c.x + c.w + 3; x++) set(x, y, woodStep(fb[y * VW + x], -2));
  for (let x = c.x + 2; x <= c.x + c.w + 3; x++) set(x, c.y + c.h + 1, woodStep(fb[(c.y + c.h + 1) * VW + x], -2));
  for (let y = c.y; y <= c.y + c.h; y++) for (let x = c.x; x <= c.x + c.w; x++) {
    const u = (x - c.x) / c.w, edge = x === c.x || x === c.x + c.w || y === c.y + c.h;
    set(x, y, edge ? INK : y <= c.y + 1 ? (y === c.y ? R.rock[4] : INK) : u < 0.12 ? R.rock[4] : u > 0.82 ? R.rock[1] : (y - c.y) % 5 === 0 ? R.rock[2] : u < 0.4 ? R.rock[3] : R.rock[2]);
  }
}

// The book open on the shelf: its shadow, the cloth cover, the block of pages showing at its foot, the two
// pages in perspective with their words, the spine, and the ribbon marker.
function paintKioskBook(fb, K, content) {
  const { VW, book: k } = K, set = (x, y, c) => { if (x >= 0 && x < VW) fb[y * VW + x] = c; };
  const inside = (x, y, a, d) => { const v = (y - k.ty) / (k.by - k.ty), l = k.tx0 + (k.bx0 - k.tx0) * v - a, r = k.tx1 + (k.bx1 - k.tx1) * v + a; return y >= k.ty - a && y <= k.by + d && x >= l && x <= r; };
  for (let y = k.ty; y <= k.by + 4; y++) for (let x = k.bx0; x <= k.bx1 + 5; x++) if (inside(x - 4, y - 3, 1, 1) && !inside(x, y, 1, 1)) set(x, y, woodStep(fb[y * VW + x], -2));
  for (let y = k.ty - 1; y <= k.by + 1; y++) for (let x = k.bx0 - 2; x <= k.bx1 + 2; x++) if (inside(x, y, 1, 1)) set(x, y, inside(x, y, 0, 0) ? (y < k.ty + 1 ? R.navy[2] : R.navy[1]) : INK);
  const [L, Rt] = pageTextures(content), mt = (k.tx0 + k.tx1) / 2, mb = (k.bx0 + k.bx1) / 2, foot = k.by - 3;
  const tl = [k.tx0 + 2, k.ty + 1], tr = [k.tx1 - 2, k.ty + 1], br = [k.bx1 - 3, foot], bl = [k.bx0 + 3, foot];
  for (let y = foot; y < k.by; y++) { const v = (y - k.ty) / (k.by - k.ty), l = Math.round(k.tx0 + (k.bx0 - k.tx0) * v) + 3, r = Math.round(k.tx1 + (k.bx1 - k.tx1) * v) - 3; for (let x = l; x <= r; x++) set(x, y, (y + (x >> 2)) % 2 ? R.gold[4] : R.gold[5]); }
  warpPage(fb, VW, L, tl, [mt - 1, k.ty + 1], [mb - 1, foot], bl, true);
  warpPage(fb, VW, Rt, [mt + 1, k.ty + 1], tr, br, [mb + 1, foot], false);
  for (let y = k.ty; y <= k.by; y++) { const x = Math.round(mt + (mb - mt) * (y - k.ty) / (k.by - k.ty)); set(x, y, R.navy[0]); }
  for (let y = k.by - 1; y <= k.by + 4; y++) for (let x = Math.round(mb) - 1; x <= Math.round(mb) + 1; x++) set(x, y, x === Math.round(mb) + 1 ? R.red[0] : R.red[1]);
}
