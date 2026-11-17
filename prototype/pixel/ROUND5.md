# Round 5: TJ's 78 notes on round 4

Status: **paused on 2026-11-16 at D4 for section 0, which comes first.** Before that: planned; TJ starts the loop on 2026-11-16 and goes AFK. He answered every question that day. Then work the checklist in section 8 from the first unticked item, one item at a time, straight through to the end. Round 5 has no checkpoints (section 2).

This file is written so that someone with no memory of the conversation can do the work exactly as TJ and the planner understood it. Read all of it once, then work the checklist from the top. Where this file and `ROUND4.md` disagree, this file wins.

## 0. Before round 5 goes on (decided with TJ on 2026-11-16)

**Section 0 comes before section 8. Take no item from section 8 until every item here is ticked.**

On 2026-11-16 TJ stopped the loop at D4 and asked for a review. It found that https://github.com/zimmertr/trailhead/pull/31 (round 4 into main) was never merged, that no check in CI loads the game (the site's lint and repo tests skip `prototype/`), that the PRD, the README and `CLAUDE.md` still describe a low-poly 3D world, and that D1 and D2 had drifted from TJ's sketches (corrected the same day, section 11). TJ's words: "we should maybe set up basic CI to enforce linting and whatnot before we do so that everything in that massive PR passes through CI at least once." He agreed to every change below. The planner (Fable) wrote this section. The work is done on Opus, one item at a time, with the same rules as section 2.

### The one-time exception to "TJ merges"

TJ, 2026-11-16: "This project has a one-time exception to merge these round 4/round 5/ci related PRs without me overnight." His standing rule is that nothing reaches `main` without him. He narrowed it the same evening: "Lets not merge round 5. I stil lwant to review it. I just want to enable you to straighten out the repo and work on round 5 tonight for me to review tomorrow. And that requires you to move round 4 when ready I think". So, for this run only, the loop may squash-merge:

- https://github.com/zimmertr/trailhead/pull/31 (round 4), at S1h.
- A pull request that only repairs CI after that merge (for example a run on `main` that fails because of it).

**Never https://github.com/zimmertr/trailhead/pull/32 (round 5). TJ reviews it and merges it himself.** Nothing else either: no Renovate PR, no issue's PR, no other repo.

What the exception does not change:

- Every check on the pull request has passed before the merge. Never merge with a check failing, pending or skipped by hand, and never switch a check off to get there.
- Always through the pull request (`gh pr merge <n> --squash`, the only kind the repo allows). Never a push to `main`, never a force push to `main`, never a change to the repo's settings.
- Every merge to `main` starts the Release workflow, which builds and pushes the four images and tags a version. That is expected. Watch the run. If it fails, do not revert and do not push to `main`: find the cause, open a pull request with the fix, and tell TJ by PushNotification.
- Nothing is deployed and no server is touched. TJ's rule on his servers and clusters stands as written.
- **It ends when S2a is ticked, or as soon as TJ writes anything in the session after starting the loop, whichever comes first.** The loop prompt firing again is the scheduler, not TJ. From then on TJ merges again, and a merge needs his word.

Log every merge in section 11 with the pull request's link, the commit on `main` and the Release run's result.

### S1. Make #31 checked and true, on branch `pixel-round4-opus`

Work in the scratchpad clone on `pixel-round4-opus`. Commit small and push after each item. #31 is merged at S1h and not before.

- [x] S1a. **ESLint covers the prototype.** In `tools/eslint/eslint.config.js`, take `prototype/**` out of `ignores` and add one block for `prototype/**/*.js` with `js.configs.recommended` and browser globals, and one for `prototype/**/*.mjs` with Node globals. None of the site's TypeScript or comment rules apply there. Measured on 2026-11-16 on `www/`: 59 findings, 55 `no-unused-vars` and 4 `no-undef`. Fix each by hand. An unused name can be a missed call, so read the code round it before deleting, and treat each `no-undef` as a possible bug. Before the first fix, film the reference views with `frames.sh` (its clock is fixed, so the same code gives the same frames). After the last fix, film them again. Any difference is a bug in a fix.
- [x] S1b. **A browser check loads the game.** A Playwright spec in `e2e/` (the tool the repo already uses), run in Docker by a `make` target modelled on `make browser`, and by a new job "Prototype Smoke" in `.github/workflows/pr.yml`. It serves `prototype/pixel/www` and opens: the Trailhead, each of `route=lake`, `route=stack` and `route=spires` at `p` 0.05, 0.5 and 0.95, one `route=spire:<id>`, `#register` and an address that is off route. Each must reach `window.__ready`, with no page error and no console error or warning. The page warns on localhost when `ground.png` no longer matches the map, so the same check catches a stale bake. Assert in the spec, never with shell in the workflow.
- [x] S1c. **The repo-wide tests walk `prototype/` again.** In `tests/repo.ts`, stop skipping the folder as a whole. A0 found two tests that failed on it (a Dockerfile that is not a service, and `npm i` in it). Skip only what is about the site's services, each with a one-line reason, and fix what is a real finding.
- [x] S1d. **No comment points at a file that is not there.** The comments A0 added to `tests/repo.ts` and `tools/eslint/eslint.config.js` name `ROUND5.md`, which is not in #31. Point them at the prototype's row in `CLAUDE.md`.
- [x] S1e. **Decision record 0015: the world is pixel art.** TJ was asked on 2026-11-16 whether it should also say that `web` serves the prototype's plain JS as it is (the planner's recommendation, with type checking through `// @ts-check` and JSDoc added file by file later, as its own issue after round 5). If section 11 holds his answer, record it. If not, the record says only that the world is pixel art and that https://github.com/zimmertr/trailhead/issues/14 decides how it is served. The record supersedes the PRD's "Low-poly throughout". Bring `docs/PRD.md` and `CLAUDE.md` into line with it: the places' names as the game shows them (Reflection Lake, Proficiency Peak, Mount Monolith, Sideproject Spires), the pixel renderer in place of WebGL, and the phases as they now stand. In `README.md` change only the sentences that are now untrue, in TJ's voice, and quote each changed sentence in the PR's description for him to approve.
- [x] S1f. **Round 4's two open ends are closed** (TJ, 2026-11-16: "Close both"). In `ROUND4.md`, mark J6 closed (the walk gets no find unless TJ picks one later) and the list of what was still below round 3 closed (his 78 round 5 notes replace it).
- [x] S1g. **Issues that no longer say what is true.** Read https://github.com/zimmertr/trailhead/issues/5 ("The world has no sound"), https://github.com/zimmertr/trailhead/issues/9 ("The repo has no code, build or CI yet") and the pair https://github.com/zimmertr/trailhead/issues/6 and https://github.com/zimmertr/trailhead/issues/35 (both about Strava and Peakbagger). Check each against the repo. Close nothing. Write what you found and what you would do with each into the report for TJ.
- [x] S1h. **Merge #31** (the exception above). In this order:
  1. Rewrite its description: what it adds, the new checks, and a "Not in this PR" section that is true. Its title stays a conventional commit title, because the squash commit takes it and the release reads the version bump from it.
  2. Fetch. If `pixel-round4-opus` is behind `origin/main`, merge `origin/main` into it and push. Wait for every check to pass on the last commit.
  3. Tag that commit `archive/pixel-round4-opus` and push the tag. The repo deletes a branch when its pull request merges, so the tag is what keeps the 100 commits.
  4. Merge `origin/pixel-round4-opus` into `pixel-round5` and push, resolving the conflicts with S1a's fixes once. After this `pixel-round5` holds every round 4 commit, which step S2a relies on.
  5. `gh pr merge 31 --squash`. Confirm it reads MERGED, then watch the Release run on `main` to its end.
  6. Tell TJ by PushNotification: the link, the version released, one line on what it is.

### S2. Round 5 moves onto `main`

TJ, 2026-11-16: "Why do we need a wait? I want to run overnight end to end." So nothing here waits for him.

- [x] S2a. **Tidy up after #31's merge.** Close https://github.com/zimmertr/trailhead/pull/22 with a comment (the Renovate rule landed in #31). Check that `pixel-round4-opus` is gone from the remote and that https://github.com/zimmertr/trailhead/pull/32 now points at `main` (GitHub moves it when the base branch is deleted; if it did not, `gh pr edit 32 --base main`). Then bring `main` into round 5. The squash commit and round 5's history add the same files, so an ordinary merge reports a conflict on every file round 5 has since changed, and brings back any file round 5 has deleted. Round 5's side is right in every case, because S1h step 4 put every round 4 commit into `pixel-round5` first. So:
  1. `git fetch`, then `git diff --stat archive/pixel-round4-opus origin/main`.
  2. If that is empty (the usual case: `main` is exactly round 4's last commit), run `git merge -s ours origin/main` on `pixel-round5`. It records the merge and changes no file. Check that `git diff ORIG_HEAD HEAD` is empty.
  3. If it is not empty, something else reached `main` in between. Run `git merge -X ours origin/main`, then check that `git diff --stat ORIG_HEAD HEAD` lists the same files as step 1 and nothing more. A file round 5 deleted on purpose may have come back: delete it again. If the lists still differ, `git reset --hard ORIG_HEAD` and work out why before trying again.
  4. Push. Never rebase `pixel-round5` here: each of round 4's 100 commits would conflict with the squash.
- [x] S2b. Run the lint over round 5's own code and fix what it finds. Bake. Every check on #32 passes, "Prototype Smoke" included. Add round 5's new addresses to the spec if it lacks them.
- [x] S2c. **Find out whether the baked ground loads on the artifact host** (open since round 4). Add `baked: true|false` to `window.__info`, publish, open the round's artifact with Claude in Chrome and read the value. Log it in section 11. If it is false, find out why and log that too. Do not halt for it.

**If `main` moves again during the round** (a Renovate merge, a CI fix): at the start of the next item, merge `origin/main` into `pixel-round5` in the ordinary way, with no `-X ours`, and resolve any conflict by reading it.

### S3. Before section 8 goes on

- [x] S3a. **The lake's size.** TJ chose A on 2026-11-16 ("A is fine"): 1.6 times round 4's width, as built. Nothing to change. The comparison is at https://claude.ai/artifact/HvkoYcpd9EeTznWr6DZKCZ.
- [x] S3b. **TJ's screenshots leave the repo** (TJ, 2026-11-16: "Move to an artifact"). Publish every picture in `plan/round5/` on one private artifact page of its own, each with its note's number and its description from section 12. Put the page's link at the top of section 12, then `git rm` the pictures. The water audit's pictures (D4) go on that page too, never into the repo.
- [x] S3c. **One command checks an item: `check.sh <item>`.** It runs the syntax check on every file in `www/`, the browser check from S1b, the frame time of the zoomed-out map at Dusk, and writes `out/check/<item>.json` with every trail's points and every placed sign and animal, then prints what moved more than 8 pixels since the item before. Section 9 uses it from here on.
- [x] S3d. Set section 10's "Next" line to D5 and carry on with section 8.

## 1. Why this round exists

TJ played the finished round 4 (https://claude.ai/artifact/JoMxgPjCfo87iZPgFwXQRk) on 2026-11-16 and wrote 79 numbered notes. There is no note 18, and note 17 is complete as written. Section 5 records every note with what he decided when asked. They fall into five kinds:

- **Bugs.** Boats sail through sea stacks, rocks float, TJ flips left and right, rain is fixed to the camera, a spire is clipped off screen.
- **Map changes.** New trails, a bigger lake fed by two moraine lakes, flower density, animals moved or added, Monolith's avalanches.
- **Controls.** Click to move, the space bar, the idle tour, a public debug menu, a day and night cycle.
- **Scenes.** The forest and lake joined by a switchback climb, camp on the glacier, two of the six climbs redesigned, and the Proficiency Peak climb retimed and re-roped as it really happened.
- **Polish.** Things that read wrong: driftwood blobs, red ground that looks like blood, a broken cliff path.

The site is a brag and resume site for TJ first and a game second. Every change should help a visitor learn who he is, or enjoy finding out.

## 2. Ground rules for whoever does the work

**Where things are**

- Repo: https://github.com/zimmertr/trailhead. Work only in a clone inside the session's scratchpad directory (under `~/.claude/tmp`), never in `~/git`, never in `/tmp`.
- Branch: `pixel-round5`. It was cut from `pixel-round4-opus` while https://github.com/zimmertr/trailhead/pull/31 (round 4 into main) was open. Once #31 is squash-merged, bring `origin/main` into `pixel-round5` by the merge in S2a (section 0), never by a rebase. Everything lives in `prototype/pixel/`. Touch nothing outside `prototype/` except to keep the README and `CLAUDE.md` true, and except what item A0 needs to make CI pass.
- **One draft PR for the whole round** (TJ's rule: one PR per piece of work, even a large one), opened at the first commit, from `pixel-round5` into `main`. Never merge it yourself: TJ reviews round 5 and merges it. The one-time exception in section 0 does not cover it.
- **One artifact for the whole round, republished after every item** (TJ, 2026-11-16: "Commits to one branch, one versioned artifact"). Create it at the first publish and add its link to section 10. Never publish over a round 4 artifact.
- Frozen: `main` (reached only through the PR), every `archive/*` and `pixel-r*` tag, and every artifact in `ROUND4.md` section 8 and `PROGRESS.md`. Round 4's final build is tag `archive/pixel-r4-final`. The old branches were deleted on 2026-11-16 after being tagged `archive/<branch name>`.
- History: `PROGRESS.md` and `ROUND4.md` (sections 3 to 5 and 9 are still the record of why things are the way they are). Ideas not yet built: `IDEAS.md`.
- TJ's screenshots for this round: https://claude.ai/artifact/C3vp7qfxAtoHGnTioe2sNs, one or more per note, named by the note's number (section 12 describes each and says how to get one back from git). New pictures for TJ go on that page, never into the repo.

**How the code is laid out** (`www/`, plain ES modules, no build step, no dependencies)

- `core.js`: the indexed-colour renderer. `ramp(name, [day...], [dusk...])` adds palette entries (`R.<name>[i]`), plus `BM` bitmaps, `pick()` with dither, `Screen` (`put`, `blit`, `iris`, `night`, `present`), the `DEBUG` flags, `breeze()`, `windAt()` and `veilTable` (cached since round 4). New ramps go just before `const INK`.
- `land.js`: the map. It holds the land's heights and materials, the rivers and lakes (`C.lakes`, `LIP`, `FALLS`), the trails (`C.trails`, routed by least cost from the Trailhead `C.T`; the `trailPts` and `track` masks), the footbridges (`BRIDGES`), the coast (`SHORE`, `SHV`), the dry edge (`BORDER`), the glacier (`GL`), every planted thing (`things`, `STACKS`), the fire lookout (`LOOK`), the flower drifts (`DRIFT`, `parkAmt`), animal homes (`habitat()`) and `buildTerrain()`.
- `bake.html`, `bake.sh`, `ground.png`: the ground worked out ahead of time. **Run `./bake.sh` after any change to `land.js`, `core.js` or anything `land.js` imports.** On localhost the page prints "ground.png is missing or no longer matches the map" when the bake is stale. Treat that warning as a failed check. Today's bake rows are `13 * SH + 4 * VD`.
- `monolith.js`: Mount Monolith, a painted piece (glacier by glacier), with its avalanche scars and refill.
- `world.js`: the map scene (`makeWorld`): drawing order, taps (`pick`), name tags, camera and opening (`lookRound`), the night sky, Dusk.
- `critters.js`: everything on the map that moves: herds and `walker`s, the bear, squirrels, whale, orcas, ferry, sea and tide (`SEA`, `EBB`, `seaRow`), jellyfish, salmon and osprey, surf, mist and birds. `mapfauna.js` and `scenery.js` hold map drawings. `events.js` holds timed map events (tumbleweed, dust devil, float plane and others).
- Side scenes: `forest.js` and `lakeside.js` (the lake loop, built on `side.js`), `larches.js` (the larch basin), `ridge.js` (the West Ridge climb of Proficiency Peak; `wall.js` is round 3's wall behind `?wall`), `approach.js` (the walk to Spires base camp), `camp.js` (base camp), `climb.js` (the six Spires climbs), `register.js` (the register close-up), `offroute.js` (the 404).
- Drawings: `fauna.js`, `sprites.js`, `people.js` (Kayti, the two climbing friends), `tj.js` (TJ's figure, `sideFig`, `backFig`), `cats.js`.
- `pixel.js`: the scene manager. `ROUTES` are lists of legs, each leg one scene drawing one stretch. It also holds stops and cards, the round-window cut between scenes, zoom, pace and input.
- `app.js`, `index.html`, `content.js`: the page round the canvas (signs, cards, timeline, trail map sheet, debug panel `openDebug`) and every word shown. `audio.js`: synthesised tunes and effects.

**How to run and look** (everything in Docker; nothing is installed or run on the workstation)

- `./shot.sh <out> '<query or #hash>' <w> <h> '<steps>' [dpr]` saves a picture under `out/`. Steps are separated by **semicolons**: `wait=600;key=Space;wheel=x,y,dy;drag=x0,y0,x1,y1;click=<css>;shot=<name.png>;down=Space;up=Space;eval=<js>`. An `eval` step cannot contain a semicolon (use newlines). `'@relief.html?...'` loads another page.
- Queries: `route=lake|stack|spires|spire:<id>`, `p=0..1`, `dusk=1`, `debug=roam,-trees,-mist`, `bear=1|0`, `sea=<s>`, `tide=`, `serac=`, `lens=`, `rain=`, `done=lake,stack,spires`, `speed=0|0.5|1|2|4|8`, `start=<event,...>`, `break=<scene>|load:<scene>|renderer|mount`.
- `window.__api`: `trigger(name)` starts a timed event in the current scene, `setSpeed(k)`, `hitAt(act)` finds where a clickable thing is drawn (click by dispatching pointerdown and pointerup on the canvas), `find`, `forget`. `window.__info` gives `{p, route, running, scene, VW, VH, S, o}`. `window.__dbg(x, y)` says what is drawn at a screen pixel. To read a value out of the page, throw it inside `setTimeout` and grep the output for `pageerror`.
- `./sheet.sh <out.png> <columns> <cell width> <files>` lays pictures side by side (`CROP=x,y,w,h` crops them).
- `./frames.sh` films with a fixed page clock (steps `wait`, `key`, `click`, `wheel=x,y,dy`, `eval`, `film=NxMS`, `time=N`). Use it for anything that moves.
- To render round 4 for comparison, export the tag into its own folder (`git archive archive/pixel-r4-final prototype/pixel/www | tar -x -C <folder>`), then mount that folder as `/www` in the same container: `docker run --rm --ipc=host -v "<folder>/prototype/pixel/www:/www:ro" -v "$PWD/out:/out" -v "$PWD/shot.mjs:/lab/shot.mjs:ro" trailhead-pixel-lab ...`. A script that needs playwright must be mounted under `/lab`.
- Edits to many places at once: a node script under `out/splice/` using an `ed(anchor, replacement)` helper that asserts each anchor matches exactly once. Run it with `docker run --rm -v "$PWD:/pixel" -v "$PWD/out:/out" --entrypoint node trailhead-pixel-lab /out/splice/<name>.mjs`.
- Syntax check: `docker run --rm -v "$PWD/www:/www" --entrypoint sh trailhead-pixel-lab -c "node --input-type=module --check < /www/<file>.js"`.
- Frame time: the profiler used for round 4's numbers (`out/m3/`) renders 800 frames per view. Section 7 lists the views. Keep every view under 16.7 ms.
- Publishing: commit from the clone root, push, export with `git archive HEAD prototype/pixel/www | tar -x -C <export folder>`, and publish `www/index.html` from the export folder with `root` set to that `www` folder. `files` must list every game `.js` (app, approach, audio, cats, camp, climb, collide, content, core, critters, events, fauna, forest, lakeside, land, larches, mapfauna, monolith, offroute, people, pixel, register, ridge, scenery, side, sprites, tj, wall, world, plus any new module) and `ground.png`.

**The bar** (TJ, 2026-11-16: "Round 4 is better than round 3. But we are still striving for improved quality that exceeds round 4.")

- Before ticking an item, render the same view from round 4's final build and from the new build, put them side by side with `sheet.sh`, and look. **Look at what moves too**, with `frames.sh`, at the zoom a visitor sees by default.
- Anything that got worse than round 4 gets fixed before the item is ticked, and is never described as "rough". The goal is better than round 4, not equal to it.
- Never put back round 3 or round 4 work across scenes on your own. If something elsewhere looks worse, list it in the report for TJ.
- Ask of every picture: "would TJ wince?"

**Rules that must not be broken**

- Never push to `main`. Never merge a pull request. The only exception is the one-time one in section 0, which covers #31 and never round 5's PR. Commit small and often to `pixel-round5` and push after every commit.
- Nothing is attributed to an AI: no co-author trailers, no "generated with" lines.
- No em dash (U+2014) in anything committed or published. Check with `grep` for the character before every commit.
- Never coin a name for a mechanism or a bug and use it as if TJ knows it. Say what happens in plain words. In the UI, name things in the words the UI already shows.
- New user-facing words are drafts for TJ to approve. They live in `content.js` and are listed in the final report.
- No references to alcohol anywhere. Three of TJ's private rules (about email, about job seeking, and this one) are never written into anything committed.
- **Never switch off or remove an existing feature** (mist, animals, effects, switches) unless section 5 says TJ asked for it. This round he asked to remove: the float plane, the salmon leap, the heron and its oxbow, the Steller's jay on the stump, the standing brown bear in the forest, the Trailhead signpost, the Reflection Lake sign near the Trailhead, the second tent, the cairn kick, the bluebird already flying at Bluebird Forecast's summit, the inversion at the end of Bluebird Forecast, the aspens in the Palouse, and two trail stretches.
- **Finds** (things a visitor can discover for a flag) are TJ's choice. Never invent one. This round he chose one new find: TJ adds a stone to the cairn on Kubernetes-Manifests. Ideas for others go into `IDEAS.md` only.
- **Place new things by rule, not by written positions.** A home such as "the open patch in the conifer stand below the Spires' outflow waterfall" is found from the land (forest density, height, water, trails), so it survives the next change to the map. The numbers in section 7 are starting points to check against, not coordinates to paste.
- **Colours.** 251 of 254 are used. New art reuses existing ramps and the free slots. If a piece truly needs more than 254, widen the palette to two bytes a pixel right then: check every scene against its last picture, log the frame time in section 11, and carry on. Never halt for it.
- **Every new timed event gets a start button in the debug menu**, and every placed animal appears in the spawn menu (C4).
- **Frame time stays under 17 ms** on every view in section 7. The map's `draw()` is too big for the browser to optimise, so put every new per-pixel loop in its own small function outside it.
- One stream of work, in order, by one agent. No forks, no parallel subagents (they used up TJ's usage limit in round 3 and needed rework).
- **Keep `IDEAS.md` growing.** TJ, 2026-11-16: "Keep adding your ideas to IDEAS.md as you have them though. I notice you haven't commited to that file in a while, don't hold back with your ideas." Write every idea down as it comes, and commit it with the item. Ideas are written down, never built. Working through `IDEAS.md` is round 6.

**When TJ is present**

- When he gives feedback, report findings and ask questions with AskUserQuestion before changing anything.
- When a question cannot wait and he is away, make the call, log it in section 11 in one line, and carry on. Never halt the loop for a question.

## 3. The law of this world

Unchanged from round 4 (`ROUND4.md` section 3), with this round's additions marked **new**.

- It is its own world, not a map of Washington. **Every feature is a real Washington feature, and every neighbour is a believable neighbour.** It runs wet in the west to dry in the east, because the crest blocks the rain.
- West to east: open ocean and fog, a coast with sea stacks, rainforest, the volcano with its lake and flower parkland, the meadow at the Trailhead under the snowy crest, larches and granite just east of the crest, pines and aspen, then sage, scabland and Palouse hills at the far edge.
- **Four kinds of mountain, one per country, and nothing else on the skyline.** (1) The snowy crest (North Cascades): dark rock, snow, glaciers. Sideproject Spires is its most dramatic massif, and the far Legacy Range is the same family seen from a distance. (2) One volcano, Mount Monolith, after Rainier: wide, lopsided, flat-topped, never Fuji. (3) Enchantments granite: Proficiency Peak (after Prusik Peak) and unnamed granite peaks behind it. (4) The dry side: basalt benches and yellow Palouse hills.
- Seasons are mixed on purpose: gold larches, full wildflowers and fireweed at once. Each place at its best.
- The ground is tiered, and water takes the lowest ground. Rivers wander downhill. Lakes have an outflow, and **water is continuous everywhere: every stream visibly joins what it flows into** (new, TJ's note 17).
- **New: solid things are solid.** Nothing that moves passes through anything solid: boats and whales never cross a sea stack or run aground, and land animals never walk on water, ice they should not stand on, or cliffs. One shared rule decides this for every moving thing (C1).
- **New: animals belong where they live.** Each animal lives in the country its real counterpart would: moose in riverside woods, bighorn on the coulee benches, marmots in the parkland, pika in the talus, an eagle on the sea stacks. Nothing sits on glacier ice at full size where the ice is drawn small and far away.
- **New: one clock for the whole world.** Day and dusk follow one world clock, the same on the map and in every scene (C3).
- **New: object permanence across scenes.** What a scene shows matches the map: camp sits where the map's tents are, Reflection Lake is the same lake on the map and in its scene, and the direction a scene walks matches the direction of the map's trail.
- The people: TJ (orange cap, beard, yellow jacket on the map; green cap and jacket in the Spires scenes), Kayti (long brown hair, purple puffy; she paints at base camp and shares TJ's tent), and the two climbing friends on Proficiency Peak: **the black-haired man, who leads every pitch, and the red-haired woman, who climbs second. TJ climbs last** (new, note 72). TJ is never shown on routes he has not climbed.

## 4. Decided with TJ before round 5 that still holds

These come from `ROUND4.md` sections 4, 4a and 5, and still apply unless section 5 below changes them. Read those sections for the reasons.

- **The map:** 1920 by 1080 world units, seen at an angle, with heights. `u` runs west to east, `v` runs away from the camera, `h` is height, and a spot draws at screen (`u`, `1080 - v - h`). The sea is in the bottom-left corner. Fog swallows the rainforest's west edge. The dry country is one slanted corner at the bottom right with a wandering edge. No country is an even band or a rectangle (TJ: stacked sections make "the world look fake and computer gnerated").
- **Names:** Reflection Lake (about TJ), Proficiency Peak (his skills), Sideproject Spires (his projects), Mount Monolith, the Legacy Range, Off By One Peak and the other joke names in `content.js`.
- **Zoom** is smooth and continuous, never stepped. TJ: "I want zooming in and out to be seamless and perfect, not stepped. This feels like a core requirement."
- **The six Spires climbs** are each about 30 seconds and each their own kind of mountaineering, chosen to echo the project. None reuses another's set piece. The visitor picks a summit at base camp. Section 5 changes two of the six designs.
- **The West Ridge** (5.7, Proficiency Peak) is the route TJ really climbed, with the pitch list in `ROUND4.md` section 5 and the sources in `plan/west-ridge-beta.md`. The rules hold: protection is drawn (cams, slings and carabiners at each piece), the rope behaves like a rope (it runs through every carabiner and sags between pieces), every belay is a multi-piece anchor, the followers are different people, there is wind and cold, and the background is far below. Section 5 changes the order of climbers, the speed, the ropes in caterpillar formation and the ending.
- **The register** at the Trailhead: anyone can read it, and signing is earned by finishing the lake, the peak and one Spires summit. New entries are browser-only, marked as waiting for TJ's approval. The real service is https://github.com/zimmertr/trailhead/issues/3.
- **Timed events** make the world feel lived in, and TJ wants them. Each gets a debug start button.
- **People don't have to finish anything.** TJ: "the website is just supposed to be impressive an informative in the end. Not an actual video game people need to 100%."

## 5. Decided with TJ for round 5 (2026-11-16)

Each heading carries TJ's note numbers as `Tn`, and the planner's additions TJ chose carry `Pn`. Text in quotation marks is TJ's own words. "Decided" marks an answer he gave to a question. "Planner's call" marks a detail the planner chose for him to veto. The checklist items in section 8 point back here.

### 5.1 Opening, camera and controls

- **T1, the first frame.** On load the camera starts north of TJ and pans down to him a moment later. "This looks glitchy and it should center on him from the start." The very first frame drawn is centred on TJ at the Trailhead, on desktop and phone, with no pan at load. Find what moves the camera after load (the opening's look target, the zoom settling, or the canvas resizing after the fonts load) and set the camera's start from TJ's position before the first draw.
- **T2, the idle tour.** The look-round tour is "cool" but "starts too soon", today after 4 seconds of idle (`world.js`, `env.idle > 4`). **Decided: it starts after 2 minutes with no input.** Any key, click, tap, wheel or drag stops it at once and eases the camera back to TJ. It is an idle animation only. It never plays as part of the opening.
- **T3, click and tap to move.** "If you tap somewhere on a path, or click somewhere on a path, TJ moves to that location." **Decided: if the click is close to a trail, he walks to the nearest trail point. Otherwise the click is ignored.** Planner's call: "close" means within 24 screen pixels of a trail at the current zoom (scale it by the zoom so it feels the same at every size). He walks along the trails, through junctions, by the shortest way over the trail network (the three trails and the lake loop form one small graph). A small marker (a pixel-art X or flag) shows where he is going and disappears when he arrives. Clickable things (animals, signs, the board, the register, the cats, name tags) keep their own click and never also move him. On a phone a tap moves him and a drag still pans. Clicking a destination's name tag or a sign plank still travels the whole route as today.
- **T36, the space bar.** On first load, space starts him walking toward the forest. "I don't think it should do anything." **Space does nothing until the visitor has chosen a destination** (a sign plank, a name tag, the menu or the timeline) or clicked a trail point. Once he is moving, a tap of space toggles moving and stopping, and holding space doubles his speed while it is held. This works the same on the map and in every scene.
- **T37, facing.** Walking a trail on a diagonal, TJ flips left and right "chaotically" (`plan/round5/37-*`). The facing must only change when the horizontal direction has clearly changed. Planner's call: average the trail's direction over the next few steps and flip only when the sideways movement passes a small threshold the other way and stays there. A nearly vertical stretch keeps the last facing, and a stretch walked straight up or down may use the back or front figure if one exists.
- **T45, the Trailhead sign.** Its arrows are swapped. It shows Proficiency Peak as straight up and Sideproject Spires as right, but on the map it is the other way round (`plan/round5/45-*`). After the trail rework (T6): Reflection Lake points left, Sideproject Spires points up, Proficiency Peak points right. Measure the distances on the planks again from the new trails (round 4's L8 method), and recompute the times.
- **T9, the debug menu goes public.** "Lets add the debug menu as an official menu item next to KEYS. Right now, it is mostly just fun stuff and I don't see why we can't enable it publicly." **Decided: the top-bar button says DEBUG**, next to KEYS. **Decided: everything is in it, including breaking a scene on purpose** ("All of it, breaking too"). Organise it into labelled groups: time of day (C3), timed events on the map, events in the scene you are in, spawn an animal (C4), overlays (tap targets, roam areas, trees off, mist off), jump to a scene, and break a scene. `?debug` in the address still opens it at load.
- **T32, roam areas.** When turned on in the debug menu, the roam areas are too hard to see over the map. Draw them with strong contrast: a bright outline two pixels wide in a colour unlike the ground, for example magenta or cyan with a dark inner edge, plus a light dithered fill, and a small label with the animal's name. Each kind gets its own colour.
- **T76, day and night.** "The nighttime/dusk sequence is beautiful. Right now it defaults to day time. Lets instead add a day/night cycle. So it starts toggled to `Auto` instead and slowly moves between day and dusk. And only sticks to one time when the button is flipped from auto to day or dusk. Add debug menu controls to time."
  - **Decided: one cycle takes about 6.5 minutes** (TJ: "5 minutes feels right, but I feel tempted by 10. Maybe 6-7 minutes?"), **split evenly** between day and dusk: 165 s of day, a 30 s sunset, 165 s of dusk, a 30 s sunrise (390 s in all).
  - **Decided: it runs everywhere**, on the map and in every scene, from one world clock. A scene's light changes slowly while you are in it. Climbs with their own weather keep their weather on top of the clock.
  - The top-bar button cycles AUTO, then DAY, then DUSK, then back to AUTO. AUTO is the default on every visit. DAY or DUSK hold that time until switched back.
  - The visit starts at the beginning of day (planner's call: so the first screen is the bright map TJ knows).
  - Debug: a slider over the whole cycle, a speed control (1x, 10x, 60x), and "jump to sunset" and "jump to sunrise" buttons. The address takes `time=<seconds into the cycle>` for screenshots. `dusk=1` still means hold Dusk.
  - Everything that today only happens at Dusk (stars, aurora, shooting stars, headlamps, deer eyeshine) follows the clock and fades in and out with it. The day and dusk palettes blend through the sunset and the sunrise. If a smooth blend costs too much frame time, step it in a few dithered stages, and log that.
- **T77, "Played on".** TJ asked what the "Played on: Music box | Console | Handheld" buttons do. They choose the music's instruments: Console is the full chiptune with drums, Handheld a thin reedy pulse wave, and Music box has no drums. **Decided: rename the label to "Music style"** and keep all three.

### 5.2 The Trailhead

- **T4.** "TJ stands in front of the Trailhead sign at the start. I actually don't think we need a trailhead sign with the Trail Conditions board and register."
  - **Remove the wooden signpost** at the junction. **Decided: the floating "Trailhead" name tag stays.**
  - "I also think they should be placed right next to each other. So move the register to the left of the board." The register box on its post stands immediately to the left of the Trail Conditions board, close enough to read as one group, with neither hiding the other. Today the register is at `REG` (`C.T[0] - 24`) and the board at `KIOSK` (`C.T[0] + 28`), both in `land.js`.
  - "I also don't like how tj Walks to the register to open it. When clicked/tapped on, lets just open it up. Just like what happens when someone clicks on the trail conditions baord." One click on the register opens the close-up at once. Remove the walk (the `register` and `register-back` routes in `pixel.js` become a direct cut, or the same overlay mechanism the board uses). Closing the book returns to the map with TJ where he was.
  - The two cats stay. The pennants on the register's post stay.
- **T5.** Remove the little Reflection Lake sign near the Trailhead.

### 5.3 Trails

- **T6.** "Add a third path from the trailhead that connects to sideproject spires from the trailhead. Rather than just two paths out of the trailhead. Reroute the trail to About Lake too." In the screenshot (`plan/round5/06-*`), magenta lines are new and lines crossed with a red X are removed. **Decided** (after one wrong question, which TJ corrected: "I didn't mean to break the loop for the forest/reflection lake by deleting a trail. Lets keep it a loop and keep teh out trail"):
  - **Exactly three trails leave the Trailhead:** the bottom trail west (lake loop, out), the old trail north-west (lake loop, home), and the new direct trail to the Spires. The Proficiency trail leaves from the old trail's first stretch as today, or as its own fourth way out if the land asks. Keep it as today unless that looks wrong.
  - **New, the direct trail to Sideproject Spires.** It leaves the Trailhead going up and to the right, curves north along the east side of the big central conifer stand, and reaches base camp at the glacier's foot.
  - **New, the bottom trail to the forest.** It leaves the Trailhead going left, runs west along the bottom of the meadow, curves north-west past the elk, and reaches the forest's edge, where it meets the existing trail that climbs through the forest to the lake.
  - **Removed:** the old trail from the bridge junction north to the Spires (replaced by the direct trail), and the lower trail by the elk bridges that runs from the bridge junction west into the forest (replaced by the bottom trail). Remove their footbridges with them.
  - **Kept: the lake trip stays a loop.** Out west by the bottom trail, through the forest, up to the lake. Home east along the lakeshore trail to the bridge junction, then down the old trail to the Trailhead.
  - Trails are routed by least cost in `land.js` today. Keep that method, and steer the new trails with waypoints taken from the land (the stand's east edge, the meadow's foot), not written coordinates. Trails cross water at footbridges as today.
  - Everything that reads the trails must follow: the routes in `pixel.js` (`lake`, `spires`, `spires-home`), `world.lakeIn`, `lakeOut` and `spiresIn`, the trail map sheet (its dots come from the routes), the sign's distances (T45), the timeline, click to move (T3), and the walk scenes' directions (T40).

### 5.4 Sea and coast

- **T7 and C1, collision.** "The ferry still clips the sea stacks. Orca pod too. I think we need to program in boundaries for some objects like these sea stacks that the game knows other objects like animals and ferries cannot move through or a collission occurs." (`plan/round5/07-*`.) **Decided: build the general system now.**
  - One shared map of where each kind of mover may go, worked out once from the land and kept up to date with the tide. Planner's call: a new module `collide.js` exporting `canBe(kind, x, y, t)` and `steer(kind, x, y, dx, dy, t)`, which returns a heading that keeps the mover clear. Each mover also has a radius, so the whole ferry stays clear, not only its centre.
  - The kinds: **boat** (deep water only: never a stack, the shore or water shallower than a set depth at the current tide); **whale** (deeper still, and never close to the beach at low tide); **swimmer and floater** (jellyfish: open water beyond the surf); **land** (firm ground that is not water, ice, cliff or a building, and inside the animal's own country); **flyer** (the eagle, the osprey, gulls and ravens, free everywhere but perching only on what may be perched on).
  - Solid things: the sea stacks (their drawn outline plus a margin), the shore and bared sand at the current tide, lakes and rivers for land animals (they may cross a river at a ford or bridge if the animal really would), cliffs and steep slopes, glacier ice (for every land animal except mountain goats at the ice's edge), the buildings (lookout, register, board) and the people.
  - Every moving thing uses it: the ferry, the humpback, the orcas, jellyfish, every `walker` and herd, the bears, the moose, the dust devils (dry ground only) and the tumbleweeds.
  - Debug overlay: show the map for a chosen kind as a tinted mask (with the roam areas, T32).
  - Keep it cheap. The masks are worked out once, or per tide step, not per frame per pixel. Any per-pixel loop goes in its own small function outside `draw()`.
- **T15, deep water at low tide.** "The orcas get too close to the shore with the tide out. and the ferry can run aground." With C1, the orcas' and the ferry's paths stay over water that is deep at the current tide. When the tide goes out they keep further off, and the ferry's course bends round the bared flats. A path that would ground waits or turns. It never pushes through.
- **T8, driftwood.** "I'm not sure what these are on the beach - driftwood? If so, I think they need a texture rework because right now they just look like blobs." It is driftwood (`land.js`, "Driftwood along the beach"). Redraw it: silver-grey, sun-bleached logs with lengthwise grain lines, a darker underside, cracked and broken ends, some with a root wad at one end, a few smaller branches, laid at different angles above the high-water line, each with its shadow.
- **T25, rivers on the beach.** "Rivers should flow across the beach when the tide is out too. But otherwise be covered up by it." Each river mouth carries on across the bared sand to the water's edge as the tide goes out: a shallow channel that spreads and braids, with wet dark sand beside it. When the tide comes in, the sea covers it again.
- **T24, a river outlet that does not join.** "There is river continuity issues for this outlet" (`plan/round5/24-*`): the river reaches the sand and a separate patch of blue sits on the beach below it. Join it (part of the water audit, E1).
- **T26, jellyfish.** "Jellyfish should move out to deeper water, right? Not sit right against the shore?" Yes: moon jellies drift offshore. Place them in open water beyond the surf, and drift them slowly with C1's floater rule.
- **T33, the tide pool.** "I never noticed the tide pool until I turned the tap targets on in the debug menu. It, and the animals within, are too small and hard to see. Make them larger, and animate teh animals inside. Not just red blobs painted on the map." Make the pool about twice the size, as a rock-rimmed basin with clear water and a lighter rim, uncovered at low tide. Fill it with drawn, animated animals: two or three sea stars (ochre purple and orange) that slowly change shape, green anemones whose tentacles sway, a crab that scuttles sideways and stops, and perhaps a small sculpin that darts. Readable at the default zoom. The find still opens on a click at low tide.
- **T28 with T16 and T19, the fishing animals.** "Move the heron so it hangs out on top of the sea stacks and flies around the top of them. Maybe occasionally catching a fish from the ocean. It might need to be swapped out for a different saltwater bird if it's not the right animal for that." "The salmon leaping is too hard to see, lets either figure out how to make it look better or remove it." "I'm not sure where "Osprey dives" triggers at, which makes me worried it's also too suble like salmon jumping." **Decided:**
  - **A bald eagle on the sea stacks.** It perches on top of the tallest stack: white head and tail, dark brown body, yellow beak, big enough to read at the default zoom. Every 40 to 70 s it lifts off, circles the stacks' tops two or three times, glides out over the open water, swoops low, snatches a fish from the surface with a splash, and returns to its perch with the fish in its talons. Debug button "Eagle fishes". It uses C1's flyer rule.
  - **The osprey moves to Reflection Lake**, made bigger (T30). Every 50 to 80 s it circles high over the lake, hovers with fast wingbeats, folds and plunges feet first with a big white splash ring, rises shaking off water with a fish, and flies off. It is drawn larger than today's (today's sprite is 13 pixels wide), readable at the default zoom. Debug button "Osprey dives".
  - **The salmon leap is removed**, with its debug button.
  - **The heron is removed with its oxbow** (T28).
- **T12, the float plane.** "Remove the float plane, I don't like it." Remove it, its debug button, its wake and any sound it makes.
- **T14, rain on the world.** "The rain that falls with the marine layer is attached to the camera, not the world. So when you move the camera around, the rain moves with the camera rather than staying stationary." Draw the rain in world coordinates: each streak belongs to a spot in the world and falls there. When the camera pans or zooms, the rain stays with the land under it.
- **T79a, the river mouth under the sea fog** (from the round 3 list). The river's last stretch runs under the sea fog and shows only as a small fan on the sand. Thin the fog over the river's final reach and its mouth so the channel shows clearly onto the beach, and keep the fog elsewhere.

### 5.5 Water and land

- **T17, continuous water.** "Water is still not continuous everywhere. The waterfall from the outflow of Reflection Lake, for example, is not" (`plan/round5/17-*`): the outflow stream stops at the cliff's top and the fall below starts separately. **Audit every join** at 3x zoom: the lake's outflow to the top of its fall, each fall's foot to its river, every tributary into its river, every stream into a lake, each moraine lake's outflow (T30), every river mouth onto the beach (T24, T25), and the glacier's toe into the Spires' tarn. Fix each, write the list and its fixes into section 11, and add a picture of each join to the round's notes.
- **T30, two moraine lakes and a bigger Reflection Lake.** "Lets add a second glacier river leaving mount rainier and feeding into Reflection Lake. This river and the other river leaving the mountain to the right of it should form from terminal moraine lakes like at the bottom of sideproejct spires. That then flow into REflection lake. Lets also increase teh size of reflection lake." (`plan/round5/30-*`: two circled moraine lakes under two of Monolith's ice tongues, a stream from each down into a much larger lake outline.)
  - **Two moraine lakes** at the foot of Monolith's glaciers: one under the ice tongue left of centre (the new river's source), and one at the head of the existing river to its right. Each is a milky teal tarn (the rule from round 4: the higher the tarn, the milkier) held by a low grey moraine rim, with the ice meeting the water and no band of gravel between (the round 4 reference of a glacier ending in its lake). Each has an outflow notch in its rim.
  - **The two streams** wander downhill through the parkland, routed over the land as every river is, and both flow into Reflection Lake. The lake keeps its one outflow at the fall.
  - **Reflection Lake is much bigger.** TJ's outline is about 1.6 times wider and somewhat deeper than today's. Widen it on its bench east and west, keep the island and the swim, and keep the lakeshore trail along its south shore.
  - The lake scene (`lakeside.js`) must show the same bigger lake, the inflows where they would be seen, and Monolith mirrored in the water.
- **T28, the oxbow.** "I don't know if this river cut is intended to be a cutoff oxbow or something, but lets remove it it doesn't look right." It was the oxbow that round 4's rule asked for ("the meadow gets at least one oxbow"). TJ now overrides that rule: remove the oxbow and let the river wander without a cut-off loop.
- **T10, the fire lookout.** Move it to the top of Off By One Peak (the highest of the forested foothills round Monolith's foot, `land.js` near the `habitat()` lookout rule). Clear its summit of trees as today, and remove the old site's clearing.
- **T21, flower density** (`plan/round5/21-*`). "The red circled area should have the most parkland, the blue highlighted area along the rivers should have a medium amount, the green highlighted areas should have a small amount, and the rest of the areas should only have sparse flower coverage."
  - **Most (red):** the band from Monolith's foot down round Reflection Lake and its bench, east across the parkland to the Spires valley's west side and up toward base camp.
  - **Medium (blue):** along the rivers. That means the streams through the central meadow, and the river corridors on the right through the aspen and pine woods by the Proficiency trail.
  - **Small (green):** the open meadow round the Trailhead, and a patch at the bottom left of the meadow near the forest.
  - **Sparse:** everywhere else.
  - Make density one field that every flower placement reads (today `DRIFT` and `parkAmt` in `land.js`), defined by rules (distance to the volcano's foot, to the lake, to water, to the Trailhead), not by drawn shapes. The drifts' kinds (lupine, paintbrush, white, heather) stay.
- **T22, more larches on the upper Enchantments plateau** (`plan/round5/22-*`). Group them among the slabs and tarns, and keep open slab between the groups so the plateau still reads as granite.
- **T23, no aspens in the Palouse** (`plan/round5/23-*`). No aspens on the dry side of the dry edge. They stay in the riverside woods west of it.
- **T27, the Legacy Range.** "The palette of the legacy range mountains is a little too blue colored I think. They should have the same snow coverage as the sideproject spires and enchantments basin peaks. So more of a grey color with a smattering of snow/glaciers on the upper reaches." Redraw it in the crest's grey rock with snow and small glaciers only high up, plus the light haze its distance needs, not a blue wash (`plan/round5/27-*`).
- **T31, Little Tahoma.** "A tiny bit too jaggy. It comes to a very sharp point. lets keep it sharp, but dul lthe tip just a touch." In `monolith.js`, blunt the last two or three pixels of the tip into a small uneven top. It stays a sharp tooth.
- **T11, avalanches on all three ice falls.** "We recently made it so the middle of the three ice fields on Rainier starts as snowy and they sloughs off in an avalanche to look like the left and right ice falls. Lets make all three of them start that way and be capable of avalanching randomly. Rather than just the middle one. After an avalanche, then serac falls become capable. Avalanches shouldn't ever happen simultaneously, but can happen to multiple areas on the mountain in one world map visit if enough time goes by." (`plan/round5/11-*`.)
  - All three ice falls start snow-covered.
  - **Decided: avalanches come often, every 1 to 2 minutes**, each on a face that is still snowy, chosen at random, never two at once. An avalanche runs as today's does.
  - A face that has slid is bare ice and can have serac falls. A snowy face cannot.
  - Debug: "Avalanche" (on a random snowy face, or a chosen one) and "Serac fall" (on a bare face).
- **T20, the summit squall.** "Rainier "refilling" the avalanched area with new snow needs some work. The way the snow just accumulates on it again looks a bit strange. I think there should be a snow event of some sort." **Decided: a summit squall, which comes only when all three faces are bare, on the same timing as the avalanches** (1 to 2 minutes after the third face slides). A cloud cap builds over the summit (it may grow from the lenticular cloud's drawing). Snow visibly falls over the upper mountain for about 15 s, and the scarred faces whiten under the falling snow as the cloud clears. Then all three are snowy and the cycle starts again. Debug button "Summit squall" (it refills every bare face).
- **T13, dust devils.** They "seem to most often happen on the far right and bottom sides of the arid area. These are often covered by menus and difficult to see. They should happen more north/center in the arid area." Spawn them in the northern and central part of the dry corner, well clear of the right edge and of the bottom, where the timeline and sign cover the picture. Use C1's dry-ground rule.

### 5.6 Animals on the map

- **T34 and T44, bears.** "I feel like I once saw a bear in the trailhead meadow but I'm not seeing it right now. Is it a random event? If so, it should be triggerable by the debug menu. I [say] we add one and have it hang out around here though. It should have two cubs." Then: "Okay, I saw the bear on the world map below the elk near the forest, so it is randomly placed. This is fine, lets just add the new area I mentioned then. And make it so the cubs spawn near it too. These random event placements should be debug-menu triggerable. Like "Spawn $ANIMAL: $LOCATION_MENU" or something."
  - **A fixed black bear family:** a sow and two cubs who always live in the open patch inside the conifer stand north-east of the Trailhead, below the Spires' outflow waterfall (`plan/round5/34-*`). The sow grazes and sniffs. The cubs follow her within a few pixels, tumble and play, and sometimes climb a step up a trunk and back down.
  - **The random bear** (today about one visit in three, at a forest edge) now always comes with two cubs.
- **C4, the spawn menu.** **Decided: every map animal is in it**, as "Spawn <animal>: <place>": the bear family, moose, elk, mountain goats, bighorn sheep, marmots, the eagle, the osprey and the squirrels. Each place is a home the animal's own rule allows, named with the map's own place names where one fits (from `content.js`), otherwise in plain words ("forest edge by the elk"). Choosing one moves that animal there, or adds it if it is absent this visit. An "everywhere it lives" choice shows all its homes at once, for screenshots.
- **T35, bighorn and moose.** "Move the bighorn sheep up the coulee plateaus to the right. And add two moose that wander the red box area together." (`plan/round5/35-*`.)
  - The bighorn sheep live on top of the basalt benches of the coulees in the dry country, picking along the bench edges.
  - **Decided: a bull and a calf** ("So that one can have antlers even if it's unusual"). The bull has a broad palmate rack. They wander together through the aspen and pine woods along the river between the Proficiency trail and the dry edge, below the Enchantments cliff, with the calf following within a few pixels.
- **T43, marmots** ("Lets have a couple marmots hanging out in the parkland between reflection lake and mount rainier"). Two marmots on rocks in that parkland. They stand up, whistle (a short sound when on screen), and drop down.
- **T29, the marmot on the glacier.** "This marmot hangs out on the glacier ice which looks off. Especially since he is normal sized but the glaier ice is meant to look far away/distant/small." (`plan/round5/29-*`.) Its home rule must exclude glacier ice. It lives on the rocks by the moraine or in the parkland.

### 5.7 The forest and the lake (side scenes)

- **T38.** "Remove the stellers jay from the stump in the forest sequence. Move the owl to the tree beind that stump on a limb instead. Otherwise the middle of the forest sequence feels to crowded." (`plan/round5/38-*`: the owl's box with an arrow to the big trunk behind the stump, and the jay crossed out.) The owl sits on a mossy limb of the big trunk behind the stump. The Steller's jay is removed. **The "Steller's jay" debug event and its kiosk mention go too,** unless the jay also appears elsewhere.
- **T39.** "I'm okay with the background of the foreset sequence looking foggy/spooky but I would like for the branches to look less dead. More old man's beard/spanish moss and rainforest plants and less creepy skelatol tree limbs in the middle ground." Keep the foggy background. In the middle ground, cover the branches in moss, hang old man's beard (pale green lichen strands) from them, and add ferns, salal and young hemlocks. Bare skeletal limbs become rare.
- **T41.** "Remove the brown bear from the forest sequence. It's too cartoonish standing up and lurking like that." Remove it, with its debug event ("Bear" in the forest group) and any find that depends on it. List what was removed in the report.
- **T42.** TJ asked about the brown bird at the end of the forest during a snack break. It is the gray jay, the "camp robber". It flies in when he sits still for a minute, as part of the snack-break find. No change.
- **T40 and E7, the switchback climb.** "The fact that you enter the forest from the right, and move from right -> left through the forest sequence towards the lake, and then move from left -> right across the lake to reenter the meadow feels confusing when you switch from going left -> right to right -> left. How do we solve this?" **Decided: a switchback climb between the forest and the lake.**
  - The forest keeps walking right to left (west, as on the map). It ends at the foot of the rock band below the lake's bench, beside the lake's outflow waterfall.
  - TJ zig-zags up a few short switchbacks beside the waterfall, and the top leg heads right, onto the lakeshore, which walks left to right (east, as on the map; he also leaves the lake on its right side when he returns to the map).
  - It is the end of the forest scene, under the forest's own timeline label (**decided: no label of its own**). It is seen side-on: the cliff face, the waterfall's spray, ferns and moss on the rock, the trail cut into the slope, and perhaps a few wooden steps.
  - On the way home the loop carries on along the lakeshore and the old trail, so the switchbacks are only climbed on the way out.
- **T79b, the shore stop** (from the round 3 list). "Two tree trunks cut into the left third of the view." Clear the trunks from the stretch where he stops at the shore, so the lake and Monolith frame clean across the width. Keep the forest edge elsewhere.

### 5.8 The walk to camp and base camp

- **T48, continuity.** "Arriving at camp doesn't feel continuous. As you approach camp it's locaed on the gravel/grey moraine. And the sideproject spires are far in the distance. Then suddenly camp is surrounded by nunataks, situated on teh glacier, and much closer to the spires." (`plan/round5/48-*`.) **Decided: walk onto the glacier.** The walk (`approach.js`) carries on past the moraine: he steps off the moraine onto the ice and walks up the glacier, and the Spires grow ahead as he goes, so camp's close view of them is earned. Camp stands on a rock island in the glacier (as `camp.js` draws it). Move the map's tents up the glacier onto a rock island to match.
- **T49, one tent.** "Make it so there's only one tent at camp, not two. TJ and Kayti share tents." **Decided: the yellow-orange tent.** The red tent goes, from the map, the walk and camp. TJ asked what the blue object at camp is: it is Kayti's teal pack. Planner's call: keep it, but make it read as a pack (shoulder straps, a lid, a dent where it slumps) so the question does not come up again.
- **T46, snow patches.** "I like the patchy snow on the parkland/grass on the way to the sideproject spires. Lets add a nother patch or two." **Decided: in the walk to camp scene.** Add one or two more snow patches on its flower slope, of different sizes, melting at the edges into the grass.
- **T47, pika.** "Lets add a couple pika along the moraine on the way to sideproject spires that make the pika noise and hide in talus/rocks when you walk by them. Or scurry into a hole." **Decided: in the walk to camp scene.** Two or three pika on the moraine's talus. Each sits up, gives the pika's short "eep" (a new or reused sound in `audio.js`) when TJ comes within a few steps, and scurries into a gap in the rocks. It peeks out again after he has passed.

### 5.9 The six Spires climbs

- **T50 and T55, Bluebird Forecast and hevy-garmin-sync told apart.** "The sequence to bluebird forecast is confusing, TJ looks like he's just walking uphill with a cane. The weather clearing is a nice touch though. Though I'm not sure about adding the inversion at the end. lets just have it clear to a sunny day." "What is the sequence to hevy garmin sync supposed to illustrate? It's very simmilar to the one to Bluebird Forecast, except he gets tired and there are snow balls on the ground?" TJ does not ski, and weights on the pack "don't make sense". **Decided:**
  - **Bluebird Forecast: the weather window.** Drizzle and low cloud at the base. TJ waits under a boulder and checks the forecast on his phone. **Decided: a phone-screen pop-up of the Bluebird Forecast app**, close to its real look (see https://github.com/zimmertr/bluebird for its colours and layout): a rain icon turning to sun, with a short "clearing" line. Then the sky does what it said: the drizzle stops, the cloud lifts, and he **scrambles up rock with his hands** (no walking stick, no cane look) to a clear sunny summit. **No inversion at the end.**
  - **hevy-garmin-sync: a trail run.** He runs the switchbacks up the spire. **Decided: a watch-face pop-up** (Garmin-like, round) shows laps and heart rate ticking up as he runs. At the top, at the bench, the watch shows a sync arrow and "Workout synced from Hevy", which says what the project does.
- **T51.** "The bluebird at the end of the bluebird forecast peak should be more pronounced and better illustrated. It's too small and hard to see right now. Also, what's the point of having the easter egg for the weather mane be summoning theb luebird if one is already flying around when you arrive? It probably shouldn't be." Draw the bluebird larger and better (a mountain bluebird: sky-blue back and wings, paler belly, small dark beak and eye, a few frames of wingbeat), readable at the default zoom. No bluebird is there on arrival. It appears only when the visitor triggers the weather station's find.
- **T52.** "The timelines at the bottom should read "Bluebird Forecast" or something as the Summit instead of "Summit"." Every climb's summit stop on the timeline is labelled with the project's name (`PROJECTS[id].name`).
- **T53.** "The ice climbing sequence on the way to TJs Kubernetes Service is cool, but lets merge the two ice walls into one single ice wall that he climbs intead." (`plan/round5/53-*`.) One taller ice wall, climbed with tools as now. Keep the ladders and the snow bridge.
- **T54, clues to the summit finds.** "The easter eggs when you interact with the summit objects need some sort of clue to the user. Either illustrated in the world or written into teh project description. For example, the TKS summit one could be something like "The hardware seems to be malfuctioning, maybe try some percussive maintenance" or something." **Decided: in the project text.** One line at the end of each summit's project card, in that style. Draft all six in `content.js` and list them in the report for TJ to approve. Planner's drafts, to start from:
  - Bluebird Forecast (weather station, summons the bluebird): "The station's forecast says bluebird skies. Maybe ask it to prove it."
  - TJs-Kubernetes-Service (server rack): TJ's own line, "The hardware seems to be malfunctioning, maybe try some percussive maintenance."
  - hevy-garmin-sync (weight bench): "Nobody leaves a bench this high without doing a set."
  - trailhead (binoculars): "The binoculars are coin-operated. You look like you have a coin."
  - yggdrasil (the world tree): "The world tree's roots reach into every repo. Give it a closer look."
  - Kubernetes-Manifests (cairn): "Every visitor leaves a stone. It's tradition."
- **T56.** "It's not immediately obvious that it's a bench at the top of the spire. Let's add a barbell with plates into the bench while it's sitting there." A barbell racked on the bench's uprights with a plate on each end.
- **T57.** "Trailhead should be the highest spire, not hevy-garmin-sync." (`plan/round5/57-*`.) Make trailhead's summit the highest of the six, on camp's backdrop, on the map's skyline (the `SUMMITS` table in `land.js`) and wherever else the six are drawn. The others keep their order of height below it.
- **T58, the knife-edge.** "The knife-edge ridgeline isn't coming across on the way to Trailhead spire. It just looks like broken graphics. IF we cant figure out how to write htis better, we might need to switch it for something else that is easier to depict from a side angle. Also, when he squats down or au -chavels it he sort of just sinks into the terrain which is confusing." (`plan/round5/58-*`.) **Decided: redraw it**: a thin ridge in silhouette, falling away steeply on both sides, with hazy depth below instead of the pasted map (round 4's M2 already called the pasted map wrong). When he straddles it, one leg hangs down each side of the crest and his body sits on top of it, never inside the rock: draw the near leg in front of the ridge and the far leg behind it. **Record two alternatives in `IDEAS.md`** for future climbs: a Tyrolean traverse between towers, and a corniced snow ridge.
- **T59, the binoculars.** "The bioculars are cool But you should be able to pan around in them with arrow keys/WASD for a small area around the cats. But I like that they focus on the cats. And it shouldn't leave the binoculars until you press space. Not automatically." The view opens centred on the cats. Arrow keys or WASD (and a drag on a phone) pan within a small area round them, clamped at its edges. It stays open until space is pressed. On a phone, a tap on a small "back" button closes it (planner's call). Show a hint on how to leave.
- **T60.** "The via ferrata sequenec to yggdrasil moves too slowly. Lets have fewer harness clipping sequences." Halve the clip-in sequences, so he is seen using both lanyards fewer times, and keep the climb at about 30 s or less.
- **T61.** "Kubernetes Manifests spire is out of screen adn clipped behind the foreground nunatuk." (`plan/round5/61-*`.) Frame the Kubernetes-Manifests summit fully on screen with its name tag, clear of the foreground nunatak, on camp's backdrop.
- **T62.** "The kubernetes manifests sequence in the whiteout is great. This is where the inversion should be. WHen he leaves the whitehout he's above a sea of clouds with teh spires poking through." As the whiteout clears near the top, he climbs out above a sea of cloud, and the other summits stand out of it.
- **T63, the cairn.** "I don't like the easter egg of him kicing over the cairn, it doesn't feel very nice." **Decided: TJ adds a stone.** Clicking the cairn makes him pick up a stone and set it on top. The cairn is one stone taller on each visit, saved in the visitor's browser. **Decided: it caps at 12 stones.** Past that he only pats it. The find counts from the first stone.

### 5.10 The way to Proficiency Peak and its climb

- **T64, the cliff path and iron rungs.** "This part of the path of the way to proficiency peak looks broken. And wider than elsewhere? Maybe it should iron rungs going up the cliff slabs? There are notorious iron rungs on teh way into the enchanments above snow lake, this could be nod to them. Also why does the path hook right and then back left at the top of the cliff? Straighten it out or have a gentle arc." (`plan/round5/64-*`.) **Decided: rungs on the map and in the larch walk.**
  - On the map, the trail up the cliff below the Enchantments plateau is drawn as a line of iron rungs up the slab, at the same width as the rest of the trail.
  - The hook at the cliff's top becomes a gentle arc.
  - The larch basin scene (`larches.js`) opens with a short beat of TJ climbing the rungs.
- **T65, the red on the ground.** "The red on teh ground along the sequence to proficiency peak looks like blood. WHat is it supposed to be?" (`plan/round5/65-*`.) It was meant as red huckleberry in autumn. Redraw it as plants: low shrubs with drawn leaves in crimson to orange, with lighter tips and a dark outline at the base, grouped in clumps. No flat red splotches.
- **T66, pika in the larch basin.** "Have the pika in this sequence hide and make a squeeking noise when you walk by, like the other area mentioned above." The same behaviour as T47.
- **T67, things floating.** "Some rocks are floating in the air near the end of the sequence. A larch tree too." (`plan/round5/67-*`, in Day and at Dusk.) Every rock and tree in the larch basin sits on the ground. Find why (likely placed by a height that ignores a step in the ground) and fix the rule, then check the whole scene in Day and Dusk.
- **T68.** "When walking into the climbing scene at proficiency peak, TJ moves too slow and they spend too much time putting helmets on." The walk-in goes at TJ's normal walking pace. Putting helmets on is one quick beat of about 2 s.
- **T69.** "The lead climbing and following takes too long. Have the lead place less protection and move faster. And the followers climb faster. I played htis scene at 4x and it felt more natural/interesting to watch." **Decided: climbing at about 4 times today's speed.** The leader places fewer pieces (still several per pitch, each drawn), and the anchors and belay changeovers are quicker. Cards still open at the belays.
- **T70.** "The background looks really sparse from up high. Lets add a large tarn/lake in the bottom like Shield Lake below Prusik Peak in real life." (`plan/round5/70-*`.) A large tarn far below in the background, with the granite basin round it, larches and smaller tarns, under the inversion when it forms.
- **T71 and T72, the ropes and the order.** "In caterpillar formation, the first follower should be tailing a rope for the second follower to follow up. In this scene, TJ is tied into a rope, but the red haired woman isn't. She should be connected to TJ via a second rope." "Also, in all of these climbing sequences, the black haired man should lead, the red haired woman should go second, and TJ should follow last." (`plan/round5/71-*`.) This replaces round 4's call that TJ climbs second.
  - The black-haired man leads every pitch.
  - The red-haired woman climbs second, tied to the leader's rope and **trailing a second rope tied to TJ**.
  - TJ climbs last on that second rope, belayed from above, and cleans the gear.
  - Both ropes are always drawn, in two colours. They run through the pieces as round 4's rope rules say.
  - The order holds in every climbing scene with these three.
- **T73, the off-width and the haul.** "In real life, I wasn't able to climb the off-width at the end. Have the first two climb it as they do, but then have TJ struggle about 30% of the way up and take a whipper swing and then get 3:1 hauled up by the other two who animatedly yank on the rope 3-4 times and TJ gets pulled up 20-30% of the remaining distance with each yank." (`plan/round5/73-*`.) The leader and the woman climb it as now. TJ struggles about 30% of the way up, comes off, and takes a big swinging fall on the rope. Above, the other two rig a 3:1 haul (a pulley and a rope grab at the anchor, drawn small) and yank on it together, with big animated pulls, 3 or 4 times. Each yank lifts TJ 20 to 30% of the distance that remains, until he reaches them.
- **T74, the inversion rising.** "When rappeling, there's already an inversion below them when they st art. so it's confusing that one fills in above that when they start. I think in 73, after TJ takes the whipper and starts getting 3:1 up the offwidth, have the clouds from the original inversion start raising to where they are in the second screenshot. So when everyone finally reaches the summit they are on top of the mountain with the higher inversion in place. Then they rappel through the clouds as they do right now." (`plan/round5/74-*`.) There is one cloud sea. It rises from its first level to the higher level while TJ is being hauled. They reach the summit above the higher cloud sea, and then rappel down into it as today. No second layer fills in.
- **T75, the stuck rope.** "The storm sequence during the rappel is good. But lets have them reach the ground before they start trying to tug on the stuck rope. Otherwise it would be impossible for them to walk off the scene like they do. becuase they would bes tranded in mid air." All three reach the ground at the foot of the face first. Then they tug on the stuck rope, and then they walk off.

### 5.11 The off-route page

- **T78.** "Subtlely paint a 404 into the clouds/fog on the off-route page." (`plan/round5/78-*`.) The three digits are formed by slightly denser fog, large, low contrast, and drifting a little, so a visitor notices them on a second look.

### 5.12 Additions TJ chose from the planner's list (2026-11-16)

TJ asked what the planner would add to move the round toward the MVP, and picked three of eight. The other five went into `IDEAS.md`: a prototype smoke test in CI, a slow-phone check with automatic quality, a link preview, reduced motion, and a copy review list.

- **P1, the first-visit hint.** Since space no longer starts TJ walking (T36), a new visitor could sit in front of a still screen. Until the visitor's first move in this visit, a small line in the page's sign style sits low in the middle of the screen, above the timeline: "Click a sign or a trail to start walking." (on a phone: "Tap a sign or a trail to start walking."). It fades out on the first move, and does not come back in that visit. It never covers TJ, the board or the register, and it hides while the idle tour runs. The copy is a draft for TJ.
- **P2, read it as a page.** The site is TJ's resume first. A recruiter in a hurry, a screen reader or a search engine should get everything without playing.
  - One control opens a plain, scrolling page over the canvas: who TJ is (the lake's cards), what he does (Proficiency Peak's three skill cards and the resume card), his projects (the six project cards with their repo links, stars and releases), the personal note, and the contact and resume links the cards already carry.
  - Every word comes from `content.js`. There is no new copy except section headings, which reuse the places' names (Reflection Lake, Proficiency Peak, Sideproject Spires).
  - The text is real, selectable HTML with headings and links, readable at a phone's width, and usable by keyboard (focus goes into it, Escape closes it). It works with sound off and in any time of day.
  - It opens from a top-bar button labelled **PAGE** (planner's call, for TJ to veto; the menus get reworked in a later issue), from the trail map sheet, and directly at the address `#page`.
  - Planner's call on the look: the sign font for headings and the card font for text, on the cards' paper colour, one column. Mockup:

```text
+--------------------------------------------------+
| TRAIL MAP   MUSIC   SOUND ON   AUTO   KEYS  DEBUG  PAGE |
+--------------------------------------------------+
|  [x] Back to the trail                           |
|                                                  |
|  TJ Zimmerman                                    |
|  (the lake's intro card text)                    |
|                                                  |
|  Reflection Lake                                 |
|  Who TJ is / In the mountains / A personal note  |
|                                                  |
|  Proficiency Peak                                |
|  Platform / Reliability / Software / Resume      |
|                                                  |
|  Sideproject Spires                              |
|  Bluebird Forecast   * 12  v1.4  repo link       |
|  ... the other five                              |
+--------------------------------------------------+
```

- **P3, a sound test in DEBUG.** A "Sounds" group in the debug menu with a play button for every effect and every tune (each part separately), named as in `audio.js`. TJ has never heard several of them (section 14).

### 5.13 Housekeeping decided on 2026-11-16 (done, or for TJ)

- Round 4 goes into main through https://github.com/zimmertr/trailhead/pull/31. It carries draft PR #24's decision record (the world is flat and on rails) and the Renovate rule that retires #22. After the merge, close #22.
- Every old branch was tagged `archive/<name>` and deleted. #24 and #13 are closed.
- The pixel world is the site TJ plans to ship. Issues #8 and #14 to #17 are rewritten in place for the pixel site (item A0c), with their old text kept in `plan/issue-rewrites-old.md`. The PRD and README still describe a low-poly 3D world and move with that rewrite.
- Filed as issues for after round 5, one each:
  - menus, the timeline and hotkeys
  - text editable through a CMS or plain text files
  - Strava and Peakbagger feeds in the world
  - more light beams and particles in the forest
  - GPU-generated art from TJ's R9700
  - engine rules
  - free explore mode with WASD off the trails
  - the forest as a choose-your-path maze
  - purging working files (screenshots, renders) from the repo after the MVP
- `IDEAS.md` is worked through in round 6. In round 5, only add to it.

## 6. Settled by the planner, and what is still open

**Settled** (the planner's calls; TJ may veto any of them in the report):

- Click to move: within 24 screen pixels of a trail, scaled by zoom. The shortest way over the trails. A marker at the target.
- The day and dusk cycle starts at the beginning of day. The button cycles AUTO, DAY, DUSK. `time=` in the address.
- The fixed bear family's home is found by rule as the largest open patch in the conifer stand between the Spires' outflow waterfall and the Proficiency trail.
- The eagle every 40 to 70 s, the osprey every 50 to 80 s.
- Collision lives in a new `collide.js` with the kinds boat, whale, floater, land and flyer.
- The binoculars close with space, or with a tap on a "back" button on a phone.
- Kayti's pack is redrawn to read as a pack.
- The six clue lines in 5.9 are drafts.

**Still open, for TJ in the report** (do not wait for them):

- The wording of every new line in `content.js`: the first-visit hint (P1), the PAGE button's label (P2), the six clues, the "Workout synced from Hevy" line, the phone's "clearing" line, the debug menu's group names and labels, and the spawn menu's place names.
- Whether the Steller's jay should live somewhere else, now that it is gone from the stump.

## 7. Starting numbers (round 4 final, measured 2026-11-16)

**Frame time** (800 frames per view, in Docker; the limit is 16.7 ms):

| View | ms a frame |
|---|---|
| Map, all events running | 3.4 |
| Map zoomed out | 12.0 |
| Map at Dusk | 3.7 |
| Map at Dusk zoomed out | 13.5 |
| Map on a phone | 2.5 |
| Forest / forest at Dusk | 3.6 / 3.8 |
| Shore | 3.3 |
| Larch basin | 1.5 |
| West Ridge | 2.9 |
| Summit (Proficiency Peak) | 3.2 |
| Walk to camp | 1.5 |
| Camp | 1.4 |
| Climb: bluebird, tks, hevy-garmin-sync, trailhead, yggdrasil, kubernetes-manifests | 4.5, 2.2, 2.1, 2.3, 1.9, 9.0 |
| Register | 0.9 |

The zoomed-out map at Dusk (13.5 ms) has the least room to spare. Check it after every map change, and add a view for the sunset blend (C3) and one with the collision overlay on.

**Load:** ready in 0.74 to 0.80 s on desktop and 0.77 to 0.80 s on a phone (round 3 was 0.79 to 0.83 s). Keep it under 0.9 s.

**Palette:** 251 of 254 colours used. **`ground.png`:** 1525 KB.

**Timings decided in section 5:**

| What | Number |
|---|---|
| Idle before the look-round tour | 120 s |
| Day and dusk cycle | 390 s: 165 day, 30 sunset, 165 dusk, 30 sunrise |
| Click-to-move reach | 24 screen pixels at the current zoom |
| Avalanches | every 60 to 120 s, one at a time, snowy faces only |
| Summit squall | 60 to 120 s after the third face goes bare; about 15 s of snowfall |
| Eagle fishing | every 40 to 70 s |
| Osprey dive | every 50 to 80 s |
| Cairn | +1 stone a visit, cap 12 |
| Proficiency climbing speed | about 4 times round 4's |
| Helmets on | about 2 s |
| yggdrasil clip-ins | half of round 4's |
| Reflection Lake | about 1.6 times wider, somewhat deeper |
| Tide pool | about 2 times larger |

**Where things are on the map today** (world `u`, `v`; for orientation, find new homes by rule): the Trailhead `C.T` near `u` 1075, `v` 310; Reflection Lake `C.lakes[0]` near `u` 640, `v` 440; Mount Monolith centred near `u` 640, `v` 600; Sideproject Spires near `u` 1070, `v` 648; the glacier `u` about 1070, `v` 503 to 616; Proficiency Peak near `u` 1430, `v` 594; the dry corner's edge from about (1380, 0) to (1920, 430).

## 8. Checklist

Work it from the top, one item at a time. An item is done when it does what section 5 says, it looks at least as good as round 4 beside its round 4 picture, frame time is within the limit, and the console is clean. Then tick it, log the calls in section 11, update section 10, add any ideas to `IDEAS.md`, commit, push and republish the round's artifact with a short label.

### A. Setup

- [x] A0. **Make https://github.com/zimmertr/trailhead/pull/31 (round 4 into main) pass CI.** Four checks failed on 2026-11-16: `CodeQL`, `Lint / semgrep`, `Static Checks` and `Unit Tests`. Every other check passed.
  - Read each failure: `gh pr checks 31`, then `gh run view --job <job id> --log-failed`.
  - The likely cause is the repo's own linters, tests and scanners now reaching `prototype/` (plain browser JS, a Dockerfile, shell scripts, big generated files), which they were never set up for. Prefer excluding `prototype/` in each tool's own config, with a one-line comment saying why: it is a throwaway prototype, checked by renders, not by the site's tests. Fix the prototype's code instead only where a finding is a real bug (for example a real security finding from semgrep or CodeQL). Never weaken a check for the rest of the repo.
  - Work on `pixel-round4-opus`: commit, push, wait for CI and repeat until every required check passes. Then mark #31 ready for review (`gh pr ready 31`). **Never merge it. TJ merges.** Then rebase `pixel-round5` onto `pixel-round4-opus` and push (a force push to our own `pixel-round5` is fine).
  - Re-check CI on https://github.com/zimmertr/trailhead/pull/32 (round 5's draft PR, stacked on #31) after the rebase.
  - If, at any later item, #31 has been merged: close #22 with a comment (the Renovate rule landed in #31), tag `pixel-round4-opus` as `archive/pixel-round4-opus` and delete the branch, rebase `pixel-round5` onto `origin/main`, and point #32 at `main`.
- [x] A0b. **File the nine issues** listed in section 5.13, one per idea, with the `create-issue` skill (its six sections, the hemingway and humanizer passes, the labels it requires, and this repo's `CLAUDE.md` Issues section). TJ asked for all nine, so no further okay is needed. Put each issue's link in section 10.
- [x] A0c. **Rewrite #8 and #14 to #17 for the pixel site** (as it stands now and as round 5 leaves it), in the `create-issue` skill's format and with its passes. Edit each issue in place with `gh issue edit` (title, body and labels). Save each old title and body first in `plan/issue-rewrites-old.md`, so nothing is lost. TJ asked for the issues to be updated, not drafted (2026-11-16). List the links in the report.
- [x] A1. Rebase `pixel-round5` onto `origin/main` if #31 has merged (see A0). Create the round's artifact from the first build and put its link in section 10.
- [x] A2. Render round 4's reference set from tag `archive/pixel-r4-final` into `out/r4/`: every view in section 7, the opening on desktop and phone, every stop of every route, Day and Dusk, plus films of the map events. These are the pictures every item is compared with.

### B. Quick fixes and removals

- [x] B1. T5: remove the Reflection Lake sign near the Trailhead.
- [x] B2. T4: remove the Trailhead signpost (keep the name tag). Move the register next to the board, on its left. One click opens the register with no walk.
- [x] B3. T45: swap the sign's arrows. (The distances wait for D1.)
- [x] B4. T12: remove the float plane and its debug button.
- [x] B5. T41: remove the standing bear from the forest, with its debug event.
- [x] B6. T38: remove the Steller's jay from the stump, and move the owl to a limb on the trunk behind it.
- [x] B7. T77: rename "Played on" to "Music style".
- [x] B8. T37: TJ's facing no longer flips on diagonals (check every trail on the map at 2x speed with `frames.sh`).
- [x] B9. T1: the first frame is centred on TJ (desktop and phone, with fonts slow to load).
- [x] B10. T36: space does nothing until a destination is chosen. Tap toggles, hold doubles.
- [x] B11. P1: the first-visit hint, gone after the first move.

### C. Engine pieces that later items stand on

- [x] C1. T7: collision (`collide.js`), with the kinds, the solid things, the tide and the debug overlay. Move the ferry, whale, orcas and jellyfish onto it first (T15, T26), then every walker and herd.
- [x] C2. T2: the idle tour after 120 s, stopped by any input.
- [x] C3. T76: one world clock and the AUTO, DAY, DUSK cycle everywhere, with its debug controls and `time=`. Measure frame time through the sunset blend.
- [x] C4. T9, T32, T44: the public DEBUG menu in the top bar, organised in groups, with breaking included, high-contrast roam areas, and the spawn menu for every animal.
- [x] C5. T3: click and tap to move along the trails, with the marker. (On today's trails first; D1 changes them.)
- [x] C6. P3: the sound test group in DEBUG.

### D. The land and the water (each change here needs `./bake.sh`)

- [x] D1. T6: the trail rework: the new direct Spires trail, the new bottom trail, the two removed stretches and their bridges, the loop kept. Update the routes, `lakeIn`, `lakeOut` and `spiresIn`, the trail map sheet, the sign's distances (T45) and click to move.
- [x] D2. T30: Reflection Lake about 1.6 times wider, two moraine lakes under Monolith's ice, and the second river. Both streams flow into the lake.
- [x] D3. T28: remove the oxbow and the heron.
- [x] D5. T25: rivers carry on across the beach at low tide.
- [x] D6. T79a: the river mouth shows through the sea fog.
- [ ] D7. T10: the fire lookout on Off By One Peak.
- [ ] D8. T21: flower density from one field, with the four levels.
- [ ] D9. T22: more larches on the upper plateau. T23: no aspens on the dry side.
- [ ] D10. T27: the Legacy Range in grey rock with high snow.
- [ ] D11. T31: Little Tahoma's tip a touch blunter.
- [ ] D12. T64 (map part): iron rungs up the cliff below the plateau, and the hook straightened into an arc.
- [ ] D13. T8: driftwood redrawn.
- [ ] D14. T48 (map part): the tent moved up the glacier onto a rock island. T49: one yellow-orange tent on the map.
- [ ] D4. T17, T24: the water audit. Every join is listed, fixed and pictured. **Moved to the end of section D on 2026-11-16**, because every D item after it changes the land and the water with it. Three fixes are already in (the lake's outflow runs over its lip into the fall, the west river's channel on the sand joins the river, and a stream that drops off a cliff gets a fall down the face). Run the whole audit from the start. Its pictures go on the notes artifact (S3b), not into the repo.

### E. Events and animals on the map

- [ ] E0. **Room for the animals.** On 2026-11-16 the zoomed-out map took 14.9 ms a frame at Dusk and 15.5 ms through the sunset blend, against a limit of 16.7 ms (round 4: 13.5 ms at Dusk). Before any animal is added, find what the round has cost so far (profile C1's collision, C3's clock and blend, C4's overlays when off) and bring both views to 13.5 ms or under. If that cannot be done, log what was tried and what each new animal may cost, and carry on.
- [ ] E1. T15: the ferry and the orcas keep to deep water at every tide (check through a whole tide cycle on film).
- [ ] E2. T26: jellyfish offshore.
- [ ] E3. T33: the tide pool twice the size, with animated animals.
- [ ] E4. T14: the marine layer's rain belongs to the world.
- [ ] E5. T28, T16, T19: the bald eagle on the stacks, the osprey at Reflection Lake, the salmon removed. Debug buttons.
- [ ] E6. T11: all three ice falls snowy at the start, avalanches every 60 to 120 s one at a time, serac falls only on bare faces.
- [ ] E7. T20: the summit squall when all three are bare.
- [ ] E8. T13: dust devils in the north and centre of the dry corner.
- [ ] E9. T34, T44: the fixed bear family in its clearing, and the random bear with two cubs. Both in the spawn menu.
- [ ] E10. T35: bighorn on the coulee benches. The bull moose and calf in the riverside woods.
- [ ] E11. T43: two marmots in the parkland below Monolith. T29: no marmot on the ice.

### F. The forest and the lake

- [ ] F1. T39: mossy branches, old man's beard and rainforest plants in the forest's middle ground.
- [ ] F2. T40: the switchback climb at the end of the forest, beside the outflow waterfall, ending on the lakeshore going right.
- [ ] F3. T30 (scene part): the lake scene shows the bigger lake and its inflows, with Monolith mirrored.
- [ ] F4. T79b: no trunks across the shore stop.
- [ ] F5. The whole lake loop end to end: map, forest, switchbacks, lakeshore, map home. Directions match the map at every handover.

### G. The walk to camp and camp

- [ ] G1. T48: the walk steps off the moraine onto the glacier, and the Spires grow to camp's size by the end. Camp on its rock island.
- [ ] G2. T49: one yellow-orange tent in the walk and at camp. Kayti's pack reads as a pack.
- [ ] G3. T46: one or two more snow patches on the walk's flower slope.
- [ ] G4. T47: pika on the moraine that squeak and hide.

### H. The six climbs

- [ ] H1. T57: trailhead is the highest summit, everywhere the six are drawn. T61: Kubernetes-Manifests framed clear of the nunatak.
- [ ] H2. T50: Bluebird Forecast as the weather window: drizzle, the phone pop-up, the clearing, the hands-on scramble, a sunny summit with no inversion.
- [ ] H3. T51: no bluebird on arrival. A bigger, better bluebird when its find is triggered.
- [ ] H4. T53: one ice wall on TJs-Kubernetes-Service.
- [ ] H5. T55, T56: hevy-garmin-sync as a trail run with the watch pop-up and the Hevy sync at the bench. A barbell with plates on the bench.
- [ ] H6. T58: the knife-edge redrawn, with no sinking into the rock. The two alternatives go into `IDEAS.md`.
- [ ] H7. T59: the binoculars pan round the cats and close only on space or the back button.
- [ ] H8. T60: yggdrasil with half the clip-ins.
- [ ] H9. T62: Kubernetes-Manifests climbs out of the whiteout above a sea of cloud.
- [ ] H10. T63: the cairn takes a stone a visit, capped at 12. The kick is gone.
- [ ] H11. T52: each summit's timeline stop is named for its project. T54: the six clue lines in the project cards.

### I. The way to Proficiency Peak and its climb

- [ ] I1. T64 (scene part): the larch basin opens with TJ on the iron rungs.
- [ ] I2. T65: the red huckleberry drawn as shrubs.
- [ ] I3. T66: the larch basin's pika squeak and hide.
- [ ] I4. T67: nothing floats in the larch basin, in Day or at Dusk.
- [ ] I5. T68: the walk-in at normal pace, and helmets in about 2 s.
- [ ] I6. T72, T71: the climbing order (leader, woman, TJ) and the second rope from the woman to TJ, on every pitch.
- [ ] I7. T69: climbing at about 4 times the speed, with fewer pieces.
- [ ] I8. T70: a large tarn far below, like Shield Lake.
- [ ] I9. T73: TJ's fall on the off-width and the 3:1 haul.
- [ ] I10. T74: one cloud sea that rises during the haul, then the rappel into it.
- [ ] I11. T75: they reach the ground before tugging on the stuck rope.

### J. The off-route page

- [ ] J1. T78: a subtle 404 in the fog.

### J2. Read it as a page

- [ ] J2. P2: the PAGE view with every card's text, opening from the top bar, the trail map sheet and `#page`. Keyboard and phone checked.
- [ ] J3. **The fonts come from the page's own files.** `index.html` fetches eight font families from Google on every load, a call to someone else's server that the real site would have to answer for. Keep only the families the page uses, serve them as `woff2` files beside the page, add their licences to `NOTICES.md`, and add the files to the publish list in section 2. The page must look the same, with slow fonts too (B9).

### K. Whole-site checks and the report

- [ ] K1. Every route walked from start to finish, through every stop, in AUTO, DAY and DUSK, on desktop and phone, with a clean console. Click to move tested on every trail. **For a visitor who asked for reduced motion** (`CALM=1` with `frames.sh`): the idle tour never starts, and AUTO holds Day until the visitor chooses (planner's call, after the PRD's "nothing plays by itself"; TJ can overrule it).
- [ ] K2. Every view beside its round 4 picture. A list for TJ of anything still below round 4, and what fixing it would mean. Nothing is put back on your own.
- [ ] K3. Frame time for every view (section 7's list plus the new views) under 16.7 ms. Ready in under 0.9 s. Colours counted.
- [ ] K4. The off-route page, a scene that throws and one that fails to load all behave as before. Breaking from the public DEBUG menu works.
- [ ] K5. `IDEAS.md` has every idea from the round (with no built ones left in it). No em dashes anywhere. `PROGRESS.md` gets the round 5 report.
- [ ] K6. The report, at the end of section 10 and in chat. It covers what was done, what is still below round 4 and why, every new line of copy for TJ to approve, what was removed, the sounds nobody has heard yet, what changed the planner's mind, and the links. Mark the PR ready for review only once CI passes, then end the loop. Never merge it: TJ reviews round 5 and merges it himself (section 0).

## 9. Steps (how one item goes)

1. Fetch. Make sure `pixel-round5` is pushed and up to date. Read sections 2, 5 (the part for this item), 10 and 14.
2. Render round 4's picture of the view (from `out/r4/`), or film it if it moves.
3. Make the change. Run `./bake.sh` if `land.js`, `core.js` or anything `land.js` imports changed. Run `./check.sh <item>` (S3c).
   - **If the land changed, read what `check.sh` says moved.** The trails are routed afresh on every build and every sign and animal is placed by rule, so a change to the land can move any of them without a word. That is how D2 moved D1's trail. If a trail moved, lay it beside TJ's sketch again (`plan/round5/06-*`, on the notes artifact after S3b). If an animal moved, look at where it stands now.
4. Render the new view the same way. Lay it beside round 4's with `sheet.sh` and look. Film anything that moves. Check Day and Dusk, desktop and phone.
5. If anything is worse than round 4, fix it before going on.
6. Measure frame time for any view the change touches. **For every item that touches the map, log the zoomed-out Dusk number in section 11**, as `check.sh` prints it. Steps 4 and 6 were skipped on D1 to D3, and nobody noticed until the review.
7. Tick the item. Log each call you made in one line in section 11. Update section 10. Add ideas to `IDEAS.md`. Check for em dashes.
8. Commit with a message that says what changed, then push.
9. Export and republish the round's one artifact with a short label (for example "D2 bigger lake").
10. **At the end of each section (D, E, F with G, H, I), tell TJ**: one PushNotification with the artifact's version and three lines on what the section changed and what he should look at first. Do not wait for an answer. This is not a checkpoint. It is there so that a wrong turn is seen within a section, not at the end of the round. Sections H and I redraw whole scenes that round 4 has no picture of, so say plainly what is new.

The loop prompt TJ starts round 5 with (paste it after `/loop`; rewritten on 2026-11-16 for section 0 and the merge exception):

> Round 5 of the trailhead pixel prototype, unattended, overnight, end to end. Every firing: work in the scratchpad clone of https://github.com/zimmertr/trailhead (clone it into the session scratchpad if it is gone, never /tmp, never ~/git). Fetch first. Read prototype/pixel/ROUND5.md on branch pixel-round5: sections 0, 2, 3, 9, 10 and 14, and the part of section 5 for the item. Take the first unticked item, section 0 before section 8, and finish it by the steps in section 9 (section 0's items say their own branch and steps). Round 4's final build is the floor, not the goal: compare every change with it side by side and fix anything worse before ticking. After each item: tick it, log every call in section 11, keep section 10 current, add every idea to IDEAS.md, commit and push, and republish the round's one artifact with a short label. There are no checkpoints. Follow every rule in section 2. TJ, 2026-11-16: "This project has a one-time exception to merge these round 4/round 5/ci related PRs without me overnight." He then narrowed it: "Lets not merge round 5. I stil lwant to review it." Section 0 says exactly what the exception covers: squash-merge PR #31 at S1h, only with every check passed and on the conditions written there, never a push to main, and it ends when TJ next writes anything but this prompt. Never merge PR #32: TJ reviews round 5 himself. Do not ask questions: make the call, log it and carry on. After K6, write the full report, mark PR #32 ready for review, send a PushNotification and end the loop.

## 10. Where the build stands

- **2026-11-16, before any work.** `pixel-round5` was cut from `pixel-round4-opus` at the round 4 PR's head and holds this plan and TJ's screenshots. The game is exactly round 4's final build (`archive/pixel-r4-final` plus the docs commits on #31).
- The round's artifact: https://claude.ai/artifact/1VdS5Q3uSMTpEuGEm39SZr (created at A1 from `pixel-round5`, exported to the scratchpad's `r5-working/`; republish from that folder only).
- The round's PR: https://github.com/zimmertr/trailhead/pull/32 (draft, stacked on #31 until #31 merges).
- Round 4's PR: https://github.com/zimmertr/trailhead/pull/31, every check green and ready for TJ to merge (A0, commit `46dfa56`). `pixel-round5` is rebased on it.
- Issues filed at A0b (label `8d20dfc8`): menus and hotkeys https://github.com/zimmertr/trailhead/issues/33, words out of the source https://github.com/zimmertr/trailhead/issues/34, Strava and Peakbagger in the world https://github.com/zimmertr/trailhead/issues/35, forest light beams https://github.com/zimmertr/trailhead/issues/36, art from the GPU https://github.com/zimmertr/trailhead/issues/37, engine rules https://github.com/zimmertr/trailhead/issues/38, free explore https://github.com/zimmertr/trailhead/issues/39, the forest maze https://github.com/zimmertr/trailhead/issues/40, purging working files https://github.com/zimmertr/trailhead/issues/41.
- Issues rewritten at A0c for the pixel world: https://github.com/zimmertr/trailhead/issues/8 (the build plan), https://github.com/zimmertr/trailhead/issues/14 (Reflection Lake, the Trailhead and the shared parts, served by `web`), https://github.com/zimmertr/trailhead/issues/15 (Proficiency Peak), https://github.com/zimmertr/trailhead/issues/16 (Sideproject Spires, numbers from `api`), https://github.com/zimmertr/trailhead/issues/17 (the things to find). Old text: `plan/issue-rewrites-old.md`.
- **A2 done.** `refs.sh` renders the standard set of views from any build. Round 4's set (72 views: the opening on desktop, phone and wide, Day and Dusk, every route at seven stops in Day and Dusk, every Spires climb at four stops, and the 404) is in `out/r4/`, rendered from the scratchpad's `r4-ref/` (an export of `archive/pixel-r4-final`). `out/` is not committed; rebuild it with the commands at the top of `refs.sh`.
- **B1, B2 done.** The Reflection Lake sign and the Trailhead signpost are gone. The register stands on the board's left, both north-east of where he stands, and the Trailhead name tag sits a little to his left so it covers neither. One click on the register opens the close-up (its own short opening, no walk) and closing it puts him back at the Trailhead.
- **B3 done.** The sign's arrows match the map: Reflection Lake left, Proficiency Peak right, Sideproject Spires up. The distances still wait for D1.
- **B4 done.** The float plane, its flight over Reflection Lake and its debug button are gone.
- **B5 done.** The bear that stood up behind a giant in the forest is gone: its lean-out in `forest.js`, its drawing (`bear()` in `fauna.js`), its frames on the sprite sheet page and the "Bear" start button in the debug menu's forest group. No find depended on it. The bear on the map is a different animal and stays.
- **B6 done.** The Steller's jay, its flight, its call, its cue and its "Steller's jay" debug button are gone, and the trail map's wildlife line no longer mentions it. The owl sits on a mossy limb of the giant right behind the stump, high enough to clear the young trees in front. The gray jay of the snack break stays. `shot.sh` takes `WWW=<folder>` to render any view from another build, such as round 4's.
- **B7 done.** The trail map's setting says "Music style" (Music box, Console, Handheld).
- **B8 done.** His facing comes from where the trail takes him over the next 32 pixels, with some give before he turns, so diagonals and the zigzag up the wall no longer flip him. `facing.sh` counts his turns on each route (`__info.pose` reports the facing): round 4's logic turned him 25 times in the first 2 % of the Proficiency Peak route, now 5; Spires 9 to 6, lake 9 to 2.
- **B9 done.** The page opens on its resting view with no pan and no zoom settling, on desktop and phone: the sign is shown before the first frame, the first frame takes the opening's size at once, and while the page settles (a new view size, the sign coming up or growing as its font loads, in the first 3 seconds or while the fonts load) the camera goes straight to its rest.
- **B10 done.** At the Trailhead the space bar does nothing until a destination is picked. Then a tap stops or starts him and holding it doubles his pace (round 4's press and hold, unchanged), on the map and in every scene.
- **B11 done.** Until he first moves, a small plank says "Click a sign or a trail to start walking." ("Tap ..." on a touch screen). On desktop it sits low in the room right of the sign, above the timeline, and steps left of him if it would cover him; on a phone it stands over his head, above his name tag. It hides while the idle tour runs and fades out for good on the first move. `api.touring()` and `api.me()` tell the page about the tour and where he stands.
- **C1 done.** `collide.js` answers where each kind of mover may be: `canBe`, `steer` and `clear` (push a mover out to the nearest spot it may stand on), for boat, whale, swimmer, floater, land and flyer, each with a radius. The sea side reads depth from the sea grid less the tide of the moment and keeps off the stacks by a distance field round their feet, worked out once at load. The ferry (bow, middle and stern), the orcas (their line moves out with the tide), the whale's surfacing spots (deep at the lowest tide), the jellyfish (now placed beyond the surf and drifting), every walker and the bear, and the tumbleweeds use it. Debug: "No-go areas" cycles Ferry, Whale, Orcas, Jellyfish and Land animals as a red tint, or `?debug=collide:boat`. `frames.sh` takes `WWW=` like `shot.sh`.
- **C2 done.** The idle tour starts after 120 s with no input (any key, click, tap, wheel or drag resets the wait and stops it, and the camera eases back to him). `tour=<seconds>` in the address starts it sooner for screenshots.
- **C3 done.** One world clock (`pixel.js`): 165 s of day, a 30 s sunset, 165 s of dusk, a 30 s sunrise, from the start of day on every visit, in every scene. The top-bar button and the trail map's "Time of day" setting cycle Auto, Day, Dusk. Debug "Time of day": a slider over the cycle, 1x, 10x and 60x, and jumps to the sunset and the sunrise. `time=<seconds>` sets the clock; `dusk=1` holds Dusk. Frame time through the sunset blend measured the same as by day (16.7 ms average and 99th percentile in the lab's Chromium).
- **C4 done.** A DEBUG button sits in the top bar next to Keys. The panel's groups: Time of day, Layers, Outlines (with No-go areas), Zoom, Time, the timed events of the scene on screen ("On the map" or "In this scene: Forest", rebuilt when the scene changes), Spawn (animal, home, Spawn), Cats, Jump to a scene (every scene, by its first route), and Break a scene. Roam areas are drawn in a bright colour per kind, two pixels wide with a dark inner edge, a dithered fill and the animal's name in a small pixel font (`tinyText` in `world.js`).
- **C5 done.** A click or tap within 24 CSS pixels of a trail (the same at every zoom) walks him there over the trail network by the shortest way, with a red cross hovering over the spot until he arrives; anywhere else does nothing, and anything clickable keeps its own click. The network is four branches out from the Trailhead (the lake loop's way out and way back, the peak's trail, the Spires' trail), joined where they part. `api.walkTo(x, y)` takes view pixels, for tests.
- **C6 done.** The debug menu's Sounds group plays every effect by its name in `audio.js`, each tune's two parts on their own (A and B, round and round until "Music back to Auto"), and each place's background sound. `audio.preview(k, part)` and `audio.endPreview()` do it.
- **D1 done.** Three trails leave the Trailhead: the new bottom trail west along the foot of the meadow to the forest edge, the old trail north-west (the lake loop's way home), and the new Spires trail up and round the east side of the big fir stand to base camp; the Proficiency trail goes right as before. The junction-to-Spires stretch and the lower elk stretch are gone with their footbridges. The sign now reads 12.3 km (lake) and 5.3 km (Spires), the trail map's loop 16.4 km, all measured from the trails. Click to move, the routes, lakeIn, lakeOut and spiresIn follow the new lines without code changes; facing counts are unchanged from B8 (lake 2, Spires 6, Proficiency 5).
- **D2 done.** Reflection Lake is 1.6 times as wide (74 by 18, was 46 by 14) on a widened bench, its south shore where it was so the lakeshore trail still runs along it; the island and the fall are kept. Two milky moraine lakes sit where two of Monolith's glaciers end, the ice meeting the water, each held by a grey rim with a notch. A new stream runs from the left one and the old east-foot stream from the right one, and both run into the lake, which keeps its one outflow at the fall. The lake scene's shore walk is longer in proportion (760 over 9.75 s, was 624 over 8 s) and shows the two inflows coming down the far shore under their glaciers.
- **D3 done.** The oxbow and the heron are gone: the rule that cut a crescent of still water beside the river's widest swing, its still-water colour, the heron's spot, drawing, behaviour and debug button, and the heron in the Wildlife note. The rivers still wander over flat ground as in round 4.
- **Review of D1 to D3 (2026-11-16, with TJ present), and what it corrected.** D1 and D2 were laid beside TJ's two sketches again (`plan/round5/06-*` and `30-*`). Three things were wrong and are fixed: the bottom trail joined the old trail 200 too far west, deep in the forest, and after D2 changed the land it ran along the very bottom of the map and through the rainforest by the beach; the lakeshore trail ran through the west end of the bigger lake (317 trail pixels under water); and the new stream from the left moraine lake came down ruled straight. Now the bottom trail crosses the open meadow to the forest's edge as TJ drew it, past the elk, the Spires trail comes up to camp by the old approach's last stretch, no trail pixel lies in the lake, and the stream wanders. D4 is part done (its fixes are committed, its list and pictures are not) and must be run again from the start, because the trails and streams moved.
- **Frame time, first measured this round on 2026-11-16 after the corrections** (round 4's number in brackets): map with all events 3.9 ms (3.4), zoomed out 11.6 (12.0), Dusk zoomed out 14.9 (13.5), zoomed out during the sunset blend 15.5 (new view), phone 2.0 (2.5), shore 3.2 (3.3). Ready in 0.78 to 0.80 s. The limit is 16.7 ms: the zoomed-out map at Dusk and in the blend has about 1 ms left.
- **Paused on 2026-11-16 for section 0** (the review, CI for the prototype, #31's merge by the loop under TJ's one-time exception, which never covers #32, and the plan's changes). D4 is part done and now sits at the end of section D.
- **Section 0, S1a to S1g done (2026-11-17, on `pixel-round4-opus`).** ESLint's recommended rules cover `prototype/`; `make prototype-smoke` and the "Prototype Smoke" job open the game on 14 addresses; the repo-wide tests walk `prototype/` again; record 0015 is written and the PRD, `CLAUDE.md` and README follow it; `ROUND4.md`'s two open ends are closed.
- **Round 4 is on `main` (2026-11-17).** https://github.com/zimmertr/trailhead/pull/31 was squash-merged as commit 6e55cbd under TJ's one-time exception, with all 18 checks passed, and released as v0.2.0. Its branch is kept as the tag `archive/pixel-round4-opus`. https://github.com/zimmertr/trailhead/pull/22 is closed. `pixel-round5` holds `main` (a merge that changed no file) and https://github.com/zimmertr/trailhead/pull/32 points at `main`. **The exception is used up: from here on TJ merges.**
- **The baked ground loads on the artifact host** (S2c, version 18): the Debug panel's first line reads "Ground: read from the bake". `window.__info` carries `baked` and `bakeNote`, and the smoke test's first case asserts them.
- **TJ's 42 screenshots are out of the repo** (S3b), on https://claude.ai/artifact/C3vp7qfxAtoHGnTioe2sNs.
- **`check.sh <item>` is built** (S3c): syntax, the browser check, the zoomed-out Dusk frame time, and what moved since the check before. First run, as `S3c`: 14 tests passed, 11.7 ms a frame, 3 trails and 83 signs and animals written to `out/check/S3c.json`.
- **Section 0 is done** (2026-11-17): every check on https://github.com/zimmertr/trailhead/pull/32 passed on `main` as its base.
- **D5 done.** Both rivers that reach the beach now carry on across the sand the tide bares: at river width where they leave the dry sand, then swinging and splitting into two and three shallow threads with bars between, to the water's edge. The channel grows as the tide goes out and the sea covers it again from the far end as it comes in. At high tide nothing has changed.
- **D6 done.** When the marine layer is in, the upper river now shows as clear blue water across the sand to the sea, under the cloud deck and under the fog that follows it. The fog on the sea, on the rest of the beach and in the forest is as it was. The lower river's mouth was already clear of the fog and has not changed.
- Next: D7.

## 11. Calls made in round 5

One line each, newest last: the item, what was decided, and why.

- A0: the four failures were the site's checks reaching `prototype/` for the first time: ESLint (198 errors, browser globals and unused names in plain JS), two repo-wide tests (a Dockerfile that is not a service, and `npm i` in it), semgrep (the lab image's `FROM` not pinned) and CodeQL (`sheet.html` called a method named by the address). Excluded `prototype/` from ESLint's config and from the walker in `tests/repo.ts`, each with a comment, so no check got weaker for the site. Pinned the lab image by digest and guarded the set name with `Object.hasOwn`, since those two were real.
- A0, A0b: no game change, so the round's artifact waits for A1 to be created.
- A0b: priorities P2 for what likely comes next (menus #33, words #34, GPU art #37, engine rules #38, forest maze #40) and P3 for the rest (#35, #36, #39, #41). #35 is blocked by #6. #39 needs a decision record amending 0014 and 0007. The session label is the short id `8d20dfc8`, as the create-issue skill now asks.
- A0c: each rewritten issue describes the prototype as round 5 leaves it (marked so), and turns the task into bringing that part into the `web` service. #14 recommends serving the prototype's modules from `web` with words from `content/`, over a TypeScript port, and carries the decision record and the PRD and README update for the pixel world. Kept the old full-session label and added the short one. Labels and priorities otherwise unchanged.
- A1: #31 is still open, so no rebase onto main yet. The page title now says round 5. The round's artifact is published from `r5-working/`, a folder used for nothing else.
- A2: films of the map events are not part of the reference set. With the clock fixed by `frames.sh` they come out the same every time, so each event item renders round 4's film from `r4-ref/` when it needs one, instead of all of them now.
- B2: room for the register. Placed between him and the board (TJ's "move the register to the left of the board"), it stood right behind him and he hid it. So the register stands just clear of his right shoulder (`C.T[0] + 16`) and the board moved east by the box's width (now `REG.x + 23`, it was `C.T[0] + 28`). The name tag then covered the box, so it moved 8 pixels left (`T.x - 12`). Kept the anchor `spots.signpost` in `land.js` (the debug page `relief.js` still draws the old signpost there).
- B2: "no walk" kept the register close-up's own opening (under a second) and left the board's sheet as it is, because the close-up is a scene with its own picture and the book, not an overlay.
- B3: kept the planks in their order (lake, peak, Spires) and swapped only the arrows, so the order still matches the trail map, the timeline and the 1, 2, 3 keys. A real signpost often groups its planks by direction; that would be a reorder for TJ to ask for.
- B4: also took the plane out of the trail map's "Also seen" line. `PROGRESS.md` still lists it, as the record of round 4.
- B5: the giant the bear leaned out from stays where it was (now `D_GIANT`), because moving it would shift every tree after it and the owl's perch. The map's "some days a bear" line in the trail map stays: it is about the map's bear (T44).
- B6: the owl's giant is the one nearest the stump, worked out from the trunks, so it follows if the forest moves. Its limb went up from 52 to 84 pixels above the giant's foot, because at 52 the owl sat against a young spruce's top. The jay's palette ramp in `core.js` and the `'steller'` kind in `fauna.js` stay unused for now: dropping the ramp would renumber the palette.
- B8: no back or front figure was added for walking straight up or down the screen; the up and down figures he already has are used, as before. The give: up or down below 0.3 sideways (as a share of the way ahead), his side above 0.6, the other side above 0.55, and in between he keeps his facing.
- B9: read "centred on him from the start" as "the first frame is the resting frame". The resting frame itself is round 4's: on desktop it frames him with the three destinations (he stands low and right), on a phone it is nearly centred on him above the sign. Centring him exactly on desktop would push the destinations off the screen, so that is a change for TJ to ask for.
- B9: a font that arrives after 3 seconds, once the fonts report loaded, eases the camera as before, since by then the visitor may be looking round.
- B10: anything that takes the page off the opening counts as a choice (he runs, the timeline moves, a card shows, another route is set), and so does an address with a route or a hash. The Start button on the bar still starts him from the Trailhead: it says Start, so pressing it is a choice.
- B11: on a phone the bottom is the sign, so "low, above the timeline" has no room; the hint stands over his head instead, which is also where a new visitor looks. The copy promises trail clicks, which C5 brings later this round.
- B11: a touch screen is told apart by `(hover: none)`, so a laptop with a touch screen and a mouse gets "Click".
- C1: the movers keep their scripted courses (so scrubbing and the start buttons still work) and are pushed clear of what they may not cross at each moment, rather than steering step by step; `steer` is there for the free walkers to come (moose, bears in E9).
- C1: depths needed under each, in pixels out from the waterline at the tide of the moment: ferry 18, orcas 22, jellyfish 26, whale 40; room from a stack's foot 5, 6, 4 and 10. A stack's foot is an oval as wide as its drawing and half as deep.
- C1: land is the land's firm-ground rule (`W.open`) plus room round the board (20), the register (12) and the lookout (14); each walker keeps its own country on top. People are not in it yet: the walkers' countries already keep off the trails and the Trailhead. Flyers are free everywhere; where they may perch comes with the eagle (E). The dust devils spin in place on the dry flats they were put on, so they need nothing more.
- C3: the blend was already smooth (the palette table is rebuilt in 65 steps as the light changes), so no dithered stages were needed. The things that switch on at Dusk (the map's dusk ground with its rust glints, the headlamps, the tent's glow, the deer's eyes, the forest's beams turning to fireflies) switch at the middle of the 30 s blend, when the palette is halfway, rather than fading on their own; the stars and the aurora already fade with the light.
- C3: the page's own wood and paper turn to their dusk colours at the middle of the blend too, and the dusk find is marked when dusk first comes. The old saved Dusk preference is gone: Auto on every visit, as decided. The clock's speed multiplies the scenes' speed, so a paused scene pauses the light too.
- C4: the spawn menu has the map animals there are today (elk, mountain goats, bighorn sheep, the black bear, marmots, squirrels); the moose, the eagle, the osprey and the bear family join it as E9 and its neighbours build them, through the same `homes()` list. Homes are the spots each animal's own rule chose; a home is named after a joke sign within 160 pixels, else "near" or "east of" one of the four places, numbered when a name repeats. The elk move as one herd and a goat with her kid.
- C4: on a phone the DEBUG button is hidden like Keys, for room; the small sign at the foot of the trail map still opens the panel there. Jump to a scene opens it on its first route a little way in, and the panel stays open.
- C5: once he stands where a click sent him, the sign stays hidden as it is anywhere off the Trailhead; a place's name tag or the Trailhead button sends him back through the Trailhead and on (`go` treats the walk like a detour). Space and Start do nothing at the end of a walk, since there is no route to resume. The walk does not count toward finishing a route.
- C5: a walk from the lake loop's way out to its way back goes round by the Trailhead, since the forest between them is a scene, not map.
- C6: the background sounds are in the test too, since TJ may not have heard the quieter ones; one plays until the scene changes.
- D1: the bottom trail ends where the old trail turned up into the forest (the southernmost point of the loop's way west, at [390,354]), so the forest and lake part of the loop is untouched. Its bend is a third of the way west from the Trailhead, at the lowest dry, gentle ground on that column.
- D1: the Spires trail is steered by two points read from the land: the east edge of the fir stand halfway up (where the fir clumps' noise thins out), and a point up and a little right of the Trailhead so it leaves going up, apart from the Proficiency trail going right. My first try put the first point further right and the Spires and Proficiency trails shared their first stretch; moved it.
- D1: new trails are routed with a cost that rises (x3) on ground another trail already takes, so they keep their own line instead of merging.
- D1: the bottom trail ran through the elk's old flat, and the herd jumped to a meadow by base camp. TJ's sketch has the trail passing the elk, so the herd now takes the parkland flat nearest the bottom trail's western half (the same rule otherwise). A try that dropped the parkland rule put them among trees by the lookout; dropped that.
- D1: the lake country region (the lakes and forest shading) still reads the original loop (C.loop0), so the land west of the junction did not change.
- D1: the walk scenes' directions follow the trail as before; the Spires approach now runs the other way across the screen because the new trail meets camp from the east. That is T40's to judge in its item.
- D2: which glaciers get the moraine lakes is one list in monolith.js (moraineLakes): the middle glacier, the one with the big icefall, and the glacier above where the old east-foot stream rose (picture column 466). The map and the lake scene both read it. Each lake's far edge follows the painting's own rule for where that glacier's ice ends, so ice meets water with no gravel between.
- D2: the moraine lakes are painted into the mountain's picture in land.js, not made map lakes, because the ground there is covered by the painting; the streams below them are routed over the land as before, with a thread of melt water from each lake's notch down to where its stream first shows on the land.
- D2: neither stream's route reached the lake on its own: both ran along a low strip behind the bench and down its east side. A stream marked to end in the lake now goes the last stretch straight into it once its route comes within 100 of the lake's ends and 50 of its shores, and stops there. The old east-foot stream also gets a shallow valley from its head toward the lake's east end.
- D2: the old east-foot stream used to run on south past the lake through the meadow; that stretch is gone now that it ends in the lake, with the footbridges where trails crossed it. The lake's outflow carries on down the fall as before.
- D2: glacierEnd() first said the glacier east of the Steamboat Prow reached as far down as the one beside it, though the painting gives those rows to its neighbour; the right lake was drawn floating in the snow. A glacier whose west cleaver stops above its snout row now has no end of its own.
- D3: after D2 the meadow's streams had already changed so much that the oxbow rule found no swing to cut it beside, so the D2 build showed neither oxbow nor heron; D3 removes the code so it cannot come back. The map is otherwise unchanged (side by side with the D2 build).
- D3: the Wildlife note lost only its heron clause ("A heron in the oxbow, an owl in the forest" now reads "An owl in the forest"); its salmon and osprey clause is left for the items that change those.
- Review: D1's bottom trail ended at the old trail's low point on its way west, [390,354], which is inside the forest. TJ's magenta line ends at the forest's edge, about 200 further east. It now ends at the old trail's first point west of the forest's edge ([590,378]), and the old trail is kept from there on. A point a little short of halfway, set toward the camera by a third of the climb, gives the line TJ drew (west nearly level, then north-west).
- Review: every trail from the Trailhead is routed over the land afresh on each build, so D2's changes to the land moved D1's bottom trail without anyone looking. After any change to the land, the trails and every placed animal and sign must be looked at again (`relief.html?spots=1`).
- Review: the Spires trail now ends on the old approach's last three points, on the moraine's west side, as in TJ's sketch. Where two stretches of a trail meet, a point within 5 of the next is dropped, so there is no kink at the join.
- Review: D2 said the lake's south shore was where it had been, which was true only at the lake's middle. The loop's points on the south shore now step back to keep 5 clear of the water, by rule from the lake's size.
- Review: the melt stream below each moraine lake swings up to 9 pixels each side on its way down (was 4), after the S-shaped line in TJ's sketch.
- Review: the herd's rule did not change, but with the trail corrected the elk now stand beside the bottom trail in the meadow below the lake's cliff, close to where they stood in round 4. Before the correction they had ended up by the lake's outflow, 133 from the bottom trail, and D3's note took that for the D1 spot without checking.
- Review: steps 4 and 6 of section 9 (Dusk and phone, frame time) were skipped on D1 to D3, and no frame time had been logged for any item this round. The numbers are in section 10 now. From here each map item logs the zoomed-out Dusk number.
- Review: the idea "Tap, Not Click, on Phones" was wrong and is removed from `IDEAS.md`. B11 already shows "Tap" on a touch screen; the phone-sized render uses a mouse, so it showed "Click".
- Review, left for TJ: his outline of the bigger lake in `30-*` measures about 2.2 times the old width and reaches further north; the plan says 1.6 times and that is what is built. The marmots' rule now puts one beside the tents at base camp (E11 gives them a new home). Facing changes on the Spires route went from 6 to 7.
- Plan change (TJ, 2026-11-16): section 0 added, to be done before any more of section 8. TJ's answers that day: fix everything the review listed, set up basic CI for the prototype before #31 merges, move the screenshots to an artifact, close round 4's two open ends, and the planner writes the plan while Opus builds.
- Plan change (planner, 2026-11-16): D4 moved to the end of section D; E0 (frame time before the animals), J3 (the page's own fonts) and the reduced-motion line in K1 added; section 9 gained the look at what moved after a change to the land, the zoomed-out Dusk number for every map item, and a notification to TJ at each section's end.
- Open with TJ on 2026-11-16: which lake size (https://claude.ai/artifact/HvkoYcpd9EeTznWr6DZKCZ), and whether record 0015 says `web` serves the plain JS as it is. He asked for the pros and cons of TypeScript against JS and got them in chat. The planner recommends plain JS, checked later through `// @ts-check`.
- TJ, 2026-11-16, on record 0015 (S1e): "We can defer typescript for now." The record says the world is pixel art and that `web` serves the prototype's plain JS modules as they are. A port to TypeScript is deferred, and type checking through `// @ts-check` and JSDoc is left for its own issue after round 5, which TJ has not asked to be filed yet.
- The lake page's first pictures were cropped to the wrong part of the map and showed no lake (the planner did not look before publishing). Version 2 shows the whole lake in both sizes.
- TJ, 2026-11-16, on the lake's size (S3a): "A is fine." The lake stays 1.6 times round 4's width.
- Plan change (TJ, 2026-11-16): no wait for #31's merge. S1's fixes are merged from `pixel-round4-opus` into `pixel-round5` and the round runs on overnight, stacked as before. The tidy-up after the merge happens at whichever item first sees it.
- TJ, 2026-11-16, later the same evening: "This project has a one-time exception to merge these round 4/round 5/ci related PRs without me overnight." This replaces the line above: the loop merges #31 itself at S1h once every check has passed, and moves round 5 onto `main` at S2a. The planner set the limits written in section 0 (checks passed, squash through the pull request only, never a push to `main`, and an end when TJ next writes after starting the loop) and told TJ what they are.
- TJ, 2026-11-16, on reading those limits: "Lets not merge round 5. I stil lwant to review it. I just want to enable you to straighten out the repo and work on round 5 tonight for me to review tomorrow. And that requires you to move round 4 when ready I think". The planner had read the exception as covering #32 too. It does not: the loop merges #31 only, and #32 waits for his review.
- TJ, 2026-11-16: "I'll have you do this work this time actually." The planner (Fable) builds section 0 and carries on with section 8 in the same session, in place of Opus. Nothing else in the plan changes.
- TJ, 2026-11-17, while S1a ran: "Are we going to fully integrate with our standard yggdrasil CI system or just set up linting and call it there? Early on in the prototype we went into CI too fast and really slowed development down to a crawl". Answer given and held to: only the light version. The prototype gets ESLint's recommended rules inside the lint job that already runs, one browser job, and the repo-wide convention tests. No image, scan, Lighthouse, unit tests or release for it, and round 5's items do not wait on CI one by one: `check.sh` runs the same checks locally and CI is read at the end of a section.
- That message ended the merge exception by its own rule. TJ was told, and answered "Still on". The exception for #31 is in force again, on the same terms.
- S1a. 60 findings, not 59 (the newer ESLint adds `no-useless-assignment`). 59 were unused names. One was a real bug: `openPlain` in `app.js` read `MAP`, which is only defined inside the trail map's function, so the plain page's picture of the map threw, was caught, and never drew. Fixed with `api.mapFrame()`. Also gone as dead code: `spur` in `land.js`, `snapshot` in `pixel.js`, and `loadBake`, a stub that returned null and was passed to `makeWorld`, which ignored it.
- S1a. **The plan was wrong that `frames.sh` films on a fixed clock.** Playwright's clock keeps running in real time after `clock.install` unless it is paused, and the page's loading finishes at a different moment each run, so two runs of the same code give different frames. With the clock paused, no ticks while loading and a real pause between ticks, about half the views match from run to run and the rest fall into two or three states. So the before and after films could not prove "no pixel changed" on their own. What does prove it: `ground.png` re-baked from the fixed code has the same pixels as before (only its signature changed), every view that is stable matched, every view that is not differed by the same pixel counts the old code differs from itself by, and the one view that changed on purpose is the plain page. `frames.sh` is left as it is. A film that repeats exactly is an idea for `IDEAS.md`.
- S1b. The spec answers the page's requests from `prototype/pixel/www` itself, on `http://localhost:8080`, so it needs no server and no image, and the stale-bake warning (which the page gives only on localhost) fails a test. Requests to Google Fonts are answered with an empty stylesheet so a slow font host cannot fail a run. It puts him along a route by clicking the timeline, because `p=` in the address is round 5's and #31 does not have it. Checked against the old code: the plain-page test fails there.
- S1c. Three things failed when the tests walked `prototype/` again. The lab's Dockerfile is now expected by name beside the four services, and must pin its base by digest at the Playwright version its package is locked to. `npm i playwright` in it was a real finding: it now installs from `lab/package.json` and its lockfile with `npm ci --ignore-scripts`, and Renovate moves the image and the package as one group. `out/` is skipped, because it is the render scripts' ignored output. After this change the lab image has to be rebuilt once (`docker build -t trailhead-pixel-lab prototype/pixel`).
- S1e. Record 0015's evidence uses TJ's words from 2026-11-14 as the planner's memory holds them ("I think this beats the low-poly design", "this is way better", "refreshing and unique"). The PRD is corrected in its overview, requirement 2, tech stack, phases and open items, and renamed About Lake to Reflection Lake and The Stack to Proficiency Peak throughout. Its sections 3 to 5 still describe each place as designed for 3D, and a note at the top says so: rewriting them is TJ's to direct. README: one sentence changed, quoted in #31's description.
- S1g, nothing closed. https://github.com/zimmertr/trailhead/issues/5 ("The world has no sound") is out of date: the prototype has sound made in code, per-place background sound and music, though the issue says "There is no music". It should be rewritten for what is left (sound moving into `web` with the world, and TJ's word on the music) or closed when https://github.com/zimmertr/trailhead/issues/14 lands. https://github.com/zimmertr/trailhead/issues/9 ("The repo has no code, build or CI yet") is done: `main` has the four services, the content pipeline, tests, images, CI and the release. It can be closed. https://github.com/zimmertr/trailhead/issues/6 asks whether to show Strava and Peakbagger numbers and https://github.com/zimmertr/trailhead/issues/35 asks for a feed of them: TJ's request for the feed answers the first, so #6 can be folded into #35 and closed.
- S1h, 2026-11-17. Merged https://github.com/zimmertr/trailhead/pull/31 with `gh pr merge 31 --squash --match-head-commit 8cf1abd`, after reading that all 18 checks had passed on that commit, that its only review thread (CodeQL's) was resolved, and that TJ had written nothing since "Still on" but the loop prompt. The squash commit's message was written by hand, so none of the 100 commits' messages went in. Commit on `main`: 6e55cbd. Release run: success, v0.2.0, four images pushed, nothing deployed.
- Correction to an earlier line: `main` is protected, by a ruleset (classic branch protection is what the API said was absent). It requires the site's checks by name, a pull request and resolved review threads. "Prototype Smoke" is not in its list, so it runs on every pull request but does not block a merge. Requiring it is a change in zimmertr/yggdrasil, which is TJ's.
- S2a. `main`'s tree was exactly round 4's last commit, so `git merge -s ours origin/main` was used and `git diff ORIG_HEAD HEAD` was empty. GitHub moved #32 onto `main` by itself when the branch was deleted.
- **For TJ: the render image's new lockfile raised a security alert and two pull requests within minutes of the merge.** The alert (https://github.com/zimmertr/trailhead/security/dependabot/2, high) is for `playwright` below 1.55.1 in `prototype/pixel/lab/`: it downloads browsers without checking the certificate. The lab never downloads a browser (the image ships them and the install runs no scripts), so the risk is small, but the alert stays until the version moves. https://github.com/zimmertr/trailhead/pull/42 (Renovate) moves the image and the package together and is the one to merge. https://github.com/zimmertr/trailhead/pull/43 (Dependabot) moves only the package and would fail the test that holds the two to one version: close it. Neither is merged by the loop, because the exception named round 4 only, and a new Chromium can change how the reference pictures render.
- S2c. The artifact's page runs in a frame on another origin, so nothing outside it can read `window.__info`. The Debug panel got a first line for it, "Ground: read from the bake" or "Ground: worked out on this page (why)". Read on version 18 in Chrome: read from the bake. New copy for TJ: those two lines.
- S3b. The page is built by a script from section 12's own lines, so each picture carries the same description as here. It was opened in Chrome and the pictures load. `git rm` takes them out of the branch; they stay in history at cc882c6, which is what https://github.com/zimmertr/trailhead/issues/41 is about for the whole repo.
- S3c. `check.sh` ends with one line, "check <item>: passed" or what failed. It fails on a file that does not parse, a failed browser test, a frame over 16.7 ms, or a ground that did not come from the bake. A trail counts as moved when any of its points is more than 8 px from every stretch of the old one, measured both ways, so a re-route is seen but a point added along the same line is not. Signs and animals are matched in the order the rules place them. Tested by handing it an earlier file with an elk and ten trail points shifted and a marmot removed: it named all three. `out/` is not in git, so the earlier files live only in the clone: after a fresh clone the first check has nothing to compare with and says so.
- S3c, frame time. `check.sh` gave 11.7 ms for the zoomed-out map at Dusk, where the review on 2026-11-16 measured 14.9 ms for the same view on the same code. The machine was busier then (other renders were running). Take a frame time only from a run with nothing else going, and E0's target of 13.5 ms may already be met: measure three times before doing any work on it.
- For whoever merges #31: the repo allows squash merges only and deletes the branch on merge, `main` has no branch protection, and every push to `main` runs the Release workflow (four images built and pushed, a version tagged, nothing deployed). #31's title is "feat: add the pixel world prototype through round 4", so the release is a minor version.
- D5. The channel is not in the baked ground: the tidal flat is drawn each frame by the sea's loop in `critters.js`, so the channel is a mask over the same cells (`riverOnFlat`), read only for a cell the tide has bared. A mouth is found by rule, where river water in the ground's picture lies within a few pixels of the high-water line, and the channel follows the beach's own fall line from there, so it moves with the rivers if the land changes. It uses the river's two colours and dither, so the join at the top of the flat does not show, and the shining wet-sand checker the flat already has at its edges. No new colours.
- D5. The lower river's channel reaches the low-water line between two sea stacks and passes behind the nearer one. Left as it is: a stream running out round a stack's foot is what happens.
- D5, checks: `check.sh D5` passed, 11.7 ms a frame zoomed out at Dusk (the same as before the change), nothing moved. Looked at in Day and Dusk at high, half and low tide, and filmed over one ebb. Round 4 has the rivers stop at the top of the flat.
- D6. Since round 4's E5 the fog is weather, so there is no standing sea fog on the beach any more: the note is about the marine layer (`start=shower`), which pales the upper river's last reach twice, first under its cloud deck (about 35 to 55 s in) and then under its fog. Both are thinned along the river by one rule in `land.js` (`MOUTHS` and `mouthFog`), found from the rivers themselves, so it follows a river if the land changes. Both are baked, so `ground.png` was made again.
- D6. Three things I tried were worse and are not in: thinning out over the tidal flat cut a hard-edged dark patch into the fog on the sea (the thinning now stops at the water's edge, so at low tide the channel on the flat stays under the sea's fog like the rest of the flat); a clear strip 30 px wide read as a hole in the cloud (it is now 4 to 15 px, the river and its banks); and thinning the reach inside the forest showed at Dusk as a dark line through the pale fog (it now ends where the river comes out of the trees).
- D6, checks: `check.sh D6 D5` passed, 12.4 ms a frame zoomed out at Dusk, nothing moved, lint clean. Filmed at both mouths through the deck and the fog beside the build before the change, by Day and at Dusk. Round 4 has the same fog over the river as the build before the change.

## 12. The reference pictures

**TJ's screenshots for this round** are on a private page, https://claude.ai/artifact/C3vp7qfxAtoHGnTioe2sNs, each under its note's number with the description below. They were in `plan/round5/` until S3b took them out of the repo (19 MB), so every `plan/round5/<name>` in this file now means the picture of that name on the page. To look at one from a clone: `git show cc882c6:prototype/pixel/plan/round5/<name> > out/<name>`, since that commit still holds them. The file name starts with the note's number:

- `06-trail-rework-magenta-new-red-removed.png`: the whole map, zoomed out. Magenta lines are new trails, and red X's mark stretches to remove (section 5.3). The second red X is on the lower trail by the elk bridges, not on the lakeshore trail.
- `07-ferry-through-sea-stack.png`, `07-orca-beside-sea-stack.png`: the ferry drawn over the tall sea stack, and an orca's fin right against it.
- `08-driftwood-blob.png`: a pale grey rounded lozenge on the sand, no texture.
- `11-monolith-three-icefalls.png`: Monolith's upper slopes. The middle ice fall is snow-covered, and the two either side are bare blue seracs.
- `15-orcas-near-shore-at-low-tide.png`, `15-ferry-aground-at-low-tide.png`: orcas in the shallows by the bared flat, and the ferry sitting on the sand.
- `17-lake-outflow-not-joining-fall.png`: Reflection Lake close up. The outflow runs to the cliff's top, and the waterfall below starts apart from it.
- `21-flower-density-red-most-blue-medium-green-small.png`: the map with a red outline (the band from Monolith's foot round the lake to the Spires valley), blue lines along the rivers (the central meadow and the right-hand river corridors), and green outlines (the Trailhead's meadow and a patch at the bottom left).
- `22-enchantments-plateau-larches.png`: the plateau below Proficiency Peak with goats, tarns, slabs and a few larches.
- `23-aspens-in-the-palouse.png`: aspens standing on the dry yellow ground.
- `24-river-outlet-gap-on-beach.png`: a river reaching the sand with a separate blue patch below it on the beach.
- `27-legacy-range-too-blue.png`: the far range as pale blue snowy peaks behind the forest.
- `28-oxbow-and-heron.png`: a crescent of still water beside a stream, with the heron in it.
- `29-marmot-on-glacier.png`: a marmot on the crevassed ice beside the camp's tents.
- `30-moraine-lakes-and-bigger-reflection-lake.png`: cyan sketch of two moraine lakes under Monolith's ice tongues, streams from each down to a much larger outline round Reflection Lake.
- `34-fixed-bear-family-clearing.png`: a cyan box round an open patch in the dense conifers north-east of the Trailhead, between the Spires' outflow waterfall and the Proficiency trail.
- `35-moose-red-box-sheep-to-coulees.png`: a red box on the aspen and pine woods along the river below the Enchantments cliff (the moose), a cyan box on the bighorn's current spot at the dry edge, and cyan lines pointing right to the coulee benches.
- `37-tj-facing-flip-a.png`, `37-tj-facing-flip-b.png`: TJ at a trail fork, facing one way and then the other a frame later.
- `38-owl-to-limb-remove-jay.png`: the forest. A red box round the owl with an arrow to the big trunk behind the stump on the right, and the jay on that trunk crossed out.
- `44-random-bear-on-map.png`: the random bear by a stream below the elk near the forest.
- `45-sign-arrows-swapped.png`: the opening view with the sign's three planks (Reflection Lake left, Proficiency Peak up, Sideproject Spires right).
- `48-walk-to-camp-on-moraine.png`, `48-walk-end-tents-on-moraine-49-teal-pack.png`, `48-camp-on-glacier-49-two-tents.png`: the walk on the grey moraine with the Spires far off; the walk's end with two tents, Kayti and her teal pack on the moraine; camp on its rock island in the glacier, close under the Spires.
- `53-two-ice-walls-to-one.png`: TJ on the first of two ice steps on TJs-Kubernetes-Service, with the ladder over the crevasse beyond.
- `57-spire-heights-trailhead-to-be-highest.png`: camp's backdrop. hevy-garmin-sync is the highest summit and trailhead lower.
- `58-knife-edge-broken-graphics.png`, `58-knife-edge-sinking-into-rock.png`: the knife-edge with the map pasted under the rock, and TJ sunk to the waist in the ridge while straddling.
- `61-kubernetes-manifests-clipped.png`: the Kubernetes-Manifests name tag pointing at a summit hidden behind the foreground rock.
- `64-cliff-path-broken-and-wide.png`, `64-path-hook-at-cliff-top.png`: the map's trail up the plateau's cliff, wide and smeared, and its hook right then left at the top.
- `65-red-ground-looks-like-blood.png`: the larch basin's ground with flat dark red splotches.
- `67-floating-rocks-and-larch.png`, `67-floating-larches-at-dusk.png`: rocks and a larch above the ground near the basin's end, and larches floating at Dusk.
- `70-sparse-background-add-tarn.png`: the West Ridge high up, with an empty blue background.
- `71-caterpillar-second-rope-missing.png`: TJ tied to the leader's rope, and the red-haired woman tied to nothing.
- `73-off-width.png`: the leader on the pale headwall's off-width, with the other two below.
- `74-inversion-at-rappel-start.png`, `74-higher-inversion-fills-in.png`: the summit with a cloud sea already below, then a second, higher one filling in.
- `78-off-route-add-404-in-fog.png`: the off-route page's pink fog with the lone wand and sign.

**Still useful from round 4** (`ROUND4.md` section 10 has the full descriptions): Prusik Peak's south face and the West Ridge topo, the Southern Pickets (for the Spires and the crest), Rainier over Reflection Lake and Glacier Peak over Image Lake (for the lake scene), turquoise water through dark trunks (the forest's end), deer eyeshine at night, pixel wind lines, the three-piece anchor and the slung horn, the trail registers, a glacier ending in its lake (for T30's moraine lakes), forested foothills, inversions by day and night (for T62 and T74), and the Olympic Peninsula's forest maps.

**New references to find by name** (describe them in section 11 when used; never copy them): Shield Lake below Prusik Peak (T70); the iron rungs on the trail above Snow Lake into the Enchantments (T64); a 3:1 haul system (T73); old man's beard lichen on Hoh rainforest branches (T39); a bald eagle on a sea stack, and an osprey's plunge (T28); moon jellyfish (T26); ochre sea stars, green anemones and shore crabs in a tide pool (T33); a pika in talus (T47); a bull moose with a calf (T35); the Bluebird Forecast app's look (T50, from https://github.com/zimmertr/bluebird); a Garmin watch face showing laps and heart rate (T55).

## 13. TJ's words, to get the details right

Round 5 (2026-11-16):

- On the bar: "Round 4 is better than round 3. But we are still striving for improved quality that exceeds round 4."
- On the opening: "This looks glitchy and it should center on him from the start." The tour "is cool, but I think it starts too soon. This feature should be reserved as an idle animation that doesn't trigger until no movement has been detected for a few minutes."
- On collision: "I think we need to program in boundaries for some objects like these sea stacks that the game knows other objects like animals and ferries cannot move through or a collission occurs."
- On the loop: "I didn't mean to break the loop for the forest/reflection lake by deleting a trail. Lets keep it a loop and keep teh out trail."
- On direction: he enters the forest from the right, "So he can't start walking to the right after entering the forest", and he leaves the lake on its right side when he comes back to the map.
- On camp: "Then suddenly camp is surrounded by nunataks, situated on teh glacier, and much closer to the spires. How do we solve this continuity problem?"
- On the climbs: "The weather clearing is a nice touch though." "The weighted sets don't make sense. And I don't ski."
- On the cairn: "I don't like the easter egg of him kicing over the cairn, it doesn't feel very nice."
- On the off-width: "In real life, I wasn't able to climb the off-width at the end."
- On the climbing speed: "I played htis scene at 4x and it felt more natural/interesting to watch."
- On Dusk: "The nighttime/dusk sequence is beautiful."
- On the debug menu: "Right now, it is mostly just fun stuff and I don't see why we can't enable it publicly."
- On ideas: "Keep adding your ideas to IDEAS.md as you have them though. I notice you haven't commited to that file in a while, don't hold back with your ideas."
- On the moose: "So that one can have antlers even if it's unusual."
- On the knife-edge: "IF we cant figure out how to write htis better, we might need to switch it for something else that is easier to depict from a side angle."

Still true from round 4 (`ROUND4.md` section 11 has the rest):

- "Glaciers are beautiful btw, so emphasis on those."
- On the Spires: "they are not daggers or a serrated knife blade. They are imperfect and uneven. And don't come to perfect points. Mountains are not perfect, they are broken. Fragmented. Dangerous."
- On the forest's west edge: "Eerie, nothign scary."
- "Rivers don't do that. They wander, oxbow, etc. And take the path of least resistance along lowest-elevation." (Round 5 removes the one oxbow TJ found wrong. Rivers still wander.)
- "the higher up the tarns are, the more milky/teal/green they should be."
- On the rope: "the rope isnt just a perfect straight up line, but wanders and weighs from gravity between carabiner attachenment points."
- "Followers should climb differently and have unique *personalities*, speed, etc. If one falls the other doesn't at the same time."
- "adding more of these 'timed' events is a good idea to make the world feel lived in."
- "People don't *have* to finish anything, the website is just supposed to be impressive an informative in the end."

## 14. Things learned the hard way in rounds 3 and 4

- **Look at every picture you make, critically, beside the last round's.** The mist, the aspens and the river mouth each came back wrong the first time in round 3 because nobody looked. In round 4, side-by-sides that compared stills missed motion and readability. Film what moves, compare at the zoom a visitor sees, and ask "would TJ wince".
- **Never call a regression "rough".** Name it as worse than the last round, and fix it or list it.
- **Never switch off or remove a feature TJ did not ask to lose.** Round 4 turned the moving mist off for a reason of its own, and TJ asked why.
- **Never invent a find.** Round 4 added ice worms, and TJ had them removed ("Did I approve that?").
- **Never put back an earlier round's work across scenes on your own.** TJ called that dangerous. List it instead.
- **Place by rule.** Round 3's written map positions broke on round 4's map. Everything placed by rule survived.
- **When TJ says an earlier version looked better, port that version's code** instead of rebuilding its idea from scratch.
- **Run `./bake.sh` after touching `land.js`, `core.js` or their imports.** A stale bake means the page builds the ground live and takes about 3.5 s to be ready.
- **`shot.sh` steps are separated by semicolons.** With commas, the screenshot is taken at load, mid-fade, and shows a bug that is not there. Eval steps cannot contain semicolons.
- **Publishing the same file path again goes to the same artifact** unless a `url` is given. That once put a new build over a frozen one. This round republishes one artifact on purpose, so always publish from the round's own export folder and never from a round 4 folder.
- **The map's `draw()` is too big for the browser to optimise.** Every per-pixel loop goes in its own small function outside it. Frame time is measured, not guessed.
- **Load time is measured too.** Round 4 accepted 1.2 s as the cost of a bigger map, then found it was a regression and brought it back to 0.8 s by caching the bake's planes and making the sea's rows lazy. Measure after any change to the bake or to start-up.
- **Volcanoes drift toward Fuji.** Rainier is wide, lopsided and flat-topped. Procedural passes at Monolith stalled. A painted piece composed glacier by glacier worked.
- **The fog's ranks of trees could not be made by rules** (tried four times). They are drawn ridge by ridge.
- **Mid-session questions.** When a question to TJ is wrong, he says so. Explaining a choice with a small ASCII sketch of the map got a clear answer where words alone did not.
- **Parallel copies of the agent used up TJ's limit** in a few hours in round 3. One stream of work only.
- **Sounds nobody has heard yet:** the seven tunes' second parts, the effects `tink`, `bang`, `slap` and `kraa`, the larch basin's bed, and every sound added this round. List them in the final report for TJ to listen to.
- **Confirmed on the artifact host (S2c, 2026-11-17):** the page's own files fetch back byte for byte, which the bake's check (`sourceSig`) needs, so the published page reads the ground from the bake. The Debug panel's first line says which it did.
