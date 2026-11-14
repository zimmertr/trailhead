// Sound, all of it made in the browser: square and triangle voices and a noise channel, the way
// the consoles of the time did it. Nothing plays until the visitor has clicked or pressed a key.

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const hz = n => { const m = /^([A-G]#?)(\d)$/.exec(n); return m ? 440 * Math.pow(2, (NOTE[m[1]] + (m[2] - 4) * 12 - 9) / 12) : 0; };
// A line of music is written a step at a time: a note name starts a note, a dot holds it, a dash is silence.
const line = s => s.replace(/\|/g, ' ').trim().split(/\s+/);

// Each track: tempo, steps per beat, and one line per voice. All lines are the same length and loop.
export const TRACKS = [
  { name: 'Wildflower Meadow', bpm: 104, div: 2,
    lead: line('E5 - G5 - C6 . B5 A5 | G5 . . D5 G5 . B5 . | A5 . C6 . E6 . D6 C6 | A5 . . F5 A5 . C6 . | E5 - G5 - C6 . D6 E6 | D6 . B5 . G5 . . . | F5 . A5 . C6 . A5 . | G5 . . . . . - -'),
    arp: line('C4 E4 G4 E4 C4 E4 G4 E4 | B3 D4 G4 D4 B3 D4 G4 D4 | A3 C4 E4 C4 A3 C4 E4 C4 | A3 C4 F4 C4 A3 C4 F4 C4 | C4 E4 G4 E4 C4 E4 G4 E4 | B3 D4 G4 D4 B3 D4 G4 D4 | A3 C4 F4 C4 A3 C4 F4 C4 | B3 D4 G4 D4 B3 D4 G4 D4'),
    bass: line('C3 . . . G2 . . . | G2 . . . D3 . . . | A2 . . . E3 . . . | F2 . . . C3 . . . | C3 . . . G2 . . . | G2 . . . D3 . . . | F2 . . . C3 . . . | G2 . . . G2 . D3 .'),
    drum: line('k - h - s - h - | k - h - s - h h | k - h - s - h - | k - h - s - h h | k - h - s - h - | k - h - s - h h | k - h - s - h - | k - h - s s h h') },
  { name: 'Hall of Mosses', bpm: 80, div: 2,
    lead: line('A4 . . . C5 . E5 . | D5 . . . . . C5 . | E5 . . . G5 . E5 . | D5 . . . . . - - | A4 . . . C5 . E5 . | F5 . . . E5 . D5 . | C5 . . . B4 . G4 . | A4 . . . . . - -'),
    arp: line('A3 E4 A4 E4 A3 E4 A4 E4 | F3 C4 F4 C4 F3 C4 F4 C4 | C4 G4 C5 G4 C4 G4 C5 G4 | G3 D4 G4 D4 G3 D4 G4 D4 | A3 E4 A4 E4 A3 E4 A4 E4 | F3 C4 F4 C4 F3 C4 F4 C4 | E3 B3 E4 B3 G3 D4 G4 D4 | A3 E4 A4 E4 A3 E4 A4 E4'),
    bass: line('A2 . . . . . . . | F2 . . . . . . . | C3 . . . . . . . | G2 . . . . . . . | A2 . . . . . . . | F2 . . . . . . . | E2 . . . G2 . . . | A2 . . . . . . .'),
    drum: line('- - - - h - - - | - - - - h - - - | - - - - h - - - | - - - - h - h - | - - - - h - - - | - - - - h - - - | - - - - h - - - | - - - - h - h -') },
  { name: 'Granite Hours', bpm: 124, div: 2,
    lead: line('D5 - D5 F#5 A5 . F#5 A5 | B5 . A5 . F#5 . D5 . | C5 - C5 E5 G5 . E5 G5 | A5 . G5 . E5 . C5 . | D5 - D5 F#5 A5 . B5 D6 | C6 . B5 . A5 . G5 . | G5 . A5 . B5 . D6 . | A5 . . . . . - -'),
    arp: line('D4 A4 D4 A4 D4 A4 D4 A4 | D4 A4 D4 A4 D4 A4 D4 A4 | C4 G4 C4 G4 C4 G4 C4 G4 | C4 G4 C4 G4 C4 G4 C4 G4 | D4 A4 D4 A4 D4 A4 D4 A4 | C4 G4 C4 G4 C4 G4 C4 G4 | G3 D4 G3 D4 G3 D4 G3 D4 | A3 E4 A3 E4 A3 E4 A3 E4'),
    bass: line('D2 . D3 . D2 . D3 . | D2 . D3 . D2 . A2 . | C2 . C3 . C2 . C3 . | C2 . C3 . C2 . G2 . | D2 . D3 . D2 . D3 . | C2 . C3 . C2 . C3 . | G2 . G2 . G2 . B2 . | A2 . A2 . A2 . C#3 .'),
    drum: line('k - h k s - h - | k - h k s - h h | k - h k s - h - | k - h k s - h h | k - h k s - h - | k - h k s - h h | k - h k s - h - | k k h k s s h h') },
  { name: 'Above the Icefall', bpm: 92, div: 2,
    lead: line('B4 . . . E5 . . . | G5 . F#5 . E5 . . . | D5 . . . G5 . . . | B5 . A5 . G5 . . . | A5 . . . G5 . E5 . | F#5 . . . D5 . . . | E5 . G5 . B5 . A5 . | B5 . . . . . - -'),
    arp: line('E4 B4 E5 B4 G4 B4 E5 B4 | E4 B4 E5 B4 G4 B4 E5 B4 | G4 D5 G5 D5 B4 D5 G5 D5 | G4 D5 G5 D5 B4 D5 G5 D5 | A4 E5 A5 E5 C5 E5 A5 E5 | D4 A4 D5 A4 F#4 A4 D5 A4 | E4 B4 E5 B4 G4 B4 E5 B4 | B3 F#4 B4 F#4 D#4 F#4 B4 F#4'),
    bass: line('E2 . . . . . B2 . | E2 . . . . . . . | G2 . . . . . D3 . | G2 . . . . . . . | A2 . . . . . E3 . | D2 . . . . . A2 . | E2 . . . . . . . | B2 . . . . . . .'),
    drum: line('k - - - h - - - | - - h - - - h - | k - - - h - - - | - - h - - - h - | k - - - h - - - | - - h - - - h - | k - - - h - - - | - - h - s - h -') },
  { name: 'Larch March', bpm: 132, div: 2,
    lead: line('G5 G5 - E5 G5 . A5 . | G5 . E5 . C5 . D5 . | E5 E5 - C5 E5 . F5 . | E5 . D5 . G4 . - - | G5 G5 - E5 G5 . A5 . | C6 . B5 . A5 . G5 . | F5 . E5 . D5 . B4 . | C5 . . . . . - -'),
    arp: line('C4 G4 E4 G4 C4 G4 E4 G4 | C4 G4 E4 G4 C4 G4 E4 G4 | A3 E4 C4 E4 A3 E4 C4 E4 | G3 D4 B3 D4 G3 D4 B3 D4 | C4 G4 E4 G4 C4 G4 E4 G4 | F3 C4 A3 C4 F3 C4 A3 C4 | D4 A4 F4 A4 G3 D4 B3 D4 | C4 G4 E4 G4 C4 G4 E4 G4'),
    bass: line('C3 . G2 . C3 . G2 . | C3 . G2 . C3 . G2 . | A2 . E2 . A2 . E2 . | G2 . D2 . G2 . D2 . | C3 . G2 . C3 . G2 . | F2 . C2 . F2 . C2 . | D2 . A2 . G2 . D2 . | C3 . G2 . C3 . . .'),
    drum: line('k - s - k k s - | k - s - k k s h | k - s - k k s - | k - s - k k s h | k - s - k k s - | k - s - k k s h | k - s - k k s - | k - s - s s s -') }
];

// The same notes through three different instruments. A set names the wave each voice uses, how
// loud the drums are, and how the effects are pitched.
export const SETS = [
  { name: 'Console', lead: 'square', arp: 'square', bass: 'triangle', fx: { square: 'square', triangle: 'triangle' }, drums: 1, pitch: 1 },
  { name: 'Handheld', lead: 'pulse', arp: 'pulse', bass: 'square', fx: { square: 'pulse', triangle: 'triangle' }, drums: 0.7, pitch: 1.5, bassVol: 0.4 },
  { name: 'Music box', lead: 'sine', arp: 'triangle', bass: 'sine', fx: { square: 'sine', triangle: 'sine' }, drums: 0, pitch: 2, pluck: true, octave: 2 }
];

export function makeAudio() {
  let ctx = null, master, music, fx, amb, noiseBuf, muted = false, timer = null, step = 0, nextAt = 0, cur = Math.floor(Math.random() * TRACKS.length), set = 0, pulse = null, ambName = '', ambNodes = [], ambTimer = null;
  // A different track each visit: any but the one that played last time.
  try { muted = localStorage.getItem('trailhead.muted') === '1'; const was = +localStorage.getItem('trailhead.lastTrack'); if (was === cur) cur = (cur + 1 + Math.floor(Math.random() * (TRACKS.length - 1))) % TRACKS.length; localStorage.setItem('trailhead.lastTrack', String(cur)); const v = +localStorage.getItem('trailhead.set'); if (SETS[v]) set = v; } catch { /* private window */ }

  function start() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
    music = ctx.createGain(); music.gain.value = 0.22; music.connect(master);
    fx = ctx.createGain(); fx.gain.value = 0.5; fx.connect(master);
    amb = ctx.createGain(); amb.gain.value = 0.25; amb.connect(master);
    // A narrow pulse wave (a quarter on, three quarters off): the reedy voice of a handheld.
    { const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) { re[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * 0.25); im[k] = 2 / (k * Math.PI) * (1 - Math.cos(k * Math.PI * 0.25)); } pulse = ctx.createPeriodicWave(re, im); }
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); let s = 1; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
    nextAt = ctx.currentTime + 0.1;
    timer = setInterval(schedule, 90);
    if (ambName) ambience(ambName, true);
  }
  // One note: a square, pulse or triangle wave with a quick attack and a falling tail.
  function tone(out, type, f0, t, dur, vol, f1) {
    if (!f0) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), V = SETS[set];
    // Effects are written for the console; the other sets play them through their own voice.
    if (out === fx) { type = V.fx[type] || type; f0 *= V.pitch; if (f1) f1 *= V.pitch; if (type === 'sine') vol *= 1.5; }
    if (type === 'pulse') { o.setPeriodicWave(pulse); vol *= 0.8; } else o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (V.pluck && out === music) { dur = Math.max(dur, 0.5); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * 1.6, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    else { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.setValueAtTime(vol, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(out, t, dur, vol, freq = 4000, q = 0.7, type = 'highpass') {
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = noiseBuf; n.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(out); n.start(t, Math.random()); n.stop(t + dur + 0.02);
  }
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const tr = TRACKS[cur], dt = 60 / tr.bpm / tr.div, len = tr.lead.length;
    while (nextAt < ctx.currentTime + 0.25) {
      const i = step % len, hold = (l, k) => { let n = 1; while (l[(k + n) % len] === '.' && n < 16) n++; return n; };
      const V = SETS[set], up = V.octave || 1, dv = V.drums;
      const a = tr.lead[i]; if (a !== '.' && a !== '-') tone(music, V.lead, hz(a) * up, nextAt, dt * hold(tr.lead, i) * 0.95, 0.16);
      const b = tr.arp[i]; if (b !== '.' && b !== '-') tone(music, V.arp, hz(b) * up, nextAt, dt * 0.8, V.arp === 'square' ? 0.045 : 0.07);
      const c = tr.bass[i]; if (c !== '.' && c !== '-') tone(music, V.bass, hz(c) * up, nextAt, dt * hold(tr.bass, i) * 0.9, V.bass === 'square' ? 0.1 : 0.3);
      const dr = tr.drum[i]; if (!dv) { /* no drums in a music box */ } else if (dr === 'k') tone(music, 'triangle', 150, nextAt, 0.12, 0.4 * dv, 45); else if (dr === 's') noise(music, nextAt, 0.11, 0.16 * dv, 1800, 0.6, 'bandpass'); else if (dr === 'h') noise(music, nextAt, 0.035, 0.05 * dv, 7000);
      step++; nextAt += dt;
    }
  }

  // The effects. Each is a handful of notes.
  const FX = {
    select: t => { tone(fx, 'square', 660, t, 0.06, 0.2); tone(fx, 'square', 990, t + 0.05, 0.09, 0.2); },
    open: t => { tone(fx, 'square', 523, t, 0.05, 0.16); tone(fx, 'square', 659, t + 0.05, 0.05, 0.16); tone(fx, 'square', 784, t + 0.1, 0.1, 0.16); },
    close: t => { tone(fx, 'square', 659, t, 0.05, 0.14); tone(fx, 'square', 440, t + 0.05, 0.08, 0.14); },
    stop: t => { tone(fx, 'triangle', 392, t, 0.09, 0.4); tone(fx, 'triangle', 587, t + 0.08, 0.16, 0.4); },
    iris: t => { noise(fx, t, 0.3, 0.14, 900, 2, 'bandpass'); tone(fx, 'triangle', 300, t, 0.3, 0.2, 90); },
    hop: t => tone(fx, 'square', 280, t, 0.16, 0.2, 760),
    jump: t => tone(fx, 'square', 220, t, 0.26, 0.22, 880),
    splash: t => { noise(fx, t, 0.5, 0.3, 1400, 0.8, 'bandpass'); tone(fx, 'triangle', 500, t, 0.2, 0.2, 120); },
    whistle: t => { tone(fx, 'square', 2100, t, 0.16, 0.12, 2500); tone(fx, 'square', 2100, t + 0.2, 0.16, 0.12, 2500); },
    eep: t => tone(fx, 'square', 1800, t, 0.09, 0.14, 2400),
    fall: t => { tone(fx, 'square', 900, t, 0.3, 0.2, 140); noise(fx, t, 0.1, 0.12, 2400, 1, 'bandpass'); },
    catch: t => { tone(fx, 'triangle', 110, t, 0.2, 0.5, 70); tone(fx, 'square', 330, t + 0.12, 0.08, 0.14); },
    place: t => { noise(fx, t, 0.03, 0.14, 5000); tone(fx, 'square', 1400, t + 0.02, 0.04, 0.1); },
    glow: t => { tone(fx, 'square', 1320, t, 0.05, 0.08); tone(fx, 'square', 1760, t + 0.04, 0.08, 0.08); },
    flag: t => [523, 659, 784, 1047].forEach((f, i) => tone(fx, 'square', f, t + i * 0.09, i === 3 ? 0.34 : 0.09, 0.2)),
    summit: t => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => { tone(fx, 'square', f, t + i * 0.08, i === 5 ? 0.5 : 0.09, 0.2); tone(fx, 'triangle', f / 2, t + i * 0.08, 0.12, 0.3); }),
    glissade: t => { noise(fx, t, 2.2, 0.2, 2600, 0.5, 'bandpass'); tone(fx, 'triangle', 700, t, 2.1, 0.1, 180); },
    crack: t => { noise(fx, t, 0.35, 0.3, 500, 1, 'lowpass'); tone(fx, 'square', 160, t, 0.2, 0.18, 60); },
    wind: t => noise(fx, t, 1.4, 0.12, 700, 1.4, 'bandpass'),
    egg: t => [784, 988, 1175, 1568].forEach((f, i) => tone(fx, 'square', f, t + i * 0.06, 0.1, 0.16)),
    meow: t => { tone(fx, 'square', 620, t, 0.12, 0.16, 940); tone(fx, 'square', 940, t + 0.12, 0.2, 0.16, 520); },
    purr: t => { for (let i = 0; i < 14; i++) tone(fx, 'triangle', 52, t + i * 0.045, 0.03, 0.5); },
    chirp: t => { tone(fx, 'square', 2600, t, 0.05, 0.07, 3400); tone(fx, 'square', 3000, t + 0.08, 0.05, 0.07, 2400); },
    jay: t => { for (let i = 0; i < 3; i++) noise(fx, t + i * 0.12, 0.08, 0.12, 3000, 6, 'bandpass'); },
    bark: t => noise(fx, t, 0.2, 0.2, 300, 1, 'lowpass'),
    step: t => noise(fx, t, 0.02, 0.05, 1200, 1, 'bandpass'),
    locked: t => { tone(fx, 'square', 180, t, 0.08, 0.16); tone(fx, 'square', 150, t + 0.09, 0.12, 0.16); },
    unlock: t => [659, 784, 988, 1319].forEach((f, i) => tone(fx, 'triangle', f, t + i * 0.07, 0.14, 0.4))
  };

  // A bed of sound under each scene: wind, water, and now and then a bird.
  function ambience(name, force) {
    if (name === ambName && !force) return; ambName = name;
    if (!ctx) return;
    for (const n of ambNodes) { try { n.stop(); } catch { /* already stopped */ } } ambNodes = []; clearInterval(ambTimer);
    const bed = (freq, q, vol, type = 'bandpass') => { const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(); n.buffer = noiseBuf; n.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol; l.frequency.value = 0.13; lg.gain.value = vol * 0.5; l.connect(lg); lg.connect(g.gain); n.connect(f); f.connect(g); g.connect(amb); n.start(); l.start(); ambNodes.push(n, l); };
    if (name === 'forest') { bed(2400, 0.4, 0.12); bed(500, 0.6, 0.06); }
    else if (name === 'lakeside') { bed(900, 0.5, 0.07); bed(3000, 0.3, 0.03); }
    else if (name === 'wall') bed(500, 1.2, 0.1);
    else if (name === 'camp' || name === 'climb' || name === 'offroute') { bed(420, 1.6, 0.2); bed(1500, 0.8, 0.05); }
    else bed(1800, 0.3, 0.03);
    if (name === 'world' || name === 'forest' || name === 'lakeside') ambTimer = setInterval(() => { if (ctx.state === 'running' && Math.random() < 0.5) FX.chirp(ctx.currentTime + Math.random() * 0.5); }, 2600);
  }

  return {
    start,
    sfx(name) { if (!ctx || muted || !FX[name]) return; try { FX[name](ctx.currentTime + 0.005); } catch (e) { /* a sound is never worth an error */ } },
    ambience,
    muted: () => muted,
    setMuted(m) { muted = !!m; if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05); try { localStorage.setItem('trailhead.muted', muted ? '1' : '0'); } catch { /* private window */ } },
    track: () => ({ index: cur, name: TRACKS[cur].name, count: TRACKS.length }),
    setTrack(i) { cur = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length; step = 0; try { localStorage.setItem('trailhead.lastTrack', String(cur)); } catch { /* private window */ } return TRACKS[cur].name; },
    set: () => ({ index: set, name: SETS[set].name, count: SETS.length }),
    setSet(i) { set = ((i % SETS.length) + SETS.length) % SETS.length; try { localStorage.setItem('trailhead.set', String(set)); } catch { /* private window */ } return SETS[set].name; },
    setMusic(v) { if (music) music.gain.setTargetAtTime(v, ctx.currentTime, 0.1); }
  };
}
