import { z } from 'zod';
import { LeadStatus } from '../../types/prisma';

export const createLeadSchema = z.object({
  buyerId: z.string().uuid(),
  exportCaseId: z.string().uuid().nullish(),
  productId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
  nextAction: z.string().max(500).optional(),
  nextActionAt: z.string().datetime().optional(),
});

export const updateLeadSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  exportCaseId: z.string().uuid().nullable().optional(),
  leadScore: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
  nextAction: z.string().max(500).optional(),
  nextActionAt: z.string().datetime().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

export const leadEvidenceKinds = ['directory-listing', 'trade-data', 'website', 'manual', 'other'] as const;

export const createLeadEvidenceSchema = z.object({
  kind: z.enum(leadEvidenceKinds),
  sourceUrl: z.string().url().max(2000).optional(),
  summary: z.string().min(3).max(1000),
  capturedAt: z.string().datetime().optional(),
});

export type CreateLeadEvidenceDto = z.infer<typeof createLeadEvidenceSchema>;

export type CreateLeadDto = z.infer<typeof createLeadSchema>;
export type UpdateLeadDto = z.infer<typeof updateLeadSchema>;
