import { existsSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { type Page, expect, test } from '@playwright/test'

const www = join(import.meta.dirname, '..', '..', 'prototype', 'pixel', 'www')
// localhost, because only there does the page warn that ground.png is older
// than the map it was baked from. That warning fails a test like any other.
const origin = 'http://localhost:8080'

type Info = { p: number; route: string | null; scene: string }
declare global {
  interface Window {
    __ready?: boolean
    __info?: Info
  }
}

// Opens an address of the game and returns everything the page complained
// about: a thrown error, a console error or warning, a file that isn't there.
async function open(page: Page, address: string): Promise<string[]> {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') problems.push(`console ${message.type()}: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`page: ${error.message}`))
  await page.route(`${origin}/**`, (route) => {
    const { pathname } = new URL(route.request().url())
    const file = join(www, normalize(pathname === '/' ? '/index.html' : pathname))
    if (existsSync(file)) return route.fulfill({ path: file })
    problems.push(`missing: ${pathname}`)
    return route.fulfill({ status: 404 })
  })
  // The fonts come from Google today. The game must stand without them, and
  // a test must not fail because their host was slow.
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.fulfill({ contentType: 'text/css', body: '' }))
  await page.goto(origin + address)
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30_000 })
  return problems
}

const info = (page: Page) => page.evaluate(() => window.__info)

// Puts him at a point along the route the way a visitor does: a click on the timeline.
async function scrub(page: Page, p: number) {
  const box = await page.locator('#line').boundingBox()
  if (!box) throw new Error('the timeline is not on the page')
  await page.mouse.click(box.x + box.width * p, box.y + box.height / 2)
  await expect.poll(async () => Math.abs(((await info(page))?.p ?? -1) - p), { timeout: 15_000 }).toBeLessThan(0.03)
}

// A second of frames, so a scene that throws while it draws is caught.
const watch = (page: Page) => page.waitForTimeout(1000)

test('the Trailhead draws the map', async ({ page }) => {
  const problems = await open(page, '/')
  await watch(page)
  expect((await info(page))?.scene).toBe('world')
  expect(problems).toEqual([])
})

for (const route of ['lake', 'stack', 'spires']) {
  for (const p of [0.05, 0.5, 0.95]) {
    test(`the ${route} route draws at ${p * 100}% of the way`, async ({ page }) => {
      const problems = await open(page, `/?route=${route}`)
      await scrub(page, p)
      await watch(page)
      expect((await info(page))?.route).toBe(route)
      expect(problems).toEqual([])
    })
  }
}

test('a spire of its own draws half way up', async ({ page }) => {
  const problems = await open(page, '/?route=spire:bluebird')
  await scrub(page, 0.5)
  await watch(page)
  expect((await info(page))?.route).toBe('spire:bluebird')
  expect(problems).toEqual([])
})

test('the trail register opens from its address', async ({ page }) => {
  const problems = await open(page, '/#register')
  await watch(page)
  await expect(page.locator('#book')).toBeVisible()
  expect(problems).toEqual([])
})

test('the plain page shows the picture of the map', async ({ page }) => {
  const problems = await open(page, '/#plain')
  await watch(page)
  await expect(page.locator('#plain canvas[role="img"]')).toBeVisible()
  expect(problems).toEqual([])
})

test('an address that is off route still draws', async ({ page }) => {
  const problems = await open(page, '/#no-such-trail')
  await watch(page)
  expect((await info(page))?.route).toBe('off-route')
  expect(problems).toEqual([])
})
