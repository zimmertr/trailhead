# api

The public API under `/api` ([`docs/API.md`](../docs/API.md)). It holds no tokens and makes no outbound calls.

| Module | Owns |
|---|---|
| `src/routes.ts` | Every route and its contract. The app and `openapi.json` both come from it |
| `src/app.ts` | The Fastify app: handlers, rate limit, metrics hook |
| `src/client.ts` | `clientBucket`: the rate limit's key, from the proxy header alone |
| `src/projects.ts` | The projects answer: the content's list with the stored numbers |
| `src/store.ts` | The read-only queries |
| `src/metrics.ts` | The Prometheus registry and its own port |
| `src/limits.ts` | Every bound the API holds itself to |
| `src/openapi.ts`, `scripts/openapi.ts` | Writes and checks `openapi.json` |
| `src/main.ts` | The composition root |

A route change regenerates `openapi.json` (`make openapi`) in the same PR.
