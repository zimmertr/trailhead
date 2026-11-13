# content

The site's words, written once, in third person. Every reader (`web`, `api`, `fetcher`) takes them from `dist/content.json`, which `npm run content` writes.

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

New words need TJ's approval before they ship. A new project is a new file in `projects/`. Record: [0011](../docs/architectural-decision-records/0011-the-pages-are-written-from-the-content-at-build-time.md)
