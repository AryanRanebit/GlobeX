import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/sections/Hero';
import TrustBar from './components/sections/TrustBar';
import Solutions from './components/sections/Solutions';
import HowItWorks from './components/sections/HowItWorks';
import DashboardPreview from './components/sections/DashboardPreview';
import Testimonials from './components/sections/Testimonials';
import Pricing from './components/sections/Pricing';
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
        // Ensure user can access dashboard with demo credentials if not yet authenticated
        if (!localStorage.getItem('token')) {
          localStorage.setItem('token', 'demo-session-token');
          localStorage.setItem('user', JSON.stringify({ name: 'Aryan Rane', email: 'aryan@globex.ai' }));
          setIsAuthenticated(true);
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

    // Auto-authenticate as demo user if not logged in
    if (!localStorage.getItem('token')) {
      localStorage.setItem('token', 'demo-session-token');
      localStorage.setItem('user', JSON.stringify({ name: 'Aryan Rane', email: 'aryan@globex.ai' }));
      setIsAuthenticated(true);
    }

    setDashboardPage(targetTab);

    // Update browser URL query param
    const url = new URL(window.location.href);
    url.searchParams.set('search', cleanQuery);
    url.searchParams.set('tab', targetTab);
    window.history.pushState({ search: cleanQuery, tab: targetTab }, '', url.toString());
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
          />
        )}
        {dashboardPage === 'markets' && (
          <MarketIntelligence 
            searchQuery={searchQuery} 
            onSearchChange={setSearchQuery} 
          />
        )}
        {dashboardPage === 'copilot' && <AICopilot />}
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
          <Testimonials />
          <Pricing onOpenAuth={() => setAuthOpen(true)} />
          <FAQ />
          <FinalCTA onOpenAuth={() => setAuthOpen(true)} />
        </>
      ) : (
        <AiAgentsHub onBackToLanding={() => setCurrentPage('landing')} />
      )}
      
      <Footer onNavigate={setCurrentPage} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
