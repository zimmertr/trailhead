import { type Logger, createLogger } from './logger.ts'

// Runs a program's entry point so even a failure before its own logger exists
// (a missing setting, say) leaves one structured, redacted line and a non-zero
// exit, instead of a bare stack on stderr.
export async function runMain(service: string, main: () => Promise<void>, logger: Logger = createLogger({ service, level: 'info' })): Promise<void> {
  try {
    await main()
  } catch (error) {
    logger.fatal({ err: error }, 'stopped on an error')
    process.exitCode = 1
  }
}
