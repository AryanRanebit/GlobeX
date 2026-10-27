/**
 * Authoritative Global Trade & Export Intelligence Constants
 * Source: UN Comtrade, United Nations Statistics Division (UNSD)
 * Calendar Year 2025 India Merchandise Exports
 * 
 * Strict rule: All metrics are strictly verified and traceable to UN Comtrade datasets.
 * No fabricated statistics, simulated customs counters, or unverified community counts.
 */

export const TRADE_STATS = {
  // Total Merchandise Exports (2025 Calendar Year)
  totalExportValueFormatted: '$445.8B',
  totalExportValueExact: 445769600047.189,
  totalExportPeriod: '2025',
  totalExportSource: 'UN Comtrade',
  
  // Total Destination Countries / Territories
  countriesCovered: 223,
  countriesCoveredFormatted: '223 Destination Markets',
  
  // Apparel & Clothing Accessories (HS Chapter 62, 2025)
  apparelExportValueFormatted: '$8.39B',
  apparelExportValueExact: 8392174046.021,
  apparelDestinationsCount: 196,
  apparelDestinationsFormatted: '196 Apparel Destinations',
  apparelTopDestination: 'USA ($2.67B)',
  apparelTopDestinationShare: '31.8%',

  // Data semantics notice
  dataSemantics: {
    exportBasis: 'India-reported merchandise exports (FOB)',
    marketSizeNotice: 'Destination total market size and market share require partner-reported import declarations (CIF) and show "Not available from free data" when unseeded.',
  },

  // Official Attribution
  attribution: {
    source: 'UN Comtrade',
    organization: 'United Nations Statistics Division (UNSD)',
    reporter: 'India (Reporter code 699)',
    year: '2025',
    citation: 'Source: UN Comtrade, United Nations Statistics Division, India merchandise exports, calendar year 2025, HS 2022. https://comtradeplus.un.org/',
    dataLicense: 'UN Comtrade Open Data Access Terms'
  }
};

export default TRADE_STATS;
