-- ============================================================================
-- Migration: 7-role flat system → Philippine LGU hierarchy with city content editors
-- ============================================================================
-- Role mapping:
--   SYSTEM_ADMIN       → NATIONAL_ADMIN
--   DEPARTMENT_MANAGER → CITY_ADMIN
--   SUPERVISOR         → PROVINCIAL_ADMIN
--   DISPATCHER         → DISPATCHER       (unchanged)
--   RESPONDER          → RESPONDER        (unchanged)
--   CITIZEN_REPORTER   → CITIZEN_REPORTER (unchanged)
--   AUDITOR            → AUDITOR          (unchanged)
-- New roles: REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, CITY_CONTENT_EDITOR
-- ============================================================================

BEGIN;

-- Migrate existing role values
UPDATE users SET role = 'NATIONAL_ADMIN' WHERE role = 'SYSTEM_ADMIN';
UPDATE users SET role = 'CITY_ADMIN' WHERE role = 'DEPARTMENT_MANAGER';
UPDATE users SET role = 'PROVINCIAL_ADMIN' WHERE role = 'SUPERVISOR';

-- Drop old constraint and add new one
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
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

-- Update default role
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'CITIZEN_REPORTER';

COMMIT;
