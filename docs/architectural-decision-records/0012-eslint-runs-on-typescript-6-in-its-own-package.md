# 0012. ESLint runs on TypeScript 6 in a package of its own, while the repo type-checks with TypeScript 7

- Status: Accepted
- Date: 2026-11-12
- Decider: git is the source: the author of https://github.com/zimmertr/trailhead/pull/20, following Bluebird's `frontend/tools/eslint`.
- Issues and PRs: https://github.com/zimmertr/trailhead/pull/20
- Cited in code as: none
- Guide: [`docs/DEVELOPMENT.md`](../DEVELOPMENT.md), Checks

## Context

The repo type-checks with TypeScript 7.0.2, the native compiler. typescript-eslint 8.72.2 needs the compiler's JavaScript API, which TypeScript 7's package no longer ships, and its peer range stops below 6.1.

## Decision

`tools/eslint/` holds ESLint, typescript-eslint and TypeScript 6.0.3 with its own `package.json` and lock, outside the workspaces. `make lint` installs it, lints the repo with `--max-warnings 0`, and runs `selftest.js`, which fails unless every custom rule in `plugin.js` trips on its fixture.

## Evidence

- 2026-11-12: `npm view typescript-eslint peerDependencies` gives `typescript: '>=4.8.4 <6.1.0'`.

## Alternatives rejected

- TypeScript 6 everywhere. A slower type check, and a step back from Bluebird's toolchain.
- ESLint without type information. It would lose `no-floating-promises` and the other rules that read types.

## Consequences

Two lockfiles, both held by `tests/locks.test.ts`. When typescript-eslint supports TypeScript 7, this record is superseded and the package folds into the root.
