import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  CheckCircle2, 
  Building2, 
  FileText, 
  AlertCircle,
  X,
  Sparkles,
  ArrowUpDown,
  Send,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Inbox
} from 'lucide-react';

const INITIAL_LEADS = [
  {
    id: 1,
    company: 'Atlas Imports Inc.',
    country: 'United States',
    volume: '88 Tons/mo',
    trustScore: 94,
    status: 'Replied',
    contact: 'Sarah Jenkins',
    title: 'VP of Global Sourcing',
    email: 's.jenkins@atlasimports.com',
    phone: '+1 (212) 555-0198',
    history: '34 shipments in last 12 months. Primary import: Cotton Textiles (HS 6204.62). Direct buyer for US retail chains.',
    tags: ['High Volume', 'Verified Importer', 'Textiles']
  },
  {
    id: 2,
    company: 'Textil GmbH',
    country: 'Germany',
    volume: '45 Tons/mo',
    trustScore: 89,
    status: 'Contacted',
    contact: 'Klaus Weber',
    title: 'Senior Procurement Director',
    email: 'k.weber@textilgmbh.de',
    phone: '+49 30 901820',
    history: '18 shipments in last 6 months. High demand for GOTS organic certification and sustainable cotton apparel.',
    tags: ['EU Market', 'Organic Focus', 'Apparel']
  },
  {
    id: 3,
    company: 'Emirates Global Foods & Trading',
    country: 'United Arab Emirates',
    volume: '120 Tons/mo',
    trustScore: 96,
    status: 'New',
    contact: 'Tariq Al-Mansoor',
    title: 'Managing Director',
    email: 'tariq@emiratesglobal.ae',
    phone: '+971 4 321 4455',
    history: '52 shipments in 2025. Major importer of Basmati Rice (HS 1006.30) & agricultural commodities under India-UAE CEPA.',
    tags: ['GCC Hub', 'Verified Importer', 'Rice']
  },
  {
    id: 4,
    company: 'Nordic Retailers',
    country: 'Norway',
    volume: '22 Tons/mo',
    trustScore: 87,
    status: 'Contacted',
    contact: 'Lars Olafson',
    title: 'Head of Purchasing',
    email: 'sourcing@nordicretailers.no',
    phone: '+47 22 86 00 00',
    history: '9 shipments this year. Consistent buyer of woven fabrics and premium agro products with low order variance.',
    tags: ['Stable Buyer', 'Food & Agriculture']
  },
  {
    id: 5,
    company: 'Aura Luxury Gems LLC',
    country: 'United States',
    volume: '$4.2M/yr',
    trustScore: 93,
    status: 'Replied',
    contact: 'David Miller',
    title: 'Chief Merchandising Officer',
    email: 'dmiller@auragems.com',
    phone: '+1 (312) 555-8821',
    history: 'Direct importer of studded gold jewellery (HS 7113.19) and polished lab-grown diamond accessories.',
    tags: ['Gems & Jewellery', 'High Trust']
  },
  {
    id: 6,
    company: 'Pacific Trade Co.',
    country: 'Australia',
    volume: '15 Tons/mo',
    trustScore: 74,
    status: 'New',
    contact: 'Emma Wong',
    title: 'Category Manager',
    email: 'ewong@pacifictrade.com.au',
    phone: '+61 2 9200 1100',
    history: 'Active sourcing inquiries for Indian Basmati rice & textiles under ECTA bilateral treaty.',
    tags: ['New Entry', 'Needs Vetting', 'Rice']
  }
];

export default function BuyerDiscovery({ searchQuery = '', onSearchChange }) {
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'New' | 'Contacted' | 'Replied'
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('trustDesc'); // 'trustDesc' | 'trustAsc' | 'nameAsc'
  const [selectedLead, setSelectedLead] = useState(null);
  const [emailModalLead, setEmailModalLead] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  // Unique list of countries for filter dropdown
  const countries = useMemo(() => {
    const list = Array.from(new Set(leads.map(l => l.country)));
    return ['ALL', ...list];
  }, [leads]);

  // Filtered and sorted leads
  const filteredLeads = useMemo(() => {
    return leads
      .filter(lead => {
        // Status filter
        if (statusFilter !== 'ALL' && lead.status !== statusFilter) return false;
        // Country filter
        if (countryFilter !== 'ALL' && lead.country !== countryFilter) return false;
        // Search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matches = (
            lead.company.toLowerCase().includes(term) ||
            lead.country.toLowerCase().includes(term) ||
            lead.contact.toLowerCase().includes(term) ||
            lead.history.toLowerCase().includes(term) ||
            lead.tags.some(tag => tag.toLowerCase().includes(term))
          );
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'trustDesc') return b.trustScore - a.trustScore;
        if (sortBy === 'trustAsc') return a.trustScore - b.trustScore;
        if (sortBy === 'nameAsc') return a.company.localeCompare(b.company);
        return 0;
      });
  }, [leads, searchTerm, statusFilter, countryFilter, sortBy]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setCountryFilter('ALL');
    setSortBy('trustDesc');
    if (onSearchChange) onSearchChange('');
  };

  const handleCopyEmail = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleSendEmail = () => {
    setEmailSent(true);
    setTimeout(() => {
      if (emailModalLead) {
        // Update status of this lead to 'Contacted'
        setLeads(prev => prev.map(l => l.id === emailModalLead.id ? { ...l, status: 'Contacted' } : l));
        if (selectedLead && selectedLead.id === emailModalLead.id) {
          setSelectedLead(prev => ({ ...prev, status: 'Contacted' }));
        }
      }
      setEmailModalLead(null);
      setEmailSent(false);
    }, 1200);
  };

  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      
      {/* Header with exactly One H1 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] font-heading">Buyer Discovery & CRM</h1>
          <p className="text-[15px] text-[#475569] mt-0.5">
            Verified importers with historical customs import records, reliability scores, and direct email pitching.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={simulateLoading}
            className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] flex items-center gap-1.5 shadow-2xs"
            title="Simulate data sync"
          >
            <Loader2 size={13} className={isLoading ? 'animate-spin text-[#2563EB]' : ''} />
            <span>Sync Registry</span>
          </button>
          <button className="btn-primary px-3.5 py-1.5 text-xs font-semibold shadow-sm">
            + Add New Lead
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search company, country, contact, product..."
            className="w-full pl-9 pr-7 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:bg-white"
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); if (onSearchChange) onSearchChange(''); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#334155]"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mr-1 shrink-0">Status:</span>
          {['ALL', 'New', 'Contacted', 'Replied'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all shrink-0 ${
                statusFilter === st
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Country & Sort Controls */}
        <div className="flex items-center gap-2">
          {/* Country Selector */}
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#334155] focus:outline-none focus:border-[#2563EB]"
          >
            <option value="ALL">All Countries</option>
            {countries.filter(c => c !== 'ALL').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#334155] focus:outline-none focus:border-[#2563EB]"
          >
            <option value="trustDesc">Trust: High to Low</option>
            <option value="trustAsc">Trust: Low to High</option>
            <option value="nameAsc">Company (A-Z)</option>
          </select>

          {(searchTerm || statusFilter !== 'ALL' || countryFilter !== 'ALL') && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-[#EF4444] hover:underline px-1 whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table + Slide-over Drawer Area */}
      <div className="flex gap-6 min-h-[500px] relative">
        
        {/* Table Container - Fills Height to prevent dead space */}
        <div className={`flex flex-col bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${selectedLead ? 'w-full lg:w-2/3' : 'w-full'}`}>
          
          <div className="p-4 border-b border-[#E2E8F0] bg-white flex justify-between items-center">
            <h2 className="text-sm font-bold text-[#0F172A]">
              Verified Buyer Accounts <span className="text-xs font-normal text-[#64748B]">({filteredLeads.length} available)</span>
            </h2>
            <span className="text-[11px] text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded font-semibold border border-[#A7F3D0]">
              Verified Importers Only
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center text-[#64748B] flex flex-col items-center justify-center">
                <Loader2 size={24} className="animate-spin text-[#2563EB] mb-2" />
                <p className="text-xs font-semibold">Updating buyer customs pipeline...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              /* Empty State */
              <div className="p-14 text-center text-[#64748B] flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#94A3B8] mb-3">
                  <Inbox size={22} />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A] mb-1">No Matching Buyers Found</h3>
                <p className="text-xs text-[#64748B] max-w-sm mb-4">
                  No verified importers match your current filter settings. Try adjusting your search query or reset your filters.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="btn-secondary px-3.5 py-1.5 text-xs font-semibold"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F8FAFC] sticky top-0 z-10 border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider">Company</th>
                    <th className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider">Destination</th>
                    <th className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider">Est. Volume</th>
                    <th className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider">Trust Score</th>
                    <th className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredLeads.map((lead) => {
                    const isSelected = selectedLead?.id === lead.id;
                    return (
                      <tr 
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className={`hover:bg-[#F8FAFC] cursor-pointer transition-colors ${isSelected ? 'bg-[#EFF6FF]' : ''}`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#2563EB] shrink-0 font-bold text-xs">
                              {lead.company.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#0F172A]">{lead.company}</p>
                              <p className="text-xs text-[#64748B]">{lead.contact} · {lead.title}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-xs font-semibold text-[#334155]">
                          {lead.country}
                        </td>

                        <td className="px-5 py-3.5 text-xs font-semibold text-[#0F172A]">
                          {lead.volume}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${lead.trustScore >= 90 ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`}
                                style={{ width: `${lead.trustScore}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-[#0F172A]">{lead.trustScore}</span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            lead.status === 'Replied'
                              ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                              : lead.status === 'Contacted'
                              ? 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                              : 'bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]'
                          }`}>
                            {lead.status}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setEmailModalLead(lead)}
                            className="btn-secondary px-2.5 py-1 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#EFF6FF] hover:border-[#2563EB]"
                            title="Generate personalized pitch email"
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

          {/* Table Footer - Fills Bottom Space Cleanly */}
          <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B] gap-2">
            <span>Showing {filteredLeads.length} of {leads.length} verified buyers</span>
            <span>Data audited from live customs manifests & DGFT records</span>
          </div>
        </div>

        {/* Slide-out Buyer Detail Drawer */}
        {selectedLead && (
          <div className="w-full lg:w-1/3 bg-white border border-[#E2E8F0] rounded-xl shadow-lg flex flex-col animate-fade-in shrink-0 overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">Buyer Dossier</span>
                <h3 className="text-base font-bold text-[#0F172A] mt-0.5">{selectedLead.company}</h3>
                <p className="text-xs text-[#64748B]">{selectedLead.country}</p>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="p-1 rounded-md text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#E2E8F0]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              
              {/* Primary Contact Card */}
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Direct Contact</h4>
                <p className="text-xs font-bold text-[#0F172A]">{selectedLead.contact}</p>
                <p className="text-[11px] text-[#64748B]">{selectedLead.title}</p>
                <div className="mt-2 pt-2 border-t border-[#E2E8F0] flex flex-col gap-1 text-[11px]">
                  <span className="text-[#2563EB] font-mono">{selectedLead.email}</span>
                  <span className="text-[#64748B]">{selectedLead.phone}</span>
                </div>
              </div>

              {/* Status and Verification Badge */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#E2E8F0]">
                <div>
                  <span className="text-[10px] text-[#64748B] block">Current Pipeline Stage</span>
                  <span className="text-xs font-bold text-[#0F172A]">{selectedLead.status}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#64748B] block">Reliability Score</span>
                  <span className="text-xs font-bold text-[#059669]">{selectedLead.trustScore} / 100</span>
                </div>
              </div>

              {/* Import History Narrative */}
              <div>
                <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Trade Manifest Analysis</h4>
                <p className="text-xs text-[#334155] leading-relaxed bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                  {selectedLead.history}
                </p>
              </div>

              {/* Category Tags */}
              <div>
                <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Buyer Classification</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLead.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col gap-2">
              <button
                onClick={() => setEmailModalLead(selectedLead)}
                className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
              >
                <Sparkles size={14} />
                <span>Draft Email to {selectedLead.contact.split(' ')[0]}</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Draft Email Modal */}
      {emailModalLead && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="bg-[#0F172A] p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-[#38BDF8]" />
                <h3 className="text-sm font-bold">AI Pitch Generator: {emailModalLead.company}</h3>
              </div>
              <button onClick={() => setEmailModalLead(null)} className="text-[#94A3B8] hover:text-white">
                <X size={16} />
              </button>
            </div>

            {/* Email Composer Fields */}
            <div className="p-5 space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">To</label>
                <input
                  type="text"
                  readOnly
                  value={`${emailModalLead.contact} <${emailModalLead.email}>`}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-xs text-[#0F172A] font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">Subject</label>
                <input
                  type="text"
                  readOnly
                  value={`Export Supply Inquiry: Certified Shipments for ${emailModalLead.company}`}
                  className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded text-xs font-semibold text-[#0F172A]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">Generated Pitch Body</label>
                <textarea
                  rows={7}
                  readOnly
                  value={`Dear ${emailModalLead.contact},\n\nI noticed ${emailModalLead.company}'s strong import presence in ${emailModalLead.country} for high-grade international consignments.\n\nWe are a verified Indian export manufacturer equipped with full GOTS and ISO certifications, offering competitive container-load pricing and end-to-end customs clearance with zero-duty preferential documentation.\n\nCould we send our latest 2026 product catalogue and sample specifications for your upcoming sourcing cycle?\n\nWarm regards,\nAryan Rane\nGlobeX Export Network`}
                  className="w-full p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-xs text-[#334155] leading-relaxed resize-none focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-between items-center">
              <button
                onClick={() => handleCopyEmail(`Dear ${emailModalLead.contact},\n\nI noticed ${emailModalLead.company}'s strong import presence in ${emailModalLead.country}...\n\nWarm regards,\nAryan Rane`)}
                className="btn-secondary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5"
              >
                {copiedEmail ? <Check size={14} className="text-[#059669]" /> : <Copy size={14} />}
                <span>{copiedEmail ? 'Copied Pitch' : 'Copy Pitch'}</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setEmailModalLead(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={emailSent}
                  className="btn-primary px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  {emailSent ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{emailSent ? 'Sending...' : 'Send Pitch Now'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
