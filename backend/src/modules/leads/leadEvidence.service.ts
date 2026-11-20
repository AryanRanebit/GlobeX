import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { leadsRepository } from '../leads/leads.repository';
import type { CreateLeadEvidenceDto } from '../leads/leads.schema';

/**
 * Lead evidence: the record of WHERE a lead signal came from (a directory
 * listing, trade data, a website, a manual note). Evidence is what lets the
 * product say "verified" honestly — a lead with no evidence stays unverified.
 *
 * Owner scoping: every operation resolves the lead with BOTH its id and the
 * requester's userId before touching evidence rows, so one user can never
 * read or write another user's evidence, even by guessing ids.
 */
export const leadEvidenceService = {
  async add(userId: string, leadId: string, dto: CreateLeadEvidenceDto) {
    const lead = await leadsRepository.findById(leadId, userId);
    if (!lead) throw new AppError('Lead not found', 404);
    return prisma.leadEvidence.create({
      data: {
        leadId: lead.id,
        kind: dto.kind,
        sourceUrl: dto.sourceUrl,
        summary: dto.summary,
        capturedAt: dto.capturedAt ? new Date(dto.capturedAt) : undefined,
      },
    });
  },

  async list(userId: string, leadId: string) {
    const lead = await leadsRepository.findById(leadId, userId);
    if (!lead) throw new AppError('Lead not found', 404);
    return prisma.leadEvidence.findMany({
      where: { leadId: lead.id },
      orderBy: { capturedAt: 'desc' },
    });
  },

  async remove(userId: string, leadId: string, evidenceId: string) {
    const lead = await leadsRepository.findById(leadId, userId);
    if (!lead) throw new AppError('Lead not found', 404);
    // deleteMany with both ids: a row belonging to a different lead (and
    // therefore potentially a different user) deletes nothing and 404s.
    const result = await prisma.leadEvidence.deleteMany({
      where: { id: evidenceId, leadId: lead.id },
    });
    if (result.count === 0) throw new AppError('Evidence not found', 404);
  },
};
