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
    body: ['Three pitches, one flag. The whole route is written down in the two places below.'],
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
  tks: { name: 'TJs-Kubernetes-Service', top: 'A hut with a rack in it', repo: 'zimmertr/TJs-Kubernetes-Service', stars: 557, release: 'v4.0.38', released: '2026-11-14', language: 'HCL', license: 'GPL-3.0', body: ['TKS is a collection of Terraform configurations that deploy Talos Linux Kubernetes clusters to Proxmox VE.', 'This site runs at home on one of them: Proxmox, Terraform, Talos Linux, Kubernetes, Istio and MetalLB.'], extra: [['The hardware', 'https://github.com/zimmertr/TJs-Kubernetes-Service']] },
  'hevy-garmin-sync': { name: 'hevy-garmin-sync', top: 'A weight bench', repo: 'zimmertr/hevy-garmin-sync', stars: 2, release: 'v0.13.0', released: '2026-11-14', language: 'Python', license: 'MIT', body: ['Turns Hevy routines (and Hevy Trainer workouts) into Garmin Connect strength workouts on your watch.'] },
  trailhead: { name: 'trailhead', top: 'A brass survey marker', repo: 'zimmertr/trailhead', stars: 0, release: 'v0.1.5', released: '2026-11-14', language: 'TypeScript', license: 'PolyForm Noncommercial 1.0.0', body: ['This site. You are standing on it.'] },
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

export const HELP = [['Space', 'start and stop'], ['Left / Right, A / D', 'jump between milestones'], ['Up / Down, W / S', 'start, stop'], ['M or Esc', 'the trail map'], ['T', 'day and dusk'], ['Drag', 'look around'], ['Click', 'signs, animals, summits, the lake']];

export const CONSOLE = ["%c  /\\      trailhead\n /  \\  /\\   You found the trail register's back door.\n/    \\/  \\  Everything here is drawn in code, a pixel at a time.\n          The source: https://github.com/zimmertr/trailhead", 'font-family: monospace; color: #467a30'];

// How long ago a date was, in plain words.
export function ago(iso, now = new Date()) {
  if (!iso) return '';
  const d = Math.max(0, Math.round((now - new Date(iso + 'T12:00:00Z')) / 86400000));
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : d < 60 ? d + ' days ago' : d < 730 ? Math.round(d / 30) + ' months ago' : Math.round(d / 365) + ' years ago';
}
