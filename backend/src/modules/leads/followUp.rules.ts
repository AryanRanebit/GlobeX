// Follow-up queue rules. Pure functions: no database, no network, no model
// calls. The clock is always passed in, so every rule is testable.

export const FOLLOW_UP_AFTER_DAYS = 7;   // sent, no reply: follow up after this long
export const STALE_AFTER_DAYS = 14;      // no activity at all on an open lead
const DAY_MS = 24 * 60 * 60 * 1000;

export type FollowUpAction =
  | 'DRAFT_FIRST_MESSAGE'
  | 'REVIEW_DRAFT'
  | 'DRAFT_FOLLOW_UP'
  | 'REVIEW_REPLY'
  | 'CHECK_IN';

export type FollowUpUrgency = 'overdue' | 'due' | 'suggested';

export interface FollowUpOutreach {
  status: 'DRAFT' | 'SENT' | 'OPENED' | 'REPLIED';
  createdAt: Date;
  sentAt: Date | null;
  repliedAt: Date | null;
}

export interface FollowUpLead {
  id: string;
  status: string;
  leadScore: number;
  nextAction: string | null;
  nextActionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUpItem {
  leadId: string;
  urgency: FollowUpUrgency;
  action: FollowUpAction;
  reason: string;
  daysOverdue: number;
}

const CLOSED = new Set(['CONVERTED', 'LOST']);

function daysBetween(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / DAY_MS);
}

/** The most recent outreach by when it actually happened (reply > sent > drafted). */
export function latestOutreach(list: FollowUpOutreach[]): FollowUpOutreach | null {
  if (!list.length) return null;
  const stamp = (o: FollowUpOutreach) => (o.repliedAt ?? o.sentAt ?? o.createdAt).getTime();
  return [...list].sort((a, b) => stamp(b) - stamp(a))[0];
}

/**
 * Decide whether one lead belongs in the queue, and what to do next.
 * Returns null when nothing is needed. Never sends or drafts anything: the
 * action is only a suggestion for the user.
 */
export function evaluateLead(
  lead: FollowUpLead,
  outreach: FollowUpOutreach[],
  now: Date,
): FollowUpItem | null {
  if (CLOSED.has(lead.status)) return null;

  const last = latestOutreach(outreach);
  const scheduledDue = lead.nextActionAt !== null && lead.nextActionAt.getTime() <= now.getTime();
  const daysOverdue = scheduledDue ? Math.max(0, daysBetween(now, lead.nextActionAt as Date)) : 0;
  const urgency: FollowUpUrgency = scheduledDue ? (daysOverdue >= 1 ? 'overdue' : 'due') : 'suggested';

  // 1. A reply is waiting for a human, whatever the dates say.
  if (last?.status === 'REPLIED') {
    const since = daysBetween(now, last.repliedAt ?? last.createdAt);
    return { leadId: lead.id, urgency: scheduledDue ? urgency : 'due', action: 'REVIEW_REPLY',
      reason: `Buyer replied ${since <= 0 ? 'today' : `${since} day${since === 1 ? '' : 's'} ago`}. Read it and decide the next step.`,
      daysOverdue };
  }

  // 2. A draft sits unsent: ask the user to review it (we never send).
  if (last?.status === 'DRAFT') {
    const age = daysBetween(now, last.createdAt);
    if (scheduledDue || age >= 1) {
      return { leadId: lead.id, urgency: scheduledDue ? urgency : 'suggested', action: 'REVIEW_DRAFT',
        reason: `A draft message has been waiting ${age <= 0 ? 'since today' : `${age} day${age === 1 ? '' : 's'}`}. Review it, edit it and send it yourself.`,
        daysOverdue };
    }
    return null;
  }

  // 3. Sent (or opened) with no reply.
  if (last && (last.status === 'SENT' || last.status === 'OPENED')) {
    const sentDays = daysBetween(now, last.sentAt ?? last.createdAt);
    if (sentDays >= FOLLOW_UP_AFTER_DAYS || scheduledDue) {
      return { leadId: lead.id, urgency: scheduledDue ? urgency : 'suggested', action: 'DRAFT_FOLLOW_UP',
        reason: `No reply ${sentDays} days after your message${last.status === 'OPENED' ? ' (it was opened)' : ''}. A short follow-up is due.`,
        daysOverdue };
    }
    return null;
  }

  // 4. No outreach recorded in GlobeX.
  if (lead.status === 'NEW') {
    return { leadId: lead.id, urgency: scheduledDue ? urgency : 'suggested', action: 'DRAFT_FIRST_MESSAGE',
      reason: 'Saved buyer with no message yet. Draft a first message.', daysOverdue };
  }
  // Contacted outside GlobeX (or status moved by hand): use dates only.
  const idleDays = daysBetween(now, lead.updatedAt);
  if (scheduledDue || idleDays >= STALE_AFTER_DAYS) {
    return { leadId: lead.id, urgency: scheduledDue ? urgency : 'suggested', action: 'CHECK_IN',
      reason: scheduledDue
        ? `Planned follow-up date has passed${lead.nextAction ? `: ${lead.nextAction}` : '.'}`
        : `No update for ${idleDays} days. Check where this lead stands.`,
      daysOverdue };
  }
  return null;
}

const URGENCY_RANK: Record<FollowUpUrgency, number> = { overdue: 0, due: 1, suggested: 2 };

/** Overdue first (longest overdue first), then due, then suggestions; higher score breaks ties. */
export function sortQueue<T extends { urgency: FollowUpUrgency; daysOverdue: number; leadScore: number }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]
    || b.daysOverdue - a.daysOverdue
    || b.leadScore - a.leadScore);
}
