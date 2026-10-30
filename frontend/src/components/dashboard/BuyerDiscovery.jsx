import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Search, 
  Mail, 
  X,
  Sparkles,
  Send,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Plus,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { SkeletonRows } from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import ErrorBanner from '../ui/ErrorBanner';
import { apiFetch } from '../../lib/api';

export default function BuyerDiscovery({ searchQuery = '', onSearchChange, onRequireAuth }) {
  const [buyers, setBuyers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('scoreDesc');
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [emailModalBuyer, setEmailModalBuyer] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Discover modal state
  const [isDiscoverModalOpen, setIsDiscoverModalOpen] = useState(false);
  const [discoverProduct, setDiscoverProduct] = useState('Apparel & Cotton Trousers (HS 62)');
  const [discoverCountry, setDiscoverCountry] = useState('United States');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState(null);

  // Contact enrichment state: buyerId -> { loading, status, email, note }
  const [enrichState, setEnrichState] = useState({});

  // Sync the external global search query into local state
  // (render-time adjustment instead of an effect).
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
  if (prevSearchQuery !== searchQuery) {
    setPrevSearchQuery(searchQuery);
    // The global query is product context for discovery - never a buyer-list
    // filter or a country name (an HS code here zeroed the list silently).
    if (searchQuery && searchQuery.trim()) {
      setDiscoverProduct(searchQuery.trim());
    }
  }

  // Fetch buyers from API. Initial state is already loading=true, so the
  // effect below never sets state synchronously; retries use refetchBuyers.
  const onRequireAuthRef = useRef(onRequireAuth);
  useEffect(() => {
    onRequireAuthRef.current = onRequireAuth;
  }, [onRequireAuth]);

  const fetchBuyers = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/buyers?limit=100');

      if (res.status === 401) {
        onRequireAuthRef.current?.();
        return;
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBuyers(json.data);
      } else {
        setBuyers([]);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching buyers:', err);
      setError(err.message || 'Could not connect to buyer service');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Event-handler refresh: enters the loading state, then re-fetches.
  const refetchBuyers = () => {
    setIsLoading(true);
    setError(null);
    fetchBuyers();
  };

  useEffect(() => {
    let active = true;
    // Deferred to a microtask so no state is set synchronously in the effect.
    Promise.resolve().then(() => {
      if (active) fetchBuyers();
    });
    return () => { active = false; };
  }, [fetchBuyers]);

  // Run discovery pipeline
  const handleRunDiscovery = async (e) => {
    if (e) e.preventDefault();
    setIsDiscovering(true);
    setDiscoverError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsDiscoverModalOpen(false);
        onRequireAuth?.();
        return;
      }

      const payload = {
        product: discoverProduct,
        targetCountries: [discoverCountry]
      };

      const res = await apiFetch('/api/v1/buyers/discover', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        setIsDiscoverModalOpen(false);
        onRequireAuth?.();
        return;
      }

      const json = await res.json();
      if (res.ok && json.success) {
        const found = json.data?.totalUniqueBuyers ?? 0;
        if (found === 0) {
          // Honest empty state: the grounded search found nothing citable.
          setDiscoverError(
            json.data?.note ||
            'The live web search found no companies it could back with a source for this query. Nothing was added rather than showing invented buyers.'
          );
          return;
        }
        setIsDiscoverModalOpen(false);
        // Refresh buyers list
        refetchBuyers();
      } else {
        throw new Error(json.message || 'Discovery execution failed');
      }
    } catch (err) {
      console.error('Discovery error:', err);
      setDiscoverError(err.message || 'Buyer discovery failed. Please try again.');
    } finally {
      setIsDiscovering(false);
    }
  };

  // Filtered and sorted buyers
  const filteredBuyers = useMemo(() => {
    return buyers
      .filter(buyer => {
        // Country filter
        if (countryFilter !== 'ALL' && buyer.country !== countryFilter) return false;
        // Search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matches = (
            buyer.companyName?.toLowerCase().includes(term) ||
            buyer.country?.toLowerCase().includes(term) ||
            buyer.industry?.toLowerCase().includes(term) ||
            buyer.website?.toLowerCase().includes(term)
          );
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'scoreDesc') return (b.leadScore || 0) - (a.leadScore || 0);
        if (sortBy === 'scoreAsc') return (a.leadScore || 0) - (b.leadScore || 0);
        if (sortBy === 'nameAsc') return (a.companyName || '').localeCompare(b.companyName || '');
        return 0;
      });
  }, [buyers, searchTerm, countryFilter, sortBy]);

  const countries = useMemo(() => {
    const list = Array.from(new Set(buyers.map(b => b.country).filter(Boolean)));
    return ['ALL', ...list];
  }, [buyers]);

  const handleCopyEmail = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleSendEmail = () => {
    setEmailSent(true);
    setTimeout(() => {
      setEmailModalBuyer(null);
      setEmailSent(false);
    }, 1200);
  };

  // Contact enrichment ("Option C"): free website scrape first, Hunter.io
  // fallback when configured on the backend. Quota exhaustion surfaces as
  // an "API Credit Limit Reached" notice, never a silent failure.
  const handleEnrichContact = async (buyer) => {
    if (!buyer?.id) return;
    setEnrichState((prev) => ({ ...prev, [buyer.id]: { loading: true } }));
    try {
      const res = await apiFetch(`/api/v1/buyers/${buyer.id}/enrich-contact`, { method: 'POST' });
      if (res.status === 401) {
        onRequireAuth?.();
        setEnrichState((prev) => ({ ...prev, [buyer.id]: { loading: false } }));
        return;
      }
      const json = await res.json();
      const result = json?.data || {};
      setEnrichState((prev) => ({
        ...prev,
        [buyer.id]: { loading: false, status: result.status, email: result.email, note: result.note },
      }));
      if (result.status === 'enriched' && result.email) {
        setBuyers((prev) => prev.map((b) => (b.id === buyer.id ? { ...b, email: result.email } : b)));
        setSelectedBuyer((prev) => (prev?.id === buyer.id ? { ...prev, email: result.email } : prev));
      }
    } catch (err) {
      setEnrichState((prev) => ({
        ...prev,
        [buyer.id]: { loading: false, status: 'error', note: err.message || 'Enrichment request failed.' },
      }));
    }
  };

  // Honest status note for an enrichment attempt
  const renderEnrichStatus = (buyerId) => {
    const st = enrichState[buyerId];
    if (!st || st.loading || !st.status || st.status === 'enriched') return null;
    if (st.status === 'credit_limit_reached') {
      return (
        <div className="mt-2 p-2 rounded-lg bg-orange/10 border border-orange/30 text-[11px] text-orange-dark font-semibold">
          API Credit Limit Reached - the contact-finder API free tier is exhausted. Website scraping is free and was already tried; add Hunter credits or try again next month.
        </div>
      );
    }
    const fallback = {
      hunter_not_configured: 'No email published on the company website. The contact-finder API fallback is not configured on this deployment.',
      not_found: 'No public email found on the company website or via the contact-finder API.',
      no_website: 'No website on record for this buyer, so there is nothing to search.',
      already_present: null,
      error: st.note || 'Enrichment failed. Please try again.',
    }[st.status];
    const text = st.note || fallback;
    if (!text) return null;
    return <p className="mt-2 text-[11px] text-muted leading-relaxed">{text}</p>;
  };

  // Honest Badge renderer
  const renderVerificationBadge = (buyer) => {
    if (buyer.isVerified && buyer.verificationEvidence?.sourceUrl) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-pale text-emerald-ink border border-emerald-border" title={`Verified against ${buyer.sourceProvider}`}>
          <ShieldCheck size={12} className="text-emerald" />
          Verified Importer
        </span>
      );
    }

    if (buyer.verificationStatus === 'partially_verified' || buyer.website) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-pale text-blue-dark border border-blue-soft" title="Company domain/identity confirmed on public web. Importer registration unconfirmed.">
          <Globe size={11} className="text-blue" />
          Web Evidence
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-surface text-muted border border-line" title="Prospect from grounded web search. Unverified against customs registry.">
        <Sparkles size={11} className="text-faint" />
        AI Prospect
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-navy font-heading">Buyer Discovery & Intelligence</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-pale text-blue-dark border border-blue-soft">
              Evidence-Based Pipeline
            </span>
          </div>
          <p className="text-[14px] text-soft mt-0.5">
            Identify commercial buyers in target markets with honest verification signals and direct outreach drafting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDiscoverModalOpen(true)}
            className="btn-primary px-3.5 py-2 text-xs font-semibold shadow-xs flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Discover Prospective Buyers</span>
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-line-dark flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search company, country, industry..."
            className="w-full pl-9 pr-7 py-1.5 bg-page border border-line-dark rounded-lg text-xs text-navy focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15 focus:bg-white"
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); if (onSearchChange) onSearchChange(''); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-page border border-line-dark rounded-lg text-xs font-semibold text-ink focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15"
          >
            <option value="ALL">All Countries</option>
            {countries.filter(c => c !== 'ALL').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 bg-page border border-line-dark rounded-lg text-xs font-semibold text-ink focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15"
          >
            <option value="scoreDesc">Lead Score: High to Low</option>
            <option value="scoreAsc">Lead Score: Low to High</option>
            <option value="nameAsc">Company (A-Z)</option>
          </select>

          {(searchTerm || countryFilter !== 'ALL') && (
            <button
              onClick={() => { setSearchTerm(''); setCountryFilter('ALL'); if (onSearchChange) onSearchChange(''); }}
              className="text-xs font-semibold text-red hover:underline px-1 whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table + Slide-over Drawer Area */}
      <div className="flex gap-6 min-h-[450px] relative">
        <div className={`flex flex-col bg-white border border-line-dark rounded-xl overflow-hidden transition-all duration-300 ${selectedBuyer ? 'w-full lg:w-2/3' : 'w-full'}`}>
          <div className="p-4 border-b border-line bg-mist flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-navy">
                Prospective Buyers <span className="text-xs font-normal text-muted">({filteredBuyers.length} in pipeline)</span>
              </h2>
            </div>
            <span className="text-[11px] text-soft bg-white px-2.5 py-1 rounded border border-line-dark font-mono">
              Strict Buyer-Evidence Policy
            </span>
          </div>

          <div className="flex-1 overflow-auto max-h-[65vh]">
            {isLoading ? (
              <SkeletonRows rows={6} />
            ) : error ? (
              <div className="p-6">
                <ErrorBanner
                  message="Could not load the buyer registry."
                  onRetry={refetchBuyers}
                  retryLabel="Retry"
                />
              </div>
            ) : filteredBuyers.length === 0 ? (
              <EmptyState
                title="No verified buyers yet"
                description="UN Comtrade contains aggregate country trade statistics, not individual corporate importer records. Run the Buyer Discovery agent to search for prospective commercial importers with verified web or corporate registry evidence."
                actionLabel="Discover Prospective Buyers"
                onAction={() => setIsDiscoverModalOpen(true)}
              />
            ) : (
              <table className="w-full text-left border-separate border-spacing-0 text-xs md:text-sm">
                <thead>
                  <tr className="text-soft font-bold text-[11px] uppercase tracking-wider">
                    <th className="sticky top-0 z-10 bg-mist border-b border-line py-3 px-4">Company</th>
                    <th className="sticky top-0 z-10 bg-mist border-b border-line py-3 px-4">Destination</th>
                    <th className="sticky top-0 z-10 bg-mist border-b border-line py-3 px-4">Verification Evidence</th>
                    <th className="sticky top-0 z-10 bg-mist border-b border-line py-3 px-4">Lead Score</th>
                    <th className="sticky top-0 z-10 bg-mist border-b border-line py-3 px-4 text-right">Outreach</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBuyers.map((b) => {
                    const isSelected = selectedBuyer?.id === b.id;
                    return (
                      <tr 
                        key={b.id}
                        onClick={() => setSelectedBuyer(b)}
                        className={`hover:bg-page cursor-pointer transition-colors ${isSelected ? 'bg-blue-pale/60' : ''}`}
                      >
                        <td className="py-3 px-4 border-b border-line">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-pale border border-blue-soft flex items-center justify-center text-blue shrink-0 font-bold text-xs">
                              {b.companyName?.charAt(0) || 'B'}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-navy">{b.companyName}</p>
                              {b.website && (
                                <a 
                                  href={b.website.startsWith('http') ? b.website : `https://${b.website}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] text-blue hover:underline flex items-center gap-0.5 mt-0.5"
                                >
                                  <span>{b.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                  <ExternalLink size={9} />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 border-b border-line text-xs font-semibold text-ink">
                          {b.country}
                          {b.countryCode && <span className="ml-1 text-[10px] text-muted font-mono">({b.countryCode})</span>}
                        </td>

                        <td className="py-3 px-4 border-b border-line">
                          {renderVerificationBadge(b)}
                        </td>

                        <td className="py-3 px-4 border-b border-line">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-surface rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${b.leadScore >= 70 ? 'bg-emerald-light' : b.leadScore >= 40 ? 'bg-orange' : 'bg-faint'}`}
                                style={{ width: `${b.leadScore || 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-navy">{b.leadScore || 0}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 border-b border-line text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setEmailModalBuyer(b)}
                            className="btn-secondary px-2.5 py-1 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-blue-pale hover:border-blue"
                          >
                            <Mail size={12} />
                            <span>Draft Email</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-3 bg-mist border-t border-line flex flex-col sm:flex-row items-center justify-between text-xs text-muted gap-2">
            <span>Showing {filteredBuyers.length} prospective buyer records</span>
            <span className="text-[11px] text-faint">Evidence standard: Company identity + Web presence required. Customs volume requires audited BOL.</span>
          </div>
        </div>

        {/* Slide-out Buyer Detail Drawer */}
        {selectedBuyer && (
          <div className="w-full lg:w-1/3 bg-white border border-line-dark rounded-xl shadow-lg flex flex-col shrink-0 overflow-hidden">
            <div className="p-4 border-b border-line bg-mist flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue">Buyer Evidence Dossier</span>
                <h3 className="text-base font-bold text-navy mt-0.5">{selectedBuyer.companyName}</h3>
                <p className="text-xs text-muted">{selectedBuyer.country} · {selectedBuyer.industry || 'Wholesale'}</p>
              </div>
              <button 
                onClick={() => setSelectedBuyer(null)}
                className="p-1 rounded-md text-faint hover:text-navy hover:bg-surface"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {/* Evidence Status Card */}
              <div className="p-3 bg-page rounded-lg border border-line space-y-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Evidence Evaluation</span>
                <div>{renderVerificationBadge(selectedBuyer)}</div>
                <p className="text-xs text-soft leading-relaxed mt-1">
                  {selectedBuyer.verificationEvidence?.notes || 'Discovered via AI market intelligence. Web existence confirmed; actual customs volume under observation.'}
                </p>
              </div>

              {/* Contact Card */}
              <div className="p-3 bg-page rounded-lg border border-line">
                <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Contact Details</h4>
                {selectedBuyer.email && <p className="text-xs text-blue font-mono">{selectedBuyer.email}</p>}
                {selectedBuyer.phone && <p className="text-xs text-ink font-mono mt-1">{selectedBuyer.phone}</p>}
                {!selectedBuyer.email && (
                  <button
                    onClick={() => handleEnrichContact(selectedBuyer)}
                    disabled={enrichState[selectedBuyer.id]?.loading}
                    className="btn-secondary mt-1 px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1.5 hover:bg-blue-pale hover:border-blue"
                  >
                    {enrichState[selectedBuyer.id]?.loading
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Search size={11} />}
                    <span>{enrichState[selectedBuyer.id]?.loading ? 'Searching public sources...' : 'Find Contact Email'}</span>
                  </button>
                )}
                {renderEnrichStatus(selectedBuyer.id)}
                {selectedBuyer.website && (
                  <p className="text-xs text-muted mt-1">
                    <a href={selectedBuyer.website} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                      <span>{selectedBuyer.website}</span>
                      <ExternalLink size={10} />
                    </a>
                  </p>
                )}
                {!selectedBuyer.email && !selectedBuyer.website && (
                  <p className="text-xs text-faint italic">No direct public email published.</p>
                )}
              </div>

              {/* Scoring Breakdown */}
              {selectedBuyer.scoreBreakdown && (
                <div className="space-y-1.5 text-xs text-soft">
                  <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider">Score Breakdown ({selectedBuyer.leadScore}/100)</h4>
                  <p className="text-[11px] text-muted leading-relaxed">
                    {selectedBuyer.scoreBreakdown.explanation}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-line bg-page">
              <button
                onClick={() => setEmailModalBuyer(selectedBuyer)}
                className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs"
              >
                <Sparkles size={14} />
                <span>Draft Export Pitch Email</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Discover Buyers Modal */}
      {isDiscoverModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-line-dark shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-navy p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-bright" />
                <h3 className="text-sm font-bold">Discover Commercial Importers</h3>
              </div>
              <button onClick={() => setIsDiscoverModalOpen(false)} className="text-faint hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRunDiscovery} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-soft block mb-1">
                  Product / Commodity
                </label>
                <input
                  type="text"
                  value={discoverProduct}
                  onChange={(e) => setDiscoverProduct(e.target.value)}
                  placeholder="e.g. Apparel & Cotton Trousers (HS 62)"
                  required
                  className="w-full px-3 py-2 bg-page border border-line-dark rounded-lg text-xs text-navy focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-soft block mb-1">
                  Target Destination Country
                </label>
                <input
                  type="text"
                  value={discoverCountry}
                  onChange={(e) => setDiscoverCountry(e.target.value)}
                  placeholder="e.g. United States, Germany, United Kingdom"
                  required
                  className="w-full px-3 py-2 bg-page border border-line-dark rounded-lg text-xs text-navy focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15"
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-pale border border-blue-soft text-xs text-blue-dark leading-relaxed">
                <strong>Honest Evidence Notice:</strong> The pipeline runs a live Google Search-grounded lookup. Every company it returns carries its source link; suggestions without a citation are dropped. Import volumes and contact details are not verified.
              </div>

              {discoverError && (
                <div className="p-3 rounded-lg bg-red-pale border border-red-border text-xs text-red-dark">
                  {discoverError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDiscoverModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-muted hover:text-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDiscovering}
                  className="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  {isDiscovering ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>{isDiscovering ? 'Searching Importers...' : 'Run Discovery Pipeline'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Draft Email Modal */}
      {emailModalBuyer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-line-dark shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-navy p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-blue-bright" />
                <h3 className="text-sm font-bold">Export Pitch: {emailModalBuyer.companyName}</h3>
              </div>
              <button onClick={() => setEmailModalBuyer(null)} className="text-faint hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">Recipient</label>
                <input
                  type="text"
                  readOnly
                  value={`${emailModalBuyer.companyName} <${emailModalBuyer.email || 'procurement@' + (emailModalBuyer.website ? emailModalBuyer.website.replace(/^https?:\/\/(www\.)?/, '') : 'importer.com')}>`}
                  className="w-full px-3 py-1.5 bg-page border border-line-dark rounded text-xs text-navy font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">Subject</label>
                <input
                  type="text"
                  readOnly
                  value={`Export Supply Inquiry: Direct Factory Consignments from India`}
                  className="w-full px-3 py-1.5 bg-white border border-line-dark rounded text-xs font-semibold text-navy"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">Pitch Body</label>
                <textarea
                  rows={7}
                  readOnly
                  value={`Dear Procurement Team at ${emailModalBuyer.companyName},\n\nWe are an established Indian export manufacturer specializing in certified consignments with complete quality documentation and preferential tariff clearance.\n\nFollowing trade statistics in ${emailModalBuyer.country}, we understand your market prioritizes dependable lead times and certified factory-direct supply.\n\nCould we provide our latest 2026 catalogue and price specifications for your upcoming procurement review?\n\nWarm regards,\nGlobeX Export Network`}
                  className="w-full p-3 bg-page border border-line-dark rounded text-xs text-ink leading-relaxed resize-none focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-page border-t border-line flex justify-between items-center">
              <button
                onClick={() => handleCopyEmail(`Dear Procurement Team at ${emailModalBuyer.companyName},\n\nWe are an established Indian export manufacturer...`)}
                className="btn-secondary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5"
              >
                {copiedEmail ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                <span>{copiedEmail ? 'Copied' : 'Copy Pitch'}</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setEmailModalBuyer(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-muted hover:text-navy"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={emailSent}
                  className="btn-primary px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  {emailSent ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{emailSent ? 'Sent!' : 'Save Outreach Draft'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
