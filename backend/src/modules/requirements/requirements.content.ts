/**
 * Requirements content framework.
 *
 * Every entry is one requirement for one product scope (HS prefixes) and one
 * destination, grounded in a single official source that was checked on a
 * recorded date. Entries are committed, versioned content — never generated,
 * never guessed. A product/destination pair with no entries is UNKNOWN
 * coverage, and callers must treat it as such (covered: false), not as
 * "no requirements apply".
 *
 * Adding coverage: fetch the current official source, confirm the page still
 * states the requirement, then add an entry with that URL and today's date.
 * If a source page changes or stops stating the requirement, update or remove
 * the entry — do not leave stale claims in place.
 */

export type RequirementStatus = 'verified' | 'unverified';

export interface RequirementEntry {
  /** Stable slug, unique within the dataset. */
  id: string;
  /** ISO 3166-1 alpha-2 destination country code, upper case. */
  destination: string;
  /** HS code prefixes this entry applies to (prefix match, e.g. '0910'). */
  hsPrefixes: string[];
  /** Human scope label, e.g. 'Turmeric and other spices (HS 0910)'. */
  productScope: string;
  title: string;
  detail: string;
  category: 'market-access' | 'registration' | 'labeling' | 'documentation';
  /** Official source the requirement was grounded from. */
  sourceUrl: string;
  /** ISO date the source was last checked. */
  checkedAt: string;
  status: RequirementStatus;
}

export const REQUIREMENT_ENTRIES: RequirementEntry[] = [
  {
    id: 'us-spices-fda-prior-notice',
    destination: 'US',
    hsPrefixes: ['0910'],
    productScope: 'Turmeric and other spices (HS 0910)',
    title: 'FDA Prior Notice of imported food',
    detail:
      'Prior notice of food shipments must be submitted to FDA before the food arrives in the United States.',
    category: 'market-access',
    sourceUrl:
      'https://www.fda.gov/industry/fda-import-process/prior-notice-imported-foods',
    checkedAt: '2026-11-20',
    status: 'verified',
  },
  {
    id: 'us-spices-fda-facility-registration',
    destination: 'US',
    hsPrefixes: ['0910'],
    productScope: 'Turmeric and other spices (HS 0910)',
    title: 'FDA food facility registration',
    detail:
      'Facilities that manufacture, process, pack, or hold food for consumption in the United States must register with FDA.',
    category: 'registration',
    sourceUrl:
      'https://www.fda.gov/food/guidance-regulation-food-and-dietary-supplements/registration-food-facilities-and-other-submissions',
    checkedAt: '2026-11-20',
    status: 'verified',
  },
  {
    id: 'us-spices-fda-food-labeling',
    destination: 'US',
    hsPrefixes: ['0910'],
    productScope: 'Turmeric and other spices (HS 0910)',
    title: 'US food labeling rules',
    detail:
      'Foods imported into the United States must meet FDA labeling requirements; see the FDA Food Labeling Guide.',
    category: 'labeling',
    sourceUrl:
      'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-food-labeling-guide',
    checkedAt: '2026-11-20',
    status: 'verified',
  },
  {
    id: 'us-spices-india-cres',
    destination: 'US',
    hsPrefixes: ['0910'],
    productScope: 'Turmeric and other spices (HS 0910)',
    title: 'Spices Board registration (CRES)',
    detail:
      'Exporters of spices from India require a Certificate of Registration as Exporter of Spices (CRES) from the Spices Board.',
    category: 'registration',
    sourceUrl:
      'https://www.indianspices.com/spice-news/certificate-registration-exporter-spicescres.html',
    checkedAt: '2026-11-20',
    status: 'verified',
  },
  {
    id: 'us-spices-india-iec',
    destination: 'US',
    hsPrefixes: ['0910'],
    productScope: 'Turmeric and other spices (HS 0910)',
    title: 'Importer Exporter Code (IEC)',
    detail:
      'Exporting from India requires an Importer Exporter Code issued by the Directorate General of Foreign Trade (DGFT).',
    category: 'registration',
    sourceUrl: 'https://www.dgft.gov.in/CP/',
    checkedAt: '2026-11-20',
    status: 'verified',
  },
];
