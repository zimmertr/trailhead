# Pixel MVP: overnight checklist

The working list for the overnight build of the pixel-art trailhead. Tick items as they land, add one line per creative call under "Calls made", and keep it a checklist. It exists so a long run survives a context summary, nothing more.

## The bar

- Version 5 of the vibe check (https://claude.ai/artifact/UgfBaAqoZCaJdKY8sBDUXF, branch `pixel-prototype`) is the quality bar. TJ: "I want the results from this overnight session to be as good, if not better yet, than this was."
- Never touch that artifact or that branch. Work on branch `pixel-mvp`; publish to a new artifact titled "Trailhead Pixel MVP".
- Before each publish, screenshot the same views as version 5 (Trailhead at 1440x900 and 390x844, each lake stop, Dusk) and compare. If anything got worse, roll it back first.
- Keep the setup: one indexed-colour renderer, all art drawn in code, no build step, no TypeScript port, nothing outside `prototype/`. Each new scene in its own file. Libraries only if they clearly help.
- Depth before breadth: finish each scene to the bar before starting the next.
- Commit and push after every item. Publish when something visible lands, with a short label.
- No docs, issues or PRs. No subagents unless the job is tightly scoped and dull, and review what comes back.
- Work silently; the morning report is the only message.

## Decided with TJ (2026-11-14)

- Views: world map stays top-down. The forest and the climbs are side view at the same pixel size as the world map (wide scenes, small character; if it looks blocky like Minecraft, change that scene's view). Base camp is an isometric diorama of the massif to pick a peak from. TJ yields art calls to Claude: "keep channeling that energy".
- Getting in and out: he walks to the edge of a destination on the map, a classic SNES transition plays, the scene loads; the way home lands him back on the map. Snappy and seamless.
- Character: the PRD look (short brown hair, short beard, sunglasses) and kits per place. The running vest is a Salomon ADV Skin 12, not salmon-coloured.
- Cats: Doot Doot (long-hair tortie) and Peevers (long-hair Nebelung). Many animations and events, interactive when clicked, never one loop.
- Animals: elk, banana slug (he hops it), bear watching from the trees, marmot above the lake, Steller's jay and other birds, pika in the talus, birds on the wall, mountain goats on the Spires, gray jay at the snack break.
- Register: browser-only mock. Unlocks after all three routes, sample entries, a submission says it waits for TJ's approval.
- Sound: chiptune effects and ambience made in the browser, on after the first click, with a mute button.
- Copy: draft the personal note in TJ's voice (his voice rules are in `~/.claude/CLAUDE.md` rule 30 and the ai-config repo) and the three skill cards from the Resume repo, read-only. Mark drafts as drafts. No alcohol references.
- Project cards: tonight's real GitHub numbers written in. Addresses as `#name` links. Trail map, plain page, 404 off-route page, console message, kiosk board all in. About ten joke names on small signs. The Konami code and free camera are cut.
- Everything else in `docs/PRD.md` sections 3 and 4 on main is in scope, read it for the full lists (milestones, pitches and their moments, the six spires with routes and summit eggs, things to find).

## Checklist

### World map
- [x] Spires become a jagged glaciated massif like the peak behind the lake: six named sub-peaks, glacier ice rather than snow.
- [x] Fix visual bugs, starting with the hard line between the forest band and the meadow above About Lake. Blend terrain edges.
- [x] A little more tree and plant variety and palette range, without going overboard.
- [x] Entry points and transitions into each scene and back.
- [ ] Flags on finished destinations and footprints on finished trails.

### About Lake (forest scene)
- [x] Lush rainforest run: huge mossy trunks, roots, ferns, light, a stream, layered depth.
- [x] Three milestones with cards (who, in the mountains, personal note), the lake under its peak, the way home.
- [x] Elk, banana slug hop, bear, marmot, Steller's jay. Cold plunge, snack break, Sasquatch once per visit.

### The Stack
- [ ] Face-on climb: crack, face, roof; ledges with cards; the gear left behind, the lead fall and catch, the glowing holds; summit flag with resume and LinkedIn; rappel home.
- [ ] Birds on the wall, pika in the talus.

### Sideproject Spires
- [ ] Base camp diorama: pick one of six peaks, each named; flags on finished ones; goats.
- [ ] Six routes with their events (knife-edge ridge, icefall, ice pitch with two tools, snow bridge and crevasse jump, bergschrund ladder, wands in a whiteout), each ending in a glissade to camp.
- [ ] Six summit eggs, played on click and replayable.
- [ ] Project cards with stars, release, language, licence.

### Across the site
- [ ] Doot Doot and Peevers: varied play and click interactions.
- [ ] Trail map menu, `#name` addresses, plain page, 404 off-route, console message, kiosk board, joke-name signs.
- [ ] Register mock, unlocked after all three routes.
- [ ] Sound with mute.
- [ ] Dusk in every scene, with the Dusk-only sky. Phone layout in every scene.
- [ ] Copy drafts: personal note, skill cards.

## Gotchas from building version 5

- Docker Desktop may need starting (`open -a Docker`). `shot.sh` builds its image on first use. Renders take a few seconds each; the 2D canvas has none of the 3D prototype's timeouts.
- `shot.sh` queries: `stop=N`, `route=stack|spires`, `p=0.4`, `dusk=1`; steps like `click=[data-route=lake];wait=600;key=Space;wait=2600`; a seventh argument `me` crops round the runner.
- The artifact wrapper adds its own doctype, head and body, so `index.html` has none, and it needs `[hidden] { display: none !important; }` because the panels set `display`. Publish with `files: { "pixel.js": ... }` (plus any new scene files).
- Auto mode once blocked a `git push` and allowed the retry. If pushes stay blocked, keep committing locally and say so in the morning report.
- What made version 5 work: one scene at a time, an early publish, then many small passes judged from screenshots. Stay in that loop.

## Traps the 3D prototype fell into

Each of these slowed or spoiled the low-poly prototype. Check the list before every new scene.

- **Plumbing before design.** No port, no repo docs, no services, no Helm, no PRD edits tonight. Only `prototype/` and this file change.
- **Paperwork per change.** One line under "Calls made" is the whole record of a decision.
- **Progress counted in tasks.** An item is done when its screenshot looks right next to version 5, not when its code exists.
- **Big bets without weighing them.** The planet constrained every mountain to serve one easter egg. Before any choice that boxes in the art (a projection, a fixed scale, a shared engine change), write down its cost in one line and prefer the choice you can undo.
- **Rebuilding what worked.** When something already looks good, extend it; never redraw it from scratch. TJ: "it looked way better before."
- **Shrinking to fit.** Keep the same pixel size in every scene. Make the scene bigger, never the art smaller.
- **Scale against pacing.** Milestones stay about 4 seconds apart. Shorten a long climb with cuts between moves (fade, a new pitch, the camera jumping up), never by sliding him along at high speed.
- **One giant file.** Each scene gets its own file. The shared renderer changes only when every scene needs it.
- **Judging motion blind.** Check movement with timed sequences of screenshots (several frames a fraction of a second apart), not a single still.
- **The camera fighting the scenery.** Place scenery so he can never be hidden (keep tall things out of the band in front of his path), rather than fixing each overlap one at a time.
- **Visible edges.** No scene may show its own edge, an empty band or bare ground where the art stops.
- **Misreading the layout.** Reread TJ's words for a place before drawing it; left to right on the world map is forest and About Lake, The Stack, Sideproject Spires.
- **Landmarks that read wrong.** Check each landmark from the world map and up close. The Stack must read as a granite wall, the Spires as one jagged glaciated mountain, the forest as lush and varied.
- **Panels over the action.** Cards and menus never cover him or the thing a milestone is about, at 1440x900 and at 390x844.
- **No cheap sketch first.** Try a new scene idea small (one screen, rough) before building it out.
- **Ignoring the load budget.** Keep the page light: no huge data, art drawn at load. Put the total size and load time in the morning report.
- **A character that slides.** Feet plant, hands reach holds, tools swing. If a move can't look right yet, cut away from it rather than show it wrong.
- **Brittle edits.** After any scripted edit, confirm it applied (grep or a screenshot) before building on it.
- **Long chat output.** Keep replies to a line or two; anything longer belongs in this file.

## Calls made

(one line each)

- The renderer is split into `core.js` (palette, bitmaps, screen), `world.js`, `sprites.js`, `tj.js` and a small scene manager in `pixel.js`, so each scene is its own file. Cost: one mechanical move, checked against version 5 screenshots.
- A route is a list of legs (one scene each), weighted by time; a round window closes on him and opens on the next scene. Scrubbing across a scene change uses a faster cut.
- Massif: six pyramids of fanned ridges like the lake peak, rock buttress under each summit, glacier ice in the cirques between, pouring out of the middle onto the ground glacier through a ragged edge.
- Kits follow the PRD: yellow sun hoody, black tights, dark blue Salomon vest with white flasks; orange cap kept because it reads best against the green.
- Variety kept small: huckleberry, heather, green shrubs, silver snags; one new ice ramp. No new tree species.
- The lake loop's distance on the sign is fixed at 5.2 km, as in version 5, now that the run happens inside scenes.
- About Lake is two side-view scenes: the rainforest (he runs right to left, the way he left the map) and the lakeside under the peak (left to right, the way the trail rounds the lake). The switchback between them is a scene cut.
- Forest depth comes from three layers that scroll at different speeds, giant trunks as separate sprites sorted with him, and a stream in front that mirrors what stands behind it. Nothing tall stands in front of the trail, so he is never hidden.
- The lake peak is the map's snowy pyramid painted large, not a new mountain. On a short screen its foot sinks behind the far shore so the summit stays in view.
- On an upright phone the trail line rides at 62% of the height while he runs and 50% while a card is open.
- Cold plunge: click the lake while he is standing at it. Snack break: 60 seconds standing still in either lake scene, and a gray jay turns up.
- Sasquatch crosses the far trees during the second half of the forest run, once per page load.

