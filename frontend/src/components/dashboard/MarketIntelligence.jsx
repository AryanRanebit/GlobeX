import React, { useState, useEffect, useMemo } from 'react';
import { 
  Globe2, 
  TrendingUp, 
  AlertTriangle, 
  FileCheck, 
  CheckCircle2, 
  Search, 
  X, 
  Sparkles, 
  Filter, 
  ArrowUpRight, 
  Building2, 
  FileDown, 
  ExternalLink, 
  Info, 
  ChevronRight, 
  Printer, 
  RefreshCw 
} from 'lucide-react';
import { TRADE_STATS } from '../../constants/tradeStats';
import { apiFetch } from '../../lib/api';

export default function MarketIntelligence({ searchQuery = '', onSearchChange, onNavigateToBuyers }) {
  const [selectedHs, setSelectedHs] = useState('62'); // Default to HS 62 Apparel
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [markets, setMarkets] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Drill-down market modal
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Fetch real trade markets from backend
  const fetchMarkets = async (hsCode) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/trade/markets?hs=${hsCode}&year=2025&limit=250`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch trade data (Status ${res.status})`);
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMarkets(json.data);
        setMeta(json.meta);
      } else {
        throw new Error(json.message || 'Malformed trade data response');
      }
    } catch (err) {
      console.error('Error fetching trade data:', err);
      setError(err.message || 'Could not load official Comtrade data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets(selectedHs);
  }, [selectedHs]);

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

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-[#0F172A] font-heading">Market Intelligence</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
              UN Comtrade 2025 Verified
            </span>
          </div>
          <p className="text-[14px] text-[#475569]">
            Official United Nations Statistics Division (UNSD) merchandise exports reported by India for calendar year 2025.
          </p>
        </div>

        {/* Commodity Toggle & Search */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* HS Code Segmented Control */}
          <div className="bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0] flex items-center text-xs font-semibold">
            <button
              onClick={() => setSelectedHs('62')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                selectedHs === '62' 
                  ? 'bg-white text-[#2563EB] shadow-xs' 
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              HS 62 (Apparel)
            </button>
            <button
              onClick={() => setSelectedHs('TOTAL')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                selectedHs === 'TOTAL' 
                  ? 'bg-white text-[#2563EB] shadow-xs' 
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              All Goods (TOTAL)
            </button>
          </div>

          {/* Search input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Filter country or ISO3..."
              className="w-full pl-9 pr-8 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-xs"
            />
            {localQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#334155]"
              >
                <X size={13} />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Commodity Summary Card */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center shrink-0">
            <Globe2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#1D4ED8] bg-[#DBEAFE] px-2 py-0.5 rounded">
                HS {selectedHs}
              </span>
              <h2 className="text-sm font-bold text-[#0F172A]">
                {selectedHs === '62' 
                  ? 'Apparel & Clothing Accessories (Not Knitted/Crocheted)' 
                  : 'Total Merchandise Exports (All Goods)'}
              </h2>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Reporter: <strong>India</strong> (Code: 699) | Period: <strong>2025 Annual</strong> | Trade Flow: <strong>Exports (FOB)</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium divide-x divide-[#E2E8F0] self-stretch md:self-auto justify-around md:justify-end">
          <div className="px-2">
            <span className="text-[#64748B] block text-[11px]">Total Export Value</span>
            <span className="text-base font-bold text-[#0F172A]">
              {meta?.worldTotalUsd ? formatUsd(meta.worldTotalUsd) : 'Loading...'}
            </span>
          </div>
          <div className="pl-4">
            <span className="text-[#64748B] block text-[11px]">Destinations</span>
            <span className="text-base font-bold text-[#2563EB]">
              {meta?.totalMarkets || filteredMarkets.length} Countries
            </span>
          </div>
        </div>
      </div>

      {/* Real Trade Markets Table */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-[#0F172A] text-sm">
              Ranked Export Destinations (UN Comtrade 2025)
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Showing {filteredMarkets.length} destination markets ordered by verified export trade volume.
            </p>
          </div>
          <span className="text-[11px] text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1 rounded-md border border-[#BFDBFE] font-medium flex items-center gap-1.5 w-fit">
            <Sparkles size={12} />
            Click any row to drill into market dossier & export 1-page report
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#64748B] flex flex-col items-center justify-center gap-3">
            <RefreshCw size={24} className="animate-spin text-[#2563EB]" />
            <p className="text-xs font-semibold">Loading official UN Comtrade trade flows...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-[#DC2626] bg-[#FEF2F2] flex flex-col items-center gap-2">
            <AlertTriangle size={24} />
            <p className="text-sm font-bold">Failed to load trade data</p>
            <p className="text-xs text-[#991B1B]">{error}</p>
            <button 
              onClick={() => fetchMarkets(selectedHs)}
              className="mt-2 px-3 py-1 bg-white border border-[#FECACA] rounded text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2]"
            >
              Retry
            </button>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="p-10 text-center text-[#64748B]">
            <p className="text-sm font-semibold text-[#0F172A]">No destination countries matched "{localQuery}"</p>
            <p className="text-xs mt-1">Try searching by country name (e.g., USA, Germany, UAE) or reset search.</p>
            <button
              onClick={handleClear}
              className="mt-3 px-3 py-1.5 bg-[#F1F5F9] text-[#334155] rounded text-xs font-semibold hover:bg-[#E2E8F0]"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead className="bg-[#F8FAFC]">
                <tr className="border-b border-[#E2E8F0] text-[#475569] font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Destination Market</th>
                  <th className="py-3 px-4">India Exports (2025 FOB)</th>
                  <th className="py-3 px-4">Share of India Exports</th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      Destination Market Size
                      <Info size={12} className="text-[#94A3B8]" title="Total worldwide imports declared by destination country" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      India's Market Share
                      <Info size={12} className="text-[#94A3B8]" title="India exports divided by destination total imports" />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredMarkets.map((row) => (
                  <tr 
                    key={row.rank} 
                    onClick={() => handleOpenDrilldown(row)}
                    className="hover:bg-[#F1F5F9] cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-bold text-[#64748B] text-center text-xs">
                      {row.rank}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 font-medium text-[#0F172A]">
                        <span className="font-bold group-hover:text-[#2563EB] transition-colors">
                          {row.partnerName}
                        </span>
                        {row.partnerIso3 && (
                          <span className="text-[10px] font-mono text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#E2E8F0]">
                            {row.partnerIso3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                      {formatUsd(row.indiaExportValueUsd || row.tradeValueUsd)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8]">
                        {(row.shareOfIndiaExportsPct || row.shareOfTotal)?.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {row.destinationMarketSizeUsd ? (
                        <span className="font-semibold text-[#0F172A]">
                          {formatUsd(row.destinationMarketSizeUsd)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B] italic bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
                          <Info size={11} className="text-[#94A3B8]" />
                          {row.destinationMarketSizeStatus || 'Not available from free data'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {row.indiaShareOfDestinationImportPct !== null && row.indiaShareOfDestinationImportPct !== undefined ? (
                        <span className="font-semibold text-[#059669]">
                          {row.indiaShareOfDestinationImportPct.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B] italic bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
                          <Info size={11} className="text-[#94A3B8]" />
                          {row.indiaShareStatus || 'Not available from free data'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDrilldown(row);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded transition-colors"
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
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-[#64748B]">
          <div className="space-y-1">
            <p>
              <strong>Data Provenance:</strong> {meta?.citation || TRADE_STATS.attribution.citation}
            </p>
            <p className="text-[11px] text-[#94A3B8]">
              <strong>Data Semantics Contract:</strong> Figures show exports reported by India (FOB). Total destination market size requires partner-reported import declarations (CIF) and shows "Not available from free data" where partner import data is unseeded.
            </p>
          </div>
          <a
            href="https://comtradeplus.un.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#2563EB] hover:underline font-semibold shrink-0 text-xs"
          >
            <span>Verify on UN Comtrade Plus</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Drill-down Market Dossier Modal */}
      {selectedMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC] rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1D4ED8] bg-[#DBEAFE] px-2 py-0.5 rounded uppercase font-mono">
                    Rank #{selectedMarket.rank} Destination
                  </span>
                  <span className="text-xs text-[#64748B]">UN Comtrade 2025</span>
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mt-1">
                  {selectedMarket.partnerName} ({selectedMarket.partnerIso3 || 'N/A'})
                </h3>
              </div>
              <button
                onClick={() => setSelectedMarket(null)}
                className="w-8 h-8 rounded-full bg-white border border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A] flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Stat Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
                  <span className="text-xs font-bold text-[#1D4ED8] uppercase tracking-wider block">
                    India Exports to {selectedMarket.partnerName}
                  </span>
                  <p className="text-2xl font-extrabold text-[#0F172A] mt-1">
                    {formatUsd(selectedMarket.indiaExportValueUsd || selectedMarket.tradeValueUsd)}
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">
                    FOB Merchandise Value (Calendar Year 2025)
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#475569] uppercase tracking-wider block">
                    Share of India's Export Basket
                  </span>
                  <p className="text-2xl font-extrabold text-[#2563EB] mt-1">
                    {(selectedMarket.shareOfIndiaExportsPct || selectedMarket.shareOfTotal)?.toFixed(2)}%
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">
                    Out of {formatUsd(meta?.worldTotalUsd || 0)} global total
                  </p>
                </div>
              </div>

              {/* Data Semantics Honest Box */}
              <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info size={14} className="text-[#D97706]" />
                  <span>Market Size & Share Contract Guarantee</span>
                </div>
                <p className="leading-relaxed">
                  <strong>Destination Market Size:</strong> <span className="font-semibold">{selectedMarket.destinationMarketSizeStatus || 'Not available from free data'}</span>.
                </p>
                <p className="leading-relaxed text-[11px] text-[#78350F]">
                  India-reported export value ({formatUsd(selectedMarket.indiaExportValueUsd || selectedMarket.tradeValueUsd)}) represents what Indian exporters shipped to {selectedMarket.partnerName}. It does NOT represent {selectedMarket.partnerName}'s total global imports. In compliance with data integrity contracts, GlobeX never substitutes India's exports as destination market size.
                </p>
              </div>

              {/* Actionable Next Steps */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#475569] uppercase tracking-wider">
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
                    className="w-full sm:flex-1 py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <Building2 size={14} />
                    <span>Discover Prospective Buyers in {selectedMarket.partnerName}</span>
                  </button>

                  <button
                    onClick={() => setIsReportOpen(true)}
                    className="w-full sm:w-auto py-2.5 px-4 bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#0F172A] text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileDown size={14} />
                    <span>Generate One-Page Brief</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-2xl flex items-center justify-between text-xs text-[#64748B]">
              <span>Commodity: HS {selectedHs} ({meta?.cmdDescription || 'Commodity'})</span>
              <button
                onClick={() => setSelectedMarket(null)}
                className="px-3 py-1 bg-white border border-[#CBD5E1] rounded text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-Page Report Modal */}
      {isReportOpen && selectedMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto p-8 print:p-0 print:border-none print:shadow-none flex flex-col gap-6">
            {/* Printable One-Page Report Header */}
            <div className="flex justify-between items-start border-b border-[#0F172A] pb-4">
              <div>
                <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase">GlobeX Export Intelligence Brief</span>
                <h2 className="text-2xl font-black text-[#0F172A] font-heading mt-0.5">
                  Export Market Dossier: {selectedMarket.partnerName}
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Commodity Classification: <strong>HS {selectedHs}</strong> — {meta?.cmdDescription || 'Merchandise'}
                </p>
              </div>
              <div className="text-right print:hidden flex items-center gap-2">
                <button
                  onClick={handlePrintReport}
                  className="px-3 py-1.5 bg-[#2563EB] text-white rounded-md text-xs font-bold flex items-center gap-1.5 hover:bg-[#1D4ED8]"
                >
                  <Printer size={13} />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setIsReportOpen(false)}
                  className="px-3 py-1.5 bg-[#F1F5F9] text-[#475569] rounded-md text-xs font-bold hover:bg-[#E2E8F0]"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Core Metrics Summary */}
            <div className="grid grid-cols-3 gap-4 border border-[#E2E8F0] p-4 rounded-xl bg-[#F8FAFC]">
              <div>
                <span className="text-[11px] font-bold text-[#64748B] uppercase block">Destination Ranking</span>
                <span className="text-xl font-black text-[#0F172A]">#{selectedMarket.rank} in World</span>
                <span className="text-[10px] text-[#64748B] block mt-0.5">Out of {meta?.totalMarkets} partner markets</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#64748B] uppercase block">India Exports (2025 FOB)</span>
                <span className="text-xl font-black text-[#2563EB]">
                  {formatUsd(selectedMarket.indiaExportValueUsd || selectedMarket.tradeValueUsd)}
                </span>
                <span className="text-[10px] text-[#64748B] block mt-0.5">Verified UN Comtrade record</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#64748B] uppercase block">Share of India Exports</span>
                <span className="text-xl font-black text-[#059669]">
                  {(selectedMarket.shareOfIndiaExportsPct || selectedMarket.shareOfTotal)?.toFixed(2)}%
                </span>
                <span className="text-[10px] text-[#64748B] block mt-0.5">Of India's total HS {selectedHs} exports</span>
              </div>
            </div>

            {/* Strategic Analysis */}
            <div className="space-y-3 text-xs leading-relaxed text-[#334155]">
              <h4 className="font-bold text-sm text-[#0F172A] border-b border-[#E2E8F0] pb-1">
                Executive Assessment for Exporters
              </h4>
              <p>
                {selectedMarket.partnerName} represents the <strong>#{selectedMarket.rank}</strong> destination market for Indian exports of <strong>HS {selectedHs}</strong> in calendar year 2025, absorbing <strong>{formatUsd(selectedMarket.indiaExportValueUsd || selectedMarket.tradeValueUsd)}</strong>. 
                This accounts for <strong>{(selectedMarket.shareOfIndiaExportsPct || selectedMarket.shareOfTotal)?.toFixed(2)}%</strong> of India's total global apparel outbound trade.
              </p>
              <div className="p-3 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] space-y-1">
                <p className="font-bold text-[#0F172A]">Data Semantics & Market Size Advisory:</p>
                <p className="text-[11px] text-[#64748B]">
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
            <div className="border-t border-[#E2E8F0] pt-4 text-[11px] text-[#64748B] flex flex-col sm:flex-row justify-between gap-2">
              <div>
                <p><strong>Primary Source:</strong> {TRADE_STATS.attribution.citation}</p>
                <p><strong>Generated By:</strong> GlobeX AI Platform · Date: {new Date().toLocaleDateString('en-GB')}</p>
              </div>
              <div className="text-right font-mono text-[10px] text-[#94A3B8]">
                ID: {selectedMarket.partnerIso3}-HS{selectedHs}-2025
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
