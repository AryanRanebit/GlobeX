/**
 * Trade Service
 *
 * Queries normalized TradeFlow table for market data.
 * Every response carries source attribution metadata.
 */

import { prisma } from '../../config/database';
import { comtradeClient } from './comtrade.client';

export interface TradeMarketRow {
  rank?: number;
  partnerName: string;
  partnerIso3: string | null;
  tradeValueUsd: number; // Kept for backwards compatibility: India-reported exports
  indiaExportValueUsd: number;
  indiaExportLabel: string;
  destinationMarketSizeUsd: number | null;
  destinationMarketSizeStatus: 'Not available from free data' | 'Available (Destination-reported imports CIF)';
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

    const [rows, totalMarkets, worldRow, latestRow, destinationImports, destinationFromIndia] = await Promise.all([
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
      // Look up destination-reported imports from World (flow='M', partner='0')
      prisma.tradeFlow.findMany({
        where: { partnerCode: '0', period: year, flowCode: 'M', cmdCode: hs },
        select: { reporterCode: true, tradeValueUsd: true },
      }),
      // Look up destination-reported imports from India (flow='M', partner='699')
      prisma.tradeFlow.findMany({
        where: { partnerCode: '699', period: year, flowCode: 'M', cmdCode: hs },
        select: { reporterCode: true, tradeValueUsd: true },
      }),
    ]);

    const worldTotal = worldRow?.tradeValueUsd ?? null;

    // Build lookup maps for destination-reported figures if present
    const destMarketSizeMap = new Map<string, number>();
    for (const d of destinationImports) {
      destMarketSizeMap.set(d.reporterCode, d.tradeValueUsd);
    }

    const destFromIndiaMap = new Map<string, number>();
    for (const d of destinationFromIndia) {
      destFromIndiaMap.set(d.reporterCode, d.tradeValueUsd);
    }

    // Attach rankings and enforce strict separation between India exports and destination market size
    const rankedMarkets: TradeMarketRow[] = rows.map((r, idx) => {
      const destImportTotal = destMarketSizeMap.get(r.partnerCode) ?? null;
      const destImportFromIndia = destFromIndiaMap.get(r.partnerCode) ?? null;

      const hasDestData = destImportTotal !== null && destImportTotal > 0;
      const indiaSharePct = hasDestData && destImportFromIndia !== null
        ? (destImportFromIndia / destImportTotal!) * 100
        : null;

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
          indiaShareOfDestination: 'Destination imports from India / Destination imports from World. Shows "Not available from free data" when destination import series is unseeded.',
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
          qtyUnitCode: r.qtyUnitCode ?? null,
          partnerName: r.partnerDesc || 'Unknown',
          partnerIso3: r.partnerISO3 || null,
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
          partnerIso3: r.partnerISO3 || null,
          period: String(r.period),
          flowCode: r.flowCode || 'X',
          cmdCode: r.cmdCode || cmdCode,
          cmdDescription: r.cmdDesc || null,
          tradeValueUsd: r.primaryValue || 0,
          netWeightKg: r.netWgt ?? null,
          qty: r.qty ?? null,
          qtyUnitCode: r.qtyUnitCode ?? null,
          source: 'COMTRADE',
          sourceDetail: `UN Comtrade, extracted ${new Date().toISOString().slice(0, 10)}`,
        },
      });
      upserted++;
    }

    return upserted;
  },
};
