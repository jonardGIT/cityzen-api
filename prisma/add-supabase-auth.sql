BEGIN;

ALTER TABLE users ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "supabaseAuthUserId" uuid;

CREATE UNIQUE INDEX IF NOT EXISTS users_supabase_auth_user_id_idx
ON users ("supabaseAuthUserId")
WHERE "supabaseAuthUserId" IS NOT NULL;

COMMIT;