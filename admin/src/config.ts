import { type BuildInfo, type Env, buildInfo, logLevel, port, required } from '@trailhead/common'

export type AdminConfig = { port: number; databaseUrl: string; logLevel: string; build: BuildInfo }

// docs/CONFIGURATION.md lists each of these and where it's set.
export function loadConfig(env: Env): AdminConfig {
  return { port: port(env, 'PORT', 8080), databaseUrl: required(env, 'DATABASE_URL'), logLevel: logLevel(env), build: buildInfo(env) }
}
