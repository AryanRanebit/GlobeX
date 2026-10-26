import React from 'react';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import { TRADE_STATS } from '../../constants/tradeStats';

const stats = [
  { value: TRADE_STATS.countriesCovered, suffix: '', label: 'Destination Markets' },
  { value: 10, suffix: 'M+', label: 'Customs Records' },
  { value: TRADE_STATS.activeExportersCount, suffix: '+', label: 'Indian Exporters' },
  { value: 50, suffix: 'K+', label: 'Verified Importers' },
];

export default function TrustBar() {
  return (
    <section className="w-full bg-white border-b border-[#E5E7EB] py-6">
      <div className="section-container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-[#0F172A] tracking-tight">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-xs font-medium text-[#64748B] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
