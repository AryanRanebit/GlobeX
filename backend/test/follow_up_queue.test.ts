// Follow-up queue tests: offline, fake leads, fixed clock, prisma mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const leadFindMany = vi.fn();
const outreachFindMany = vi.fn();
vi.mock('../src/config/database', () => ({
  prisma: {
    lead: { findMany: (...a: unknown[]) => leadFindMany(...a) },
    outreach: { findMany: (...a: unknown[]) => outreachFindMany(...a) },
  },
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));
vi.mock('../src/utils/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), http: vi.fn() },
}));

import { evaluateLead, sortQueue, FollowUpLead, FollowUpOutreach } from '../src/modules/leads/followUp.rules';
import { followUpService } from '../src/modules/leads/followUp.service';

const NOW = new Date('2026-11-21T10:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000);

const lead = (o: Partial<FollowUpLead> = {}): FollowUpLead => ({
  id: 'l1', status: 'NEW', leadScore: 50, nextAction: null, nextActionAt: null,
  createdAt: daysAgo(1), updatedAt: daysAgo(1), ...o,
});
const out = (o: Partial<FollowUpOutreach> = {}): FollowUpOutreach => ({
  status: 'SENT', createdAt: daysAgo(9), sentAt: daysAgo(9), repliedAt: null, ...o,
});

describe('evaluateLead', () => {
  it('ignores converted and lost leads even when overdue', () => {
    expect(evaluateLead(lead({ status: 'CONVERTED', nextActionAt: daysAgo(5) }), [], NOW)).toBeNull();
    expect(evaluateLead(lead({ status: 'LOST', nextActionAt: daysAgo(5) }), [], NOW)).toBeNull();
  });
  it('new lead with no outreach: draft first message', () => {
    expect(evaluateLead(lead(), [], NOW)?.action).toBe('DRAFT_FIRST_MESSAGE');
  });
  it('unsent draft: review it, never auto-send', () => {
    const r = evaluateLead(lead({ status: 'CONTACTED' }), [out({ status: 'DRAFT', sentAt: null, createdAt: daysAgo(2) })], NOW);
    expect(r?.action).toBe('REVIEW_DRAFT');
  });
  it('fresh draft made today stays out of the queue', () => {
    expect(evaluateLead(lead({ status: 'CONTACTED' }), [out({ status: 'DRAFT', sentAt: null, createdAt: daysAgo(0) })], NOW)).toBeNull();
  });
  it('sent 9 days ago with no reply: draft follow-up', () => {
    expect(evaluateLead(lead({ status: 'CONTACTED' }), [out()], NOW)?.action).toBe('DRAFT_FOLLOW_UP');
  });
  it('sent 3 days ago: not yet', () => {
    expect(evaluateLead(lead({ status: 'CONTACTED' }), [out({ sentAt: daysAgo(3), createdAt: daysAgo(3) })], NOW)).toBeNull();
  });
  it('boundary: exactly 7 days is due, 6 is not', () => {
    expect(evaluateLead(lead({ status: 'CONTACTED' }), [out({ sentAt: daysAgo(7) })], NOW)).not.toBeNull();
    expect(evaluateLead(lead({ status: 'CONTACTED' }), [out({ sentAt: daysAgo(6) })], NOW)).toBeNull();
  });
  it('a reply always surfaces, even with no date set', () => {
    const r = evaluateLead(lead({ status: 'CONTACTED' }), [out({ status: 'REPLIED', repliedAt: daysAgo(1) })], NOW);
    expect(r?.action).toBe('REVIEW_REPLY');
  });
  it('latest outreach wins: old reply then newer sent message', () => {
    const r = evaluateLead(lead({ status: 'NEGOTIATION' }), [
      out({ status: 'REPLIED', repliedAt: daysAgo(20), sentAt: daysAgo(25), createdAt: daysAgo(25) }),
      out({ status: 'SENT', sentAt: daysAgo(10), createdAt: daysAgo(10) }),
    ], NOW);
    expect(r?.action).toBe('DRAFT_FOLLOW_UP');
  });
  it('overdue date marks urgency and counts days', () => {
    const r = evaluateLead(lead({ status: 'FOLLOW_UP', nextActionAt: daysAgo(3), nextAction: 'Send price list' }), [], NOW);
    expect(r).toMatchObject({ urgency: 'overdue', daysOverdue: 3, action: 'CHECK_IN' });
    expect(r?.reason).toContain('Send price list');
  });
  it('date later today is "due", future date is excluded', () => {
    expect(evaluateLead(lead({ status: 'FOLLOW_UP', nextActionAt: new Date(NOW.getTime() - 3600000) }), [], NOW)?.urgency).toBe('due');
    expect(evaluateLead(lead({ status: 'FOLLOW_UP', nextActionAt: new Date(NOW.getTime() + 86400000) }), [], NOW)).toBeNull();
  });
  it('contacted outside GlobeX, idle 15 days: check in; idle 5 days: nothing', () => {
    expect(evaluateLead(lead({ status: 'CONTACTED', updatedAt: daysAgo(15) }), [], NOW)?.action).toBe('CHECK_IN');
    expect(evaluateLead(lead({ status: 'CONTACTED', updatedAt: daysAgo(5) }), [], NOW)).toBeNull();
  });
});

describe('sortQueue', () => {
  it('overdue first, longest overdue first, score breaks ties', () => {
    const s = sortQueue([
      { id: 'a', urgency: 'suggested' as const, daysOverdue: 0, leadScore: 99 },
      { id: 'b', urgency: 'overdue' as const, daysOverdue: 2, leadScore: 10 },
      { id: 'c', urgency: 'overdue' as const, daysOverdue: 5, leadScore: 10 },
      { id: 'd', urgency: 'overdue' as const, daysOverdue: 2, leadScore: 80 },
    ]);
    expect(s.map((x) => x.id)).toEqual(['c', 'd', 'b', 'a']);
  });
});

describe('followUpService (owner scoping)', () => {
  beforeEach(() => vi.clearAllMocks());
  it('scopes both queries to the requester and excludes closed leads', async () => {
    leadFindMany.mockResolvedValue([]);
    await followUpService.queueForUser('user-1', NOW);
    const where = leadFindMany.mock.calls[0][0].where;
    expect(where.userId).toBe('user-1');
    expect(where.status.notIn).toEqual(expect.arrayContaining(['CONVERTED', 'LOST']));
    expect(outreachFindMany).not.toHaveBeenCalled();
  });
  it('builds the queue from leads and the same user\'s outreach only', async () => {
    leadFindMany.mockResolvedValue([
      { ...lead({ id: 'l1', status: 'CONTACTED' }), buyerId: 'b1', exportCaseId: null, buyer: { companyName: 'Acme GmbH', country: 'Germany' }, product: { productName: 'Turmeric' } },
    ]);
    outreachFindMany.mockResolvedValue([{ buyerId: 'b1', status: 'SENT', createdAt: daysAgo(9), sentAt: daysAgo(9), repliedAt: null }]);
    const res = await followUpService.queueForUser('user-1', NOW);
    expect(outreachFindMany.mock.calls[0][0].where).toMatchObject({ userId: 'user-1', buyerId: { in: ['b1'] } });
    expect(res.total).toBe(1);
    expect(res.items[0]).toMatchObject({ leadId: 'l1', action: 'DRAFT_FOLLOW_UP', product: 'Turmeric' });
  });
});
