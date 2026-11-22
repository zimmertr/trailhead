// Serves www/ and screenshots index.html in headless Chromium.
// usage: shot.mjs <out.png> '<query>' [width] [height] [steps] [dpr] [me]   (me crops round the runner)
// steps: click=<selector>;wait=<ms>;key=<code>;down=<code>;up=<code>;shot=<name.png>;tap=<x,y>;move=<x,y>;wheel=<x,y,dy>;eval=<js>;hit=<act>
// (hit clicks where the scene draws the thing that answers to that act, for example hit=egg)
// (down and up hold a key and let it go, for anything that depends on how long it is held)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [out = 'shot.png', query = '', w = '1440', h = '900', steps = 'wait=600', dpr = '1', clip = ''] = process.argv.slice(2);
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
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr });
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '')));
const t0 = Date.now();
const pageName = query.startsWith('@') ? query.slice(1).split('?')[0] : 'index.html', qs = query.startsWith('@') ? (query.split('?')[1] || '') : query;
await page.goto('http://localhost:8080/' + pageName + (qs ? '?' + qs : ''), { waitUntil: 'load' });
try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 }); } catch { errors.push('never became ready'); }
console.log('ready in ' + (Date.now() - t0) + ' ms');
for (const st of steps.split(';').filter(Boolean)) {
  const k = st.slice(0, st.indexOf('=')), v = st.slice(st.indexOf('=') + 1);
  if (k === 'click') await page.click(v); else if (k === 'key') await page.keyboard.press(v); else if (k === 'down') await page.keyboard.down(v); else if (k === 'up') await page.keyboard.up(v);
  else if (k === 'wait') await page.waitForTimeout(+v); else if (k === 'tap') { const [x, y] = v.split(',').map(Number); await page.mouse.click(x, y); } else if (k === 'move') { const [x, y] = v.split(',').map(Number); await page.mouse.move(x, y); } else if (k === 'drag') { const [x0, y0, x1, y1] = v.split(',').map(Number); await page.mouse.move(x0, y0); await page.mouse.down(); for (let i = 1; i <= 8; i++) await page.mouse.move(x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await page.mouse.up(); } else if (k === 'wheel') { const [x, y, dy] = v.split(',').map(Number); await page.mouse.move(x, y); await page.mouse.wheel(0, dy); } else if (k === 'eval') await page.evaluate(v); else if (k === 'hit') { const at = await page.evaluate(a => window.__api.hitAt(a), v); if (at) await page.mouse.click(at[0], at[1]); else errors.push('nothing answers to ' + v); } else if (k === 'shot') await page.screenshot({ path: '/out/' + v });
}
if (clip) { const i = await page.evaluate(() => window.__info); const S = i.S / +dpr; let x, y, cw, ch; if (clip.includes(',')) [x, y, cw, ch] = clip.split(',').map(Number); else { [cw, ch] = clip === 'me' ? [80, 70] : clip.split('x').map(Number); x = Math.max(0, Math.min(i.VW - cw, i.fx - cw / 2)); y = Math.max(0, Math.min(i.VH - ch, i.fy - ch * 0.6)); } await page.screenshot({ path: '/out/' + out, clip: { x: x * S, y: y * S, width: cw * S, height: ch * S } }); } else await page.screenshot({ path: '/out/' + out });
console.log('info: ' + JSON.stringify(await page.evaluate(() => window.__info || null)));
if (errors.length) console.log(errors.join('\n'));
await browser.close();
server.close();
