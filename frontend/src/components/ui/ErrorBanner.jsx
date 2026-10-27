import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorBanner({ message = 'Something went wrong.', onRetry, retryLabel = 'Retry' }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-red-pale border border-red-border text-xs text-red-dark">
      <div className="flex items-center gap-2">
        <AlertCircle size={14} className="shrink-0" />
        <span className="font-medium">{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-1 font-semibold hover:underline shrink-0">
          <RefreshCw size={12} />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
