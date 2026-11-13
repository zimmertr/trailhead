# 0005. The device's reduce-motion setting is not honoured

- Status: Accepted
- Date: 2026-11-12
- Decider: TJ, 2026-11-12. Asked what visitors with that setting should get, he asked "Do we have to accommodate this setting? Can we ignore it?" and, told the case for a one-time choice, chose "Ignore the setting".
- Issues and PRs: none yet
- Cited in code as: none
- Guide: [`docs/PRD.md`](../PRD.md), Requirement 14 in the PRD

## Context

The site is made of camera moves. Some visitors set their device to reduce motion, often because large camera moves make them unwell. The project-start standards expect a UI to honour the setting.

## Decision

Everyone gets the full 3D world. The plain page is one click away in the trail map and is what a browser without WebGL gets.

## Evidence

No dated measurement.

## Alternatives rejected

- A one-time choice on the opening still between the 3D world and the plain page, for those visitors only. Cheap, since both exist. TJ declined it.
- A calmer 3D mode with fades in place of travel. A second way for everything to move, to build and to test.

## Consequences

Nothing enforces it. If it is reversed, the one-time choice is the cheap path.
