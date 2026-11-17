// Films the prototype frame by frame on a clock the script owns, and lays the frames out as one sheet.
// A single still cannot show whether something moves well; a row of frames a tenth of a second apart can.
// usage: frames.mjs <out.png> '<query>' <width> <height> '<steps>' [dpr] [clip] [columns] [cell width]
// steps: wheel=<x,y,dy> turns the mouse wheel there; views prints each filmed frame's pixel size and the map point at its top-left corner.
// steps: wait=<ms>;key=<code>;tap=<x,y>;tapme=<dx,dy>;click=<selector>;scrub=<0..1>;film=<frames>x<ms>
//   wait runs the page's clock on by that much; tapme clicks that many scene pixels from his middle; scrub puts him at that point of the route by pressing
//   on the timeline; film takes that many frames, the clock running on by <ms> before each.
//   time runs that many frames of 16 ms and prints how long each took to draw, to catch a slow scene.
// clip: 'me:<w>x<h>' follows the runner, or 'x,y,w,h', all in scene pixels. Without it the whole page is filmed.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [out = 'frames.png', query = '', w = '1440', h = '900', steps = 'film=8x100', dpr = '1', clip = '', cols = '6', cellW = '240'] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const file = path.join('/www', path.normalize(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith('/www') || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(8080, r));
const browser = await chromium.launch();
// CALM=1 films as a visitor who asked for reduced motion.
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr, reducedMotion: process.env.CALM ? 'reduce' : 'no-preference' });
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '')));
// The page's clock only moves when this script says so, so every run films the same frames.
await page.clock.install({ time: 0 });
await page.goto('http://localhost:8080/' + (query ? '?' + query : ''), { waitUntil: 'load' });
let ready = false;
for (let i = 0; i < 600 && !ready; i++) { await page.clock.runFor(50); ready = await page.evaluate(() => window.__ready === true); if (!ready) await new Promise(r => setTimeout(r, 50)); }
if (!ready) errors.push('never became ready');
await page.clock.runFor(700);

const shots = [];
let clock = 0;
async function frame(label) {
  const i = await page.evaluate(() => window.__info), S = i.S / +dpr;
  let opt = {};
  if (clip) {
    let x, y, cw, ch;
    if (clip.startsWith('me:')) { [cw, ch] = clip.slice(3).split('x').map(Number); x = Math.max(0, Math.min(i.VW - cw, i.fx - cw / 2)); y = Math.max(0, Math.min(i.VH - ch, i.fy - ch * 0.6)); }
    else [x, y, cw, ch] = clip.split(',').map(Number);
    opt = { clip: { x: x * S, y: y * S, width: cw * S, height: ch * S } };
  }
  shots.push({ label, png: (await page.screenshot(opt)).toString('base64'), p: i.p, S: i.S, o: i.o });
}
let views = false;
for (const st of steps.split(';').filter(Boolean)) {
  const k = st.slice(0, st.indexOf('=')), v = st.slice(st.indexOf('=') + 1);
  if (k === 'wait') { await page.clock.runFor(+v); clock += +v; }
  else if (k === 'key') await page.keyboard.press(v);
  else if (k === 'click') await page.click(v);
  else if (k === 'wheel') { const [x, y, dy] = v.split(',').map(Number); await page.mouse.move(x, y); await page.mouse.wheel(0, dy); }
  else if (k === 'views') views = true;
  else if (k === 'tap') { const [x, y] = v.split(',').map(Number); await page.mouse.click(x, y); }
  else if (k === 'tapme') { const [dx, dy] = v.split(',').map(Number), i = await page.evaluate(() => window.__info), S = i.S / +dpr; await page.mouse.click((i.fx + dx) * S, (i.fy + dy) * S); }
  else if (k === 'scrub') { const r = await page.evaluate(() => { const b = document.getElementById('line').getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }); await page.mouse.click(r[0] + r[2] * +v, r[1] + r[3] / 2); await page.clock.runFor(400); }
  else if (k === 'film') { const [n, ms] = v.split('x').map(Number); for (let f = 0; f < n; f++) { await page.clock.runFor(ms); clock += ms; await frame((clock / 1000).toFixed(2) + ' s'); } }
  else if (k === 'eval') await page.evaluate(v);
  else if (k === 'time') { const t0 = Date.now(); for (let f = 0; f < +v; f++) await page.clock.runFor(16); console.log('time: ' + ((Date.now() - t0) / +v).toFixed(1) + ' ms a frame over ' + v + ' frames'); }
}
console.log('frames: ' + shots.length + ', p from ' + (shots[0] ? shots[0].p.toFixed(4) : '-') + ' to ' + (shots.length ? shots[shots.length - 1].p.toFixed(4) : '-'));
if (shots.length) {
  const sheet = await browser.newPage({ viewport: { width: +cols * (+cellW + 2), height: 100 } });
  await sheet.setContent('<body style="margin:0;background:#222;display:grid;gap:2px;grid-template-columns:repeat(' + cols + ',' + cellW + 'px);font:11px monospace;color:#ddd">' + shots.map(s => '<div><img src="data:image/png;base64,' + s.png + '" style="width:' + cellW + 'px;display:block;image-rendering:pixelated"><div style="padding:1px 3px">' + s.label + '</div></div>').join('') + '</body>');
  await sheet.screenshot({ path: '/out/' + out, fullPage: true });
}
if (views) for (const s of shots) console.log('view ' + s.label + ' S ' + (s.S || 0).toFixed(4) + (s.o ? ' at ' + s.o.x.toFixed(1) + ',' + s.o.y.toFixed(1) : ''));
if (errors.length) console.log(errors.join('\n'));
await browser.close();
server.close();
