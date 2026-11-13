-- What each service's role may do, applied after every migration run, so a
-- role the chart creates after the tables exist still gets its grants. Each
-- block is skipped while its role doesn't exist (local compose, where every
-- service uses the owner). docs/ARCHITECTURE.md, Database roles.
DO $$
BEGIN
    -- api reads the numbers.
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'trailhead_api') THEN
        GRANT USAGE ON SCHEMA public TO trailhead_api;
        GRANT SELECT ON project_stats TO trailhead_api;
    END IF;
    -- fetcher writes them. SELECT too, for the upsert's conflict check.
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'trailhead_fetcher') THEN
        GRANT USAGE ON SCHEMA public TO trailhead_fetcher;
        GRANT SELECT, INSERT, UPDATE ON project_stats TO trailhead_fetcher;
    END IF;
    -- admin only connects for now. It updates summit register entries once
    -- that table exists (https://github.com/zimmertr/trailhead/issues/3).
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'trailhead_admin') THEN
        GRANT USAGE ON SCHEMA public TO trailhead_admin;
    END IF;
END
$$;
