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
