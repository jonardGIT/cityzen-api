# Migration Rehearsal On A Restored Snapshot

Last reviewed: 2026-05-20

Purpose: rehearse the exact release schema changes on a restored production-like database snapshot before a real deployment.

This repo does not currently use Prisma migration directories. The release change set is the combination of:

- `prisma/schema.prisma`
- the SQL patch files under `prisma/` that are part of the release
- the built server artifact started with `npm start`
- the black-box smoke script at `npm run smoke:remote`

## Inputs You Need Before Starting

Prepare these first:

1. The exact release commit you intend to ship.
2. The last known good deployed commit or tag.
3. A restored production-like snapshot in a staging or rehearsal environment.
4. The staging database connection strings:
   - `DATABASE_URL` for the running API
   - `DIRECT_URL` for Prisma schema commands and direct SQL patching
5. A staging API origin and smoke credentials:
   - `SMOKE_BASE_URL`
   - `SMOKE_API_KEY` when the environment requires it
   - `SMOKE_ADMIN_EMAIL`
   - `SMOKE_ADMIN_PASSWORD`
   - `SMOKE_ADMIN_MFA_CODE` when the smoke account requires TOTP

Do not run local destructive reset or seed commands against the restored snapshot. In particular, do not use `npm run test:db:reset`, `npm run test:db:seed`, `prisma db push --accept-data-loss`, or any reset workflow against a production-like target.

## 1. Freeze The Release Candidate

Work from the exact release commit:

```bash
git checkout <release-commit-or-tag>
npm ci
```

Record the release identifier you are rehearsing:

```bash
git rev-parse --short HEAD
```

## 2. Identify The Exact Database Change Set

List the schema and SQL assets that changed since the last known good release:

```bash
git diff --name-only <last-good-release>...HEAD -- prisma/schema.prisma prisma/*.sql
```

Interpret the result like this:

- If `prisma/schema.prisma` changed, expect a Prisma-managed schema delta.
- If one or more `prisma/*.sql` files changed, those files are part of the rehearsal and must be applied in release order.
- If neither changed, the migration portion is a no-op for this release, but you should still boot the built artifact and run smoke against the restored environment.

Use the changed-file list as the source of truth for the rehearsal notes you capture.

## 3. Point The Repo At The Restored Snapshot

Export the restored staging database URLs into the shell used for the rehearsal:

```bash
export DATABASE_URL='postgresql://...'
export DIRECT_URL='postgresql://...'
```

Validate the Prisma schema before touching the snapshot:

```bash
npx prisma validate --schema=prisma/schema.prisma
npx prisma generate
```

## 4. Preview The Prisma Schema Delta Before Applying It

When `prisma/schema.prisma` changed, preview the SQL Prisma wants to run:

```bash
npx prisma migrate diff \
  --from-url "$DIRECT_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/cirs-release-schema-diff.sql
```

Inspect the preview for destructive statements before applying anything:

```bash
rg -n "DROP |TRUNCATE|DELETE FROM|ALTER TABLE .* DROP" /tmp/cirs-release-schema-diff.sql
```

Decision rule:

- If the preview is additive and matches the release intent, continue.
- If the preview shows unexpected destructive changes, stop and review the release plan before applying anything.

## 5. Apply The Prisma-Managed Schema Changes

If the release requires schema changes represented in `prisma/schema.prisma`, apply them to the restored snapshot:

```bash
npx prisma db push
```

This repo's setup docs allow `db push` for controlled environments, but not blindly. The preview step above is the required safety check for a restored production-like database.

## 6. Apply Release SQL Patches In Order

Apply only the SQL patch files that are part of the release candidate. Use the release order from git history or the deployment plan. Run each file with `ON_ERROR_STOP` enabled so the rehearsal fails fast.

Example:

```bash
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/add-province-expansion.sql
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/backfill-tuguegarao-incident-locality-ids.sql
```

Notes:

- `prisma/add-province-expansion.sql` explicitly requires the related Prisma-created tables and columns to exist first, so run it after `npx prisma db push`.
- For other SQL files, use the file header comments and the release plan as the source of truth.
- If a patch includes backfill behavior, capture row counts or before and after spot checks in your rehearsal notes.

## 7. Build And Boot The Real Server Artifact

The rehearsal is not complete until the built server boots against the migrated snapshot.

Build the release candidate:

```bash
npm run build
```

Boot the bundled server artifact, not the dev server:

```bash
NODE_ENV=production npm start
```

Confirm the API health endpoint responds from the rehearsal environment:

```bash
curl -i "$SMOKE_BASE_URL/api/v1/health"
```

## 8. Run Black-Box Smoke Against The Rehearsal Environment

Export the smoke-test inputs and run the existing remote smoke script:

```bash
export SMOKE_BASE_URL='https://staging.example.gov'
export SMOKE_API_KEY='...'
export SMOKE_ADMIN_EMAIL='admin@example.gov'
export SMOKE_ADMIN_PASSWORD='...'
export SMOKE_ADMIN_MFA_CODE='123456'

npm run smoke:remote
```

The minimum passing proof for this rehearsal is:

1. `GET /api/v1/health` passes.
2. Admin login passes.
3. `GET /auth/me` passes.
4. `GET /users/capabilities` passes.
5. `GET /users` passes.
6. Follow-on admin checks such as reports and audit-log listing pass.

## 9. Rehearse The Failure Path Too

If a migration, boot, or smoke step fails:

1. Stop further schema changes.
2. Record the exact failing command and error.
3. Decide whether the issue is a bad release artifact, a bad migration plan, or bad rehearsal configuration.
4. Restore the snapshot again before retrying unless you can prove the failed step was read-only.

If rollback or restore is needed, use the shared runbook at `/home/nhad/xypes/shared/ROLLBACK_RESTORE_RUNBOOK.md` as the operational reference.

## 10. Evidence To Capture

Record these items for the release log:

1. Release commit or tag rehearsed.
2. Restored snapshot identifier and restore time.
3. The output of `git diff --name-only <last-good-release>...HEAD -- prisma/schema.prisma prisma/*.sql`.
4. Whether `prisma/schema.prisma` changed.
5. The SQL patch files applied and their execution order.
6. Whether the Prisma preview showed destructive SQL.
7. The result of `npx prisma db push`.
8. The result of each `psql -f` patch run.
9. The result of `npm run build`.
10. The result of `curl $SMOKE_BASE_URL/api/v1/health`.
11. The result of `npm run smoke:remote`.
12. Any rollback or restore action taken during the rehearsal.

## Exit Criteria

The restored-snapshot rehearsal passes only when all of these are true:

1. The restored snapshot is migrated to the exact release schema and patch level.
2. The built server artifact boots cleanly against that migrated snapshot.
3. Health passes.
4. Remote smoke passes.
5. Any failure during the drill has a documented rollback or restore path.
