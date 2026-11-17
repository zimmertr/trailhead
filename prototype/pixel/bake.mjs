// Works the map's ground out once, in headless Chromium, and writes it to www/ground.png, so the page
// does not spend a second on it every time it opens. Run it (bake.sh) after any change to the ground
// in land.js or to the palette; a stale bake is noticed by the page and ignored, which is slow, not wrong.
// The PNG carries the signature of the source it was made from (sourceSig in land.js) in a tEXt chunk.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const file = path.join('/www', path.normalize(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith('/www') || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(8080, r));
const browser = await chromium.launch(), page = await browser.newPage();
page.on('pageerror', e => { console.error('page error: ' + e.message); process.exitCode = 1; });
await page.goto('http://localhost:8080/bake.html'); await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const { w, h, data, sig } = await page.evaluate(() => window.__bake); await browser.close(); server.close();
const px = Buffer.from(data, 'base64'); if (px.length !== w * h) throw new Error('the page handed over ' + px.length + ' bytes, not ' + w * h);
// A grey PNG, eight bits to a pixel. Every row starts with a 0: stored as it is, not as a difference from the row above.
const rows = Buffer.alloc((w + 1) * h); for (let y = 0; y < h; y++) px.copy(rows, y * (w + 1) + 1, y * w, (y + 1) * w);
const chunk = (type, body) => { const head = Buffer.alloc(8), tail = Buffer.alloc(4); head.writeUInt32BE(body.length); head.write(type, 4, 'latin1'); tail.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), body]))); return Buffer.concat([head, body, tail]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('tEXt', Buffer.from('sig\0' + sig, 'latin1')), chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
const out = '/www/ground.png', same = fs.existsSync(out) && fs.readFileSync(out).equals(png);
if (!same) fs.writeFileSync(out, png);
console.log((same ? 'ground.png was already up to date' : 'ground.png written') + ' (' + Math.round(png.length / 1024) + ' KB)');
