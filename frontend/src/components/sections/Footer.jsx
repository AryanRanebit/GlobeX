import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="w-full bg-[#0F172A] border-t border-[#1E293B]">
      <div className="section-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">

          {/* Brand — spans 2 cols on lg */}
          <div className="lg:col-span-2">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); if (onNavigate) onNavigate('landing'); }}
              className="flex items-center gap-2 mb-3.5 inline-flex"
            >
              <div className="w-6 h-6 rounded bg-[#2563EB] flex items-center justify-center">
                <BarChart3 size={13} color="#FFFFFF" strokeWidth={2.5} />
              </div>
              <span className="text-base font-bold text-white font-heading">GlobeX</span>
            </a>
            <p className="text-sm text-[#94A3B8] leading-relaxed max-w-sm mb-4">
              Export market intelligence platform for Indian manufacturers, traders, and MSME exporters. Discover markets, find verified buyers, and grow your export revenue with data.
            </p>
            <div className="space-y-1.5 text-[13px] text-[#94A3B8]">
              <p className="text-[#CBD5E1] font-semibold">Contact & Support:</p>
              <p>Inquiries: Enterprise Desk (TBD)</p>
              <p>Location: Mumbai, Maharashtra, India</p>
              <p className="text-xs text-[#64748B] pt-1.5 border-t border-[#1E293B]">
                Source: UN Comtrade, United Nations Statistics Division (UNSD), India merchandise exports 2025
              </p>
            </div>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider mb-3.5 font-heading">Solutions</h4>
            <ul className="space-y-2.5">
              {['Market Analysis', 'Lead Discovery', 'Competitor Intel', 'AI Trade Agents', 'Demand Forecasting'].map(item => (
                <li key={item}>
                  <a 
                    href={item === 'AI Trade Agents' ? '#' : '#solutions'} 
                    onClick={(e) => {
                      if (item === 'AI Trade Agents' && onNavigate) {
                        e.preventDefault();
                        onNavigate('agents');
                      }
                    }}
                    className="text-sm text-[#94A3B8] hover:text-white transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider mb-3.5 font-heading">Company</h4>
            <ul className="space-y-2.5">
              {['About Us', 'Pricing', 'Blog', 'Careers', 'Contact'].map(item => (
                <li key={item}><a href="#" className="text-sm text-[#94A3B8] hover:text-white transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider mb-3.5 font-heading">Legal</h4>
            <ul className="space-y-2.5">
              {['Privacy Policy', 'Terms of Service', 'Data Security', 'Refund Policy', 'FAQs'].map(item => (
                <li key={item}><a href="#" className="text-sm text-[#94A3B8] hover:text-white transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#1E293B]">
        <div className="section-container py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-[#64748B]">© {new Date().getFullYear()} GlobeX. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="text-xs text-[#64748B] hover:text-[#94A3B8] transition-colors">Privacy</a>
            <a href="#" className="text-xs text-[#64748B] hover:text-[#94A3B8] transition-colors">Terms</a>
            <a href="#" className="text-xs text-[#64748B] hover:text-[#94A3B8] transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
