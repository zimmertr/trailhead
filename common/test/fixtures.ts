import { Writable } from 'node:stream'
import { type Logger, createLogger } from '../src/logger.ts'

// The one fixed instant every suite's clock starts from. Tests move relative
// to it (`daysAfterStart`), never to a calendar date of their own.
export const START = new Date('2030-01-01T00:00:00.000Z')
export const DAY_MS = 86_400_000
export const daysAfterStart = (days: number): Date => new Date(START.getTime() + days * DAY_MS)

// A real logger, redaction and all, writing into memory so a test can read
// exactly what would have reached stdout.
export function captureLogger(service = 'test', level = 'debug'): { logger: Logger; lines: () => Record<string, unknown>[]; raw: () => string } {
  let raw = ''
  const sink = new Writable({
    write(chunk: Buffer, _encoding, done) {
      raw += chunk.toString()
      done()
    },
  })
  const logger = createLogger({ service, level }, sink)
  return {
    logger,
    raw: () => raw,
    lines: () =>
      raw
        .split('\n')
        .filter((line) => line !== '')
        .map((line) => JSON.parse(line) as Record<string, unknown>),
  }
}
