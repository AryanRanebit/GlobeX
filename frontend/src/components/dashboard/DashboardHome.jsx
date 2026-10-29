import { apiFetch } from '../../lib/api';
import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  Activity,
  ArrowUpRight,
  Package,
  Globe2,
  RefreshCw,
  Inbox
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid
} from 'recharts';

const TRADE_VOLUME_DATA = [
  { month: 'Jan', volume: 280, benchmark: 250 },
  { month: 'Feb', volume: 310, benchmark: 275 },
  { month: 'Mar', volume: 350, benchmark: 300 },
  { month: 'Apr', volume: 330, benchmark: 315 },
  { month: 'May', volume: 390, benchmark: 330 },
  { month: 'Jun', volume: 420, benchmark: 350 },
  { month: 'Jul', volume: 410, benchmark: 365 },
  { month: 'Aug', volume: 450, benchmark: 380 },
  { month: 'Sep', volume: 480, benchmark: 400 },
  { month: 'Oct', volume: 460, benchmark: 410 },
  { month: 'Nov', volume: 510, benchmark: 430 },
  { month: 'Dec', volume: 540, benchmark: 450 },
];

const TOP_MARKETS_DATA = [
  { country: 'USA', fullName: 'United States', volume: 2671, share: '31.8%' },
  { country: 'UK', fullName: 'United Kingdom', volume: 794, share: '9.5%' },
  { country: 'UAE', fullName: 'United Arab Emirates', volume: 629, share: '7.5%' },
  { country: 'ES', fullName: 'Spain', volume: 470, share: '5.6%' },
  { country: 'DE', fullName: 'Germany', volume: 376, share: '4.5%' },
  { country: 'NL', fullName: 'Netherlands', volume: 311, share: '3.7%' },
  { country: 'FR', fullName: 'France', volume: 298, share: '3.6%' },
];

function CustomLineTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg border border-line shadow-md text-xs">
        <p className="font-bold text-navy mb-1">{label} Export Volume</p>
        <p className="text-blue font-semibold">
          Actual: <span className="font-bold">{payload[0].value} Tons</span>
        </p>
        {payload[1] && (
          <p className="text-faint font-medium">
            Benchmark: {payload[1].value} Tons
          </p>
        )}
      </div>
    );
  }
  return null;
}

function CustomBarTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg border border-line shadow-md text-xs">
        <p className="font-bold text-navy">{data.fullName}</p>
        <p className="text-blue font-semibold mt-0.5">
          India FOB Exports: <span className="font-bold">${data.volume >= 1000 ? `${(data.volume / 1000).toFixed(2)}B` : `${data.volume}M`} USD</span>
        </p>
        <p className="text-emerald font-medium">
          Share of India Exports: {data.share}
        </p>
        <p className="text-faint text-[10px] mt-1 italic">
          Market Size: Not available from free data
        </p>
      </div>
    );
  }
  return null;
}

export default function DashboardHome() {
  const user = JSON.parse(localStorage.getItem('user') || '{"name":"Aryan Rane"}');
  const [viewState, setViewState] = useState('normal'); // 'normal' | 'loading' | 'empty'
  const [buyerCount, setBuyerCount] = useState(null);

  React.useEffect(() => {
    apiFetch('/api/v1/buyers')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && typeof data.total === 'number') {
          setBuyerCount(data.total);
        } else if (Array.isArray(data?.buyers)) {
          setBuyerCount(data.buyers.length);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      
      {/* Welcome Section - Exactly One H1 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy font-heading">Welcome back, {user.name ? user.name.split(' ')[0] : 'Exporter'} 👋</h1>
          <p className="text-[15px] text-soft mt-1">Here is what is happening with your export pipeline today.</p>
        </div>

        {/* State Simulation Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-surface rounded-lg p-0.5 text-xs font-semibold">
            <button
              onClick={() => setViewState('normal')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewState === 'normal' 
                  ? 'bg-white text-navy shadow-xs' 
                  : 'text-muted hover:text-navy'
              }`}
            >
              Live Data
            </button>
            <button
              onClick={() => setViewState('loading')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewState === 'loading' 
                  ? 'bg-white text-blue shadow-xs' 
                  : 'text-muted hover:text-navy'
              }`}
            >
              Simulate Loading
            </button>
            <button
              onClick={() => setViewState('empty')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewState === 'empty' 
                  ? 'bg-white text-red shadow-xs' 
                  : 'text-muted hover:text-navy'
              }`}
            >
              Simulate Empty
            </button>
          </div>

          <button className="px-3.5 py-1.5 bg-white border border-line rounded-lg text-xs font-semibold text-ink hover:bg-page shadow-2xs">
            Download Report
          </button>
        </div>
      </div>

      {/* Loading State Simulator */}
      {viewState === 'loading' && (
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white p-5 rounded-xl border border-line h-28 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-10 h-10 rounded-lg bg-surface" />
                  <div className="w-16 h-5 rounded bg-surface" />
                </div>
                <div className="w-24 h-4 rounded bg-surface" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-line h-80 flex flex-col justify-between">
              <div className="w-48 h-5 rounded bg-surface" />
              <div className="w-full h-56 rounded bg-page" />
            </div>
            <div className="bg-white p-5 rounded-xl border border-line h-80 flex flex-col justify-between">
              <div className="w-48 h-5 rounded bg-surface" />
              <div className="w-full h-56 rounded bg-page" />
            </div>
          </div>
        </div>
      )}

      {/* Empty State Simulator */}
      {viewState === 'empty' && (
        <div className="bg-white rounded-xl border border-line p-12 text-center shadow-sm flex flex-col items-center justify-center my-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-pale border border-blue-border flex items-center justify-center text-blue mb-4">
            <Inbox size={32} />
          </div>
          <h2 className="text-lg font-bold text-navy mb-1">No Trade Records Recorded Yet</h2>
          <p className="text-sm text-muted max-w-md mx-auto mb-6">
            Start by running an AI market analysis or a grounded buyer search to populate your active export dashboard.
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => setViewState('normal')} 
              className="btn-primary px-4 py-2 text-sm font-semibold flex items-center gap-2"
            >
              <RefreshCw size={14} />
              Restore Live Data
            </button>
          </div>
        </div>
      )}

      {/* Normal Live State */}
      {viewState === 'normal' && (
        <>
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-xl border border-line shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-pale flex items-center justify-center text-blue">
                  <Package size={20} />
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald bg-emerald-pale px-2 py-1 rounded-md">
                  <TrendingUp size={12} /> UN Comtrade 2025
                </span>
              </div>
              <h3 className="text-muted text-sm font-medium">India HS 62 Exports</h3>
              <p className="text-2xl font-bold text-navy mt-1">$8.39B USD</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-line shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-fuchsia-pale flex items-center justify-center text-fuchsia">
                  <Users size={20} />
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald bg-emerald-pale px-2 py-1 rounded-md">
                  <TrendingUp size={12} /> Live Importers
                </span>
              </div>
              <h3 className="text-muted text-sm font-medium">Discovered Buyers</h3>
              <p className="text-2xl font-bold text-navy mt-1">{buyerCount !== null ? buyerCount : '—'}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-line shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center text-accent">
                  <FileText size={20} />
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-blue bg-blue-pale px-2 py-1 rounded-md">
                  223 Destinations
                </span>
              </div>
              <h3 className="text-muted text-sm font-medium">India Total Merchandise</h3>
              <p className="text-2xl font-bold text-navy mt-1">$445.8B USD</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-line shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-pale flex items-center justify-center text-emerald">
                  <Globe2 size={20} />
                </div>
                <span className="text-xs font-semibold text-blue bg-blue-pale px-2 py-1 rounded-md">
                  #1 Partner
                </span>
              </div>
              <h3 className="text-muted text-sm font-medium">Top Destination (HS 62)</h3>
              <p className="text-2xl font-bold text-navy mt-1">USA ($2.67B)</p>
            </div>

          </div>

          {/* Charts Row: Trade-Volume Line Chart + Top-Markets Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Trade-Volume Line Chart */}
            <div className="bg-white p-5 rounded-xl border border-line shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-navy">Monthly Trade Volume</h2>
                  <p className="text-xs text-muted mt-0.5">Export trajectory in Metric Tons (2025–2026)</p>
                </div>
                <span className="px-2.5 py-1 bg-blue-pale text-blue text-xs font-semibold rounded-md border border-blue-border">
                  +18.4% YoY
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={TRADE_VOLUME_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomLineTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="volume" 
                      name="Actual Exports"
                      stroke="#2563EB" 
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#2563EB' }}
                      activeDot={{ r: 5 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="benchmark" 
                      name="Benchmark"
                      stroke="#CBD5E1" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top-Markets Bar Chart */}
            <div className="bg-white p-5 rounded-xl border border-line shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-navy">Top Destination Markets (HS 62)</h2>
                  <p className="text-xs text-muted mt-0.5">India-reported exports (FOB) in $M USD — Source: UN Comtrade 2025</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-pale text-emerald text-xs font-semibold rounded-md border border-emerald-border">
                  196 Destinations
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={TOP_MARKETS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="country" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar 
                      dataKey="volume" 
                      name="Export Volume"
                      fill="#2563EB" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Bottom Grid: Recent Activity & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recent AI Activity */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-line shadow-sm flex flex-col">
              <div className="p-5 border-b border-line flex justify-between items-center">
                <h2 className="text-base font-bold text-navy flex items-center gap-2">
                  <Activity size={18} className="text-blue" />
                  AI Agent Live Activity
                </h2>
                <button className="text-xs font-semibold text-blue hover:text-blue-dark">View All</button>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-4">
                
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-pale flex items-center justify-center shrink-0 mt-0.5">
                    <Users size={14} className="text-blue" />
                  </div>
                  <div>
                    <p className="text-sm text-ink"><strong>Buyer Discovery Agent</strong> is ready: run a grounded live search to find real importers, each with its source link.</p>
                    <p className="text-xs text-faint mt-1">10 minutes ago</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-fuchsia-pale flex items-center justify-center shrink-0 mt-0.5">
                    <FileText size={14} className="text-fuchsia" />
                  </div>
                  <div>
                    <p className="text-sm text-ink"><strong>Compliance Agent</strong> flagged a new mandatory phytosanitary certificate requirement for Germany.</p>
                    <p className="text-xs text-faint mt-1">2 hours ago</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-pale flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp size={14} className="text-emerald" />
                  </div>
                  <div>
                    <p className="text-sm text-ink"><strong>Market Intelligence Agent</strong> detected a 4.2% drop in ocean freight rates on the Mumbai-Rotterdam route.</p>
                    <p className="text-xs text-faint mt-1">5 hours ago</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-line shadow-sm flex flex-col">
              <div className="p-5 border-b border-line">
                <h2 className="text-base font-bold text-navy">Quick Actions</h2>
              </div>
              <div className="p-2 flex flex-col">
                <button className="flex items-center justify-between p-3 rounded-lg hover:bg-page transition-colors text-left group">
                  <div>
                    <p className="font-semibold text-sm text-navy">Generate Email Draft</p>
                    <p className="text-xs text-muted">Pitch directly to a sourced buyer prospect</p>
                  </div>
                  <ArrowUpRight size={16} className="text-faint group-hover:text-blue transition-colors" />
                </button>
                <button className="flex items-center justify-between p-3 rounded-lg hover:bg-page transition-colors text-left group border-t border-surface">
                  <div>
                    <p className="font-semibold text-sm text-navy">Check EU Compliance</p>
                    <p className="text-xs text-muted">Verify origin certifications</p>
                  </div>
                  <ArrowUpRight size={16} className="text-faint group-hover:text-blue transition-colors" />
                </button>
                <button className="flex items-center justify-between p-3 rounded-lg hover:bg-page transition-colors text-left group border-t border-surface">
                  <div>
                    <p className="font-semibold text-sm text-navy">Search New Markets</p>
                    <p className="text-xs text-muted">Find seasonal demand spikes</p>
                  </div>
                  <ArrowUpRight size={16} className="text-faint group-hover:text-blue transition-colors" />
                </button>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
