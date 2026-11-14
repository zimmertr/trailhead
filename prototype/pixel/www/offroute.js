// Off route: what an address with no trail behind it looks like. A whiteout, one wand, and a sign
// pointing back the way you came.
import { clamp, frac, hash, fbm, bayer, R, INK, BM, outline } from './core.js';
import { baseline } from './side.js';
import { makeRunner, frontFig } from './tj.js';
import { makeSmallSign } from './sprites.js';

export function makeOffroute() {
  const run = makeRunner('alpine'), idle = frontFig('alpine'), st = {}, focus = { x: 0, y: 0 };
  const sign = makeSmallSign();
  const wand = (() => { const b = new BM(7, 26); b.ox = 1; b.oy = 25; for (let y = 4; y < 26; y++) b.set(1, y, R.wood[2]); for (let y = 0; y < 5; y++) for (let x = 2; x < 6 - (y & 1); x++) b.set(x, y + 1, R.blaze[y < 2 ? 2 : 1]); outline(b, INK); return b; })();
  return {
    name: 'offroute',
    dur: () => 1.6,
    stops: () => [{ id: 'off-route', at: 1 }],
    elev: () => 0,
    cues: () => [{ at: 0.05, name: 'wind' }],
    enter() { st.y = null; },
    focus: () => focus,
    pick(sx, sy) { return Math.abs(sx - focus.x - 26) < 8 && Math.abs(sy - focus.y) < 22 ? { label: 'The only wand for miles', x: focus.x + 26, y: focus.y - 16 } : null; },
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t } = env, base = baseline(scr, env.shown, st), cx = Math.round(scr.narrow ? VW * 0.5 : VW * 0.62);
      // Snow underfoot fading into cloud: the horizon is somewhere in there.
      for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
        const d = (y - base) / 60, n = fbm((x + t * 14) / 70, y / 26 + t * 0.05, 400, 3);
        // Cloud above, with the ghost of a ridge that comes and goes; wind-packed snow below.
        let v = y < base ? 0.62 + 0.3 * n : 0.9 - 0.3 * clamp(d, 0, 1) + 0.14 * (n - 0.5);
        if (y < base) { const ridge = base - 60 - 50 * fbm(x / 90, 3, 403, 3), show = fbm(x / 140 + t * 0.03, 7, 404, 2); if (y > ridge && show > 0.5) v -= 0.16 * Math.min(1, (show - 0.5) * 6) * (1 - (y - ridge) / (base - ridge)); }
        if (y >= base && fbm(x / 14, y / 2.5, 401, 2) > 0.62) v -= 0.12;
        const f = clamp(v, 0, 0.999) * 4, i = Math.floor(f);
        fb[y * VW + x] = R.snow[Math.min(4, i + (bayer(x, y) < f - i ? 1 : 0))];
      }
      // His own tracks, coming in from the left and stopping.
      const mx = cx - Math.round((1 - q) * 70), my = base + 6;
      for (let x = cx - 150; x < mx - 3; x += 5) scr.set(x, my + ((x / 5) & 1), R.snow[0]);
      scr.put(wand, cx + 26, my - 2, false);
      for (let k = 0; k < 3; k++) scr.set(cx + 29 + k + (Math.floor(t * 6) & 1), my - 23 + k, R.blaze[2]);
      scr.put(sign, cx - 34, my - 1, false);
      scr.shadow(mx, my, 5, 1);
      scr.put(q < 1 && env.moving ? run.side[Math.floor(q * 70 / 4.2) % 6] : idle, mx, my, false);
      // Spindrift blowing through, in front of everything.
      for (let k = 0; k < 150; k++) {
        const sp = 40 + hash(k, 1, 402) * 70, x = Math.floor(frac(hash(k, 2, 402) + t * sp / (VW + 40)) * (VW + 40)) - 20, y = Math.floor(frac(hash(k, 3, 402) + t * 0.05 * (1 + hash(k, 4, 402))) * VH);
        scr.set(x, y, R.snow[4]); if (k % 3 === 0) scr.set(x + 1, y, R.snow[4]);
      }
      focus.x = mx; focus.y = my - 14;
    }
  };
}
