import { type Server, createServer } from 'node:http'
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client'

export type Metrics = {
  registry: Registry
  requests: Counter<'method' | 'route' | 'status'>
  duration: Histogram<'method' | 'route'>
}

// One registry per app, so tests don't share counters.
export function createMetrics(): Metrics {
  const registry = new Registry()
  collectDefaultMetrics({ register: registry })
  return {
    registry,
    requests: new Counter({
      name: 'trailhead_api_requests_total',
      help: 'Responses sent, by route pattern and status',
      labelNames: ['method', 'route', 'status'],
      registers: [registry],
    }),
    duration: new Histogram({
      name: 'trailhead_api_request_duration_seconds',
      help: 'Time to answer, by route pattern',
      labelNames: ['method', 'route'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [registry],
    }),
  }
}

// On its own port (9464), so the public route never reaches it: the chart
// exposes 8080 to the gateway and 9464 only to Prometheus.
export function metricsServer(metrics: Metrics): Server {
  return createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/metrics') {
      metrics.registry
        .metrics()
        .then((body) => {
          response.writeHead(200, { 'content-type': metrics.registry.contentType })
          response.end(body)
        })
        .catch((error: unknown) => {
          response.writeHead(500, { 'content-type': 'text/plain' })
          response.end(`metrics failed: ${String(error)}\n`)
        })
      return
    }
    response.writeHead(404, { 'content-type': 'text/plain' })
    response.end('not found\n')
  })
}
