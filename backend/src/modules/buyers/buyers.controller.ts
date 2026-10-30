import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { buyersService } from './buyers.service';
import { contactEnrichmentService } from './contactEnrichment.service';
import { sendSuccess } from '../../utils/apiResponse';

const discoverSchema = z.object({
  product: z.string().min(2, 'product is required and must be at least 2 characters'),
  targetCountries: z
    .array(z.string().min(1))
    .min(1, 'at least one target country is required'),
  category: z.string().optional(),
  hsCode: z.string().optional(),
  industry: z.string().optional(),
});

export const buyersController = {
  search: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await buyersService.search(req.query as any);
      sendSuccess(res, result.buyers, 'Buyers fetched', 200, { pagination: result.pagination });
    } catch (err) { next(err); }
  },

  discover: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = discoverSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }
      const { product, targetCountries, category, hsCode, industry } = parsed.data;
      const result = await buyersService.discover(req.user!.userId, product, targetCountries, {
        category,
        hsCode,
        industry,
      });
      sendSuccess(res, result, 'Buyers discovered');
    } catch (err) { next(err); }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const buyer = await buyersService.getById(req.params.id);
      sendSuccess(res, buyer);
    } catch (err) { next(err); }
  },

  /**
   * POST /api/v1/buyers/:id/enrich-contact
   * Find a public contact email: free website scrape first, Hunter.io
   * fallback when HUNTER_API_KEY is configured. Quota exhaustion comes back
   * as status 'credit_limit_reached' (HTTP 200) so the UI can explain it.
   */
  enrichContact: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await contactEnrichmentService.enrich(req.params.id);
      if (result.status === 'error' && result.note === 'Buyer not found') {
        res.status(404).json({ success: false, message: 'Buyer not found' });
        return;
      }
      sendSuccess(res, result, 'Contact enrichment complete');
    } catch (err) { next(err); }
  },
};
