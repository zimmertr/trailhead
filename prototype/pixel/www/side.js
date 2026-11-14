// Helpers for the side-view scenes: wide strips of scenery that scroll at their own speed.
import { BM, clamp, vnoise, fbm, pick, INK } from './core.js';

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

// The last tree of the forest, standing nearer than the trail and running off the top and bottom of
// the screen. The forest ends on its left half and the lake scene begins on its right half, so its
// bark depends only on the distance from its middle and the screen row, never on which scene draws it.
const EDGE_HW = 26;
function edgeTrunk(scr, sx) {
  const { VW, VH, fb } = scr; sx = Math.round(sx);
  if (sx < -EDGE_HW || sx > VW + EDGE_HW) return;
  for (let y = 0; y < VH; y++) {
    const hl = EDGE_HW - 4 + Math.round(4 * vnoise(y / 60, 1, 700)), hr = EDGE_HW - 4 + Math.round(4 * vnoise(y / 60, 2, 700)), row = y * VW;
    for (let dx = -hl; dx <= hr; dx++) {
      const x = sx + dx; if (x < 0 || x >= VW) continue;
      let c;
      if (dx === -hl || dx === hr) c = INK;
      else {
        const u = (dx + hl) / (hl + hr), ridge = vnoise((dx + 4 * vnoise(y / 34, 3, 701)) / 2.4, y / 52, 702);
        const moss = fbm(dx / 10, y / 26, 703, 3) > 0.6 - 0.1 * u;
        c = moss ? pick('moss', 0.12 + 0.3 * ridge + 0.22 * u, dx + 64, y, 0.8) : pick('bark', 0.1 + 0.5 * ridge + 0.25 * u - (u < 0.15 ? 0.2 : 0), dx + 64, y, 0.8);
      }
      fb[row + x] = c;
    }
  }
}

export { Strip, drawStrip, blitTall, baseline, edgeTrunk };
