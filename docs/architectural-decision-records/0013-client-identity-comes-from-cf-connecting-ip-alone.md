# 0013. The API's rate limit counts clients by CF-Connecting-IP alone

- Status: Accepted
- Date: 2026-11-12
- Decider: TJ, in the PRD's interview answers (2026-11-12): "Per-client rate limits, client identity only from the proxy". The header was chosen in https://github.com/zimmertr/trailhead/pull/20.
- Issues and PRs: https://github.com/zimmertr/trailhead/pull/20
- Cited in code as: none
- Guide: [`docs/TRAFFIC.md`](../TRAFFIC.md), Client identity

## Context

Visitors reach the API through Cloudflare and then Istio's gateway, so the socket address is always the gateway's, and `X-Forwarded-For` holds whatever a caller wrote before Cloudflare appended to it.

## Decision

`api/src/client.ts`'s `clientBucket` reads the header named by `CLIENT_IP_HEADER` (default `cf-connecting-ip`), counts an IPv4 address as itself and an IPv6 address by its /64, and puts a request without a valid address in one shared bucket. Nothing else in the services reads a client address: the `trailhead/no-socket-address` lint rule refuses `.ip`, `.ips`, `.socket` and `.remoteAddress` in `api`, `admin` and `common`.

## Evidence

No dated measurement. The chart (trailhead-helm, `authorizationPolicy.adminDenyHeaders`) already treats `cf-connecting-ip` as the mark of a request from the internet.

## Alternatives rejected

- Fastify's `trustProxy` with `X-Forwarded-For`. Its leftmost entry is the caller's to write.
- The socket address. Every visitor would share the gateway's bucket.

## Consequences

The gateway must strip `CF-Connecting-IP` from any request that didn't come through Cloudflare, or a caller can choose their own bucket. Each api replica keeps its own buckets in memory, so a client gets up to three times the budget across three replicas (docs/LIMITS.md).
