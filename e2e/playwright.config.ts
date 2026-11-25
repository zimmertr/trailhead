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
  // The game in the three engines visitors use: Chrome and Edge (Chromium), Firefox, and Safari
  // (WebKit, the engine of every browser on an iPhone). PROJECT picks one, as CI's matrix does.
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
    { name: 'firefox', use: { browserName: 'firefox', viewport: { width: 1440, height: 900 } } },
    { name: 'webkit', use: { browserName: 'webkit', viewport: { width: 1440, height: 900 } } },
  ],
})
