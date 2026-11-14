// Serves www/ and screenshots index.html in headless Chromium.
// usage: shot.mjs <out.png> '<query>' [width] [height] [steps] [dpr] [me]   (me crops round the runner)
// steps: click=<selector>;wait=<ms>;key=<code>;shot=<name.png>
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [out = 'shot.png', query = '', w = '1440', h = '900', steps = 'wait=600', dpr = '1', clip = ''] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
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
await page.goto('http://localhost:8080/index.html' + (query ? '?' + query : ''), { waitUntil: 'load' });
try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 }); } catch { errors.push('never became ready'); }
console.log('ready in ' + (Date.now() - t0) + ' ms');
for (const st of steps.split(';').filter(Boolean)) {
  const k = st.slice(0, st.indexOf('=')), v = st.slice(st.indexOf('=') + 1);
  if (k === 'click') await page.click(v); else if (k === 'key') await page.keyboard.press(v);
  else if (k === 'wait') await page.waitForTimeout(+v); else if (k === 'shot') await page.screenshot({ path: '/out/' + v });
}
if (clip === 'me') { const i = await page.evaluate(() => window.__info); const S = i.S / +dpr; await page.screenshot({ path: '/out/' + out, clip: { x: (i.mx - i.ox - 40) * S, y: (i.my - i.oy - 50) * S, width: 80 * S, height: 70 * S } }); } else await page.screenshot({ path: '/out/' + out });
console.log('info: ' + JSON.stringify(await page.evaluate(() => window.__info || null)));
if (errors.length) console.log(errors.join('\n'));
await browser.close();
server.close();
