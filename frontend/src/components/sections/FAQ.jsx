import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'What data sources does GlobeX use?',
    a: 'GlobeX grounds market statistics directly on official UN Comtrade data (calendar year 2025 dataset) covering 223 destination countries and territories and $445.8B in total Indian merchandise exports. We separate verified government statistics from qualitative market estimates.',
  },
  {
    q: 'Is GlobeX suitable for small exporters and MSMEs?',
    a: 'Yes. GlobeX is designed specifically for Indian exporters of all sizes — from individual traders to large export houses. Our Starter plan is tailored for small businesses and MSMEs looking to explore new export markets with limited budgets.',
  },
  {
    q: 'How accurate are the importer leads?',
    a: 'GlobeX enforces strict evidence thresholds: buyer leads are discovered via AI web intelligence and marked as verified only when backed by public corporate registry citations and confirmed contact channels. We never manufacture artificial import volumes or verified badges.',
  },
  {
    q: 'Can I search by HS code?',
    a: 'Yes. GlobeX supports search by HS code (2-digit, 4-digit, 6-digit, and 8-digit levels), product name, product description, or industry category. Our system recognizes thousands of product classifications.',
  },
  {
    q: 'How is GlobeX different from Volza, ImportGenius, or Panjiva?',
    a: 'GlobeX is built specifically for Indian exporters. We focus on outbound export intelligence from India, provide AI-generated market entry reports, and offer pricing in INR. Our platform combines market analysis, buyer discovery, and competitor tracking in a single tool.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes. All plans include a 14-day free trial with full access to platform features. No credit card is required to start your trial.',
  },
  {
    q: 'How do you handle data privacy and security?',
    a: 'GlobeX uses enterprise-grade encryption for data in transit and at rest. We follow strict data privacy practices and do not share your research data or business information with third parties.',
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-line">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4.5 text-left group"
      >
        <span className="text-base font-semibold text-navy pr-4 group-hover:text-blue transition-colors font-heading">{q}</span>
        <ChevronDown
          size={18}
          className={`text-faint shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-blue' : ''}`}
        />
      </button>
      {open && (
        <div className="pb-5 pr-8">
          <p className="text-[15px] md:text-base text-soft leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="w-full bg-white py-14 md:py-16 border-b border-line">
      <div className="section-container">
        <div className="text-center mb-12">
          <span className="type-label text-blue mb-2 block font-semibold">FAQs</span>
          <h2 className="type-h2 mb-3 font-heading font-bold text-navy">Frequently Asked Questions</h2>
        </div>

        <div className="max-w-2xl mx-auto">
          {faqs.map((faq, idx) => (
            <FAQItem key={idx} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
