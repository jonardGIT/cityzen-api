ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "privacyNoticeAcceptedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "privacyNoticeVersion" text;

ALTER TABLE citizens
  ADD COLUMN IF NOT EXISTS "privacyNoticeAcceptedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "privacyNoticeVersion" text;