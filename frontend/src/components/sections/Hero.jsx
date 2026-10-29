import React, { useRef, useEffect, useState } from 'react';
import { Search, ArrowRight, CheckCircle, TrendingUp, Sparkles } from 'lucide-react';
import Globe from '../Globe';
import { TRADE_STATS } from '../../constants/tradeStats';

const QUICK_SEARCH_CHIPS = [
  { code: '6204.62', label: 'Cotton Trousers' },
  { code: '1006.30', label: 'Basmati Rice' },
  { code: '7113.19', label: 'Gold Jewellery' },
  { code: '3004.90', label: 'Medicaments' },
];

export default function Hero({ onSearch }) {
  const globeContainerRef = useRef(null);
  const [globeSize, setGlobeSize] = useState(480);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const updateSize = () => {
      if (globeContainerRef.current) {
        const rect = globeContainerRef.current.getBoundingClientRect();
        setGlobeSize(Math.min(rect.width, rect.height, 500));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleSearchSubmit = (e, targetTab = 'markets') => {
    if (e && e.preventDefault) e.preventDefault();
    const finalQuery = (query || '6204.62').trim();
    if (onSearch) {
      onSearch(finalQuery, targetTab);
    }
  };

  const handleChipClick = (chip) => {
    setQuery(chip.code);
    if (onSearch) {
      onSearch(`${chip.code} - ${chip.label}`, 'markets');
    }
  };

  const checks = [
    `UN Comtrade official export statistics across ${TRADE_STATS.countriesCovered} destination markets`,
    `Detailed commodity trade flows (${TRADE_STATS.apparelExportValueFormatted} apparel across ${TRADE_STATS.apparelDestinationsCount} destinations)`,
    'Evidence-based buyer discovery pipeline',
  ];

  return (
    <section id="hero" className="w-full bg-page texture-grid border-b border-line relative overflow-hidden">
      <div className="section-container py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* Left: Content & Search */}
          <div className="flex flex-col z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-accent mb-4 w-fit shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-amber animate-pulse" />
              <span className="text-xs font-bold text-accent-hover uppercase tracking-wider">
                Export Intelligence Platform
              </span>
            </div>

            <h1 className="type-h1 type-display mb-4 text-navy">
              Identify High-Potential Export Markets and Qualified Buyers in Minutes
            </h1>

            <p className="text-base md:text-base text-soft mb-6 leading-relaxed max-w-xl">
              GlobeX uses official UN Comtrade trade data and AI-powered research to help Indian exporters compare export values by destination and identify prospective buyers through source-backed web search.
            </p>

            {/* HS Code / Product Search Bar */}
            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-line shadow-md mb-4 max-w-xl">
              <form onSubmit={(e) => handleSearchSubmit(e, 'markets')} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 flex items-center">
                  <Search size={18} className="absolute left-3.5 text-faint pointer-events-none" />
                  <input
                    id="hero-search-input"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search HS Code (e.g. 6204.62) or product (e.g. Cotton Trousers)..."
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-mist border border-line-dark rounded-lg text-navy placeholder:text-faint focus:outline-none focus:border-blue focus:bg-white transition-colors"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    id="hero-analyze-market-btn"
                    type="submit"
                    className="btn-primary py-2.5 px-4 text-sm font-semibold flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <span>Analyze Markets</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    id="hero-find-buyers-btn"
                    type="button"
                    onClick={(e) => handleSearchSubmit(e, 'buyers')}
                    className="btn-secondary py-2.5 px-3.5 text-sm font-semibold flex items-center justify-center gap-1 shrink-0 bg-white"
                    title="Search verified buyers"
                  >
                    <span>Find Buyers</span>
                  </button>
                </div>
              </form>

              {/* Quick Suggestion Chips */}
              <div className="mt-2.5 pt-2 border-t border-surface flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-xs font-semibold text-muted flex items-center gap-1 mr-1">
                  <Sparkles size={12} className="text-amber" />
                  Trending:
                </span>
                {QUICK_SEARCH_CHIPS.map((chip) => (
                  <button
                    key={chip.code}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className="px-2.5 py-1 rounded-md bg-mist hover:bg-surface text-ink text-xs font-medium transition-colors border border-line hover:border-line-dark"
                  >
                    <span className="font-semibold text-blue">{chip.code}</span> ({chip.label})
                  </button>
                ))}
              </div>
            </div>

            {/* Trust Checks */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2">
              {checks.map((text, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-soft">
                  <CheckCircle size={15} className="text-emerald shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Interactive 3D Globe with Floating Stat Card */}
          <div ref={globeContainerRef} className="hidden lg:flex items-center justify-center h-[480px] relative">
            <Globe width={globeSize} height={globeSize} />

            {/* Floating Stat Card */}
            <div className="absolute -bottom-2 left-6 bg-white/95 backdrop-blur-md border border-line rounded-xl p-3.5 shadow-xl flex items-center gap-3.5 max-w-[300px] pointer-events-none z-20">
              <div className="w-10 h-10 rounded-lg bg-accent-subtle border border-accent-border flex items-center justify-center text-amber shrink-0">
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-bold text-amber uppercase tracking-wider">Live Trade Flow</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber" />
                </div>
                <p className="text-base font-bold text-navy leading-tight font-heading">{TRADE_STATS.totalExportValueFormatted} Indian Exports</p>
                <p className="text-xs text-muted mt-0.5">
                  <span className="text-amber font-semibold">CY2025</span> · {TRADE_STATS.countriesCovered} Destination Markets
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
