# Trailhead

* [Summary](#summary)
* [How It Works](#how-it-works)
* [Quick Start](#quick-start)
* [Documentation](#documentation)
* [License](#license)

## Summary

My personal site, https://tjzimmerman.com, as a small 3D planet. Start at the trailhead and choose a destination: run to a lake to read about me, climb a wall to see what I do for work, or climb a group of spires to see my side projects.

<hr>

## How It Works

The site is four small services and a Postgres database. `web` serves the pages, `api` answers the project numbers under `/api`, `admin` is a private panel I reach from home, and `fetcher` pulls each project's numbers from GitHub once an hour. The words live in Markdown files under `content/`, and the pages and the API all read them from there. The [architecture](docs/ARCHITECTURE.md) doc has the rest.

<hr>

## Quick Start

```sh
docker compose up --build
```

Then open http://localhost:8080. Every check CI runs is also a `make` target that runs in Docker; [development](docs/DEVELOPMENT.md) lists them.

<hr>

## Documentation

| Doc | What it covers |
|---|---|
| [Product requirements](docs/PRD.md) | What the site is, every place and feature, the services, and the build plan |
| [Decision records](docs/architectural-decision-records/README.md) | One record per design decision, with its reasons |
| [Architecture](docs/ARCHITECTURE.md) | The services, the images and the database |
| [API](docs/API.md) | The public API and what it promises |
| [CI/CD](docs/CICD.md) | The checks, the release and the weekly scan |
| [Configuration](docs/CONFIGURATION.md) | Every setting each service reads |
| [Data](docs/DATA.md) | What the site reads from GitHub |
| [Development](docs/DEVELOPMENT.md) | Running and testing it in Docker |
| [Limits](docs/LIMITS.md) | Every cap and timeout |
| [Styles](docs/STYLES.md) | The plain page's look and tokens |
| [Traffic](docs/TRAFFIC.md) | How requests get in and out |
| [Usage](docs/USAGE.md) | What you see, and what to do when it breaks |
| [Notices](NOTICES.md) | The bundled software and its licenses |

The Helm chart lives in [trailhead-helm](https://github.com/zimmertr/trailhead-helm).

<hr>

## License

[PolyForm Noncommercial 1.0.0](LICENSE)
