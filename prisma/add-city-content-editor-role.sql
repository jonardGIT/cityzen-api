BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (
    role IN (
      'NATIONAL_ADMIN',
      'REGIONAL_DIRECTOR',
      'PROVINCIAL_ADMIN',
      'CITY_ADMIN',
      'CITY_CONTENT_EDITOR',
      'DISPATCHER',
      'RESPONDER',
      'CITIZEN_REPORTER',
      'AUDITOR'
    )
  );

COMMIT;