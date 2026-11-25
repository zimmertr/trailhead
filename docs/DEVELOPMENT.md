# Development

CI is the test runner: branch, open a draft PR, push small commits, and read the checks. Everything also runs locally, in Docker, through `make`, so nothing is installed on the host and a red check reruns the same way it ran in CI.

## Run it

```sh
docker compose up --build
```

The site is on http://localhost:8080 (the page of text at `/#page`), the API on http://localhost:8081, the admin panel on http://localhost:8082, and the API's metrics on http://localhost:9464/metrics. `migrate` applies the database's migrations and exits, then `fetcher` reads the six projects' numbers from GitHub once and exits; set `GITHUB_TOKEN` in your shell to send a token. `make down` removes the containers and the database.

## Checks

Each target is what one CI job runs ([CICD.md](CICD.md)).

| Target | Runs |
|---|---|
| `make lint` | ESLint over the repo with `--max-warnings 0`, then `tools/eslint/selftest.js`, which fails unless each custom rule trips on its fixture. ESLint has its own package on TypeScript 6 (record [0010](architectural-decision-records/0010-eslint-runs-on-typescript-6-in-its-own-package.md)) |
| `make typecheck` | `tsc` (TypeScript 7) over the Node side. The game is plain JavaScript and is linted, not type-checked |
| `make test` | The unit suite with line and branch coverage, HTML in `coverage/unit/` |
| `make test-db` | The database suite against a throwaway Postgres it starts and removes |
| `make check-openapi` | Fails when `api/openapi.json` differs from the routes. `make openapi` rewrites it |
| `make image SERVICE=api` | One image, as the PR builds it. `make images` builds all four |
| `make smoke SERVICE=api` | `scripts/smoke/<service>.sh` against the built image |
| `make scan SERVICE=api` | Trivy over the built image, failing on a fixable Critical or High |
| `make hadolint` | hadolint over the four Dockerfiles |
| `make browser` | Builds the web image, then the Playwright suite and axe against it |
| `make lighthouse` | Builds the web image, then Lighthouse's budgets against it |
| `make compose-smoke` | `docker-compose.yml` up, checked from outside, then down |
| `make check-unused` | Knip over the workspaces. Not in CI: run it before a refactor lands |
| `make lock` | Rewrites both lockfiles from the manifests. A pin change ships with its lock |

## The pixel world

The game is in `web/www/` and runs in the browser as it is ([`web/CLAUDE.md`](../web/CLAUDE.md)). Its tools are shell scripts in `tools/pixel/` that run headless Chromium in their own image (built from `tools/pixel/lab/` on first use) and write pictures to `tools/pixel/out/`:

| Script | Does |
|---|---|
| `shot.sh` | One screenshot of any address, with steps (keys, clicks, waits, and `hit=` to click whatever the scene draws for an act, such as `hit=egg`) |
| `frames.sh` | Films anything that moves, frame by frame, on a fixed page clock |
| `sheet.sh` | Lays pictures side by side |
| `walk.sh` | Walks routes through every stop at 8x and reports what went wrong |
| `sweep.sh` | A still at every step along each route, on a fixed page clock, for comparing two builds; notes a side scene that ends in a band of one flat colour |
| `refs.sh` | The standard set of views, for comparing two builds |
| `bake.sh` | Writes `web/www/ground.png`, the baked map. Run it after any change to `land.js` or the palette |
| `slow.sh` | How long a frame takes on a slow phone: every scene, by Day and at Dusk, in a phone's window with the processor slowed four times, and where any slow frame fell. `PROFILE=1` names the functions the time went to |
| `soak.sh` | Leaves the map and every scene running at eight times speed for an hour of game time each, and fails on animals stuck, on top of each other or where they may not stand, console errors, a scene that broke, or a growing heap. `crowd` puts every animal on every home first |
| `sound.sh` | The audio lab: how loud every tune through every set, every effect and every bed is, and whether anything clips. It runs `audio.js` itself into a buffer, about a minute for all of it |
| `check.sh` | One item's check: every module parses, `make browser`, frame time, what moved on the map, and the sound's balance |

### How the code is laid out

Plain ES modules with no dependencies:

- `core.js`: the indexed-colour renderer. `ramp(name, [day...], [dusk...])` adds palette entries (`R.<name>[i]`), beside `BM` bitmaps, `pick()` with dither, `Screen` (`put`, `blit`, `iris`, `night`, `present`), the `DEBUG` flags, `breeze()`, `windAt()` and `veilTable`. New ramps go just before `const INK`.
- `land.js`: the map. Heights and materials, rivers and lakes, the trails (routed by least cost from the Trailhead), footbridges, the coast, the dry edge, the glacier, every planted thing, the fire lookout, the flower drifts, the animals' homes (`habitat()`) and `buildTerrain()`. `bake.sh` keeps its slow work in `ground.png`.
- `world.js`: the map scene: drawing order, taps (`pick`), name tags, the camera and the opening, the night sky and Dusk. `monolith.js` paints Mount Monolith.
- `critters.js`: everything on the map that moves. `mapfauna.js` and `scenery.js` hold map drawings, `events.js` the timed map events, `collide.js` the ground each mover may cross ([`web/ENGINE.md`](../web/ENGINE.md)).
- The side scenes: `forest.js` and `lakeside.js` (on `side.js`), `larches.js`, `ridge.js` (the West Ridge), `approach.js`, `camp.js`, `climb.js` (the six Spires climbs), `register.js` (with the box seen from a step back in `kiosk.js`) and `offroute.js`. The drawings of people and animals are in `tj.js`, `people.js`, `cats.js`, `fauna.js` and `sprites.js`.
- `pixel.js`: the scene manager: `ROUTES` (lists of legs), stops, the cut between scenes, zoom, pace, input and the world clock.
- `app.js`, `index.html` and `style.css`: the page round the canvas (signs, cards, timeline, trail map, debug panel). `content.js` fills the numbers into the words, and `audio.js` synthesises the music and the effects.

### Looking at it

- Queries: `route=lake|stack|spires|spire:<id>`, `p=0..1`, `dusk=1`, `time=<s>`, `debug=roam,-trees,-mist`, `done=lake,stack,spires`, `speed=0|0.5|1|2|4|8`, `start=<event,...>` and `break=<scene>|load:<scene>|renderer|mount`.
- `window.__api` drives the page from a test or a tool (`trigger`, `hitAt`, `trailAt`, `walkTo`, `scrub`, `jumpTo`, `running`, `clock` and more), and `window.__info` says where it is (`{p, route, running, scene, VW, VH, S, o}`).
- Steps for `shot.sh` and `frames.sh` are separated by semicolons (`wait=600;key=Space;wheel=x,y,dy;click=<css>;eval=<js>`), so an `eval` step can't contain one.
- `WWW=<folder>` points any tool at another build. To compare with what is merged, export it into its own folder (`git archive origin/main web/www | tar -x -C <folder>`) and render the same views from both.

### The bar

- Every change is compared with the last merged build, side by side (`sheet.sh`), by Day and at Dusk, at 1440 wide and on a phone (390). Anything that moves is filmed (`frames.sh`). Nothing ships worse than what it replaces.
- Every view draws in under 16.7 ms a frame. A new loop over pixels goes in its own small function outside the map's `draw()`, which is too big for the browser to optimise.
- The palette holds 254 colours at most. New art reuses the existing ramps; a new ramp needs its Dusk colours.
- After a change to `land.js`, `core.js` or anything `land.js` imports, run `bake.sh` and commit `ground.png`. On localhost the page warns when the bake is stale, and the browser suite fails on that warning.
- New things are placed by rule (forest, height, water, trails), never at written positions, so they move with the land.
- Every new timed event gets a start button in the debug menu, and every placed animal appears in its spawn menu.
- Finds are TJ's to choose, and an existing feature stays unless TJ asks for it to go.
- Generated pictures follow [`design/TRAILHEAD-ART.md`](../design/TRAILHEAD-ART.md).

## The workspaces

npm workspaces, one lockfile at the root, Node's major in `.node-version` alone. Every dependency is an exact pin, and every install passes `--ignore-scripts` (`tests/locks.test.ts`). A new runtime dependency also needs its row in [`NOTICES.md`](../NOTICES.md); `tests/notices.test.ts` fails until it has one.

TypeScript runs as written: Node strips the types of `.ts` files, so scripts run with `node file.ts`, and imports spell the `.ts` extension. Only erasable syntax is allowed (no enums or namespaces).

## Writing tests

- Tests sit in each workspace's `test/`, beside the code they cover, and in `tests/` for the repo-wide checks. A database test is named `*.db.test.ts` and runs only in `make test-db`.
- Each suite builds its fakes in its own `test/fixtures.ts`: content files in `content/test/fixtures.ts`, store rows in `api/test/fixtures.ts`, every GitHub answer (and failure) in `fetcher/test/fixtures.ts`. Tests compose them and never spell a fake inline.
- No test touches the network. GitHub is always the fake fetch from the fixtures; the database suite gets a fresh database per file from `common/test/database.ts`.
- Time is fixed: every suite runs in UTC, and dates come from `START` and `daysAfterStart` in `common/test/fixtures.ts`.
- Coverage has no floor. A file left out of it carries its reason beside the exclusion in `vitest.config.ts`.

## Content

The words live in `content/game/` ([`content/CLAUDE.md`](../content/CLAUDE.md)). After an edit, `make words` checks them and rewrites the game's copy, `web/www/words.js`; `make test` fails until you do. Every target also runs `npm run content`, which writes `content/dist/content.json` for the services. New user-facing words need TJ's approval before they ship.
