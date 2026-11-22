// Helpers for the side-view scenes: wide strips of scenery that scroll at their own speed.
import { frac, smooth, hash, vnoise, fbm, bayer, R, pick } from './core.js';

// A strip is a wide index bitmap whose row `up` is the line he runs along. Scenes paint into it
// with y measured from that line, negative above it.
class Strip {
  constructor(w, up, down) { this.w = w; this.up = up; this.h = up + down; this.d = new Uint8Array(w * this.h); }
  set(x, y, c) { x = Math.round(x); y = Math.round(y) + this.up; if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.d[y * this.w + x] = c; }
  get(x, y) { x = Math.round(x); y = Math.round(y) + this.up; return x >= 0 && x < this.w && y >= 0 && y < this.h ? this.d[y * this.w + x] : 0; }
  // Copies a sprite in with its foot at x, y.
  stamp(bm, x, y, flip) {
    const x0 = Math.round(x) - (flip ? bm.w - 1 - bm.ox : bm.ox), y0 = Math.round(y) - bm.oy;
    for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + (flip ? bm.w - 1 - i : i)]; if (c) this.set(x0 + i, y0 + j, c); }
  }
}

// Draws a strip with its line at screen row baseY and its column camX at the left edge. It wraps
// sideways, so a very wide window never shows an edge. Above its top it repeats its first row
// when `above` is set (trunks carry on up), and below its bottom it fills with `below`.
// shift, when given, moves a row sideways (the wobble on water).
function drawStrip(scr, s, camX, baseY, above = false, below = 0, shift = null) {
  const { VW, VH, fb } = scr, w = s.w, d = s.d;
  camX = Math.round(camX); baseY = Math.round(baseY);
  for (let y = 0; y < VH; y++) {
    let sy = y - baseY + s.up;
    if (sy < 0) { if (!above) continue; sy = 0; }
    const row = y * VW;
    if (sy >= s.h) { if (below) fb.fill(below, row, row + VW); continue; }
    let sx = ((camX + (shift ? shift(sy - s.up) : 0)) % w + w) % w, si = sy * w + sx;
    for (let x = 0; x < VW; x++) {
      const c = d[si]; if (c) fb[row + x] = c;
      if (++sx === w) { sx = 0; si = sy * w; } else si++;
    }
  }
}

// A sprite that carries on upwards off its own top, such as a giant trunk on a tall screen.
function blitTall(scr, bm, sx, sy) {
  scr.blit(bm, sx, sy);
  sx = Math.round(sx); sy = Math.round(sy);
  const { VW, fb } = scr;
  for (let y = 0; y < Math.min(sy, scr.VH); y++) for (let i = 0; i < bm.w; i++) { const c = bm.d[i], x = sx + i; if (c && x >= 0 && x < VW) fb[y * VW + x] = c; }
}

// Where on the screen the line he runs along sits. On a tall, narrow screen the panels cover the
// bottom, so the line rides higher while a card is open and lower while he runs.
function baseline(scr, card, state) {
  const want = scr.narrow ? scr.VH * (card ? 0.42 : 0.62) : scr.VH - 86;
  state.y = state.y == null ? want : state.y + (want - state.y) * 0.12;
  return Math.round(state.y);
}

// A scene whose pictures are made the first time they are wanted. The page needs a scene's length,
// its stops and its ups and downs at once, to lay out the timeline, but the forest's and the lake's
// pictures take a sixth of a second each to make, and he cannot reach either for some seconds.
// pixel.js calls warm() as soon as the map is on the screen. meta: what the timeline needs. what: the
// names of everything else the scene can do. A scene that cannot be made throws when it is drawn,
// which pixel.js handles like any other scene that throws.
function shell(meta, make, what) {
  let full = null;
  const art = () => { if (!full) { try { full = make(); } catch (err) { full = { enter() {}, focus: () => ({ x: 0, y: 0 }), draw() { throw err; } }; } } return full; };
  const s = { ...meta, warm: art };
  for (const k of what) s[k] = (...a) => { const f = art()[k]; return f ? f(...a) : undefined; };
  return s;
}
// A picture drawn at any size k, its foot at (x, y); nearest pixel, so it stays crisp. Landmarks that
// grow as he nears them (Proficiency Peak, the Spires) are drawn this way.
function blitScaled(fb, VW, VH, b, x, y, k) {
  const w = Math.round(b.w * k), h = Math.round(b.h * k), x0 = Math.round(x - b.ox * k), y0 = Math.round(y - b.oy * k);
  for (let j = Math.max(0, -y0); j < h && y0 + j < VH; j++) {
    const sj = Math.min(b.h - 1, Math.floor(j / k)) * b.w, row = (y0 + j) * VW;
    for (let i = Math.max(0, -x0); i < w && x0 + i < VW; i++) { const c = b.d[sj + Math.min(b.w - 1, Math.floor(i / k))]; if (c) fb[row + x0 + i] = c; }
  }
}
// Far peaks for a strip, in the pale far colours: each peak {cx, h, hw, p} (centre, height over its
// foot at -18, half width, how sharp), its ridge wandering down from the top, lit on its west face,
// gullies down both faces with snow in the high ones, snow on the highest tops. The larch basin and the
// walk to camp both paint their far mountains this way. Returns the skyline (y of the top at x).
function paintPeaks(S, SP) {
  const topAt = x => { let t = 4; topAt.own = null; for (const p of SP) { const a = 1 - Math.abs(x - p.cx) / p.hw; if (a > 0) { const h = -18 - p.h * Math.pow(a, p.p) - 5 * (vnoise(x / 4, p.cx, 618) - 0.5) * a; if (h < t) { t = h; topAt.own = p; } } } return t; };
  for (let x = 0; x < S.w; x++) {
    const top = Math.round(topAt(x)), p = topAt.own; if (!p) continue;
    for (let y = top; y < S.h - S.up; y++) {
      const ridge = p.cx + 6 * (vnoise(y / 14, p.cx, 620) - 0.5) * (y - top) / 20, lit = x < ridge, gully = frac((x - ridge) / (lit ? 9 : 7) + 0.4 * vnoise(x / 6, y / 18, 621)) < 0.18 && y - top > 4;
      const crack = vnoise(x / 2.5, y / 20, 619) > 0.74;
      let c = pick('far', (lit ? 0.7 : 0.3) + 0.1 * (fbm(x / 7, y / 14, 612, 3) - 0.5) - (gully ? 0.16 : 0) - (crack ? 0.1 : 0) - smooth(-30, 4, y) * 0.12, x, y);
      if (gully && y < -46 && y - top > 3 && hash(x, y, 622) < 0.85) c = R.farsnow[lit ? 1 : 0];
      if (y - top < 2 && top < -100) c = R.farsnow[lit ? 1 : 0];
      S.set(x, y, c);
    }
  }
  return topAt;
}

// An animal's answer to a click, drawn over it (round 6, note 10): breath (an elk's bugle, a snort) puffing
// out from a mouth at x, y toward dir and rising as it fades, age seconds after the click.
function puffs(scr, x, y, dir, age, big = 1) {
  for (let k = 0; k < 8; k++) { const s = age - k * 0.15; if (s < 0 || s > 1.6) continue; const px = Math.round(x + dir * (2 + s * 8 * big)), py = Math.round(y - s * 9 * big), r = s < 0.5 ? 1 : 2;
    for (let dy = -r; dy <= 0; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) <= r && bayer(px + dx, py + dy) < 1.1 - s / 1.6) scr.set(px + dx, py + dy, s < 0.4 ? R.white[1] : R.white[0]); }
}

export { Strip, drawStrip, blitTall, baseline, shell, blitScaled, paintPeaks, puffs };
