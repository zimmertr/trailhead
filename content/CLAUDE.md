# content

The site's words, written once, in third person. `api` and `fetcher` take them from `dist/content.json`, which `npm run content` writes. The game's words join them in round 6 (item A4); until then they are in `web/www/content.js`.

| Path | Holds |
|---|---|
| `site.md` | TJ's name and the five profile links. Fields only |
| `places/*.md` | One file per place: title, order, the Trailhead's signs, and its prose |
| `milestones/<place>/*.md` | One file per milestone: title, order, its profile links and tools, and the card's words |
| `projects/*.md` | One file per project: name, GitHub repo, order, and the card's words |
| `src/schema.ts` | The fields each kind of file may hold |
| `src/build.ts` | Reads, checks and renders the files. Refuses first person and email addresses |
| `src/cli.ts` | `npm run content`: writes `dist/content.json` |
| `src/index.ts` | What the other workspaces import |

New words need TJ's approval before they ship. A new project is a new file in `projects/`. Record: [0009](../docs/architectural-decision-records/0009-the-content-compiles-to-one-json-file.md)
