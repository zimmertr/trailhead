// The page around the world: the junction sign, the cards, the route along the bottom, and the
// sheets that open over it (trail map, kiosk, register, keys, plain page).
import { mount } from './pixel.js';
import { makeAudio } from './audio.js';
import { LINKS, INTRO, DESTINATIONS, CARDS, PROJECTS, SPIRE_ORDER, LABELS, ENDS, REGISTER, HELP, CONSOLE, FINDS, UI, NAMES, ago } from './content.js';
import { OX, OY } from './terrain.js';
import { DEBUG } from './core.js';
import { TRICKS } from './cats.js';

const $ = id => document.getElementById(id);
const el = (tag, attrs = {}, ...kids) => { const n = document.createElement(tag); for (const k in attrs) { if (k === 'class') n.className = attrs[k]; else if (k === 'text') n.textContent = attrs[k]; else if (k.startsWith('on')) n.addEventListener(k.slice(2), attrs[k]); else n.setAttribute(k, attrs[k]); } n.append(...kids.filter(k => k != null)); return n; };
const status = $('status'), fork = $('fork'), card = $('card'), line = $('line'), sheet = $('sheet'), plain = $('plain'), tip = $('tip'), toast = $('toast');
const audio = makeAudio();
const BUILT = new Date(), VERSION = 'v0.1.5, pixel build';
let api, shown = null, sheetName = null, profile = [], toastT = 0;
// A scene may hold him at a spot with no card (a stop whose id starts with 'wait:'), until Space or Start: one line says so.
let waiting = false;
const isWait = id => String(id).startsWith('wait:');
// Set when the world cannot be drawn at all and the page of text has taken its place for good.
let worldDown = false;

const linkLi = key => { const [name, href] = LINKS[key]; return el('li', {}, el('a', { href, target: '_blank', rel: 'noopener', text: name })); };
const projectOf = id => PROJECTS[id];
const slugOf = id => CARDS[id] ? CARDS[id].slug : PROJECTS[id] ? 'sideproject-spires/' + id : '';

// ------------------------------------------------------------------ cards

function showCard(id) {
  const c = CARDS[id], pr = projectOf(id); if (!c && !pr) return;
  shown = id;
  card.dataset.kind = pr ? 'project' : c.kind;
  $('card-from').textContent = pr ? UI.card.summit(pr.top) : c.from;
  $('card-title').textContent = pr ? pr.name : c.title;
  const body = $('card-body'); body.replaceChildren(...(pr ? pr.body : c.body).map(t => el('p', { text: t })));
  if (c && c.aside) body.append(el('p', { class: 'aside', text: c.aside }));
  const facts = $('card-facts'); facts.replaceChildren(); facts.hidden = !pr;
  if (pr) for (const [k, v] of [[UI.card.facts[0], String(pr.stars)], [UI.card.facts[1], pr.release ? pr.release + ', ' + ago(pr.released) : UI.card.noRelease], [UI.card.facts[2], pr.language], [UI.card.facts[3], pr.license]]) facts.append(el('dt', { text: k }), el('dd', { text: v }));
  const gauges = $('card-gauges'); gauges.replaceChildren(); gauges.hidden = !(c && c.kind === 'watch');
  if (c && c.kind === 'watch') for (const [k, w, v] of UI.card.pitches) gauges.append(el('span', { text: k }), el('i', { style: 'width:' + w + '%' }), el('span', { text: v }));
  const tools = $('card-tools'); tools.replaceChildren(...((c && c.tools) || []).map(t => el('li', { text: t }))); tools.hidden = !(c && c.tools);
  const links = $('card-links'); links.replaceChildren();
  if (pr) { links.append(el('li', {}, el('a', { href: 'https://github.com/' + pr.repo, target: '_blank', rel: 'noopener', text: UI.card.github }))); if (pr.site) links.append(el('li', {}, el('a', { href: pr.site, target: '_blank', rel: 'noopener', text: pr.site.replace('https://', '') }))); for (const [n, h] of pr.extra || []) links.append(el('li', {}, el('a', { href: h, target: '_blank', rel: 'noopener', text: n }))); }
  else for (const k of c.links) links.append(linkLi(k));
  links.hidden = !links.children.length;
  // Base camp is a menu: one plank per summit, and the way out.
  const menu = $('card-menu'); menu.replaceChildren(); menu.hidden = id !== 'base-camp';
  if (id === 'base-camp') {
    const done = api.done();
    for (const s of SPIRE_ORDER) menu.append(el('li', {}, el('button', { class: 'plank choice', onclick: () => climb(s) }, el('i', { class: 'arrow up' }), el('span', { text: PROJECTS[s].name }), el('small', { text: done['spire:' + s] ? UI.card.climbed : '' }))));
    menu.append(el('li', {}, el('button', { class: 'plank choice', onclick: walkOut }, el('i', { class: 'arrow left' }), el('span', { text: UI.card.walkOut }))));
  }
  $('card-egg').hidden = !pr; if (pr) $('card-egg').textContent = UI.card.egg(pr.top);
  $('card-draft').hidden = !((c && c.draft) || (pr && false));
  const go = $('card-go'); go.hidden = id === 'base-camp'; go.querySelector('span').textContent = pr ? UI.card.glissade : c.go || '';
  card.hidden = false; card.scrollTop = 0; audio.focus(1);
  setAddress(slugOf(id));
  audio.sfx(id === 'summit' ? 'summit' : pr ? 'flag' : 'stop');
}
function hideCard() { shown = null; card.hidden = true; audio.focus(0); }
async function home() { hideCard(); await api.setRoute('lake'); audio.place('world'); lastScene = 'world'; buildMarks(); setAddress(''); checkRegister(); }
async function travel(route) { audio.start(); audio.sfx('select'); await api.setRoute(route); buildMarks(); api.start(); }
async function climb(id) { audio.sfx('select'); hideCard(); await api.setRoute('spire:' + id); buildMarks(); api.start(); }
async function walkOut() { audio.sfx('select'); hideCard(); await api.setRoute('spires-home'); buildMarks(); api.start(); }
// A name on the map sends him there from wherever he is on it.
async function send(dest) { audio.start(); const how = await api.go(dest); if (how === 'start') return travel(dest); if (how) { audio.sfx('select'); if (how === 'turn') buildMarks(); } }
async function toCamp() { await api.setRoute('spires'); buildMarks(); api.goto('base-camp'); }
function say(text, ms = 4200) { toast.textContent = text; toast.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toast.hidden = true; }, ms); }

// ------------------------------------------------------------------ the route along the bottom

function buildMarks() {
  const marks = $('marks'); marks.replaceChildren();
  const r = api.route(), stops = api.stops();
  const all = [{ at: 0, label: r === 'back' ? '' : r.startsWith('spire:') || r === 'spires-home' ? UI.marks.camp : UI.marks.trailhead }, ...stops.filter(s => s.at < 0.995 && !isWait(s.id)).map(s => ({ at: s.at, label: LABELS[s.id] || (PROJECTS[s.id] ? UI.marks.summit : s.id) })), { at: 1, label: r.startsWith('spire:') ? UI.marks.camp : ENDS[r] || UI.marks.trailhead }];
  for (const m of all) if (m.label) marks.append(el('span', { class: 'mark' + (m.at === 0 ? ' first' : m.at === 1 ? ' last' : ''), style: 'left:' + (m.at * 100) + '%', 'data-at': m.at, text: m.label }));
  profile = api.profile(160);
  nudgeMarks();
  $('home').textContent = UI.home[r.startsWith('spire:') ? 1 : 0];
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
  for (const s of [{ at: 0 }, ...api.stops().filter(q => !isWait(q.id)), { at: 1 }]) { const x = Math.round(s.at * (w - 1)), y = yOf(x), on = s.at <= p + 0.001; g.fillStyle = '#d2a472'; g.fillRect(x, y - 5, 1, 5); g.fillStyle = on ? '#e05824' : '#f7f1dc'; g.fillRect(x + (s.at === 1 ? -3 : 1), y - 5, 3, 2); }
  const mx = Math.round(p * (w - 1)), my = yOf(mx);
  g.fillStyle = '#1a1424'; g.fillRect(mx - 2, my - 5, 5, 6); g.fillStyle = '#f4d048'; g.fillRect(mx - 1, my - 4, 3, 4); g.fillStyle = '#e05824'; g.fillRect(mx - 1, my - 4, 3, 1);
}

// ------------------------------------------------------------------ addresses

function setAddress(slug) { try { if (decodeURIComponent(location.hash.slice(1)) !== slug) history.pushState(null, '', slug ? '#' + slug : location.pathname + location.search); } catch { /* sandboxed frames may refuse */ } }
async function navigate(hash) {
  if (worldDown) return;
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
  else body.append(el('div', { class: 'band' }, el('h2', { text: UI.keys.title }), el('p', { text: UI.keys.note })), el('dl', { class: 'keys' }, ...HELP.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })])));
  sheet.hidden = false; audio.sfx('open'); audio.focus(2); $('close').focus();
}
function closeSheet() { if (!sheet.hidden) { sheet.hidden = true; sheetName = null; audio.sfx('close'); audio.focus(shown ? 1 : 0); } }

// ------------------------------------------------------------------ the debug panel
// Hidden: the backtick key opens and closes it, and so does the small sign at the foot of the trail map.
const debug = $('debug');
function openDebug(on) {
  if (!on) { debug.hidden = true; return; }
  const D = UI.debug, onOff = k => UI.map.onOff[DEBUG[k] ? 0 : 1];
  const toggle = k => el('button', { class: 'plank', 'aria-pressed': String(DEBUG[k]), onclick: e => { DEBUG[k] = !DEBUG[k]; e.currentTarget.setAttribute('aria-pressed', String(DEBUG[k])); e.currentTarget.querySelector('small').textContent = onOff(k); document.body.classList.toggle('no-labels', !DEBUG.labels); audio.sfx('step'); } }, el('span', { text: D.toggles[k] }), el('small', { text: onOff(k) }));
  const cat = el('select', { 'aria-label': D.cats }, ...Object.keys(NAMES.cats).map(id => el('option', { value: id, text: NAMES.cats[id] })));
  const trick = el('select', { 'aria-label': D.set }, ...TRICKS.map(s => el('option', { value: s, text: s })));
  debug.replaceChildren(
    el('h2', {}, el('span', { text: D.title }), el('button', { class: 'plank', style: 'width:auto', onclick: () => openDebug(false) }, el('span', { text: D.close }))),
    el('h3', { text: D.layers }), ...['trees', 'clouds', 'mist', 'labels', 'animals'].map(toggle),
    el('h3', { text: D.outlines }), ...['roam', 'taps', 'trails', 'camera'].map(toggle),
    el('h3', { text: D.cats }), el('div', { class: 'row' }, cat, trick, el('button', { class: 'plank', onclick: () => { if (window.__cats) window.__cats.force(cat.value, trick.value, performance.now() / 1000, { dur: 8 }); audio.sfx('step'); } }, el('span', { text: D.set }))),
    el('button', { class: 'plank', onclick: () => navigate('#off-route') }, el('span', { text: D.offRoute })),
    el('button', { class: 'plank', onclick: () => api.breakScene() }, el('span', { text: D.breakScene })),
    el('p', { class: 'legend', text: D.note }));
  debug.hidden = false;
}

// Where each milestone sits on the brochure map, in world pixels.
const MAP = { x: 236, y: 204, w: 600, h: 372 };
const DOTS = [
  ['', 560, 470, true], ['who', 352, 526], ['mountains', 384, 396], ['note', 446, 374],
  ['platform-engineering', 545, 366], ['site-reliability-engineering', 545, 338], ['software-engineering', 545, 308], ['summit', 545, 272],
  ['base-camp', 676, 410], ['bluebird', 703, 229], ['tks', 732, 253], ['hevy-garmin-sync', 675, 271], ['trailhead', 759, 279], ['yggdrasil', 649, 302], ['kubernetes-manifests', 782, 306]
];
function trailMap() {
  const box = el('div', { class: 'mapbox', style: `aspect-ratio:${MAP.w}/${MAP.h}` }), cv = api.mapImage(MAP.x + OX, MAP.y + OY, MAP.w, MAP.h); box.append(cv);
  for (const [id, x, y, big] of DOTS) { const name = id === '' ? UI.map.title : UI.map.dots[id] || (CARDS[id] ? CARDS[id].title : PROJECTS[id].name); box.append(el('button', { class: 'dot' + (big ? ' big' : ''), style: `left:${(x - MAP.x) / MAP.w * 100}%;top:${(y - MAP.y) / MAP.h * 100}%`, 'aria-label': name, onclick: () => navigate('#' + slugOf(id)) }, el('span', { text: name }))); }
  // Under the map, the same places as words: every milestone is a link.
  const lengths = api.info().lengths, list = ids => el('ul', {}, ...ids.map(id => el('li', {}, el('button', { text: CARDS[id] ? CARDS[id].title : PROJECTS[id].name, onclick: () => navigate('#' + slugOf(id)) }))));
  const key = el('div', { class: 'key' },
    el('div', {}, el('h3', { text: UI.map.lake[0] }), el('small', { text: UI.map.lake[1](lengths.lake) }), list(['who', 'mountains', 'note'])),
    el('div', {}, el('h3', { text: UI.map.stack[0] }), el('small', { text: UI.map.stack[1](lengths.stack) }), list(['platform-engineering', 'site-reliability-engineering', 'software-engineering', 'summit'])),
    el('div', {}, el('h3', { text: UI.map.spires[0] }), el('small', { text: UI.map.spires[1](lengths.spires) }), list(SPIRE_ORDER)));
  const done = api.done(), all = done.lake && done.stack && done.spires;
  const side = el('div', { class: 'side' },
    el('h3', { text: UI.map.elsewhere }), el('ul', { class: 'links' }, ...['resume', 'linkedin', 'github', 'strava', 'peakbagger', 'mountainproject'].map(linkLi)),
    el('h3', { text: UI.map.onMap }),
    el('button', { class: 'plank', onclick: () => navigate('#plain') }, el('span', { text: UI.map.plain })),
    el('button', { class: 'plank', onclick: () => navigate('#kiosk') }, el('span', { text: UI.kiosk.title })),
    el('button', { class: 'plank', onclick: () => { if (all) navigate('#register'); else { audio.sfx('locked'); say(UI.register.lockedSay); } } }, el('span', { text: UI.register.title }), el('small', { text: all ? UI.register.open : UI.register.locked })),
    el('h3', { text: UI.map.settings }),
    el('button', { class: 'plank', onclick: e => { toggleSound(); e.currentTarget.querySelector('small').textContent = UI.map.onOff[audio.muted() ? 1 : 0]; } }, el('span', { text: UI.map.sound }), el('small', { text: UI.map.onOff[audio.muted() ? 1 : 0] })),
    el('button', { class: 'plank', onclick: e => { nextTrack(); e.currentTarget.querySelector('small').textContent = trackName(); } }, el('span', { text: UI.map.music }), el('small', { text: trackName() })),
    el('button', { class: 'plank', onclick: e => { audio.start(); e.currentTarget.querySelector('small').textContent = audio.setSet(audio.set().index + 1); audio.sfx('flag'); } }, el('span', { text: UI.map.playedOn }), el('small', { text: audio.set().name })),
    el('button', { class: 'plank', onclick: () => { toggleDusk(); } }, el('span', { text: UI.map.dusk })),
    el('button', { class: 'plank', onclick: () => { api.forget(); say(UI.map.cleared); closeSheet(); } }, el('span', { text: UI.map.clear })),
    el('p', { class: 'legend', text: UI.map.legend }),
    el('button', { class: 'plank debug-sign', onclick: () => { closeSheet(); openDebug(true); } }, el('span', { text: UI.debug.title })));
  return [el('div', { class: 'band' }, el('h2', { text: UI.map.title }), el('p', { text: UI.map.sub })), el('div', { class: 'cols' }, el('div', {}, box, key), side)];
}
function kiosk() {
  api.find('kiosk');
  const done = api.done(), up = Math.round((Date.now() - BUILT) / 1000), found = api.found(), ids = Object.keys(FINDS);
  const cell = (k, v, cls) => el('div', {}, el('dt', { text: k }), el('dd', { class: cls || '', text: v }));
  return [el('div', { class: 'band' }, el('h2', { text: UI.kiosk.title }), el('p', { text: UI.kiosk.sub })),
    el('dl', { class: 'board' }, cell(UI.kiosk.version, VERSION), cell(UI.kiosk.deployed, BUILT.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })), cell(UI.kiosk.uptime, UI.kiosk.up(up)), cell(UI.kiosk.status[0], UI.kiosk.status[1], 'open'),
      cell(UI.map.lake[0], done.lake ? UI.kiosk.lakeDone : UI.kiosk.open), cell(UI.map.stack[0], done.stack ? UI.kiosk.stackDone : UI.kiosk.open), cell(UI.map.spires[0], UI.kiosk.summits(SPIRE_ORDER.filter(s => done['spire:' + s]).length)), cell(UI.kiosk.wildlife[0], UI.kiosk.wildlife[1])),
    el('h3', { text: UI.kiosk.checklist(ids.filter(k => found[k]).length, ids.length) }),
    el('ul', { class: 'checks' }, ...ids.map(k => el('li', { class: found[k] ? 'got' : '' }, el('b', { text: found[k] ? FINDS[k][0] : UI.kiosk.notFound }), el('span', { text: found[k] ? UI.kiosk.got : FINDS[k][1] }))))];
}
function register() {
  let mine = []; try { mine = JSON.parse(localStorage.getItem('trailhead.register') || '[]'); } catch { mine = []; }
  const list = el('ul', { class: 'entries' }, ...REGISTER.map(e => el('li', {}, el('b', { text: e.name }), el('time', { text: e.date }), el('p', { text: e.note }))), ...mine.map(e => el('li', {}, el('b', { text: e.name }), el('span', { class: 'pending', text: UI.register.pending }), el('p', { text: e.note }))));
  const name = el('input', { id: 'reg-name', maxlength: 40, required: '' }), note = el('textarea', { id: 'reg-note', rows: 3, maxlength: 240, required: '' });
  const form = el('form', { onsubmit: e => { e.preventDefault(); mine.push({ name: name.value, note: note.value }); try { localStorage.setItem('trailhead.register', JSON.stringify(mine)); } catch { /* private window */ } audio.sfx('flag'); say(UI.register.signed); openSheet('register'); } },
    el('label', { for: 'reg-name', text: UI.register.yourName }), name, el('label', { for: 'reg-note', text: UI.register.yourNote }), note, el('button', { class: 'plank', type: 'submit' }, el('span', { text: UI.register.sign })), el('p', { class: 'legend', text: UI.register.mock }));
  return [el('div', { class: 'band' }, el('h2', { text: UI.register.title }), el('p', { text: UI.register.sub })), list, form];
}
function checkRegister() { const d = api.done(); if (d.lake && d.stack && d.spires) { let told = false; try { told = localStorage.getItem('trailhead.told') === '1'; localStorage.setItem('trailhead.told', '1'); } catch { /* private window */ } if (!told) { audio.sfx('unlock'); say(UI.allDone, 7000); } } }

// The whole site as one page of text, for reading or for anything that cannot draw the world.
function openPlain() {
  const sec = (title, ...kids) => [el('h3', { text: title }), ...kids];
  const cardOut = id => { const c = CARDS[id]; return [el('h4', { text: c.title }), ...c.body.map(t => el('p', { text: t })), c.tools ? el('ul', { class: 'tools' }, ...c.tools.map(t => el('li', { text: t }))) : null, c.links.length ? el('ul', { class: 'links' }, ...c.links.map(linkLi)) : null]; };
  // Without the world there is no picture of the map and no way back to it, and the page says why.
  let still = null;
  if (!worldDown) try { still = api.mapImage(MAP.x + OX, MAP.y + OY, MAP.w, MAP.h); still.setAttribute('role', 'img'); still.setAttribute('aria-label', UI.plain.mapAlt); } catch (err) { console.error(err); still = null; }
  plain.replaceChildren(el('div', { class: 'band' }, el('h2', { text: UI.map.title }), worldDown ? null : el('button', { class: 'plank', onclick: () => navigate('') }, el('span', { text: UI.plain.back }))),
    el('div', { class: 'wrap' }, el('h1', { text: UI.name }), worldDown ? el('p', { class: 'legend', text: UI.plain.down }) : null, still,
      ...sec(UI.map.lake[0], ...['who', 'mountains', 'note'].flatMap(cardOut)), ...sec(UI.map.stack[0], ...['platform-engineering', 'site-reliability-engineering', 'software-engineering', 'summit'].flatMap(cardOut)),
      ...sec(UI.map.spires[0], ...SPIRE_ORDER.flatMap(id => { const p = PROJECTS[id]; return [el('h4', { text: p.name }), ...p.body.map(t => el('p', { text: t })), el('p', { class: 'legend', text: UI.plain.facts(p.stars, p.release ? UI.plain.released(p.release, ago(p.released)) : UI.plain.noRelease, p.language, p.license) }), el('ul', { class: 'links' }, el('li', {}, el('a', { href: 'https://github.com/' + p.repo, text: 'github.com/' + p.repo })))]; }))));
  plain.hidden = false; plain.scrollTop = 0; if (api && !worldDown) api.stop();
}
// The world cannot be drawn: everything that belongs to it goes, and the page of text is what is left.
function plainOnly() {
  worldDown = true;
  for (const id of ['top', 'bar', 'fork', 'card', 'names', 'tip', 'toast', 'sheet', 'debug', 'status']) $(id).hidden = true;
  openPlain();
}
// A scene broke under him: he is put on the off-route page and told why. If it is worse than that, plain text.
async function washedOut(e) {
  if (e.fatal) return plainOnly();
  hideCard(); closeSheet(); say(UI.broken, 6000);
  await api.setRoute('off-route'); buildMarks(); api.goto('off-route'); api.find('offroute');
}
function closePlain() { plain.hidden = true; }

// ------------------------------------------------------------------ switches

function toggleSound() { audio.start(); audio.setMuted(!audio.muted()); syncTop(); if (!audio.muted()) audio.sfx('select'); }
let lastScene = 'world';
const trackName = () => { const k = audio.track(); return k.auto ? UI.auto(k.name) : k.name; };
function nextTrack() { audio.start(); if (audio.muted()) audio.setMuted(false); audio.cycle(); syncTop(); }
function toggleDusk() { api.setTheme(api.theme() === 'dark' ? 'light' : 'dark'); syncTop(); audio.sfx('select'); if (api.theme() === 'dark') setTimeout(() => api.find('dusk'), 2500); try { localStorage.setItem('trailhead.theme', api.theme()); } catch { /* private window */ } }
function syncTop() { document.documentElement.dataset.theme = api.theme(); $('b-track').querySelector('span').textContent = trackName(); $('b-track').style.opacity = audio.muted() ? .6 : 1; $('b-sound').textContent = UI.sound[audio.muted() ? 1 : 0]; $('b-sound').setAttribute('aria-pressed', String(!audio.muted())); $('b-dusk').textContent = UI.theme[api.theme() === 'dark' ? 1 : 0]; }

// The pointer is drawn like everything else: an arrow in the sprites' ink, yellow over anything
// that can be pressed.
function cursors() {
  const ROWS = ['#', '##', '#o#', '#oo#', '#ooo#', '#oooo#', '#ooooo#', '#oooooo#', '#ooooooo#', '#oooooooo#', '#ooooo#####', '#oo#oo#', '#o# #oo#', '##  #oo#', '#    #oo#', '     ###'];
  const make = fill => { const k = 2, c = document.createElement('canvas'); c.width = 11 * k; c.height = 16 * k; const g = c.getContext('2d'); ROWS.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ' ') return; g.fillStyle = ch === '#' ? '#1a1424' : fill; g.fillRect(x * k, y * k, k, k); })); return c.toDataURL(); };
  try { const st = document.createElement('style'); st.textContent = `body, canvas#c { cursor: url(${make('#f7f1dc')}) 1 1, auto; } button, a, #line, .dot, canvas#c[style*="pointer"] { cursor: url(${make('#f4d048')}) 1 1, pointer !important; }`; document.head.append(st); } catch { /* the plain pointer is fine */ }
}

// ------------------------------------------------------------------ start

try {
  // ?break=forest (any scene), ?break=load:forest, ?break=renderer or ?break=mount: see what happens when it goes wrong.
  const breakAt = new URLSearchParams(location.search).get('break');
  if (breakAt === 'mount') throw new Error('Broken on purpose: the start');
  api = await mount($('c'), {
    theme: 'light', breakAt,
    onEvent(e) {
      if (e.type === 'broken') washedOut(e);
      else if (e.type === 'stop') { if (isWait(e.id)) { waiting = true; say(UI.wait[e.id.slice(5)] || UI.wait.go, 600000); } else showCard(e.id); }
      else if (e.type === 'leave') { hideCard(); if (waiting) { waiting = false; toast.hidden = true; } }
      else if (e.type === 'end') { if (e.route.startsWith('spire:')) toCamp().then(checkRegister); else home().then(() => { if (e.next) travel(e.next); }); }
      else if (e.type === 'sfx') audio.sfx(e.name);
      else if (e.type === 'scene') { audio.ambience(e.name); audio.place(e.name === 'world' && lastScene !== 'world' ? 'out' : e.name); lastScene = e.name; syncTop(); }
      else if (e.type === 'say') say(e.text);
      else if (e.type === 'found' && FINDS[e.id]) { const n = Object.keys(api ? api.found() : {}).filter(k => FINDS[k]).length; if (e.id !== 'kiosk') { say(UI.found(FINDS[e.id][0], n, Object.keys(FINDS).length), 5200); audio.sfx('egg'); } }
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
  // For screenshots: ?route=stack&p=0.5 or ?stop=1 or ?dusk=1 or ?done=lake,stack,spires or ?look=-200,150
  const q = new URLSearchParams(location.search);
  if (q.get('done')) api.mark(q.get('done').split(','));
  if (q.get('route')) { await api.setRoute(q.get('route')); buildMarks(); }
  if (q.get('p')) api.scrub(+q.get('p'));
  if (q.get('stop')) for (let i = 0; i < +q.get('stop'); i++) api.key('ArrowRight');
  // The view position is set once the opening has finished, since a scene change puts it back.
  if (q.get('look')) setTimeout(() => api.look(...q.get('look').split(',').map(Number)), 900);
  // It starts in Day whatever the device prefers; a visitor who chose Dusk gets Dusk next time.
  let dusk = false; try { dusk = localStorage.getItem('trailhead.theme') === 'dark'; } catch { /* private window */ }
  if (q.get('dusk') || dusk) { api.setTheme('dark'); syncTop(); }
  if (q.get('sheet')) openSheet(q.get('sheet'));
  // ?debug=roam,taps,-trees opens the panel with those outlines on and those layers off.
  if (q.get('debug') != null) { for (const k of q.get('debug').split(',')) { const off = k.startsWith('-'), key = off ? k.slice(1) : k; if (key in DEBUG) DEBUG[key] = !off; } document.body.classList.toggle('no-labels', !DEBUG.labels); openDebug(true); }
  if (location.hash.length > 1 && !q.get('route')) await navigate(location.hash);
  audio.ambience('world'); audio.onchange = syncTop;
  status.hidden = true;
  window.__ready = true;
  try { console.log(...CONSOLE); } catch { /* no console */ }
} catch (err) {
  // Nothing could be drawn at all: the whole site as a page of text takes the world's place.
  try { plainOnly(); } catch { status.hidden = false; status.textContent = UI.fail; }
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
  if (worldDown) return;
  if (e.target.closest && e.target.closest('input, textarea')) return;
  audio.start();
  if (e.code === 'Backquote' && !e.metaKey && !e.ctrlKey && !e.altKey) { openDebug(debug.hidden); e.preventDefault(); return; }
  if (e.code === 'Escape') { if (!plain.hidden) navigate(''); else if (!sheet.hidden) closeSheet(); else if (!debug.hidden) openDebug(false); else openSheet('map'); e.preventDefault(); return; }
  if (!sheet.hidden || !plain.hidden) return;
  // A key held with Command, Control or Alt belongs to the browser.
  if (e.metaKey || e.ctrlKey || e.altKey) return;
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

const names = $('names'); let nameKey = '', nameBox = null;
addEventListener('resize', () => { nameBox = null; });
(function tick() {
  requestAnimationFrame(tick);
  if (worldDown) return;
  const p = api.progress(), running = api.running();
  drawProfile(p);
  $('thumb').setAttribute('aria-valuenow', Math.round(p * 100));
  document.querySelectorAll('.mark').forEach(d => d.classList.toggle('passed', +d.dataset.at <= p + 0.001));
  $('run').textContent = UI.run[running ? 1 : 0];
  fork.hidden = running || p > 0.002 || shown != null || api.route() !== 'lake';
  // The six summits carry their names at base camp, and the four places carry theirs on the map. The tags
  // are made once and then only moved, so a press that starts on one still lands on it while the view pans.
  const labels = sheet.hidden && plain.hidden ? api.labels() : [], done = api.done(), key = labels.map(l => l.id + (done[l.id.startsWith('go:') ? l.id.slice(3) : 'spire:' + l.id] ? '+' : '')).join('|');
  if (key !== nameKey) { nameKey = key; nameBox = null; names.replaceChildren(...labels.map(l => { const go = l.id.startsWith('go:'); return el('button', { class: 'name' + (done[go ? l.id.slice(3) : 'spire:' + l.id] ? ' done' : ''), text: l.name, onclick: e => { e.currentTarget.blur(); if (go) send(l.id.slice(3)); else climb(l.id); } }); })); }
  if (!nameBox) { nameBox = { t: $('top').getBoundingClientRect().bottom + 4, b: $('bar').getBoundingClientRect().top - 6, w: innerWidth, sizes: [...names.children].map(b => [b.offsetWidth, b.offsetHeight]) }; }
  // A place that is out of view keeps its name at the nearest edge, so he can be sent there from anywhere on the map.
  const put = [];
  labels.forEach((l, i) => {
    const b = names.children[i], [w, h] = nameBox.sizes[i]; let x = l.x, y = l.y;
    if (l.id.startsWith('go:')) {
      x = Math.min(nameBox.w - 8 - w / 2, Math.max(8 + w / 2, x)); y = Math.min(nameBox.b, Math.max(nameBox.t + h, y));
      for (let n = 0; n < 4 && put.some(q => Math.abs(q[1] - y) < h + 3 && Math.abs(q[0] - x) < (q[2] + w) / 2 + 4); n++) y += (y > (nameBox.t + nameBox.b) / 2 ? -1 : 1) * (h + 4);
      put.push([x, y, w]); b.classList.toggle('away', Math.abs(x - l.x) > 1 || Math.abs(y - l.y) > 1);
    }
    b.style.left = x + 'px'; b.style.top = y + 'px';
  });
})();
