# The Art Pass

How to redraw a piece of the game in code after a generated picture, and what the art pass of v0.5.0 (every model, texture, sprite and painted piece redrawn that way) learned about it. [`design/TRAILHEAD-ART.md`](../design/TRAILHEAD-ART.md) decides when a picture is used and how it is made; this page is the second of its two ways, a picture as a reference for code, worked through in practice. The bar every change meets is in [`docs/DEVELOPMENT.md`](DEVELOPMENT.md) (The bar), and the rules every animal, plant and solid thing keeps are in [`web/ENGINE.md`](../web/ENGINE.md).

<hr>

## Redrawing One Thing

1. **Read the code and render the before.** Render it from the last release (DEVELOPMENT.md, Looking at it, says how to export one), by Day, at Dusk and on a phone, up close. Write down in one sentence what is wrong with it before drawing anything. The before was often worse than expected (Mount Monolith's glaciers hung like pleats), and sometimes already good enough to leave (the humpback's breach, the lookout, the map's small birds).
2. **Generate pictures on the R9700** with both `z-image-turbo-trailhead` and `qwen-image-2.1`: several seeds, at the angle and framing the game shows the thing. Review every picture at full size and pick one, or one per feature (Picking a Picture, below). The prompts go in `design/art/<ID>/log.jsonl`; the PNGs stay out of Git (TRAILHEAD-ART.md, Keep the source).
3. **Draw it in code after the picture, never from its pixels.** Block out the shapes and proportions first, then add detail in as many passes as it takes, in the game's palette and pixel size, with light from the upper left. Keep the drawing's size, foot, seeds and outline unless the item is about them (Changing Art Without Moving the World, below).
4. **Compare and check.** Side by side with the before, up close, Day, Dusk and phone, then `tools/pixel/check.sh`. Ship it only if it is better. If it still is not after fixing, keep the old drawing and write down why: the bushes stayed as they were because two leaf clumps at 14 by 10 came out squat and flat-topped.
5. **Write down each call** in the commit or the round's log: what the picture showed, what was drawn, and every first try that failed and why. The failed tries are where the lessons below came from.

<hr>

## Ranking a Pass

When there is more to redraw than time, rank each piece by what it gives for what it costs:

- **Seen** - how much of the screen it fills and how often a visitor sees it. The map is on screen most of every visit, so its pieces lead; a scene is seen for a few seconds on one route.
- **Gap** - how far below the bar it is now. A piece that is already painted gains less than a flat white fan.
- **Cost and Risk** - anything in `land.js` changes the baked ground and can move trails, signs and animals, so it needs `bake.sh`, `check.sh` and a walk of every route. A sprite in one scene is cheap and safe.

<hr>

## Picking a Picture

- **Run both models on every piece.** Neither won throughout. `qwen-image-2.1` won most landforms and compositions (the Spires, Monolith, the walls, the falls, the moraines, the sea stacks) and most animals and objects (the marmots, the cats, the bear and the ram, the ferry, the tents, the kiosk). `z-image-turbo-trailhead` won most surfaces seen close: the burned snags, the tide pools, the driftwood, the Palouse's swells, the meadow's turf, the firs' tufts, the trunks' moss, the clouds and the off-route page's snow.
- **What the style model gets wrong.** It draws rows of matching shapes (pyramids for the Spires, five bullet-shaped towers, towers as buildings), faces animals toward the viewer, and swaps a subject for a stock one: agave fans for sage, wagon wheels for tumbleweeds, ice caves for a glacier, a stone ring round a tarn, big-headed cartoon runners, broadleaf trees for larches.
- **What Qwen gets wrong.** Small things that come in numbers (tide pools, driftwood, snags, granite slabs) come back as a field of them seen from high up. It washes rock blue, and any ice word in a wall's description turns the whole wall to ice. It drew sand dunes for rolling hills, neon meadows, an almost black rainforest, a black band for a far shore, and sprite sheets with the pine trunks broken in two.
- **Ask for what you need outright.** A count ("exactly four, only backs and fins above the water") and a proportion ("low domes twice as wide as tall") both worked where a description alone did not. Every word is drawn literally (TRAILHEAD-ART.md, Making a landmark): "a granite bench" came back twice as a stone bench to sit on, and ribs spreading "like fingers" as an even fan.
- **Edit the game's own picture for a scene.** For a scene that is already laid out, an edit of a screenshot told to keep its layout gave detail on the composition the game has. From a prompt alone Qwen put the horizon low and left the glacier blank. Ask for the detail in clusters with smooth ground between, or the edit keeps too little.
- **A sprite sheet near the game's size** checks a silhouette quickly: the bear's hump, the ram's curl and the squirrel's tail all came from one.
- **Take each feature from the picture that has it best.** The trees' leaves came from three pictures (maples, ponderosas and aspens each from their own), and a runner-up often had the one thing the pick lacked. When a repaint comes out washed out, use the composition itself as the reference.

<hr>

## Drawing It in Code

### Light and Outline

- **Each form is lit on its own west edge** and darkens toward its east seam: basalt columns, moraine gullies, granite buttresses, slabs, trunks, puffs of cloud. Light the form, not only the whole object, or it reads flat.
- **The dark edge goes only on the shaded side and underneath, never along the top.** Outlined all round, a fir's layers stood apart as pills, close snags ran together like barbed wire, and a leaf clump wore a dark ring. Drawn on the shaded side only, each trunk reads on its own and a lit side stays soft against the grass. Clouds take no outline at all, since the sky behind them has none.
- **An outline fills a narrow gap in a silhouette as a black block.** A squirrel's tail curled over with a gap above its head turned into one; close the gap and tell the parts apart by colour.
- **One mountain lit as one dome.** Lit glacier by glacier, or with a shadow cast down every cleaver, each glacier read as a pleat.

### Anything Even Reads as Built

The art rules warn against evenly spaced patterns. At this pixel size, any regular repeat reads as something made by hand:

- Ledges across rock read as brickwork, and so did columns broken too often, serac columns in straight rows, and blocks laid in courses.
- Narrow planes of one width read as organ pipes, narrow corners as paper slats, ledges at a steady rate as stitching, and a warm edge on every column as a wooden fence.
- Domes of one width in a row read as a row of thumbs. Ledges and snow runnels at every turn crossed like window bars.
- Steps across a stream at a steady interval read as a ladder, and so did joints in a band of pale rock. Flower heads side by side at one height joined into dashes.
- Crack fields everywhere read as rain; small cells cracked all round read as cobblestones or gravel.

The fix each time: vary every form's width and height from its own dice, keep a feature to fields and places instead of everywhere, break long lines into segments, step most towers down to a shoulder on one side, and alternate short and tall.

### Size, Colour and Dither

- **Fewer, larger forms.** Forms only a few pixels across read as noise. Granite slabs read at 26 wide and not at 11, the maples' leaves as a few large flat sprays, the icefall as big light blocks, and a wall's shaded corners at up to half a buttress wide.
- **Cyan or blue lines read as water.** Crevasses in glacier blue read as cyan lines and the crater as a pool; drawn in the snow's own shade they read as snow.
- **Pale on pale floats.** Driftwood in a ramp whose middle step is the sand's own colour floated off the beach; a warm darker underside and a three-pixel shadow sat it down.
- **A solid dark core reads as a hole.** The tumbleweed's dark centre read as a doughnut, and black lichen blotches read as holes in the rock. Speckle and small patches read as lichen.
- **Dithered middle tones turn to dots.** The Palouse lost its swells, a peak turned to grey speckle, and a mirror dithered with the water read as grain. Broad flat planes a shade apart, and half the dithering, read as the pictures do.
- **An object keeps its ramp everywhere.** The Spires are drawn on the grey `rock` ramp on the map, at camp, on the walk in and on every climb; the brown `granite` ramp read as mud beside them. Matching a picture to its material's ramps is in TRAILHEAD-ART.md (Colours).

### The Map's Angle

- **Crevasses run across the flow, bowed downstream.** Run along it they read as a waterfall at the map's angle; run back into a glacier only 20 rows deep they read as commas.
- **A lake on the map mirrors what a walker on its shore would see.** From the map's height a true mirror shows only the meadow behind the lake, or the sky if the sight line is raised. Reflection Lake turns Monolith upside down along its far shore and squeezes it to about three quarters of the lake.
- **Shrinking a dithered picture loses something.** Taking the nearest pixel loses thin lines; taking the rarest colour keeps them but makes the dither speckle all over. The lake scene keeps the nearest pixel.

### What Fits at What Size

Measured on the sprites the pass drew, so the next drawing starts from what is known to read:

| Drawing | Size (pixels) | What fits, and what did not |
|---|---|---|
| Bird (`speck`) | 7 by 4 | Dark wing strokes only; they read as distant birds |
| Sage (`sageBush`) | 11 by 7 | Four lobes and a broken rim; trimming more of each lobe shrank it to a lump |
| Bush, shrub | 14 by 10 | Not two leaf clumps: they came out squat and flat-topped |
| Tumbleweed (`weed`) | 15 by 15 | Six great circles and nine twigs past the rim; eleven filled the ball solid |
| Tent (`makeTent`) | 16 by 11 | A low dome with poles, a tied-back door and guy lines; as tall as a triangle it read as a beehive |
| Squirrel (`squirrel`) | 12 by 10 | An S-curled tail, a tufted ear and a pale chest. The chipmunk, at 0.82 of it, holds one dark and one pale stripe, not three |
| Marmot | 18 by 14 | A grizzled cape stopping at the hips, and a face in three steps: white muzzle, black band, cape |
| Kiosk (`makeKiosk`) | 26 by 26 | Seven roof courses and four notes with a small map; a map filling half the board shrank the notes to pins |
| Elk (`elk` in `fauna.js`) | 46 by 40 | Antlers one pixel wide with a brow tine and three tines, drawn after the outline |
| Cloud (`makeCloud`) | 56 by 20 | Five to seven puffs on a flat base, white and pale blue only; a warm white body read as dirty stripes |

- **Thin lines on a slant need two rows.** The ferry's window bands, one row deep on its slant, broke into dashes.
- **A one-pixel pole cannot lean.** The off-route page's wand broke in two at a lean of one pixel, so it stands upright.

<hr>

## Changing Art Without Moving the World

- **Keep the size, the foot, the seeds and the outline**, and change the fill and the light. Other code reads the shapes: the land, the moraine lakes, the river and the avalanches are all worked out from Monolith's outline and its cleavers' feet, and a route's summit is read from one column of Proficiency Peak.
- **A wider shape moves placed things.** Broader shapes reach under the spots the placement dice try, so a sign, an elk, a bear's home, the whale and serac falls all moved when the Spires' glacier widened. `check.sh` lists what moved; check that each still stands where its rule wants it ([`web/ENGINE.md`](../web/ENGINE.md), Things That Stand Still).
- **New detail draws from dice of its own, or from `hash`**, never from the drawing's shared `rand`. The trees' leaf clusters are placed by hash, so no tree's `rand` runs differently and every trunk stays where it was; the larch basin's slabs (`HUMPS` in `larches.js`) have their own dice, so nothing else in the scene moved.
- **Bake after every change to `land.js` or what it imports**, even when no pixel changes ([`docs/DEVELOPMENT.md`](DEVELOPMENT.md), The bar). `land.js` imports `core.js`, `monolith.js`, `scenery.js`, `mapfauna.js` and `sprites.js`, so a sprite change or a lint fix in any of them makes the bake stale.
- **Every drawing costs script bytes on the start page.** The budgets are in [`docs/LIMITS.md`](LIMITS.md) and are never widened to make room; moving one is TJ's call. Make room by deleting drawings that are exported but that nothing draws, by writing the drawing more compactly, and by keeping a scene's code in the scene, which loads only when a route reaches it.
- **Frame times drift about a millisecond between sittings.** The pass measured 11.2 to 13.6 ms for the zoomed-out map at Dusk, and one rise of almost a millisecond was the machine and not the change. Measure the before and the after in the same sitting.
- **A redraw invents nothing.** No farms or fences on the Palouse, no floating ice, no pool at a fall's foot (that changes the land), no new animals. Anything new goes into [`docs/IDEAS.md`](IDEAS.md) for TJ to pick, as finds and words always are.

<hr>

## Shared Drawing Helpers

- **`litBack(b)`** in `core.js` lights the top pixel of each column a step up its own ramp. Run it before the outline, and an animal is lit along its back from the upper left like every other.
- **`mixTable(to, amount, only)`** in `core.js` mixes the palette toward any colour, optionally only within some ramps. `veilTable(amount)` is `mixTable(R.fog[2], amount)`.
- **`clump(r, name, rand, hang, shape)`** in `sprites.js` fills a leaf clump with small lit clusters placed by hash. `shape` is `'pad'` (flat sprays, for maples), `'tuft'` (needle clusters, for pines), `'tall'` (upright clusters, for aspens) or left out (round, for junipers).
- **`makeConifer(seed, H, W, name, tiers, o)`** in `sprites.js` takes `o.tufts` for ragged tufted layers (`tuftTier`); `makeSpruce`, `makeFir` and `makeLodgepole` take it as their second argument. The scenes pass it; the map's small trees keep the plain layers, which read right at their size.
- **`boards(fb, VW, x0, x1, y0, y1)`** in `kiosk.js` draws the register box's back wall, so the kiosk view and the page view share one wall.
- **For renders**, `debug=-mist,-clouds` takes the weather out of the way and `start=tide` starts the low tide, so the tide pools can be seen.

<hr>

## Where the Detail Is

- **The full log** of the pass, every item's before, pictures and calls: `git show f493860:docs/ART-PASS.md`.
- **The prompts** for every item: `design/art/<ID>/log.jsonl`. A is the map's landmarks and textures (A01 the Spires and their glacier, A02 the background mountains, A03 Monolith, A04 Proficiency Peak, A05 the larch basin, A06 cliffs, A07 the Palouse, A08 the coulee, A09 rivers and falls, A10 Reflection Lake, A11 moraines, A12 moraine tarns, A13 the burned trees, A14 the orcas, A15 tide pools, A16 driftwood, A17 marmots, A18 the cats). B01 is the register kiosk (`register/` holds its first picture). C is the same landmarks in their scenes (C01 camp's Spires, C02 the glacier walk, C03 the West Ridge, C04 the larch basin scene, C05 the lake's peak, C06 the Spires' climbs). D is the rest of the map (D01 conifers, D02 the sea and stacks, D03 broadleaf trees, D04 meadows, D05 the Trailhead's signs and kiosk, D06 big animals, D07 the whale and ferry, D08 boulders, logs and shrubs, D09 the lookout, tent and journal, D10 clouds, D11 sage and tumbleweeds, D12 small animals). E is the rest of the scenes (E01 the rainforest, E02 the walk to camp's slope, E03 the scenes' animals, E04 the off-route page, E05 the people). Later rounds' items are `R8-<item>/` and so on.
- **The pictures** themselves: `~/Documents/trailhead-art/generated/<ID>/` on TJ's workstation, never in Git.
- **The before and after** of every item, with the chosen picture and the runners-up: https://claude.ai/artifact/F2Gj2fFw5W1qg1btAjHwYw
