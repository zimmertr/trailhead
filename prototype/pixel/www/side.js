// Helpers for the side-view scenes: wide strips of scenery that scroll at their own speed.
import { BM, clamp } from './core.js';

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

export { Strip, drawStrip, blitTall, baseline };
