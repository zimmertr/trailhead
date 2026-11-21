import { defineConfig } from '@playwright/test'

// The browser suite runs against a built web image (`make browser`), never a
// dev server, so it checks what ships: nginx's headers and policy included.
export default defineConfig({
  testDir: 'tests',
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
    },
  ],
})
