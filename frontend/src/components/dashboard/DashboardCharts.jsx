import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import Term from '../ui/Jargon';

const TOP_MARKETS_DATA = [
  { country: 'USA', fullName: 'United States', volume: 2671, share: '31.8%' },
  { country: 'UK', fullName: 'United Kingdom', volume: 794, share: '9.5%' },
  { country: 'UAE', fullName: 'United Arab Emirates', volume: 629, share: '7.5%' },
  { country: 'ES', fullName: 'Spain', volume: 470, share: '5.6%' },
  { country: 'DE', fullName: 'Germany', volume: 376, share: '4.5%' },
  { country: 'NL', fullName: 'Netherlands', volume: 311, share: '3.7%' },
  { country: 'FR', fullName: 'France', volume: 298, share: '3.6%' },
];

const AXIS_TICK = '#8A9893';
const GRID_STROKE = '#EDE9E0';
const SERIES_MAIN = '#0F766E';

function CustomBarTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg border border-line shadow-md text-xs">
        <p className="font-bold text-navy">{data.fullName}</p>
        <p className="text-blue font-semibold mt-0.5">
          India <Term t="FOB" /> Exports: <span className="font-bold">${data.volume >= 1000 ? `${(data.volume / 1000).toFixed(2)}B` : `${data.volume}M`} USD</span>
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

/**
 * Charts row for the Overview dashboard. Loaded lazily (React.lazy) so the
 * recharts bundle stays out of the first paint; the Suspense fallback in
 * DashboardHome reserves identical space to avoid layout shift.
 */
export default function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 gap-6">

      {/* Top-Markets Bar Chart */}
      <div className="bg-white p-5 rounded-xl border border-line flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-navy font-heading">Top Destination Markets (HS 62)</h2>
            <p className="text-xs text-muted mt-0.5">India-reported exports (<Term t="FOB" />) in $M USD — Source: UN Comtrade 2025</p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-pale text-emerald-dark text-xs font-semibold rounded-md border border-emerald-border">
            196 Destinations
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={TOP_MARKETS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="country" stroke={AXIS_TICK} fontSize={11} tickLine={false} />
              <YAxis stroke={AXIS_TICK} fontSize={11} tickLine={false} />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar
                dataKey="volume"
                name="Export Volume"
                fill={SERIES_MAIN}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
