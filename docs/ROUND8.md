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
- [ ] **A3 The Signs in Map Order** (note 17). The junction's buttons run Reflection Lake, Sideproject Spires, Proficiency Peak, as they lie left to right on the map. `DESTINATIONS` in `content/game/trailhead.yaml` (order only, no new words), `make words`.
- [ ] **A4 The Snow Traverse Cuts Sooner** (note 3). On the West Ridge's walk-off after the last rappel, the scene still runs too long: cut to black a little sooner. `ridge.js` (the traverse at the end of `makeScript`). The `wall` length in `pixel.js`'s `SECS` changes with it; the browser test holds them together.
- [ ] **A5 The Walk to Camp Runs Left to Right** (note 4). `ROUTES.spires` in `pixel.js` reads the trail's heading at `world.spiresIn`, where it still heads left. Read it over the trail's last stretch instead.
- [ ] **A6 The Lake's Scenes Load When He Sets Off.** The route bar at the start is the lake's, and its marks come from `forest.js` and `lakeside.js`, so both load with the page. Their stops and lengths come from a table, held to the scenes' own by a browser test, as `SECS` does for the signs. State the start page's script before and after.

### B. What the Art Pass Got Wrong

- [ ] **B1 Proficiency Peak** (note 7). Restore `proficiency` and `talusAt` in `land.js` from release `v0.4.4`, the last one before the art pass (`git show v0.4.4:web/www/land.js`). Then the retry: new pictures, the old drawing's colours, crisp planes instead of round lumps. Keep whichever is better and say which in the log.
- [ ] **B2 The Larch Basin's Cliffs** (note 8). The granite benches' faces on the map are too tall since A05 and A06. Bring their height back toward `v0.4.4`'s and keep the new texture.
- [ ] **B3 Huckleberry in the Larch Basin Scene** (note 2). `larches.js` (the shrubs of round 5, T65): deep crimson and wine instead of orange-red, fewer and lower clumps, blue berries on them.
- [ ] **B4 Less Driftwood** (note 13). `land.js` near line 1568: tone the beach's driftwood down a touch.
- [ ] **B5 The Spires' Hover Shape** (note 16). The shape that lights when the pointer is over Sideproject Spires runs to a sharp point in the meadow. End it cleanly along the toe of the lake and the terminal moraine.
- [ ] **B6 The Orcas' Click** (note 21). A clicked orca rises straight up like a periscope and it reads wrong. Redraw the spyhop after pictures (a third of the body, tilted, the pectoral fins showing, water running off) or replace the click's answer with one from D2's list.

### C. The Land

- [ ] **C1 A New Trail to Proficiency Peak** (note 18). Reroute `stack` so the game crosses more country: from the Trailhead east along the forest's edge, north-east through the aspens to the dry side's edge, up the river through Postmortem Burn, and onto the larch plateau from the east (TJ's blue line; his screenshot is `~/Desktop/Screenshot 2026-11-22 at 12.44.19 PM.png`). The old trail north through the meadow goes. Bridges, signs, the trail map and the route's length follow. Walk every route.
- [ ] **C2 The Burn on the Way Up** (note 18). The larch basin scene starts in the burn: charred snags, fireweed, the gold hills, the coulee and the badlands behind, then the climb onto the benches and the larches as now. One scene, one cut. Pictures first.
- [ ] **C3 The Bend by Rollback Basin** (note 15). Remove the little bend in the trail beside the Rollback Basin sign. If C1 took that stretch of trail away, say so and tick it.
- [ ] **C4 Monolith's Tarns** (note 26). Make the tarns at the foot of Mount Monolith's glaciers larger, and move the middle one to the left of the ridge on its left. `monolith.js` (`moraineLakes`), `land.js` (`TARNS`).
- [ ] **C5 Meltwater That Runs** (note 14). The rivers that leave Monolith's tarns do not move as the other rivers do. Give them the same moving water.
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
