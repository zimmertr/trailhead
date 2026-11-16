# Round 4: the map re-laid as its own Washington

Status: **TJ said "begin" on 2026-11-15.** Work the checklist in section 7 from the first unticked item; stop at every STOP.

This file is written so that someone with no memory of the conversation can do the work. Read all of it once, then work the checklist from the top.

## 0. Checkpoint: Fable hands over to Opus (2026-11-15)

**Tag `pixel-r4-checkpoint-fable`** marks the last commit made by Fable. TJ switched to Opus here and asked for a checkpoint he can come back to with Fable if he does not like what Opus does.

- **Where Fable left off.** STOP 2a is closed: the game runs on the new land (section 8a), TJ said the land is right and chose opening view B. Checklist sections C7 to C9, C19 and C20 are still open (mountain drawing, deleting `terrain.js`, the bake). Next in order is section D (what grows and stands on the land), then E (animals and timed events), then F (camera, zoom and opening view B).
- **What Fable was doing at the handover.** Reading `www/critters.js` to plan section E. TJ prefers animals placed by rule over positions written as numbers (section 8a). `critters.js` already has a `walker` with a rule for where each kind may go; the numbers live in `spots` (start positions), `SEA`, the mist's box (`W.mist`) and `FLOCKS`. The drawings for the ferry, whale, sheep and squirrels are still inside `buildTerrain` in `terrain.js` and must move out first.
- **Where Opus works.** On a new branch, `pixel-round4-opus`, cut from this tag. `pixel-round4` stays exactly at the checkpoint, so nothing ever needs a force push.
- **To keep Opus's work:** fast-forward `pixel-round4` to `pixel-round4-opus`.
- **To go back to Fable's checkpoint:** start the next session on `pixel-round4` (it is still at the tag) and ignore `pixel-round4-opus`. Read this section, then section 8a, then work the checklist from the first unticked item.
- Artifacts at the checkpoint: the game https://claude.ai/artifact/WVKKSA9g8uC5PDePJhjXnk, the opening views https://claude.ai/artifact/XsZEi9AqXxgXo9FNgHm9LP, the land https://claude.ai/artifact/KJ2YvMaK4V8pLyoSSJxmGa. All of them are frozen: never publish over them.

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
- `terrain.js` (round 3's map) was deleted in C19. `land.js` builds the map; `mapfauna.js` (ferry, whale, bighorn, squirrels) and `scenery.js` (blob trees, sea stacks, sage, charred trunks) hold the drawings that came out of it.
- `world.js`: the map scene (`makeWorld`), drawing order, taps, name tags, the night sky pinned to the world (`scr.sky`).
- `critters.js`: everything on the map that moves (animals, whale, ferry, mist, surf, birds). `cats.js`: the two cats. `fauna.js`, `sprites.js`, `people.js`, `tj.js`: drawings.
- `forest.js`, `lakeside.js`: the side-on scenes of the lake route, built on `side.js` (`Strip`, `drawStrip`, `shell`). `wall.js`: the climb of The Stack. `camp.js`: base camp. `climb.js`: the six summit climbs. `offroute.js`: the 404.
- `pixel.js`: the scene manager: `ROUTES` (lists of legs), stops and cards, the round-window cut between scenes, zoom, pace, input.
- `app.js`, `index.html`, `content.js`: the page round the canvas (signs, cards, timeline, trail map sheet, debug panel) and every word shown. `audio.js`: tunes and effects, all synthesised.
- `land.js`: the round 4 map with a height at every spot (sections 4a and 8a). `relief.html` + `relief.js` show it whole: `relief.html?labels=1&trees=0&crop=x,y&scale=k`. `window.__dbg(x, y)` tells what is drawn at a screen pixel.

**How to run and look** (everything in Docker; nothing is installed or run on the workstation)

- `./shot.sh <name.png> '<query>' [w] [h] '<steps>' [dpr]` saves `out/<name.png>`. Steps are separated by **semicolons**: `wait=600;key=Space;wheel=720,300,600;drag=x0,y0,x1,y1;click=<css>;shot=<name.png>;down=Space;up=Space;eval=<js without semicolons>`. `'@relief.html?...'` loads another page. Queries: `route=lake|stack|spire:<id>`, `p=0..1`, `dusk=1`, `debug=roam,-trees,-mist`, `bear=1`, `sea=<seconds>`, `done=lake,stack,spires`. Warnings and errors from the page are printed.
- `./sheet.sh <out.png> <columns> <cell width> <files in out/...>` lays pictures side by side (`CROP=x,y,w,h` to crop).
- `./frames.sh` films a sequence into one sheet (usage at the top of the file).
- `./bake.sh` works the ground out ahead into `www/ground.png`. Run it after any change to `land.js` or the palette. The page prints "ground.png is missing or no longer matches the map" on localhost when it is stale; treat that warning as a failed check.
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
- Multi-pitch with three: **the first pitch with both followers climbing at once on two ropes; later pitches caterpillar style** (the leader belays the second up, the second belays the third), as they really climbed it.
- **The black-haired man leads every pitch**, as he did when they really climbed it. TJ led nothing that day, so he and the red-haired woman follow. (TJ first asked for random turns, then offered this if it made the scene simpler to build. It does: one set of leading, cam-placing, anchor-building and falling drawings instead of three, the same climb on every visit so pictures can be compared, and the card always opens at the same moment.) The lead fall on the slab is the black-haired man's. The builder's call, for TJ to veto: on the caterpillar pitches TJ climbs second and then belays the red-haired woman up, so the card opens sooner and he is seen doing a climber's work; she comes last and takes the pieces out. A card opens when he is tied in at the belay.
- **Protection is drawn.** On every pitch the leader stops at several points, plugs a cam into the crack, and clips the rope to it. Tiny as they are, show the cam in the crack, the sling, and a carabiner round the rope at each piece. The followers take the pieces out as they pass (the last one up cleans the pitch).
- **The rope behaves like a rope.** Never one straight line: it runs from the belayer up through each carabiner in turn, changes direction at every piece, hangs in a shallow curve under its own weight between pieces, hangs slack below a leader who has just clipped, and comes tight on a fall or when a follower is held.
- **Every belay is a real multi-piece anchor**, built by the leader on arrival before anyone is brought up: a slung horn where the route has one (pitch 2), elsewhere two or three cams in a crack, the pieces joined to one master point and backed up to each other. Each climber at the stance is tied in to it.
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

## 4a. The map after the block-ins (2026-11-15)

**Where this section differs from sections 4 and 6, this section wins.** TJ picked layout 1 of the second block-in, gave notes on its second pass (tag `pixel-r4-relief2`, picture `plan/relief2-r4.html`), and said to stop blocking in and build it for real.

**How the map is made now**

- The land has a height at every spot. `u` runs west to east (0 to 1920). `v` runs away from the camera (0 at the bottom of the picture, 740 at the back). `h` is the height. A spot is drawn at screen (`u`, `1080 - v - h`), nearest first, so a slope in front hides what is behind it.
- The mountains are land that the ground climbs into. There is no flat ground with a skyline behind it any more. Everything in sections 4 and 6 about "the skyline" and "the ground line" now means the land at the back of the map.
- The working code is `www/land.js` (section 8a). Layouts 2 and 3 of the block-in are deleted; tag `pixel-r4-relief2` has them.

**Decided with TJ on the second pass**

1. **The Trailhead moves down into the middle of the big meadow**, to about `u` 1075, `v` 310 (screen about 1075, 760), where the two streams joined in the second pass. It stands on a low, broad rise with a shallow valley on each side. The meadow is no longer one empty sheet.
2. **Two river systems, and the Trailhead stands on the divide between them.** West: the lake's outflow and the glacier's meltwater join and run through the rainforest to the sea. East: the creek out of the granite basins runs south-east through the aspens and pines, then cuts down into the dry corner as a coulee and leaves the map. TJ: "a couluee through the desert as it exits the meadow. Like the COlombia river gorge."
3. **Water takes the lowest ground.** No stream is a smooth arc through chosen points. Each is routed downhill over the heights (the standard way: every spot drains to its lowest neighbour, hollows are filled so no stream dead-ends, and a river's width comes from how much land drains into it). On flat ground it wanders, and the meadow gets at least one oxbow. If a routed river looks wrong, change the land, not the line.
4. **The crest is one connected mass.** The two free-standing cones beside the glacier are gone. The Spires' wall sends an arm down toward the camera on each side, and the glacier lies in the bowl between the arms. The west arm falls to a forested saddle that joins Mount Monolith's flank. The east arm runs into the rim of the granite basins. The meadow does not reach the foot of the wall.
5. **The glacier belongs to its wall.** Snow gullies run up the wall to the notches between summits. There is a gap where the ice meets the rock. Lower down the ice breaks over a rock step in an icefall, then runs out as a crevassed tongue between two moraines to a milky tarn at its toe. Base camp sits on the moraine shelf beside that tarn.
6. **The Spires' country shows what he will cross in the scenes.** From the map you can point to: the steep flower slope of the traverse (on the west arm, high above the meadow), the moraine crest of the walk, the icefall (TJs-Kubernetes-Service), a snow gully (hevy-garmin-sync), the crevassed tongue (Kubernetes-Manifests), a knife-edge between two summits (trailhead), a dry rock rib on the east arm (yggdrasil), and the west end summit standing clear on the wet side for the weather window (Bluebird Forecast).
7. **The Legacy Range stays and is larger.** It is a broad massif with several summits and glaciers (after Mount Olympus), never one clean pyramid, which read as a second volcano. Smaller peaks stand in front of it and around it. The rainforest runs up toward it through the valley between it and Mount Monolith, in ranks of forested foothills. The bare green hill of the second pass was a mistake and is gone. Nothing between the two mountains may look taller than Mount Monolith.
8. **Nearly one rock along the whole crest.** The granite is the same grey family as the rest, one step paler and cleaner, and the change is gradual. The difference the eye reads is snow and ice, which thin out toward the dry east. The tan of the second pass is gone. The back row of snowy peaks is close to right (TJ: "finally starting to look good and Cascadian").
9. **The granite country is three steps.** Larches grow only from the second step up (they are high-country trees). The first step has aspens and ponderosa pines. Proficiency Peak stands on the second step and must stand clear of the range behind it.
10. **More tarns, coloured by height.** Six to eight, most of them strung on the one creek, a few off it. The highest are milky teal and green, the middle ones turquoise, the lowest clear blue.
11. **The burn moves to the east edge**, across the east end of the first step under the basin's cliff (about `u` 1770 to 1920, `v` 400 to 540), running off the edge of the map. Tall fireweed as before.
12. **The dry country is one slanted corner at the bottom right** with a wandering edge. No country on this map is an even band or a rectangle. TJ: stacked sections make "the world look fake and computer gnerated".
13. **The fog** covers all of the rainforest, from nothing in the east to only white in the west, and lies over the beach and sea at the west edge. Rules could not make its ranks of trees (tried four times). They are drawn ridge by ridge.
14. **The opening view is not decided.** TJ could not choose until the world is right. Candidates are shown on the real map at STOP 2a.

**Starting numbers** (world `u`, `v`; tune by eye)

| What | Where |
|---|---|
| Sea | bottom-left corner, as in `relief.js` |
| Legacy Range | back left, `u` 0 to 380 |
| Rainforest valley toward it | `u` 300 to 480, `v` 450 and beyond |
| Mount Monolith | centre `u` 640, `v` 600; about 600 wide at the foot, 262 high |
| Reflection Lake, on its bench | `u` 640, `v` 440 |
| Sideproject Spires | centre `u` 1070, `v` 648; highest summit about 210 high |
| Glacier | `u` 1070, `v` 510 to 620; icefall near `v` 570 |
| Base camp, milky tarn | `u` 1098, `v` 496 |
| Trailhead, on its rise | `u` 1075, `v` 310 |
| West river | from the lake's fall and the glacier's toe, joining west of the Trailhead's rise, to the sea |
| East creek and coulee | from the top granite step, east of the Trailhead's rise, out through the dry corner |
| Granite steps | top `u` 1745, `v` 598 (82 high); second `u` 1471, `v` 574 (58 high); first `u` 1446 to 1712, `v` 480 to 492 (about 30 high) |
| Proficiency Peak | `u` 1430, `v` 594; 164 wide, 142 high |
| The burn | `u` 1770 to 1920, `v` 400 to 540 |
| Dry corner | bottom right, edge slanting from about (1380, 0) to (1920, 430) |

## 5. Settled after the first draft of this plan (2026-11-15), and what is still open

**The six Spires climbs (settled).** The visitor still picks a summit from base camp. Each climb is about 30 seconds, a different kind of mountaineering chosen to echo its project, and TJ wants every one "unique and intentional". None may reuse another's set piece.

| Summit | The climb | On top (kept) |
|---|---|---|
| Bluebird Forecast | **A weather window.** He starts in cloud on a snow ridge in **a lot of wind, with rime ice drawn on the rock and on him**, climbs through the cloud deck; the wind drops as the window opens, and breaks out into a clear blue sky above an inversion. The bluebird circles the summit and flies off the picture. | Weather station |
| TJs-Kubernetes-Service | **The icefall with ladders.** Aluminium ladders across crevasses, a snow bridge, leaning seracs of fractured blue ice, two steps of steep ice climbed with tools (round 3's ice climbing). Many pieces that must all hold. | Server rack, the BANG |
| hevy-garmin-sync | **A snow gully climbed like a workout.** A long steep gully kicked in sets: a burst of steps, a rest leaning on the axe, breath showing, the foot that slips and is kicked in twice more. His watch beeps on top. | Weight bench |
| trailhead | **An exposed rock knife-edge.** A narrow crest with air on both sides and the whole map spread out below. He walks it, straddles it, walks again. | Coin-operated binoculars, the round view |
| yggdrasil | **The via ferrata.** Dry rock, no snow: iron rungs, a ladder and a cable up a rock tower. He wears a via ferrata kit with **two lanyards and is seen using them the whole way**: at every anchor he unclips one, clips it past the anchor, then moves the other. TJ: the world tree looked wrong on a snowy peak; on dry rock it belongs. | The world tree |
| Kubernetes-Manifests | **The crevasse maze in a whiteout.** The storm blows in by stages (round 3's storm) over a broken glacier. He finds his way wand to wand: a dead end, a jump, a sagging snow bridge. It clears slowly near the top. | Cairn |

Not used, kept in `IDEAS.md`: the single great ice face, racing a storm, an alpine start by headlamp, running a ridge fast and light, a strength scramble, a trail all the way up, a rock tower by its chimney, and linking summits along the ridge.

**The trail register (settled in outline; one point to confirm).**

- A wooden register box on a post at the Trailhead, after TJ's reference photos (a hinged lid that folds down into a desk, a book on a clip, a pencil on a string).
- One click on the box and the screen changes to a close-up, as its own small scene: the open box and the book filling most of the screen.
- **The right-hand page** lists earlier visitors' entries. **The left-hand page** is blank, for this visitor to write on, free-form.
- Writing: handwriting for everyone, **in several different hands and inks** (blue pen, black pen, pencil), chosen per entry so the page looks signed by many people. Only the form's printed lines and headings use the sign font. Handwriting fonts must stay readable at a phone's width.
- **Reading is open to everyone at once. Signing is earned**: the book tells the visitor that to sign they must complete the site (TJ: it rewards using the website as intended, "gamifying learning about me"). Until then the left page shows what is still to do, and the box's post shows three small flags filling in.
- **Confirmed by TJ:** "complete" means the three challenges: the lake, the peak, and Sideproject Spires, where **one summit is enough**, not all six.
- In the prototype the book is a browser-only mock with sample entries; a new entry is kept in this browser and marked as waiting for TJ's approval. The real service is https://github.com/zimmertr/trailhead/issues/3 (plain text, no contact details asked for, every entry approved by TJ before it shows).
- It replaces the register that hides in the trail map sheet today.

**The West Ridge pitch list (checked against the sources and confirmed by TJ on 2026-11-15).**

TJ's answers: five pitches, as the topo; the lead fall on the slab; the last pitch by the off-width, then the left chimney and the hole; on the north side the climbers go out of sight and come back.

The sources: https://www.mountainproject.com/route/105808527/west-ridge, https://www.shane.st/trip-reports/prusik/, https://www.summitpost.org/prusik-peak-west-ridge/206568, https://www.francisbaileyh.com/2022/09/29/prusik-peak/, https://stevensong.com/usa/washington/prusik-peak/. Der Sportsman (https://www.mountainproject.com/route/107641573/der-sportsman) is the hard south-face route TJ has **not** climbed; it is for the look of the wall only.

An Opus subagent read four of the five (SummitPost refused the request; Mountain Project's comments and 25 of its 37 photographs could not be reached) and looked at about a hundred of their photographs. **Its full report is `plan/west-ridge-beta.md`: every fact there carries its source, and it describes each pitch's rock, belay and view. Read it before drawing a pitch.** Below, "(topo only)" marks a thing that is on TJ's hand-drawn topo and in no other source.

The scene looks at the ridge from the south, so wherever the route goes to the north side of the crest the climbers pass out of sight behind it, and the rope is seen running over the crest until they come back.

| Pitch | The real pitch | In the scene |
|---|---|---|
| Approach | From Prusik Pass, round a bump on its north side, then a scramble up a low knob of lichen-black blocks and knee-high dwarf pine to an overhanging rock at the foot of the ridge, where parties leave their packs and change shoes. A balanced rock and a start tree (both topo only). | He walks in with the two friends past the balanced rock. The packs go under the overhanging rock. Tie in at the tree, wait for Space, fist bump. |
| 1 | Long, nearly a full rope, 5.6. A crack in a band of unusually white rock, then blocky ground, then an awkward flaring off-width. It ends under a roof of stacked square blocks. | The black-haired man leads, placing cams, and fights the off-width (slower, an arm in the crack). **Both followers climb at once on two ropes** of different colours. Anchor: a block wrapped in old faded slings, backed up with two cams. Belay: card 1 (Platform Engineering). |
| 2 | Short. Stem a corner between rounded blocks, pull a short roof, down-climb to a flat trail on the north side, climb back up to the south side, then a stride from one boulder onto a flat block that juts over the drop (the topo's "big step"). It ends on a broad flat platform at the foot of the slab. | Quick pitch, no card. The leader stems wide, pulls the roof, drops out of sight behind the crest and reappears for the step. Anchor: the two horns on the platform, slung and tied together (TJ's slung-horn photo). From here on **caterpillar**: the leader brings up TJ, and TJ brings up the red-haired woman. |
| 3 | The slab, 5.7, the crux of the route: about 6 m of tilted pale face whose left edge is an arete. An old rusty piton at its foot, then nothing to place until a big hold at the top (the topo's "mercy hold"). Then the "sidewalk" and a down-climb with great exposure, to a belay at a flake (the flake is topo only; other parties run this pitch on into the next). | He clips the piton and backs it up with one tiny cam. **The lead fall happens here**: high on the slab the black-haired man skates off, slides, the rope comes tight on the piton and its backup, he hangs, shakes out and goes again. Anchor: three cams in the crack beside the flake, joined to one point (TJ's three-piece photo). Belay: card 2 (Site Reliability Engineering; the fall that was caught). |
| 4 | Long and wandering, easy and very exposed. A huge egg-shaped boulder balanced on the crest, which climbers edge round hugging it. Knife-edge fins taken "au cheval" (astride). A slabby down-climb. Then a grassy walk to a big ledge. The topo's "hidden foot ramp" on the north side is in no source. | Each of them hugs their way round the egg boulder, then straddles the fins in the wind. Only two pieces go in; the rope draped over the fins is the rest of the protection. The inversion has formed below. Anchor: a slung horn, a cam and a nut. Belay: card 3 (Software Engineering). |
| 5 | A short scramble to the headwall, where the rock turns pale cream. A thin finger crack (5.8) in an open-book corner capped by a square block, or an off-width beside it. A big hold at the lip, with one lone bolt. A lieback flake to a cramped perch. Then two chimneys: the topo takes the left one, "through the hole to be birthed to the summit". | **The off-width** up the pale headwall (TJ's choice over the finger crack): arm bars and a knee in the crack, slow, big cams. The mantle at the lip, the flake, then **the left chimney**: back and feet, then each squeezes up through the hole. Summit: a small pile of big blocks with deep slots between them. Two stand on the top boulder, one sits just below; high fives; the resume card. |
| Descent | Rappels down the north face (three, four or five, depending on the ropes), the first down a chute. A flake that eats ropes (topo; one party's rope did stick on the first pull). A walk west along the north side back to the packs. | All three zip down the first rappel one after another into the cloud; the round window closes to the map. |

Which follower slips, and on which pitch, is the builder's call (not the same moment as anyone else). The goat watches from a ledge near the start; the raven hangs in the updraft beside pitch 4. Neither is on the route in any photograph: they are there because TJ asked for them.

What the report adds to the look:

- **Two kinds of rock.** The lower ridge (pitches 1 to 4) is dark grey granite blotched with black lichen, with lime-green and rust patches: rounded boulders, tilted slab panels, stacked square blocks, grass tufts and dwarf pine in the cracks. The upper tower is much paler, cream to light grey, with long vertical cracks and flat cap blocks. Pitch 1's crack sits in a band of almost white rock. Build these from ramps that exist (the colour limit).
- **The profile from the south**, left to right: a low dark shrubby bump, a run of gendarmes and stacked boulders (the roof, the slab, the egg boulder, the fins), then the sharp pale summit spire. A darker jagged ridge carries on to the right.
- **The season** in the best photographs is late September, golden larches on grey granite: the season already chosen for the basin.
- **The people.** The builder's call, for TJ to veto: all three wear helmets on the climb, one colour each, with their hair still showing below so they can be told apart. The leader's rack hangs from his harness. The two ropes on pitch 1 are two colours (green and orange in the photographs).
- **Parties of three in the sources** do it both ways: one party's followers climbed together on two ropes, another's came up one at a time. That matches the plan (together on pitch 1, one at a time after).

**The opening frame (direction given).** TJ: it need not start all the way out; it can be cropped, with the rest of the world found later. Show two or three candidate framings in the block-in and let him pick with pictures.

**Still open**

1. (Settled 2026-11-15: the West Ridge pitch list. The things marked topo only are kept as the topo draws them. The helmets are still the builder's call for TJ to veto.)
2. Whether the Legacy Range stays (decided at STOP 1).
3. Which opening frame (decided at STOP 1).

## 6. Starting numbers for the block-in (tune them by eye)

**Superseded by the table in section 4a.** Kept as the record of the first, flat block-in.

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

- [x] A1. TJ has said to begin.
- [x] A2. Tag round 3's end: `pixel-r3-final` on `0138c2e`, pushed.
- [x] A3. Save round 3 reference pictures into `out/r3/`: whole map (`@plan.html`), first screen desktop and phone, Day and Dusk, one frame of each scene and each climb.
- [x] A4. Add a "Round 4" pointer to this file at the top of `PROGRESS.md`.

### B. Block-in (shapes, sizes and places only; flat colour is fine)

- [x] B1. Study the references before drawing: Rainier from the south and from Reflection Lakes, Glacier Peak from Image Lake, the Southern Pickets, Prusik Peak's south face, the Olympics from the west. Write five lines per mountain in section 9 on what makes its outline recognisable.
- [x] B2. Make the map 1920 wide, leaving round 3's map untouched. (Done another way, see section 9: the block-in is its own page, `www/plan4.html`, painted by `www/plan4.js` from the numbers in `www/layout4.js`.)
- [x] B3. Block in the skyline: Legacy Range, gap, Mount Monolith, crest, Spires, Enchantments peaks, pine hills, Palouse.
- [x] B4. Mount Monolith's outline reads as Rainier, not Fuji: lopsided, flat-topped, shoulder left, tooth right. Check it alone at three times size.
- [x] B5. The Spires' outline: six uneven broken summits, none a clean point, joined to the crest on both sides.
- [x] B6. Proficiency Peak as a standing shape in the upper basin, after the reference photo.
- [x] B7. Block in the ground: sea corner, bluffs, rainforest with the fog edge, the bench with lake and parkland, waterfall step, Trailhead meadow, glacier headwall and shelf, two Enchantments benches, pines, burn, sage and scabland.
- [x] B8. Draw the three trails and the river as lines, with where each tier is climbed (switchbacks) and where each side-on scene takes over and hands back.
- [x] B9. Mark the Trailhead, the three destinations, base camp, the waterfall, the register box.
- [x] B10. Pictures: whole map; the opening wide view on a 1440 by 900 screen in two or three candidate framings, some cropped (section 5); the phone's opening slice; the close view at the Trailhead; round 3's map beside the new one.
- [x] B11. Check the law: walk the map west to east and name every pair of neighbours; none is unbelievable. Check the four kinds of mountain: nothing else on the skyline.
- [x] B12. A page like `plan/skyline-pick.html` showing the pictures, with the weak points listed honestly.
- [x] **STOP 1 (closed 2026-11-15: TJ said to move on from block-ins and signed off building layout 1 with the changes in section 4a; reached 2026-11-15; TJ's answers sent the block-in round again, see section 9; three layouts shown and TJ picked layout 1, the land climbs; its second pass is shown and waits for his word that the layout is right).** Tag `pixel-r4-blockin`, publish, ask TJ: is the Legacy Range in or out, the opening frame, anything to move.

### C. The land and the water, in the game

Section 4a is the brief. Round 3's `terrain.js` stays untouched until C19, so the old game keeps running beside the new map.

- [x] C1. `www/land.js`, made from layout 1 of `relief.js`. It returns what `buildTerrain` in `terrain.js` returns (the ground picture, things, spots, trails, mist mask and the helpers the other modules call), plus the depth of every screen pixel and `hAt(u, v)`.
- [x] C2. The Trailhead's rise and a shallow valley on each side of it. Check with trees off.
- [x] C3. The connected crest: the two arms, the bowl between them, the saddle to Mount Monolith, the join to the granite rim. Check with trees off: no free-standing cone, no meadow at the foot of the wall.
- [x] C4. The glacier: gullies to the notches, the gap at the rock, the icefall over its rock step, the crevassed tongue, a moraine each side, the milky tarn, camp on the moraine shelf.
- [x] C5. The Spires: six summits at the heights in section 9, not daggers. The ground of each of the six climbs is placed and can be pointed to (4a, point 6). List the six places in section 9.
- [x] C6. The flower slope of the traverse and the moraine crest of the walk, with the trail drawn on them.
- [x] C7 (done as Q4). Mount Monolith: lopsided dome, three bumps on a nearly flat top, a shoulder on the left, a dark tooth on the right, cleavers between glaciers, at least two icefalls. Its rock foot runs into forested foothills, not a cliff on a lawn.
- [x] C8 (done as Q5). The Legacy Range: a several-summit massif with glaciers, smaller peaks round it, ranks of forested foothills in front, the rainforest's valley leading to it.
- [x] C9 (done as Q5). The back row of the crest, each peak different. Rock nearly one colour from west to east, the snow thinning eastward with no seam.
- [x] C10. The three granite steps and their cliffs. Proficiency Peak on the second, standing clear of what is behind it.
- [x] C11. The dry corner and the coulee: basalt walls in steps, the creek in its floor, the way out of the map.
- [x] C12. Water routed over the heights: both river systems, wider below each joining, wandering on the flats, one oxbow in the meadow, falls where a stream leaves a step. No smooth arcs.
- [x] C13. Six to eight tarns on the granite steps, coloured by height.
- [x] C14. The coast: bluffs, the river's notch, beach, sea, fog over the water at the west edge.
- [x] C15. `world.js` runs on it. Things and the runner are drawn in order of depth and are hidden where nearer ground stands in front. The helpers other modules call with screen positions (`coast`, `lakeD`, `forestAmt`, `open`, `nearTrail`) answer through the depth picture.
- [x] C16. The mountain sprites in `world.js` (`makeStack`, `makeMassif`, `makePeak`) are retired: the mountains are in the ground picture. Summit flags and name tags take their places from `land.js` (`done=spires` puts the flag on the right summit).
- [x] C17. Three trails from the new Trailhead, laid on the land: a footbridge wherever a trail crosses water, switchbacks up each step, and the points where each side-on scene takes over and hands back.
- [x] C18. `T`, `KIOSK`, the cats' boxes, the board and the register box at the new Trailhead.
- [x] C19. Delete what is gone: `terrain.js`, the first block-in (`plan4.js`, `layout4.js`, `plan4.html`), layouts 2 and 3, The Stack's sprite and talus.
- [x] C20. `./bake.sh` bakes the ground and the depth. No stale warning. Ready time written in section 9 (round 3: about 0.8 s).
- [x] C21. Pictures: the whole map Day and Dusk, trees off, each destination close, three candidate opening views on a 1440 by 900 screen and the phone's slice. Compare with `out/r4/w1.png` and list the weak points honestly.
- [x] **STOP 2a (reached 2026-11-15 with C7 to C9, C19 and C20 still open, see section 8a; TJ: the land is right, carry on; opening view B, one screen pixel to one map pixel with the three destinations in frame, `out/r4/o-b.png` is `relief.html?crop=330,180` at 1440 by 900).** Tag `pixel-r4-land`, publish the game (the old wall, lake and camp scenes still run behind the new map). Ask TJ: is the land right, and which opening view.

### Q. Quality pass (TJ, 2026-11-15: the game looked "half baked" beside round 3; do these before anything else)

Round 3 is the bar. Before ticking each, put the same view of round 3 (`out/r3/`, or a fresh render from tag `pixel-r3-final`) beside the new one with `./sheet.sh` and look. Anything worse than round 3 is fixed, not ticked.

- [x] Q1. Round 3's ground detail on the new land: grass texture, tufts, flower clumps with stems, forest floor, river glints, boulders, bushes, slabs, sage, ferns, logs, gold maples, sea stacks, driftwood, the island, the lake's mirror, tree shadows.
- [x] Q2. Fog trees are the forest's own spruce and firs, paled by the fog rank by rank. Shores round the lake and tarns.
- [x] Q3. The moving mist is back (it was switched off without asking): `W.mist` from `land.js`, the wisps and the sea fog re-fitted to the new coast and forest instead of round 3's fixed rows. The Mist switch works.
- [x] Q4. Mount Monolith drawn properly (C7): rock, snow, glaciers, cleavers, icefalls and shading at round 3's level, not flat stand-in colour.
- [x] Q5. The Legacy Range drawn properly (C8) and the crest's back row (C9), the same way.
- [x] Q6. Zoom out to the whole map again (F1 and F2 brought forward, F9 if it helps): wheel and pinch go smoothly from the close view out until the whole map fits.
- [x] Q7. Side by side with round 3: whole map, opening view, Trailhead close, forest, lakeside, Day and Dusk, desktop and phone. Tag `pixel-r4-opus-quality`, publish a new artifact, write the honest list of what is still below round 3 in section 8a.

### D. What grows and stands on the land

- [x] D1. Every country re-laid on the new land, each thinning into the next across a wide, slanted, uneven edge. No bands.
- [x] D2. The rainforest and its fog: ranks of crowns drawn ridge by ridge, each rank greyer than the one in front, white in the hollows, bare snags against the white in the west. No hard map edge is ever visible.
- [x] D3. Eerie details: dark twisted maples hung with moss, an owl, crows, one faint drifting light. Dusk only: pairs of eyes far back, that blink out when looked at for long.
- [x] D4. Reflection Lake with its island and a faint mirror of the volcano. The waterfall: white water, a plunge pool, mist at its foot, moving. The footbridge a few paces below.
- [x] D5. Parkland: fir clumps, heather, dense flowers in drifts (lupine blue, paintbrush red, white), a few boulders.
- [x] D5a (TJ, 2026-11-15). Flowers and bushes are things that stand up, not dots painted on the grass: small sprites in drifts across every meadow, each swaying in the wind on its own like the ferns, hidden by the Trees switch with everything else that grows. Round 3 painted its flowers and kept its bushes still; at one screen pixel to one map pixel both read as speckle.
- [x] D6. The meadow round the Trailhead: the river's bends, the oxbow, fir clumps, room for the elk.
- [x] D6a (TJ, 2026-11-15). Every tree moves. Each is drawn every frame and sways on its own, as in round 3; none is painted into the ground because something nearer hides part of it (406 were, out of about 2,230). The fogged half of the rainforest becomes real trees too, in place of the painted rows of crowns: smaller, plainer and paler the farther back they stand. The same work gives trees a treeline and sizes by distance, the problem TJ raised round Mount Monolith (8a). Placement reads as groves and clumps with clear ground between, not an even scatter.
- [x] D7. The first granite step: aspens and ponderosa pines, no larches. The burn at its east end, blending into the pines. Fireweed waist to chest high on him, in drifts.
- [x] D8. The second step and above: larches in groups, thick low down and sparse on the slab; bare slabs with few cracks; turf with red and gold in the seams.
- [ ] D9. Proficiency Peak's foot: talus and a snow patch.
- [ ] D10. The dry corner: pines thinning to sage, scabland benches, low yellow hills at the far edge with soft shadow lines and no stripes.
- [ ] D11. The coast: sea stacks, driftwood, the river's channel across the beach.
- [x] D12. Every sign in `spots.signs` re-homed; none in water, on ice, or hidden. List the moves in section 9.
- [ ] D12a (TJ, 2026-11-15). About Lake, The Stack (Proficiency Peak) and the Sideproject Spires stand out from the world as places to go, as round 3's did: a dark outline round each, a step more colour and contrast than the land round it, and a soft lift when the pointer is over it or it is tapped. They stay part of the one world; nothing goes back to being a separate drawing.
- [ ] D13. Trail surfaces: dirt to rock to boot track blends as in round 3; footprints after a finished route.
- [ ] D14. The placement dice: new loops get their own start so later edits do not move earlier things.
- [ ] D15. Trees switch still hides every tree; Mist and Clouds switches still work.
- [ ] D16. Dusk on the whole map: alpenglow on Mount Monolith and the Spires' tips, night sky above.
- [ ] D17. `./bake.sh` again; no stale warning.

### E. Animals and timed events on the map

- [x] E1. Elk herd and marmots moved into the parkland; goats in the Enchantments; sheep on the scabland; bear on some visits; squirrels, jellyfish, butterflies re-placed. Counts as in round 3.
- [x] E2. Whale and ferry courses re-fitted to the sea's corner.
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

- [x] F1 (done with Q6). Zoom is a continuous number. Wheel and pinch change it smoothly about the pointer; no thresholds, no steps.
- [ ] F2. While the size is between whole numbers the picture is drawn at the next whole size and scaled, so nothing is reallocated per frame; name tags and tap targets follow exactly.
- [ ] F3. Debug switch: at rest, stay where let go, or ease to the nearest whole size. Both work.
- [ ] F4. Film a slow zoom all the way out and in (`frames.sh`): no jump between any two frames.
- [x] F5 (done in Q7). The opening wide view as agreed at STOP 2a; the sign and planks do not cover the skyline's main peaks.
- [ ] F5a (TJ, 2026-11-15, replacing the STOP 2a choice of opening size). The page opens closer in, at twice the size (round 3's opening size), on the Trailhead with the three destinations as near the frame as that size allows. Zooming out to the whole map still works. Round 4's one-to-one opening halved every movement and made the trees, flowers and destinations read as noise.
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
- [x] G10. Read the five West Ridge sources in section 5, photographs included, and correct the draft pitch list there. (Done 2026-11-15, before the build, by an Opus subagent: four of the five, SummitPost refused. Report in `plan/west-ridge-beta.md`.)
- [ ] **STOP 3.** Tag `pixel-r4-larches`, publish, show TJ the pitch list.

### H. The West Ridge climb (rebuild of `wall.js`)

- [ ] H1. The ridge in profile, rising up and right, with every landmark from the agreed list: the white band and its crack, the roof of stacked blocks, the jutting step block, the platform, the slab with its arete, the flake, the egg boulder, the fins, the big ledge, the pale headwall with its wide crack, the summit blocks. Lower ridge dark and lichen-blotched, tower pale.
- [ ] H1a. Where the route goes to the north side (pitch 2's trail, parts of pitch 4, the rappels) the climbers pass behind the crest and the rope runs over it; they are never lost for more than a few seconds.
- [ ] H2. Arrival: he walks to the two friends, ties in, waits for Space (`wait:belay`), fist bump (round 3's work, kept).
- [ ] H3. The black-haired man leads every pitch and has the leading, cam-placing, anchor-building, belaying and falling drawings; TJ has following and belaying drawings; the red-haired woman has following and cleaning drawings.
- [ ] H3a. Protection: on pitches 1, 2 and 5 the leader places at least three cams, each seen going into the crack, each with a sling and a carabiner that the rope is clipped through. The slab has only the piton and one tiny cam at its foot (the bare stretch above is the point of it); pitch 4 has two pieces and the rope over the fins.
- [ ] H3b. The rope: drawn piece to piece through every carabiner, sagging between them, slack after a clip, tight on a fall or a held follower. Never a straight line from belayer to climber.
- [ ] H3d. Helmets on all three, one colour each, hair showing below; the rack on the leader's harness; two rope colours on pitch 1.
- [ ] H3c. Cleaning: the last one up each pitch (the red-haired woman) removes the pieces; none are left on the rock behind the party.
- [ ] H4. A multi-piece anchor at every belay, built before anyone is brought up: pitch 1 the sling-wrapped block backed up with two cams, pitch 2 the two slung horns, pitch 3 three cams by the flake, pitch 4 a horn, a cam and a nut, the summit a block. Each joined to one master point and backed up. Check each one in a close-up. The card opens when he is tied in to it.
- [ ] H5. Pitch 1: both followers climb at once on two ropes, a few moves apart.
- [ ] H6. Later pitches: caterpillar. The black-haired man belays TJ up, then TJ belays the red-haired woman.
- [ ] H7. The two followers differ: speed, line, rests; write each one's habits in section 9. One of them slips once and is held.
- [ ] H8. The lead fall on the slab, by the black-haired man: he comes off, slides, the rope comes tight on the piton and its backup, he hangs, shakes out, goes again.
- [ ] H9. Pitch 5's off-width, climbed as one (arm bars, a knee in the crack), slower, protected with big cams; then the summit chimney (back and feet) and the squeeze through the hole. All three climb both. Pitch 1's off-width reuses the leader's off-width drawings.
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
- [ ] **STOP 5.** Tag `pixel-r4-lake`, publish.

### J. The walk to Spires base camp (new, side-on)

- [ ] J1. Part one, the traverse: a narrow trail across a steep flower slope; the valley, river and Trailhead far below; a stream to hop; a snow patch to cross; marmots.
- [ ] J2. The Spires and their glacier grow ahead through the whole of part one.
- [ ] J3. Part two, the moraine: he walks its grey crest; blue ice and crevasses close beside him; the icefall ahead; meltwater sounds.
- [ ] J4. Arrival at camp on the shelf: tents, Kayti painting, the goats on the rock out on the ice (round 3's work, kept).
- [ ] J5. Base camp's backdrop redrawn as the new Spires; the six name tags and flags sit on the right summits.
- [ ] J6. One thing to find on the walk.
- [ ] J7. Day and Dusk, desktop and phone, cuts filmed, tune and ambience.
- [ ] **STOP 6.** Tag `pixel-r4-spireswalk`, publish.

### K. The six climbs (designs are in section 5)

- [ ] K1. Break each of the six designs into three or four named stretches with a length in seconds, and write them into section 9 before drawing.
- [ ] K2. Bluebird Forecast, the weather window: cloud and rime at the start, the climb through the cloud deck, the break-out into blue sky above the inversion, the bluebird circling and leaving the picture, the weather station.
- [ ] K3. TJs-Kubernetes-Service, the icefall: at least two ladder crossings with the crevasse seen beneath him, a snow bridge, leaning seracs, two ice steps with tools, the server rack and the BANG.
- [ ] K4. hevy-garmin-sync, the gully: steps in sets with rests on the axe, breath showing, the slipping foot kicked in twice, the watch's beep, the weight bench.
- [ ] K5. trailhead, the knife-edge: walking the crest, straddling it, the whole new map far below on both sides, the binoculars and their round view (redrawn for the new Trailhead).
- [ ] K6. yggdrasil, the via ferrata: dry rock, rungs, a ladder, the cable; the kit's two lanyards drawn and moved one at a time past every anchor, never both off the cable; the world tree on bare rock.
- [ ] K7. Kubernetes-Manifests, the crevasse maze: the storm by stages, wand to wand, a dead end and a turn back, a jump, a sagging snow bridge, the slow clearing, the cairn.
- [ ] K8. Each climb runs about 30 seconds (time them), keeps its summit object and its find, and is filmed Day and Dusk, desktop and phone.
- [ ] K9. No two climbs share a stretch drawn the same way. Lay one frame of every stretch of all six on one sheet and check.
- [ ] K10. The glissade back to camp still ends each one. Round 3's ice climbing, storm, rack and binoculars work is carried over where it fits.
- [ ] **STOP 7.** Tag `pixel-r4-spires`, publish.

### L. The Trailhead, the page and the words (register design is in section 5)

- [ ] L1. The register box on its post at the Trailhead, after the reference photos; a name tag on hover; three small flags on the post that fill in as destinations are finished.
- [ ] L2. One click: he walks to it and folds the lid down, and the screen changes to the close-up of the box and the open book.
- [ ] L3. The right-hand page: earlier entries in handwriting, several hands and inks chosen per entry, on printed form lines. Readable on a phone.
- [ ] L4. The left-hand page: before the site is completed it says what is still to do; afterwards it is a blank page to write on, with the pencil on its string.
- [ ] L5. Signing opens once the lake, the peak and one Spires summit are done (section 5). The mock keeps the entry in this browser only and marks it as waiting for TJ's approval.
- [ ] L6. Closing the book returns to the Trailhead where he stood. The register leaves the trail map sheet (a link there opens the same close-up).
- [ ] L7. Every "About Lake" and "The Stack" in `content.js`, `app.js`, name tags, cards, finds, hints, addresses (`#name`) and the plain page renamed; old addresses still land somewhere sensible.
- [ ] L8. The junction sign's three planks: new names, real distances.
- [ ] L9. The trail map sheet: new map picture, dots on the new places (`DOTS` in `app.js`).
- [ ] L10. The kiosk's lines (wildlife, finds, hints) match the new world.
- [ ] L11. The list of things to find: every one still findable; new ones added; "Clear my flags" clears them.

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
| Round 3, for comparison | `pixel-r3-final` | https://claude.ai/artifact/EcPQ1pDmeJQvZEqSHtgEF1 | 2026-11-15 |
| 1, the block-in (a page of pictures, not the game) | `pixel-r4-blockin` | https://claude.ai/artifact/LDB4ivAk4ZU2EVskcN7nHj | 2026-11-15 |
| 1 again: three layouts with real height (pictures) | `pixel-r4-relief` | https://claude.ai/artifact/HkLDn3zFk3fyYgagGVWQSA | 2026-11-15 |
| 1 again: layout 1, second pass (pictures) | `pixel-r4-relief2` | https://claude.ai/artifact/SJGQUzqPa1i1RDd23pc56t | 2026-11-15 |
| Progress, not a stop: the land of section 4a built (pictures) | `pixel-r4-landshape` | https://claude.ai/artifact/KJ2YvMaK4V8pLyoSSJxmGa | 2026-11-15 |
| Working build, republished after each item (not a stop) | `pixel-round4-opus` | https://claude.ai/artifact/QzAfYnTZGZr8L8wfh1EksH | 2026-11-15 |
| Quality pass (section Q, Opus; not a stop): mist back, Mount Monolith and the ranges redrawn, zoom out, opening view B | `pixel-r4-opus-quality` | https://claude.ai/artifact/Lx1MmJoRyTzRERRHwWL28f | 2026-11-15 |
| 2a: the game runs on the new land (and the opening view candidates, `plan/opening-r4.html`) | `pixel-r4-land` | https://claude.ai/artifact/WVKKSA9g8uC5PDePJhjXnk and https://claude.ai/artifact/XsZEi9AqXxgXo9FNgHm9LP | 2026-11-15 |

## 8a. Where the build stands (2026-11-15, commit after `204dc5b`)

**Done.** The land of section 4a, in `www/land.js` (`buildLand()`), shown whole by `relief.html` (`?labels=1`, `?trees=0`, `?scale=k&crop=x,y`). It takes about 2.6 s to build in the Docker browser. It returns:

- `g`: the ground picture, 1920 by 1080, one palette entry to a pixel, mountains included.
- `depth`: for every screen pixel, how far from the camera the ground drawn there is (`v`). With the pixel's `x` this gives back the spot of the world under any screen position.
- `things`: what the scene must draw each frame, with screen feet (`x`, `y`) and a depth (`v`): trees that sway, the signpost, the board, the tents. Since D6a every tree, flower and bush is in this list, the fogged and partly hidden ones included (those carry `clip` and are drawn with a test against `depth`); only boulders, logs and other still things that the fog or nearer ground touches are painted into `g`.
- `hAt(u, v)`, `toY(u, v)`, `C` (the layout: `T`, `camp`, `lakes`, `trails` in world coordinates), `volc`, `spires`, `peak`, `routes` (the rivers), the `water` and `trail` masks, `coast`, `forestAmt`, `fogAmt`, `dryAmt`, `lakeAt` (all in world coordinates).

**The game runs on it (2026-11-15).** `land.js` builds the land once when it is loaded and exports what the scene took from `terrain.js` (`buildTerrain`, `loadBake`, `T`, `KIOSK`, `OX`, `OY`), with every position worked out from the layout `C`. `world.js`, `cats.js`, `climb.js` and `app.js` import it. He is hidden by nearer ground through `W.vAt`. The three mountain sprites are no longer drawn; flags and name tags come from `spots.flags` and `spots.places`. Footbridges are planks painted where a trail crosses water.

**Still open in section C:** none of C7 to C9 (redrawn as Q4 and Q5), C19 done (round 3's map and the first block-in are deleted), C20 (no bake yet: the page is ready in about 3 s where round 3 took 0.8 s; `loadBake` returns nothing), C21. Since then (Opus, 2026-11-15) animals, signs, the sea's swells, ferns, logs, sea stacks and the moving mist are all on the new map (section 9). `content.js` still says About Lake and The Stack (section L).

**The quality pass (section Q, Opus, 2026-11-15, tag `pixel-r4-opus-quality`).** Done: round 3's ground detail, real fogged trees, lake shores, the moving mist, Mount Monolith, the Legacy Range and the back row redrawn, zoom out to the whole map, and the opening view B (it opened close in on bare meadow, which was worse than round 3's opening; fixed as F5). Pictures side by side with round 3 are in `out/q7/` (`s-home.png`, `s-phone.png`, `s-map.png`, `s-scenes.png`). What is still below round 3, plainly:

- **The sea.** Round 3's sea corner was wide, with the whale, the ferry and the swells easy to see. Round 4's sea is a narrow strip along the west edge, much of it under the standing fog, and when zoomed out its bottom is under the timeline bar.
- **The phone's first screen.** Round 3's showed The Stack, the lake and the Spires. Round 4's (F8: the Trailhead with the Spires above) shows mostly meadow and trees, with only the foot of the glacier at the top.
- **Load time.** Fixed by C20: 0.69 s to ready in the Docker browser with the bake, against round 3's 0.8 s (3.6 s without it).
- **The east back row.** Its peaks differ in outline only; they share one grey texture.
- **Small spots.** A plain green slope low on Mount Monolith's west side; the east glaciers of Mount Monolith, seen side-on, read as flat sheets.
- **Trees ignore height and distance (TJ, 2026-11-15; fixed in D6a, kept here as the record).** Every tree is the same sprite at the same size wherever it stands, because the map has no perspective. Next to the painted Mount Monolith, the trees on the foothills to its west and on the ground behind it read as 500-foot pines growing beside the glaciers. Two things are missing. **A treeline:** no trees on high ground. **Drawing by distance:** full sprites near; smaller, plainer, paler trees in the middle distance; only tiny haze-tinted tree tops stamped into the ground far back. The tree code can already make conifers of any size (`makeConifer` in `sprites.js`). Fixed already: trees behind the mountain no longer draw over the painting, and none stand on it.
- **The side scenes** (forest, lakeside, wall, camp, climbs) are round 3's, unchanged, so they match round 3 but do not yet show the new world; that is sections G onward.

**TJ asked (2026-11-15) whether the animals need a proper engine instead of positions written as numbers, and said he prefers that.** `critters.js` already has one (`walker`, with a rule for where each kind may go). What was written as numbers is where each animal starts, the sea's corner and the mist's box. Section E must give each kind a rule for where it lives, read from the land (kind of ground, height, distance from a trail), and no numbers. Nothing in the port so far writes a position as a number.

What the port needed, found by reading the code, kept for what is left:

1. `land.js` must also export what the other modules import from `terrain.js` (`buildTerrain`, `loadBake`, `NW`, `NH`, `OX`, `OY`, `T`, `PEAK`, `STACK`, `SPIRES`, `KIOSK`), in screen coordinates, and return the same fields `buildTerrain` returns (see its last line). The scene works in screen space and sorts things by their feet's `y`; that can stay, because everything that needs clipping is already painted in.
2. Whatever moves (he, the cats, the animals) needs a test against `depth` at its feet, so it goes out of sight behind nearer ground.
3. The helpers the animals call with screen positions (`W.open`, `W.forestAmt`, `W.nearTrail`, `W.coast`) must answer through `depth`.
4. The drawings for the ferry, the whale, the sheep and the squirrels are functions inside `buildTerrain` in `terrain.js` (near lines 477, 662, 760 and 772). They must move out before `terrain.js` can be deleted.
5. Round 3 positions are written into the code as numbers and all need re-homing from `land.js`: in `world.js` the light shafts (rows from 462, columns 180 to 800), `PLACES`, `FLAGS`, the journal (712, 526), `lakeOut` (716, 541), the clouds, the sky's height (440), the mirrored rows below the map and the three mountain sprites; in `critters.js` the mist's box, the sea's corner (`SEA`), the surf, the sea stacks and every animal's spot; in `terrain.js` the signs, the ferns, the logs, the sea stacks and the swells, which have no counterpart in `land.js` yet; `KIOSK` in `cats.js`; `OX`, `OY` in `app.js`; the stops along the three paths in `pixel.js`.
6. Trees in the rainforest that the fog touches are painted in, so the Trees switch will not hide them (checklist D15) unless a second ground picture without them is kept.
7. The bake (`bake.sh`, `loadBake`) must hold the ground, the depth and enough of the heights to place things, or the page takes seconds to be ready.

TJ's standing rule is planning on Fable and building on Opus. The land was built on Fable in the session that planned it. The port is building work.

## 9. Calls made in round 4

(One line each, newest last.)

- B2: the block-in is a page of its own (`plan4.html?labels=1&trees=0&crop=x,y&scale=k&sign=1`), not a `?v=4` switch inside the real map. Round 3's map cannot be disturbed that way, and a published artifact cannot take a `?v=` address anyway. **The real map (sections C and D) should import its numbers and shapes from `layout4.js`** so it cannot drift from what TJ approves.
- STOP 1's artifact is the page of pictures (`plan/blockin-r4.html`), not the game, for the same reason.
- B1, what makes each outline recognisable. **Rainier from the south:** wider than tall; a nearly flat summit with three low bumps; convex shoulders, never straight cone sides; a lower shoulder left of the top; a step (Gibraltar Rock) then a small dark tooth (Little Tahoma) low on the right; dark cleavers fanning down between glaciers. **Southern Pickets:** one continuous dark wall; many summits of unequal height; notches that stay high (about four fifths of the summits); broken tops, gendarmes; ice hanging below the wall and a glacier in the cirque. **Prusik Peak, south face:** a lower flat-topped tower on the left; a notch; a steep prow to a small summit block; a serrated ridge stepping down to the right; pale rock with dark vertical streaks. **Olympics from the west:** low, far, many similar snowy peaks, one a little higher in the middle, foothills and haze across the foot. **Glacier Peak from Image Lake** (for the lake scene): a broad white dome over dark forested ridges, mirrored.
- Spires: summits west to east at 66, 84, 100, 86, 95 and 70 percent of full height, in the order of `SPIRES` in `pixel.js` (bluebird, tks, hevy-garmin-sync, trailhead, yggdrasil, kubernetes-manifests). First tries came out as six separate daggers, then as rounded fingers; what fixed it was keeping the wall between summits at about four fifths of their height and cutting the snow gullies short.
- Mount Monolith: the first try was a cone. What fixed it was a summit plateau about 60 wide and convex flanks.
- Proficiency Peak is 164 by 142 (the plan said 150 by 120) so its summit breaks the skyline; the granite row behind dips there. Told TJ at STOP 1.
- Water: the lake trail crosses the river twice (above the fall and at the footbridge below it). Meltwater from the glacier's toe drops over the headwall, crosses the trail to Proficiency Peak, is joined by the cascade out of the upper basin, and leaves the map southward. Told TJ it is the strongest line on the map.
- Phone opening drawn at 1.25 screen pixels to one map pixel; desktop candidates at 0.75, 1 and 1.5.
- **TJ on the first block-in (2026-11-15):** "all of the mountains are in the background, on the horizon. Or just in front of it. The mountains should be *part* of the world/scenery. Not just sitting in the background like a puppet show backboard." He could not judge three directions from ASCII sketches and asked to see them blocked in. Proficiency Peak stays at the larger size. The Legacy Range is to be larger. The opening view is decided after the world is right.
- **TJ on the fog:** the storm off the ocean was not what he meant. He meant fog inside the forest, after a photograph he shared: dark conifers on ridges, their crowns rising out of white fog that lies in the hollows, each rank paler than the one in front. It covers the whole rainforest: "It starts from essentially nothing and then builds to spooky." The sea and beach are clear weather.
- **TJ on the water:** in nature creeks and springs gather into rivers that run through chains of lakes ("necklace lakes"); or the creeks join one river that "looks larger as it collects tributaries rather than a single size from top to bottom". How it is drawn follows the layout he picks.
- The second block-in is drawn another way, in `www/relief.js` (`relief.html?v=1|2|3&labels=1&crop=x,y&scale=k`): every spot of the world has a height, and a spot is drawn at screen (u, 1080 - v - height), nearest first, so ground and mountains are one surface and near slopes hide far ones. Layout 1: the land climbs into the mountains (the builder's pick). Layout 2: flat ground, massifs standing at different depths. Layout 3: the crest runs toward the camera with the Trailhead at a pass. The Spires' wall and Proficiency Peak keep their designed outlines; the other ranges are rows of blunt pyramids.
- Lessons from that drawing: a mountain made by multiplying a cone by noise comes out as needles, so ranges are built from a designed skyline times a cross-section; a lake must sit beyond a mountain's foot or it cuts a cave into the slope; fog reads as ranks only if trees keep to the ridge crests and the hollows are left white.
- **TJ picked layout 1 (the land climbs), 2026-11-15.** Layouts 2 and 3 stay in `www/relief.js` for reference only. The map is now the height-based one in `relief.js`, not `plan4.js` and not a flat ground with a skyline behind it.
- His notes on it, in his words: "The fog is improving. I think we can fog some of the water on the far west edge too." And on the right side, which was burn, pines and sage in three bands: "We don't need to vertically stack the right side into three even sections. In fact, it makes the world look fake and computer gnerated. You know how the ocean bisects the left side at an angle? That is an example of something that looks more organic." He chose a slanted bottom-right corner for the dry country and gave the top right to the granite and the larches.
- Second pass (`plan/relief2-r4.html`): the dry country is one slanted corner with a wandering edge (`dryS`); the burn is a diagonal scar; the granite range runs to the east edge over a staircase of basins with a chain of tarns on one creek; Mount Monolith follows a drawn skyline; the Spires are 1.2 times wider; fog lies over the beach and sea at the west edge.
- The fog cannot be finished by rule. The rule that plants trees on ridge crests was tuned four times and swings between a white sheet and a grey wall. The ranks of crowns have to be drawn ridge by ridge in the real drawing. Told TJ.
- **Before any real drawing:** checklist sections C and D, and the parts of sections 3, 4 and 6 they lean on, were written for a flat ground with a skyline behind it. Rewrite them for the height-based map, and decide how the running game uses it (a baked ground picture, things with a depth, trails in screen space, what hides the runner). Get TJ's sign-off on that rewrite first.
- **The land as built (2026-11-15, `www/relief.js`, picture `plan/land-r4.html`).** Calls made while building section 4a:
  - Base camp is on the west moraine beside the tongue, at about `u` 1022, `v` 526, with the icefall above it; the milky tarn is at the toe, about 45 px below. Section 4a said "beside that tarn". Moved so the walk along the moraine has the icefall ahead of him, as section J asks.
  - Where the six climbs happen, west to east in the order of `SPIRES` in `pixel.js`: Bluebird Forecast, the west end summit, which stands clear on the wet side (section 4a, point 6 wrongly called it the highest); TJs-Kubernetes-Service, the icefall (`v` 556 to 578) and the second summit; hevy-garmin-sync, the long gully to the highest, third summit; trailhead, the knife-edge between the third and fourth summits; yggdrasil, the dry rock of the east arm to the fifth summit; Kubernetes-Manifests, the crevassed tongue (`v` 505 to 555) and the east end summit.
  - The picture is drawn 52 px lower than the world (`SY` in `relief.js`), because the ground at the near edge is no longer at height 0 and would show a cut face. The sky is taller for it. The opening view decides the crop.
  - The Legacy Range's highest summit is drawn level with Mount Monolith's top on screen, never above it. The far west is kept low at the back so the range shows over the forest.
  - Pieces that stand on the Spires' apron (the wall, the ice, its rims, the moraine, the camp shelf) take their heights from the ground under the apron, not from sea level (`lift` in `relief.js`).
  - Rivers: valleys are cut along bent lines to an even grade first, because without that the rainforest's ridges dammed the meadow and the routed streams crossed it in ruled lines. Some straight reaches remain below the joins.
  - The granite steps were raised (46 and 54, 84, 110) to keep their cliffs on the higher ground. Proficiency Peak is 132 high on a base of 84.

- **Placed by rule (2026-11-15, Opus, `habitat()` in `land.js`).** Every sign, animal, flock, the whale and the ferry's course are found by a rule read from the land (kind of ground, height, distance from a trail, whether the spot can be seen), never by a written position. TJ asked for this. `relief.html?spots=1` marks where each one landed. The rules, in short: About Lake and Yak Shave beside the lake trail near the Trailhead and in open meadow; Stack Trace at the forest's edge, Monorepo deep in it; Scope Creep on the glacier's moraine; Segfault on a steep stretch of the Spires trail; Merge Conflict at the lowest point between Mount Monolith and the Spires (the col); Off By One on the highest foothill round Mount Monolith that is not too high; Rollback on the first granite step; Feature Flag beside a tarn; Hotfix and Postmortem in the burn; Cron Job on the coulee's rim; Tech Debt in the sage; Cache Miss and Latency on the beach. Elk on a roomy flat in the parkland; marmots on rocks in the parkland or on the moraine; goats on the granite (one pair on Proficiency Peak's step, one higher); bighorn on the coulee rim; squirrels in the meadow; the bear at the forest's edge; jellyfish near shore and the whale farther out, both in clear water.
- The drifting mist of round 3 was switched off on the new map without asking TJ. He objected; it is back (Q3, below).
- The ferry, whale, bighorn and squirrel drawings moved from `terrain.js` to `www/mapfauna.js`.
- The rainforest fog (D2) is drawn as ranks of conifers along lines across the forest, each rank paler with distance and toward the west, white fog filling the hollow in front of each, snags in the far west. The planted forest thins out where the ranks take over, and its trees keep their own colours.
- **Q3, the moving mist (Opus, 2026-11-15).** It now comes out of the standing fog: `mistBox()` in `land.js` finds, for each screen row, where the standing fog gives out and where the beach is, and the banks and wisps in `critters.js` travel from inside the fog eastward and thin away about 300 px out, before the forest ends. 15 banks and 64 wisps where round 3 had 24 and 100, because the clear forest they cross is narrower. Over thick standing fog the mist is kept thin or left out, since there it only added grey blobs. The fog bank at sea and its fingers are measured from the beach on each row, and only where the sea is wider than 200 px (the bottom-left corner). Not yet seen in the game: the camera cannot reach that corner until zoom-out (Q6); check it then. It adds about 0.1 s to the load.
- **The working artifact for the unattended loop** is https://claude.ai/artifact/QzAfYnTZGZr8L8wfh1EksH, republished after each item (section 8). Stops still get their own new artifacts.
- **Q4, Mount Monolith (Opus, 2026-11-15).** Thirteen ribs of rock fan down from below the summit dome, each its own strength and wandering a little, as real relief so the western light picks them out; a glacier lies between each pair (`vrelief()` in `land.js`). The ribs are thinner where they are seen edge-on on the east and west flanks. Glaciers that a dice roll picks break into an icefall of blue blocks partway down (two or three show from the front); pale-blue crevasses cross the rest; a thin crack rings the dome. The tooth (Little Tahoma) is a knob of dark rock high on the east flank, on the skyline bump. Each glacier tongue ends at its own height, measured up the mountain's own slope (the drawn height counted the bench it stands on and brought the ice down into the meadow), with a band of dirty ice, then moraine with a few dark streaks, then a belt of flower meadow, then firs in clumps on the lower flanks (a new planting rule; the old fir rule skipped all ground above height 80). The volcano now uses the near snow and rock colours, not the pale far ones. No new colours.
- Ferns and logs were being planted on the volcano's snow where the forest's edge reaches it; they now need ground trees can grow on.
- Still weaker than it could be: a plain green slope low on the volcano's west side, under the forest, has no texture or trees; the right-hand glaciers seen side-on read as flat overlapping sheets.
- **Q5, the Legacy Range and the back row (Opus, 2026-11-15).** The Legacy Range stays a painted backdrop (`farRow` in `land.js`), now drawn like round 3's ranges: each summit has a main ridge that wanders down from it and spurs off both faces, snow above a wandering line that comes lower in the gullies as glaciers, rock below streaked with snow, blue faces away from the western light, and a dark outline. In front of it, two ranks of forested foothills with a saw of tree tops on their skylines (a new nearer rank added). The crest's snow lies in streaks down the gullies and on the ledges, more on lit faces, instead of round blots that looked like spots; it still thins toward the dry east with no seam. The ground behind the crest, which showed as green blocks between the peaks, is rock with some snow, and no trees are planted on it; larches are no longer planted on the crest's peaks. No new colours.
- Weak point kept: the eastern back row's peaks are all the same grey spire with the same texture; they differ in outline only.
- **Q6, zoom out to the whole map (Opus, 2026-11-15).** The map's pixel size is now any number, not whole steps (`zoomTo` in `pixel.js`). It eases toward the size asked for and keeps the spot under the pointer (or between two fingers) in place. The wheel scales it smoothly. Pinch follows the fingers instead of stepping by a third. The + and - keys still step to the next whole size. It goes out until the map fills the window one way: on a 1440 by 900 window the whole height and 90% of the width show. On a phone held upright that is the whole height. It goes in to twice the size that suits the window, as before. Left alone for a quarter of a second, it settles on the whole size in the direction it was going, so pixels are crisp at rest; `?debug=-snap` leaves it where it stops (half of F3). Below one screen pixel to a pixel the picture is smoothed by the browser, not pixel-dropped. Round 3's glide between whole sizes is no longer used: nothing jumps now.
- F2 is not done: while the size changes, the picture's buffer is made again every frame. It has not stuttered in the Docker browser; check on a phone.
- With the map zoomed out, the fog bank at sea (Q3) sits under the timeline bar at the bottom of the page, so it is barely seen; it does no harm there.
- **Q7 (Opus, 2026-11-15).** The opening was close in on bare meadow, worse than round 3's, because view B (F5) was not built. Now a window wider than tall opens at one screen pixel to one map pixel (twice that on a high-density screen, so it looks the same size), and a wide view taller than 600 pixels rests lower, down to the near edge of the map, which on 1440 by 900 is view B's frame. A phone held upright still opens at the size that suits it (F8).
- **C19 (Opus, 2026-11-15).** Deleted `terrain.js`, `plan4.js`, `plan4.html`, `layout4.js`, round 3's whole-map page (`plan.html`, `plan.js`; `relief.html` is the whole map now) and the three mountain sprites in `world.js` with The Stack's climber. Layouts 2 and 3 had already gone with the old `relief.js`; The Stack's talus went with `terrain.js`. `sheet.html` draws the map's animals from `mapfauna.js`. `bake.html` now bakes round 4's land: the ground picture, the depth of every screen pixel in two bytes, and what each pixel is made of, in four planes of `ground.png` (617 KB). The game does not read it yet; that is C20.
- **Painted Mount Monolith (Opus, 2026-11-15).** After TJ's reference picture of Rainier, the mountain is now painted on its own page (`monolith.js`, mockup `monolith.html`) and laid over its ground in `land.js`, one map pixel to one picture pixel. The cleavers, glacier ends, icefalls and named features (crater, Liberty Cap's headwall, Steamboat Prow, Little Tahoma) are placed by hand. A small relief built from the cleavers is lit from the west, so every face is lit or shaded the same way. The heights follow the painting's outline (`monolithSky`, which replaces the old `VS` profile), and the summit is 290 high instead of 262. The old drawn ice on the volcano's ground is gone; below the painting the ground is meadow with scree, then forest. Where the ground's top stood above the painted outline, the sky is put back. Two new ramps, `serac` and `mauve`: 248 colours. TJ chose "grow the mountain" after I misreported the size. Measured properly, the footprint was already the painting's width, so nothing around it moved.
- Still below the reference: the cleavers are spaced too evenly (the mountain looks fluted), the crevasse arcs above the icefalls are too regular, and the rock is speckle rather than ledges. The cleaver stubs still reach a little way into the meadow.
- After TJ's look: the whole painting now stands at the mountain's depth, so trees on the ground behind it no longer draw over the snow, and nothing is planted where its foot lands on the painting. The far range's west end stood alone in the saddle beside Little Tahoma; it now starts behind the tooth and rises gently into the Spires. TJ deferred a treeline and drawing trees by distance to the end of the loop (8a). The lenticular cloud stays at E3, in checklist order.
- **C20 (Opus, 2026-11-15).** `bake.sh` now bakes everything slow in `land.js` into one grey `ground.png` (1.3 MB): the picture, its depth, what each pixel is made of and which pixels are painted mountain, then the map's heights, materials and water. With a bake, `buildLand` skips the heights, the water and the picture and still places every tree and animal by the same rules. Ready in 0.69 s in the Docker browser, against 3.6 s without the bake and round 3's 0.8 s. The baked map is identical to the worked-out one (picture, depth, heights and all 2,698 things compared). To make that true, the heights are now kept to 32nds of a pixel in both cases. A bake counts only if it was made from the same source: the PNG carries a signature of `land.js` and every file it imports (`sourceSig`). After any edit the page works the land out itself, which is slow but correct, and on localhost it says to run `./bake.sh`. I chose that over sampling some pixels as round 3 did, because the new picture is drawn column by column and no pixel can be checked on its own. The size went from 617 KB to 1.3 MB because of the heights.
- **C21 (Opus, 2026-11-15).** Pictures in `out/c21/`: the whole map (`map.png`, with names; `map-trees-off.png`), zoomed out in the game by Day and Dusk, the three destinations and the Trailhead close at two screen pixels to one (`s-close.png`), the opening views (B as TJ chose it, plus the map zoomed out and a closer framing, `s-views.png`), and the phone by Day and Dusk beside round 3 (`s-phone.png`). The block-in (`out/r4/w1.png`) and the map now are side by side in `s-map.png`. The layout is the same; the mountain, the Legacy Range, the fog forest and the meadow detail are what changed. Nothing in them is worse than at Q7. The weak points are in 8a; two are new there: the face of Reflection Lake's shelf, and the plain meadow on the mountain's foot.
- **D3 (Opus, 2026-11-15).** The rainforest's eerie corner, all placed by rules in `habitat()` and the planting in `land.js`. Dark twisted maples (`makeTwisted` in `sprites.js`: a trunk that bends over and back, low crooked limbs, a few dark clumps, beards of moss) take most maple spots where the fog begins. Which spot gets one is decided by the spot itself, and the planting dice are still rolled, so nothing planted later moves. An owl (`makeOwl`) sits on a broken stub where the fog begins; it blinks every few seconds and now and then turns its head. One faint light drifts slowly round a spot deeper in the fog, fades out and comes back about every half minute: pale by Day, a bright little cross at Dusk. At Dusk only, three pairs of pale green eyes sit far back in the thickest fog and blink. A pair that is looked at for about a second and a half blinks out for 25 seconds. With a mouse, looked at means the pointer resting near it; on a phone, the pair sitting in the middle of the screen. A crow flock of four circles low over the forest's sunny edge, kept to low plain ground so it is not seen against the mountain's ice. No new colours.
- **TJ's look at D3 (2026-11-15).** Compared with round 3, the map had lost its life: trees that only move in gusts, destinations that no longer stand out as places to go, flowers and bushes that read as paint. The causes: the one-to-one opening halves every movement and every sprite; 406 trees are painted into the ground and the fogged forest is painted rows; the destinations became land and nothing replaced their outline and scale; round 3's flowers were painted too, but at twice the size. TJ agreed to all four fixes and asked for them in the checklist where they fit, not first: D5a (flowers and bushes as swaying sprites), D6a (every tree moves, real far trees, treeline and sizes by distance), D12a (the destinations stand out) and F5a (open at twice the size).
- **D4 (Opus, 2026-11-15).** The island and the near-shore mirror were already there. The outlet stream ran smoothly downhill from height 20 to 12, so there was nothing to fall over. Now the ground in front of the outlet's lip is dropped by 10, fading out sideways and far ahead, and the stream is kept from wearing the lip back into a notch. The result is a real step. The waterfall streams down it in white (`falls` in `critters.js`), churns where it lands in a painted plunge pool, and throws spray that rises and drifts off. Steep faces in the meadow are now rock in layers with dark cracks and moss and grass on the ledges, which also gives the shelf beside the lake a real face (the flat grey slab noted at C21). Past its first rows, the lake mirrors Mount Monolith upside down and squashed, faintly: only the snow shows, as pale water on every other pixel. Round 3's footbridges are back wherever a trail crosses running water: a plank deck painted in, and two railed sides as things of their own, so he runs between them. There are four on the map, one a few paces below the falls.
- **D5 (Opus, 2026-11-15).** The parkland had fir clumps and boulders, but its flowers came out as even speckle, because every clump picked its colour by the dice. Now a slow field over the parkland (`DRIFT` in `land.js`) sets out drifts: a wide patch of lupine, then paintbrush, then white, with heather and plain turf between. Clumps take the kind of their spot and grow thicker inside a drift. The mountain's foot follows the same drifts in its own blooms, which replaces the even red speckle there. Heather bushes grow in clumps where the drifts leave room, and a few more boulders lie about the parkland. Both come from dice of their own, so nothing planted before them moved. The scree on the mountain's foot is in round patches, not streaks. Flowers are still painted; D5a makes them swaying sprites using the same drifts.
- **D5a (Opus, 2026-11-15).** Wildflowers are no longer painted into the ground. Each clump is a small drawing (`makeFlowers` in `sprites.js`: three to five stems with a lupine spike, a paintbrush tip, white or yellow on each), and the blooms are a part of their own, so they sway on still stems. They are planted by the old flower rules and the D5 drifts, thicker inside a drift. They have their own rule for where they may grow, gentler than a tree's, so they reach up the mountain's foot. Bushes and the heather sway too: their top rows lean while the foot stays put (`swaying`). The Trees switch hides them with everything else that grows. The mountain's foot keeps only a light dusting of painted blooms. Found on the way: round 3's map wind was still except for a gust every 11 seconds, which is the 'only moves as a wave' TJ saw. So `breeze` in `core.js` now also gives every leaf clump and flower head its own slow beat: each leans one way and back on its own, about a quarter of the time. That covers the 'sways on its own' half of D6a for every tree already. About 1,350 flower clumps and bushes; ready in 0.72 s.
- **The sway, slowed (TJ, 2026-11-15: 'a marked improvement… slow it down just a little').** Each plant's own beat is now 3.6 to 7.5 seconds instead of 2.4 to 5, so every lean lasts half as long again and comes half as often. The share of time spent leaning is unchanged.

- **D6 (Opus, 2026-11-15).** Seen at round 3's zoom, the Trailhead stood in a solid block of firs with few flowers, the streams ran in long straight lines, and the oxbow was a small hook under the timeline bar. Now: no firs within 70 of the Trailhead, and out to about 300 only the thickest clumps stand, so it opens out like round 3's meadow with groves round it (checked after the dice, so nothing else moved). Flowers there are about six times as thick as in the other meadows. A river wanders from side to side where the ground stays flat for some way round it, by up to 13 pixels, the swing read from where the water is so two streams in one bed swing together (`wander` in `land.js`, reading the land before any bed is cut). The oxbow is a crescent of still water just outside the river's widest swing nearest the Trailhead, clear of the running water, with one level surface and its own colour so it never shows white. The elk keep their flat in the parkland. Side by side: `out/r4/d6-vs.png`.
- **D6a (Opus, 2026-11-15).** No tree, flower or bush is painted into the ground any more: all of them are handed to the scene and sway on their own beat. One that nearer ground partly hides is drawn each frame with a test against the land's depth under every pixel, so it sways and still stands behind the slope in front. One the fog touches gets its own paled copy, made once where it stands. The fog's ranks are now live conifers too, from 64 pixels tall in the nearest ranks to about 30 at the back, with fewer tiers of branches the farther back they stand; each rank's fog lies just in front of its trees and hides their feet. The bare snags in the fog stay painted (dead trees do not sway). Trees elsewhere shrink with distance and height (`shrinkAt` and `sized` in `land.js`): full size until depth 520, about half size at the back of the map, smaller again above height 70, as plainer conifers paled a step by the haze; this fixed the big pines on the foothills beside Mount Monolith, which stand at depth 660 to 730. Larches keep their colour when they shrink. A first try started shrinking at depth 430 and the larch groves on the granite steps faded into the rock, so it was moved back. Far snags are left out. The near rainforest opens into glades (`glade`). All of it is picked by where a tree stands, never by the dice, so nothing else moved. The map went from about 4,800 drawn things to 6,000 and still runs at 60 frames a second in the Docker browser. Side by side: `out/r4/d6a-vs.png`.

## 10. The reference pictures TJ shared, described

The pictures themselves are other people's photographs and are not in the repo. Copies may survive in the session's image folder (`~/.claude/tmp/claude-501/-Users-tj-git-personal-trailhead/8d20dfc8-98bd-4ded-b290-e61cac2c390c/images/`, numbered files) but that folder can be cleared, so work from these descriptions and find fresh references by name.

- **Prusik Peak, south face (route photo by Steph Abegg).** A broad wall of pale grey-white granite, darker grey where water streaks it, split by long vertical cracks and corners. A blunt central prow rises to a pointed summit block at the top centre. On the left a lower, separate tower with a flat-topped shoulder; the West Ridge is the left skyline. On the right the ridge falls away in a row of sharp teeth. Dark firs and a few larches at the foot on the right, a snow patch at the bottom right, slabby grey rock in front. A white mountain goat stands in the bottom-left corner looking at the camera.
- **A hand-drawn watercolour topo of the West Ridge.** The peak from the south as a steep spire with the route up the left skyline, pitches 2 to 5 marked on the ridge, the "final chimney" just under the summit, a second lower spire to the right, larches in green at the foot. Its notes are the source of the draft pitch table in section 5.
- **The Southern Pickets at sunset.** A long ridge of many dark rock summits of nearly equal height but all different: some blunt, some leaning, some split, none a clean needle. Red-brown where the last light hits, near black in shadow. Between the summits, steep snow gullies run down to a broken glacier shelf with pale blue crevassed ice. Layer on layer of fainter ranges behind, under a pink and violet sky. **This is the model for Sideproject Spires and for the crest's rock, snow and ice.**
- **Mount Rainier over Reflection Lake.** The mountain is wide and lopsided with a nearly flat top, pink in morning light, bands of dark rock between the glaciers, a sharp lower peak on its right flank (Little Tahoma). A dark belt of pointed firs stands between lake and mountain, mist lies on the water, and the whole mountain is mirrored in the lake. White flowers and a boulder in the foreground.
- **Glacier Peak over Image Lake.** An open grassy bowl holding a small still lake that mirrors a pink sky and a row of fir silhouettes. Clumps of narrow pointed subalpine firs on the meadow's rim. The volcano stands far away across a deep valley, broad, heavily glaciated, with rocky ribs. **TJ: this is closer to what the lake scene should become once it opens into parkland.**
- **Turquoise lake seen through dark conifer trunks.** Tall straight trunks, nearly black, with bright turquoise water filling the gaps between them and a sunlit brown forest floor. **The model for the forest scene's last stretch: the lake shows between the trees before he reaches it.**
- **Deer at night.** A doe among dark trunks, caught in a light, its two eyes shining pale green-white. **The model for the eyes at Dusk at the rainforest's west edge: eyeshine of an animal, calm, not a monster.**
- **Pixel wind.** Pale blue horizontal streaks of different lengths that end in curls, with a few green leaves carried along. **The model for the wind lines on the West Ridge and in the Bluebird Forecast climb.**
- **A three-piece anchor.** Under a small roof, three pieces in a crack (a wired nut and two cams), each with its own carabiner. A blue cord with a knot comes down from the left piece and an orange rope from the other two; they meet in one big knot at the bottom with a locking carabiner through it. Three strands converging on one point. **The model for the belay anchors.**
- **A slung horn.** A blunt rock horn standing out of a lichen-spotted wall, an orange rope passed round behind it and knotted in front into a loop, a locking carabiner and a belay device hanging from the knot. **The model for pitch 2's anchor.**
- **Trail registers.** (1) A hiker with a big pack writing at a small wooden box on a post, under a wooden notice board, golden larches behind, rocks piled round the post. (2) A brown wooden box lettered "PLEASE REGISTER" whose front folds down on two chains to make a desk, with a clipboard of ruled forms, a map behind glass and pencils. (3) A person writing in a book on a mossy wooden post box in an autumn forest. **The model for the register box and its close-up.**
- **TJ's marked-up strip of round 3's skyline (letters A to H).** A, the snowy western range: "classic North Cascades which is good", could be improved. B, the lone snowy cone behind the lake: "feels a bit different". C, The Stack: "classic yosemite big wall dome and doesn't make sense". D, the Spires: "distinctly Patagonian", "unlike anything I think exists on earth". E, the pale triangles behind them: "entirely out of place". F, the basin's granite peak: becomes Prusik. G, the volcano: "huge and just not quite right". H, the yellow hills: "a good start", move to follow the biome.

## 11. TJ's words, to get the details right

- On the cause: "we started with a small world with three areas concentrated on the center. We have since grew the world map, and added unique biomes that those three areas could fit into. Yet they still sit in the middle." "Differnet georaphic regions usually only have a couple types of features."
- On the kind of world: a "washigton inspired" fantasy map "of it's own design with Washington features that, while still naturally blending correctly, sit in their own landscape." "the lush forest cannot sit next to the desert area."
- On the west edge: "Zelda Lost Woods or Harry Potter Forbidden Forest esque. Mysterious, secret, spooky. Ichabod Crane." Then: "Eerie, nothign scary."
- On the Spires: "they are not daggers or a serrated knife blade. They are imperfect and uneven. And don't come to perfect points. Mountains are not perfect, they are broken. Fragmented. Dangerous." "we can really 'ham up' the sideproject spires and still make it feel epic like Patagonian stuff maybe."
- On glaciers: "Glaciers are beautiful btw, so emphasis on those. Make them snowy, but in the high cirques below their buttresses should be bare glacier ice with crevasses."
- On the volcano: "High parkland meadows too, if posisble. Tons of wildflowers. THis is where the elk and marmots would naturally be. And yes, seracs, glaciers, ice falls, glittering blue beaitufl ice." It must be in the lake scene's background: "Object permanence and all."
- On the Enchantments: "Not just one jagged granite peak in an otherwise peak-less area." "less snowy. But maybe still holding blue ice glaciers high near the top."
- On zoom: "it didn't *feel* bad to zoom, it looked bad because of teh step function. Imagine Zoom *click* zoom *click* zoom *click* where each click was teh world clicking in/our of a zoom level." "I want zooming in and out to be seamless and perfect, not stepped. This feels like a core requirement."
- On names: the features are "tongue-in-cheek references": the lake is about him, the peak is his skills, the Spires are his side projects.
- On map size and pace: "Things can get longer to feel more interesting and have more room to tranisition through and add detail to. This is especially true for the scenes on sideproject spires. They are too short and repetitive right now. Each should be al ot more unique and interesting."
- On fireweed: "Real firewood is like waist/chest high, not small like the flowers in the meadows."
- On timed events: "adding more of these 'timed' events is a good idea to make the world feel lived in."
- On the river: "The river should have a waterfall and this is where they can jump." "The ground should be tiered, not a flat plane."
- On the gear: "Lets make sure that each pitch has points where the lead climber plugs cams to place protection. and the rope is 'clipped in' to it." "try and ensure tiny cams are shown, tiny carabiners around the rope, the rope isnt just a perfect straight up line, but wanders and weighs from gravity between carabiner attachenment points." "the belay stations should have multi-piece trad anchors. A slung horn, 2-3 plugged cams, etc. All backed up together." "I shouldn't lead every pitch. The characters hsould randomly take turns leading/following each pitch." Then: "If it simplifies creating/programming the scene, we could have the black haired man lead everything. He did when we climbed it. I didn't lead anything."
- On the followers: "Followers should climb differently and have unique *personalities*, speed, etc. If one falls the other doesn't at the same time. They take slightly different lines."
- On the West Ridge's air: "make it look windy and cold up there with cartoonish wind lines animating the scene and perhaps wind whoosh audio." "The background should look really far below like the scene is really high up." "As it gets higher, an inversion forms and they are above a sea of clouds."
- On length: "People don't *have* to finish anything, the website is just supposed to be impressive an informative in the end. Not an actual video game people need to 100%."
- On the via ferrata: "a via ferrata kit should be used with two lanyards throughout it that are actively used to protect it."
- On the register: readable by everyone in one click; "it would tell the user in some form that, in order to sign, they had to complete the website."
- On rolling back: "I want to be easily able to roll back to previous iterations at every step of the way." "I also want unique artifacts to be produced for each step so they are easily comparable." "We need to move fast right now with design before we actually land anything official."
- On process: "we should be pushing commits to the new branch on github at every step/milestone."
- His picks from round 3's three block-ins, now superseded but telling: the smaller, farther volcano, "But I would like to to try and reminisce Mt Rainier a bit more intentionally"; the stepped-tower Spires "closest to what I want, but I'm not sure it's 100% there yet"; the long-ridge basin peak, "it should resemble Prusik Peak"; the western range "Smaller than the volcano, and around the same size as the spires."
- On the second pass of layout 1 (2026-11-15): "We might just need to move to implementation phase rather than block ins to really flesh out an idea again." On the burn and the larches: "larches naturally grow at higher elevations, so it makes sense to only have them growing on the second tier and higher of land mass for the enchantments basin. The first tier, here the burn scar is, probably shouldn'thave any. But the aspens can grow there alongside ponderosa pines and whatnot." On the two cones beside the glacier: "Doesn't it feel weird to you to have those protruding valley walls sticking up like narrow ripples in the land? ... Shouldn't this land naturally connect to the volcano and enchantments basin?" and "the way the glacier just *sits* at the bottom of the landmass looks a bit odd ... What terrain will the character be moving through in the sideproject sequences? Shouldn't that terrain be visible here on the world map from a differnet perspective". On the rivers: "Rivers don't do that. They wander, oxbow, etc. And take the path of least resistance along lowest-elevation." On the Legacy Range: "That possibly makes sense as long as the rainforest flows towards it through the \"valley\" between it and the volcano. Ans there probably need to be smaller mountains in front, and around, mount olympus as well." On the back row of peaks: "These peaks are finally starting to look good and Cascadian." On tarns: "the higher up the tarns are, the more milky/teal/green they should be". On the Trailhead: "we should bring the trailhead down a bit towards the middle of this area. Right around where the right-most river-fork from the sideproject spires tributary and enchantments basin tributary sits now. Then those rivers since should to flow through teh remaining west/east area of the map to try and give those spaces something of their own."

## 12. Things learned the hard way in round 3

- Publishing a file path that was published before in the same session goes to the **same artifact** unless a `url` is given. That once put a new build over a frozen one. Always export a tag to a fresh folder and publish from there (section 2).
- `shot.sh` steps are separated by semicolons. With commas the screenshot is taken at load, mid-fade, and looks like a bug that is not there.
- The mist, the aspens and the river mouth each came back wrong the first time because nobody looked at the picture critically before calling it done: mist as opaque white bars, aspens wall to wall, the river as a ruled blue stripe. Look, compare with round 3, and ask "would TJ wince".
- Volcanoes drawn so far lean toward Fuji (smooth, even, pointed). Rainier is wide, lopsided and flat-topped.
- Never heard by anyone yet: the seven tunes' second parts and the effects `tink`, `bang`, `slap`. Ask TJ to listen at a stop.
- Not confirmed on the artifact host: that `ground.png` loads there and that the page's own files fetch back byte for byte, which the bake's check (`sourceSig`) needs. If either fails, the page is correct but takes about 3.5 s to be ready.
- Known weak spots carried in from round 3: the swimmer's head sits upright and the wade-to-swim change is abrupt; some mist banks are long thin bands; chalk and rope stay bright white at Dusk; with Trees off, tree shadows painted into the ground remain; the icefall climb and the hevy-garmin-sync climb ran 17 and 15 seconds, the others under 10.
- Usage: five parallel copies used up TJ's limit in a few hours. One stream of work only.
