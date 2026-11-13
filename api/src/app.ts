import rateLimit from '@fastify/rate-limit'
import { type BuildInfo, ERRORS, type Logger, errorBody, installHttpBasics, serverOptions } from '@trailhead/common'
import type { Project } from '@trailhead/content'
import Fastify, { type FastifyInstance, type FastifyReply, type RouteHandlerMethod } from 'fastify'
import { clientBucket } from './client.ts'
import { PROJECTS_MAX_AGE_S, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from './limits.ts'
import type { Metrics } from './metrics.ts'
import { projectsResponse } from './projects.ts'
import { COMMON_ERRORS, NO_QUERY, ROUTES, type RouteUrl, errorSchema } from './routes.ts'
import type { StatsRow, Store } from './store.ts'

export type ApiDeps = {
  store: Store
  projects: Project[]
  build: BuildInfo
  logger: Logger
  // Lower-case name of the header the edge proxy writes the client address
  // into (docs/TRAFFIC.md).
  clientIpHeader: string
  licenses: string
  metrics: Metrics
}

export async function buildApi(deps: ApiDeps): Promise<FastifyInstance> {
  const { store, logger, metrics } = deps
  const app = Fastify(serverOptions(logger))
  installHttpBasics(app, 'json')

  app.addHook('onResponse', async (request, reply) => {
    const route = request.routeOptions.url ?? 'unmatched'
    metrics.requests.inc({ method: request.method, route, status: String(reply.statusCode) })
    metrics.duration.observe({ method: request.method, route }, reply.elapsedTime / 1000)
  })

  await app.register(rateLimit, {
    global: true,
    max: RATE_LIMIT_MAX,
    timeWindow: RATE_LIMIT_WINDOW_MS,
    keyGenerator: (request) => clientBucket(request.headers[deps.clientIpHeader]),
    // Thrown, so the shared error handler answers it in the one error shape;
    // the plugin has already set Retry-After by then.
    errorResponseBuilder: () => Object.assign(new Error('rate limited'), { statusCode: 429 }),
  })

  // A database failure is the database's, not a bug: it answers 503 and says
  // a retry can help.
  const unavailable = (reply: FastifyReply, error: unknown, what: string) => {
    logger.warn({ err: error }, `${what}: the database did not answer`)
    return reply.code(503).send(errorBody('unavailable'))
  }

  const handlers: Record<RouteUrl, RouteHandlerMethod> = {
    '/healthz': async (_request, reply) => reply.header('cache-control', 'no-store').send({ status: 'ok' }),
    '/readyz': async (_request, reply) => {
      reply.header('cache-control', 'no-store')
      try {
        await store.ping()
      } catch (error) {
        return unavailable(reply, error, 'readyz')
      }
      return reply.send({ status: 'ok' })
    },
    '/api/version': async (_request, reply) => reply.header('cache-control', 'no-store').send(deps.build),
    '/api/v1/projects': async (_request, reply) => {
      let rows: StatsRow[]
      try {
        rows = await store.listStats()
      } catch (error) {
        return unavailable(reply, error, 'projects')
      }
      return reply.header('cache-control', `public, max-age=${PROJECTS_MAX_AGE_S}`).send(projectsResponse(deps.projects, rows))
    },
    '/api/third-party-licenses.txt': async (_request, reply) =>
      reply.header('content-type', 'text/plain; charset=utf-8').header('cache-control', 'public, max-age=3600').send(deps.licenses),
  }

  for (const route of ROUTES) {
    const response: Record<number, object> = Object.fromEntries([...COMMON_ERRORS, ...route.errors].map((code) => [ERRORS[code].status, errorSchema]))
    if (route.response.type === 'json') response[200] = route.response.schema
    app.get(route.url, {
      schema: { querystring: NO_QUERY, response },
      config: route.rateLimited ? {} : { rateLimit: false },
      handler: handlers[route.url],
    })
  }
  return app
}
