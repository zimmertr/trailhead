# content

Every word the game shows, written once. Record: [0009](../docs/architectural-decision-records/0009-the-words-live-in-content-game.md)

| Path | Holds |
|---|---|
| `game/trailhead.yaml` | The intro, the three destinations, the profile links, the register's entries and the finds |
| `game/reflection-lake.yaml`, `proficiency-peak.yaml`, `off-route.yaml` | Each place's cards |
| `game/sideproject-spires.yaml` | Base camp's card and the six projects, in the order base camp lists them. The API and the fetcher take their repo list from here |
| `game/names.yaml` | Stop labels, route ends, place names, the joke signs, the names in each scene, the music |
| `game/interface.yaml` | Buttons, headings, messages, the keys, the console, and how long ago a date was |
| `src/schema.ts` | What each section may hold. Strict, so a misspelt name fails |
| `src/build.ts` | Merges and checks the files (no email addresses, links that resolve, no repo twice) |
| `src/cli.ts` | `npm run content`: writes `dist/content.json`. `npm run words` (`make words`) also rewrites `web/www/words.js` |
| `src/index.ts` | What `api` and `fetcher` import |

Text in `{braces}` is filled in by `web/www/content.js`; keep the names inside them. After any edit run `make words`: `words.js` is checked in, and a unit test fails while it is behind. A section lives in one file; only `CARDS` is spread across them.

New words need TJ's approval before they ship. There is no first-person check: the journal card, the register and TJ's note in it speak as themselves.
