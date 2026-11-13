# common

What `api`, `admin` and `fetcher` share, so each rule has one home. Never imported by `web`.

| Module | Owns |
|---|---|
| `src/logger.ts` | The one logger: JSON to stdout, with tokens, passwords and addresses masked in the whole line |
| `src/http.ts` | The error shape and its codes, the security headers, the body cap, the server options and one log line per response |
| `src/env.ts` | Reading settings from the environment, and the baked-in version |
| `src/db.ts` | The Postgres pool and its timeouts |
| `src/migrate.ts` | Applies `db/migrations` and `db/grants.sql` |
| `src/main.ts` | `runMain`: an entry point that fails as one structured line |
| `test/fixtures.ts` | The fixed clock and the in-memory logger every suite uses |
| `test/database.ts` | A fresh database per database test file |
