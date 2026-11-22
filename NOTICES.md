# Notices

Trailhead is offered under the [PolyForm Noncommercial License 1.0.0](LICENSE). It bundles the software below, each under its own license. Every image also serves the full license text of everything bundled into it, built from what the build actually included: `/third-party-licenses.txt` on `web` and `admin`, `/api/third-party-licenses.txt` on `api`, and `/app/third-party-licenses.txt` inside the `fetcher` image.

## Bundled software

The direct dependencies the images ship. `tests/notices.test.ts` fails when this table and the `dependencies` of the workspaces' `package.json` files disagree, or a license here differs from the one the lock records.

| Package | Shipped in | License |
|---|---|---|
| [fastify](https://github.com/fastify/fastify) | `api`, `admin` | MIT |
| [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit) | `api` | MIT |
| [prom-client](https://github.com/siimon/prom-client) | `api` | Apache-2.0 |
| [pg](https://github.com/brianc/node-postgres) | `api`, `admin`, `fetcher` | MIT |
| [pino](https://github.com/pinojs/pino) | `api`, `admin`, `fetcher` | MIT |

## Fonts in the pixel world

The pixel world (`web/www`) serves eight font families from its own `fonts` folder, each the Latin set of the family from [Fontsource](https://fontsource.org) 5.3.0. All eight are under the SIL Open Font License 1.1, and `fonts/LICENSE.txt` beside them carries every copyright line and the full licence text.

| Font | Used for | Copyright |
|---|---|---|
| [Jersey 10](https://github.com/scfried/soft-type-jersey) | reading text | Copyright 2023 The Soft Type Project Authors (https://github.com/scfried/soft-type-jersey) |
| [Jersey 15](https://github.com/scfried/soft-type-jersey) | titles | Copyright 2023 The Soft Type Project Authors (https://github.com/scfried/soft-type-jersey) |
| [Tiny5](https://github.com/Gissio/font_tiny5) | small print | Copyright 2022-2024 The Tiny5 Project Authors (https://github.com/Gissio/font_tiny5) |
| [Silkscreen](https://github.com/googlefonts/silkscreen) | the routed wooden signs | Copyright 2001 The Silkscreen Project Authors (https://github.com/googlefonts/silkscreen) |
| [Caveat](https://github.com/googlefonts/caveat) | the trail register | Copyright 2014 The Caveat Project Authors (https://github.com/googlefonts/caveat) |
| [Gochi Hand](https://fonts.google.com/specimen/Gochi+Hand) | the trail register | Copyright (c) 2011, HT Fonts, with Reserved Font Names "Gochi" and "Gochi Hand" |
| [Kalam](https://fonts.google.com/specimen/Kalam) | the trail register | Copyright (c) 2014 Indian Type Foundry |
| [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand) | the trail register | Copyright (c) 2010-2012 Patrick Wagesreiter |

## Base images

| Image | Used by | License |
|---|---|---|
| [Node.js](https://nodejs.org) on Alpine Linux (`node:26-alpine`) | `api`, `admin`, `fetcher` | MIT (Node.js); each Alpine package under its own |
| [nginx](https://nginx.org) on Alpine Linux (`nginxinc/nginx-unprivileged:1.31-alpine`) | `web` | BSD-2-Clause (nginx); each Alpine package under its own |

Each release's images carry an SPDX SBOM per platform, which lists every package in them (`docker buildx imagetools inspect ghcr.io/zimmertr/trailhead-api:<version> --format '{{ json .SBOM }}'`).

## Data

| Provider | What trailhead reads | Terms |
|---|---|---|
| [GitHub REST API](https://docs.github.com/en/rest) | Each project repo's stars, primary language, license and latest release | [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service), [API terms](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#h-api-terms) |

[`docs/DATA.md`](docs/DATA.md) has what each call returns and its quirks.
