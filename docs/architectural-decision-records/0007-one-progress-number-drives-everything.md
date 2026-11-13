# 0007. Position, pose and camera are computed from one progress number

- Status: Accepted
- Date: 2026-11-12
- Decider: TJ signed off the PRD that states it on 2026-11-12. The design answers his Round 3 feedback: a timeline to scrub both ways, a camera that never loses the character, and feet that stay on the ground.
- Issues and PRs: none yet
- Cited in code as: none
- Guide: [`docs/PRD.md`](../PRD.md), PRD section 4, Core components

## Context

The Round 3 prototypes ran each scene as a small simulation with its own controls. Scrubbing backwards was not possible, the camera lagged until the character left the screen, and the figure stood upright in thin air on steep snow.

## Decision

Each route has one number: how far along it the character is. The timeline, the scroll wheel, the keys and the start and stop toggle change only that number. His position, his pose and the camera are pure functions of it and of the ground under him. Nothing is integrated frame to frame.

## Evidence

No dated measurement. The Round 4 prototype is the test.

## Alternatives rejected

- Keep the simulations and add rewind. Every scene would need its own undo.
- Authored animation clips on a path. Looks right sooner, but scrubbing backwards is harder and the clips have to come from somewhere.

## Consequences

Routes are data, and a pose can be tested by calling a function with a number. Moves that code cannot make look right (the jump, the glissade) may use clips from free animation libraries, after a license check.
