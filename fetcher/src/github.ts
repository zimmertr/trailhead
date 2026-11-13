// The only outbound call in trailhead (record 0002): two GitHub REST reads
// per project. docs/DATA.md has what GitHub returns and its terms;
// docs/TRAFFIC.md has the timeout and why there's no retry here.

export const GITHUB_API = 'https://api.github.com'
// GitHub answers these in well under a second; ten covers a slow day without
// letting one stuck read hold the job.
export const REQUEST_TIMEOUT_MS = 10_000

export type RepoStats = {
  stars: number
  language: string | null
  license: string | null
  release: { tag: string; publishedAt: Date } | null
}

export type Fetch = (url: string, init: RequestInit) => Promise<Response>

export class GitHubError extends Error {}

type GitHubOptions = { fetch: Fetch; token: string | undefined }

async function get(path: string, { fetch, token }: GitHubOptions): Promise<Response> {
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    // GitHub refuses a request without one.
    'user-agent': 'trailhead-fetcher',
  }
  if (token) headers.authorization = `Bearer ${token}`
  return fetch(`${GITHUB_API}${path}`, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), redirect: 'follow' })
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const stringOrNull = (value: unknown): string | null => (typeof value === 'string' ? value : null)

export async function fetchRepoStats(repo: string, options: GitHubOptions): Promise<RepoStats> {
  const repoResponse = await get(`/repos/${repo}`, options)
  if (!repoResponse.ok) throw new GitHubError(`GET /repos/${repo} answered ${repoResponse.status}`)
  const body: unknown = await repoResponse.json()
  if (!isRecord(body) || typeof body.stargazers_count !== 'number') throw new GitHubError(`GET /repos/${repo} answered without stargazers_count`)

  // Drafts and prereleases are left out by GitHub. A 404 here means the repo
  // has never published a release, which is a fact, not a failure.
  const releaseResponse = await get(`/repos/${repo}/releases/latest`, options)
  let release: RepoStats['release'] = null
  if (releaseResponse.ok) {
    const latest: unknown = await releaseResponse.json()
    if (!isRecord(latest) || typeof latest.tag_name !== 'string' || typeof latest.published_at !== 'string') {
      throw new GitHubError(`GET /repos/${repo}/releases/latest answered without tag_name and published_at`)
    }
    release = { tag: latest.tag_name, publishedAt: new Date(latest.published_at) }
  } else if (releaseResponse.status !== 404) {
    throw new GitHubError(`GET /repos/${repo}/releases/latest answered ${releaseResponse.status}`)
  }

  return {
    stars: body.stargazers_count,
    language: stringOrNull(body.language),
    license: isRecord(body.license) ? stringOrNull(body.license.spdx_id) : null,
    release,
  }
}
