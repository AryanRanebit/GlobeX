-- ExportCase: one saved product-to-market workflow per user (roadmap step 2).
CREATE TABLE "export_cases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "hsCode" TEXT,
    "form" TEXT,
    "composition" TEXT,
    "quantity" TEXT,
    "targetCountry" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'product',
    "markets" JSONB,
    "requirements" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_cases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "export_cases_userId_idx" ON "export_cases"("userId");

ALTER TABLE "export_cases" ADD CONSTRAINT "export_cases_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
