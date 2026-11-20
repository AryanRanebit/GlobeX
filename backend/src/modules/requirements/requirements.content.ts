/**
 * Requirements content framework.
 *
 * Every entry is one requirement for one product scope (HS prefixes) and one
 * destination, grounded in a single official source that was checked on a
 * recorded date. Entries are committed, versioned content — never generated,
 * never guessed.
 *
 * What an entry is NOT: fetching the source page proves the page states the
 * requirement today. It does NOT prove the requirement applies to a specific
 * exporter, product variant, or shipment — exemptions and conditions live in
 * the regulation, not on the overview page. `status: 'source-checked'` means
 * exactly that and no more.
 *
 * What coverage is NOT: `covered: true` means committed entries exist for the
 * pair. It never means the list is exhaustive. Every lookup also returns the
 * rule areas we KNOW are not covered (`gaps`), and callers must surface those
 * alongside the entries.
 *
 * A product/destination pair with no entries is UNKNOWN coverage
 * (covered: false) — not "no requirements apply".
 *
 * Adding coverage: fetch the current official source, confirm the page still
 * states the requirement, then add an entry with that URL, today's date, and
 * the conditions/exemptions the page itself flags. If a source page changes
 * or stops stating the requirement, update or remove the entry.
 */

export type RequirementStatus = 'source-checked' | 'unchecked';

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
  /**
   * Conditions and exemptions that decide whether this requirement actually
   * applies to a given exporter/product/shipment. Never blank: if the source
   * page does not settle applicability, say so here.
   */
  conditions: string;
  category: 'market-access' | 'registration' | 'labeling' | 'documentation';
  /** Official source the requirement was grounded from. */
  sourceUrl: string;
  /** ISO date the source page was last checked. */
  sourceCheckedAt: string;
  status: RequirementStatus;
}

/** Rule areas known to exist for a pair but not yet covered by entries. */
export interface CoverageGapSet {
  destination: string;
  hsPrefixes: string[];
  gaps: string[];
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
    conditions:
      'Applies to food imported or offered for import for humans and animals. The source page lists exemptions and submission-timing rules; whether a specific shipment qualifies for an exemption is not settled by this entry.',
    category: 'market-access',
    sourceUrl:
      'https://www.fda.gov/industry/fda-import-process/prior-notice-imported-foods',
    sourceCheckedAt: '2026-11-20',
    status: 'source-checked',
  },
  {
    id: 'us-spices-fda-facility-registration',
    destination: 'US',
    hsPrefixes: ['0910'],
    productScope: 'Turmeric and other spices (HS 0910)',
    title: 'FDA food facility registration',
    detail:
      'Facilities that manufacture, process, pack, or hold food for consumption in the United States must register with FDA.',
    conditions:
      'Foreign facilities must register and designate a US agent. The source page describes exemptions and renewal rules; whether a specific facility or activity is exempt is not settled by this entry.',
    category: 'registration',
    sourceUrl:
      'https://www.fda.gov/food/guidance-regulation-food-and-dietary-supplements/registration-food-facilities-and-other-submissions',
    sourceCheckedAt: '2026-11-20',
    status: 'source-checked',
  },
  {
    id: 'us-spices-fda-food-labeling',
    destination: 'US',
    hsPrefixes: ['0910'],
    productScope: 'Turmeric and other spices (HS 0910)',
    title: 'US food labeling rules',
    detail:
      'Foods imported into the United States must meet FDA labeling requirements; see the FDA Food Labeling Guide.',
    conditions:
      'Specific label contents depend on the product form, packaging, and any claims made. The guide is a summary; the binding rules are the underlying regulations. Exact label duties for a specific product are not settled by this entry.',
    category: 'labeling',
    sourceUrl:
      'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-food-labeling-guide',
    sourceCheckedAt: '2026-11-20',
    status: 'source-checked',
  },
  {
    id: 'us-spices-india-cres',
    destination: 'US',
    hsPrefixes: ['0910'],
    productScope: 'Turmeric and other spices (HS 0910)',
    title: 'Spices Board registration (CRES)',
    detail:
      'Exporters of spices from India require a Certificate of Registration as Exporter of Spices (CRES) from the Spices Board.',
    conditions:
      'Which spices and exporter categories require CRES, and any exemptions, are set by the Spices Board. Applicability to a specific exporter and product is not settled by this entry.',
    category: 'registration',
    sourceUrl:
      'https://www.indianspices.com/spice-news/certificate-registration-exporter-spicescres.html',
    sourceCheckedAt: '2026-11-20',
    status: 'source-checked',
  },
  {
    id: 'us-spices-india-iec',
    destination: 'US',
    hsPrefixes: ['0910'],
    productScope: 'Turmeric and other spices (HS 0910)',
    title: 'Importer Exporter Code (IEC)',
    detail:
      'Exporting from India requires an Importer Exporter Code issued by the Directorate General of Foreign Trade (DGFT).',
    conditions:
      'DGFT rules include exempted categories and cases. Whether a specific exporter or transaction is exempt is not settled by this entry.',
    category: 'registration',
    sourceUrl: 'https://www.dgft.gov.in/CP/',
    sourceCheckedAt: '2026-11-20',
    status: 'source-checked',
  },
];

/**
 * Known-uncovered rule areas per covered pair. Surfaced next to every lookup
 * so partial coverage is never mistaken for complete clearance.
 */
export const COVERAGE_GAPS: CoverageGapSet[] = [
  {
    destination: 'US',
    hsPrefixes: ['0910'],
    gaps: [
      'FSMA food-safety obligations (e.g. preventive controls, foreign supplier verification)',
      'Product-specific limits: contaminants, pesticide residues, adulteration',
      'Customs entry filing, bonds, and duties (CBP)',
      'State-level rules',
      'Anything outside HS 0910 spices, and any other destination (EU, UAE, etc.)',
    ],
  },
];
