# Round 4: the map re-laid as its own Washington

Status on 2026-11-15: **plan only. Nothing is built. TJ has not signed off. Do not start until he says so.**

This file is written so that someone with no memory of the conversation can do the work. Read all of it once, then work the checklist from the top.

## 1. Why this round exists

The world began as three landmarks huddled in the middle of a small map. The map then grew biomes around them, but the landmarks never moved into the biomes they belong to, and the skyline collected eight unrelated kinds of mountain. TJ's words: "The Tale Grew in the Telling". Round 4 moves each destination into its own country and cuts the mountains down to four kinds.

## 2. Ground rules for whoever does the work

**Where things are**

- Repo: https://github.com/zimmertr/trailhead. Work only in a clone inside the session's scratchpad directory (under `~/.claude/tmp`), never in `~/git`, never in `/tmp`.
- Branch: `pixel-round4`, cut from `pixel-round3` at `0138c2e`. Everything lives in `prototype/pixel/`. Touch nothing outside `prototype/`.
- Frozen, never push to or publish over: `main`, `pixel-mvp`, `pixel-prototype`, `pixel-round2`, `pixel-round3`, and every artifact listed in `PROGRESS.md`. Round 3's artifact is https://claude.ai/artifact/EcPQ1pDmeJQvZEqSHtgEF1.
- History and every earlier decision: `PROGRESS.md` (long; read the "Round 3" section, skim the rest). Ideas not yet built: `IDEAS.md`.

**How the code is laid out** (`www/`, plain ES modules, no build step, no dependencies)

- `core.js`: the indexed-colour renderer. `ramp(name, [day...], [dusk...])` adds palette entries (`R.<name>[i]`), `BM` bitmaps, `pick()` with dither, `Screen` (frame buffer, `put`, `blit`, `iris`, `night`, `present`), `DEBUG` flags, `breeze()` and `windAt()`. New ramps go just before `const INK`, under a `// Round 4` comment.
- `terrain.js`: `buildTerrain(peak, opt)` builds the whole map: constants (`NW`, `NH`, `T` Trailhead, `PEAK`, `STACK`, `SPIRES`, `KIOSK`), biome amounts, glacier, trails and river, `paintNorth`/`paintPeak`/`paintVolcano` (the skyline), `ground(x, y)` (one palette entry per pixel), then everything that stands up (`put` for still things, `plant` for swaying trees), `spots` (signs, animals, ferry, whale), and the mist's no-go mask. `loadBake()` reads `ground.png`.
- `world.js`: the map scene (`makeWorld`), its sprites (`makeStack`, `makeMassif`, `makePeak`), drawing order, taps, name tags, the night sky pinned to the world (`scr.sky`).
- `critters.js`: everything on the map that moves (animals, whale, ferry, mist, surf, birds). `cats.js`: the two cats. `fauna.js`, `sprites.js`, `people.js`, `tj.js`: drawings.
- `forest.js`, `lakeside.js`: the side-on scenes of the lake route, built on `side.js` (`Strip`, `drawStrip`, `shell`). `wall.js`: the climb of The Stack. `camp.js`: base camp. `climb.js`: the six summit climbs. `offroute.js`: the 404.
- `pixel.js`: the scene manager: `ROUTES` (lists of legs), stops and cards, the round-window cut between scenes, zoom, pace, input.
- `app.js`, `index.html`, `content.js`: the page round the canvas (signs, cards, timeline, trail map sheet, debug panel) and every word shown. `audio.js`: tunes and effects, all synthesised.
- `plan.html` + `plan.js`: paints the whole map as one picture, for block-ins.

**How to run and look** (everything in Docker; nothing is installed or run on the workstation)

- `./shot.sh <name.png> '<query>' [w] [h] '<steps>' [dpr]` saves `out/<name.png>`. Steps are separated by **semicolons**: `wait=600;key=Space;wheel=720,300,600;drag=x0,y0,x1,y1;click=<css>;shot=<name.png>;down=Space;up=Space;eval=<js without semicolons>`. `'@plan.html'` loads another page. Queries: `route=lake|stack|spire:<id>`, `p=0..1`, `dusk=1`, `debug=roam,-trees,-mist`, `bear=1`, `sea=<seconds>`, `done=lake,stack,spires`. Warnings and errors from the page are printed.
- `./sheet.sh <out.png> <columns> <cell width> <files in out/...>` lays pictures side by side (`CROP=x,y,w,h` to crop).
- `./frames.sh` films a sequence into one sheet (usage at the top of the file).
- `./bake.sh` works the ground out ahead into `www/ground.png`. Run it after any change to `ground()` or the palette. The page prints "ground.png is missing or no longer matches the map" on localhost when it is stale; treat that warning as a failed check.
- Edits to many places at once: a small node script under `out/splice/` run with `docker run --rm -v "$PWD/www:/www" -v "$PWD/out:/out" --entrypoint node trailhead-pixel-lab /out/splice/<name>.js`, asserting each replacement count.
- **Look at every picture you make.** A step is not done because the code ran. Compare against round 3 (same view, side by side) and put back anything that got worse.

**Rules that must not be broken**

- Never push to `main`. Commit small and often to `pixel-round4` and push after every commit.
- Nothing is attributed to an AI: no co-author trailers, no "generated with" lines.
- No em dash (U+2014) in anything TJ reads or ships. Search before every commit.
- Never coin a name for a mechanism and use it as if TJ knows it. Say what happens in plain words.
- All new user-facing words are draft copy for TJ to reword; they live in `content.js`.
- No references to alcohol anywhere. Three of TJ's private rules (about email, about job seeking, and this one) are never written into anything committed.
- Colours: 237 of 254 are used. Reuse ramps. **If new art would pass 254, stop and tell TJ first.**
- One stream of work, in order, by one agent. No parallel copies or subagents for art (TJ, 2026-11-15: they used up the usage limit and needed rework).
- After TJ gives feedback at a stop: report findings and ask questions first, with AskUserQuestion, before changing anything.
- Keep `IDEAS.md` current: add ideas as they come up, delete ones that get built or rejected.

**Stops, tags and links (how TJ rolls back)**

- The work stops at each line marked **STOP** in the checklist and waits for TJ.
- At each stop: tag the commit (`pixel-r4-<step>`), push the tag, export that tag into its own folder (`git archive <tag> prototype/pixel/www | tar -x -C <new folder>`), publish **from that folder as a new artifact** (no `url`, so nothing older can be overwritten; `files` = every `.js` in `www/` except `plan.js`, plus `ground.png`), and add the row to the table in section 8.
- "Go back to step X" then means: check out that tag. No hunting for commits.

## 3. The law of this world

It is its own world, not a map of Washington. **Every feature is a real Washington feature, and every neighbour is a believable neighbour.** It runs wet in the west to dry in the east. Where things really sit in Washington does not matter.

West to east: open ocean and fog, coast with sea stacks, rainforest, the volcano with its lake and flower parkland, the meadow at the Trailhead under the snowy crest, larches and granite just east of the crest, pines and aspen, sage, scabland and Palouse hills at the far edge. The crest is the reason the west is wet and the east is dry.

**Four kinds of mountain, one per country. Nothing else goes on the skyline.**

1. **The snowy crest** (North Cascades): dark rock, snow, glaciers. Sideproject Spires is its most dramatic massif. The far, fogbound Legacy Range in the west is the same family, seen from a distance.
2. **One volcano**, Mount Monolith, drawn after Rainier.
3. **Enchantments granite**: Proficiency Peak (after Prusik Peak) in front, other unnamed granite peaks behind.
4. **The dry side**: basalt benches and yellow Palouse hills.

Gone for good: the Yosemite-style dome (The Stack), the tan Patagonian towers, the pale triangles behind them, the lone snowy cone behind the lake, the granite needles beside the volcano.

## 4. Decided with TJ (2026-11-15)

**The map**

- Size 1920 by 1080 (was 1560 by 1080). Trails may be longer; nothing needs compressing to save running time any more.
- The sea stays in the bottom-left corner, cutting diagonally. It does not run up the left edge.
- The rainforest's west edge: fog thickens toward the edge until the map is swallowed. Eerie, never scary: dark twisted maples hung with moss, bare snags, an owl, crows, a faint drifting light. At Dusk, pairs of glowing eyes far back among the trunks (deer eyeshine, as TJ sees trail running at night).
- The Legacy Range (after the Olympics): far, pale, low, half in mist over the rainforest, one highest peak in its middle (after Mount Olympus), forested on its west, glaciated in the middle, bare and rounded on its east. Unreachable. A clear gap of forested ridges separates it from the volcano. **It is a trial: if the block-in's skyline feels crowded, it is the first thing cut.**
- Mount Monolith: about a quarter of the map's width (about 480 wide, 230 tall), the tallest thing on the map, far behind Reflection Lake. After Rainier on purpose: a broad lopsided dome, never a cone; three bumps on a nearly flat top; a lower shoulder on the left (after Liberty Cap); a dark rock tooth on the right flank (after Little Tahoma); dark rock cleavers between glaciers; icefalls, seracs, blue ice; forested foothills at its feet. A lenticular cloud forms over the summit and dissolves again, slowly, as an idle event.
- Parkland: the ground between the lake and the Trailhead is the volcano's high parkland: clumps of pointed subalpine firs, a great many wildflowers. The elk herd and the marmots live here.
- The crest stands in the middle of the skyline. It builds from the west up to Sideproject Spires and falls away east into the granite. Snowy high up; **in the high cirques below the buttresses, bare glacier ice with crevasses**. TJ: glaciers are beautiful, give them emphasis.
- Sideproject Spires: a broken ripsaw ridge after the Southern Pickets, six summits (one per project, same order as `SPIRES` in `pixel.js`). Highest summit about four fifths of the volcano's height, far above the rest of the crest. Exaggerate height and steepness, never material: same rock, snow and ice as their neighbours, joined to them by ridges and cols. **Not daggers, not a saw blade: uneven, broken, fragmented, no perfect points.** A valley glacier with blue ice, crevasses and an icefall runs from their cirque down to base camp.
- The Enchantments: a rugged granite group, less snowy than the crest because it lies east of it, still holding small blue-ice glaciers high up. Proficiency Peak is the iconic one in front; it is not the only peak. Larches, slabs, tarns, goats.
- Proficiency Peak: drawn after Prusik Peak's south face (TJ's reference photo): a broad grey-white wall with dark streaks and vertical cracks, a central prow rising to the summit, a lower tower and the West Ridge on the left skyline, a serrated ridge falling away right, larches and a snow patch at its foot.
- The dry side is squeezed to the right edge. The Palouse hills rise from dry grass and sage at the far right, never from behind larches.
- The burn stays, at about half its size, bottom right. **Fireweed is waist to chest high on him**, far taller than meadow flowers (paintbrush, lupine).
- Seasons are mixed on purpose: gold larches, full wildflowers and fireweed at once. Each place at its best.
- **The ground is tiered, not a flat plane.** Four steps, each drawn as a rock band or steep bank with the trail climbing it: (1) Reflection Lake and the parkland on an upper bench, the river dropping over a rock step in a **waterfall**, the footbridge a few paces below it; (2) two benches in the Enchantments, larches below, slabs and tarns above under Proficiency Peak, a granite headwall and a cascade between; (3) a moraine and rock headwall below the glacier, base camp on the shelf above; (4) low bluffs along parts of the coast, the river cutting a notch through them.
- The Trailhead stays a junction in the meadow under the crest, with the signpost, the trail conditions board and the two cats. It gains the trail register (see Open, below). The three trails need not form a trident; they leave in whatever directions the land asks.

**Names** (drafts, TJ may reword)

- About Lake becomes **Reflection Lake**. The Stack becomes **Proficiency Peak**. Sideproject Spires keeps its name. The volcano is **Mount Monolith**. The far western range is the **Legacy Range**.
- Existing joke signs (`spots.signs` in `terrain.js`) are re-homed to fitting ground; none is dropped without telling TJ.

**Camera and zoom**

- The page opens on a wide view with the whole skyline in frame and him at the junction. On his first movement the camera eases in on him over about 2 seconds. When he comes back to the junction it eases out wide again.
- On a phone held upright the opening view is one still slice: the Trailhead with the Spires above.
- Zoom follows the wheel or pinch continuously. **No visible steps or clicks between levels**; that was TJ's complaint about round 3. Two behaviours at rest go behind a debug-panel switch so TJ can choose by eye: stay exactly where it was let go (edges about one screen pixel soft at in-between sizes), or ease to the nearest whole-number size.

**Timed events** (the world feels lived in; TJ wants more of these)

- The lenticular cloud on Mount Monolith.
- A serac fall on the Spires every minute or two: a block breaks off, a white puff runs down a gully, a faint rumble follows a moment later.
- Rain over the rainforest only: a shower drifts in off the sea, stops at the crest, leaves a short rainbow. The east never gets it.
- The tide: the sea draws slowly off the beach and back, uncovering wet sand and **tide pools with life**: starfish, crabs, mussels, barnacles, urchins, anemones, perhaps a nudibranch or an octopus.
- Headlamps on Mount Monolith at Dusk: a string of tiny lights creeping up the glacier.
- Salmon jumping **at the waterfall** (not at the bridges).
- Already built and kept: ferry, whale, gusts, bear on some visits.

**Scenes**

- Every destination is reached through a side-on scene: the forest to Reflection Lake (exists), **the larch basin to Proficiency Peak (new)**, **a high traverse and then the moraine to Spires base camp (new)**.
- Forest: near its end the background changes: the lake shows between the trunks (TJ's reference: turquoise water seen through dark conifer trunks).
- Lake scene: starts on the forested, misty shore and quickly opens into parkland after Image Lake (grassy bowl, heather, flower meadows, clumps of firs). **Mount Monolith stands in the background and is mirrored in the water.** The island, the swim and the marmot stay.
- Spires walk: first a narrow trail across a steep flower slope, the valley and the Trailhead far below, a stream crossing, a snow patch, marmots, the Spires growing ahead; then the crest of a grey moraine with blue ice and crevasses beside him and the icefall ahead; then camp.
- The six Spires climbs are too short and too alike. Each becomes about 30 seconds and its own thing. How is still open (see Open).

**The climb of Proficiency Peak: the West Ridge**

- It is the West Ridge (5.7), which TJ climbed with the two friends already in the scene (the red-haired woman and the black-haired man). He is never shown on routes he has not climbed.
- The map shows the south face; the scene follows the left skyline, side-on, up and to the right.
- Multi-pitch with three: **the first pitch with both followers climbing at once on two ropes; later pitches caterpillar style** (he belays the second up, the second belays the third), as they really climbed it.
- **The two followers are different people**: different speeds, different lines up the same pitch, different habits. If one slips, the other does not at the same moment.
- Each belay ledge is a card stop (the three skills, then the summit). Followers climb at their real pace while the card is read; holding Space doubles it. The visitor may have to wait for them.
- On the checklist: a goat watching from a ledge, a raven riding the wind, cold and wind on the people (hoods up, jackets and rope flapping, hands blown on), **a lead fall, and an offwidth or chimney pitch**.
- Wind and cold: cartoon wind lines with curls sweep across the scene (TJ's reference: pale blue pixel swirls), with a wind whoosh in the sound.
- The background is far below: larches, tarns and the other Enchantments peaks, small. As they get higher an inversion forms and they climb above a sea of cloud.
- Ending: high fives on the summit above the cloud, then **all three zip down the first rappel one after another** into the cloud, and the round window closes back to the map.

**Process**

- Stops: after the block-in, then after each big piece (section 7 marks them).
- No `/loop` this round: TJ is at hand throughout. Work the checklist in order in the open session, say briefly what is being done, and wait at every stop.
- Build order after the map: Proficiency Peak, then Reflection Lake, then Sideproject Spires, then the register and the page.
- Effort: high for design and for judging pictures, medium for mechanical work.

## 5. Open: settle with TJ before the step that needs it

1. **How the six Spires climbs differ** (needed before step K). TJ liked all three directions and asked for a deeper talk with smaller proposals and pros and cons. They are: (a) each climb mirrors what its project does; (b) six different kinds of terrain, no tie to the project; (c) one long traverse past all six summits. Recommendation to put to him: keep choosing a summit from base camp (a visitor wants one project, not a three-minute traverse), give each climb a different kind of mountaineering matched to its project, and put "carry on along the ridge to the next summit" in `IDEAS.md` as a later way to get the traverse. Draft pairings: Bluebird Forecast, a weather window (up through cloud and rime into a clear sky above an inversion); TJs-Kubernetes-Service, the icefall (ladders over crevasses, two ice steps, the server rack on top); hevy-garmin-sync, a long steep snow gully climbed in a steady rhythm with the slipping foot; trailhead, an exposed knife-edge of rock with the whole map below and the binoculars on top; yggdrasil, a rock tower with a chimney and the old tree on its summit; Kubernetes-Manifests, the whiteout followed wand by wand.
2. **The trail register** (needed before step L). TJ's idea, 2026-11-15: a guestbook at the Trailhead that any visitor can read in one click, with a note that you may sign it once you have raised the three flags, so the site rewards being used as intended. It replaces the register that today hides in the trail map sheet. To ask: do the three flags mean the lake, the peak and any one summit (today's rule) or all six summits; and what the box shows before then (suggestion: three small flags on its post, filling in). In the prototype it stays a browser-only mock; the real service is https://github.com/zimmertr/trailhead/issues/3.
3. **The West Ridge pitch list** (needed before step H). Read https://www.mountainproject.com/route/105808527/west-ridge and write the pitches into this file: which pitch is the offwidth or chimney, where the lead fall happens, which ledge holds which card. Show TJ at the stop after the larch scene.
4. **The opening frame.** The skyline from the volcano to Proficiency Peak is about 1000 map pixels wide, more than a 1440 screen shows at a whole-number size of 2. Decide with pictures at the block-in stop: open at an in-between size that fits it all, or at size 2 with the edges cut.

## 6. Starting numbers for the block-in (tune them by eye)

Map 1920 by 1080. The ground line (where land meets sky) stays near y 462. x runs west to east.

| What | Where |
|---|---|
| Fog swallowing the west edge | x 0 to 160 |
| Legacy Range (skyline) | x 30 to 330, tops near y 375, pale |
| Forested ridges, the gap | x 330 to 400 |
| Mount Monolith (skyline) | centre x 620, foot x 380 to 860, top near y 232 |
| The crest (skyline) | x 880 to 1280, ordinary tops y 320 to 350 |
| Sideproject Spires | centre x 1070, about 220 wide, highest top near y 278 |
| Enchantments peaks (skyline) | x 1280 to 1640, tops y 330 to 370 |
| Pine foothills, Palouse hills | x 1640 to 1790, then x 1790 to 1920, low |
| Sea | bottom-left corner, shore from about (0, 640) to (470, 1080) |
| Rainforest and the forest loop | x 160 to 600 |
| Reflection Lake, on the upper bench | about (640, 540) |
| Waterfall, footbridge below it | about (690, 606) and (700, 640) |
| Parkland | x 560 to 900, y 500 to 700 |
| Trailhead junction | about (980, 650) |
| Headwall, base camp shelf, glacier toe | y 540 across x 990 to 1150; camp near (1070, 520) |
| Lower larch basin | x 1200 to 1560, y 560 to 700 |
| Enchantments headwall and cascade | y 560 |
| Upper basin, Proficiency Peak's foot | y 480 to 560; foot near (1380, 520), about 150 wide, 120 tall |
| Pines and aspen, the burn | x 1560 to 1760; burn bottom right, half size |
| Sage, scabland benches | x 1760 to 1920 |

## 7. Checklist

Tick an item only after looking at a picture of it. Log every creative call in one line in section 9.

### A. Setup

- [ ] A1. TJ has said to begin.
- [ ] A2. Tag round 3's end: `pixel-r3-final` on `0138c2e`, pushed.
- [ ] A3. Save round 3 reference pictures into `out/r3/`: whole map (`@plan.html`), first screen desktop and phone, Day and Dusk, one frame of each scene and each climb.
- [ ] A4. Add a "Round 4" pointer to this file at the top of `PROGRESS.md`.

### B. Block-in (shapes, sizes and places only; flat colour is fine)

- [ ] B1. Study the references before drawing: Rainier from the south and from Reflection Lakes, Glacier Peak from Image Lake, the Southern Pickets, Prusik Peak's south face, the Olympics from the west. Write five lines per mountain in section 9 on what makes its outline recognisable.
- [ ] B2. Make the map 1920 wide behind a switch (`?v=4`), leaving round 3's map untouched without it, the way round 3's block-in used `?v=a|b|c`.
- [ ] B3. Block in the skyline: Legacy Range, gap, Mount Monolith, crest, Spires, Enchantments peaks, pine hills, Palouse.
- [ ] B4. Mount Monolith's outline reads as Rainier, not Fuji: lopsided, flat-topped, shoulder left, tooth right. Check it alone at three times size.
- [ ] B5. The Spires' outline: six uneven broken summits, none a clean point, joined to the crest on both sides.
- [ ] B6. Proficiency Peak as a standing shape in the upper basin, after the reference photo.
- [ ] B7. Block in the ground: sea corner, bluffs, rainforest with the fog edge, the bench with lake and parkland, waterfall step, Trailhead meadow, glacier headwall and shelf, two Enchantments benches, pines, burn, sage and scabland.
- [ ] B8. Draw the three trails and the river as lines, with where each tier is climbed (switchbacks) and where each side-on scene takes over and hands back.
- [ ] B9. Mark the Trailhead, the three destinations, base camp, the waterfall, the register box.
- [ ] B10. Pictures: whole map; the opening wide view on a 1440 by 900 screen in both candidate framings (Open 4); the phone's opening slice; the close view at the Trailhead; round 3's map beside the new one.
- [ ] B11. Check the law: walk the map west to east and name every pair of neighbours; none is unbelievable. Check the four kinds of mountain: nothing else on the skyline.
- [ ] B12. A page like `plan/skyline-pick.html` showing the pictures, with the weak points listed honestly.
- [ ] **STOP 1.** Tag `pixel-r4-blockin`, publish, ask TJ: is the Legacy Range in or out, the opening frame, anything to move.

### C. The skyline, drawn for real

- [ ] C1. Crest rock, snow and ice treatment settled on one peak first: dark rock, snow on ledges, bare blue ice with crevasses in the cirque, a bergschrund line. Reuse `glac`, `snow` and rock ramps.
- [ ] C2. The ordinary crest peaks, west of and east of the Spires, each different, building toward the Spires.
- [ ] C3. Sideproject Spires: six summits, hanging ice between them, snow gullies, buttresses, the cirque.
- [ ] C4. The Spires' valley glacier: blue ice, crevasse fields, an icefall, a moraine on each side, a milky stream from its toe.
- [ ] C5. `makeMassif`, the summit flags and the name tag follow the new Spires (`done=spires` puts the flag on the right summit).
- [ ] C6. Mount Monolith: glaciers named in the code by position, at least two icefalls with seracs, cleavers, the summit's three bumps, rock bands, a blue shadow side.
- [ ] C7. Its forested foothills in three rows, darkest nearest, and the parkland's upper edge meeting them.
- [ ] C8. The Legacy Range (if kept): pale, two or three ridges, mist across its foot.
- [ ] C9. Enchantments peaks behind Proficiency Peak: three or four granite summits of different shapes, one small blue-ice glacier high up, a snow gully.
- [ ] C10. Pine foothills thinning to the Palouse hills: rolling, yellow, soft shadow lines, no stripes.
- [ ] C11. The crest fades east into granite without a seam; the snow line rises eastward.
- [ ] C12. Dusk on the whole skyline: alpenglow on Mount Monolith and the Spires' tips, night sky above.
- [ ] C13. Delete what is gone: The Stack's sprite and talus, the lone cone behind the lake, the old towers, the pale triangles, the granite needles.

### D. The ground, tiers and plants

- [ ] D1. `ground()` re-laid for the new places of every biome, each thinning into the next across a wide uneven band.
- [ ] D2. The upper bench: its rock step, shaded face, a lip of grass.
- [ ] D3. Reflection Lake on the bench, with the island; a faint mirror of the volcano on its surface.
- [ ] D4. The waterfall: white water over the step, a plunge pool, mist at its foot, moving.
- [ ] D5. The river from the pool to the sea: the footbridge a few paces below the fall, the notch through the bluff, the channel across the beach (round 3's work, moved).
- [ ] D6. Parkland: fir clumps, heather, dense flowers in drifts (lupine blue, paintbrush red, white), a few boulders.
- [ ] D7. The Trailhead meadow and the headwall below the glacier: moraine, rock step, the shelf with base camp's tents.
- [ ] D8. Enchantments lower basin: larches in groups, slabs, the trail.
- [ ] D9. The granite headwall and its cascade between the two benches.
- [ ] D10. Upper basin: bare slabs with few cracks, tarns, sparse turf with red and gold in the seams, larches at the edge, Proficiency Peak's foot with talus and a snow patch.
- [ ] D11. Pines and aspen in a narrower band (round 3's groves, moved), then sage and the scabland benches at the edge.
- [ ] D12. The burn at half size, bottom right, blending into the pines.
- [ ] D13. Fireweed redrawn waist to chest high on him, in drifts.
- [ ] D14. The coast: bluffs in two or three stretches, beach, sea stacks, driftwood.
- [ ] D15. The rainforest's west edge: darker twisted trees, hanging moss, bare snags, fog thickening until nothing shows. No hard map edge is ever visible.
- [ ] D16. Eerie details: an owl, crows, one faint drifting light. Dusk only: pairs of eyes far back, that blink out when looked at for long.
- [ ] D17. Every sign in `spots.signs` re-homed; none in water, on ice, or hidden. List the moves in section 9.
- [ ] D18. Trails: three routes re-laid, each climbing its tier by switchbacks; dirt to rock to boot track blends as in round 3; footprints after a finished route.
- [ ] D19. `T`, `KIOSK`, the cats' boxes, the board and the register box at the new Trailhead.
- [ ] D20. The placement dice: new loops get their own start so later edits do not move earlier things.
- [ ] D21. Trees switch still hides every tree; Mist and Clouds switches still work.
- [ ] D22. `./bake.sh`; no stale warning; ready time measured and written in section 9 (round 3: about 0.8 s).

### E. Animals and timed events on the map

- [ ] E1. Elk herd and marmots moved into the parkland; goats in the Enchantments; sheep on the scabland; bear on some visits; squirrels, jellyfish, butterflies re-placed. Counts as in round 3.
- [ ] E2. Whale and ferry courses re-fitted to the sea's corner.
- [ ] E3. The lenticular cloud: forms over a minute, sits, thins, is gone; a few minutes clear between.
- [ ] E4. The serac fall: block, puff down a gully, rumble a moment later (`audio.js`), every minute or two, never twice in the same place running.
- [ ] E5. Rain in the west: a grey curtain drifts in from the sea, wets the forest (darker ground, rings on the lake only if it reaches it), stops at the crest, a short rainbow, gone. Every few minutes.
- [ ] E6. The tide: about three minutes out and back; wet sand band; tide pools round two sea stacks with starfish, crabs, mussels, barnacles, urchins, anemones.
- [ ] E7. One tide pool is a thing to find (tap it at low tide).
- [ ] E8. Headlamps at Dusk: six to ten lights in a line creeping up one glacier, pausing, moving.
- [ ] E9. Salmon at the waterfall: in bursts, one or two leap the fall; an osprey or eagle now and then.
- [ ] E10. Each timed event has an address switch for screenshots (as `sea=` and `bear=` do) and is listed in the kiosk's wildlife line.
- [ ] E11. Frame rate with everything on: not below round 3's table in `PROGRESS.md`.

### F. Camera, zoom and the opening

- [ ] F1. Zoom is a continuous number. Wheel and pinch change it smoothly about the pointer; no thresholds, no steps.
- [ ] F2. While the size is between whole numbers the picture is drawn at the next whole size and scaled, so nothing is reallocated per frame; name tags and tap targets follow exactly.
- [ ] F3. Debug switch: at rest, stay where let go, or ease to the nearest whole size. Both work.
- [ ] F4. Film a slow zoom all the way out and in (`frames.sh`): no jump between any two frames.
- [ ] F5. The opening wide view as agreed at STOP 1; the sign and planks do not cover the skyline's main peaks.
- [ ] F6. First movement eases in over about 2 seconds while he is already running; returning to the junction eases out.
- [ ] F7. `prefers-reduced-motion`: cuts, no eases.
- [ ] F8. Phone upright: opens on the Trailhead with the Spires above; pinch works; the sign leaves the Spires visible.
- [ ] F9. Zoom limits: out to the whole map, in to twice the travelling size.
- [ ] **STOP 2.** Tag `pixel-r4-map`, publish. The old wall, lake and camp scenes still run behind the new map (the wall recoloured to Proficiency Peak's granite, nothing more).

### G. The larch basin scene (new, side-on, on the way to Proficiency Peak)

- [ ] G1. Route: map, then this scene, then the climb. Length about 9 seconds, right to left or left to right to match the map's direction at the hand-over.
- [ ] G2. Far layers: Enchantments peaks, a blue-ice glacier, sky; Proficiency Peak growing as he nears it.
- [ ] G3. Middle: granite slabs stepping up, a tarn with a reflection, a cascade.
- [ ] G4. Near: golden larches of several ages, needles on the ground, slab underfoot, cairns marking the way.
- [ ] G5. Goats: a nanny and kid on a slab, one that watches him pass.
- [ ] G6. A gust now and then: larch needles blow across.
- [ ] G7. One thing to find (suggestion: the pika, moved here from The Stack's talus).
- [ ] G8. Day and Dusk, desktop and phone, and the cuts in and out filmed: he never stands still or sprints at a change.
- [ ] G9. Its tune and ambience in `audio.js` (`PLACES`).
- [ ] G10. Write the West Ridge pitch list (Open 3) into section 5.
- [ ] **STOP 3.** Tag `pixel-r4-larches`, publish, show TJ the pitch list.

### H. The West Ridge climb (rebuild of `wall.js`)

- [ ] H1. The ridge in profile: stepped granite rising up and right, the pitches and ledges from the agreed list.
- [ ] H2. Arrival: he walks to the two friends, ties in, waits for Space (`wait:belay`), fist bump (round 3's work, kept).
- [ ] H3. Leading: he climbs each pitch placing protection, the rope running through it to the belayer.
- [ ] H4. The anchor and belay at each ledge; the card opens when he is anchored.
- [ ] H5. Pitch 1: both followers climb at once on two ropes, a few moves apart.
- [ ] H6. Later pitches: caterpillar. The second climbs, then belays the third.
- [ ] H7. The two followers differ: speed, line, rests; write each one's habits in section 9. One of them slips once and is held.
- [ ] H8. The lead fall: he comes off, drops a short way onto his last piece, hangs, shakes out, goes again.
- [ ] H9. The offwidth or chimney pitch, climbed as one (back and feet, or arm bars), slower.
- [ ] H10. Holds are painted where hands and feet go; feet stay on ledges (round 3's fixes hold on every pitch).
- [ ] H11. Wind: cartoon lines with curls sweep across; jackets, hair and rope flap; hoods up; a friend blows on their hands. A whoosh in the sound, louder higher up.
- [ ] H12. Background far below: larches as gold dots, tarns, the basin's benches, other granite peaks; it sinks as he climbs.
- [ ] H13. The inversion: cloud gathers in the valleys from mid-height; by the top they are above a sea of cloud with peaks standing out of it.
- [ ] H14. The goat on a ledge, watching. The raven hanging in the updraft, then peeling away.
- [ ] H15. Summit: all three, high fives; the resume card as today.
- [ ] H16. Descent: three rappels of one rope, one after another, into the cloud; the round window closes to the map.
- [ ] H17. Waiting: followers climb at real pace; holding Space doubles them; the timeline can jump to any card without watching.
- [ ] H18. Stops, cues and the timeline's profile updated; the route label on the junction sign shows its real length.
- [ ] H19. Filmed end to end, Day and Dusk, desktop and phone. Total time written in section 9.
- [ ] **STOP 4.** Tag `pixel-r4-westridge`, publish.

### I. Reflection Lake

- [ ] I1. Forest: in its last third the far layers thin and the lake's turquoise shows between the trunks, brighter toward the end.
- [ ] I2. Lake scene opens on the forested shore with mist on the water, and within a few seconds the trees give way to parkland.
- [ ] I3. Parkland shore: grass and heather, flower drifts, clumps of pointed firs, a boulder.
- [ ] I4. Mount Monolith in the background, the same mountain as on the map (same outline, same glaciers), large enough for seracs and icefalls to show.
- [ ] I5. Its reflection in the lake, broken by ripples, and by his swim.
- [ ] I6. The lenticular cloud and the Dusk headlamps appear here too when they are on the map.
- [ ] I7. Island, swim, marmot, cards and finds all still work.
- [ ] I8. Day and Dusk (alpenglow), desktop and phone, cuts filmed.
- [ ] **STOP 5.** Tag `pixel-r4-lake`, publish. Settle Open 1 here if it is not yet settled.

### J. The walk to Spires base camp (new, side-on)

- [ ] J1. Part one, the traverse: a narrow trail across a steep flower slope; the valley, river and Trailhead far below; a stream to hop; a snow patch to cross; marmots.
- [ ] J2. The Spires and their glacier grow ahead through the whole of part one.
- [ ] J3. Part two, the moraine: he walks its grey crest; blue ice and crevasses close beside him; the icefall ahead; meltwater sounds.
- [ ] J4. Arrival at camp on the shelf: tents, Kayti painting, the goats on the rock out on the ice (round 3's work, kept).
- [ ] J5. Base camp's backdrop redrawn as the new Spires; the six name tags and flags sit on the right summits.
- [ ] J6. One thing to find on the walk.
- [ ] J7. Day and Dusk, desktop and phone, cuts filmed, tune and ambience.
- [ ] **STOP 6.** Tag `pixel-r4-spireswalk`, publish.

### K. The six climbs (needs Open 1 settled)

- [ ] K1. Write the six agreed designs into section 5, each as three or four named stretches.
- [ ] K2 to K7. One item per summit, in `SPIRES` order: built, about 30 seconds, its summit object and find kept (weather station, server rack, weight bench, binoculars, world tree, cairn), filmed, Day and Dusk.
- [ ] K8. No two climbs share a stretch drawn the same way. Lay one frame of every stretch on one sheet and check.
- [ ] K9. The glissade back to camp still ends each one.
- [ ] K10. Round 3's ice climbing, storm, rack and binoculars work carried over where they fit.
- [ ] **STOP 7.** Tag `pixel-r4-spires`, publish.

### L. The Trailhead, the page and the words (needs Open 2 settled)

- [ ] L1. The register box on a post at the Trailhead; one click opens the register for reading.
- [ ] L2. Its note says how to earn a signature; its post shows progress.
- [ ] L3. Signing unlocks by the agreed rule; the mock keeps entries in the browser only and says they wait for TJ's approval.
- [ ] L4. The register leaves the trail map sheet, or stays as a link to the same thing (ask at STOP 7).
- [ ] L5. Every "About Lake" and "The Stack" in `content.js`, `app.js`, name tags, cards, finds, hints, addresses (`#name`) and the plain page renamed; old addresses still land somewhere sensible.
- [ ] L6. The junction sign's three planks: new names, real distances.
- [ ] L7. The trail map sheet: new map picture, dots on the new places (`DOTS` in `app.js`).
- [ ] L8. The kiosk's lines (wildlife, finds, hints) match the new world.
- [ ] L9. The list of things to find: every one still findable; new ones added; "Clear my flags" clears them.

### M. Whole-site checks before the last stop

- [ ] M1. Every route end to end, Day and Dusk, desktop and phone, no errors in the console.
- [ ] M2. Every scene at least as good as the same scene in round 3; put back anything worse.
- [ ] M3. Colours used, of 254. Ready time. Frame rates. All in section 9.
- [ ] M4. The off-route page, a broken scene (`break=forest`), and a scene that fails to load still behave.
- [ ] M5. `IDEAS.md` pruned and current. No em dashes anywhere. `PROGRESS.md` gets a short round 4 report: done, weak, changed my mind about, every link.
- [ ] **STOP 8.** Tag `pixel-r4-final`, publish.

## 8. Steps

| Stop | Tag | Artifact | Date |
|---|---|---|---|
| Round 3, for comparison | `pixel-r3-final` (to be made, A2) | https://claude.ai/artifact/EcPQ1pDmeJQvZEqSHtgEF1 | 2026-11-15 |

## 9. Calls made in round 4

(One line each, newest last.)
