# 0009. The words live in content/game and compile to one JSON file for the services and one module for the game

- Status: Accepted
- Date: 2026-11-12
- Decider: TJ, in the PRD (2026-11-12): "Markdown files with YAML fields, compiled at build time into one checked data file". Rendering the pages at build time was chosen in https://github.com/zimmertr/trailhead/pull/20. The game's words joined them by TJ's answer in round 6's questions (2026-11-21).
- Issues and PRs: https://github.com/zimmertr/trailhead/pull/20, https://github.com/zimmertr/trailhead/issues/34 (the game's words move here, round 6)
- Cited in code as: none
- Guide: [`CLAUDE.md`](../../CLAUDE.md), Rules: the words are written once

## Context

The game, the API and the fetcher read the same words: the game shows every card and the six projects, and the API and the fetcher need the projects' repos. TJ asked for the game's words to be easy to find and change without touching code (issue #34), and in round 6's questions on 2026-11-21 chose plain text files in `content/`. The game is plain JavaScript with no build step (record 0001), so it can't read YAML at run time without a parser.

## Decision

- The words are YAML, one file per place, in `content/game/`. `content/src/build.ts` merges them, checks them against `content/src/schema.ts` (strict names, links that resolve, no repo twice, no email address) and stops on any problem, listing them all.
- Every build writes `content/dist/content.json` with the projects, which `api` and `fetcher` bundle.
- `make words` writes the same words into `web/www/words.js`, which is checked in so the game still runs as it is. A unit test fails while it is behind the YAML. `web/www/content.js` keeps only code: it fills the `{braces}` in a template and builds the few lines made from other words.

## Evidence

Round 6, item A4: every export of the old `content.js`, its functions called on sample numbers, was compared with the new one and came out equal.

## Alternatives rejected

- Generating `words.js` only at image build. The game, the render tools and the review artifact all run `web/www` as it is, and would each need the build first.
- Markdown files, as before. The game's words are mostly short labels in nested tables, which Markdown has no shape for.
- Committing `content.json`. Only the services read it, and they build it first.

## Consequences

Every build and test target runs `npm run content` first. A change to the words is a `make words`, a rebuild of `web`, and, for the projects, of `api` and `fetcher`.
