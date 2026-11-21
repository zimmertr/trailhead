# web

The pixel world, served by nginx as it is: plain browser JavaScript with no build step and no types (record 0015). `build.mjs` writes `dist/` for the image.

| Path | Owns |
|---|---|
| `www/` | The game: `index.html`, `style.css`, every module, `ground.png` and `fonts/`. `content.js` holds every word it shows |
| `build.mjs` | Copies `www/` to `dist/`, gives the page its document head (charset, viewport, description, icon, the API for live stars) and writes `third-party-licenses.txt` from the fonts' licences. The render tools' own pages stay out |
| `nginx.conf`, `security-headers.conf` | How the image serves it, and the headers on every response |

The game reads live stars and releases from `/api/v1/projects` only when the page names it in its `trailhead:stars` meta tag, which `build.mjs` adds. The artifact and the tools don't, so they keep the numbers in `content.js`.

The policy allows no inline style or script: styles live in `style.css` or are set through `element.style`. Any host the game names must be classified in `tests/csp.test.ts`, and any it reaches added to `security-headers.conf`. The render tools are in `tools/pixel/`.
