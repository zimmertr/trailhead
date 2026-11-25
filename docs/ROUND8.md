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
- [ ] **C6 Lakes That Move** (note 9). Reflection Lake and every tarn on the map: shimmer, small waves, a gust darkening the water as it crosses, and a fish jumping now and then. Drawn over the baked ground each frame, in its own small function; watch the frame time.
- [ ] **C7 The Lake Below Scope Creep Glacier** (note 27). The lake at the glacier's terminal moraine is substantial: raise its quality to Reflection Lake's (shore, shallows, ice floes, reflection). Pictures first. Its name tag **waits** (section 5).
- [ ] **C8 More Skunk Cabbage** (note 20). Three more patches, by rule: along the rainforest creek north of the maples, at the creek mouth behind the beach, and by the footbridge below Reflection Lake's outlet (his screenshot: `~/Desktop/Screenshot 2026-11-22 at 12.53.37 PM.png`).
- [ ] **C9 Signs That Stand Where They Say** (note 10). Remove Postmortem Burn's sign. Feature Flag Tarns moves to the upper basin between the three tarns. Merge Conflict Col moves into a real col. Stack Trace Thicket moves well away from the woods' sign. Off By One Peak's sign goes onto the peak. All in `habitat()`.
- [ ] **C10 New Signs and Names** (notes 10, 27). **Waits** for section 5: the woods' new name, and signs for the gold hills, the wildflower meadow below Mount Monolith and the deep rainforest south of Off By One Peak.

### D. Animals

- [ ] **D1 Five Homes Each** (note 5). Every map animal (elk, moose and calf, black bears, mountain goats, bighorn sheep, marmots, squirrels and chipmunks, golden eagle, osprey, whale, orcas) has about five homes found by habitat rules and well apart, and takes one at random on each load. The spawn menu lists them all. The browser tests that click an animal must find it wherever it is.
- [ ] **D2 Five Things to Do** (notes 22, 11). Every main animal has at least five animations after its real behaviour; it starts on one at random, moves through the others at random, and a click steps to the next, as Doot Doot and Peevers do (`TRICKS` in `cats.js`). Pictures first for each new pose. Starting lists, each a call to refine:
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

- [ ] **E1 Weather in Every Scene** (note 1). The rainforest scene follows the map's weather and light (rain while the marine layer is in, shafts of sun that fade at Dusk). Every other scene does the same in its own way: the lakeside, the larch basin, the West Ridge, the walk to camp, base camp and the six climbs each read the world's weather and the hour and show it (rain rings on the lake, snow flurries and spindrift up high, cloud shadow, wind in the larches). Log what each scene shows.
- [ ] **E2 Life at Every Place** (note 19). **Waits** for TJ's picks in section 5. Each picked event: pictures first, a start button in the debug panel, and a line on the conditions board.
- [ ] **E3 Three More Sets of Instruments** (note 12). Drums and percussion, strings, woodwinds: three new sets in `audio.js`, each playing all seven tunes, chosen from the music menu like the others. Their names are drafts (section 5).

### F. The Trailhead

- [ ] **F1 One Thing to Click** (note 6). The trail register and the conditions board are one click target on the map, which opens the register scene; the notebook, the conditions and the map open from there. One name tag, in words the game already shows.
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
