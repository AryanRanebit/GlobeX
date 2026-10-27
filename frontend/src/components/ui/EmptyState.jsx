import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title, description, actionLabel, onAction }) {
  return (
    <div className="p-14 text-center text-muted flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-faint mb-3">
        <Icon size={22} />
      </div>
      <h3 className="text-sm font-bold text-navy mb-1">{title}</h3>
      {description && <p className="text-xs text-muted max-w-sm mb-4">{description}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-secondary px-3.5 py-1.5 text-xs font-semibold">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
