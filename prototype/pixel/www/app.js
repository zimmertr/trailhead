// The page around the world: the junction sign, the cards, the route along the bottom, and the
// sheets that open over it (trail map, kiosk, register, keys, plain page).
import { mount } from './pixel.js';
import { makeAudio } from './audio.js';
import { LINKS, INTRO, DESTINATIONS, CARDS, PROJECTS, SPIRE_ORDER, LABELS, ENDS, REGISTER, HELP, CONSOLE, FINDS, ago } from './content.js';

const $ = id => document.getElementById(id);
const el = (tag, attrs = {}, ...kids) => { const n = document.createElement(tag); for (const k in attrs) { if (k === 'class') n.className = attrs[k]; else if (k === 'text') n.textContent = attrs[k]; else if (k.startsWith('on')) n.addEventListener(k.slice(2), attrs[k]); else n.setAttribute(k, attrs[k]); } n.append(...kids.filter(k => k != null)); return n; };
const status = $('status'), fork = $('fork'), card = $('card'), line = $('line'), sheet = $('sheet'), plain = $('plain'), tip = $('tip'), toast = $('toast');
const audio = makeAudio();
const BUILT = new Date(), VERSION = 'v0.1.5, pixel build';
let api, shown = null, sheetName = null, profile = [], toastT = 0;

const linkLi = key => { const [name, href] = LINKS[key]; return el('li', {}, el('a', { href, target: '_blank', rel: 'noopener', text: name })); };
const projectOf = id => PROJECTS[id];
const slugOf = id => CARDS[id] ? CARDS[id].slug : PROJECTS[id] ? 'sideproject-spires/' + id : '';

// ------------------------------------------------------------------ cards

function showCard(id) {
  const c = CARDS[id], pr = projectOf(id); if (!c && !pr) return;
  shown = id;
  card.dataset.kind = pr ? 'project' : c.kind;
  $('card-from').textContent = pr ? 'On the summit: ' + pr.top.toLowerCase() : c.from;
  $('card-title').textContent = pr ? pr.name : c.title;
  const body = $('card-body'); body.replaceChildren(...(pr ? pr.body : c.body).map(t => el('p', { text: t })));
  if (c && c.aside) body.append(el('p', { class: 'aside', text: c.aside }));
  const facts = $('card-facts'); facts.replaceChildren(); facts.hidden = !pr;
  if (pr) for (const [k, v] of [['Stars', String(pr.stars)], ['Latest release', pr.release ? pr.release + ', ' + ago(pr.released) : 'none yet'], ['Language', pr.language], ['License', pr.license]]) facts.append(el('dt', { text: k }), el('dd', { text: v }));
  const gauges = $('card-gauges'); gauges.replaceChildren(); gauges.hidden = !(c && c.kind === 'watch');
  if (c && c.kind === 'watch') for (const [k, w, v] of [['Pitch 1', 100, 'sent'], ['Pitch 2', 100, 'one fall, caught'], ['Pitch 3', 34, 'next']]) gauges.append(el('span', { text: k }), el('i', { style: 'width:' + w + '%' }), el('span', { text: v }));
  const tools = $('card-tools'); tools.replaceChildren(...((c && c.tools) || []).map(t => el('li', { text: t }))); tools.hidden = !(c && c.tools);
  const links = $('card-links'); links.replaceChildren();
  if (pr) { links.append(el('li', {}, el('a', { href: 'https://github.com/' + pr.repo, target: '_blank', rel: 'noopener', text: 'GitHub' }))); if (pr.site) links.append(el('li', {}, el('a', { href: pr.site, target: '_blank', rel: 'noopener', text: pr.site.replace('https://', '') }))); for (const [n, h] of pr.extra || []) links.append(el('li', {}, el('a', { href: h, target: '_blank', rel: 'noopener', text: n }))); }
  else for (const k of c.links) links.append(linkLi(k));
  links.hidden = !links.children.length;
  // Base camp is a menu: one plank per summit, and the way out.
  const menu = $('card-menu'); menu.replaceChildren(); menu.hidden = id !== 'base-camp';
  if (id === 'base-camp') {
    const done = api.done();
    for (const s of SPIRE_ORDER) menu.append(el('li', {}, el('button', { class: 'plank choice', onclick: () => climb(s) }, el('i', { class: 'arrow up' }), el('span', { text: PROJECTS[s].name }), el('small', { text: done['spire:' + s] ? 'climbed' : '' }))));
    menu.append(el('li', {}, el('button', { class: 'plank choice', onclick: walkOut }, el('i', { class: 'arrow left' }), el('span', { text: 'Walk out to the Trailhead' }))));
  }
  $('card-egg').hidden = !pr; if (pr) $('card-egg').textContent = 'Click ' + pr.top.toLowerCase().replace(/^a /, 'the ') + ' up there.';
  $('card-draft').hidden = !((c && c.draft) || (pr && false));
  const go = $('card-go'); go.hidden = id === 'base-camp'; go.querySelector('span').textContent = pr ? 'Glissade to camp' : c.go || '';
  card.hidden = false; card.scrollTop = 0; audio.focus(1);
  setAddress(slugOf(id));
  audio.sfx(id === 'summit' ? 'summit' : pr ? 'flag' : 'stop');
}
function hideCard() { shown = null; card.hidden = true; audio.focus(0); }
async function home() { hideCard(); await api.setRoute('lake'); buildMarks(); setAddress(''); checkRegister(); }
async function travel(route) { audio.start(); audio.sfx('select'); await api.setRoute(route); buildMarks(); api.start(); }
async function climb(id) { audio.sfx('select'); hideCard(); await api.setRoute('spire:' + id); buildMarks(); api.start(); }
async function walkOut() { audio.sfx('select'); hideCard(); await api.setRoute('spires-home'); buildMarks(); api.start(); }
async function toCamp() { await api.setRoute('spires'); buildMarks(); api.goto('base-camp'); }
function say(text, ms = 4200) { toast.textContent = text; toast.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toast.hidden = true; }, ms); }

// ------------------------------------------------------------------ the route along the bottom

function buildMarks() {
  const marks = $('marks'); marks.replaceChildren();
  const r = api.route(), stops = api.stops();
  const all = [{ at: 0, label: r.startsWith('spire:') || r === 'spires-home' ? 'Base camp' : 'Trailhead' }, ...stops.filter(s => s.at < 0.995).map(s => ({ at: s.at, label: LABELS[s.id] || (PROJECTS[s.id] ? 'Summit' : s.id) })), { at: 1, label: r.startsWith('spire:') ? 'Base camp' : ENDS[r] || 'Trailhead' }];
  for (const m of all) marks.append(el('span', { class: 'mark' + (m.at === 0 ? ' first' : m.at === 1 ? ' last' : ''), style: 'left:' + (m.at * 100) + '%', 'data-at': m.at, text: m.label }));
  profile = api.profile(160);
  nudgeMarks();
  $('home').textContent = r.startsWith('spire:') ? 'Camp' : 'Trailhead';
}
// Labels of milestones that sit close together are pushed apart, left to right.
function nudgeMarks() {
  const marks = [...$('marks').children]; if (!marks.length) return;
  let edge = -1e9;
  for (const m of marks) { m.style.marginLeft = '0px'; const r = m.getBoundingClientRect(); if (r.left < edge + 4 && !m.classList.contains('last')) m.style.marginLeft = (edge + 4 - r.left) + 'px'; edge = m.getBoundingClientRect().right; }
  for (let i = marks.length - 1; i > 0; i--) { const a = marks[i - 1].getBoundingClientRect(), b = marks[i].getBoundingClientRect(); if (a.right > b.left - 4) marks[i - 1].style.marginLeft = (parseFloat(marks[i - 1].style.marginLeft) - (a.right - b.left + 4)) + 'px'; }
}
function drawProfile(p) {
  const c = $('prof'), k = api.scale(), w = Math.max(40, Math.round(line.clientWidth / k)), h = Math.max(8, Math.round(line.clientHeight / k));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext('2d'); g.clearRect(0, 0, w, h);
  const lo = Math.min(...profile), hi = Math.max(...profile, lo + 1), yOf = i => { const f = i / (w - 1) * (profile.length - 1), a = Math.floor(f), b = Math.min(profile.length - 1, a + 1), v = profile[a] + (profile[b] - profile[a]) * (f - a); return Math.round(h - 3 - (v - lo) / Math.max(hi - lo, 60) * (h - 9)); };
  for (let x = 0; x < w; x++) {
    const y = yOf(x), passed = x / (w - 1) <= p;
    g.fillStyle = passed ? '#a8804e' : '#5c3a20'; g.fillRect(x, y + 1, 1, h - y - 1);
    g.fillStyle = passed ? '#c8a266' : '#6e462c'; for (let yy = y + 2 + ((x * 7) % 3); yy < h; yy += 3) if ((x + yy) % 2 === 0) g.fillRect(x, yy, 1, 1);
    g.fillStyle = passed ? '#f4d048' : '#f8ebb8'; g.fillRect(x, y, 1, 1);
  }
  for (const s of [{ at: 0 }, ...api.stops(), { at: 1 }]) { const x = Math.round(s.at * (w - 1)), y = yOf(x), on = s.at <= p + 0.001; g.fillStyle = '#d2a472'; g.fillRect(x, y - 5, 1, 5); g.fillStyle = on ? '#e05824' : '#f7f1dc'; g.fillRect(x + (s.at === 1 ? -3 : 1), y - 5, 3, 2); }
  const mx = Math.round(p * (w - 1)), my = yOf(mx);
  g.fillStyle = '#1a1424'; g.fillRect(mx - 2, my - 5, 5, 6); g.fillStyle = '#f4d048'; g.fillRect(mx - 1, my - 4, 3, 4); g.fillStyle = '#e05824'; g.fillRect(mx - 1, my - 4, 3, 1);
}

// ------------------------------------------------------------------ addresses

function setAddress(slug) { try { if (decodeURIComponent(location.hash.slice(1)) !== slug) history.pushState(null, '', slug ? '#' + slug : location.pathname + location.search); } catch { /* sandboxed frames may refuse */ } }
async function navigate(hash) {
  const slug = decodeURIComponent((hash || '').replace(/^#\/?/, ''));
  closeSheet(); closePlain();
  if (!slug) return home();
  if (slug === 'map' || slug === 'register' || slug === 'kiosk' || slug === 'keys') return openSheet(slug);
  if (slug === 'plain') return openPlain();
  const dest = DESTINATIONS.find(d => d.slug === slug && d.route !== 'spires');
  if (dest) { await api.setRoute(dest.route); buildMarks(); hideCard(); return; }
  const id = Object.keys(CARDS).find(k => CARDS[k].slug === slug) || (slug.startsWith('sideproject-spires/') && PROJECTS[slug.split('/')[1]] ? slug.split('/')[1] : null);
  if (!id) { await api.setRoute('off-route'); buildMarks(); api.goto('off-route'); api.find('offroute'); return; }
  await api.setRoute(PROJECTS[id] ? 'spire:' + id : CARDS[id].route); buildMarks(); api.goto(id);
}

// ------------------------------------------------------------------ sheets

function openSheet(name) {
  const body = $('sheet-body'); body.replaceChildren(); sheetName = name;
  if (name === 'map') body.append(...trailMap());
  else if (name === 'kiosk') body.append(...kiosk());
  else if (name === 'register') body.append(...register());
  else body.append(el('div', { class: 'band' }, el('h2', { text: 'Keys' }), el('p', { text: 'Everything also works by touch.' })), el('dl', { class: 'keys' }, ...HELP.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })])));
  sheet.hidden = false; audio.sfx('open'); audio.focus(2); $('close').focus();
}
function closeSheet() { if (!sheet.hidden) { sheet.hidden = true; sheetName = null; audio.sfx('close'); audio.focus(shown ? 1 : 0); } }

// Where each milestone sits on the brochure map, in world pixels.
const MAP = { x: 236, y: 204, w: 600, h: 372 };
const DOTS = [
  ['', 'Trailhead', 560, 470, true], ['who', 'Who TJ is', 352, 526], ['mountains', 'In the mountains', 384, 396], ['note', 'A personal note', 446, 374],
  ['platform-engineering', 'Platform Engineering', 545, 366], ['site-reliability-engineering', 'Site Reliability Engineering', 545, 338], ['software-engineering', 'Software Engineering', 545, 308], ['summit', 'The summit', 545, 272],
  ['base-camp', 'Base camp', 676, 410], ['bluebird', 'Bluebird Forecast', 703, 229], ['tks', 'TJs-Kubernetes-Service', 732, 253], ['hevy-garmin-sync', 'hevy-garmin-sync', 675, 271], ['trailhead', 'trailhead', 759, 279], ['yggdrasil', 'yggdrasil', 649, 302], ['kubernetes-manifests', 'Kubernetes-Manifests', 782, 306]
];
function trailMap() {
  const box = el('div', { class: 'mapbox', style: `aspect-ratio:${MAP.w}/${MAP.h}` }), cv = api.mapImage(MAP.x, MAP.y, MAP.w, MAP.h); box.append(cv);
  for (const [id, name, x, y, big] of DOTS) box.append(el('button', { class: 'dot' + (big ? ' big' : ''), style: `left:${(x - MAP.x) / MAP.w * 100}%;top:${(y - MAP.y) / MAP.h * 100}%`, 'aria-label': name, onclick: () => navigate('#' + slugOf(id)) }, el('span', { text: name })));
  // Under the map, the same places as words: every milestone is a link.
  const lengths = api.info().lengths, list = ids => el('ul', {}, ...ids.map(id => el('li', {}, el('button', { text: CARDS[id] ? CARDS[id].title : PROJECTS[id].name, onclick: () => navigate('#' + slugOf(id)) }))));
  const key = el('div', { class: 'key' },
    el('div', {}, el('h3', { text: 'About Lake' }), el('small', { text: lengths.lake + ' km loop, on foot' }), list(['who', 'mountains', 'note'])),
    el('div', {}, el('h3', { text: 'The Stack' }), el('small', { text: lengths.stack + ' km in, three pitches up' }), list(['platform-engineering', 'site-reliability-engineering', 'software-engineering', 'summit'])),
    el('div', {}, el('h3', { text: 'Sideproject Spires' }), el('small', { text: lengths.spires + ' km to base camp, six summits' }), list(SPIRE_ORDER)));
  const done = api.done(), all = done.lake && done.stack && done.spires;
  const side = el('div', { class: 'side' },
    el('h3', { text: 'TJ elsewhere' }), el('ul', { class: 'links' }, ...['resume', 'linkedin', 'github', 'strava', 'peakbagger', 'mountainproject'].map(linkLi)),
    el('h3', { text: 'On this map' }),
    el('button', { class: 'plank', onclick: () => navigate('#plain') }, el('span', { text: 'Read as a page' })),
    el('button', { class: 'plank', onclick: () => navigate('#kiosk') }, el('span', { text: 'Trail conditions' })),
    el('button', { class: 'plank', onclick: () => { if (all) navigate('#register'); else { audio.sfx('locked'); say('The summit register opens once all three destinations are done.'); } } }, el('span', { text: 'Summit register' }), el('small', { text: all ? 'open' : 'locked' })),
    el('h3', { text: 'Settings' }),
    el('button', { class: 'plank', onclick: e => { toggleSound(); e.currentTarget.querySelector('small').textContent = audio.muted() ? 'off' : 'on'; } }, el('span', { text: 'Sound' }), el('small', { text: audio.muted() ? 'off' : 'on' })),
    el('button', { class: 'plank', onclick: e => { nextTrack(); e.currentTarget.querySelector('small').textContent = audio.track().name; } }, el('span', { text: 'Music' }), el('small', { text: audio.track().name })),
    el('button', { class: 'plank', onclick: e => { audio.start(); e.currentTarget.querySelector('small').textContent = audio.setSet(audio.set().index + 1); audio.sfx('flag'); } }, el('span', { text: 'Played on' }), el('small', { text: audio.set().name })),
    el('button', { class: 'plank', onclick: () => { toggleDusk(); } }, el('span', { text: 'Day or dusk' })),
    el('button', { class: 'plank', onclick: () => { api.forget(); say('Flags and footprints cleared.'); closeSheet(); } }, el('span', { text: 'Clear my flags' })),
    el('p', { class: 'legend', text: 'Small names on the map are real signs in the world: Scope Creep Glacier, Segfault Scree, Merge Conflict Col, Yak Shave Meadow, Cache Miss Creek, Legacy Grove, Cold Start Cove, Deadlock Ledge, Rollback Roof, Tech Debt Crevasse and Race Condition Ridge.' }));
  return [el('div', { class: 'band' }, el('h2', { text: 'Trailhead' }), el('p', { text: 'TJ Zimmerman, Seattle, Washington' })), el('div', { class: 'cols' }, el('div', {}, box, key), side)];
}
function kiosk() {
  api.find('kiosk');
  const done = api.done(), up = Math.round((Date.now() - BUILT) / 1000), found = api.found(), ids = Object.keys(FINDS);
  const cell = (k, v, cls) => el('div', {}, el('dt', { text: k }), el('dd', { class: cls || '', text: v }));
  return [el('div', { class: 'band' }, el('h2', { text: 'Trail conditions' }), el('p', { text: 'Posted at the Trailhead kiosk' })),
    el('dl', { class: 'board' }, cell('Running version', VERSION), cell('Deployed', BUILT.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })), cell('Uptime', up < 90 ? up + ' seconds' : Math.round(up / 60) + ' minutes'), cell('Status', 'All trails open', 'open'),
      cell('About Lake', done.lake ? 'Run. Flag flying.' : 'Open'), cell('The Stack', done.stack ? 'Climbed. Flag flying.' : 'Open'), cell('Sideproject Spires', SPIRE_ORDER.filter(s => done['spire:' + s]).length + ' of 6 summits'), cell('Wildlife', 'Elk, a bear, two cats')),
    el('h3', { text: 'Field checklist: ' + ids.filter(k => found[k]).length + ' of ' + ids.length + ' found' }),
    el('ul', { class: 'checks' }, ...ids.map(k => el('li', { class: found[k] ? 'got' : '' }, el('b', { text: found[k] ? FINDS[k][0] : 'Not found yet' }), el('span', { text: found[k] ? 'Found' : FINDS[k][1] }))))];
}
function register() {
  let mine = []; try { mine = JSON.parse(localStorage.getItem('trailhead.register') || '[]'); } catch { mine = []; }
  const list = el('ul', { class: 'entries' }, ...REGISTER.map(e => el('li', {}, el('b', { text: e.name }), el('time', { text: e.date }), el('p', { text: e.note }))), ...mine.map(e => el('li', {}, el('b', { text: e.name }), el('span', { class: 'pending', text: 'waiting for TJ to approve it' }), el('p', { text: e.note }))));
  const name = el('input', { id: 'reg-name', maxlength: 40, required: '' }), note = el('textarea', { id: 'reg-note', rows: 3, maxlength: 240, required: '' });
  const form = el('form', { onsubmit: e => { e.preventDefault(); mine.push({ name: name.value, note: note.value }); try { localStorage.setItem('trailhead.register', JSON.stringify(mine)); } catch { /* private window */ } audio.sfx('flag'); say('Signed. Your entry waits for TJ to approve it.'); openSheet('register'); } },
    el('label', { for: 'reg-name', text: 'Your name' }), name, el('label', { for: 'reg-note', text: 'A note for the register' }), note, el('button', { class: 'plank', type: 'submit' }, el('span', { text: 'Sign the register' })), el('p', { class: 'legend', text: 'This is a mock. Entries stay in this browser.' }));
  return [el('div', { class: 'band' }, el('h2', { text: 'Summit register' }), el('p', { text: 'You did all three. Sign in.' })), list, form];
}
function checkRegister() { const d = api.done(); if (d.lake && d.stack && d.spires) { let told = false; try { told = localStorage.getItem('trailhead.told') === '1'; localStorage.setItem('trailhead.told', '1'); } catch { /* private window */ } if (!told) { audio.sfx('unlock'); say('All three destinations done. The summit register is open, on the trail map.', 7000); } } }

// The whole site as one page of text, for reading or for anything that cannot draw the world.
function openPlain() {
  const sec = (title, ...kids) => [el('h3', { text: title }), ...kids];
  const cardOut = id => { const c = CARDS[id]; return [el('h4', { text: c.title }), ...c.body.map(t => el('p', { text: t })), c.tools ? el('ul', { class: 'tools' }, ...c.tools.map(t => el('li', { text: t }))) : null, c.links.length ? el('ul', { class: 'links' }, ...c.links.map(linkLi)) : null]; };
  const still = api.mapImage(MAP.x, MAP.y, MAP.w, MAP.h); still.setAttribute('role', 'img'); still.setAttribute('aria-label', 'The map of the world: a lake in a forest, a granite wall and six glaciated summits around a trailhead');
  plain.replaceChildren(el('div', { class: 'band' }, el('h2', { text: 'Trailhead' }), el('button', { class: 'plank', onclick: () => navigate('') }, el('span', { text: 'Back to the world' }))),
    el('div', { class: 'wrap' }, el('h1', { text: 'TJ Zimmerman' }), el('p', { text: 'TJ Zimmerman ' + INTRO.replace(' Choose a destination to learn more!', '') }), still,
      ...sec('About Lake', ...['who', 'mountains', 'note'].flatMap(cardOut)), ...sec('The Stack', ...['platform-engineering', 'site-reliability-engineering', 'software-engineering', 'summit'].flatMap(cardOut)),
      ...sec('Sideproject Spires', ...SPIRE_ORDER.flatMap(id => { const p = PROJECTS[id]; return [el('h4', { text: p.name }), ...p.body.map(t => el('p', { text: t })), el('p', { class: 'legend', text: `${p.stars} stars, ${p.release ? p.release + ' released ' + ago(p.released) : 'no release yet'}, ${p.language}, ${p.license}` }), el('ul', { class: 'links' }, el('li', {}, el('a', { href: 'https://github.com/' + p.repo, text: 'github.com/' + p.repo })))]; }))));
  plain.hidden = false; plain.scrollTop = 0; api.stop();
}
function closePlain() { plain.hidden = true; }

// ------------------------------------------------------------------ switches

function toggleSound() { audio.start(); audio.setMuted(!audio.muted()); syncTop(); if (!audio.muted()) audio.sfx('select'); }
function nextTrack() { audio.start(); if (audio.muted()) audio.setMuted(false); audio.setTrack(audio.track().index + 1); syncTop(); }
function toggleDusk() { api.setTheme(api.theme() === 'dark' ? 'light' : 'dark'); syncTop(); audio.sfx('select'); if (api.theme() === 'dark') setTimeout(() => api.find('dusk'), 2500); try { localStorage.setItem('trailhead.theme', api.theme()); } catch { /* private window */ } }
function syncTop() { document.documentElement.dataset.theme = api.theme(); $('b-track').querySelector('span').textContent = audio.track().name; $('b-track').style.opacity = audio.muted() ? .6 : 1; $('b-sound').textContent = audio.muted() ? 'Sound off' : 'Sound on'; $('b-sound').setAttribute('aria-pressed', String(!audio.muted())); $('b-dusk').textContent = api.theme() === 'dark' ? 'Day' : 'Dusk'; }

// The pointer is drawn like everything else: an arrow in the sprites' ink, yellow over anything
// that can be pressed.
function cursors() {
  const ROWS = ['#', '##', '#o#', '#oo#', '#ooo#', '#oooo#', '#ooooo#', '#oooooo#', '#ooooooo#', '#oooooooo#', '#ooooo#####', '#oo#oo#', '#o# #oo#', '##  #oo#', '#    #oo#', '     ###'];
  const make = fill => { const k = 2, c = document.createElement('canvas'); c.width = 11 * k; c.height = 16 * k; const g = c.getContext('2d'); ROWS.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ' ') return; g.fillStyle = ch === '#' ? '#1a1424' : fill; g.fillRect(x * k, y * k, k, k); })); return c.toDataURL(); };
  try { const st = document.createElement('style'); st.textContent = `body, canvas#c { cursor: url(${make('#f7f1dc')}) 1 1, auto; } button, a, #line, .dot, canvas#c[style*="pointer"] { cursor: url(${make('#f4d048')}) 1 1, pointer !important; }`; document.head.append(st); } catch { /* the plain pointer is fine */ }
}

// ------------------------------------------------------------------ start

try {
  api = await mount($('c'), {
    theme: 'light',
    onEvent(e) {
      if (e.type === 'stop') showCard(e.id);
      else if (e.type === 'leave') hideCard();
      else if (e.type === 'end') { if (e.route.startsWith('spire:')) toCamp().then(checkRegister); else home(); }
      else if (e.type === 'sfx') audio.sfx(e.name);
      else if (e.type === 'scene') audio.ambience(e.name);
      else if (e.type === 'say') say(e.text);
      else if (e.type === 'found' && FINDS[e.id]) { const n = Object.keys(api ? api.found() : {}).filter(k => FINDS[k]).length; if (e.id !== 'kiosk') { say('Found: ' + FINDS[e.id][0] + '. ' + n + ' of ' + Object.keys(FINDS).length + ' on the kiosk checklist.', 5200); audio.sfx('egg'); } }
      else if (e.type === 'hover') { tip.hidden = !e.label; if (e.label) { tip.textContent = e.label; tip.style.left = e.x + 'px'; tip.style.top = (e.y - 4) + 'px'; if (e.tap) { clearTimeout(tip._t); tip._t = setTimeout(() => { tip.hidden = true; }, 2200); } } }
      else if (e.type === 'act') { if (e.id === 'kiosk') openSheet('kiosk'); else if (e.id.startsWith('spire:')) climb(e.id.slice(6)); }
    }
  });
  $('intro').textContent = INTRO;
  const lengths = api.info().lengths;
  for (const d of DESTINATIONS) $('signs').append(el('li', {}, el('button', { class: 'plank choice', 'data-route': d.route, onclick: e => { e.currentTarget.blur(); travel(d.route); } }, el('i', { class: 'arrow ' + d.dir }), el('span', {}, el('span', { text: d.sign }), el('span', { class: 'where', text: d.about })), el('small', { text: d.route === 'lake' ? lengths.lake + ' km loop' : lengths[d.route] + ' km' }))));
  for (const id of ['top', 'bar']) $(id).hidden = false;
  buildMarks(); syncTop(); cursors();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(nudgeMarks);
  document.documentElement.style.setProperty('--px', api.scale() + 'px');
  addEventListener('resize', () => setTimeout(() => { document.documentElement.style.setProperty('--px', api.scale() + 'px'); nudgeMarks(); }, 0));
  // For screenshots: ?route=stack&p=0.5 or ?stop=1 or ?dusk=1 or ?done=lake,stack,spires
  const q = new URLSearchParams(location.search);
  if (q.get('done')) api.mark(q.get('done').split(','));
  if (q.get('route')) { await api.setRoute(q.get('route')); buildMarks(); }
  if (q.get('p')) api.scrub(+q.get('p'));
  if (q.get('stop')) for (let i = 0; i < +q.get('stop'); i++) api.key('ArrowRight');
  // It starts in Day whatever the device prefers; a visitor who chose Dusk gets Dusk next time.
  let dusk = false; try { dusk = localStorage.getItem('trailhead.theme') === 'dark'; } catch { /* private window */ }
  if (q.get('dusk') || dusk) { api.setTheme('dark'); syncTop(); }
  if (q.get('sheet')) openSheet(q.get('sheet'));
  if (location.hash.length > 1 && !q.get('route')) await navigate(location.hash);
  audio.ambience('world');
  status.hidden = true;
  window.__ready = true;
  try { console.log(...CONSOLE); } catch { /* no console */ }
} catch (err) {
  status.textContent = 'The world could not be drawn here. The trail map has everything as text.';
  throw err;
}

addEventListener('pointerdown', () => audio.start(), { once: false, passive: true });
addEventListener('popstate', () => navigate(location.hash));
$('run').addEventListener('click', e => { audio.start(); api.toggle(); e.currentTarget.blur(); });
$('home').addEventListener('click', e => { e.currentTarget.blur(); if (api.route().startsWith('spire:')) toCamp(); else home(); audio.sfx('select'); });
$('card-go').addEventListener('click', () => { const c = CARDS[shown]; audio.sfx('select'); if (c && c.home) home(); else api.start(); });
$('b-map').addEventListener('click', e => { e.currentTarget.blur(); openSheet('map'); });
$('b-sound').addEventListener('click', e => { e.currentTarget.blur(); toggleSound(); });
$('b-track').addEventListener('click', e => { e.currentTarget.blur(); nextTrack(); });
$('b-dusk').addEventListener('click', e => { e.currentTarget.blur(); toggleDusk(); });
$('b-help').addEventListener('click', e => { e.currentTarget.blur(); openSheet('keys'); });
$('close').addEventListener('click', closeSheet);
sheet.addEventListener('pointerdown', e => { if (e.target === sheet) closeSheet(); });

addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input, textarea')) return;
  audio.start();
  if (e.code === 'Escape') { if (!plain.hidden) navigate(''); else if (!sheet.hidden) closeSheet(); else openSheet('map'); e.preventDefault(); return; }
  if (!sheet.hidden || !plain.hidden) return;
  if (e.code === 'KeyM') { openSheet('map'); return; }
  if (e.code === 'KeyT') { toggleDusk(); return; }
  if (e.target.closest && e.target.closest('button, a') && (e.code === 'Space' || e.code === 'Enter')) return;
  if (api.key(e.code)) e.preventDefault();
});

let dragging = false;
const scrubTo = e => { const r = line.getBoundingClientRect(); api.scrub((e.clientX - r.left) / r.width); };
line.addEventListener('pointerdown', e => { dragging = true; line.setPointerCapture(e.pointerId); scrubTo(e); });
line.addEventListener('pointermove', e => { if (dragging) scrubTo(e); });
line.addEventListener('pointerup', () => { dragging = false; });
line.addEventListener('pointercancel', () => { dragging = false; });
$('thumb').addEventListener('keydown', e => { if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { api.scrub(api.progress() + (e.code === 'ArrowRight' ? 0.02 : -0.02)); e.preventDefault(); e.stopPropagation(); } });

const names = $('names'); let nameKey = '';
(function tick() {
  requestAnimationFrame(tick);
  const p = api.progress(), running = api.running();
  drawProfile(p);
  $('thumb').setAttribute('aria-valuenow', Math.round(p * 100));
  document.querySelectorAll('.mark').forEach(d => d.classList.toggle('passed', +d.dataset.at <= p + 0.001));
  $('run').textContent = running ? 'Stop' : 'Start';
  fork.hidden = running || p > 0.002 || shown != null || api.route() !== 'lake';
  // The six summits carry their names at base camp.
  const labels = sheet.hidden && plain.hidden ? api.labels() : [], key = labels.map(l => l.id + Math.round(l.x) + ',' + Math.round(l.y)).join('|');
  if (key !== nameKey) { nameKey = key; const done = api.done(); names.replaceChildren(...labels.map(l => el('button', { class: 'name' + (done['spire:' + l.id] ? ' done' : ''), style: `left:${l.x}px;top:${l.y}px`, text: l.name, onclick: () => climb(l.id) }))); }
})();
