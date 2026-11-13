# Notices

Trailhead is offered under the [PolyForm Noncommercial License 1.0.0](LICENSE). It bundles the software below, each under its own license. Every image also serves the full license text of everything bundled into it, built from what the build actually included: `/third-party-licenses.txt` on `web` and `admin`, `/api/third-party-licenses.txt` on `api`, and `/app/third-party-licenses.txt` inside the `fetcher` image.

## Bundled software

The direct dependencies the images ship. `tests/notices.test.ts` fails when this table and the `dependencies` of the workspaces' `package.json` files disagree, or a license here differs from the one the lock records.

| Package | Shipped in | License |
|---|---|---|
| [three](https://github.com/mrdoob/three.js) | `web` | MIT |
| [@fontsource/national-park](https://github.com/fontsource/font-files) | `web` | OFL-1.1 |
| [fastify](https://github.com/fastify/fastify) | `api`, `admin` | MIT |
| [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit) | `api` | MIT |
| [prom-client](https://github.com/siimon/prom-client) | `api` | Apache-2.0 |
| [pg](https://github.com/brianc/node-postgres) | `api`, `admin`, `fetcher` | MIT |
| [pino](https://github.com/pinojs/pino) | `api`, `admin`, `fetcher` | MIT |

The typeface is [National Park](https://nationalparktypeface.com), drawn by Jeremy Shellhorn, Jeffrey Schwab, Andrew Herzog and Miranda Schweitzer from the routed wooden signs of the US National Park Service, and released under the SIL Open Font License 1.1.

## Base images

| Image | Used by | License |
|---|---|---|
| [Node.js](https://nodejs.org) on Alpine Linux (`node:26-alpine`) | `api`, `admin`, `fetcher` | MIT (Node.js); each Alpine package under its own |
| [nginx](https://nginx.org) on Alpine Linux (`nginxinc/nginx-unprivileged:1.30-alpine`) | `web` | BSD-2-Clause (nginx); each Alpine package under its own |

Each release's images carry an SPDX SBOM per platform, which lists every package in them (`docker buildx imagetools inspect ghcr.io/zimmertr/trailhead-api:<version> --format '{{ json .SBOM }}'`).

## Data

| Provider | What trailhead reads | Terms |
|---|---|---|
| [GitHub REST API](https://docs.github.com/en/rest) | Each project repo's stars, primary language, license and latest release | [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service), [API terms](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#h-api-terms) |

[`docs/DATA.md`](docs/DATA.md) has what each call returns and its quirks.
