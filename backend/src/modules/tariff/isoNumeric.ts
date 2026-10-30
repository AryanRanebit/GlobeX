/**
 * ISO 3166 country-code helpers for the WITS tariff API.
 *
 * The WITS (World Integrated Trade Solution) API identifies reporters and
 * partners by UN M49 numeric codes (e.g. Saudi Arabia = 682, India = 356),
 * while GlobeX works with ISO alpha-2 (analysis results) and ISO alpha-3
 * (UN Comtrade market rows). This module maps both alpha forms to the
 * numeric reporter code WITS expects.
 *
 * Coverage: India's major export destinations and FTA partners. An unmapped
 * code is handled honestly upstream (tariff reported as unavailable) rather
 * than guessed.
 */
export interface IsoEntry {
  iso2: string;
  iso3: string;
  numeric: string;
  name: string;
}

export const ISO_ENTRIES: IsoEntry[] = [
  { iso2: 'US', iso3: 'USA', numeric: '840', name: 'United States' },
  { iso2: 'AE', iso3: 'ARE', numeric: '784', name: 'United Arab Emirates' },
  { iso2: 'SA', iso3: 'SAU', numeric: '682', name: 'Saudi Arabia' },
  { iso2: 'GB', iso3: 'GBR', numeric: '826', name: 'United Kingdom' },
  { iso2: 'DE', iso3: 'DEU', numeric: '276', name: 'Germany' },
  { iso2: 'NL', iso3: 'NLD', numeric: '528', name: 'Netherlands' },
  { iso2: 'FR', iso3: 'FRA', numeric: '250', name: 'France' },
  { iso2: 'IT', iso3: 'ITA', numeric: '380', name: 'Italy' },
  { iso2: 'ES', iso3: 'ESP', numeric: '724', name: 'Spain' },
  { iso2: 'BE', iso3: 'BEL', numeric: '056', name: 'Belgium' },
  { iso2: 'PT', iso3: 'PRT', numeric: '620', name: 'Portugal' },
  { iso2: 'IE', iso3: 'IRL', numeric: '372', name: 'Ireland' },
  { iso2: 'GR', iso3: 'GRC', numeric: '300', name: 'Greece' },
  { iso2: 'PL', iso3: 'POL', numeric: '616', name: 'Poland' },
  { iso2: 'SE', iso3: 'SWE', numeric: '752', name: 'Sweden' },
  { iso2: 'NO', iso3: 'NOR', numeric: '578', name: 'Norway' },
  { iso2: 'DK', iso3: 'DNK', numeric: '208', name: 'Denmark' },
  { iso2: 'FI', iso3: 'FIN', numeric: '246', name: 'Finland' },
  { iso2: 'CH', iso3: 'CHE', numeric: '756', name: 'Switzerland' },
  { iso2: 'AT', iso3: 'AUT', numeric: '040', name: 'Austria' },
  { iso2: 'CZ', iso3: 'CZE', numeric: '203', name: 'Czechia' },
  { iso2: 'HU', iso3: 'HUN', numeric: '348', name: 'Hungary' },
  { iso2: 'RO', iso3: 'ROU', numeric: '642', name: 'Romania' },
  { iso2: 'BG', iso3: 'BGR', numeric: '100', name: 'Bulgaria' },
  { iso2: 'HR', iso3: 'HRV', numeric: '191', name: 'Croatia' },
  { iso2: 'SK', iso3: 'SVK', numeric: '703', name: 'Slovakia' },
  { iso2: 'SI', iso3: 'SVN', numeric: '705', name: 'Slovenia' },
  { iso2: 'LT', iso3: 'LTU', numeric: '440', name: 'Lithuania' },
  { iso2: 'LV', iso3: 'LVA', numeric: '428', name: 'Latvia' },
  { iso2: 'EE', iso3: 'EST', numeric: '233', name: 'Estonia' },
  { iso2: 'CY', iso3: 'CYP', numeric: '196', name: 'Cyprus' },
  { iso2: 'MT', iso3: 'MLT', numeric: '470', name: 'Malta' },
  { iso2: 'LU', iso3: 'LUX', numeric: '442', name: 'Luxembourg' },
  { iso2: 'IS', iso3: 'ISL', numeric: '352', name: 'Iceland' },
  { iso2: 'JP', iso3: 'JPN', numeric: '392', name: 'Japan' },
  { iso2: 'KR', iso3: 'KOR', numeric: '410', name: 'South Korea' },
  { iso2: 'CN', iso3: 'CHN', numeric: '156', name: 'China' },
  { iso2: 'HK', iso3: 'HKG', numeric: '344', name: 'Hong Kong' },
  { iso2: 'TW', iso3: 'TWN', numeric: '158', name: 'Taiwan' },
  { iso2: 'SG', iso3: 'SGP', numeric: '702', name: 'Singapore' },
  { iso2: 'MY', iso3: 'MYS', numeric: '458', name: 'Malaysia' },
  { iso2: 'TH', iso3: 'THA', numeric: '764', name: 'Thailand' },
  { iso2: 'VN', iso3: 'VNM', numeric: '704', name: 'Vietnam' },
  { iso2: 'ID', iso3: 'IDN', numeric: '360', name: 'Indonesia' },
  { iso2: 'PH', iso3: 'PHL', numeric: '608', name: 'Philippines' },
  { iso2: 'MM', iso3: 'MMR', numeric: '104', name: 'Myanmar' },
  { iso2: 'KH', iso3: 'KHM', numeric: '116', name: 'Cambodia' },
  { iso2: 'LA', iso3: 'LAO', numeric: '418', name: 'Laos' },
  { iso2: 'BN', iso3: 'BRN', numeric: '096', name: 'Brunei' },
  { iso2: 'BD', iso3: 'BGD', numeric: '050', name: 'Bangladesh' },
  { iso2: 'LK', iso3: 'LKA', numeric: '144', name: 'Sri Lanka' },
  { iso2: 'NP', iso3: 'NPL', numeric: '524', name: 'Nepal' },
  { iso2: 'BT', iso3: 'BTN', numeric: '064', name: 'Bhutan' },
  { iso2: 'MV', iso3: 'MDV', numeric: '462', name: 'Maldives' },
  { iso2: 'PK', iso3: 'PAK', numeric: '586', name: 'Pakistan' },
  { iso2: 'AF', iso3: 'AFG', numeric: '004', name: 'Afghanistan' },
  { iso2: 'IN', iso3: 'IND', numeric: '356', name: 'India' },
  { iso2: 'AU', iso3: 'AUS', numeric: '036', name: 'Australia' },
  { iso2: 'NZ', iso3: 'NZL', numeric: '554', name: 'New Zealand' },
  { iso2: 'FJ', iso3: 'FJI', numeric: '242', name: 'Fiji' },
  { iso2: 'PG', iso3: 'PNG', numeric: '598', name: 'Papua New Guinea' },
  { iso2: 'CA', iso3: 'CAN', numeric: '124', name: 'Canada' },
  { iso2: 'MX', iso3: 'MEX', numeric: '484', name: 'Mexico' },
  { iso2: 'BR', iso3: 'BRA', numeric: '076', name: 'Brazil' },
  { iso2: 'AR', iso3: 'ARG', numeric: '032', name: 'Argentina' },
  { iso2: 'CL', iso3: 'CHL', numeric: '152', name: 'Chile' },
  { iso2: 'CO', iso3: 'COL', numeric: '170', name: 'Colombia' },
  { iso2: 'PE', iso3: 'PER', numeric: '604', name: 'Peru' },
  { iso2: 'UY', iso3: 'URY', numeric: '858', name: 'Uruguay' },
  { iso2: 'EC', iso3: 'ECU', numeric: '218', name: 'Ecuador' },
  { iso2: 'VE', iso3: 'VEN', numeric: '862', name: 'Venezuela' },
  { iso2: 'PA', iso3: 'PAN', numeric: '591', name: 'Panama' },
  { iso2: 'CR', iso3: 'CRI', numeric: '188', name: 'Costa Rica' },
  { iso2: 'GT', iso3: 'GTM', numeric: '320', name: 'Guatemala' },
  { iso2: 'DO', iso3: 'DOM', numeric: '214', name: 'Dominican Republic' },
  { iso2: 'JM', iso3: 'JAM', numeric: '388', name: 'Jamaica' },
  { iso2: 'TT', iso3: 'TTO', numeric: '780', name: 'Trinidad and Tobago' },
  { iso2: 'ZA', iso3: 'ZAF', numeric: '710', name: 'South Africa' },
  { iso2: 'NG', iso3: 'NGA', numeric: '566', name: 'Nigeria' },
  { iso2: 'KE', iso3: 'KEN', numeric: '404', name: 'Kenya' },
  { iso2: 'EG', iso3: 'EGY', numeric: '818', name: 'Egypt' },
  { iso2: 'ET', iso3: 'ETH', numeric: '231', name: 'Ethiopia' },
  { iso2: 'GH', iso3: 'GHA', numeric: '288', name: 'Ghana' },
  { iso2: 'TZ', iso3: 'TZA', numeric: '834', name: 'Tanzania' },
  { iso2: 'UG', iso3: 'UGA', numeric: '800', name: 'Uganda' },
  { iso2: 'MA', iso3: 'MAR', numeric: '504', name: 'Morocco' },
  { iso2: 'DZ', iso3: 'DZA', numeric: '012', name: 'Algeria' },
  { iso2: 'TN', iso3: 'TUN', numeric: '788', name: 'Tunisia' },
  { iso2: 'SN', iso3: 'SEN', numeric: '686', name: 'Senegal' },
  { iso2: 'CI', iso3: 'CIV', numeric: '384', name: "Côte d'Ivoire" },
  { iso2: 'CM', iso3: 'CMR', numeric: '120', name: 'Cameroon' },
  { iso2: 'AO', iso3: 'AGO', numeric: '024', name: 'Angola' },
  { iso2: 'MZ', iso3: 'MOZ', numeric: '508', name: 'Mozambique' },
  { iso2: 'ZM', iso3: 'ZMB', numeric: '894', name: 'Zambia' },
  { iso2: 'ZW', iso3: 'ZWE', numeric: '716', name: 'Zimbabwe' },
  { iso2: 'BW', iso3: 'BWA', numeric: '072', name: 'Botswana' },
  { iso2: 'NA', iso3: 'NAM', numeric: '516', name: 'Namibia' },
  { iso2: 'RW', iso3: 'RWA', numeric: '646', name: 'Rwanda' },
  { iso2: 'MU', iso3: 'MUS', numeric: '480', name: 'Mauritius' },
  { iso2: 'TR', iso3: 'TUR', numeric: '792', name: 'Turkey' },
  { iso2: 'RU', iso3: 'RUS', numeric: '643', name: 'Russia' },
  { iso2: 'UA', iso3: 'UKR', numeric: '804', name: 'Ukraine' },
  { iso2: 'IL', iso3: 'ISR', numeric: '376', name: 'Israel' },
  { iso2: 'JO', iso3: 'JOR', numeric: '400', name: 'Jordan' },
  { iso2: 'LB', iso3: 'LBN', numeric: '422', name: 'Lebanon' },
  { iso2: 'KW', iso3: 'KWT', numeric: '414', name: 'Kuwait' },
  { iso2: 'QA', iso3: 'QAT', numeric: '634', name: 'Qatar' },
  { iso2: 'BH', iso3: 'BHR', numeric: '048', name: 'Bahrain' },
  { iso2: 'OM', iso3: 'OMN', numeric: '512', name: 'Oman' },
  { iso2: 'IQ', iso3: 'IRQ', numeric: '368', name: 'Iraq' },
  { iso2: 'IR', iso3: 'IRN', numeric: '364', name: 'Iran' },
  { iso2: 'YE', iso3: 'YEM', numeric: '887', name: 'Yemen' },
  { iso2: 'KZ', iso3: 'KAZ', numeric: '398', name: 'Kazakhstan' },
  { iso2: 'UZ', iso3: 'UZB', numeric: '860', name: 'Uzbekistan' },
  { iso2: 'AZ', iso3: 'AZE', numeric: '031', name: 'Azerbaijan' },
  { iso2: 'GE', iso3: 'GEO', numeric: '268', name: 'Georgia' },
  { iso2: 'AM', iso3: 'ARM', numeric: '051', name: 'Armenia' },
  { iso2: 'MN', iso3: 'MNG', numeric: '496', name: 'Mongolia' },
  { iso2: 'RS', iso3: 'SRB', numeric: '688', name: 'Serbia' },
];

const byIso2 = new Map(ISO_ENTRIES.map((e) => [e.iso2, e]));
const byIso3 = new Map(ISO_ENTRIES.map((e) => [e.iso3, e]));
const byNumeric = new Map(ISO_ENTRIES.map((e) => [e.numeric, e]));

/** Resolve an ISO alpha-2, alpha-3, or numeric code to its ISO entry. */
export function resolveCountry(code: string | undefined | null): IsoEntry | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  if (!c) return null;
  if (/^\d{1,3}$/.test(c)) return byNumeric.get(c.padStart(3, '0')) ?? null;
  if (c.length === 2) return byIso2.get(c) ?? null;
  if (c.length === 3) return byIso3.get(c) ?? null;
  return null;
}
