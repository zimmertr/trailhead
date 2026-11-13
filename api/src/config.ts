import { type BuildInfo, type Env, buildInfo, logLevel, optional, port, required } from '@trailhead/common'

export type ApiConfig = {
  port: number
  metricsPort: number
  databaseUrl: string
  logLevel: string
  clientIpHeader: string
  build: BuildInfo
}

// docs/CONFIGURATION.md lists each of these and where it's set.
export function loadConfig(env: Env): ApiConfig {
  return {
    port: port(env, 'PORT', 8080),
    metricsPort: port(env, 'METRICS_PORT', 9464),
    databaseUrl: required(env, 'DATABASE_URL'),
    logLevel: logLevel(env),
    // Cloudflare's header. The gateway strips it from any request that didn't
    // come through Cloudflare (docs/TRAFFIC.md).
    clientIpHeader: (optional(env, 'CLIENT_IP_HEADER') ?? 'cf-connecting-ip').toLowerCase(),
    build: buildInfo(env),
  }
}
