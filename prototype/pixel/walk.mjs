// Walks routes from start to finish through every stop, on the page's own clock at 8x, and says what
// went wrong: a console error or warning, a stop that never let him go, a route that never ended.
// usage: walk.mjs <out tag> <width> <height> <mode: auto|day|dusk> <route> [route ...]
//   route 'clicks' instead walks to a point on each trail by clicking the map (click to move).
//   CALM=1 walks as a visitor who asked for reduced motion, and also checks the idle tour stays off and
//   AUTO holds Day. Every stop is filmed into /out/<tag>.png, one row per route.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [tag, w, h, mode, ...routes] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const file = path.join('/www', path.normalize(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith('/www') || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(8080, r));
const browser = await chromium.launch();
const rows = [], report = [];

async function open(query) {
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, reducedMotion: process.env.CALM ? 'reduce' : 'no-preference' });
  const problems = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') problems.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('request', r => { if (!r.url().startsWith('http://localhost:8080') && !/^(data|blob):/.test(r.url())) problems.push('elsewhere: ' + r.url()); });
  await page.clock.install({ time: 0 });
  await page.goto('http://localhost:8080/?' + query + (mode === 'dusk' ? '&dusk=1' : ''), { waitUntil: 'load' });
  let ready = false;
  for (let i = 0; i < 600 && !ready; i++) { await page.clock.runFor(50); ready = await page.evaluate(() => window.__ready === true); if (!ready) await new Promise(r => setTimeout(r, 30)); }
  if (!ready) problems.push('never became ready');
  if (mode === 'day') await page.evaluate(() => window.__api.setTheme('light'));
  await page.clock.runFor(700);
  return { page, problems };
}
const shot = async (page, label) => ({ label, png: (await page.screenshot({ scale: 'css' })).toString('base64') });
const state = page => page.evaluate(() => ({ p: window.__api.progress(), running: window.__api.running(), route: window.__info.route, scene: window.__info.scene, mode: window.__api.clock().mode, mix: window.__api.clock().mix, touring: window.__api.touring() }));

// Runs his clock on until he stops. Says why: 'stop' (a stop with its card), 'end', or 'stuck'.
async function until(page, route, maxSec) {
  let last = -1, still = 0;
  for (let t = 0; t < maxSec * 4; t++) {
    await page.clock.runFor(250);
    const s = await state(page);
    // At the end the page takes him home, which is the lake route back at its start.
    if (!s.running) return s.route !== route || s.p >= 0.999 || s.p < last - 0.01 ? ['end', s] : ['stop', s];
    if (Math.abs(s.p - last) < 1e-7) { if (++still > 40) return ['stuck', s]; } else still = 0;
    last = s.p;
  }
  return ['stuck', await state(page)];
}

for (const route of routes) {
  const frames = [], notes = [];
  if (route === 'clicks') {
    const { page, problems } = await open('speed=8');
    const m = await page.evaluate(() => window.__api.trailMarks());
    // A point on each trail, in an order that has him turn round, cross the junction and change branch.
    const targets = [['lake', m.lakeIn * 0.5], ['stack', 0.4], ['lake', m.lakeOut + (1 - m.lakeOut) * 0.4], ['spires', m.spiresIn * 0.6], ['stack', 0.15], ['lake', 0.04]];
    for (const [p, s] of targets) {
      const [x, y] = await page.evaluate(([p, s]) => window.__api.trailAt(p, s), [p, s]);
      const on = x > 20 && y > 60 && x < +w - 20 && y < +h - 120;
      let went;
      if (on) { await page.mouse.click(x, y); await page.clock.runFor(100); went = (await state(page)).route === 'walk'; }
      else went = await page.evaluate(([x, y]) => window.__api.walkTo(x * (window.devicePixelRatio || 1) / window.__info.S, y * (window.devicePixelRatio || 1) / window.__info.S), [x, y]);
      if (!went) { notes.push(`${p} ${s.toFixed(3)}: did not set off (${on ? 'clicked' : 'off screen, called walkTo'})`); continue; }
      const [why] = await until(page, 'walk', 120);
      const [ex, ey] = await page.evaluate(([p, s]) => window.__api.trailAt(p, s), [p, s]), [fx, fy] = await page.evaluate(() => window.__api.me());
      const miss = Math.hypot(ex - fx, ey - fy);
      notes.push(`${p} ${s.toFixed(3)}: ${on ? 'clicked' : 'walkTo'}, ${why}, ${miss.toFixed(0)} px from the point`);
      // me() is his middle, about 40 CSS px above his feet on the trail at the opening zoom.
      if (why !== 'end' || miss > 60) problems.push(`click to ${p} ${s.toFixed(3)}: ${why}, ${miss.toFixed(0)} px off`);
      frames.push(await shot(page, `${p} ${s.toFixed(2)}`));
    }
    report.push({ route, problems, notes }); rows.push({ route, frames }); await page.close(); continue;
  }
  const { page, problems } = await open('route=' + route + '&speed=8');
  if (process.env.CALM) {
    // Idle at home a long while: no tour, and AUTO still Day.
    const home = await open('speed=8');
    for (let i = 0; i < 8; i++) await home.page.clock.runFor(15000);
    const s = await state(home.page);
    notes.push(`calm, home after 120 s of his clock: touring ${s.touring}, mode ${s.mode}, light ${s.mix.toFixed(2)}`);
    if (s.touring) problems.push('calm: the idle tour started');
    if (mode === 'auto' && s.mix > 0.01) problems.push('calm: AUTO did not hold Day');
    problems.push(...home.problems); await home.page.close();
  }
  frames.push(await shot(page, 'start'));
  await page.evaluate(() => window.__api.start());
  let n = 0;
  for (;;) {
    const [why, s] = await until(page, route, 600);
    if (why === 'stuck') { problems.push(`stuck at p ${s.p.toFixed(4)} in ${s.scene}`); frames.push(await shot(page, 'stuck')); break; }
    if (why === 'end') { notes.push(`ended in ${s.scene} after ${n} stops`); frames.push(await shot(page, 'end')); break; }
    n++; frames.push(await shot(page, `${n} ${s.scene} ${s.p.toFixed(3)}`));
    await page.evaluate(() => window.__api.start());
    if (n > 40) { problems.push('more than 40 stops'); break; }
  }
  report.push({ route, problems, notes }); rows.push({ route, frames }); await page.close();
}
for (const r of report) console.log(`${tag} ${r.route}: ${r.problems.length ? 'PROBLEMS ' + JSON.stringify(r.problems) : 'clean'}; ${r.notes.join('; ')}`);
if (rows.length) {
  const cell = 220, cols = Math.max(...rows.map(r => r.frames.length));
  const sheet = await browser.newPage({ viewport: { width: cols * (cell + 2) + 120, height: 100 } });
  await sheet.setContent('<body style="margin:0;background:#222;font:10px monospace;color:#ddd">' + rows.map(r => '<div style="display:flex;gap:2px;margin-bottom:4px"><div style="width:118px">' + r.route + '</div>' + r.frames.map(f => '<div style="width:' + cell + 'px"><img style="width:100%" src="data:image/png;base64,' + f.png + '"><div>' + f.label + '</div></div>').join('') + '</div>').join('') + '</body>');
  await sheet.screenshot({ path: '/out/' + tag + '.png', fullPage: true });
}
await browser.close(); server.close();
