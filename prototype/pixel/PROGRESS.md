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
- [ ] Spires become a jagged glaciated massif like the peak behind the lake: six named sub-peaks, glacier ice rather than snow.
- [ ] Fix visual bugs, starting with the hard line between the forest band and the meadow above About Lake. Blend terrain edges.
- [ ] A little more tree and plant variety and palette range, without going overboard.
- [ ] Entry points and transitions into each scene and back.
- [ ] Flags on finished destinations and footprints on finished trails.

### About Lake (forest scene)
- [ ] Lush rainforest run: huge mossy trunks, roots, ferns, light, a stream, layered depth.
- [ ] Three milestones with cards (who, in the mountains, personal note), the lake under its peak, the way home.
- [ ] Elk, banana slug hop, bear, marmot, Steller's jay. Cold plunge, snack break, Sasquatch once per visit.

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

## Calls made

(one line each)
