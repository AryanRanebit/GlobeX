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
  tradeValueUsd: number;
  netWeightKg: number | null;
  period: string;
  cmdCode: string;
  cmdDescription: string | null;
  shareOfTotal?: number;
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
  };
}

export const tradeService = {
  /**
   * Returns export markets from the normalized TradeFlow table.
   *
   * By default, filters out "World" row from destination markets
   * so that destination rankings accurately show top partner countries (#1 USA, #2 UK, #3 UAE, etc.)
   * while preserving the global aggregate in meta.worldTotalUsd.
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

    const [rows, totalMarkets, worldRow, latestRow] = await Promise.all([
      prisma.tradeFlow.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: offset,
        take: limit,
        select: {
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
    ]);

    const worldTotal = worldRow?.tradeValueUsd ?? null;

    // Attach rank and share of total
    const rankedMarkets: TradeMarketRow[] = rows.map((r, idx) => ({
      rank: offset + idx + 1,
      partnerName: r.partnerName,
      partnerIso3: r.partnerIso3,
      tradeValueUsd: r.tradeValueUsd,
      netWeightKg: r.netWeightKg,
      period: r.period,
      cmdCode: r.cmdCode,
      cmdDescription: r.cmdDescription,
      shareOfTotal: worldTotal && worldTotal > 0 ? (r.tradeValueUsd / worldTotal) * 100 : undefined,
    }));

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
