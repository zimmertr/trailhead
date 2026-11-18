// Trailhead as SNES-style pixel art. This file runs the show: it owns the screen, the one number
// that says how far along a route he is, and the cut from one scene to the next. Each scene lives
// in its own file and only has to draw itself for a given place along its stretch of the route.

import { clamp, lerp, Screen, DEBUG, R } from './core.js';
import { makeWorld } from './world.js';
import { BAKE } from './land.js';

// Scenes beyond the world map are built the first time a route needs them.
const MAKERS = {
  forest: () => import('./forest.js').then(m => m.makeForest()),
  lakeside: () => import('./lakeside.js').then(m => m.makeLakeside()),
  // Proficiency Peak is climbed by the West Ridge (section H); ?wall brings back round 3's wall to compare.
  wall: () => new URLSearchParams(location.search).has('wall') ? import('./wall.js').then(m => m.makeWall()) : import('./ridge.js').then(m => m.makeRidge()),
  camp: () => import('./camp.js').then(m => m.makeCamp()),
  climb: () => import('./climb.js').then(m => m.makeClimb()),
  offroute: () => import('./offroute.js').then(m => m.makeOffroute()),
  larches: () => import('./larches.js').then(m => m.makeLarches()),
  approach: () => import('./approach.js').then(m => m.makeApproach()),
  register: () => import('./register.js').then(m => m.makeRegisterScene())
};
const READY = ['forest', 'lakeside', 'wall', 'camp', 'climb', 'offroute', 'larches', 'approach', 'register'];

const SPIRES = ['bluebird', 'tks', 'hevy-garmin-sync', 'trailhead', 'yggdrasil', 'kubernetes-manifests'];

// breakAt is for testing what happens when something goes wrong: a scene's name makes that scene throw
// the first time it is drawn, 'load:' and a name makes it fail to build, 'renderer' breaks the frame itself.
export async function mount(canvas, { onEvent = () => {}, theme = 'light', breakAt = null } = {}) {
  const scr = new Screen(canvas);
  const world = makeWorld();
  const scenes = { world };
  // broken: the stretch of route whose scene threw, left undrawn until he is somewhere else.
  let broken = null, sabotage = breakAt;
  // A scene that cannot be built still gets a place on the route: it throws when he reaches it, and
  // from there it is handled like any other scene that throws.
  const stub = (name, err) => ({ name, dur: () => 1, stops: () => [], elev: () => 0, enter() {}, focus: () => ({ x: 0, y: 0 }), draw() { throw err; } });
  async function need(names) {
    for (const n of names) if (!scenes[n] && READY.includes(n)) {
      try { if (sabotage === 'load:' + n) throw new Error('Broken on purpose: loading ' + n); scenes[n] = await MAKERS[n](); }
      catch (err) { console.error(err); scenes[n] = stub(n, err); }
    }
  }

  // A route is a list of legs, each one scene drawing one stretch. Legs are weighted by how long
  // they take, so the timeline runs at an even pace across scene changes.
  const ROUTES = {
    lake: () => [['world', { path: 'lake', from: 0, to: world.lakeIn }], ['forest', {}], ['lakeside', {}], ['world', { path: 'lake', from: world.lakeOut, to: 1 }]],
    // The larch basin runs the way the map's trail was heading over its last tenth (G1).
    stack: () => [['world', { path: 'stack', from: 0, to: 1 }], ['larches', { dir: [0.9, 0.93, 0.96, 0.99].reduce((s, q) => s + world.paths.stack.at(q).dx, 0) < 0 ? -1 : 1 }], ['wall', {}], ['world', { path: 'stack', from: 1, to: 0 }]],
    // The walk to base camp: the map up to the traverse, then the side-on walk (section J), then camp. It
    // runs the way the map's trail was heading where it hands over.
    spires: () => [['world', { path: 'spires', from: 0, to: world.spiresIn }], ['approach', { dir: [-0.03, -0.01, 0.01, 0.03].reduce((s, d) => s + world.paths.spires.at(clamp(world.spiresIn + d, 0, 1)).dx, 0) < 0 ? -1 : 1 }], ['camp', {}]],
    'spires-home': () => [['world', { path: 'spires', from: 1, to: 0 }]],
    'off-route': () => [['offroute', {}]],
    // The register (L2): he walks the few steps to the box (the first 55% of 1.3 s), stands at it while
    // its front comes down, then the close-up of the book.
    // One click on the box opens the book straight away, as the board opens its sheet (TJ, round 5 B2).
    register: () => [['register', {}]],
    // Closing the book (L6): back on the map where he stands at the junction (no walk since round 5 B2).
    'register-back': () => [['world', { path: 'register', from: 0, to: 0, secs: 0.05 }]]
  };
  for (const id of SPIRES) ROUTES['spire:' + id] = () => [['climb', { id }]];
  // One stretch of map walked for its own sake: back to the junction from part way along a trail.
  // `next` is where he sets off for once he gets there.
  let detour = { path: 'lake', from: 0, to: 0 }, next = null;
  ROUTES.back = () => [['world', { ...detour }]];
  // Click and tap to move (T3): a walk over the trail network to a point on a trail. The network is four
  // branches out from the Trailhead (the lake loop's way out and its way back, the peak's trail, the Spires'
  // trail), each sampled every 2 pixels. Two branches run together from the Trailhead until they part, so a
  // walk from one to another goes back to where they part and out along the other, by the shortest way.
  let walkLegs = [], walkMark = null, BR = null;
  ROUTES.walk = () => walkLegs.map(([path, from, to]) => ['world', { path, from, to }]);
  const branches = () => BR || (BR = [['lake', 0, world.lakeIn], ['lake', 1, world.lakeOut], ['stack', 0, 1], ['spires', 0, 1]].map(([path, a, b]) => {
    const P = world.paths[path], n = Math.max(2, Math.ceil(P.len * Math.abs(b - a) / 2)), pts = [];
    for (let k = 0; k <= n; k++) { const s = a + (b - a) * k / n, q = P.at(s); pts.push({ s, f: k / n, x: q.x, y: q.y }); }
    return { path, a, b, pts };
  }));
  const nearestOn = (B, x, y) => { let best = null, bd = 1e9; for (const q of B.pts) { const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; best = q; } } return { q: best, d: bd }; };
  const fracOf = (B, s) => (s - B.a) / (B.b - B.a);
  // Where branches i and j part: the last point of i still within 3 pixels of j, and its match on j.
  const PART = new Map(), partOf = (i, j) => { const key = i * 4 + j; if (PART.has(key)) return PART.get(key);
    const A = branches()[i], B = branches()[j]; let last = A.pts[0]; for (const q of A.pts) { if (nearestOn(B, q.x, q.y).d > 3) break; last = q; }
    const r = [last.s, nearestOn(B, last.x, last.y).q.s]; PART.set(key, r); return r; };
  // The branch he is on and where, from the leg of the map he is walking or standing at the end of.
  function hereOnTrail() {
    const l = legAt(p); if (!l || l.s !== 'world') return null; const a = l.arg, u = lerp(a.from, a.to, local(l, p));
    if (a.path === 'register') return { i: 0, s: 0 };
    const i = a.path === 'lake' ? (u <= world.lakeIn + 1e-6 ? 0 : 1) : a.path === 'stack' ? 2 : a.path === 'spires' ? 3 : -1;
    return i < 0 ? null : { i, s: u };
  }
  function planWalk(from, to) {
    const Bs = branches(), I = Bs[from.i], J = Bs[to.i];
    if (from.i === to.i) return [[I.path, from.s, to.s]];
    const [dI, dJ] = partOf(from.i, to.i);
    if (fracOf(I, from.s) <= fracOf(I, dI)) { const q = I.path === J.path && I.a === J.a ? { s: from.s } : nearestOn(J, ...(p => [p.x, p.y])(world.paths[I.path].at(from.s))).q; return [[J.path, q.s, to.s]]; }
    if (fracOf(J, to.s) <= fracOf(J, dJ)) { const q = nearestOn(I, ...(p => [p.x, p.y])(world.paths[J.path].at(to.s))).q; return [[I.path, from.s, q.s]]; }
    return [[I.path, from.s, dI], [J.path, dJ, to.s]];
  }
  // A click at (sx, sy) in pixels of the view: within 24 CSS pixels of a trail (the same feel at every zoom)
  // he walks there; anywhere else it does nothing. Says whether he set off.
  async function walkTo(sx, sy) {
    if (drawn.s !== 'world' || tr) return false;
    const w = world.at(sx, sy), reach = 24 * (window.devicePixelRatio || 1) / scr.S;
    let best = null; branches().forEach((B, i) => { const n = nearestOn(B, w.x, w.y); if (n.d < reach && (!best || n.d < best.d)) best = { i, s: n.q.s, d: n.d, x: n.q.x, y: n.q.y }; });
    const here = hereOnTrail(); if (!best || !here) return false;
    walkLegs = planWalk(here, best).filter(([, a, b]) => Math.abs(a - b) > 1e-5); if (!walkLegs.length) return false;
    plan('walk'); p = 0; next = null; leave(); walkMark = { x: best.x, y: best.y }; running = true; emit({ type: 'walk' });
    return true;
  }

  let route = 'lake', legs = [], stops = [], cues = [], total = 1;
  let p = 0, running = false, shown = null, mix = theme === 'dark' ? 1 : 0;
  // One world clock for day and dusk (T76), on the map and in every scene. A cycle is 390 s: 165 of day, a 30 s
  // sunset, 165 of dusk, a 30 s sunrise; a visit starts at the beginning of day. AUTO follows it; DAY or DUSK
  // hold that light until switched back. The palettes blend through the sunset and the sunrise (the LUT in
  // core.js is rebuilt in 65 steps, so the blend costs nothing per pixel). time=<seconds into the cycle> in the
  // address sets the clock, for screenshots.
  const CYCLE = 390, SUNSET = 165, DUSK_AT = 195, SUNRISE = 360;
  const clock = { mode: theme === 'dark' ? 'dusk' : 'auto', t: (typeof location !== 'undefined' && +(/[?&]time=([\d.]+)/.exec(location.search) || [])[1]) || 0, speed: 1 };
  const cycleMix = s => { s = ((s % CYCLE) + CYCLE) % CYCLE; const e = v => v * v * (3 - 2 * v); return s < SUNSET ? 0 : s < DUSK_AT ? e((s - SUNSET) / 30) : s < SUNRISE ? 1 : 1 - e((s - SUNRISE) / 30); };
  // A visitor who asked for reduced motion gets no day going by on its own (K1): AUTO holds Day until they
  // choose Dusk or Day themselves.
  const stillQ = typeof window !== 'undefined' && window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null, still = () => !!stillQ && stillQ.matches;
  const autoMix = () => (still() ? 0 : cycleMix(clock.t));
  if (clock.mode === 'auto') mix = autoMix();   // the first frame already has the light of its time
  let darkNow = mix > 0.5;
  let drawn = null, tr = null, scrubbing = 0, stillAt = performance.now() / 1000;
  // Held down, Space or the Start button doubles his pace for as long as it is held.
  const FAST = 2; let fast = false, pace = 1;
  const look = { x: 0, y: 0 }, FREE = { x0: -150, x1: 150, y0: -40, y1: 40 };
  let recentre = false, wasRunning = false;
  // Zoom, on the map only. The pixel size eases toward the one asked for, any size in between, about
  // the point under the pointer. It goes out until the map fills the window one way (the whole map shows
  // along that edge) and in to twice the size that suits the window. Left alone, it settles on a whole
  // pixel size so the pixels are crisp again (debug: snap).
  // zSet: the first change of size (from the page's own to the opening's) has happened. That one is not
  // anchored to the middle of the screen, so the opening view rests where the world frames it (E5h).
  let zT = 0, zC = 0, zAt = null, zLast = 0, zDir = 0, glide = null, zSet = false;
  // The hand-off (F6). Setting out from the Trailhead, the view takes 2 seconds to go from the opening frame to
  // following him and from the opening's size to the travelling size, while he is already running; coming home
  // it does the same backwards. lead: 0 at home, 1 away (eased). A zoom of the visitor's own stops the size's
  // part until the next hand-off (zUser).
  const HAND = 2; let homeAt = 0, leadT = 0, leadTo = 0, zUser = false, zFrom = 0, zTo = 0;
  const zOpen = () => scr.narrow ? scr.S0 : Math.min(scr.S0, 2 * (window.devicePixelRatio || 1));
  const calm = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const zoomRange = () => { const dpr = window.devicePixelRatio || 1, fit = Math.max(innerWidth * dpr / world.WW, innerHeight * dpr / world.WH); return [Math.min(scr.S0, fit), scr.S0 * 2]; };
  function zoomTo(z, at) {
    if (drawn.s !== 'world' || tr) return false;
    zUser = true;
    const [lo, hi] = zoomRange(), was = zT || scr.S; zT = clamp(z, lo, hi); zAt = at || null; zLast = performance.now(); if (zT !== was) zDir = Math.sign(zT - was);
    return zT !== was;
  }
  // at: the point of the page, in CSS pixels, that should stay over the same spot of the map.
  // One step, from a key or a button: to the next whole size, or out to the whole map.
  function zoomBy(d, at) {
    const base = zT || scr.S, next = d > 0 ? Math.floor(base + 1e-3) + 1 : Math.ceil(base - 1e-3) - 1;
    const ok = zoomTo(next < zoomRange()[0] ? 0 : next, at); if (ok) emit({ type: 'sfx', name: 'step' }); return ok;
  }
  // A zoom step swaps to a new whole pixel size in one frame, which reads as a jump. So the picture glides
  // from the old view to the new one for a moment and only rests on whole pixels. Zooming in, the last
  // picture at the old size grows over the new one and then gives way to it. Zooming out, the new, wider
  // picture starts enlarged to where the old one was and settles.
  const GLIDE = 190;
  // Below the map's foot (F9). The view may go past it only by what the timeline bar (and on a phone the junction
  // sign) covers, so the foot can come up above them; what shows in the gaps round their planks is plain ink, the
  // frame's colour, never the copy of the map's lowest rows that used to be drawn there.
  function pastFoot() { const o = world.at(0, 0), y0 = Math.max(0, Math.ceil(world.WH - o.y)); if (y0 < scr.VH) scr.fb.fill(R.ink[0], y0 * scr.VW, scr.VH * scr.VW); }
  function startGlide(g) {
    const dpr = window.devicePixelRatio || 1, o1 = world.at(0, 0), S1 = scr.S, opts = { duration: GLIDE, easing: 'cubic-bezier(.22,.8,.3,1)', fill: 'forwards' };
    if (g.shot) {
      const k = S1 / g.S, dx = (g.o.x - o1.x) * S1 / dpr, dy = (g.o.y - o1.y) * S1 / dpr;
      canvas.after(g.shot);
      glide = { el: g.shot, into: true, k, dx, dy, anim: g.shot.animate([{ transform: 'translate(0px, 0px) scale(1)' }, { transform: `translate(${dx}px, ${dy}px) scale(${k})` }], opts) };
    } else {
      const k = g.S / S1, dx = (o1.x - g.o.x) * g.S / dpr, dy = (o1.y - g.o.y) * g.S / dpr;
      canvas.style.transformOrigin = '0 0';
      glide = { el: null, into: false, k, dx, dy, anim: canvas.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${k})` }, { transform: 'translate(0px, 0px) scale(1)' }], opts) };
    }
    glide.anim.onfinish = glide.anim.oncancel = endGlide;
  }
  function endGlide() { if (!glide) return; const g = glide; glide = null; try { g.anim.cancel(); } catch { /* already over */ } if (g.el) g.el.remove(); }
  // Where a point of the settled view is on the page right now, in CSS pixels, so the name tags can ride along.
  function glidePoint(x, y) {
    if (!glide) return [x, y];
    const tm = glide.anim.effect && glide.anim.effect.getComputedTiming(), e = tm && tm.progress != null ? tm.progress : 1, { k, dx, dy } = glide;
    if (glide.into) { const ke = 1 + (k - 1) * e; return [(x - dx) / k * ke + dx * e, (y - dy) / k * ke + dy * e]; }
    const ke = k + (1 - k) * e; return [x * ke + dx * (1 - e), y * ke + dy * (1 - e)];
  }
  let done = {};
  try { done = JSON.parse(localStorage.getItem('trailhead.done') || '{}') || {}; } catch { done = {}; }
  let found = {};
  try { found = JSON.parse(localStorage.getItem('trailhead.found') || '{}') || {}; } catch { found = {}; }
  const saveDone = () => { try { localStorage.setItem('trailhead.done', JSON.stringify(done)); } catch { /* private window */ } };

  function plan(name) {
    const raw = ROUTES[name]().filter(([s]) => scenes[s]);
    let t = 0;
    legs = raw.map(([s, arg]) => { const dur = scenes[s].dur(arg); const l = { s, scene: scenes[s], arg, dur, a: t }; t += dur; return l; });
    total = t || 1;
    stops = []; cues = [];
    for (const l of legs) {
      l.t0 = l.a / total; l.t1 = (l.a + l.dur) / total;
      for (const st of l.scene.stops(l.arg)) stops.push({ ...st, at: l.t0 + st.at * (l.t1 - l.t0), leg: l });
      if (l.scene.cues) for (const c of l.scene.cues(l.arg)) cues.push({ name: c.name, at: l.t0 + c.at * (l.t1 - l.t0) });
    }
    route = name;
  }
  const legAt = q => legs.find(l => q <= l.t1 + 1e-9) || legs[legs.length - 1];
  const local = (l, q) => clamp((q - l.t0) / Math.max(1e-9, l.t1 - l.t0), 0, 1);
  await need(ROUTES.lake().map(l => l[0]));
  plan('lake');
  drawn = legs[0];

  function emit(e) { try { onEvent(e); } catch (err) { console.error(err); } }
  // Something threw. A scene that throws is left undrawn and the page is told, so it can take him to
  // the off-route page. If it was the map, the off-route page itself, or anything outside the scenes,
  // the world cannot be shown at all: the loop stops and the page falls back to plain text.
  function fail(leg, err) {
    console.error(err);
    const fatal = leg.s === 'world' || leg.s === 'offroute' || leg.s === 'renderer';
    broken = leg; running = false; tr = null; if (sabotage === leg.s) sabotage = null;
    if (fatal) alive = false;
    emit({ type: 'broken', scene: leg.s, fatal });
  }
  function showStop(s) { shown = s; emit({ type: 'stop', id: s.id }); }
  function leave() { if (shown) { shown = null; emit({ type: 'leave' }); } }
  function finish() {
    running = false;
    const first = !done[route];
    if (route === 'lake' || route === 'stack') done[route] = true;
    if (route.startsWith('spire:')) { done[route] = true; done.spires = true; }
    saveDone();
    if (first && done[route]) emit({ type: 'sfx', name: 'flag' });
    const then = next; next = null;
    emit({ type: 'end', route, next: then });
  }

  function step(dt) {
    if (!running || (tr && tr.phase === 'out' && !tr.to)) return;
    // A scene may keep him where he is while something plays out (he swims back before he runs on).
    if (!tr && drawn.scene.hold && drawn.scene.hold(env)) return;
    // A scene may have played on behind a card while it was read (the West Ridge's followers, H17):
    // the timeline catches up by that much as he sets off again.
    if (!tr && drawn.scene.skip) { const sk = drawn.scene.skip(); if (sk > 0) p = Math.min(drawn.t1 - 1e-6, p + sk / total); }
    const before = p;
    pace += ((fast ? FAST : 1) - pace) * (1 - Math.exp(-dt * 9));
    let next = Math.min(1, p + dt * pace / total);
    const hit = stops.find(s => s.at > before + 1e-6 && s.at <= next + 1e-6);
    if (hit) next = hit.at;
    for (const c of cues) if (c.at > before + 1e-6 && c.at <= next + 1e-6) emit({ type: 'sfx', name: c.name });
    p = next;
    if (hit) { running = false; showStop(hit); return; }
    if (p >= 1) finish();
  }

  // The scenes' clock (E5f). It keeps time with the page at 1x; the debug panel can run it at 0 (paused)
  // to 8 times, so every timed thing (the weather, the sea's animals, the forest's) comes round faster.
  // He runs at the same speed, so a pause stops everything. The camera and the cuts between scenes keep
  // the page's own time. speed=<k> in the address sets it, for screenshots.
  const SPEEDS = [0, 0.5, 1, 2, 4, 8];
  let simT = performance.now() / 1000, speed = (() => { const k = typeof location !== 'undefined' ? +(/[?&]speed=([\d.]+)/.exec(location.search) || [])[1] : NaN; return SPEEDS.includes(k) ? k : 1; })();
  let last = performance.now(), alive = true, lastAct = simT, dragging = null;
  const acted = () => { lastAct = simT; };
  addEventListener('pointerdown', acted); addEventListener('keydown', acted);
  const onResize = () => scr.resize();
  addEventListener('resize', onResize);
  // A thing to find, the first time it is found.
  const find = id => { if (found[id]) return; found[id] = 1; try { localStorage.setItem('trailhead.found', JSON.stringify(found)); } catch { /* private window */ } emit({ type: 'found', id }); };
  const env = { t: 0, tq: 0, dt: 0, mix: 0, moving: false, running: false, home: false, idle: 0, look, lookBox: FREE, done, shown: null, sfx: name => emit({ type: 'sfx', name }), emit, found: find };
  // For a scene that shows the map from afar: paints the map over the whole frame, its top left corner at this spot of the world.
  env.mapStill = (x, y) => world.still(scr, x, y, env);

  // The forest's and the lake's pictures are made once the map has been on the screen for a frame,
  // one scene to a turn so a click in between is not kept waiting for both.
  let frames = 0;
  const warm = names => { const s = scenes[names[0]]; if (s && s.warm) s.warm(); if (names.length > 1) setTimeout(warm, 0, names.slice(1)); };
  function draw(now) {
    if (!alive) return;
    requestAnimationFrame(draw);
    try { frame(now); } catch (err) { fail({ s: 'renderer' }, err); }
    if (++frames === 2) setTimeout(warm, 0, ['forest', 'lakeside']);
  }
  function frame(now) {
    if (sabotage === 'renderer') throw new Error('Broken on purpose: the renderer');
    const raw = Math.max(0, (now - last) / 1000), dt = Math.min(0.05, raw); last = now;
    simT += Math.min(raw, 1) * speed;
    const t = simT, sdt = dt * speed;
    step(sdt);
    clock.t = (clock.t + sdt * clock.speed) % CYCLE;
    { const goal = clock.mode === 'auto' ? autoMix() : clock.mode === 'dusk' ? 1 : 0; mix += (goal - mix) * (1 - Math.exp(-dt * 3)); if (Math.abs(mix - goal) < 0.002) mix = goal; }
    // The page's own colours (its wood and paper) turn at the middle of the blend.
    if ((mix > 0.5) !== darkNow) { darkNow = mix > 0.5; emit({ type: 'theme', dark: darkNow }); }
    // A dragged view stays where it is left. Let go near the edge of what a scene lets you see and it
    // eases back inside; it returns to him only when he starts or stops moving.
    if (running !== wasRunning) { wasRunning = running; recentre = true; }
    if (dragging !== 'look') {
      // Reduced motion (F7): every ease of the camera is a cut.
      const b = env.lookBox, k = calm.matches ? 1 : 1 - Math.exp(-dt * 7), r = calm.matches ? 0 : Math.exp(-dt * 4);
      if (recentre) { look.x *= r; look.y *= r; if (Math.abs(look.x) + Math.abs(look.y) < 0.5) { look.x = look.y = 0; recentre = false; } }
      else { look.x += (clamp(look.x, b.x0, b.x1) - look.x) * k; look.y += (clamp(look.y, b.y0, b.y1) - look.y) * k; }
    }
    env.lookBox = FREE;
    if (scrubbing > 0) scrubbing -= dt;

    // The cut between scenes: a round window closes on him, the scene changes, it opens again.
    // While he runs, the window starts to close a moment before a stretch ends and is shut just as he
    // reaches the next one, so he never stands still at a scene change. `to` is the stretch it closes for.
    // Under reduced motion the window does not close: the scene simply changes (F7).
    if (running && !tr && scrubbing <= 0 && drawn === legAt(p) && !calm.matches) {
      const nx = legs[legs.indexOf(drawn) + 1], left = (drawn.t1 - p) * total;
      if (legs.includes(drawn) && nx && nx !== broken && !(nx.s === 'world' && drawn.s === 'world') && left > 0.12 && left <= 0.3 && !stops.some(s => s.at > p && s.at <= drawn.t1 + 1e-6)) { tr = { phase: 'out', k: 0, to: nx, lead: left }; emit({ type: 'sfx', name: 'iris' }); }
    }
    const want = legAt(p);
    if (want !== drawn && want !== broken && !tr) {
      if (want.s === 'world' && drawn.s === 'world') drawn = want;
      else { tr = { phase: 'out', k: 0, fast: scrubbing > 0 || !running }; emit({ type: 'sfx', name: 'iris' }); }
    }
    if (tr) {
      tr.k += calm.matches ? 1 : dt / (tr.fast ? 0.14 : tr.lead || (tr.phase === 'out' ? 0.3 : 0.36));
      // He was stopped while the window was closing ahead of the change: it opens again from where it had got to.
      if (tr.to && !running && legAt(p) !== tr.to) tr = { phase: 'in', k: 1 - Math.min(1, tr.k), fast: false };
      if (tr.k >= 1) {
        if (tr.phase === 'out') {
          if (tr.to && legAt(p) !== tr.to) p = Math.min(1, tr.to.t0 + 1e-6);
          drawn = legAt(p);
          // Back on the map from the register's close-up (L6): the map's own pixel size first, so the view
          // is placed for the size it will be drawn at and opens exactly where he left it.
          if (drawn.s === 'world' && route === 'register-back' && zC && scr.S !== zC) scr.setScale(zC);
          try { drawn.scene.enter(scr, drawn.arg, local(drawn, p)); } catch (err) { fail(drawn, err); return; }
          look.x = look.y = 0; tr = calm.matches ? null : { phase: 'in', k: 0, fast: tr.fast }; emit({ type: 'scene', name: drawn.s });
        }
        else tr = null;
      }
    }
    let gliding = null;
    if (drawn.s === 'world') {
      if (zC && zC === zT) zSet = true;
      // It opens at twice one-to-one (TJ, F5a: the one-to-one opening chosen at STOP 2a halved every movement
      // and turned the trees and destinations to noise), never larger than the travelling size; on a phone
      // held upright, at the size that suits it.
      const away = env.home || route.startsWith('register') ? 0 : 1;
      if (away !== leadTo) { leadTo = away; zUser = false; zFrom = zT || zOpen(); zTo = away ? scr.S0 : zOpen(); }
      leadT = calm.matches ? away : clamp(leadT + (away ? dt : -dt) / HAND, 0, 1);
      const easing = leadT > 0 && leadT < 1 && !zUser; env.lead = leadT * leadT * (3 - 2 * leadT);
      if (zT && !zUser && zSet) zT = away ? zFrom + (zTo - zFrom) * env.lead : zTo + (zFrom - zTo) * env.lead;
      const [lo, hi] = zoomRange(); zT = clamp(zT || zOpen(), lo, hi); if (!zC) zC = zT; // the first frame already has the opening's size, with nothing to settle (T1)
      if (DEBUG.snap && !easing && dragging !== 'pinch' && performance.now() - zLast > 260 && zT > 1) { const w = zDir > 0 ? Math.ceil(zT - 0.15) : Math.floor(zT + 0.15); if (w >= lo && w <= hi) zT = w; }
      zC = calm.matches ? zT : zC + (zT - zC) * (1 - Math.exp(-dt * 14)); if (Math.abs(zC - zT) < 0.003) zC = zT;
      if (zC !== scr.S) {
        const dpr = window.devicePixelRatio || 1, at = zAt || [innerWidth / 2, innerHeight / 2], w = world.at(at[0] * dpr / scr.S, at[1] * dpr / scr.S);
        scr.setScale(zC); if (!tr && zSet && zUser) env.anchor = { wx: w.x, wy: w.y, sx: at[0] * dpr / zC, sy: at[1] * dpr / zC };
      }
    } else if (scr.S !== scr.S0) scr.setScale(scr.S0);
    const q = drawn === legAt(p) ? local(drawn, p) : (p > drawn.t1 ? 1 : 0);
    env.t = t; env.tq = Math.floor(t * 10) / 10; env.dt = sdt; env.mix = mix;
    env.walkMark = route === 'walk' && p < 1 ? walkMark : null;
    env.running = running; env.moving = running || scrubbing > 0; env.shown = shown ? shown.id : null;
    env.home = !running && p === 0 && !shown && scrubbing <= 0 && legs[0].s === 'world' && legs[0].arg.from === 0;
    // Idle counts from his arrival home too, so the look round waits until the hand-off home has settled.
    if (!env.home) homeAt = t;
    env.idle = env.home && dragging == null ? t - Math.max(lastAct, homeAt) : 0; env.calm = calm.matches;
    if (env.moving || tr) stillAt = t;
    env.still = t - Math.max(stillAt, lastAct);
    // A scene that threw stays as it was last shown until the page has taken him somewhere else.
    if (drawn === broken) return;
    try {
      if (sabotage === drawn.s) throw new Error('Broken on purpose: ' + drawn.s);
      drawn.scene.draw(scr, env, drawn.arg, q);
      if (drawn.s === 'world') pastFoot();
    } catch (err) { fail(drawn, err); return; }
    // The debug panel's tap targets: every other pixel that answers a tap or a hover, in any scene, goes pink.
    if (DEBUG.taps && !tr && drawn.scene.pick) { const { VW, VH, fb } = scr; for (let y = 0; y < VH; y++) for (let x = y & 1; x < VW; x += 2) if (drawn.scene.pick(x, y)) fb[y * VW + x] = R.pink[1]; }
    scr.night(t, mix);
    if (tr) {
      const f = drawn.scene.focus(), e = tr.k * tr.k * (3 - 2 * tr.k), full = Math.hypot(Math.max(f.x, scr.VW - f.x), Math.max(f.y, scr.VH - f.y)) + 6;
      scr.iris(f.x, f.y, tr.phase === 'out' ? full * (1 - e) - 4 : full * e);
    }
    scr.present(t, mix);
    if (gliding && !calm.matches) startGlide(gliding);
    const f = drawn.scene.focus();
    window.__info = { p, route, running, baked: BAKE.used, bakeNote: BAKE.note, scene: drawn.s, VW: scr.VW, VH: scr.VH, S: scr.S, fx: f.x, fy: f.y, o: drawn.s === 'world' ? world.at(0, 0) : null, pose: drawn.s === 'world' ? world.pose() : null };
  }
  drawn.scene.enter(scr, drawn.arg, 0);
  requestAnimationFrame(draw);

  // Drag to look around. The view pushes back as it nears a scene's limit. A press that does not move is a click on
  // whatever is under it.
  let lastPt = null, moved = 0, hover = null;
  const toView = e => { const k = (window.devicePixelRatio || 1) / scr.S; return [e.clientX * k, e.clientY * k]; };
  // What is under a point. A fingertip is blunt, so a touch that misses also tries the ground close around it.
  const probe = (x, y, blunt) => { if (!drawn.scene.pick) return null; let h = drawn.scene.pick(x, y); if (!h && blunt) for (const r of [5, 9]) for (let a = 0; a < 8 && !h; a++) h = drawn.scene.pick(x + r * Math.cos(a * Math.PI / 4), y + r * Math.sin(a * Math.PI / 4)); return h; };
  // Two fingers pinch to zoom, smoothly, about the point between them.
  const touches = new Map(); let pinch0 = 0, pinchZ = 0;
  const spread = () => { const [a, b] = [...touches.values()]; return [Math.hypot(a[0] - b[0], a[1] - b[1]), [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]]; };
  canvas.addEventListener('wheel', e => { if (drawn.s !== 'world') return; e.preventDefault(); acted(); const dy = clamp(e.deltaY * (e.deltaMode === 1 ? 30 : 1), -240, 240); zoomTo((zT || scr.S) * Math.exp(-dy * 0.0016), [e.clientX, e.clientY]); }, { passive: false });
  canvas.addEventListener('pointerdown', e => { touches.set(e.pointerId, [e.clientX, e.clientY]); if (touches.size > 1) { if (touches.size === 2) { dragging = 'pinch'; pinch0 = spread()[0]; pinchZ = zT || scr.S; lastPt = null; } try { canvas.setPointerCapture(e.pointerId); } catch { /* a pointer the browser no longer knows */ } return; } dragging = 'look'; recentre = false; moved = 0; lastPt = [e.clientX, e.clientY]; try { canvas.setPointerCapture(e.pointerId); } catch { /* a pointer the browser no longer knows */ } });
  canvas.addEventListener('pointermove', e => {
    // Where a mouse rests, in pixels of the picture, for things that notice being looked at (critters.js).
    if (e.pointerType === 'mouse') env.ptr = toView(e);
    if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (dragging === 'pinch' || dragging === 'held') { if (dragging === 'pinch' && touches.size === 2) { const [d, mid] = spread(); if (pinch0 > 0) zoomTo(pinchZ * d / pinch0, mid); } return; }
    if (dragging === 'look' && lastPt) {
      const k = (window.devicePixelRatio || 1) / scr.S;
      moved += Math.abs(e.clientX - lastPt[0]) + Math.abs(e.clientY - lastPt[1]);
      const b = env.lookBox, push = (v, d, lo, hi) => { const over = d < 0 ? lo - v : v - hi; return v + d * (over > 0 ? Math.max(0, 1 - over / 26) : 1); };
      look.x = push(look.x, -(e.clientX - lastPt[0]) * k, b.x0, b.x1); look.y = push(look.y, -(e.clientY - lastPt[1]) * k, b.y0, b.y1);
      lastPt = [e.clientX, e.clientY];
      return;
    }
    const [x, y] = toView(e), h = drawn.scene.pick ? drawn.scene.pick(x, y) : null;
    if ((h && h.label) !== (hover && hover.label)) { hover = h; canvas.style.cursor = h ? 'pointer' : ''; const k = scr.S / (window.devicePixelRatio || 1), tipped = h && !h.named; emit({ type: 'hover', label: tipped ? h.label : null, x: tipped ? h.x * k : 0, y: tipped ? h.y * k : 0 }); }
  });
  const endLook = e => {
    touches.delete(e.pointerId);
    // After a pinch the finger still down neither drags nor clicks.
    if (dragging === 'pinch' || dragging === 'held') { dragging = touches.size ? 'held' : null; lastPt = null; return; }
    if (dragging === 'look' && moved < 5 && e.type === 'pointerup') {
      const [x, y] = toView(e), h = probe(x, y, e.pointerType !== 'mouse');
      if (!h) walkTo(x, y);
      if (h) { const k = scr.S / (window.devicePixelRatio || 1); if (h.label && !h.named) emit({ type: 'hover', label: h.label, x: h.x * k, y: h.y * k, tap: true }); if (h.act) { if (!drawn.scene.act || !drawn.scene.act(h.act, env)) emit({ type: 'act', id: h.act }); else { hover = null; emit({ type: 'hover', label: null, x: 0, y: 0 }); } } }
    }
    if (dragging === 'look') dragging = null; lastPt = null;
  };
  canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', endLook);
  // The pointer has left the world (onto a sign or a name tag, or off the page): drop the hover label.
  canvas.addEventListener('pointerleave', () => { env.ptr = null; if (hover) { hover = null; canvas.style.cursor = ''; emit({ type: 'hover', label: null, x: 0, y: 0 }); } });

  const stopNear = q => stops.find(s => Math.abs(s.at - q) < 0.006);
  const api = {
    // For screenshots: put the dragged view somewhere, in scene pixels from where the camera rests.
    look(x, y) { look.x = x; look.y = y; recentre = false; },
    stops: () => stops.map(s => ({ id: s.id, at: s.at })),
    route: () => route,
    // For the debug panel: makes the scene he is in throw on its next frame.
    breakScene() { sabotage = drawn.s; },
    // For the debug panel (E5f): the scenes' clock, its speed, and starting a timed event now in the
    // scene he is in (false if that scene has no such event).
    now: () => simT, speeds: SPEEDS, speed: () => speed, setSpeed(k) { if (SPEEDS.includes(k)) speed = k; },
    trigger(name) { const s = drawn.scene; return !!(s.trigger && !tr && s.trigger(name, simT)); },
    // For the debug menu (C4): the scene on screen, the map animals and their homes, placing one, and a jump to
    // the start of any scene (the first route that has it, a little way in).
    scene: () => drawn ? drawn.s : null,
    spawnList: () => world.spawnList(),
    spawn: (kind, i) => world.spawn(kind, i),
    async jumpTo(name) {
      const r = Object.keys(ROUTES).find(k => !/back|home/.test(k) && ROUTES[k]().some(([n]) => n === name)); if (!r) return false;
      await api.setRoute(r); const l = legs.find(g => g.s === name); if (l) api.scrub(l.t0 + 0.03 * (l.t1 - l.t0)); return true;
    },
    async setRoute(r) {
      if (!ROUTES[r]) return;
      await need(ROUTES[r]().map(l => l[0]));
      plan(r); p = 0; running = false; next = null; leave();
    },
    // Sends him to a place on the map from wherever he is on it. Out along a trail he turns round and
    // comes back through the junction; already heading back he carries on and sets off again from there.
    // Says what it did: 'start' (he is at the junction, the page starts the route), 'turn', 'on' or 'home'.
    async go(dest) {
      if (drawn.s !== 'world' || tr || !ROUTES[dest] && dest !== 'trailhead') return null;
      const l = legAt(p), a = l.arg, u = lerp(a.from, a.to, local(l, p));
      // Stood or walking where a click sent him: back to the Trailhead the way he is (on the lake loop's way
      // back, round its end), then off on the route.
      if (route === 'walk') { if (dest !== 'trailhead') await need(ROUTES[dest]().map(x => x[0])); leave(); detour = { path: a.path, from: u, to: a.path === 'lake' && u > world.lakeIn ? 1 : 0 }; plan('back'); p = 0; next = dest === 'trailhead' ? null : dest; running = true; return 'turn'; }
      if (l === legs[0] && a.from === 0 && p === 0) { if (dest === 'trailhead') { recentre = true; return 'home'; } return 'start'; }
      const inbound = a.to === 0 || (a.path === 'lake' && a.to === 1), mine = a.path === dest;
      if (dest !== 'trailhead') await need(ROUTES[dest]().map(x => x[0]));
      leave();
      if (mine && !inbound) { next = null; running = true; return 'on'; }
      if (mine && a.to === 0) {
        // Heading home on the trail he now wants: he turns round where he stands.
        plan(dest); const f = legs[0]; p = f.t0 + clamp((u - f.arg.from) / (f.arg.to - f.arg.from), 0, 1) * (f.t1 - f.t0); next = null; running = true; return 'turn';
      }
      if (inbound) { next = dest === 'trailhead' ? null : dest; running = true; return 'on'; }
      detour = { path: a.path, from: u, to: 0 }; plan('back'); p = 0; next = dest === 'trailhead' ? null : dest; running = true; return 'turn';
    },
    theme: () => darkNow ? 'dark' : 'light',
    setTheme(th) { clock.mode = th === 'dark' ? 'dusk' : th === 'light' ? 'day' : 'auto'; },
    // The world clock (T76): its mode ('auto', 'day', 'dusk'), where it is in the cycle and how fast it runs.
    clock: () => ({ mode: clock.mode, t: clock.t, speed: clock.speed, mix, cycle: CYCLE, sunset: SUNSET, sunrise: SUNRISE }),
    setClock({ mode, t, speed } = {}) { if (mode) clock.mode = mode; if (t != null) clock.t = ((t % CYCLE) + CYCLE) % CYCLE; if (speed) clock.speed = speed; },
    start() { if (route === 'walk' && p >= 1) return; if (p >= 1) p = 0; leave(); running = true; },
    walkTo,
    stop() { running = false; pace = 1; },
    boost(on) { fast = !!on; },
    toggle() { if (running) running = false; else api.start(); },
    running: () => running,
    // The idle tour is running (the first-visit hint keeps out of its way, P1).
    touring: () => drawn.s === 'world' && !!env.touring,
    // Where he stands on the page, in CSS pixels (the first-visit hint keeps off him, P1).
    me: () => { const f = drawn.scene.focus(), k = scr.S / (window.devicePixelRatio || 1); return [f.x * k, f.y * k]; },
    // For test scripts (K1): where a point of a trail on the map is on the page, in CSS pixels, and the
    // fractions where the lake loop leaves for the forest and comes back, and where the Spires' trail hands over.
    trailAt: (path, s) => { const q = world.paths[path].at(s), o = world.at(0, 0), k = scr.S / (window.devicePixelRatio || 1); return [(q.x - o.x) * k, (q.y - o.y) * k]; },
    trailMarks: () => ({ lakeIn: world.lakeIn, lakeOut: world.lakeOut, spiresIn: world.spiresIn }),
    progress: () => p,
    scrub(f) {
      p = clamp(f, 0, 1); running = false; scrubbing = 0.16;
      const s = stopNear(p); if (s) { if (shown !== s) { shown = null; showStop(s); } } else leave();
    },
    // A scene that has something open of its own (the binoculars) takes the keys first, down and up.
    grab(code, down) { return !tr && !!drawn.scene.key && !!drawn.scene.key(code, down, env); },
    key(code) {
      if (code === 'Space') { api.toggle(); return true; }
      if (code === 'Equal' || code === 'NumpadAdd' || code === 'Minus' || code === 'NumpadSubtract') { zoomBy(code === 'Equal' || code === 'NumpadAdd' ? 1 : -1, Math.abs(look.x) + Math.abs(look.y) > 2 ? [innerWidth / 2, innerHeight / 2] : null); return true; }
      if (code === 'ArrowUp' || code === 'KeyW') { if (!running) api.start(); return true; }
      if (code === 'ArrowDown' || code === 'KeyS') { running = false; return true; }
      const fwd = code === 'ArrowRight' || code === 'KeyD';
      if (fwd || code === 'ArrowLeft' || code === 'KeyA') {
        const s = fwd ? stops.find(q => q.at > p + 1e-4) : [...stops].reverse().find(q => q.at < p - 1e-4);
        running = false; scrubbing = 0.16;
        if (s) { p = s.at; shown = null; showStop(s); } else { p = fwd ? 1 : 0; leave(); if (fwd) finish(); }
        return true;
      }
      return false;
    },
    done: () => ({ ...done }),
    forget() { for (const k in done) delete done[k]; saveDone(); for (const k in found) delete found[k]; try { localStorage.removeItem('trailhead.found'); localStorage.removeItem('trailhead.cairn'); } catch { /* private window */ } },
    found: () => ({ ...found }),
    find,
    // For test scripts (L11): where in the view, in CSS pixels, the first thing that answers to a click named
    // act is drawn (a prefix will do), or null. The test then clicks there as a visitor would.
    hitAt(act) {
      if (!drawn.scene.pick) return null; const k = scr.S / (window.devicePixelRatio || 1);
      for (let y = 0; y < scr.VH; y += 2) for (let x = 0; x < scr.VW; x += 2) { const h = drawn.scene.pick(x, y); if (h && h.act && h.act.startsWith(act)) return [Math.round(x * k), Math.round(y * k)]; }
      return null;
    },
    // Marks routes as finished without walking them (the screenshots use it).
    mark(list) { for (const k of list) { done[k] = true; if (k.startsWith('spire:')) done.spires = true; } },
    // How many CSS pixels one pixel of the page's own size takes: the panels are drawn at this size whatever the map's zoom.
    scale: () => scr.S0 / (window.devicePixelRatio || 1),
    // The register's pages in the close-up, in its pixels (L3), once it has been drawn.
    pages: () => drawn && drawn.s === 'register' && drawn.scene.pages ? drawn.scene.pages() : null,
    zoom: (d, at) => zoomBy(d, at),
    // For screenshot scripts: the pixel size the map is drawn at now.
    size: () => scr.S,
    // The ups and downs of the whole route, n heights from start to end. The map knows how high
    // each of its points is; the scenes between two stretches of map are tilted to meet them.
    profile(n = 120) {
      const E = legs.map(l => l.scene.elev ? [l.scene.elev(l.arg, 0), l.scene.elev(l.arg, 1)] : [0, 0]), off = legs.map(() => [0, 0]);
      let level = 0;
      for (let i = 0; i < legs.length; i++) {
        if (legs[i].s === 'world') { level = E[i][1]; continue; }
        let j = i; while (j + 1 < legs.length && legs[j + 1].s !== 'world') j++;
        const rise = E.slice(i, j + 1).reduce((a, e) => a + e[1] - e[0], 0), span = legs.slice(i, j + 1).reduce((a, l) => a + l.dur, 0);
        const miss = j + 1 < legs.length ? E[j + 1][0] - (level + rise) : 0;
        for (let k = i; k <= j; k++) { const a = level - E[k][0], b = a + miss * legs[k].dur / span; off[k] = [a, b]; level = E[k][1] + b; }
        i = j;
      }
      const out = [];
      for (let k = 0; k < n; k++) { const q = k / (n - 1), l = legAt(q), i = legs.indexOf(l), u = local(l, q); out.push((l.scene.elev ? l.scene.elev(l.arg, u) : 0) + off[i][0] + (off[i][1] - off[i][0]) * u); }
      return out;
    },
    // A still picture of part of the map as a canvas, for the trail map.
    // The trail map sheet's dots (L9), found from the routes themselves: a stop on a stretch of map sits on that
    // stretch of trail; one in a scene between two stretches of the same trail (the forest and the shore) sits
    // on the part of trail that scene stands for, by time; one on the climb sits on the line from the foot of
    // the ridge to the summit; base camp at the trail's end; each project on its own summit.
    async mapDots() {
      const out = [{ id: '', x: world.T.x, y: world.T.y, big: true }];
      for (const r of ['lake', 'stack', 'spires']) {
        await need(ROUTES[r]().map(l => l[0]));
        const legs = ROUTES[r]().filter(([n]) => scenes[n]).map(([n, arg]) => ({ n, arg, dur: scenes[n].dur(arg), stops: scenes[n].stops(arg) }));
        legs.forEach((l, i) => { for (const st of l.stops) {
          let pt;
          if (l.n === 'world') { const a = world.paths[l.arg.path].at(lerp(l.arg.from, l.arg.to, st.at)); pt = [a.x, a.y]; }
          else {
            let j = i - 1, k = i + 1; while (j >= 0 && legs[j].n !== 'world') j--; while (k < legs.length && legs[k].n !== 'world') k++;
            const before = legs[j], after = legs[k], P = world.paths[before ? before.arg.path : r];
            if (before && after && before.arg.to !== after.arg.from) {
              let t = 0, T = 0; for (let m = j + 1; m < k; m++) { if (m < i) t += legs[m].dur; else if (m === i) t += st.at * legs[m].dur; T += legs[m].dur; }
              // On the lake loop each scene has its own part of the hidden trail: the forest as far as the lake's
              // outlet, the lakeshore from there on. A stop sits along its own scene's part, by time (round 5, F5).
              const part = r === 'lake' && l.n === 'forest' ? [before.arg.to, world.lakeMid] : r === 'lake' && l.n === 'lakeside' ? [world.lakeMid, after.arg.from] : null;
              const a = P.at(part ? lerp(part[0], part[1], st.at) : lerp(before.arg.to, after.arg.from, t / T)); pt = [a.x, a.y];
            } else if (r === 'stack') {
              // Stops on the climb, spaced evenly from the foot of the ridge to the summit in their order, stepping
              // left and right of the line as a route zigzags up, so their dots stand clear of each other.
              const n = l.stops.length, m = l.stops.indexOf(st), f = (m + 1) / n, a = P.at(1), side = m === n - 1 ? 0 : m % 2 ? 24 : -24;
              pt = [lerp(a.x, world.peakTop[0], f) + side, lerp(a.y, world.peakTop[1], f)];
            }
            else { const a = P.at(before ? before.arg.to : 1); pt = [a.x, a.y]; }
          }
          out.push({ id: st.id, x: Math.round(pt[0]), y: Math.round(pt[1]) });
        } });
      }
      world.spireTops.forEach(([x, y], k) => { if (SPIRES[k]) out.push({ id: SPIRES[k], x, y: y + 3 }); });
      return out;
    },
    mapFrame: () => world.mapFrame(),
    mapImage(x, y, w, h) {
      const cv = document.createElement('canvas'), still = new Screen(cv, [w, h]);
      world.still(still, x, y, env); still.present(env.t, mix);
      return cv;
    },
    spires: () => SPIRES.slice(),
    // Names to pin on the scene, in CSS pixels: the six summits at base camp, the four places on the map.
    labels() { const k = scr.S / (window.devicePixelRatio || 1); return drawn.scene.labels && !tr ? drawn.scene.labels().map(l => { const [x, y] = glidePoint(l.x * k, l.y * k); return { ...l, x, y }; }) : []; },
    // Puts him at a milestone by name, with its card open.
    goto(id) { const s = stops.find(q => q.id === id); if (!s) return false; running = false; scrubbing = 0.16; p = s.at; shown = null; showStop(s); return true; },
    info: () => ({ lengths: world.lengths() }),
    // How long a route takes from the junction and back, in seconds, for the junction sign.
    async routeTime(r) { if (!ROUTES[r]) return 0; await need(ROUTES[r]().map(l => l[0])); return ROUTES[r]().filter(([n]) => scenes[n]).reduce((a, [n, arg]) => a + scenes[n].dur(arg), 0); },
    dispose() { alive = false; removeEventListener('resize', onResize); }
  };
  return api;
}
