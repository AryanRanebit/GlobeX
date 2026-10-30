import React from 'react';
import { MoveHorizontal } from 'lucide-react';

// Mobile-only cue shown above tables that overflow horizontally, so users
// know there are more columns off-screen.
export default function ScrollHint() {
  return (
    <p className="sm:hidden flex items-center gap-1.5 border-b border-line bg-mist px-3 py-1.5 text-[11px] text-muted">
      <MoveHorizontal size={12} className="shrink-0" aria-hidden="true" />
      Swipe sideways to see all columns
    </p>
  );
}
