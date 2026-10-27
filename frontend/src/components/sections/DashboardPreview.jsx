import React from 'react';
import { useFadeIn } from '../../lib/useFadeIn';
import { Sparkles, Info } from 'lucide-react';
import { TRADE_STATS } from '../../constants/tradeStats';

const realHs62ApparelData = [
  { rank: 1, country: 'United States', code: 'USA', flag: '🇺🇸', exportValue: '$2,671.15M', shareOfIndiaExports: '31.83%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
  { rank: 2, country: 'United Kingdom', code: 'GBR', flag: '🇬🇧', exportValue: '$793.51M', shareOfIndiaExports: '9.46%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
  { rank: 3, country: 'United Arab Emirates', code: 'ARE', flag: '🇦🇪', exportValue: '$628.61M', shareOfIndiaExports: '7.49%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
  { rank: 4, country: 'Spain', code: 'ESP', flag: '🇪🇸', exportValue: '$469.56M', shareOfIndiaExports: '5.60%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
  { rank: 5, country: 'Germany', code: 'DEU', flag: '🇩🇪', exportValue: '$376.24M', shareOfIndiaExports: '4.48%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
  { rank: 6, country: 'France', code: 'FRA', flag: '🇫🇷', exportValue: '$336.82M', shareOfIndiaExports: '4.01%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
  { rank: 7, country: 'Italy', code: 'ITA', flag: '🇮🇹', exportValue: '$325.21M', shareOfIndiaExports: '3.88%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
  { rank: 8, country: 'Netherlands', code: 'NLD', flag: '🇳🇱', exportValue: '$299.12M', shareOfIndiaExports: '3.56%', marketSize: 'Not available from free data', pipeline: 'Discovery ready' },
];

export default function DashboardPreview() {
  const fade = useFadeIn();

  return (
    <section id="dashboard" className="w-full bg-[#F5F7FA] py-14 md:py-16 border-b border-[#E5E7EB]">
      <div className="section-container" ref={fade.ref}>
        <div className={fade.className}>
          <div className="text-center mb-10">
            <span className="type-label text-[#2563EB] mb-2 block font-semibold uppercase tracking-wider text-xs">Official Trade Data Intelligence</span>
            <h2 className="type-h2 mb-3 font-bold text-2xl md:text-3xl text-[#0F172A] font-heading">
              India Apparel & Garment Exports (HS Chapter 62)
            </h2>
            <p className="text-[14px] text-[#64748B] max-w-2xl mx-auto">
              Real calendar year 2025 destination rankings extracted from United Nations Statistics Division (UN Comtrade). Total India HS62 exports: {TRADE_STATS.apparelExportValueFormatted} across {TRADE_STATS.apparelDestinationsCount} destination markets.
            </p>
          </div>

          {/* Dashboard card */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-sm overflow-hidden">
            {/* Dashboard header */}
            <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-[14px] font-bold text-[#0F172A]">Top Destination Markets — Indian Apparel (HS 62)</h3>
                <p className="text-[11px] text-[#64748B] flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#10B981]" />
                  Source: UN Comtrade 2025 Calendar Year | Reporter: India (699) | FOB Value
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1E40AF] bg-[#EFF6FF] px-2.5 py-1 rounded-full border border-[#BFDBFE]">
                  <Sparkles size={12} className="text-[#2563EB]" />
                  Verified UN Comtrade Dataset
                </span>
              </div>
            </div>

            {/* Data table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-[#F1F5F9] border-b border-[#E2E8F0] text-[#475569] font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-12 text-center">Rank</th>
                    <th className="py-2.5 px-4">Destination Market</th>
                    <th className="py-2.5 px-4">India Exports (2025 FOB)</th>
                    <th className="py-2.5 px-4">Share of India Exports</th>
                    <th className="py-2.5 px-4">Destination Market Size</th>
                    <th className="py-2.5 px-4">Buyer Intelligence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {realHs62ApparelData.map((row) => (
                    <tr key={row.rank} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#64748B] text-center text-xs">{row.rank}</td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-2 font-medium text-[#0F172A]">
                          <span className="text-base">{row.flag}</span>
                          <span>{row.country}</span>
                          <span className="text-[10px] text-[#64748B] font-mono">({row.code})</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0F172A]">{row.exportValue}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8]">
                          {row.shareOfIndiaExports}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B] italic bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
                          <Info size={11} className="text-[#94A3B8]" />
                          {row.marketSize}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                          {row.pipeline}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Dashboard footer */}
            <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F8FAFC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#64748B]">
              <p>
                <strong>Data Semantics Notice:</strong> Figures show exports reported by India (FOB). Total destination market size requires destination-reported import declarations (CIF) and is labeled accordingly.
              </p>
              <span className="font-semibold text-[#2563EB] shrink-0">
                Total India HS62: $8,392,174,046 USD
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
