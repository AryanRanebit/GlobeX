-- Migration: Add UN Comtrade Data Layer (TradeFlow & ComtradeCache)
-- Created: 2026-10-27

DO $$ BEGIN
    CREATE TYPE "DataSource" AS ENUM ('COMTRADE', 'SEED_CSV', 'MANUAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "comtrade_cache" (
    "id" TEXT NOT NULL,
    "queryHash" TEXT NOT NULL,
    "queryParams" JSONB NOT NULL,
    "responseBody" JSONB NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comtrade_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trade_flows" (
    "id" TEXT NOT NULL,
    "reporterCode" TEXT NOT NULL,
    "reporterName" TEXT NOT NULL,
    "partnerCode" TEXT NOT NULL,
    "partnerName" TEXT NOT NULL,
    "partnerIso3" TEXT,
    "period" TEXT NOT NULL,
    "flowCode" TEXT NOT NULL,
    "cmdCode" TEXT NOT NULL,
    "cmdDescription" TEXT,
    "tradeValueUsd" DOUBLE PRECISION NOT NULL,
    "netWeightKg" DOUBLE PRECISION,
    "qty" DOUBLE PRECISION,
    "qtyUnitCode" TEXT,
    "source" "DataSource" NOT NULL DEFAULT 'COMTRADE',
    "sourceDetail" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_flows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "comtrade_cache_queryHash_key" ON "comtrade_cache"("queryHash");
CREATE INDEX IF NOT EXISTS "comtrade_cache_expiresAt_idx" ON "comtrade_cache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "trade_flows_reporterCode_partnerCode_period_flowCode_cmdCode_key" ON "trade_flows"("reporterCode", "partnerCode", "period", "flowCode", "cmdCode");
CREATE INDEX IF NOT EXISTS "trade_flows_cmdCode_idx" ON "trade_flows"("cmdCode");
CREATE INDEX IF NOT EXISTS "trade_flows_period_idx" ON "trade_flows"("period");
CREATE INDEX IF NOT EXISTS "trade_flows_partnerIso3_idx" ON "trade_flows"("partnerIso3");
CREATE INDEX IF NOT EXISTS "trade_flows_tradeValueUsd_idx" ON "trade_flows"("tradeValueUsd");
