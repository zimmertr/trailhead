import AxeBuilder from '@axe-core/playwright'
import { type Page, type Route, expect, test } from '@playwright/test'

// The suite runs against the built web image (`make browser`), on localhost, because only there
// does the page warn that ground.png is older than the map it was baked from. That warning fails
// a test like any other.
const origin = process.env.BASE_URL ?? 'http://localhost:8080'

// What the API answers for the projects, as the game reads it. The image has no API beside it in
// the suite, so the page's request is answered here.
const LIVE = { projects: [{ slug: 'bluebird', name: 'Bluebird Forecast', repo: 'zimmertr/bluebird', url: 'https://github.com/zimmertr/bluebird', stars: 4242, language: 'TypeScript', license: 'NOASSERTION', release: { tag: 'v9.9.9', publishedAt: '2026-11-20T00:00:00Z' }, fetchedAt: '2026-11-21T00:00:00Z' }] }

type Info = { p: number; route: string | null; scene: string; baked: boolean; bakeNote: string; o: { x: number; y: number } }
declare global {
  interface Window {
    __ready?: boolean
    __info?: Info
    __api: { hitAt: (act: string) => [number, number] | null; showEvent: (name: string) => number; trigger: (name: string) => boolean; trailAt: (path: string, s: number) => [number, number]; onTrail: () => { i: number; s: number } | null; running: () => boolean }
    __rules?: () => string[]
    __sound: () => boolean
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
  // The page loads nothing from anywhere else (round 5, J3): its fonts are its own files.
  page.on('request', (request) => {
    if (!request.url().startsWith(origin) && !/^(data|blob):/.test(request.url())) problems.push(`elsewhere: ${request.url()}`)
  })
  await page.route(`${origin}/api/v1/projects`, (route) => route.fulfill({ json: LIVE }))
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push(`${response.status()}: ${new URL(response.url()).pathname}`)
  })
  await page.goto(origin + address)
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30_000 })
  return problems
}

const info = (page: Page) => page.evaluate(() => window.__info)

const axe = (page: Page) => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
// Each violation with the elements it was found on, so a red run says where.
const found = (results: Awaited<ReturnType<typeof axe>>) => results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)

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
  const { scene, baked, bakeNote } = (await info(page)) ?? {}
  expect(scene).toBe('world')
  // The map came from ground.png, not from a second of working it out. The note says why when it did not.
  expect({ baked, bakeNote }).toEqual({ baked: true, bakeNote: '' })
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

// The register opens on the box seen from a step back (B01): the book zooms into its pages, Close the book
// zooms back out to the box, and the map on the back wall opens the trail map.
test('the register book opens to its pages and closes back to the box, and its map opens the trail map', async ({ page }) => {
  const problems = await open(page, '/#register')
  const book = page.locator('#book .spot.open')
  await expect(book).toBeVisible({ timeout: 10_000 })
  await book.click()
  await expect(page.locator('#book .page.right')).toBeVisible()
  await page.locator('#book-x').click()
  await expect(page.locator('#book .page')).toHaveCount(0)
  await expect(book).toBeVisible()
  expect(await axe(page).then(found)).toEqual([])
  await page.locator('#book .spot.map').click()
  await expect(page.locator('#sheet')).toBeVisible()
  expect(problems).toEqual([])
})

test('the page shows the picture of the map and every card', async ({ page }) => {
  const problems = await open(page, '/#page')
  await watch(page)
  await expect(page.locator('#plain canvas[role="img"]')).toBeVisible()
  for (const heading of ['Who TJ is', 'A personal note', 'Platform Engineering', 'Bluebird Forecast', 'Kubernetes-Manifests'])
    await expect(page.locator('#plain h4', { hasText: heading })).toBeVisible()
  expect(problems).toEqual([])
})

// A scene's code loads when a route needs it (the art pass): the junction signs time the peak's and the
// Spires' routes from the lengths in pixel.js, and those lengths are the scenes' own once they load.
test('the Trailhead times every route without loading the scenes it does not need yet', async ({ page }) => {
  const loaded: string[] = []
  page.on('request', (request) => loaded.push(new URL(request.url()).pathname))
  const problems = await open(page, '/')
  await expect(page.locator('#signs button[data-route="stack"] small br')).toHaveCount(1)
  await watch(page)
  for (const scene of ['ridge', 'approach', 'larches', 'camp', 'climb']) expect(loaded).not.toContain(`/${scene}.js`)
  type Timer = { __api: { routeTime: (r: string) => Promise<number>; setRoute: (r: string) => Promise<void> } }
  for (const route of ['lake', 'stack', 'spires']) {
    const before = await page.evaluate((r) => (window as unknown as Timer).__api.routeTime(r), route)
    await page.evaluate((r) => (window as unknown as Timer).__api.setRoute(r), route)
    const after = await page.evaluate((r) => (window as unknown as Timer).__api.routeTime(r), route)
    expect(after).toBeCloseTo(before, 0)
  }
  expect(problems).toEqual([])
})

// A visitor who asked for reduced motion: AUTO holds Day even at an hour that would be Dusk (round 5, K1).
// 330 s into the 390 s cycle is Dusk since round 6 (note 32), when the day became three quarters of it.
test('reduced motion holds AUTO at Day', async ({ browser }) => {
  const page = await browser.newPage({ reducedMotion: 'reduce' })
  const problems = await open(page, '/?time=330')
  await watch(page)
  const clock = await page.evaluate(() => (window as unknown as { __api: { clock: () => { mode: string; mix: number } } }).__api.clock())
  expect(clock).toMatchObject({ mode: 'auto', mix: 0 })
  expect(problems).toEqual([])
  await page.close()
})

// The clock's button shows the sky it is now: the sun by day, the moon at Dusk (round 6, note 30).
test('AUTO shows the sun by day and the moon at Dusk', async ({ page }) => {
  const problems = await open(page, '/?time=100')
  await expect(page.locator('#b-dusk .sky')).toHaveClass(/sun/)
  await page.goto(`${origin}/?time=330`)
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30_000 })
  await expect(page.locator('#b-dusk .sky')).toHaveClass(/moon/, { timeout: 10_000 })
  await expect(page.locator('#b-dusk')).toContainText('Auto')
  expect(problems).toEqual([])
})

// One button for the music and the sound (round 6, note 29): the first click turns sound on if the
// browser has not, and after that it opens the menu, where Sound off is.
test('the music button opens its menu, and Sound off turns the sound off', async ({ page }) => {
  const problems = await open(page, '/')
  const button = page.locator('#b-track'), menu = page.locator('#music')
  await button.click()
  if (await menu.isHidden()) await button.click()
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitemradio')).toHaveCount(12)
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await button.click()
  await menu.getByRole('menuitemradio', { name: 'Sound off' }).click()
  await expect(menu).toBeHidden()
  await expect(button).toContainText('Sound off')
  expect(await axe(page).then(found)).toEqual([])
  expect(problems).toEqual([])
})

// The sound plays only while the page is in front (round 8, note 24): it stops when the window loses focus or
// the tab is hidden, and comes back when the visitor does. Sound that was never started stays off.
test('the sound stops while the page is out of sight and comes back with it', async ({ page }) => {
  const problems = await open(page, '/')
  const sound = () => page.evaluate(() => window.__sound())
  const hide = (hidden: boolean) => page.evaluate((h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); document.dispatchEvent(new Event('visibilitychange')) }, hidden)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  expect(await sound()).toBe(false)
  await page.locator('#b-track').click()
  await expect.poll(sound, { timeout: 5_000 }).toBe(true)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect.poll(sound, { timeout: 5_000 }).toBe(false)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect.poll(sound, { timeout: 5_000 }).toBe(true)
  await hide(true)
  await expect.poll(sound, { timeout: 5_000 }).toBe(false)
  await hide(false)
  await expect.poll(sound, { timeout: 5_000 }).toBe(true)
  expect(problems).toEqual([])
})

// The trail conditions and the trail register are one place (round 6, note 23): C opens the board over the
// register box, Escape puts the board away, and the notice on the box's back wall brings it back.
test('C opens the trail conditions over the register, and its notice opens them again', async ({ page }) => {
  const problems = await open(page, '/')
  await page.keyboard.press('KeyC')
  await expect(page.locator('#sheet .board')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#sheet')).toBeHidden()
  const notice = page.locator('#book .notice')
  await expect(notice).toBeVisible({ timeout: 10_000 })
  await notice.click()
  await expect(page.locator('#sheet .board')).toBeVisible()
  await page.waitForTimeout(1000)
  expect(await axe(page).then(found)).toEqual([])
  expect(problems).toEqual([])
})

// A debug start button on the map first moves the view to where its event happens (round 6, note 26), and
// related events share one split button whose arrow lists each (note 27).
test('the debug panel shows a map event where it happens, from a split button', async ({ page }) => {
  const problems = await open(page, '/')
  await page.keyboard.press('Backquote')
  const before = (await info(page))?.o
  const avalanche = page.locator('#debug .split', { hasText: 'Avalanche' })
  await avalanche.locator('.more').click()
  await expect(avalanche.getByRole('menuitem')).toHaveCount(3)
  await avalanche.getByRole('menuitem').first().click()
  await expect.poll(async () => { const o = (await info(page))?.o; return o && before ? Math.hypot(o.x - before.x, o.y - before.y) : 0 }, { timeout: 5_000 }).toBeGreaterThan(100)
  expect(problems).toEqual([])
})

// On a phone the Debug button stays in the top bar and opens its panel (round 8, note 23). The bar's planks
// all fit across the screen at the widths phones come in.
for (const width of [390, 360, 320]) {
  test(`a phone ${width} wide keeps the Debug button, and it opens the panel`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 })
    const problems = await open(page, '/')
    for (const id of ['b-map', 'b-track', 'b-dusk', 'b-debug', 'b-page']) {
      const box = await page.locator(`#${id}`).boundingBox()
      expect(box, id).not.toBeNull()
      expect(box!.x, id).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width, id).toBeLessThanOrEqual(width)
    }
    await expect(page.locator('#b-help')).toBeHidden()
    await page.locator('#b-debug').click()
    await expect(page.locator('#debug')).toBeVisible()
    expect(problems).toEqual([])
  })
}

// Round 4's address for it, which links may still carry.
test('every start button with a place on the map moves the view there and keeps it on the map', async ({ page }) => {
  const problems = await open(page, '/')
  for (const name of ['tumble', 'devil', 'avalanche', 'serac', 'lens']) {
    await page.evaluate((n) => window.__api.showEvent(n), name)
    await page.waitForTimeout(400)
    const o = (await info(page))?.o
    expect(Number.isFinite(o?.x) && Number.isFinite(o?.y), `the view after showing ${name}`).toBe(true)
  }
  expect(problems).toEqual([])
})

test('the animals on the map and in the forest answer a click without counting as a find', async ({ page }) => {
  const problems = await open(page, '/?route=lake&p=0.31')
  const finds = () => page.evaluate(() => JSON.stringify(localStorage))
  const before = await finds()
  for (const act of ['elk', 'owl', 'slug']) {
    await expect.poll(() => page.evaluate((a) => window.__api.hitAt(a), act), { timeout: 10_000 }).not.toBeNull()
    const at = await page.evaluate((a) => window.__api.hitAt(a), act)
    if (!at) throw new Error(`nothing in the forest answers to ${act}`)
    await page.mouse.click(at[0], at[1])
  }
  await page.goto(new URL('/', page.url()).href)
  await page.locator('#fork-x').click()
  await expect.poll(() => page.evaluate(() => window.__api.hitAt('animal:')), { timeout: 15_000 }).not.toBeNull()
  const at = await page.evaluate(() => window.__api.hitAt('animal:'))
  if (!at) throw new Error('no animal on the map answers a click')
  await page.mouse.click(at[0], at[1])
  await page.waitForTimeout(500)
  expect(await finds()).toBe(before)
  expect(problems).toEqual([])
})

test('the marine layer can be started from inside the forest, where it rains', async ({ page }) => {
  const problems = await open(page, '/?route=lake&p=0.31')
  await expect.poll(() => page.evaluate(() => window.__api.hitAt('elk')), { timeout: 10_000 }).not.toBeNull()
  // Once the scene has come in (no button works while one scene gives way to the next).
  await expect.poll(() => page.evaluate(() => window.__api.trigger('shower')), { timeout: 5_000 }).toBe(true)
  await page.waitForTimeout(1500)
  expect(problems).toEqual([])
})

test('Glissade to camp sets off at once from inside the binoculars', async ({ page }) => {
  const problems = await open(page, '/#sideproject-spires/trailhead')
  await expect(page.locator('#card-go')).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.__api.hitAt('egg')), { timeout: 15_000 }).not.toBeNull()
  const spot = await page.evaluate(() => window.__api.hitAt('egg'))
  if (!spot) throw new Error('the binoculars are not on the page')
  await page.mouse.click(spot[0], spot[1])
  // The view is up once only its BACK button answers a click.
  await expect.poll(() => page.evaluate(() => window.__api.hitAt('back')), { timeout: 5_000 }).not.toBeNull()
  const before = (await info(page))?.p ?? 0
  await page.locator('#card-go').click()
  await expect.poll(async () => ((await info(page))?.p ?? 0) - before, { timeout: 1_500 }).toBeGreaterThan(0.01)
  expect(problems).toEqual([])
})

// Round 6, G2 (TJ): on the way toward Sideproject Spires, stopped part way and sent on to the Spires again,
// he carries on up the Spires' trail. He used to turn round and walk back toward the Trailhead first. Two
// ways of stopping: walking to a point on the trail and standing there, and the Stop button on the way.
const SPIRES = 3
async function sentOn(page: Page) {
  const at = await page.evaluate(() => window.__api.onTrail())
  if (!at || at.i !== SPIRES) throw new Error(`not stopped on the Spires' trail: ${JSON.stringify(at)}`)
  await page.locator('#names button', { hasText: 'Sideproject Spires' }).click()
  // For two seconds he never goes back toward the Trailhead, and by the end he has gone on up the trail.
  let last = at
  for (let k = 0; k < 20; k++) {
    await page.waitForTimeout(100)
    const now = await page.evaluate(() => window.__api.onTrail())
    if (!now) break
    expect(now.i, 'still on the Spires\' trail').toBe(SPIRES)
    expect(now.s, 'never back toward the Trailhead').toBeGreaterThanOrEqual(at.s - 0.002)
    last = now
  }
  expect(last.s - at.s, 'gone on up the trail').toBeGreaterThan(0.005)
}

test('stopped at a point on the way to the Spires, he carries on to them', async ({ page }) => {
  const problems = await open(page, '/')
  if (await page.locator('#fork').isVisible()) await page.locator('#fork-x').click()
  // A point a little way up the trail, clear of the kiosk and well inside the window.
  const size = page.viewportSize() ?? { width: 1280, height: 720 }
  let spot: [number, number] | null = null
  for (let k = 30; k >= 12 && !spot; k--) { const q = await page.evaluate((f) => window.__api.trailAt('spires', f), k / 100); if (q[0] > 80 && q[0] < size.width - 80 && q[1] > 100 && q[1] < size.height - 140) spot = q }
  if (!spot) throw new Error('no point of the Spires\' trail is in the window')
  await page.mouse.click(spot[0], spot[1])
  await expect.poll(() => page.evaluate(() => window.__api.running()), { timeout: 2_000 }).toBe(true)
  await expect.poll(() => page.evaluate(() => window.__api.running()), { timeout: 20_000 }).toBe(false)
  await sentOn(page)
  expect(problems).toEqual([])
})

test('stopped with the Stop button on the way to the Spires, he carries on to them', async ({ page }) => {
  const problems = await open(page, '/')
  if (await page.locator('#fork').isVisible()) await page.locator('#fork-x').click()
  await page.locator('#names button', { hasText: 'Sideproject Spires' }).click()
  await expect.poll(async () => (await page.evaluate(() => window.__api.onTrail()))?.s ?? 0, { timeout: 10_000 }).toBeGreaterThan(0.03)
  await page.locator('#run').click()
  await expect.poll(() => page.evaluate(() => window.__api.running()), { timeout: 2_000 }).toBe(false)
  await sentOn(page)
  expect(problems).toEqual([])
})

test('the old address still opens the page', async ({ page }) => {
  const problems = await open(page, '/#plain')
  await expect(page.locator('#plain')).toBeVisible()
  expect(problems).toEqual([])
})

test('the Page button opens it by keyboard and Escape closes it', async ({ page }) => {
  const problems = await open(page, '/')
  await page.locator('#b-page').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#plain')).toBeVisible()
  await expect(page.locator('#plain .band button')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('#plain')).toBeHidden()
  await expect(page.locator('#b-page')).toBeFocused()
  expect(problems).toEqual([])
})

test('a project card shows the stars and release the API answers', async ({ page }) => {
  const problems = await open(page, '/#sideproject-spires/bluebird')
  await expect(page.locator('#card-facts')).toContainText('4242')
  await expect(page.locator('#card-facts')).toContainText('v9.9.9')
  expect(problems).toEqual([])
})

// When the API is down, the card keeps the numbers baked into the game (Bluebird Forecast's release in
// content/game/sideproject-spires.yaml) and nothing throws (round 6, K4). The browser's own line about a
// request that failed is expected here, so only thrown errors are collected.
const DOWN: [string, (route: Route) => Promise<void>][] = [
  ['cannot be reached', (route) => route.abort('connectionrefused')],
  ['answers an error', (route) => route.fulfill({ status: 503, body: 'down' })],
  ['answers something that is not its JSON', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"projects": [{"repo": "zimmertr/bluebird"' })],
]
for (const [how, answer] of DOWN) {
  test(`a project card keeps its own numbers when the API ${how}`, async ({ page }) => {
    const thrown: string[] = []
    page.on('pageerror', (error) => thrown.push(error.message))
    let asked = false
    await page.route(`${origin}/api/v1/projects`, (route) => { asked = true; return answer(route) })
    await page.goto(origin + '/#sideproject-spires/bluebird')
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 30_000 })
    await expect(page.locator('#card-facts')).toContainText('v0.141.8')
    await expect.poll(() => asked, { timeout: 10_000 }).toBe(true)
    await watch(page)
    await expect(page.locator('#card-facts')).toContainText('v0.141.8')
    expect(thrown).toEqual([])
  })
}

test('the world and the page of text pass axe', async ({ page }) => {
  const problems = await open(page, '/')
  await watch(page)
  expect(found(await axe(page))).toEqual([])
  await page.locator('#b-page').click()
  await expect(page.locator('#plain')).toBeVisible()
  expect(found(await axe(page))).toEqual([])
  expect(problems).toEqual([])
})

// The renderer is broken on purpose, so the console error it logs is expected and not collected.
test('a broken world leaves the page of text with a way back to the Trailhead', async ({ page }) => {
  await page.route(`${origin}/api/v1/projects`, (route) => route.fulfill({ json: LIVE }))
  await page.goto(origin + '/?break=renderer')
  const back = page.locator('#plain .band button')
  await expect(back).toBeVisible({ timeout: 30_000 })
  await expect(back).toHaveText('Back to the Trailhead')
  await back.click()
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30_000 })
  expect(new URL(page.url()).search).toBe('')
  await expect(page.locator('#plain')).toBeHidden()
})

// web/ENGINE.md: every plant sways, only rocks, snags, logs, driftwood, sea stacks and ferns stand still,
// every solid thing is known to collide.js, and every animal has two drawings and asks collide.js.
test('the map keeps the engine rules', async ({ page }) => {
  const problems = await open(page, '/')
  expect(await page.evaluate(() => window.__rules?.() ?? ['the map did not report its rules'])).toEqual([])
  expect(problems).toEqual([])
})

test('an address that is off route still draws', async ({ page }) => {
  const problems = await open(page, '/#no-such-trail')
  await watch(page)
  expect((await info(page))?.route).toBe('off-route')
  expect(problems).toEqual([])
})

// The sign on the off-route page names itself, and a click on it takes him back to the Trailhead, as the
// card's button does (TJ, round 6: it answered nothing before).
test('the sign on the off-route page names itself and leads back to the Trailhead', async ({ page }) => {
  const problems = await open(page, '/#no-such-trail')
  await expect.poll(() => page.evaluate(() => window.__api.hitAt('home')), { timeout: 10_000 }).not.toBeNull()
  const at = await page.evaluate(() => window.__api.hitAt('home'))
  if (!at) throw new Error('the sign does not answer')
  await page.mouse.move(at[0], at[1])
  await expect(page.locator('#tip')).toHaveText('Back the way you came')
  await page.mouse.click(at[0], at[1])
  await expect.poll(async () => (await info(page))?.route, { timeout: 10_000 }).toBe('lake')
  await expect.poll(async () => (await info(page))?.scene, { timeout: 10_000 }).toBe('world')
  expect(problems).toEqual([])
})
