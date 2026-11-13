import type { Content, Milestone, Place, Project } from '@trailhead/content'

// The home page's still and the plain page, as HTML, written into the two
// pages at build time (vite.config.ts). Crawlers and browsers without WebGL
// get every word with no script at all.

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c)

// Projects are the Spires' milestones: one spire each.
export const PROJECTS_PLACE = 'sideproject-spires'
export const PLAIN_PAGE = '/page/'

const intro = (content: Content): Place | undefined => content.places[0]

// For the description meta tag: the heading and the intro as one sentence.
export function describe(content: Content): string {
  const text = (intro(content)?.html ?? '').replace(/<[^>]+>/g, '').trim()
  return escapeHtml(`${content.site.name} ${text}`.trim())
}

function signs(place: Place): string {
  if (place.signs.length === 0) return ''
  const items = place.signs.map(
    (sign) => `<li><a class="sign place-${escapeHtml(sign.place)}" href="${PLAIN_PAGE}#${escapeHtml(sign.place)}">${escapeHtml(sign.text)}</a></li>`,
  )
  return `<ul class="signs">${items.join('')}</ul>`
}

function list(className: string, items: string[]): string {
  return items.length === 0 ? '' : `<ul class="${className}">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`
}

function profileLinks(content: Content, ids?: string[]): string {
  const profiles = ids ? content.site.profiles.filter((p) => ids.includes(p.id)) : content.site.profiles
  return list(
    'links',
    profiles.map((p) => `<a href="${escapeHtml(p.url)}">${escapeHtml(p.label)}</a>`),
  )
}

function milestone(content: Content, m: Milestone): string {
  return `<article id="${escapeHtml(m.place)}-${escapeHtml(m.slug)}" class="milestone">
<h3>${escapeHtml(m.title)}</h3>
${m.html}
${list('tools', m.tools.map(escapeHtml))}
${m.links.length > 0 ? profileLinks(content, m.links) : ''}
</article>`
}

function project(p: Project): string {
  return `<article id="${PROJECTS_PLACE}-${escapeHtml(p.slug)}" class="milestone">
<h3>${escapeHtml(p.name)}</h3>
${p.html}
${list('links', [`<a href="https://github.com/${escapeHtml(p.repo)}">${escapeHtml(p.repo)}</a>`])}
</article>`
}

export function renderHome(content: Content): string {
  const trailhead = intro(content)
  return `<header class="band"><h1>${escapeHtml(content.site.name)}</h1></header>
<main class="home place-trailhead">
<section class="intro">
${trailhead?.html ?? ''}
${trailhead ? signs(trailhead) : ''}
</section>
<div id="world" class="world" aria-hidden="true"></div>
</main>`
}

export function renderPage(content: Content): string {
  const [trailhead, ...places] = content.places
  const sections = places.map((place) => {
    const items =
      place.slug === PROJECTS_PLACE
        ? content.projects.map(project)
        : content.milestones.filter((m) => m.place === place.slug).map((m) => milestone(content, m))
    return `<section id="${escapeHtml(place.slug)}" class="place place-${escapeHtml(place.slug)}" aria-labelledby="${escapeHtml(place.slug)}-title">
<h2 id="${escapeHtml(place.slug)}-title" class="place-band">${escapeHtml(place.title)}</h2>
${place.html}
${items.join('\n')}
</section>`
  })
  return `<header class="band"><h1><a href="/">${escapeHtml(content.site.name)}</a></h1></header>
<main>
<section id="${escapeHtml(trailhead?.slug ?? 'trailhead')}" class="place place-trailhead">
${trailhead?.html ?? ''}
${trailhead ? signs(trailhead) : ''}
</section>
${sections.join('\n')}
</main>
<footer class="band">${profileLinks(content)}</footer>`
}
