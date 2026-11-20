-- Case-to-lead association: a lead can be tracked under one export case,
-- carrying its own follow-up state (status, nextAction, nextActionAt).
ALTER TABLE "leads" ADD COLUMN "exportCaseId" TEXT;

CREATE INDEX "leads_exportCaseId_idx" ON "leads"("exportCaseId");

ALTER TABLE "leads" ADD CONSTRAINT "leads_exportCaseId_fkey"
    FOREIGN KEY ("exportCaseId") REFERENCES "export_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
