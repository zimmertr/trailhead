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

## Weather

- The world has one sky, and `sky` in `world.js` reports it: the marine layer, the volcano's squall, the map's gusts and the shadows of its fair-weather clouds. The map draws it. Every side scene reads it from `env.sky` and shows it in its own way with the helpers in `weather.js` (the forest's rain and fog are its own, in `forest.js`).
- A side scene keeps no weather clock of its own, except as what it falls back to when the Clouds layer is off, and a climb's storm, which belongs to its route. `COUNTRY` in `pixel.js` says which country's sky each scene is under.
- Every kind of weather has a start button under Weather in the debug panel, and the button works in every scene with a sky (`WEATHER` in `pixel.js`, `trigger` in `world.js`).
- A new kind of weather goes into the sky report first, then onto the map, then into each scene, and gets its button.
- Rain shows on what it falls on. Still water in the rain takes rings, loses its glints and holds its fish (`stillWater` in `world.js`, `rings` in `weather.js`). Ground and rock go a step darker while `sky.wet` lasts (the map's wet copy of the ground), and the lakeside's boulders and trail dry from the top down.

## Events

- A timed event on the map lives in `events.js` (Mount Monolith's and the dry side's) or `life.js` (the Spires', the Peak's, Reflection Lake's and the rainforest's). Each is a row in an `EV` table (`slot`, `first`, `dur`, `ok`) on the shared clock `makeClock()`, and a function that draws it from how far into it the clock is.
- Where an event happens is read off the land: `spots.life` in `land.js`, a lake's own water in `STILL`, the canopy from `forestAmt`. Never a written position.
- Every event has a start button in the debug panel: its name in `SCENE_EVENTS` in `app.js` (and in a family in `FAMILIES` when its place has a button), its words under `debug.events` in `content/game/interface.yaml`, and a place in `where()`. A button's start happens where `where()` sends the view.
- An event that changes how the ground is drawn (the alpenglow, the dead calm, the sunbreak) gives `world.js` an amount from 0 to 1, and `world.js` draws it in the pass that owns those pixels.
- A sound plays once per happening and only when the event is in the view (`sound()` in `life.js`).
- Every event calls `saw()` and has its words on the conditions board.

## The Conditions Board

- The board lists what lives and happens in the world in two lists: Observed is what has been inside the view since the page opened, Reported is the rest. The words are `kiosk.sightings` in `content/game/interface.yaml`, one entry per place, each thing under a short name.
- A thing on the board says so where it is drawn: `saw('name')` from `core.js`, only when it is inside the view (`inView()` in `events.js` on the map, the scene's own camera test in a side scene). The name is the one in `kiosk.sightings`.
- A new animal or event that belongs on the board gets both: its words in `kiosk.sightings` and its `saw()`. A thing that is never reported stays under Reported for good, so check it with a render.
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

## Solid Things

- Nothing that moves passes through anything solid. One shared module, `collide.js`, decides this for every mover.
- A solid thing is registered with `collide.js`. On land, these are the rocks, snags and logs that `land.js` tags as solid, the signs, the journal's post, the tents, and the clearance round the kiosk, the register and the lookout. At sea, they are the sea stacks (a distance field) and the tide's bared flats.
- A land animal also keeps off water and off ground too steep to stand on (`W.open`). Trees are part of its own rule in `critters.js`: a walker goes round their trunks, and a cub may climb one.

## Cost

- Every per-pixel loop goes in its own small function, outside the map's `draw()`.
- The zoomed-out map at Dusk stays under 16.7 ms a frame. `tools/pixel/check.sh` measures it.
