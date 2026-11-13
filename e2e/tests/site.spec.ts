import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { type Page, expect, test } from '@playwright/test'

type Content = { places: { slug: string }[]; milestones: { place: string; slug: string; title: string }[]; projects: { slug: string; name: string }[] }
// The data file both pages were written from (`npm run content` builds it).
const content = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'content', 'dist', 'content.json'), 'utf8')) as Content

// Every console error and failed request on a page fails its test.
function watch(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (message) => {
    // The suite reaches nginx over plain HTTP on a container hostname, where
    // Chrome ignores the Cross-Origin-Opener-Policy header and says so. The
    // site itself is served over HTTPS.
    if (message.type() === 'error' && !message.text().startsWith('The Cross-Origin-Opener-Policy header has been ignored')) {
      problems.push(`console: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => problems.push(`page: ${error.message}`))
  page.on('requestfailed', (request) => problems.push(`request: ${request.url()}`))
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push(`${response.status()}: ${response.url()}`)
  })
  return problems
}

const axe = (page: Page) => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()

test('the home page shows the intro and the signs, then draws the world', async ({ page }) => {
  const problems = watch(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('TJ Zimmerman')
  await expect(page.getByText('is a principal platform engineer based out of Seattle, WA.')).toBeVisible()
  const signs = page.locator('.signs a')
  await expect(signs).toHaveCount(3)
  await expect(signs.first()).toHaveAttribute('href', '/page/#about-lake')
  await expect(page.locator('#world[data-ready="true"] canvas')).toBeVisible()
  expect(problems).toEqual([])
})

test('a sign leads to its place on the plain page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Climb The Stack to learn more about his skills' }).click()
  await expect(page).toHaveURL(/\/page\/#the-stack$/)
  await expect(page.getByRole('heading', { level: 2, name: 'The Stack' })).toBeInViewport()
})

test('the plain page holds every milestone and project, with no script needed', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/page/')
  for (const m of content.milestones) await expect(page.locator(`#${m.place}-${m.slug} h3`)).toHaveText(m.title)
  for (const p of content.projects) await expect(page.locator(`#sideproject-spires-${p.slug} h3`)).toHaveText(p.name)
  await context.close()
})

test('the plain page is set in National Park', async ({ page }) => {
  await page.goto('/page/')
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.fonts.check('1rem "National Park"'))).toBe(true)
  expect(await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/^"?National Park"?/)
})

for (const path of ['/', '/page/']) {
  test(`${path} passes axe at WCAG AA`, async ({ page }) => {
    const problems = watch(page)
    await page.goto(path)
    expect((await axe(page)).violations).toEqual([])
    expect(problems).toEqual([])
  })

  test(`${path} passes axe at phone width`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto(path)
    expect((await axe(page)).violations).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  })
}

test('every response carries the security headers, a 404 included', async ({ request }) => {
  for (const path of ['/', '/page/', '/healthz', '/version.json', '/no-such-place']) {
    const response = await request.get(path)
    const headers = response.headers()
    expect(headers['content-security-policy'], path).toContain("default-src 'none'")
    expect(headers['x-content-type-options'], path).toBe('nosniff')
    expect(headers['x-frame-options'], path).toBe('DENY')
  }
  expect((await request.get('/no-such-place')).status()).toBe(404)
})
