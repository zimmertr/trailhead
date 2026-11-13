// Value noise and its sums, all in 0..1 and all seeded, so every shape built
// from them is the same on every load. There are two families because the
// mountains (massif.ts, stack.ts) were tuned on the two-dimensional one and
// the ground (ground.ts) on the three-dimensional one; they hash differently,
// so neither can stand in for the other without changing the look.
import { lerp } from './maths.ts'

const fade = (t: number): number => t * t * (3 - 2 * t)

// Adds up octaves, each at `lacunarity` times the frequency and half the
// weight of the one before, and normalises by the total weight. `term`
// returns one octave already weighted.
function octaves(count: number, lacunarity: number, term: (weight: number, frequency: number, octave: number) => number): number {
  let sum = 0
  let weight = 0.5
  let frequency = 1
  let total = 0
  for (let i = 0; i < count; i++) {
    sum += term(weight, frequency, i)
    total += weight
    weight *= 0.5
    frequency *= lacunarity
  }
  return sum / total
}

// Ridged noise turns each octave into a crest where plain noise crosses its
// middle, which reads as mountain ridges.
const crest = (value: number): number => 1 - Math.abs(2 * value - 1)

function hash2(ix: number, iy: number, seed: number): number {
  let n = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed + 1, 1274126177)) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

export function noise(x: number, y: number, seed = 0): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const u = fade(x - ix)
  const v = fade(y - iy)
  const bottom = lerp(hash2(ix, iy, seed), hash2(ix + 1, iy, seed), u)
  const top = lerp(hash2(ix, iy + 1, seed), hash2(ix + 1, iy + 1, seed), u)
  return lerp(bottom, top, v)
}

export function fbm(x: number, y: number, count = 4, seed = 0): number {
  return octaves(count, 2.03, (weight, f, i) => weight * noise(x * f, y * f, seed + i * 17))
}

export function ridge(x: number, y: number, count = 4, seed = 0): number {
  return octaves(count, 2.1, (weight, f, i) => {
    const c = crest(noise(x * f, y * f, seed + i * 31))
    return weight * c * c
  })
}

function hash3(ix: number, iy: number, iz: number, seed: number): number {
  let n = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 1440662683) + Math.imul(seed + 1, 1274126177)) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

export function noise3(x: number, y: number, z: number, seed = 0): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const u = fade(x - ix)
  const v = fade(y - iy)
  const w = fade(z - iz)
  const layer = (kz: number) => {
    const bottom = lerp(hash3(ix, iy, kz, seed), hash3(ix + 1, iy, kz, seed), u)
    const top = lerp(hash3(ix, iy + 1, kz, seed), hash3(ix + 1, iy + 1, kz, seed), u)
    return lerp(bottom, top, v)
  }
  return lerp(layer(iz), layer(iz + 1), w)
}

export function fbm3(x: number, y: number, z: number, count = 3, seed = 0): number {
  return octaves(count, 2.03, (weight, f, i) => weight * noise3(x * f, y * f, z * f, seed + i * 17))
}

export function ridge3(x: number, y: number, z: number, count = 3, seed = 0): number {
  return octaves(count, 2.1, (weight, f, i) => {
    const c = crest(noise3(x * f, y * f, z * f, seed + i * 31))
    return weight * c * c
  })
}
