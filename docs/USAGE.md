# Usage

What a visitor and TJ see, and what to do when it breaks.

## What a visitor sees

- **The world**, `/`: the pixel-art map at the Trailhead, the intro and three planks, one per destination. Everything a visitor can do there is in [`PRD.md`](PRD.md).
- **The page of text**, `/#page` or the Page button: every card's words and links on one page.
- **The API**, `/api/v1/projects`: the six projects with their GitHub numbers ([API.md](API.md)).

## What TJ sees

- The admin panel on its home-network host: one placeholder page until the summit register arrives.
- `GET /version.json` on the site, `/api/version` on the API and `/version` on the panel: the running version and commit.
- The fetcher's runs in the CronJob's history, one structured log line per repo.

## When it breaks

- **A project card shows old numbers.** The game shows the numbers written into it when the API can't be reached or has none: the fetcher hasn't stored any yet, or every run has failed. Its last job's log names each repo that failed and why; the numbers already stored stay until a good fetch replaces them.
- **The API answers `unavailable`.** It can't reach the database: `/readyz` on the API says the same. Check the database cluster.
- **A rollout stops.** The chart's checks found the canary answering the wrong version or a failing page; the old version keeps serving. The Rollout's analysis run names the check.
- **The content build fails.** `npm run content` lists every problem with the file and field: a misspelt field, a link to a profile that doesn't exist, a first-person word, an email address.
