# 0011. The content compiles to one JSON file, and the pages are written from it at build time

- Status: Accepted
- Date: 2026-11-12
- Decider: TJ, in the PRD (2026-11-12): "Markdown files with YAML fields, compiled at build time into one checked data file". Rendering the pages at build time was chosen in https://github.com/zimmertr/trailhead/pull/20.
- Issues and PRs: https://github.com/zimmertr/trailhead/pull/20
- Cited in code as: none
- Guide: [`CLAUDE.md`](../../CLAUDE.md), Rules: the words are written once

## Context

The 3D cards, the plain page and the API read the same words. The plain page is also what crawlers and browsers without WebGL get, and the home page must show the intro and the signs before the 3D loads.

## Decision

- `content/src/build.ts` reads `content/site.md`, `places/`, `milestones/` and `projects/`, checks them against `content/src/schema.ts` (strict fields, links that resolve, no duplicates, no first person, no email address), renders the prose with micromark (raw HTML escaped), and writes `content/dist/content.json`. The build stops on any problem and lists them all.
- `web` imports it at build time and writes the home page's still and the whole plain page into the HTML (`web/src/render.ts`, `web/vite.config.ts`). `api` and `fetcher` bundle it.

## Evidence

No dated measurement.

## Alternatives rejected

- Rendering the plain page in the browser. Crawlers and browsers with scripts off would see an empty page.
- Committing `content.json`. A second copy of the words to keep in step.

## Consequences

Every build and test target runs `npm run content` first. A content change is a rebuild of `web`, `api` and `fetcher`.
