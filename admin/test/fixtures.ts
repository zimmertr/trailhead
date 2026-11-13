import { captureLogger } from '../../common/test/fixtures.ts'
import { type AdminDeps, buildAdmin } from '../src/app.ts'

export const databaseDown = (): Error => Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })

export function admin(overrides: Partial<AdminDeps> = {}) {
  const { logger, lines } = captureLogger('admin')
  const app = buildAdmin({ ping: async () => {}, build: { version: '0.1.0', commit: 'abc1234' }, logger, licenses: 'fastify 5.12.8\nMIT\n', ...overrides })
  return { app, lines }
}
