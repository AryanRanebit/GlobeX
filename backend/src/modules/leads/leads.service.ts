import { LeadStatus } from '../../types/prisma';
import { leadsRepository } from './leads.repository';
import { prisma } from '../../config/database';
import { leadScoringAgent } from '../agents/LeadScoringAgent';
import { AppError } from '../../middleware/error.middleware';
import type { CreateLeadDto, UpdateLeadDto } from './leads.schema';

async function assertOwnedCase(userId: string, exportCaseId: string) {
  const c = await prisma.exportCase.findFirst({ where: { id: exportCaseId, userId } });
  if (!c) throw new AppError('Export case not found', 404);
  return c;
}

export const leadsService = {
  async create(userId: string, dto: CreateLeadDto) {
    const aiScore = await leadScoringAgent.score({ buyerId: dto.buyerId, userId });
    if (dto.exportCaseId) await assertOwnedCase(userId, dto.exportCaseId);
    return leadsRepository.create({
      buyer: { connect: { id: dto.buyerId } },
      user: { connect: { id: userId } },
      ...(dto.productId && { product: { connect: { id: dto.productId } } }),
      ...(dto.exportCaseId && { exportCase: { connect: { id: dto.exportCaseId } } }),
      leadScore: aiScore,
      notes: dto.notes,
      nextAction: dto.nextAction,
      nextActionAt: dto.nextActionAt ? new Date(dto.nextActionAt) : undefined,
    });
  },

  async getAll(userId: string, status?: LeadStatus) {
    return leadsRepository.findByUser(userId, status);
  },

  async update(id: string, userId: string, dto: UpdateLeadDto) {
    const lead = await leadsRepository.findById(id, userId);
    if (!lead) throw new AppError('Lead not found', 404);
    if (dto.exportCaseId) await assertOwnedCase(userId, dto.exportCaseId);
    const updateData: Record<string, unknown> = { ...dto };
    // null unlinks the lead from its case; undefined leaves it unchanged
    if (dto.exportCaseId === null) updateData.exportCase = { disconnect: true };
    else if (dto.exportCaseId) { updateData.exportCase = { connect: { id: dto.exportCaseId } }; }
    delete updateData.exportCaseId;
    if (dto.status === LeadStatus.CONVERTED) updateData.convertedAt = new Date();
    if (dto.nextActionAt) updateData.nextActionAt = new Date(dto.nextActionAt as string);
    return leadsRepository.update(id, updateData);
  },

  async delete(id: string, userId: string) {
    const lead = await leadsRepository.findById(id, userId);
    if (!lead) throw new AppError('Lead not found', 404);
    await leadsRepository.delete(id);
  },

  async getStats(userId: string) {
    return leadsRepository.stats(userId);
  },
};
