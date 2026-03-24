BEGIN;

-- Add contactNumber column to agencies table
ALTER TABLE agencies
ADD COLUMN IF NOT EXISTS "contactNumber" VARCHAR(20);

COMMIT;
