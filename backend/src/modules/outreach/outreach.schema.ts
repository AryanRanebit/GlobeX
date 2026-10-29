import { z } from 'zod';

export const generateOutreachSchema = z.object({
  buyerId: z.string().uuid(),
  tone: z.enum(['professional', 'friendly', 'formal']).default('professional'),
  language: z.string().length(2).default('en'),
  productId: z.string().uuid().optional(),
  customContext: z.string().max(500).optional(),
});

export type GenerateOutreachDto = z.infer<typeof generateOutreachSchema>;

export const localizeOutreachSchema = z.object({
  subject: z.string().max(200).optional(),
  content: z.string().min(1).max(4000),
  targetLanguage: z.string().min(2).max(40),
  targetCountry: z.string().max(60).optional(),
});

export type LocalizeOutreachDto = z.infer<typeof localizeOutreachSchema>;
