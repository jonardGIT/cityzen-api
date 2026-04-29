CREATE TABLE IF NOT EXISTS data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "requesterUserId" uuid REFERENCES users(id) ON DELETE SET NULL,
  "reviewerUserId" uuid REFERENCES users(id) ON DELETE SET NULL,
  "citizenId" uuid REFERENCES citizens(id) ON DELETE SET NULL,
  "requestType" text NOT NULL,
  status text NOT NULL DEFAULT 'SUBMITTED',
  channel text NOT NULL DEFAULT 'self-service',
  "requesterEmail" text,
  details text,
  "reviewerNotes" text,
  "resolutionSummary" text,
  "acknowledgedAt" timestamptz,
  "reviewedAt" timestamptz,
  "resolvedAt" timestamptz,
  "dueAt" timestamptz NOT NULL,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS data_subject_requests_requester_user_id_idx
  ON data_subject_requests ("requesterUserId");

CREATE INDEX IF NOT EXISTS data_subject_requests_reviewer_user_id_idx
  ON data_subject_requests ("reviewerUserId");

CREATE INDEX IF NOT EXISTS data_subject_requests_citizen_id_idx
  ON data_subject_requests ("citizenId");

CREATE INDEX IF NOT EXISTS data_subject_requests_status_idx
  ON data_subject_requests (status);

CREATE INDEX IF NOT EXISTS data_subject_requests_due_at_idx
  ON data_subject_requests ("dueAt");