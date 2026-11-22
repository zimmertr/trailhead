# 0001. The world is pixel art on rails, and `web` serves it as plain JavaScript

- Status: Accepted
- Date: 2026-11-13 for the flat world on rails, 2026-11-14 for pixel art, 2026-11-16 for how it is served
- Decider: TJ. On 2026-11-13, of the 3D planet: "I think the decision to put everything on a sphere planet was the wrong choice. The first iterations of a diorama seemed better." On 2026-11-14, of the first pixel build: "I think this beats the low-poly design." On 2026-11-16, asked whether the world should be ported to TypeScript before `web` serves it: "We can defer typescript for now."
- Issues and PRs: #13, #31, #14
- Cited in code as: none
- Guide: [`CLAUDE.md`](../../CLAUDE.md), Rules, One flat world, on rails, and Pixel art throughout

## Context

The first plan was a low-poly 3D world in three.js, first on a small planet so a free camera found no edge, then on a flat map. On 2026-11-14 TJ asked for a throwaway look at the same site as 16-bit pixel art. He preferred it, and every round since has been pixel art. The pixel world is plain JavaScript with no build step, in a repo whose rule was TypeScript everywhere, so how `web` serves it needed an answer too.

## Decision

The world is pixel art drawn on a 2D canvas, with all of its art drawn in code. It is one flat top-down map that holds the Trailhead and every destination, and each stretch of a route is a side-on scene of its own: the forest run, the lake shore, the larch basin, the ridge, the approach, base camp and the climbs.

The visitor is on rails. Every camera follows a route or stands at a fixed view. There is no free camera.

`web` serves the game's JavaScript modules as they are, from `web/www/`: no port to TypeScript and no bundling. A port is deferred, not ruled out.

## Evidence

- 2026-11-12 to 2026-11-13. Three builds of the 3D planet. Each time the mountains had to shrink or bend to stay in view, and TJ judged the flat scenes better.
- 2026-11-14. The first pixel build, a throwaway look at the whole map. TJ: "I think this beats the low-poly design." The first full build the same day, with all three routes: "this is way better".
- 2026-11-16. Round 4's final build held the whole map and every route in 29 modules, about 1 MB of JavaScript, with no library. A frame of the map took 3.4 ms in headless Chromium, 13.5 ms zoomed out at Dusk, against the 16.7 ms a 60 Hz screen allows.
- 2026-11-21. Round 6 moved the game into `web`. The image serves it under a policy with no inline style, no inline script and no `data:` image, and Lighthouse scores it 1.0 for accessibility, best practices and SEO.

## Alternatives rejected

- Low-poly 3D in three.js, on a planet or a flat map. Reversed for the reasons above.
- A flat world with a free camera. It needs every edge finished; TJ dropped the feature instead.
- An isometric view. TJ raised it on 2026-11-14. It was not built: the top-down map and side-on scenes carried every round since.
- A port to TypeScript before `web` serves the world. About 1 MB of working code would be rewritten with nothing new on screen. Deferred by TJ.
- Bundling the modules through Vite. Each scene is already loaded only when a route needs it, and a build step would end the way of working where a file is edited and the page reloaded.

## Consequences

`make lint` holds the game to ESLint's recommended rules, and `make browser` opens every route against the built web image and fails on anything written to the console. Neither checks types, so a misspelled property is found only when its code runs. Every picture is code (or, from round 6, a generated picture the code draws from), so changing how something looks is a code change.
