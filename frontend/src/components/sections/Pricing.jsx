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
          <div className="text-center mb-10">
            <span className="type-label text-[#2563EB] mb-2 block">Pricing</span>
            <h2 className="type-h2 mb-3">Simple, Transparent Pricing</h2>
            <p className="text-[14px] text-[#64748B] max-w-xl mx-auto">
              All plans include a 14-day free trial. No credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`rounded border p-5 flex flex-col ${
                  plan.highlighted
                    ? 'bg-white border-[#2563EB] border-2 relative'
                    : 'bg-white border-[#E5E7EB]'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2563EB] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded">
                    Most Popular
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-[15px] font-semibold text-[#0F172A] mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold text-[#0F172A]">{plan.price}</span>
                    <span className="text-[12px] text-[#64748B]">{plan.period}</span>
                  </div>
                  <p className="text-[12px] text-[#64748B] mt-2 leading-relaxed">{plan.description}</p>
                </div>

                <div className="flex-1 mb-5">
                  <ul className="space-y-2">
                    {plan.features.map((feat, fi) => (
                      <li key={fi} className="flex items-start gap-2 text-[12px] text-[#334155]">
                        <Check size={13} className="text-[#059669] shrink-0 mt-0.5" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={onOpenAuth}
                  className={`w-full py-2 text-[13px] font-semibold rounded transition-colors ${
                    plan.highlighted
                      ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                      : 'bg-white text-[#2563EB] border border-[#2563EB] hover:bg-[#EFF6FF]'
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
