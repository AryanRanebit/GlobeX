import { z } from 'zod';

// Roadmap step 2: one saved Export Case per product-to-market plan.
// Unknown stays unknown: every field except productName is optional and
// absent means "not provided", never a guessed value.

const hsCodePattern = /^\d{2,10}$/;

export const exportCaseStages = ['product', 'markets', 'requirements', 'leads', 'outreach'] as const;
export type ExportCaseStage = (typeof exportCaseStages)[number];

export const createExportCaseSchema = z.object({
  productName: z.string().trim().min(2, 'Product name is too short').max(200),
  // HS codes are stored digits-only (dots stripped); absent means unconfirmed.
  hsCode: z
    .string()
    .trim()
    .transform((v) => v.replace(/[.\s]/g, ''))
    .refine((v) => v === '' || hsCodePattern.test(v), 'HS code must be 2 to 10 digits')
    .transform((v) => (v === '' ? undefined : v))
    .optional(),
  form: z.string().trim().max(120).optional(),
  composition: z.string().trim().max(500).optional(),
  quantity: z.string().trim().max(120).optional(),
  targetCountry: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateExportCaseSchema = z.object({
  productName: z.string().trim().min(2).max(200).optional(),
  hsCode: z
    .string()
    .trim()
    .transform((v) => v.replace(/[.\s]/g, ''))
    .refine((v) => v === '' || hsCodePattern.test(v), 'HS code must be 2 to 10 digits')
    .transform((v) => (v === '' ? null : v))
    .optional(),
  form: z.string().trim().max(120).nullish(),
  composition: z.string().trim().max(500).nullish(),
  quantity: z.string().trim().max(120).nullish(),
  targetCountry: z.string().trim().max(120).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  stage: z.enum(exportCaseStages).optional(),
  // Shortlisted market snapshots and requirement checklists, saved by the
  // frontend from real module results. Capped loose JSON; never required.
  markets: z.array(z.record(z.unknown())).max(50).nullish(),
  requirements: z.array(z.record(z.unknown())).max(100).nullish(),
});

export type CreateExportCaseInput = z.infer<typeof createExportCaseSchema>;
export type UpdateExportCaseInput = z.infer<typeof updateExportCaseSchema>;
