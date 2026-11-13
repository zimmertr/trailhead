import { describe, expect, it } from 'vitest'
import { files, read } from './repo.ts'

// WCAG 2.2 relative luminance and contrast, the measure ui.md pins.
const channel = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = (hex: string) => {
  const [r = 0, g = 0, b = 0] = (hex.slice(1).match(/../g) ?? []).map((pair) => channel(Number.parseInt(pair, 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x)
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05)
}

const TOKENS = 'web/src/styles/tokens.css'
const tokens = Object.fromEntries([...read(TOKENS).matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name ?? '', (value ?? '').trim()]))
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/i

// Every pair the pages draw text in: [text, background].
const TEXT_PAIRS: [string, string][] = [
  ['ink', 'paper'],
  ['ink-soft', 'paper'],
  ['band-ink', 'band'],
  // A place's band, and a link in a place's colour.
  ...['meadow', 'lake', 'granite', 'glacier'].flatMap((place): [string, string][] => [
    ['band-ink', place],
    [place, 'paper'],
  ]),
]

describe('the tokens', () => {
  it('measure contrast the way WCAG does', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })

  it.each(TEXT_PAIRS)('give %s on %s at least 4.5:1, AA for text', (text, background) => {
    expect(tokens[text], text).toMatch(/^#[0-9a-f]{6}$/)
    expect(tokens[background], background).toMatch(/^#[0-9a-f]{6}$/)
    expect(contrast(tokens[text] ?? '', tokens[background] ?? '')).toBeGreaterThanOrEqual(4.5)
  })

  it('give the focus ring at least 3:1 against the paper and the band, AA for UI', () => {
    expect(contrast(tokens.ink ?? '', tokens.paper ?? '')).toBeGreaterThanOrEqual(3)
    expect(contrast(tokens['band-ink'] ?? '', tokens.band ?? '')).toBeGreaterThanOrEqual(3)
  })

  it('set every page in National Park', () => {
    expect(tokens.font).toMatch(/^'National Park',/)
  })

  it('keep a floor for text a reader reads, and a larger one for anything pressed', () => {
    expect(tokens['text-small']).toBe('1rem')
    expect(Number.parseFloat(tokens['text-sign'] ?? '0')).toBeGreaterThan(Number.parseFloat(tokens.text ?? '0'))
  })
})

describe('every other stylesheet and page', () => {
  // The favicon is an image file: it can't read a CSS variable, so it spells
  // the meadow colour itself.
  const OWNERS = new Set([TOKENS, 'web/public/favicon.svg'])
  const sources = [...files(/^web\/.*\.(css|html|svg)$/)].filter((path) => !OWNERS.has(path))

  it('spells no colour of its own', () => {
    expect(sources.filter((path) => COLOUR.test(read(path)))).toEqual([])
  })

  it('takes every font and size from the tokens', () => {
    for (const path of sources.filter((p) => p.endsWith('.css'))) {
      for (const [, property, value] of read(path).matchAll(/(font-family|font-size|font-weight):\s*([^;]+);/g)) {
        expect(value, `${path}: ${property}`).toMatch(/^var\(--[\w-]+\)$/)
      }
    }
  })

  it('finds the colour in a line that spells one', () => {
    expect(COLOUR.test('color: #3d6b35;')).toBe(true)
    expect(COLOUR.test('color: var(--meadow);')).toBe(false)
  })
})
