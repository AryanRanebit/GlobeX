import React, { useState, useEffect, useCallback } from 'react';
import { useFadeIn } from '../../lib/useFadeIn';
import { useAuth } from '../../context/AuthContext';
import { getOpportunities } from '../../lib/api';
import {
  ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Globe, Users,
  BarChart2, Loader2, AlertCircle, RefreshCw, Database, Sparkles, PlusCircle
} from 'lucide-react';

const COUNTRY_FLAGS = {
  US: '🇺🇸', USA: '🇺🇸', 'UNITED STATES': '🇺🇸',
  AE: '🇦🇪', UAE: '🇦🇪', 'UNITED ARAB EMIRATES': '🇦🇪',
  GB: '🇬🇧', UK: '🇬🇧', 'UNITED KINGDOM': '🇬🇧',
  DE: '🇩🇪', GERMANY: '🇩🇪',
  SA: '🇸🇦', 'SAUDI ARABIA': '🇸🇦',
  NL: '🇳🇱', NETHERLANDS: '🇳🇱',
  JP: '🇯🇵', JAPAN: '🇯🇵',
  AU: '🇦🇺', AUSTRALIA: '🇦🇺',
  CA: '🇨🇦', CANADA: '🇨🇦',
  FR: '🇫🇷', FRANCE: '🇫🇷',
  IT: '🇮🇹', ITALY: '🇮🇹',
  SG: '🇸🇬', SINGAPORE: '🇸🇬',
  IN: '🇮🇳', INDIA: '🇮🇳',
};

function getFlag(country, countryCode) {
  if (countryCode && COUNTRY_FLAGS[countryCode.toUpperCase()]) return COUNTRY_FLAGS[countryCode.toUpperCase()];
  if (country && COUNTRY_FLAGS[country.toUpperCase()]) return COUNTRY_FLAGS[country.toUpperCase()];
  return '🌍';
}

const sampleCountryData = [
  { rank: 1, country: 'United States', flag: '🇺🇸', importValue: '$2.4B', growth: '+12.3%', demandScore: 92, competition: 'Medium', buyers: '2,340', trend: 'up' },
  { rank: 2, country: 'United Arab Emirates', flag: '🇦🇪', importValue: '$1.8B', growth: '+8.7%', demandScore: 87, competition: 'Low', buyers: '1,890', trend: 'up' },
  { rank: 3, country: 'United Kingdom', flag: '🇬🇧', importValue: '$1.2B', growth: '+5.1%', demandScore: 81, competition: 'High', buyers: '1,450', trend: 'up' },
  { rank: 4, country: 'Germany', flag: '🇩🇪', importValue: '$980M', growth: '+3.8%', demandScore: 78, competition: 'High', buyers: '1,120', trend: 'up' },
  { rank: 5, country: 'Saudi Arabia', flag: '🇸🇦', importValue: '$760M', growth: '+15.2%', demandScore: 76, competition: 'Low', buyers: '890', trend: 'up' },
  { rank: 6, country: 'Netherlands', flag: '🇳🇱', importValue: '$540M', growth: '-1.2%', demandScore: 71, competition: 'Medium', buyers: '670', trend: 'down' },
  { rank: 7, country: 'Japan', flag: '🇯🇵', importValue: '$480M', growth: '+2.1%', demandScore: 68, competition: 'High', buyers: '580', trend: 'flat' },
  { rank: 8, country: 'Australia', flag: '🇦🇺', importValue: '$420M', growth: '+9.4%', demandScore: 65, competition: 'Low', buyers: '520', trend: 'up' },
];

function TrendIcon({ trend }) {
  if (trend === 'up' || trend === 'Growing') return <ArrowUpRight size={12} className="text-[#059669]" />;
  if (trend === 'down' || trend === 'Declining') return <ArrowDownRight size={12} className="text-[#EF4444]" />;
  return <Minus size={12} className="text-[#94A3B8]" />;
}

function CompBadge({ level }) {
  const colors = {
    Low: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
    Medium: 'bg-[#FEF9C3] text-[#92400E] border-[#FDE68A]',
    High: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
  };
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border ${colors[level] || colors.Medium}`}>
      {level}
    </span>
  );
}

function ScoreBar({ score }) {
  const color = score >= 80 ? '#059669' : score >= 60 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, score))}%`, background: color }} />
      </div>
      <span className="text-[11px] font-semibold text-[#334155]">{score}</span>
    </div>
  );
}

export default function DashboardPreview({ onNavigate, onOpenAuth }) {
  const fade = useFadeIn();
  const { user } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const [savedOpportunities, setSavedOpportunities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const fetchSavedData = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setFetchError(null);
      const data = await getOpportunities();
      setSavedOpportunities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load saved opportunities:', err);
      setFetchError(err.message || 'Unable to connect to database.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSavedData();
    } else {
      setSavedOpportunities([]);
      setFetchError(null);
    }
  }, [user, fetchSavedData]);

  // Determine whether to use real saved records or sample preview
  const isUsingRealData = !!(user && savedOpportunities.length > 0);
  
  // Format rows
  const activeRows = isUsingRealData
    ? savedOpportunities.map((opp, idx) => ({
        id: opp.id,
        rank: idx + 1,
        country: opp.country,
        countryCode: opp.countryCode,
        flag: getFlag(opp.country, opp.countryCode),
        productName: opp.product?.name || 'Analyzed Product',
        candidateHsCode: opp.product?.hsCode || 'Candidate',
        importValue: opp.marketSize || 'Qualitative Est.',
        growth: opp.growthRate || 'Stable',
        demandScore: opp.demandScore ?? 75,
        competition: opp.competition || 'Medium',
        trend: opp.trend || 'up',
        insights: opp.insights,
        source: opp.source || 'ai_analysis',
      }))
    : sampleCountryData;

  const displayedRows = showAll ? activeRows : activeRows.slice(0, 4);

  // Dynamic summary stats
  const dynamicStats = [
    {
      icon: Globe,
      value: isUsingRealData ? `${savedOpportunities.length}` : '203',
      label: isUsingRealData ? 'Saved Opportunities' : 'Markets Analyzed',
      color: '#2563EB',
      bg: '#EFF6FF',
    },
    {
      icon: TrendingUp,
      value: activeRows[0]?.countryCode || activeRows[0]?.country || 'USA',
      label: 'Top Opportunity',
      color: '#059669',
      bg: '#ECFDF5',
    },
    {
      icon: BarChart2,
      value: activeRows[0]?.growth || '+9.8%',
      label: 'Top Growth Rate',
      color: '#F59E0B',
      bg: '#FEF9C3',
    },
    {
      icon: Database,
      value: isUsingRealData ? 'PostgreSQL' : 'Demo Mode',
      label: isUsingRealData ? 'Storage Engine' : 'Sample Feed',
      color: '#2563EB',
      bg: '#EFF6FF',
    },
  ];

  const primaryProduct = isUsingRealData ? activeRows[0]?.productName : 'Textile & Apparel';
  const primaryHs = isUsingRealData ? activeRows[0]?.candidateHsCode : '6204';

  return (
    <section id="dashboard" className="w-full bg-[#F5F7FA] py-10 md:py-14 border-b border-[#E5E7EB]">
      <div className="section-container" ref={fade.ref}>
        <div className={fade.className}>
          {/* Section header */}
          <div className="mb-6 md:text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="type-label text-[#2563EB]">
                {isUsingRealData ? 'Saved Market Intelligence' : 'Interactive Dashboard Preview'}
              </span>
              {isUsingRealData ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#059669] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
                  <Database size={11} /> Persisted Records
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748B] bg-[#F1F5F9] px-2.5 py-0.5 rounded-full border border-[#E2E8F0]">
                  Demo Preview
                </span>
              )}
            </div>

            <h2 className="type-h2 mb-3">
              {isUsingRealData 
                ? `Export Intelligence for ${primaryProduct}`
                : 'Real Export Intelligence at Your Fingertips'}
            </h2>
            <p className="text-[14px] md:text-[15px] text-[#64748B] md:max-w-2xl md:mx-auto leading-relaxed">
              {isUsingRealData
                ? `Showing verified market opportunities persisted to your database for "${primaryProduct}". Candidate HS classifications are advisory.`
                : 'See how GlobeX ranks countries by export potential. Sign in and run the Market Intelligence Agent on any product to save custom results.'}
            </p>
          </div>

          {/* User state banners */}
          {!user && (
            <div className="mb-5 p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-[13px] text-[#1E40AF]">
                <Sparkles size={16} className="text-[#2563EB] shrink-0" />
                <span>Showing benchmark sample data. Sign in to analyze your products and persist intelligence records.</span>
              </div>
              {onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  className="shrink-0 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-semibold rounded-lg transition-colors"
                >
                  Sign In to GlobeX
                </button>
              )}
            </div>
          )}

          {user && !isUsingRealData && !isLoading && !fetchError && (
            <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-[13px] text-[#92400E]">
                <AlertCircle size={16} className="text-[#D97706] shrink-0" />
                <span>No saved export intelligence found in your account yet. Run the Market Intelligence Agent on your export product to populate your dashboard.</span>
              </div>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('agents')}
                  className="shrink-0 px-3.5 py-1.5 bg-[#D97706] hover:bg-[#B45309] text-white text-[12px] font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <PlusCircle size={13} /> Run Agent Now
                </button>
              )}
            </div>
          )}

          {fetchError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3 text-[13px] text-red-700">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>Error loading opportunities: {fetchError}</span>
              </div>
              <button
                onClick={fetchSavedData}
                className="px-2.5 py-1 bg-white border border-red-300 rounded text-[11px] font-semibold text-red-800 flex items-center gap-1"
              >
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          )}

          {/* Mobile summary stat cards — 2×2 grid */}
          <div className="grid grid-cols-2 gap-3 mb-5 md:hidden">
            {dynamicStats.map((s, i) => (
              <div key={i} className="bg-white rounded-lg border border-[#E5E7EB] p-3.5 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: s.bg }}
                >
                  <s.icon size={16} color={s.color} />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-[#0F172A] leading-none">{s.value}</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Dashboard card */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
            {/* Dashboard header */}
            <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-[14px] font-semibold text-[#0F172A]">
                    {isUsingRealData ? `Top Export Markets — ${primaryProduct}` : 'Top Export Markets — Textile & Apparel'}
                  </h3>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    Candidate HS Code: {primaryHs} | Source: {isUsingRealData ? 'PostgreSQL (User Workspace)' : 'India Demo'} | Status: Active
                  </p>
                </div>
                {/* Legend & Refresh */}
                <div className="flex items-center gap-3">
                  {user && (
                    <button
                      onClick={fetchSavedData}
                      disabled={isLoading}
                      className="text-[11px] text-[#64748B] hover:text-[#2563EB] flex items-center gap-1 transition-colors"
                      title="Refresh from Database"
                    >
                      <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  )}
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                      <div className="w-2 h-2 rounded-full bg-[#059669]" /> Growing
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Moderate
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                      <div className="w-2 h-2 rounded-full bg-[#EF4444]" /> Declining
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content area: Loading or Table */}
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#64748B]">
                <Loader2 size={24} className="animate-spin text-[#2563EB]" />
                <p className="text-[13px] font-medium">Fetching saved export intelligence from database...</p>
              </div>
            ) : (
              <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Country</th>
                      <th>Product</th>
                      <th>Est. Market Size</th>
                      <th>YoY Growth</th>
                      <th>Demand Score</th>
                      <th className="hidden sm:table-cell">Competition</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.map((row) => (
                      <tr key={row.id || row.rank}>
                        <td className="font-semibold text-[#94A3B8] text-[11px]">{row.rank}</td>
                        <td>
                          <span className="flex items-center gap-2">
                            <span className="text-base">{row.flag}</span>
                            <span className="font-medium text-[#0F172A] whitespace-nowrap">{row.country}</span>
                          </span>
                        </td>
                        <td className="text-[12px] text-[#475569] font-medium whitespace-nowrap">
                          {row.productName || 'Basmati Rice'}
                        </td>
                        <td className="font-semibold text-[#0F172A] whitespace-nowrap">{row.importValue}</td>
                        <td>
                          <span className="flex items-center gap-1">
                            <TrendIcon trend={row.trend} />
                            <span className={`font-medium whitespace-nowrap ${row.trend === 'down' || row.trend === 'Declining' ? 'text-[#EF4444]' : 'text-[#059669]'}`}>
                              {row.growth}
                            </span>
                          </span>
                        </td>
                        <td><ScoreBar score={row.demandScore} /></td>
                        <td className="hidden sm:table-cell"><CompBadge level={row.competition} /></td>
                        <td>
                          <span className="text-[10px] font-bold text-[#047857] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0] whitespace-nowrap">
                            {row.demandScore >= 85 ? 'Top Market' : 'Viable'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table Footer */}
            <div className="border-t border-[#E5E7EB]">
              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-[11px] text-[#94A3B8]">
                  {isUsingRealData
                    ? 'Data source: AI Qualitative Estimate (Live customs feed unconfigured). Candidate classifications are advisory and require authorized customs broker review.'
                    : 'Benchmark demonstration data. Official trade classifications must be validated by national customs.'}
                </p>
                <div className="flex items-center gap-4">
                  {activeRows.length > 4 && (
                    <button
                      className="md:hidden text-[12px] font-semibold text-[#2563EB]"
                      onClick={() => setShowAll(v => !v)}
                    >
                      {showAll ? 'Show less ↑' : `Show all ${activeRows.length} markets ↓`}
                    </button>
                  )}
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('agents')}
                      className="text-[11px] font-medium text-[#2563EB] hover:underline"
                    >
                      Open AI Agents Hub →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
