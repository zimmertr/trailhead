-- The numbers each project card shows, one row per GitHub repo. The fetcher
-- writes them and the API reads them. A repo with no row yet is a project
-- whose numbers have never been fetched; the API answers it with nulls.
--
-- Only a good fetch writes a row, so a failed run leaves the last good numbers
-- in place (docs/DATA.md).
CREATE TABLE project_stats (
    -- owner/name as the content files spell it.
    repo text PRIMARY KEY CHECK (repo ~ '^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$'),
    stars integer NOT NULL CHECK (stars >= 0),
    -- GitHub's primary language, null when it detects none.
    language text,
    -- GitHub's SPDX id for the license, NOASSERTION when it can't tell which,
    -- null when the repo has none.
    license text,
    -- The latest published release, both null when there is none.
    release_tag text,
    release_published_at timestamptz,
    fetched_at timestamptz NOT NULL,
    CHECK ((release_tag IS NULL) = (release_published_at IS NULL))
);
