// The audio lab: measures how loud everything the game plays is, without anyone listening.
// usage: sound.mjs <label> [earlier label]
//   Writes /out/sound/<label>.json and prints a report. With an earlier label it also prints what changed.
//
// How it works. audio.js makes its sound with the browser's Web Audio nodes, so the lab runs audio.js itself,
// unchanged, in headless Chromium, and hands it an OfflineAudioContext where it asks for an AudioContext. The
// browser then renders the sound as fast as it can into a buffer instead of a loudspeaker. The lab owns the
// timers audio.js sets (the one that writes the next notes, and the birds), and calls them by the buffer's own
// clock, so a minute of music takes about a second to render and comes out the same every time (the dice are
// seeded too). Everything is measured where the visitor hears it: after the mixer and the limiter.
//
// What it measures, per render:
//   I     integrated loudness in LUFS (ITU-R BS.1770: K-weighting, 400 ms blocks, gated), for music and beds
//   M     the loudest 400 ms in LUFS (momentary loudness), for effects, which are too short to gate
//   peak  the highest sample in dBFS; 0 is where the browser clips
//
// The balance it holds the game to (round 8, I4), and fails on:
//   every tune through every set within 1 LU of the mean of them all,
//   every effect within 3 LU of itself from set to set, and its peak above -40 dBFS, so it can be heard,
//   every bed between -44 and -35 LUFS,
//   the pile-up's peak at or under -1 dBFS.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [label = 'now', earlier = ''] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  // A page of the site's own origin with nothing on it, for audio.js to be imported into.
  if (url.pathname === '/__sound.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>sound</title>'); return; }
  const file = path.join('/www', path.normalize(url.pathname));
  if (!file.startsWith('/www') || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(8080, r));
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto('http://localhost:8080/__sound.html');

// Everything below runs in the page.
await page.evaluate(() => {
  const RATE = 48000;
  // BS.1770's K-weighting at 48 kHz: a high shelf, then a high-pass.
  const K = [[1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585], [1, -2, 1, -1.99004745483398, 0.99007225036621]];
  const weigh = x => { let y = x; for (const [b0, b1, b2, a1, a2] of K) { const o = new Float64Array(y.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < y.length; i++) { const v = b0 * y[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = y[i]; y2 = y1; y1 = v; o[i] = v; } y = o; } return y; };
  const lufs = ms => -0.691 + 10 * Math.log10(Math.max(ms, 1e-12));
  // from, to: the stretch that is measured, in seconds.
  function measure(buf, from = 0, to = buf.duration) {
    const a = Math.floor(from * RATE), b = Math.min(buf.length, Math.floor(to * RATE)), chans = [...Array(buf.numberOfChannels).keys()].map(c => buf.getChannelData(c).subarray(a, b));
    let peak = 0; for (const ch of chans) for (let i = 0; i < ch.length; i++) { const v = Math.abs(ch[i]); if (v > peak) peak = v; }
    const kw = chans.map(weigh), BLOCK = 0.4 * RATE, HOP = 0.1 * RATE, blocks = [];
    for (let s = 0; s + BLOCK <= kw[0].length; s += HOP) { let sum = 0; for (const ch of kw) { let e = 0; for (let i = s; i < s + BLOCK; i++) e += ch[i] * ch[i]; sum += e / BLOCK; } blocks.push(sum); }
    const loud = blocks.filter(m => lufs(m) > -70), mean = l => l.reduce((s, v) => s + v, 0) / (l.length || 1), rel = lufs(mean(loud)) - 10, kept = loud.filter(m => lufs(m) > rel);
    const r = v => Math.round(v * 10) / 10;
    return { I: kept.length ? r(lufs(mean(kept))) : -99, M: blocks.length ? r(lufs(Math.max(...blocks))) : -99, peak: r(20 * Math.log10(Math.max(peak, 1e-6))) };
  }
  // One render. job: { secs, set, track, music, amb, rain, at: [[seconds, effect name], ...], from, to }
  window.render = async job => {
    const { makeAudio } = await import('./audio.js');
    localStorage.clear();
    if (job.track != null) localStorage.setItem('trailhead.track', String(job.track));
    if (job.set != null) localStorage.setItem('trailhead.set', String(job.set));
    const timers = [], keep = [window.setInterval, window.clearInterval, window.AudioContext, Math.random];
    window.setInterval = (fn, ms) => { timers.push({ fn, every: ms / 1000, next: ms / 1000 }); return timers.length; };
    window.clearInterval = id => { if (timers[id - 1]) timers[id - 1].dead = true; };
    let seed = 20261125; Math.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    let ctx = null;
    // audio.js plays only while its context says it is running, which an offline one says only while it renders.
    window.AudioContext = function () { ctx = new OfflineAudioContext(2, Math.ceil(job.secs * RATE), RATE); Object.defineProperty(ctx, 'state', { get: () => 'running' }); return ctx; };
    const audio = makeAudio();
    audio.start();
    // The first timer is the one that writes the music's next notes. The others are a place's birds, which
    // are effects with their own lines in the report, so a bed is measured without them.
    timers.forEach((t, n) => { if (n > 0 || !job.music) t.dead = true; });
    if (job.amb) { audio.ambience(job.amb); timers.forEach((t, n) => { if (n > 0) t.dead = true; }); }
    if (job.rain && audio.rain) audio.rain(job.rain);   // a build from before round 8 has no rain
    const due = (job.at || []).slice().sort((p, q) => p[0] - q[0]);
    const tick = t => { for (const tm of timers) while (!tm.dead && tm.next <= t) { tm.fn(); tm.next += tm.every; } while (due.length && due[0][0] <= t) audio.sfx(due.shift()[1]); };
    tick(0);
    for (let t = 0.05; t < job.secs; t += 0.05) ctx.suspend(t).then(() => { tick(t); ctx.resume(); });
    const buf = await ctx.startRendering();
    [window.setInterval, window.clearInterval, window.AudioContext, Math.random] = keep;
    return measure(buf, job.from || 0, job.to || job.secs);
  };
  window.facts = async () => { const m = await import('./audio.js'), a = m.makeAudio(); return { tunes: m.TRACKS.map(t => ({ name: t.name, secs: 3 * t.lead.length * 60 / t.bpm / t.div })), sets: m.SETS.map(s => s.name), fx: a.fxNames() }; };
});

const facts = await page.evaluate(() => window.facts());
const render = job => page.evaluate(j => window.render(j), job);
const AMB = ['world', 'forest', 'lakeside', 'wall', 'larches', 'approach', 'camp'];
const out = { label, tunes: facts.tunes.map(t => t.name), sets: facts.sets, music: [], fx: {}, amb: {}, rain: {}, pile: [] };

// Every tune through every set: one whole play (the first part, the second, the first again), measured from
// 2 seconds in, once the music has faded up.
for (let s = 0; s < facts.sets.length; s++) { out.music.push([]); for (let k = 0; k < facts.tunes.length; k++) out.music[s].push(await render({ secs: facts.tunes[k].secs + 1.5, set: s, track: k, music: true, from: 2 })); }
// Every effect through every set, alone.
for (const name of facts.fx) { out.fx[name] = []; for (let s = 0; s < facts.sets.length; s++) out.fx[name].push(await render({ secs: 7, set: s, at: [[0, name]] })); }
// Every place's bed, alone, and the rain at its heaviest over the quietest bed.
for (const name of AMB) out.amb[name] = await render({ secs: 20, set: 0, amb: name, from: 2 });
out.rain = await render({ secs: 12, set: 0, rain: 1, from: 4 });
// The pile-up: for each set, its loudest tune, the loudest bed, heavy rain, and the five loudest effects all at
// once, three times over. What matters here is the peak: under 0 dBFS nothing clips.
const loudBed = AMB.reduce((b, n) => (out.amb[n].I > out.amb[b].I ? n : b), AMB[0]);
for (let s = 0; s < facts.sets.length; s++) {
  const k = out.music[s].reduce((b, m, n) => (m.I > out.music[s][b].I ? n : b), 0);
  const top = facts.fx.slice().sort((p, q) => out.fx[q][s].peak - out.fx[p][s].peak).slice(0, 5);
  out.pile.push({ tune: facts.tunes[k].name, bed: loudBed, fx: top, ...(await render({ secs: 16, set: s, track: k, music: true, amb: loudBed, rain: 1, at: [4, 8, 12].flatMap(t => top.map(n => [t, n])) })) });
}
await browser.close(); server.close();

fs.mkdirSync('/out/sound', { recursive: true });
fs.writeFileSync('/out/sound/' + label + '.json', JSON.stringify(out));

// The report.
const pad = (v, n) => String(v).padStart(n), col = (v, n) => String(v).padEnd(n), f1 = v => v.toFixed(1);
const was = earlier && fs.existsSync('/out/sound/' + earlier + '.json') ? JSON.parse(fs.readFileSync('/out/sound/' + earlier + '.json', 'utf8')) : null;
console.log('music, integrated loudness in LUFS (a set down the side, a tune across)');
console.log(col('', 22) + out.tunes.map((_, k) => pad('T' + (k + 1), 7)).join('') + pad('mean', 8) + pad('peak', 7));
out.music.forEach((row, s) => console.log(col(out.sets[s], 22) + row.map(m => pad(f1(m.I), 7)).join('') + pad(f1(row.reduce((a, m) => a + m.I, 0) / row.length), 8) + pad(f1(Math.max(...row.map(m => m.peak))), 7)));
console.log(col('mean of the six', 22) + out.tunes.map((_, k) => pad(f1(out.music.reduce((a, r) => a + r[k].I, 0) / out.music.length), 7)).join(''));
const all = out.music.flat().map(m => m.I);
console.log('  ' + out.tunes.map((n, k) => 'T' + (k + 1) + ' ' + n).join(', '));
console.log('  spread: ' + f1(Math.min(...all)) + ' to ' + f1(Math.max(...all)) + ' (' + f1(Math.max(...all) - Math.min(...all)) + ' LU)');
console.log('\neffects, the loudest 400 ms in LUFS through each set, and the highest peak in dBFS');
console.log(col('', 12) + out.sets.map((_, s) => pad('S' + (s + 1), 7)).join('') + pad('peak', 8));
for (const name of Object.keys(out.fx).sort((p, q) => out.fx[q][0].M - out.fx[p][0].M)) console.log(col(name, 12) + out.fx[name].map(m => pad(f1(m.M), 7)).join('') + pad(f1(Math.max(...out.fx[name].map(m => m.peak))), 8));
console.log('\nbeds, integrated loudness in LUFS');
for (const name of AMB) console.log(col(name, 12) + pad(f1(out.amb[name].I), 7) + pad(f1(out.amb[name].peak), 8));
console.log(col('rain, heavy', 12) + pad(f1(out.rain.I), 7) + pad(f1(out.rain.peak), 8));
console.log('\nthe pile-up, peak in dBFS (0 clips)');
out.pile.forEach((p, s) => console.log(col(out.sets[s], 22) + pad(f1(p.peak), 7) + '  ' + p.tune + ', ' + p.bed + ', rain, ' + p.fx.join(' ')));
if (was) {
  console.log('\nchanged by more than half a unit since ' + earlier);
  const diff = (what, a, b, key) => { if (a && b && Math.abs(a[key] - b[key]) > 0.5) console.log('  ' + col(what, 34) + pad(f1(b[key]), 7) + ' to ' + pad(f1(a[key]), 6)); };
  out.music.forEach((row, s) => row.forEach((m, k) => diff(out.sets[s] + ', ' + out.tunes[k], m, was.music[s] && was.music[s][k], 'I')));
  for (const name of Object.keys(out.fx)) out.fx[name].forEach((m, s) => diff(name + ', set ' + (s + 1), m, was.fx[name] && was.fx[name][s], 'M'));
  for (const name of AMB) diff('bed: ' + name, out.amb[name], was.amb[name], 'I');
  diff('rain', out.rain, was.rain, 'I');
  out.pile.forEach((p, s) => diff('pile-up peak, ' + out.sets[s], p, was.pile[s], 'peak'));
}
// The balance.
const bad = [], mean = all.reduce((a, v) => a + v, 0) / all.length;
out.music.forEach((row, s) => row.forEach((m, k) => { if (Math.abs(m.I - mean) > 1) bad.push(out.sets[s] + ' plays ' + out.tunes[k] + ' at ' + f1(m.I) + ' LUFS, more than 1 from the mean of ' + f1(mean)); }));
for (const [name, row] of Object.entries(out.fx)) { const ms = row.map(m => m.M), lo = Math.min(...row.map(m => m.peak));
  if (Math.max(...ms) - Math.min(...ms) > 3) bad.push(name + ' differs by ' + f1(Math.max(...ms) - Math.min(...ms)) + ' LU from set to set');
  if (lo < -40) bad.push(name + ' peaks at ' + f1(lo) + ' dBFS, too quiet to hear'); }
for (const name of AMB) if (out.amb[name].I < -44 || out.amb[name].I > -35) bad.push('the bed of ' + name + ' is at ' + f1(out.amb[name].I) + ' LUFS, outside -44 to -35');
out.pile.forEach((p, s) => { if (p.peak > -1) bad.push('the pile-up through ' + out.sets[s] + ' peaks at ' + f1(p.peak) + ' dBFS'); });
bad.push(...errors);
const fxSpread = Math.max(...Object.values(out.fx).map(row => Math.max(...row.map(m => m.M)) - Math.min(...row.map(m => m.M))));
console.log('\nsound: ' + (bad.length ? 'FAILED' : 'music ' + f1(mean) + ' LUFS, every tune and set within ' + f1(Math.max(...all.map(v => Math.abs(v - mean)))) + ' LU; effects within ' + f1(fxSpread) + ' LU from set to set; the pile-up peaks at ' + f1(Math.max(...out.pile.map(p => p.peak))) + ' dBFS'));
for (const b of bad) console.log('  ' + b);
if (bad.length) process.exit(1);
