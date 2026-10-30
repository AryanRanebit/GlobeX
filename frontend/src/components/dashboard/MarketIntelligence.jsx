import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Globe2,
  AlertTriangle,
  Search,
  X,
  Sparkles,
  Building2,
  FileDown,
  ExternalLink,
  Info,
  ChevronRight,
  Printer,
  Loader2
} from 'lucide-react';
import { TRADE_STATS } from '../../constants/tradeStats';
import { apiFetch } from '../../lib/api';
import { parseHsQuery } from '../../lib/hsQuery';

function TableSkeletonRows({ rows = 8 }) {
  return (
    <div className="flex flex-col divide-y divide-line animate-pulse" role="status" aria-label="Loading trade data">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <div className="w-5 h-3.5 rounded bg-surface shrink-0" />
          <div className="w-32 h-3.5 rounded bg-surface" />
          <div className="w-16 h-3.5 rounded bg-surface ml-auto" />
          <div className="w-14 h-5 rounded-md bg-surface" />
          <div className="w-24 h-5 rounded bg-surface hidden md:block" />
          <div className="w-24 h-5 rounded bg-surface hidden md:block" />
          <div className="w-20 h-6 rounded-md bg-surface" />
        </div>
      ))}
    </div>
  );
}

export default function MarketIntelligence({ searchQuery = '', onSearchChange, onNavigateToBuyers }) {
  // HS-code queries (typed or from trending chips) drive the product
  // context, not the country filter.
  const initialParsed = parseHsQuery(searchQuery);
  const [selectedHs, setSelectedHs] = useState(initialParsed ? initialParsed.hs : '62'); // Default to HS 62 Apparel
  const [localQuery, setLocalQuery] = useState(initialParsed ? '' : searchQuery);
  const [productLabel, setProductLabel] = useState(initialParsed ? initialParsed.label : null);
  const [resolvedHs, setResolvedHs] = useState(initialParsed ? initialParsed.hs : '62');
  const [markets, setMarkets] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Drill-down market modal
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Tariff/duty lookup (WITS via backend) for the drilled-down market
  const [tariff, setTariff] = useState(null);
  const [tariffLoading, setTariffLoading] = useState(false);

  // Sync the external global search query into local state
  // (render-time adjustment instead of an effect).
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
  if (prevSearchQuery !== searchQuery) {
    setPrevSearchQuery(searchQuery);
    const parsed = parseHsQuery(searchQuery);
    if (parsed) {
      setLocalQuery('');
      setProductLabel(parsed.label);
      if (parsed.hs !== selectedHs) {
        setLoading(true);
        setError(null);
        setSelectedHs(parsed.hs);
      }
    } else {
      setLocalQuery(searchQuery);
      setProductLabel(null);
    }
  }

  // Fetch real trade markets from backend. Initial state is already
  // loading=true, so the effect never sets state synchronously; HS switches
  // and retries enter the loading state from their event handlers.
  const fetchMarkets = useCallback(async (hsCode) => {
    try {
      // Exact HS codes often have no rows while a parent heading does
      // (e.g. 620462 -> 6204 -> 62). Walk up prefixes until data appears.
      const candidates = /^\d+$/.test(hsCode) && hsCode.length > 2
        ? Array.from({ length: Math.ceil((hsCode.length - 1) / 2) }, (_, i) => hsCode.slice(0, hsCode.length - 2 * i)).filter(c => c.length >= 2)
        : [hsCode];
      let json = null;
      let used = hsCode;
      for (const code of candidates) {
        const res = await apiFetch(`/api/trade/markets?hs=${code}&year=2025&limit=250`);
        if (!res.ok) {
          throw new Error(`Failed to fetch trade data (Status ${res.status})`);
        }
        const j = await res.json();
        if (!(j.success && Array.isArray(j.data))) {
          throw new Error(j.message || 'Malformed trade data response');
        }
        json = j;
        used = code;
        if (j.data.length > 0) break;
      }
      setMarkets(json.data);
      setMeta(json.meta);
      setResolvedHs(used);
      setError(null);
    } catch (err) {
      console.error('Error fetching trade data:', err);
      setError(err.message || 'Could not load official Comtrade data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Event-handler refresh: enters the loading state, then re-fetches.
  const refetchMarkets = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchMarkets(selectedHs);
  }, [fetchMarkets, selectedHs]);

  const handleHsChange = (hs) => {
    if (hs === selectedHs) return;
    setLoading(true);
    setError(null);
    setSelectedHs(hs);
  };

  useEffect(() => {
    let active = true;
    // Deferred to a microtask so no state is set synchronously in the effect.
    Promise.resolve().then(() => {
      if (active) fetchMarkets(selectedHs);
    });
    return () => { active = false; };
  }, [selectedHs, fetchMarkets]);

  // Fetch MFN + India-preferential tariff when a market dossier opens.
  // Free WITS source; failures degrade to an honest "not available" note.
  useEffect(() => {
    if (!selectedMarket) {
      Promise.resolve().then(() => setTariff(null));
      return;
    }
    let active = true;
    const country = selectedMarket.partnerIso3 || selectedMarket.countryCode || '';
    if (!country) return;
    Promise.resolve().then(() => {
      if (active) { setTariffLoading(true); setTariff(null); }
    });
    apiFetch(`/api/v1/tariff?hs=${encodeURIComponent(resolvedHs)}&country=${encodeURIComponent(country)}`)
      .then((r) => r.json())
      .then((j) => { if (active && j?.success) setTariff(j.data); })
      .catch(() => { /* tariff panel stays in its honest fallback state */ })
      .finally(() => { if (active) setTariffLoading(false); });
    return () => { active = false; };
  }, [selectedMarket, resolvedHs]);

  // Filtered markets based on search term
  const filteredMarkets = useMemo(() => {
    if (!localQuery.trim()) return markets;
    const q = localQuery.toLowerCase().trim();
    return markets.filter(m =>
      m.partnerName.toLowerCase().includes(q) ||
      (m.partnerIso3 && m.partnerIso3.toLowerCase().includes(q))
    );
  }, [markets, localQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearchChange) onSearchChange(localQuery);
  };

  const handleClear = () => {
    setLocalQuery('');
    if (onSearchChange) onSearchChange('');
  };

  const formatUsd = (val) => {
    if (!val || isNaN(val)) return '$0';
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(2)}K`;
    return `$${val.toLocaleString()}`;
  };

  const handleOpenDrilldown = (market) => {
    setSelectedMarket(market);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const unavailableChip = (label) => (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted italic bg-surface px-2 py-0.5 rounded border border-line">
      <Info size={11} className="text-faint" />
      {label}
    </span>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-navy font-heading">Market Intelligence</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-pale text-blue-dark border border-blue-border">
              UN Comtrade 2025 Verified
            </span>
          </div>
          <p className="text-sm text-soft">
            Official United Nations Statistics Division (UNSD) merchandise exports reported by India for calendar year 2025.
          </p>
        </div>

        {/* Commodity Toggle & Search */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* HS Code Segmented Control */}
          <div className="bg-surface p-1 rounded-lg border border-line flex items-center text-xs font-semibold">
            <button
              onClick={() => handleHsChange('62')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                selectedHs === '62'
                  ? 'bg-white text-blue shadow-xs'
                  : 'text-muted hover:text-navy'
              }`}
            >
              HS 62 (Apparel)
            </button>
            <button
              onClick={() => handleHsChange('091030')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                selectedHs === '091030'
                  ? 'bg-white text-blue shadow-xs'
                  : 'text-muted hover:text-navy'
              }`}
            >
              HS 091030 (Turmeric)
            </button>
            <button
              onClick={() => handleHsChange('TOTAL')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                selectedHs === 'TOTAL'
                  ? 'bg-white text-blue shadow-xs'
                  : 'text-muted hover:text-navy'
              }`}
            >
              All Goods (TOTAL)
            </button>
            {!['62', '091030', 'TOTAL'].includes(selectedHs) && (
              <button
                className="px-3 py-1.5 rounded-md bg-white text-blue shadow-xs"
              >
                HS {selectedHs}
              </button>
            )}
          </div>

          {/* Search input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Filter country or ISO3..."
              className="w-full pl-9 pr-8 py-1.5 bg-white border border-line-dark rounded-lg text-xs text-navy placeholder:text-faint focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15 shadow-xs"
            />
            {localQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
              >
                <X size={13} />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Commodity Summary Card */}
      <div className="bg-white rounded-xl border border-line p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-pale border border-blue-border text-blue flex items-center justify-center shrink-0">
            <Globe2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-dark bg-blue-border px-2 py-0.5 rounded">
                HS {resolvedHs}
              </span>
              <h2 className="text-sm font-bold text-navy">
                {productLabel || (resolvedHs === '62'
                  ? 'Apparel & Clothing Accessories (Not Knitted/Crocheted)'
                  : resolvedHs === '091030'
                    ? 'Turmeric (Ground)'
                    : resolvedHs === 'TOTAL'
                      ? 'Total Merchandise Exports (All Goods)'
                      : `Commodity Group HS ${resolvedHs}`)}
              </h2>
              {resolvedHs !== selectedHs && (
                <span className="text-[11px] text-muted">No 2025 rows for HS {selectedHs}; showing parent heading.</span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              Reporter: <strong>India</strong> (Code: 699) | Period: <strong>2025 Annual</strong> | Trade Flow: <strong>Exports (FOB)</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium divide-x divide-line self-stretch md:self-auto justify-around md:justify-end">
          <div className="px-2">
            <span className="text-muted block text-[11px]">Total Export Value</span>
            <span className="text-base font-bold text-navy font-heading">
              {meta?.worldTotalUsd ? formatUsd(meta.worldTotalUsd) : 'Loading...'}
            </span>
          </div>
          <div className="pl-4">
            <span className="text-muted block text-[11px]">Destinations</span>
            <span className="text-base font-bold text-blue font-heading">
              {meta?.totalMarkets || filteredMarkets.length} Countries
            </span>
          </div>
        </div>
      </div>

      {/* Real Trade Markets Table */}
      <div className="bg-white rounded-xl border border-line overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line bg-mist flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-navy text-sm">
              Ranked Export Destinations (UN Comtrade 2025)
            </h3>
            <p className="text-[11px] text-muted">
              Showing {filteredMarkets.length} destination markets ordered by verified export trade volume.
            </p>
          </div>
          <span className="text-[11px] text-blue bg-blue-pale px-2.5 py-1 rounded-md border border-blue-border font-medium flex items-center gap-1.5 w-fit">
            <Sparkles size={12} />
            Click any row to drill into market dossier & export 1-page report
          </span>
        </div>

        {loading ? (
          <TableSkeletonRows />
        ) : error ? (
          <div className="p-8 text-center text-red-dark bg-red-pale flex flex-col items-center gap-2">
            <AlertTriangle size={24} />
            <p className="text-sm font-bold">Failed to load trade data</p>
            <p className="text-xs text-red-ink">{error}</p>
            <button
              onClick={refetchMarkets}
              className="mt-2 px-3.5 py-1.5 bg-white border border-red-border rounded-lg text-xs font-semibold text-red-dark hover:bg-red-pale"
            >
              Retry
            </button>
          </div>
        ) : filteredMarkets.length === 0 && !localQuery.trim() ? (
          <div className="p-10 text-center text-muted">
            <p className="text-sm font-semibold text-navy">No 2025 export data available for HS {resolvedHs}</p>
            <p className="text-xs mt-1">This commodity group has no seeded rows yet. Try a trending chapter like HS 62 (Apparel) or HS 091030 (Turmeric).</p>
            <button
              onClick={() => handleHsChange('62')}
              className="mt-3 px-3.5 py-1.5 bg-white border border-line-dark rounded-lg text-xs font-semibold text-blue hover:border-blue"
            >
              View HS 62 (Apparel)
            </button>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="p-10 text-center text-muted">
            <p className="text-sm font-semibold text-navy">No destination countries matched "{localQuery}"</p>
            <p className="text-xs mt-1">Try searching by country name (e.g., USA, Germany, UAE) or reset search.</p>
            <button
              onClick={handleClear}
              className="btn-secondary mt-3 px-4 py-2 text-xs"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full text-left border-separate border-spacing-0 text-xs md:text-sm">
              <thead>
                <tr className="text-soft font-bold text-[11px] uppercase tracking-wider">
                  <th className="sticky top-0 z-10 bg-mist border-b border-line py-3 px-4 w-12 text-center">#</th>
                  <th className="sticky top-0 z-10 bg-mist border-b border-line py-3 px-4">Destination Market</th>
                  <th className="sticky top-0 z-10 bg-mist border-b border-line py-3 px-4">India Exports (2025 FOB)</th>
                  <th className="sticky top-0 z-10 bg-mist border-b border-line py-3 px-4">Share of India Exports</th>
                  <th className="sticky top-0 z-10 bg-mist border-b border-line py-3 px-4">
                    <span className="flex items-center gap-1">
                      Destination Market Size
                      <Info size={12} className="text-faint" title="Total worldwide imports declared by destination country" />
                    </span>
                  </th>
                  <th className="sticky top-0 z-10 bg-mist border-b border-line py-3 px-4">
                    <span className="flex items-center gap-1">
                      India's Market Share
                      <Info size={12} className="text-faint" title="India exports divided by destination total imports" />
                    </span>
                  </th>
                  <th className="sticky top-0 z-10 bg-mist border-b border-line py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarkets.map((row) => (
                  <tr
                    key={row.rank}
                    onClick={() => handleOpenDrilldown(row)}
                    className="hover:bg-mist cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-bold text-muted text-center text-xs border-b border-line">
                      {row.rank}
                    </td>
                    <td className="py-3.5 px-4 border-b border-line">
                      <div className="flex items-center gap-2 font-medium text-navy">
                        <span className="font-bold group-hover:text-blue transition-colors">
                          {row.partnerName}
                        </span>
                        {row.partnerIso3 && (
                          <span className="text-[10px] font-mono text-muted bg-surface px-1.5 py-0.5 rounded border border-line">
                            {row.partnerIso3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-navy border-b border-line">
                      {formatUsd(row.indiaExportValueUsd || row.tradeValueUsd)}
                    </td>
                    <td className="py-3.5 px-4 border-b border-line">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-pale text-blue-dark border border-blue-border">
                        {(row.shareOfIndiaExportsPct || row.shareOfTotal)?.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 border-b border-line">
                      {row.destinationMarketSizeUsd ? (
                        <span className="font-semibold text-navy">
                          {formatUsd(row.destinationMarketSizeUsd)}
                        </span>
                      ) : (
                        unavailableChip(row.destinationMarketSizeStatus || 'Not available from free data')
                      )}
                    </td>
                    <td className="py-3.5 px-4 border-b border-line">
                      {row.indiaShareOfDestinationImportPct !== null && row.indiaShareOfDestinationImportPct !== undefined ? (
                        <span className="font-semibold text-emerald-dark">
                          {row.indiaShareOfDestinationImportPct.toFixed(2)}%
                        </span>
                      ) : (
                        unavailableChip(row.indiaShareStatus || 'Not available from free data')
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right border-b border-line">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDrilldown(row);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue border border-blue-border bg-blue-pale hover:bg-blue-border rounded-md transition-colors whitespace-nowrap"
                      >
                        <span>Drill Down</span>
                        <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Data Semantics & Source Notice Footer */}
        <div className="p-4 border-t border-line bg-mist flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-muted">
          <div className="space-y-1">
            <p>
              <strong>Data Provenance:</strong> {meta?.citation || TRADE_STATS.attribution.citation}
            </p>
            <p className="text-[11px] text-faint">
              <strong>Data Semantics Contract:</strong> Figures show exports reported by India (FOB). Total destination market size requires partner-reported import declarations (CIF) and shows "Not available from free data" where partner import data is unseeded.
            </p>
          </div>
          <a
            href="https://comtradeplus.un.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue hover:text-blue-dark hover:underline font-semibold shrink-0 text-xs"
          >
            <span>Verify on UN Comtrade Plus</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Drill-down Market Dossier Modal */}
      {selectedMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-line shadow-[var(--shadow-pop)] max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-line flex items-center justify-between bg-mist rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-dark bg-blue-border px-2 py-0.5 rounded uppercase font-mono">
                    Rank #{selectedMarket.rank} Destination
                  </span>
                  <span className="text-xs text-muted">UN Comtrade 2025</span>
                </div>
                <h3 className="text-xl font-bold text-navy font-heading mt-1">
                  {selectedMarket.partnerName} ({selectedMarket.partnerIso3 || 'N/A'})
                </h3>
              </div>
              <button
                onClick={() => setSelectedMarket(null)}
                className="w-8 h-8 rounded-full bg-white border border-line-dark text-muted hover:text-navy flex items-center justify-center"
                aria-label="Close market dossier"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Stat Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-blue-pale border border-blue-border">
                  <span className="text-xs font-bold text-blue-dark uppercase tracking-wider block">
                    India Exports to {selectedMarket.partnerName}
                  </span>
                  <p className="text-2xl font-extrabold text-navy font-heading mt-1">
                    {formatUsd(selectedMarket.indiaExportValueUsd || selectedMarket.tradeValueUsd)}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    FOB Merchandise Value (Calendar Year 2025)
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-mist border border-line">
                  <span className="text-xs font-bold text-soft uppercase tracking-wider block">
                    Share of India's Export Basket
                  </span>
                  <p className="text-2xl font-extrabold text-blue font-heading mt-1">
                    {(selectedMarket.shareOfIndiaExportsPct || selectedMarket.shareOfTotal)?.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Out of {formatUsd(meta?.worldTotalUsd || 0)} global total
                  </p>
                </div>
              </div>

              {/* Tariff & Duty Panel (WITS / UNCTAD TRAINS) */}
              <div className="p-4 rounded-xl bg-emerald-pale/30 border border-line">
                <h4 className="text-xs font-bold text-soft uppercase tracking-wider mb-2">
                  Import Tariff in {selectedMarket.partnerName} (HS {resolvedHs})
                </h4>
                {tariffLoading ? (
                  <p className="text-xs text-muted flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Fetching MFN & preferential rates from WITS (World Bank)...</span>
                  </p>
                ) : tariff && tariff.status === 'ok' ? (
                  <div className="space-y-1.5 text-xs">
                    <p className="text-navy">
                      <span className="font-bold">MFN duty: {tariff.mfnSimpleAverage}%</span>
                      <span className="text-muted"> simple average ad valorem ({tariff.year}, range {tariff.mfnMinRate}-{tariff.mfnMaxRate}%)</span>
                    </p>
                    {tariff.preferentialSimpleAverage !== null && tariff.preferentialSimpleAverage !== undefined ? (
                      <p className="text-emerald-ink font-semibold">
                        Preferential rate for Indian exporters: {tariff.preferentialSimpleAverage}%
                        {tariff.indiaFta ? ` under ${tariff.indiaFta.agreement}` : ''}
                      </p>
                    ) : tariff.indiaFta ? (
                      <p className="text-soft">
                        {tariff.indiaFta.agreement} ({tariff.indiaFta.statusLabel}): preferential access may apply with a certificate of origin.
                      </p>
                    ) : (
                      <p className="text-muted">No India trade-agreement preference on record for this market; MFN rate applies.</p>
                    )}
                    {tariff.note && <p className="text-[11px] text-muted">{tariff.note}</p>}
                    <a
                      href={tariff.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue hover:underline inline-flex items-center gap-1 text-[11px]"
                    >
                      <span>Source: {tariff.source}</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-muted">
                    {tariff?.note || 'Tariff data is not available from free sources for this market and HS code.'}
                  </p>
                )}
              </div>

              {/* Data Semantics Honest Box */}
              <div className="p-4 rounded-xl bg-accent-subtle border border-accent-border text-xs text-accent-text space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info size={14} className="text-accent" />
                  <span>Market Size & Share Contract Guarantee</span>
                </div>
                <p className="leading-relaxed">
                  <strong>Destination Market Size:</strong> <span className="font-semibold">{selectedMarket.destinationMarketSizeStatus || 'Not available from free data'}</span>.
                </p>
                <p className="leading-relaxed text-[11px] text-accent-text">
                  India-reported export value ({formatUsd(selectedMarket.indiaExportValueUsd || selectedMarket.tradeValueUsd)}) represents what Indian exporters shipped to {selectedMarket.partnerName}. It does NOT represent {selectedMarket.partnerName}'s total global imports. In compliance with data integrity contracts, GlobeX never substitutes India's exports as destination market size.
                </p>
              </div>

              {/* Actionable Next Steps */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-soft uppercase tracking-wider">
                  Next Steps for Indian Exporters
                </h4>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => {
                      if (onNavigateToBuyers) {
                        onNavigateToBuyers(selectedMarket.partnerName);
                        setSelectedMarket(null);
                      }
                    }}
                    className="btn-primary w-full sm:flex-1 py-2.5 px-5 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Building2 size={14} />
                    <span>Discover Prospective Buyers in {selectedMarket.partnerName}</span>
                  </button>

                  <button
                    onClick={() => setIsReportOpen(true)}
                    className="btn-secondary w-full sm:w-auto py-2.5 px-5 text-xs font-bold text-ink flex items-center justify-center gap-2"
                  >
                    <FileDown size={14} />
                    <span>Generate One-Page Brief</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-line bg-mist rounded-b-2xl flex items-center justify-between text-xs text-muted">
              <span>Commodity: HS {selectedHs} ({meta?.cmdDescription || 'Commodity'})</span>
              <button
                onClick={() => setSelectedMarket(null)}
                className="px-3.5 py-1.5 bg-white border border-line-dark rounded-lg text-xs font-semibold text-soft hover:bg-surface"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-Page Report Modal */}
      {isReportOpen && selectedMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-line shadow-[var(--shadow-pop)] max-w-3xl w-full max-h-[95vh] overflow-y-auto p-8 print:p-0 print:border-none print:shadow-none flex flex-col gap-6">
            {/* Printable One-Page Report Header */}
            <div className="flex justify-between items-start border-b-2 border-navy pb-4">
              <div>
                <span className="text-xs font-bold tracking-widest text-blue uppercase">GlobeX Export Intelligence Brief</span>
                <h2 className="text-2xl font-black text-navy font-heading mt-0.5">
                  Export Market Dossier: {selectedMarket.partnerName}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Commodity Classification: <strong>HS {selectedHs}</strong> — {meta?.cmdDescription || 'Merchandise'}
                </p>
              </div>
              <div className="text-right print:hidden flex items-center gap-2">
                <button
                  onClick={handlePrintReport}
                  className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer size={13} />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setIsReportOpen(false)}
                  className="px-3 py-1.5 bg-surface text-soft rounded-lg text-xs font-bold hover:bg-line"
                  aria-label="Close report"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Core Metrics Summary */}
            <div className="grid grid-cols-3 gap-4 border border-line p-4 rounded-xl bg-mist">
              <div>
                <span className="text-[11px] font-bold text-muted uppercase block">Destination Ranking</span>
                <span className="text-xl font-black text-navy font-heading">#{selectedMarket.rank} in World</span>
                <span className="text-[10px] text-muted block mt-0.5">Out of {meta?.totalMarkets} partner markets</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-muted uppercase block">India Exports (2025 FOB)</span>
                <span className="text-xl font-black text-blue font-heading">
                  {formatUsd(selectedMarket.indiaExportValueUsd || selectedMarket.tradeValueUsd)}
                </span>
                <span className="text-[10px] text-muted block mt-0.5">Verified UN Comtrade record</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-muted uppercase block">Share of India Exports</span>
                <span className="text-xl font-black text-emerald-dark font-heading">
                  {(selectedMarket.shareOfIndiaExportsPct || selectedMarket.shareOfTotal)?.toFixed(2)}%
                </span>
                <span className="text-[10px] text-muted block mt-0.5">Of India's total HS {selectedHs} exports</span>
              </div>
            </div>

            {/* Strategic Analysis */}
            <div className="space-y-3 text-xs leading-relaxed text-ink">
              <h4 className="font-bold text-sm text-navy border-b border-line pb-1">
                Executive Assessment for Exporters
              </h4>
              <p>
                {selectedMarket.partnerName} represents the <strong>#{selectedMarket.rank}</strong> destination market for Indian exports of <strong>HS {selectedHs}</strong> in calendar year 2025, absorbing <strong>{formatUsd(selectedMarket.indiaExportValueUsd || selectedMarket.tradeValueUsd)}</strong>.
                This accounts for <strong>{(selectedMarket.shareOfIndiaExportsPct || selectedMarket.shareOfTotal)?.toFixed(2)}%</strong> of India's total global apparel outbound trade.
              </p>
              <div className="p-3 bg-surface rounded-lg border border-line space-y-1">
                <p className="font-bold text-navy">Data Semantics & Market Size Advisory:</p>
                <p className="text-[11px] text-muted">
                  • <strong>Reported Export Value:</strong> Sourced from India Customs export declarations (FOB).<br />
                  • <strong>Destination Market Size:</strong> Not available from free data (requires {selectedMarket.partnerName}'s domestic import declarations from World).<br />
                  • <strong>India Share of Market:</strong> Not available from free data.
                </p>
              </div>
              <p>
                <strong>Strategic Recommendation:</strong> Indian exporters targeting {selectedMarket.partnerName} should leverage existing trade logistics corridors, establish direct relationships with verified corporate importers, and ensure full compliance with destination labeling standards.
              </p>
            </div>

            {/* Provenance & Citation Block */}
            <div className="border-t border-line pt-4 text-[11px] text-muted flex flex-col sm:flex-row justify-between gap-2">
              <div>
                <p><strong>Primary Source:</strong> {TRADE_STATS.attribution.citation}</p>
                <p><strong>Generated By:</strong> GlobeX AI Platform · Date: {new Date().toLocaleDateString('en-GB')}</p>
              </div>
              <div className="text-right font-mono text-[10px] text-faint">
                ID: {selectedMarket.partnerIso3}-HS{selectedHs}-2025
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
