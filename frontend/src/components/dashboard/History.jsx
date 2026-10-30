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
 * Decorative harbor line-art bands for the History page, drawn in the exact
 * style of the global .bg-app-ship scene (same palette, stroke width and
 * opacity: teal #134E4A, wave teal #0F766E, amber #B45309). They sit in
 * normal flow between/after the sections, so they always have clear space,
 * never hide behind cards, and simply push down as the entry list grows.
 */
const artTeal = { stroke: '#134E4A', strokeOpacity: 0.16, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
const artWave = { stroke: '#0F766E', strokeOpacity: 0.16, strokeWidth: 2, strokeLinecap: 'round', fill: 'none' };
const artAmber = { stroke: '#B45309', strokeOpacity: 0.28, strokeWidth: 2.2, strokeLinecap: 'round', fill: 'none' };

function TowerCrane({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 240 260" aria-hidden="true">
      <g {...artTeal}>
        {/* lattice mast */}
        <line x1="52" y1="250" x2="52" y2="70" />
        <line x1="88" y1="250" x2="88" y2="70" />
        <line x1="52" y1="70" x2="88" y2="70" />
        <path d="M52 92 L88 114 M88 92 L52 114" />
        <path d="M52 114 L88 136 M88 114 L52 136" />
        <path d="M52 136 L88 158 M88 136 L52 158" />
        <path d="M52 158 L88 180 M88 158 L52 180" />
        <path d="M52 180 L88 202 M88 180 L52 202" />
        <path d="M52 202 L88 224 M88 202 L52 224" />
        {/* apex + tie bars */}
        <path d="M52 70 L70 34 L88 70" />
        <line x1="70" y1="34" x2="70" y2="70" />
        <line x1="70" y1="34" x2="196" y2="58" />
        <line x1="70" y1="34" x2="10" y2="58" />
        {/* jib + counter-jib */}
        <line x1="10" y1="58" x2="228" y2="58" />
        <line x1="10" y1="58" x2="10" y2="70" />
        <rect x="2" y="70" width="16" height="14" />
        {/* trolley, cable, hanging container */}
        <rect x="164" y="50" width="18" height="8" />
        <line x1="173" y1="58" x2="173" y2="118" />
        <rect x="153" y="118" width="40" height="24" />
        <line x1="163" y1="118" x2="163" y2="142" />
        <line x1="173" y1="118" x2="173" y2="142" />
        <line x1="183" y1="118" x2="183" y2="142" />
        {/* stacked containers at the base */}
        <rect x="112" y="226" width="44" height="24" />
        <line x1="123" y1="226" x2="123" y2="250" />
        <line x1="134" y1="226" x2="134" y2="250" />
        <line x1="145" y1="226" x2="145" y2="250" />
        <rect x="160" y="226" width="44" height="24" />
        <line x1="171" y1="226" x2="171" y2="250" />
        <line x1="182" y1="226" x2="182" y2="250" />
        <line x1="193" y1="226" x2="193" y2="250" />
        <rect x="136" y="202" width="44" height="24" />
        <line x1="147" y1="202" x2="147" y2="226" />
        <line x1="158" y1="202" x2="158" y2="226" />
        <line x1="169" y1="202" x2="169" y2="226" />
        {/* ground line */}
        <line x1="4" y1="250" x2="236" y2="250" />
      </g>
    </svg>
  );
}

/** Band 1: between the stats strip and Explore next. */
function ArtBandMiddle() {
  return (
    <div aria-hidden="true" className="relative h-44 md:h-52 pointer-events-none select-none">
      {/* paper plane on a dashed trade route (md+) */}
      <svg className="absolute bottom-4 hidden md:block" style={{ left: '18%' }} width="180" height="90" viewBox="0 0 180 90">
        <path d="M6 66 Q60 6 118 26" {...artWave} strokeDasharray="2 8" />
        <path d="M118 34 L150 18 L130 48 L124 34 Z" {...artTeal} />
        <line x1="124" y1="34" x2="150" y2="18" {...artTeal} />
      </svg>
      {/* tower crane loading containers (all sizes) */}
      <TowerCrane className="absolute bottom-0 w-[150px] md:w-[210px]" style={{ right: '4%' }} />
    </div>
  );
}

/** Band 2: below the Explore-next cards, above the global ship/waves. */
function ArtBandHarbor() {
  return (
    <div aria-hidden="true" className="relative h-44 md:h-56 pointer-events-none select-none">
      {/* lighthouse on rocks (md+) */}
      <svg className="absolute bottom-0 hidden md:block" style={{ left: '3%' }} width="170" height="210" viewBox="0 0 170 210">
        <g {...artTeal}>
          <path d="M62 196 L74 96 M106 196 L94 96" />
          <line x1="70" y1="126" x2="98" y2="126" />
          <line x1="67" y1="156" x2="101" y2="156" />
          <rect x="68" y="84" width="32" height="12" />
          <rect x="74" y="64" width="20" height="20" />
          <path d="M72 64 Q84 48 96 64" />
          <path d="M40 196 Q56 180 74 192 Q92 178 110 192 Q124 182 136 196" />
        </g>
        <circle cx="84" cy="74" r="4" {...artAmber} />
        <line x1="76" y1="72" x2="34" y2="58" {...artAmber} />
        <line x1="76" y1="78" x2="34" y2="90" {...artAmber} />
        <line x1="92" y1="72" x2="134" y2="58" {...artAmber} />
        <line x1="92" y1="78" x2="134" y2="90" {...artAmber} />
        <path d="M20 206 q 8 -6 16 0 t 16 0" {...artWave} />
        <path d="M118 206 q 8 -6 16 0 t 16 0" {...artWave} />
      </svg>

      {/* small cloud + gulls - same paths as the global scene (all sizes) */}
      <svg className="absolute bottom-16 w-[104px] md:w-[150px]" style={{ right: '22%' }} viewBox="0 0 150 90">
        <path d="M32 66 a13 13 0 0 1 -2 -26 a17 17 0 0 1 32 -7 a14 14 0 0 1 20 6 a12 12 0 0 1 -2 27 z" fill="#F7F5F0" {...artTeal} />
        <path d="M96 22 q6 -7 12 0 q6 -7 12 0" {...artTeal} />
        <path d="M118 36 q5 -6 10 0 q5 -6 10 0" {...artTeal} />
      </svg>

      {/* anchor with a short wave (md+) */}
      <svg className="absolute bottom-0 hidden md:block" style={{ left: '44%' }} width="110" height="120" viewBox="0 0 110 120">
        <g {...artTeal}>
          <circle cx="55" cy="20" r="7" />
          <line x1="55" y1="27" x2="55" y2="92" />
          <line x1="38" y1="42" x2="72" y2="42" />
          <path d="M28 74 Q28 96 55 92 Q82 96 82 74" />
          <line x1="28" y1="74" x2="22" y2="82" />
          <line x1="82" y1="74" x2="88" y2="82" />
        </g>
        <path d="M16 108 q 10 -7 20 0 t 20 0 t 20 0 t 20 0" {...artWave} />
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

      {/* Decorative line-art band (user-requested harbor scene fill) */}
      {!loading && <ArtBandMiddle />}

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

      {/* Second decorative band above the global ship/waves */}
      {!loading && <ArtBandHarbor />}

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
