import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  Building2,
  Sparkles,
  Globe2
} from 'lucide-react';
import { TRADE_STATS } from '../../constants/tradeStats';

export default function Solutions({ onOpenAuth }) {
  return (
    <section id="solutions" className="w-full bg-mist texture-grain py-14 md:py-20 border-b border-line relative">
      {/* Anchor for features nav link */}
      <div id="features" className="absolute -top-16 left-0" />

      <div className="section-container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-accent mb-3 shadow-xs">
            <Sparkles size={13} className="text-amber" />
            <span className="text-xs font-bold text-accent-hover uppercase tracking-wider">
              Integrated Export Platform
            </span>
          </div>
          <h2 className="type-h2 type-display mb-3.5 text-navy">
            Stop Guessing Where to Export. Scale with Verified Intelligence.
          </h2>
          <p className="text-base md:text-base text-soft leading-relaxed">
            Official UN Comtrade data, evidence-based buyer discovery, and tariff compliance in one workspace - no more stale lead lists.
          </p>
        </div>

        {/* Real Product Showcase (Captured Dashboard Screenshot) */}
        <div className="mb-14 max-w-5xl mx-auto">
          <div className="bg-white rounded-xl border border-line-dark shadow-xl overflow-hidden">
            {/* Window Chrome Header */}
            <div className="bg-navy px-4 py-3 flex items-center justify-between text-white text-xs border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-light inline-block" />
                <span className="ml-2 font-mono text-xs text-faint hidden sm:inline">
                  app.globex.ai/dashboard/markets?hs=6204.62
                </span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <span className="flex h-2 w-2 rounded-full bg-emerald-light" />
                <span className="text-xs text-emerald-light bg-emerald-light/15 px-2 py-0.5 rounded border border-emerald-light/30">
                  Live 2025 Customs Intelligence
                </span>
              </div>
            </div>

            {/* Product Image */}
            <div className="relative bg-mist">
              <img
                src="/dashboard-screenshot.png"
                alt="GlobeX Market Intelligence Dashboard"
                className="w-full h-auto object-cover border-b border-line shadow-inner"
                loading="eager"
              />

              {/* Floating Feature Badges */}
              <div className="absolute top-4 right-4 hidden md:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-line shadow-md text-xs font-semibold text-navy">
                <Globe2 size={14} className="text-blue" />
                <span>{TRADE_STATS.countriesCovered} Destination Markets (UN Comtrade)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Varied Capability Cards: Exactly 3 Distinct Visual Patterns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          
          {/* Pattern 1: Problem vs Solution Contrast Card */}
          <div className="bg-white rounded-xl border border-line p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-blue uppercase tracking-wider block mb-2">
                01 · The Data Shift
              </span>
              <h3 className="text-lg font-bold text-navy mb-3 font-heading">
                Old Directories vs. Real Customs Data
              </h3>
              
              <div className="space-y-3 mb-6">
                <div className="p-3.5 rounded-lg bg-red-pale border border-red-border flex items-start gap-2.5">
                  <XCircle size={17} className="text-red shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-ink uppercase tracking-wider">The Old Way</p>
                    <p className="text-xs text-red-deep mt-0.5 leading-snug">Static trade PDFs, outdated phone numbers, 4+ weeks manual research.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-emerald-pale border border-emerald-border flex items-start gap-2.5">
                  <CheckCircle2 size={17} className="text-emerald shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-emerald-dark uppercase tracking-wider">The GlobeX Way</p>
                    <p className="text-xs text-emerald-deep mt-0.5 leading-snug">UN Comtrade export values by destination, plus buyer discovery.</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onOpenAuth}
              className="text-sm font-semibold text-blue hover:text-blue-dark flex items-center gap-1.5 group pt-2"
            >
              <span>Explore Trade Discovery</span>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Pattern 2: Live Market Metric Spotlight Card */}
          <div className="bg-white rounded-xl border border-line p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-emerald uppercase tracking-wider block mb-2">
                02 · Market Ranking
              </span>
              <h3 className="text-lg font-bold text-navy mb-3 font-heading">
                Top Destinations by Export Value
              </h3>
              <p className="text-sm text-soft mb-4 leading-relaxed">
                See where India's exports actually go, from UN Comtrade 2025 data.
              </p>

              {/* Mini Data Widget */}
              <div className="bg-mist rounded-lg border border-line p-3.5 space-y-2.5 mb-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-navy">United States</span>
                  <span className="font-bold text-emerald bg-emerald-pale px-2 py-0.5 rounded text-xs border border-emerald-border">31.8% of HS 62</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Apparel (HS 62), 2025</span>
                  <span>$2.67B exports (FOB)</span>
                </div>
                <div className="w-full bg-line h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-light h-full rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            <button
              onClick={onOpenAuth}
              className="text-sm font-semibold text-emerald hover:text-emerald-dark flex items-center gap-1.5 group pt-2"
            >
              <span>Run Country Analysis</span>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Pattern 3: Verified Buyer Lead Record Showcase */}
          <div className="bg-white rounded-xl border border-line p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-amber uppercase tracking-wider block mb-2">
                03 · Direct Procurement
              </span>
              <h3 className="text-lg font-bold text-navy mb-3 font-heading">
                Real Importers, Found Live with Sources
              </h3>
              <p className="text-sm text-soft mb-4 leading-relaxed">
                Search the live web for overseas importers and distributors. Every company comes with its source link.
              </p>

              {/* Lead Preview Record */}
              <div className="bg-accent-subtle rounded-lg border border-accent-border p-3.5 mb-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <Building2 size={15} className="text-amber" />
                  <span className="text-sm font-bold text-navy">Real companies only</span>
                  <span className="ml-auto text-xs font-bold text-emerald bg-white px-2 py-0.5 rounded border border-emerald-border">
                    Source cited
                  </span>
                </div>
                <p className="text-xs text-accent-text leading-snug">
                  No citation, no company. Shipment volumes and contacts are not claimed without evidence.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenAuth}
              className="text-sm font-semibold text-amber hover:text-accent flex items-center gap-1.5 group pt-2"
            >
              <span>View Buyer Directory</span>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
