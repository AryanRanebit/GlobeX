import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Briefcase, Plus, Trash2, ArrowLeft, Save, Globe2, Users, FileCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * Export Case (roadmap step 2): one saved product-to-market workflow.
 * Unknown stays unknown: unconfirmed fields are labelled, never guessed.
 */

const STAGES = ['product', 'markets', 'requirements', 'leads', 'outreach'];

const fmtUsd = (n) =>
  typeof n === 'number' ? `$${n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.round(n).toLocaleString()}` : 'n/a';

function nextAction(c) {
  if (!c) return null;
  if (!c.hsCode) return 'Confirm your HS code. Without it, market and tariff data stay unconfirmed.';
  if (!Array.isArray(c.markets) || c.markets.length === 0) return 'Compare destination markets with the 2025 trade data below, then save a shortlist.';
  if (!c.targetCountry) return 'Pick a target country from your shortlist.';
  if (!Array.isArray(c.requirements) || c.requirements.length === 0) return 'Check what is on file for this market. Anything not on file is unknown, not cleared.';
  return 'Shortlist buyers in Buyer Discovery and track outreach. Discovery uses Gemini credit and only runs when you start it.';
}

const emptyForm = { productName: '', hsCode: '', form: '', composition: '', quantity: '', targetCountry: '', notes: '' };


// Destination names a user may type -> ISO 3166-1 alpha-2. Unknown names pass
// through unchanged; the backend then reports no coverage (unknown stays
// unknown) rather than a guessed match.
const COUNTRY_CODE = {
  'united states': 'US', 'united states of america': 'US', 'usa': 'US', 'us': 'US', 'america': 'US',
  'united arab emirates': 'AE', 'uae': 'AE',
  'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB',
  'germany': 'DE', 'netherlands': 'NL', 'france': 'FR', 'singapore': 'SG', 'saudi arabia': 'SA',
};

function destinationCode(name) {
  const n = (name || '').trim().toLowerCase();
  return COUNTRY_CODE[n] || (name || '').trim().toUpperCase();
}

/**
 * Requirements panel: shows committed source-checked entries for the case's
 * HS code + destination, each with its conditions, official source link and
 * source-check date, plus the known-uncovered rule areas. The response can
 * never be read as complete clearance: it always carries a partial-coverage
 * label and gaps. No coverage -> unknown, not cleared.
 */
function RequirementsPanel({ hsCode, targetCountry }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    if (!hsCode || !targetCountry) { setState({ status: 'idle' }); return; }
    let cancelled = false;
    setState({ status: 'loading' });
    const params = new URLSearchParams({ hs: hsCode, destination: destinationCode(targetCountry) });
    apiFetch(`/api/v1/requirements?${params}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) { setState({ status: 'error' }); return; }
        const body = await res.json();
        setState({ status: 'ok', data: body.data });
      })
      .catch(() => { if (!cancelled) setState({ status: 'error' }); });
    return () => { cancelled = true; };
  }, [hsCode, targetCountry]);

  if (!targetCountry) {
    return <p className="text-xs text-muted">Requirements attach to a product AND a destination. Choose a target country first.</p>;
  }
  if (state.status === 'loading') return <p className="text-xs text-muted">Checking source-checked requirements…</p>;
  if (state.status === 'error') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">Requirements could not be loaded. Treat them as unknown, not cleared, and confirm with your customs broker or the destination country's official portal before shipping.</p>
      </div>
    );
  }
  const data = state.data;
  if (!data || !data.covered) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          Nothing source-checked is on file for this product-country pair yet, so treat requirements as unknown, not cleared. Confirm them with your customs broker or the destination country's official portal before shipping. Entries checked against official sources will appear here with the source link and the date they were checked.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="bg-blue-pale border border-blue-soft rounded-lg p-3">
        <p className="text-xs text-navy">
          Partial source-checked guidance for this pair — each entry links the official source and the date it was checked. This is not complete clearance: the conditions on each entry and the not-yet-covered areas below still apply. Confirm applicability for your product and shipment against the official source.
        </p>
      </div>
      {data.requirements.map((r) => (
        <div key={r.id} className="border border-line rounded-lg p-3 flex flex-col gap-1">
          <p className="text-sm font-semibold text-navy">{r.title}</p>
          <p className="text-xs text-ink">{r.detail}</p>
          <p className="text-[11px] text-muted"><span className="font-medium">Conditions:</span> {r.conditions}</p>
          <p className="text-[11px] text-muted">
            Source: <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="text-blue underline break-all">{r.sourceUrl}</a>
            {' '}(checked {r.sourceCheckedAt})
          </p>
        </div>
      ))}
      {Array.isArray(data.gaps) && data.gaps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-800 mb-1">Not yet covered — still unknown:</p>
          <ul className="list-disc pl-4">
            {data.gaps.map((g, i) => <li key={i} className="text-xs text-amber-800">{g}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ExportCase({ onNavigate }) {
  const [cases, setCases] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [markets, setMarkets] = useState(null);
  const [marketsMeta, setMarketsMeta] = useState(null);
  const [marketsLoading, setMarketsLoading] = useState(false);
  const [marketsError, setMarketsError] = useState(null);
  const [picked, setPicked] = useState({});
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);
  const [clearsNotice, setClearsNotice] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/export-cases?limit=50');
      const j = await res.json();
      if (j.success && Array.isArray(j.data)) setCases(j.data);
      else setError(j.message || 'Could not load export cases');
    } catch {
      setError('Could not load export cases');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshSelected = async (id) => {
    const res = await apiFetch(`/api/v1/export-cases/${id}`);
    const j = await res.json();
    if (j.success) setSelected(j.data);
  };

  const createCase = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim() !== ''));
      const res = await apiFetch('/api/v1/export-cases', { method: 'POST', body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.message || `Create failed (${res.status})`);
      setShowCreate(false);
      setForm(emptyForm);
      await load();
      setSelected(j.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const patchCase = async (patch) => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/v1/export-cases/${selected.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.message || `Save failed (${res.status})`);
      setSelected(j.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const removeCase = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete the export case for "${selected.productName}"? This cannot be undone.`)) return;
    await apiFetch(`/api/v1/export-cases/${selected.id}`, { method: 'DELETE' });
    setSelected(null);
    load();
  };

  const fetchMarkets = async () => {
    if (!selected?.hsCode) return;
    setMarketsLoading(true);
    setMarketsError(null);
    setMarkets(null);
    try {
      // Same prefix-fallback the Market Intelligence tab uses.
      const hs = selected.hsCode;
      const candidates = Array.from({ length: Math.ceil((hs.length - 1) / 2) }, (_, i) => hs.slice(0, hs.length - 2 * i)).filter((c) => c.length >= 2);
      let json = null;
      for (const code of candidates) {
        const res = await apiFetch(`/api/trade/markets?hs=${code}&year=2025&limit=250`);
        if (!res.ok) throw new Error(`Trade data request failed (${res.status})`);
        const j = await res.json();
        if (!(j.success && Array.isArray(j.data))) throw new Error('Malformed trade data response');
        json = j;
        if (j.data.length > 0) break;
      }
      setMarkets(json.data.slice(0, 10));
      // Year/source come from the endpoint's own meta, never assumed.
      setMarketsMeta(json.meta && typeof json.meta === 'object' ? json.meta : null);
    } catch (e) {
      setMarketsError(e.message);
    } finally {
      setMarketsLoading(false);
    }
  };

  const saveShortlist = async () => {
    const year = marketsMeta && marketsMeta.year;
    const chosen = (markets || []).filter((m) => picked[m.partnerName]).map((m) => ({
      partnerName: m.partnerName,
      partnerIso3: m.partnerIso3,
      tradeValueUsd: m.tradeValueUsd,
      dataYear: typeof year === 'number' ? year : null,
      source: 'UN Comtrade (India-reported exports), via the GlobeX trade endpoint',
    }));
    if (chosen.length === 0) return;
    await patchCase({ markets: chosen, stage: 'requirements' });
  };

  const startEdit = () => {
    setEditForm({
      productName: selected.productName || '',
      hsCode: selected.hsCode || '',
      form: selected.form || '',
      composition: selected.composition || '',
      quantity: selected.quantity || '',
      targetCountry: selected.targetCountry || '',
      notes: selected.notes || '',
    });
    setClearsNotice(false);
    setEditing(true);
  };

  const saveEdit = async () => {
    const patch = {};
    const normHs = editForm.hsCode.replace(/[.\s]/g, '');
    if (editForm.productName.trim() !== selected.productName) patch.productName = editForm.productName.trim();
    if (normHs !== (selected.hsCode || '')) patch.hsCode = normHs;
    for (const k of ['form', 'composition', 'quantity', 'targetCountry', 'notes']) {
      const v = editForm[k].trim();
      if (v !== (selected[k] || '')) patch[k] = v === '' ? null : v;
    }
    if (Object.keys(patch).length === 0) { setEditing(false); return; }
    // Stale-state rule: a changed product or HS code invalidates the saved
    // shortlist and requirements; a changed target invalidates requirements.
    // Clear them in the same patch so old data never looks current.
    if (patch.productName !== undefined || patch.hsCode !== undefined) {
      patch.markets = null;
      patch.requirements = null;
      patch.stage = 'product';
    } else if (patch.targetCountry !== undefined) {
      patch.requirements = null;
    }
    await patchCase(patch);
    setEditing(false);
    setMarkets(null);
    setPicked({});
  };

  // ── List view ────────────────────────────────────────────────────────────
  if (!selected) {
    return (
      <div className="flex flex-col gap-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-navy font-heading flex items-center gap-2"><Briefcase size={20} /> Export Cases</h2>
            <p className="text-sm text-muted mt-1">One saved case per product-to-market plan. Unconfirmed details are labelled, never guessed.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald text-white text-sm font-semibold hover:bg-emerald-dark">
            <Plus size={15} /> New case
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {showCreate && (
          <div className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-navy text-sm">Describe the product</h3>
            <input className="border border-line rounded-lg px-3 py-2 text-sm" placeholder="Product name (required), e.g. Organic fertilizer pellets"
              value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className="border border-line rounded-lg px-3 py-2 text-sm" placeholder="HS code, e.g. 3105. Leave blank if unsure: it stays unconfirmed."
                value={form.hsCode} onChange={(e) => setForm({ ...form, hsCode: e.target.value })} />
              <input className="border border-line rounded-lg px-3 py-2 text-sm" placeholder="Form, e.g. pellets, powder"
                value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })} />
              <input className="border border-line rounded-lg px-3 py-2 text-sm" placeholder="Quantity you can supply"
                value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              <input className="border border-line rounded-lg px-3 py-2 text-sm" placeholder="Target country, if you have one in mind"
                value={form.targetCountry} onChange={(e) => setForm({ ...form, targetCountry: e.target.value })} />
            </div>
            <textarea className="border border-line rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Composition or anything a buyer would ask about"
              value={form.composition} onChange={(e) => setForm({ ...form, composition: e.target.value })} />
            <div className="flex gap-2">
              <button disabled={saving || form.productName.trim().length < 2} onClick={createCase}
                className="px-3 py-2 rounded-lg bg-navy text-white text-sm font-semibold disabled:opacity-50">Save case</button>
              <button onClick={() => setShowCreate(false)} className="px-3 py-2 rounded-lg text-sm text-muted hover:text-navy">Cancel</button>
            </div>
          </div>
        )}

        {cases === null && !error && <p className="text-sm text-muted">Loading...</p>}
        {cases && cases.length === 0 && !showCreate && (
          <div className="bg-surface border border-dashed border-line rounded-xl p-8 text-center text-sm text-muted">
            No export cases yet. Start one above; it keeps your product details, market shortlist, requirements and leads in one place.
          </div>
        )}
        {cases && cases.map((c) => (
          <button key={c.id} onClick={() => setSelected(c)} className="text-left bg-surface border border-line rounded-xl p-4 hover:border-emerald transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-navy text-sm">{c.productName}</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-pale text-emerald-ink border border-emerald-border capitalize">{c.stage}</span>
            </div>
            <p className="text-xs text-muted mt-1">
              HS {c.hsCode || 'not confirmed'}{c.targetCountry ? ` · Target: ${c.targetCountry}` : ''} · Updated {new Date(c.updatedAt).toLocaleDateString()}
            </p>
          </button>
        ))}
      </div>
    );
  }

  // ── Detail view ──────────────────────────────────────────────────────────
  const action = nextAction(selected);
  const hasMarkets = Array.isArray(selected.markets) && selected.markets.length > 0;

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <button onClick={() => { setSelected(null); setMarkets(null); setPicked({}); load(); }} className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy">
          <ArrowLeft size={15} /> All cases
        </button>
        <button onClick={removeCase} className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700">
          <Trash2 size={14} /> Delete case
        </button>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-navy font-heading">{selected.productName}</h2>
          {!editing && <button onClick={startEdit} className="text-sm text-emerald-ink hover:underline">Edit details</button>}
        </div>
        {!editing && (
          <>
            <p className="text-sm text-muted mt-1">
              HS {selected.hsCode || <span className="text-amber-700 font-medium">not confirmed</span>}
              {selected.form ? ` · ${selected.form}` : ''}
              {selected.quantity ? ` · ${selected.quantity}` : ''}
              {selected.targetCountry ? ` · Target: ${selected.targetCountry}` : ' · Target country not chosen'}
            </p>
            {selected.composition && <p className="text-xs text-muted mt-1">{selected.composition}</p>}
          </>
        )}
      </div>

      {editing && (
        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="border border-line rounded-lg px-3 py-2 text-sm" placeholder="Product name"
              value={editForm.productName} onChange={(e) => { setEditForm({ ...editForm, productName: e.target.value }); setClearsNotice(true); }} />
            <input className="border border-line rounded-lg px-3 py-2 text-sm" placeholder="HS code (blank = unconfirmed)"
              value={editForm.hsCode} onChange={(e) => { setEditForm({ ...editForm, hsCode: e.target.value }); setClearsNotice(true); }} />
            <input className="border border-line rounded-lg px-3 py-2 text-sm" placeholder="Form"
              value={editForm.form} onChange={(e) => setEditForm({ ...editForm, form: e.target.value })} />
            <input className="border border-line rounded-lg px-3 py-2 text-sm" placeholder="Quantity"
              value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} />
            <input className="border border-line rounded-lg px-3 py-2 text-sm" placeholder="Target country"
              value={editForm.targetCountry} onChange={(e) => { setEditForm({ ...editForm, targetCountry: e.target.value }); setClearsNotice(true); }} />
          </div>
          <textarea className="border border-line rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Composition"
            value={editForm.composition} onChange={(e) => setEditForm({ ...editForm, composition: e.target.value })} />
          {clearsNotice && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Changing the product, HS code or target clears the saved market shortlist and requirements in the same save, so outdated data never looks current.
            </p>
          )}
          <div className="flex gap-2">
            <button disabled={saving || editForm.productName.trim().length < 2} onClick={saveEdit}
              className="px-3 py-2 rounded-lg bg-navy text-white text-sm font-semibold disabled:opacity-50">Save changes</button>
            <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-lg text-sm text-muted hover:text-navy">Cancel</button>
          </div>
        </div>
      )}

      {/* Stage stepper */}
      <div className="flex items-center gap-1 flex-wrap">
        {STAGES.map((s, i) => (
          <React.Fragment key={s}>
            <span className={`text-[11px] px-2 py-1 rounded capitalize ${STAGES.indexOf(selected.stage) >= i ? 'bg-emerald-pale text-emerald-ink border border-emerald-border font-semibold' : 'bg-surface text-faint border border-line'}`}>{s}</span>
            {i < STAGES.length - 1 && <span className="text-faint">→</span>}
          </React.Fragment>
        ))}
      </div>

      {action && (
        <div className="bg-blue-pale border border-blue-soft rounded-xl p-4 flex gap-2">
          <CheckCircle2 size={16} className="text-blue shrink-0 mt-0.5" />
          <p className="text-sm text-blue-dark"><strong>Next action:</strong> {action}</p>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Markets */}
      <section className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-3">
        <h3 className="font-semibold text-navy text-sm flex items-center gap-2"><Globe2 size={15} /> Markets</h3>
        {!selected.hsCode && <p className="text-xs text-muted">Market comparison needs a confirmed HS code. Edit the case to add one.</p>}
        {selected.hsCode && !hasMarkets && (
          <>
            <button onClick={fetchMarkets} disabled={marketsLoading}
              className="self-start px-3 py-2 rounded-lg bg-navy text-white text-sm font-semibold disabled:opacity-50">
              {marketsLoading ? 'Loading 2025 trade data...' : 'Compare markets (UN Comtrade 2025)'}
            </button>
            {marketsError && <p className="text-sm text-red-600">{marketsError}</p>}
            {markets && markets.length === 0 && <p className="text-sm text-muted">No 2025 trade rows on file for HS {selected.hsCode}. That is a data gap, not proof of no trade.</p>}
            {markets && markets.length > 0 && (
              <>
                <p className="text-xs text-muted">Top destinations by India-reported export value{marketsMeta?.year ? `, ${marketsMeta.year}` : ''}. Trade volume is context, not guaranteed demand. Tick markets to shortlist.</p>
                <div className="flex flex-col gap-1">
                  {markets.map((m) => (
                    <label key={m.partnerName} className="flex items-center gap-2 text-sm py-1 border-b border-line last:border-0">
                      <input type="checkbox" checked={!!picked[m.partnerName]} onChange={(e) => setPicked({ ...picked, [m.partnerName]: e.target.checked })} />
                      <span className="flex-1 text-navy">{m.partnerName}</span>
                      <span className="text-muted text-xs">{fmtUsd(m.tradeValueUsd)}</span>
                    </label>
                  ))}
                </div>
                <button onClick={saveShortlist} disabled={saving || !Object.values(picked).some(Boolean)}
                  className="self-start inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald text-white text-sm font-semibold disabled:opacity-50">
                  <Save size={14} /> Save shortlist to case
                </button>
              </>
            )}
          </>
        )}
        {hasMarkets && (
          <>
            <p className="text-xs text-muted">Shortlist saved from UN Comtrade (India-reported exports):</p>
            {selected.markets.map((m) => (
              <div key={m.partnerName} className="flex items-center justify-between text-sm py-1 border-b border-line last:border-0">
                <span className="text-navy">{m.partnerName}</span>
                <span className="text-muted text-xs">{fmtUsd(m.tradeValueUsd)}{m.dataYear ? ` · ${m.dataYear}` : ''}</span>
              </div>
            ))}
            {!selected.targetCountry && (
              <div className="flex items-center gap-2">
                <select className="border border-line rounded-lg px-2 py-1.5 text-sm" value={form.targetCountry} onChange={(e) => setForm({ ...form, targetCountry: e.target.value })}>
                  <option value="">Choose target country...</option>
                  {selected.markets.map((m) => <option key={m.partnerName} value={m.partnerName}>{m.partnerName}</option>)}
                </select>
                <button disabled={!form.targetCountry || saving} onClick={() => patchCase({ targetCountry: form.targetCountry })}
                  className="px-3 py-1.5 rounded-lg bg-navy text-white text-sm font-semibold disabled:opacity-50">Set target</button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Requirements */}
      <section className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-2">
        <h3 className="font-semibold text-navy text-sm flex items-center gap-2"><FileCheck size={15} /> Requirements</h3>
        <RequirementsPanel hsCode={selected.hsCode} targetCountry={selected.targetCountry} />
      </section>

      {/* Leads */}
      <section className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-2">
        <h3 className="font-semibold text-navy text-sm flex items-center gap-2"><Users size={15} /> Buyer leads</h3>
        <p className="text-xs text-muted">
          Buyer Discovery runs a grounded web search and spends Gemini credit; it only runs when you start it. Every lead carries its source link, and a public web presence alone does not confirm import activity.
        </p>
        <button onClick={() => onNavigate && onNavigate('buyers')} className="self-start px-3 py-2 rounded-lg bg-navy text-white text-sm font-semibold">
          Open Buyer Discovery
        </button>
      </section>
    </div>
  );
}
