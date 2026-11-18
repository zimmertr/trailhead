// Writes where every trail runs and every sign and animal stands to /out/check/<item>.json, then prints what
// moved by more than 8 map pixels since the check before. Trails are routed afresh on every build, so a change
// to the land can move one that nobody touched (round 5, D1 and D2): this is how that is seen the same day.
// usage: check.mjs <item> [earlier item]   (run by check.sh)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [item, earlier] = process.argv.slice(2);
if (!item) { console.error('usage: check.mjs <item> [earlier item]'); process.exit(2); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x'), file = path.join('/www', path.normalize(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith('/www') || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(8080, r));
const browser = await chromium.launch(), page = await browser.newPage();
await page.goto('http://localhost:8080/relief.html'); await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const now = await page.evaluate(async () => {
  const m = await import('./land.js'), spots = m.buildTerrain().spots, out = {};
  const pt = v => Array.isArray(v) ? [v[0], v[1]] : [v.x, v.y != null ? v.y : Object.values(v.ys || {})[0]];
  const isPt = v => v && (Array.isArray(v) ? typeof v[0] === 'number' : typeof v.x === 'number');
  for (const [k, v] of Object.entries(spots)) {
    if (isPt(v)) out[k] = [pt(v)];
    else if (Array.isArray(v)) out[k] = v.filter(isPt).map(pt);
    else if (v && typeof v === 'object') for (const [k2, v2] of Object.entries(v)) if (isPt(v2)) out[k + '.' + k2] = [pt(v2)];
  }
  return { trails: m.LAND.C.trails.map(t => t.map(p => [p[0], p[1]])), spots: out, baked: m.BAKE.used };
});
await browser.close(); server.close();

const dir = '/out/check'; fs.mkdirSync(dir, { recursive: true });
const others = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== item + '.json').map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
const before = earlier ? earlier + '.json' : others[0] && others[0].f;
fs.writeFileSync(path.join(dir, item + '.json'), JSON.stringify(now));
console.log('places: ' + now.trails.length + ' trails, ' + Object.values(now.spots).reduce((n, l) => n + l.length, 0) + ' signs and animals in ' + Object.keys(now.spots).length + ' kinds; ground ' + (now.baked ? 'read from the bake' : 'NOT from the bake: run ./bake.sh'));
if (!before || !fs.existsSync(path.join(dir, before))) { console.log('moved: no earlier check to compare with'); process.exit(now.baked ? 0 : 1); }
const old = JSON.parse(fs.readFileSync(path.join(dir, before), 'utf8')), LIMIT = 8, moved = [];
// A trail has moved if any of its points is further than the limit from every stretch of the old one.
const toSeg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
const off = (p, line) => { let d = Infinity; for (let i = 1; i < line.length; i++) d = Math.min(d, toSeg(p, line[i - 1], line[i])); return line.length > 1 ? d : Math.hypot(p[0] - line[0][0], p[1] - line[0][1]); };
const far = (a, b) => a.reduce((w, p) => { const d = off(p, b); return d > w.d ? { d, p } : w; }, { d: 0, p: null });
for (let k = 0; k < Math.max(now.trails.length, old.trails.length); k++) {
  const a = now.trails[k], b = old.trails[k];
  if (!a || !b) { moved.push('trail ' + k + (a ? ' is new' : ' is gone')); continue; }
  const w = [far(a, b), far(b, a)].sort((x, y) => y.d - x.d)[0];
  if (w.d > LIMIT) moved.push('trail ' + k + ' moved by up to ' + Math.round(w.d) + ' px, most near ' + w.p.map(Math.round).join(','));
}
for (const k of new Set([...Object.keys(now.spots), ...Object.keys(old.spots)])) {
  const a = now.spots[k], b = old.spots[k];
  if (!a || !b) { moved.push(k + (a ? ' is new (' + a.length + ')' : ' is gone')); continue; }
  if (a.length !== b.length) moved.push(k + ': ' + b.length + ' before, ' + a.length + ' now');
  for (let i = 0; i < Math.min(a.length, b.length); i++) { const d = Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]); if (d > LIMIT) moved.push(k + ' ' + (i + 1) + ' moved ' + Math.round(d) + ' px, from ' + b[i].map(Math.round).join(',') + ' to ' + a[i].map(Math.round).join(',')); }
}
console.log('moved more than ' + LIMIT + ' px since ' + before.replace('.json', '') + ': ' + (moved.length ? '\n  ' + moved.join('\n  ') : 'nothing'));
process.exit(now.baked ? 0 : 1);
