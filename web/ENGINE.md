# Engine Rules

How every animal, plant and solid thing in the pixel world is built. `web/www/rules.js` checks the map against these rules, and the browser suite fails when the map breaks one.

## Animals

- Every animal on the map lives in `critters.js` and is one of its items: a `walker` (the herds, the moose, the bears), a cub at its mother's side, a squirrel that darts, a marmot that scurries, the whale, the eagle, or one of the sea's movers (the orcas and the jellyfish; the ferry keeps the same rules).
- Every animal moves. It has at least two drawings (`f` on its item) and changes between them as it walks, grazes, sits up or breaches. A map animal also wanders, darts or drifts, unless it is a tide-pool animal, which stays in its pool and changes its shape.
- Every animal keeps to its home, which a rule in `land.js` chooses (`habitat()`, the spots). No animal is placed by a written position.
- Every animal says which kind of mover it is to `collide.js` (`col` on its item: `land`, `whale`, `swimmer`, `floater`, `boat` or `flyer`), and asks `collide.js` before it goes anywhere: `canBe` for where it may stand, and the same rule at every few pixels along the way.
- What a map animal does leans on the part of the day, and the rule is one table: `HOURS` in `critters.js`, a row for a kind and an entry for each part it lives differently in (`morning`, `midday`, `evening`, `dusk`; `hourNow()` in `pixel.js` names the part and `update()` is told it). An entry can make some of its acts come up more often (`more`, `often`), move its home to a kind of place (`at`, with the kinds in `PLACES`), widen or narrow its range (`roam`), or send it to ground (`gone`). A new animal joins by adding its row. Never write the hour into an animal's own code.
- An animal whose home moves walks there by a way that `routeFind()` finds round the trees and the water, over the animals' own grid, and back along it. A herd keeps its shape at the new place.
- An animal that lives where the shared rule lets no walker stand (the goat on the wall's ledge) gets its ground made ground: `land.js` finds the place by rule and adds its pixels to `open`, and the animal's country is the list of them (`spots` on its item). Never switch the rule off for one animal.
- An animal in a side scene (the forest, the lake loop, the larches, the ridge, the approach, camp) is drawn by its scene. It still has at least two drawings, and it changes between them.
- Every animal answers a click with a reaction true to how it lives, and a click on one is never a find (the finds that already were, the lake's marmot and the pika, stay finds). On the map, `pick()` and `click()` in `critters.js` find the animal and start its reaction; in a side scene, its own `pick()` and `act()` do. A map animal has at least five things to do after its real behaviour (its `does` list and `ACTS` in `critters.js`, or its own list for the marmots, squirrels, cubs, birds and whales): it starts on one at random, takes up the others by itself, and a click steps to the next in order. Each new animal gets a name in `content/game/names.yaml` and a reaction.
- The debug panel lists every walker's five things (`actors()` in `critters.js`) and starts any of them. A new walker is in the list by having a `does`; a new act needs its name in `debug.act` in `content/game/interface.yaml`. A new kind with homes is ringed by the Animal homes switch on its own, in its colour from `ROAM_C` in `world.js`.

## Weather

- The world has one sky, and `sky` in `world.js` reports it: the marine layer, the volcano's squall, the map's gusts and the shadows of its fair-weather clouds. The map draws it. Every side scene reads it from `env.sky` and shows it in its own way with the helpers in `weather.js` (the forest's rain and fog are its own, in `forest.js`).
- A side scene keeps no weather clock of its own, except as what it falls back to when the Clouds layer is off, and a climb's storm, which belongs to its route. `COUNTRY` in `pixel.js` says which country's sky each scene is under.
- Every kind of weather has a start button under Weather in the debug panel, and the button works in every scene with a sky (`WEATHER` in `pixel.js`, `trigger` in `world.js`).
- A new kind of weather goes into the sky report first, then onto the map, then into each scene, and gets its button.
- Rain shows on what it falls on. Still water in the rain takes rings, loses its glints and holds its fish (`stillWater` in `world.js`, `rings` in `weather.js`). Ground and rock go a step darker while `sky.wet` lasts (the map's wet copy of the ground), and the lakeside's boulders and trail dry from the top down.
- A clock that the sky depends on runs in every scene. `tick()` in `world.js` steps the mountain's (the slides and the squall) while another scene is on screen, with a view that is nowhere, so it sounds nothing and nothing counts as observed. Weather that starts from a clock gets its step there.
- Rain that is heard is one sound whose level follows the sky (`rain()` in `audio.js`, set every frame from `app.js`), never a clip started and stopped.
- The debug panel says what the sky is doing in one line (`skyNow()` in `world.js`, the words in `debug.sky`). New weather that lasts gets a name there.

## Events

- A timed event on the map lives in `events.js` (Mount Monolith's and the dry side's) or `life.js` (the Spires', the Peak's, Reflection Lake's and the rainforest's). Each is a row in an `EV` table (`slot`, `first`, `dur`, `ok`) on the shared clock `makeClock()`, and a function that draws it from how far into it the clock is.
- Where an event happens is read off the land: `spots.life` in `land.js`, a lake's own water in `STILL`, the canopy from `forestAmt`. Never a written position.
- Every event has a start button in the debug panel: its name in `SCENE_EVENTS` in `app.js` (and in a family in `FAMILIES` when its place has a button), its words under `debug.events` in `content/game/interface.yaml`, and a place in `where()`. A button's start happens where `where()` sends the view.
- An event that changes how the ground is drawn (the alpenglow, the dead calm) gives `world.js` an amount from 0 to 1, and `world.js` draws it in the pass that owns those pixels.
- A sound plays once per happening and only when the event is in the view (`sound()` in `life.js`).
- Light that falls on a mountain is measured by that mountain: the skyline's alpenglow reaches a share of each column's mountain (`tall` in `world.js`, from the sky to where its snow and rock give way to trees), so a tall mountain and a small peak are lit alike. An edge of light fades through a dither and never ends on a straight line.
- An event that belongs to the light follows the light, never a clock of its own. The alpenglow starts when the light crosses to Dusk with the map on screen and comes again before the clock's sunrise (`env.dawn`); a page that opens at Dusk has not seen the light turn. Such an event has no slots in `EV` (`slot: 1e9`), as the rainbow has none.
- A scene says whether an event could start now with `can(name)`, from the same `ok` its start uses. The debug panel greys out a button that cannot (`syncEvents()` in `app.js`); the button stays in the Tab order with `aria-disabled`. An event that waits for Day or Dusk says so in its words, "(Dusk)".
- An event may belong to animals that live at its place between happenings. The mallards of Reflection Lake are kept in `life.js` (`MAL`): they paddle and feed by their own state, the event's clock only starts a flight, and a click starts the same one (`life.pick()`, `life.click()`).
- The debug panel's spawn makes animals as well as moving them: each kind is made by a function in `critters.js` (`elkHerd`, `goatPair`, `sheepBand`, `moosePair`, `bearAt`, `marmotAt`, `squirrelAt`), and a group remembers which of its kind's homes it is on (`home`), so "everywhere it lives" fills only the homes that are empty.
- Every event calls `saw()` and has its words on the conditions board.

## The Conditions Board

- The board lists what lives and happens in the world in two lists: Observed is what has been inside the view since the page opened, Reported is the rest. The words are `kiosk.sightings` in `content/game/interface.yaml`, one entry per place, each thing under a short name.
- A thing on the board says so where it is drawn: `saw('name')` from `core.js`, only when it is inside the view (`inView()` in `events.js` on the map, the scene's own camera test in a side scene). The name is the one in `kiosk.sightings`.
- A new animal or event that belongs on the board gets both: its words in `kiosk.sightings` and its `saw()`. A thing that is never reported stays under Reported for good, so check it with a render.
- A reported line is a button that takes the view to the thing (`whereIs` in `world.js`, `showPlace` in `pixel.js`), and starts nothing. A new thing on the board gets a place there too: an animal has one by its kind, an event by its `where`, and anything else needs a line in `whereIs`.
- Only what is clear of the page's own panels counts. `app.js` lists the panels in `PANELS` and hands their rectangles to the game (`__api.cover`), and an open sheet or the plain page covers the whole view. On the map a thing reports itself through `inClear()` in `events.js`, and in a side scene through its camera test and `!covered(x, y)` from `core.js`, both with the thing's spot on the screen. A new panel goes into `PANELS`, and a new `saw()` uses one of the two tests. Weather that fills the view (rain, the marine layer) has no spot and is not tested against the panels.
- The notice in the register's scene counts the board: one for every name under `kiosk.sightings`, and those the game has reported are the observed ones (`UI.kiosk.count` in `content.js`). A name the game reports that the board does not list counts for nothing.
- What has been seen is kept in memory only (`SAW` in `core.js`, `__api.saw()` on the page), so every visit starts with nothing seen.

- Every plant is a thing that stands and sways with the shared wind: `breeze()` on the map and `windAt()` in the side scenes, both in `core.js`. A plant is made of parts (`tree.parts`), and at least one part has a `sway` above 0. `swaying()` in `sprites.js` turns a still drawing into one.
- A fern is a single drawing with `fern: true`, and the map sways it whole.
- Colour in the ground is not a plant. A pixel or a 2 by 2 speck of flower, sage or grass colour in the baked ground (`ground.png`) is the turf's own colour, and it stays in the ground. Anything with a shape (a stalk, a bloom on a stem, a bush, a crown) is a plant, so it is a swaying thing and never painted into the ground.

## Things That Stand Still

- Only rocks, snags, logs, driftwood, sea stacks, ferns and footbridge rails stand still on the map. `land.js` tags each drawing with `tag()` (`bm.what`), and an untagged still drawing breaks the rules.
- The buildings, signs, tents and the register box are set down by `world.js`, so they are not on this list.
- A sign's place is chosen by a rule in `habitat()` in `land.js`, as an animal's home is. A new sign is placed last (after the homes and the events' spots, before `taken.length = mark`), clear of all of them, so that it moves nothing that was there before it. After adding one, `check.sh` must report nothing moved but the new sign.
- Ice that floats is a thing, not paint: the bergs and floes are placed and drawn by `life.js` (`BERGS`), drift with the shared gust (`gustOver()` in `core.js`) and keep to their own water.
- A streamside plant is planted by one rule (`waterNear` and `bankOk` in `land.js`): on the bank, two to seven from running water and never in it, off the sand, on nearly level ground, clear of the trail. Skunk cabbage, monkeyflower, marsh marigold and devil's club all use it, and a new streamside plant is a drawing and a line in that rule.
- Driftwood gathers. `JAMS` in `land.js` finds the creek mouths and the headlands from the land, and every log and bleached branch on the beach is laid by it: logs in heaps at those spots, beside a creek and never on it, each showing whole, and clean sand between. More driftwood goes onto a heap.
- Two drawings that answer a click as one thing light as one: `pairOutline()` in `world.js` goes round the register's box and the board, row by row from the leftmost solid pixel of either to the rightmost. It lights only when `pick()` says the pair is what a click would get (`PAIR.on`).

## Solid Things

- Nothing that moves passes through anything solid. One shared module, `collide.js`, decides this for every mover.
- A solid thing is registered with `collide.js`. On land, these are the rocks, snags and logs that `land.js` tags as solid, the signs, the journal's post, the tents, and the clearance round the kiosk, the register and the lookout. At sea, they are the sea stacks (a distance field) and the tide's bared flats.
- A land animal also keeps off water and off ground too steep to stand on (`W.open`). Trees are part of its own rule in `critters.js`: a walker goes round their trunks, and a cub may climb one.

## The Land and Its Trails

- A cut in the land ends in a slope. Where `land.js` cuts a stream's valley to an even grade, the ground inside the cut's square is given back toward its edge, so no wall is left for the map to paint as rock. Do it after the streams are routed, so the water does not move.
- A trail leaves the junction level on the screen. `level()` in `land.js` finds, for a step east or west, the depth whose picture row matches the junction's. `join()` drops the last point of each part it is given, so each part starts on the point the one before ended on.
- Every trail in `C.trails` is trodden, bridged and kept clear by the same code. A trail he walks also needs a path in `world.js` (`paths`) and its points in `W.trails`.
- He comes in up the south trail (`arrive` in `pixel.js`): at a run as the page opens at the Trailhead, at a walk on leaving the off-route page. The view, the sign and the page are the opening's all the while. A route asked for meanwhile waits at the junction (the map's `hold`), anything that does not set out from the junction drops the arrival, and reduced motion never plays it. `arrive=0` in the address has him stood there from the first frame, for screenshots.

## Side Scenes

- A side scene's ground is painted as deep as a tall, narrow window sees. On a narrow window the trail sits at 62% of the height (`baseline()` in `side.js`), so more than a third of the window is below it, and `drawStrip()` fills whatever lies below a strip with one flat colour. `tools/pixel/sweep.sh` on a phone notes a picture that ends in such a band, and a browser test fails on one in the forest, at the lakeside and on the West Ridge.
- Rows added under a picture get their plants and stones from an `rng()` of their own, so nothing above them moves.
- The view stays on the painted strip. A scene whose strip does not wrap clamps its camera between 0 and the strip's width less the window's (`climb.js`, `ridge.js`).

## Keyboard

- A sheet (`openSheet()` in `app.js`) is a dialog: while it is open everything else on the page is inert, and it is named by its `h2`. The page of text does the same. Anything new that opens over the page follows them.
- When a sheet closes, the focus goes back to what opened it if the keyboard opened it. After a click it goes nowhere, so Space still starts and stops him.
- Whatever moves him to a milestone (`goto()`, `scrub()`, `key()` in `pixel.js`) first checks that the milestone's scene has arrived (`leg.scene.later`), fetches it if not (`wake()`), and lands when it has.
- Two browser tests hold this: the checker and the Tab key over every card, sheet and menu by Day and at Dusk, and a whole visit by keyboard with reduced motion on. A new card, sheet or menu is added to the first.

## Phones

- The world's pixels (`--px`) are 1 wide on a phone, so a size written in them is half or a third of what it is on a desktop. Anything that can be tapped has a floor: `min-height: max(calc(var(--px) * 9), 24px)`. Nothing to tap is under 24 by 24.
- What sits under the top bar is placed with `--under`, never with a count of pixels: the page measures the bar (`topHeight()` in `app.js` sets `--top`), which can be two lines tall on a phone.
- A card, a placard or a page that is too tall scrolls. Nothing in it shrinks to make room (`flex-shrink: 0` on what it holds).
- A new card, sheet or menu is added to the browser test "on a phone ... every card, sheet and menu fits", which opens each at five phone sizes.

## Music

- On Auto the tune and the set of instruments both follow the place: `PLACES` and `PLACE_SETS` in `audio.js`, with the scene's name as the key. A new scene gets a line in `PLACES`, and one in `PLACE_SETS` if it should not play the first set.
- The tune and the set change only at the bottom of a fade (`fadeTo()`), never in the middle of a bar.
- A tune or a set the visitor picked by hand stays until they pick Auto again, and is kept between visits.

## Loudness

- Loudness is measured, never guessed: `tools/pixel/sound.sh` plays `audio.js` into a buffer and reads it in LUFS, where the visitor hears it, after the mixer and the limiter. `check.sh` fails when the balance below is broken.
- Every tune plays at one loudness through every set of instruments, within 1 LU. A set's `level` in `SETS` turns its music up to the first set's, and its `tunes` evens out tunes that the set itself plays unevenly. A new set or tune is measured and given its numbers before it ships.
- An effect is as loud whichever set plays it, within 3 LU. `fxVol` in `SETS` is how loud an effect's square and triangle notes play through that set's voices.
- Every effect can be heard: its peak is above -40 dBFS. Filtered noise is far quieter than its volume number suggests (a low rumble keeps a hundredth of the noise's power), so a noise effect's number may be well over 1.
- A place's bed sits between -44 and -35 LUFS, under the music and never gone.
- Nothing clips. The loudest tune, the loudest bed, heavy rain and the five loudest effects at once, three times over, stay under -1 dBFS.

## Cost

- Every per-pixel loop goes in its own small function, outside the map's `draw()`.
- The zoomed-out map at Dusk stays under 16.7 ms a frame. `tools/pixel/check.sh` measures it.
- Every scene keeps up on a phone four times slower than this machine: 95 frames in 100 under 16.7 ms. `tools/pixel/slow.sh` measures it; run it after a change to how a scene draws.
- Nothing that can be made ahead is made by a frame. A table or a picture that a scene will need is made when the browser is idle (`requestIdleCallback`) or by `warm()`, never by the first frame that wants it.
- What does not change over time is worked out once for a size of window, and smooth noise that does change is worked out on a coarse grid and read between its points, never asked for afresh at every pixel.
- What a rule finds over the whole map goes into the bake. The page's first paint waits for `land.js`, so a rule that throws dice over the map (the animals' homes, the streamside plants) writes what it found into `ground.png` as a text chunk and reads it back when the page opens. Time a new rule in the page before it ships: Lighthouse fails the build past 3,000 ms to the largest paint, with the processor slowed four times.
