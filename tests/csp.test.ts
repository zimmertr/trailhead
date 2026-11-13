import { describe, expect, it } from 'vitest'
import { files, read } from './repo.ts'

// Every host the browser code names, and what the policy does about it
// (service.md, Public services). A host the code reaches must sit in the
// directive named here; a host the code only links to is a navigation, which
// the policy doesn't govern. A new host fails this test until it's classified
// here and, when the code reaches it, added to web/security-headers.conf.
const HOSTS: Record<string, 'navigation' | 'connect-src' | 'script-src' | 'img-src'> = {
  // Each project card links its repo.
  'github.com': 'navigation',
}

export function hostsIn(source: string): string[] {
  return [...new Set([...source.matchAll(/(?:https?:)?\/\/([a-z0-9.-]+\.[a-z]{2,})(?=[/:'"`\s)]|$)/gi)].map(([, host]) => (host ?? '').toLowerCase()))]
}

const policy = read('web/security-headers.conf').match(/Content-Security-Policy "([^"]+)"/)?.[1] ?? ''
const directive = (name: string) => policy.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? ''

describe('the content security policy', () => {
  const sources = [...files(/^web\/src\/.*\.ts$/), ...files(/^web\/(index|page\/index)\.html$/)]

  it('finds hosts where they are written', () => {
    expect(hostsIn(`fetch('https://cloud.umami.is/api/send'); a.href = "//example.com"; x = 'https://github.com/' + repo`)).toEqual(['cloud.umami.is', 'example.com', 'github.com'])
    expect(hostsIn('no hosts here, only /api/v1/projects and ./world/placeholder.ts')).toEqual([])
  })

  it('classifies every host the browser code names', () => {
    const unclassified = sources.flatMap((path) => hostsIn(read(path)).filter((host) => !(host in HOSTS)).map((host) => `${path}: ${host}`))
    expect(unclassified).toEqual([])
  })

  it('lists each host the code reaches in its directive', () => {
    for (const [host, use] of Object.entries(HOSTS)) {
      if (use !== 'navigation') expect(directive(use), host).toContain(host)
    }
  })

  it('loads only from the site itself and refuses framing', () => {
    expect(directive('default-src')).toBe("default-src 'none'")
    for (const name of ['script-src', 'style-src', 'font-src', 'img-src', 'connect-src']) expect(directive(name)).toBe(`${name} 'self'`)
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval|data:/)
  })
})
