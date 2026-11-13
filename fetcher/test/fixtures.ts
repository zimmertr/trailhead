// Every fake GitHub answer the fetcher's tests use, built here and nowhere
// else. Each fake can fail the way GitHub does: an error status, a body
// missing its fields, a timeout.
import { START, captureLogger, daysAfterStart } from '../../common/test/fixtures.ts'
import type { Fetch, RepoStats } from '../src/github.ts'

export { START, captureLogger, daysAfterStart }

export const repoBody = (fields: Record<string, unknown> = {}) => ({
  full_name: 'zimmertr/bluebird',
  stargazers_count: 2,
  language: 'TypeScript',
  license: { key: 'other', name: 'Other', spdx_id: 'NOASSERTION' },
  ...fields,
})

export const releaseBody = (fields: Record<string, unknown> = {}) => ({
  tag_name: 'v0.140.0',
  published_at: daysAfterStart(-3).toISOString(),
  draft: false,
  prerelease: false,
  ...fields,
})

export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export const status = (code: number): Response => json({ message: 'GitHub said no', documentation_url: 'https://docs.github.com' }, code)

export const timeout = (): Error => new DOMException('The operation was aborted due to timeout', 'TimeoutError')

type Answer = Response | Error | (() => Response | Error)

// A fetch that answers by path and records what it was asked, headers
// included. An unlisted path fails the test loudly.
export function fakeGitHub(answers: Record<string, Answer>) {
  const calls: { url: string; headers: Record<string, string> }[] = []
  const fetch: Fetch = async (url, init) => {
    calls.push({ url, headers: init.headers as Record<string, string> })
    const answer = answers[new URL(url).pathname]
    if (answer === undefined) throw new Error(`the fake GitHub has no answer for ${url}`)
    const value = typeof answer === 'function' ? answer() : answer
    if (value instanceof Error) throw value
    return value.clone()
  }
  return { fetch, calls }
}

export const stats = (fields: Partial<RepoStats> = {}): RepoStats => ({
  stars: 2,
  language: 'TypeScript',
  license: 'NOASSERTION',
  release: { tag: 'v0.140.0', publishedAt: daysAfterStart(-3) },
  ...fields,
})
