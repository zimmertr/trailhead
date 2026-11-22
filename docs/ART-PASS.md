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
- [x] **A07 The Golden Palouse Hills** - the rolling gold hills in the far east corner. `land.js` (`palAmt`, `colour`).
- [x] **A08 Coulee Textures** - the basalt coulee and mesas of the dry corner. `land.js` (the coulee cut, `mesa`, `colour`).
- [x] **A09 Rivers and Waterfalls** - the rivers across the map and the falls where they drop. `land.js` (the rivers), `world.js` (`whiteWater`).
- [x] **A10 Reflection Lake** - the lake on the map, its shore, island and boardwalk. `land.js` (`lakeAt`, `lakeRim`).
- [x] **A11 Moraine Textures** - the moraine band round Monolith, the glacier's moraines and the Spires' shelf. `land.js` (`colour`, the moraine material).
- [x] **A12 Moraine Tarns** - the tarns at the foot of Monolith's glaciers and on the larch benches. `monolith.js` (`moraineLakes`), `land.js` (the tarns).
- [x] **A13 The Burned Trees** - Postmortem Burn's charred snags. `sprites.js` (`makeSnag`), `scenery.js`.
- [x] **A14 The Orca Pod** - the orcas in the sea. `critters.js` (`orcas`, `orcaBack`).
- [x] **A15 Tide Pools** - the pools left on the beach at low tide. `critters.js` (`tidePools`).
- [x] **A16 Driftwood** - the logs along the beach. `sprites.js` (`makeDriftwood`).
- [x] **A17 Marmots** - the hoary marmots on the map and in the scenes. `critters.js`, `fauna.js` (`marmot`).
- [x] **A18 Doot Doot and Peevers** - the cats at the Trailhead: Doot Doot a long-haired tortie, Peevers a long-haired Nebelung. `sprites.js` (`makeCat`), `cats.js`.

### The Register

- [x] **B01 The Register Kiosk** - blockout layout B (https://claude.ai/artifact/6Bep5Ljf88yzz86ejAXc4L) built through the plan in this PR: the kiosk view, the zoom into the page view on the book, the map opening the Trail Map, the real words in the pages, then the detail. `register.js`, `app.js`.

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
- A07, the before: the golden hills were one pale tan with the slope's light dithered over it, so the swells showed only faintly and the land's facets read more than its roll.
- A07, the pictures: 10 in all. The style model drew the best swells (seed 3: golden rolling hills, lit crests, contour bands, dark trees in the hollows); Qwen drew sand dunes on all four seeds and was set aside. Seed 3 was shrunk onto the game's colours and repainted as pixel art (Qwen edit, seeds 11 and 12; 12 picked). The prompts are in `design/art/A07/log.jsonl`.
- A07, a call: each swell's colour comes from how high up the swell it stands as well as from its slope, so the crests are the lightest and the hollows a step darker; the dry ramp's darkest step only shows in the deep hollows turned east. The steep and the gentle parts of the hills share the one function.
- A07, a call: the bands of the picture are drawn as strips of the same lightness, alternately the dry ramp's straw and the mustard ramp's gold, following the land's height contours, on gentle and moderate slopes only. They are texture of the existing hills, not new content: no farms, roads or fences. The picture's trees in the hollows are left out, since the hills' trees are placed things and moving them is not this item's job.
- A07, a call: an even lighter pass (the hollows a step brighter) dithered the middle tones into dots and lost the swells, so it was dropped for the second pass's values.
- A07: frame time 11.9 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours (mustard was already in the palette).
- A08, the before: the basalt cliffs of the coulee and the mesas were even vertical stripes two pixels wide in four dark greys, like a barcode, with no light, no layers, no rim and no talus.
- A08, the pictures: 8 in all. The style model drew flat, blocky walls; Qwen drew the coulee well on all four seeds. Seed 2 was picked: a colonnade of tall columns under a stepped band of shorter ones, pale column caps along the rim and grey talus at the foot. It was shrunk onto the game's colours for reference, not repainted. The prompts are in `design/art/A08/log.jsonl`.
- A08, a call: one function draws every basalt face. Where a spot is on its cliff comes from walking the slope behind it up to the rim and the slope in front of it down to the foot, so a face spread over several rows of the land is drawn as one cliff. A cliff more than 17 high is two lava flows, a lower one one; each flow is a band of short, broken columns over a colonnade of tall ones, with a thin warm ledge between flows, pale caps along the rim and a narrow apron of broken rock at the foot.
- A08, a call: the columns are 2 to 10 wide, each its own shade of the basalt ramp, lit on its west edge and darker toward its east seam. A first try with wide columns of one dark colour read as flat planes, and a warm edge on every column read as a wooden fence, so both were dropped. The warm ash ramp is kept for the caps, the ledges and a few stones of the talus.
- A08, a call: a first talus covering the lowest fifth to third of each face, pale and speckled, read as more dry ground with the sage in front of it, so the walls looked short. It is now the lowest eighth or so and dark. A pixel diff showed the faces cover exactly the ground they did before; only their colours changed.
- A08: frame time 11.9 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours.
- A09, the before: flat streams were blue with every other row lighter, like scan lines, and any water on a slope steeper than gentle was a white and blue speckle with no shape, so a stream running down a meadow read as white water all the way.
- A09, the pictures: 8 in all. Qwen drew a clean fall off a cliff band on every seed; seed 4 was picked for its separate white strands with blue between them, lit on the left, the spray and pool at its foot and the clear stream below. The style model's seed 2 was the runner-up for its stream with pale ripple dashes along the flow. The prompts are in `design/art/A09/log.jsonl`.
- A09, a call: water is drawn in three kinds by how steeply it falls. Steep water falls in vertical strands, white where a strand is, blue between, with a lit white west edge and a shaded east edge. Water on a moderate slope shows white riffle bars across it in short segments over a slowly varying blue. Flat water is clear blue with short pale ripples and a few glints; its west bank throws a dark shadow on it and its east edge is a lighter blue. Just below a fall the water is white spray thinning away from the foot.
- A09, a call: the moving white water of the lake's own fall (`world.js`, `whiteWater`) already falls in strands, so it is left as it is. The pool at a fall's foot is not drawn, since that would change the land.
- A09, a call: a first pass with random white and a random mix of two blues on the moderate slopes read as noise, so the riffles were set in segments and the body made to vary slowly. The strands start at a lower steepness than the first try so the chutes cut through the walls fall in strands.
- A09: frame time 11.3 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours.
- A10, the before: the lake was one dithered blue with rows of pale dots across it, a pale rim and its island; nothing in it showed that it was Reflection Lake.
- A10, the pictures: 8 in all. Qwen's seed 2 was picked: seen from above, the volcano's snowy slopes mirrored along the far shore, fading to deep blue toward the near shore, with a pale shallow band at the near shore. Seed 4 was the runner-up; the style model's seed 2 for its ripple lines across the reflection. The prompts are in `design/art/A10/log.jsonl`.
- A10, a call: from the map's height a true mirror only shows the meadow behind the lake (tried first: murky green speckle) or, raising the sight line to fake a lower eye, the sky (tried at four and twice the rise). So the reflection is the one a walker on the shore would see: in each column Monolith, from its foot up, is turned upside down along the far shore and squeezed to about three quarters of the lake. Only the snow and the rock read at this size, so the glaciers show as the snow mixed toward deep water and the ridges as the deepest water blue; everything else is plain water. It ends at a ragged line, and a few broken pale ripple lines cross it.
- A10, a call: the lake's own water is deep blue with slow lighter patches, pale where it is shallow along the shore. The reflection only paints water, so the footbridge and the island keep their colours. It is drawn into the ground, so it does not move with the time of day except through the palette, which turns the snow pink at Dusk as it should.
- A10, a call: `veilTable` in `core.js` became `mixTable`, which mixes toward any colour and can keep to some ramps; `veilTable` calls it with the same sums, so its tables are what they were.
- A10: frame time 11.4 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours.
- A11, the before: the moraine's steep banks beside the Spires' glacier were grey dither with no form, and its flat till was a salt-and-pepper of greys in two-pixel cells.
- A11, the pictures: 8 in all. Qwen drew lateral moraines on every seed; seed 3 was picked for its fine gullies down the inner banks, the lit bank facing west and the shaded one facing east, the sharp crests and the boulders piled at the foot. The style model's seed 3 was the runner-up for its gullied banks under grass. The prompts are in `design/art/A11/log.jsonl`.
- A11, a call: a moraine's steep bank is drawn as gullies 2 to 8 wide that wander a little down it, each lit on its west edge and dark in its east seam, the whole bank darker where it faces away from the sun, with a pale crest row along its top. A first pass with gullies 3 to 12 wide and lighter bodies read as poured concrete.
- A11, a call: the moraine's flat till is a calm grey gravel lit by its slope, with boulders of radius 1 to 2.6 lying on about a third of six by four cells, each lit on its upper left and dark underneath; the tufts of grass stay as they were. The rock island in the glacier, where the camp stands, is left as it is.
- A11: frame time 11.4 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours.
- A12, the before: the two lakes where Monolith's glaciers end were a flat checkerboard of pale teal and glacier blue under a grey rim, so they read as cyan blobs.
- A12, the pictures: 8 in all. Qwen's seed 4 was picked for the dark line of shadow on the water under the ice, the milky water paling toward the shore, the bouldered bank and the stream through its notch. The style model's seed 2 was the runner-up for its clear zones of turquoise. The prompts are in `design/art/A12/log.jsonl`.
- A12, a call: each lake's water is drawn in bands from the ice to the shore: one dark row under the ice front and a broken one below it, pale silty water with faint plumes for the first third or so, a deeper turquoise in the middle with a few pale flecks, and pale shallows along the shore and round the ends. The ice, the rim, the notch and the stream are as they were. No floating ice was added, since that would be new.
- A12, a call: the larch benches' tarns were redrawn in A05 (pale where shallow, darker in the middle, the milky ones with a pale rim), so they are left as they are.
- A12: frame time 11.5 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours.
- A13, the before: every dead tree of Postmortem Burn was a one-pixel grey stick with four limbs, wrapped in a black outline, and stood so close that the outlines ran together into a tangle like barbed wire.
- A13, the pictures: 8 in all. The style model's seed 4 was picked: straight, tapering trunks of three kinds, weathered silver lit on the left, charred black with a few patches of bark, and bronze ones still in their bark, with short stub limbs angled up and fireweed beneath. Qwen drew a field of fine spikes in mist on every seed and was set aside. The prompts are in `design/art/A13/log.jsonl`.
- A13, a call: a dead tree is a trunk two pixels wide below and one above, lit on its left and dark on its right; silver ones have paler streaks, charred ones a few patches of bronze bark, bark ones are brown. The top is a fine spike, a snapped jagged end or a crown of stubs, with a few short stubs angled up lower down. The black edge is drawn only on the shaded right, so close trunks read one by one. The trees stand exactly where they did.
- A13, a call: two of the five snag shapes the land places are charred, the rest silver, and one in three of the burn's darker trees keeps its bark, so the burn reads as burned and not as a grey wood.
- A13: frame time 11.5 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours.
- A14, the before: each orca's back was a flat dark navy arc with a black top row and a two-pixel grey mark, and every fin was solid black, so a surfacing orca read as a dark blot with a stick in it.
- A14, the pictures: 12 in all. The style model drew whole orcas leaping, and Qwen's first round a crowd of them in the dark, so round 2 asked Qwen for exactly four with only backs and fins above the water. Seed 6 was picked: the bull's tall straight fin, the cows' smaller curved ones, the white eye patch at the head end, the grey saddle behind each fin, a glossy highlight along each back and white water at the bow. The prompts are in `design/art/A14/log.jsonl`.
- A14, a call: the back is lit along its top on the sun's side and dark on the other, with a second lit row behind the fin, the grey saddle drawn as a sloping patch behind the fin, and the white eye patch at the head end once it is well up. Each fin is lit on its left edge. A little white water breaks at the bow and a thin, broken wake trails behind. The spyhop already shows the eye patch and chin, so it is left as it is.
- A14, a call: the pod's lane, worked out from the sea's depth, runs along the map's west edge, so the camera, which stops at the edge, only ever shows the orcas there and half cut off. Moving the lane is not an art change, so it is logged as an idea. To find the pod for the before and after, a throwaway copy of the game was told where the pod was; that copy is not in the repo.
- A14: frame time 11.3 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours.
- A15, the before: the pools round the sea stacks at low water (round 5's basins) were clean ovals of pale grey rock round pale, checkered water, so they read as dishes set on the sand.
- A15, the pictures: 8 in all. The style model's seed 3 was picked: dark rims crusted with barnacles, olive weed hanging off their near sides onto the sand, clear turquoise water deeper in the middle, with sea stars, urchins and pink coralline. Qwen drew a whole field of tiny pools from high up on every seed and was set aside. The prompts are in `design/art/A15/log.jsonl`.
- A15, a call: the rim's lit far side is grey rock crusted with white barnacles and dark mussels, its sides and shaded near side darker with a few barnacles, and olive weed hangs off the near side over the sand in uneven strands. The water is the sea's darker teal through the middle and paler toward the edge, with the dark line under the far rim kept, and a few pink coralline pixels round the edge. The life in the pools and the crab are as they were.
- A15, a call: to see the pools without the shower the renders turn the mist and clouds off (`debug=-mist,-clouds`) and start the low tide (`start=tide`).
- A15: frame time 11.6 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours.
- A16, the before: the logs along the beach were drawn in the pale end of the gold ramp, whose middle step is the sand's own colour, with a one-pixel shadow, so they floated pale on pale. The shadow of a log drawn mirrored fell to the west, toward the sun.
- A16, the pictures: 8 in all. The style model's seed 4 was picked: a silver log with a warm brown underside, long cracks along the grain, a brown root ball and a crisp dark shadow on the sand. Qwen drew a scatter of thin white sticks from high up on every seed and was set aside. The prompts are in `design/art/A16/log.jsonl`.
- A16, a call: the log's top stays the palest silver, its lower half a step or two darker, its two lowest rows a warm brown-grey from the ochre ramp; dark cracks run along the grain on its upper half; the root wad has a brown core. Its shadow is three pixels deep, dark under the log and paler beyond, and is drawn after the log is mirrored, so it always falls to the east.
- A16: frame time 11.2 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours. The ground was rebaked, since logs that are partly hidden are stamped into it.
- A17, the before: the marmot was one brown all over, a warm ramp from the dirt colours with an ink outline, so on the grey rock below Mount Monolith it read as a brown lump, a pika or a log as much as a marmot. Nothing of the hoary marmot's silver cape or black-and-white face was there.
- A17, the pictures: 8 in all. Qwen's seed 2 was picked: two marmots on a boulder, one lying out and one sitting up, with the silver cape over the shoulders, the black face band and white muzzle, and the brown rump and tail clearly apart. The style model's pictures were good scenes, but its cape was a faint grey that would vanish at 18 by 14 pixels. The prompts are in `design/art/A17/log.jsonl`.
- A17, a call: the cape is a grizzle hashed from the pale rock greys, white and a little dirt brown, lit on the upper side, and stops at the hips, where the rump turns to the warm dirt ramp; that brown is what keeps it from reading as part of the rock. The face is three steps from the nose back: a white muzzle, a black band, then the cape. The tail is the bark's darkest brown, the feet ink.
- A17: frame time 11.6 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours. The ground was rebaked, since the shot tool said it no longer matched the map after the sprite changed.
- A18, the before: the cats by the junction are on the first screen, beside the runner. Doot Doot sat as a squat lump, her back end low and long like a sitting dog's, and was more ginger than dark, so she read as an orange cat with black spots. Peevers lying in a loaf was a thin flat shape with her tail sticking out behind, more rat than cat. Neither showed long hair.
- A18, the pictures: 11 in all. Qwen's seed 2 was picked: Doot Doot sitting tall in profile, mostly black and dark brown with big ginger patches, a ginger ruff and cheek, her tail wrapped round her feet, and Peevers in a round loaf with a pale silver ruff, a blue-grey body and a darker tail tucked along the front. A second Qwen round of the two walking gave the walk (seed 3). The style model drew both cats facing the viewer on every seed and was set aside. The prompts are in `design/art/A18/log.jsonl`.
- A18, a call: the cats are drawn by `build` in `cats.js`; `makeCat` in `sprites.js` is exported but nothing draws it, so it was left alone. The colours now go by part: Doot Doot's ruff and the blaze on her cheek (behind the eye, so the amber eye stays on dark fur) are always ginger, and the rest is ginger only in big noise patches, offset so each of her main poses is about a third ginger, as in the picture. Peevers's ruff and face are the palest blue, her legs and tail the darker steps, and silver tips are sprinkled on her lit back.
- A18, a call: sitting is now a pear, the haunch low and wide and the chest tall, with the tail wrapped round the front feet (it flicks its tip in `sit1` and `meow`); the loaf is round with the head forward and the tail laid along the front. A tuft of fur stands off the top and back of the outline here and there, and the tails are fuller.
- A18: frame time 11.6 ms zoomed out at Dusk; 35 browser tests pass; nothing moved; no new colours. The ground did not need a rebake.
- B01, the before: the register opened straight onto the book lying flat across the whole screen, so its handwriting could be read at once, and the back wall with the map, the notice and the tin was a strip along the top. TJ judged it far flatter than the generated picture of the box, and the cause was the layout.
- B01, the plan: the four stages TJ approved on 2026-11-22 (the blockout, the two views, the real content, the detail) were each to wait for his okay. The loop he started says to build layout B through that plan without stopping, so stages two to four were built in this one item.
- B01, the pictures: the round 6 picture of the box was the reference for the layout, traced in the blockout. Three Qwen edits of the first build, told to keep its layout, were made for the detail; seed 3 was the one used, for the warm light on the right-hand wall, the deep shade on the left at the back, and knotted planks on the posts as well as on the back wall. Seed 1 turned the wood white and the book's pages to bare wood, and was set aside. The prompts are in `design/art/B01/log.jsonl`.
- B01, a call: the kiosk view is painted by the new `kiosk.js` from blockout B's measurements: on a wide screen the picture's layout scaled to leave the desk below, on a tall one the phone's own layout stretched to the screen. The back wall's boards are shared with the page view (`boards`), so both views have the same wall, and the page view is pixel for pixel what it was.
- B01, a call: the map on the wall is the world itself. Each of its pixels takes the commonest colour of the map's ground under it, which already holds the mountains, the lake, the coast and the trails, and the trees are dotted on in the colour of their crowns; flowers and shrubs, which are things on the map too, are left off. Its legend is a row of coloured keys with lines, as on the picture's map, with no words.
- B01, a call: the pages in the kiosk view are the book's real words, written on a flat page with the same hands and inks as the page view, then laid into the tilted pages in perspective. A pixel takes an ink if two of nine points under it are ink, so the strokes survive the shrinking. They are too small to read, which is what asks for the click. They are drawn again when an entry is signed or a destination is finished, and once the hands have loaded.
- B01, a call: the book and the map answer as see-through buttons laid over the picture, as the notice already did, so they work from the keyboard and in the tests, and the book's button is cut to its shape. The book's button is named with the register's own words ("Trail register, read it" or "sign it") and the map's with the trail map button's. In the kiosk view the button at the foot says Close (the trail map sheet's own word) and leaves the box; in the page view it says Close the book and zooms back out. No new words were written.
- B01, a call: the zoom grows the kiosk round its book until the book is the size of the page view's, over 0.7 seconds, and the page view comes through it in a dither over the last part. The pencil lies on the desk in the kiosk view; once the visitor may sign, it lies on the page in the page view, as before.
- B01, a test: a new browser test opens the book from the box, closes it back to the box, runs axe on the box and opens the trail map from the wall. Axe run with the trail map sheet open finds that sheet's own contrast and button-size problems, which were there before; they are in `docs/IDEAS.md`.
- B01: frame time 11.5 ms zoomed out at Dusk; 36 browser tests pass; nothing on the map moved; no new colours.
