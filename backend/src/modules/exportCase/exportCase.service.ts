import { prisma } from '../../config/database';
import type { CreateExportCaseInput, UpdateExportCaseInput } from './exportCase.schema';

/**
 * Export Case service. Every query is scoped to the owning user, so one
 * user can never read, change or delete another user's case.
 */

export const exportCaseService = {
  async listForUser(userId: string, limit = 50, offset = 0) {
    const [cases, total] = await Promise.all([
      prisma.exportCase.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
      }),
      prisma.exportCase.count({ where: { userId } }),
    ]);
    return { cases, total };
  },

  async getForUser(userId: string, id: string) {
    return prisma.exportCase.findFirst({ where: { id, userId } });
  },

  async createForUser(userId: string, input: CreateExportCaseInput) {
    return prisma.exportCase.create({
      data: { ...input, userId },
    });
  },

  async updateForUser(userId: string, id: string, input: UpdateExportCaseInput) {
    // updateMany keeps the owner check inside the write itself: a foreign
    // id matches nothing and reports 0 rows, never an error leak.
    const data = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined),
    );
    // Stale-state invalidation, enforced server-side so no client (current,
    // older, or hand-rolled) can leave derived state looking current after
    // the product identity changes. A product/HS change invalidates the
    // market shortlist and requirements and restarts the journey; a target
    // change invalidates requirements only (the shortlist stays valid).
    if (data.productName !== undefined || data.hsCode !== undefined) {
      data.markets = null;
      data.requirements = null;
      data.stage = 'product';
    } else if (data.targetCountry !== undefined) {
      data.requirements = null;
    }
    const result = await prisma.exportCase.updateMany({
      where: { id, userId },
      data,
    });
    if (result.count === 0) return null;
    return prisma.exportCase.findFirst({ where: { id, userId } });
  },

  async removeForUser(userId: string, id: string) {
    const result = await prisma.exportCase.deleteMany({ where: { id, userId } });
    return result.count > 0;
  },
};
