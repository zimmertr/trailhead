// The soak: the map and each scene left running at eight times speed for a simulated hour, on a clock the
// script owns, with checks along the way. It says what went wrong and fails if anything did.
// usage: soak.mjs <label> [minutes] [case ...]
//   minutes: simulated minutes for each case (60 unless told). case: map, or a scene's name (forest, lakeside,
//   larches, wall, approach, camp, climb, offroute), or crowd: the map with every animal put on every home it
//   has, as the debug panel's "everywhere it lives" does; all of them unless named. Writes /out/soak/<label>.json.
// The checks, once a simulated minute:
//   errors   anything on the console that is an error or a warning, and anything thrown
//   rules    on the map, every engine rule the map's animals break (rules.js), such as standing in water
//   stuck    on the map, an animal that has been walking for two checks running without moving a pixel
//   overlap  on the map, two land animals drawn on top of each other (closer than half the narrower one's
//            width across and two pixels deep) for two checks running, mother and young, twins, and a pair
//            met head to head, and two that have just butted heads, excepted
//   scene    the scene is still the one asked for (a scene that throws is replaced)
//   memory   the page's heap after a forced collection, at the start and at the end; it fails when it grew by
//            more than a fifth and by more than 8 MB
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [label = 'now', mins = '60', ...asked] = process.argv.slice(2);
const ALL = ['map', 'crowd', 'forest', 'lakeside', 'larches', 'wall', 'approach', 'camp', 'climb', 'offroute'];
const cases = asked.length ? asked : ALL;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const file = path.join('/www', path.normalize(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith('/www') || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(8080, r));
const browser = await chromium.launch();

// At eight times speed a frame of 16 ms on the page's clock is 0.128 s of the game's, so a simulated minute
// is 469 frames, 7.5 s on the page's clock.
const MINUTE = 7500;
async function soak(name) {
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } }), errors = [], found = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const cdp = await page.context().newCDPSession(page);
  await page.clock.install({ time: 0 });
  const q = name === 'offroute' ? '?arrive=0&speed=8#no-such-trail' : '?arrive=0&speed=8';
  await page.goto('http://localhost:8080/' + q, { waitUntil: 'load' });
  let ready = false;
  for (let i = 0; i < 600 && !ready; i++) { await page.clock.runFor(50); ready = await page.evaluate(() => window.__ready === true); if (!ready) await new Promise(r => setTimeout(r, 30)); }
  if (!ready) return { name, minutes: 0, found: ['never became ready'], errors };
  const want = name === 'map' || name === 'crowd' ? 'world' : name === 'climb' ? 'climb' : name;
  if (name === 'climb') await page.evaluate(() => { window.__api.setRoute('spire:' + window.__api.spires()[0]); });
  else if (name === 'crowd') await page.evaluate(() => { for (const k of new Set(window.__api.spawnList().map(s => s.kind))) window.__api.spawn(k, 'all'); });
  else if (name !== 'map' && name !== 'offroute') await page.evaluate(n => { window.__api.jumpTo(n); }, name);
  for (let i = 0; i < 200; i++) { await page.clock.runFor(100); if (await page.evaluate(() => window.__info && window.__info.scene) === want) break; await new Promise(r => setTimeout(r, 20)); }
  await page.clock.runFor(2000);
  const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); return (await cdp.send('Runtime.getHeapUsage')).usedSize; };
  // Frames are counted, so a soak that skipped through its hour in a few long steps says so. The page's clock
  // puts its own requestAnimationFrame in place, so the count wraps that one, once the page is up.
  await page.evaluate(() => { window.__frames = 0; const raf = window.requestAnimationFrame; window.requestAnimationFrame = cb => raf(t => { window.__frames++; cb(t); }); });
  await page.clock.runFor(500);
  const h0 = await heap(), sim0 = await page.evaluate(() => window.__api.now()), f0 = await page.evaluate(() => window.__frames);
  let before = null, stuckOnce = new Set(), overOnce = new Set(), minutes = 0;
  const note = (m, what) => { if (found.length < 40) found.push('minute ' + m + ': ' + what); };
  for (let m = 1; m <= +mins; m++) {
    await page.clock.runFor(MINUTE); minutes = m;
    const s = await page.evaluate(() => ({ scene: window.__info && window.__info.scene, rules: window.__rules && window.__info && window.__info.scene === 'world' ? window.__rules() : [], animals: window.__animals && window.__info && window.__info.scene === 'world' ? window.__animals() : [] }));
    if (s.scene !== want) { note(m, 'the scene is ' + s.scene + ', not ' + want); break; }
    for (const r of s.rules) note(m, 'rule: ' + r);
    const A = s.animals, stuck = new Set(), over = new Set();
    if (before && before.length === A.length) A.forEach((a, i) => { const b = before[i]; if (a.walker && a.st === 'walk' && b.st === 'walk' && a.x === b.x && a.y === b.y) stuck.add(i); });
    for (const i of stuck) if (stuckOnce.has(i)) note(m, A[i].k + ' walking without moving at ' + Math.round(A[i].x) + ', ' + Math.round(A[i].y));
    A.forEach((a, i) => { if (a.col !== 'land') return; A.forEach((b, j) => { if (j <= i || b.col !== 'land' || a.mum === j || b.mum === i || (a.mum >= 0 && a.mum === b.mum) || a.with === j || (/:butt/.test(a.st) && /:butt/.test(b.st))) return;
      if (Math.abs(a.x - b.x) < Math.min(a.w, b.w) / 2 && Math.abs(a.y - b.y) < 2) over.add(i + ':' + j); }); });
    for (const k of over) if (overOnce.has(k)) { const [i, j] = k.split(':').map(Number); note(m, A[i].k + ' and ' + A[j].k + ' on top of each other at ' + Math.round(A[i].x) + ', ' + Math.round(A[i].y) + ' (' + (A[i].st || 'still') + ', ' + (A[j].st || 'still') + ')'); }
    stuckOnce = stuck; overOnce = over; before = A;
  }
  const h1 = await heap(), sim = Math.round((await page.evaluate(() => window.__api.now())) - sim0), frames = (await page.evaluate(() => window.__frames)) - f0;
  if (frames < minutes * 469 * 0.9) found.push('only ' + frames + ' frames were drawn where ' + minutes * 469 + ' were wanted');
  if (sim < minutes * 60 * 0.9) found.push('the game ran ' + sim + ' s of its own time where ' + minutes * 60 + ' were asked');
  if (h1 - h0 > 8e6 && h1 > h0 * 1.2) found.push('the heap grew from ' + (h0 / 1e6).toFixed(1) + ' MB to ' + (h1 / 1e6).toFixed(1) + ' MB');
  await page.close();
  return { name, minutes, sim, frames, heap: [Math.round(h0 / 1e5) / 10, Math.round(h1 / 1e5) / 10], found, errors: [...new Set(errors)] };
}

const rows = [];
for (const c of cases) { const t0 = Date.now(); const r = await soak(c); r.secs = Math.round((Date.now() - t0) / 1000); rows.push(r);
  console.log(c.padEnd(10) + String(r.minutes).padStart(4) + ' min (' + r.sim + ' s of game time, ' + r.frames + ' frames)' + (r.heap ? '   heap ' + r.heap[0] + ' to ' + r.heap[1] + ' MB' : '') + '   (' + r.secs + ' s)' + (r.found.length || r.errors.length ? '' : '   clean'));
  for (const f of r.found) console.log('    ' + f); for (const e of r.errors.slice(0, 10)) console.log('    ' + e); }
await browser.close(); server.close();
fs.mkdirSync('/out/soak', { recursive: true });
fs.writeFileSync('/out/soak/' + label + '.json', JSON.stringify(rows));
const bad = rows.filter(r => r.found.length || r.errors.length);
console.log('\nsoak: ' + (bad.length ? 'FAILED: ' + bad.map(r => r.name).join(', ') : 'every case ran clean for ' + mins + ' simulated minutes'));
if (bad.length) process.exit(1);
