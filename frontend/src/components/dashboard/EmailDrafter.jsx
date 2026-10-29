import React, { useState } from 'react';
import { Languages, Copy, Check, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { apiFetch } from '../../lib/api';

// Target export markets mapped to their business language.
const TARGET_MARKETS = [
  { country: 'Germany', language: 'German' },
  { country: 'France', language: 'French' },
  { country: 'Spain', language: 'Spanish' },
  { country: 'Italy', language: 'Italian' },
  { country: 'Netherlands', language: 'Dutch' },
  { country: 'Japan', language: 'Japanese' },
  { country: 'China', language: 'Chinese (Simplified)' },
  { country: 'South Korea', language: 'Korean' },
  { country: 'United Arab Emirates', language: 'Arabic' },
  { country: 'Saudi Arabia', language: 'Arabic' },
  { country: 'Brazil', language: 'Portuguese' },
  { country: 'Turkey', language: 'Turkish' },
  { country: 'Vietnam', language: 'Vietnamese' },
  { country: 'Indonesia', language: 'Indonesian' },
  { country: 'Russia', language: 'Russian' },
  { country: 'Poland', language: 'Polish' },
];

const FIELD_CLASS =
  'w-full px-3 py-2 bg-page border border-line-dark rounded-lg text-xs text-navy placeholder:text-faint focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15';

export default function EmailDrafter({ onRequireAuth }) {
  const [marketIdx, setMarketIdx] = useState(0);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [localized, setLocalized] = useState(null); // { subject, content, model }
  const [isLocalizing, setIsLocalizing] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const market = TARGET_MARKETS[marketIdx];

  const handleLocalize = async () => {
    if (!body.trim() || isLocalizing) return;
    setIsLocalizing(true);
    setError(null);
    setCopied(false);
    try {
      const res = await apiFetch('/api/v1/outreach/localize', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject.trim() || undefined,
          content: body.trim(),
          targetLanguage: market.language,
          targetCountry: market.country,
        }),
      });
      if (res.status === 401) {
        onRequireAuth?.();
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Localization failed');
      }
      setLocalized(json.data);
    } catch (err) {
      setError(err.message || 'The localization service is unavailable right now. Please try again shortly.');
    } finally {
      setIsLocalizing(false);
    }
  };

  const handleCopy = async () => {
    if (!localized) return;
    const text = `Subject: ${localized.subject || subject}\n\n${localized.content}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading font-bold text-xl md:text-2xl text-navy">Email Drafter</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-pale border border-blue-soft text-blue-dark text-[10px] font-bold uppercase tracking-wider">
              <Languages size={11} />
              AI Localization
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Draft your outreach in English, then localize it for the buyer's market in one click.
          </p>
        </div>

        {/* Target market selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="target-market" className="text-xs font-semibold text-soft">Target market</label>
          <select
            id="target-market"
            value={marketIdx}
            onChange={(e) => { setMarketIdx(Number(e.target.value)); setLocalized(null); setError(null); }}
            className="px-3 py-2 bg-white border border-line-dark rounded-lg text-xs text-navy focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15"
          >
            {TARGET_MARKETS.map((m, i) => (
              <option key={m.country} value={i}>{m.country} · {m.language}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Side-by-side panes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Original draft */}
        <div className="bg-white rounded-xl border border-line-dark overflow-hidden flex flex-col">
          <div className="p-4 border-b border-line bg-mist flex items-center justify-between">
            <span className="text-xs font-bold text-navy uppercase tracking-wider">Your draft · English</span>
            <span className="text-[10px] text-faint font-mono">{body.trim().length}/4000</span>
          </div>
          <div className="p-4 flex flex-col gap-3 flex-1">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder="Subject line"
              className={FIELD_CLASS}
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 4000))}
              rows={14}
              placeholder="Dear Procurement Team,&#10;&#10;Write your outreach email here in English..."
              className={`${FIELD_CLASS} resize-y flex-1`}
            />
            <div className="flex justify-end">
              <button
                onClick={handleLocalize}
                disabled={!body.trim() || isLocalizing}
                className="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLocalizing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>{isLocalizing ? `Localizing to ${market.language}...` : `Localize to ${market.language}`}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Localized output */}
        <div className="bg-white rounded-xl border border-line-dark overflow-hidden flex flex-col">
          <div className="p-4 border-b border-line bg-mist flex items-center justify-between">
            <span className="text-xs font-bold text-navy uppercase tracking-wider">
              Localized · {market.language}
            </span>
            {localized && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs font-semibold text-blue hover:text-blue-dark transition-colors"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

          <div className="p-4 flex flex-col gap-3 flex-1">
            {error && (
              <div className="p-3 rounded-lg bg-red-pale border border-red-border text-xs text-red-dark flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div className="flex-1">
                  {error}
                  <button onClick={handleLocalize} className="block mt-1.5 font-semibold underline">Retry</button>
                </div>
              </div>
            )}

            {isLocalizing ? (
              // Skeleton mirrors the output layout while the agent translates.
              <div className="flex flex-col gap-3 animate-pulse">
                <div className="h-9 rounded-lg bg-surface" />
                <div className="h-3.5 w-11/12 rounded bg-surface" />
                <div className="h-3.5 w-full rounded bg-surface" />
                <div className="h-3.5 w-4/5 rounded bg-surface" />
                <div className="h-3.5 w-full rounded bg-surface" />
                <div className="h-3.5 w-3/5 rounded bg-surface" />
              </div>
            ) : localized ? (
              <>
                <div className="px-3 py-2 bg-page border border-line rounded-lg text-xs font-semibold text-navy">
                  {localized.subject || subject || '(no subject)'}
                </div>
                <div className="px-3 py-2 bg-page border border-line rounded-lg text-xs text-navy whitespace-pre-wrap leading-relaxed flex-1">
                  {localized.content}
                </div>
              </>
            ) : !error && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-faint mb-3">
                  <Languages size={18} />
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Your localized email appears here. Pick a target market, write your draft, and hit Localize.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Honest-use note */}
      <p className="text-[11px] text-faint leading-relaxed">
        Localization is AI-generated and keeps your structure, names, and figures unchanged. For high-value
        prospects, have a native speaker review the localized version before sending.
      </p>
    </div>
  );
}
