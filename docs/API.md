# API

The public API behind tjzimmerman.com, on the same site under `/api`. The contract is [`api/openapi.json`](../api/openapi.json), written from [`api/src/routes.ts`](../api/src/routes.ts) by `make openapi`; `make check-openapi` fails a PR whose committed copy differs from the routes.

## Routes

| Route | Answers |
|---|---|
| `GET /api/v1/projects` | The six projects in the content's order, each with `stars`, `language`, `license`, `release` (`tag`, `publishedAt`) and `fetchedAt`. Every number is `null` until the fetcher first stores it. Cached for five minutes |
| `GET /api/version` | `{"version", "commit"}` of the running image |
| `GET /api/third-party-licenses.txt` | The license text of every package bundled into the service |
| `GET /healthz` | `{"status": "ok"}` while the process runs. For probes |
| `GET /readyz` | `{"status": "ok"}` while the database answers, else `503`. For probes |

`license` is GitHub's SPDX id as GitHub reports it, which is `NOASSERTION` for a license GitHub can't identify (PolyForm, for one). Times are ISO 8601 in UTC.

## Errors

Every failure answers one shape:

```json
{"error": {"code": "rate_limited", "message": "Too many requests. Try again later.", "retryable": true}}
```

Branch on `code`. `retryable` says whether trying again can help. The codes and their statuses are in [`common/src/http.ts`](../common/src/http.ts) (`ERRORS`): `bad_request` 400 (including any query parameter, since no route takes one), `not_found` 404, `payload_too_large` 413, `rate_limited` 429 with `Retry-After`, `internal` 500, `unavailable` 503 (the database didn't answer).

## What the version promises

The API is pre-1.0: routes and fields may still change between releases. From 1.0, SemVer covers the documented routes and their statuses, every response field, the error object and its codes. It doesn't cover the wording of `message`. Under `/api/v1`, a change only adds: a new field, a new route, a new error code.

## Limits

Each client gets a budget of requests a minute ([LIMITS.md](LIMITS.md)), counted by the address Cloudflare reports ([TRAFFIC.md](TRAFFIC.md)). Every response carries the security headers, errors included.
