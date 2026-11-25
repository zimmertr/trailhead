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
  for (const scene of ['ridge', 'approach', 'larches', 'camp', 'climb', 'forest', 'lakeside', 'side']) expect(loaded).not.toContain(`/${scene}.js`)
  type Timer = { __api: { routeTime: (r: string) => Promise<number>; setRoute: (r: string) => Promise<void> } }
  for (const route of ['lake', 'stack', 'spires']) {
    const before = await page.evaluate((r) => (window as unknown as Timer).__api.routeTime(r), route)
    await page.evaluate((r) => (window as unknown as Timer).__api.setRoute(r), route)
    const after = await page.evaluate((r) => (window as unknown as Timer).__api.routeTime(r), route)
    expect(after).toBeCloseTo(before, 0)
  }
  expect(problems).toEqual([])
})

// The lake's two scenes stand in on the timeline until he sets off (round 8, A6). What stands in for each
// (its length, stops, sounds and heights, the table LATER in pixel.js) is the scene's own once it has loaded,
// and it loads when he starts to run, well before he reaches it.
test('the lake\'s scenes stand in on the timeline until he sets off, and match once they load', async ({ page }) => {
  const loaded: string[] = []
  page.on('request', (request) => loaded.push(new URL(request.url()).pathname))
  const problems = await open(page, '/')
  type Facts = { later: boolean; dur: number; stops: { id: string; at: number }[]; cues: { name: string; at: number }[]; elev: number[] }
  type Teller = { __api: { facts: (n: string) => Facts; jumpTo: (n: string) => Promise<boolean>; setRoute: (r: string) => Promise<void> } }
  const facts = (n: string) => page.evaluate((name) => (window as unknown as Teller).__api.facts(name), n)
  const before = { forest: await facts('forest'), lakeside: await facts('lakeside') }
  expect(before.forest.later).toBe(true)
  expect(before.lakeside.later).toBe(true)
  await page.locator('#run').click()
  await expect.poll(() => loaded.includes('/forest.js') && loaded.includes('/lakeside.js'), { timeout: 5_000 }).toBe(true)
  await expect.poll(async () => (await facts('lakeside')).later, { timeout: 10_000 }).toBe(false)
  for (const name of ['forest', 'lakeside'] as const) {
    const now = await facts(name), was = before[name]
    expect(now.later, name).toBe(false)
    expect(now.dur, name).toBeCloseTo(was.dur, 1)
    expect(now.stops.map((x) => x.id), name).toEqual(was.stops.map((x) => x.id))
    now.stops.forEach((x, i) => expect(x.at, `${name} ${x.id}`).toBeCloseTo(was.stops[i]!.at, 3))
    expect(now.cues.map((x) => x.name), name).toEqual(was.cues.map((x) => x.name))
    now.cues.forEach((x, i) => expect(x.at, `${name} ${x.name}`).toBeCloseTo(was.cues[i]!.at, 3))
    now.elev.forEach((h, i) => expect(Math.abs(h - was.elev[i]!), `${name} height ${i}`).toBeLessThan(0.1))
  }
  expect(problems).toEqual([])
})

// A stop inside a scene that has not loaded opens from its address all the same: the scene is fetched first.
test('an address inside the lake\'s scenes opens before they have loaded', async ({ page }) => {
  const problems = await open(page, '/#reflection-lake/who')
  await expect.poll(async () => (await info(page))?.scene, { timeout: 15_000 }).toBe('forest')
  await expect(page.locator('#card')).toBeVisible()
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
  await expect(menu.getByRole('menuitemradio')).toHaveCount(15)
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await button.click()
  await menu.getByRole('menuitemradio', { name: 'Sound off' }).click()
  await expect(menu).toBeHidden()
  await expect(button).toContainText('Sound off')
  expect(await axe(page).then(found)).toEqual([])
  expect(problems).toEqual([])
})

// Round 8, F1: the register's box and the conditions board beside it are one thing to click on the map. Either
// end of it carries the register's name and opens the register's scene, where the notebook, the conditions
// and the map open from.
test('the register and the conditions board are one click target that opens the register', async ({ page }) => {
  const problems = await open(page, '/')
  await page.locator('#fork-x').click()
  await expect.poll(() => page.evaluate(() => window.__api.hitAt('register')), { timeout: 15_000 }).not.toBeNull()
  expect(await page.evaluate(() => window.__api.hitAt('kiosk'))).toBeNull()
  const [x, y] = (await page.evaluate(() => window.__api.hitAt('register'))) as [number, number]
  const scale = await page.evaluate(() => (window.__info as unknown as { S: number }).S / (window.devicePixelRatio || 1))
  // Its left end is the register's box, its right end the board: 44 map pixels across.
  for (const dx of [3, 40]) {
    await page.mouse.move(x + dx * scale, y + 12 * scale)
    await expect(page.locator('#tip')).toHaveText('Trail register')
  }
  await page.mouse.click(x + 40 * scale, y + 12 * scale)
  await expect(page.locator('#book')).toBeVisible({ timeout: 15_000 })
  for (const part of ['.spot.open', '.spot.map', '.notice']) await expect(page.locator('#book ' + part)).toBeVisible()
  expect(problems).toEqual([])
})

// Round 8, C10: the places TJ named stand on the map as signs, and the trail map's legend lists every sign's
// name, so the five new names are there and the woods' old name is gone.
test('the trail map lists the places named in round 8', async ({ page }) => {
  const problems = await open(page, '/')
  await page.locator('#b-map').click()
  const sheet = page.locator('#sheet')
  await expect(sheet).toBeVisible()
  for (const name of ['Git Blame Grove', 'Rolling Release Hills', 'Wildcard Meadow', 'Old Growth Backlog', 'Feature Creep Lake']) await expect(sheet).toContainText(name)
  await expect(sheet).not.toContainText('Monorepo Woods')
  expect(problems).toEqual([])
})

// Round 8, H1: life by the hour. What an animal does leans on the part of the day, by one table in the
// animals' own system: at Dusk the elk go down to the water and the marmots go to ground, and with the
// morning they are back.
test('the animals live by the hour: the herd goes to water at Dusk and the marmots go to ground', async ({ page }) => {
  const problems = await open(page, '/?homes=0')
  type Beast = { critter: string; x: number; y: number; hx: number; hy: number; gone?: boolean; away?: unknown; homing?: boolean }
  type Hours = { __crit: { items: Beast[] }; __api: { clock: () => { hour: string }; setClock: (c: { t: number }) => void } }
  const state = () => page.evaluate(() => {
    const w = window as unknown as Hours, elk = w.__crit.items.filter((a) => a.critter === 'elk'), marmots = w.__crit.items.filter((a) => a.critter === 'marmot')
    return { hour: w.__api.clock().hour, away: elk.filter((a) => a.away).length, there: elk.filter((a) => !a.homing && Math.hypot(a.x - a.hx, a.y - a.hy) < 45).length, elk: elk.length, home: elk.slice(0, 1).flatMap((a) => [a.hx, a.hy]), gone: marmots.filter((a) => a.gone).length, marmots: marmots.length }
  })
  const day = await state()
  expect(day.hour).toBe('morning')
  expect(day.away).toBe(0)
  expect(day.elk).toBeGreaterThan(1)
  expect(day.marmots).toBeGreaterThan(0)
  // Dusk: the herd's home moves to a bank, most of the herd has a place there and walks to it, and every marmot goes down.
  await page.evaluate(() => (window as unknown as Hours).__api.setClock({ t: 312 }))
  await expect.poll(async () => (await state()).hour, { timeout: 10_000 }).toBe('dusk')
  const dusk = await state()
  expect(dusk.away).toBeGreaterThan(dusk.elk / 2)
  expect(dusk.home).not.toEqual(day.home)
  await expect.poll(async () => { const s = await state(); return s.there === s.elk && s.gone === s.marmots }, { timeout: 60_000 }).toBe(true)
  // Morning: the home is the day's again, the herd walks back and the marmots are up.
  await page.evaluate(() => (window as unknown as Hours).__api.setClock({ t: 2 }))
  await expect.poll(async () => (await state()).hour, { timeout: 10_000 }).toBe('morning')
  await expect.poll(async () => { const s = await state(); return s.away === 0 && s.there === s.elk && s.gone === 0 && s.home[0] === day.home[0] && s.home[1] === day.home[1] }, { timeout: 60_000 }).toBe(true)
  expect(problems).toEqual([])
})

// Round 8, F2: the conditions board sorts what lives and happens here in two lists. Observed holds what has
// been on the screen this visit and Reported the rest, so each thing is in one of them and never in both.
test('the conditions board lists what has been seen as Observed and the rest as Reported', async ({ page }) => {
  const problems = await open(page, '/')
  type Seer = { __api: { saw: () => Set<string> } }
  const saw = (name: string) => page.evaluate((n) => (window as unknown as Seer).__api.saw().has(n), name)
  // The two cats live at the kiosk, in the first view. The forest's owl is a scene away, and the cap cloud
  // that forms on Mount Monolith in the first seconds is across the map until the view goes there.
  await expect.poll(() => saw('cats'), { timeout: 15_000 }).toBe(true)
  expect(await saw('lens')).toBe(false)
  expect(await saw('owl')).toBe(false)
  await page.evaluate(() => window.__api.showEvent('lens'))
  await expect.poll(() => saw('lens'), { timeout: 20_000 }).toBe(true)
  await page.evaluate(() => { location.hash = 'kiosk' })
  const seen = page.locator('#sheet .board .seen'), told = page.locator('#sheet .board .told')
  await expect(seen.locator('dt')).toHaveText('Observed')
  await expect(told.locator('dt')).toHaveText('Reported')
  await expect(seen.locator('li').filter({ hasText: 'Two cats at this kiosk' })).toHaveCount(1)
  await expect(seen.locator('li').filter({ hasText: /cap cloud/i })).toHaveCount(1)
  await expect(told.locator('li').filter({ hasText: /cap cloud/i })).toHaveCount(0)
  await expect(told.locator('li').filter({ hasText: 'An owl in the forest' })).toHaveCount(1)
  await expect(seen.locator('li').filter({ hasText: /owl/i })).toHaveCount(0)
  expect(problems).toEqual([])
})

// Round 8, E2: life at every place. Each of the twelve events TJ picked for the Spires, the Peak, Reflection
// Lake and the rainforest has a start button in the debug panel, happens where the view is sent, and counts
// as seen for the conditions board.
test('the events at the Spires, the Peak, the lake and the rainforest start from the debug panel', async ({ page }) => {
  const problems = await open(page, '/')
  type Life = { __api: { saw: () => Set<string>, trigger: (id: string) => boolean, showEvent: (id: string) => number } }
  const saw = (name: string) => page.evaluate((n) => (window as unknown as Life).__api.saw().has(n), name)
  const start = (name: string) => page.evaluate((n) => { const a = (window as unknown as Life).__api; a.showEvent(n); return a.trigger(n) }, name)
  await expect.poll(() => saw('cats'), { timeout: 15_000 }).toBe(true)
  // By Day ten of them can happen. The alpenglow and the owl's call wait for Dusk, and their buttons say no.
  for (const id of ['rockfall', 'calve', 'pair', 'talus', 'band', 'calm', 'ducks', 'treefall', 'rainbow']) expect(await start(id), id).toBe(true)
  for (const id of ['alpenglow', 'hoot']) expect(await start(id), id).toBe(false)
  expect(await saw('sunbreak')).toBe(false)
  expect(await start('sunbreak')).toBe(true)
  await expect.poll(() => saw('sunbreak'), { timeout: 20_000 }).toBe(true)
  // One button for each place, its events in the list under it.
  await page.locator('#b-debug').click()
  for (const place of ['Sideproject Spires', 'Proficiency Peak', 'Reflection Lake', 'Rainforest']) await expect(page.locator('#debug .split-row .plank').filter({ hasText: place })).toHaveCount(1)
  for (const name of ['Rockfall off a tower', 'Glacier calves', 'Ravens ride the updraft', 'Alpenglow (Dusk)', 'Rocks down the talus', 'Goats cross the talus', 'Dead calm', 'Ducks land', 'Tree falls', 'Rainbow (Day)', 'Owl calls (Dusk)', 'Sunbreak (Day)']) await expect(page.locator('#debug .split-list .plank').filter({ hasText: name })).toHaveCount(1)
  await page.evaluate(() => { location.hash = 'kiosk' })
  const seen = page.locator('#sheet .board .seen'), told = page.locator('#sheet .board .told')
  await expect(seen.locator('li').filter({ hasText: /sunbreak/i })).toHaveCount(1)
  await expect(told.locator('li').filter({ hasText: /sunbreak/i })).toHaveCount(0)
  await expect(told.locator('li').filter({ hasText: /an owl calling in the rainforest/i })).toHaveCount(1)
  expect(problems).toEqual([])
})

// Round 8, E3: three more sets of instruments, each picked from the music menu and each playing the tune.
test('the three new sets of instruments can be picked and play', async ({ page }) => {
  const problems = await open(page, '/')
  const button = page.locator('#b-track'), menu = page.locator('#music')
  for (const name of ['Mallets', 'Quartet', 'Winds']) {
    await button.click()
    if (await menu.isHidden()) await button.click()
    await menu.getByRole('menuitemradio', { name, exact: true }).click()
    await expect(menu).toBeHidden()
    // Long enough for the scheduler to have played a bar of it through the set's voices.
    await page.waitForTimeout(1500)
    expect(await page.evaluate(() => window.__sound()), name).toBe(true)
    await button.click()
    await expect(menu.getByRole('menuitemradio', { name, exact: true })).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('Escape')
  }
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

// Round 8, E1: every side scene shows the world's weather, and the debug panel's weather buttons work in each.
test('every side scene shows the weather and takes the weather buttons', async ({ page }) => {
  type Sky = { __sky?: Record<string, unknown> | undefined; __api: { scene: () => string; trigger: (name: string) => boolean; jumpTo: (n: string) => Promise<boolean> } }
  const problems = await open(page, '/')
  for (const scene of ['lakeside', 'larches', 'wall', 'approach', 'camp', 'climb']) {
    await page.evaluate((n) => (window as unknown as Sky).__api.jumpTo(n), scene)
    await expect.poll(() => page.evaluate(() => (window as unknown as Sky).__api.scene()), { timeout: 15_000 }).toBe(scene)
    // Once the scene has come in (no button works while one scene gives way to the next).
    await expect.poll(() => page.evaluate(() => (window as unknown as Sky).__api.trigger('gustnow')), { timeout: 5_000 }).toBe(true)
    for (const name of ['shower', 'squall', 'shade', 'clear']) expect(await page.evaluate((n) => (window as unknown as Sky).__api.trigger(n), name), `${name} in ${scene}`).toBe(true)
    // Everything at once, at full strength: rain, fog, snow, the banner, a gust and a cloud's shadow.
    await page.evaluate(() => { (window as unknown as Sky).__sky = { rain: 1, deck: 1, fog: 1, snow: 1, banner: 1, gust: () => [1.2, 7, 1], shade: () => 0 } })
    await page.waitForTimeout(400)
    await page.evaluate(() => { (window as unknown as Sky).__sky = undefined })
  }
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

test('every home a map animal can take keeps the engine rules', async ({ page }) => {
  // homes=0 puts every animal on its first home; the debug panel's spawn list then names every home there is.
  type Homes = { __api: { spawnList: () => { kind: string; homes: string[] }[]; spawn: (kind: string, i: number) => boolean } }
  const problems = await open(page, '/?homes=0')
  const kinds = await page.evaluate(() => (window as unknown as Homes).__api.spawnList().map((k): [string, number] => [k.kind, k.homes.length]))
  expect(kinds.length).toBeGreaterThanOrEqual(9)
  for (const [kind, n] of kinds) {
    expect(n, `the homes of ${kind}`).toBeGreaterThanOrEqual(3)
    for (let i = 0; i < n; i++) {
      expect(await page.evaluate(([k, j]) => (window as unknown as Homes).__api.spawn(k as string, j as number), [kind, i]), `${kind} to home ${i}`).toBe(true)
      await page.waitForTimeout(100)
      expect(await page.evaluate(() => window.__rules?.()), `${kind} at home ${i}`).toEqual([])
    }
  }
  expect(problems).toEqual([])
})

// Round 8, D2: every animal of the map has five things to do, and a click steps through them in order.
test('every map animal has five things to do and keeps the engine rules through them', async ({ page }) => {
  type Animal = { critter: string; walker?: boolean; does?: string[]; x: number; y: number }
  type Crit = { __crit: { items: Animal[]; click: (id: string, x: number, y: number, t: number) => unknown }; __api: { now: () => number } }
  for (const homes of [0, 5]) {
    const problems = await open(page, `/?homes=${homes}`)
    const lists = await page.evaluate(() => (window as unknown as Crit).__crit.items.filter((a) => a.walker).map((a): [string, number] => [a.critter, (a.does ?? []).length]))
    expect(lists.length, `walkers at homes=${homes}`).toBeGreaterThanOrEqual(10)
    for (const [kind, n] of lists) expect(n, `the things a ${kind} does`).toBeGreaterThanOrEqual(5)
    const broken = new Set<string>()
    for (let round = 0; round < 8; round++) {
      await page.evaluate(() => {
        const w = window as unknown as Crit, t = w.__api.now()
        w.__crit.items.forEach((a, i) => w.__crit.click(`animal:${i}`, a.x, a.y - 4, t))
        for (const id of ['whale', 'orca:0', 'orca:1', 'air:osprey', 'air:eagle']) w.__crit.click(id, 0, 0, t)
      })
      for (let k = 0; k < 2; k++) {
        await page.waitForTimeout(300)
        for (const rule of await page.evaluate(() => window.__rules?.() ?? ['the map did not report its rules'])) broken.add(rule)
      }
    }
    expect([...broken], `homes=${homes}`).toEqual([])
    expect(problems).toEqual([])
  }
})

// Round 8, H2: the cubs copy her. They dig beside the sow while she digs, and one after the other tries the
// trunk she has just rubbed.
test('the cubs copy the sow: they dig when she digs and try the trunk she rubbed', async ({ page }) => {
  const problems = await open(page, '/?homes=0&bear=0')
  type Bear = { critter: string; sow?: boolean; roamer?: boolean; cub?: boolean; mum?: Bear; st: string; act?: string }
  type Den = { __crit: { items: Bear[]; doAct: (i: number, name: string, t: number) => boolean }; __api: { now: () => number } }
  const begin = (name: string) => page.evaluate((n) => { const w = window as unknown as Den, i = w.__crit.items.findIndex((a) => a.sow && !a.roamer); return i >= 0 && w.__crit.doAct(i, n, w.__api.now()) }, name)
  const cubs = (st: string) => page.evaluate((s) => (window as unknown as Den).__crit.items.filter((a) => a.cub && a.mum && a.mum.sow && !a.mum.roamer && a.st === s).length, st)
  // A cub that is up a trunk when she starts does not come down for it, so she digs until one has joined her.
  await expect.poll(async () => { if ((await cubs('dig')) > 0) return true; await begin('dig'); return false }, { timeout: 60_000, intervals: [1500] }).toBe(true)
  expect(await page.evaluate(() => window.__rules?.())).toEqual([])
  // She walks to the nearest trunk and rubs. When she is done a cub is up against it.
  await expect.poll(async () => { if ((await cubs('lean')) > 0) return true; const sow = await page.evaluate(() => { const s = (window as unknown as Den).__crit.items.find((a) => a.sow && !a.roamer); return s ? s.st + ':' + (s.act ?? '') : '' }); if (sow !== 'walk:rub' && sow !== 'act:rub' && !sow.startsWith('walk')) await begin('rub'); return false }, { timeout: 90_000, intervals: [1000] }).toBe(true)
  expect(await page.evaluate(() => window.__rules?.())).toEqual([])
  expect(problems).toEqual([])
})

// Round 8, H3: one goat lives on the grassy ledge halfway up the larch basin's wall, keeps to it whatever
// it does, and breaks no engine rule there (the ledge is ground a land animal may stand on).
test('a goat lives on the ledge of the larch basin wall and keeps to it', async ({ page }) => {
  const problems = await open(page, '/?homes=0')
  type Billy = { critter: string; x: number; y: number; spots?: [number, number][] }
  type Wall = { __crit: { items: Billy[]; click: (id: string, x: number, y: number, t: number) => unknown }; __api: { now: () => number } }
  const billy = () => page.evaluate(() => {
    const w = window as unknown as Wall, i = w.__crit.items.findIndex((a) => a.spots), a = w.__crit.items[i]
    if (!a || !a.spots) return null
    w.__crit.click(`animal:${i}`, a.x, a.y - 4, w.__api.now())
    return { kind: a.critter, x: a.x, on: a.spots.some(([x, y]) => Math.abs(x - a.x) <= 1 && Math.abs(y - a.y) <= 2), long: a.spots.length }
  })
  const first = await billy()
  expect(first).not.toBeNull()
  expect(first?.kind).toBe('goat')
  expect(first?.long).toBeGreaterThanOrEqual(30)
  // A click steps him through what he does, and one of those is to trot off: along the ledge, never off it.
  const seen = new Set<number>()
  for (let k = 0; k < 12; k++) {
    await page.waitForTimeout(700)
    const now = await billy()
    expect(now?.on, `on the ledge at step ${k}`).toBe(true)
    if (now) seen.add(now.x)
    expect(await page.evaluate(() => window.__rules?.())).toEqual([])
  }
  expect(seen.size, 'places along the ledge he has stood').toBeGreaterThan(1)
  expect(problems).toEqual([])
})

// Round 8, H4: answers and followers. A second bull answers a bugle from off the map and the herd turns to
// listen, and when one orca spyhops the one behind it follows a second later.
test('a far bull answers the bugle and the orca behind follows a spyhop', async ({ page }) => {
  const problems = await open(page, '/?homes=0')
  type Elk = { critter: string; walker?: boolean; does?: string[]; st: string; far?: number; flip?: boolean; faces?: number }
  type Sea = { __crit: { items: Elk[]; doAct: (i: number, name: string, t: number) => boolean; click: (id: string, x: number, y: number, t: number) => unknown; podDoes: () => (string | null)[] }; __api: { now: () => number; showEvent: (id: string) => number; trigger: (id: string) => boolean } }
  expect(await page.evaluate(() => { const w = window as unknown as Sea, i = w.__crit.items.findIndex((a) => a.critter === 'elk' && (a.does ?? []).includes('bugle')); return i >= 0 && w.__crit.doAct(i, 'bugle', w.__api.now()) })).toBe(true)
  // The answer comes three to five seconds after he starts, and the cows that are free look up, all turned one way.
  await expect.poll(() => page.evaluate(() => (window as unknown as Sea).__crit.items.some((a) => a.critter === 'elk' && a.far != null)), { timeout: 12_000 }).toBe(true)
  const heads = await page.evaluate(() => (window as unknown as Sea).__crit.items.filter((a) => a.critter === 'elk' && a.st === 'look').map((a) => (a.faces ?? 1) * (a.flip ? -1 : 1)))
  expect(heads.length).toBeGreaterThan(0)
  expect(new Set(heads).size).toBe(1)
  // The pod comes through. The first orca is clicked until it spyhops, and the second is up a second after it.
  await page.evaluate(() => { const w = window as unknown as Sea; w.__api.showEvent('orcas'); w.__api.trigger('orcas') })
  await expect.poll(() => page.evaluate(() => (window as unknown as Sea).__crit.podDoes().length), { timeout: 30_000 }).toBeGreaterThan(1)
  await expect.poll(async () => page.evaluate(() => { const w = window as unknown as Sea; if (w.__crit.podDoes()[0] === 'spyhop') return true; w.__crit.click('orca:0', 0, 0, w.__api.now()); return w.__crit.podDoes()[0] === 'spyhop' }), { timeout: 20_000, intervals: [400] }).toBe(true)
  await expect.poll(() => page.evaluate(() => (window as unknown as Sea).__crit.podDoes()[1]), { timeout: 4_000, intervals: [100] }).toBe('spyhop')
  expect(problems).toEqual([])
})

// Round 8, H5: ice that moves. The bergs in the glacier's lake and the floes on the upper tarns are things:
// a gust pushes them a little way east, and they never leave their water.
test('the bergs and floes drift with a gust and stay on their water', async ({ page }) => {
  const problems = await open(page, '/?homes=0')
  type Berg = { x: number; y: number; w: number; home: number; floe: boolean; wet: boolean }
  type Ice = { __life: { bergs: () => Berg[] }; __api: { showEvent: (id: string) => number; trigger: (id: string) => boolean } }
  const ice = () => page.evaluate(() => (window as unknown as Ice).__life.bergs())
  const still = await ice()
  expect(still.filter((b) => !b.floe).length).toBeGreaterThanOrEqual(6)
  expect(still.filter((b) => b.floe).length).toBeGreaterThanOrEqual(2)
  expect(still.every((b) => b.wet)).toBe(true)
  // A gust is sent over the lake. Within a few seconds some of the bergs have moved east of where they lie.
  await page.evaluate(() => { const w = window as unknown as Ice; w.__api.showEvent('calve'); w.__api.trigger('gustnow') })
  let moved = 0
  for (let k = 0; k < 20; k++) {
    await page.waitForTimeout(500)
    const now = await ice()
    expect(now.every((b) => b.wet), `every berg on water at step ${k}`).toBe(true)
    moved = Math.max(moved, now.filter((b) => b.x > b.home).length)
  }
  expect(moved).toBeGreaterThan(2)
  expect(problems).toEqual([])
})

test('the homes the dice draw keep the engine rules and leave an animal to click', async ({ page }) => {
  for (const seed of [1, 2, 3, 4]) {
    const problems = await open(page, `/?homes=${seed}`)
    expect(await page.evaluate(() => window.__rules?.() ?? ['the map did not report its rules']), `homes=${seed}`).toEqual([])
    await page.locator('#fork-x').click()
    await expect.poll(() => page.evaluate(() => window.__api.hitAt('animal:')), { timeout: 15_000 }).not.toBeNull()
    expect(problems).toEqual([])
  }
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

// Round 8, H6: rain shows on the map's lake as rings, with no fish jumping, and at the lakeside the boulders
// and the trail are dark while they are wet and dry from the top down.
test('rain rings the lake and no fish jumps, and the lakeside boulders dry from the top down', async ({ page }) => {
  type Wet = { rings: number; fish: boolean; rock: number; crown: number; trail: number }
  type Rain = { __wet: Wet; __sky?: Record<string, unknown> | undefined; __api: { showEvent: (id: string) => number; trigger: (id: string) => boolean; scene: () => string; jumpTo: (n: string) => Promise<boolean> } }
  const wet = () => page.evaluate(() => ({ ...(window as unknown as Rain).__wet }))
  // Half a minute into the marine layer the drizzle is at its hardest, and it carries to Reflection Lake.
  const problems = await open(page, '/?rain=40')
  await page.evaluate(() => (window as unknown as Rain).__api.showEvent('calm'))
  await expect.poll(async () => (await wet()).rings, { timeout: 10_000 }).toBeGreaterThan(0)
  expect((await wet()).fish).toBe(false)
  // The sky clears: no rings, and the fish may jump again.
  await page.evaluate(() => (window as unknown as Rain).__api.trigger('clear'))
  await expect.poll(async () => (await wet()).rings, { timeout: 5_000 }).toBe(0)
  expect((await wet()).fish).toBe(true)
  // At the lakeside, soaked: every boulder is dark to its crown, and the trail is dark.
  await page.evaluate(() => (window as unknown as Rain).__api.jumpTo('lakeside'))
  await expect.poll(() => page.evaluate(() => (window as unknown as Rain).__api.scene()), { timeout: 15_000 }).toBe('lakeside')
  await page.evaluate(() => { (window as unknown as Rain).__sky = { wet: 1, s: 70 } })
  await expect.poll(async () => (await wet()).crown, { timeout: 5_000 }).toBeGreaterThan(0)
  const soaked = await wet()
  expect(soaked.trail).toBeGreaterThan(0)
  // Half dry: the crowns are dry and the feet still dark, and less of the trail is dark.
  await page.evaluate(() => { (window as unknown as Rain).__sky = { wet: 0.4, s: 105 } })
  await expect.poll(async () => (await wet()).crown, { timeout: 5_000 }).toBe(0)
  const half = await wet()
  expect(half.rock).toBeGreaterThan(0)
  expect(half.rock).toBeLessThan(soaked.rock)
  expect(half.trail).toBeLessThan(soaked.trail)
  // Dry again.
  await page.evaluate(() => { (window as unknown as Rain).__sky = { wet: 0, s: 130 } })
  await expect.poll(async () => { const w = await wet(); return w.rock + w.trail }, { timeout: 5_000 }).toBe(0)
  await page.evaluate(() => { (window as unknown as Rain).__sky = undefined })
  expect(problems).toEqual([])
})

// Round 8, H7: the beach's driftwood lies in jams at the creek mouths and against the headlands, and the
// sand between them is clean.
test('the driftwood lies in heaps at the creek mouths and headlands, with clean sand between', async ({ page }) => {
  type Jams = { __jams: { spots: [number, number, string, number][]; logs: [number, number][] } }
  const problems = await open(page, '/')
  const { spots, logs } = await page.evaluate(() => (window as unknown as Jams).__jams)
  expect(spots.filter((s) => s[2] === 'mouth').length).toBeGreaterThanOrEqual(2)
  expect(spots.filter((s) => s[2] === 'head').length).toBeGreaterThanOrEqual(1)
  // Ten logs in all (B4), every one of them showing, and two or more in each jam.
  expect(logs.length).toBe(10)
  expect(spots.reduce((n, s) => n + s[3], 0)).toBe(10)
  expect(spots.every((s) => s[3] >= 2)).toBe(true)
  // Every log lies at a jam and beside another log; none lies alone on the open sand.
  for (const [x, y] of logs) {
    expect(Math.min(...spots.map(([a, b]) => Math.hypot(a - x, b - y))), `the log at ${x}, ${y} from its jam`).toBeLessThan(50)
    expect(logs.filter(([a, b]) => Math.hypot(a - x, b - y) < 26).length, `logs round the one at ${x}, ${y}`).toBeGreaterThanOrEqual(2)
  }
  expect(problems).toEqual([])
})

// Round 8, H8: monkeyflower and marsh marigold along the meadow's streams and devil's club along the
// forest's, planted by the rule that plants skunk cabbage: on the bank, two to seven from running water.
test('monkeyflower, marsh marigold and devil\'s club stand on the stream banks', async ({ page }) => {
  type Plants = { __plants: () => [string, number, number, number][] }
  const problems = await open(page, '/')
  const plants = await page.evaluate(() => (window as unknown as Plants).__plants())
  const of = (kind: string) => plants.filter((p) => p[0] === kind)
  expect(of('monkeyflower').length).toBeGreaterThanOrEqual(40)
  expect(of('marigold').length).toBeGreaterThanOrEqual(40)
  expect(of('club').length).toBeGreaterThanOrEqual(20)
  // The skunk cabbage is where it was (C3 and C8).
  expect(of('cabbage').length).toBe(56)
  // Every new plant is on a bank, and no two stand on the same spot.
  for (const [kind, x, y, near] of plants.filter((p) => p[0] !== 'cabbage')) {
    expect(near, `${kind} at ${x}, ${y} from the water`).toBeGreaterThanOrEqual(2)
    expect(near, `${kind} at ${x}, ${y} from the water`).toBeLessThanOrEqual(7)
    expect(plants.filter(([, a, b]) => Math.abs(a - x) < 2 && Math.abs(b - y) < 2).length, `plants at ${x}, ${y}`).toBe(1)
  }
  // Devil's club keeps to the forest in the west, and the two meadow plants to the open ground east of it.
  expect(Math.max(...of('club').map((p) => p[1]))).toBeLessThan(900)
  expect(problems).toEqual([])
})

// Round 8, H9: a tap on a line under Reported closes the board and moves the view to where that thing lives
// or happens, and starts nothing. The board is up in the register's scene, so the tap goes back out to the map first.
test('a tap on a reported line closes the board and moves the view there, without starting anything', async ({ page }) => {
  type Board = { __api: { saw: () => Set<string>; scene: () => string } }
  const problems = await open(page, '/')
  const view = async () => (await info(page))?.o ?? null
  const before = await view()
  await page.evaluate(() => { location.hash = 'kiosk' })
  await expect.poll(() => page.evaluate(() => (window as unknown as Board).__api.scene()), { timeout: 15_000 }).toBe('register')
  const told = page.locator('#sheet .board .told')
  // The map knows a place for every reported line, so every one is a button.
  await expect(told.locator('li button').first()).toBeVisible()
  expect(await told.locator('li button').count()).toBe(await told.locator('li').count())
  // The Spires' line: the board closes, the map comes back and the view goes up to the Spires.
  await told.locator('li button').filter({ hasText: /at Sideproject Spires/ }).click()
  await expect(page.locator('#sheet')).toBeHidden()
  await expect.poll(() => page.evaluate(() => (window as unknown as Board).__api.scene()), { timeout: 15_000 }).toBe('world')
  await expect.poll(async () => { const o = await view(); return o && before ? before.y - o.y : 0 }, { timeout: 10_000 }).toBeGreaterThan(100)
  // Nothing was started: none of the line's events has been on the screen (the first comes 26 seconds in).
  for (const id of ['rockfall', 'calve', 'pair']) expect(await page.evaluate((k) => (window as unknown as Board).__api.saw().has(k), id), id).toBe(false)
  expect(problems).toEqual([])
})

// Round 8, H10: a thing counts as observed only when it is clear of the page's own panels.
test('a thing behind one of the page\'s panels does not count as observed', async ({ page }) => {
  type Cover = { __api: { coveredAt: (x: number, y: number) => boolean; saw: () => Set<string>; trigger: (id: string) => boolean; showEvent: (id: string) => number } }
  const problems = await open(page, '/')
  const covered = (x: number, y: number) => page.evaluate(([a, b]) => (window as unknown as Cover).__api.coveredAt(a ?? 0, b ?? 0), [x, y])
  const seen = (id: string) => page.evaluate((k) => (window as unknown as Cover).__api.saw().has(k), id)
  const start = (id: string) => page.evaluate((k) => { const w = window as unknown as Cover; w.__api.showEvent(k); return w.__api.trigger(k) }, id)
  // The junction's placard covers its own part of the view, and the middle of the view is clear.
  const box = await page.locator('#fork .placard').boundingBox()
  const size = page.viewportSize()
  if (!box || !size) throw new Error('the junction\'s placard is not on the page')
  const mid: [number, number] = [size.width / 2, size.height / 2 - 40]
  await expect.poll(() => covered(box.x + box.width / 2, box.y + box.height / 2), { timeout: 5_000 }).toBe(true)
  expect(await covered(...mid)).toBe(false)
  // With the Keys sheet up nothing behind it counts: a rockfall in the middle of the view comes and goes unobserved.
  await page.keyboard.press('KeyK')
  await expect(page.locator('#sheet')).toBeVisible()
  await expect.poll(() => covered(...mid), { timeout: 5_000 }).toBe(true)
  expect(await start('rockfall')).toBe(true)
  await page.waitForTimeout(7500)
  expect(await seen('rockfall')).toBe(false)
  // The sheet closed, the next one is observed.
  await page.keyboard.press('Escape')
  await expect(page.locator('#sheet')).toBeHidden()
  await expect.poll(() => covered(...mid), { timeout: 5_000 }).toBe(false)
  expect(await start('rockfall')).toBe(true)
  await expect.poll(() => seen('rockfall'), { timeout: 10_000 }).toBe(true)
  expect(problems).toEqual([])
})

// Round 8, H11: the notice in the register's scene says how much of the board has been observed, under the
// checklist's count, and all of its lines fit on the card on a desktop and on a phone.
test('the register\'s notice counts what has been observed, and its lines fit the card', async ({ page }) => {
  type Board = { __api: { saw: () => Set<string> } }
  for (const size of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size)
    const problems = await open(page, '/')
    await page.keyboard.press('KeyC')
    await expect(page.locator('#sheet .board')).toBeVisible()
    await page.keyboard.press('Escape')
    const notice = page.locator('#book .notice')
    await expect(notice).toBeVisible({ timeout: 10_000 })
    const lines = notice.locator('span')
    await expect(lines).toHaveCount(3)
    await expect(lines.nth(1)).toHaveText(/^Field checklist: \d+ of \d+ found$/)
    const count = /^(\d+) of (\d+) observed$/.exec(await lines.nth(2).innerText())
    expect(count, 'the count line').not.toBeNull()
    // One thing for every name on the board, and those of them the game has reported are the observed ones
    // (it also reports a few that the board does not list, the ravens over the meadow for one).
    const [n, of] = await page.evaluate(async () => {
      const { W } = await import(new URL('./words.js', location.href).href) as { W: { UI: { kiosk: { sightings: { who: Record<string, string> }[] } } } }
      const names = W.UI.kiosk.sightings.flatMap((s) => Object.keys(s.who)), saw = (window as unknown as Board).__api.saw()
      return [names.filter((k) => saw.has(k)).length, names.length]
    })
    expect([Number(count?.[1]), Number(count?.[2])]).toEqual([n, of])
    expect(of).toBeGreaterThan(40)
    // Nothing is cut off: the card is as tall as its words.
    expect(await notice.evaluate((n) => n.scrollHeight - n.clientHeight), 'words cut off at ' + size.width).toBeLessThanOrEqual(0)
    expect(problems).toEqual([])
  }
})

// Round 8, H12: the pointer on either the register's box or the board lights the one outline round both, and
// it goes out when the pointer leaves the pair.
test('the pointer on the register or the board lights one outline round both', async ({ page }) => {
  type Pair = { __pair: () => number }
  const problems = await open(page, '/')
  await page.locator('#fork-x').click()
  await expect.poll(() => page.evaluate(() => window.__api.hitAt('register')), { timeout: 15_000 }).not.toBeNull()
  const [x, y] = (await page.evaluate(() => window.__api.hitAt('register'))) as [number, number]
  const scale = await page.evaluate(() => (window.__info as unknown as { S: number }).S / (window.devicePixelRatio || 1))
  const lit = () => page.evaluate(() => (window as unknown as Pair).__pair())
  expect(await lit()).toBe(0)
  for (const dx of [3, 40]) {
    await page.mouse.move(x + dx * scale, y + 12 * scale)
    await expect.poll(lit, { timeout: 5_000 }).toBeGreaterThan(0.9)
    await page.mouse.move(x - 30 * scale, y - 30 * scale)
    await expect.poll(lit, { timeout: 5_000 }).toBeLessThan(0.1)
  }
  expect(problems).toEqual([])
})
