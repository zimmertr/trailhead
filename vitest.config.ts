import { defineConfig } from 'vitest/config'

// The unit suite: every `*.test.ts` but the database ones, which need the
// Postgres `make test-db` starts (vitest.db.config.ts).
export default defineConfig({
  test: {
    include: ['*/test/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['**/*.db.test.ts', '**/node_modules/**'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      // Line and branch coverage with no floor: the aim is 100%, and a gap
      // gets a test or a reason here (project.md, Tests).
      include: ['*/src/**/*.ts', 'tools/*.ts'],
      exclude: [
        // Composition roots: they read the environment and wire the tested
        // parts together, and run only in the image. The image smoke tests
        // (scripts/smoke/) and `make compose-smoke` start each one.
        '*/src/main.ts',
        'fetcher/src/migrate.ts',
        'content/src/cli.ts',
        'tools/bundle.ts',
        // Talks to Postgres, so the database suite covers it.
        'common/src/migrate.ts',
        'api/src/store.ts',
        'fetcher/src/store.ts',
        // Browser entry points and the WebGL placeholder: they need a page
        // and a GPU, so the browser suite (e2e/) covers them.
        'web/src/home.ts',
        'web/src/page.ts',
        'web/src/world/**',
        // Types only.
        'content/src/schema.ts',
        'content/src/index.ts',
      ],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage/unit',
    },
  },
})
