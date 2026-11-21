// The engine rules (web/ENGINE.md), checked against the map as it was built: each rule broken, in plain
// words, with how many things break it and where the first one is. The browser suite fails on any, so a
// painted blob or a still animal added later is caught on its pull request.
import { COLLIDE_KINDS } from './collide.js';

// The drawings that may stand still on the map, as land.js tags them. Anything else that stands still is
// a plant that does not sway or a thing nobody said may stand still.
const STILL = ['rock', 'snag', 'log', 'drift', 'stack', 'fern', 'bridge'];

// How many different drawings an animal has, wherever in its set of drawings they sit.
function drawings(f) {
  const s = new Set();
  const add = v => { if (!v || typeof v !== 'object') return; if (v.d && v.w) s.add(v); else for (const k in v) add(v[k]); };
  add(f); return s.size;
}

// things: the map's planted things (land.js). items: its animals (critters.js). col: the collision module.
export function checkRules(things, items, col) {
  const broken = new Map();
  const breach = (what, x, y) => { const b = broken.get(what); if (b) b.n++; else broken.set(what, { n: 1, x: Math.round(x), y: Math.round(y) }); };
  for (const th of things) {
    if (th.tree) { if (!th.tree.parts || !th.tree.parts.some(p => p.sway > 0)) breach('a plant that does not sway', th.x, th.y); continue; }
    if (!th.bm) continue;
    const what = th.bm.what;
    if (!STILL.includes(what)) breach('a still drawing that is not a rock, snag, log, driftwood, sea stack, fern or footbridge rail', th.x, th.y);
    if (what === 'fern' && !th.fern) breach('a fern that does not sway', th.x, th.y);
    if (th.bm.solid && !col.solid(th.x, th.y - 1)) breach('a solid thing that collide.js does not know', th.x, th.y);
  }
  for (const a of items) {
    if (!COLLIDE_KINDS.includes(a.col)) breach(`a ${a.critter} that does not say which mover it is to collide.js`, a.x, a.y);
    if (drawings(a.f) < 2) breach(`a ${a.critter} with fewer than two drawings`, a.x, a.y);
    // A marmot on its boulder lies on the rock, so only the ground animals standing on their feet are asked.
    if (a.col === 'land' && !a.perch && !col.canBe('land', a.x, a.y, 0)) breach(`a ${a.critter} standing where no land animal may`, a.x, a.y);
  }
  return [...broken].map(([what, b]) => `${b.n} x ${what} (the first at ${b.x}, ${b.y})`);
}
