# Applying migrations to a live database (deployment notes)

Status: scratch-verified procedure. The live database has NOT been touched and these
steps have NOT been run against it. Every command below was tested on a disposable
local Postgres seeded with a reconstruction of the pre-change schema.

## Background

- This repo's `prisma/migrations` history is incomplete: the original schema was
  created out-of-band (not via `prisma migrate`), so the live database has no
  `_prisma_migrations` table at all.
- Prisma version pinned in this repo: 5.22.0 (`npx prisma --version`).

## What does NOT work (verified on scratch)

- `npx prisma migrate deploy` against the live-shaped database fails with **P3005**
  ("database schema is not empty") because there is no `_prisma_migrations` table.
  Prisma's documented remedy is baselining (marking existing migrations as already
  applied) rather than replaying them.
- `npx prisma migrate diff --from-url <live> --to-migrations ./prisma/migrations`
  is unusable here: it errors because `prisma/migrations/migration_lock.toml` is
  absent from this repo. Do not present a diff-based procedure as an option.

## Verified procedure (tested on scratch 2026-11-20)

Preconditions: take a full backup first (`pg_dump`) and confirm with the database
owner that the schema objects the historical migration
`20261111022000_server_only_rls` refers to already exist on live. On a live Supabase
project the `anon`/`authenticated` roles exist; the migration already guards
`REVOKE` statements so it does not fail if they are missing, but the objects the
policies target must exist.

1. Back up the live database:
   `pg_dump "$DATABASE_URL" > backup-$(date +%F).sql`
2. Baseline: record the historical migration as already applied (does not re-run it):
   `npx prisma migrate resolve --applied 20261111022000_server_only_rls`
   Verified: this creates `_prisma_migrations` and inserts the row as finished.
3. Apply the pending migration:
   `npx prisma migrate deploy`
   Verified: after step 2, deploy applies only `20261120121000_export_cases` and
   records it. Post-state verified: both rows present in `_prisma_migrations`,
   `export_cases` table created with row-level security enabled.
4. Post-check (read-only, applies nothing):
   `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script`
   Verified: prints `-- This is an empty migration.` when live matches the schema,
   and prints the differences as DDL when it does not. This is a report, not a
   mutation — it does not change the database.

## Unresolved risk — name it, don't paper over it

- Live drift is unknown. The scratch baseline was reconstructed from this repo's
  schema, not observed from the live database. If the live schema differs from
  `prisma/schema.prisma` in any way, step 4 will show the differences. **Stop
  there.** Do not apply the printed DDL blindly: resolve the drift deliberately
  (decide whether live or the repo is authoritative for each difference) before
  any further migration work.
- Because history is incomplete, any future `prisma migrate dev`-generated
  migration assumes the repo schema is ground truth. That assumption holds only
  if step 4 comes back clean, or after drift is reconciled.
