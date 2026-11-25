# Engine Rules

How every animal, plant and solid thing in the pixel world is built. `web/www/rules.js` checks the map against these rules, and the browser suite fails when the map breaks one.

## Animals

- Every animal on the map lives in `critters.js` and is one of its items: a `walker` (the herds, the moose, the bears), a cub at its mother's side, a squirrel that darts, a marmot that scurries, the whale, the eagle, or one of the sea's movers (the orcas and the jellyfish; the ferry keeps the same rules).
- Every animal moves. It has at least two drawings (`f` on its item) and changes between them as it walks, grazes, sits up or breaches. A map animal also wanders, darts or drifts, unless it is a tide-pool animal, which stays in its pool and changes its shape.
- Every animal keeps to its home, which a rule in `land.js` chooses (`habitat()`, the spots). No animal is placed by a written position.
- Every animal says which kind of mover it is to `collide.js` (`col` on its item: `land`, `whale`, `swimmer`, `floater`, `boat` or `flyer`), and asks `collide.js` before it goes anywhere: `canBe` for where it may stand, and the same rule at every few pixels along the way.
- An animal in a side scene (the forest, the lake loop, the larches, the ridge, the approach, camp) is drawn by its scene. It still has at least two drawings, and it changes between them.
- Every animal answers a click with a reaction true to how it lives, and a click on one is never a find (the finds that already were, the lake's marmot and the pika, stay finds). On the map, `pick()` and `click()` in `critters.js` find the animal and start its reaction; in a side scene, its own `pick()` and `act()` do. A map animal has at least five things to do after its real behaviour (its `does` list and `ACTS` in `critters.js`, or its own list for the marmots, squirrels, cubs, birds and whales): it starts on one at random, takes up the others by itself, and a click steps to the next in order. Each new animal gets a name in `content/game/names.yaml` and a reaction.

## Weather

- The world has one sky, and `sky` in `world.js` reports it: the marine layer, the volcano's squall, the map's gusts and the shadows of its fair-weather clouds. The map draws it. Every side scene reads it from `env.sky` and shows it in its own way with the helpers in `weather.js` (the forest's rain and fog are its own, in `forest.js`).
- A side scene keeps no weather clock of its own, except as what it falls back to when the Clouds layer is off, and a climb's storm, which belongs to its route. `COUNTRY` in `pixel.js` says which country's sky each scene is under.
- Every kind of weather has a start button under Weather in the debug panel, and the button works in every scene with a sky (`WEATHER` in `pixel.js`, `trigger` in `world.js`).
- A new kind of weather goes into the sky report first, then onto the map, then into each scene, and gets its button.

- Every plant is a thing that stands and sways with the shared wind: `breeze()` on the map and `windAt()` in the side scenes, both in `core.js`. A plant is made of parts (`tree.parts`), and at least one part has a `sway` above 0. `swaying()` in `sprites.js` turns a still drawing into one.
- A fern is a single drawing with `fern: true`, and the map sways it whole.
- Colour in the ground is not a plant. A pixel or a 2 by 2 speck of flower, sage or grass colour in the baked ground (`ground.png`) is the turf's own colour, and it stays in the ground. Anything with a shape (a stalk, a bloom on a stem, a bush, a crown) is a plant, so it is a swaying thing and never painted into the ground.

## Things That Stand Still

- Only rocks, snags, logs, driftwood, sea stacks, ferns and footbridge rails stand still on the map. `land.js` tags each drawing with `tag()` (`bm.what`), and an untagged still drawing breaks the rules.
- The buildings, signs, tents and the register box are set down by `world.js`, so they are not on this list.

## Solid Things

- Nothing that moves passes through anything solid. One shared module, `collide.js`, decides this for every mover.
- A solid thing is registered with `collide.js`. On land, these are the rocks, snags and logs that `land.js` tags as solid, the signs, the journal's post, the tents, and the clearance round the kiosk, the register and the lookout. At sea, they are the sea stacks (a distance field) and the tide's bared flats.
- A land animal also keeps off water and off ground too steep to stand on (`W.open`). Trees are part of its own rule in `critters.js`: a walker goes round their trunks, and a cub may climb one.

## Cost

- Every per-pixel loop goes in its own small function, outside the map's `draw()`.
- The zoomed-out map at Dusk stays under 16.7 ms a frame. `tools/pixel/check.sh` measures it.
