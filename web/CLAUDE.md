# web

The site the browser loads, built by Vite and served by nginx. The 3D world will replace `src/world/placeholder.ts`.

| Path | Owns |
|---|---|
| `index.html`, `page/index.html` | The home page and the plain page, filled from the content at build time |
| `vite.config.ts` | The two pages, the content plugin, and the plugin that writes `third-party-licenses.txt` |
| `src/render.ts` | The HTML of the home page's still and the plain page |
| `src/home.ts`, `src/page.ts` | Each page's script: styles, error reporting, and on the home page the 3D |
| `src/world/placeholder.ts` | The stand-in for the world: one low-poly sphere |
| `src/world/palette.ts` | The one owner of every colour the canvas paints |
| `src/analytics.ts` | The closed list of events, sent only when Umami is on the page |
| `src/styles/tokens.css` | The one owner of every colour, font, size and space ([`docs/STYLES.md`](../docs/STYLES.md)) |
| `nginx.conf`, `security-headers.conf` | How the image serves it, and the headers on every response |

Any host the browser code names must be classified in `tests/csp.test.ts`, and any it reaches added to `security-headers.conf`.
