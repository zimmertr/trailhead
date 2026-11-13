import type { FastifyBaseLogger, FastifyError, FastifyInstance } from 'fastify'
import type { Logger } from './logger.ts'

// The one error shape every service answers (service.md, Errors). `code` is
// what a caller branches on and never changes for a given failure; `message`
// is for people and may be reworded; `retryable` says whether trying again
// can help.
export const ERRORS = {
  bad_request: { status: 400, retryable: false, message: 'The request is malformed.' },
  not_found: { status: 404, retryable: false, message: 'Nothing lives at this address.' },
  method_not_allowed: { status: 405, retryable: false, message: 'This address does not take that method.' },
  payload_too_large: { status: 413, retryable: false, message: 'The request body is too large.' },
  unsupported_media_type: { status: 415, retryable: false, message: 'The request body has a type this address does not take.' },
  rate_limited: { status: 429, retryable: true, message: 'Too many requests. Try again later.' },
  internal: { status: 500, retryable: true, message: 'Something failed on the server. Try again later.' },
  unavailable: { status: 503, retryable: true, message: 'A service this needs is unavailable. Try again later.' },
} as const

export type ErrorCode = keyof typeof ERRORS
export type ErrorBody = { error: { code: ErrorCode; message: string; retryable: boolean } }

export function errorBody(code: ErrorCode): ErrorBody {
  const { message, retryable } = ERRORS[code]
  return { error: { code, message, retryable } }
}

// The JSON Schema of ErrorBody, for the OpenAPI document and Fastify's
// response serializer.
export const errorSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      additionalProperties: false,
      required: ['code', 'message', 'retryable'],
      properties: {
        code: { type: 'string', enum: Object.keys(ERRORS) },
        message: { type: 'string' },
        retryable: { type: 'boolean' },
      },
    },
  },
} as const

const BY_STATUS = new Map<number, ErrorCode>(Object.entries(ERRORS).map(([code, { status }]) => [status, code as ErrorCode]))

// A Fastify error carries the status it wants; anything without one, or with
// a status this table doesn't name, is a bug and answers as `internal`.
export function codeFor(error: Pick<FastifyError, 'statusCode'>): ErrorCode {
  return BY_STATUS.get(error.statusCode ?? 500) ?? 'internal'
}

// The policies differ by what a service answers: the API answers JSON only,
// the admin panel a page that loads nothing beyond itself.
const CSP = {
  json: "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  html: "default-src 'none'; style-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
} as const

// Every response, errors and 404s included (service.md, Public services).
// HSTS is left to the edge, where TLS ends.
export function securityHeaders(kind: keyof typeof CSP): Record<string, string> {
  return {
    'content-security-policy': CSP[kind],
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  }
}

const QUIET_ROUTES = new Set(['/healthz', '/readyz'])

// Every request body is refused above this before it's read: no route takes a
// body yet. docs/LIMITS.md has the reason.
export const MAX_BODY_BYTES = 1_024

// The server options both apps share. Fastify's own request logging is off
// because its records carry the client address and a request id; each app
// logs one line per response itself. The child logger factory hands back the
// root logger, so no request id is bound to a line either.
export function serverOptions(logger: Logger) {
  // Typed as Fastify's own logger interface, which pino's satisfies, so the
  // apps keep Fastify's default instance, request and reply types.
  const loggerInstance: FastifyBaseLogger = logger
  return {
    loggerInstance,
    disableRequestLogging: true,
    childLoggerFactory: (): FastifyBaseLogger => loggerInstance,
    bodyLimit: MAX_BODY_BYTES,
    // Unknown query parameters are refused, not quietly dropped (service.md,
    // A strict reader).
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
  }
}

// Wires the headers, the body cap, the 404 and the error answer into an app,
// so the API and the admin panel can't drift apart on any of them.
export function installHttpBasics(app: FastifyInstance, kind: keyof typeof CSP): void {
  const headers = securityHeaders(kind)
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.headers(headers)
    return payload
  })
  // Fastify reads a body only for a route that takes one, so the declared
  // length is checked here, for every address, before anything is read.
  app.addHook('onRequest', async (request, reply) => {
    if (Number(request.headers['content-length'] ?? 0) > MAX_BODY_BYTES) {
      return reply.code(413).send(errorBody('payload_too_large'))
    }
    return undefined
  })
  // One line per response, with the route pattern rather than the URL, so no
  // query string or path parameter reaches the log. Probes run every few
  // seconds, so theirs are debug.
  app.addHook('onResponse', async (request, reply) => {
    const route = request.routeOptions.url ?? 'unmatched'
    const level = QUIET_ROUTES.has(route) ? 'debug' : 'info'
    request.log[level]({ method: request.method, route, status: reply.statusCode, ms: Math.round(reply.elapsedTime) }, 'response')
  })
  app.setNotFoundHandler(async (_request, reply) => reply.code(404).send(errorBody('not_found')))
  app.setErrorHandler(async (error: FastifyError, request, reply) => {
    const code = codeFor(error)
    if (code === 'internal') request.log.error({ err: error }, 'unhandled error')
    return reply.code(ERRORS[code].status).send(errorBody(code))
  })
}
