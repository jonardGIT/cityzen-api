CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  timestamp timestamptz NOT NULL DEFAULT NOW(),
  action text NOT NULL,
  summary text NOT NULL,
  outcome text NOT NULL,
  "actorUserId" uuid,
  "actorEmail" text,
  "actorRole" text,
  resource text NOT NULL,
  method text NOT NULL,
  path text NOT NULL,
  "statusCode" integer,
  "targetId" text,
  "ipAddress" text,
  "userAgent" text,
  "requestId" text,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx ON audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS audit_logs_actor_email_idx ON audit_logs ("actorEmail");
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON audit_logs (resource);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_outcome_idx ON audit_logs (outcome);
CREATE INDEX IF NOT EXISTS audit_logs_target_id_idx ON audit_logs ("targetId");
CREATE INDEX IF NOT EXISTS audit_logs_request_id_idx ON audit_logs ("requestId");

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_audit_logs_updated_at ON audit_logs;
CREATE TRIGGER set_audit_logs_updated_at
BEFORE UPDATE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();