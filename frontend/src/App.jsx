import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/sections/Hero';
import TrustBar from './components/sections/TrustBar';
import Solutions from './components/sections/Solutions';
import HowItWorks from './components/sections/HowItWorks';
import DashboardPreview from './components/sections/DashboardPreview';
import FAQ from './components/sections/FAQ';
import FinalCTA from './components/sections/FinalCTA';
import Footer from './components/sections/Footer';
import AuthModal from './components/AuthModal';
import AiAgentsHub from './components/AiAgentsHub';
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardHome from './components/dashboard/DashboardHome';
import BuyerDiscovery from './components/dashboard/BuyerDiscovery';
import MarketIntelligence from './components/dashboard/MarketIntelligence';
import AICopilot from './components/dashboard/AICopilot';

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [dashboardPage, setDashboardPage] = useState('dashboard');
  const [authOpen, setAuthOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState('signup');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));

  // Parse URL query params on mount or popstate
  useEffect(() => {
    const handleUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const queryParam = params.get('search') || params.get('q');
      const tabParam = params.get('tab');

      if (queryParam) {
        setSearchQuery(queryParam);
        if (!localStorage.getItem('token')) {
          // No silent auto-login: prompt the visitor to sign in first.
          // After a successful sign-in the page reloads and the query
          // params are picked up again by this handler.
          setAuthOpen(true);
          return;
        }
        if (tabParam === 'buyers' || tabParam === 'markets') {
          setDashboardPage(tabParam);
        } else {
          setDashboardPage('markets');
        }
      }
    };

    handleUrlParams();
    window.addEventListener('popstate', handleUrlParams);
    return () => window.removeEventListener('popstate', handleUrlParams);
  }, []);

  // Scroll to top on page navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage, dashboardPage]);

  // Handle Hero Search submission with query param routing
  const handleHeroSearch = useCallback((query, targetTab = 'markets') => {
    if (!query || !query.trim()) return;
    const cleanQuery = query.trim();
    setSearchQuery(cleanQuery);

    // Update browser URL query param
    const url = new URL(window.location.href);
    url.searchParams.set('search', cleanQuery);
    url.searchParams.set('tab', targetTab);
    window.history.pushState({ search: cleanQuery, tab: targetTab }, '', url.toString());

    if (!localStorage.getItem('token')) {
      // Require a real sign-in instead of minting a fake demo session.
      // The query stays in the URL and is applied after sign-in reloads the app.
      setAuthOpen(true);
      return;
    }

    setDashboardPage(targetTab);
  }, []);

  const requireSignIn = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setAuthInitialTab('signin');
    setAuthOpen(true);
  }, []);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setCurrentPage('landing');
    setDashboardPage('dashboard');
    setSearchQuery('');
    
    // Clear query parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('search');
    url.searchParams.delete('tab');
    window.history.pushState({}, '', url.pathname);
  };

  if (isAuthenticated) {
    return (
      <DashboardLayout 
        currentPage={dashboardPage} 
        onNavigate={(tab) => {
          setDashboardPage(tab);
          const url = new URL(window.location.href);
          url.searchParams.set('tab', tab);
          window.history.pushState({}, '', url.toString());
        }}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {dashboardPage === 'dashboard' && <DashboardHome />}
        {dashboardPage === 'buyers' && (
          <BuyerDiscovery 
            searchQuery={searchQuery} 
            onSearchChange={setSearchQuery}
            onRequireAuth={requireSignIn}
          />
        )}
        {dashboardPage === 'markets' && (
          <MarketIntelligence 
            searchQuery={searchQuery} 
            onSearchChange={setSearchQuery} 
            onNavigateToBuyers={(country) => {
              setSearchQuery(country);
              setDashboardPage('buyers');
              const url = new URL(window.location.href);
              url.searchParams.set('search', country);
              url.searchParams.set('tab', 'buyers');
              window.history.pushState({ search: country, tab: 'buyers' }, '', url.toString());
            }}
          />
        )}
        {dashboardPage === 'copilot' && <AICopilot onRequireAuth={requireSignIn} />}
      </DashboardLayout>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <Navbar 
        onOpenAuth={() => setAuthOpen(true)} 
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />
      
      {currentPage === 'landing' ? (
        <>
          <Hero 
            onOpenAuth={() => setAuthOpen(true)} 
            onSearch={handleHeroSearch} 
          />
          <TrustBar />
          <Solutions onOpenAuth={() => setAuthOpen(true)} />
          <HowItWorks />
          <DashboardPreview />
          <FAQ />
          <FinalCTA onOpenAuth={() => setAuthOpen(true)} />
        </>
      ) : (
        <AiAgentsHub onBackToLanding={() => setCurrentPage('landing')} />
      )}
      
      <Footer onNavigate={setCurrentPage} />
      <AuthModal isOpen={authOpen} initialTab={authInitialTab} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
