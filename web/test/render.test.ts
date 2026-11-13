import { content as real } from '@trailhead/content'
import { describe as group, expect, it } from 'vitest'
import { contentPages } from '../vite.config.ts'
import { describe, escapeHtml, renderHome, renderPage } from '../src/render.ts'
import { content } from './fixtures.ts'

group('escapeHtml', () => {
  it('escapes every character that could open markup or an attribute', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
  })
})

group('renderHome', () => {
  it('shows the name, the intro and the signs as links into the plain page', () => {
    const html = renderHome(content())
    expect(html).toContain('<h1>TJ Zimmerman</h1>')
    expect(html).toContain('<p>is a test.</p>')
    expect(html).toContain('<a class="sign place-about-lake" href="/page/#about-lake">Go &amp; see the &quot;lake&quot;</a>')
    expect(html).toContain('<div id="world" class="world" aria-hidden="true"></div>')
  })

  it('still renders with no signs or places', () => {
    expect(renderHome(content({ places: [] }))).toContain('<h1>TJ Zimmerman</h1>')
    const noSigns = content()
    noSigns.places[0] = { ...noSigns.places[0]!, signs: [] }
    expect(renderHome(noSigns)).not.toContain('class="signs"')
  })
})

group('renderPage', () => {
  it('gives each place a section with its band, and each milestone its own address', () => {
    const html = renderPage(content())
    expect(html).toContain('<section id="about-lake" class="place place-about-lake" aria-labelledby="about-lake-title">')
    expect(html).toContain('<h2 id="about-lake-title" class="place-band">About &lt;Lake&gt;</h2>')
    expect(html).toContain('<article id="about-lake-who" class="milestone">')
    expect(html).toContain('<ul class="tools"><li>Kubernetes</li></ul>')
  })

  it('lists the projects under the Spires, each linking its repo', () => {
    const html = renderPage(content())
    expect(html).toContain('<article id="sideproject-spires-bluebird" class="milestone">')
    expect(html).toContain('<a href="https://github.com/zimmertr/bluebird">zimmertr/bluebird</a>')
  })

  it('links a milestone’s profiles and every profile in the footer', () => {
    const html = renderPage(content())
    expect(html.match(/<a href="https:\/\/github.com\/zimmertr">GitHub<\/a>/g)).toHaveLength(2)
    expect(html).toMatch(/<footer class="band"><ul class="links">/)
  })

  it('renders every place, milestone and project of the real content', () => {
    const html = renderPage(real)
    for (const place of real.places.slice(1)) expect(html).toContain(`id="${place.slug}"`)
    for (const m of real.milestones) expect(html).toContain(`id="${m.place}-${m.slug}"`)
    for (const p of real.projects) expect(html).toContain(`id="sideproject-spires-${p.slug}"`)
    expect(html).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i)
  })
})

group('describe', () => {
  it('joins the name and the intro without markup', () => {
    expect(describe(content())).toBe('TJ Zimmerman is a test.')
    expect(describe(content({ places: [] }))).toBe('TJ Zimmerman')
  })
})

group('contentPages', () => {
  it('fills both pages and the description from the content', () => {
    const plugin = contentPages()
    const transform = plugin.transformIndexHtml as unknown as (html: string) => string
    const html = transform('<meta content="<!-- trailhead:description -->"><!-- trailhead:home --><!-- trailhead:page -->')
    expect(html).not.toContain('trailhead:')
    expect(html).toContain('TJ Zimmerman is a principal platform engineer')
  })
})
