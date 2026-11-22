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
- [ ] **A02 The Background Mountains** - the far ranges along the top of the map, east of Monolith. `land.js` (`range`, `farRow`). A wide band seen on every visit; the ridges repeat.
- [ ] **A03 Mount Monolith** - the volcano, after Mt Rainier. `monolith.js` (`paintMonolith`). The largest landmark; painted already, so the gap is smaller, but nothing is seen more.
- [ ] **A04 Proficiency Peak** - the granite peak and its bench, the talus fan under its prow. `land.js` (`proficiency`, `talusAt`).
- [ ] **A05 The Larch Basin** - the granite benches with gold larches and tarns east of the Spires, after the Enchantments. `land.js` (`plateau`, `larchAmt`, the tarns).
- [ ] **A06 Cliff Textures** - the faces of the granite benches and walls on the map. `land.js` (`colour`, `coverFaces`).
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
