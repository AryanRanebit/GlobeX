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
          <div className="text-center mb-10 max-w-2xl mx-auto">
            <span className="type-label text-[#2563EB] mb-2 block">Illustrative Case Studies</span>
            <h2 className="type-h2 mb-2.5 text-[#0F172A] font-bold">Sample Exporter Workflows</h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-[11px] text-[#64748B]">
              <Info size={12} className="text-[#2563EB]" />
              <span>Sample Content — Representative workflows for Indian manufacturers evaluating export destinations.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, idx) => (
              <div key={idx} className="p-5 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB] flex flex-col justify-between">
                <div>
                  {/* Category & Sample Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#DBEAFE]">
                      {t.sector}
                    </span>
                    <span className="text-[10px] font-semibold text-[#94A3B8]">Sample Case</span>
                  </div>

                  <p className="text-[13px] text-[#334155] leading-relaxed mb-4">
                    "{t.text}"
                  </p>
                </div>

                <div className="border-t border-[#E5E7EB] pt-3 mt-2">
                  <div className="text-[13px] font-bold text-[#0F172A]">{t.name}</div>
                  <div className="text-[11px] text-[#64748B]">{t.role}</div>
                  <div className="text-[11px] text-[#94A3B8]">{t.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
