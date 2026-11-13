import { type Env, logLevel, optional, required } from '@trailhead/common'

export type FetcherConfig = { databaseUrl: string; githubToken: string | undefined; logLevel: string }

// docs/CONFIGURATION.md lists each of these and where it's set. The token is
// optional: without one GitHub allows 60 reads an hour, and a run makes 12.
export function loadConfig(env: Env): FetcherConfig {
  return { databaseUrl: required(env, 'DATABASE_URL'), githubToken: optional(env, 'GITHUB_TOKEN'), logLevel: logLevel(env) }
}
