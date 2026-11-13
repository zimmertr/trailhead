# Usage

What a visitor and TJ see, and what to do when it breaks.

## What a visitor sees

- **The home page**, `/`: TJ's name in the black band, the intro, and the three signs. A slowly turning low-poly planet stands in for the 3D world, which replaces it later. Each sign is a link into the plain page at its place.
- **The plain page**, `/page/`: every place, milestone and project, with their links, on one scrolling page. It needs no script.
- **The API**, `/api/v1/projects`: the six projects with their GitHub numbers ([API.md](API.md)).

## What TJ sees

- The admin panel on its home-network host: one placeholder page until the summit register arrives.
- `GET /version.json` on the site, `/api/version` on the API and `/version` on the panel: the running version and commit.
- The fetcher's runs in the CronJob's history, one structured log line per repo.

## When it breaks

- **A project shows no numbers.** The fetcher hasn't stored any yet, or every run has failed. Its last job's log names each repo that failed and why; the numbers already stored stay until a good fetch replaces them.
- **The API answers `unavailable`.** It can't reach the database: `/readyz` on the API says the same. Check the database cluster.
- **A rollout stops.** The chart's checks found the canary answering the wrong version or a failing page; the old version keeps serving. The Rollout's analysis run names the check.
- **The content build fails.** `npm run content` lists every problem with the file and field: a misspelt field, a link to a profile that doesn't exist, a first-person word, an email address.
