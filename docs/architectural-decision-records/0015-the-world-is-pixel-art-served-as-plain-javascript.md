# 0015. The world is pixel art, and `web` serves it as plain JavaScript

- Status: Accepted
- Date: 2026-11-14 for pixel art, 2026-11-16 for how it is served
- Decider: TJ. On 2026-11-14, of the first pixel build: "I think this beats the low-poly design." The same day, after the first full build: "this is way better". On 2026-11-16, asked whether the world should be ported to TypeScript before `web` serves it: "We can defer typescript for now."
- Issues and PRs: #31, #14
- Cited in code as: none
- Guide: [`CLAUDE.md`](../../CLAUDE.md), Rules, Pixel art throughout

## Context

The PRD called for a low-poly 3D world in three.js, and the Round 3 and Round 4 prototypes built it that way. On 2026-11-14 TJ asked for a throwaway look at the same site as 16-bit pixel art, kept apart so it could be dropped. He preferred it, and every round since has been pixel art. The pixel world is plain JavaScript with no build step, in a repo whose rule was TypeScript everywhere, so how `web` will serve it needed an answer too.

## Decision

The world is pixel art drawn on a 2D canvas, with all of its art drawn in code. It is one top-down map that holds the Trailhead and every destination, and each stretch of a route is a side-on scene of its own: the forest run, the lake shore, the larch basin, the ridge, the approach, base camp and the climbs. The low-poly 3D design and three.js are dropped.

`web` will serve the prototype's JavaScript modules as they are: no port to TypeScript and no bundling. A port is deferred, not ruled out. Type checking through `// @ts-check` and JSDoc, file by file, is left for an issue of its own.

Record 0014 stands: the map is flat and the visitor is on rails. The places carry the names the game shows: Reflection Lake (the PRD's About Lake), Proficiency Peak (The Stack) and Sideproject Spires, with Mount Monolith standing over the lake.

## Evidence

- 2026-11-14. The first pixel build, a throwaway look at the whole map. TJ: "I think this beats the low-poly design." He called pixel art "refreshing and unique" beside low-poly.
- 2026-11-14. The first full build, with all three routes. TJ: "this is way better". He dropped the 3D design that day.
- 2026-11-16. Round 4's final build holds the whole map and every route in 29 modules, about 1 MB of JavaScript, with no library. In headless Chromium a frame of the map takes 3.4 ms, 12.0 ms zoomed all the way out and 13.5 ms zoomed out at Dusk, against the 16.7 ms a 60 Hz screen allows.
- 2026-11-16. ESLint's recommended rules, run over the prototype for the first time, found 60 problems. 59 were unused names. One was a real bug that types would also have caught: the plain page read a name that was never defined there, so its picture of the map never drew.

## Alternatives rejected

- Low-poly 3D in three.js. Reversed for the reasons above.
- An isometric view. TJ raised it on 2026-11-14. It was not built: the top-down map and side-on scenes carried every round since.
- A port to TypeScript before `web` serves the world. About 1 MB of working code would be rewritten with nothing new on screen. Deferred by TJ.
- Bundling the modules through Vite. Each scene is already loaded only when a route needs it, and a build step would end the prototype's way of working, where a file is edited and the page reloaded.

## Consequences

`make lint` holds the prototype to ESLint's recommended rules, and `make prototype-smoke` opens every route in a browser and fails on anything written to the console. Neither checks types, so a misspelled property is found only when its code runs. Every picture is code, so changing how something looks is a code change. three.js leaves `NOTICES.md` when `web` drops its placeholder. [`docs/PRD.md`](../PRD.md) changes in the same PR: the overview, requirement 2, the tech stack, the plan's phases and the open items.
