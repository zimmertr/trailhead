// The page around the world: the junction sign, the cards, the route along the bottom, and the
// sheets that open over it (trail map, kiosk, register, keys, plain page).
import { mount } from './pixel.js';
import { makeAudio } from './audio.js';
import { LINKS, INTRO, DESTINATIONS, CARDS, PROJECTS, SPIRE_ORDER, LABELS, ENDS, REGISTER, HELP, CONSOLE, FINDS, UI, NAMES, DEST_NAMES, TRACK_NAMES, SET_NAMES, ago } from './content.js';
import { HANDS, INKS, shortDate } from './kiosk.js';
import { OX, OY, BAKE } from './land.js';
import { DEBUG } from './core.js';
import { TRICKS } from './cats.js';

const $ = id => document.getElementById(id);
const el = (tag, attrs = {}, ...kids) => { const n = document.createElement(tag); for (const k in attrs) { if (k === 'class') n.className = attrs[k]; else if (k === 'text') n.textContent = attrs[k]; else if (k.startsWith('on')) n.addEventListener(k.slice(2), attrs[k]); else if (k === 'style') n.style.cssText = attrs[k]; else n.setAttribute(k, attrs[k]); } n.append(...kids.filter(k => k != null)); return n; };
const status = $('status'), fork = $('fork'), card = $('card'), line = $('line'), sheet = $('sheet'), plain = $('plain'), tip = $('tip'), toast = $('toast'), tab = $('tab');
const audio = makeAudio();
const BUILT = new Date(), VERSION = 'v0.1.5, pixel build';
let api, shown = null, profile = [], toastT = 0;
// A scene may hold him at a spot with no card (a stop whose id starts with 'wait:'), until Space or Start: one line says so.
let waiting = false;
const isWait = id => String(id).startsWith('wait:');
// The junction sign and a card can each be closed with the square in their corner. A small tab is left to open them again.
let forkShut = false, cardShut = false, tabText = '';
// Set when the world cannot be drawn at all and the page of text has taken its place for good.
let worldDown = false;

const linkLi = key => { const [name, href] = LINKS[key]; return el('li', {}, el('a', { href, target: '_blank', rel: 'noopener', text: name })); };
const projectOf = id => PROJECTS[id];
// Live stars and releases from the site's API, which web's build names in a meta tag. Without it (the
// artifact, the tools) or when the API can't be reached, the numbers in content/game/sideproject-spires.yaml stand.
// Asked once, when a project card first opens, so a visit that never reaches the Spires asks nothing.
const liveFrom = document.querySelector('meta[name="trailhead:stars"]');
let liveAsked = null;
const liveNumbers = () => liveAsked || (liveAsked = !liveFrom ? Promise.resolve() : fetch(liveFrom.content).then(r => (r.ok ? r.json() : null)).then(d => {
  for (const live of (d && d.projects) || []) {
    const p = Object.values(PROJECTS).find(x => x.repo.toLowerCase() === String(live.repo).toLowerCase());
    if (!p) continue;
    if (Number.isInteger(live.stars)) p.stars = live.stars;
    if (live.release) { p.release = live.release.tag; p.released = live.release.publishedAt.slice(0, 10); }
  }
}).catch(() => {}));
const slugOf = id => CARDS[id] ? CARDS[id].slug : PROJECTS[id] ? 'sideproject-spires/' + id : '';

// ------------------------------------------------------------------ cards

function showCard(id) {
  const c = CARDS[id], pr = projectOf(id); if (!c && !pr) return;
  shown = id; cardShut = false;
  card.dataset.kind = pr ? 'project' : c.kind;
  $('card-from').textContent = pr ? UI.card.summit(pr.top) : c.from;
  $('card-title').textContent = pr ? pr.name : c.title;
  const body = $('card-body'); body.replaceChildren(...(pr ? pr.body : c.body).map(t => el('p', { text: t })));
  if (c && c.aside) body.append(el('p', { class: 'aside', text: c.aside }));
  const facts = $('card-facts'); facts.replaceChildren(); facts.hidden = !pr;
  const fillFacts = () => { facts.replaceChildren(); for (const [k, v] of [[UI.card.facts[0], String(pr.stars)], [UI.card.facts[1], pr.release ? pr.release + ', ' + ago(pr.released) : UI.card.noRelease], [UI.card.facts[2], pr.language], [UI.card.facts[3], pr.license]]) facts.append(el('dt', { text: k }), el('dd', { text: v })); };
  if (pr) { fillFacts(); liveNumbers().then(() => { if (shown === id) fillFacts(); }); }
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
  $('card-egg').hidden = !pr; if (pr) $('card-egg').textContent = pr.clue;
  $('card-draft').hidden = !((c && c.draft) || (pr && false));
  const go = $('card-go'); go.hidden = id === 'base-camp'; go.querySelector('span').textContent = pr ? UI.card.glissade : c.go || '';
  card.hidden = false; card.scrollTop = 0; audio.focus(1);
  setAddress(slugOf(id));
  audio.sfx(id === 'summit' ? 'summit' : pr ? 'flag' : 'stop');
}
function hideCard() { shown = null; cardShut = false; card.hidden = true; audio.focus(0); }
async function home() { inBook(false); hideCard(); await api.setRoute('lake'); audio.place('world'); lastScene = 'world'; buildMarks(); setAddress(''); checkRegister(); }
async function travel(route) { audio.start(); audio.sfx('select'); await api.setRoute(route); buildMarks(); api.start(); }
async function climb(id) { audio.sfx('select'); hideCard(); await api.setRoute('spire:' + id); buildMarks(); api.start(); }
// The register (L2): one click on the box and the scene changes to the book (no walk since round 5 B2).
// The trail register and the trail conditions are one place (round 6, note 23): the close-up of the box,
// with the board pinned on its back wall. The kiosk opens it with the board already up.
async function openKiosk(board) { if (book.hidden && !document.documentElement.classList.contains('in-book')) await openBook(); if (board) openSheet('kiosk'); }
async function openBook() { audio.start(); audio.sfx('select'); hideCard(); closeSheet(); tip.hidden = true; handsReady(); document.documentElement.classList.add('in-book'); setAddress('register'); await api.setRoute('register'); buildMarks(); api.start(); }
// Closing the book (L6): the round window opens back on the map with him at the junction, the Trailhead as he
// left it.
async function closeBook() { inBook(false); audio.sfx('close'); setAddress(''); await api.setRoute('register-back'); buildMarks(); api.start(); }
// The book's way out shows once it is open; the map's tags and the route bar go as he sets off for it.
let pageOpen = false;
function inBook(on) { if (!on) pageOpen = false; document.documentElement.classList.toggle('in-book', on); $('book-x').hidden = !on; book.hidden = !on; if (on) { fillBook(); handsReady().then(() => { if (!book.hidden) fillBook(); }); } }
// The book's pages (L3): the words laid over the pages the close-up draws, on its printed rules. Every
// entry is written in its own hand and ink (blue pen, black pen, pencil), taken in turn down the page so
// no two neighbours match; its slight tilt comes from its name. The rules are about 24 CSS pixels apart on any screen.
const book = $('book');
// The hands are fetched as he sets off for the box; the page is laid out again once they are in, since
// how many lines an entry takes depends on its hand.
let hands = null;
const handsReady = () => hands || (hands = document.fonts && document.fonts.load ? Promise.all(HANDS.map(([f]) => document.fonts.load('24px "' + f + '"').catch(() => null))) : Promise.resolve());
// The box seen from a step back (B01) comes first: the book, the map and the notice on it answer a click,
// as buttons laid over the picture. The book zooms into the page view, and Close the book zooms back out.
function openPage() { if (pageOpen) return; pageOpen = true; audio.sfx('open'); book.replaceChildren(); setTimeout(() => { if (pageOpen && !book.hidden) { fillBook(); $('book-x').focus({ preventScroll: true }); } }, api.regView('page') + 40); }
function closePage() { pageOpen = false; audio.sfx('close'); book.replaceChildren(); setTimeout(() => { if (!pageOpen && !book.hidden) fillBook(); }, api.regView('kiosk') + 40); }
// The trail conditions notice pinned on the back wall: what the board says first, and a click opens all of it.
function noticeAt(B, k) {
  if (!B || B.w * k < 96 || B.h * k < 40) return [];
  const ids = Object.keys(FINDS), found = api.found();
  return [el('button', { class: 'notice', style: 'left:' + B.x * k + 'px;top:' + B.y * k + 'px;width:' + B.w * k + 'px;height:' + B.h * k + 'px', onclick: () => openSheet('kiosk') },
    el('b', { text: UI.kiosk.title }), el('span', { text: UI.kiosk.status[1] }), el('span', { text: UI.kiosk.checklist(ids.filter(i => found[i]).length, ids.length) }))];
}
function fillKiosk(P) {
  const k = api.scale(), at = g => 'left:' + g.x * k + 'px;top:' + g.y * k + 'px;width:' + g.w * k + 'px;height:' + g.h * k + 'px;';
  const d = api.done(), B = P.book, mapName = $('b-map').textContent.trim();
  const clip = 'clip-path:polygon(' + (B.top[0] / B.w * 100).toFixed(1) + '% 0,' + (B.top[1] / B.w * 100).toFixed(1) + '% 0,100% 100%,0 100%);';
  book.replaceChildren(
    el('button', { class: 'spot map', style: at(P.map), 'aria-label': mapName, title: mapName, onclick: () => openSheet('map') }),
    el('button', { class: 'spot open', style: at(B) + clip, 'aria-label': UI.register.link + ', ' + (d.lake && d.stack && d.spires ? UI.register.canSign : UI.register.canRead), title: UI.register.link, onclick: openPage }),
    ...noticeAt(P.notice, k));
}
function fillBook() {
  const P = api.pages(); if (!P) { book.replaceChildren(); return; }
  const label = $('book-x').querySelector('span'); if (label) label.textContent = P.kiosk ? $('close').textContent : UI.register.close;
  if (P.kiosk) { fillKiosk(P); return; }
  const k = api.scale(), pitch = P.pitch * k, top = P.top * k, R = P.right, col = Math.round(R.w * 0.24) * k;
  const page = (g, cls) => el('div', { class: 'page ' + cls, style: 'left:' + g.x * k + 'px;top:' + g.y * k + 'px;width:' + g.w * k + 'px;height:' + g.h * k + 'px' });
  const right = page(R, 'right');
  right.append(el('span', { class: 'head', style: 'left:' + 3 * k + 'px;height:' + (top - 3 * k) + 'px', text: UI.register.book.date }), el('span', { class: 'head', style: 'left:' + (col + 3 * k) + 'px;height:' + (top - 3 * k) + 'px', text: UI.register.book.who }));
  const left = page(P.left, 'left');
  book.replaceChildren(left, right);
  book.append(...noticeAt(P.board, k));
  // The left-hand page (L4): until the lake, the peak and one Spires summit are done, TJ's note of what is
  // still to do, ticked off as each is done. After that it is blank, and the close-up lays the pencil on it.
  const done = api.done(), T = UI.register.todo;
  let mine = []; try { mine = JSON.parse(localStorage.getItem('trailhead.register') || '[]'); } catch { mine = []; }
  const row = n => top + n * pitch, drop = '--tilt:0deg;--drop:' + (pitch * 0.14).toFixed(1) + 'px;';
  if (done.lake && done.stack && done.spires) {
    // Signing (L5): once all three are done the visitor writes on the left-hand page, in pencil, in a hand
    // of their own. The entry is kept in this browser only and waits for TJ (the real register is issue 56).
    const pen = "font-family:'Patrick Hand',cursive;font-size:" + (pitch * 0.9 * 0.92).toFixed(1) + 'px;line-height:' + pitch + 'px;color:#5f5f6a;left:' + 14 * k + 'px;right:' + 6 * k + 'px;' + drop;
    if (mine.length) {
      const st = "font-family:'Caveat',cursive;font-size:" + (pitch * 0.95).toFixed(1) + 'px;line-height:' + pitch + 'px;color:#1c1a24;left:' + 14 * k + 'px;right:' + 6 * k + 'px;' + drop;
      const p = el('p', { class: 'hand', style: st + 'top:' + row(0) + 'px', text: UI.register.thanks }); left.append(p);
      left.append(el('p', { class: 'hand sig', style: st + 'top:' + row(Math.round(p.offsetHeight / pitch)) + 'px', text: UI.register.todo.sig }));
    } else {
      const name = el('input', { class: 'field', maxlength: 40, required: '', autocomplete: 'off', 'aria-label': UI.register.yourName, placeholder: UI.register.yourName, style: pen + 'top:' + row(0) + 'px;height:' + pitch + 'px' });
      const note = el('textarea', { class: 'field', maxlength: 240, required: '', 'aria-label': UI.register.yourNote, placeholder: UI.register.notePh, style: pen + 'top:' + row(1) + 'px;height:' + 5 * pitch + 'px' });
      const form = el('form', { onsubmit: ev => { ev.preventDefault(); const n = name.value.trim(), t = note.value.trim(); if (!n || !t) return; mine.push({ name: n, note: t, date: new Date().toISOString().slice(0, 10) }); try { localStorage.setItem('trailhead.register', JSON.stringify(mine)); } catch { /* private window */ } audio.sfx('flag'); say(UI.register.signed); fillBook(); } },
        name, note, el('button', { class: 'plank sign', type: 'submit', style: 'top:' + row(6.3) + 'px;right:' + 6 * k + 'px;' + (P.left.w * k < 300 ? 'left:' + 14 * k + 'px;justify-content:center;' : '') }, el('span', { text: UI.register.sign })));
      left.append(form);
    }
    left.append(el('p', { class: 'legend', style: 'left:' + 14 * k + 'px;bottom:' + 4 * k + 'px', text: UI.register.mock }));
  } else {
    const st = "font-family:'Caveat',cursive;font-size:" + (pitch * 0.95).toFixed(1) + 'px;line-height:' + pitch + 'px;color:#1c1a24;--tilt:-0.4deg;--drop:' + (pitch * 0.14).toFixed(1) + 'px;left:' + 14 * k + 'px;right:' + 6 * k + 'px;';
    let r = 0;
    const line = (kids, cls = '') => { const p = el('p', { class: 'hand ' + cls, style: st + 'top:' + (top + r * pitch) + 'px' }, ...kids); left.append(p); r += Math.max(1, Math.round(p.offsetHeight / pitch)); };
    line([T.hi]); line([T.need]);
    for (const [id, name] of [['lake', DEST_NAMES.lake], ['stack', DEST_NAMES.stack], ['spires', T.spires(DEST_NAMES.spires)]]) line([el('span', { class: 'box' }), name], 'todo' + (done[id] ? ' done' : ''));
    r++; line([T.after]); line([T.sig], 'sig');
  }
  let at = 0;
  [...REGISTER, ...mine.map(e => ({ ...e, pending: true }))].forEach((e, i) => {
    const h = [...String(e.name)].reduce((a, c) => a + c.charCodeAt(0), 0), [font, fz] = e.pending ? ['Patrick Hand', 0.92] : HANDS[(i + 1) % HANDS.length], ink = e.pending ? INKS[2] : INKS[(i * 2 + 1) % INKS.length];
    const st = "font-family:'" + font + "',cursive;font-size:" + (pitch * 0.9 * fz).toFixed(1) + 'px;line-height:' + pitch + 'px;color:' + ink + ';top:' + (top + at * pitch) + 'px;--tilt:' + ((h % 7) - 3) * 0.25 + 'deg;--drop:' + (pitch * 0.14).toFixed(1) + 'px;';
    const t = el('p', { class: 'hand', style: st + 'left:' + (col + 3 * k) + 'px;right:' + 4 * k + 'px' }, el('span', { class: 'who', text: e.name }), ' ' + e.note);
    if (e.pending) t.append(el('span', { class: 'pending', text: UI.register.pending }));
    // A date is kept to its column: on a phone the column is narrow, so the date is written smaller.
    right.append(el('span', { class: 'hand', style: st + 'white-space:nowrap;font-size:' + Math.min(pitch * 0.9 * fz, (col - 5 * k) / 2.7).toFixed(1) + 'px;left:' + 3 * k + 'px;width:' + (col - 5 * k) + 'px', text: shortDate(e.date) }), t);
    at += Math.max(1, Math.round(t.offsetHeight / pitch));
  });
}
addEventListener('resize', () => setTimeout(() => { if (!book.hidden) fillBook(); }, 60));
async function walkOut() { audio.sfx('select'); hideCard(); await api.setRoute('spires-home'); buildMarks(); api.start(); }
// A name on the map sends him there from wherever he is on it.
async function send(dest) { audio.start(); const how = await api.go(dest); if (how === 'start') return travel(dest); if (how === 'home') forkShut = false; if (how) { audio.sfx('select'); if (how === 'turn') buildMarks(); } }
async function toCamp() { await api.setRoute('spires'); buildMarks(); api.goto('base-camp'); }
function say(text, ms = 4200) { toast.textContent = text; toast.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toast.hidden = true; }, ms); }

// ------------------------------------------------------------------ the route along the bottom

function buildMarks() {
  const marks = $('marks'); marks.replaceChildren();
  const r = api.route(), stops = api.stops();
  const all = [{ at: 0, label: r === 'back' ? '' : r.startsWith('spire:') || r === 'spires-home' ? UI.marks.camp : UI.marks.trailhead }, ...stops.filter(s => s.at < 0.995 && !isWait(s.id)).map(s => ({ at: s.at, label: LABELS[s.id] || (PROJECTS[s.id] ? PROJECTS[s.id].name : s.id) })), { at: 1, label: r.startsWith('spire:') ? UI.marks.camp : ENDS[r] || UI.marks.trailhead }];
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
// Round 4's page of text lived at #plain; round 5 (J2) calls it the page, as its top-bar button does.
const OLD_SLUGS = [['about-lake', 'reflection-lake'], ['the-stack', 'proficiency-peak'], ['plain', 'page']];
async function navigate(hash) {
  if (worldDown) return;
  let slug = decodeURIComponent((hash || '').replace(/^#\/?/, ''));
  // Round 3's addresses (L7): the lake and the peak were About Lake and The Stack.
  for (const [was, now] of OLD_SLUGS) if (slug === was || slug.startsWith(was + '/')) { slug = now + slug.slice(was.length); try { history.replaceState(null, '', '#' + slug); } catch { /* sandboxed */ } }
  // Back in history from the page to where it was opened: the world is as he left it.
  if (!plain.hidden && plainWas !== null && slug === plainWas) return closePlain();
  closeSheet(); closePlain();
  if (!slug) return home();
  if (slug === 'register') return openBook();
  if (slug === 'kiosk') return openKiosk(true);
  if (slug === 'map' || slug === 'keys') return openSheet(slug);
  if (slug === 'page') return openPlain();
  const dest = DESTINATIONS.find(d => d.slug === slug && d.route !== 'spires');
  if (dest) { await api.setRoute(dest.route); buildMarks(); hideCard(); return; }
  const id = Object.keys(CARDS).find(k => CARDS[k].slug === slug) || (slug.startsWith('sideproject-spires/') && PROJECTS[slug.split('/')[1]] ? slug.split('/')[1] : null);
  if (!id) { await api.setRoute('off-route'); buildMarks(); api.goto('off-route'); api.find('offroute'); return; }
  await api.setRoute(PROJECTS[id] ? 'spire:' + id : CARDS[id].route); buildMarks(); api.goto(id);
}

// ------------------------------------------------------------------ sheets

function openSheet(name) {
  const body = $('sheet-body'); body.replaceChildren();
  if (name === 'map') body.append(...trailMap());
  else if (name === 'kiosk') body.append(...kiosk());
  else body.append(el('div', { class: 'band' }, el('h2', { text: UI.keys.title }), el('p', { text: UI.keys.note })), el('dl', { class: 'keys' }, ...HELP.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })])));
  sheet.hidden = false; audio.sfx('open'); audio.focus(2); $('close').focus();
}
function closeSheet() { if (!sheet.hidden) { sheet.hidden = true; audio.sfx('close'); audio.focus(shown ? 1 : 0); } }

// ------------------------------------------------------------------ the debug panel
// Hidden: the backtick key opens and closes it, and so does the small sign at the foot of the trail map.
const debug = $('debug');
let timeSlider = null;
function openDebug(on) {
  if (!on) { debug.hidden = true; return; }
  const D = UI.debug, onOff = k => UI.map.onOff[DEBUG[k] ? 0 : 1];
  const toggle = k => el('button', { class: 'plank', 'aria-pressed': String(DEBUG[k]), onclick: e => { DEBUG[k] = !DEBUG[k]; e.currentTarget.setAttribute('aria-pressed', String(DEBUG[k])); e.currentTarget.querySelector('small').textContent = onOff(k); document.body.classList.toggle('no-labels', !DEBUG.labels); audio.sfx('step'); } }, el('span', { text: D.toggles[k] }), el('small', { text: onOff(k) }));
  const cat = el('select', { 'aria-label': D.cats }, ...Object.keys(NAMES.cats).map(id => el('option', { value: id, text: NAMES.cats[id] })));
  const trick = el('select', { 'aria-label': D.set }, ...TRICKS.map(s => el('option', { value: s, text: s })));
  // Time (E5f): how fast the scenes' clock runs, and a button for each timed event to start it now.
  const speeds = api.speeds.map((k, n) => el('button', { class: 'plank', 'aria-pressed': String(api.speed() === k), onclick: e => { api.setSpeed(k); for (const b of e.currentTarget.parentNode.children) b.setAttribute('aria-pressed', String(b === e.currentTarget)); audio.sfx('step'); } }, el('span', { text: D.speeds[n] })));
  // Each press shows the next kind's no-go areas, then none.
  const noGo = (() => { const kinds = Object.keys(D.noGoKinds); return el('button', { class: 'plank', 'aria-pressed': String(!!DEBUG.collide), onclick: e => { DEBUG.collide = kinds[(kinds.indexOf(DEBUG.collide) + 1) % kinds.length]; e.currentTarget.setAttribute('aria-pressed', String(!!DEBUG.collide)); e.currentTarget.querySelector('small').textContent = D.noGoKinds[DEBUG.collide]; audio.sfx('step'); } }, el('span', { text: D.noGo }), el('small', { text: D.noGoKinds[DEBUG.collide] })); })();
  // Time of day (T76): a slider over the whole cycle (it follows the clock while the panel is open), the
  // clock's speed, and jumps to the sunset and the sunrise. Moving the slider puts the clock on AUTO.
  const C = api.clock();
  timeSlider = el('input', { type: 'range', min: 0, max: C.cycle, step: 1, value: Math.round(C.t), 'aria-label': D.time, oninput: e => { api.setClock({ mode: 'auto', t: +e.currentTarget.value }); syncTop(); } });
  const clockSpeeds = D.clockSpeeds.map(k => el('button', { class: 'plank', 'aria-pressed': String(C.speed === k), onclick: e => { api.setClock({ speed: k }); for (const b of e.currentTarget.parentNode.children) b.setAttribute('aria-pressed', String(b === e.currentTarget)); audio.sfx('step'); } }, el('span', { text: k + 'x' })));
  const jump = (label, t) => el('button', { class: 'plank', onclick: () => { api.setClock({ mode: 'auto', t }); syncTop(); audio.sfx('step'); } }, el('span', { text: label }));
  // Spawn an animal (C4): which animal, which of its homes (or everywhere it lives), then Spawn.
  const kinds = api.spawnList(), animal = el('select', { 'aria-label': D.spawn }, ...kinds.map((k, n) => el('option', { value: n, text: k.name })));
  const place = el('select', { 'aria-label': D.spawn });
  const fillPlaces = () => { const k = kinds[+animal.value]; place.replaceChildren(...k.homes.map((h, n) => el('option', { value: n, text: h })), el('option', { value: 'all', text: D.spawnAll })); };
  animal.addEventListener('change', fillPlaces); fillPlaces();
  // The timed events of the scene on screen (E5f): the map's, or the scene's own.
  const SCENE_EVENTS = { world: ['breach', 'blow', 'ferry', 'tide', 'orcas', 'eagle', 'osprey', 'cubplay', 'cubclimb', 'marmot', 'serac', 'avalanche', 'ava0', 'ava1', 'ava2', 'lens', 'tumble', 'devil', 'star'], forest: ['sasquatch', 'eyeshine'], larches: ['gust'], wall: ['ridgegust', 'raven'], lakeside: ['lens'] };
  const here = api.scene(), events = SCENE_EVENTS[here] || [];
  // The weather (round 8, E1): the same buttons in every scene that has a sky, since every scene shows it.
  const weather = ['world', 'forest', 'lakeside', 'larches', 'wall', 'approach', 'camp', 'climb'].includes(here) ? ['shower', 'squall', 'gustnow', 'shade', 'clear'] : [];
  // On the map a start button first eases the view to where its event happens, then starts it (note 26).
  const fire = id => { const ms = api.showEvent(id); setTimeout(() => audio.sfx(api.trigger(id) ? 'step' : 'close'), ms); };
  // Related events share one split button (note 27): its name starts one of them at random (the avalanche picks
  // its own face), and the arrow opens a list of each.
  const FAMILIES = { humpback: ['breach', 'blow'], cubs: ['cubplay', 'cubclimb'], avalanche: ['ava0', 'ava1', 'ava2'] };
  const one = id => el('button', { class: 'plank', onclick: () => fire(id) }, el('span', { text: D.events[id] }));
  const split = (fam, ids) => {
    const list = el('div', { class: 'split-list', role: 'menu', hidden: '' }, ...ids.map(id => el('button', { class: 'plank', role: 'menuitem', onclick: () => { list.hidden = true; more.setAttribute('aria-expanded', 'false'); fire(id); } }, el('span', { text: D.events[id] }))));
    const more = el('button', { class: 'plank more', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': D.families[fam] + ': ' + D.pick, onclick: () => { list.hidden = !list.hidden; more.setAttribute('aria-expanded', String(!list.hidden)); } }, el('i', { class: 'arrow down' }));
    const main = el('button', { class: 'plank', onclick: () => fire(fam === 'avalanche' ? 'avalanche' : ids[Math.floor(Math.random() * ids.length)]) }, el('span', { text: D.families[fam] }));
    return el('div', { class: 'split' }, el('div', { class: 'split-row' }, main, more), list);
  };
  const starts = ids => { const out = [], done = new Set();
    for (const id of ids) { if (done.has(id)) continue; const fam = Object.keys(FAMILIES).find(f => FAMILIES[f].includes(id) || (f === 'avalanche' && id === 'avalanche'));
      if (fam) { for (const k of FAMILIES[fam]) done.add(k); if (fam === 'avalanche') done.add('avalanche'); out.push(split(fam, FAMILIES[fam].filter(k => ids.includes(k)))); } else out.push(one(id)); }
    return out; };
  debug.replaceChildren(
    el('h2', {}, el('span', { text: D.title }), el('button', { class: 'plank', style: 'width:auto', onclick: () => openDebug(false) }, el('span', { text: D.close }))),
    // Whether the map came from ground.png or was worked out on this page, and why (S2c): the one place a host that
    // serves the files differently can be read from, since nothing outside the page can ask it.
    el('p', { class: 'legend', text: BAKE.used ? D.ground[0] : D.ground[1] + (BAKE.note ? ' (' + BAKE.note + ')' : '') }),
    el('h3', { text: D.time }), timeSlider, el('div', { class: 'speeds' }, ...clockSpeeds), jump(D.sunset, C.sunset - 2), jump(D.sunrise, C.sunrise - 2),
    el('h3', { text: D.layers }), ...['trees', 'clouds', 'mist', 'labels', 'animals'].map(toggle),
    el('h3', { text: D.outlines }), ...['roam', 'taps', 'trails', 'camera'].map(toggle), noGo,
    el('h3', { text: D.zoom }), toggle('snap'),
    el('h3', { text: D.speed }), el('div', { class: 'speeds' }, ...speeds),
    ...(weather.length ? [el('h3', { text: D.weather }), ...weather.map(one)] : []),
    ...(events.length ? [el('h3', { text: here === 'world' ? D.mapEvents : D.inScene + ': ' + (D.scenes[here] || here) }), ...starts(events)] : []),
    el('h3', { text: D.spawn }), el('div', { class: 'row' }, animal, place, el('button', { class: 'plank', onclick: () => { audio.sfx(api.spawn(kinds[+animal.value].kind, place.value === 'all' ? 'all' : +place.value) ? 'step' : 'close'); } }, el('span', { text: D.spawn }))),
    el('h3', { text: D.cats }), el('div', { class: 'row' }, cat, trick, el('button', { class: 'plank', onclick: () => { if (window.__cats) window.__cats.force(cat.value, trick.value, api.now(), { dur: 8 }); audio.sfx('step'); } }, el('span', { text: D.set }))),
    el('h3', { text: D.scene }), ...Object.keys(D.scenes).filter(s => s !== 'offroute').map(s => el('button', { class: 'plank', onclick: () => { hideCard(); closeSheet(); api.jumpTo(s).then(() => { buildMarks(); openDebug(true); }); audio.sfx('step'); } }, el('span', { text: D.scenes[s] }))),
    el('button', { class: 'plank', onclick: () => navigate('#off-route') }, el('span', { text: D.offRoute })),
    // The sound test (P3): every effect, each part of every tune, each place's background, as named in audio.js.
    el('h3', { text: D.sounds }), el('p', { class: 'legend', text: D.effects }), el('div', { class: 'chips' }, ...audio.fxNames().map(n => el('button', { class: 'plank', onclick: () => { audio.start(); audio.sfx(n); } }, el('span', { text: n })))),
    el('p', { class: 'legend', text: D.tunesH }), ...audio.tunes().map((n, k) => el('div', { class: 'row tune' }, el('span', { text: n }), el('button', { class: 'plank', onclick: () => audio.preview(k, 'a') }, el('span', { text: 'A' })), el('button', { class: 'plank', onclick: () => audio.preview(k, 'b') }, el('span', { text: 'B' })))),
    el('button', { class: 'plank', onclick: () => audio.endPreview() }, el('span', { text: D.backToAuto })),
    el('p', { class: 'legend', text: D.places }), el('div', { class: 'chips' }, ...['world', 'forest', 'lakeside', 'larches', 'wall', 'approach', 'camp'].map(n => el('button', { class: 'plank', onclick: () => { audio.start(); audio.ambience(n, true); } }, el('span', { text: n })))),
    el('h3', { text: D.breakGroup }),
    el('button', { class: 'plank', onclick: () => api.breakScene() }, el('span', { text: D.breakScene })),
    el('p', { class: 'legend', text: D.note }));
  debug.hidden = false;
}

// Where each milestone sits on the brochure map, in world pixels.
// The trail map (L9): a picture of the new map framed round the Trailhead and the three destinations, its
// dots placed from the routes themselves (`api.mapDots()`), so they follow the map when it changes.
function trailMap() {
  const MAP = api.mapFrame(), box = el('div', { class: 'mapbox', style: `aspect-ratio:${MAP.w}/${MAP.h}` }), cv = api.mapImage(MAP.x + OX, MAP.y + OY, MAP.w, MAP.h); box.append(cv);
  api.mapDots().then(dots => { for (const { id, x, y, big } of dots.filter(d => d.id === '' || UI.map.dots[d.id] || CARDS[d.id] || PROJECTS[d.id])) { const name = id === '' ? UI.map.title : UI.map.dots[id] || (CARDS[id] ? CARDS[id].title : PROJECTS[id].name); box.append(el('button', { class: 'dot' + (big ? ' big' : ''), style: `left:${(x - MAP.x) / MAP.w * 100}%;top:${(y - MAP.y) / MAP.h * 100}%`, 'aria-label': name, onclick: () => navigate('#' + slugOf(id)) }, el('span', { text: name }))); } });
  // Under the map, the same places as words: every milestone is a link.
  const lengths = api.info().lengths, list = ids => el('ul', {}, ...ids.map(id => el('li', {}, el('button', { text: CARDS[id] ? CARDS[id].title : PROJECTS[id].name, onclick: () => navigate('#' + slugOf(id)) }))));
  const key = el('div', { class: 'key' },
    el('div', {}, el('h3', { text: UI.map.lake[0] }), el('small', { text: UI.map.lake[1](lengths.loop) }), list(['who', 'mountains', 'note'])),
    el('div', {}, el('h3', { text: UI.map.stack[0] }), el('small', { text: UI.map.stack[1](lengths.stack) }), list(['platform-engineering', 'site-reliability-engineering', 'software-engineering', 'summit'])),
    el('div', {}, el('h3', { text: UI.map.spires[0] }), el('small', { text: UI.map.spires[1](lengths.spires) }), list(SPIRE_ORDER)));
  const done = api.done(), all = done.lake && done.stack && done.spires;
  const side = el('div', { class: 'side' },
    el('h3', { text: UI.map.elsewhere }), el('ul', { class: 'links' }, ...['resume', 'linkedin', 'github', 'strava', 'peakbagger', 'mountainproject'].map(linkLi)),
    el('h3', { text: UI.map.onMap }),
    el('button', { class: 'plank', onclick: () => navigate('#page') }, el('span', { text: UI.map.plain })),
    el('button', { class: 'plank', onclick: () => navigate('#kiosk') }, el('span', { text: UI.kiosk.title })),
    el('button', { class: 'plank', onclick: () => navigate('#register') }, el('span', { text: UI.register.link }), el('small', { text: all ? UI.register.canSign : UI.register.canRead })),
    el('h3', { text: UI.map.settings }),
    // Clear my flags (L11): the finished routes and the finds, and the note that the register is open, so
    // finishing all three again says so again. A signed register entry is the visitor's own words and stays.
    el('button', { class: 'plank', onclick: () => { api.forget(); try { localStorage.removeItem('trailhead.told'); } catch { /* private window */ } buildMarks(); say(UI.map.cleared); closeSheet(); } }, el('span', { text: UI.map.clear })),
    el('p', { class: 'legend', text: UI.map.legend }),
    el('button', { class: 'plank debug-sign', onclick: () => { closeSheet(); openDebug(true); } }, el('span', { text: UI.debug.title })));
  return [el('div', { class: 'band' }, el('h2', { text: UI.map.title }), el('p', { text: UI.map.sub })), el('div', { class: 'cols' }, el('div', {}, box, key), side)];
}
function kiosk() {
  api.find('kiosk');
  const done = api.done(), up = Math.round((Date.now() - BUILT) / 1000), found = api.found(), ids = Object.keys(FINDS);
  const cell = (k, v, cls, wide) => el('div', wide ? { class: 'wide' } : {}, el('dt', { text: k }), el('dd', { class: cls || '', text: v }));
  return [el('div', { class: 'band' }, el('h2', { text: UI.kiosk.title }), el('p', { text: UI.kiosk.sub })),
    el('dl', { class: 'board' }, cell(UI.kiosk.version, VERSION), cell(UI.kiosk.deployed, BUILT.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })), cell(UI.kiosk.uptime, UI.kiosk.up(up)), cell(UI.kiosk.status[0], UI.kiosk.status[1], 'open'),
      cell(UI.map.lake[0], done.lake ? UI.kiosk.lakeDone : UI.kiosk.open), cell(UI.map.stack[0], done.stack ? UI.kiosk.stackDone : UI.kiosk.open), cell(UI.map.spires[0], UI.kiosk.summits(SPIRE_ORDER.filter(s => done['spire:' + s]).length)), cell(UI.kiosk.wildlife[0], UI.kiosk.wildlife[1], '', true), cell(UI.kiosk.seen[0], UI.kiosk.seen[1], '', true)),
    el('h3', { text: UI.kiosk.checklist(ids.filter(k => found[k]).length, ids.length) }),
    el('ul', { class: 'checks' }, ...ids.map(k => el('li', { class: found[k] ? 'got' : '' }, el('b', { text: found[k] ? FINDS[k][0] : UI.kiosk.notFound }), el('span', { text: found[k] ? UI.kiosk.got : FINDS[k][1] }))))];
}
function checkRegister() { const d = api.done(); if (d.lake && d.stack && d.spires) { let told = false; try { told = localStorage.getItem('trailhead.told') === '1'; localStorage.setItem('trailhead.told', '1'); } catch { /* private window */ } if (!told) { audio.sfx('unlock'); say(UI.allDone, 7000); } } }

// The whole site as one page of text, for reading or for anything that cannot draw the world.
function openPlain() {
  const sec = (title, ...kids) => [el('h3', { text: title }), ...kids];
  const draft = () => el('p', { class: 'draft', text: $('card-draft').textContent });
  const cardOut = id => { const c = CARDS[id]; return [el('h4', { text: c.title }), ...c.body.map(t => el('p', { text: t })), c.aside ? el('p', { class: 'aside', text: c.aside }) : null, c.tools ? el('ul', { class: 'tools' }, ...c.tools.map(t => el('li', { text: t }))) : null, c.links.length ? el('ul', { class: 'links' }, ...c.links.map(linkLi)) : null, c.draft ? draft() : null]; };
  // Without the world there is no picture of the map and no way back to it, and the page says why.
  let still = null;
  if (!worldDown) try { const MAP = api.mapFrame(); still = api.mapImage(MAP.x + OX, MAP.y + OY, MAP.w, MAP.h); still.setAttribute('role', 'img'); still.setAttribute('aria-label', UI.plain.mapAlt); } catch (err) { console.error(err); still = null; }
  // Without the world, the way back loads the page again from the Trailhead (round 6, note 28): after the debug
  // panel breaks the map on purpose that is all it takes, and after a real failure it is the one thing to try.
  plain.replaceChildren(el('div', { class: 'band' }, el('h2', { text: UI.map.title }), worldDown ? el('button', { class: 'plank', onclick: () => { location.href = location.pathname; } }, el('span', { text: CARDS['off-route'].go })) : el('button', { class: 'plank', onclick: leavePlain }, el('span', { text: UI.plain.back }))),
    el('div', { class: 'wrap' }, el('h1', { text: UI.name }), el('p', { text: UI.name + ' ' + INTRO }), worldDown ? el('p', { class: 'legend', text: UI.plain.down }) : null, still,
      ...sec(UI.map.lake[0], ...['who', 'mountains', 'note'].flatMap(cardOut)), ...sec(UI.map.stack[0], ...['platform-engineering', 'site-reliability-engineering', 'software-engineering', 'summit'].flatMap(cardOut)),
      ...sec(UI.map.spires[0], ...CARDS['base-camp'].body.map(t => el('p', { text: t })), ...SPIRE_ORDER.flatMap(id => { const p = PROJECTS[id]; return [el('h4', { text: p.name }), ...p.body.map(t => el('p', { text: t })), el('p', { class: 'legend', text: UI.plain.facts(p.stars, p.release ? UI.plain.released(p.release, ago(p.released)) : UI.plain.noRelease, p.language, p.license) }), el('ul', { class: 'links' }, el('li', {}, el('a', { href: 'https://github.com/' + p.repo, target: '_blank', rel: 'noopener', text: 'github.com/' + p.repo })), p.site ? el('li', {}, el('a', { href: p.site, target: '_blank', rel: 'noopener', text: p.site.replace('https://', '') })) : null, ...(p.extra || []).map(([n, h]) => el('li', {}, el('a', { href: h, target: '_blank', rel: 'noopener', text: n }))))]; }))));
  if (plain.hidden) { plainFrom = document.activeElement; const was = decodeURIComponent(location.hash.slice(1)); plainWas = was === 'page' || was === 'plain' ? null : was; }
  if (!worldDown) setAddress('page');
  plain.hidden = false; plain.scrollTop = 0; if (api && !worldDown) api.stop();
  for (const e of document.body.children) if (e !== plain && e.tagName !== 'SCRIPT') e.inert = true;
  (plain.querySelector('.band button') || plain.querySelector('h1')).focus({ preventScroll: true });
}
// The world cannot be drawn: everything that belongs to it goes, and the page of text is what is left.
function plainOnly() {
  worldDown = true;
  for (const id of ['top', 'bar', 'fork', 'card', 'names', 'tip', 'toast', 'sheet', 'debug', 'status']) $(id).hidden = true;
  openPlain();
}
// A scene broke under him: he is put on the off-route page and told why. If it is worse than that, plain text.
// It does not count as finding the off-route page (M4): that find is for an address that goes nowhere, and
// its toast hid the line saying why he is there.
async function washedOut(e) {
  if (e.fatal) return plainOnly();
  hideCard(); closeSheet(); say(UI.broken, 6000);
  await api.setRoute('off-route'); buildMarks(); api.goto('off-route');
}
// plainWas: the address the page was opened from, or null when the visit started on it (then Back goes home).
let plainFrom = null, plainWas = null;
function leavePlain() { if (plainWas === null) return navigate(''); const was = plainWas; closePlain(); setAddress(was); }
function closePlain() {
  if (plain.hidden) return;
  plain.hidden = true; for (const e of document.body.children) e.inert = false;
  // Opened from the trail map, whose sheet has closed: focus goes to the top bar's button instead.
  const back = plainFrom && plainFrom.isConnected && plainFrom !== document.body && (!plainFrom.checkVisibility || plainFrom.checkVisibility()) ? plainFrom : $('b-page');
  if (!worldDown) back.focus({ preventScroll: true }); plainFrom = null;
}

// ------------------------------------------------------------------ switches

let lastScene = 'world';
const trackName = () => { const k = audio.track(); return k.auto ? UI.auto(k.name) : k.name; };
// The time of day (T76): AUTO (the default on every visit) follows the world clock, DAY and DUSK hold that light.
const CLOCK_MODES = ['auto', 'day', 'dusk'];
function toggleDusk() { const m = api.clock().mode; api.setClock({ mode: CLOCK_MODES[(CLOCK_MODES.indexOf(m) + 1) % 3] }); syncTop(); audio.sfx('select'); }
// The music button (round 6, note 29). Before the browser lets anything play it asks for the click that does;
// after that it shows the track, or Sound off, and opens a menu of the tracks, the music styles and Sound off.
const music = $('music');
let soundAsked = false;   // the visitor has clicked for sound, whether or not the browser has started it yet
function musicMenu(open) {
  const b = $('b-track');
  if (!open) { if (!music.hidden) { music.hidden = true; b.setAttribute('aria-expanded', 'false'); } return; }
  const k = audio.track(), off = audio.muted(), set = audio.set().index;
  const item = (text, on, act) => el('button', { class: 'plank', role: 'menuitemradio', 'aria-checked': String(!!on), onclick: () => { act(); musicMenu(false); syncTop(); b.focus(); } }, el('span', { text }));
  const play = i => () => { audio.start(); if (audio.muted()) audio.setMuted(false); audio.pick(i); };
  music.replaceChildren(
    el('p', { class: 'from', text: UI.map.music }),
    item(UI.auto(audio.autoTrack()), !off && k.auto, play(-1)),
    ...TRACK_NAMES.map((n, i) => item(n, !off && !k.auto && k.index === i, play(i))),
    el('p', { class: 'from', text: UI.map.musicStyle }),
    ...SET_NAMES.map((n, i) => item(n, set === i, () => { audio.start(); audio.setSet(i); audio.sfx('flag'); })),
    el('div', { class: 'rule' }),
    item(UI.soundOff, off, () => audio.setMuted(true)));
  const r = b.getBoundingClientRect();
  music.hidden = false; music.style.cssText = 'top:' + Math.round(r.bottom + 4) + 'px;left:' + Math.round(Math.max(8, Math.min(r.left, innerWidth - 8 - music.offsetWidth))) + 'px';
  music.hidden = false; b.setAttribute('aria-expanded', 'true');
  (music.querySelector('[aria-checked="true"]') || music.querySelector('button')).focus();
  audio.sfx('open');
}
music.addEventListener('keydown', e => {
  const items = [...music.querySelectorAll('button')], at = items.indexOf(document.activeElement);
  if (e.code === 'ArrowDown' || e.code === 'ArrowUp') { items[(at + (e.code === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus(); e.preventDefault(); e.stopPropagation(); }
  else if (e.code === 'Escape' || e.code === 'Tab') { musicMenu(false); $('b-track').focus(); e.preventDefault(); e.stopPropagation(); }
});
addEventListener('pointerdown', e => { if (!music.hidden && !music.contains(e.target) && !$('b-track').contains(e.target)) musicMenu(false); }, true);
const coarse = window.matchMedia ? matchMedia('(pointer: coarse)') : { matches: false };
// The music button's spoken name carries the track it shows, so what is read matches what is seen.
const trackLabel = $('b-track').getAttribute('aria-label');
function syncTop() {
  document.documentElement.dataset.theme = api.theme();
  const said = audio.muted() ? UI.soundOff : audio.live() || soundAsked ? trackName() : UI.soundWaits[coarse.matches ? 1 : 0];
  $('b-track').querySelector('span').textContent = said; $('b-track').setAttribute('aria-label', trackLabel + ': ' + said);
  $('b-track').dataset.state = audio.muted() ? 'off' : audio.live() || soundAsked ? 'playing' : 'waits';
  // The sun or the moon before the clock's word: what the sky is now, so AUTO says what it is for (note 30).
  const mode = api.clock().mode, dark = mode === 'dusk' || (mode === 'auto' && api.theme() === 'dark');
  $('b-dusk').querySelector('.sky').className = 'sky ' + (dark ? 'moon' : 'sun'); $('b-dusk').querySelector('span').textContent = UI.theme[mode]; $('b-dusk').setAttribute('aria-label', UI.map.dusk + ': ' + UI.theme[mode]);
}


// ------------------------------------------------------------------ start

try {
  // ?break=forest (any scene), ?break=load:forest, ?break=renderer or ?break=mount: see what happens when it goes wrong.
  const breakAt = new URLSearchParams(location.search).get('break');
  if (breakAt === 'mount') throw new Error('Broken on purpose: the start');
  // A visit that opens at the Trailhead shows the sign before the first frame, so the map's first frame is
  // already framed round it and the camera has nothing to catch up on (T1). The page's tick keeps it right after.
  fork.hidden = !!(new URLSearchParams(location.search).get('route') || location.hash.length > 1);
  api = await mount($('c'), {
    theme: 'light', breakAt,
    onEvent(e) {
      if (e.type === 'broken') washedOut(e);
      else if (e.type === 'stop') { if (isWait(e.id)) { waiting = true; say(UI.wait[e.id.slice(5)] || UI.wait.go, 600000); } else { if (waiting) { waiting = false; toast.hidden = true; } showCard(e.id); } }
      else if (e.type === 'leave') { hideCard(); if (waiting) { waiting = false; toast.hidden = true; } }
      else if (e.type === 'end') { if (e.route === 'walk') { /* he stays where the click sent him */ } else if (e.route === 'register') inBook(true); else if (e.route.startsWith('spire:')) toCamp().then(checkRegister); else home().then(() => { if (e.next) travel(e.next); }); }
      else if (e.type === 'sfx') audio.sfx(e.name);
      else if (e.type === 'walk') { hideCard(); buildMarks(); }
      else if (e.type === 'theme') { syncTop(); if (e.dark) setTimeout(() => { if (api.theme() === 'dark') api.find('dusk'); }, 2500); }
      else if (e.type === 'scene') { if (!debug.hidden) openDebug(true); audio.ambience(e.name === 'register' ? 'world' : e.name); audio.place(e.name === 'world' && lastScene !== 'world' && lastScene !== 'register' ? 'out' : e.name); lastScene = e.name; syncTop(); }
      else if (e.type === 'say') say(e.text);
      else if (e.type === 'found' && FINDS[e.id]) { const n = Object.keys(api ? api.found() : {}).filter(k => FINDS[k]).length; if (e.id !== 'kiosk') { say(UI.found(FINDS[e.id][0], n, Object.keys(FINDS).length), 5200); audio.sfx('egg'); } }
      else if (e.type === 'hover') { tip.hidden = !e.label; if (e.label) { tip.textContent = e.label; const hw = tip.offsetWidth / 2 + 6; tip.style.left = Math.min(Math.max(e.x, hw), innerWidth - hw) + 'px'; tip.style.top = (e.y - 4) + 'px'; if (e.tap) { clearTimeout(tip._t); tip._t = setTimeout(() => { tip.hidden = true; }, 2200); } } }
      else if (e.type === 'act') { if (e.id === 'kiosk') openKiosk(true); else if (e.id === 'register') openBook(); else if (e.id === 'home') { audio.sfx('select'); home(); } else if (e.id.startsWith('spire:')) climb(e.id.slice(6)); else if (e.id.startsWith('dest:')) send(e.id.slice(5)); }
    }
  });
  $('intro').textContent = INTRO; $('b-page').textContent = UI.plain.top;
  const lengths = api.info().lengths;
  for (const d of DESTINATIONS) $('signs').append(el('li', {}, el('button', { class: 'plank choice', 'data-route': d.route, onclick: e => { e.currentTarget.blur(); travel(d.route); } }, el('i', { class: 'arrow ' + d.dir }), el('span', {}, el('span', { text: d.sign }), el('span', { class: 'where', text: d.about })), el('small', { text: UI.map.plank[d.route](lengths[d.route]) }))));
  // Each sign also says how long its route takes there and back, once its scenes are loaded.
  for (const b of $('signs').querySelectorAll('[data-route]')) api.routeTime(b.dataset.route).then(sec => { if (sec > 1) b.querySelector('small').append(document.createElement('br'), UI.map.takes(sec)); });
  for (const id of ['top', 'bar']) $(id).hidden = false;
  buildMarks(); syncTop();
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
  // ?start=avalanche,osprey starts those timed events (the debug menu's names) once the opening is done,
  // for screenshots; the clocks' own switches (sea=, tide=, serac=, lens=, rain=, bear=) still set where a clock begins.
  if (q.get('start')) setTimeout(() => { for (const id of q.get('start').split(',')) api.trigger(id.trim()); }, 900);
  // Every visit starts on AUTO at the beginning of day (T76); dusk=1 holds Dusk, for screenshots.
  if (q.get('dusk')) api.setTheme('dark');
  syncTop();
  if (q.get('sheet')) openSheet(q.get('sheet'));
  // ?debug=roam,taps,-trees opens the panel with those outlines on and those layers off.
  // ?debug=collide:boat shows that kind's no-go areas.
  if (q.get('debug') != null) { for (const k of q.get('debug').split(',')) { const off = k.startsWith('-'), key = off ? k.slice(1) : k; if (key.startsWith('collide:')) DEBUG.collide = key.slice(8); else if (key in DEBUG) DEBUG[key] = !off; } document.body.classList.toggle('no-labels', !DEBUG.labels); openDebug(true); }
  if (location.hash.length > 1 && !q.get('route')) await navigate(location.hash);
  audio.ambience('world'); audio.onchange = syncTop;
  // Where a browser lets a page make sound unasked (Firefox says so), the music starts with the page.
  try { if (navigator.getAutoplayPolicy && navigator.getAutoplayPolicy('audiocontext') === 'allowed') audio.start(); } catch { /* not every browser can say */ }
  status.hidden = true;
  // For screenshot scripts: the debug panel's controls (speed, start buttons) without clicking.
  window.__api = api; window.__sound = () => audio.live();
  window.__ready = true;
  try { console.log(...CONSOLE); } catch { /* no console */ }
} catch (err) {
  // Nothing could be drawn at all: the whole site as a page of text takes the world's place.
  try { plainOnly(); } catch { status.hidden = false; status.textContent = UI.fail; }
  throw err;
}

// The first click, tap or key of any kind starts the sound. Which of these a browser counts as a go-ahead differs (a
// finger going down does not, a finger coming up does), so every one of them asks.
for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click']) addEventListener(ev, () => audio.start(), { capture: true, passive: true });
// The sound plays only while the page is in front (round 8, note 24): it stops when the tab is hidden, the
// window loses focus, the page is put away or a phone's screen sleeps, and comes back when he does.
for (const [ev, gone] of [['blur', true], ['pagehide', true], ['focus', false], ['pageshow', false]]) addEventListener(ev, () => audio.away(gone || document.hidden));
document.addEventListener('visibilitychange', () => audio.away(document.hidden || !document.hasFocus()));
addEventListener('popstate', () => navigate(location.hash));
// Space and the Start button: a press starts or stops him. Held for more than a quarter of a second, he goes
// faster for as long as it is held, and carries on at his own pace when it is let go.
const press = { down: false, was: false, held: false, t: 0 };
// The space bar does nothing until the visitor has picked where to go (T36): a plank, a name tag, the menu,
// the timeline, a trail point, or an address that names a route. From then on it starts and stops him.
let chosen = !!(new URLSearchParams(location.search).get('route') || location.hash.length > 1);
function pressDown() { if (press.down) return; press.down = true; press.held = false; press.was = api.running(); audio.start(); if (!press.was) api.start(); clearTimeout(press.t); press.t = setTimeout(() => { if (press.down) { press.held = true; api.boost(true); } }, 250); }
function pressUp() { if (!press.down) return; press.down = false; clearTimeout(press.t); if (press.held) api.boost(false); else if (press.was) api.stop(); }
addEventListener('blur', () => { if (press.down) { press.down = false; clearTimeout(press.t); api.boost(false); } });
{ const run = $('run');
  run.addEventListener('pointerdown', e => { if (e.button) return; try { run.setPointerCapture(e.pointerId); } catch { /* fine without */ } pressDown(); });
  run.addEventListener('pointerup', () => { pressUp(); run.blur(); }); run.addEventListener('pointercancel', pressUp);
  // Pressed from the keyboard there is no pointer: it is a plain start or stop.
  run.addEventListener('click', e => { if (e.detail === 0) { audio.start(); api.toggle(); } });
  run.addEventListener('contextmenu', e => e.preventDefault()); }
$('book-x').addEventListener('click', () => (pageOpen ? closePage() : closeBook()));
$('fork-x').addEventListener('click', () => { forkShut = true; audio.sfx('close'); });
$('card-x').addEventListener('click', () => { cardShut = true; card.hidden = true; audio.focus(0); audio.sfx('close'); });
tab.addEventListener('click', e => { e.currentTarget.blur(); if (shown && cardShut) { cardShut = false; card.hidden = false; audio.focus(1); } else forkShut = false; audio.sfx('open'); });
$('home').addEventListener('click', e => { e.currentTarget.blur(); if (api.route().startsWith('spire:')) toCamp(); else home(); audio.sfx('select'); });
$('card-go').addEventListener('click', () => { const c = CARDS[shown]; audio.sfx('select'); if (c && c.home) home(); else api.start(); });
$('b-map').addEventListener('click', e => { e.currentTarget.blur(); openSheet('map'); });
function musicButton() { if (!soundAsked && !audio.live() && !audio.muted()) { soundAsked = true; audio.start(); audio.sfx('select'); syncTop(); return; } soundAsked = true; musicMenu(music.hidden); }
$('b-track').addEventListener('click', musicButton);
$('b-dusk').addEventListener('click', e => { e.currentTarget.blur(); toggleDusk(); });
$('b-help').addEventListener('click', e => { e.currentTarget.blur(); openSheet('keys'); });
$('b-page').addEventListener('click', () => navigate('#page'));
// The debug menu is public (T9): its button sits next to Keys (not on a phone, where the trail map's foot opens it).
$('b-debug').addEventListener('click', e => { e.currentTarget.blur(); openDebug(debug.hidden); });
$('close').addEventListener('click', closeSheet);
sheet.addEventListener('pointerdown', e => { if (e.target === sheet) closeSheet(); });

addEventListener('keydown', e => {
  if (worldDown) return;
  if (e.target.closest && e.target.closest('input, textarea')) return;
  audio.start();
  if (e.code === 'Backquote' && !e.metaKey && !e.ctrlKey && !e.altKey) { openDebug(debug.hidden); e.preventDefault(); return; }
  if (e.code === 'Escape' && !book.hidden && sheet.hidden) { closeBook(); e.preventDefault(); return; }
  if (e.code === 'Escape') { if (!plain.hidden) leavePlain(); else if (!sheet.hidden) closeSheet(); else if (!debug.hidden) openDebug(false); else openSheet('map'); e.preventDefault(); return; }
  if (!sheet.hidden || !plain.hidden) return;
  // A key held with Command, Control or Alt belongs to the browser.
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === 'KeyM') { openSheet('map'); return; }
  if (e.code === 'KeyT') { toggleDusk(); return; }
  // One key for every menu (round 6, #33): the music, the trail conditions, the register, the page, the keys.
  if (e.code === 'KeyN') { musicButton(); return; }
  if (e.code === 'KeyC') { openKiosk(true); return; }
  if (e.code === 'KeyR') { openKiosk(false); return; }
  if (e.code === 'KeyP') { openPlain(); return; }
  if (e.code === 'KeyK') { openSheet('keys'); return; }
  if (api && api.grab(e.code, true)) { e.preventDefault(); return; }
  if (e.target.closest && e.target.closest('button, a') && (e.code === 'Space' || e.code === 'Enter')) return;
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat && chosen) pressDown(); return; }
  if (api.key(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { if (api) api.grab(e.code, false); if (e.code === 'Space') pressUp(); });

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
  const atFork = !(running || p > 0.002 || shown != null || api.route() !== 'lake');
  if (!atFork) chosen = true;
  if (timeSlider && !debug.hidden && document.activeElement !== timeSlider) timeSlider.value = Math.round(api.clock().t);
  fork.hidden = !atFork || forkShut;
  { const text = shown && cardShut ? LABELS[shown] || (PROJECTS[shown] ? PROJECTS[shown].name : CARDS[shown].title) : atFork && forkShut ? DEST_NAMES.trailhead : '';
    tab.hidden = !text || !sheet.hidden || !plain.hidden; if (text && text !== tabText) { tabText = text; tab.querySelector('span').textContent = text; } }
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
    // A place's tag rises and brightens as the place lifts (E5j).
    b.style.setProperty('--lift', ((l.lift || 0) * 5).toFixed(2));
  });
})();
