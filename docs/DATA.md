# Data

Each upstream provider, what it returns, its quirks, and its terms. Only the fetcher calls out ([TRAFFIC.md](TRAFFIC.md)).

## GitHub REST API

The fetcher ([`fetcher/src/github.ts`](../fetcher/src/github.ts)) makes two reads per project, with `X-GitHub-Api-Version: 2022-11-28` and `User-Agent: trailhead-fetcher`, and the token as a bearer when one is set.

| Call | Fields kept | Stored as |
|---|---|---|
| `GET /repos/{owner}/{repo}` | `stargazers_count`, `language`, `license.spdx_id` | `stars`, `language`, `license` |
| `GET /repos/{owner}/{repo}/releases/latest` | `tag_name`, `published_at` | `release_tag`, `release_published_at` |

Quirks, as of 2026-11-12:

- `releases/latest` skips drafts and prereleases, and answers `404` for a repo that has never published a release. The fetcher stores no release for it; that's a fact, not a failure.
- A license GitHub can't identify has `spdx_id: "NOASSERTION"` (zimmertr/bluebird and zimmertr/trailhead, both PolyForm). It's stored as GitHub reports it.
- `language` is `null` for a repo GitHub detects no language in.
- Without a token GitHub allows 60 reads an hour per address; a run makes 12. With one, 5,000.

### When a read fails

A repo whose read fails (an error status, a body without the fields, a timeout) is logged and skipped: its row keeps the last good numbers, the other repos still update, and the job exits non-zero so its history and alert show it. Only a good fetch writes a row.

### Terms

GitHub's data is read under the [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service), including its [API terms](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#h-api-terms): use within the rate limits, and no use that would breach GitHub's Acceptable Use Policies. The numbers shown are public metadata of TJ's own repos.
