import React, { useState, useEffect } from 'react';
import { BarChart3, Menu, X, Phone, Mail } from 'lucide-react';

export default function Navbar({ onOpenAuth, currentPage, onNavigate }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'AI Agents', href: '#', action: () => onNavigate('agents'), type: 'action', isActive: currentPage === 'agents' },
    { name: 'Solutions', href: '#solutions', type: 'anchor', isActive: currentPage === 'landing' && window.location.hash === '#solutions' },
    { name: 'Features', href: '#features', type: 'anchor', isActive: currentPage === 'landing' && window.location.hash === '#features' },
    { name: 'How It Works', href: '#how-it-works', type: 'anchor', isActive: currentPage === 'landing' && window.location.hash === '#how-it-works' },
    { name: 'Pricing', href: '#pricing', type: 'anchor', isActive: currentPage === 'landing' && window.location.hash === '#pricing' },
  ];

  const handleLinkClick = (e, link) => {
    if (link.type === 'action') {
      e.preventDefault();
      link.action();
    } else if (currentPage !== 'landing') {
      // If we are not on landing page, redirect to landing first
      e.preventDefault();
      onNavigate('landing');
      // Delay slightly to let the page mount before scrolling
      setTimeout(() => {
        const element = document.querySelector(link.href);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top info bar */}
      <div className="hidden md:block w-full bg-[#0F172A] text-white text-[11px] py-1.5 border-b border-[#1E293B]">
        <div className="section-container flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#CBD5E1]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block" />
            <span>Official Source: UN Comtrade 2025 Merchandise Export Statistics</span>
          </div>
          <div className="flex items-center gap-4 text-[#94A3B8]">
            <span>Reporter: India (699)</span>
            <span>223 Global Destination Markets</span>
            <span className="text-[#38BDF8]">Live Customs Desk</span>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <nav className={`sticky top-0 w-full z-50 transition-shadow duration-200 bg-white border-b border-[#E5E7EB] ${isScrolled ? 'shadow-sm' : ''}`}>
        <div className="section-container flex items-center justify-between h-14">
          {/* Logo */}
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); onNavigate('landing'); }}
            className="flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded bg-[#2563EB] flex items-center justify-center">
              <BarChart3 size={15} color="#FFFFFF" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold text-[#0F172A] tracking-tight font-heading">GlobeX</span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link)}
                className={`text-sm font-semibold transition-colors ${
                  link.isActive 
                    ? 'text-[#2563EB]' 
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onOpenAuth}
              className="text-sm font-semibold text-[#334155] hover:text-[#0F172A] py-1.5 px-3 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onOpenAuth}
              className="btn-primary text-sm font-semibold py-2 px-4.5 rounded-lg shadow-xs"
            >
              Book a Free Demo
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button className="md:hidden text-[#334155]" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-[#E5E7EB]">
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('landing'); setMobileMenuOpen(false); }} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#2563EB] flex items-center justify-center">
                <BarChart3 size={15} color="#FFFFFF" strokeWidth={2.5} />
              </div>
              <span className="text-base font-bold text-[#0F172A]">GlobeX</span>
            </a>
            <button className="text-[#64748B] p-2" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <X size={20} />
            </button>
          </div>
          <div className="flex flex-col p-5 gap-0.5 flex-1">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                onClick={(e) => handleLinkClick(e, link)}
                className={`text-[15px] font-medium py-3 border-b border-[#F1F5F9] ${
                  link.isActive ? 'text-[#2563EB]' : 'text-[#0F172A]'
                }`}
              >
                {link.name}
              </a>
            ))}
          </div>
          <div className="p-5 flex flex-col gap-2.5 border-t border-[#E5E7EB]">
            <button onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }} className="btn-secondary w-full py-2.5 text-[13px]">Sign In</button>
            <button onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }} className="btn-primary w-full py-2.5 text-[13px]">Book a Free Demo</button>
          </div>
        </div>
      )}
    </>
  );
}
