import React from 'react';
import { LogoMark } from '../ui/Logo';

export default function Footer({ onNavigate }) {
  return (
    <footer className="w-full bg-navy border-t border-navy-light">
      <div className="section-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Brand — spans 2 cols on lg */}
          <div className="lg:col-span-2">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); if (onNavigate) onNavigate('landing'); }}
              className="flex items-center gap-2 mb-3.5 inline-flex"
            >
              <LogoMark size={24} onDark />
              <span className="text-base font-bold text-white font-heading">Globe<span className="text-[#F59E0B]">X</span></span>
            </a>
            <p className="text-sm text-faint leading-relaxed max-w-sm mb-4">
              Export market intelligence platform for Indian manufacturers, traders, and MSME exporters. Discover markets, find real buyers with cited sources, and grow your export revenue with data.
            </p>
            <div className="space-y-1.5 text-[13px] text-faint">
              <p className="text-line-dark font-semibold">Contact & Support:</p>
              <p>Inquiries: Enterprise Desk (TBD)</p>
              <p>Location: Mumbai, Maharashtra, India</p>
              <p className="text-xs text-muted pt-1.5 border-t border-navy-light">
                Source: UN Comtrade, United Nations Statistics Division (UNSD), India merchandise exports 2025
              </p>
            </div>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="text-xs font-bold text-line-dark uppercase tracking-wider mb-3.5 font-heading">Solutions</h4>
            <ul className="space-y-2.5">
              {['Market Analysis', 'Lead Discovery', 'Competitor Intel', 'AI Trade Agents'].map(item => (
                <li key={item}>
                  <a 
                    href={item === 'AI Trade Agents' ? '#' : '#solutions'} 
                    onClick={(e) => {
                      if (item === 'AI Trade Agents' && onNavigate) {
                        e.preventDefault();
                        onNavigate('agents');
                      }
                    }}
                    className="text-sm text-faint hover:text-white transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company - only links that resolve are listed; policy/about pages
              return when they exist (college project scope). */}
          <div>
            <h4 className="text-xs font-bold text-line-dark uppercase tracking-wider mb-3.5 font-heading">Company</h4>
            <ul className="space-y-2.5">
              <li><a href="#faq" className="text-sm text-faint hover:text-white transition-colors">FAQs</a></li>
              <li><a href="#contact" className="text-sm text-faint hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-navy-light">
        <div className="section-container py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted">© {new Date().getFullYear()} GlobeX. All rights reserved.</p>
          {/* Privacy / Terms / Security links return when those pages exist. */}
        </div>
      </div>
    </footer>
  );
}
