import React from 'react';
import { TRADE_STATS } from '../../constants/tradeStats';

const stats = [
  { value: TRADE_STATS.totalExportValueFormatted, label: 'Total India Exports (2025)' },
  { value: `${TRADE_STATS.countriesCovered}`, label: 'Global Destination Markets' },
  { value: TRADE_STATS.apparelExportValueFormatted, label: 'HS62 Apparel Exports (2025)' },
  { value: `${TRADE_STATS.apparelDestinationsCount}`, label: 'Apparel Export Destinations' },
];

export default function TrustBar() {
  return (
    <section className="w-full bg-white border-b border-[#E5E7EB] py-6">
      <div className="section-container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center group">
              <div className="text-2xl md:text-3xl font-extrabold text-[#0F172A] tracking-tight font-heading group-hover:text-[#2563EB] transition-colors">
                {stat.value}
              </div>
              <div className="text-xs md:text-[13px] font-semibold text-[#64748B] mt-1 tracking-wide uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-[#94A3B8] mt-3">
          {TRADE_STATS.attribution.citation}
        </p>
      </div>
    </section>
  );
}
