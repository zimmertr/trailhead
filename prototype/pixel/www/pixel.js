// Trailhead as SNES-style pixel art. This file runs the show: it owns the screen, the one number
// that says how far along a route he is, and the cut from one scene to the next. Each scene lives
// in its own file and only has to draw itself for a given place along its stretch of the route.

import { clamp, lerp, Screen, DEBUG, R } from './core.js';
import { makeWorld, loadBake } from './world.js';

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

// breakAt is for testing what happens when something goes wrong: a scene's name makes that scene throw
// the first time it is drawn, 'load:' and a name makes it fail to build, 'renderer' breaks the frame itself.
export async function mount(canvas, { onEvent = () => {}, theme = 'light', breakAt = null } = {}) {
  const scr = new Screen(canvas);
  const world = makeWorld(await loadBake());
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
    stack: () => [['world', { path: 'stack', from: 0, to: 1 }], ['wall', {}], ['world', { path: 'stack', from: 1, to: 0 }]],
    spires: () => [['world', { path: 'spires', from: 0, to: 1 }], ['camp', {}]],
    'spires-home': () => [['world', { path: 'spires', from: 1, to: 0 }]],
    'off-route': () => [['offroute', {}]]
  };
  for (const id of SPIRES) ROUTES['spire:' + id] = () => [['climb', { id }]];
  // One stretch of map walked for its own sake: back to the junction from part way along a trail.
  // `next` is where he sets off for once he gets there.
  let detour = { path: 'lake', from: 0, to: 0 }, next = null;
  ROUTES.back = () => [['world', { ...detour }]];

  let route = 'lake', legs = [], stops = [], cues = [], total = 1;
  let p = 0, running = false, shown = null, mode = theme === 'dark' ? 1 : 0, mix = mode;
  let drawn = null, tr = null, scrubbing = 0, stillAt = performance.now() / 1000;
  // Held down, Space or the Start button doubles his pace for as long as it is held.
  const FAST = 2; let fast = false, pace = 1;
  const look = { x: 0, y: 0 }, FREE = { x0: -150, x1: 150, y0: -40, y1: 40 };
  let recentre = false, wasRunning = false;
  // Zoom, on the map only: whole steps of pixel size either side of the one that suits the window. It stops
  // short of a view wider or taller than the world, so the camera's limits still hide the world's edge.
  let zoom = 0, anchor = null, glideNext = false, glide = null;
  const calm = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const zoomRange = () => { const dpr = window.devicePixelRatio || 1, fit = Math.ceil(Math.max(innerWidth * dpr / (world.WW - 56), innerHeight * dpr / (world.WH - 56))); return [Math.min(scr.S0, Math.max(Math.ceil(scr.S0 / 2), fit)), scr.S0 * 2]; };
  // at: the point of the page, in CSS pixels, that should stay over the same spot of the map.
  function zoomBy(d, at) {
    if (drawn.s !== 'world' || tr) return false;
    endGlide();
    const [lo, hi] = zoomRange(), s = clamp(scr.S0 + zoom + d, lo, hi); if (s === scr.S) return false;
    const dpr = window.devicePixelRatio || 1;
    if (at) { const w = world.at(at[0] * dpr / scr.S, at[1] * dpr / scr.S); anchor = { wx: w.x, wy: w.y, sx: at[0] * dpr / s, sy: at[1] * dpr / s }; }
    zoom = s - scr.S0; glideNext = !calm.matches; emit({ type: 'sfx', name: 'step' });
    return true;
  }
  // A zoom step swaps to a new whole pixel size in one frame, which reads as a jump. So the picture glides
  // from the old view to the new one for a moment and only rests on whole pixels. Zooming in, the last
  // picture at the old size grows over the new one and then gives way to it. Zooming out, the new, wider
  // picture starts enlarged to where the old one was and settles.
  const GLIDE = 190;
  function snapshot() {
    const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height; c.getContext('2d').drawImage(canvas, 0, 0);
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:0;pointer-events:none;image-rendering:pixelated;transform-origin:0 0;width:' + canvas.style.width + ';height:' + canvas.style.height;
    return c;
  }
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

  let last = performance.now(), alive = true, lastAct = performance.now() / 1000, dragging = null;
  const acted = () => { lastAct = performance.now() / 1000; };
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
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    step(dt);
    mix += (mode - mix) * (1 - Math.exp(-dt * 3)); if (Math.abs(mix - mode) < 0.002) mix = mode;
    // A dragged view stays where it is left. Let go near the edge of what a scene lets you see and it
    // eases back inside; it returns to him only when he starts or stops moving.
    if (running !== wasRunning) { wasRunning = running; recentre = true; }
    if (dragging !== 'look') {
      const b = env.lookBox, k = 1 - Math.exp(-dt * 7);
      if (recentre) { look.x *= Math.exp(-dt * 4); look.y *= Math.exp(-dt * 4); if (Math.abs(look.x) + Math.abs(look.y) < 0.5) { look.x = look.y = 0; recentre = false; } }
      else { look.x += (clamp(look.x, b.x0, b.x1) - look.x) * k; look.y += (clamp(look.y, b.y0, b.y1) - look.y) * k; }
    }
    env.lookBox = FREE;
    if (scrubbing > 0) scrubbing -= dt;

    // The cut between scenes: a round window closes on him, the scene changes, it opens again.
    // While he runs, the window starts to close a moment before a stretch ends and is shut just as he
    // reaches the next one, so he never stands still at a scene change. `to` is the stretch it closes for.
    if (running && !tr && scrubbing <= 0 && drawn === legAt(p)) {
      const nx = legs[legs.indexOf(drawn) + 1], left = (drawn.t1 - p) * total;
      if (legs.includes(drawn) && nx && nx !== broken && !(nx.s === 'world' && drawn.s === 'world') && left > 0.12 && left <= 0.3 && !stops.some(s => s.at > p && s.at <= drawn.t1 + 1e-6)) { tr = { phase: 'out', k: 0, to: nx, lead: left }; emit({ type: 'sfx', name: 'iris' }); }
    }
    const want = legAt(p);
    if (want !== drawn && want !== broken && !tr) {
      if (want.s === 'world' && drawn.s === 'world') drawn = want;
      else { tr = { phase: 'out', k: 0, fast: scrubbing > 0 || !running }; emit({ type: 'sfx', name: 'iris' }); }
    }
    if (tr) {
      tr.k += dt / (tr.fast ? 0.14 : tr.lead || (tr.phase === 'out' ? 0.3 : 0.36));
      // He was stopped while the window was closing ahead of the change: it opens again from where it had got to.
      if (tr.to && !running && legAt(p) !== tr.to) tr = { phase: 'in', k: 1 - Math.min(1, tr.k), fast: false };
      if (tr.k >= 1) {
        if (tr.phase === 'out') {
          if (tr.to && legAt(p) !== tr.to) p = Math.min(1, tr.to.t0 + 1e-6);
          drawn = legAt(p);
          try { drawn.scene.enter(scr, drawn.arg, local(drawn, p)); } catch (err) { fail(drawn, err); return; }
          look.x = look.y = 0; tr = { phase: 'in', k: 0, fast: tr.fast }; emit({ type: 'scene', name: drawn.s });
        }
        else tr = null;
      }
    }
    let gliding = null;
    { const [lo, hi] = zoomRange(), s = drawn.s === 'world' ? clamp(scr.S0 + zoom, lo, hi) : scr.S0; if (s !== scr.S) { if (glideNext && drawn.s === 'world' && !tr) gliding = { S: scr.S, o: world.at(0, 0), shot: s > scr.S ? snapshot() : null }; scr.setScale(s); if (anchor) env.anchor = anchor; } anchor = null; glideNext = false; }
    const q = drawn === legAt(p) ? local(drawn, p) : (p > drawn.t1 ? 1 : 0);
    env.t = t; env.tq = Math.floor(t * 10) / 10; env.dt = dt; env.mix = mix;
    env.running = running; env.moving = running || scrubbing > 0; env.shown = shown ? shown.id : null;
    env.home = !running && p === 0 && !shown && scrubbing <= 0 && legs[0].s === 'world' && legs[0].arg.from === 0;
    env.idle = env.home && dragging == null ? t - lastAct : 0;
    if (env.moving || tr) stillAt = t;
    env.still = t - Math.max(stillAt, lastAct);
    // A scene that threw stays as it was last shown until the page has taken him somewhere else.
    if (drawn === broken) return;
    try {
      if (sabotage === drawn.s) throw new Error('Broken on purpose: ' + drawn.s);
      drawn.scene.draw(scr, env, drawn.arg, q);
    } catch (err) { fail(drawn, err); return; }
    // The debug panel's tap targets: every other pixel that answers a tap or a hover, in any scene, goes pink.
    if (DEBUG.taps && !tr && drawn.scene.pick) { const { VW, VH, fb } = scr; for (let y = 0; y < VH; y++) for (let x = y & 1; x < VW; x += 2) if (drawn.scene.pick(x, y)) fb[y * VW + x] = R.pink[1]; }
    scr.night(t, mix);
    if (tr) {
      const f = drawn.scene.focus(), e = tr.k * tr.k * (3 - 2 * tr.k), full = Math.hypot(Math.max(f.x, scr.VW - f.x), Math.max(f.y, scr.VH - f.y)) + 6;
      scr.iris(f.x, f.y, tr.phase === 'out' ? full * (1 - e) - 4 : full * e);
    }
    scr.present(t, mix);
    if (gliding) startGlide(gliding);
    const f = drawn.scene.focus();
    window.__info = { p, route, running, scene: drawn.s, VW: scr.VW, VH: scr.VH, S: scr.S, fx: f.x, fy: f.y };
  }
  drawn.scene.enter(scr, drawn.arg, 0);
  requestAnimationFrame(draw);

  // Drag to look around. The view pushes back as it nears a scene's limit. A press that does not move is a click on
  // whatever is under it.
  let lastPt = null, moved = 0, hover = null, wheelAcc = 0, wheelAt = 0, wheelStep = 0;
  const toView = e => { const k = (window.devicePixelRatio || 1) / scr.S; return [e.clientX * k, e.clientY * k]; };
  // What is under a point. A fingertip is blunt, so a touch that misses also tries the ground close around it.
  const probe = (x, y, blunt) => { if (!drawn.scene.pick) return null; let h = drawn.scene.pick(x, y); if (!h && blunt) for (const r of [5, 9]) for (let a = 0; a < 8 && !h; a++) h = drawn.scene.pick(x + r * Math.cos(a * Math.PI / 4), y + r * Math.sin(a * Math.PI / 4)); return h; };
  // Two fingers pinch to zoom: each time they have moved apart or together by a third, one step.
  const touches = new Map(); let pinch0 = 0;
  const spread = () => { const [a, b] = [...touches.values()]; return [Math.hypot(a[0] - b[0], a[1] - b[1]), [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]]; };
  canvas.addEventListener('wheel', e => { if (drawn.s !== 'world') return; e.preventDefault(); acted(); const now = performance.now(); if (now - wheelAt > 320) wheelAcc = 0; wheelAcc += e.deltaY * (e.deltaMode === 1 ? 30 : 1); if (Math.abs(wheelAcc) >= 40 && now - wheelStep > 170) { zoomBy(wheelAcc < 0 ? 1 : -1, [e.clientX, e.clientY]); wheelAcc = 0; wheelStep = now; } wheelAt = now; }, { passive: false });
  canvas.addEventListener('pointerdown', e => { touches.set(e.pointerId, [e.clientX, e.clientY]); if (touches.size > 1) { if (touches.size === 2) { dragging = 'pinch'; pinch0 = spread()[0]; lastPt = null; } try { canvas.setPointerCapture(e.pointerId); } catch { /* a pointer the browser no longer knows */ } return; } dragging = 'look'; recentre = false; moved = 0; lastPt = [e.clientX, e.clientY]; try { canvas.setPointerCapture(e.pointerId); } catch { /* a pointer the browser no longer knows */ } });
  canvas.addEventListener('pointermove', e => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (dragging === 'pinch' || dragging === 'held') { if (dragging === 'pinch' && touches.size === 2) { const [d, mid] = spread(); if (pinch0 > 0 && (d > pinch0 * 1.3 || d < pinch0 / 1.3)) { zoomBy(d > pinch0 ? 1 : -1, mid); pinch0 = d; } } return; }
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
      if (h) { const k = scr.S / (window.devicePixelRatio || 1); if (h.label && !h.named) emit({ type: 'hover', label: h.label, x: h.x * k, y: h.y * k, tap: true }); if (h.act) { if (!drawn.scene.act || !drawn.scene.act(h.act, env)) emit({ type: 'act', id: h.act }); else { hover = null; emit({ type: 'hover', label: null, x: 0, y: 0 }); } } }
    }
    if (dragging === 'look') dragging = null; lastPt = null;
  };
  canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', endLook);
  // The pointer has left the world (onto a sign or a name tag, or off the page): drop the hover label.
  canvas.addEventListener('pointerleave', () => { if (hover) { hover = null; canvas.style.cursor = ''; emit({ type: 'hover', label: null, x: 0, y: 0 }); } });

  const stopNear = q => stops.find(s => Math.abs(s.at - q) < 0.006);
  const api = {
    // For screenshots: put the dragged view somewhere, in scene pixels from where the camera rests.
    look(x, y) { look.x = x; look.y = y; recentre = false; },
    stops: () => stops.map(s => ({ id: s.id, at: s.at })),
    route: () => route,
    // For the debug panel: makes the scene he is in throw on its next frame.
    breakScene() { sabotage = drawn.s; },
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
    theme: () => mode ? 'dark' : 'light',
    setTheme(th) { mode = th === 'dark' ? 1 : 0; },
    start() { if (p >= 1) p = 0; leave(); running = true; },
    stop() { running = false; pace = 1; },
    boost(on) { fast = !!on; },
    toggle() { if (running) running = false; else api.start(); },
    running: () => running,
    progress: () => p,
    scrub(f) {
      p = clamp(f, 0, 1); running = false; scrubbing = 0.16;
      const s = stopNear(p); if (s) { if (shown !== s) { shown = null; showStop(s); } } else leave();
    },
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
    forget() { for (const k in done) delete done[k]; saveDone(); for (const k in found) delete found[k]; try { localStorage.removeItem('trailhead.found'); } catch { /* private window */ } },
    found: () => ({ ...found }),
    find,
    // Marks routes as finished without walking them (the screenshots use it).
    mark(list) { for (const k of list) { done[k] = true; if (k.startsWith('spire:')) done.spires = true; } },
    // How many CSS pixels one pixel of the page's own size takes: the panels are drawn at this size whatever the map's zoom.
    scale: () => scr.S0 / (window.devicePixelRatio || 1),
    zoom: (d, at) => zoomBy(d, at),
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
    // Names to pin on the scene, in CSS pixels: the six summits at base camp, the four places on the map.
    labels() { const k = scr.S / (window.devicePixelRatio || 1); return drawn.scene.labels && !tr ? drawn.scene.labels().map(l => { const [x, y] = glidePoint(l.x * k, l.y * k); return { ...l, x, y }; }) : []; },
    // Puts him at a milestone by name, with its card open.
    goto(id) { const s = stops.find(q => q.id === id); if (!s) return false; running = false; scrubbing = 0.16; p = s.at; shown = null; showStop(s); return true; },
    info: () => ({ lengths: world.lengths() }),
    dispose() { alive = false; removeEventListener('resize', onResize); }
  };
  return api;
}
