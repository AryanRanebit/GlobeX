/**
 * Trade Service
 *
 * Queries normalized TradeFlow table for market data.
 * Every response carries source attribution metadata.
 */

import { prisma } from '../../config/database';
import { comtradeClient } from './comtrade.client';
import { logger } from '../../utils/logger';
import { selectMirrorPerReporter, computeIndiaShare } from './mirrorMetrics';

export interface TradeMarketRow {
  rank?: number;
  partnerName: string;
  partnerIso3: string | null;
  tradeValueUsd: number; // Kept for backwards compatibility: India-reported exports
  indiaExportValueUsd: number;
  indiaExportLabel: string;
  destinationMarketSizeUsd: number | null;
  destinationMarketSizeStatus: 'Not available from free data' | 'Available (Destination-reported imports CIF)';
  /** Period the destination import figure belongs to (may differ from requested year) */
  destinationMarketSizePeriod: string | null;
  indiaShareOfDestinationImportPct: number | null;
  indiaShareStatus: 'Not available from free data' | 'Available';
  shareOfIndiaExportsPct?: number;
  shareOfTotal?: number; // Kept for backwards compatibility
  netWeightKg: number | null;
  period: string;
  cmdCode: string;
  cmdDescription: string | null;
}

export interface TradeMarketsResponse {
  markets: TradeMarketRow[];
  meta: {
    source: string;
    citation: string;
    reporter: string;
    period: string;
    cmdCode: string;
    cmdDescription?: string;
    flowCode: string;
    totalMarkets: number;
    worldTotalUsd: number | null;
    fetchedAt: string;
    origin: 'seed' | 'api-cache' | 'live';
    dataSemantics: {
      indiaReportedExports: string;
      destinationMarketSize: string;
      indiaShareOfDestination: string;
    };
  };
}

export const tradeService = {
  /**
   * Returns export markets from the normalized TradeFlow table.
   *
   * By default, filters out "World" row from destination markets
   * so that destination rankings accurately show top partner countries (#1 USA, #2 UK, #3 UAE, etc.)
   * while preserving the global aggregate in meta.worldTotalUsd.
   *
   * CRITICAL DATA SEMANTICS CONTRACT:
   * - India-reported exports (FOB) represent what India exported to partner.
   * - Destination market size MUST be sourced from destination-reported imports from World (flow='M', partner='0').
   * - If destination-reported import data is missing, destinationMarketSizeStatus = "Not available from free data"
   *   and destinationMarketSizeUsd = null. The India export figure is NEVER substituted as market size.
   */
  async getMarkets(options: {
    hs?: string;
    year?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'tradeValueUsd' | 'netWeightKg';
    sortDir?: 'asc' | 'desc';
    search?: string;
    includeWorld?: boolean;
  }): Promise<TradeMarketsResponse> {
    const {
      hs = '62',
      year = '2025',
      limit = 50,
      offset = 0,
      sortBy = 'tradeValueUsd',
      sortDir = 'desc',
      search,
      includeWorld = false,
    } = options;

    const where: any = {
      reporterCode: '699', // India
      period: year,
      flowCode: 'X', // Exports
      cmdCode: hs,
    };

    if (!includeWorld) {
      where.partnerName = { not: 'World' };
    }

    if (search) {
      where.partnerName = {
        ...(where.partnerName || {}),
        contains: search,
        mode: 'insensitive',
      };
    }

    const [rows, totalMarkets, worldRow, latestRow, destinationImports] = await Promise.all([
      prisma.tradeFlow.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: offset,
        take: limit,
        select: {
          partnerCode: true,
          partnerName: true,
          partnerIso3: true,
          tradeValueUsd: true,
          netWeightKg: true,
          period: true,
          cmdCode: true,
          cmdDescription: true,
          source: true,
          fetchedAt: true,
        },
      }),
      prisma.tradeFlow.count({ where }),
      prisma.tradeFlow.findFirst({
        where: { reporterCode: '699', period: year, flowCode: 'X', cmdCode: hs, partnerName: 'World' },
        select: { tradeValueUsd: true, fetchedAt: true },
      }),
      prisma.tradeFlow.findFirst({
        where: { reporterCode: '699', period: year, cmdCode: hs },
        orderBy: { fetchedAt: 'desc' },
        select: { fetchedAt: true, source: true, cmdDescription: true },
      }),
      // Destination-reported imports from World (flow='M', partner='0').
      // All periods fetched; per reporter we prefer the requested year and
      // otherwise take the latest seeded period (period surfaced per row).
      prisma.tradeFlow.findMany({
        where: { partnerCode: '0', flowCode: 'M', cmdCode: hs },
        orderBy: { period: 'desc' },
        select: { reporterCode: true, tradeValueUsd: true, period: true },
      }),
    ]);

    const worldTotal = worldRow?.tradeValueUsd ?? null;

    // Build lookup for destination-reported figures if present.
    // Rows arrive newest-first; keep the requested-year row when present,
    // otherwise the most recent period available for that reporter.
    const mirrorByReporter = selectMirrorPerReporter(destinationImports, year);

    // Attach rankings and enforce strict separation between India exports and destination market size
    const rankedMarkets: TradeMarketRow[] = rows.map((r, idx) => {
      const mirror = mirrorByReporter.get(r.partnerCode) ?? null;
      const destImportTotal = mirror && mirror.value > 0 ? mirror.value : null;
      const destImportPeriod = mirror?.period ?? null;

      const hasDestData = destImportTotal !== null;
      // India's market share: India-reported exports to the destination
      // divided by the destination's own import declarations from World
      // (mirror data). Never a proxy: null unless genuine mirror data exists.
      const indiaSharePct = computeIndiaShare(r.tradeValueUsd, destImportTotal);

      const shareOfIndiaExports = worldTotal && worldTotal > 0
        ? (r.tradeValueUsd / worldTotal) * 100
        : undefined;

      return {
        rank: offset + idx + 1,
        partnerName: r.partnerName,
        partnerIso3: r.partnerIso3,
        tradeValueUsd: r.tradeValueUsd,
        indiaExportValueUsd: r.tradeValueUsd,
        indiaExportLabel: 'India-Reported Exports (FOB)',
        destinationMarketSizeUsd: destImportTotal,
        destinationMarketSizeStatus: hasDestData ? 'Available (Destination-reported imports CIF)' : 'Not available from free data',
        destinationMarketSizePeriod: hasDestData ? destImportPeriod : null,
        indiaShareOfDestinationImportPct: indiaSharePct,
        indiaShareStatus: indiaSharePct !== null ? 'Available' : 'Not available from free data',
        shareOfIndiaExportsPct: shareOfIndiaExports,
        shareOfTotal: shareOfIndiaExports, // Compatibility
        netWeightKg: r.netWeightKg,
        period: r.period,
        cmdCode: r.cmdCode,
        cmdDescription: r.cmdDescription,
      };
    });

    // Determine provenance origin flag
    let origin: 'seed' | 'api-cache' | 'live' = 'seed';
    if (latestRow?.source === 'COMTRADE') {
      origin = 'api-cache';
    }

    return {
      markets: rankedMarkets,
      meta: {
        source: 'UN Comtrade',
        citation: `Source: UN Comtrade, United Nations Statistics Division, India merchandise exports, calendar year ${year}, HS ${hs === 'TOTAL' ? 'all goods' : hs}. https://comtradeplus.un.org/`,
        reporter: 'India',
        period: year,
        cmdCode: hs,
        cmdDescription: latestRow?.cmdDescription || (hs === '62' ? 'Apparel and clothing accessories; not knitted or crocheted' : undefined),
        flowCode: 'X',
        totalMarkets,
        worldTotalUsd: worldTotal,
        fetchedAt: latestRow?.fetchedAt?.toISOString() ?? new Date().toISOString(),
        origin,
        dataSemantics: {
          indiaReportedExports: 'Merchandise exports reported by India (FOB). Does NOT represent destination total market size.',
          destinationMarketSize: 'Total imports declared by destination from World (flow=M, partner=0). Shows "Not available from free data" if destination import series is unseeded.',
          indiaShareOfDestination: 'India-reported exports to destination / destination-reported imports from World (mirror). Shows "Not available from free data" when the destination import series is unseeded.',
        },
      },
    };
  },

  /**
   * Fetch fresh data from Comtrade API and upsert into TradeFlow table.
   * Intended for admin/cron use only — not called on every request.
   */
  async refreshFromApi(cmdCode: string = 'TOTAL', period: string = '2025'): Promise<number> {
    const records = await comtradeClient.query({ cmdCode, period });

    let upserted = 0;
    for (const r of records) {
      await prisma.tradeFlow.upsert({
        where: {
          reporterCode_partnerCode_period_flowCode_cmdCode: {
            reporterCode: String(r.reporterCode),
            partnerCode: String(r.partnerCode),
            period: String(r.period),
            flowCode: r.flowCode || 'X',
            cmdCode: r.cmdCode || cmdCode,
          },
        },
        update: {
          tradeValueUsd: r.primaryValue || 0,
          netWeightKg: r.netWgt ?? null,
          qty: r.qty ?? null,
          qtyUnitCode: r.qtyUnitCode != null ? String(r.qtyUnitCode) : null,
          partnerName: r.partnerDesc || 'Unknown',
          partnerIso3: r.partnerISO || r.partnerISO3 || null,
          reporterName: r.reporterDesc || 'India',
          cmdDescription: r.cmdDesc || null,
          source: 'COMTRADE',
          sourceDetail: `UN Comtrade, extracted ${new Date().toISOString().slice(0, 10)}`,
          fetchedAt: new Date(),
        },
        create: {
          reporterCode: String(r.reporterCode),
          reporterName: r.reporterDesc || 'India',
          partnerCode: String(r.partnerCode),
          partnerName: r.partnerDesc || 'Unknown',
          partnerIso3: r.partnerISO || r.partnerISO3 || null,
          period: String(r.period),
          flowCode: r.flowCode || 'X',
          cmdCode: r.cmdCode || cmdCode,
          cmdDescription: r.cmdDesc || null,
          tradeValueUsd: r.primaryValue || 0,
          netWeightKg: r.netWgt ?? null,
          qty: r.qty ?? null,
          qtyUnitCode: r.qtyUnitCode != null ? String(r.qtyUnitCode) : null,
          source: 'COMTRADE',
          sourceDetail: `UN Comtrade, extracted ${new Date().toISOString().slice(0, 10)}`,
        },
      });
      upserted++;
    }

    return upserted;
  },

  /**
   * Seed destination market-size mirror data: for the top destinations of
   * Indian exports (by value) of one HS code, fetch each destination's OWN
   * import declarations from World (reporter=destination, partner=0,
   * flow='M') from UN Comtrade and store them as TradeFlow rows.
   *
   * This is genuine mirror data - never a proxy - so getMarkets can replace
   * "Not available from free data" with real destination market sizes and
   * India market shares. Batch/admin use only: each destination costs one
   * Comtrade call (free tier ~500/day, 1 req/sec), so run it as a seed,
   * never per user request.
   */
  async seedMirrorImports(options: {
    hs: string;
    year?: string;
    topN?: number;
  }): Promise<{
    hs: string;
    requestedDestinations: number;
    seeded: number;
    missing: string[];
    periodUsed: Record<string, string>;
  }> {
    const { hs } = options;
    const year = options.year || '2025';
    const topN = options.topN ?? 25;

    // Top destinations for Indian exports of this HS code
    const indiaExports = await prisma.tradeFlow.findMany({
      where: {
        reporterCode: '699',
        period: year,
        flowCode: 'X',
        cmdCode: hs,
        partnerName: { not: 'World' },
      },
      orderBy: { tradeValueUsd: 'desc' },
      take: topN,
      select: { partnerCode: true, partnerName: true, partnerIso3: true },
    });

    const missing: string[] = [];
    const periodUsed: Record<string, string> = {};
    let seeded = 0;

    for (const dest of indiaExports) {
      // Genuine mirror query: reporter = destination, partner = World, imports
      const fetchYear = async (y: string) =>
        comtradeClient.query({
          reporterCode: dest.partnerCode,
          period: y,
          cmdCode: hs,
          flowCode: 'M',
          partnerCode: '0',
          maxRecords: '10',
        });

      let records: any[] = [];
      let usedPeriod = year;
      try {
        records = (await fetchYear(year)).filter((r: any) => Number(r.partnerCode) === 0);
        // Fall back one year when the destination has not reported the
        // requested year yet (kept under its true period, never relabeled).
        if (records.length === 0) {
          const prev = String(Number(year) - 1);
          records = (await fetchYear(prev)).filter((r: any) => Number(r.partnerCode) === 0);
          usedPeriod = prev;
        }
      } catch (err) {
        logger.warn(`[MirrorSeed] ${dest.partnerName} (${dest.partnerCode}) HS ${hs}: ${(err as Error).message}`);
        missing.push(`${dest.partnerName}: fetch failed`);
        continue;
      }

      const rec = records[0];
      if (!rec || !(Number(rec.primaryValue) > 0)) {
        missing.push(`${dest.partnerName}: no ${year}/${Number(year) - 1} import declaration in Comtrade`);
        continue;
      }

      await prisma.tradeFlow.upsert({
        where: {
          reporterCode_partnerCode_period_flowCode_cmdCode: {
            reporterCode: dest.partnerCode,
            partnerCode: '0',
            period: usedPeriod,
            flowCode: 'M',
            cmdCode: hs,
          },
        },
        update: {
          reporterName: dest.partnerName,
          partnerName: 'World',
          partnerIso3: null,
          tradeValueUsd: Number(rec.primaryValue) || 0,
          netWeightKg: rec.netWgt != null ? Number(rec.netWgt) : null,
          cmdDescription: rec.cmdDesc || null,
          source: 'COMTRADE',
          sourceDetail: `UN Comtrade mirror (destination-reported imports CIF), extracted ${new Date().toISOString().slice(0, 10)}`,
          fetchedAt: new Date(),
        },
        create: {
          reporterCode: dest.partnerCode,
          reporterName: dest.partnerName,
          partnerCode: '0',
          partnerName: 'World',
          partnerIso3: null,
          period: usedPeriod,
          flowCode: 'M',
          cmdCode: hs,
          cmdDescription: rec.cmdDesc || null,
          tradeValueUsd: Number(rec.primaryValue) || 0,
          netWeightKg: rec.netWgt != null ? Number(rec.netWgt) : null,
          source: 'COMTRADE',
          sourceDetail: `UN Comtrade mirror (destination-reported imports CIF), extracted ${new Date().toISOString().slice(0, 10)}`,
        },
      });
      periodUsed[dest.partnerName] = usedPeriod;
      seeded++;
    }

    return {
      hs,
      requestedDestinations: indiaExports.length,
      seeded,
      missing,
      periodUsed,
    };
  },
};
