# Product requirements

What tjzimmerman.com is and the rules it is built to, as of round 6 (2026-11-21). TJ decides every requirement here. A decision that changes one gets a record under [`architectural-decision-records/`](architectural-decision-records/README.md), and this page is corrected in the same PR. The round being built is planned in [`ROUND6.md`](ROUND6.md); ideas not yet built are in [`IDEAS.md`](IDEAS.md).

## 1. What it is

Trailhead is TJ's personal site as one pixel-art mountain world that a visitor runs and climbs through to learn about him. It is for anyone who looks TJ up: recruiters, engineers, friends. It has to be fast, good-looking and full of things to find, and nobody has to finish it to get what they came for.

The visitor starts at the Trailhead, a meadow at a trail junction with three destinations in view, and picks one:

| Place | What it holds | How he gets there |
| --- | --- | --- |
| Reflection Lake | Who TJ is, what he does in the mountains, a personal note | A trail run through mossy rainforest, round an alpine lake under Mount Monolith, and home |
| Proficiency Peak | Platform Engineering, Site Reliability Engineering, Software Engineering, then the resume | Iron rungs into a larch basin, then the West Ridge, roped, with two friends |
| Sideproject Spires | Six personal projects, one summit each | A walk up the glacier to base camp, then a short climb of the visitor's choosing |

A page of text carries every card's words for anyone who wants to skip the world.

## 2. Requirements

1. **One world, on rails.** Every place sits on one flat top-down map, and each stretch of a route is a side-on scene. Every camera follows a route or stands at a fixed view. [Record 0001](architectural-decision-records/0001-the-world-is-pixel-art-on-rails-served-as-plain-javascript.md).
2. **Pixel art throughout**, drawn on a 2D canvas in code, in one palette of at most 254 colours. Places differ by colour and environment, never by style. Generated pictures may be used where `design/TRAILHEAD-ART.md` allows.
3. **A believable world.** Every feature is a real Washington feature with believable neighbours, wet in the west and dry in the east. Water runs downhill and joins what it flows into, solid things are solid, animals live where their real counterparts would, and what a scene shows matches the map.
4. **Nothing plays by itself.** The site opens at the Trailhead and waits. Animals, weather and water move; he does not move until the visitor acts. After two minutes untouched an idle tour shows the world, and stops at the first touch.
5. **One progress number.** Each route has one number for how far along it he is; his position, pose and the camera are computed from it, so the timeline scrubs both ways. [Record 0002](architectural-decision-records/0002-one-progress-number-drives-everything.md).
6. **He touches the ground.** Feet, hands and tools meet the surface under them, and climbing looks like real climbing: protection, ropes that run through it, anchors at belays.
7. **A way home is always on screen.** Every route ends back at the Trailhead or base camp, and the trail map reaches any place from anywhere.
8. **Third person.** The site talks about TJ, never as him.
9. **Fast.** Every view draws in under 16.7 ms a frame, and the page is ready in under a second on a desktop.
10. **One clock.** Day and Dusk follow one world clock, the same on the map and in every scene. AUTO runs the cycle; Day and Dusk hold it. A visitor who asks for reduced motion gets AUTO held at Day.
11. **Nothing from elsewhere.** The page loads only from its own site: its fonts are its own files, and the site's policy allows no inline script, inline style or `data:` image.

## 3. The places

### The Trailhead

A meadow at a trail junction, with the kiosk and its trail register and TJ's two cats, Doot Doot and Peevers. On screen, an intro card stands over three wooden planks, one per destination. The intro reads "TJ Zimmerman is a principal platform engineer based out of Seattle, WA. When he's not playing in the mountains, he's usually hacking on computers. Choose a destination to learn more!" Picking a plank sends him off at once. A flag stands on each destination the visitor has finished.

### Reflection Lake

A run through rainforest to the lake and round it, with three stops:

| Stop | The card comes from | Links |
| --- | --- | --- |
| Who TJ is | A trail sign | LinkedIn, GitHub, Resume |
| In the mountains | The map from his pocket | Strava, Peakbagger, Mountain Project |
| A personal note | His trail journal | All five profiles |

### Proficiency Peak

Iron rungs up into the larch basin, the walk to the foot of the West Ridge (5.7), five pitches with the black-haired man leading, the red-haired woman second and TJ last on two ropes, a fall on the last pitch caught and hauled, the summit, and the descent: a rappel to a ledge, a stuck rope, and a traverse down steep snow with two ice axes.

| Stop | The card comes from |
| --- | --- |
| Platform Engineering | The rack on his harness |
| Site Reliability Engineering | His watch |
| Software Engineering | The guidebook |
| The top of Proficiency Peak | The summit (Resume, LinkedIn) |

### Sideproject Spires

A walk up the glacier to base camp, where the visitor picks a summit. Each climb is about half a minute, each its own kind of mountaineering, and each ends with a glissade back to camp. Each summit has one thing to click; the card shows the project's stars, latest release, language and licence, read live from the API when it can be reached.

| Summit | The climb | On top |
| --- | --- | --- |
| Bluebird Forecast | Waits out the drizzle under a boulder, then scrambles dry rock to a clear summit | A weather station |
| TJs-Kubernetes-Service | The icefall: seracs, a snow bridge, ladders over crevasses and one tall wall of ice | A server rack |
| hevy-garmin-sync | A trail run up the spire's grassy flank (a snow couloir from round 6) | A weight bench |
| trailhead | Over the notch and astride a thin fin of rock | Coin-operated binoculars |
| yggdrasil | A via ferrata: a steel cable, iron rungs and a fixed ladder | The world tree |
| Kubernetes-Manifests | The crevasse maze in a whiteout, out of the cloud at the top | A cairn that keeps a stone from each visit |

## 4. Across the site

- **Timeline.** Along the bottom: a mark for each stop, a thumb for him, Start and Stop at the left and the way home at the right. Click to jump, drag to scrub.
- **Stops and cards.** He stops, the card opens, and one press sends him on.
- **Trail map.** A map of the same world: every stop is a dot that takes him there, beside the profile links and the settings.
- **Click to walk.** A click or tap on a trail walks him there.
- **Addresses.** Every stop has its own, such as `#sideproject-spires/bluebird`. The page of text is `#page`.
- **The page of text.** Every card's words and links on one page, with a picture of the map.
- **Keys.** Space starts and stops him (hold it to go faster), left and right jump between stops, and every menu has a key: M or Esc the trail map, N the music, T the time of day, C the trail conditions, R the trail register, P the page of text, K the keys, the backtick the debug menu. The Keys button lists them all, and each top-bar button names its key on hover.
- **The trail register.** In the kiosk at the Trailhead. The close-up of its box is also where the trail conditions are: a notice pinned on the box's back wall shows the status and the checklist count, and a click opens the whole board. The kiosk in the world opens the close-up with the board up. Anyone can read it; signing is earned by finishing all three destinations. An entry stays in the visitor's browser, marked as waiting for TJ's approval, until round 7 saves entries for everyone.
- **Finds.** Things to discover, each counted on the kiosk's checklist: the two cats, the kiosk, Sasquatch, the marmot's whistle, the swim to the island, a snack break, the pika, the tide pool, the Dusk sky, the off-route page, and the thing on each summit. Finds are TJ's choice, never invented.
- **Off route.** An address that goes nowhere, or a scene that fails, puts him in the fog on the off-route page, with a 404 in the cloud.
- **Timed events.** Weather, animals and the sea make the map feel lived in: a ferry, whales, orcas, an eagle and an osprey fishing, avalanches on Mount Monolith, dust devils and more.
- **The DEBUG menu.** Public: layers, the clock, a sound test, a spawn menu for every animal, a start button for every timed event, a way to jump to any scene or break one.
- **Sound.** Synthesised tunes for each place and effects, off until the visitor turns them on.

## 5. How it is built

The game is plain browser JavaScript with no build step and no dependencies, in `web/www/` ([`web/CLAUDE.md`](../web/CLAUDE.md)). The map is baked ahead of time into `ground.png` by the render tools in `tools/pixel/`, which also film it, walk every route and measure frame time, all in Docker.

The site is four services and a Postgres database, split by trust ([record 0003](architectural-decision-records/0003-four-services-split-by-trust.md); [`ARCHITECTURE.md`](ARCHITECTURE.md)):

| Service | What it does today |
| --- | --- |
| `web` | nginx serving the game, under a strict content security policy |
| `api` | The public API: each project's GitHub numbers under `/api/v1/projects`, which the game reads |
| `fetcher` | An hourly job that reads each project's numbers from GitHub into Postgres, and runs the migrations |
| `admin` | A private panel on the home network: health and version only, until it approves register entries |

The Helm chart is in zimmertr/trailhead-helm. Every check runs in Docker as a `make` target, and CI runs them all ([`CICD.md`](CICD.md), [`DEVELOPMENT.md`](DEVELOPMENT.md)).

## 6. Plan

1. **Rounds 3 to 5 (done).** The world was built round by round as an artifact TJ reviewed: low-poly 3D first, then pixel art from 2026-11-14. Round 5 merged into `main` on 2026-11-21.
2. **Round 6 (under way).** TJ's 38 notes on round 5, issues #33, #34, #36 and #38, the first generated picture, and the repo made ready for a public release ([`ROUND6.md`](ROUND6.md)).
3. **Round 7.** The trail register saved for everyone: entries through `api`, approved in `admin`, kept in Postgres ([#56](https://github.com/zimmertr/trailhead/issues/56)).
4. **MVP.** The site live on TJ's cluster through the chart.

## 7. Open items

- **Analytics and error reporting.** Not built. The first plan measured visits, errors and frame rate before launch; the game sends nothing today.
- **TypeScript.** The game is untyped JavaScript. A port, or type checking through `// @ts-check`, is deferred by TJ.
- **The card styles.** Each card looks like the thing it comes from; whether to keep that is TJ's call ([#55](https://github.com/zimmertr/trailhead/issues/55)).
- **Hostnames.** Which hosts the site, the API and the panel answer on is deferred.
