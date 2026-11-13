import { type DestinationStream, type Logger, type LoggerOptions, pino } from 'pino'

export type { Logger } from 'pino'

const MASK = '[redacted]'

// Applied to every serialized line, message, fields and error stacks alike, so
// no call site can forget it (service.md, Logs). Ordered so a URL's password
// is masked before the address patterns see the host.
const SECRETS: RegExp[] = [
  // GitHub tokens: classic (ghp_, gho_, ghu_, ghs_, ghr_) and fine-grained.
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\b(Bearer)\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  // The password in a connection string.
  /(?<=:\/\/[^:/@\s"]+:)[^@\s"]+(?=@)/g,
  // Client addresses: IPv4, and IPv6 written with :: or as all eight groups.
  // A clock reading such as 03:04:05 has neither, so it survives.
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  /(?<![\w:])(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}(?![\w:])/gi,
  /(?<![\w:])(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4})*)?::(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4})*)?(?![\w:])/gi,
]

// JSON.stringify already escapes C0 controls. These survive it and can still
// rewrite a terminal or split a log line in some viewers.
const UNESCAPED_CONTROLS = /[\u007f-\u009f\u2028\u2029]/g

export function redact(line: string): string {
  let out = line
  for (const pattern of SECRETS) out = out.replace(pattern, (match, scheme: unknown) => (typeof scheme === 'string' ? `${scheme} ${MASK}` : MASK))
  return out.replace(UNESCAPED_CONTROLS, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)
}

export type LoggerConfig = { service: string; level: string }

// Synchronous to stdout, so a one-shot job's last line is written before it
// exits. The volume here is a few lines a minute.
export function createLogger({ service, level }: LoggerConfig, destination?: DestinationStream): Logger {
  const options: LoggerOptions = {
    level,
    base: { service },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    hooks: { streamWrite: redact },
  }
  return pino(options, destination ?? pino.destination({ dest: 1, sync: true }))
}
