import { ERRORS, type ErrorCode } from '@trailhead/common'
import { COMMON_ERRORS, ROUTES, errorSchema } from './routes.ts'

const operationId = (url: string): string =>
  url
    .replace(/^\/(api\/)?/, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((word, index) => (index === 0 ? word : word[0]?.toUpperCase() + word.slice(1)))
    .join('')

// The document API.md describes. Written from ROUTES, never by hand: `make
// openapi` rewrites api/openapi.json and `make check-openapi` fails a PR whose
// committed copy differs.
export function openApiDocument(): object {
  const paths = Object.fromEntries(
    ROUTES.map((route) => {
      const codes: ErrorCode[] = [...new Set([...COMMON_ERRORS, ...route.errors])].filter((code) => route.rateLimited || code !== 'rate_limited')
      const errors = Object.fromEntries(
        codes
          .toSorted((a, b) => ERRORS[a].status - ERRORS[b].status)
          .map((code) => [
            String(ERRORS[code].status),
            { description: `\`${code}\`${ERRORS[code].retryable ? ', retryable' : ''}`, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          ]),
      )
      const ok =
        route.response.type === 'json'
          ? { description: 'OK', content: { 'application/json': { schema: route.response.schema } } }
          : { description: 'OK', content: { 'text/plain': { schema: { type: 'string' } } } }
      return [route.url, { get: { operationId: operationId(route.url), summary: route.summary, responses: { '200': ok, ...errors } } }]
    }),
  )
  return {
    openapi: '3.1.0',
    info: {
      title: 'trailhead API',
      version: 'v1',
      description: 'The public API behind tjzimmerman.com. docs/API.md says what each version promises.',
      license: { name: 'PolyForm Noncommercial 1.0.0', identifier: 'PolyForm-Noncommercial-1.0.0' },
    },
    paths,
    components: { schemas: { Error: errorSchema } },
  }
}

export const serialize = (document: object): string => `${JSON.stringify(document, null, 2)}\n`
