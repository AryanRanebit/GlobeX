import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Loader2, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import Term from '../ui/Jargon';
import ScrollHint from '../ui/ScrollHint';

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 150000;

/**
 * Full market analysis flow: runs the async analysis engine
 * (POST /api/v1/market/analyze + status polling) and renders the verified
 * result - top markets, scores, classification status, and the API's own
 * disclaimers, prominently when the analysis fell back to aggregate data.
 */
export default function AnalysisModal({ isOpen, onClose, initialProduct = '', storedResult = null }) {
  const [product, setProduct] = useState(initialProduct);
  const [phase, setPhase] = useState('idle'); // idle | running | done | failed
  const [jobState, setJobState] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (storedResult) {
        // History replay: render the stored snapshot only. No analysis
        // job is started and no external API is called.
        setProduct(storedResult.product || initialProduct);
        setResult(storedResult);
        setPhase('done');
      } else {
        setProduct(initialProduct);
        setPhase('idle');
        setResult(null);
      }
      setError(null);
      setJobState('');
    }
    return () => clearTimeout(pollRef.current);
  }, [isOpen, initialProduct, storedResult]);

  if (!isOpen) return null;

  const pollStatus = async (jobId, startedAt) => {
    try {
      const res = await apiFetch(`/api/v1/market/analyze/status/${jobId}`);
      const json = await res.json();
      const job = json.data;
      const state = job?.status || job?.state || '';
      setJobState(state);
      if (state === 'succeeded' && job.result) {
        setResult(job.result);
        setPhase('done');
        return;
      }
      if (state === 'failed') {
        setError(job.error || 'The analysis job failed. Please try again.');
        setPhase('failed');
        return;
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setError('The analysis is taking longer than expected. Please try again in a moment.');
        setPhase('failed');
        return;
      }
      pollRef.current = setTimeout(() => pollStatus(jobId, startedAt), POLL_INTERVAL_MS);
    } catch (err) {
      setError(err.message || 'Lost connection while checking analysis status.');
      setPhase('failed');
    }
  };

  const runAnalysis = async (e) => {
    if (e) e.preventDefault();
    if (!product.trim()) return;
    clearTimeout(pollRef.current);
    setPhase('running');
    setError(null);
    setResult(null);
    setJobState('queued');
    try {
      const res = await apiFetch('/api/v1/market/analyze', {
        method: 'POST',
        body: JSON.stringify({ product: product.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || `Analysis could not be started (status ${res.status})`);
      }
      const jobId = json.data.jobId || json.data.id;
      pollStatus(jobId, Date.now());
    } catch (err) {
      setError(err.message || 'Could not start the analysis.');
      setPhase('failed');
    }
  };

  const mode = result?.dataSourceMode || '';
  const isUnavailable = mode === 'unavailable';
  const fellBackToTotal = (result?.disclaimer || '').includes('all goods');
  const rows = (result?.recommendedCountries || []).filter(c => c.countryCode !== 'XX');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-line shadow-[var(--shadow-pop)] max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 flex flex-col gap-5">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-line pb-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-blue uppercase">GlobeX Market Analysis</span>
            <h2 className="text-xl font-black text-navy font-heading mt-0.5">
              {phase === 'done' && result ? `Top Export Markets: ${result.product}` : 'Run Full Market Analysis'}
            </h2>
            {phase === 'done' && result && (
              <p className="text-xs text-muted mt-0.5">
                Classification: <strong>{result.candidateHsCode ? `HS ${result.candidateHsCode}` : 'No specific HS code matched'}</strong>
                {result.category ? ` · ${result.category}` : ''}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-surface text-soft rounded-lg text-xs font-bold hover:bg-line"
            aria-label="Close analysis"
          >
            <X size={14} />
          </button>
        </div>

        {/* Input form (idle / failed) */}
        {phase !== 'done' && (
          <form onSubmit={runAnalysis} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="Product or commodity (e.g. Cotton Trousers, Turmeric)"
              required
              disabled={phase === 'running'}
              className="flex-1 px-3 py-2.5 bg-page border border-line-dark rounded-lg text-sm text-navy focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15"
            />
            <button
              type="submit"
              disabled={phase === 'running' || !product.trim()}
              className="btn-primary px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {phase === 'running' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>{phase === 'running' ? 'Analyzing...' : 'Run Analysis'}</span>
            </button>
          </form>
        )}

        {/* Examples so a first-time user can tap instead of type */}
        {phase === 'idle' && !product.trim() && (
          <div className="flex flex-wrap items-center gap-2 -mt-2">
            <span className="text-[11px] text-muted">Try an example:</span>
            {['Basmati rice', 'Turmeric fingers', 'Cotton trousers'].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setProduct(ex)}
                className="px-2.5 py-1 bg-blue-pale text-blue rounded-full text-[11px] font-medium hover:bg-blue-border"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* Running state */}
        {phase === 'running' && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Loader2 size={28} className="animate-spin text-blue" />
            <p className="text-sm font-semibold text-navy">Analyzing {product} against official trade data...</p>
            <p className="text-xs text-muted">
              Job {jobState || 'queued'} · This classifies your product, pulls verified UN Comtrade rows, and scores destinations. Usually 15-40 seconds.
            </p>
          </div>
        )}

        {/* Failure */}
        {phase === 'failed' && (
          <div className="p-4 rounded-lg bg-red-pale border border-red-border text-xs text-red-dark flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Result */}
        {phase === 'done' && result && (
          <>
            {/* Data source + disclaimer (always visible; loud on fallback) */}
            <div className={`p-4 rounded-lg border text-xs leading-relaxed flex items-start gap-2 ${
              isUnavailable || fellBackToTotal
                ? 'bg-amber-subtle border-accent-border text-accent-hover'
                : 'bg-blue-pale border-blue-border text-blue-dark'
            }`}>
              {isUnavailable || fellBackToTotal
                ? <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                : <ShieldCheck size={15} className="shrink-0 mt-0.5" />}
              <div>
                <p className="font-bold mb-0.5">
                  {isUnavailable
                    ? 'Trade data unavailable for this product'
                    : fellBackToTotal
                      ? 'Scope notice: aggregate fallback'
                      : mode === 'official_un_comtrade_2025'
                        ? 'Grounded in official UN Comtrade 2025 data'
                        : 'AI qualitative estimate'}
                </p>
                {result.disclaimer && <p>{result.disclaimer}</p>}
              </div>
            </div>

            {/* Summary */}
            {result.summary && (
              <p className="text-sm text-soft leading-relaxed">{result.summary}</p>
            )}

            {/* Unavailable: no invented rows */}
            {isUnavailable || rows.length === 0 ? (
              <div className="p-6 text-center text-muted border border-line rounded-xl bg-mist">
                <Info size={18} className="mx-auto mb-1.5 text-faint" />
                <p className="text-sm font-semibold text-navy">No ranked destinations to show</p>
                <p className="text-xs mt-1">GlobeX does not generate or simulate artificial trade numbers.</p>
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
                        <th className="py-2.5 px-3 font-bold">Trade Volume Score</th>
                        <th className="py-2.5 px-3 font-bold">Growth</th>
                        <th className="py-2.5 px-3 font-bold">Market Size</th>
                        <th className="py-2.5 px-3 font-bold">Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((c, i) => (
                        <tr key={c.country} className="border-b border-line last:border-0 hover:bg-mist/60">
                          <td className="py-2.5 px-3 text-faint font-mono">{i + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-navy whitespace-nowrap">
                            {c.country} <span className="text-[10px] text-muted font-mono font-normal">({c.countryCode})</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-pale text-blue-dark">
                              {c.demandScore}/100
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-soft whitespace-nowrap">{c.growthRate}</td>
                          <td className="py-2.5 px-3 text-muted italic whitespace-nowrap">{c.marketSize || 'Not available from free data'}</td>
                          <td className="py-2.5 px-3 text-muted text-[11px] leading-snug max-w-[260px]"><span className="line-clamp-4" title={c.insights}>{c.insights}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-faint px-3 py-2 bg-mist border-t border-line">
                  Score = the market's India-reported export value (<Term t="FOB" />) as a % of the largest listed market. It reflects existing trade volume, not forecast demand. Competition and destination market size are not available from free single-reporter data.
                </p>
              </div>
            )}

            {/* Run again (not in history replay mode) */}
            {!storedResult && (
              <button
                onClick={() => setPhase('idle')}
                className="self-start text-xs font-semibold text-blue hover:underline"
              >
                Run analysis for another product
              </button>
            )}
            {storedResult && (
              <p className="text-[11px] text-faint flex items-center gap-1.5">
                <ShieldCheck size={12} className="shrink-0" />
                Saved result - reopened from your history without re-running the analysis.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
