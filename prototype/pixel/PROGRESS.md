# Pixel MVP: overnight checklist

The working list for the overnight build of the pixel-art trailhead. Tick items as they land, add one line per creative call under "Calls made", and keep it a checklist. It exists so a long run survives a context summary, nothing more.

## The bar

- Version 5 of the vibe check (https://claude.ai/artifact/UgfBaAqoZCaJdKY8sBDUXF, branch `pixel-prototype`) is the quality bar. TJ: "I want the results from this overnight session to be as good, if not better yet, than this was."
- Never touch that artifact or that branch. Work on branch `pixel-mvp`; publish to a new artifact titled "Trailhead Pixel MVP".
- Before each publish, screenshot the same views as version 5 (Trailhead at 1440x900 and 390x844, each lake stop, Dusk) and compare. If anything got worse, roll it back first.
- Keep the setup: one indexed-colour renderer, all art drawn in code, no build step, no TypeScript port, nothing outside `prototype/`. Each new scene in its own file. Libraries only if they clearly help.
- Depth before breadth: finish each scene to the bar before starting the next.
- Commit and push after every item. Publish when something visible lands, with a short label.
- No docs, issues or PRs. No subagents unless the job is tightly scoped and dull, and review what comes back.
- Work silently; the morning report is the only message.

## Decided with TJ (2026-11-14)

- Views: world map stays top-down. The forest and the climbs are side view at the same pixel size as the world map (wide scenes, small character; if it looks blocky like Minecraft, change that scene's view). Base camp is an isometric diorama of the massif to pick a peak from. TJ yields art calls to Claude: "keep channeling that energy".
- Getting in and out: he walks to the edge of a destination on the map, a classic SNES transition plays, the scene loads; the way home lands him back on the map. Snappy and seamless.
- Character: the PRD look (short brown hair, short beard, sunglasses) and kits per place. The running vest is a Salomon ADV Skin 12, not salmon-coloured.
- Cats: Doot Doot (long-hair tortie) and Peevers (long-hair Nebelung). Many animations and events, interactive when clicked, never one loop.
- Animals: elk, banana slug (he hops it), bear watching from the trees, marmot above the lake, Steller's jay and other birds, pika in the talus, birds on the wall, mountain goats on the Spires, gray jay at the snack break.
- Register: browser-only mock. Unlocks after all three routes, sample entries, a submission says it waits for TJ's approval.
- Sound: chiptune effects and ambience made in the browser, on after the first click, with a mute button.
- Copy: draft the personal note in TJ's voice (his voice rules are in `~/.claude/CLAUDE.md` rule 30 and the ai-config repo) and the three skill cards from the Resume repo, read-only. Mark drafts as drafts. No alcohol references.
- Project cards: tonight's real GitHub numbers written in. Addresses as `#name` links. Trail map, plain page, 404 off-route page, console message, kiosk board all in. About ten joke names on small signs. The Konami code and free camera are cut.
- Everything else in `docs/PRD.md` sections 3 and 4 on main is in scope, read it for the full lists (milestones, pitches and their moments, the six spires with routes and summit eggs, things to find).

## Checklist

### World map
- [x] Spires become a jagged glaciated massif like the peak behind the lake: six named sub-peaks, glacier ice rather than snow.
- [x] Fix visual bugs, starting with the hard line between the forest band and the meadow above About Lake. Blend terrain edges.
- [x] A little more tree and plant variety and palette range, without going overboard.
- [x] Entry points and transitions into each scene and back.
- [x] Flags on finished destinations and footprints on finished trails.

### About Lake (forest scene)
- [x] Lush rainforest run: huge mossy trunks, roots, ferns, light, a stream, layered depth.
- [x] Three milestones with cards (who, in the mountains, personal note), the lake under its peak, the way home.
- [x] Elk, banana slug hop, bear, marmot, Steller's jay. Cold plunge, snack break, Sasquatch once per visit.

### The Stack
- [x] Face-on climb: crack, face, roof; ledges with cards; the gear left behind, the lead fall and catch, the glowing holds; summit flag with resume and LinkedIn; rappel home.
- [x] Birds on the wall, pika in the talus.

### Sideproject Spires
- [x] Base camp diorama: pick one of six peaks, each named; flags on finished ones; goats.
- [x] Six routes with their events (knife-edge ridge, icefall, ice pitch with two tools, snow bridge and crevasse jump, bergschrund ladder, wands in a whiteout), each ending in a glissade to camp.
- [x] Six summit eggs, played on click and replayable.
- [x] Project cards with stars, release, language, licence.

### Across the site
- [x] Doot Doot and Peevers: varied play and click interactions.
- [x] Trail map menu, `#name` addresses, plain page, 404 off-route, console message, kiosk board, joke-name signs.
- [x] Register mock, unlocked after all three routes.
- [x] Sound with mute.
- [x] Dusk in every scene, with the Dusk-only sky. Phone layout in every scene.
- [x] Copy drafts: personal note, skill cards.

## Gotchas from building version 5

- Docker Desktop may need starting (`open -a Docker`). `shot.sh` builds its image on first use. Renders take a few seconds each; the 2D canvas has none of the 3D prototype's timeouts.
- `shot.sh` queries: `stop=N`, `route=stack|spires`, `p=0.4`, `dusk=1`; steps like `click=[data-route=lake];wait=600;key=Space;wait=2600`; a seventh argument `me` crops round the runner.
- The artifact wrapper adds its own doctype, head and body, so `index.html` has none, and it needs `[hidden] { display: none !important; }` because the panels set `display`. Publish with `files: { "pixel.js": ... }` (plus any new scene files).
- Auto mode once blocked a `git push` and allowed the retry. If pushes stay blocked, keep committing locally and say so in the morning report.
- What made version 5 work: one scene at a time, an early publish, then many small passes judged from screenshots. Stay in that loop.

## Traps the 3D prototype fell into

Each of these slowed or spoiled the low-poly prototype. Check the list before every new scene.

- **Plumbing before design.** No port, no repo docs, no services, no Helm, no PRD edits tonight. Only `prototype/` and this file change.
- **Paperwork per change.** One line under "Calls made" is the whole record of a decision.
- **Progress counted in tasks.** An item is done when its screenshot looks right next to version 5, not when its code exists.
- **Big bets without weighing them.** The planet constrained every mountain to serve one easter egg. Before any choice that boxes in the art (a projection, a fixed scale, a shared engine change), write down its cost in one line and prefer the choice you can undo.
- **Rebuilding what worked.** When something already looks good, extend it; never redraw it from scratch. TJ: "it looked way better before."
- **Shrinking to fit.** Keep the same pixel size in every scene. Make the scene bigger, never the art smaller.
- **Scale against pacing.** Milestones stay about 4 seconds apart. Shorten a long climb with cuts between moves (fade, a new pitch, the camera jumping up), never by sliding him along at high speed.
- **One giant file.** Each scene gets its own file. The shared renderer changes only when every scene needs it.
- **Judging motion blind.** Check movement with timed sequences of screenshots (several frames a fraction of a second apart), not a single still.
- **The camera fighting the scenery.** Place scenery so he can never be hidden (keep tall things out of the band in front of his path), rather than fixing each overlap one at a time.
- **Visible edges.** No scene may show its own edge, an empty band or bare ground where the art stops.
- **Misreading the layout.** Reread TJ's words for a place before drawing it; left to right on the world map is forest and About Lake, The Stack, Sideproject Spires.
- **Landmarks that read wrong.** Check each landmark from the world map and up close. The Stack must read as a granite wall, the Spires as one jagged glaciated mountain, the forest as lush and varied.
- **Panels over the action.** Cards and menus never cover him or the thing a milestone is about, at 1440x900 and at 390x844.
- **No cheap sketch first.** Try a new scene idea small (one screen, rough) before building it out.
- **Ignoring the load budget.** Keep the page light: no huge data, art drawn at load. Put the total size and load time in the morning report.
- **A character that slides.** Feet plant, hands reach holds, tools swing. If a move can't look right yet, cut away from it rather than show it wrong.
- **Brittle edits.** After any scripted edit, confirm it applied (grep or a screenshot) before building on it.
- **Long chat output.** Keep replies to a line or two; anything longer belongs in this file.

## Calls made

(one line each)

- The renderer is split into `core.js` (palette, bitmaps, screen), `world.js`, `sprites.js`, `tj.js` and a small scene manager in `pixel.js`, so each scene is its own file. Cost: one mechanical move, checked against version 5 screenshots.
- A route is a list of legs (one scene each), weighted by time; a round window closes on him and opens on the next scene. Scrubbing across a scene change uses a faster cut.
- Massif: six pyramids of fanned ridges like the lake peak, rock buttress under each summit, glacier ice in the cirques between, pouring out of the middle onto the ground glacier through a ragged edge.
- Kits follow the PRD: yellow sun hoody, black tights, dark blue Salomon vest with white flasks; orange cap kept because it reads best against the green.
- Variety kept small: huckleberry, heather, green shrubs, silver snags; one new ice ramp. No new tree species.
- The lake loop's distance on the sign is fixed at 5.2 km, as in version 5, now that the run happens inside scenes.
- About Lake is two side-view scenes: the rainforest (he runs right to left, the way he left the map) and the lakeside under the peak (left to right, the way the trail rounds the lake). The switchback between them is a scene cut.
- Forest depth comes from three layers that scroll at different speeds, giant trunks as separate sprites sorted with him, and a stream in front that mirrors what stands behind it. Nothing tall stands in front of the trail, so he is never hidden.
- The lake peak is the map's snowy pyramid painted large, not a new mountain. On a short screen its foot sinks behind the far shore so the summit stays in view.
- On an upright phone the trail line rides at 62% of the height while he runs and 50% while a card is open.
- Cold plunge: click the lake while he is standing at it. Snack break: 60 seconds standing still in either lake scene, and a gray jay turns up.
- Sasquatch crosses the far trees during the second half of the forest run, once per page load.
- The Stack is one face-on scene of 20 seconds: a crack, a face with the lead fall and the catch, a roof with glowing holds, a ledge and a card after each, the summit flag, then the rappel. His four limbs take turns on holds; gear and the rope stay behind him.
- Base camp is an isometric slab cut out of the massif, floating over a sea of cloud, with the six summits in a ring so each one can be clicked. Each summit also has a wooden name tag and a plank in the card.
- Each climb is its own side-view scene of about 9 seconds with one event from the PRD, then a push-off and a glissade on a shared slope back to camp. The summit object is the egg: click it while the card is open.
- Menus are trail furniture, not game windows: routed wooden planks for anything you press and paper placards for anything you read. A card's paper depends on what it comes out of (trail sign, pocket map, ruled journal, watch face, guidebook with a route line).
- Type: Jersey 15 for titles, Jersey 10 for reading, Tiny5 for small print, Silkscreen for anything routed into wood, each at a whole multiple of its pixel grid. Pixelify Sans was dropped because its 5 read as S and its Z as 2.
- The timeline along the bottom is the route's elevation profile with a flag at each milestone. The map's north counts as uphill, and the scenes between two stretches of map are tilted to meet them.
- Copy: only the first card's sentence and the intro are TJ's words. The personal note and the three skill cards are drafts from the Resume repo and are marked "Draft copy for TJ to rewrite" on the card.
- Project numbers (stars, latest release and its date, language, licence) were read from GitHub on 2026-11-14 and are written into `content.js`. Release age is worked out in the browser.
- The register is a mock: four sample entries, and a new one is kept in this browser only and shown as waiting for approval. It unlocks when the lake, the Stack and one summit are done.
- An address with no trail behind it (any unknown `#name`) opens a whiteout with one wand and a sign pointing back.
- The trail map sheet holds the map with a dot per milestone, TJ's links, the plain page, the kiosk, the register and the settings. Esc or M opens it.
- Cats: each has a dozen poses (sit, blink, look, meow, groom, bat, loaf, sleep, walk, run, crouch, pounce, roll, stretch) and picks what to do next at random with her own odds: wander, visit the other, stalk and pounce on a butterfly, chase, nap, and Doot Doot jumps onto the kiosk roof. One trots over and rubs his legs when he gets home.
- Clicking a cat: Doot Doot meows back, and a second click gets a roll and a purr. Peevers chirps and darts off the first time, then comes round. A sleeping cat wakes and stretches. Hovering shows her name.
- On an upright phone the junction sign covers the lower half, so the home view sits lower (past the map's bottom edge, which is filled with mirrored meadow) and the cats keep to the meadow above the junction.
- Sound: a different music track each visit (never the one before), a tag in the top bar to step through the five tracks, and three instrument sets (Console, Handheld, Music box) that replay the same notes and effects through different voices.
- The trail map sheet has a text key under the map, so every milestone is reachable as a plain link as well as a dot.
- The Dusk-only sky is drawn over whatever sky a scene leaves showing: twinkling stars, a thin moon, a shooting star every so often and an aurora that comes and goes. It needs no work per scene.
- Day is always the starting light, whatever the device prefers; a visitor who switches to Dusk gets Dusk on the next visit (the PRD says both "always starts in Day" and "remembered").
- Things to find are tracked: the first time one is found a line says so, and the kiosk has a field checklist of all 16 with a hint for each one still missing. "Clear my flags" on the trail map clears it too.
- Scenery pass: the storm on the Bluebird route is banked cloud with driven snow, the wall has lichen and a few firs on ledges, cloud shadows drift over the map, a loon and her chick paddle on the lake, and the bracket fungus in the forest is drawn as shelves.
- `IDEAS.md` beside this file lists what could come next, grouped by what it would improve.

- Sasquatch had been drawn behind the forest's nearer layers since he was added, so nobody could have seen him. He now walks through the ferns behind the trail, a dark figure with light on his leading edge, in front of the far trees and behind every trunk.
- The climbs gained fair-weather cloud, boot prints behind him, a groove behind the glissade and spindrift off each summit.
- A phone held sideways gets narrower signs, so he stays in view beside them.

## Morning report (2026-11-14)

Every item on the checklist is ticked, and each polish pass in the brief has had one round. The page is live at https://claude.ai/artifact/76d6NraHh67ZTcMnMitrji and the source is on https://github.com/zimmertr/trailhead/tree/pixel-mvp under `prototype/pixel/`.

### What is done

- **The world map.** The Spires are one glaciated massif with six named summits. The seams between terrain are blended. Flags fly on finished destinations and his footprints stay on finished trails. Cloud shadows drift across the meadow.
- **About Lake.** Two side-view scenes: the rainforest and the lakeside under the peak. Three cards. Elk, bear, banana slug hop, Steller's jay, marmot, loons, a cold plunge, a snack break with a gray jay, and Sasquatch.
- **The Stack.** One face-on climb of three pitches: a crack, a face with the lead fall and the catch, a roof with glowing holds. A card on each ledge, the summit flag, the rappel. A pika and birds.
- **Sideproject Spires.** An isometric base camp where each summit can be clicked or picked from the sign. Six climbs, each with its own event and summit object, each ending in a glissade. Project cards carry the real GitHub numbers from 2026-11-14.
- **Doot Doot and Peevers.** A dozen poses each, their own behaviour, and different answers to a click.
- **The page.** Wooden signs and paper cards, a route profile along the bottom that scrubs, a trail map with every milestone as a dot and as a link, `#name` addresses, a plain page, an off-route page, a kiosk with a field checklist of 16 things to find, a register mock, keys, a console message.
- **Light and sound.** Dusk in every scene with stars, a moon, shooting stars and an aurora. Seven music tracks, a different one each visit, a tag to step through them, three instrument sets, effects for every event, a mute button.
- **Sizes.** Checked at 1440x900, 1280x720, 1920x1080, a tablet upright, a phone upright and a phone on its side.

### What is weak

- **The copy is mine, not TJ's.** Only the intro sentence is his. The personal note, the three skill cards, the summit card and the base camp line are drafts and say so on the card. The project cards use each repository's own description.
- **Nobody has listened to the sound.** Every note and effect was written in code and checked only for valid notes and for running without errors. Expect a few that are wrong or too loud. The PRD also says "no music", which tonight's brief overrode.
- **Tested in one browser.** Everything was checked in headless Chromium in Docker. The published page was opened once in Chrome and loaded correctly, but nothing was clicked there, to keep the house quiet. Safari and Firefox are untested.
- **The Bluebird route is not a knife-edge.** It is a snow slope in a storm that clears. A real ridge needs a different camera.
- **Base camp does not spin.** The PRD's orbit became a still isometric view, as agreed for pixel art.
- **The climbs are the sparest scenes.** They are better than they were, but the forest is still well ahead of them.
- **The cats were tested in forced states.** Their free-running behaviour was watched for seconds, not minutes. A cat could still walk somewhere odd.
- **Some things are made up.** The kiosk's version and uptime, the register's entries, and the heights in the route profile are stand-ins.
- **Addresses in the artifact frame.** The `#name` addresses and the back button work when the page is served normally. Inside the artifact's frame the browser may refuse them, and that was not tested.
- **It is still a prototype.** No TypeScript, no tests, no CI, no pull request, and the four fonts load from Google Fonts.

### Numbers

- 17 script files and one page, 316 KB in all, 99 KB compressed. No build step and no libraries.
- Ready in about 0.7 seconds in the test browser, and 60 frames a second in every scene.
- 16 commits on the branch tonight, before this report.

### Links

- The MVP: https://claude.ai/artifact/76d6NraHh67ZTcMnMitrji
- Version 5, the bar it was held to (untouched): https://claude.ai/artifact/UgfBaAqoZCaJdKY8sBDUXF
- The branch: https://github.com/zimmertr/trailhead/tree/pixel-mvp
- This file: https://github.com/zimmertr/trailhead/blob/pixel-mvp/prototype/pixel/PROGRESS.md
- Ideas for later: https://github.com/zimmertr/trailhead/blob/pixel-mvp/prototype/pixel/IDEAS.md
- Test addresses, added to the page's address: `?route=stack&stop=2`, `?route=spire:tks&stop=1`, `?dusk=1`, `?sheet=map`, `?done=lake,stack,spires`, `#plain`, `#anything-else` for the off-route page.
