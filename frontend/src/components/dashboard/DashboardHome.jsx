import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  Activity,
  ArrowUpRight,
  Package,
  Globe2,
  BarChart3,
  Calendar,
  Sparkles,
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
  CartesianGrid, 
  Legend 
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
  { country: 'US', fullName: 'United States', volume: 840, share: '24%' },
  { country: 'UAE', fullName: 'United Arab Emirates', volume: 620, share: '18%' },
  { country: 'NL', fullName: 'Netherlands', volume: 490, share: '14%' },
  { country: 'DE', fullName: 'Germany', volume: 420, share: '12%' },
  { country: 'UK', fullName: 'United Kingdom', volume: 360, share: '10%' },
  { country: 'SA', fullName: 'Saudi Arabia', volume: 290, share: '8%' },
  { country: 'JP', fullName: 'Japan', volume: 210, share: '6%' },
];

function CustomLineTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] shadow-md text-xs">
        <p className="font-bold text-[#0F172A] mb-1">{label} Export Volume</p>
        <p className="text-[#2563EB] font-semibold">
          Actual: <span className="font-bold">{payload[0].value} Tons</span>
        </p>
        {payload[1] && (
          <p className="text-[#94A3B8] font-medium">
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
      <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] shadow-md text-xs">
        <p className="font-bold text-[#0F172A]">{data.fullName}</p>
        <p className="text-[#2563EB] font-semibold mt-0.5">
          Volume: <span className="font-bold">{data.volume} Tons</span>
        </p>
        <p className="text-[#059669] font-medium">
          Global Share: {data.share}
        </p>
      </div>
    );
  }
  return null;
}

export default function DashboardHome() {
  const user = JSON.parse(localStorage.getItem('user') || '{"name":"Aryan Rane"}');
  const [viewState, setViewState] = useState('normal'); // 'normal' | 'loading' | 'empty'

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      
      {/* Welcome Section - Exactly One H1 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Welcome back, {user.name ? user.name.split(' ')[0] : 'Exporter'} 👋</h1>
          <p className="text-sm text-[#64748B] mt-1">Here is what is happening with your export pipeline today.</p>
        </div>

        {/* State Simulation Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-[#F1F5F9] rounded-lg p-0.5 text-xs font-semibold">
            <button
              onClick={() => setViewState('normal')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewState === 'normal' 
                  ? 'bg-white text-[#0F172A] shadow-xs' 
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Live Data
            </button>
            <button
              onClick={() => setViewState('loading')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewState === 'loading' 
                  ? 'bg-white text-[#2563EB] shadow-xs' 
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Simulate Loading
            </button>
            <button
              onClick={() => setViewState('empty')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewState === 'empty' 
                  ? 'bg-white text-[#EF4444] shadow-xs' 
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Simulate Empty
            </button>
          </div>

          <button className="px-3.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] shadow-2xs">
            Download Report
          </button>
        </div>
      </div>

      {/* Loading State Simulator */}
      {viewState === 'loading' && (
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white p-5 rounded-xl border border-[#E2E8F0] h-28 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-10 h-10 rounded-lg bg-[#F1F5F9]" />
                  <div className="w-16 h-5 rounded bg-[#F1F5F9]" />
                </div>
                <div className="w-24 h-4 rounded bg-[#F1F5F9]" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] h-80 flex flex-col justify-between">
              <div className="w-48 h-5 rounded bg-[#F1F5F9]" />
              <div className="w-full h-56 rounded bg-[#F8FAFC]" />
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] h-80 flex flex-col justify-between">
              <div className="w-48 h-5 rounded bg-[#F1F5F9]" />
              <div className="w-full h-56 rounded bg-[#F8FAFC]" />
            </div>
          </div>
        </div>
      )}

      {/* Empty State Simulator */}
      {viewState === 'empty' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center shadow-sm flex flex-col items-center justify-center my-4">
          <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#2563EB] mb-4">
            <Inbox size={32} />
          </div>
          <h2 className="text-lg font-bold text-[#0F172A] mb-1">No Trade Records Recorded Yet</h2>
          <p className="text-sm text-[#64748B] max-w-md mx-auto mb-6">
            Start by running an AI market analysis or discovering verified buyers to populate your active export dashboard.
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
            
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                  <Package size={20} />
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-[#059669] bg-[#ECFDF5] px-2 py-1 rounded-md">
                  <TrendingUp size={12} /> +12.5%
                </span>
              </div>
              <h3 className="text-[#64748B] text-sm font-medium">Active Export Volume</h3>
              <p className="text-2xl font-bold text-[#0F172A] mt-1">420 Tons</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#FDF4FF] flex items-center justify-center text-[#C026D3]">
                  <Users size={20} />
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-[#059669] bg-[#ECFDF5] px-2 py-1 rounded-md">
                  <TrendingUp size={12} /> +4 New
                </span>
              </div>
              <h3 className="text-[#64748B] text-sm font-medium">Discovered Buyers</h3>
              <p className="text-2xl font-bold text-[#0F172A] mt-1">1,284</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#FFFBEB] flex items-center justify-center text-[#D97706]">
                  <FileText size={20} />
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-[#059669] bg-[#ECFDF5] px-2 py-1 rounded-md">
                  <TrendingUp size={12} /> 2 Pending
                </span>
              </div>
              <h3 className="text-[#64748B] text-sm font-medium">Active RFPs / Quotes</h3>
              <p className="text-2xl font-bold text-[#0F172A] mt-1">12</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#ECFDF5] flex items-center justify-center text-[#059669]">
                  <Globe2 size={20} />
                </div>
                <span className="text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] px-2 py-1 rounded-md">
                  96% Match
                </span>
              </div>
              <h3 className="text-[#64748B] text-sm font-medium">Top Destination Market</h3>
              <p className="text-2xl font-bold text-[#0F172A] mt-1">Germany</p>
            </div>

          </div>

          {/* Charts Row: Trade-Volume Line Chart + Top-Markets Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Trade-Volume Line Chart */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">Monthly Trade Volume</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">Export trajectory in Metric Tons (2025–2026)</p>
                </div>
                <span className="px-2.5 py-1 bg-[#EFF6FF] text-[#2563EB] text-xs font-semibold rounded-md border border-[#DBEAFE]">
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
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">Top Destination Markets</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">Annual export volume breakdown by country (Tons)</p>
                </div>
                <span className="px-2.5 py-1 bg-[#ECFDF5] text-[#059669] text-xs font-semibold rounded-md border border-[#A7F3D0]">
                  7 Active Corridors
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
            <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col">
              <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center">
                <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <Activity size={18} className="text-[#2563EB]" />
                  AI Agent Live Activity
                </h2>
                <button className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]">View All</button>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-4">
                
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0 mt-0.5">
                    <Users size={14} className="text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#334155]"><strong>Buyer Discovery Agent</strong> found 3 new high-probability importers in the EU for HS Code 6204.62.</p>
                    <p className="text-xs text-[#94A3B8] mt-1">10 minutes ago</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#FDF4FF] flex items-center justify-center shrink-0 mt-0.5">
                    <FileText size={14} className="text-[#C026D3]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#334155]"><strong>Compliance Agent</strong> flagged a new mandatory phytosanitary certificate requirement for Germany.</p>
                    <p className="text-xs text-[#94A3B8] mt-1">2 hours ago</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#ECFDF5] flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp size={14} className="text-[#059669]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#334155]"><strong>Market Intelligence Agent</strong> detected a 4.2% drop in ocean freight rates on the Mumbai-Rotterdam route.</p>
                    <p className="text-xs text-[#94A3B8] mt-1">5 hours ago</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col">
              <div className="p-5 border-b border-[#E2E8F0]">
                <h2 className="text-base font-bold text-[#0F172A]">Quick Actions</h2>
              </div>
              <div className="p-2 flex flex-col">
                <button className="flex items-center justify-between p-3 rounded-lg hover:bg-[#F8FAFC] transition-colors text-left group">
                  <div>
                    <p className="font-semibold text-sm text-[#0F172A]">Generate Email Draft</p>
                    <p className="text-xs text-[#64748B]">Pitch directly to a verified buyer</p>
                  </div>
                  <ArrowUpRight size={16} className="text-[#94A3B8] group-hover:text-[#2563EB] transition-colors" />
                </button>
                <button className="flex items-center justify-between p-3 rounded-lg hover:bg-[#F8FAFC] transition-colors text-left group border-t border-[#F1F5F9]">
                  <div>
                    <p className="font-semibold text-sm text-[#0F172A]">Check EU Compliance</p>
                    <p className="text-xs text-[#64748B]">Verify origin certifications</p>
                  </div>
                  <ArrowUpRight size={16} className="text-[#94A3B8] group-hover:text-[#2563EB] transition-colors" />
                </button>
                <button className="flex items-center justify-between p-3 rounded-lg hover:bg-[#F8FAFC] transition-colors text-left group border-t border-[#F1F5F9]">
                  <div>
                    <p className="font-semibold text-sm text-[#0F172A]">Search New Markets</p>
                    <p className="text-xs text-[#64748B]">Find seasonal demand spikes</p>
                  </div>
                  <ArrowUpRight size={16} className="text-[#94A3B8] group-hover:text-[#2563EB] transition-colors" />
                </button>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
