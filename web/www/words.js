// Written by `npm run words` from content/game/*.yaml. Edit those files, not this one.
export const W = {
 "INTRO": "is a principal platform engineer based out of Seattle, WA. When he's not playing in the mountains, he's usually hacking on computers. Choose a destination to learn more!",
 "DESTINATIONS": [
  {
   "route": "lake",
   "sign": "Run to Reflection Lake",
   "about": "to learn more about TJ",
   "dir": "left",
   "slug": "reflection-lake"
  },
  {
   "route": "stack",
   "sign": "Climb Proficiency Peak",
   "about": "to learn more about his skills",
   "dir": "right",
   "slug": "proficiency-peak"
  },
  {
   "route": "spires",
   "sign": "Climb the Sideproject Spires",
   "about": "to see some of his personal projects",
   "dir": "up",
   "slug": "sideproject-spires"
  }
 ],
 "LINKS": {
  "github": [
   "GitHub",
   "https://github.com/zimmertr"
  ],
  "linkedin": [
   "LinkedIn",
   "https://www.linkedin.com/in/zimmertr/"
  ],
  "resume": [
   "Resume",
   "https://github.com/zimmertr/Resume"
  ],
  "strava": [
   "Strava",
   "https://www.strava.com/athletes/zimmertr"
  ],
  "peakbagger": [
   "Peakbagger",
   "https://www.peakbagger.com/climber/climber.aspx?cid=25279"
  ],
  "mountainproject": [
   "Mountain Project",
   "https://www.mountainproject.com/user/200835619/tj-zimmerman"
  ]
 },
 "REGISTER": [
  {
   "name": "Doot Doot",
   "date": "2026-11-02",
   "note": "Supervised the whole build from the keyboard. Would sit on it again."
  },
  {
   "name": "Peevers",
   "date": "2026-11-05",
   "note": "Chased a butterfly past the kiosk. Did not catch it. Great trail."
  },
  {
   "name": "A marmot",
   "date": "2026-11-09",
   "note": "Somebody keeps jumping in my lake."
  },
  {
   "name": "Party of two, Tacoma",
   "date": "2026-11-12",
   "note": "Came for the resume, stayed for the glissade."
  }
 ],
 "FINDS": {
  "doot": [
   "Doot Doot",
   "She runs the Trailhead"
  ],
  "peevers": [
   "Peevers",
   "Shy, grey, near the kiosk"
  ],
  "kiosk": [
   "The kiosk",
   "You are reading it"
  ],
  "sasquatch": [
   "Sasquatch",
   "Keep an eye on the far trees"
  ],
  "marmot": [
   "The marmot's whistle",
   "On a rock above the lake"
  ],
  "swim": [
   "The swim to the island",
   "The lake looks inviting"
  ],
  "snack": [
   "A snack break",
   "Stand still for a minute by the lake or in the trees"
  ],
  "pika": [
   "The pika",
   "In the talus among the larches"
  ],
  "tidepool": [
   "The tide pool",
   "Wait for low water on the beach"
  ],
  "dusk": [
   "The Dusk sky",
   "Look up after the light goes"
  ],
  "offroute": [
   "Off route",
   "An address that goes nowhere"
  ],
  "egg:bluebird": [
   "The weather station",
   "On top of Bluebird Forecast"
  ],
  "egg:tks": [
   "The server rack",
   "On top of TJs-Kubernetes-Service"
  ],
  "egg:hevy-garmin-sync": [
   "The weight bench",
   "On top of hevy-garmin-sync"
  ],
  "egg:trailhead": [
   "The binoculars",
   "On top of trailhead"
  ],
  "egg:yggdrasil": [
   "The world tree",
   "On top of yggdrasil"
  ],
  "egg:kubernetes-manifests": [
   "The cairn",
   "On top of Kubernetes-Manifests"
  ]
 },
 "CARDS": {
  "off-route": {
   "route": "off-route",
   "slug": "",
   "kind": "sign",
   "from": "A lone wand",
   "title": "Off route",
   "home": true,
   "body": [
    "There is no trail at this address. One wand, a lot of white, and a sign pointing back the way you came."
   ],
   "links": [],
   "go": "Back to the Trailhead"
  },
  "platform-engineering": {
   "route": "stack",
   "slug": "proficiency-peak/platform-engineering",
   "kind": "rack",
   "from": "The rack on his harness",
   "title": "Platform Engineering",
   "draft": true,
   "body": [
    "TJ builds the paved road that other engineers ship on. He has led moves from hand-rolled pipelines to GitOps platforms that developers own themselves, and rebuilt fragile automation as versioned infrastructure as code.",
    "The goal is always the same: make the right way the easy way."
   ],
   "links": [],
   "tools": [
    "Kubernetes",
    "Argo CD",
    "Argo Rollouts",
    "Helm",
    "Terraform",
    "GitLab CI",
    "GitHub Actions"
   ],
   "go": "Climb on"
  },
  "site-reliability-engineering": {
   "route": "stack",
   "slug": "proficiency-peak/site-reliability-engineering",
   "kind": "watch",
   "from": "His watch",
   "title": "Site Reliability Engineering",
   "draft": true,
   "body": [
    "Things break, so TJ plans for the fall. He made canary releases the default way to ship, built the dashboards and monitors that catch trouble early, and wrote the post-mortems and runbooks that stop it coming back.",
    "He has carried the pager too."
   ],
   "links": [],
   "tools": [
    "Istio",
    "Datadog",
    "Prometheus",
    "Grafana",
    "PagerDuty",
    "SLOs"
   ],
   "go": "Climb on"
  },
  "software-engineering": {
   "route": "stack",
   "slug": "proficiency-peak/software-engineering",
   "kind": "guide",
   "from": "The guidebook",
   "title": "Software Engineering",
   "draft": true,
   "body": [
    "TJ writes software to remove toil, from command line tools and automation up to whole web applications like Bluebird Forecast.",
    "These days he works with AI coding agents the way a climber uses beta: he follows most of the suggestions and skips the ones that lead nowhere."
   ],
   "links": [],
   "tools": [
    "Python",
    "TypeScript",
    "Bash",
    "Java",
    "HCL",
    "Claude Code"
   ],
   "go": "To the summit"
  },
  "summit": {
   "route": "stack",
   "slug": "proficiency-peak/summit",
   "kind": "summit",
   "from": "The summit",
   "title": "The top of Proficiency Peak",
   "draft": true,
   "body": [
    "Five pitches, one flag. The whole route is written down in the two places below."
   ],
   "links": [
    "resume",
    "linkedin"
   ],
   "go": "Rappel"
  },
  "who": {
   "route": "lake",
   "slug": "reflection-lake/who",
   "kind": "sign",
   "from": "Trail sign",
   "title": "Who TJ is",
   "body": [
    "TJ Zimmerman is a principal platform engineer based out of Seattle, WA. When he's not playing in the mountains, he's usually hacking on computers."
   ],
   "aside": "Mountains, cats, and computers.",
   "links": [
    "linkedin",
    "github",
    "resume"
   ],
   "go": "Keep running"
  },
  "mountains": {
   "route": "lake",
   "slug": "reflection-lake/in-the-mountains",
   "kind": "map",
   "from": "The map from his pocket",
   "title": "In the mountains",
   "draft": true,
   "body": [
    "TJ is a peakbagger, a lakebagger and a trail runner, and most weekends he is somewhere in the Cascades doing one of the three. He climbs rock and glaciers as well, and keeps a wilderness first aid card current for the days that go sideways.",
    "His tracks, summits and ticks are all public, so feel free to follow along."
   ],
   "links": [
    "strava",
    "peakbagger",
    "mountainproject"
   ],
   "go": "Keep running"
  },
  "note": {
   "route": "lake",
   "slug": "reflection-lake/a-personal-note",
   "kind": "journal",
   "from": "His trail journal",
   "title": "A personal note",
   "draft": true,
   "body": [
    "I started out in Michigan, studied computers there, and then moved to Seattle for the mountains. So for about ten years now I have built platforms during the week and disappeared into the hills on the weekend.",
    "However, the two have more in common than you would think. Both reward patience, both punish shortcuts, and both go better with good partners. Therefore I built this site to show you both at once, instead of another page of bullet points.",
    "Feel free to wander. And say hi to Doot Doot and Peevers on your way out (they run the place)."
   ],
   "links": [
    "linkedin",
    "github",
    "strava",
    "peakbagger",
    "mountainproject"
   ],
   "go": "Run home"
  },
  "base-camp": {
   "route": "spires",
   "slug": "sideproject-spires",
   "kind": "camp",
   "from": "Base camp",
   "title": "Sideproject Spires",
   "body": [
    "Six summits, one for each project. Pick one and he sets off. Every route ends with a glissade back to camp."
   ],
   "links": [],
   "go": null
  }
 },
 "PROJECTS": {
  "bluebird": {
   "name": "Bluebird Forecast",
   "top": "A weather station",
   "clue": "The station's forecast says bluebird skies. Maybe ask it to prove it.",
   "repo": "zimmertr/bluebird",
   "site": "https://bluebirdforecast.com",
   "stars": 2,
   "release": "v0.141.8",
   "released": "2026-11-14",
   "language": "TypeScript",
   "license": "PolyForm Noncommercial 1.0.0",
   "body": [
    "The weather window finder. It discovers hiking and mountaineering destinations and ranks them by wildfire activity, precipitation, temperature, wind and air quality, so you can find the bluebird day before it gets here."
   ]
  },
  "tks": {
   "name": "TJs-Kubernetes-Service",
   "top": "A server rack",
   "clue": "The hardware seems to be malfunctioning, maybe try some percussive maintenance.",
   "repo": "zimmertr/TJs-Kubernetes-Service",
   "stars": 557,
   "release": "v4.0.38",
   "released": "2026-11-14",
   "language": "HCL",
   "license": "GPL-3.0",
   "body": [
    "TKS is a collection of Terraform configurations that deploy Talos Linux Kubernetes clusters to Proxmox VE.",
    "This site runs at home on one of them: Proxmox, Terraform, Talos Linux, Kubernetes, Istio and MetalLB."
   ],
   "extra": [
    [
     "The hardware",
     "https://github.com/zimmertr/TJs-Kubernetes-Service"
    ]
   ]
  },
  "hevy-garmin-sync": {
   "name": "hevy-garmin-sync",
   "top": "A weight bench",
   "clue": "Nobody leaves a bench this high without doing a set.",
   "repo": "zimmertr/hevy-garmin-sync",
   "stars": 2,
   "release": "v0.13.0",
   "released": "2026-11-14",
   "language": "Python",
   "license": "MIT",
   "body": [
    "Turns Hevy routines (and Hevy Trainer workouts) into Garmin Connect strength workouts on your watch."
   ]
  },
  "trailhead": {
   "name": "trailhead",
   "top": "A pair of coin-operated binoculars",
   "clue": "The binoculars are coin-operated. You look like you have a coin.",
   "repo": "zimmertr/trailhead",
   "stars": 0,
   "release": "v0.1.5",
   "released": "2026-11-14",
   "language": "TypeScript",
   "license": "PolyForm Noncommercial 1.0.0",
   "body": [
    "This site. You are standing on it."
   ]
  },
  "yggdrasil": {
   "name": "yggdrasil",
   "top": "The world tree",
   "clue": "The world tree's roots reach into every repo. Give it a closer look.",
   "repo": "zimmertr/yggdrasil",
   "stars": 1,
   "release": "v2.0.0",
   "released": "2026-11-14",
   "language": "HCL",
   "license": "GPL-3.0",
   "body": [
    "Shared, versioned CI modules, and the Terraform that manages my GitHub repos and orgs. Every other project here hangs off it."
   ]
  },
  "kubernetes-manifests": {
   "name": "Kubernetes-Manifests",
   "top": "A cairn",
   "clue": "Every visitor leaves a stone. It's tradition.",
   "repo": "zimmertr/Kubernetes-Manifests",
   "stars": 120,
   "release": null,
   "released": null,
   "language": "Shell",
   "license": "GPL-3.0",
   "body": [
    "A collection of my Kubernetes manifests, managed by Kustomize and Argo CD."
   ]
  }
 },
 "LABELS": {
  "who": "Who TJ is",
  "mountains": "In the mountains",
  "note": "A personal note",
  "platform-engineering": "Platform",
  "site-reliability-engineering": "Reliability",
  "software-engineering": "Software",
  "summit": "Summit",
  "base-camp": "Base camp",
  "off-route": "Off route"
 },
 "ENDS": {
  "lake": "Trailhead",
  "stack": "Trailhead",
  "spires": "Base camp",
  "spires-home": "Trailhead"
 },
 "DEST_NAMES": {
  "trailhead": "Trailhead",
  "lake": "Reflection Lake",
  "stack": "Proficiency Peak",
  "spires": "Sideproject Spires"
 },
 "SIGNS": {
  "scope-creep": "Scope Creep Glacier",
  "segfault": "Segfault Scree",
  "merge-conflict": "Merge Conflict Col",
  "yak-shave": "Yak Shave Meadow",
  "rollback": "Rollback Basin",
  "feature-flag": "Feature Flag Tarns",
  "hotfix": "Hotfix Burn",
  "postmortem": "Postmortem Burn",
  "cron-job": "Cron Job Coulee",
  "tech-debt": "Tech Debt Badlands",
  "off-by-one": "Off By One Peak",
  "dependency": "Dependency Range",
  "stack-trace": "Stack Trace Thicket",
  "monorepo": "Monorepo Woods",
  "cache-miss": "Cache Miss Cove",
  "latency": "Latency Bay"
 },
 "NAMES": {
  "kiosk": "Trail conditions",
  "register": "Trail register",
  "kayti": "Kayti",
  "lookout": "Observability Lookout",
  "tidepool": "Tide pool: sea star, anemone, urchin",
  "cats": {
   "tortie": "Doot Doot",
   "nebel": "Peevers"
  },
  "forest": {
   "sign": "Legacy Grove",
   "creek": "Cache Miss Creek",
   "elk": "Roosevelt elk",
   "owl": "Barred owl",
   "slug": "Banana slug",
   "deer": "Black-tailed deer",
   "jay": "Canada jay"
  },
  "lakeside": {
   "sign": "Cold Start Cove",
   "marmot": "Hoary marmot",
   "loon": "Common loon",
   "chick": "Loon chick",
   "swim": "Go for a swim",
   "back": "Swim back"
  },
  "wall": {
   "ledge": "Deadlock Ledge",
   "roof": "Rollback Roof",
   "scree": "Segfault Scree"
  },
  "ridge": {
   "raven": "Common raven",
   "goat": "Mountain goat"
  },
  "climb": {
   "crevasse": "Tech Debt Crevasse",
   "ridge": "Race Condition Ridge"
  },
  "offroute": {
   "wand": "The only wand for miles"
  },
  "larches": {
   "goats": "Nanny and kid",
   "billy": "On-call billy goat",
   "pika": "Pika"
  },
  "camp": {
   "goats": "Mountain goats"
  },
  "approach": {
   "marmot": "Hoary marmot",
   "pika": "Pika"
  },
  "map": {
   "bull": "Bull elk",
   "elk": "Roosevelt elk",
   "goat": "Mountain goat",
   "kid": "Mountain goat kid",
   "sheep": "Bighorn ram",
   "moose": "Bull moose",
   "calf": "Moose calf",
   "bear": "Black bear",
   "cub": "Black bear cub",
   "squirrel": "Douglas squirrel",
   "chipmunk": "Chipmunk",
   "marmot": "Hoary marmot",
   "whale": "Humpback whale",
   "eagle": "Bald eagle",
   "osprey": "Osprey",
   "orca": "Orca",
   "jelly": "Moon jelly",
   "raven": "Ravens",
   "gull": "Gulls"
  }
 },
 "TRACK_NAMES": [
  "Wildflower Meadow",
  "Hall of Mosses",
  "Granite Hours",
  "Above the Icefall",
  "Larch March",
  "Tarn at Noon",
  "Glissade"
 ],
 "SET_NAMES": [
  "Console",
  "Handheld",
  "Music box"
 ],
 "UI": {
  "name": "TJ Zimmerman",
  "run": [
   "Start",
   "Stop"
  ],
  "home": [
   "Trailhead",
   "Camp"
  ],
  "soundOff": "Sound off",
  "theme": {
   "auto": "Auto",
   "day": "Day",
   "dusk": "Dusk"
  },
  "soundWaits": [
   "Click for sound",
   "Tap for sound"
  ],
  "auto": "Auto: {name}",
  "bang": "BANG!",
  "forecast": {
   "app": [
    "BLUEBIRD",
    "FORECAST"
   ],
   "wet": "DRIZZLE",
   "clear": "CLEARING"
  },
  "viewer": {
   "back": "BACK",
   "hint": [
    "ARROWS: LOOK   SPACE: BACK",
    "DRAG TO LOOK"
   ]
  },
  "watch": {
   "lap": "LAP",
   "synced": [
    "WORKOUT",
    "SYNCED",
    "FROM HEVY"
   ]
  },
  "found": "Found: {name}. {n} of {of} on the kiosk checklist.",
  "allDone": "All three done. The trail register at the Trailhead is yours to sign.",
  "fail": "The world could not be drawn here. The trail map has everything as text.",
  "broken": "That stretch of trail has washed out. He is off route.",
  "wait": {
   "go": "Press Space or Start to carry on.",
   "belay": "Press Space or Start to climb."
  },
  "card": {
   "summit": "On the summit: {top}",
   "facts": [
    "Stars",
    "Latest release",
    "Language",
    "License"
   ],
   "noRelease": "none yet",
   "pitches": [
    [
     "Pitch 1",
     100,
     "sent"
    ],
    [
     "Pitch 2",
     100,
     "sent"
    ],
    [
     "Pitch 3",
     100,
     "one fall, caught"
    ],
    [
     "Pitch 4",
     8,
     "next"
    ]
   ],
   "github": "GitHub",
   "climbed": "climbed",
   "walkOut": "Walk out to the Trailhead",
   "glissade": "Glissade to camp"
  },
  "marks": {
   "camp": "Base camp",
   "trailhead": "Trailhead"
  },
  "keys": {
   "title": "Keys",
   "note": "Everything also works by touch."
  },
  "debug": {
   "ground": [
    "Ground: read from the bake",
    "Ground: worked out on this page"
   ],
   "title": "Debug",
   "close": "Close",
   "layers": "Layers",
   "outlines": "Outlines",
   "time": "Time of day",
   "sunset": "Jump to sunset",
   "sunrise": "Jump to sunrise",
   "clockSpeeds": [
    1,
    10,
    60
   ],
   "animals": {
    "elk": "Elk",
    "moose": "Moose",
    "goat": "Mountain goats",
    "sheep": "Bighorn sheep",
    "bear": "Black bears",
    "marmot": "Marmots",
    "squirrel": "Squirrels",
    "eagle": "Bald eagle",
    "osprey": "Osprey",
    "gulls": "Gulls",
    "birds": "Crows"
   },
   "spawn": "Spawn",
   "spawnAll": "everywhere it lives",
   "near": "near",
   "scene": "Jump to a scene",
   "breakGroup": "Break a scene",
   "inScene": "In this scene",
   "mapEvents": "On the map",
   "scenes": {
    "forest": "Forest",
    "lakeside": "Reflection Lake",
    "larches": "Larch basin",
    "wall": "West Ridge",
    "approach": "Walk to base camp",
    "camp": "Base camp",
    "climb": "A Spires climb",
    "register": "Trail register",
    "offroute": "Off route"
   },
   "sounds": "Sounds",
   "effects": "Effects",
   "tunesH": "Tunes, one part at a time",
   "places": "Background",
   "backToAuto": "Music back to Auto",
   "noGo": "No-go areas",
   "noGoKinds": {
    "": "off",
    "boat": "Ferry",
    "whale": "Whale",
    "swimmer": "Orcas",
    "floater": "Jellyfish",
    "land": "Land animals"
   },
   "zoom": "Zoom",
   "cats": "Cats",
   "set": "Set",
   "offRoute": "Go to the off-route page",
   "breakScene": "Break this scene",
   "toggles": {
    "trees": "Trees",
    "clouds": "Clouds",
    "mist": "Mist",
    "labels": "Labels",
    "animals": "Animals",
    "roam": "Roam areas",
    "taps": "Tap targets",
    "trails": "Trail lines",
    "camera": "Camera limits",
    "snap": "Snap to pixels"
   },
   "speed": "Time",
   "speeds": [
    "Pause",
    "0.5×",
    "1×",
    "2×",
    "4×",
    "8×"
   ],
   "startMap": "Start now, on the map",
   "startForest": "Start now, in the forest run",
   "startLarches": "Start now, in the larch basin",
   "startRidge": "Start now, on the West Ridge",
   "startLake": "Start now, at Reflection Lake",
   "events": {
    "gust": "Larch needle gust",
    "ridgegust": "Gust on the ridge",
    "raven": "Raven in the updraft",
    "shower": "Marine layer",
    "breach": "Humpback breach",
    "blow": "Humpback blow",
    "ferry": "Ferry sets out",
    "tide": "Low tide",
    "orcas": "Orca pod",
    "eagle": "Eagle fishes",
    "osprey": "Osprey dives",
    "cubplay": "Bear cubs play",
    "cubclimb": "Bear cub climbs a tree",
    "marmot": "Marmots whistle",
    "serac": "Serac fall",
    "avalanche": "Avalanche",
    "ava0": "Avalanche, west face",
    "ava1": "Avalanche, middle face",
    "ava2": "Avalanche, east face",
    "squall": "Summit squall",
    "lens": "Lenticular cloud",
    "tumble": "Tumbleweed",
    "devil": "Dust devil",
    "star": "Shooting star (Dusk)",
    "sasquatch": "Sasquatch",
    "eyeshine": "Deer eyeshine (Dusk)"
   },
   "families": {
    "humpback": "Humpback",
    "cubs": "Bear cubs",
    "avalanche": "Avalanche"
   },
   "pick": "Pick one",
   "cameraLines": [
    "View middle",
    "Push back",
    "World edge"
   ],
   "note": "Roam areas, trail lines and camera limits show on the map. Tap targets show in every scene. A start button works only in its own scene."
  },
  "map": {
   "sub": "TJ Zimmerman, Seattle, Washington",
   "dots": {
    "summit": "The summit",
    "base-camp": "Base camp"
   },
   "lake": "{km} km loop, on foot",
   "stack": "{km} km in, five pitches up",
   "spires": "{km} km to base camp, six summits",
   "elsewhere": "TJ elsewhere",
   "onMap": "On this map",
   "plain": "Read as a page",
   "settings": "Settings",
   "onOff": [
    "on",
    "off"
   ],
   "music": "Music",
   "musicStyle": "Music style",
   "dusk": "Time of day",
   "clear": "Clear my flags",
   "cleared": "Flags and footprints cleared.",
   "plank": {
    "lake": "{km} km",
    "stack": "{km} km",
    "spires": "{km} km"
   },
   "takes": "{n} min",
   "legend": "The small signs in the world carry names: {names}.",
   "and": "and"
  },
  "kiosk": {
   "title": "Trail conditions",
   "sub": "Posted at the Trailhead kiosk",
   "version": "Running version",
   "deployed": "Deployed",
   "uptime": "Uptime",
   "up": {
    "second": "{n} second",
    "seconds": "{n} seconds",
    "minutes": "{n} minutes"
   },
   "status": [
    "Status",
    "All trails open"
   ],
   "open": "Open",
   "lakeDone": "Run. Flag flying.",
   "stackDone": "Climbed. Flag flying.",
   "summits": "{n} of 6 summits",
   "wildlife": [
    "Wildlife",
    "Elk in the meadow, a bull moose and a calf in the riverside woods, squirrels and chipmunks by the trail. Mountain goats, bighorn sheep and marmots up high, and a pika in the larch talus. A humpback and an orca pod offshore, gulls and a bald eagle on the sea stacks. An osprey fishing at Reflection Lake. A black bear and her two cubs in the firs below the Spires waterfall, and some days a second family at the forest edge. An owl in the forest and two cats at this kiosk"
   ],
   "seen": [
    "Also seen",
    "Serac falls, an avalanche and a cap cloud on Mount Monolith, rain showers over the hills, the marine layer off the sea, low tide, the ferry, tumbleweeds and dust devils in the sage. At Dusk: shooting stars, the aurora, foxfire in the forest and headlamps on the Spires' glacier"
   ],
   "checklist": "Field checklist: {n} of {of} found",
   "notFound": "Not found yet",
   "got": "Found"
  },
  "register": {
   "close": "Close the book",
   "book": {
    "date": "Date",
    "who": "Name, party and remarks"
   },
   "thanks": "Thanks for signing! Your entry is on the right, waiting for me to read it before it shows to anyone else.",
   "todo": {
    "hi": "Thanks for stopping by!",
    "need": "You can sign the register once you have finished all three:",
    "spires": "One summit in {name}",
    "after": "Then come back, and this page is yours.",
    "sig": "TJ"
   },
   "link": "Trail register",
   "canRead": "read it",
   "canSign": "sign it",
   "pending": "waiting for TJ to approve it",
   "signed": "Signed. Your entry waits for TJ to approve it.",
   "yourName": "Your name",
   "yourNote": "A note for the register",
   "notePh": "A few words",
   "sign": "Sign the register",
   "mock": "This is a mock. Entries stay in this browser."
  },
  "plain": {
   "top": "Page",
   "back": "Back to the world",
   "down": "The world could not be drawn here, so this is all of it as one page.",
   "mapAlt": "The map of the world: a lake in a forest, a granite wall and six glaciated summits around a trailhead",
   "facts": "{stars} stars, {release}, {language}, {license}",
   "released": "{version} released {when}",
   "noRelease": "no release yet"
  }
 },
 "HELP": [
  [
   "Space",
   "start and stop"
  ],
  [
   "Hold Space",
   "go faster"
  ],
  [
   "Left / Right, A / D",
   "jump between milestones"
  ],
  [
   "Up / Down, W / S",
   "start, stop"
  ],
  [
   "M or Esc",
   "the trail map"
  ],
  [
   "T",
   "day and dusk"
  ],
  [
   "N",
   "the music"
  ],
  [
   "C",
   "trail conditions"
  ],
  [
   "R",
   "the trail register"
  ],
  [
   "P",
   "the page of text"
  ],
  [
   "K",
   "these keys"
  ],
  [
   "`",
   "the debug menu"
  ],
  [
   "Drag",
   "look around"
  ],
  [
   "+ and -, wheel, pinch",
   "zoom the map"
  ],
  [
   "Click",
   "signs, animals, summits, the lake"
  ]
 ],
 "CONSOLE": [
  "%c  /\\      trailhead\n /  \\  /\\   You found the trail register's back door.\n/    \\/  \\  Everything here is drawn in code, a pixel at a time.\n          The source: https://github.com/zimmertr/trailhead",
  "font-family: monospace; color: #467a30"
 ],
 "AGO": {
  "today": "today",
  "yesterday": "yesterday",
  "days": "{n} days ago",
  "months": "{n} months ago",
  "years": "{n} years ago"
 }
};
