import type { Content } from '@trailhead/content'
import type { EventData } from '../src/analytics.ts'

export const content = (overrides: Partial<Content> = {}): Content => ({
  site: { name: 'TJ Zimmerman', profiles: [{ id: 'github', label: 'GitHub', url: 'https://github.com/zimmertr' }] },
  places: [
    { slug: 'trailhead', title: 'Trailhead', order: 0, signs: [{ text: 'Go & see the "lake"', place: 'about-lake' }], html: '<p>is a test.</p>' },
    { slug: 'about-lake', title: 'About <Lake>', order: 1, signs: [], html: '' },
    { slug: 'sideproject-spires', title: 'Spires', order: 2, signs: [], html: '' },
  ],
  milestones: [{ place: 'about-lake', slug: 'who', title: 'Who', order: 1, links: ['github'], tools: ['Kubernetes'], html: '<p>Words.</p>' }],
  projects: [{ slug: 'bluebird', name: 'Bluebird Forecast', repo: 'zimmertr/bluebird', order: 1, html: '<p>Weather.</p>' }],
  ...overrides,
})

// A window with Umami on it, recording what it was sent, and its listeners,
// so a test can fire the events a browser would.
export function fakeWindow({ umami = true } = {}) {
  const sent: [string, EventData | undefined][] = []
  const listeners = new Map<string, (event: unknown) => void>()
  const target = {
    ...(umami ? { umami: { track: (name: string, data?: EventData) => sent.push([name, data]) } } : {}),
    addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener),
  }
  return { target: target as never, sent, fire: (type: string, event: unknown) => listeners.get(type)?.(event) }
}
