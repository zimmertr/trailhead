// The world map: the top-down view of the Trailhead and its three destinations.
import { DEBUG, TAU, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, RAMP_OF, INK, SHADE, LIGHT, KIND, pick, BM, outline, makePath, windAt } from './core.js';
import { breeze } from './core.js';
import { makeCloud, makeSignpost, makeSmallSign, makeKiosk, makeTent, makeJournal, makeBird, makeFlag } from './sprites.js';
import { SIGNS, NAMES, DEST_NAMES } from './content.js';
import { makeCats } from './cats.js';
import { makeCritters } from './critters.js';
import { makeRunner } from './tj.js';
import { buildTerrain, loadBake, NW as WW, NH as WH, T } from './land.js';
// The height of the timeline bar in page pixels (32 of its own pixels), read again only when the page is resized.
let barAt = -1, barH = 0;
const barCss = () => { if (barAt !== innerWidth * 1e4 + innerHeight) { barAt = innerWidth * 1e4 + innerHeight; barH = 32 * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) || 2); } return barH; };
// ---------------------------------------------------------------------------------------------
// The world. Pixel coordinates, x east, y south. North is up the screen, so the three
// destinations stand along the top of the meadow: the forest and About Lake on the left,
// The Stack in the middle, Sideproject Spires on the right. The ground itself, every biome and
// everything rooted in it, comes from land.js; this file adds what moves and what is clicked.

const KM = 0.008; // kilometres per pixel along a trail, for the sign's distances
const RUN = 78; // pixels a second

// ---------------------------------------------------------------------------------------------
// The scene. Built once; drawn for whichever stretch of trail (a leg) he is on.

export function makeWorld(bake) {
  const W = buildTerrain(), { g: ground, spots, forestAmt } = W;
  const paths = {}; for (const k of ['lake', 'stack', 'spires']) paths[k] = makePath({ pts: W.trails[k], stops: [] });
  // Shafts of light slant through the forest, and give out where the mist takes over in the west.
  const shaftMask = new Uint8Array(WW * WH);
  for (let y = 300; y < WH; y++) for (let x = 0; x < 760; x++) {
    if (forestAmt(x, y) < 0.7) continue;
    const band = frac((x * 0.55 + y) / 64);
    if (band < 0.15 && vnoise((x * 0.55 + y) / 64, (y - x * 0.4) / 40, 77) > 0.42 + smooth(430, 200, x) * 0.4) shaftMask[y * WW + x] = band < 0.05 || band > 0.1 ? 1 : 2;
  }

  // Everything that stands up, sorted by its feet each frame.
  const things = [];
  for (const th of W.things) things.push(th.tree ? { kind: 'tree', t: th, x: th.x, y: th.y } : th);
  const put = (bm, x, y, extra = {}) => things.push({ bm, x: Math.round(x), y: Math.round(y), ...extra });
  put(makeSignpost(), spots.signpost[0], spots.signpost[1]);
  for (const s of spots.signs) put(makeSmallSign(), s[0], s[1]);
  put(makeJournal(), spots.journal[0], spots.journal[1]); put(makeKiosk(), spots.kiosk[0], spots.kiosk[1]);
  for (const [x, y, c] of spots.tents) put(makeTent(c), x, y);
  // The animals look after themselves: see critters.js. Where each one lives comes from land.js.
  const crit = makeCritters(W);
  for (const it of crit.items) things.push(it);
  const birds = [makeBird(0), makeBird(1)];
  const clouds = [0, 1, 2, 3, 4, 5].map(i => ({ bm: makeCloud(600 + i), x: i * 330 + 40, y: 50 + (i & 1) * 70 + i * 18, v: 3 + (i % 4) }));
  const runner = makeRunner('trail');
  const kit = makeCats(); window.__cats = kit;
  const flags = [makeFlag(0), makeFlag(1)];
  const FLAGS = spots.flags;
  for (const k in FLAGS) things.push({ flag: k, bm: flags[0], x: FLAGS[k].x, y: FLAGS[k].y, lift: FLAGS[k].lift });
  // The top of the boot track lies behind the Spires on the map, so it is drawn again over them.
  const trackPix = W.trackPix;
  // His footprints stay on a finished trail: a pair of dark dots every few steps.
  const prints = {};
  for (const k in paths) {
    const P = paths[k], out = [];
    for (let d = 6, n = 0; d < P.len - 4; d += 5, n++) { const a = P.at(d / P.len), l = Math.hypot(a.dx, a.dy) || 1, s = n & 1 ? 1 : -1; out.push([Math.round(a.x - a.dy / l * s), Math.round(a.y + a.dx / l * s)]); }
    prints[k] = out;
  }

  // Where the lake loop goes into the trees and where it comes back out by the lake.
  const lakeIn = (() => { const P = paths.lake; for (let q = 0; q < 1; q += 0.002) { const a = P.at(q); if (forestAmt(a.x, a.y) > 0.75) return q; } return 0.2; })();
  const lakeOut = (() => { const P = paths.lake; let best = 0, bd = 1e9; for (let q = 0.5; q < 1; q += 0.002) { const a = P.at(q), d = Math.hypot(a.x - spots.lakeShore[0], a.y - spots.lakeShore[1]); if (d < bd) { bd = d; best = q; } } return best; })();

  // Where each place's name is pinned: over the signpost, on the lake's near shore, on the wall's rim, on the ice under the summits.
  const PLACES = [{ id: 'trailhead', x: T.x - 4, y: T.y - 31 }, ...['lake', 'stack', 'spires'].map(id => ({ id, x: spots.places[id][0], y: spots.places[id][1] }))];
  // How far from the camera he is on a trail, from the trail's own points.
  const vOn = (path, x, y) => { let best = 0, bd = 1e9; for (const p of W.lines[path]) { const d = Math.abs(p[0] - x) + Math.abs(p[1] - y); if (d < bd) { bd = d; best = p[2]; } } return best; };
  const saved = new Uint8Array(25 * 34);
  // The destinations rise a little when the pointer rests on one or it is tapped (D12a).
  const lifted = [0, 0, 0, 0]; let tapped = 0, tapUntil = 0;
  const destUnder = (wx, wy) => { wx = Math.round(wx); wy = Math.round(wy); return wx < 0 || wy < 0 || wx >= WW || wy >= WH ? 0 : W.dest[wy * WW + wx]; };
  // Redraws destination k d pixels higher, from what the ground pass put in the frame. Rows are read top
  // to bottom, so a row is always read before anything is written over it. Where it has left its foot
  // the ground goes dark, softer one row further down: a shadow under a place that has stepped up.
  function liftDest(scr, k, d, ox, oy) {
    const { VW, VH, fb } = scr, b = W.destBox[k], D = W.dest;
    const x0 = Math.max(b.x0, ox), x1 = Math.min(b.x1, ox + VW - 1), y0 = Math.max(b.y0, oy + d), y1 = Math.min(b.y1, oy + VH - 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (D[y * WW + x] !== k) continue; fb[(y - oy - d) * VW + (x - ox)] = fb[(y - oy) * VW + (x - ox)]; }
    for (let y = Math.max(b.y0, oy); y <= Math.min(b.y1 + 1, oy + VH - 1); y++) for (let x = x0; x <= x1; x++) {
      const w = y * WW + x; if (y >= WH) continue; const here = D[w] === k, under = y + d < WH && D[w + d * WW] === k;
      if (here && !under) { const i = (y - oy) * VW + (x - ox); fb[i] = SHADE[SHADE[fb[i]]]; }
      else if (!here && y > 0 && D[w - WW] === k && ((x + y) & 1)) { const i = (y - oy) * VW + (x - ox); fb[i] = SHADE[fb[i]]; }
    }
  }
  const cam = { x: T.x, y: 0 };
  let facing = 'down', flip = false, last = { ox: 0, oy: 0, VW: 1, VH: 1 }, focus = { x: 0, y: 0 };
  const list = [];
  // The view from the Trailhead. On an upright phone the junction sign covers the lower half, so
  // the view sits lower to keep him above it, past the bottom edge of the map if it has to.
  // A wide view taller than about 600 pixels (the opening view) rests lower, down to the near edge of the
  // map, so the meadow, the lake and all three destinations are in frame under the skyline.
  const vista = scr => scr.narrow ? { x: T.x, y: T.y + scr.VH * 0.06 } : { x: T.x, y: T.y + Math.min(46, scr.VH * 0.17) + 14 - scr.VH / 2 + Math.max(0, scr.VH - 300) * 0.25 + Math.max(0, scr.VH - 600) * 0.45 };
  let past = 0;
  const where = (leg, q) => { const P = paths[leg.path], a = P.at(lerp(leg.from, leg.to, q)), s = leg.to < leg.from ? -1 : 1; return { x: a.x, y: a.y, dx: a.dx * s, dy: a.dy * s, P }; };
  const target = (scr, here) => {
    const v = vista(scr), k = smooth(0, 60, Math.hypot(here.x - T.x, here.y - T.y));
    return [lerp(v.x, here.x, k), lerp(v.y, here.y - 24, k)];
  };

  return {
    name: 'world', paths, lakeIn, lakeOut, T, WW, WH,
    lengths: () => ({ lake: 5.2, stack: Math.round(paths.stack.len * KM * 10) / 10, spires: Math.round(paths.spires.len * KM * 10) / 10 }),
    dur: leg => Math.abs(leg.to - leg.from) * paths[leg.path].len / RUN,
    stops: () => [],
    // North on the map is uphill, which is all the profile along the bottom needs.
    elev: (leg, q) => (T.y - where(leg, q).y) * 0.8,
    // One frame of the map from a fixed spot, without him: the picture on the trail map.
    still(scr, x, y, env) {
      const keep = [cam.x, cam.y, last, focus, facing, flip];
      this.draw(scr, { ...env, dt: 0, moving: false, home: false, idle: 0, look: { x: 0, y: 0 }, hideMe: true, fixed: { x, y } }, { path: 'lake', from: 0, to: 0 }, 0);
      [cam.x, cam.y, last, focus, facing, flip] = keep;
    },
    enter(scr, leg, q) { const [tx, ty] = target(scr, where(leg, q)); cam.x = tx; cam.y = ty; },
    focus: () => focus,
    // The spot of the map under a point of the screen.
    at: (sx, sy) => ({ x: sx + last.ox, y: sy + last.oy }),
    // The four places he can be sent to, for the page to pin a name on. The page keeps a name on screen
    // when its place is out of view.
    labels() { return PLACES.map(d => ({ id: 'go:' + d.id, name: DEST_NAMES[d.id], x: d.x - last.ox, y: d.y - last.oy })); },
    // What is under a point of the screen: a sign with a name, the kiosk, a cat.
    pick(sx, sy) {
      const wx = sx + last.ox, wy = sy + last.oy;
      for (const s of spots.signs) if (Math.abs(wx - s[0]) < 8 && wy > s[1] - 17 && wy < s[1] + 3) return { label: SIGNS[s[2]], x: s[0] - last.ox, y: s[1] - 18 - last.oy };
      const c = kit.pick(wx, wy); if (c) return { label: c.label, x: c.wx - last.ox, y: c.wy - last.oy, act: c.act };
      { const [kx, ky] = spots.kiosk; if (Math.abs(wx - kx) < 14 && wy > ky - 27 && wy < ky + 3) return { label: NAMES.kiosk, x: kx - last.ox, y: ky - 27 - last.oy, act: 'kiosk' }; }
      { const k = destUnder(wx, wy); if (k) return { label: DEST_NAMES[W.DEST[k]], named: true, x: sx, y: sy, act: 'dest:' + W.DEST[k] }; }
      return null;
    },
    act(id, env) { if (id.startsWith('dest:')) { const k = W.DEST.indexOf(id.slice(5)); if (lifted[k] > 0.5) return false; tapped = k; tapUntil = env.t + 3; return true; } return id.startsWith('cat:') ? kit.click(id.slice(4), env) : false; },
    draw(scr, env, leg, q) {
      const { VW, VH, fb } = scr, { t, tq, dt } = env;
      const here = where(leg, q);
      if (env.moving && Math.abs(here.dx) + Math.abs(here.dy) > 0.01) {
        if (Math.abs(here.dx) > Math.abs(here.dy) * 0.7) { facing = 'side'; flip = here.dx < 0; } else facing = here.dy < 0 ? 'up' : 'down';
      }
      if (env.home) facing = 'down';

      // Camera: the whole view from the Trailhead, then follow him.
      let [tx, ty] = target(scr, here);
      if (env.home && env.idle > 4 && Math.abs(env.look.x) + Math.abs(env.look.y) < 1) tx += Math.sin((env.idle - 4) * 0.16) * Math.min(130, Math.max(0, (WW - VW) / 2 - Math.abs(tx - WW / 2))) * 0.9 * Math.min(1, (env.idle - 4) / 3);
      const damp = 1 - Math.exp(-dt * 3.2);
      cam.x += (tx - cam.x) * damp; cam.y += (ty - cam.y) * damp;
      // A zoom step keeps one spot of the map under the pointer: the camera goes straight to its new rest and the dragged view makes up the difference.
      if (env.anchor && !env.fixed) { const a = env.anchor; cam.x = tx; cam.y = ty; env.look.x = a.wx - a.sx + VW / 2 - cam.x; env.look.y = a.wy - a.sy + VH / 2 - cam.y; env.anchor = null; }
      // How far a drag may take the view: the hard limits below keep the edge of the world out of sight,
      // and the last 26 pixels before them push back.
      // The timeline bar covers the bottom of the view, so the view may go that much further down and the
      // bottom of the map (the river's mouth, the dry corner) can be brought up above it (D11).
      const bar = barCss() / scr.S;
      if (!env.fixed) { const M = 26, b = { x0: Math.min(0, VW / 2 + M - cam.x), x1: Math.max(0, WW - VW / 2 - M - cam.x), y0: Math.min(0, VH / 2 + M - cam.y), y1: Math.max(0, WH - VH / 2 - M + bar - cam.y) }; if (VW >= WW) b.x0 = b.x1 = 0; if (VH >= WH) b.y0 = b.y1 = 0; env.lookBox = b; }
      let cx = cam.x + env.look.x, cy = cam.y + env.look.y;
      cx = VW >= WW ? WW / 2 : clamp(cx, VW / 2, WW - VW / 2);
      past += ((scr.narrow && env.home ? VH * 0.34 : 0) - past) * (env.fixed ? 0 : Math.min(1, dt * 4));
      cy = VH >= WH ? WH / 2 : clamp(cy, VH / 2, WH - VH / 2 + past + bar);
      const ox = env.fixed ? env.fixed.x : Math.round(cx - VW / 2), oy = env.fixed ? env.fixed.y : Math.round(cy - VH / 2);
      last = { ox, oy, VW, VH };
      // The night sky is pinned to the world's own sky, laid out over a height that keeps the aurora in its dark upper part.
      scr.sky = { ox, oy, w: WW, h: 330, moon: [1180, 60] };

      // Ground.
      for (let y = 0; y < VH; y++) {
        const wy = oy + y, row = y * VW;
        if (wy < 0) { fb.fill(R.skyband[0], row, row + VW); continue; }
        if (wy >= WH) { const my = 2 * WH - 1 - wy, a = Math.max(0, ox), b = Math.min(WW, ox + VW); fb.fill(R.grass[2], row, row + VW); if (my >= 470 && b > a) fb.set(ground.subarray(my * WW + a, my * WW + b), row + (a - ox)); continue; }
        const a = Math.max(0, ox), b = Math.min(WW, ox + VW);
        if (a > ox) fb.fill(wy < 330 ? R.sky[2] : R.grass[2], row, row + (a - ox));
        if (b < ox + VW) fb.fill(wy < 330 ? R.sky[2] : R.grass[2], row + (b - ox), row + VW);
        if (b > a) fb.set(ground.subarray(wy * WW + a, wy * WW + b), row + (a - ox));
      }
      crit.sea(scr, ox, oy, t); crit.falls(scr, ox, oy, t);
      { const over = env.ptr && !env.fixed ? destUnder(env.ptr[0] + ox, env.ptr[1] + oy) : 0, want = over || (t < tapUntil ? tapped : 0);
        for (let k = 1; k < 4; k++) { lifted[k] += ((k === want ? 1 : 0) - lifted[k]) * Math.min(1, dt * 9); const d = Math.round(2 * lifted[k]); if (d > 0) liftDest(scr, k, d, ox, oy); } }
      crit.update(dt, t, env.hideMe ? null : here);
      if (DEBUG.clouds) for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v) % (WW + 120)) - 60 - ox, c.y - oy);
      for (const k in prints) if (env.done[k]) for (const [x, y] of prints[k]) { const sx = x - ox, sy = y - oy; if (sx >= 0 && sy >= 0 && sx < VW && sy < VH && KIND[fb[sy * VW + sx]] === 3) fb[sy * VW + sx] = R.dirt[0]; }

      // Everything that stands, back to front.
      list.length = 0;
      for (const th of things) {
        if (th.flag && !env.done[th.flag]) continue;
        if (((th.kind === 'tree' || th.isTree) && !DEBUG.trees) || (th.critter && !DEBUG.animals)) continue;
        const w = th.kind === 'tree' ? th.t.tree.w + 8 : th.bm.w, h = (th.kind === 'tree' ? th.t.tree.h + 10 : th.bm.h) + (th.lift || 0);
        if (th.x + w < ox || th.x - w > ox + VW || th.y - h > oy + VH || th.y + 4 < oy) continue;
        list.push(th);
      }
      if (!env.hideMe) list.push({ me: true, x: here.x, y: here.y });
      { const fh = crit.ferryHull(t, ox, oy, VW, VH); if (fh) list.push({ ferryHull: true, y: fh.y }); }
      kit.update(env, here, scr.narrow && !env.fixed, env.home && !env.fixed ? oy + (scr.narrow ? VH * 0.56 : VH - 38) : 0);
      for (const it of kit.items()) list.push(it);
      list.sort((a, b) => a.y - b.y);
      // A tree that nearer ground partly hides is drawn only where the land under each pixel is no
      // nearer than the tree itself (D6a), so it can sway and still stand behind the slope in front.
      const DEP = W.depth, clipBlit = (bm, sx, sy, v) => { sx = Math.round(sx); sy = Math.round(sy); const lim = v - 3; for (let j = 0; j < bm.h; j++) { const y = sy + j, vy = y - oy; if (vy < 0 || vy >= VH || y < 0 || y >= WH) continue; for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i]; if (!c) continue; const x = sx + i, vx = x - ox; if (vx < 0 || vx >= VW || x < 0 || x >= WW || DEP[y * WW + x] < lim) continue; fb[vy * VW + vx] = c; } } };
      for (const th of list) {
        if (th.me) {
          const set = env.moving ? (facing === 'side' ? runner.side : facing === 'up' ? runner.up : runner.down) : (facing === 'side' ? runner.sideIdle : facing === 'up' ? runner.upIdle : runner.downIdle);
          const bm = set[Math.floor(Math.abs(leg.to - leg.from) * q * here.P.len / (facing === 'side' ? 4.2 : 5)) % set.length];
          // Ground nearer the camera than he is stands in front of him: what was there is put back over him.
          const X = Math.round(th.x - ox), Y = Math.round(th.y - oy), vMe = vOn(leg.path, th.x, th.y), x0 = Math.max(0, X - 12), x1 = Math.min(VW - 1, X + 12), y0 = Math.max(0, Y - 30), y1 = Math.min(VH - 1, Y + 3);
          { let n = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) saved[n++] = fb[y * VW + x]; }
          scr.shadow(X, Y, 5, 2);
          scr.put(bm, th.x - ox, th.y - oy, flip && facing === 'side');
          { let n = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++, n++) if (W.vAt(x + ox, y + oy) < vMe - 3) fb[y * VW + x] = saved[n]; }
          focus = { x: Math.round(th.x - ox), y: Math.round(th.y - oy) - 14 };
        } else if (th.ferryHull) {
          crit.drawHull(scr, ox, oy, t);
        } else if (th.cat) {
          kit.drawOne(scr, th.cat, ox, oy, t);
        } else if (th.kind === 'tree') {
          const { tree, x, y, clip, v } = th.t;
          for (const part of tree.parts) {
            const [wx, wy] = breeze(x + (part.lx || 0), y + part.y, tq, part.sway);
            if (clip) clipBlit(part.bm, x + part.x + wx, y + part.y + wy, v); else scr.blit(part.bm, x + part.x + wx - ox, y + part.y + wy - oy);
          }
        } else if (th.critter) {
          crit.draw(scr, th, ox, oy, t);
        } else if (th.fern) {
          const [wx] = breeze(th.x, th.y, tq, 0.6);
          scr.blit(th.bm, th.x - th.bm.ox + wx - ox, th.y - th.bm.oy - oy);
        } else if (th.flag) {
          scr.blit(flags[Math.floor(t * 5) & 1], th.x - 2 - ox, th.y - th.lift - 15 - oy - Math.round(2 * lifted[W.DEST.indexOf(th.flag)]));
        } else if (th.lift) {
          scr.blit(th.bm, th.x - th.bm.ox - ox, th.y - th.lift - th.bm.oy - oy);
          if (th.rope) for (let j = 1; j < 12; j++) scr.set(th.x + Math.round(j * 0.25) - ox, th.y - 70 + j - oy, R.yellow[0]);
        } else if (th.clip) clipBlit(th.bm, th.x - th.bm.ox, th.y - th.bm.oy, th.v); else scr.blit(th.bm, th.x - th.bm.ox - ox, th.y - th.bm.oy - oy);
      }

      // Cloud shadows cross the meadow: everything under one goes a step darker, with a soft edge.
      for (let k = 0; DEBUG.clouds && k < 4; k++) {
        const cw = 78 + 30 * hash(k, 1, 91), chh = 24 + 10 * hash(k, 2, 91), cxw = ((k * 310 + t * (5 + k * 1.3)) % (WW + 300)) - 150, cyw = 620 + hash(k, 3, 91) * 380;
        const y0 = Math.max(0, Math.round(cyw - chh - oy)), y1 = Math.min(VH - 1, Math.round(cyw + chh - oy)), x0 = Math.max(0, Math.round(cxw - cw - ox)), x1 = Math.min(VW - 1, Math.round(cxw + cw - ox));
        for (let y = y0; y <= y1; y++) { const wy = y + oy; if (wy < 560) continue; for (let x = x0; x <= x1; x++) {
          const nx = (x + ox - cxw) / cw, ny = (wy - cyw) / chh, d = nx * nx + ny * ny + 0.22 * Math.sin(nx * 7 + k) * Math.sin(ny * 5 + k * 2);
          if (d < 0.82 || (d < 1 && ((x + ox + wy) & 1))) { const i = y * VW + x; fb[i] = SHADE[fb[i]]; }
        } }
      }
      // The boot track on the glacier, then the mist over the forest and the fog bank off the coast.
      for (const [x, y, c] of trackPix) scr.set(x - ox, y - oy, c);
      if (DEBUG.mist) crit.mist(scr, ox, oy, t, env.hideMe ? null : here);
      kit.drawOver(scr, ox, oy, t);
      // Smoke from the stove at base camp, drifting off with the wind.
      for (let k = 0; k < 6; k++) {
        const age = frac(t * 0.35 + k / 6), x = Math.round(spots.tents[0][0] + 9 + age * 10 + Math.sin(age * 6 + k) * 1.5) - ox, y = Math.round(spots.tents[0][1] - age * 26) - oy;
        if (x < 1 || y < 1 || x >= VW - 1 || y >= VH - 1) continue;
        const c = age < 0.5 ? R.white[1] : R.white[0];
        fb[y * VW + x] = c; if (age > 0.3) fb[y * VW + x + 1] = c;
      }
      if (DEBUG.animals) crit.over(scr, ox, oy, t, env);
      // Birds cross the sky in a loose V, flapping a few times a second.
      for (let k = 0; DEBUG.animals && k < 4; k++) {
        const bx = ((t * 22 + k * 11) % (WW + 200)) - 100, by = 250 + 8 * Math.sin(t * 0.7) + [0, 5, 9, 4][k];
        scr.blit(birds[(Math.floor(t * 3) + k) & 1], bx - [0, -9, 9, -17][k] - 3 - ox, by - 2 - oy);
      }
      // Butterflies over the flowers by the Trailhead.
      for (let k = 0; DEBUG.animals && k < 3; k++) {
        const bx = Math.round(T.x - 96 + k * 88 + 14 * Math.sin(t * 0.6 + k * 2)), by = Math.round(T.y + 10 - (k % 3) * 22 + 6 * Math.sin(t * 1.1 + k));
        const sx = bx - ox, sy = by - oy, col = k % 3 ? R.white[1] : R.yellow[1];
        if (sx < 1 || sy < 1 || sx >= VW - 1 || sy >= VH - 1) continue;
        const open = (Math.floor(t * 5) + k) & 1;
        fb[sy * VW + sx] = INK; fb[sy * VW + sx - 1] = col; fb[sy * VW + sx + 1] = col;
        if (open) { fb[(sy - 1) * VW + sx - 1] = col; fb[(sy - 1) * VW + sx + 1] = col; }
      }
      // Fireflies blink in the forest once the light goes.
      if (env.mix > 0.4) for (let k = 0; k < 110; k++) {
        const fx = Math.round(20 + hash(k, 1, 90) * 640 + 6 * Math.sin(t * 0.6 + k)), fy = Math.round(420 + hash(k, 2, 90) * 640 + 4 * Math.sin(t * 0.8 + k * 1.7));
        if (forestAmt(fx, fy) < 0.5 || frac(t * 0.4 + hash(k, 3, 90)) > 0.55) continue;
        scr.set(fx - ox, fy - oy, R.yellow[1]);
      }
      // Shafts of light slant down through the forest canopy: every other pixel one step lighter.
      for (let y = 0; y < VH; y++) {
        const wy = oy + y; if (wy < 300 || wy >= WH) continue;
        for (let x = (y + oy + ox) & 1; x < VW; x += 2) {
          const wx = ox + x; if (wx < 0 || wx >= WW || !shaftMask[wy * WW + wx]) continue;
          const i = y * VW + x; fb[i] = shaftMask[wy * WW + wx] === 2 ? LIGHT[LIGHT[fb[i]]] : LIGHT[fb[i]];
        }
      }
      // The debug panel's outlines, over the finished map.
      if (!env.fixed && (DEBUG.roam || DEBUG.trails || DEBUG.camera)) {
        const dot = (x, y, c) => scr.set(Math.round(x) - ox, Math.round(y) - oy, c);
        const oval = (a, c) => { const n = Math.ceil((a.rx + a.ry) * 2); for (let k = 0; k < n; k += 2) dot(a.x + Math.cos(k / n * TAU) * a.rx, a.y + Math.sin(k / n * TAU) * a.ry, c); };
        const box = (b, c, step) => { for (let x = b.x0; x <= b.x1; x += step) { dot(x, b.y0, c); dot(x, b.y1, c); } for (let y = b.y0; y <= b.y1; y += step) { dot(b.x0, y, c); dot(b.x1, y, c); } };
        // Red ovals: where each animal wanders and each flock circles. Pink boxes: where the cats keep to.
        if (DEBUG.roam) { for (const a of crit.areas()) oval(a, R.red[1]); for (const b of kit.areas()) box(b, R.pink[1], 2); }
        // Each trail as the line he actually follows, with a knot every twenty pixels, and a white cross
        // where the lake loop goes into the forest and where it comes back out.
        if (DEBUG.trails) {
          for (const [k, c] of [['lake', R.red[1]], ['stack', R.yellow[1]], ['spires', R.pink[2]]]) { const P = paths[k]; for (let d = 0; d <= P.len; d++) { const a = P.at(d / P.len); dot(a.x, a.y, c); if (d % 20 === 0) { dot(a.x + 1, a.y, c); dot(a.x - 1, a.y, c); dot(a.x, a.y + 1, c); dot(a.x, a.y - 1, c); } } }
          for (const q of [lakeIn, lakeOut]) { const a = paths.lake.at(q); for (let k = -3; k <= 3; k++) { dot(a.x + k, a.y + k, R.white[1]); dot(a.x + k, a.y - k, R.white[1]); } }
        }
        // Yellow: where the middle of the view may go. Orange: where a drag starts to be pushed back.
        // White: the edge of the world. Yellow cross: where the camera rests. White cross: the middle of the view.
        if (DEBUG.camera) {
          box({ x0: VW / 2, x1: WW - VW / 2, y0: VH / 2, y1: WH - VH / 2 + past }, R.yellow[1], 2);
          box({ x0: VW / 2 + 26, x1: WW - VW / 2 - 26, y0: VH / 2 + 26, y1: WH - VH / 2 - 26 }, R.blaze[1], 3);
          box({ x0: 0, x1: WW - 1, y0: 0, y1: WH - 1 }, R.white[1], 1);
          for (let k = -4; k <= 4; k++) { dot(cam.x + k, cam.y, R.yellow[1]); dot(cam.x, cam.y + k, R.yellow[1]); dot(ox + VW / 2 + k, oy + VH / 2, R.white[1]); dot(ox + VW / 2, oy + VH / 2 + k, R.white[1]); }
        }
      }
    }
  };
}

export { loadBake };
