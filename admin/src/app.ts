import { type BuildInfo, type Logger, errorBody, installHttpBasics, serverOptions } from '@trailhead/common'
import Fastify, { type FastifyInstance } from 'fastify'

export type AdminDeps = {
  ping: () => Promise<void>
  build: BuildInfo
  logger: Logger
  licenses: string
}

// The page TJ will approve summit register entries on
// (https://github.com/zimmertr/trailhead/issues/3). Until then it only
// proves the panel is up. No script, no stylesheet, so its policy can stay
// at loading nothing.
export const PLACEHOLDER_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Trailhead admin</title>
</head>
<body>
<h1>Trailhead admin</h1>
<p>Nothing to review yet.</p>
</body>
</html>
`

// Reachable from the home network only, and never from the internet
// (docs/TRAFFIC.md). It holds no tokens and serves no API.
export function buildAdmin(deps: AdminDeps): FastifyInstance {
  const { logger } = deps
  const app = Fastify(serverOptions(logger))
  installHttpBasics(app, 'html')

  app.get('/healthz', async (_request, reply) => reply.header('cache-control', 'no-store').send({ status: 'ok' }))
  app.get('/readyz', async (_request, reply) => {
    reply.header('cache-control', 'no-store')
    try {
      await deps.ping()
    } catch (error) {
      logger.warn({ err: error }, 'readyz: the database did not answer')
      return reply.code(503).send(errorBody('unavailable'))
    }
    return reply.send({ status: 'ok' })
  })
  app.get('/version', async (_request, reply) => reply.header('cache-control', 'no-store').send(deps.build))
  app.get('/third-party-licenses.txt', async (_request, reply) => reply.header('content-type', 'text/plain; charset=utf-8').send(deps.licenses))
  app.get('/', async (_request, reply) => reply.header('content-type', 'text/html; charset=utf-8').header('cache-control', 'no-store').send(PLACEHOLDER_PAGE))
  return app
}
