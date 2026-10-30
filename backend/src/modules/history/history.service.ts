import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

/**
 * Analysis History service.
 *
 * Stores a snapshot of every market search and full analysis a signed-in
 * user runs, so the result can be reopened later WITHOUT re-calling
 * external APIs (UN Comtrade, Gemini). Saving is always best-effort:
 * a history failure must never break the feature being used.
 */

export type AnalysisType = 'market_search' | 'full_analysis';

// Re-running the same market search within this window updates nothing:
// it is treated as the same search, not a new history entry.
const SEARCH_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

// Cap stored snapshots so one huge result cannot bloat the table.
const MAX_RESULT_BYTES = 512 * 1024;

function capResult(result: unknown): unknown {
  try {
    const json = JSON.stringify(result);
    if (json.length <= MAX_RESULT_BYTES) return result;
    // Market search results are by far the largest payload; trim markets.
    if (result && typeof result === 'object' && Array.isArray((result as any).markets)) {
      return { ...(result as any), markets: (result as any).markets.slice(0, 100), truncated: true };
    }
  } catch {
    // fall through: store as-is rather than fail the save
  }
  return result;
}

export const historyService = {
  /**
   * Records a Market Intelligence search (GET /api/trade/markets) for a
   * signed-in user. Duplicate searches for the same HS code within the
   * dedupe window are skipped so casual browsing does not spam the list.
   */
  async recordMarketSearch(
    userId: string,
    hsCode: string,
    productName: string | null,
    result: unknown,
  ): Promise<void> {
    try {
      const since = new Date(Date.now() - SEARCH_DEDUPE_WINDOW_MS);
      const existing = await prisma.analysisHistory.findFirst({
        where: { userId, analysisType: 'market_search', hsCode, createdAt: { gte: since } },
        select: { id: true },
      });
      if (existing) return;

      await prisma.analysisHistory.create({
        data: {
          userId,
          hsCode,
          productName,
          analysisType: 'market_search',
          resultJson: capResult(result) as object,
        },
      });
    } catch (err) {
      logger.warn(`[History] Failed to record market search for user ${userId}: ${(err as Error).message}`);
    }
  },

  /**
   * Records a completed Run Full Analysis job. Called from the research
   * pipeline only after a successful result exists.
   */
  async recordFullAnalysis(
    userId: string,
    hsCode: string | null,
    productName: string | null,
    result: unknown,
  ): Promise<void> {
    try {
      await prisma.analysisHistory.create({
        data: {
          userId,
          hsCode,
          productName,
          analysisType: 'full_analysis',
          resultJson: capResult(result) as object,
        },
      });
    } catch (err) {
      logger.warn(`[History] Failed to record full analysis for user ${userId}: ${(err as Error).message}`);
    }
  },

  /**
   * Lists the user's history entries, newest first. Result payloads are
   * excluded; fetch a single entry for the stored result.
   */
  async listForUser(userId: string, limit = 50, offset = 0) {
    const take = Math.min(Math.max(limit, 1), 100);
    const [entries, total] = await Promise.all([
      prisma.analysisHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
        skip: offset,
        select: {
          id: true,
          hsCode: true,
          productName: true,
          analysisType: true,
          createdAt: true,
        },
      }),
      prisma.analysisHistory.count({ where: { userId } }),
    ]);
    return { entries, total };
  },

  /**
   * Returns one stored entry including its result snapshot, strictly
   * scoped to the requesting user.
   */
  async getForUser(userId: string, id: string) {
    return prisma.analysisHistory.findFirst({
      where: { id, userId },
    });
  },
};
