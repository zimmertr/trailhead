import { describe, expect, it } from 'vitest'
import { GITHUB_API, GitHubError, fetchRepoStats } from '../src/github.ts'
import { daysAfterStart, fakeGitHub, json, releaseBody, repoBody, status, timeout } from './fixtures.ts'

const repo = 'zimmertr/bluebird'
const paths = { repo: `/repos/${repo}`, release: `/repos/${repo}/releases/latest` }

describe('fetchRepoStats', () => {
  it('reads stars, language, license and the latest release', async () => {
    const { fetch } = fakeGitHub({ [paths.repo]: json(repoBody()), [paths.release]: json(releaseBody()) })
    expect(await fetchRepoStats(repo, { fetch, token: undefined })).toEqual({
      stars: 2,
      language: 'TypeScript',
      license: 'NOASSERTION',
      release: { tag: 'v0.140.0', publishedAt: daysAfterStart(-3) },
    })
  })

  it('calls GitHub with its API version and a user agent, and sends the token only when there is one', async () => {
    const anonymous = fakeGitHub({ [paths.repo]: json(repoBody()), [paths.release]: json(releaseBody()) })
    await fetchRepoStats(repo, { fetch: anonymous.fetch, token: undefined })
    expect(anonymous.calls.map((c) => c.url)).toEqual([`${GITHUB_API}${paths.repo}`, `${GITHUB_API}${paths.release}`])
    expect(anonymous.calls[0]?.headers).toEqual({ accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'trailhead-fetcher' })

    const signedIn = fakeGitHub({ [paths.repo]: json(repoBody()), [paths.release]: json(releaseBody()) })
    await fetchRepoStats(repo, { fetch: signedIn.fetch, token: 'test-token' })
    expect(signedIn.calls.every((c) => c.headers.authorization === 'Bearer test-token')).toBe(true)
  })

  it('answers no release for a repo that has never published one', async () => {
    const { fetch } = fakeGitHub({ [paths.repo]: json(repoBody()), [paths.release]: status(404) })
    expect((await fetchRepoStats(repo, { fetch, token: undefined })).release).toBeNull()
  })

  it('answers nulls for a repo with no license and no language', async () => {
    const { fetch } = fakeGitHub({ [paths.repo]: json(repoBody({ license: null, language: null })), [paths.release]: status(404) })
    expect(await fetchRepoStats(repo, { fetch, token: undefined })).toMatchObject({ license: null, language: null })
  })

  it.each([
    ['the repo answers an error', { [paths.repo]: status(403) }, 'GET /repos/zimmertr/bluebird answered 403'],
    ['the repo answers without its numbers', { [paths.repo]: json({ message: 'Moved' }) }, 'GET /repos/zimmertr/bluebird answered without stargazers_count'],
    ['the release answers an error', { [paths.repo]: json(repoBody()), [paths.release]: status(502) }, 'GET /repos/zimmertr/bluebird/releases/latest answered 502'],
    [
      'the release answers without its fields',
      { [paths.repo]: json(repoBody()), [paths.release]: json(releaseBody({ published_at: null })) },
      'GET /repos/zimmertr/bluebird/releases/latest answered without tag_name and published_at',
    ],
  ])('fails when %s', async (_name, answers, message) => {
    const { fetch } = fakeGitHub(answers)
    await expect(fetchRepoStats(repo, { fetch, token: undefined })).rejects.toThrow(new GitHubError(message))
  })

  it('fails when GitHub does not answer in time', async () => {
    const { fetch } = fakeGitHub({ [paths.repo]: timeout() })
    await expect(fetchRepoStats(repo, { fetch, token: undefined })).rejects.toThrow('The operation was aborted due to timeout')
  })
})
