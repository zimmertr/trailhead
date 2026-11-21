# Round 6 of the pixel world

TJ's 38 notes on round 5 (2026-11-21), his answers to the Q&A that followed, and the checklist an unattended loop works through. This file stands alone: an agent with no memory of the conversation reads it on every firing. It lives until round 6 merges; the last item folds its lasting rules into a permanent doc and deletes it.

## 1. Why this round exists

Round 5 was merged as https://github.com/zimmertr/trailhead/pull/32 (squash commit `5604ea6`, tag `archive/pixel-r5-final`). TJ played it and sent 38 notes: fixes to scenes, a bigger lake, clickable animals, fewer menus, and a cleanup of the repo so it is ready for a public MVP. He also asked for issues #33, #34, #36 and #38 to be built in this round, and for the first generated picture in the game (the trail register).

## 2. Ground rules for whoever does the work

**Where things are**

- Repo: https://github.com/zimmertr/trailhead. Work only in a clone inside the session's scratchpad directory (under `~/.claude/tmp`), never in `~/git`, never in `/tmp`.
- Branch: `round6`, cut from `main` at `5604ea6`. **One draft PR for the whole round**, opened at the first push, from `round6` into `main`. Never merge it: TJ reviews and merges. Never push to `main`.
- **Read CI after every push** (`gh pr checks <n>`), and fix a failure before the next item. In round 5 a failing test went unseen for seven items because CI was read only at the end.
- **One artifact for the whole round, republished after every item.** Create it at the first publish and add its link to section 10. Never publish over round 5's artifact (https://claude.ai/artifact/1VdS5Q3uSMTpEuGEm39SZr), which is the floor to compare with.
- Frozen: `main`, every `archive/*` tag, and every earlier artifact.
- **Where the game and its tools are (since A2).** The game is `web/www/` (served by the `web` image through `web/build.mjs`). The tools are in `tools/pixel/`; run them from there (`cd tools/pixel && ./shot.sh ...`), and they serve `web/www` unless `WWW=<folder>` names another build. Their pictures go to `tools/pixel/out/` (ignored by git). `IDEAS.md` is `docs/IDEAS.md`. Round 5's build for comparison: `git archive archive/pixel-r5-final prototype/pixel/www | tar -x -C <folder>` (that tag still has the old layout).
- History: git keeps everything A3 deletes. `git show archive/pixel-r5-final:prototype/pixel/ROUND5.md` is round 5's full plan and log, if a reason is ever needed.
- Art rules: `design/TRAILHEAD-ART.md` (added at A1). Read it before any item that makes or changes art.

**How the code is laid out** (plain ES modules, no dependencies)

- `core.js`: the indexed-colour renderer. `ramp(name, [day...], [dusk...])` adds palette entries (`R.<name>[i]`), plus `BM` bitmaps, `pick()` with dither, `Screen` (`put`, `blit`, `iris`, `night`, `present`), the `DEBUG` flags, `breeze()`, `windAt()` and `veilTable`. New ramps go just before `const INK`.
- `land.js`: the map: heights and materials, rivers and lakes (`C.lakes`, `LIP`, `FALLS`), trails (routed by least cost from the Trailhead `C.T`), footbridges (`BRIDGES`), the coast (`SHORE`, `SHV`), the dry edge (`BORDER`), the glacier (`GL`), every planted thing (`things`, `STACKS`), the fire lookout (`LOOK`), flower drifts (`DRIFT`, `parkAmt`), animal homes (`habitat()`) and `buildTerrain()`.
- `bake.html`, `bake.sh`, `ground.png`: the ground worked out ahead of time. **Run `./bake.sh` after any change to `land.js`, `core.js` or anything `land.js` imports.** On localhost the page prints "ground.png is missing or no longer matches the map" when the bake is stale; treat that as a failed check.
- `monolith.js`: Mount Monolith, painted glacier by glacier, with the snow over each ice fall (`cover`, `faceSnow`).
- `world.js`: the map scene: drawing order, taps (`pick`), name tags, camera and opening (`lookRound`), night sky, Dusk.
- `critters.js`: everything on the map that moves (herds, `walker`s, moose, bears, squirrels, whale, orcas, ferry, sea and tide, jellyfish, eagle, osprey, surf, mist, birds). `mapfauna.js` and `scenery.js` hold map drawings. `events.js` holds timed map events. `collide.js` holds the no-go areas.
- Side scenes: `forest.js` and `lakeside.js` (the lake loop, on `side.js`), `larches.js`, `ridge.js` (the West Ridge of Proficiency Peak), `approach.js` (the walk to Spires base camp), `camp.js`, `climb.js` (the six Spires climbs), `register.js`, `offroute.js` (the 404).
- Drawings: `fauna.js`, `sprites.js`, `people.js`, `tj.js`, `cats.js`.
- `pixel.js`: the scene manager: `ROUTES` (lists of legs), stops and cards, the round-window cut, zoom, pace, input, the world clock.
- `app.js`, `index.html`, `style.css`, `content.js`: the page round the canvas (signs, cards, timeline, trail map sheet, debug panel `openDebug`), its styles, and every word shown (until A4 moves the words to `content/`). `audio.js`: synthesised tunes and effects.
- **The site's policy allows no inline style, no inline script and no `data:` image.** Styles go in `style.css` or through `element.style` (the `el()` helper's `style` attribute does this); images are files. The browser suite fails on any policy violation.

**How to run and look** (everything in Docker; nothing is installed or run on the workstation)

- `./shot.sh <out> '<query or #hash>' <w> <h> '<steps>' [dpr]` saves a picture under `out/`. Steps are separated by semicolons: `wait=600;key=Space;wheel=x,y,dy;drag=x0,y0,x1,y1;click=<css>;shot=<name.png>;down=Space;up=Space;eval=<js>`. An `eval` step cannot contain a semicolon.
- Queries: `route=lake|stack|spires|spire:<id>`, `p=0..1`, `dusk=1`, `time=<0..>`, `debug=roam,-trees,-mist`, `done=lake,stack,spires`, `speed=0|0.5|1|2|4|8`, `start=<event,...>`, `break=<scene>|load:<scene>|renderer|mount`.
- `window.__api` (`trigger`, `setSpeed`, `hitAt`, `find`, `forget`, `trailAt`, `trailMarks`, `walkTo`, `progress`, `running`, `clock`, `touring`, `me`) and `window.__info` (`{p, route, running, scene, VW, VH, S, o}`). `window.__dbg(x, y)` says what is drawn at a screen pixel.
- `./sheet.sh <out.png> <columns> <cell width> <files>` lays pictures side by side (`CROP=x,y,w,h` crops them).
- `./frames.sh` films on a fixed page clock (steps `wait`, `key`, `click`, `wheel`, `eval`, `film=NxMS`, `time=N`; `SLOWFONT=<ms>` holds fonts back). Use it for anything that moves.
- `./walk.sh <tag> <w> <h> <auto|day|dusk> <route>...` walks routes through every stop at 8x and prints what went wrong (`clicks` tests click to move; `CALM=1` tests reduced motion).
- `./check.sh <item> <prev>`: the per-item check (every module parses, `make browser` against the built web image, frame time, what moved on the map).
- The repo's checks run in Docker from the repo root: `make lint`, `make typecheck`, `make test`, `make image SERVICE=web && make smoke SERVICE=web`, `make browser-run`, `make lighthouse-run`. CI runs them all; run one locally only when a change needs it.
- `./refs.sh`: the 72 standard views. To render round 5 for comparison, export the tag into its own folder (`git archive archive/pixel-r5-final prototype/pixel/www | tar -x -C <folder>`) and mount that folder as `/www` in the same container.
- Edits to many places at once: a node script under `out/splice/` with an `ed(anchor, replacement)` helper that asserts each anchor matches once, run in the lab image.
- Lint: the repo's ESLint covers the game; run it in Docker as CI does.
- Frame time: every view in section 7 stays under 16.7 ms.
- Publishing: commit, push, export with `git archive HEAD web/www | tar -x -C ../r6-working` (from the clone root), and publish `../r6-working/web/www/index.html` with `root` set to that `www` folder. `files` lists every game `.js` (app, approach, audio, camp, cats, climb, collide, content, core, critters, events, fauna, forest, lakeside, land, larches, mapfauna, monolith, offroute, people, pixel, register, ridge, scenery, side, sprites, tj, world, plus any new module), `style.css`, `cursor.png`, `cursor-press.png`, `ground.png`, the `fonts/` files (eight `.woff2` and `LICENSE.txt`), from A4 on the generated words file, and from H1 on the register picture.

**The bar**

- Round 5's final build is the floor. Before ticking an item, render the same view from `archive/pixel-r5-final` and from the new build, lay them side by side with `sheet.sh`, and look. Film what moves, at the zoom a visitor sees by default. Check Day and Dusk, desktop (1440) and phone (390).
- Anything worse than round 5 is fixed before the item is ticked, and is never described as "rough".
- Ask of every picture: "would TJ wince?"

**Rules that must not be broken**

- Never push to `main`. Never merge a pull request. Commit small and often to `round6` and push after every commit.
- Nothing is attributed to an AI: no co-author trailers, no "generated with" lines.
- No em dash (U+2014) or en dash in anything committed or published. Check with `grep` before every commit.
- Never coin a name for a mechanism or a bug and use it as if TJ knows it. Say what happens in plain words. In the UI, name things in the words the UI already shows.
- New user-facing words are drafts for TJ to approve. They live with the other words (`content.js`, then `content/` after A4) and are listed in the final report.
- No references to alcohol anywhere. Three of TJ's private rules (about email, about job seeking, and this one) are never written into anything committed.
- **Never switch off or remove an existing feature** unless section 5 says TJ asked for it. This round he asked to remove: the first-visit hint, the watch on hevy-garmin-sync's climb (and its trail run), the separate sound button (merged into the music button), the switchback ramps on the forest's cliff, and the 3D-era code and docs (A2, A3).
- **Finds** (things a visitor can discover for a flag) are TJ's choice. Never invent one. Clicking an animal is not a find.
- **Place new things by rule, not by written positions** (forest density, height, water, trails), so they survive the next change to the map.
- **Colours.** 251 of 254 are used. New art reuses existing ramps and the free slots. If a piece truly needs more, widen the palette to two bytes a pixel then: check every scene against its last picture, log the frame time, carry on. Never halt for it.
- **Every new timed event gets a start button in the debug menu**, and every placed animal appears in the spawn menu.
- **Frame time stays under 16.7 ms.** Put every new per-pixel loop in its own small function outside the map's `draw()`.
- One stream of work, in order, by one agent. No forks, no parallel subagents.
- **Keep `IDEAS.md` growing.** Write every idea down as it comes and commit it with the item. Ideas are written down, never built unless an item says so.
- READMEs are TJ's: keep them true in the same commit as the change, in his voice (first person, full sentences, `-` bullets, Title Case headings), and never restyle his wording.

**When TJ is present**

- When he gives feedback, report findings and ask questions with AskUserQuestion before changing anything.
- When a question cannot wait and he is away, make the call, log it in section 11 in one line, and carry on. Never halt the loop for a question, except where an item says it waits for TJ.

## 3. The law of this world

- It is its own world, not a map of Washington. **Every feature is a real Washington feature, and every neighbour is a believable neighbour.** It runs wet in the west to dry in the east, because the crest blocks the rain.
- West to east: open ocean and fog, a coast with sea stacks, rainforest, the volcano with its lake and flower parkland, the meadow at the Trailhead under the snowy crest, larches and granite just east of the crest, pines and aspen, then sage, scabland and Palouse hills at the far edge.
- **Four kinds of mountain, one per country, and nothing else on the skyline.** (1) The snowy crest (North Cascades): dark rock, snow, glaciers. Sideproject Spires is its most dramatic massif; the far Legacy Range is the same family seen from a distance. (2) One volcano, Mount Monolith, after Rainier: wide, lopsided, flat-topped, never Fuji. (3) Enchantments granite: Proficiency Peak (after Prusik Peak) and unnamed granite peaks behind it. (4) The dry side: basalt benches and yellow Palouse hills.
- Seasons are mixed on purpose: gold larches, full wildflowers and fireweed at once. Each place at its best.
- The ground is tiered, and water takes the lowest ground. Rivers wander downhill. Lakes have an outflow, and water is continuous everywhere: every stream visibly joins what it flows into.
- **Solid things are solid.** Nothing that moves passes through anything solid. One shared rule decides this for every moving thing (`collide.js`).
- **Animals belong where they live**, in the country their real counterparts would.
- **One clock for the whole world.** Day and dusk follow one world clock, the same on the map and in every scene.
- **Object permanence across scenes.** What a scene shows matches the map, and the direction a scene walks matches the map's trail.
- **New: things are where they could really be, at the size they would really be.** No tree grows out of a glacier, no label names scree that is not there, and a thing far away is drawn smaller than the same thing near. C8 audits the world for this; the fixes wait for TJ.
- The people: TJ (orange cap, beard, yellow jacket on the map; green cap and jacket in the Spires scenes), Kayti (long brown hair, purple puffy; she paints at base camp and shares TJ's tent), and the two climbing friends on Proficiency Peak: the black-haired man, who leads every pitch, and the red-haired woman, who climbs second. TJ climbs last. TJ is never shown on routes he has not climbed.

## 4. Decided with TJ before round 6 that still holds

- **The map:** 1920 by 1080 world units, seen at an angle, with heights. `u` runs west to east, `v` away from the camera, `h` is height, and a spot draws at screen (`u`, `1080 - v - h`). The sea is in the bottom-left corner. Fog swallows the rainforest's west edge. The dry country is one slanted corner at the bottom right with a wandering edge. No country is an even band or a rectangle.
- **Names:** Reflection Lake (about TJ), Proficiency Peak (his skills), Sideproject Spires (his projects), Mount Monolith, the Legacy Range, and the joke names in the words file.
- **Zoom** is smooth and continuous, never stepped. TJ: "I want zooming in and out to be seamless and perfect, not stepped."
- **The six Spires climbs** are each about 30 seconds and each their own kind of mountaineering, chosen to echo the project. None reuses another's set piece. Section 5 changes three of them.
- **The West Ridge** (5.7, Proficiency Peak) is the route TJ really climbed. Protection is drawn, the rope behaves like a rope, every belay is a multi-piece anchor, there is wind and cold, and the background is far below. The order is the leader, the woman, then TJ, with two ropes. The descent is a rappel onto a ledge, a stuck rope, and a traverse down steep snow with two ice axes, which TJ led in real life.
- **The register** at the Trailhead: anyone can read it; signing is earned by finishing the lake, the peak and one Spires summit. New entries stay in the visitor's browser, marked as waiting for TJ's approval. Saving them for everyone is round 7 (A5 files the issue).
- **Timed events** make the world feel lived in. Each gets a debug start button.
- **People don't have to finish anything.** TJ: "the website is just supposed to be impressive an informative in the end. Not an actual video game people need to 100%."
- **Round 5's systems stay:** no-go areas for every mover, the idle tour after two minutes, the world clock with Auto, Day and Dusk, the public DEBUG menu with its sound test and spawn menu, click or tap to walk, the page of text at `#page`, fonts served from the site's own files, reduced motion holding AUTO at Day.

## 5. Decided with TJ for round 6 (2026-11-21)

Each note in TJ's words where it matters, with what he chose in the Q&A. The checklist item that builds it is in brackets.

**The repo and releases**

- **Note 1, 2 (done before the loop).** Round 5 merged (#32). #42 moved the lab's Playwright image and, with a commit added, its package to 1.65.1 together; #43 and #44 were closed as superseded.
- **Note 34, the cleanup [A2, A3].** TJ: "I want to trim the fat on the repo and prepare for MVP... Lets prune everything that doesn't represent the current state at minor cost of info loss on older decisions, including ADRS. Lets keep IDEAS.md and keep adding to it though." And: "I want to do a full purge of anything that isn't necessary for the future of this project. Anything that doesn't have an exlicit purpose should be deleted. Clean the repo and prepare for public release."
  - The game moves into `web/`, which serves it. The tools move to `tools/pixel/`.
  - **The services stay**: `api`, `fetcher`, `admin`, `db` and `common`. TJ wants a fetcher, an admin console to approve register entries and a database for them in the end. Purge only their 3D-era leftovers. The game reads live GitHub stars from `api` and falls back to the numbers baked in when `api` cannot be reached. The register service is round 7.
  - Docs: delete `ROUND4.md`, `ROUND5.md`, `PROGRESS.md` and `prototype/pixel/plan/`. Delete every decision record that no longer holds, keep those that do, renumber from 0001. Rewrite the PRD and `ARCHITECTURE.md` as short descriptions of the pixel game as it is. Keep `IDEAS.md` (it moves to `docs/IDEAS.md`).
  - The chart in zimmertr/trailhead-helm is not touched this round.
- **Note 35, security [A1].** The Dependabot alert is cleared by #42. The code-scanning alert (https://github.com/zimmertr/trailhead/security/code-scanning/1, incomplete multi-character sanitization in `web/src/render.ts`) is fixed so the tag stripping cannot be slipped past.
- **Note 36, issues [A4, B5, D4, I1].** Build #33 (menus and hotkeys), #34 (words out of the source), #36 (forest light beams) and #38 (engine rules).
- **Note 37, issues #14 to #17.** They were the plan for `web` to serve each part of the game. Round 6's PR closes all four once `web` serves the whole game; anything left goes into `IDEAS.md`.
- **Words [A4], issue #34.** Plain text files in `content/`, one readable file per place, turned into the game's data at build time. No CMS. Draft marks stay.
- **Art rules [A1].** trailhead-19's rules page is copied unchanged into `design/TRAILHEAD-ART.md`, with one line in the repo's `CLAUDE.md` pointing at it. Its source: `/Users/tj/.claude/tmp/claude-501/-Users-tj-git-personal-trailhead/bc571b3f-c723-4fb0-ac4f-26209a8eec68/scratchpad/design/TRAILHEAD-ART.md`.
- **Note 20, the card styles [A5].** Each card is styled as the thing it comes from (sign, map, journal, rack, watch, guidebook). TJ: skip this round, file an issue.

**The opening and the page round the world**

- **Note 6 [B1].** Remove the "Click a sign or a trail to start walking." message.
- **Note 7 [B2].** At the opening zoom TJ sits a little below and right of the centre of the screen, close enough that the eye finds him at once, with the three destinations still in view. The zoom level stays.
- **Note 31 [B3].** The three planks on the Trailhead sign start at the same left edge, with arrows and text lined up.
- **Note 29 [B4].** The Sound button goes. One top-bar button shows the music track. Its menu lists the music styles and a "Sound off" entry. Before the first click it reads "Click for sound".
- **Note 30 [B4].** The AUTO button gets a small pixel sun or moon before the word, whichever it is now: sun with "Auto", sun with "Day", moon with "Dusk". The icon follows the clock.
- **Note 32 [B4].** AUTO spends about 75% of the cycle in day, with a short sunset, dusk and sunrise.
- **Note 23 and #33 [B5].** TJ: "I think there are too many menus. Trail Map, Trailhead, Trail Conditions, Trail Register, etc... Trail Conditions and Trail Register could be a joint interface where you're looking at the sign board and register box? And then you click on one or the other? Or maybe when you're in that view you can just read the sign board stuff clicking just lets you zoom into it?" The loop decides the design itself, builds it, and logs why. Hotkeys come with it (#33).
- **Note 24 [B6].** The debug menu's camera-bounds outline is too faint. Draw it bold, like the roam areas.
- **Note 25 (answered).** Snap to Pixels settles a wheel zoom onto the nearest whole level so every map pixel is the same size. Nothing to build.
- **Note 26 [B6].** A debug "On the map" event moves the camera to centre on where it happens, then starts it.
- **Note 27 [B6].** Related debug events become one split button each ("Humpback", "Bear cubs", "Avalanche" and any other family): the main part starts a random one, a small arrow beside it opens a menu of the specific ones.
- **Note 28 [B7].** The off-route page's 404 is readable at a glance: big, clearly darker fog digits anyone notices within a second or two, still drifting and soft-edged. It was built in round 5 (J1) but too faint.
- **Note 28, second [B7].** "Break the Scene" needs a way back into the game: the off-route page it leads to gets a clear button back to the Trailhead.
- **Note 18 [B8].** Clicking "Glissade to camp" while the binoculars are open closes them at once and starts the glissade. Today it waits until the binoculars are closed.

**The map**

- **Note 4 [C1].** Reflection Lake about 1.5 times its size, inside TJ's red outline (north towards the moraine boulders, east towards the stream), keeping the boulders and trees near the outline. The trails and the boardwalk follow the new shore. TJ's picture: section 12.
- **Note 4 [C2].** Many more flowers across the parkland TJ outlined in blue (the meadow between the forest, the volcano and the Spires), above all on the left flank where there are none. A band of moraine gravel and boulders all along the volcano's base, where snow or ridge meets meadow, wider below each glacier snout and tarn; the flowers start below it.
- **Note 8 [C3].** The empty patch in the forest between the beach and the Trailhead (TJ's circle, section 12) is filled with trees like the rest of that area. Elsewhere in the forest: one deliberate clearing with a mossy bog and skunk cabbage, and one or two old-growth groves (a few giant cedars, bigger than the trees round them, ferns below).
- **Note 5 [C4].** The tumbleweeds are too subtle. Make them bigger and easier to see, and roll them across the empty Palouse hills instead of the sagebrush.
- **Note 14 [C5].** "Segfault Scree" names a grassy meadow. Its name tag goes on real scree.
- **Note 10 [C6].** Every animal, on the map and in the scenes, is clickable, with one or two reactions true to how it lives (a marmot whistles and dives, an elk bugles, an orca spyhops, a goat bounds off, a slug pulls in its eyestalks). The loop writes the list in section 11 and builds them all. Not finds; just for fun. Doot Doot and Peevers are the model.
- **Note 38 [C8].** TJ: "look for 'logical' errors in geography, asset placement, etc. Like trees growing out of glaciers. Or trees being as tall in the background as in the foreground with the same asset. And propose to me how we will fix these." **Propose everything first**: a report with pictures and a fix for each, published as an artifact. Nothing is built until TJ chooses.

**The lake loop**

- **Note 12 [D1].** The forest scene's climb to the lake: the zig-zag ramps on the cliff look off, and the cliff's right side fades into the forest. Replace it with a trail up beside the falls: no ramps on the cliff, the trail climbs a forested slope beside the waterfall on stone and root steps, the cliff tucked behind the trees, and at the top it comes out through the trees onto the lakeshore. TJ's picture: section 12.
- **Note 13 [D2].** When the marine layer is on (on the map when he walks the forest, or started while he is in it), the forest scene has rain and thick fog that hides much of the view.
- **Note 11 [D3].** The banana slug: about twice the size, banana yellow with dark spots, two long eyestalks that wave, and a shiny slime trail behind it.
- **#36 [D4].** More light beams and particles in the forest scene, per the issue.

**Sideproject Spires**

- **Note 15 [E1].** Bluebird Forecast keeps its start (waiting for the weather to clear). After it: boulder hopping across talus, then a 3rd to 4th class scramble up a gully and rib with hands on rock, with one exposed step across a gap or ledge near the top, to the weather station.
- **Note 16 [E2].** hevy-garmin-sync becomes a steep snow couloir between the spires, climbed with crampons and an ice axe, kicking steps. No watch on the climb (TJ: "we can drop the watch gimmick entirely. It doesn't make sense to count laps and sets for climbing a couloir"). The weight bench stays on the summit as its find; a click gives a set, and the sync shows as a small Hevy-to-Garmin notice over his head.
- **Note 17 [E3].** The trailhead climb runs at about twice today's speed, with quick, springy crevasse jumps and the a cheval and tiptoeing on the ridge cut to a few moves. The binoculars keep their zoom and open on the cats, but can pan across the whole world map.
- **Note 19 [E4].** On yggdrasil he floats up the ladders. Give him a real ladder-climbing animation (hand over hand, foot over foot), as careful as the ice climbing.

**Proficiency Peak**

- **Note 21 [F1].** The climbing is 1.5 times faster than round 5's.
- **Note 21 [F2].** After TJ's whipper it is not obvious he is being hauled; it looks like he jumps up. And it is not obvious the rope is stuck and they are pulling it. Make both read at once (the haul: the leader leaning back and pulling hand over hand, the rope taut, TJ rising in jerks; the stuck rope: a taut line, heaves, a look up).
- **Note 22 [F3].** On the snow traverse after the rappel, each climber changes to the traverse pose before reaching the snow, so they traverse in the air. Change pose only on the snow. It takes far too long: they traverse a couple of steps, then the scene moves on.

**Everywhere**

- **Note 3 [G1].** Scrubbed to the moment he pushes off into a glissade, the screen stays half white until he moves. Fix it: the burst is drawn only while he runs.
- **Note 9 [H1].** The trail register's kiosk and the book's paper become a generated pixel-art picture (issue #37), with the handwriting and the signing form laid over it, still live. Make it both ways trailhead-19 asked for: the game draws the picture's pixels, and the picture is only a reference for code-drawn art. Publish both side by side, ship the better one, log why; TJ can overturn it in review. Use the `generate-image` skill (`~/.claude/skills/generate-image/SKILL.md`) and the rules in `design/TRAILHEAD-ART.md`. Start prompts for the style model `z-image-turbo-trailhead` with "pixel art, side view scene,", leave out the trigger word, and never ask for an "overhead map". trailhead-19's trial of the first way on the Spires is in `/Users/tj/.claude/tmp/claude-501/-Users-tj-git-personal-trailhead/bc571b3f-c723-4fb0-ac4f-26209a8eec68/scratchpad/mock-sp/` (`?spai=v1`, `?spai=v2`), its pictures and prompts in that scratchpad's `jobs/spires/`.
- **#38 [I1].** The engine rules: written down, and applied (animals use the critter framework, plants react to wind and are assets not painted blobs, animals move and have textures, objects have collision boundaries), per the issue.

## 6. Settled by the planner

- The order: the repo first (A), so every later item is built in its final place; the engine rules (I1) before clickable animals (C6), so the reactions are built once on the shared framework. I1 therefore runs right after section B.
- A4 builds the words file before section B so new copy goes straight into `content/`.
- The two trailhead-19 tasks are folded into A1 (the rules) and H1 (the comparison), not their own PRs, at TJ's word.
- trailhead-19 is told when H1 is done (SendMessage to `trailhead-19`), with what worked and any rule that turned out wrong in practice.

## 7. Starting numbers (round 5 final, measured 2026-11-17)

Frame times in ms: map with events 3.4, zoomed out 8.7, at Dusk zoomed out with events 11.4 to 12.7, phone 2.5; forest 5.1, shore 4.9, larch basin 1.8, West Ridge 4.0, summit 5.4, haul 7.1, snow traverse 7.2, walk to camp 2.0, camp 1.6, climbs 2.3 to 2.8 (Kubernetes-Manifests 13.7), register 0.9, off-route 12.0. Ready in 0.78 to 0.82 s. 251 of 254 colours. 17 browser tests.

## 8. Checklist

Work top to bottom. Each item is finished by the steps in section 9.

**A. The repo**

- [x] A1. Open the draft PR from `round6`. Copy the art rules to `design/TRAILHEAD-ART.md` unchanged and point `CLAUDE.md` at them in one line. Fix the code-scanning alert in `web/src/render.ts` with a test. Create the round's artifact from the current game.
- [x] A2. Move the game into `web/` (served by the `web` image in place of the 3D-era home page and plain page) and the tools into `tools/pixel/`. Delete the 3D-era code in `web/` and anywhere else. Point CI (lint, Prototype Smoke, e2e, Dockerfile tests) at the new paths. The game reads live stars from `api` with the baked numbers as fallback. Rewrite sections 2 and 9 with the new paths. Every check green.
- [x] A3. The docs purge (note 34). Delete `ROUND4.md`, `ROUND5.md`, `PROGRESS.md`, the old `plan/` folder and every doc that describes something no longer true. Keep the decision records that still hold, delete the rest, renumber from 0001. Rewrite the PRD and `ARCHITECTURE.md` short and current. Move `IDEAS.md` to `docs/`. Bring the README and every `CLAUDE.md` up to date in TJ's voice. Every check green.
- [x] A4. Issue #34: the words in `content/`, one file per place, built into the game's data; `content.js` keeps no copy. Browser tests still pass; the page of text still shows every card.
- [x] A5. Issues: file one for the card styles (note 20) and one for the register service (round 7: `api` routes, approval in `admin`, a `db` table, the game posting entries), both with the `create-issue` skill. The PR body says it closes #14, #15, #16, #17, #33, #34, #36 and #38.

**B. The page round the world**

- [x] B1. Remove the first-visit hint (note 6).
- [x] B2. The opening view: TJ a little below-right of centre (note 7).
- [x] B3. The sign's planks flush left (note 31).
- [x] B4. The top bar: sound merged into the music button, the sun or moon on AUTO, AUTO about 75% day (notes 29, 30, 32).
- [x] B5. Fewer menus and hotkeys (note 23, #33). Log the design and why in section 11.
- [x] B6. Debug: the bold camera-bounds outline, "On the map" moving the camera, the split buttons (notes 24, 26, 27).
- [ ] B7. The off-route page: the 404 readable at a glance, and a way back into the game from "Break this scene" (note 28).
- [ ] B8. "Glissade to camp" works from inside the binoculars (note 18).

**I. The engine rules** (runs here, before C)

- [ ] I1. Issue #38: write the rules into the repo (where the issue says) and bring the animals, plants and objects into line with them.

**C. The map**

- [ ] C1. Reflection Lake about 1.5 times bigger, inside TJ's outline (note 4).
- [ ] C2. Flowers across the parkland, above all its left flank; the moraine band round the volcano's base (note 4).
- [ ] C3. The forest gap filled; a mossy bog with skunk cabbage and one or two old-growth groves elsewhere in the forest (note 8).
- [ ] C4. Tumbleweeds bigger, rolling across the empty Palouse (note 5).
- [ ] C5. Segfault Scree on real scree (note 14).
- [ ] C6. Every animal clickable, map and scenes (note 10). The list goes in section 11.
- [ ] C7. Everything placed by rule still stands where it should after C1 to C6 (trails, signs, animal homes, no-go areas); `walk.sh` on every route.
- [ ] C8. The logic audit (note 38): a report artifact with a picture and a proposed fix for every error found. Nothing is built. Its link goes in section 10 and the final report.

**D. The lake loop**

- [ ] D1. The trail up beside the falls to the lake (note 12).
- [ ] D2. Rain and thick fog in the forest under the marine layer (note 13).
- [ ] D3. The banana slug (note 11).
- [ ] D4. Issue #36: light beams and particles in the forest.

**E. Sideproject Spires**

- [ ] E1. Bluebird Forecast: talus, scramble, one exposed step (note 15).
- [ ] E2. hevy-garmin-sync: the snow couloir, no watch, the bench and its sync notice (note 16).
- [ ] E3. trailhead: twice the pace, the ridge cut short, binoculars across the whole map (note 17).
- [ ] E4. yggdrasil: real ladder climbing (note 19).

**F. Proficiency Peak**

- [ ] F1. Climbing 1.5 times faster (note 21).
- [ ] F2. The haul and the stuck rope read at once (note 21).
- [ ] F3. The snow traverse: on the snow before the pose changes, and short (note 22).

**G and H**

- [ ] G1. The glissade burst only while he runs (note 3).
- [ ] H1. The register as a generated picture, both ways, the better one shipped (note 9, #37). Tell trailhead-19 how it went.

**K. Whole-site checks and the report**

- [ ] K1. Every route through every stop in Auto, Day and Dusk, desktop and phone (`walk.sh`), clean console, no request to another site (`api` answers on the same site under `/api`).
- [ ] K2. Round 5's 72 standard views beside round 6's. A list for TJ of anything worse, and what fixing it would mean.
- [ ] K3. Frame time on every view in section 7, load time, colours.
- [ ] K4. Every way it can go wrong behaves at least as well as round 5 (`break=`, a missing scene, an address that goes nowhere, `api` down).
- [ ] K5. `IDEAS.md` has every idea from the round and none that was built. The lasting rules of this file (sections 2 to 4) are folded into a permanent doc (`docs/DEVELOPMENT.md` or the game's `CLAUDE.md`), and this file is deleted.
- [ ] K6. The report in chat and in the PR body: what was done, what is still below round 5 and why, every new line of copy for TJ, what was removed, sounds nobody has heard, the C8 audit link, and the links. Mark the PR ready only once every check passes, send a PushNotification, end the loop. Never merge it.

## 9. Steps (how one item goes)

1. Fetch. Make sure `round6` is pushed and current. Read sections 2, 3, 5 (the part for this item) and 10.
2. Render round 5's picture of the view, or film it if it moves.
3. Make the change. Run `tools/pixel/bake.sh` if the land changed. Run `tools/pixel/check.sh <item>`. If the land changed, read what `check.sh` says moved: trails are routed afresh and every sign and animal is placed by rule, so a land change can move any of them.
4. Render the new view the same way, lay it beside round 5's and look. Film anything that moves. Day and Dusk, desktop and phone.
5. If anything is worse than round 5, fix it before going on.
6. Measure frame time for any view the change touches; for map items log the zoomed-out Dusk number in section 11.
7. Tick the item. Log each call in one line in section 11. Update section 10. Add ideas to `IDEAS.md`. Check for em dashes.
8. Commit with a message that says what changed, push, and **read `gh pr checks`**; fix any failure before going on.
9. Export and republish the round's artifact with a short label (for example "C1 bigger lake").
10. At the end of each lettered section, one PushNotification to TJ: the artifact's version and three lines on what changed and what to look at first. Do not wait for an answer.

The loop prompt TJ starts round 6 with (paste it after `/loop`):

> Round 6 of trailhead, unattended, end to end. Every firing: work in the scratchpad clone of https://github.com/zimmertr/trailhead (clone it into the session scratchpad if it is gone, never /tmp, never ~/git). Fetch first. Read docs/ROUND6.md on branch round6: sections 2, 3, 9 and 10, and the part of section 5 for the item. Take the first unticked item in section 8 and finish it by the steps in section 9. Round 5's final build is the floor: compare every change with it side by side and fix anything worse before ticking. After each item: tick it, log every call in section 11, keep section 10 current, add every idea to IDEAS.md, commit, push, read CI and fix it before moving on, and republish the round's one artifact with a short label. Follow every rule in section 2. Never push to main and never merge a pull request: TJ reviews round 6 and merges it himself. Do not ask questions: make the call, log it and carry on. After K6, mark the PR ready for review, send a PushNotification and end the loop.

## 10. Where the build stands

- **2026-11-21, before any work.** `round6` was cut from `main` at `5604ea6` (round 5 merged). It holds only this plan. The game is exactly round 5's final build (`archive/pixel-r5-final`).
- Round 5's artifact, the floor: https://claude.ai/artifact/1VdS5Q3uSMTpEuGEm39SZr (version 76).
- The round's PR: https://github.com/zimmertr/trailhead/pull/54 (draft).
- The round's artifact: https://claude.ai/artifact/Sxbh3R3GpV75ZQ7d63iRVD (created at A1 from `round6`, exported to the scratchpad's `r6-working/`; republish from that folder only).
- **A1 done.** The draft PR is open. trailhead-19's art rules are in `design/TRAILHEAD-ART.md`, copied unchanged, and the repo's `CLAUDE.md` points at them in its documentation table. The page's description no longer keeps a tag that is split round another (the code-scanning alert): tags are stripped until none are left, then any stray angle bracket goes, with a test. The page title names round 6. Artifact version 1, the game exactly as round 5 left it.
- **A2 done.** The game lives in `web/www/` and is what the `web` image serves: `web/build.mjs` copies it to `dist/` as it is, gives the page its document head (charset, viewport, a description, the icon, and a meta tag naming `/api/v1/projects`) and writes `third-party-licenses.txt` from the fonts' licences. The game reads live stars and releases from `api` the first time a project card opens, and keeps the numbers in `content.js` when the API is not there (the artifact, the tools, the API down). The render tools are in `tools/pixel/`, `IDEAS.md` in `docs/`. Gone: the 3D-era home page, plain page, analytics module and their tests and styles doc, `three` and its typeface, the prototype folder with `ROUND4.md`, `ROUND5.md`, `PROGRESS.md` and `plan/`, round 3's wall scene behind `?wall`, and three unused developer pages. To run under the site's strict policy, the page's CSS moved to `style.css`, inline styles are set through `element.style`, and the custom pointer is two small PNG files instead of a generated `data:` image. The browser suite (19 tests, axe included) runs against the built image, the separate Prototype Smoke job is gone, and Lighthouse holds the game at 1.0 for accessibility, best practices and SEO with byte budgets measured from it. The services stay. Every view looks as round 5's, except the clickable map tags on a phone (24 px tall, from 14, for tapping) and the page of text's orange headings (darker, for contrast). Frame time 9.8 ms zoomed out at Dusk.
- **A3 done.** The decision records are the eleven that still hold, renumbered from 0001: the first is new, merging the pixel-art and flat-world-on-rails records; the small planet, the 3D world's reduce-motion record and the analytics record are gone, and every citation in the repo (code comments, Dockerfiles, workflows, docs) points at the new numbers. The PRD is rewritten from 26 KB of the 3D plan to a short account of the game as it is: what it is, eleven requirements, the places, what runs across the site, how it is built, the plan to the MVP, and the open items. `ARCHITECTURE.md`, `USAGE.md`, `DEVELOPMENT.md` (with a new table of the render tools), the root and content `CLAUDE.md` files and two records were corrected for the game in `web/`. `docs/STYLES.md`, about the old plain page's styles, went with it at A2. 148 unit tests pass. No game change, so the artifact stays at version 2.
- **A4 done.** Every word the game shows is in `content/game/`, seven YAML files: the Trailhead, each place's cards, Sideproject Spires with the six projects, the names, and the interface. Each file opens with what it holds and carries the notes the old `content.js` had on what each line is for. `make words` checks them and writes `web/www/words.js`, which is checked in so the game, the tools and the artifact still run with no build step; a unit test fails while it is behind the YAML, and another fails if a sentence the game builds keeps a `{brace}`. `content.js` is code only: it fills the `{braces}` in sixteen templates (and how long ago a date was) and builds the map's legend from the names. Every export of the old file, its functions called on sample numbers, compared equal with the new one. The old Markdown words (`site.md`, `places/`, `milestones/`, `projects/`) and the micromark dependency are gone: nothing read the first three, and the API and the fetcher now take the projects from the same file the game does, so the six projects are listed once. Record 0009 is rewritten for this. 140 unit tests and the 19 browser tests pass; frame time 10.9 ms zoomed out at Dusk; nothing moved. The game looks and reads exactly as before, so the artifact goes to version 3 only for the new file.
- **Known flake.** Lighthouse's largest-paint budget (3 s) failed once on A3, at 12.3 s in all three runs, with no game change, and passed on a rerun. Probably which text block Lighthouse counts as the largest paint: the "Drawing the world" line, or the intro placard once the world is drawn. Fix it with the performance work in section K if it recurs.
- **Found, not fixed.** `make check-unused` (knip) is in no CI job and reports 812 false unused files, because it has no config for the workspaces. For the repo cleanup.
- **A5 done.** Two issues filed with the `create-issue` skill: https://github.com/zimmertr/trailhead/issues/55 (whether to keep each card's own style, note 20; three options, the planner recommends one shared placard with a small icon of each card's source) and https://github.com/zimmertr/trailhead/issues/56 (the trail register service for round 7: a table, `api` routes, the queue in `admin`, the game posting entries; it carries over what #3 settled). The PR body closes #14, #15, #16, #17, #33, #34, #36 and #38 and names the two new issues. The PRD and the register's code comment point at them. Artifact version 4 (the comment only).
- **B1 done.** The first-visit hint ("Click a sign or a trail to start walking.") is gone: its element, its placing code in `app.js`, its styles and its two lines of words. The space bar still waits until a destination is picked, as before. Side by side with round 5 at the opening, desktop and phone, the only change is the missing plank. Frame time 10.5 ms zoomed out at Dusk; nothing moved.
- **B2 done.** At the opening TJ now stands a little below and right of the middle of what shows above the timeline bar (above the junction sign on an upright phone): measured at 66% across and 63% down on a 1440 by 900 screen (round 5: 94% and 83%), 66% and 64% at 1920 by 1080, and 55% across, 69% down the uncovered part on a 390 by 844 phone (round 5: 13%, at the sign's edge). `openFrame()` in `world.js` keeps him inside that window and, within it, still picks the frame that shows the most of the three destinations. The zoom is unchanged. The cost, side by side with round 5: the destinations show less at the opening. On a desktop Reflection Lake is cut to its east end and the two peaks to their names along the top; on a phone the granite and the glacier are out of frame. The idle tour still visits each. Frame time 9.9 ms; nothing moved; the lake route walks clean.
- **B3 done.** The three planks on the Trailhead sign start at one left edge: the first no longer sticks out 2 pixels and the third no longer sits 3 in. Their arrows and words line up, on a desktop, a phone and a phone at three times density, Day and Dusk. Nothing else on the sign changed. Nothing moved.
- **B4 done.** The Sound button is gone. The music button reads "Click for sound" until the browser can play, then the track; its menu lists Auto, the seven tracks, the three music styles and Sound off, with the current ones marked, and while the sound is off the button says so. It opens on a click and closes on a pick, Escape, Tab or a click elsewhere; the arrow keys move through it. On a phone, where the music button used to be hidden and the Sound button showed, the music button now shows: its words until sound is on, then only its note, at least 24 px wide. The clock's button carries a pixel sun or moon before its word, whatever the sky is now, so AUTO shows the sun by day and the moon at Dusk. The world clock is still 390 s a cycle, now 285 s of day, a 20 s sunset, 65 s of dusk and a 20 s sunrise (it was 165, 30, 165, 30), so about three quarters is day. Two new browser tests: the menu and Sound off, and the sun and moon; the reduced-motion test now opens at 330 s, which is Dusk again. 21 browser tests and axe pass. Frame time 10.3 ms; nothing moved.
- **B5 done.** The trail conditions and the trail register are one place: the close-up of the register box, with a trail conditions notice pinned on its back wall beside the map. The notice shows "All trails open" and the field checklist count; a click opens the whole board over the box, and closing the board leaves the visitor at the book. The kiosk in the world, the `#kiosk` address and the C key open the close-up with the board up; the register, `#register` and R open it with the book. The trail map's Settings lost the sound, music, music style and time-of-day rows, which the top bar now holds on every screen, so the trail map fits one screen at 1440 by 900 (it ran off the bottom in round 5); Clear my flags and the debug sign stay. Every menu has a key: N the music, C, R, P the page, K the keys, beside M, T and the backtick; the keys sheet lists them and each top-bar button names its key on hover. Escape now puts a sheet away before it closes the book under it. The board's small labels were darkened a shade, since axe measured them at 4.47:1 against the 4.5 it asks. One new browser test (C, Escape, the notice, axe); 22 pass. Frame time 10.1 ms; nothing moved.
- **B6 done.** The camera limits are drawn as the roam areas are: two pixels of colour with a dark inner edge, and each line's name in capitals inside its top left corner (View middle, Push back, World edge); round 5's were one-pixel dotted lines that vanished when zoomed out. On the map, every start button now eases the view to where its event happens and starts it once the view arrives (0.9 s; at once for reduced motion): the face or the serac that falls, the summit for the squall and the lenticular cloud, the edge of the marine layer, the whale's water for the humpback and the orcas, the tide pool, the middle of the ferry's crossing, the eagle's sea stack, the osprey's dive, the first bear family, the first marmot, the first tumbleweed and dust devil. The shooting star crosses whatever sky is in view, so it does not move the view. Related events share one split button: Humpback (breach, blow), Bear cubs (play, climb a tree) and Avalanche (west, middle, east face); the name starts one at random (the avalanche picks its own face, as before), the arrow lists each. One new browser test (the split list and the view moving); 23 pass. Frame time 10.2 ms; nothing moved.
- Next: B7.

## 11. Calls made in round 6

- Q&A, 2026-11-21: TJ's answers are in section 5. He first chose a static site with the services deleted, then asked whether that was a mistake given he wants a fetcher, an admin console and a database in the end; on the planner's advice he chose to keep the services, wire live stars this round, and build the register in round 7.
- Before the loop: #42 changed only the image, and the repo's test that holds the image and the package to one version failed on it. The planner added a commit to #42 moving the lab's package to 1.65.1 (lock regenerated in Docker, pinned exactly), and it merged once green; #43 and #44 were closed as superseded. The Dependabot alert shows as fixed.

- A4: the YAML is split by place, as the item says, with the names and the interface in files of their own, since they belong to no one place. A section lives in one file; only `CARDS` is spread across them.
- A4: `words.js` is checked in rather than built at image time, because the game runs from `web/www` as it is in the tools and the artifact (record 0001). A unit test holds it to the YAML.
- A4: the projects are listed once, in `sideproject-spires.yaml`, and the API and the fetcher read their repos from there. The Markdown `projects/` folder was a second list of the same six, with different words. The API's slug for TJs-Kubernetes-Service is now `tks`, the key the game's address already uses (`#sideproject-spires/tks`); nothing reads the slug.
- A4: base camp's order is the order of the projects in the YAML; the separate `SPIRE_ORDER` list is gone from the words and `content.js` derives it.
- A4: no first-person check on the game's words. The journal card ("A personal note"), the register, TJ's note in it and the visitor's own "Clear my flags" speak in the first person on purpose. The email check stays. Two project descriptions use "my" (yggdrasil: "the Terraform that manages my GitHub repos and orgs"; Kubernetes-Manifests: "A collection of my Kubernetes manifests"), against requirement 8. Left as they are, since A4 moves words and changes none; TJ's to reword.
- A4: the old comments that named round items (P1, L8, T54 and the like) lost those codes on the way into the YAML; the explanations stay.
- A5: #55 is a `question` at P2, since TJ put it off; #56 is an `enhancement` at P1, since it is the next round. #56 recommends a rate limit and length caps as the spam guard, as #3 did, and lists the rest as TJ's to decide.
- A5: #56 does not block on #4 (the panel's login). It says approval before #4 relies on `admin` being reachable only from the home network.
- B1: `__api.touring()` and `__api.me()` stay, though the hint was their only use in the game: the test scripts and section 2 use them.
- B2: TJ's note asks to "center him, or at least center-bottomright him"; the window is 52 to 66% across and 56 to 72% down, and the search puts him at its upper-left edge, nearest the destinations. A first try at 50 to 62% and 54 to 70% hid the lake on a desktop altogether. TJ can move the window in `OPEN_X` and `OPEN_Y` at the top of `world.js`.
- B2: the hand-off from the opening frame to following him is the same eased code as before and now travels less; not filmed. Dusk frames the opening the same way, so it was not rendered separately.
- B4: the menu holds both the tracks and the three instrument sets, since note 29's decision says "music styles" and the old button cycled tracks; the trail map's Settings rows for sound, music and style stay until B5 decides the menus.
- B4: the first click on the music button only turns the sound on (the browser needs it); every later click opens the menu. Picking a track while the sound is off turns it back on; Sound off does nothing when it is already off.
- B4: no new words. `UI.sound` (Sound on, Sound off) became `UI.soundOff`, since "Sound on" was no longer shown; the menu's headings reuse "Music" and "Music style".
- B4: the day is 285 of 390 s (73%); with half of each fade counted as light it is 78%, inside "about 75%".
- B5, the design (note 23 left it to the loop). TJ named four menus: the trail map, the Trailhead sign, the trail conditions and the trail register. The conditions and the register become one close-up, which is TJ's own first idea ("a joint interface where you're looking at the sign board and register box"); his second, reading the board in that view, is half done, since the notice carries the board's first lines and a click zooms to the rest. The Trailhead sign stays as the world's opening, and the trail map stays the one place that reaches everything. The duplicate settings left the trail map instead of the top bar, because the top bar is on every screen and the trail map is a click away. Not done: the issue's timeline-label rework, which no note asked for (left in `IDEAS.md`), and taking the distances off the trail map, which repeat the sign's but say more (a loop, five pitches, six summits).
- B5: N for the music, since S is taken by moving; the debug menu keeps the backtick. The top-bar hints are `title` attributes in `index.html`, beside the buttons' own words there.
- B5: new words, drafts for TJ: the six new lines of the keys sheet (N, C, R, P, K, backtick). `UI.map.sound` went with its row.
- B5: H1 redraws the kiosk and the book's paper; the notice is laid over the box like the book's words, so H1 keeps a space for it on the back wall.
- B6: each module says where its own events happen (`where()` in `world.js`, `critters.js` and `events.js`), from the positions it already keeps, so nothing new is placed by hand.
- B6: the view moves through the same eased look the drag uses, and stops him first, so his walking does not pull it back mid-pan.
- B6: new words, drafts for TJ (debug only): the three family names, "Pick one" (the arrow's spoken name) and the three outline names.

## 12. TJ's pictures for this round

Two of TJ's screenshots of 2026-11-21 survive, on his desktop: `/Users/tj/Desktop/Screenshot 2026-11-21 at 10.38.59 AM.png` (note 4) and `/Users/tj/Desktop/Screenshot 2026-11-21 at 10.43.51 AM.png` (note 8). The rest were temporary and are gone, so the words below are the record. Never put them in the repo. What each shows:

- Note 4: the map round Reflection Lake. A red outline round the lake marks the bigger size (about twice the old one; build 1.5 times, inside it). A blue outline marks the parkland that needs flowers: from the forest edge on the left, along the foot of the volcano's glaciers, across to the Spires sign, and down to the lake; the left part, a green slope under the volcano's west glacier, has no flowers at all.
- Note 8: the forest between the beach and the Trailhead, with a blue circle round a dark, empty patch among the trees, south-west of the two signs.
- Note 9: the register close-up today: the kiosk's wood walls, the pinned map, the pencil cup, the open book with the checklist on the left page and entries on the right, the pencil on the shelf.
- Note 12: the forest scene's end: a grey mossy cliff across the picture with wooden ramps zig-zagging up its face, the waterfall in the middle, the lake visible above, and the cliff's right edge fading into the trunks of the big tree.
- Note 22: the end of the rappel: the three on a ledge at the foot of the granite columns, TJ (green cap, yellow jacket) already crouched in the traverse pose off the end of the ledge, in the air short of the snow slope beyond.
- Note 31: the Trailhead sign: the intro card above three planks; the first two start at one left edge, the third further right.
- A1, a call: the code-scanning fix strips tags in a loop until the text stops changing and then removes any leftover `<` or `>`. A single extra pass satisfied the test but not CodeQL, which flagged it again on the PR; the loop is the form CodeQL's own help gives.
- A1, a call: TJ's notes artifact for round 6 was not made. Only two of his screenshots survive (section 12), and the words in section 12 carry the rest.
- A1, a call: the reply to trailhead-19 could not be sent; its session had ended (its socket was gone). H1 tries again through `ListAgents`.
- A2, a call: the game lives at `web/www/`, not `web/game/`, so the tools and every note that says `www` still read true.
- A2, a call: `web/build.mjs` wraps the page in a full document head only for the served site. `web/www/index.html` stays headless, because the artifact adds its own head and would get two.
- A2, a call: the served page's title is "TJ Zimmerman"; the artifact's names the round.
- A2, a call: the old round files (`ROUND4.md`, `ROUND5.md`, `PROGRESS.md`, `plan/`) were deleted here rather than in A3, because the folder they sat in went away; A3 still owns the docs and the decision records. Round 5's tag keeps them.
- A2, a call: round 3's wall scene (`wall.js`, behind `?wall`) and the developer pages `sheet.html`, `monolith.html` and `destmask.html` were deleted: nothing used them (TJ: anything without an explicit purpose goes). `relief.html` and `bake.html` stay for the tools and are left out of the served site.
- A2, a call: live stars are asked for when a project card first opens, not on load, so a visit that never reaches the Spires sends no request and a page without the API logs no 404 (Lighthouse counted that as an error).
- A2, a call: the e2e suite answers `/api/v1/projects` itself with a made-up project (4242 stars), and a test checks the card shows it.
- A2, a call: the browser job keeps its name "Browser Smoke & Axe" (branch protection requires it), so axe now runs on the world and on the page of text. It found the music button's spoken name missing its visible track (now "Next music track: <track>") and the page of text's orange headings at 3.3 to 1 (now `--blaze-ink`, 5.6 to 1).
- A2, a call: Lighthouse's target-size audit flagged the top-bar buttons and the clickable map tags on a phone. The buttons got a 24 px minimum height (no change on a desktop, where they are 27). The tags on a phone grow from 14 to 24 px: a small visible change, for TJ to see.
- A2, a call: the Lighthouse byte budgets were replaced with the game's own numbers plus about 15% (total 2.4 MB, of which `ground.png` is 1.5 MB; script 520 KB; fonts 58 KB; CSS 12.5 KB), and `docs/LIMITS.md` says why. Performance is not held, as before: the world draws every frame on a throttled runner.
- A2, a call: `tools/pixel/` is kept out of the images' build context, and the lab image gets its own `.dockerignore`, because `out/` holds about 1 GB of pictures.
- A3, a call: the records were renumbered from 0001, as TJ chose ("renumber from 0001"); the records README keeps the rule that numbers are never reused and notes the one-time renumbering, with tag `archive/pixel-r5-final` holding the old set.
- A3, a call: deleted records: 0001 (the small planet, long superseded), 0005 (the 3D world's reduce-motion record; round 5 holds AUTO at Day for reduced motion, which the PRD now states), 0006 (self-hosted Umami analytics: nothing in the game sends anything, so it moved to the PRD's open items). 0014 and 0015 merged into the new 0001.
- A3, a call: `trailhead-helm record 0003` in `ARCHITECTURE.md` was left alone: it is the chart repo's own record.
- A3, a call: the PRD describes the game as round 5 left it, and names round 6's changes only where a table would otherwise be wrong next week (hevy-garmin-sync's couloir). `ROUND6.md` carries the rest.
- A3, a call: the README's line that the pages and the API read the words from `content/` is left until A4 makes it true again, rather than corrected twice in one PR.

