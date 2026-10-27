import { createApp } from '../src/app';
import request from 'supertest';
import { prisma } from '../src/config/database';

async function main() {
  const app = createApp();

  console.log('--- 1. HS62 Apparel Sample (Top 3) ---');
  const hs62 = await request(app).get('/api/v1/trade/markets?hs=62&year=2025&limit=3');
  console.log(JSON.stringify(hs62.body, null, 2));

  console.log('\n--- 2. TOTAL Exports Sample (Top 3) ---');
  const total = await request(app).get('/api/trade/markets?hs=TOTAL&year=2025&limit=3');
  console.log(JSON.stringify(total.body, null, 2));

  console.log('\n--- 3. Top 5 Destination Countries for HS62 directly from DB ---');
  const top5 = await prisma.tradeFlow.findMany({
    where: { reporterCode: '699', period: '2025', cmdCode: '62', partnerName: { not: 'World' } },
    orderBy: { tradeValueUsd: 'desc' },
    take: 5,
    select: {
      partnerName: true,
      partnerIso3: true,
      tradeValueUsd: true,
      netWeightKg: true,
    },
  });
  console.log(JSON.stringify(top5, null, 2));

  console.log('\n--- 4. DB Row Counts ---');
  const totalRows = await prisma.tradeFlow.count();
  const hs62Rows = await prisma.tradeFlow.count({ where: { cmdCode: '62' } });
  const totalCmdRows = await prisma.tradeFlow.count({ where: { cmdCode: 'TOTAL' } });
  const cacheRows = await prisma.comtradeCache.count();
  console.log({ totalRows, hs62Rows, totalCmdRows, cacheRows });

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
