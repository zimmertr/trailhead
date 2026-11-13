// Every setting arrives in the environment (12-factor). These read one
// variable each and fail at start-up with the variable's name, never later.

export type Env = Record<string, string | undefined>

export class ConfigError extends Error {}

export function required(env: Env, name: string): string {
  const value = env[name]
  if (value === undefined || value.trim() === '') throw new ConfigError(`${name} is required`)
  return value
}

export function optional(env: Env, name: string): string | undefined {
  const value = env[name]
  return value === undefined || value.trim() === '' ? undefined : value
}

export function port(env: Env, name: string, fallback: number): number {
  const raw = optional(env, name)
  if (raw === undefined) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1 || value > 65535) throw new ConfigError(`${name} must be a port number, 1 to 65535`)
  return value
}

const LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']

export function logLevel(env: Env): string {
  const value = optional(env, 'LOG_LEVEL')?.toLowerCase() ?? 'info'
  if (!LEVELS.includes(value)) throw new ConfigError(`LOG_LEVEL must be one of ${LEVELS.join(', ')}`)
  return value
}

// Baked into each image at build time by the release (APP_VERSION and
// APP_COMMIT build arguments). A local build says `dev`.
export type BuildInfo = { version: string; commit: string }

export function buildInfo(env: Env): BuildInfo {
  return { version: optional(env, 'APP_VERSION') ?? 'dev', commit: optional(env, 'APP_COMMIT') ?? 'dev' }
}
