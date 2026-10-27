import React from 'react';
import { useFadeIn } from '../../lib/useFadeIn';
import { Search, BarChart3, ListChecks, FileOutput } from 'lucide-react';

const steps = [
  {
    icon: Search,
    number: '1',
    title: 'Enter Your Product',
    desc: 'Provide your HS code, product name, or description. Our system recognizes thousands of product categories.',
  },
  {
    icon: BarChart3,
    number: '2',
    title: 'AI Analyzes Trade Data',
    desc: 'Our engine queries official UN Comtrade trade flows and global demand signals to identify high-potential export destinations.',
  },
  {
    icon: ListChecks,
    number: '3',
    title: 'Review Opportunities',
    desc: 'Explore ranked country opportunities with import volumes, growth trends, and verified buyer leads.',
  },
  {
    icon: FileOutput,
    number: '4',
    title: 'Export & Outreach',
    desc: 'Download detailed reports, export buyer contact lists, and begin targeted outreach to importers.',
  },
];

export default function HowItWorks() {
  const fade = useFadeIn();

  return (
    <section id="how-it-works" className="w-full bg-white py-14 md:py-16 border-b border-[#E5E7EB]">
      <div className="section-container" ref={fade.ref}>
        <div className={fade.className}>
          <div className="text-center mb-10">
            <span className="type-label text-[#2563EB] mb-2 block">How It Works</span>
            <h2 className="type-h2 mb-3">From Product to Actionable Intelligence in 4 Steps</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
            {steps.map((step, idx) => (
              <div key={idx} className="relative flex flex-col items-center text-center px-5 py-6">
                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 right-0 w-full h-px bg-[#E5E7EB]" style={{ left: '50%', width: '100%' }} />
                )}

                <div className="relative z-10 w-12 h-12 rounded-full bg-[#2563EB] flex items-center justify-center mb-4">
                  <span className="text-white text-sm font-bold">{step.number}</span>
                </div>

                <h3 className="text-[14px] font-semibold text-[#0F172A] mb-1.5">{step.title}</h3>
                <p className="text-[12px] text-[#64748B] leading-relaxed max-w-[200px]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
