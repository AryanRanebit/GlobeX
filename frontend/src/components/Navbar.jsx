import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { LogoMark } from './ui/Logo';

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
      <div className="hidden md:block w-full bg-navy text-white text-[11px] py-1.5 border-b border-navy-light">
        <div className="section-container flex items-center justify-between">
          <div className="flex items-center gap-2 text-line-dark">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-light inline-block" />
            <span>Official Source: UN Comtrade 2025 Merchandise Export Statistics</span>
          </div>
          <div className="flex items-center gap-4 text-faint">
            <span>Reporter: India (699)</span>
            <span>223 Global Destination Markets</span>
            <span className="text-sky">Live Customs Desk</span>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <nav className={`sticky top-0 w-full z-50 transition-shadow duration-200 bg-white border-b border-line ${isScrolled ? 'shadow-sm' : ''}`}>
        <div className="section-container flex items-center justify-between h-14">
          {/* Logo */}
          <a 
            href="/" 
            onClick={(e) => { e.preventDefault(); onNavigate('landing'); }}
            className="flex items-center gap-2"
          >
            <LogoMark size={28} />
            <span className="text-lg font-bold text-navy tracking-tight font-heading">Globe<span className="text-accent">X</span></span>
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
                    ? 'text-blue' 
                    : 'text-muted hover:text-navy'
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
              className="text-sm font-semibold text-ink hover:text-navy py-1.5 px-3 transition-colors"
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
          <button className="md:hidden text-ink" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-line">
            <a href="/" onClick={(e) => { e.preventDefault(); onNavigate('landing'); setMobileMenuOpen(false); }} className="flex items-center gap-2">
              <LogoMark size={26} />
              <span className="text-base font-bold text-navy">Globe<span className="text-accent">X</span></span>
            </a>
            <button className="text-muted p-2" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <X size={20} />
            </button>
          </div>
          <div className="flex flex-col p-5 gap-0.5 flex-1">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                onClick={(e) => handleLinkClick(e, link)}
                className={`text-[15px] font-medium py-3 border-b border-surface ${
                  link.isActive ? 'text-blue' : 'text-navy'
                }`}
              >
                {link.name}
              </a>
            ))}
          </div>
          <div className="p-5 flex flex-col gap-2.5 border-t border-line">
            <button onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }} className="btn-secondary w-full py-2.5 text-[13px]">Sign In</button>
            <button onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }} className="btn-primary w-full py-2.5 text-[13px]">Book a Free Demo</button>
          </div>
        </div>
      )}
    </>
  );
}
