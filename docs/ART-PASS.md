# The Art Pass

TJ asked on 2026-11-22 for every model, texture, sprite and painted piece in the game to be redrawn after pictures from the image models on his R9700, the way the trail register was. This file is the list, in the order the work goes, and the log of every call made along the way. It is worked through by an unattended loop, one item per commit, on https://github.com/zimmertr/trailhead/pull/62. It goes once the list is done, and anything worth keeping moves to `docs/DEVELOPMENT.md`.

<hr>

## How One Item Goes

1. Read `design/TRAILHEAD-ART.md` and the item's code. Render it as it is in v0.4.0 (exported to the scratchpad's `art-before/`), Day, Dusk and phone.
2. Generate on the R9700 through llama-swap, as many pictures as the item deserves: several seeds, angles and framings, as the game shows the thing. Drafts with `z-image-turbo-trailhead`, refining with `qwen-image-2.1`. Review every picture at full size and up close until one is genuinely good.
3. Redraw the item in code after the best picture, in the game's palette and pixel size, with light from the upper left. Block out the shapes and proportions first, then add detail in as many passes as it takes.
4. Compare it with v0.4.0 side by side, Day, Dusk and phone, up close. Ship it only if it is better; if it still is not after fixing, keep the old one and log why.
5. `tools/pixel/check.sh`: under 254 colours, under 16.7 ms a frame, nothing moved that should not. Walk the routes if the land changed. The browser tests in Docker.
6. Add the item to the pass's before/after artifact (the chosen picture, the runners-up, before and after), and copy every picture with its log into `~/Documents/trailhead-art/generated/<ID>/`.
7. Tick it, log the calls below, add ideas to `docs/IDEAS.md`, commit, push, read CI and fix it, and republish the game artifact.

Rules: redraw what exists and invent nothing new (finds, easter eggs and new copy wait for TJ). The world's names, never real places. No em dashes. Never merge.

<hr>

## How the List Is Ranked

TJ's must-haves come first. Within them, and then among the rest, each item is placed by how much it gives for what it costs:

- **Seen** - how much of the screen it fills and how often a visitor sees it. The map is on screen most of every visit, so the map's pieces lead; a scene is seen for a few seconds on one route.
- **Gap** - how far below the bar it is now. Mount Monolith is already a painted piece, so it gains less than the glacier under the Spires, which is a white fan.
- **Cost and risk** - anything in `land.js` changes the baked ground and can move trails, signs and animals, so it needs `bake.sh`, `check.sh` and a walk of every route. A sprite in one scene is cheap and safe.

<hr>

## The List

The before/after page for the whole pass: https://claude.ai/artifact/F2Gj2fFw5W1qg1btAjHwYw

### TJ's Must-Haves, on the Map

- [x] **A01 Sideproject Spires and Their Glacier** - the granite wall of six towers in the middle of the map and the glacier below it, with its icefall and the camp's island. `land.js` (`spires`, the `GL` glacier). The biggest gap for the most screen: the glacier is a flat white fan.
- [x] **A02 The Background Mountains** - the far ranges along the top of the map, east of Monolith. `land.js` (`range`, `farRow`). A wide band seen on every visit; the ridges repeat.
- [x] **A03 Mount Monolith** - the volcano, after Mt Rainier. `monolith.js` (`paintMonolith`). The largest landmark; painted already, so the gap is smaller, but nothing is seen more.
- [x] **A04 Proficiency Peak** - the granite peak and its bench, the talus fan under its prow. `land.js` (`proficiency`, `talusAt`).
- [x] **A05 The Larch Basin** - the granite benches with gold larches and tarns east of the Spires, after the Enchantments. `land.js` (`plateau`, `larchAmt`, the tarns).
- [x] **A06 Cliff Textures** - the faces of the granite benches and walls on the map. `land.js` (`colour`, `coverFaces`).
- [ ] **A07 The Golden Palouse Hills** - the rolling gold hills in the far east corner. `land.js` (`palAmt`, `colour`).
- [ ] **A08 Coulee Textures** - the basalt coulee and mesas of the dry corner. `land.js` (the coulee cut, `mesa`, `colour`).
- [ ] **A09 Rivers and Waterfalls** - the rivers across the map and the falls where they drop. `land.js` (the rivers), `world.js` (`whiteWater`).
- [ ] **A10 Reflection Lake** - the lake on the map, its shore, island and boardwalk. `land.js` (`lakeAt`, `lakeRim`).
- [ ] **A11 Moraine Textures** - the moraine band round Monolith, the glacier's moraines and the Spires' shelf. `land.js` (`colour`, the moraine material).
- [ ] **A12 Moraine Tarns** - the tarns at the foot of Monolith's glaciers and on the larch benches. `monolith.js` (`moraineLakes`), `land.js` (the tarns).
- [ ] **A13 The Burned Trees** - Postmortem Burn's charred snags. `sprites.js` (`makeSnag`), `scenery.js`.
- [ ] **A14 The Orca Pod** - the orcas in the sea. `critters.js` (`orcas`, `orcaBack`).
- [ ] **A15 Tide Pools** - the pools left on the beach at low tide. `critters.js` (`tidePools`).
- [ ] **A16 Driftwood** - the logs along the beach. `sprites.js` (`makeDriftwood`).
- [ ] **A17 Marmots** - the hoary marmots on the map and in the scenes. `critters.js`, `fauna.js` (`marmot`).
- [ ] **A18 Doot Doot and Peevers** - the cats at the Trailhead: Doot Doot a long-haired tortie, Peevers a long-haired Nebelung. `sprites.js` (`makeCat`), `cats.js`.

### The Register

- [ ] **B01 The Register Kiosk** - blockout layout B (https://claude.ai/artifact/6Bep5Ljf88yzz86ejAXc4L) built through the plan in this PR: the kiosk view, the zoom into the page view on the book, the map opening the Trail Map, the real words in the pages, then the detail. `register.js`, `app.js`.

### The Must-Haves in Their Scenes

- [ ] **C01 Sideproject Spires at Base Camp** - the wall, the six summits and the ice sheet behind the tent. `camp.js` (`paintSpires`, `tower`).
- [ ] **C02 The Glacier on the Walk to Camp** - the ice, the crevasses and the Spires ahead. `approach.js` (`paintIce`, `makeSpires`, `paintWall`).
- [ ] **C03 Proficiency Peak's West Ridge** - the ridge, its blocks and the summit tower, and the basin below. `ridge.js` (`paintRidge`, `paintBasin`, `paintFar`).
- [ ] **C04 The Larch Basin Scene** - the benches, the larches, the far spires and glacier, the peak ahead. `larches.js` (`paintFar`, `paintMid`, `paintMain`, `makePeak`).
- [ ] **C05 The Peak over Reflection Lake** - the big peak and the water at the lake. `lakeside.js` (`paintPeak`, `lakeWater`).
- [ ] **C06 The Spires' Climbs** - the six climbs' rock, snow, talus and gullies. `climb.js` (`paint`, `talusField`, `couloirWalls`, `crag`).

### The Rest of the Map

- [ ] **D01 Conifers** - the firs, spruce, hemlock and redcedar that cover the map. `sprites.js` (`makeConifer`, `crown`).
- [ ] **D02 The Sea, Beach and Sea Stacks** - the water, the surf and the stacks. `critters.js` (the swells and wash), `scenery.js` (`seaStack`).
- [ ] **D03 Broadleaf Trees** - maples, aspens, the twisted and whitebark pines, ponderosas and junipers. `sprites.js`.
- [ ] **D04 Meadows and Flowers** - the parkland's flowers and the grass. `sprites.js` (`makeFlowers`), `land.js`.
- [ ] **D05 The Trailhead** - the junction sign, the kiosk, the register box and the small signs. `sprites.js` (`makeSignpost`, `makeKiosk`, `makeRegister`, `makeSmallSign`).
- [ ] **D06 The Map's Big Animals** - elk, moose, black bears, mountain goats and the bighorn ram. `sprites.js`, `mapfauna.js`.
- [ ] **D07 The Whale and the Ferry** - `mapfauna.js` (`whale`, `ferry`).
- [ ] **D08 Boulders, Logs and Shrubs** - `sprites.js` (`makeBoulder`, `makeLog`, `makeShrub`, `makeBush`, `makeHuckleberry`, `makeFern`).
- [ ] **D09 The Lookout, the Tent and the Journal** - `sprites.js` (`makeLookout`, `makeTent`, `makeJournal`).
- [ ] **D10 Clouds** - `sprites.js` (`makeCloud`).
- [ ] **D11 Sage, Tumbleweeds and the Dry Country's Plants** - `scenery.js` (`sageBush`), `events.js`.
- [ ] **D12 The Small Animals** - squirrels, chipmunks, birds, the slug. `mapfauna.js`, `sprites.js`.

### The Rest of the Scenes

- [ ] **E01 The Rainforest** - the giant trunks, ferns, moss and stream. `forest.js`.
- [ ] **E02 The Walk to Camp's Flower Slope** - `approach.js` (`paintFar`, `paintFloor`, `paintMain`).
- [ ] **E03 The Scenes' Animals** - elk, owl, jay, slug, pika, goats and the bluebird. `fauna.js`.
- [ ] **E04 The Off-Route Page** - the whiteout, the wand and the sign. `offroute.js`.
- [ ] **E05 TJ and the Other People** - `tj.js`, `people.js`. Last, and only if the rest is done: the figures carry every animation.

<hr>

## Log

- Setup: v0.4.0 is the fixed before for every item, exported to the scratchpad's `art-before/`; `check.sh` compares against `out/check/v040.json`, made from it.
- A01, the pictures: 8 drafts. `z-image-turbo-trailhead` drew a row of matching pyramids (the evenly spaced pattern the art rules warn of), so the style model was dropped for this item. `qwen-image-2.1` got the composition at once; round 2 added crevasses and the rock island. Seed 6 of round 2 was picked and repainted as pixel art (seed 11) as the reference. The prompts are in `design/art/A01/log.jsonl`.
- A01, a call: drawn in code after the picture, not from its pixels (the art rules found the picture way soft on the Spires). The towers keep their order of height and their places; only their shape changed: each is as wide as the gap to its neighbours allows, with a rounded top and a deep notch between. The first try, at about half that width, made needles.
- A01, a call: the tongue's crevasses run across it, bowed downstream. Run along the flow, as the picture's look, they read as a waterfall at the map's angle. The icefall's seracs stand in columns at their own heights; in straight rows they read as brickwork.
- A01, a call: the snout lake is 132 wide (64 before), to take the broader tongue. One sign by it moved 31 px west, one of the eight serac falls was lost, the tower tops moved up to 14 px, and the elk, a bear's home and the whale moved through the placement dice. All stand where their rules want them.
- A01, a fix outside the item: a bear cub with no room at its mother's side was put by a fallback that never checked the ground, and the new bear home put one where no land animal may stand (the engine rules test caught it). The fallback now looks for the nearest ground a cub may stand on.
- A01: frame time 11.6 ms zoomed out at Dusk; 35 browser tests pass; no new colours.
- A02, the pictures: 8 drafts at 1024 by 384. `qwen-image-2.1` seed 2 picked (an irregular skyline, long snow couloirs, faces lit on the left) and repainted as pixel art (seed 11). The style model's seed 4 showed a second, paler rank behind; the far row already draws one, so it was not added.
- A02, a call: the crests change in code two ways, both in `land.js`: `range()` with `vary` makes about one peak in five a big summit and one in four a small one, with smaller tops along the shoulders; and the crest colouring finds the summit above each spot and draws its main ridge, its ribs, snow in the high cirques and in some couloirs, and the light on the left of each ridge.
- A02, a call: no big summit within the far crest's stretch behind the Spires and Proficiency Peak (u 880 to 1500) or the east crest's behind the peak (1360 to 1500). On the first try a big summit stood straight behind Proficiency Peak and took the eye off it; the Spires' trailhead summit must also still top the crest behind it.
- A02, a call: the Legacy Range (the painted far row in the west) is left as it was. Its painting already draws ridges, spurs and snow high up, which is what the crest code now copies.
- A02: frame time 12.3 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours.
- A02, a fix after the commit: lint failed on two values the old crest colouring left unused. Removing them changed `land.js`'s text, so the ground needed baking again even though not a pixel changed; the browser tests caught the stale bake. Every change to `land.js` gets `bake.sh`, however small.
- A03, the before: the volcano was lit almost one white from flank to flank, the glaciers hung between the cleavers like pleats, and blue crevasses ran in even dashed rows over all of them. The gap was bigger than the ranking guessed.
- A03, the pictures: 12 compositions and 6 repaints. Qwen got the mountain at once (round 1) but leaned every rib the same way and ran off the edges; asked for ribs spreading "like fingers" (round 2) it drew an even fan, the very skirt to get away from. Round 3 seed 11 was picked: a smooth dome, the left shoulder's dark cliff, crevasse fields, the tooth on the right, the east flank in blue shade. Zoomed out and painted in it kept its outline but went soft, so it was only used to check the outline. The repaint first lost the snow (the sky cut-out took it; fixed with a lower tolerance) and then the crevasses; seed 23 of the second repaint kept them. The prompts are in `design/art/A03/log.jsonl`.
- A03, a call: the outline, the cleavers' feet, the glaciers' ends and the icefalls stay as they were, because the land, the moraine lakes, the new river and the avalanches are all worked out from them. Only how the mountain is lit and what its surface looks like changed, plus the cleavers' tops (above row 260, which nothing else reads), which now start lower and each at its own height.
- A03, a call: the light is one dome lit from the west with a soft shade line just east of the summit, in place of light worked out glacier by glacier. Lit glacier by glacier, each one read as a pleat, and so did a shadow cast by every cleaver along its whole length; the cleavers' relief and shadows now fade in only below the dome.
- A03, a call: the cleavers are broader low down and their rock is lit on the west with cracks down the fall line. Snowy ledges across them, tried first, read as brickwork with the gully snow.
- A03, a call: the crevasses are short cracks in the snow's own shade, only in fields below the dome and around the icefalls. In the glac blue they read as cyan lines, rows spaced by noise curled into contour lines, and fields everywhere read as rain. The picture's blue icefall stays under snow until an avalanche bares it: every icefall starting under snow is TJ's call from round 5 (T11).
- A03, a call: the crater's far wall and the crack round the dome are the snow's shade now, not cyan and blue; the cyan made the crater read as a pool.
- A03: frame time 11.8 ms zoomed out at Dusk; 35 browser tests pass; no new colours. Five of the eight serac falls on the volcano and one marmot moved through the placement dice (the broader cleavers reach under some of the spots a serac may fall from); the lakes, rivers, trails and signs did not move. The lake scene draws the same painting and gained the same light.
- A04, the before: a pale grey point, streaked like the walls and crest behind it, so it was lost against them; no lit or shaded side.
- A04, the pictures: 12 compositions and 3 repaints. The style model drew the towers as buildings, so it was dropped. Qwen drew the fin at once; "a granite bench" came back as a stone bench to sit on twice, so the word went. Round 3 seed 11 was picked (the tower, the summit block, the teeth, the talus, the tarn) and repainted onto the granite ramp (seed 12). The prompts are in `design/art/A04/log.jsonl`.
- A04, a call: the fin is drawn on the warm granite ramp, not the walls' grey rock ramp, so it stands out against the crest as the picture's does. The walls keep theirs until A06.
- A04, a call: the face is five tall planes, 16 to 30 of the profile's units wide, each darkening toward its corner. Ten narrow planes, tried first, read as organ pipes or as the old streaks; corners that stopped partway read as stains.
- A04, a call: the fin's narrow top is the ridge seen from above, a step darker east of the summit. Drawn as a dark edge, it read as a thick outline along the whole ridge.
- A04, a call: the summit block is centred on the column the stack route's summit is read from. Off centre, as in the picture, it moved that place 12 px down onto the ridge beside it.
- A04: frame time 12.0 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours.
- A05, the before: the benches' tops were a grey stipple that read as gravel, the milky tarns a flat dithered blue.
- A05, the pictures: 12 compositions and 2 repaints. Asked for the basin from above, Qwen drew one giant blank slab (round 1) and then a field of slabs like tiles (round 2), the overhead view the art rules warn of. Seen slightly down across the basin toward a fin and mountains (round 3) it drew the Enchantments: seed 10 was picked, rounded cream slabs parted by cracks, turquoise tarns with pale rims, larch groves. Its repaint came out washed out, so the composition itself was the reference. The prompts are in `design/art/A05/log.jsonl`.
- A05, a call: the benches' tops are slabs of the warm granite ramp, the fin's, in cells 26 wide: each lit on its upper left and a step darker toward its lower right, with a thin crack only on its shaded side. At 11 wide with cracks all round they read as cobblestones.
- A05, a call: the heather keeps the noise it grew from before, so nothing planted on the benches moved; the larches are sprites (D01 and D03) and are left for their own items.
- A05, a call: the tarns are pale where shallow and darker in the middle; the milky ones keep their milk and gain a pale rim. The bench walls are left for A06.
- A05: frame time 12.3 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours.
- A06, the before: the granite walls under the benches and the land's rock steps were grey streaks dithered over the whole face, with no buttress or corner to give them depth.
- A06, the pictures: 8 compositions and a repaint. Qwen's first wall was white and smooth with evenly spaced lines, like a curtain; asked for weathered granite with buttresses (round 2) it drew deep corners, lit faces, grassy ledges and water streaks. Seed 5 was picked. The prompts are in `design/art/A06/log.jsonl`.
- A06, a call: one wall function draws both the granite walls and the land's rock steps (not the basalt, which is A08's, nor the moraine, A11's): buttresses 9 to 36 wide, each lit at its west edge and darker toward the corner on its east, whose wall is in shade; about two in five face away and are darker all over; a few dark water streaks; now and then a ledge of grass on granite or moss on the land's wet steps. The walls stay on the grey rock ramp, under the benches' warm slabs.
- A06, a call: the corner walls are up to almost half a buttress wide and the ledges rare. With narrow corners the walls read as paper slats, and with the ledges at first frequency as stitching.
- A06: frame time 11.5 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours.
