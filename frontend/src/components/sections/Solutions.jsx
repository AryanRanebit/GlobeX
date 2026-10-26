import React from 'react';
import { 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  FileText,
  Sparkles,
  ExternalLink,
  Globe2,
  Lock
} from 'lucide-react';
import { TRADE_STATS } from '../../constants/tradeStats';

export default function Solutions({ onOpenAuth }) {
  return (
    <section id="solutions" className="w-full bg-[#F8FAFC] py-14 md:py-20 border-b border-[#E5E7EB] relative">
      {/* Anchor for features nav link */}
      <div id="features" className="absolute -top-16 left-0" />

      <div className="section-container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#EFF6FF] border border-[#DBEAFE] mb-3">
            <Sparkles size={12} className="text-[#2563EB]" />
            <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
              Integrated Export Platform
            </span>
          </div>
          <h2 className="type-h2 mb-3.5 text-[#0F172A] font-bold">
            Stop Guessing Where to Export. Scale with Verified Intelligence.
          </h2>
          <p className="text-[15px] text-[#64748B] leading-relaxed">
            Indian exporters lose months chasing unverified directories and high-friction trade leads. GlobeX consolidates direct customs records, automated buyer verification, and tariff intelligence into one actionable workspace.
          </p>
        </div>

        {/* Real Product Showcase (Captured Dashboard Screenshot) */}
        <div className="mb-14 max-w-5xl mx-auto">
          <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-xl overflow-hidden">
            {/* Window Chrome Header */}
            <div className="bg-[#0F172A] px-4 py-3 flex items-center justify-between text-white text-xs border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#EF4444] inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#F59E0B] inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#10B981] inline-block" />
                <span className="ml-2 font-mono text-[11px] text-[#94A3B8] hidden sm:inline">
                  app.globex.ai/dashboard/markets?hs=6204.62
                </span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-ping" />
                <span className="text-[11px] text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded border border-[#10B981]/30">
                  Live 2026 Customs Intelligence
                </span>
              </div>
            </div>

            {/* Product Image */}
            <div className="relative bg-[#F8FAFC]">
              <img
                src="/dashboard-screenshot.png"
                alt="GlobeX Market Intelligence Dashboard"
                className="w-full h-auto object-cover border-b border-[#E2E8F0] shadow-inner"
                loading="eager"
              />

              {/* Floating Feature Badges */}
              <div className="absolute top-4 right-4 hidden md:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#E2E8F0] shadow-md text-xs font-semibold text-[#0F172A]">
                <Globe2 size={14} className="text-[#2563EB]" />
                <span>{TRADE_STATS.countriesCovered} Destination Markets (UN Comtrade)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Varied Capability Cards: Exactly 3 Distinct Visual Patterns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          
          {/* Pattern 1: Problem vs Solution Contrast Card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider block mb-2">
                01 · The Data Shift
              </span>
              <h3 className="text-base font-bold text-[#0F172A] mb-3">
                Old Directories vs. Real Customs Data
              </h3>
              
              <div className="space-y-3 mb-6">
                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5">
                  <XCircle size={16} className="text-[#EF4444] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[#991B1B]">The Old Way</p>
                    <p className="text-[12px] text-[#7F1D1D] mt-0.5">Static trade PDFs, outdated phone numbers, 4+ weeks manual research.</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#059669] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[#065F46]">The GlobeX Way</p>
                    <p className="text-[12px] text-[#064E3B] mt-0.5">Triangulated bill-of-lading records, demand scores, and verified buyers.</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onOpenAuth}
              className="text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 group"
            >
              <span>Explore Trade Discovery</span>
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Pattern 2: Live Market Metric Spotlight Card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#059669] uppercase tracking-wider block mb-2">
                02 · Demand Forecasting
              </span>
              <h3 className="text-base font-bold text-[#0F172A] mb-3">
                Country Match & Tariff Intelligence
              </h3>
              <p className="text-xs text-[#64748B] mb-4">
                Calculate bilateral import duties and growth scores before shipping a single container.
              </p>

              {/* Mini Data Widget */}
              <div className="bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] p-3 space-y-2.5 mb-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#0F172A]">Germany (EU)</span>
                  <span className="font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded text-[11px]">96% AI Match</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span>Duty: 0% FTA</span>
                  <span>Volume: 420 Tons/mo</span>
                </div>
                <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#10B981] h-full rounded-full" style={{ width: '96%' }} />
                </div>
              </div>
            </div>

            <button
              onClick={onOpenAuth}
              className="text-xs font-bold text-[#059669] hover:text-[#047857] flex items-center gap-1 group"
            >
              <span>Run Country Analysis</span>
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Pattern 3: Verified Buyer Lead Record Showcase */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#D97706] uppercase tracking-wider block mb-2">
                03 · Direct Procurement
              </span>
              <h3 className="text-base font-bold text-[#0F172A] mb-3">
                Verified Importers with Trade History
              </h3>
              <p className="text-xs text-[#64748B] mb-4">
                Identify active overseas importers with customs shipment records and reliability scoring.
              </p>

              {/* Lead Preview Record */}
              <div className="bg-[#FFFBEB] rounded-lg border border-[#FDE68A] p-3 mb-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <Building2 size={14} className="text-[#D97706]" />
                  <span className="text-xs font-bold text-[#0F172A]">Atlas Imports Inc.</span>
                  <span className="ml-auto text-[10px] font-bold text-[#059669] bg-white px-1.5 py-0.5 rounded border border-[#A7F3D0]">
                    94 Trust
                  </span>
                </div>
                <p className="text-[11px] text-[#78350F] leading-tight">
                  34 shipments in last 12 months · Cotton Textiles (HS 6204.62)
                </p>
              </div>
            </div>

            <button
              onClick={onOpenAuth}
              className="text-xs font-bold text-[#D97706] hover:text-[#B45309] flex items-center gap-1 group"
            >
              <span>View Buyer Directory</span>
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
