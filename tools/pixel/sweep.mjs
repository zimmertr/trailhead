// Steps along routes and takes a still at every step, each from a fresh page on a clock the script owns, so
// the same step of two builds can be laid side by side or compared pixel by pixel. Says what went wrong on
// the way: a console error or warning, a request that left the page, a page that never became ready.
// usage: sweep.mjs <out folder under /out> <width> <height> <day|dusk> <steps> <route> [route ...]
//   Each still is /out/<folder>/<route>-<step, two digits>.png, taken when the page's clock reads 4 s after it
//   opened at that point of the route, however long the page took to get ready. The cards and the junction's
//   signs are hidden, so the scene is what is compared. A side scene whose picture ends in a band of one flat
//   colour (its ground is not painted as deep as the window is tall) gets a note, which is not counted as wrong.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [folder, w, h, mode, steps, ...routes] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const file = path.join('/www', path.normalize(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith('/www') || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(8080, r));
const browser = await chromium.launch();
fs.mkdirSync(path.join('/out', folder), { recursive: true });
let bad = 0;
for (const route of routes) {
  const scenes = [];
  for (let k = 0; k <= +steps; k++) {
    const p = k / +steps, page = await browser.newPage({ viewport: { width: +w, height: +h } }), problems = [];
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') problems.push(m.type() + ': ' + m.text()); });
    page.on('pageerror', e => problems.push('pageerror: ' + e.message));
    page.on('request', r => { if (!r.url().startsWith('http://localhost:8080') && !/^(data|blob):/.test(r.url())) problems.push('elsewhere: ' + r.url()); });
    await page.clock.install({ time: 0 });
    await page.goto('http://localhost:8080/?route=' + encodeURIComponent(route) + '&p=' + p.toFixed(4) + (mode === 'dusk' ? '&dusk=1' : ''), { waitUntil: 'load' });
    let ready = false, ran = 0;
    for (let i = 0; i < 600 && !ready; i++) { await page.clock.runFor(50); ran += 50; ready = await page.evaluate(() => window.__ready === true); if (!ready) await new Promise(r => setTimeout(r, 30)); }
    if (!ready) problems.push('never became ready');
    if (mode === 'day') await page.evaluate(() => window.__api.setTheme('light'));
    await page.evaluate(() => document.querySelectorAll('#card,#fork,#toast,#tab,#names,#tip').forEach(e => { e.style.visibility = 'hidden'; }));
    await page.clock.runFor(Math.max(700, 4000 - ran));
    const scene = await page.evaluate(() => window.__info && window.__info.scene);
    if (scenes[scenes.length - 1] !== scene) scenes.push(scene);
    fs.writeFileSync(path.join('/out', folder, route.replace(/[^a-z0-9-]/gi, '_') + '-' + String(k).padStart(2, '0') + '.png'), await page.screenshot({ scale: 'css' }));
    const band = await page.evaluate(() => {
      const c = document.querySelector('#c'), w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data, last = (h - 1) * w * 4;
      const same = (a, b) => d[a] === d[b] && d[a + 1] === d[b + 1] && d[a + 2] === d[b + 2];
      let n = 0;
      for (let y = h - 1; y >= 0; y--, n++) { const o = y * w * 4; let flat = same(o, last); for (let x = 3; x < w && flat; x += 3) flat = same(o, o + x * 4); if (!flat) break; }
      return { n, h };
    });
    if (scene !== 'world' && band.n * 20 > band.h) console.log(`${folder} ${route} step ${k}: note: the bottom ${band.n} of the picture's ${band.h} rows are one flat colour`);
    for (const s of problems) { bad++; console.log(`${folder} ${route} step ${k}: ${s}`); }
    await page.close();
  }
  console.log(`${folder} ${route}: ${+steps + 1} stills through ${scenes.join(', ')}`);
}
await browser.close(); server.close();
process.exit(bad ? 1 : 0);
