import { z } from 'zod';

export const analyzeMarketSchema = z.object({
  product: z.string().min(2, 'Product description is too short (min 2 characters)').max(1000, 'Product description too long (max 1000 characters)'),
  productId: z.string().uuid().optional(),
  targetRegions: z.array(z.string()).optional(), // e.g. ["Europe", "Southeast Asia"]
  description: z.string().max(1000).optional(),
});

export type AnalyzeMarketDto = z.infer<typeof analyzeMarketSchema>;
