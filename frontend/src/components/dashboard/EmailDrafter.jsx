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

export default function EmailDrafter({ onRequireAuth, prefill }) {
  const [genOpen, setGenOpen] = useState(!!prefill);
  const [genBuyer, setGenBuyer] = useState(prefill?.buyerName || '');
  const [genProduct, setGenProduct] = useState(prefill?.product || '');
  const [genContext, setGenContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDrafted, setAiDrafted] = useState(false);
  const [marketIdx, setMarketIdx] = useState(0);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [localized, setLocalized] = useState(null); // { subject, content, model }
  const [isLocalizing, setIsLocalizing] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const market = TARGET_MARKETS[marketIdx];


  const handleGenerateDraft = async (e) => {
    if (e) e.preventDefault();
    if (!genBuyer.trim() || !genProduct.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    setLocalized(null);
    try {
      let sender = { name: 'Export Team', companyName: '', industry: '' };
      try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        if (u) sender = { name: u.name || sender.name, companyName: u.companyName || '', industry: u.industry || '' };
      } catch { /* keep defaults */ }
      const res = await apiFetch('/api/v1/agents/outreach', {
        method: 'POST',
        body: JSON.stringify({
          buyer: {
            companyName: genBuyer.trim(),
            country: (prefill?.country) || market.country,
            industry: 'Import & Distribution',
            importVolume: 'Unknown',
          },
          sender,
          tone: 'professional',
          language: 'en',
          custom_context: `Product: ${genProduct.trim()}.${genContext.trim() ? ' ' + genContext.trim() : ''}`,
        }),
      });
      if (res.status === 401) {
        onRequireAuth?.();
        return;
      }
      const json = await res.json();
      const draft = json?.data?.subject ? json.data : (json?.subject ? json : null);
      if (!res.ok || !draft) {
        throw new Error(json?.detail || json?.message || 'Draft generation failed');
      }
      setSubject(draft.subject || '');
      setBody(draft.content || '');
      setAiDrafted(true);
    } catch (err) {
      setError(typeof err.message === 'string' ? err.message : 'The drafting service is unavailable right now. Please try again shortly.');
    } finally {
      setIsGenerating(false);
    }
  };

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


      {/* AI first draft */}
      <div className="bg-white rounded-xl border border-line overflow-hidden">
        <button
          type="button"
          onClick={() => setGenOpen(!genOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-mist/60"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-navy">
            <Sparkles size={15} className="text-blue" />
            Write draft for me
          </span>
          <span className="text-[11px] text-muted">{genOpen ? 'Hide' : 'Buyer + product in, English first draft out'}</span>
        </button>
        {genOpen && (
          <form onSubmit={handleGenerateDraft} className="px-4 pb-4 pt-1 border-t border-line grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div>
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">Buyer company</label>
              <input
                type="text"
                value={genBuyer}
                onChange={(e) => setGenBuyer(e.target.value)}
                placeholder="e.g. Al Noor Trading LLC"
                required
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">Product / commodity</label>
              <input
                type="text"
                value={genProduct}
                onChange={(e) => setGenProduct(e.target.value)}
                placeholder="e.g. Turmeric powder (HS 091030)"
                required
                className={FIELD_CLASS}
              />
            </div>
            <button
              type="submit"
              disabled={isGenerating || !genBuyer.trim() || !genProduct.trim()}
              className="btn-primary px-4 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>{isGenerating ? 'Drafting...' : 'Generate draft'}</span>
            </button>
            <div className="sm:col-span-3">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">Context (optional)</label>
              <input
                type="text"
                value={genContext}
                onChange={(e) => setGenContext(e.target.value)}
                placeholder="e.g. met at Gulfood 2026, asked for 25kg bulk cartons"
                className={FIELD_CLASS}
              />
              <p className="text-[10px] text-faint mt-1.5">The AI writes an English first draft you can edit below, then localize. Review names, figures and claims before sending.</p>
            </div>
          </form>
        )}
      </div>

      {/* Side-by-side panes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Original draft */}
        <div className="bg-white rounded-xl border border-line-dark overflow-hidden flex flex-col">
          <div className="p-4 border-b border-line bg-mist flex items-center justify-between">
            <span className="text-xs font-bold text-navy uppercase tracking-wider">Your draft · English</span>
            {aiDrafted && (
              <span className="text-[10px] font-semibold text-accent-hover bg-amber-subtle border border-accent-border px-2 py-0.5 rounded-full">
                AI first draft - review before sending
              </span>
            )}
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
