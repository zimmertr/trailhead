// Every bound the API holds itself to. docs/LIMITS.md gives the reason for
// each and points back here; nothing else restates them.

// Per client, per replica. A visitor's page asks for the projects once, so
// 60 a minute leaves room for a reload storm and still stops a scraper.
export const RATE_LIMIT_MAX = 60
export const RATE_LIMIT_WINDOW_MS = 60_000

// The fetcher writes new numbers about once a day; five minutes of browser
// and edge caching costs nothing and spares the database.
export const PROJECTS_MAX_AGE_S = 300
