import React, { useState, useEffect } from 'react';
import { Globe2, TrendingUp, AlertTriangle, FileCheck, CheckCircle2, Search, X, Sparkles, Filter } from 'lucide-react';

const ALL_RECOMMENDATIONS = {
  default: [
    { country: 'Germany', match: 96, tariff: '0% (FTA)', risk: 'Low', reason: 'High demand for sustainable & compliant imports.' },
    { country: 'United States', match: 88, tariff: '14.5%', risk: 'Medium', reason: 'Largest volume consumer market with established import channels.' },
    { country: 'United Arab Emirates', match: 91, tariff: '0% (CEPA)', risk: 'Low', reason: 'Zero-duty access under India-UAE CEPA pact.' },
    { country: 'Japan', match: 82, tariff: '3.2%', risk: 'Low', reason: 'Consistent growth in premium quality segments.' },
  ],
  rice: [
    { country: 'Saudi Arabia', match: 98, tariff: '0%', risk: 'Low', reason: 'Primary importer of premium Indian 1121 & Basmati rice varieties.' },
    { country: 'Iran', match: 92, tariff: '4.0%', risk: 'Medium', reason: 'High structural demand; bilateral rupee trade settlement.' },
    { country: 'United Arab Emirates', match: 89, tariff: '0%', risk: 'Low', reason: 'Major regional re-export hub for GCC & East Africa.' },
    { country: 'United Kingdom', match: 85, tariff: '0% (GSP)', risk: 'Low', reason: 'Strong retail supermarket and ethnic grocery demand.' },
  ],
  jewellery: [
    { country: 'United States', match: 97, tariff: '5.5%', risk: 'Low', reason: 'Leading destination for studded diamond & precious jewellery.' },
    { country: 'United Arab Emirates', match: 95, tariff: '0% (CEPA)', risk: 'Low', reason: 'CEPA zero-duty quota for plain and studded gold exports.' },
    { country: 'Hong Kong', match: 89, tariff: '0%', risk: 'Low', reason: 'Global trading hub for loose polished stones and fine jewelry.' },
    { country: 'Singapore', match: 84, tariff: '0%', risk: 'Low', reason: 'Southeast Asian high net worth retail demand.' },
  ],
  pharma: [
    { country: 'United States', match: 95, tariff: '0%', risk: 'Medium', reason: 'FDA-compliant generic formulations represent $8B+ annual intake.' },
    { country: 'South Africa', match: 91, tariff: '0%', risk: 'Low', reason: 'High public health procurement dependency on Indian APIs.' },
    { country: 'Brazil', match: 87, tariff: '6.0%', risk: 'Low', reason: 'Growing ANVISA approvals for biosimilars and solid dosages.' },
    { country: 'Germany', match: 84, tariff: '0%', risk: 'Low', reason: 'EU GMP compliant oncology and specialized injectables demand.' },
  ],
};

export default function MarketIntelligence({ searchQuery = '', onSearchChange }) {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearchChange) {
      onSearchChange(localQuery);
    }
  };

  const handleClear = () => {
    setLocalQuery('');
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  // Determine appropriate recommendation set
  const lowerQuery = (localQuery || searchQuery || '').toLowerCase();
  let activeData = ALL_RECOMMENDATIONS.default;
  let detectedCategory = 'Textiles & Apparel (HS 6204.62)';

  if (lowerQuery.includes('rice') || lowerQuery.includes('1006') || lowerQuery.includes('grain')) {
    activeData = ALL_RECOMMENDATIONS.rice;
    detectedCategory = 'Basmati & Cereals (HS 1006.30)';
  } else if (lowerQuery.includes('gold') || lowerQuery.includes('jewel') || lowerQuery.includes('7113') || lowerQuery.includes('diamond')) {
    activeData = ALL_RECOMMENDATIONS.jewellery;
    detectedCategory = 'Gems & Jewellery (HS 7113.19)';
  } else if (lowerQuery.includes('pharma') || lowerQuery.includes('3004') || lowerQuery.includes('medic') || lowerQuery.includes('drug')) {
    activeData = ALL_RECOMMENDATIONS.pharma;
    detectedCategory = 'Medicaments & APIs (HS 3004.90)';
  } else if (localQuery.trim()) {
    detectedCategory = `Custom Search: "${localQuery.trim()}"`;
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Market Intelligence</h1>
          <p className="text-sm text-[#64748B] mt-1">Discover optimal export destinations, real-time demand, and compliance requirements.</p>
        </div>

        {/* HS Code Search Bar in Dashboard */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Search HS Code or product..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-sm"
            />
            {localQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#334155]"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button type="submit" className="btn-primary px-4 py-2 text-sm font-semibold shrink-0">
            Analyze
          </button>
        </form>
      </div>

      {/* Query Banner if Query Active */}
      {(searchQuery || localQuery) && (
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1D4ED8] uppercase tracking-wider">Active Search Intelligence</p>
              <p className="text-sm font-bold text-[#0F172A]">
                Showing target markets for: <span className="text-[#2563EB] font-mono">{searchQuery || localQuery}</span>
                <span className="ml-2 text-xs font-normal text-[#64748B]">({detectedCategory})</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="text-xs font-semibold text-[#64748B] hover:text-[#EF4444] px-2.5 py-1 rounded bg-white border border-[#E2E8F0] shadow-2xs transition-colors self-end sm:self-center"
          >
            Clear Filter
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Recommendations */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center">
            <div>
              <h3 className="font-bold text-[#0F172A]">AI Market Recommendations</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Target countries mapped for {detectedCategory}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#059669] text-xs font-semibold border border-[#A7F3D0]">
              Live 2026 Customs Data
            </span>
          </div>
          
          <div className="p-0 flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Target Market</th>
                  <th className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">AI Match Score</th>
                  <th className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Import Tariff</th>
                  <th className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Primary Driver</th>
                </tr>
              </thead>
              <tbody>
                {activeData.map((rec, i) => (
                  <tr key={i} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-4 text-sm font-bold text-[#0F172A]">{rec.country}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div className="h-full bg-[#10B981] rounded-full" style={{ width: `${rec.match}%` }} />
                        </div>
                        <span className="text-xs font-bold text-[#10B981]">{rec.match}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#334155] font-medium">{rec.tariff}</td>
                    <td className="px-5 py-4 text-sm text-[#64748B]">{rec.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compliance Snapshot */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col">
          <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center bg-[#FDF4FF]">
            <div>
              <h3 className="font-bold text-[#0F172A]">Destination Compliance</h3>
              <p className="text-xs text-[#64748B] mt-0.5">Mandatory certifications</p>
            </div>
            <FileCheck size={18} className="text-[#C026D3]" />
          </div>
          
          <div className="p-5 flex-1 flex flex-col gap-4 bg-white">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} className="text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Certificate of Origin (CoO)</p>
                <p className="text-xs text-[#64748B]">Issued under Indian preferential trade agreements (FTA/CEPA).</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Destination Port Inspection</p>
                <p className="text-xs text-[#64748B]">Standard technical compliance & packaging declaration required.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} className="text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Commercial Invoice & Packing List</p>
                <p className="text-xs text-[#64748B]">Must declare 6-digit or 8-digit HS code explicitly.</p>
              </div>
            </div>
            
            <button className="mt-4 w-full py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] text-sm font-semibold rounded-md transition-colors">
              Download Full Checklist
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
