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
    <section className="w-full bg-white border-b border-line py-6">
      <div className="section-container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-2xl md:text-3xl font-semibold text-navy type-display">
                {stat.value}
              </div>
              <div className="text-xs md:text-xs font-semibold text-muted mt-1 tracking-wide uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-faint mt-3">
          {TRADE_STATS.attribution.citation}
        </p>
      </div>
    </section>
  );
}
