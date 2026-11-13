# 0014. The world is flat, and the visitor is on rails

- Status: Accepted. Supersedes 0001
- Date: 2026-11-13
- Decider: TJ, 2026-11-13, after three revisions of the planet: "I think the decision to put everything on a sphere planet was the wrong choice. The first iterations of a diorama seemed better." Then: "The only reason we added the planet was to enable the flight/konami code feature. We can drop that too." And on the edge: "We don't have to care if the planet has an edge if the user never sees it because the whole system is on rails."
- Issues and PRs: #13, #8
- Cited in code as: none
- Guide: [`CLAUDE.md`](../../CLAUDE.md), Rules, One flat world, on rails

## Context

Record 0001 put every place on one small sphere so the world had no edge for the Konami free camera to find. The Round 4 prototype built that planet three times. Each time the mountains had to give something up to stay in view, and TJ judged the flat Round 3 scenes better.

## Decision

Every place sits in one flat world: the Trailhead meadow on a rise, and in front of it from left to right the forest and About Lake, The Stack, and Sideproject Spires. It holds those and nothing else.

The visitor is on rails. Every camera follows a route or stands at a fixed view, so the ground is built in small faces where a route or a camera goes, in big faces beyond, and behind a ring of far ranges it stops. There is no free camera, and the Konami code is dropped.

## Evidence

- 2026-11-12. The first planet had a radius of 95 units, which forced the wall and the spires to about a quarter of their Round 3 size. TJ: "This revision was a regression."
- 2026-11-12. At a radius of 260 the wall kept its Round 3 height of about 260 units, as tall as the planet's radius. TJ: "Performance is fine and the forest is an improvement. But the sideproject Spires area looked way better before."
- 2026-11-13. The Round 3 glacier mountain is about 230 units from its snout to its summit at the scale the planet allowed. Standing on the sphere, the curve hid its summit behind its own icefall from base camp and hid all of it from the Trailhead. It came into view only after everything on it was made to rise parallel and its far side was raised 60% of the way to flat.
- 2026-11-13. The same mountain in the flat build stands true with no correction, in view from the Trailhead and from base camp. The flat build draws about 1.7 to 1.8 million triangles and is ready in about 1.3 seconds in headless Chromium, against 1.83 million for the last planet.

## Alternatives rejected

- The small planet (record 0001). Reversed for the reasons above.
- A larger planet. At a radius of 600 the curve still hides the lower half of a mountain 385 units away, and the ground stops reading as a planet.
- A flat world with a free camera. It needs every edge finished, which is the cost the planet was chosen to avoid. TJ dropped the feature instead.
- A triangle, with the Trailhead in the middle and a destination on each side. One destination would stand behind the visitor, where the cats are, and no single view would hold all three.

## Consequences

Routes, cameras and terrain work in plain flat coordinates. A view that no rail gives is not built, so a new camera move has to be checked against what the world shows from there. The three destinations are too wide for one frame on most screens, so the idle camera at the Trailhead drifts across them. [`docs/PRD.md`](../PRD.md) changes in the same PR: requirement 1, requirement 4, the Trailhead, the World row, phase 3 of the plan, and the open items.
