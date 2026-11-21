import { prisma } from '../../config/database';
import { LeadStatus } from '../../types/prisma';
import { evaluateLead, sortQueue, FollowUpOutreach } from './followUp.rules';

const QUEUE_LIMIT = 50;

/**
 * Builds the signed-in user's follow-up queue. Read-only: two owner-scoped
 * queries, then pure rules. No model calls, no writes, nothing is sent.
 */
export const followUpService = {
  async queueForUser(userId: string, now: Date = new Date()) {
    const leads = await prisma.lead.findMany({
      where: { userId, status: { notIn: [LeadStatus.CONVERTED, LeadStatus.LOST] } },
      include: {
        buyer: { select: { companyName: true, country: true } },
        product: { select: { productName: true } },
      },
      take: 500,
    });
    if (!leads.length) return { items: [], total: 0, generatedAt: now.toISOString() };

    const outreach = await prisma.outreach.findMany({
      where: { userId, buyerId: { in: [...new Set(leads.map((l) => l.buyerId))] } },
      select: { buyerId: true, status: true, createdAt: true, sentAt: true, repliedAt: true },
    });
    const byBuyer = new Map<string, FollowUpOutreach[]>();
    for (const o of outreach) {
      const list = byBuyer.get(o.buyerId) ?? [];
      list.push(o as FollowUpOutreach);
      byBuyer.set(o.buyerId, list);
    }

    const items = [];
    for (const lead of leads) {
      const hit = evaluateLead(lead, byBuyer.get(lead.buyerId) ?? [], now);
      if (!hit) continue;
      items.push({
        ...hit,
        leadScore: lead.leadScore,
        status: lead.status,
        nextActionAt: lead.nextActionAt,
        buyer: lead.buyer,
        product: lead.product?.productName ?? null,
        exportCaseId: lead.exportCaseId,
      });
    }
    const sorted = sortQueue(items);
    return { items: sorted.slice(0, QUEUE_LIMIT), total: sorted.length, generatedAt: now.toISOString() };
  },
};
