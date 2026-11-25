// How long a frame takes on a slow phone: every scene, by Day and at Dusk, in a phone's window with the
// processor slowed (four times unless told otherwise, as Lighthouse does it).
// usage: slow.mjs <label> [rate] [width] [height] [only: a word a case's name must hold]
//   Writes /out/slow/<label>.json and prints a table. A frame's cost is the time its drawing takes in the page
//   (the callback the game hands to requestAnimationFrame), measured on the real clock while the game runs as it
//   does for a visitor. A scene keeps up when 95 frames in 100 cost under 16.7 ms, one frame at 60 a second.
//   It fails, and says which, when a scene does not.
//   missed: the gaps between frames longer than 25 ms, when the browser could not show a frame in time (the script's
//   time, the page's layout and its painting all count there).
//   PROFILE=1 also prints, for each case timed, the ten functions the time went to (their own time, not
//   what they call), which is where to look when a scene is slow.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [label = 'now', rate = '4', w = '390', h = '844', only = ''] = process.argv.slice(2);
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

// Every event the map can run at once, as check.sh starts them for its own slowest view.
const EVENTS = 'start=shower,breach,blow,ferry,tide,orcas,eagle,osprey,serac,avalanche,squall,lens,tumble,devil,star';
// A case: its name, the address it opens at, and what is done before the frames are timed.
const run = () => window.__api.start();
const CASES = [
  ['the map, stood at the Trailhead', 'arrive=0', null],
  ['the map, running', 'arrive=0', run],
  ['the map, zoomed out, every event', 'arrive=0&' + EVENTS, () => { for (let i = 0; i < 6; i++) window.__api.zoom(-1); }],
  // A scene's case says which scene it times, and fails when another is on screen (a name the game does not know,
  // or a scene over before the frames counted).
  ...['forest', 'lakeside', 'larches', 'wall', 'approach', 'camp'].map(s => ['the ' + s + ', running', 'arrive=0', new Function('return window.__api.jumpTo("' + s + '").then(() => window.__api.start())'), s]),
  ['a spire, climbing', 'arrive=0', () => window.__api.setRoute('spire:' + window.__api.spires()[0]).then(() => window.__api.start()), 'climb'],
  ['the register', 'arrive=0', () => window.__api.setRoute('register').then(() => window.__api.start())],
  ['off route', 'arrive=0#no-such-trail', null]
].filter(c => c[0].includes(only));

async function time(name, query, before, dusk, want) {
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const problems = [];
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  // Every frame's cost, on the real clock, from before the page's own code runs.
  await page.addInitScript(() => {
    window.__cost = []; const raf = window.requestAnimationFrame.bind(window);
    window.__slow = []; window.__gaps = []; let lastT = 0; window.requestAnimationFrame = cb => raf(t => { if (lastT && t - lastT > 25) window.__gaps.push(Math.round(t - lastT)); lastT = t; const a = performance.now(), was = window.__info && window.__info.scene; cb(t); const c = performance.now() - a; window.__cost.push(c); if (c > 16.7) { const i = window.__info || {}; window.__slow.push(Math.round(c) + ' ms in ' + was + (i.scene !== was ? ' to ' + i.scene : '') + ' (route ' + i.route + ', p ' + (i.p || 0).toFixed(3) + ')'); } });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: +rate });
  const [q, hash = ''] = query.split('#');
  await page.goto('http://localhost:8080/?' + q + (dusk ? '&dusk=1' : '') + (hash ? '#' + hash : ''), { waitUntil: 'load' });
  try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 }); } catch { problems.push('never became ready'); }
  if (before) await page.evaluate(before);
  // Three seconds to get there (a scene change, a zoom, the light turning), then four that count.
  await page.waitForTimeout(3000);
  await page.evaluate(() => { window.__cost.length = 0; window.__slow.length = 0; window.__gaps.length = 0; });
  if (process.env.PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.start'); }
  await page.waitForTimeout(4000);
  let hot = null;
  if (process.env.PROFILE) {
    const { profile } = await cdp.send('Profiler.stop'), own = new Map(), dt = profile.timeDeltas, by = new Map(profile.nodes.map(n => [n.id, n]));
    profile.samples.forEach((id, k) => { const f = by.get(id).callFrame, key = (f.functionName || '(anonymous)') + ' ' + f.url.split('/').pop() + ':' + (f.lineNumber + 1); own.set(key, (own.get(key) || 0) + dt[k] / 1000); });
    hot = [...own].filter(([k]) => !k.startsWith('(idle)') && !k.startsWith('(program)')).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }
  const { cost, scene, slow, gaps } = await page.evaluate(() => ({ cost: window.__cost.slice(), scene: window.__info && window.__info.scene, slow: window.__slow.slice(), gaps: window.__gaps.slice() }));
  if (want && scene !== want) problems.push('timed ' + scene + ', not ' + want);
  await page.close();
  cost.sort((a, b) => a - b);
  const at = f => cost[Math.min(cost.length - 1, Math.floor(cost.length * f))] || 0, r = v => Math.round(v * 10) / 10;
  return { name, dusk, scene, frames: cost.length, mid: r(at(0.5)), p95: r(at(0.95)), worst: r(cost[cost.length - 1] || 0), over: cost.filter(c => c > 16.7).length, problems, hot, slow, gaps };
}

const rows = [];
for (const [name, query, before, want] of CASES) for (const dusk of [false, true]) rows.push(await time(name, query, before, dusk, want));
await browser.close(); server.close();
fs.mkdirSync('/out/slow', { recursive: true });
fs.writeFileSync('/out/slow/' + label + '.json', JSON.stringify({ label, rate: +rate, w: +w, h: +h, rows }));

const pad = (v, n) => String(v).padStart(n), col = (v, n) => String(v).padEnd(n);
console.log('a frame in ms, ' + w + ' by ' + h + ', the processor slowed ' + rate + ' times (the limit: 16.7)');
console.log(col('', 36) + col('', 6) + pad('frames', 7) + pad('middle', 8) + pad('95th', 7) + pad('worst', 7) + pad('over', 6) + '  (over: how many frames took longer than 16.7)');
for (const r of rows) console.log(col(r.name, 36) + col(r.dusk ? 'Dusk' : 'Day', 6) + pad(r.frames, 7) + pad(r.mid.toFixed(1), 8) + pad(r.p95.toFixed(1), 7) + pad(r.worst.toFixed(1), 7) + pad(r.over, 6) + (r.problems.length ? '  ' + r.problems.join('; ') : '') + (r.gaps.length ? '  missed: ' + r.gaps.join(', ') + ' ms' : '') + (r.slow.length ? '\n' + r.slow.map(x => '      slow frame: ' + x).join('\n') : '') + (r.hot ? '\n' + r.hot.map(([k, ms]) => '      ' + pad(Math.round(ms), 6) + ' ms  ' + k).join('\n') : ''));
const bad = rows.filter(r => r.p95 > 16.7 || r.problems.length);
console.log('\nslow: ' + (bad.length ? 'FAILED: ' + bad.map(r => r.name + (r.dusk ? ' at Dusk' : '')).join(', ') : 'every scene keeps up'));
if (bad.length) process.exit(1);
