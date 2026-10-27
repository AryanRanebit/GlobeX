import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function FinalCTA({ onOpenAuth }) {
  return (
    <section id="contact" className="w-full bg-[#0F172A] py-14 md:py-16">
      <div className="section-container text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full badge-accent mb-4 text-xs font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse" />
          <span>Risk-Free 14-Day Free Trial</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3.5 font-heading">
          Start Making Data-Driven Export Decisions
        </h2>
        <p className="text-base text-[#CBD5E1] mb-8 max-w-xl mx-auto leading-relaxed">
          Access official UN Comtrade export intelligence, commodity trade flows, and evidence-based buyer discovery for Indian businesses.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            id="cta-primary-btn"
            onClick={onOpenAuth}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-md"
          >
            <span>Start Market Analysis</span>
            <ArrowRight size={15} />
          </button>
          <button className="bg-transparent text-white border border-[#334155] hover:border-[#64748B] text-sm font-semibold py-3 px-6 rounded-lg transition-colors">
            Schedule a Demo
          </button>
        </div>
        <p className="text-xs text-[#94A3B8] mt-4">
          No credit card required · 14-day free trial · Cancel anytime
        </p>
      </div>
    </section>
  );
}
