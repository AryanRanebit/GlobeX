import React, { useState, useEffect, useCallback } from 'react';
import {
  History as HistoryIcon,
  Globe2,
  Sparkles,
  Loader2,
  AlertTriangle,
  X,
  RefreshCw,
  BookmarkCheck,
  ChevronRight,
  Boxes,
  Users,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import AnalysisModal from './AnalysisModal';
import ScrollHint from '../ui/ScrollHint';

/**
 * Analysis History
 *
 * Lists every market search and full analysis the signed-in user has run.
 * Reopening an entry renders the STORED snapshot only - no backend
 * analysis, no Comtrade or Gemini call, zero re-run cost.
 */

const TYPE_META = {
  market_search: { label: 'Market Search', icon: Globe2, badge: 'bg-blue-pale text-blue-dark border-blue-border' },
  full_analysis: { label: 'Full Analysis', icon: Sparkles, badge: 'bg-amber-subtle text-accent-hover border-accent-border' },
};

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatUsd(val) {
  if (!val || isNaN(val)) return '$0';
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(2)}K`;
  return `$${Number(val).toLocaleString()}`;
}

function entryTitle(entry) {
  if (entry.analysisType === 'full_analysis') {
    return entry.productName || (entry.hsCode ? `HS ${entry.hsCode}` : 'Market analysis');
  }
  return entry.hsCode ? `HS ${entry.hsCode}` : 'Market search';
}

function entrySubtitle(entry) {
  if (entry.analysisType === 'market_search' && entry.productName) return entry.productName;
  if (entry.analysisType === 'full_analysis' && entry.hsCode) return `HS ${entry.hsCode}`;
  return null;
}

/** Read-only table of a stored market-search snapshot. */
function StoredSearchModal({ entry, onClose }) {
  const snapshot = entry?.resultJson || {};
  const markets = Array.isArray(snapshot.markets) ? snapshot.markets : [];
  const meta = snapshot.meta || {};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-line shadow-[var(--shadow-pop)] max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 flex flex-col gap-5">
        <div className="flex justify-between items-start border-b border-line pb-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-blue uppercase">Saved Market Search</span>
            <h2 className="text-xl font-black text-navy font-heading mt-0.5">
              HS {entry.hsCode}{meta.cmdDescription ? `: ${meta.cmdDescription}` : ''}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Saved {formatWhen(entry.createdAt)}
              {meta.period ? ` · Data period ${meta.period}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-surface text-soft rounded-lg text-xs font-bold hover:bg-line"
            aria-label="Close saved search"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-3 rounded-lg bg-blue-pale border border-blue-border text-xs text-blue-dark flex items-center gap-2">
          <BookmarkCheck size={14} className="shrink-0" />
          <span>Loaded from your saved history - no new data was fetched.</span>
        </div>

        {markets.length === 0 ? (
          <div className="p-6 text-center text-muted border border-line rounded-xl bg-mist">
            <p className="text-sm font-semibold text-navy">No markets stored in this snapshot</p>
          </div>
        ) : (
          <div className="border border-line rounded-xl overflow-hidden">
            <ScrollHint />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-mist border-b border-line text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-bold">#</th>
                    <th className="py-2.5 px-3 font-bold">Destination</th>
                    <th className="py-2.5 px-3 font-bold">India Exports (FOB)</th>
                    <th className="py-2.5 px-3 font-bold">Share of India Exports</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.map((m, i) => (
                    <tr key={`${m.partnerName}-${i}`} className="border-b border-line last:border-0 hover:bg-mist/60">
                      <td className="py-2.5 px-3 text-faint font-mono">{m.rank || i + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-navy whitespace-nowrap">
                        {m.partnerName} <span className="text-[10px] text-muted font-mono font-normal">({m.partnerIso3})</span>
                      </td>
                      <td className="py-2.5 px-3 text-soft whitespace-nowrap">{formatUsd(m.tradeValueUsd)}</td>
                      <td className="py-2.5 px-3 text-muted whitespace-nowrap">
                        {typeof m.shareOfIndiaExportsPct === 'number' ? `${m.shareOfIndiaExportsPct.toFixed(2)}%` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta.citation && (
              <p className="text-[10px] text-faint px-3 py-2 bg-mist border-t border-line">{meta.citation}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


/**
 * One coherent port scene for the History page blank area (user-requested):
 * SKY (clouds, gulls, paper plane) on top, GROUND/PORT (dock on posts, tower
 * crane, stacked containers) at the bottom LEFT, and open SEA (horizon, wave
 * rows, lighthouse at the harbor mouth) to the RIGHT. No sun, no ship and no
 * anchor here on purpose: the global .bg-app-ship scene paints the sun (top)
 * and its ship with waves (bottom right), so this scene's open water merges
 * into that same sea - one sun, one sea, one ship on the page.
 * Palette (user-picked "Deep Ocean", scene only): navy #1E3A8A lines, sea
 * blue #0369A1 waves, warm amber #D97706 lighthouse beams; same stroke
 * widths and opacities as the global scene. Flat composition (user asked to
 * drop the perspective pass): level dock, uniform containers and wave rows.
 * Rendered twice from the same SceneContent: full width on desktop, a
 * left-cropped viewBox on mobile so port + lighthouse stay legible at 390px.
 * vector-effect=non-scaling-stroke keeps the line weight constant at any size.
 */
const artNavy = { stroke: '#1E3A8A', strokeOpacity: 0.16, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
const artSea = { stroke: '#0369A1', strokeOpacity: 0.16, strokeWidth: 2, strokeLinecap: 'round', fill: 'none' };
const artBeam = { stroke: '#D97706', strokeOpacity: 0.28, strokeWidth: 2.2, strokeLinecap: 'round', fill: 'none' };

const waveRow = (y, amp, step, x0, x1) => {
  let d = `M ${x0} ${y}`;
  for (let x = x0; x < x1; x += step) d += ` q ${step / 2} ${-amp} ${step} 0`;
  return d;
};

function ContainerBox({ x, y }) {
  return (
    <g {...artNavy}>
      <rect x={x} y={y} width="46" height="26" />
      <line x1={x + 11} y1={y} x2={x + 11} y2={y + 26} />
      <line x1={x + 23} y1={y} x2={x + 23} y2={y + 26} />
      <line x1={x + 35} y1={y} x2={x + 35} y2={y + 26} />
    </g>
  );
}

function SceneContent() {
  return (
    <g vectorEffect="non-scaling-stroke">
      {/* ===== SKY ===== */}
      {/* clouds - same path language as the global scene */}
      <path d="M150 96 a13 13 0 0 1 -2 -26 a17 17 0 0 1 32 -7 a14 14 0 0 1 20 6 a12 12 0 0 1 -2 27 z" fill="#F7F5F0" {...artNavy} />
      <path d="M950 76 a15 15 0 0 1 -2 -30 a19 19 0 0 1 36 -8 a16 16 0 0 1 22 7 a13 13 0 0 1 -2 31 z" fill="#F7F5F0" {...artNavy} />
      <path d="M700 168 a10 10 0 0 1 -1.5 -20 a13 13 0 0 1 24 -5 a11 11 0 0 1 15 4.5 a9 9 0 0 1 -1.5 20.5 z" fill="#F7F5F0" {...artNavy} />
      {/* gulls */}
      <path d="M440 34 q6 -7 12 0 q6 -7 12 0" {...artNavy} />
      <path d="M600 28 q6 -7 12 0 q6 -7 12 0" {...artNavy} />
      <path d="M1040 110 q5 -6 10 0 q5 -6 10 0" {...artNavy} />
      {/* paper plane on a dashed trade route, heading out to sea */}
      <path d="M420 130 Q560 40 660 52" {...artSea} strokeDasharray="2 8" />
      <path d="M660 60 L692 44 L672 74 L666 60 Z" {...artNavy} />
      <line x1="666" y1="60" x2="692" y2="44" {...artNavy} />

      {/* ===== GROUND / PORT (left) ===== */}
      {/* dock deck on posts rising from the sea */}
      <line x1="0" y1="232" x2="480" y2="232" {...artNavy} />
      <line x1="0" y1="246" x2="480" y2="246" {...artNavy} />
      {[40, 120, 200, 280, 360, 440].map((x) => (
        <line key={x} x1={x} y1="246" x2={x} y2="278" {...artNavy} />
      ))}
      {/* tower crane on the dock, jib reaching out over the water */}
      <g {...artNavy}>
        <line x1="330" y1="232" x2="330" y2="76" />
        <line x1="366" y1="232" x2="366" y2="76" />
        <line x1="330" y1="76" x2="366" y2="76" />
        <path d="M330 98 L366 120 M366 98 L330 120" />
        <path d="M330 120 L366 142 M366 120 L330 142" />
        <path d="M330 142 L366 164 M366 142 L330 164" />
        <path d="M330 164 L366 186 M366 164 L330 186" />
        <path d="M330 186 L366 208 M366 186 L330 208" />
        <path d="M330 208 L366 230 M366 208 L330 230" />
        <path d="M330 76 L348 40 L366 76" />
        <line x1="348" y1="40" x2="348" y2="76" />
        <line x1="348" y1="40" x2="240" y2="64" />
        <line x1="348" y1="40" x2="560" y2="64" />
        <line x1="240" y1="64" x2="560" y2="64" />
        <line x1="240" y1="64" x2="240" y2="76" />
        <rect x="232" y="76" width="16" height="14" />
        <rect x="512" y="56" width="18" height="8" />
        <line x1="521" y1="64" x2="521" y2="130" />
        <rect x="501" y="130" width="40" height="24" />
        <line x1="511" y1="130" x2="511" y2="154" />
        <line x1="521" y1="130" x2="521" y2="154" />
        <line x1="531" y1="130" x2="531" y2="154" />
      </g>
      {/* stacked containers on the dock */}
      <ContainerBox x={60} y={206} />
      <ContainerBox x={110} y={206} />
      <ContainerBox x={160} y={206} />
      <ContainerBox x={210} y={206} />
      <ContainerBox x={85} y={180} />
      <ContainerBox x={135} y={180} />
      <ContainerBox x={110} y={154} />

      {/* ===== SEA (right, open water - the global ship sails here) ===== */}
      <line x1="480" y1="232" x2="1200" y2="232" {...artSea} />
      <path d={waveRow(268, 7, 26, 0, 1196)} {...artSea} />
      <path d={waveRow(308, 6, 30, -13, 1187)} {...artSea} />
      {/* lighthouse on rocks at the harbor mouth */}
      <g {...artNavy}>
        <path d="M552 236 Q568 218 588 230 Q606 216 624 230 Q638 220 650 236" />
        <path d="M582 230 L590 138 M634 230 L626 138" />
        <line x1="587" y1="170" x2="630" y2="170" />
        <line x1="585" y1="200" x2="632" y2="200" />
        <rect x="586" y="124" width="44" height="14" />
        <rect x="594" y="104" width="28" height="20" />
        <path d="M590 104 Q608 86 626 104" />
      </g>
      <circle cx="608" cy="114" r="4" {...artBeam} />
      <line x1="600" y1="110" x2="552" y2="94" {...artBeam} />
      <line x1="600" y1="118" x2="552" y2="130" {...artBeam} />
      <line x1="616" y1="110" x2="664" y2="94" {...artBeam} />
      <line x1="616" y1="118" x2="664" y2="130" {...artBeam} />
    </g>
  );
}

function ArtScene() {
  return (
    <div aria-hidden="true" className="pointer-events-none select-none mt-4 -mb-4 sm:-mb-6">
      <svg className="hidden md:block w-full h-auto" viewBox="0 0 1200 340">
        <SceneContent />
      </svg>
      <svg className="md:hidden w-full h-auto" viewBox="40 0 640 340">
        <SceneContent />
      </svg>
    </div>
  );
}

export default function History({ onNavigate }) {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openingId, setOpeningId] = useState(null);
  const [openEntry, setOpenEntry] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/history?limit=100');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || `Could not load history (status ${res.status})`);
      }
      setEntries(Array.isArray(json.data) ? json.data : []);
      setStats(json.meta?.stats || null);
    } catch (err) {
      setError(err.message || 'Could not load your analysis history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) fetchHistory(); });
    return () => { active = false; };
  }, [fetchHistory]);

  const openStoredEntry = async (entry) => {
    setOpeningId(entry.id);
    try {
      const res = await apiFetch(`/api/v1/history/${entry.id}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Could not open this saved analysis.');
      }
      setOpenEntry(json.data);
    } catch (err) {
      setError(err.message || 'Could not open this saved analysis.');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy font-heading flex items-center gap-2">
            <HistoryIcon size={22} className="text-blue" />
            Analysis History
          </h1>
          <p className="text-sm text-muted mt-1">
            Every market search and full analysis you run is saved here. Reopen any result instantly - no new API calls, no extra cost.
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="p-2 text-muted hover:text-navy rounded-lg hover:bg-surface transition-colors"
          aria-label="Refresh history"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted" role="status">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading your history...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-4 rounded-lg bg-red-pale border border-red-border text-xs text-red-dark flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && entries.length === 0 && (
        <div className="p-10 text-center border border-dashed border-line-dark rounded-2xl bg-mist">
          <HistoryIcon size={28} className="mx-auto mb-3 text-faint" />
          <p className="text-sm font-semibold text-navy">No saved analyses yet</p>
          <p className="text-xs text-muted mt-1 max-w-md mx-auto">
            Run a search in Market Intelligence or a Full Analysis - the result will appear here automatically.
          </p>
        </div>
      )}

      {/* Entries */}
      {!loading && entries.length > 0 && (
        <div className="border border-line rounded-xl overflow-hidden bg-white divide-y divide-line">
          {entries.map((entry) => {
            const meta = TYPE_META[entry.analysisType] || TYPE_META.market_search;
            const Icon = meta.icon;
            const subtitle = entrySubtitle(entry);
            return (
              <button
                key={entry.id}
                onClick={() => openStoredEntry(entry)}
                disabled={openingId === entry.id}
                className="w-full flex items-center gap-4 px-4 sm:px-5 py-4 text-left hover:bg-mist/60 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-pale border border-blue-border flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-navy truncate">{entryTitle(entry)}</p>
                  <p className="text-xs text-muted truncate">
                    {subtitle ? `${subtitle} · ` : ''}{formatWhen(entry.createdAt)}
                  </p>
                </div>
                <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${meta.badge}`}>
                  {meta.label}
                </span>
                {openingId === entry.id
                  ? <Loader2 size={16} className="animate-spin text-faint shrink-0" />
                  : <ChevronRight size={16} className="text-faint shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Stats strip (fills the page when the list is short; pushes down naturally as it grows) */}
      {!loading && stats && entries.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: HistoryIcon, label: 'Saved Results', value: stats.total },
            { icon: Sparkles, label: 'Full Analyses', value: stats.fullAnalyses },
            { icon: Globe2, label: 'Market Searches', value: stats.marketSearches },
            { icon: Boxes, label: 'Products & HS Codes', value: stats.uniqueHsCodes },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white p-5 rounded-xl border border-line transition-shadow hover:shadow-[var(--shadow-float)]">
              <div className="w-9 h-9 rounded-lg bg-blue-pale border border-blue-border flex items-center justify-center mb-3">
                <Icon size={16} className="text-blue" />
              </div>
              <p className="text-xs text-muted">{label}</p>
              <p className="text-2xl font-black text-navy font-heading mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions: visual fill + genuine next steps, matches dashboard card language */}
      {!loading && (
        <div>
          <p className="text-[10px] font-bold text-faint uppercase tracking-wider mb-2 px-1">Explore next</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Globe2, title: 'Explore new markets', sub: 'Search any HS code or product in Market Intelligence', tab: 'markets' },
              { icon: Users, title: 'Discover buyers', sub: 'Find verified importers for your product', tab: 'buyers' },
              { icon: MessageSquare, title: 'Ask AI Copilot', sub: 'Trade questions answered with cited data', tab: 'copilot' },
            ].map(({ icon: Icon, title, sub, tab }) => (
              <button
                key={tab}
                onClick={() => onNavigate && onNavigate(tab)}
                className="bg-white p-5 rounded-xl border border-line text-left transition-shadow hover:shadow-[var(--shadow-float)] group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-pale border border-blue-border flex items-center justify-center">
                    <Icon size={16} className="text-blue" />
                  </div>
                  <ArrowRight size={15} className="text-faint group-hover:text-blue transition-colors" />
                </div>
                <p className="text-sm font-bold text-navy">{title}</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">{sub}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* One coherent ground-sea-sky port scene filling the blank area */}
      {!loading && <ArtScene />}

      {/* Stored result modals */}
      {openEntry && openEntry.analysisType === 'full_analysis' && (
        <AnalysisModal
          isOpen
          onClose={() => setOpenEntry(null)}
          storedResult={openEntry.resultJson}
        />
      )}
      {openEntry && openEntry.analysisType === 'market_search' && (
        <StoredSearchModal entry={openEntry} onClose={() => setOpenEntry(null)} />
      )}
    </div>
  );
}
