# Round 8 of the Pixel World

TJ's 27 notes on the art pass (2026-11-24), his answers to the questions that followed, and the checklist an unattended loop works through. This file stands alone: an agent with no memory of the conversation reads it on every firing. It lives until round 8 merges; its lasting rules then move to the permanent docs and it is deleted.

## 1. Why This Round Exists

The art pass merged as https://github.com/zimmertr/trailhead/pull/62 (squash commit `f493860`, release `v0.5.0`). TJ played it, called it a big improvement, and sent 27 notes: more life on the map (animals that spawn in different places and do more, lakes that move, random events at every place), a rerouted trail to Proficiency Peak, sign and name changes, and a list of fixes.

## 2. Ground Rules

**Where things are**

- Repo: https://github.com/zimmertr/trailhead. Work only in a clone in the session's scratchpad (under `~/.claude/tmp`), never in `~/git`, never in `/tmp`.
- Branch `round8`, cut from `main` at `f493860`. One draft PR for the whole round. Never merge it and never push to `main`: TJ reviews and merges.
- Read CI after every push (`gh pr checks <n>`) and fix a failure before the next item.
- The floor to compare with is release `v0.5.0`. Render it from `git archive v0.5.0 web/www` in its own folder (`WWW=<folder>` for the tools).
- One game artifact for the round, created at the first publish and linked in section 6. Never publish over the art pass's (https://claude.ai/artifact/Sxbh3R3GpV75ZQ7d63iRVD).
- The repo's rules are in `CLAUDE.md`; the tools and the bar in `docs/DEVELOPMENT.md` (The pixel world); the engine rules in `web/ENGINE.md`; how generated pictures are used in `design/TRAILHEAD-ART.md`.

**How one item goes**

1. Read the item, its note in section 4 and the code it names. Render the "before" from `v0.5.0`: Day, Dusk and phone; film anything that moves (`frames.sh`).
2. **New models and textures start from pictures** (TJ, this round): for every new or redrawn model, texture or sprite, generate on the R9700 through llama-swap first (the `generate-image` skill; `z-image-turbo-trailhead` for drafts, `qwen-image-2.1` to refine), review every picture up close, and draw in code after the best one. Generated PNGs go to `~/Documents/trailhead-art/generated/R8-<item>/`, never into Git; each item's `log.jsonl` goes to `design/art/R8-<item>/`.
3. Build it. Place things by rule (`habitat()` in `land.js`), never by written positions, so they survive the next change to the map.
4. Compare with the before, side by side, up close, Day, Dusk and phone. Anything worse than `v0.5.0` is fixed before the item is ticked, and is never described as "rough".
5. `tools/pixel/bake.sh` after any change to `land.js`, `core.js` or what `land.js` imports, and commit `ground.png` whenever the bake rewrites it. Then `tools/pixel/check.sh <item> <previous item>`: every browser test, frame time under 16.7 ms, nothing moved that should not have. Walk the routes (`walk.sh`) when the land or a trail changed. Lint in Docker. `make lighthouse` when a file the start page loads grew.
6. Tick the item, log every call in section 7 in one line, add ideas to `docs/IDEAS.md`, commit, push, read CI, republish the game artifact with a short label.

**Rules that must not be broken**

- Everything builds, runs and tests in Docker. Nothing is attributed to an AI. No em dash or en dash in anything committed or published.
- The script budget stays at 520,000 B (TJ, 2026-11-24; the start page is at 409,643 B). Never widen a budget.
- Colours come from the palette in `core.js` (254 at most). Frame time stays under 16.7 ms.
- New user-facing words are drafts for TJ. They live in `content/game/*.yaml` and are listed in section 5 and in the final report. Never put a word in a `.js` file.
- Finds are TJ's choice: never invent one. Clicking an animal is not a find.
- Never switch off or remove a feature unless a note below asks for it. This round TJ asked to remove: the Postmortem Burn sign, the separate click targets for the register and the conditions board, some beach driftwood, the old trail to Proficiency Peak.
- Every new timed event gets a start button in the debug panel, and every placed animal appears in the spawn menu.
- Every animal lives in `critters.js`, moves and asks `collide.js`; every plant sways; every solid thing is known to `collide.js`.
- One stream of work, in order, by one agent. No forks, no parallel subagents.
- Never name a mechanism or a bug with a coined name. Use the world's names, never real place names.
- When TJ is away and a question cannot wait, make the call, log it and carry on, except where an item says it waits for TJ. When he gives feedback, report findings and ask before changing anything.

## 3. Decisions TJ Has Made

- **Note 7.** Proficiency Peak on the map goes back to how it was before the art pass's A04, then gets another try from new pictures. The retry ships only if it beats the old one.
- **Note 4.** The walk to Spires base camp takes its direction from the end of the map's trail (up the glacier to camp, heading right), not from the point where the scene takes over (the meadow traverse, heading left).
- **Note 2.** The red bushes in the larch basin are fall huckleberry: deep crimson, fewer and lower, with blue berries on them.
- **Notes 10, 27 and 19.** New names and the new events are drafted in section 5; TJ picks before they ship.
- **Note 5.** Habitat rules find candidate spawn spots, and five well-spread ones are chosen per animal.
- **Note 18.** One scene from the burn to the larches: the larch basin scene grows a first stretch in the burn.
- **Note 12.** Each new set of instruments plays every tune the existing sets play.
- **Scenes load when he sets off.** The forest and the lakeside stop loading with the page too.

## 4. The Checklist

Work top to bottom. An item marked **waits** is skipped until TJ has picked in section 5.

### A. Fixes

- [x] **A1 The Debug Button on a Phone** (note 23). `style.css` hides `#b-help` and `#b-debug` on a narrow screen. Show Debug there; Keys stays hidden, since a phone has no keys. The top bar must still fit at 390 px.
- [x] **A2 Music Only While the Page Is Active** (note 24). Suspend the audio when the tab is hidden, the window loses focus or the page is put away (`visibilitychange`, `blur`, `pagehide`), and resume it on return only if it was playing. `audio.js`, `app.js`. A browser test.
- [x] **A3 The Signs in Map Order** (note 17). The junction's buttons run Reflection Lake, Sideproject Spires, Proficiency Peak, as they lie left to right on the map. `DESTINATIONS` in `content/game/trailhead.yaml` (order only, no new words), `make words`.
- [x] **A4 The Snow Traverse Cuts Sooner** (note 3). On the West Ridge's walk-off after the last rappel, the scene still runs too long: cut to black a little sooner. `ridge.js` (the traverse at the end of `makeScript`). The `wall` length in `pixel.js`'s `SECS` changes with it; the browser test holds them together.
- [x] **A5 The Walk to Camp Runs Left to Right** (note 4). `ROUTES.spires` in `pixel.js` reads the trail's heading at `world.spiresIn`, where it still heads left. Read it over the trail's last stretch instead.
- [x] **A6 The Lake's Scenes Load When He Sets Off.** The route bar at the start is the lake's, and its marks come from `forest.js` and `lakeside.js`, so both load with the page. Their stops and lengths come from a table, held to the scenes' own by a browser test, as `SECS` does for the signs. State the start page's script before and after.

### B. What the Art Pass Got Wrong

- [x] **B1 Proficiency Peak** (note 7). Restore `proficiency` and `talusAt` in `land.js` from release `v0.4.4`, the last one before the art pass (`git show v0.4.4:web/www/land.js`). Then the retry: new pictures, the old drawing's colours, crisp planes instead of round lumps. Keep whichever is better and say which in the log.
- [x] **B2 The Larch Basin's Cliffs** (note 8). The granite benches' faces on the map are too tall since A05 and A06. Bring their height back toward `v0.4.4`'s and keep the new texture.
- [x] **B3 Huckleberry in the Larch Basin Scene** (note 2). `larches.js` (the shrubs of round 5, T65): deep crimson and wine instead of orange-red, fewer and lower clumps, blue berries on them.
- [x] **B4 Less Driftwood** (note 13). `land.js` near line 1568: tone the beach's driftwood down a touch.
- [x] **B5 The Spires' Hover Shape** (note 16). The shape that lights when the pointer is over Sideproject Spires runs to a sharp point in the meadow. End it cleanly along the toe of the lake and the terminal moraine.
- [x] **B6 The Orcas' Click** (note 21). A clicked orca rises straight up like a periscope and it reads wrong. Redraw the spyhop after pictures (a third of the body, tilted, the pectoral fins showing, water running off) or replace the click's answer with one from D2's list.

### C. The Land

- [x] **C1 A New Trail to Proficiency Peak** (note 18). Reroute `stack` so the game crosses more country: from the Trailhead east along the forest's edge, north-east through the aspens to the dry side's edge, up the river through Postmortem Burn, and onto the larch plateau from the east (TJ's blue line; his screenshot is `~/Desktop/Screenshot 2026-11-22 at 12.44.19 PM.png`). The old trail north through the meadow goes. Bridges, signs, the trail map and the route's length follow. Walk every route.
- [x] **C2 The Burn on the Way Up** (note 18). The larch basin scene starts in the burn: charred snags, fireweed, the gold hills, the coulee and the badlands behind, then the climb onto the benches and the larches as now. One scene, one cut. Pictures first.
- [x] **C3 The Bend by Rollback Basin** (note 15). Remove the little bend in the trail beside the Rollback Basin sign. If C1 took that stretch of trail away, say so and tick it.
- [x] **C4 Monolith's Tarns** (note 26). Make the tarns at the foot of Mount Monolith's glaciers larger, and move the middle one to the left of the ridge on its left. `monolith.js` (`moraineLakes`), `land.js` (`TARNS`).
- [x] **C5 Meltwater That Runs** (note 14). The rivers that leave Monolith's tarns do not move as the other rivers do. Give them the same moving water.
- [x] **C6 Lakes That Move** (note 9). Reflection Lake and every tarn on the map: shimmer, small waves, a gust darkening the water as it crosses, and a fish jumping now and then. Drawn over the baked ground each frame, in its own small function; watch the frame time.
- [x] **C7 The Lake Below Scope Creep Glacier** (note 27). The lake at the glacier's terminal moraine is substantial: raise its quality to Reflection Lake's (shore, shallows, ice floes, reflection). Pictures first. Its name tag **waits** (section 5).
- [x] **C8 More Skunk Cabbage** (note 20). Three more patches, by rule: along the rainforest creek north of the maples, at the creek mouth behind the beach, and by the footbridge below Reflection Lake's outlet (his screenshot: `~/Desktop/Screenshot 2026-11-22 at 12.53.37 PM.png`).
- [x] **C9 Signs That Stand Where They Say** (note 10). Remove Postmortem Burn's sign. Feature Flag Tarns moves to the upper basin between the three tarns. Merge Conflict Col moves into a real col. Stack Trace Thicket moves well away from the woods' sign. Off By One Peak's sign goes onto the peak. All in `habitat()`.
- [ ] **C10 New Signs and Names** (notes 10, 27). **Waits** for section 5: the woods' new name, and signs for the gold hills, the wildflower meadow below Mount Monolith and the deep rainforest south of Off By One Peak.

### D. Animals

- [x] **D1 Five Homes Each** (note 5). Every map animal (elk, moose and calf, black bears, mountain goats, bighorn sheep, marmots, squirrels and chipmunks, golden eagle, osprey, whale, orcas) has about five homes found by habitat rules and well apart, and takes one at random on each load. The spawn menu lists them all. The browser tests that click an animal must find it wherever it is.
- [x] **D2 Five Things to Do** (notes 22, 11). Every main animal has at least five animations after its real behaviour; it starts on one at random, moves through the others at random, and a click steps to the next, as Doot Doot and Peevers do (`TRICKS` in `cats.js`). Pictures first for each new pose. Starting lists, each a call to refine:
  - Elk: graze, bugle with the head thrown back, bed down, spar or thrash a shrub, trot off.
  - Moose: browse, shake his head (drawn frames, not the fast flip of note 11), wade and dip for weeds, bed down, amble.
  - Black bear: forage, stand up to look, scratch his back on a tree, dig, nap; cubs wrestle.
  - Mountain goat: stand, graze, lie on a ledge, hop up a step, butt heads.
  - Bighorn sheep: graze, rear and clash, lie down, scramble, look out.
  - Marmot: sit up and whistle, sunbathe flat on a rock, wrestle, dig, dash to the burrow.
  - Squirrel and chipmunk: sit and eat, tail flick and scold, dash, climb a trunk, bury a cone.
  - Golden eagle: soar, stoop, perch and preen, mantle, call.
  - Osprey: hover, dive and rise with a fish, shake off, perch and eat, carry a stick.
  - Whale: blow, breach, tail slap, pectoral wave, fluke up and dive.
  - Orcas: travel, spyhop (B6), breach, tail slap, porpoise fast.

### E. Weather, Events and Music

- [x] **E1 Weather in Every Scene** (note 1). The rainforest scene follows the map's weather and light (rain while the marine layer is in, shafts of sun that fade at Dusk). Every other scene does the same in its own way: the lakeside, the larch basin, the West Ridge, the walk to camp, base camp and the six climbs each read the world's weather and the hour and show it (rain rings on the lake, snow flurries and spindrift up high, cloud shadow, wind in the larches). Log what each scene shows.
- [ ] **E2 Life at Every Place** (note 19). **Waits** for TJ's picks in section 5. Each picked event: pictures first, a start button in the debug panel, and a line on the conditions board.
- [x] **E3 Three More Sets of Instruments** (note 12). Drums and percussion, strings, woodwinds: three new sets in `audio.js`, each playing all seven tunes, chosen from the music menu like the others. Their names are drafts (section 5).

### F. The Trailhead

- [x] **F1 One Thing to Click** (note 6). The trail register and the conditions board are one click target on the map, which opens the register scene; the notebook, the conditions and the map open from there. One name tag, in words the game already shows.
- [ ] **F2 Observed and Reported** (note 25). The conditions board's wildlife and events split in two: Observed lists what has happened in this session, Reported lists what has not yet, so a visitor learns what there is still to see. The two headings are TJ's own words.

### G. Closing

- [ ] **G1 The Numbers.** Frame time for every view, load time and the start page's bytes, `v0.5.0` then round 8, side by side.
- [ ] **G2 The Docs.** The round's lasting rules into `docs/DEVELOPMENT.md` and `web/ENGINE.md`; `docs/ART-PASS.md` folded down to what is still worth keeping; `docs/IDEAS.md` tidied; this file deleted; the PR marked ready and TJ notified.

## 5. For TJ to Pick

Pick one, or write your own, for each. Nothing here ships until you have.

**Names** (notes 10, 27)

| For | Drafts |
|---|---|
| Monorepo Woods, renamed | Binary Tree Grove, Git Blame Grove, Spaghetti Code Forest |
| A sign in the gold hills | Golden Path Hills, Rolling Release Hills, Greenfield Prairie |
| A sign in the wildflower meadow below Mount Monolith | Bloom Filter Meadow, Paintbrush Patch, Wildcard Meadow |
| A sign in the deep rainforest south of Off By One Peak | Root Access Grove, Old Growth Backlog, Recursion Rainforest |
| The lake below Scope Creep Glacier | Cold Storage Lake, Memory Leak Lake, Data Lake |
| The three new sets of instruments | Percussion, Strings, Woodwinds |

**Events** (note 19). Pick any number for each place.

| Place | Drafts |
|---|---|
| Sideproject Spires | Rockfall off a tower with a trail of dust. Ice calving off the glacier's snout into its lake. A banner of cloud pouring through the notches. Spindrift blowing off the summits. Alpenglow on the towers at Dusk. A pair of ravens riding the updraft |
| Proficiency Peak | A gust shaking a shower of gold needles off the larches. Rocks rattling down the talus fan. A cloud's shadow sliding across the benches. A first flurry of snow over the summit. A band of goats crossing the talus |
| Reflection Lake | A gust darkening the water as it runs across. Mist lifting off the water. A dead calm when the reflection turns sharp. A shower dimpling the surface with rings. A pair of ducks landing with a wake |
| The rainforest | Fingers of fog threading through the canopy. A sunbreak with shafts of light over the trees. A tree falling far off, and birds lifting from the canopy. A rainbow over the forest after a shower. An owl calling at Dusk |

## 6. Links

- The draft PR: https://github.com/zimmertr/trailhead/pull/66
- The game artifact for this round: https://claude.ai/artifact/WuMnWjDqffEseYPCS6zfPj (export with `git archive HEAD web/www`, set the copy's title to "Trailhead Pixel Round 8", publish `index.html` with every other file).

## 7. Log

Every call, one line each, newest last.

- 2026-11-24: the plan written from TJ's 27 notes and his answers. Note 3's "snow traverse" read as the West Ridge's walk-off after the last rappel, which round 6's note 22 was about. Note 25's second "Observed" read as "Reported".
- 2026-11-24, a finding for note 4: the Spires' trail heads left from 0.4 to 0.8 of its length (the meadow traverse) and right from 0.8 to its end (up the glacier). The scene takes over about half way, so it read "left". The peak's trail heads right throughout.
- 2026-11-24, a finding for note 11: a clicked moose flips left and right six times a second for 1.3 s (`a.shake` in `critters.js`). It was meant as a head shake.
- A1 done: Debug shows on a phone and Keys stays hidden. With five planks the music button's "Click for sound" wrapped to three lines, so on a phone the planks sit closer, under 390 px the bar uses the debug panel's 14 px lettering, and under 360 px the music button is its note alone, as it is once sound is on. Two lines tall at 390, 375, 360 and 320 px, as before. Three browser tests (390, 360, 320): every plank on screen, and Debug opens the panel. 40 browser tests pass; frame time 13.9 ms.
- A2 done: `audio.away` suspends the sound when the window loses focus, the tab is hidden or the page is put away, and resumes it on return only if it was running when it went. Any click or tap resumes it too, so it cannot stay stuck. A browser test drives blur, focus and a hidden tab. 41 browser tests pass; frame time 11.8 ms.
- A2, a call: the effects and the background sounds stop with the music, since the whole page should be silent when it is not in front.
- A3 done: the junction's signs run Reflection Lake, Sideproject Spires, Proficiency Peak (arrows left, up, right). Only the order in `content/game/trailhead.yaml` changed; nothing reads the list by position. 41 browser tests and the unit tests pass.
- A4 done, a call: the West Ridge's walk-off cuts when the last of the three is 75 px out on the snow (it was 140), 2.2 s sooner; each still makes several steps on the snow and nobody's movement changed. The ridge is 132.3 s long now, and `SECS.wall` in `pixel.js` follows. The route walks clean; 41 browser tests pass; frame time 12.0 ms.
- A5 done: the walk to camp reads the trail's heading over its last tenth, as the larch basin does, so he walks left to right with the Spires ahead on the right. That is the scene's own drawing, unmirrored, so its light is from the upper left again. The route walks clean; 41 browser tests pass; frame time 12.5 ms.
- A6 done: the forest and the lakeside stand in on the timeline from a table in `pixel.js` (`LATER`: length, stops, sounds and 25 heights each) until he starts to run, or a scrub, a jump or an address lands in one; then their code is fetched and handed to the route's legs. If he reaches one before it has arrived he waits at the edge of the stretch before it. The start page's script: 409,643 B before, 356,137 B after, in 20 files (local Lighthouse; largest paint 1,652 ms).
- A6, a call: their pictures used to be made two frames after the page opened. Arriving while he runs, each is now made as he enters it, behind the closed window, as the larch basin's are; arriving while he stands still (a scrub or a jump), they are made at once, one to a turn.
- A6: two browser tests (the table against the loaded scenes; an address inside the forest opening before it has loaded), and the earlier one now also holds that `forest.js`, `lakeside.js` and `side.js` are not fetched with the page. 43 browser tests pass; the three routes walk clean, the lake's also with reduced motion and on a phone at Dusk; frame time 10.4 ms.
- B1, the revert: `PP`, the fin's face and its talus are `v0.4.4`'s again, and the lit plane A04 added is gone. The 3,000 ft mark, the trail and the sign did not move.
- B1, the pictures: four from z-image-turbo-trailhead and four from qwen-image-2.1 of a granite fin above a larch basin. Qwen's were flat and icy; seed 2 of the first set is the pick: a few big planes, each either lit or shaded, with the palest stone along the skyline.
- B1, the retry, a call: it ships. The old outline stays. The face is cut into eleven planes whose edges lean with the tower, each lit, shaded or facing front, and the palest granite sits along the skyline and thins down the wall, which is what takes the pink at Dusk. Against `v0.4.4`'s loose streaks it reads as a tower with a sunny side and a shaded side, on a desktop and on a phone. It took five tries; the third had a flat cream wall and the fourth cream shoulders, both fixed by tying the pale tone to height.
- B1: 43 browser tests pass; frame time 10.6 ms; nothing moved.
- B2, what was measured: the benches are exactly as high as in `v0.4.4` (46, 84 and 110 at the same spots in both, read from `buildLand`), and rock is drawn on the same ground. So nothing grew. What changed in A06 is the drawing: every corner runs unbroken from the lip to the foot, and the wall is as pale as the slabs on top, so it reads as one tall sheet.
- B2, a call: the fix is in the drawing, not the heights. After a picture (z-image-turbo-trailhead, seed 2: a wall cut by level joints with cones of scree at its foot), a face over 40 high is two tiers parted by a ledge with grass on it, each tier with its own planes; level joints cut the planes into blocks; scree lies against the foot of any face over 14 high; and the wall is a tone darker than the slabs. `faceSpan` in `land.js` finds a face's lip and foot for this and for the basalt. Only the dry side's walls are drawn so; the rainforest's mossy steps are as they were.
- B2, for TJ: if the walls still read too tall, the next step is to lower the benches themselves, which moves the trail, the ladder, the falls and the signs on them. I did not do that unasked.
- B2: 43 browser tests pass; frame time 10.2 ms; nothing moved.
- B3 done, after a picture (z-image-turbo-trailhead, seed 2: crimson sprays with clusters of blue berries): the shrub's leaves are wine, crimson and a brighter crimson in the sun, with a leaf here and there still green; it is about a third lower and a little wider; and it carries blue berries, one pixel on a small shrub and two with the light on top on a big one. The larch basin grows about a third fewer clumps (`huckClumps` takes how high `grows` must be).
- B3, a call: the shrub is one drawing (`makeHuckleberry` in `sprites.js`), so the West Ridge's huckleberry changed with it. Its clumps are as many as before.
- B3, a call: three new colours, the ramp `huck`, at the end of the palette in `core.js`, because the baked ground stores colours by their number. The ground was baked again for the new signature; its picture did not change.
- B3: 43 browser tests pass; frame time 9.9 ms; nothing moved.
- B4 done, a call on how much: ten logs on the beach where there were sixteen, and three fifths of the small bleached branches painted on the sand. Both come off the end of their dice, so every log and branch that is left lies where it lay. No new drawing, so no pictures. 43 browser tests pass; frame time 9.8 ms; nothing moved.
- B5 done: the Spires' area was everything that drains to a spot 60 below the glacier's lake, so it followed the outlet stream into the meadow as a point, and it left out the east end of the lake, which sheds another way. It now ends at the lake: everything that drains to the lake's lowest spot, plus the whole lake and 6 of moraine round its toe. The edge is a round end just above the bridge. Seen with the debug panel's tap targets on; the pointer does not lift a place in the render tool, so the lifted look itself was not rendered.
- B5: 43 browser tests pass; frame time 10.3 ms; nothing moved.
- B6 done, a call: the spyhop is redrawn, not replaced. It was a post three pixels wide. After pictures (z-image-turbo-trailhead; all four came out nearer a breach, seed 2 kept for the markings), the whale stands six pixels wide and up to eleven high, leaning the way it swims: a blunt head, black with a lit edge on the back, white on the chin and throat, the white patch behind the eye, a pectoral fin at the waterline once it is well up, water running off the chin as it rises and a ring of white water round it. The timing is as it was.
- B6: seen on the map at Day and Dusk by clicking an orca in the render tool (time at 8x until the pod is in view, then a sweep of the pointer finds one). Not rendered on a phone: the drawing is the same pixels there. 43 browser tests pass; frame time 10.1 ms; nothing moved.
- C1 done: the Peak's trail is TJ's blue line, read off his screenshot (the picture's scale and place set from the Trailhead and the old rungs, then each point turned back into a spot on the map through the picture's own depth). It leaves the Trailhead east along the forest's edge, turns north-east through the aspens, crosses two creeks by footbridges, follows the edge of the dry side, climbs the step into Postmortem Burn, passes west of the burn's pond, goes up the granite by rungs east of the fall, and crosses the larch plateau westward round the north of its tarn, over the stream between the tarns. It ends where the old trail did. The old trail north through the meadow, its bridge and its rungs are gone.
- C1, what followed by itself: the footbridges, the rungs, the trail map's line and the length on the map's sheet (5.2 km became 7.7 km), the route's time on the Trailhead's sign, and the signs that stand by the trail (Dependency Range and Segfault Scree moved with it).
- C1, a call: Rollback Basin is the bench with the pond, and the trail no longer crosses it. Its sign stays on that bench, looking for the pond instead of the trail (it moved 135 px along the bench). Hotfix Burn's sign stood where the trail now climbs, so it and Postmortem Burn's sign changed places within the burn.
- C1, a call: the moose's home is 30 clear of any trail, and the new trail runs through its woods, so it moved 142 px upstream. D1 gives it five homes anyway.
- C1, a call for TJ to see: the trail now reaches the peak from the east, heading west, and the larch basin scene takes its direction from the end of the map trail (as decided for the Spires in A5). So the scene is mirrored: he walks right to left with the peak on the left, and its light comes from the upper right. C2 rebuilds this scene's start; say if the scene should keep walking left to right whatever the trail does.
- C1: the three routes walk clean, the Peak's also with reduced motion, on a phone and at Dusk. 43 browser tests pass; frame time 10.0 ms.
- C3 done by C1: the bend beside Rollback Basin's sign was in the old trail's climb onto the bench, and that stretch is gone.
- C2 done, after pictures (z-image-turbo-trailhead, seed 3 the pick: black trunks flecked with silver, thick fireweed, a fallen log, gold hills and a rimmed mesa behind, pale granite with larches ahead). The larch basin's scene now opens in Postmortem Burn: 6.5 s through dead trees, fireweed that sways, burnt logs and ground that is ash and char with green coming back, then the rungs and the basin as before. Behind the burn stands the dry country in a strip of its own: a banded mesa with a basalt rim (the badlands), the coulee's wall of columns, three rows of striped gold swells and sage at their feet. It drops below the granite wall as he nears the rungs and is gone a quarter of the way across the basin.
- C2, a call: the map now hands over where the trail comes up the step into the burn (`world.stackIn`, a quarter of the trail's climb), not at the trail's end, so the burn is not walked twice. The scene runs the way the trail heads from there, which is west, so it is still mirrored (see C1's note).
- C2, a call: the scene is 18.5 s long (it was 12), and `SECS.larches` in `pixel.js` follows. Everything that was in the basin stands where it stood: the near ground's strip grew to the left and the burn has dice of its own.
- C2, a call: the far range and its glacier still stand above the dry country. That layer hardly moves with him, so it cannot change between the burn and the basin without a second scene.
- C2: seen at Day, at Dusk and on a phone (fireweed and a few big dead trees fill the tall screen's lower slope). The Peak's route walks clean, also with reduced motion and on a phone at Dusk. 43 browser tests pass; frame time 10.0 ms.
- C4 done. Both tarns at the foot of Mount Monolith's glaciers are larger: each is now 46% of the gap between its two cleavers wide, at most 32 a side (it was 42%, at most 24), and a little deeper front to back. The middle tarn has moved one glacier west, to the foot of the glacier left of the ridge that stood on its left; its river comes down the same meadow to Reflection Lake from there. `moraineLakes` in `monolith.js` names the glacier, and the map and the lake scene both read it, so the lake scene's left waterfall moved with it.
- C4, a call: no new pictures. This is the tarn drawing that was already there, larger and in a new place, not a new or redrawn model.
- C4, a call: the tarn sits on the moraine where the ice ends, under the snout, not out in the meadow. Lower would have put it among the marmots' boulders.
- C4: check.sh reports one thing moved, the second marmot colony, 43 px east (624,537 to 667,537), because the tarn's river took its old ground. It still sits on a boulder in the lupine. The lake's route walks clean with reduced motion. Seen at Day, at Dusk and on a phone. 43 browser tests pass; frame time 10.0 ms.
- C5 done. The melt water that leaves Mount Monolith's two tarns now moves as the map's other streams do: its white runs down it. It stood still because that stretch, from each tarn's notch down to where the stream first shows on the land, is painted into the mountain's picture and is not in the water grid, and the map only moved white water that lay on the water grid. `falls` in `land.js` now also takes white that is painted and has painted stream blue on both sides of it: 136 pixels, all of them on the two streams (checked by listing them).
- C5, a call: the same movement as the other streams' riffles (the white comes and goes in a wave that runs downhill), not a waterfall's solid white, because the note asks for the same moving water and the stream is a thread two pixels wide.
- C5, a call: no pictures. Nothing was drawn; water that was already painted moves.
- C5: seen at Day, at Dusk and on a phone. Nothing moved. 43 browser tests pass; frame time 10.2 ms.
- C6 done, after pictures (z-image-turbo-trailhead, seed 2 the pick: level ripple lines that break the mountain's reflection, a darker ruffled band along the far side, a trout clear of the water over a flat ring). Reflection Lake, the Spires' lake, the larch basin's eight tarns and ponds and Mount Monolith's two moraine tarns all move now: short level ripples that drift east and come and go, a few glints in patches, and every 16 to 26 s a gust that crosses each lake from the west as a darker band of short dashes and wipes the reflection out as it passes. In the clear lakes (Reflection Lake, the three clear tarns, the two ponds) a trout jumps every 9 to 20 s: five pixels up, six along, a splash, and a ring from where it left and where it landed.
- C6, how: `buildTerrain` in `land.js` lists each lake's water pixels from the finished picture (`still`), and `stillWater` in `world.js` draws over the ground each frame, beside `whiteWater`. Nothing in the bake changed.
- C6, a call: no fish in the milky tarns, the Spires' lake or the moraine tarns. Glacial silt holds no trout.
- C6, a call: the trout is brown and gold with a white flash, not silver. Silver was tried first and vanished into the pale reflection.
- C6, a call: the fish follows the debug panel's Animals switch; the water's own movement has no switch, as the falls have none. Glints fade to a fifth at Dusk.
- C6, a call: with reduced motion the lakes still move, as the falls and the sea do. If that should stop, it is one line.
- C6: frame time 10.7 ms zoomed out at Dusk (it was 10.2). Seen at Day, at Dusk and on a phone, each lake up close. The lake's route walks clean with reduced motion. 43 browser tests pass. Nothing moved.
- C7 done, after pictures (z-image-turbo-trailhead, seed 3 the pick: milky turquoise water, the ice cliff mirrored as pale streaks under a dark waterline, pale shallows, small white bergs with blue sides, a grey gravel shore). The lake at the glacier's foot was a flat pale sheet with white specks. Now it is turquoise melt water in flat tones, a little deeper in the middle, with pale shallows along the near shore and round the ends, a dark line of shadow where the ice meets the water, the cliff's streaks mirrored under it, up to nine bergs (white top, blue side, a shadow on the water) thick against the ice and few farther out, a little brash near the cliff, and a strand of grey moraine gravel along the near shore. `siltWater`, `siltShore` and the block after the snout's face in `land.js`.
- C7, a call: the item is ticked for the lake itself. Its name tag still waits for TJ's pick in section 5.
- C7, a call: the melt water that falls off the ice cliff used to be painted on across the whole lake as a white and blue stripe. It now stops at the waterline.
- C7, a call: the lake keeps its size and place, so the trail, the outlet's fall and the Spires' area are where they were. It moves with the other lakes (C6): ripples, glints and gusts, no fish.
- C7, a call: at Dusk the shallows take the tarn colours' warm end, as the larch basin's tarns do, so the shore glows peach where it was flat mauve.
- C7: seen at Day, at Dusk and on a phone beside v0.5.0. The Spires' route walks clean with reduced motion. Nothing moved. 43 browser tests pass; frame time 10.5 ms.
- C8 done. Skunk cabbage now grows in the three places TJ circled on his screenshot: along the rainforest creek north of the maples (16 plants), at the creek's mouth behind the beach (16) and by the footbridge below Reflection Lake (8). The circles were turned into ground coordinates from Reflection Lake's edges on the screenshot. The rule in `land.js`: on the bank, two to seven from running water and never in it, on ground that is nearly level, off the sand and seven clear of the trail. Their own dice, so nothing else moved.
- C8, a call: no pictures. It is round 6's skunk cabbage drawing, planted in more places.
- C8, a call: by the footbridge the plants stand on both banks, in the open meadow. Against the meadow's grass their leaves show less than in the forest's shade; the yellow hoods carry them. If they should stand out more there, the drawing needs a darker leaf, which would be a redraw and its own pictures.
- C8: seen at Day, at Dusk and on a phone beside v0.5.0. Nothing moved. 43 browser tests pass; frame time 10.3 ms.
- C9 done, all in `habitat()` in `land.js`. Postmortem Burn's sign is gone, and its name with it (`content/game/names.yaml`). Feature Flag Tarns stands between the three milky tarns of the upper basin (it stood by a tarn on the middle step). Merge Conflict Col stands on the grassy saddle between Mount Monolith's flank and the Spires' west buttress: the rule looked for the lowest point 60 in front of the line between the two, which is a meadow slope, and now looks on the line itself and keeps to the saddle's own ground. Stack Trace Thicket stands at the north edge of the woods, where the lake's trail leaves the trees by the creek's footbridge, 150 or more over the ground from the woods' sign (104 on the picture; they stood 71 apart on one line). Off By One Peak's sign stands on the summit beside the lookout, 17 clear of the tower (it stood on a shoulder that is a little higher on the land but does not look like the top).
- C9, a call: the burn's one sign, Hotfix Burn, now stands among the dead trees, where Postmortem Burn's stood. It stood on the granite above the burn, which the burn's reach also covers, and with the other sign gone nothing would have marked the burn itself.
- C9, a call: the woods' sign has not moved. Its place came from the old edge spot, so the rule keeps that spot in mind without putting a sign on it.
- C9, moved without being asked, because signs keep 70 from each other and two of them left the middle step: Dependency Range, 60 px east to the top of the rungs, and Segfault Scree, 34 px east on the same talus. Two goats of the upper basin moved 96 px west to make room for Feature Flag Tarns' sign. All still keep their own rules.
- C9, a call: no new signs. The Palouse's, the meadow's and the deep forest's wait for TJ's names in section 5, as does the woods' new name.
- C9: seen at Day, at Dusk and on a phone. The lake's and the Peak's routes walk clean with reduced motion. 43 browser tests pass; frame time 10.7 ms.
- D1 done. `habitat()` in `land.js` now finds more homes for each map animal by the animal's own rule, well apart, and returns them as `spots.homes`; `critters.js` draws this visit's homes when the map loads. What the rules found: elk 4 (the herd moves as one), moose 3, goats 6 (the two pairs take two), bighorn sheep 3 benches (the band takes one), marmots 6 (the three take three; four are boulders in the meadow under Mount Monolith, two are on the Spires' moraine), squirrels and chipmunks 12 (the seven take seven), bears 5 (the clearing below the fall and four forest edges), the whale 5 for its first breath (it has always come up somewhere new after that), the osprey 5 places on Reflection Lake to fish, the golden eagle every sea stack. "About five" is what the country gives: the moose's riverside woods and the sheep's benches hold fewer.
- D1, how nothing else moved: the extra homes are found after everything else in `habitat()`, and the ground they take is given back before the function returns. The first home of each animal is the one it has had, and check.sh reports nothing moved.
- D1, a switch: `homes=0` in the address keeps every animal on its first home, for screenshots and before and after pictures; `homes=<n>` draws the same homes every time. Without it the dice are the browser's.
- D1, a call: the bear family in the clearing below the fall is always at home (T34). The family that visits on one load in three (T44) is the one that takes a forest edge at random.
- D1, a call: the osprey's five homes are five places on the one lake it fishes. The map has no other lake with fish big enough to carry off.
- D1, a call: the orcas have no homes. The pod passes along the coast on its own clock and was left as it is.
- D1, a call: every parkland marmot home has its boulder whether a marmot is on it this visit or not, so the meadow has three more boulders than before.
- D1, the spawn menu lists every home of every animal. Sending an animal to a home moves its young with it, each to ground of its own beside her: the first try put a kid on a cliff, and a browser test that visits every home of every animal found it. A goat, a squirrel or the moose is not sent to a home one of its kind already has.
- D1, tests: two new browser tests. One sends each animal to each of its homes in turn and asks the engine rules after every move; one loads the map with four seeded draws, asks the rules and clicks an animal. 45 browser tests pass; frame time 10.8 ms.
- D1, a risk: the other browser tests load the map with the dice free, as a visitor does. If one of them turns out to depend on where an animal stands, it will fail now and then on CI; `homes=0` in that test's address is the fix.
- D1, CI failed on the first push: the new test that sends each animal to each home asked the engine rules about 40 times over several seconds and caught a squirrel drawn for one frame where no land animal may stand. The old rules test asked once, at load, so this is older than D1 and D1's test is what found it.
- D1, the cause, in three parts. An animal's place is kept in fractions of a pixel and drawn on the nearest whole one, and the look ahead asked about the fraction, not the pixel drawn. The look along the line before setting off sampled it every 3 px. And a walker's speed up and down the picture was cut to 0.7 by scaling only that part of its step, which bent its path away from the straight line it had looked along.
- D1, the fix in `critters.js`: every look rounds to the pixel that is drawn; `way` looks twice a pixel; a walker moves along the straight line and is slowed by how steeply the line runs up the picture; and one shared `step` refuses a step onto a pixel no land animal may stand on, so the animal stops and looks about. Squirrels, marmots, goats, sheep, elk, moose and bears all walk through it.
- D1, a visible change: an animal that walks on a slant now goes straight to its spot. Before, it drifted sideways first and finished the climb last.
- D1, how it was tested: the rules asked four times a second for 90 s on five draws of homes (0, 0, 5, 6, 7), no breach. Before the shared step one run in four still caught a sheep on its bench's edge. 45 browser tests pass; frame time 10.3 ms; check.sh reports nothing moved.
- D1, CI failed a second time, on Lighthouse: the start page's largest paint came at 3054 ms against a limit of 3000. Measured here, the page was ready in about 930 ms at C9 and 1200 ms after D1: five of the searches for extra homes look over the whole map when they find fewer than they were asked for, and together they took a quarter of a second at every start.
- D1, the fix: what those searches find goes into the bake as text (`homes` beside `falls` in `ground.png`; `bake.html`, `bake.mjs`, `readBake`), and `habitat()` reads it back. Without a bake it works them out as before. Every home is the same as before the change, and the page is ready in about 930 ms again.
- D1, a lesson for the rest of the round: anything `habitat()` or `buildTerrain()` does runs at every start. A new search there is timed before it is committed, and goes into the bake if it costs more than a few milliseconds.
- D2 done: every animal of the map has five things to do after its real behaviour, starts on one at random and takes up the others by itself, and a click steps to the next in a fixed order. Pictures first: 31 prompts, four seeds each, on `z-image-turbo-trailhead` (`design/art/R8-D2/log.jsonl`); every pose was drawn in code after the best sheet and looked at in a sprite preview before it went on the map.
- D2, the lists as built. Bull elk: graze, bugle, bed down, thrash a shrub, trot. Cow elk: graze, look, bed down, bark, trot. Bull moose: graze, shake his head, dip for weed, bed down, trot. Calf: graze, hop, bed down, look, trot. Sow: forage, stand up, rub a trunk, dig, nap. Cubs: sniff, roll, play, climb, nap. Nanny goat: look, graze, bed down, hop, butt heads. Kid: graze, hop, butt heads, bed down, trot. Bighorn: graze, rear and clash, bed down, scramble, look out. Marmot: sun, whistle, wrestle, dig, dash. Squirrel and chipmunk: eat, scold, dash, climb a trunk, bury a cone. Eagle: soar and fish as before, preen, call, mantle. Osprey: hover and dive as before, eat on a treetop, carry a stick. Whale: blow, breach, tail slap, pectoral wave, fluke up. Orcas: travel and blow, spyhop, breach, tail slap, porpoise.
- D2, note 11: the bull moose's fast left and right flip is gone. He shakes his head in drawn frames: the palms tip one way and the other and the bell swings.
- D2, a call: the list says golden eagle, and the map's eagle is the bald eagle of the sea stacks. Its acts went to that bird; no second eagle was added.
- D2, a call: a cow elk grooming her flank could not be read at this size, so cows bark and only the bull bugles.
- D2, a call: the creeks are too narrow for a moose to wade. He walks to the nearest bank he can stand on and dips from there, and comes up with green weed at his muzzle.
- D2, a call: the sow rubs with her paws on the trunk. She only rubs where a trunk is within a straight walk; elsewhere that turn passes on to digging.
- D2, a call: head to head acts (the rams' clash, a nanny and her kid) need the two to reach each other by a straight walk. Either one may go to the other; where a ledge lies between them the turn passes on.
- D2, a call: a marmot on a boulder hops down to the grass at the boulder's foot to wrestle or dig, and back up afterwards. Its wrestling partner is drawn only for the bout.
- D2, a call: the whale's first rise in each slot stays a blow, so the spout still tells you where to look; the second is a slap, a wave or a fluke. A click asks for the next one, or brings the breach forward.
- D2, a call: the pod porpoises for a stretch of each pass without changing its speed, so the timing of the pass and of the B6 spyhop is as it was.
- D2, a call: a click on an osprey that is flying in changes its errand (fish, a treetop meal, a stick); otherwise it starts the next visit.
- D2, a call: an act's sound (the bugle, the clash, a huff) is heard only while its animal is drawn. One new sound, the clash of horns, in `audio.js`.
- D2, a call: the starting act is drawn with the homes' dice, and `homes=0` turns it off with the homes, so tests and compares start from rest.
- D2, a fix found on the way: a cub climbing down from a trunk could be set on ground no land animal may stand on. It now steps off onto the first spot that is allowed.
- D2, no new words: nothing here has a name or a card.
- D2, how it was tested: every animal clicked in turn, about 580 clicks in 75 s, with the rules asked twice a second, on homes 0, 5 and 6, and one run of 75 s with no clicks: no breach. A new browser test clicks every animal eight times on two draws and asks the rules after each round (46 tests pass). The page is ready in about 960 ms, as before; the scripts grew by 13.6 kB gzipped; frame time 11.5 ms; check.sh reports nothing moved.
- E1 done: every side scene reads the world's sky and shows it. The sky is one report from `world.js` (`sky`): the marine layer as before, and now the volcano's squall (`snow`, and `banner` as it clears), the map's own gusts as they reach a place (`gust`) and the shadows of its fair-weather clouds over a place (`shade`). The drawing is shared in a new `weather.js` (rain, rings on water, mist, a veil, a sea of cloud, flurries, spindrift, a cloud's shadow). Pictures first: 12 prompts, four seeds each, on `z-image-turbo-trailhead` (`design/art/R8-E1/log.jsonl`).
- E1, what each scene shows. The lakeside: the marine layer's fringe (half the drizzle, rings on the lake, a grey over the far view, mist thickening on the water and lingering as the layer lifts), each gust as a dark ruffled band crossing the water, a cloud's shadow over the far shore, and the sun's glints fading with the light. The larch basin: the map's gusts drive the needle showers, a gust in the burn lifts a low billow of ash and dust, and a cloud's shadow crosses the benches. The West Ridge: the map's gusts in place of its own clock, and in the squall the far range greys and snow blows across. The walk to camp: a sea of cloud in the valley below while the marine layer is in, a banner of snow off the highest tower and spindrift off the glacier on each gust, a cloud's shadow over the valley and the ice, the squall's grey and its snow. Base camp: more snow off the tops on each gust, the stove's smoke bent over and the flags snapping, a cloud's shadow on the ice, the squall's grey and its snow, and the tent lit from inside at Dusk as the map's is. The climbs: spindrift off the snow around him on each gust and the squall's snow, wherever the climb's own sky is clear.
- E1, a call: the marine layer stops short of Reflection Lake on the map, so the lakeside has its fringe and never the full deck. The high scenes stand above the layer: they see it as cloud in the valley, not as rain.
- E1, a call: snow in the high scenes comes only from the squall, which the map shows over the volcano. I did not invent snowfall the map does not have. The squall is rare, so its start button now works in every scene.
- E1, a call: a climb's own storm, whiteout or sea of cloud is part of its route's story and is left alone; the world's weather shows only where that sky is clear. The West Ridge keeps its own rising sea of cloud too.
- E1, a call: the larch basin's and the ridge's gusts now come about one in eleven seconds (the map's) instead of one in fourteen and one in nine. With the Clouds layer off in the debug panel each keeps its old clock.
- E1, a call: a cloud's shadow in a side view darkens the ground below the horizon only; the peaks stay in the sun, as in the pictures.
- E1, a fix on the way: the fog's colour table never picks a neutral grey (that rule keeps the forest green), and it turned the granite towers olive under the squall. The squall has its own blue-grey table, and the sky's bands each go a few steps paler so the gradient stays smooth.
- E1, TJ on 2026-11-24: "Weather should be manageable in the debug menu as well". The debug panel has a Weather group in every scene with a sky: Marine layer and Summit squall (moved there from the map's events), and three new buttons: a gust that reaches where he is now, a cloud's shadow brought over, and a clear sky (the layer gone, the squall over). They start the map's own clocks, so the map and the scenes stay one world. New words, drafts for TJ, in `content/game/interface.yaml`: "Weather", "Gust", "Cloud shadow", "Clear sky".
- E1, for screenshots and tests: `window.__sky` is laid over the sky report (`pixel.js`), so a render can hold any weather still.
- E1, how it was tested: a new browser test jumps to each of the six scenes, presses all five weather buttons and runs every kind of weather at full strength (47 tests pass). A frame at Dusk with everything on takes 1.9 to 4.1 ms in the six scenes (clear: 2.0 to 3.1). Frame time on the map 10.8 ms; check.sh reports nothing moved. The white patch in the meadow at the start of the walk to camp is the snow patch that was already there.
- E1, CI failed once, on the type check: the new test set `window.__sky` back to `undefined`, which its own type did not allow. The type now says so. A lesson for the rest of the round: `make typecheck` runs here, in Docker, before a change to a test is pushed; check.sh does not run it.
- E1, CI green after the type fix (24 checks).
- E3 done: three more sets in `audio.js`, picked from the music menu like the first three, each playing all seven tunes from the same notes. Percussion: the melody and the broken chords on marimba bars, the bass on tuned toms, the drums louder, with a shaker, a woodblock and tom fills of its own. Strings: bowed melody and bass (two saws a few cents apart behind a filter that opens as the bow bites), plucked chords, no drums. Woodwinds: a flute for the melody, a clarinet for the chords, a bassoon for the bass, the drums quiet.
- E3, how: the first three sets play one plain wave a voice. The new ones need more, so `voice()` builds a note from several oscillators, a filter and an envelope, after how each instrument makes its sound. A set's entry still only names its voices.
- E3, a call: the names are the drafts from section 5 (Percussion, Strings, Woodwinds), in `content/game/names.yaml`, and wait for TJ's pick there.
- E3, a call: no pictures, since there is nothing to draw. I cannot hear the result either, so I measured it: each set rendered offline for 20 s of two tunes. The first three sit at -29.3, -36.2 and -34.0 dB; the new ones at -33.4, -34.9 and -32.2 dB after balancing (the strings came out 5 dB too quiet at first). No sample clips, and no second drops out. How they sound is for TJ's ear.
- E3, a call: the effects (a click, a flag, an animal's call) keep plain waves in the new sets, as in the music box, so nothing that answers a click changes its length.
- E3, how it was tested: the music menu's test now counts 15 entries, and a new test picks each new set and lets it play a bar (48 tests pass). The menu still fits a 320 by 568 screen. `audio.js` grew by 1.4 kB gzipped; `make typecheck` and lint pass.
- E3, CI green (24 checks).
- F1 done: on the map the register's box and the conditions board beside it are one click target (`pick` in `world.js`): one box round the pair and the gap between them, 44 map pixels across, with one name tag over its middle. A click anywhere on it opens the register's scene. The notebook, the conditions and the map already opened from there (the book, the notice on the back wall and the map behind glass), so nothing in the scene changed.
- F1, a call: the tag reads "Trail register", the name the box already had and the name the trail map's link uses. "Trail conditions" is no longer a name tag on the map; it is still the board's own title inside the scene. Its entry under `NAMES` in `content/game/names.yaml` had no other use and is removed.
- F1, a call: the two things are still drawn as two (the box on its post and the roofed board). TJ asked for one click target, not one object, and nothing was redrawn, so there were no pictures to make.
- F1, a call: the address `#kiosk` still opens the register's scene with the conditions sheet over it, so a link someone kept still works.
- F1, how it was tested: a new browser test hovers both ends of the target, reads the same tag at each, clicks the board's end and finds the book, the map and the notice in the scene (49 tests pass). Checked on a phone by a tap. Frame time 11.9 ms; check.sh reports nothing moved; unit tests, type check and lint pass.
- F2, built but not ticked yet: the board sorts round 6's two blurbs into Observed (on the screen this visit, kept in memory only) and Reported (the rest). `saw()` in `core.js` records each thing where it is drawn in view; `kiosk.sightings` in `content/game/interface.yaml` holds the words. Drafts for TJ: "Nothing yet", "Nothing left to see", "some days a second bear family". Still to do before the tick: rerun check.sh in full (49 passed and the new test passes alone), confirm the serac, aurora and owl hooks by render, the notes in `web/ENGINE.md` and `docs/IDEAS.md`, the artifact.
