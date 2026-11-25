// Everything the page says lives in content/game/*.yaml, which `npm run words` copies into words.js.
// This file only shapes those words for the game: it fills the {braces} in a template with the numbers
// a caller passes, and works out the few lines that are built from other words.
import { W } from './words.js';

const fill = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));

export const { LINKS, INTRO, DESTINATIONS, CARDS, PROJECTS, LABELS, ENDS, REGISTER, FINDS, HELP, CONSOLE, DEST_NAMES, SIGNS, NAMES, TRACK_NAMES, SET_NAMES } = W;
// Base camp lists the summits in the order content/game/sideproject-spires.yaml gives them.
export const SPIRE_ORDER = Object.keys(PROJECTS);

// How long ago a date was, in plain words.
export function ago(iso, now = new Date()) {
  if (!iso) return '';
  const d = Math.max(0, Math.round((now - new Date(iso + 'T12:00:00Z')) / 86400000));
  const A = W.AGO;
  return d === 0 ? A.today : d === 1 ? A.yesterday : fill(d < 60 ? A.days : d < 730 ? A.months : A.years, { n: d < 60 ? d : d < 730 ? Math.round(d / 30) : Math.round(d / 365) });
}

// Every joke place name, for the legend on the trail map.
const PLACE_NAMES = [...Object.values(SIGNS).filter(n => !n.includes(',')), NAMES.forest.sign, NAMES.forest.creek, NAMES.lakeside.sign, NAMES.wall.ledge, NAMES.wall.roof, NAMES.climb.crevasse, NAMES.climb.ridge, NAMES.lookout].filter((n, i, a) => a.indexOf(n) === i);

const U = W.UI, M = U.map, K = U.kiosk;
export const UI = {
  ...U,
  auto: name => fill(U.auto, { name }),
  found: (name, n, of) => fill(U.found, { name, n, of }),
  card: { ...U.card, summit: top => fill(U.card.summit, { top: top.toLowerCase() }) },
  map: {
    ...M,
    title: DEST_NAMES.trailhead,
    lake: [DEST_NAMES.lake, km => fill(M.lake, { km })], stack: [DEST_NAMES.stack, km => fill(M.stack, { km })], spires: [DEST_NAMES.spires, km => fill(M.spires, { km })],
    plank: { lake: km => fill(M.plank.lake, { km }), stack: km => fill(M.plank.stack, { km }), spires: km => fill(M.plank.spires, { km }) },
    takes: s => fill(M.takes, { n: Math.max(1, Math.round(s / 60)) }),
    legend: fill(M.legend, { names: PLACE_NAMES.slice(0, -1).join(', ') + ' ' + M.and + ' ' + PLACE_NAMES[PLACE_NAMES.length - 1] })
  },
  kiosk: {
    ...K,
    up: s => s < 90 ? fill(s === 1 ? K.up.second : K.up.seconds, { n: s }) : fill(K.up.minutes, { n: Math.round(s / 60) }),
    summits: n => fill(K.summits, { n }),
    // The board's two lists (round 8, F2): what has been on the screen this visit, and the rest. Each place
    // gives a line to either list, made of those of its own that belong there: "A, b and c where".
    sightings: saw => { const out = [[], []], line = (S, ids) => { const n = ids.map(k => S.who[k]), s = [S.lead, n.length > 1 ? n.slice(0, -1).join(', ') + ' ' + M.and + ' ' + n[n.length - 1] : n[0], S.where].filter(Boolean).join(' '); return s[0].toUpperCase() + s.slice(1); };
      for (const S of K.sightings) { const ids = Object.keys(S.who), a = ids.filter(k => saw.has(k)), b = ids.filter(k => !saw.has(k)); if (a.length) out[0].push(line(S, a)); if (b.length) out[1].push(line(S, b)); }
      return out; },
    checklist: (n, of) => fill(K.checklist, { n, of })
  },
  register: { ...U.register, todo: { ...U.register.todo, spires: name => fill(U.register.todo.spires, { name }) } },
  plain: {
    ...U.plain,
    facts: (stars, release, language, license) => fill(U.plain.facts, { stars, release, language, license }),
    released: (version, when) => fill(U.plain.released, { version, when })
  }
};
delete UI.map.and;
