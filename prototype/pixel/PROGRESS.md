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

## Feedback round (2026-11-14, after the overnight build)

TJ went through the MVP and the low-poly design is now scrapped: pixel is the direction. Still a prototype, still only `prototype/`. He wants large changes shown to him before they are built.

### Agreed

- **World map** grows on every side as scenery only: snowy ranges north-west, an icefield and one volcano north, a larch and granite basin north-east, ponderosa then sage then scablands east, an old burn south-east, open meadow with a river and animals south (no road), a salt-water coast south-west, misty forest far west. The block-in for his mark-up is `www/plan.js`, published at https://claude.ai/artifact/PWbdHU4ADXtaoAjc8sv2qq.
- **On the map:** an uneven lake with a small island, a forest loop that wanders deeper with mist the further in, the Stack trail turning talus grey, the Spires trail becoming a boot track in the snow, larches by the Spires, big-leaf maples in the run forest, joke signs standing on the terrain they name, clickable labels on the three destinations and the Trailhead.
- **New joke names:** Rollback Basin, Feature Flag Tarns, Hotfix Burn, Postmortem Burn, Cron Job Coulee, Tech Debt Badlands, Off By One Peak, Dependency Range, Stack Trace Thicket, Monorepo Woods, Cache Miss Cove, Latency Bay.
- **Base camp** becomes a camp on the edge of a huge ice sheet that fills the frame, not a diorama in the sky. Kayti (long brown hair, a name on hover, no text) goes there once it exists.
- **The Stack** gets two people at its foot, a man with short black hair and a woman with long red hair. One belays, picked at random, the other sits on a rock with a snack. Both ropes get an outline so they show.
- **About Lake:** the forest thins into the lake scene instead of cutting to it, and he strips to shorts for the cold plunge.
- **Camera and controls:** a drag stays where it is left, springs back near the limits and returns to him when he starts or stops; zoom in whole steps on the map only; a hidden debug panel with layer toggles and outlines.
- **Music** follows the place with cross-fades; a track picked by hand sticks until "Auto".

### Done so far

- [x] Block-in of the larger map published for mark-up.
- [x] Summit name tags at base camp no longer get a second label stuck on top of them (the hover label stayed up when the pointer moved onto a tag).
- [x] The cats roam mostly below the junction, left of the kiosk, and never under a panel; each click moves a cat to its next trick.
- [x] The marmot itself answers a tap (the lake's cold plunge was catching it), and a touch that misses tries the ground close around it in every scene.
- [x] The goat has a face, horns and cream wool that shows on snow.

### Go-live list (not prototype work)

- Check the `#name` URLs and the back button on the live site.
- Kiosk reads the running version and deploy time from a `status.json` written by CI, and the pod's start time from the container's start script.
- The debug panel exists only in preview and PR containers, never on main.
- A bad URL lands on the off-route page, and so does a caught error; if the renderer itself is broken, fall back to the plain page.

## Round 2 (branch `pixel-round2`, from 2026-11-14)

Round 2 lives on its own branch and its own artifact so TJ can compare it with the overnight MVP side by side.

- Round 2 artifact: https://claude.ai/artifact/GwCmCx8VKWRpSbnu9yXMtj (publish `www/index.html` with this as `url`, `root` = `www`, and every `.js` file except `plan.js` in `files`).
- Map block-in artifact: https://claude.ai/artifact/PWbdHU4ADXtaoAjc8sv2qq (publish `plan/map-plan.html` with `files` = `{"plan.png": "plan.png"}`, `root` = `plan`; render the picture with `./shot.sh plan.png '@plan.html' 1560 1080 'wait=200'` and copy `out/plan.png` to `plan/plan.png`).
- The overnight MVP artifact (https://claude.ai/artifact/76d6NraHh67ZTcMnMitrji) and branch `pixel-mvp` are the baseline now. Do not publish to that artifact or push to that branch again.
- The bar is unchanged: every scene must be at least as good as the same scene in the overnight MVP and in version 5. Compare screenshots before publishing and put back anything that got worse.

### TJ's mark-up of the first block-in (2026-11-14)

- He likes the direction.
- The biomes must flow into each other. The east side in particular has jarring borders. Wide, uneven transitions: trees and ground of one biome thinning into the next, shared plants crossing the line, no straight edges.
- No ice cap. In its place: the snowy ranges carry on behind the destinations, with big glaciers pouring down between the peaks behind the Spires.
- The mountains need more work: "Less like the picture I shared and more whimsical beautiful pixel art." The photo was only to show layer upon layer of snowy peaks. Draw designed, characterful peaks in the style of the lake peak and the Spires massif, in layers, not a noise skyline.
- The volcano is welcome and may look better centre-right. Move it and judge.
- The larch basin needs mountain goats. The scablands need bighorn sheep and the like. The ocean needs a breaching whale, jellyfish and waves.
- The south is open meadow full of animals (squirrels, chipmunks, elk, bear, birds), with no road or parking lot.
- "The signpost" the cats hung round and vanished behind was the kiosk board.
- Kayti at base camp is painting with a portable backpacking paint kit.

### Checklist

Map
- [x] Revise the block-in (`www/plan.js`) to the mark-up above and republish it. Keep a strip of sky on the first desktop screen, as today.
- [x] Build the real map in `www/world.js` from the block-in: the larger world, every biome, the uneven lake with its island, the river and log bridge, the deeper forest loop with mist, the Stack trail turning talus grey, the Spires trail becoming a boot track in snow, larches by the Spires, big-leaf maples in the run forest. Everything that depends on map coordinates moves with it: camera limits, the cats' area, kiosk, flags, footprints, cloud shadows, fireflies, the trail map sheet (`MAP` and `DOTS` in `app.js`), where the lake route enters and leaves the forest.
- [x] Animals that move: elk, bear, squirrels, chipmunks and birds in the south meadow, goats in the basin, bighorn sheep in the scablands, marmots, a whale that breaches now and then, jellyfish near the shore, waves on the beach.
- [x] Signs stand on the terrain they name, with the twelve new names. Sign names and every other stray line of copy move into `content.js`.
- [x] Labels on the map for Trailhead, About Lake, The Stack and Sideproject Spires, in the style of the summit name tags. A click at any time sends him there; partway down another trail he turns round and goes back through the junction.
- [x] Zoom in whole steps on the world map only: wheel, pinch, plus and minus. The camera limits still hide the world's edge at every step.

Scenes
- [x] Base camp: a camp on a huge glacier under enormous walls, filling the frame. Cold, craggy, Patagonian. No landmass floating in the sky. The six summits keep their name tags and clicks.
- [x] Kayti at base camp: long brown hair, painting with a small backpacking paint kit, her name on hover like the cats, no other text.
- [x] The Stack: two people at the foot, a man with short black hair and a woman with long red hair. One belays, picked at random each visit, the other sits on a rock with a snack. The lead rope runs visibly from belayer through the gear to him, and both it and the rappel rope get a dark outline and a bright core.
- [x] About Lake: the forest's last stretch thins and brightens and the lake scene opens with the forest edge on its left. Try a straight scroll between the two in place of the round window; keep it only if it is better.
- [x] Cold plunge: he drops vest, shirt and shoes in a pile, wades in wearing shorts, then dresses again.

Controls and the rest
- [x] Debug panel, hidden: the backtick key, and a "Debug" sign at the bottom of the trail map sheet. Layer toggles (trees, clouds, labels, animals), outlines (roam areas, tap targets, trail lines, camera limits), force a cat state, go to the off-route page.
- [x] A scene that throws lands him on the off-route page; if the renderer itself is broken, the plain page shows.
- [x] Summit name tags no longer get a second label stuck on them.
- [x] Cats roam mostly below the junction, left of the kiosk, never under a panel; each click is the next trick.
- [x] The marmot answers a tap; a touch that misses tries the ground close around it.
- [x] The goat has a face, horns and cream wool.
- [x] A dragged view stays put, pushes back near the limits, and returns when he starts or stops.
- [x] Music follows the place with a fade (Glissade on the walk back out); the track button cycles Auto and each track, and a picked track is kept.

### Calls made in round 2

- Restored the MVP artifact to the overnight build (its version 7) so it is a clean baseline; today's fixes are only in the round 2 artifact.
- Block-in, second pass: the ranges are rows of drawn peaks in five layers, tall in the west and sunk to low ridges behind the three destinations, because the Spires and the lake peak read best against sky and the first screen keeps its strip of it.
- "Glaciers between the peaks behind the Spires" needed peaks there, so a taller glaciated group now stands right behind the Spires with one glacier winding down between its peaks, and the volcano rises behind that group at centre-right.
- A small second glacier comes through the gap between The Stack and the Spires, which gives Merge Conflict Col its col.
- Biome edges are now wide bands where each side's ground and trees scatter into the other; where the burn meets the pines the pines stand charred.
- The real map and the block-in are now one thing: `www/terrain.js` builds the ground and everything rooted in it, and both the world scene and the plan page draw from it, so they cannot drift apart.
- The low ridges behind the destinations carry no snow and use the mid blues, and the group behind the Spires is drawn in the hazy far palette, so the three landmarks keep their silhouettes and the first screen keeps a strip of sky like the MVP's.
- The meadow's fir clumps use the MVP's own noise pattern, so the middle of the map keeps the look it had.
- The mist over the west forest is drawn over the trees each frame but does not move yet. The new animals stand still until the animals item.
- Known cost: the page is ready in about 2.0 s in the test container, up from 0.7 s, because the map is five times the area. To be brought down in polish.
- Animals: all of them live in one new file, `www/critters.js`, which the world scene and the block-in page both draw from. Elk, goats, bighorn sheep and the bear graze, look about and wander near where they were put, going round trees, water and the trail. A goat kid stays near its mother.
- The elk herd is mostly cows now, with a bull every third animal, and a bull keeps his antlers when he lowers his head. The bear on the map is a new small one on all fours; the tall standing bear stays in the forest scene.
- Squirrels and chipmunks sit, then dart, and bolt away from him when he runs close. Marmots sit up when he is near and now and then on their own.
- Birds: a flock circles the south meadow, a single hawk each over the basin and the scablands, and gulls over the cove, each with a shadow on the ground. The V of birds across the sky stays.
- The sea is no longer painted into the ground: swells roll toward the beach, the wash runs up the sand in time with them, and the jellyfish pulse and drift.
- The whale breaches every sixteen seconds and blows half way between. It moved to (222, 934) because its first spot sat under the bottom bar on a desktop and on top of a sea stack.
- For screenshots only: `look=x,y` in the address puts the dragged view somewhere, and `sheet.sh` takes `CROP=x,y,w,h` to enlarge one part of every frame.
- Not done here and left for polish: the elk drawing itself is still the MVP's small one and reads a little blunt next to the new goats and sheep.
- Signs: all seventeen names now have a sign. Segfault Scree moved up onto the talus and Cache Miss Cove down onto the beach. The four that had no sign got one: Off By One Peak and Dependency Range at the north edge of the west forest under the range (where the block-in had their labels), Monorepo Woods beside the lake loop just south of the lake, Latency Bay on the beach further south.
- Anything that would stand in front of a sign (a tree, bush, boulder or log) is taken out when the map is built, and the mist parts round each board, so no sign hides.
- Copy: `content.js` now also holds the sign names (`SIGNS`), the names of everything you can point at in a scene (`NAMES`), the music and instrument names, and every word of the interface (`UI`). The scene files and `app.js` only look words up. The buttons that are written straight into `index.html` (Trail map, Dusk, Keys, Start, Close) stay there, so that file is the one other place a word lives.
- Draft copy changed along the way: the trail map's legend is built from the list of names, so it cannot fall behind ("The small signs in the world carry names: ..."); the kiosk's wildlife line lists the new animals; the hover label on a summit object now matches the checklist ("The weather station", not "Weather station").
- The trail map's dots take a card's title or a project's name, so they cannot differ from the cards.
- Map labels: Trailhead, About Lake, The Stack and Sideproject Spires carry name tags on the map, the same tags as the summits at base camp, and turn green once that place is done. They sit over the signpost, on the lake's near shore, on the wall's rim and on the ice under the summits.
- A place that is out of view keeps its tag at the nearest edge of the screen (without the little stem), so he can be sent anywhere from anywhere on the map. Tags that would land on top of each other stack.
- What a click does: at the junction it starts that route. Out along another trail he turns round where he stands, comes back to the junction and sets off for it. Already heading back he carries on to the junction and then sets off. Heading home along the trail he now wants, he turns round on the spot. "Trailhead" brings him back and stops, and at the junction it only recentres a dragged view.
- Turning back does not count as finishing: no flag, nothing marked done. The strip along the bottom shows just the stretch back to the Trailhead while he does it.
- The tags only exist on the map. Inside a scene (forest, wall, camp) the trail map sheet is still the way to jump elsewhere.
- Zoom: on the map only, in whole steps of pixel size. The mouse wheel and a two-finger pinch keep the spot under the pointer where it is; the plus and minus keys zoom about where the view rests. Other scenes always draw at the page's own size, and the map remembers its zoom when he comes back out.
- How far: in to twice the page's own pixel size, out to half of it, and never so far that the view is wider or taller than the world, so the camera limits still hide the edge. On a 1440 x 900 desktop that is 2 to 6 (3 is normal); on the test phone 3 to 8 (4 is normal).
- The signs, the cards and the bars do not change size with the zoom. No plus and minus buttons on screen: the top bar has no room on a phone, where the pinch does it. The keys list in the Keys sheet names the zoom.
- A key held with Command, Control or Alt is now left to the browser (Command and plus is the browser's own zoom; Command and T used to flip Day and Dusk as well as open a tab).
- Measured in the test container: 60 frames a second at the normal size, 60 zoomed out at the Trailhead, 50 zoomed out over the west forest.
- For screenshots only: `wheel=x,y,dy` is a new step in `shot.mjs`.
- Base camp is a painting that fills the frame now, not a slab in the sky: two dome tents on a moraine in the middle of a glacier, six granite towers on a jagged ridge behind them, and far ranges across the ice sheet on the horizon. `camp.js` paints it to the size of the screen and keeps the towers and the camp clear of the card.
- On a wide screen two walls too big for the picture close it at the left and right edges, their tops out of frame. A phone has no room for them, so there the six towers fill the width.
- The glacier has an icefall of lumped blocks under the towers, a line of ice cliffs, crevasses in broken arcs that widen toward the camp, two bands of rubble riding down from the walls, a meltwater pool, and the towers' long shadows across it. Snow blows off the three highest tops.
- The six towers keep their name tags, their clicks and their flags, and the heights still rank the same way (Bluebird Forecast tallest). They are the map's Spires drawn the same way, only taller and narrower.
- The tents are a new, larger dome drawn for this scene, so the goats no longer stand taller than them. The goats stay, at the west end of the moraine. The east end is left clear for Kayti.
- Nothing floats or bobs any more, so the scene is still apart from cloud, birds, smoke, spindrift and the goats.
- Kayti sits on a rock at the east end of the moraine, facing the towers, in a purple jacket with no hat so the long brown hair shows. She paints on a small pad on her knee, with an open tin of paints on the rock and her pack on the ground. Every seven seconds or so she looks up and holds the brush out at arm's length to size up a tower. He stops next to her when he walks in.
- Hovering her shows her name and nothing else. A click makes her look up and wave the brush for a second and a half. There is no card and no text.
- She is drawn with his own figure painter, which now takes hair colour, hair length, no hat, no beard and no sunglasses, so the two climbers at The Stack can be drawn the same way. They will live in the same file, www/people.js.
- The eastern rubble band on the glacier moved further east so it no longer runs through her seat.
- The Stack's two people: a man with short black hair in a blue jacket and a woman with long red hair in a pale green one. Neither wears a hat or helmet, so the hair that tells them apart shows. They have no names and no hover text.
- Which of them belays is a coin toss each time the scene is entered. The belayer stands left of the route, seen from behind like the climber, and pays rope out while he moves, locks off when he falls, and is lifted a little by the catch. The other sits on a rock to the right, eats a bar, and looks up now and then.
- The lead rope now starts in a pile at the belayer's feet, runs through both hands, up through every piece and on to him, and he is on it from the moment he walks in. During the rappel the belayer just stands and watches.
- Both ropes are three pixels wide: a dark edge either side and a bright teal core with white flecks. The gear is drawn over the rope so it still shows.
- The belayer is drawn at the climbing figure's size and the seated one at the walking figure's size, as he is himself in this scene, so the belayer is the bigger of the two.
- About Lake, the scroll: kept. Forest and lake now scroll into one another in place of the round window. Both scenes are drawn side by side for 2.2 seconds while the view pans across, he keeps running, and one big tree in the foreground stands exactly on the join so it never shows. Scrubbing across the join does the same in half a second, in either direction. Every other scene change still uses the round window.
- For the scroll to make sense he has to run the same way in both scenes, and the lake had to keep its forest on the left. So the forest is now shown mirrored: he runs left to right through it. Nothing in it moved relative to anything else. He stands a little right of the middle there, so the card at the trail sign stays clear of him on a narrower window.
- The forest's last stretch thins and brightens: from just past the bear, more and more of the giant trunks are missing, the far trees give way to pale open light in clumps, and the ground lightens. The trail sign stop is still in thick forest.
- The lake scene opens with the forest on its left: a wall of leaves closing off the water there, three giant trunks with mossy limbs reaching out over the shore, maples and sword ferns under them, and moss in place of meadow on the ground. A phone has room for one trunk, a maple and the overhanging leaves.
- Cold plunge: the vest goes down on the trail, the shirt on top of it, the shoes beside them. He walks up the bank in his tights and cap, wades in until only his head and shoulders show, shivers there for about three seconds, wades out, drips, and dresses in the reverse order. It takes about nine seconds, up from six and a half, because wading is slower than the old jump.
- He keeps the cap and the sunglasses on in the water. The splash sound now plays when he reaches the water, not on the click.
- The debug panel is a narrow column down the right side, not a sheet, so the world stays in view while things are switched. The backtick key opens and closes it, Escape closes it, and a small faded "Debug" sign at the very bottom of the trail map opens it. Adding ?debug=roam,taps,-trees to the address opens it with those outlines on and those layers off.
- Layers: "Animals" hides the wildlife (grazers, squirrels, marmots, whale, flocks, the birds and the butterflies) but leaves the two cats, so a forced cat state can still be seen. "Labels" hides every name tag and hover name. "Trees" hides the trees on the map only.
- Outlines: roam areas are red ovals for each animal and flock and pink boxes for the cats. Trail lines are the three paths he follows, one colour each, with white crosses where the lake loop enters and leaves the forest. Camera limits are the box the middle of the view may move in, the band that pushes a drag back, the edge of the world, and two crosses for where the camera rests and where the view is. All three show on the map only.
- Tap targets work in every scene, not just the map: every spot that answers a tap or a hover is hatched pink, worked out by asking the scene itself, so it cannot drift from the real targets. The four place names and the buttons are page elements and are not hatched.
- Forcing a cat state offers the seven tricks a click cycles through (sit, groom, roll, bat, loaf, stretch, sleep) for either cat, held for eight seconds. Chasing, stalking and the kiosk roof are left out because they need a target to go to.
- A scene that throws while it is entered or drawn is left as it was last shown, a line of text says the trail has washed out, and he lands on the off-route page. Going back and trying that route again tries the scene again. A scene that cannot even be built keeps its place on the route and throws when he reaches it, so it ends the same way.
- The world cannot be shown at all when the map throws, the off-route page throws, anything outside the scenes throws, or the page fails to start. Then everything belonging to the world is hidden and the whole site shows as the page of text, with one line at the top saying why, no picture of the map and no "Back to the world" button.
- To see it: the debug panel has "Break this scene", and the address takes ?break=forest (any scene's name), ?break=load:forest, ?break=renderer or ?break=mount.
- Polish, glitches: on the map's north-east horizon the far ranges ended in flat bands and boxes where nothing stood in front of them. Their flanks now carry on down as slopes, the foot of the granite needles is a belt of larch, and the glacier that comes down behind the Spires fades in at its head. The west of the horizon is unchanged apart from a few far slopes.
- Polish, glitches: on the rappel he takes each piece of gear out as he passes it, so none is left on The Stack with no rope through it. At base camp a climbed tower's name tag now sits above its flag, which it used to cover.
- Polish, flow: the forest used to open deep among the trees although he had just run in from the meadow at the trailhead. The trees now thin out behind where he enters, so the first frames show open sky at his back and the forest closing in ahead. The other end already thinned toward the lake.
- Polish, flow: at base camp he used to walk in from the east, although the trail on the map reaches the camp from the west. He now walks in from the west, past the tents.
- Polish, flow: the borders between biomes on the map were looked at one by one and left as they are.
- Polish, animals: the elk on the map were the weakest drawing (a dark oval with a ball for a head). They are redrawn as elk: a buff body, a dark neck, head and legs, a pale rump, long thin legs, and on the bulls a thin rack. They stand a little taller than the goats and sheep now.
- Polish, animals: the forest elk tears at the grass while he grazes and flicks an ear when his head is up. The kid goat at base camp bounces twice on the spot every few seconds and stands clear of its mother. A grazing kid on the map lowers its head part way, where it used to fold into a lump.
- Polish, animals: sheet.html has a set with every animal in it (sheet.html?set=zoo), for looking at them side by side.
- Polish, menus: on a phone the small marks in the sheets (the dots on the trail map, the squares beside each milestone, the checklist boxes and ticks) were one pixel wide and all but invisible. They now use a unit that is never smaller than two pixels. Desktop is unchanged.
- Polish, menus: on a phone the dark heading band of a sheet wrapped onto two lines and stopped short of the Close button, in an L shape. The band now runs the full width under the button, with its note on a second line. The plain page keeps its heading and its button side by side.
- Polish, menus: the "Debug" sign at the foot of the trail map is a small tag now, where it used to stretch the full width like the real buttons.

## Round 2 report (2026-11-14)

Round 2 is finished: every item on the checklist is ticked and the four polish passes are done. Nothing outside `prototype/` was changed, and `main`, `pixel-mvp`, `pixel-prototype`, the MVP artifact and the version 5 artifact were not touched.

### What is done

- The world map is the larger world from the block-in: every biome, the lake with its island, the river and log bridge, the forest loop with mist, the coast, the ranges and the volcano on the horizon, signs with the twelve new names, labels that send him to a place, and zoom in whole steps.
- Animals move on the map: elk, a bear, squirrels, chipmunks, birds, goats, bighorn sheep, marmots, a whale that breaches, jellyfish and waves.
- Base camp is a camp on a glacier under the walls. Kayti sits there painting, with her name on hover.
- The Stack has the two climbers at its foot, one belaying and one eating, and a rope that runs from the belayer through the gear to him.
- The forest thins toward the lake and the two scenes scroll into each other. The forest now reads left to right.
- The cold plunge: he leaves vest, shirt and shoes in a pile, wades in, and dresses again.
- The debug panel (backtick, or the "Debug" sign on the trail map), and what happens when a scene or the whole world fails.
- Polish: the far ranges' feet, gear left on the rappel, flags behind name tags; the forest opening at the meadow edge and the walk into base camp from the west; the map elk redrawn, the forest elk and the kid goat given more movement; the sheets on a phone.

### What is weak

- Movement was judged from still frames only. The scroll between forest and lake, the plunge, the belay, the kid's bounce and the elk's ear were never watched as they play. Watch these first.
- On the map he runs west into the forest, but the forest scene runs left to right. It did not bother me in stills; it may when played.
- At Dusk the open sky behind the forest's first frame is a flat orange block between the trunks.
- The belayer at The Stack is drawn larger than the climber who sits.
- A flat blue-grey band still lies under the low ridges at the volcano's foot.
- The cold plunge was not checked on a phone or at Dusk.
- The page takes about two seconds to be ready, because the larger map is built at load.
- The mist on the map does not move.
- The picture on the trail map sheet was only shifted to fit the larger world. It shows the same middle part as before, none of the new edges.
- On the trail map sheet the music button's label and its value nearly touch on desktop, and the list of sign names is a block of small text.
- An elk on the map can wander in among a clump of trees, and one grazes right beside the trailhead sign.
- All copy on the cards is still draft, marked as draft, waiting for TJ's wording.

### What I changed my mind about

- The round window between forest and lake. I expected to keep it and only try the scroll; the scroll was clearly better there, so those two scenes scroll now. Every other scene change still uses the round window.
- The forest's direction. It was built right to left; to make the scroll into the lake work it is shown mirrored, so he runs left to right.
- The first thinning of the forest began at the trail sign and looked like a clearing in the wrong place. It moved further along, and later the entry end was thinned too.
- The walk into base camp came from the east; the map says west, so it was turned round.
- The map elk. I had left them as good enough for their size. Side by side with the goats and sheep they were the worst drawing in the world, so they were redrawn.

### Links

- Round 2 artifact: https://claude.ai/artifact/GwCmCx8VKWRpSbnu9yXMtj
- Map block-in artifact: https://claude.ai/artifact/PWbdHU4ADXtaoAjc8sv2qq
- Branch: https://github.com/zimmertr/trailhead/tree/pixel-round2
- To compare with, both unchanged: the overnight MVP https://claude.ai/artifact/76d6NraHh67ZTcMnMitrji and version 5 https://claude.ai/artifact/UgfBaAqoZCaJdKY8sBDUXF
- Workbench pages in `www/`: `sheet.html?set=zoo` (every animal), `plan.html` (the whole map as one picture).

## Round 3 (branch `pixel-round3`, from 2026-11-15)

Round 3 answers TJ's feedback on the round 2 build. It lives on its own branch and its own artifact, so round 2 stays as it was to compare against. The bar is unchanged: every screen at least as good as the same screen in round 2, the overnight MVP and version 5.

- Round 2 artifact (https://claude.ai/artifact/GwCmCx8VKWRpSbnu9yXMtj) and branch `pixel-round2` are frozen. Do not publish to that artifact or push to that branch again.
- Round 3 artifact: https://claude.ai/artifact/EcPQ1pDmeJQvZEqSHtgEF1. Publish to it by passing that link as `url` every time. In a session that has published `www/index.html` before, a publish without `url` goes to whichever artifact that path last went to. That put the round 3 build on the round 2 artifact once (2026-11-15); round 2 was republished from `1bdb244` within minutes and its files checked by size.
- The work is split by file so five streams can run at once, each on its own branch (`pixel-round3-mountains`, `-ground`, `-life`, `-scenes`, `-climbs`), merged into `pixel-round3`.

### TJ's feedback (2026-11-14), as a checklist

The page
- [x] F1. Music starts with the first click, tap or key, not only once he moves.
- [x] F5. Space still starts and stops him; holding it makes him go faster.
- [x] F7. Zoom steps glide instead of jumping.
- [x] F13. The junction sign and the cards take less room and can be closed.
- [x] F15. The debug panel's Trees and Clouds switches hide all of them.
- [x] F32. The page is ready as fast as it used to be.
- [x] F36. The music does not wear thin: longer tunes, and Auto moves on after a tune has repeated a few times.

Scene changes, forest, lake, camp
- [x] F2. He keeps his direction when the map hands over to the forest (right to left again).
- [x] F4. No sudden sprint at a scene change.
- [x] F3. The forest's far background has depth and does not read as wallpaper.
- [x] F6. The lake marmot sits on its rock and is brown.
- [x] F35. The island on the map is in the lake scene too. "Go for a swim": he swims out, stands on the island cheering, and swims back when asked.
- [x] F33. At base camp he sits beside Kayti and a heart floats up between them.
- [x] F24. The goats at base camp stand in the middle ground, away from the tents.

The Stack and the summits
- [x] F16. At The Stack he walks to his friends and waits for Space before he climbs.
- [x] F17. Pitch 2 holds read as holds. The gold sparkles and red crosses by Rollback Roof are gone or explained. Leaving the top of pitch 3 his legs no longer hang below where he stood.
- [x] F18. After the rappel he high-fives both friends before he leaves.
- [x] F19. Ice climbing takes longer and is climbed: tool, foot, tool, foot, front points, an extra kick or two now and then.
- [x] F20. The storm on the way to Kubernetes-Manifests blows in: wind lines, a few flakes, heavy snow, white. It clears more slowly at the top.
- [x] F21. The Trailhead summit gets a new object and a new thing to find (the survey marker did not read).
- [x] F22. On the TJs-Kubernetes-Service climb: the same ice climbing, seracs that look like ice, and a server rack on top that takes a BANG, a shake and goes from red to green.
- [x] F23. The bluebird flies off the screen.

The map: mountains and sky
- [ ] F8, F30. The volcano stands alone at the top right, like Rainier, over foothills that fade into rolling yellow hills. Left of it the snowy peaks build toward Sideproject Spires.
- [ ] F31. Sideproject Spires is one mountain with several summits, after the Cerro Torre group.
- [x] F26. The aurora belongs to the sky: it is seen when the view goes high enough, and does not slide out from under the sunset.

The map: ground, water and plants
- [ ] F9. The larch basin reads as the Enchantments: granite slabs, larches, sparse grass, a jagged granite peak, the tarns.
- [x] F10. No stray snow patches between the Spires and The Stack or the basin, and no half-hidden sign.
- [x] F12. Fireweed is stronger.
- [x] F14. The lake's outlet flows straight out of the lake. Logs read as logs. The river reaches the sea. No sign stands in water. Sea stacks rise out of the water. The river crossing is a bridge. Trail surfaces blend where they change. The boot track is as wide as the trail. Snow does not spill onto the meadow.
- [x] F25. The trail conditions board stands just north-east of the junction.
- [x] F27. South of the larches: aspen and ponderosa in place of green firs, and larch, aspen, ponderosa and burn blend into each other.

The map: animals and motion
- [x] F11. Fewer animals and less motion: elk and bear are rare, fewer jellyfish, calmer trees.
- [x] F28. The whale jumps and rolls, slowly.
- [x] F29. The ferry sails a long course and is off the map for a while at each end.
- [x] F34. The mist over the forest moves and has no dotted grid.

### Decided with TJ (2026-11-15)

He stopped the first start on this round: after a round of feedback he wants a report of findings and questions before anything is built. The answers below are his.

- Skyline (F8, F30, F9): the volcano moves right, clear of the Spires, and stands alone over forested foothills that fade into yellow rolling hills. The snowy peaks build from the west up to the Spires. The larch basin gets one Prusik-style granite peak, far lower than the volcano.
- Review order: a block-in first for the skyline, the basin and the Spires, as pictures to pick from (two or three versions side by side, not ASCII). Those three are only drawn for real once he has marked it up. Everything else is built meanwhile.
- Forest to lake (F2, F4): the forest runs right to left again, and that change goes back to the round window. The sprint was the scroll between the two: a whole screen in 2.2 seconds, 2.8 times his running pace.
- Junction sign (F13): kept, about a fifth smaller, with a close button. Closed, it leaves a small Trailhead tab; the tab or the Trailhead sign on the map opens it again. Cards get a close button too.
- Trailhead summit (F21): a pair of coin-operated binoculars on a post. He looks through and a round view shows the Trailhead far below.
- Music at launch (F1): no opening screen. Music starts on the first click, tap or key of any kind, and until then the Sound button shows it is waiting for one.
- Music (F36): both fixes. Each tune gets a second part so one play lasts about a minute, and the music moves on after two plays, working through all seven. A tune picked by hand stays until he changes it.
- Animals (F11): about half, elk and bear rare. 4 elk in one herd, the bear on some visits only, 4 goats, 4 sheep, 7 squirrels and chipmunks, 8 jellyfish, 3 butterflies. Trees stand still most of the time, with a light gust every ten seconds or so.
- The Stack (F16): he walks up, picks up the rope, ties in and waits for Space. Then a fist bump with the belayer, and he climbs.
- The Stack (F17): the glowing "suggested holds" and the red cross go. Holds that read as holds on all three pitches.
- TJs-Kubernetes-Service climb (F22): the seracs become plain ice, and a server rack on the summit replaces the hut.
- Base camp (F24): the goats move to the middle ground, away from the tents.
- Load time (F32): the part of the map in view is built first and the rest in the background, on one condition: a visitor can never see an unbuilt part.
- Colours: stay within the 254 the picture can hold (232 are used). If the new art runs out, stop and tell him before changing anything.
- Work split: five parallel copies with one tight scope each, and the page done alongside them.
- A scene can now hold him at a spot with no card: a stop whose id starts with `wait:` shows one line of text until Space or Start. `UI.wait` in `content.js` has the lines.

### Calls made in round 3

- Page, junction sign: 420 pixels wide where it was 456, with less air in the placard and the planks. On a desktop that is about a sixth smaller, short of the fifth agreed: any narrower and "Climb the Sideproject Spires" wraps onto two lines.
- Page, closing: the sign and every card have a small wooden square with a cross in their corner, never smaller than 30 pixels on a phone. A closed one leaves a tab at the bottom left that names what it opens again ("Trailhead", or the milestone's name). The Trailhead name tag on the map opens the sign too. Closing is not remembered between visits: every visit starts with the sign open.
- Page, cards: the small flag on summit and project cards moved left to make room for the square.
- Sound (F1): it now starts on a press, a release, a tap or a key, whichever the browser accepts first. Until then the Sound button reads "Click for sound" (or "Tap for sound"). Where a browser says it allows sound unasked, the music starts with the page. A finger going down on the map did not count before, which is why it seemed to wait for him to move.
- Pace (F5): held for more than a quarter of a second, Space or the Start button doubles his pace until it is let go, and he carries on at his own pace afterwards. A short press starts or stops him as before; a press that stops him now does so when the key comes up. The Keys sheet lists it.
- Zoom (F7): a step glides for a fifth of a second and rests on whole pixels. Zooming in, the last picture at the old size grows over the new one and gives way to it; zooming out, the new picture starts enlarged where the old one was and settles. The name tags ride along. A visitor who asks for reduced motion gets the plain step.
- Music (F36): each of the seven tunes has a second part. One play is the first part, the second, and the first again with the melody doubled an octave down, 41 to 80 seconds depending on the tune. On every second play the drums sit out the first four bars. Auto moves on after two plays: the place's own tunes first, then every other one. A tune picked by hand stays. Nobody has heard the new parts yet: they were written against each tune's chords and checked note by note, not by ear.
- Night sky (F26): on the map the aurora, stars and moon have fixed places in the world's sky and come into view as the camera rises. Other scenes keep the old layout. The moon sits at world (930, 70), where it shows on a phone's first pan up.
- Forest (F2, F4): right to left again, the slide between forest and lake is gone and the round window is back. The window now starts closing while he is still running, so he never stands still at a change (about 8 still frames per change before, none after).
- Forest (F3): the one sheet of pale trunks became a lit backdrop and three far layers moving at 0.14, 0.34 and 0.6 of the near speed, each with uneven trunk groups, undergrowth and a ragged canopy. The backdrop is a step paler so the far layers read as silhouettes. One new colour, `glow`.
- Marmot (F6): brown with a paler cape, lying on the rock. The map's marmots share the sprite, so they turned brown too.
- Swim (F35): the map's island stands in the lake scene and crosses at 0.66 of the near shore's speed. "Go for a swim" is offered only while the island is in view. He undresses, wades, swims front crawl, climbs out and cheers until asked back: a click on him or the island brings him back to stand, Space or Start brings him back and he runs on. The find and name keys changed from `plunge` to `swim`, so a saved cold plunge find reads as not found. All three strings are draft copy.
- Base camp (F33, F24): he walks in from the west at about 70 px/s, passes in front of Kayti, sits at her side facing the towers, and one heart rises. Her pack moved. Three goats (nanny, billy, kid) stand on a new rock knoll out on the ice, left of the tents.
- Block-in: three versions of the volcano, the Spires and the basin live on branch `pixel-round3-mountains` behind `?v=a|b|c` and are not merged. TJ picks from https://claude.ai/artifact/D8uUSeB1pMam8EKT8anxjc (source `plan/skyline-pick.html`, pictures from that branch's `out/blockin/`).
- Ground (F10, F14, F25): the two small glaciers between the peaks and the stray snow loop are gone. The river's first point lies in the lake. Logs are redrawn (cut end, bark, moss, shadow) and fewer: 22 in the forest, 7 bare ones in the burn. The river narrows through the last trees and crosses the beach as a bending channel into a pale fan. Signs moved onto dry ground (Cache Miss Cove, Latency Bay, Scope Creep Glacier, Merge Conflict Col). Sea stacks have a curved waterline, a wet band and their own foam. Two footbridges, because the lake trail crosses the river twice; he is never seen on one, since the forest scene covers both crossings. The glacier ends in a toe near y 550 with a grey boot track over the moraine. The board stands at (846, 608) and the cats' perch follows it.
- Plants (F12, F27): fireweed is 3 to 5 pixel spikes in drifts in a brighter magenta. East of a wandering line near x 1000 the firs gave way to 154 aspens in separate groves and 27 spaced ponderosa (first try was 368 and 41, which read as a new dense forest and was sent back). Four new colours: `aspen` and `fireweed`, two each.
- Placement dice: each placement loop now starts from its own place in the sequence, so changing one loop does not move what later loops plant.
- Trees switch (F15): hides every tree, snag and sapling. Tree shadows painted into the ground stay.
- Animals (F11): 4 elk in one herd round (757, 825), bear on about one visit in three, 4 goats, 4 sheep, 7 squirrels and chipmunks, 8 jellyfish, 3 butterflies. Map trees stand still between gusts; one gust about every 11 seconds crosses west to east. `bear=1|0` and `sea=<seconds>` are address switches for screenshots.
- Whale (F28): 34 drawings at 12 a second. It rises, hangs belly up, tips onto its back and lands in spray, then the flukes go under; once every 40 to 60 seconds, with two blows in between. Its spot moved to (150, 912), off a sea stack.
- Ferry (F29): redrawn at an angle along a 513 pixel course outside the stacks at 7 px/s, off the map for 50 s past the west edge and 38 s past the bottom. It is drawn with the water, so the Animals switch does not hide it.
- Mist (F34): no dither. A pixel under mist takes the palette colour nearest to itself seen through fog, in three strengths, and the banks drift. First try came out as near-opaque white bars and was sent back. Second try: where mist overlaps the strongest piece wins, so it never adds up to a slab; strengths 0.4, 0.6 and 0.76; 24 lobed banks and 100 wisps; trees 52 pixels or taller stand clear by their top 6 rows. Some banks are still long thin bands.
- The Stack (F16, F17, F18): he ties in facing us with the rope end from the grass, stops at `wait:belay`, fist bumps the belayer on Space and climbs. The suggested-holds glow, its decoy and red cross are gone; holds are painted where his hands and feet go. At every ledge his feet stay on it until his hips have left. After the rappel he slaps hands with the seated friend, then the belayer. About 25.8 s plus the wait (was 20.1).
- Ice (F19, F22): climbed in back view on a frozen fall, tool, foot, tool, foot, with chips at every placement; on hevy-garmin-sync one foot skates and is kicked twice more. TJs-Kubernetes-Service has two falls, seracs as stacks of fractured blocks, and a server rack that takes a fist, a "BANG!" burst, a shake and goes from red to green. Lengths: hevy-garmin-sync about 14.8 s, TJs-Kubernetes-Service about 17.2 s (both were 8.6).
- Storm (F20): clear, wind strokes, a grey bank from the right, flakes, heavy snow, white with a pocket round him, then a slow clearing; 14.6 s. No dither. The ridge storm on bluebird lost its dotted cloud too.
- Trailhead summit (F21): coin-operated binoculars. He leans in, the picture closes on the eyepiece and opens as a round view of the Trailhead for about three seconds.
- Bluebird (F23): flies in from past the right edge, circles and leaves off the picture. 9.6 s.
- New sounds, never heard: `tink`, `bang`, `slap`.
- Load time (F32): about 0.8 s to ready in the test container, from 2.1. The ground is worked out ahead by `./bake.sh` into `www/ground.png` (232 KB) and read at start; the page checks it against `ground()` at one spot in every ten by ten pixels and works the ground out itself if they differ, and says so in the console on localhost. Run `./bake.sh` after any change to the ground or the palette, and publish `ground.png` with the other files. The forest's and the lake's pictures are made right after the map's first frame (`shell` in `side.js`). This replaced the plan of early-outs and background slices: the bake removes the whole second with no change to what is drawn. Not checked on the artifact host.
- Page: the wait line clears when a card opens, and a tap label clears once a scene acts on the tap.
- For filming: `./frames.sh` saves a sheet of frames (see its head for the steps).
- For screenshots only: `down=<key>` and `up=<key>` are new steps in `shot.mjs`, for anything that depends on how long a key is held.
