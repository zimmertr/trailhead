# Configuration

Every setting each program reads, all from the environment. The chart sets them in the cluster ([trailhead-helm](https://github.com/zimmertr/trailhead-helm)); `docker-compose.yml` sets them locally. A missing or malformed required setting stops the program at start with one `fatal` log line naming it.

## api

Read in [`api/src/config.ts`](../api/src/config.ts).

| Variable | Default | Does | Set by |
|---|---|---|---|
| `DATABASE_URL` | required | Postgres connection string, as the `trailhead_api` login | the chart, from the role's Secret |
| `PORT` | `8080` | The HTTP port | not set: the default |
| `METRICS_PORT` | `9464` | The Prometheus port, `GET /metrics` | the chart (`api.metrics.port`) |
| `CLIENT_IP_HEADER` | `cf-connecting-ip` | The header the rate limit reads the client from ([TRAFFIC.md](TRAFFIC.md)) | not set: the default |
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent` | `extraEnv`, when wanted |
| `APP_VERSION`, `APP_COMMIT` | `dev` | What `/api/version` answers | baked into the image by the release |

## admin

Read in [`admin/src/config.ts`](../admin/src/config.ts): `DATABASE_URL` (required, the `trailhead_admin` login), `PORT` (`8080`), `LOG_LEVEL` (`info`), and the baked-in `APP_VERSION` and `APP_COMMIT`. It has no metrics port, so it ignores the `METRICS_PORT` the chart may set.

## fetcher

Read in [`fetcher/src/config.ts`](../fetcher/src/config.ts).

| Variable | Default | Does | Set by |
|---|---|---|---|
| `DATABASE_URL` | required | Postgres connection string, as the `trailhead_fetcher` login | the chart, from the role's Secret |
| `GITHUB_TOKEN` | none | Sent to GitHub as a bearer token. Optional: a run makes 12 reads, under the 60 an hour GitHub allows without one | the chart, from the hand-made `trailhead-fetcher-tokens` Secret |
| `LOG_LEVEL` | `info` | As for api | `extraEnv`, when wanted |

`node migrate.js` in the same image reads `DATABASE_URL` (the owner's login, since it creates tables) and `LOG_LEVEL`.

## web

Nothing at run time: nginx serves files built into the image, configured by [`web/nginx.conf`](../web/nginx.conf) and [`web/security-headers.conf`](../web/security-headers.conf). `/version.json` is written from the `APP_VERSION` and `APP_COMMIT` build arguments. The analytics module ([`web/src/analytics.ts`](../web/src/analytics.ts)) sends nothing until Umami's script is on the page.

## Build arguments

Every Dockerfile takes `APP_VERSION`, `APP_COMMIT` and `APP_BUILT_AT`, which yggdrasil's release module passes. A local build says `dev`.

## Secrets

None are in this repo. [CICD.md](CICD.md#secrets) lists the ones the pipeline uses.
