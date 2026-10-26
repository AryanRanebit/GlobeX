import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'What data sources does GlobeX use?',
    a: 'GlobeX aggregates data directly from UN Comtrade (calendar year 2025 dataset), DGCI&S (Directorate General of Commercial Intelligence and Statistics), national customs registries, and verified commercial databases. Our coverage includes 223 destination countries and territories with over 10 million customs records.',
  },
  {
    q: 'Is GlobeX suitable for small exporters and MSMEs?',
    a: 'Yes. GlobeX is designed specifically for Indian exporters of all sizes — from individual traders to large export houses. Our Starter plan is tailored for small businesses and MSMEs looking to explore new export markets with limited budgets.',
  },
  {
    q: 'How accurate are the importer leads?',
    a: 'Our importer database is built from verified customs records and trade registries. Each lead includes trade history, shipment volumes, and product categories. We update our database regularly to ensure accuracy and relevance.',
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
    <div className="border-b border-[#E5E7EB]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <span className="text-[14px] font-medium text-[#0F172A] pr-4 group-hover:text-[#2563EB] transition-colors">{q}</span>
        <ChevronDown
          size={16}
          className={`text-[#94A3B8] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="pb-4 pr-8">
          <p className="text-[13px] text-[#64748B] leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="w-full bg-white py-14 md:py-16 border-b border-[#E5E7EB]">
      <div className="section-container">
        <div className="text-center mb-10">
          <span className="type-label text-[#2563EB] mb-2 block">FAQs</span>
          <h2 className="type-h2 mb-3">Frequently Asked Questions</h2>
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
