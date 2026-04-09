BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz;
ALTER TABLE responders ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz;
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz;
ALTER TABLE severities ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz;

CREATE INDEX IF NOT EXISTS users_archived_at_idx ON users ("archivedAt");
CREATE INDEX IF NOT EXISTS citizens_archived_at_idx ON citizens ("archivedAt");
CREATE INDEX IF NOT EXISTS agencies_archived_at_idx ON agencies ("archivedAt");
CREATE INDEX IF NOT EXISTS responders_archived_at_idx ON responders ("archivedAt");
CREATE INDEX IF NOT EXISTS statuses_archived_at_idx ON statuses ("archivedAt");
CREATE INDEX IF NOT EXISTS categories_archived_at_idx ON categories ("archivedAt");
CREATE INDEX IF NOT EXISTS severities_archived_at_idx ON severities ("archivedAt");
CREATE INDEX IF NOT EXISTS incidents_archived_at_idx ON incidents ("archivedAt");
CREATE INDEX IF NOT EXISTS assignments_archived_at_idx ON assignments ("archivedAt");

COMMIT;