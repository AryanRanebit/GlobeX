import { Request, Response, NextFunction } from 'express';
import { tradeService } from './trade.service';
import { sendSuccess } from '../../utils/apiResponse';

/**
 * Trade Controller
 *
 * Exposes real UN Comtrade export flows with full source provenance and attribution.
 */
export const tradeController = {
  /**
   * GET /api/v1/trade/markets (also /api/trade/markets)
   *
   * Query params:
   *   hs: string (e.g. "62" for apparel, "TOTAL" for all merchandise; default "62")
   *   year: string (default "2025")
   *   limit: number (default 50)
   *   offset: number (default 0)
   *   sortBy: "tradeValueUsd" | "netWeightKg" (default "tradeValueUsd")
   *   sortDir: "asc" | "desc" (default "desc")
   *   search: string (case-insensitive search by partner country)
   *   includeWorld: "true" | "false" (default false, so destination ranking begins at #1 USA)
   */
  getMarkets: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hs = ((req.query.hs as string) || (req.query.cmdCode as string) || '62').replace(/\./g, '');
      const year = (req.query.year as string) || (req.query.period as string) || '2025';
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const sortBy = req.query.sortBy === 'netWeightKg' ? 'netWeightKg' : 'tradeValueUsd';
      const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
      const search = req.query.search as string | undefined;
      const includeWorld = req.query.includeWorld === 'true';

      const result = await tradeService.getMarkets({
        hs,
        year,
        limit,
        offset,
        sortBy,
        sortDir,
        search,
        includeWorld,
      });

      return sendSuccess(
        res,
        result.markets,
        `Retrieved ${result.markets.length} export markets for HS ${hs} (${year})`,
        200,
        result.meta,
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/trade/refresh
   *
   * Admin-only or background refresh from UN Comtrade API.
   */
  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hs = (req.body.hs as string) || '62';
      const year = (req.body.year as string) || '2025';
      const count = await tradeService.refreshFromApi(hs, year);
      return sendSuccess(res, { count, hs, year }, `Successfully refreshed ${count} records from UN Comtrade API.`);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/trade/seed-mirror
   *
   * Admin-only batch seed of destination market-size mirror data
   * (destination-reported imports from World) for the top export
   * destinations of one HS code. Each destination costs one Comtrade call.
   */
  seedMirror: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hs = (req.body.hs as string) || '62';
      const year = (req.body.year as string) || '2025';
      const topN = Math.min(Number(req.body.topN) || 25, 100);
      const result = await tradeService.seedMirrorImports({ hs, year, topN });
      return sendSuccess(
        res,
        result,
        `Mirror seed for HS ${hs}: ${result.seeded}/${result.requestedDestinations} destinations seeded.`,
      );
    } catch (err) {
      next(err);
    }
  },
};
