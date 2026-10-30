/// <reference types="node" />
/**
 * Batch seed of destination market-size MIRROR data from UN Comtrade.
 *
 * For every HS code seeded in TradeFlow (India-reported exports), fetch the
 * top destinations' OWN import declarations from World (reporter =
 * destination, partner = 0, flow = 'M') and store them as TradeFlow rows.
 * This is genuine mirror data - the destination's customs declarations -
 * so it satisfies the data-semantics contract (India's exports are never
 * substituted as destination market size).
 *
 * Rate limits: one Comtrade call per (destination x HS code). Free tier is
 * ~500 calls/day at 1 req/sec; comtradeClient queues + backs off on 429.
 * Run once before the demo; re-run to widen coverage.
 *
 * Usage:  npm run seed:mirror            (defaults: top 25 destinations/HS)
 *         MIRROR_TOP_N=40 npm run seed:mirror
 */
import 'dotenv/config';
import { prisma } from '../src/config/database';
import { tradeService } from '../src/modules/trade/trade.service';

async function main() {
  const year = process.env.MIRROR_YEAR || '2025';
  const topN = Number(process.env.MIRROR_TOP_N) || 25;

  // Every HS code with India-reported export rows
  const cmdRows = await prisma.tradeFlow.findMany({
    where: { reporterCode: '699', flowCode: 'X', period: year },
    select: { cmdCode: true },
    distinct: ['cmdCode'],
  });
  const cmdCodes = cmdRows.map((r) => r.cmdCode);
  console.log(`Seeded HS codes for ${year}: ${cmdCodes.join(', ') || '(none!)'}`);

  const grand = { seeded: 0, requested: 0 };
  for (const hs of cmdCodes) {
    console.log(`\n=== Mirror seed HS ${hs} (top ${topN}) ===`);
    const result = await tradeService.seedMirrorImports({ hs, year, topN });
    grand.seeded += result.seeded;
    grand.requested += result.requestedDestinations;
    console.log(`  seeded ${result.seeded}/${result.requestedDestinations}`);
    if (result.missing.length > 0) {
      console.log(`  unavailable (${result.missing.length}):`);
      for (const m of result.missing) console.log(`    - ${m}`);
    }
  }

  const mirrorRows = await prisma.tradeFlow.count({
    where: { partnerCode: '0', flowCode: 'M' },
  });
  console.log(`\nDone: ${grand.seeded}/${grand.requested} mirror rows upserted this run.`);
  console.log(`Total destination-import (mirror) rows in DB: ${mirrorRows}`);
}

main()
  .catch((e) => {
    console.error('Mirror seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
