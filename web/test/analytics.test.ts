import { describe, expect, it } from 'vitest'
import { EVENTS, MAX_MESSAGE, reportErrors, track } from '../src/analytics.ts'
import { fakeWindow } from './fixtures.ts'

describe('track', () => {
  it('does nothing while Umami is not on the page', () => {
    const { target, sent } = fakeWindow({ umami: false })
    expect(track('map-opened', undefined, target)).toBe(false)
    expect(sent).toEqual([])
    expect(track('map-opened')).toBe(false)
  })

  it('sends a listed event to Umami', () => {
    const { target, sent } = fakeWindow()
    expect(track('milestone-reached', { milestone: 'who-tj-is' }, target)).toBe(true)
    expect(sent).toEqual([['milestone-reached', { milestone: 'who-tj-is' }]])
  })

  it('refuses a name the list does not hold, even from untyped code', () => {
    const { target, sent } = fakeWindow()
    expect(track('page-view' as never, undefined, target)).toBe(false)
    expect(sent).toEqual([])
  })

  it('holds exactly the events record 0006 names', () => {
    expect(EVENTS).toEqual(['milestone-reached', 'map-opened', 'egg-found', 'section-left', 'error', 'frame-rate', 'load-time'])
  })
})

describe('reportErrors', () => {
  it('sends an uncaught error and an unhandled rejection, cut short', () => {
    const { target, sent, fire } = fakeWindow()
    reportErrors(target)
    fire('error', { message: 'x'.repeat(MAX_MESSAGE + 50) })
    fire('unhandledrejection', { reason: new Error('chunk failed') })
    expect(sent).toEqual([
      ['error', { message: 'x'.repeat(MAX_MESSAGE) }],
      ['error', { message: 'Error: chunk failed' }],
    ])
  })
})
