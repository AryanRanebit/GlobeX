import React from 'react';
import { useFadeIn } from '../../lib/useFadeIn';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '₹4,999',
    period: '/month',
    description: 'For individual exporters and small trading firms getting started with market research.',
    features: [
      '5 market analysis reports per month',
      'Top 50 country rankings',
      '100 importer leads per month',
      'Basic competitor tracking',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '₹14,999',
    period: '/month',
    description: 'For growing export businesses that need comprehensive trade intelligence and buyer databases.',
    features: [
      'Unlimited market analysis reports',
      'Full 223 destination market rankings (UN Comtrade)',
      '500 importer leads per month',
      'Advanced competitor intelligence',
      'AI-generated research reports',
      'Product-market matching',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large export houses and trading companies that need dedicated support and custom integrations.',
    features: [
      'Everything in Professional',
      'Unlimited importer leads',
      'Custom data integrations',
      'Dedicated account manager',
      'API access',
      'Team collaboration',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export default function Pricing({ onOpenAuth }) {
  const fade = useFadeIn();

  return (
    <section id="pricing" className="w-full bg-[#F5F7FA] py-14 md:py-16 border-b border-[#E5E7EB]">
      <div className="section-container" ref={fade.ref}>
        <div className={fade.className}>
          <div className="text-center mb-12">
            <span className="type-label text-[#2563EB] mb-2 block font-semibold">Flexible Plans</span>
            <h2 className="type-h2 mb-3 font-heading font-bold text-[#0F172A]">Simple, Transparent Pricing</h2>
            <p className="text-base text-[#475569] max-w-xl mx-auto leading-relaxed">
              All plans include a 14-day free trial. No credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`rounded-xl border p-6 flex flex-col justify-between transition-shadow hover:shadow-lg ${
                  plan.highlighted
                    ? 'bg-white border-[#2563EB] border-2 relative shadow-md'
                    : 'bg-white border-[#E2E8F0]'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#D97706] text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
                    ★ Most Popular
                  </div>
                )}

                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-[#0F172A] mb-1 font-heading">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-extrabold text-[#0F172A] font-heading">{plan.price}</span>
                      <span className="text-xs font-semibold text-[#64748B]">{plan.period}</span>
                    </div>
                    <p className="text-sm text-[#475569] mt-3 leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="mb-6 pt-3 border-t border-[#F1F5F9]">
                    <ul className="space-y-2.5">
                      {plan.features.map((feat, fi) => (
                        <li key={fi} className="flex items-start gap-2.5 text-sm text-[#334155] leading-snug">
                          <Check size={16} className="text-[#059669] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={onOpenAuth}
                  className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-colors shadow-xs ${
                    plan.highlighted
                      ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                      : 'bg-white text-[#2563EB] border border-[#CBD5E1] hover:bg-[#EFF6FF]'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
