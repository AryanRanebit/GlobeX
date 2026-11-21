import React, { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../lib/api';

// What to do next, in plain words. The server decides; this only labels it.
const ACTION_LABEL = {
  DRAFT_FIRST_MESSAGE: 'Draft first message',
  REVIEW_DRAFT: 'Review your draft',
  DRAFT_FOLLOW_UP: 'Draft a follow-up',
  REVIEW_REPLY: 'Read their reply',
  CHECK_IN: 'Check in',
};

const URGENCY = {
  overdue: { text: 'Overdue', cls: 'text-red-700 bg-red-50 border-red-200' },
  due: { text: 'Due today', cls: 'text-amber-ink bg-amber-pale border-accent-border' },
  suggested: { text: 'Suggested', cls: 'text-blue-dark bg-blue-pale border-blue-border' },
};

export default function FollowUpQueue() {
  const [state, setState] = useState({ status: 'loading', items: [], total: 0 });

  useEffect(() => {
    let live = true;
    apiFetch('/api/v1/leads/follow-ups')
      .then(async (res) => {
        if (!res.ok) throw new Error('bad status');
        const json = await res.json();
        const data = json?.data || {};
        if (live) setState({ status: 'ready', items: Array.isArray(data.items) ? data.items : [], total: data.total || 0 });
      })
      .catch(() => { if (live) setState({ status: 'error', items: [], total: 0 }); });
    return () => { live = false; };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-line flex flex-col" data-testid="follow-up-queue">
      <div className="p-5 border-b border-line flex justify-between items-center gap-3">
        <h2 className="text-base font-bold text-navy font-heading flex items-center gap-2">
          <BellRing size={18} className="text-blue" />
          Follow-ups
        </h2>
        {state.status === 'ready' && state.total > 0 && (
          <span className="text-xs font-semibold text-blue-dark bg-blue-pale border border-blue-border px-2 py-1 rounded-md">
            {state.total} to look at
          </span>
        )}
      </div>

      <div className="p-5">
        {state.status === 'loading' && (
          <div className="flex flex-col gap-3 animate-pulse" role="status" aria-label="Loading follow-ups">
            {[1, 2].map((n) => <div key={n} className="h-12 rounded-lg bg-page" />)}
          </div>
        )}

        {state.status === 'error' && (
          <p className="text-sm text-muted flex items-center gap-2">
            <AlertCircle size={16} className="text-faint shrink-0" />
            Could not load follow-ups right now. Your leads are safe; try refreshing the page.
          </p>
        )}

        {state.status === 'ready' && state.items.length === 0 && (
          <p className="text-sm text-muted flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-dark shrink-0" />
            Nothing needs a follow-up right now. Saved buyers show up here when a message or date needs attention.
          </p>
        )}

        {state.status === 'ready' && state.items.length > 0 && (
          <ul className="flex flex-col divide-y divide-line">
            {state.items.map((item) => {
              const u = URGENCY[item.urgency] || URGENCY.suggested;
              return (
                <li key={item.leadId} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">
                      {item.buyer?.companyName || 'Buyer'}
                      {item.buyer?.country ? <span className="font-normal text-muted"> · {item.buyer.country}</span> : null}
                    </p>
                    <p className="text-xs text-muted mt-0.5 leading-snug">{item.reason}</p>
                    {item.product ? <p className="text-[11px] text-faint mt-0.5">Product: {item.product}</p> : null}
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <span className={`text-[11px] font-semibold border px-2 py-0.5 rounded-md ${u.cls}`}>
                      {u.text}{item.urgency === 'overdue' ? ` · ${item.daysOverdue}d` : ''}
                    </span>
                    <span className="text-xs font-semibold text-navy">{ACTION_LABEL[item.action] || 'Review'}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-[11px] text-faint mt-4">
          Suggestions only. GlobeX never sends a message for you.
        </p>
      </div>
    </div>
  );
}
