import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requirementsService } from './requirements.service';
import { sendSuccess } from '../../utils/apiResponse';

const lookupQuery = z.object({
  hs: z.string().regex(/^[0-9.\s]{2,12}$/, 'hs must be an HS code (2-10 digits)'),
  destination: z.string().trim().min(2).max(40),
});

export const requirementsController = {
  lookup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hs, destination } = lookupQuery.parse(req.query);
      const data = requirementsService.lookup(hs, destination);
      sendSuccess(res, data, data.covered ? 'Partial source-checked guidance (not exhaustive; confirm applicability per shipment)' : 'No source-checked coverage for this product/destination pair');
    } catch (err) { next(err); }
  },

  coverage: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, requirementsService.coverage(), 'Pairs with verified requirements coverage');
    } catch (err) { next(err); }
  },
};
