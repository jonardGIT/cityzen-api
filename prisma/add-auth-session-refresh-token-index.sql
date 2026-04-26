CREATE INDEX IF NOT EXISTS auth_sessions_refresh_token_hash_idx
ON auth_sessions ("refreshTokenHash");