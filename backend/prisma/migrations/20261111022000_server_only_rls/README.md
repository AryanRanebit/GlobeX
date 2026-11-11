# Server-only table lockdown

Applied to Supabase project `vahziwepehzbzatxdmcq` on 2026-11-11 with owner approval. The separate paused project was not changed.

This app uses Express custom JWT authentication and Prisma database access, not Supabase Auth client-table access. RLS is enabled without client policies, and all table grants to `anon` and `authenticated` are revoked for the three named tables. Trusted backend database access remains intact. No rows are deleted or rewritten.

Apply migration.sql through a privileged database connection after creating the tables. The schema bootstrap and runtime history-table initializer carry the same hardening. Do not use `FORCE ROW LEVEL SECURITY` or change the backend role without separately testing its access model.

Verify after deployment:
- All three tables report relrowsecurity = true.
- `has_table_privilege` for anon and authenticated returns false for SELECT, INSERT, UPDATE, DELETE and TRUNCATE.
- A SELECT as each client role fails with permission denied; do not test writes against production data.
- Fresh demo login, History listing/replay, and cached trade-data reads still work.
- Security Advisor no longer flags the three missing-RLS errors.

This change does not establish whether anyone accessed data before the fix. The Free plan's one-day log retention cannot settle older exposure.
