ALTER TABLE incidents
ADD COLUMN public_reference TEXT;

ALTER TABLE incidents
ADD CONSTRAINT incidents_public_reference_key UNIQUE (public_reference);

CREATE TABLE case_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  incident_id UUID NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  CONSTRAINT case_tokens_token_hash_key UNIQUE (token_hash),
  CONSTRAINT case_tokens_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
  CONSTRAINT case_tokens_token_hash_length_check CHECK (char_length(token_hash) >= 32),
  CONSTRAINT case_tokens_expiry_sanity_check CHECK (expires_at > created_at)
);

CREATE INDEX case_tokens_incident_id_idx ON case_tokens (incident_id);
CREATE INDEX case_tokens_expires_at_idx ON case_tokens (expires_at);
CREATE INDEX case_tokens_revoked_at_idx ON case_tokens (revoked_at);

CREATE TABLE incident_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  incident_id UUID NOT NULL,
  from_status_id UUID,
  to_status_id UUID NOT NULL,
  changed_by_user_id UUID,
  note TEXT,
  CONSTRAINT incident_status_history_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
  CONSTRAINT incident_status_history_from_status_id_fkey FOREIGN KEY (from_status_id) REFERENCES statuses(id),
  CONSTRAINT incident_status_history_to_status_id_fkey FOREIGN KEY (to_status_id) REFERENCES statuses(id),
  CONSTRAINT incident_status_history_change_direction_check CHECK (from_status_id IS NULL OR from_status_id <> to_status_id)
);

CREATE INDEX incident_status_history_incident_id_created_at_idx ON incident_status_history (incident_id, created_at);
CREATE INDEX incident_status_history_from_status_id_idx ON incident_status_history (from_status_id);
CREATE INDEX incident_status_history_to_status_id_idx ON incident_status_history (to_status_id);
CREATE INDEX incident_status_history_changed_by_user_id_idx ON incident_status_history (changed_by_user_id);