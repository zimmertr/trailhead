# fetcher

The one-shot job that reads each project's numbers from GitHub into Postgres. The only workload that holds a token or calls outside the cluster. Its image also runs the migrations.

| Module | Owns |
|---|---|
| `src/github.ts` | The two GitHub reads per repo and their checks ([`docs/DATA.md`](../docs/DATA.md)) |
| `src/run.ts` | One run: each repo in turn, a failure logged and skipped so its last numbers stay |
| `src/store.ts` | The upsert, called only with a good fetch |
| `src/main.ts` | The job's entry point. Exits non-zero when any repo failed |
| `src/migrate.ts` | `node migrate.js`: applies `db/` with the owner's login |
| `test/fixtures.ts` | Every fake GitHub answer, failures included |
