import React from 'react';
import { Sparkles, Info } from 'lucide-react';
import { TRADE_STATS } from '../../constants/tradeStats';

const realHs62ApparelData = [
  { rank: 1, country: 'United States', code: 'USA', exportValue: '$2,671.15M', shareOfIndiaExports: '31.83%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
  { rank: 2, country: 'United Kingdom', code: 'GBR', exportValue: '$793.51M', shareOfIndiaExports: '9.46%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
  { rank: 3, country: 'United Arab Emirates', code: 'ARE', exportValue: '$628.61M', shareOfIndiaExports: '7.49%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
  { rank: 4, country: 'Spain', code: 'ESP', exportValue: '$469.56M', shareOfIndiaExports: '5.60%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
  { rank: 5, country: 'Germany', code: 'DEU', exportValue: '$376.24M', shareOfIndiaExports: '4.48%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
  { rank: 6, country: 'France', code: 'FRA', exportValue: '$336.82M', shareOfIndiaExports: '4.01%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
  { rank: 7, country: 'Italy', code: 'ITA', exportValue: '$325.21M', shareOfIndiaExports: '3.88%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
  { rank: 8, country: 'Netherlands', code: 'NLD', exportValue: '$299.12M', shareOfIndiaExports: '3.56%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
];

export default function DashboardPreview() {

  return (
    <section id="dashboard" className="w-full bg-page texture-grain py-14 md:py-16 border-b border-line">
      <div className="section-container">
        <div>
          <div className="text-center mb-10">
            <span className="type-label text-blue mb-2 block font-semibold uppercase tracking-wider text-xs">Official Trade Data Intelligence</span>
            <h2 className="type-h2 type-display mb-3 text-navy">
              India Apparel & Garment Exports (HS Chapter 62)
            </h2>
            <p className="text-sm text-muted max-w-2xl mx-auto">
              Real calendar year 2025 destination rankings extracted from United Nations Statistics Division (UN Comtrade). Total India HS62 exports: {TRADE_STATS.apparelExportValueFormatted} across {TRADE_STATS.apparelDestinationsCount} destination markets.
            </p>
          </div>

          {/* Dashboard card */}
          <div className="bg-white rounded-xl border border-line-dark shadow-sm overflow-hidden">
            {/* Dashboard header */}
            <div className="px-5 py-3 border-b border-line bg-mist flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-navy">Top Destination Markets — Indian Apparel (HS 62)</h3>
                <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-light" />
                  Source: UN Comtrade 2025 Calendar Year | Reporter: India (699) | FOB Value
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-dark bg-blue-pale px-2.5 py-1 rounded-full border border-blue-border">
                  <Sparkles size={12} className="text-blue" />
                  Verified UN Comtrade Dataset
                </span>
              </div>
            </div>

            {/* Data table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-surface border-b border-line text-soft font-semibold text-xs uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-12 text-center">Rank</th>
                    <th className="py-2.5 px-4">Destination Market</th>
                    <th className="py-2.5 px-4">India Exports (2025 FOB)</th>
                    <th className="py-2.5 px-4">Share of India Exports</th>
                    <th className="py-2.5 px-4">Destination Market Size</th>
                    <th className="py-2.5 px-4">Buyer Intelligence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {realHs62ApparelData.map((row) => (
                    <tr key={row.rank} className="hover:bg-mist transition-colors">
                      <td className="py-3 px-4 font-bold text-muted text-center text-xs">{row.rank}</td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-2 font-medium text-navy">
                          <span className="text-base">{row.flag}</span>
                          <span>{row.country}</span>
                          <span className="text-xs text-muted font-mono">({row.code})</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-navy">{row.exportValue}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-pale text-blue-dark">
                          {row.shareOfIndiaExports}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-xs text-muted italic bg-surface px-2 py-0.5 rounded border border-line">
                          <Info size={11} className="text-faint" />
                          {row.marketSize}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium text-emerald bg-emerald-pale px-2 py-0.5 rounded border border-emerald-border">
                          {row.pipeline}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Dashboard footer */}
            <div className="px-5 py-3 border-t border-line bg-mist flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted">
              <p>
                <strong>Data Semantics Notice:</strong> Figures show exports reported by India (FOB). Total destination market size requires destination-reported import declarations (CIF) and is labeled accordingly.
              </p>
              <span className="font-semibold text-blue shrink-0">
                Total India HS62: $8,392,174,046 USD
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
