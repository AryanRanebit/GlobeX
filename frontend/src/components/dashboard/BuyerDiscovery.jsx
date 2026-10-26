import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';

export default function BuyerDiscovery({ searchQuery = '', onSearchChange }) {
  const [selectedLead, setSelectedLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState(searchQuery);

  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  const leads = [
    {
      id: 1,
      company: 'Atlas Imports Inc.',
      country: 'United States',
      volume: '88 Tons/mo',
      trustScore: 94,
      status: 'Ready',
      contact: 'Sarah Jenkins',
      email: 's.jenkins@atlasimports.com',
      history: '34 shipments in last 12 months. Primary import: Cotton Textiles (HS 6204.62).',
      tags: ['High Volume', 'Verified', 'Textiles']
    },
    {
      id: 2,
      company: 'Textil GmbH',
      country: 'Germany',
      volume: '45 Tons/mo',
      trustScore: 89,
      status: 'Pending',
      contact: 'Klaus Weber',
      email: 'k.weber@textilgmbh.de',
      history: '18 shipments in last 6 months. High demand for organic certification & HS 6204 garments.',
      tags: ['EU Market', 'Organic Focus', 'Apparel']
    },
    {
      id: 3,
      company: 'Nordic Retailers',
      country: 'Norway',
      volume: '22 Tons/mo',
      trustScore: 87,
      status: 'Ready',
      contact: 'Lars Olafson',
      email: 'sourcing@nordicretailers.no',
      history: '9 shipments this year. Consistent buyer of premium woven goods & rice.',
      tags: ['Stable Buyer', 'Food & Agriculture']
    },
    {
      id: 4,
      company: 'Pacific Trade Co.',
      country: 'Australia',
      volume: '15 Tons/mo',
      trustScore: 72,
      status: 'Review',
      contact: 'Emma Wong',
      email: 'ewong@pacifictrade.com.au',
      history: 'New buyer. Active sourcing inquiries for Indian Basmati rice & textiles.',
      tags: ['New Entry', 'Needs Vetting', 'Rice']
    },
    {
      id: 5,
      company: 'Emirates Global Foods & Trading',
      country: 'United Arab Emirates',
      volume: '120 Tons/mo',
      trustScore: 96,
      status: 'Ready',
      contact: 'Tariq Al-Mansoor',
      email: 'tariq@emiratesglobal.ae',
      history: '52 shipments in 2025. Major importer of Basmati Rice (HS 1006.30) & spices.',
      tags: ['GCC Hub', 'Verified Importer', 'Rice']
    },
    {
      id: 6,
      company: 'Aura Luxury Gems LLC',
      country: 'United States',
      volume: '$4.2M/yr',
      trustScore: 93,
      status: 'Ready',
      contact: 'David Miller',
      email: 'dmiller@auragems.com',
      history: 'Direct importer of studded gold jewellery (HS 7113.19) and polished gems.',
      tags: ['Gems & Jewellery', 'High Trust']
    }
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearchChange) {
      onSearchChange(searchTerm);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  // Filter leads according to active search query
  const filteredLeads = leads.filter(lead => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      lead.company.toLowerCase().includes(term) ||
      lead.country.toLowerCase().includes(term) ||
      lead.contact.toLowerCase().includes(term) ||
      lead.history.toLowerCase().includes(term) ||
      lead.tags.some(tag => tag.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex flex-col gap-4 animate-fade-in h-[calc(100vh-120px)]">
      {/* Active Search Banner */}
      {(searchQuery || searchTerm) && (
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-4 py-2.5 flex items-center justify-between text-xs shrink-0 shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#2563EB]" />
            <span className="font-semibold text-[#1D4ED8]">Filtered Buyer Pipeline:</span>
            <span className="font-bold text-[#0F172A]">"{searchQuery || searchTerm}"</span>
            <span className="text-[#64748B]">({filteredLeads.length} matches found)</span>
          </div>
          <button
            onClick={handleClear}
            className="text-xs font-semibold text-[#64748B] hover:text-[#EF4444] px-2 py-0.5 rounded bg-white border border-[#E2E8F0] transition-colors"
          >
            Clear Filter
          </button>
        </div>
      )}

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Main Table Area */}
        <div className={`flex flex-col bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${selectedLead ? 'w-2/3' : 'w-full'}`}>
          
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white">
            <h2 className="text-lg font-bold text-[#0F172A]">Discovered Buyers</h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter buyers or HS codes..." 
                  className="w-full pl-9 pr-7 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#334155]"
                  >
                    <X size={13} />
                  </button>
                )}
              </form>
              <button 
                type="button"
                className="p-2 border border-[#E2E8F0] rounded-md text-[#64748B] hover:bg-[#F8FAFC]"
                title="Filter options"
              >
                <Filter size={16} />
              </button>
              <button 
                type="button"
                className="btn-primary px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                Run AI Discovery
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F8FAFC] sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Company</th>
                  <th className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Location</th>
                  <th className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Volume</th>
                  <th className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Trust Score</th>
                  <th className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-[#64748B]">
                      <p className="text-sm font-semibold">No buyers match "{searchTerm}"</p>
                      <p className="text-xs text-[#94A3B8] mt-1">Try searching for "Textiles", "Rice", "Jewellery", or clear the filter.</p>
                      <button 
                        onClick={handleClear}
                        className="mt-3 btn-secondary px-3 py-1.5 text-xs inline-block"
                      >
                        Reset Search
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      onClick={() => setSelectedLead(lead)}
                      className={`border-b border-[#E2E8F0] hover:bg-[#F1F5F9] cursor-pointer transition-colors ${selectedLead?.id === lead.id ? 'bg-[#EFF6FF]' : ''}`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[#475569]">
                            <Building2 size={14} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#0F172A]">{lead.company}</p>
                            <p className="text-xs text-[#64748B]">{lead.contact}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#475569]">{lead.country}</td>
                      <td className="px-5 py-4 text-sm font-medium text-[#334155]">{lead.volume}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${lead.trustScore > 85 ? 'bg-[#10B981]' : lead.trustScore > 70 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`}
                              style={{ width: `${lead.trustScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-[#334155]">{lead.trustScore}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button className="text-[#94A3B8] hover:text-[#0F172A]" title="Options">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Sidebar Panel */}
        {selectedLead && (
          <div className="w-1/3 bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex flex-col overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-start bg-[#F8FAFC]">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">{selectedLead.company}</h3>
                <p className="text-sm text-[#64748B]">{selectedLead.country}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-6">
              
              <div>
                <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Lead Intelligence</h4>
                <p className="text-sm text-[#334155] leading-relaxed">{selectedLead.history}</p>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedLead.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-[#F1F5F9] text-[#475569] text-xs font-medium rounded-md border border-[#E2E8F0]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">AI Analysis</h4>
                
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle2 size={16} className="text-[#10B981] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">High Payment Reliability</p>
                    <p className="text-xs text-[#64748B]">No defaulted payments found in registry.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle2 size={16} className="text-[#10B981] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">Consistent Volume</p>
                    <p className="text-xs text-[#64748B]">Imports every 4 weeks like clockwork.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <AlertCircle size={16} className="text-[#F59E0B] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">Competitor Alert</p>
                    <p className="text-xs text-[#64748B]">Currently sourcing from Vietnam.</p>
                  </div>
                </div>
              </div>

            </div>

            <div className="p-5 border-t border-[#E2E8F0] bg-[#F8FAFC]">
              <button className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 mb-2">
                <span className="text-base">✨</span>
                Generate Outreach Email
              </button>
              <button className="w-full py-2.5 flex items-center justify-center gap-2 bg-white border border-[#E2E8F0] rounded-md text-sm font-medium text-[#334155] hover:bg-[#F1F5F9]">
                <FileText size={16} />
                View Customs Profile
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
