import { type ErrorCode, errorSchema } from '@trailhead/common'

// Every route the API serves, with its contract. app.ts registers exactly
// these and openapi.ts writes the committed document from them, so the
// document can't describe a route the code doesn't have, or miss one it does.

const nullable = (type: string) => ({ type: [type, 'null'] })

const statusSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status'],
  properties: { status: { type: 'string', enum: ['ok'] } },
} as const

const versionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['version', 'commit'],
  properties: {
    version: { type: 'string', description: 'The release, such as 0.1.0, or dev outside a release image' },
    commit: { type: 'string', description: 'The git commit the image was built from' },
  },
} as const

const projectSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['slug', 'name', 'repo', 'url', 'stars', 'language', 'license', 'release', 'fetchedAt'],
  properties: {
    slug: { type: 'string', description: 'The project’s address on the site, under /sideproject-spires/' },
    name: { type: 'string' },
    repo: { type: 'string', description: 'owner/name on GitHub' },
    url: { type: 'string', format: 'uri' },
    stars: { ...nullable('integer'), minimum: 0, description: 'Null until the numbers are first fetched' },
    language: { ...nullable('string'), description: 'GitHub’s primary language for the repo' },
    license: { ...nullable('string'), description: 'GitHub’s SPDX id, NOASSERTION when it can’t tell which license' },
    release: {
      description: 'The latest published release, null when there is none or the numbers are not fetched yet',
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['tag', 'publishedAt'],
          properties: { tag: { type: 'string' }, publishedAt: { type: 'string', format: 'date-time' } },
        },
        { type: 'null' },
      ],
    },
    fetchedAt: { ...nullable('string'), format: 'date-time', description: 'When these numbers were read from GitHub' },
  },
} as const

const projectsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['projects'],
  properties: { projects: { type: 'array', items: projectSchema } },
} as const

// Every route takes no query parameters, and refuses any it's sent.
export const NO_QUERY = { type: 'object', additionalProperties: false, properties: {} } as const

export type RouteUrl = '/healthz' | '/readyz' | '/api/version' | '/api/v1/projects' | '/api/third-party-licenses.txt'

export type Route = {
  url: RouteUrl
  summary: string
  // Probes are exempt: the kubelet calls them every few seconds from inside
  // the cluster, and a probe that gets a 429 restarts a healthy pod.
  rateLimited: boolean
  response: { type: 'json'; schema: object } | { type: 'text' }
  // The error codes this route can answer besides the ones every route can.
  errors: ErrorCode[]
}

export const ROUTES: Route[] = [
  { url: '/healthz', summary: 'The process is up', rateLimited: false, response: { type: 'json', schema: statusSchema }, errors: [] },
  {
    url: '/readyz',
    summary: 'The process can reach the database',
    rateLimited: false,
    response: { type: 'json', schema: statusSchema },
    errors: ['unavailable'],
  },
  { url: '/api/version', summary: 'The running version and its commit', rateLimited: true, response: { type: 'json', schema: versionSchema }, errors: [] },
  {
    url: '/api/v1/projects',
    summary: 'The six projects with their GitHub numbers',
    rateLimited: true,
    response: { type: 'json', schema: projectsSchema },
    errors: ['unavailable'],
  },
  {
    url: '/api/third-party-licenses.txt',
    summary: 'The license text of every package bundled into this service',
    rateLimited: true,
    response: { type: 'text' },
    errors: [],
  },
]

// Any route can answer these: an unknown query parameter, a body over the
// cap, the rate limit, and a bug.
export const COMMON_ERRORS: ErrorCode[] = ['bad_request', 'payload_too_large', 'rate_limited', 'internal']

export { errorSchema }
