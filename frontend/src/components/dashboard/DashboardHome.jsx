import { apiFetch } from '../../lib/api';
import React, { useState, Suspense, lazy } from 'react';
import {
  TrendingUp,
  Users,
  FileText,
  Activity,
  ArrowUpRight,
  Package,
  Globe2,
} from 'lucide-react';

// Lazy-load the charts row: keeps recharts out of the first paint and shows
// skeleton cards (same dimensions, no layout shift) while the chunk loads.
const DashboardCharts = lazy(() => import('./DashboardCharts'));

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse" role="status" aria-label="Loading charts">
      {[1, 2].map(n => (
        <div key={n} className="bg-white p-5 rounded-xl border border-line h-80 flex flex-col justify-between">
          <div className="w-48 h-5 rounded bg-surface" />
          <div className="w-full h-56 rounded bg-page" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardHome() {
  const user = JSON.parse(localStorage.getItem('user') || '{"name":"Aryan Rane"}');
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
    <div className="flex flex-col gap-6">

      {/* Welcome Section - Exactly One H1 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy font-heading">Welcome back, {user.name ? user.name.split(' ')[0] : 'Exporter'}</h1>
          <p className="text-[15px] text-soft mt-1">Here is what is happening with your export pipeline today.</p>
        </div>

        {/* State Simulation Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-secondary px-4 py-2 text-xs">
            Download Report
          </button>
        </div>
      </div>

      {/* Live State */}
      {
        <>
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="bg-white p-5 rounded-xl border border-line transition-shadow hover:shadow-[var(--shadow-float)]">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-pale border border-blue-border flex items-center justify-center text-blue">
                  <Package size={20} />
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-dark bg-emerald-pale border border-emerald-border px-2 py-1 rounded-md">
                  <TrendingUp size={12} /> UN Comtrade 2025
                </span>
              </div>
              <h3 className="text-muted text-sm font-medium">India HS 62 Exports</h3>
              <p className="text-2xl font-bold text-navy font-heading tracking-tight mt-1">$8.39B USD</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-line transition-shadow hover:shadow-[var(--shadow-float)]">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent-subtle border border-accent-border flex items-center justify-center text-accent">
                  <Users size={20} />
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-dark bg-emerald-pale border border-emerald-border px-2 py-1 rounded-md">
                  <TrendingUp size={12} /> Live Importers
                </span>
              </div>
              <h3 className="text-muted text-sm font-medium">Discovered Buyers</h3>
              <p className="text-2xl font-bold text-navy font-heading tracking-tight mt-1">{buyerCount !== null ? buyerCount : '—'}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-line transition-shadow hover:shadow-[var(--shadow-float)]">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-pale border border-accent-border flex items-center justify-center text-amber-ink">
                  <FileText size={20} />
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-blue-dark bg-blue-pale border border-blue-border px-2 py-1 rounded-md">
                  223 Destinations
                </span>
              </div>
              <h3 className="text-muted text-sm font-medium">India Total Merchandise</h3>
              <p className="text-2xl font-bold text-navy font-heading tracking-tight mt-1">$445.8B USD</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-line transition-shadow hover:shadow-[var(--shadow-float)]">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-pale border border-blue-border flex items-center justify-center text-blue-dark">
                  <Globe2 size={20} />
                </div>
                <span className="text-xs font-semibold text-blue-dark bg-blue-pale border border-blue-border px-2 py-1 rounded-md">
                  #1 Partner
                </span>
              </div>
              <h3 className="text-muted text-sm font-medium">Top Destination (HS 62)</h3>
              <p className="text-2xl font-bold text-navy font-heading tracking-tight mt-1">USA ($2.67B)</p>
            </div>

          </div>

          {/* Charts Row (lazy-loaded) */}
          <Suspense fallback={<ChartsSkeleton />}>
            <DashboardCharts />
          </Suspense>

          {/* Bottom Grid: Recent Activity & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Recent AI Activity */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-line flex flex-col">
              <div className="p-5 border-b border-line flex justify-between items-center">
                <h2 className="text-base font-bold text-navy font-heading flex items-center gap-2">
                  <Activity size={18} className="text-blue" />
                  AI Agent Live Activity
                </h2>
                <button className="text-xs font-semibold text-blue hover:text-blue-dark">View All</button>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-4">

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-pale border border-blue-border flex items-center justify-center shrink-0 mt-0.5">
                    <Users size={14} className="text-blue" />
                  </div>
                  <div>
                    <p className="text-sm text-ink"><strong>Buyer Discovery Agent</strong> is ready: run a grounded live search to find real importers, each with its source link.</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-line flex flex-col">
              <div className="p-5 border-b border-line">
                <h2 className="text-base font-bold text-navy font-heading">Quick Actions</h2>
              </div>
              <div className="p-2 flex flex-col">
                <button className="flex items-center justify-between p-3 rounded-lg hover:bg-page transition-colors text-left group">
                  <div>
                    <p className="font-semibold text-sm text-navy">Generate Email Draft</p>
                    <p className="text-xs text-muted">Pitch directly to a sourced buyer prospect</p>
                  </div>
                  <ArrowUpRight size={16} className="text-faint group-hover:text-blue transition-colors" />
                </button>
                <button className="flex items-center justify-between p-3 rounded-lg hover:bg-page transition-colors text-left group border-t border-line">
                  <div>
                    <p className="font-semibold text-sm text-navy">Check EU Compliance</p>
                    <p className="text-xs text-muted">Verify origin certifications</p>
                  </div>
                  <ArrowUpRight size={16} className="text-faint group-hover:text-blue transition-colors" />
                </button>
                <button className="flex items-center justify-between p-3 rounded-lg hover:bg-page transition-colors text-left group border-t border-line">
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
      }

    </div>
  );
}
