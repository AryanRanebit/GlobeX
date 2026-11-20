-- Password reset tokens + lead evidence (roadmap steps 4/5, offline mechanics).
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "lead_evidence" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "summary" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_evidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_evidence_leadId_idx" ON "lead_evidence"("leadId");

ALTER TABLE "lead_evidence" ADD CONSTRAINT "lead_evidence_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same server-only pattern as 20261111022000_server_only_rls and
-- 20261120121000_export_cases: reachable only through the trusted Prisma
-- backend; anon/authenticated Supabase roles get nothing. Role-conditional so
-- the migration also applies outside Supabase (CI, local dev).
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_evidence" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE "password_reset_tokens" FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE "lead_evidence" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE "password_reset_tokens" FROM authenticated';
    EXECUTE 'REVOKE ALL ON TABLE "lead_evidence" FROM authenticated';
  END IF;
END $$;
