/// <reference types="node" />
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient, DataSource } from '@prisma/client';

const prisma = new PrismaClient();

function canonicalHash(params: Record<string, any>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha256').update(sorted).digest('hex');
}

async function seedDataset(jsonFilePath: string, defaultCmdCode: string, datasetLabel: string) {
  if (!fs.existsSync(jsonFilePath)) {
    console.warn(`⚠️ Dataset file not found: ${jsonFilePath}`);
    return 0;
  }

  const raw = fs.readFileSync(jsonFilePath, 'utf-8');
  const records = JSON.parse(raw);

  console.log(`📦 Seeding ${datasetLabel}: ${records.length} records...`);

  let count = 0;
  for (const r of records) {
    const reporterCode = String(r.reporterCode ?? '699');
    const partnerCode = String(r.partnerCode ?? '0');
    const period = String(r.period ?? '2025');
    const flowCode = String(r.flowCode ?? 'X');
    const cmdCode = String(r.cmdCode ?? defaultCmdCode);

    await prisma.tradeFlow.upsert({
      where: {
        reporterCode_partnerCode_period_flowCode_cmdCode: {
          reporterCode,
          partnerCode,
          period,
          flowCode,
          cmdCode,
        },
      },
      update: {
        reporterName: r.reporterDesc || 'India',
        partnerName: r.partnerDesc || 'Unknown',
        partnerIso3: r.partnerISO || null,
        cmdDescription: r.cmdDesc || null,
        tradeValueUsd: Number(r.primaryValue) || 0,
        netWeightKg: r.netWgt != null ? Number(r.netWgt) : null,
        qty: r.qty != null ? Number(r.qty) : null,
        qtyUnitCode: r.qtyUnitCode != null ? String(r.qtyUnitCode) : null,
        source: DataSource.SEED_CSV,
        sourceDetail: 'UN Comtrade 2025 Merchandise Exports (Offline Seed)',
      },
      create: {
        reporterCode,
        reporterName: r.reporterDesc || 'India',
        partnerCode,
        partnerName: r.partnerDesc || 'Unknown',
        partnerIso3: r.partnerISO || null,
        period,
        flowCode,
        cmdCode,
        cmdDescription: r.cmdDesc || null,
        tradeValueUsd: Number(r.primaryValue) || 0,
        netWeightKg: r.netWgt != null ? Number(r.netWgt) : null,
        qty: r.qty != null ? Number(r.qty) : null,
        qtyUnitCode: r.qtyUnitCode != null ? String(r.qtyUnitCode) : null,
        source: DataSource.SEED_CSV,
        sourceDetail: 'UN Comtrade 2025 Merchandise Exports (Offline Seed)',
      },
    });
    count++;
  }

  // Also cache the full dataset in comtrade_cache for queryHash
  const queryParams = {
    reporterCode: '699',
    period: '2025',
    flowCode: 'X',
    partner2Code: '0',
    customsCode: 'C00',
    motCode: '0',
    maxRecords: '500',
    includeDesc: 'true',
    cmdCode: defaultCmdCode,
  };
  const hash = canonicalHash(queryParams);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1-year offline TTL

  await prisma.comtradeCache.upsert({
    where: { queryHash: hash },
    update: {
      responseBody: { data: records },
      recordCount: records.length,
      expiresAt,
    },
    create: {
      queryHash: hash,
      queryParams: queryParams as any,
      responseBody: { data: records },
      recordCount: records.length,
      fetchedAt: now,
      expiresAt,
    },
  });

  console.log(`✅ Seeded ${count} records for ${datasetLabel} (cached with hash ${hash.slice(0, 8)}…)`);
  return count;
}

async function main() {
  console.log('🌱 Starting UN Comtrade trade flows seeding...');

  const dataDir = path.resolve(__dirname, '../../data');

  // 1. Total Exports
  const totalJson = path.join(dataDir, 'india_exports_total_by_partner_2025.json');
  await seedDataset(totalJson, 'TOTAL', 'Total merchandise exports (all goods)');

  // 2. HS62 (Apparel)
  const hs62Json = path.join(dataDir, 'india_exports_hs62_by_partner_2025.json');
  await seedDataset(hs62Json, '62', 'Apparel & clothing accessories (HS62)');

  const totalFlows = await prisma.tradeFlow.count();
  const cachedQueries = await prisma.comtradeCache.count();

  console.log('\n📊 Seeding summary:');
  console.log(`   Total TradeFlow rows in DB: ${totalFlows}`);
  console.log(`   Cached API queries in DB:   ${cachedQueries}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
