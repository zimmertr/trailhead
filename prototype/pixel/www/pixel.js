// Trailhead as SNES-style pixel art. This file runs the show: it owns the screen, the one number
// that says how far along a route he is, and the cut from one scene to the next. Each scene lives
// in its own file and only has to draw itself for a given place along its stretch of the route.

import { clamp, Screen } from './core.js';
import { makeWorld } from './world.js';

// Scenes beyond the world map are built the first time a route needs them.
const MAKERS = {
  forest: () => import('./forest.js').then(m => m.makeForest()),
  lakeside: () => import('./lakeside.js').then(m => m.makeLakeside()),
  wall: () => import('./wall.js').then(m => m.makeWall()),
  camp: () => import('./camp.js').then(m => m.makeCamp()),
  climb: () => import('./climb.js').then(m => m.makeClimb()),
  offroute: () => import('./offroute.js').then(m => m.makeOffroute())
};
const READY = ['forest', 'lakeside', 'wall', 'camp', 'climb', 'offroute'];

const SPIRES = ['bluebird', 'tks', 'hevy-garmin-sync', 'trailhead', 'yggdrasil', 'kubernetes-manifests'];

export async function mount(canvas, { onEvent = () => {}, theme = 'light' } = {}) {
  const scr = new Screen(canvas);
  const world = makeWorld();
  const scenes = { world };
  async function need(names) {
    for (const n of names) if (!scenes[n] && READY.includes(n)) scenes[n] = await MAKERS[n]();
  }

  // A route is a list of legs, each one scene drawing one stretch. Legs are weighted by how long
  // they take, so the timeline runs at an even pace across scene changes.
  const ROUTES = {
    lake: () => [['world', { path: 'lake', from: 0, to: world.lakeIn }], ['forest', {}], ['lakeside', {}], ['world', { path: 'lake', from: world.lakeOut, to: 1 }]],
    stack: () => [['world', { path: 'stack', from: 0, to: 1 }], ['wall', {}], ['world', { path: 'stack', from: 1, to: 0 }]],
    spires: () => [['world', { path: 'spires', from: 0, to: 1 }], ['camp', {}]],
    'spires-home': () => [['world', { path: 'spires', from: 1, to: 0 }]],
    'off-route': () => [['offroute', {}]]
  };
  for (const id of SPIRES) ROUTES['spire:' + id] = () => [['climb', { id }]];

  let route = 'lake', legs = [], stops = [], cues = [], total = 1;
  let p = 0, running = false, shown = null, mode = theme === 'dark' ? 1 : 0, mix = mode;
  let drawn = null, tr = null, scrubbing = 0, stillAt = performance.now() / 1000;
  const look = { x: 0, y: 0 };
  let done = {};
  try { done = JSON.parse(localStorage.getItem('trailhead.done') || '{}') || {}; } catch { done = {}; }
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
  function showStop(s) { shown = s; emit({ type: 'stop', id: s.id }); }
  function leave() { if (shown) { shown = null; emit({ type: 'leave' }); } }
  function finish() {
    running = false;
    const first = !done[route];
    if (route === 'lake' || route === 'stack') done[route] = true;
    if (route.startsWith('spire:')) { done[route] = true; done.spires = true; }
    saveDone();
    if (first && done[route]) emit({ type: 'sfx', name: 'flag' });
    emit({ type: 'end', route });
  }

  function step(dt) {
    if (!running || (tr && tr.phase === 'out')) return;
    const before = p;
    let next = Math.min(1, p + dt / total);
    const hit = stops.find(s => s.at > before + 1e-6 && s.at <= next + 1e-6);
    if (hit) next = hit.at;
    for (const c of cues) if (c.at > before + 1e-6 && c.at <= next + 1e-6) emit({ type: 'sfx', name: c.name });
    p = next;
    if (hit) { running = false; showStop(hit); return; }
    if (p >= 1) finish();
  }

  let last = performance.now(), alive = true, lastAct = performance.now() / 1000, dragging = null;
  const acted = () => { lastAct = performance.now() / 1000; };
  addEventListener('pointerdown', acted); addEventListener('keydown', acted);
  const onResize = () => scr.resize();
  addEventListener('resize', onResize);
  const env = { t: 0, tq: 0, dt: 0, mix: 0, moving: false, running: false, home: false, idle: 0, look, done, shown: null, sfx: name => emit({ type: 'sfx', name }), emit };

  function draw(now) {
    if (!alive) return;
    requestAnimationFrame(draw);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    step(dt);
    mix += (mode - mix) * (1 - Math.exp(-dt * 3)); if (Math.abs(mix - mode) < 0.002) mix = mode;
    if (dragging !== 'look') { look.x *= Math.exp(-dt * 2.5); look.y *= Math.exp(-dt * 2.5); }
    if (scrubbing > 0) scrubbing -= dt;

    // The cut between scenes: a round window closes on him, the scene changes, it opens again.
    const want = legAt(p);
    if (want !== drawn && !tr) {
      if (want.s === 'world' && drawn.s === 'world') drawn = want;
      else { tr = { phase: 'out', k: 0, fast: scrubbing > 0 || !running }; emit({ type: 'sfx', name: 'iris' }); }
    }
    if (tr) {
      tr.k += dt / (tr.fast ? 0.14 : tr.phase === 'out' ? 0.3 : 0.36);
      if (tr.k >= 1) {
        if (tr.phase === 'out') { drawn = legAt(p); drawn.scene.enter(scr, drawn.arg, local(drawn, p)); tr = { phase: 'in', k: 0, fast: tr.fast }; emit({ type: 'scene', name: drawn.s }); }
        else tr = null;
      }
    }
    const q = drawn === legAt(p) ? local(drawn, p) : (p > drawn.t1 ? 1 : 0);
    env.t = t; env.tq = Math.floor(t * 10) / 10; env.dt = dt; env.mix = mix;
    env.running = running; env.moving = running || scrubbing > 0; env.shown = shown ? shown.id : null;
    env.home = !running && p === 0 && !shown && scrubbing <= 0 && legs[0].s === 'world' && legs[0].arg.from === 0;
    env.idle = env.home && dragging == null ? t - lastAct : 0;
    if (env.moving || tr) stillAt = t;
    env.still = t - Math.max(stillAt, lastAct);
    drawn.scene.draw(scr, env, drawn.arg, q);
    if (tr) {
      const f = drawn.scene.focus(), e = tr.k * tr.k * (3 - 2 * tr.k), full = Math.hypot(Math.max(f.x, scr.VW - f.x), Math.max(f.y, scr.VH - f.y)) + 6;
      scr.iris(f.x, f.y, tr.phase === 'out' ? full * (1 - e) - 4 : full * e);
    }
    scr.present(t, mix);
    const f = drawn.scene.focus();
    window.__info = { p, route, running, scene: drawn.s, VW: scr.VW, VH: scr.VH, S: scr.S, fx: f.x, fy: f.y };
  }
  drawn.scene.enter(scr, drawn.arg, 0);
  requestAnimationFrame(draw);

  // Drag to look around; it drifts back when let go. A press that does not move is a click on
  // whatever is under it.
  let lastPt = null, moved = 0, hover = null;
  const toView = e => { const k = (window.devicePixelRatio || 1) / scr.S; return [e.clientX * k, e.clientY * k]; };
  canvas.addEventListener('pointerdown', e => { dragging = 'look'; moved = 0; lastPt = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (dragging === 'look' && lastPt) {
      const k = (window.devicePixelRatio || 1) / scr.S;
      moved += Math.abs(e.clientX - lastPt[0]) + Math.abs(e.clientY - lastPt[1]);
      look.x = clamp(look.x - (e.clientX - lastPt[0]) * k, -1000, 1000); look.y = clamp(look.y - (e.clientY - lastPt[1]) * k, -720, 720);
      lastPt = [e.clientX, e.clientY];
      return;
    }
    const [x, y] = toView(e), h = drawn.scene.pick ? drawn.scene.pick(x, y) : null;
    if ((h && h.label) !== (hover && hover.label)) { hover = h; canvas.style.cursor = h ? 'pointer' : ''; const k = scr.S / (window.devicePixelRatio || 1); emit({ type: 'hover', label: h ? h.label : null, x: h ? h.x * k : 0, y: h ? h.y * k : 0 }); }
  });
  const endLook = e => {
    if (dragging === 'look' && moved < 5 && e.type === 'pointerup') {
      const [x, y] = toView(e), h = drawn.scene.pick ? drawn.scene.pick(x, y) : null;
      if (h) { const k = scr.S / (window.devicePixelRatio || 1); if (h.label) emit({ type: 'hover', label: h.label, x: h.x * k, y: h.y * k, tap: true }); if (h.act) { if (!drawn.scene.act || !drawn.scene.act(h.act, env)) emit({ type: 'act', id: h.act }); } }
    }
    if (dragging === 'look') dragging = null; lastPt = null;
  };
  canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', endLook);

  const stopNear = q => stops.find(s => Math.abs(s.at - q) < 0.006);
  const api = {
    stops: () => stops.map(s => ({ id: s.id, at: s.at })),
    route: () => route,
    async setRoute(r) {
      if (!ROUTES[r]) return;
      await need(ROUTES[r]().map(l => l[0]));
      plan(r); p = 0; running = false; leave();
    },
    theme: () => mode ? 'dark' : 'light',
    setTheme(th) { mode = th === 'dark' ? 1 : 0; },
    start() { if (p >= 1) p = 0; leave(); running = true; },
    stop() { running = false; },
    toggle() { if (running) running = false; else api.start(); },
    running: () => running,
    progress: () => p,
    scrub(f) {
      p = clamp(f, 0, 1); running = false; scrubbing = 0.16;
      const s = stopNear(p); if (s) { if (shown !== s) { shown = null; showStop(s); } } else leave();
    },
    key(code) {
      if (code === 'Space') { api.toggle(); return true; }
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
    forget() { for (const k in done) delete done[k]; saveDone(); },
    // Marks routes as finished without walking them (the screenshots use it).
    mark(list) { for (const k of list) { done[k] = true; if (k.startsWith('spire:')) done.spires = true; } },
    // How many screen pixels one pixel of the world takes, in CSS pixels.
    scale: () => scr.S / (window.devicePixelRatio || 1),
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
    mapImage(x, y, w, h) {
      const cv = document.createElement('canvas'), still = new Screen(cv, [w, h]);
      world.still(still, x, y, env); still.present(env.t, mix);
      return cv;
    },
    spires: () => SPIRES.slice(),
    // Names to pin on the scene, in CSS pixels: the six summits at base camp.
    labels() { const k = scr.S / (window.devicePixelRatio || 1); return drawn.scene.labels && !tr ? drawn.scene.labels().map(l => ({ ...l, x: l.x * k, y: l.y * k })) : []; },
    // Puts him at a milestone by name, with its card open.
    goto(id) { const s = stops.find(q => q.id === id); if (!s) return false; running = false; scrubbing = 0.16; p = s.at; shown = null; showStop(s); return true; },
    info: () => ({ lengths: world.lengths() }),
    dispose() { alive = false; removeEventListener('resize', onResize); }
  };
  return api;
}
