# 0001. The world is one small planet

- Status: Superseded by 0014
- Date: 2026-11-12
- Decider: TJ, 2026-11-12. Asked how the world should end at its edges, he chose "Small planet" over a sea of cloud, a ring of mountains and an island, and then: "We're building a small world here, I don't want to grow the scope."
- Issues and PRs: none yet
- Cited in code as: none
- Guide: [`docs/PRD.md`](../PRD.md), Requirement 1, One world

## Context

The Round 3 prototypes built each place as a scene of its own, and the peak seen from the start did not match the same peak in its own section. TJ asked for one seamless world where objects keep their place and look. A flat world then needs an edge, and the Konami free camera can look at it.

## Decision

Every place sits on one sphere: the meadow, the forest, the lake, the wall and the spires, and nothing else. Down is toward the planet's centre everywhere, so terrain, routes, the character and the camera all work in a local frame on the sphere. The planet is small enough that its curve is plain from the ground.

## Evidence

No dated measurement. The Round 4 prototype tests whether the planet holds all four places, feels like big mountains from the ground and loads fast.

## Alternatives rejected

- A sea of cloud around a flat world, with the free camera eased to a stop at its limits. The cheapest edge, and the one to return to if the planet fails in Round 4. TJ preferred the planet.
- A ring of far mountains. It needs the valley floors between the places built out.
- An island in an ocean. It reads as coastal, which fits little here.

## Consequences

Every part of the 3D site depends on this, so it is the first thing the prototype proves. It costs sphere mathematics in every route, camera and terrain calculation. It removes world edges, and it makes the Konami free camera a matter of pulling back until the planet is in view.
