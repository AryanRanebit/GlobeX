import React from 'react';
import { useFadeIn } from '../../lib/useFadeIn';
import { Star, Info } from 'lucide-react';

const testimonials = [
  {
    name: 'Rajesh Mehta (Sample Exporter)',
    role: 'Director, Textile Export Firm',
    location: 'Surat, Gujarat',
    sector: 'Apparel & Fabrics (HS 6204)',
    text: 'Identified 3 high-margin export destinations in the Gulf and Eastern Europe using real tariff advantage scores. Allowed our export desk to reallocate capacity within two sourcing quarters.',
    rating: 5,
  },
  {
    name: 'Priya Sharma (Sample Exporter)',
    role: 'Export Lead, Agro Trading Group',
    location: 'Nashik, Maharashtra',
    sector: 'Agricultural Commodities (HS 1006)',
    text: 'Automated our weekly destination tariff tracking and phytosanitary certificate verification, replacing 3 weeks of manual trade PDF lookups.',
    rating: 5,
  },
  {
    name: 'Vikram Patel (Sample Exporter)',
    role: 'CEO, Precision Engineering Co.',
    location: 'Ahmedabad, Gujarat',
    sector: 'Industrial Hardware & Castings',
    text: 'Competitor shipment tracking provided transparent visibility into competitor port volumes at Rotterdam, helping us negotiate direct FOB buyer contracts.',
    rating: 5,
  },
];

export default function Testimonials() {
  const fade = useFadeIn();

  return (
    <section className="w-full bg-white py-14 md:py-16 border-b border-[#E5E7EB]">
      <div className="section-container" ref={fade.ref}>
        <div className={fade.className}>
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <span className="type-label text-[#2563EB] mb-2 block font-semibold">Illustrative Case Studies</span>
            <h2 className="type-h2 mb-2.5 text-[#0F172A] font-bold font-heading">Sample Exporter Workflows</h2>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-xs text-[#64748B] mt-2">
              <Info size={14} className="text-[#2563EB] shrink-0" />
              <span>Sample Content — Representative workflows for Indian manufacturers evaluating export destinations.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div key={idx} className="p-6 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  {/* Category & Sample Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1 rounded-md border border-[#DBEAFE]">
                      {t.sector}
                    </span>
                    <span className="text-xs font-semibold text-[#94A3B8]">Sample Case</span>
                  </div>

                  <p className="text-[15px] text-[#334155] leading-relaxed mb-6">
                    "{t.text}"
                  </p>
                </div>

                <div className="border-t border-[#E5E7EB] pt-4 mt-2">
                  <div className="text-sm font-bold text-[#0F172A] font-heading">{t.name}</div>
                  <div className="text-xs font-medium text-[#64748B] mt-0.5">{t.role}</div>
                  <div className="text-xs text-[#94A3B8]">{t.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
