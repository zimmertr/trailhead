// Everything the page says. Only the first card's sentence and the intro are TJ's own words;
// the rest is draft copy written for him to replace, and is marked as a draft where it shows.

export const LINKS = {
  github: ['GitHub', 'https://github.com/zimmertr'],
  linkedin: ['LinkedIn', 'https://www.linkedin.com/in/zimmertr/'],
  resume: ['Resume', 'https://github.com/zimmertr/Resume'],
  strava: ['Strava', 'https://www.strava.com/athletes/zimmertr'],
  peakbagger: ['Peakbagger', 'https://www.peakbagger.com/climber/climber.aspx?cid=25279'],
  mountainproject: ['Mountain Project', 'https://www.mountainproject.com/user/200835619/tj-zimmerman']
};

export const INTRO = "is a principal platform engineer based out of Seattle, WA. When he's not playing in the mountains, he's usually hacking on computers. Choose a destination to learn more!";

export const DESTINATIONS = [
  { route: 'lake', sign: 'Run to About Lake', about: 'to learn more about TJ', dir: 'left', slug: 'about-lake' },
  { route: 'stack', sign: 'Climb The Stack', about: 'to learn more about his skills', dir: 'up', slug: 'the-stack' },
  { route: 'spires', sign: 'Climb the Sideproject Spires', about: 'to see some of his personal projects', dir: 'right', slug: 'sideproject-spires' }
];

// kind is the thing the card comes out of, which decides how it is drawn.
export const CARDS = {
  who: {
    route: 'lake', slug: 'about-lake/who', kind: 'sign', from: 'Trail sign', title: 'Who TJ is',
    body: ["TJ Zimmerman is a principal platform engineer based out of Seattle, WA. When he's not playing in the mountains, he's usually hacking on computers."],
    aside: 'Mountains, cats, and computers.',
    links: ['linkedin', 'github', 'resume'], go: 'Keep running'
  },
  mountains: {
    route: 'lake', slug: 'about-lake/in-the-mountains', kind: 'map', from: 'The map from his pocket', title: 'In the mountains', draft: true,
    body: ['TJ is a peakbagger, a lakebagger and a trail runner, and most weekends he is somewhere in the Cascades doing one of the three. He climbs rock and glaciers as well, and keeps a wilderness first aid card current for the days that go sideways.', 'His tracks, summits and ticks are all public, so feel free to follow along.'],
    links: ['strava', 'peakbagger', 'mountainproject'], go: 'Keep running'
  },
  note: {
    route: 'lake', slug: 'about-lake/a-personal-note', kind: 'journal', from: 'His trail journal', title: 'A personal note', draft: true,
    body: ["I started out in Michigan, studied computers there, and then moved to Seattle for the mountains. So for about ten years now I have built platforms during the week and disappeared into the hills on the weekend.", "However, the two have more in common than you would think. Both reward patience, both punish shortcuts, and both go better with good partners. Therefore I built this site to show you both at once, instead of another page of bullet points.", "Feel free to wander. And say hi to Doot Doot and Peevers on your way out (they run the place)."],
    links: ['linkedin', 'github', 'strava', 'peakbagger', 'mountainproject'], go: 'Run home'
  },
  'platform-engineering': {
    route: 'stack', slug: 'the-stack/platform-engineering', kind: 'rack', from: 'The rack on his harness', title: 'Platform Engineering', draft: true,
    body: ['TJ builds the paved road that other engineers ship on. He has led moves from hand-rolled pipelines to GitOps platforms that developers own themselves, and rebuilt fragile automation as versioned infrastructure as code.', 'The goal is always the same: make the right way the easy way.'],
    tools: ['Kubernetes', 'Argo CD', 'Argo Rollouts', 'Helm', 'Terraform', 'GitLab CI', 'GitHub Actions'], links: [], go: 'Climb on'
  },
  'site-reliability-engineering': {
    route: 'stack', slug: 'the-stack/site-reliability-engineering', kind: 'watch', from: 'His watch', title: 'Site Reliability Engineering', draft: true,
    body: ['Things break, so TJ plans for the fall. He made canary releases the default way to ship, built the dashboards and monitors that catch trouble early, and wrote the post-mortems and runbooks that stop it coming back.', 'He has carried the pager too.'],
    tools: ['Istio', 'Datadog', 'Prometheus', 'Grafana', 'PagerDuty', 'SLOs'], links: [], go: 'Climb on'
  },
  'software-engineering': {
    route: 'stack', slug: 'the-stack/software-engineering', kind: 'guide', from: 'The guidebook', title: 'Software Engineering', draft: true,
    body: ['TJ writes software to remove toil, from command line tools and automation up to whole web applications like Bluebird Forecast.', 'These days he works with AI coding agents the way a climber uses beta: he follows most of the suggestions and skips the ones that lead nowhere.'],
    tools: ['Python', 'TypeScript', 'Bash', 'Java', 'HCL', 'Claude Code'], links: [], go: 'To the summit'
  },
  summit: {
    route: 'stack', slug: 'the-stack/summit', kind: 'summit', from: 'The summit', title: 'The top of The Stack', draft: true,
    body: ['Five pitches, one flag. The whole route is written down in the two places below.'],
    links: ['resume', 'linkedin'], go: 'Rappel'
  },
  'base-camp': {
    route: 'spires', slug: 'sideproject-spires', kind: 'camp', from: 'Base camp', title: 'Sideproject Spires',
    body: ['Six summits, one for each project. Pick one and he sets off. Every route ends with a glissade back to camp.'],
    links: [], go: null
  },
  'off-route': {
    route: 'off-route', slug: '', kind: 'sign', from: 'A lone wand', title: 'Off route',
    body: ['There is no trail at this address. One wand, a lot of white, and a sign pointing back the way you came.'],
    links: [], go: 'Back to the Trailhead', home: true
  }
};

// The numbers were read from GitHub on 2026-11-14.
export const PROJECTS = {
  bluebird: { name: 'Bluebird Forecast', top: 'A weather station', repo: 'zimmertr/bluebird', site: 'https://bluebirdforecast.com', stars: 2, release: 'v0.141.8', released: '2026-11-14', language: 'TypeScript', license: 'PolyForm Noncommercial 1.0.0', body: ['The weather window finder. It discovers hiking and mountaineering destinations and ranks them by wildfire activity, precipitation, temperature, wind and air quality, so you can find the bluebird day before it gets here.'] },
  tks: { name: 'TJs-Kubernetes-Service', top: 'A server rack', repo: 'zimmertr/TJs-Kubernetes-Service', stars: 557, release: 'v4.0.38', released: '2026-11-14', language: 'HCL', license: 'GPL-3.0', body: ['TKS is a collection of Terraform configurations that deploy Talos Linux Kubernetes clusters to Proxmox VE.', 'This site runs at home on one of them: Proxmox, Terraform, Talos Linux, Kubernetes, Istio and MetalLB.'], extra: [['The hardware', 'https://github.com/zimmertr/TJs-Kubernetes-Service']] },
  'hevy-garmin-sync': { name: 'hevy-garmin-sync', top: 'A weight bench', repo: 'zimmertr/hevy-garmin-sync', stars: 2, release: 'v0.13.0', released: '2026-11-14', language: 'Python', license: 'MIT', body: ['Turns Hevy routines (and Hevy Trainer workouts) into Garmin Connect strength workouts on your watch.'] },
  trailhead: { name: 'trailhead', top: 'A pair of coin-operated binoculars', repo: 'zimmertr/trailhead', stars: 0, release: 'v0.1.5', released: '2026-11-14', language: 'TypeScript', license: 'PolyForm Noncommercial 1.0.0', body: ['This site. You are standing on it.'] },
  yggdrasil: { name: 'yggdrasil', top: 'The world tree', repo: 'zimmertr/yggdrasil', stars: 1, release: 'v2.0.0', released: '2026-11-14', language: 'HCL', license: 'GPL-3.0', body: ['Shared, versioned CI modules, and the Terraform that manages my GitHub repos and orgs. Every other project here hangs off it.'] },
  'kubernetes-manifests': { name: 'Kubernetes-Manifests', top: 'A cairn', repo: 'zimmertr/Kubernetes-Manifests', stars: 120, release: null, released: null, language: 'Shell', license: 'GPL-3.0', body: ['A collection of my Kubernetes manifests, managed by Kustomize and Argo CD.'] }
};
export const SPIRE_ORDER = ['bluebird', 'tks', 'hevy-garmin-sync', 'trailhead', 'yggdrasil', 'kubernetes-manifests'];

export const LABELS = { who: 'Who TJ is', mountains: 'In the mountains', note: 'A personal note', 'platform-engineering': 'Platform', 'site-reliability-engineering': 'Reliability', 'software-engineering': 'Software', summit: 'Summit', 'base-camp': 'Base camp', 'off-route': 'Off route' };
export const ENDS = { lake: 'Trailhead', stack: 'Trailhead', spires: 'Base camp', 'spires-home': 'Trailhead' };

export const REGISTER = [
  { name: 'Doot Doot', date: '2026-11-02', note: 'Supervised the whole build from the keyboard. Would sit on it again.' },
  { name: 'Peevers', date: '2026-11-05', note: 'Chased a butterfly past the kiosk. Did not catch it. Great trail.' },
  { name: 'A marmot', date: '2026-11-09', note: 'Somebody keeps jumping in my lake.' },
  { name: 'Party of two, Tacoma', date: '2026-11-12', note: 'Came for the resume, stayed for the glissade.' }
];

// Things to find, with the hint the kiosk gives until each is found.
export const FINDS = {
  doot: ['Doot Doot', 'She runs the Trailhead'],
  peevers: ['Peevers', 'Shy, grey, near the kiosk'],
  kiosk: ['The kiosk', 'You are reading it'],
  sasquatch: ['Sasquatch', 'Keep an eye on the far trees'],
  marmot: ["The marmot's whistle", 'On a rock above the lake'],
  swim: ['The swim to the island', 'The lake looks inviting'],
  snack: ['A snack break', 'Stand still for a minute by the lake or in the trees'],
  pika: ['The pika', 'In the talus among the larches'],
  tidepool: ['The tide pool', 'Wait for low water on the beach'],
  dusk: ['The Dusk sky', 'Look up after the light goes'],
  offroute: ['Off route', 'An address that goes nowhere'],
  'egg:bluebird': ['The weather station', 'On top of Bluebird Forecast'],
  'egg:tks': ['The server rack', 'On top of TJs-Kubernetes-Service'],
  'egg:hevy-garmin-sync': ['The weight bench', 'On top of hevy-garmin-sync'],
  'egg:trailhead': ['The binoculars', 'On top of trailhead'],
  'egg:yggdrasil': ['The world tree', 'On top of yggdrasil'],
  'egg:kubernetes-manifests': ['The cairn', 'On top of Kubernetes-Manifests']
};

export const HELP = [['Space', 'start and stop'], ['Hold Space', 'go faster'], ['Left / Right, A / D', 'jump between milestones'], ['Up / Down, W / S', 'start, stop'], ['M or Esc', 'the trail map'], ['T', 'day and dusk'], ['Drag', 'look around'], ['+ and -, wheel, pinch', 'zoom the map'], ['Click', 'signs, animals, summits, the lake']];

export const CONSOLE = ["%c  /\\      trailhead\n /  \\  /\\   You found the trail register's back door.\n/    \\/  \\  Everything here is drawn in code, a pixel at a time.\n          The source: https://github.com/zimmertr/trailhead", 'font-family: monospace; color: #467a30'];

// How long ago a date was, in plain words.
export function ago(iso, now = new Date()) {
  if (!iso) return '';
  const d = Math.max(0, Math.round((now - new Date(iso + 'T12:00:00Z')) / 86400000));
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : d < 60 ? d + ' days ago' : d < 730 ? Math.round(d / 30) + ' months ago' : Math.round(d / 365) + ' years ago';
}

// The four places he can be sent to. Their names are pinned on the map and head the trail map's lists.
export const DEST_NAMES = { trailhead: 'Trailhead', lake: 'About Lake', stack: 'The Stack', spires: 'Sideproject Spires' };

// The joke place names that stand as signs on the world map. habitat() in land.js finds where each one stands.
export const SIGNS = {
  'scope-creep': 'Scope Creep Glacier', segfault: 'Segfault Scree', 'merge-conflict': 'Merge Conflict Col', 'yak-shave': 'Yak Shave Meadow', 'about-lake': 'About Lake, 2.4 km',
  rollback: 'Rollback Basin', 'feature-flag': 'Feature Flag Tarns', hotfix: 'Hotfix Burn', postmortem: 'Postmortem Burn', 'cron-job': 'Cron Job Coulee', 'tech-debt': 'Tech Debt Badlands',
  'off-by-one': 'Off By One Peak', dependency: 'Dependency Range', 'stack-trace': 'Stack Trace Thicket', monorepo: 'Monorepo Woods', 'cache-miss': 'Cache Miss Cove', latency: 'Latency Bay'
};
// The names of things you can point at inside a scene.
export const NAMES = {
  kiosk: 'Trail conditions', register: 'Trail register', kayti: 'Kayti', lookout: 'Observability Lookout', tidepool: 'Tide pool: sea star, anemone, urchin',
  cats: { tortie: 'Doot Doot', nebel: 'Peevers' },
  forest: { sign: 'Legacy Grove', creek: 'Cache Miss Creek' },
  lakeside: { sign: 'Cold Start Cove', marmot: 'Hoary marmot', swim: 'Go for a swim', back: 'Swim back' },
  wall: { ledge: 'Deadlock Ledge', roof: 'Rollback Roof', scree: 'Segfault Scree' },
  climb: { crevasse: 'Tech Debt Crevasse', ridge: 'Race Condition Ridge' },
  offroute: { wand: 'The only wand for miles' },
  larches: { goats: 'Nanny and kid', billy: 'On-call billy goat', pika: 'Pika' },
  approach: { marmot: 'Hoary marmot' }
};
// Every joke place name, for the legend on the trail map.
const PLACE_NAMES = [...Object.values(SIGNS).filter(n => !n.includes(',')), NAMES.forest.sign, NAMES.forest.creek, NAMES.lakeside.sign, NAMES.wall.ledge, NAMES.wall.roof, NAMES.climb.crevasse, NAMES.climb.ridge, NAMES.lookout].filter((n, i, a) => a.indexOf(n) === i);

// The music, in the order audio.js holds the tunes, and the three sets of instruments.
export const TRACK_NAMES = ['Wildflower Meadow', 'Hall of Mosses', 'Granite Hours', 'Above the Icefall', 'Larch March', 'Tarn at Noon', 'Glissade'];
export const SET_NAMES = ['Console', 'Handheld', 'Music box'];

// The words of the interface itself: buttons, headings and messages. A function takes the numbers it needs.
export const UI = {
  name: 'TJ Zimmerman',
  run: ['Start', 'Stop'], home: ['Trailhead', 'Camp'], sound: ['Sound on', 'Sound off'], theme: ['Dusk', 'Day'],
  // On the Sound button until the first click, tap or key: a browser plays nothing before one. With a mouse, then with a finger.
  soundWaits: ['Click for sound', 'Tap for sound'],
  auto: name => 'Auto: ' + name,
  // The word in the burst when the server rack on TJs-Kubernetes-Service is hit. Drawn in pixels, capitals only.
  bang: 'BANG!',
  found: (name, n, of) => 'Found: ' + name + '. ' + n + ' of ' + of + ' on the kiosk checklist.',
  allDone: 'All three destinations done. The summit register is open, on the trail map.',
  fail: 'The world could not be drawn here. The trail map has everything as text.',
  // Said when a scene breaks and he is put on the off-route page instead.
  broken: 'That stretch of trail has washed out. He is off route.',
  // Said while a scene holds him at a spot with no card. The key is what follows 'wait:' in the stop's id.
  wait: { go: 'Press Space or Start to carry on.', belay: 'Press Space or Start to climb.' },
  card: {
    summit: top => 'On the summit: ' + top.toLowerCase(),
    egg: top => 'Click ' + top.toLowerCase().replace(/^a /, 'the ') + ' up there.',
    facts: ['Stars', 'Latest release', 'Language', 'License'], noRelease: 'none yet',
    pitches: [['Pitch 1', 100, 'sent'], ['Pitch 2', 100, 'sent'], ['Pitch 3', 100, 'one fall, caught'], ['Pitch 4', 8, 'next']],
    github: 'GitHub', climbed: 'climbed', walkOut: 'Walk out to the Trailhead', glissade: 'Glissade to camp'
  },
  marks: { camp: 'Base camp', trailhead: 'Trailhead', summit: 'Summit' },
  keys: { title: 'Keys', note: 'Everything also works by touch.' },
  // The hidden panel behind the backtick key and the small sign at the foot of the trail map.
  debug: {
    title: 'Debug', close: 'Close', layers: 'Layers', outlines: 'Outlines', zoom: 'Zoom', cats: 'Cats', set: 'Set', offRoute: 'Go to the off-route page', breakScene: 'Break this scene',
    toggles: { trees: 'Trees', clouds: 'Clouds', mist: 'Mist', labels: 'Labels', animals: 'Animals', roam: 'Roam areas', taps: 'Tap targets', trails: 'Trail lines', camera: 'Camera limits', snap: 'Snap to pixels' },
    speed: 'Time', speeds: ['Pause', '0.5\u00d7', '1\u00d7', '2\u00d7', '4\u00d7', '8\u00d7'],
    startMap: 'Start now, on the map', startForest: 'Start now, in the forest run', startLarches: 'Start now, in the larch basin', startRidge: 'Start now, on the West Ridge', startLake: 'Start now, at Reflection Lake',
    events: { gust: 'Larch needle gust', ridgegust: 'Gust on the ridge', raven: 'Raven in the updraft', shower: 'Marine layer', breach: 'Humpback breach', blow: 'Humpback blow', ferry: 'Ferry sets out', tide: 'Low tide', orcas: 'Orca pod', salmon: 'Salmon leap', osprey: 'Osprey dives', serac: 'Serac fall', avalanche: 'Avalanche', lens: 'Lenticular cloud', heron: 'Heron lifts off', tumble: 'Tumbleweed', devil: 'Dust devil', star: 'Shooting star (Dusk)', plane: 'Float plane', jay: "Steller's jay", bear: 'Bear', sasquatch: 'Sasquatch', eyeshine: 'Deer eyeshine (Dusk)' },
    note: 'Roam areas, trail lines and camera limits show on the map. Tap targets show in every scene. A start button works only in its own scene.'
  },
  map: {
    title: DEST_NAMES.trailhead, sub: 'TJ Zimmerman, Seattle, Washington',
    // The dots on the trail map take a card's title or a project's name, except these.
    dots: { summit: 'The summit', 'base-camp': 'Base camp' },
    lake: [DEST_NAMES.lake, km => km + ' km loop, on foot'], stack: [DEST_NAMES.stack, km => km + ' km in, five pitches up'], spires: [DEST_NAMES.spires, km => km + ' km to base camp, six summits'],
    elsewhere: 'TJ elsewhere', onMap: 'On this map', plain: 'Read as a page',
    settings: 'Settings', sound: 'Sound', onOff: ['on', 'off'], music: 'Music', playedOn: 'Played on', dusk: 'Day or dusk', clear: 'Clear my flags', cleared: 'Flags and footprints cleared.',
    takes: s => Math.max(1, Math.round(s / 60)) + ' min',
    legend: 'The small signs in the world carry names: ' + PLACE_NAMES.slice(0, -1).join(', ') + ' and ' + PLACE_NAMES[PLACE_NAMES.length - 1] + '.'
  },
  kiosk: {
    title: 'Trail conditions', sub: 'Posted at the Trailhead kiosk', version: 'Running version', deployed: 'Deployed', uptime: 'Uptime',
    up: s => s < 90 ? s + (s === 1 ? ' second' : ' seconds') : Math.round(s / 60) + ' minutes',
    status: ['Status', 'All trails open'], open: 'Open', lakeDone: 'Run. Flag flying.', stackDone: 'Climbed. Flag flying.', summits: n => n + ' of 6 summits',
    wildlife: ['Wildlife', 'Elk in the meadow, mountain goats, bighorn sheep and marmots up high. A humpback and an orca pod offshore. Sockeye at the lake\'s fall, with an osprey after them. A heron in the oxbow, an owl in the forest, two cats at this kiosk, and some days a bear'],
    seen: ['Also seen', 'Serac falls and an avalanche on Mount Monolith, the marine layer off the sea, low tide, the ferry and a float plane, dust devils in the sage, and shooting stars at Dusk'],
    checklist: (n, of) => 'Field checklist: ' + n + ' of ' + of + ' found', notFound: 'Not found yet', got: 'Found'
  },
  register: {
    close: 'Close the book',
    // The printed headings of the book's right-hand page (L3), as on a Forest Service register form.
    book: { date: 'Date', who: 'Name, party and remarks' },
    // TJ's note on the left-hand page until the visitor has done all three (L4). Draft copy for TJ to rewrite.
    todo: { hi: 'Thanks for stopping by!', need: 'You can sign the register once you have finished all three:', spires: name => 'One summit in ' + name, after: 'Then come back, and this page is yours.', sig: 'TJ' },
    title: 'Summit register', sub: 'You did all three. Sign in.', open: 'open', locked: 'locked',
    lockedSay: 'The summit register opens once all three destinations are done.',
    pending: 'waiting for TJ to approve it', signed: 'Signed. Your entry waits for TJ to approve it.',
    yourName: 'Your name', yourNote: 'A note for the register', sign: 'Sign the register', mock: 'This is a mock. Entries stay in this browser.'
  },
  plain: {
    back: 'Back to the world',
    // Shown at the top of the page of text when the world itself cannot be drawn.
    down: 'The world could not be drawn here, so this is all of it as one page.',
    mapAlt: 'The map of the world: a lake in a forest, a granite wall and six glaciated summits around a trailhead',
    facts: (stars, release, language, license) => stars + ' stars, ' + release + ', ' + language + ', ' + license,
    released: (version, when) => version + ' released ' + when, noRelease: 'no release yet'
  }
};
