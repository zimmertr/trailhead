import { defineConfig } from '@playwright/test'

// The pixel world prototype's own suite (`make prototype-smoke`). It needs no
// image and no server: the spec answers the page's requests from
// prototype/pixel/www, which is exactly what a visitor is served.
export default defineConfig({
  testDir: 'prototype',
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } }],
})
