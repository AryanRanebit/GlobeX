import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { tariffService } from './tariff.service';
import { sendSuccess } from '../../utils/apiResponse';

const tariffQuerySchema = z.object({
  hs: z.string().min(2, 'hs is required (2-6 digit HS code)'),
  country: z.string().min(2, 'country is required (ISO alpha-2, alpha-3, or numeric)'),
});

export const tariffController = {
  /**
   * GET /api/v1/tariff?hs=100630&country=SA
   * MFN + India-preferential tariff from WITS (free, keyless), with India
   * FTA overlay context. Public like /api/trade/markets; global rate limit
   * applies. WITS failures return 200 with status 'unavailable' so the UI
   * can degrade gracefully.
   */
  getTariff: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = tariffQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }
      const info = await tariffService.getTariff(parsed.data.hs, parsed.data.country);
      sendSuccess(res, info, 'Tariff retrieved');
    } catch (err) {
      next(err);
    }
  },
};
