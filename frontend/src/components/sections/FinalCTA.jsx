import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function FinalCTA({ onOpenAuth }) {
  return (
    <section id="contact" className="w-full bg-navy py-14 md:py-16">
      <div className="section-container text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full badge-accent mb-4 text-xs font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span>Risk-Free 14-Day Free Trial</span>
        </div>
        <h2 className="type-display text-white mb-3.5 text-3xl md:text-[2rem]">
          Start Making Data-Driven Export Decisions
        </h2>
        <p className="text-sm md:text-base text-line-dark mb-8 max-w-xl mx-auto leading-relaxed">
          Access official UN Comtrade export intelligence, commodity trade flows, and evidence-based buyer discovery for Indian businesses.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            id="cta-primary-btn"
            onClick={onOpenAuth}
            className="btn-primary text-sm font-semibold py-3 px-6 rounded-lg flex items-center gap-2"
          >
            <span>Start Market Analysis</span>
            <ArrowRight size={15} />
          </button>
          <button
            onClick={onOpenAuth}
            className="bg-transparent text-white border border-white/40 hover:bg-white/10 text-sm font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Schedule a Demo
          </button>
        </div>
        <p className="text-xs text-faint mt-4">
          No credit card required · 14-day free trial · Cancel anytime
        </p>
      </div>
    </section>
  );
}
