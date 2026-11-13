// The small numeric helpers every part of the world shares.

export const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value))

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t

// Hermite step from 0 at `edge0` to 1 at `edge1`. The edges may run either
// way, which is how the world writes "fades out from here to there".
export function smooth(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

// Eases toward a target at a rate that doesn't depend on the frame rate, so a
// slow device ends up in the same place as a fast one.
export const damp = (from: number, to: number, rate: number, dt: number): number => lerp(from, to, 1 - Math.exp(-rate * dt))

// The signed difference between two angles, folded into -pi..pi.
export const wrapAngle = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle))

export const DEGREES = Math.PI / 180

export type Random = () => number

// A seeded generator (mulberry32). The world is built from fixed seeds, so it
// comes out the same on every visit and every device.
export function rng(seed: number): Random {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// One entry of a list, picked by a draw from `random`.
export function pick<T>(list: readonly T[], random: Random): T {
  return list[Math.floor(random() * list.length)] as T
}
