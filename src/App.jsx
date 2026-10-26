import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Hero from './components/sections/Hero';
import TrustBar from './components/sections/TrustBar';
import ProblemSection from './components/sections/ProblemSection';
import Solutions from './components/sections/Solutions';
import FeaturesMatrix from './components/sections/FeaturesMatrix';
import HowItWorks from './components/sections/HowItWorks';
import DashboardPreview from './components/sections/DashboardPreview';
import Pricing from './components/sections/Pricing';
import FAQ from './components/sections/FAQ';
import Footer from './components/sections/Footer';
import AuthModal from './components/AuthModal';
import AiAgentsHub from './components/AiAgentsHub';

export default function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    return window.location.pathname.startsWith('/agents') || window.location.hash === '#agents' ? 'agents' : 'landing';
  });
  const [authOpen, setAuthOpen] = useState(false);

  // Sync route on popstate and pushState
  useEffect(() => {
    const handleLocation = () => {
      const isAgents = window.location.pathname.startsWith('/agents') || window.location.hash === '#agents';
      setCurrentPage(isAgents ? 'agents' : 'landing');
    };
    window.addEventListener('popstate', handleLocation);
    return () => window.removeEventListener('popstate', handleLocation);
  }, []);

  const navigateTo = (page) => {
    setCurrentPage(page);
    if (page === 'agents') {
      window.history.pushState(null, '', '/agents');
    } else {
      window.history.pushState(null, '', '/');
    }
  };

  // Scroll to top on page navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  return (
    <AuthProvider>
      <div className="bg-[#F1F5F9] min-h-screen flex flex-col">
        {currentPage === 'landing' ? (
          <div className="bg-white min-h-screen flex flex-col">
            <Navbar 
              onOpenAuth={() => setAuthOpen(true)} 
              currentPage={currentPage}
              onNavigate={navigateTo}
            />
            <Hero onOpenAuth={() => setAuthOpen(true)} />
            <TrustBar />
            <ProblemSection />
            <Solutions />
            <FeaturesMatrix />
            <HowItWorks />
            <DashboardPreview onNavigate={navigateTo} onOpenAuth={() => setAuthOpen(true)} />
            <Pricing onOpenAuth={() => setAuthOpen(true)} />
            <FAQ />
            <Footer onNavigate={navigateTo} />
          </div>
        ) : (
          <AiAgentsHub onBackToLanding={() => navigateTo('landing')} />
        )}
        
        <AuthModal 
          isOpen={authOpen} 
          onClose={() => setAuthOpen(false)}
          onAuthSuccess={() => { setAuthOpen(false); navigateTo('agents'); }}
        />
      </div>
    </AuthProvider>
  );
}

