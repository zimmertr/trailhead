// The events the site may send, and nothing else (record 0006). Umami's
// script defines `window.umami` once it's on the page; until then, and
// wherever it's blocked, every call here does nothing.
export const EVENTS = ['milestone-reached', 'map-opened', 'egg-found', 'section-left', 'error', 'frame-rate', 'load-time'] as const

export type EventName = (typeof EVENTS)[number]
export type EventData = Record<string, string | number>
type Umami = { track: (name: string, data?: EventData) => void }
type Target = { umami?: Umami }

// Long enough to tell errors apart, short enough that a message can't carry
// a whole page of someone's data.
export const MAX_MESSAGE = 200

export function track(name: EventName, data?: EventData, target: Target = globalThis as Target): boolean {
  if (!(EVENTS as readonly string[]).includes(name) || !target.umami) return false
  target.umami.track(name, data)
  return true
}

type ErrorSource = Target & Pick<Window, 'addEventListener'>

export function reportErrors(source: ErrorSource): void {
  source.addEventListener('error', (event) => {
    track('error', { message: event.message.slice(0, MAX_MESSAGE) }, source)
  })
  source.addEventListener('unhandledrejection', (event) => {
    track('error', { message: String(event.reason).slice(0, MAX_MESSAGE) }, source)
  })
}
