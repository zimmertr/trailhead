import { defineConfig } from 'vitest/config'

// The database suite (`make test-db`): every `*.db.test.ts`, against a
// throwaway Postgres in a container. One file at a time, since the roles they
// set up belong to the whole server.
export default defineConfig({
  test: {
    include: ['*/test/**/*.db.test.ts'],
    setupFiles: ['tests/setup.ts'],
    globalSetup: ['common/test/db-setup.ts'],
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['common/src/migrate.ts', 'common/src/db.ts', 'api/src/store.ts', 'fetcher/src/store.ts'],
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage/db',
    },
  },
})
