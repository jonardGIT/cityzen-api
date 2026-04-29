BEGIN;

CREATE TABLE IF NOT EXISTS privacy_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "reportedByUserId" uuid REFERENCES users(id) ON DELETE SET NULL,
  "reviewedByUserId" uuid REFERENCES users(id) ON DELETE SET NULL,
  "referenceCode" text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'REPORTED',
  severity text NOT NULL DEFAULT 'HIGH',
  "detectedAt" timestamptz NOT NULL,
  "occurredAt" timestamptz,
  summary text NOT NULL,
  details text,
  "likelyPersonalDataBreach" boolean NOT NULL DEFAULT true,
  "npcNotificationRequired" boolean NOT NULL DEFAULT false,
  "npcNotificationDueAt" timestamptz,
  "npcNotifiedAt" timestamptz,
  "npcNotificationReference" text,
  "dataSubjectNotificationRequired" boolean NOT NULL DEFAULT false,
  "dataSubjectNotifiedAt" timestamptz,
  "dataSubjectNotificationReference" text,
  "affectedRecordCount" integer,
  "affectedDataCategories" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "containmentActions" text,
  "riskAssessment" text,
  "reviewerNotes" text,
  "resolutionSummary" text,
  "closedAt" timestamptz,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS privacy_incidents_reported_by_user_id_idx
  ON privacy_incidents ("reportedByUserId");

CREATE INDEX IF NOT EXISTS privacy_incidents_reviewed_by_user_id_idx
  ON privacy_incidents ("reviewedByUserId");

CREATE INDEX IF NOT EXISTS privacy_incidents_status_idx
  ON privacy_incidents (status);

CREATE INDEX IF NOT EXISTS privacy_incidents_severity_idx
  ON privacy_incidents (severity);

CREATE INDEX IF NOT EXISTS privacy_incidents_detected_at_idx
  ON privacy_incidents ("detectedAt");

CREATE INDEX IF NOT EXISTS privacy_incidents_npc_notification_due_at_idx
  ON privacy_incidents ("npcNotificationDueAt");

COMMIT;