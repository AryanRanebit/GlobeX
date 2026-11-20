import { COVERAGE_GAPS, REQUIREMENT_ENTRIES, RequirementEntry } from './requirements.content';

export interface RequirementsLookup {
  /** True only when committed entries exist for this exact pair. */
  covered: boolean;
  /**
   * Always false today: committed entries are partial source-checked
   * guidance, not a complete clearance for the pair. Kept explicit in the
   * response so no caller can present this list as exhaustive.
   */
  exhaustive: false;
  destination: string;
  hsCode: string;
  /** Latest sourceCheckedAt across matching entries; null when uncovered. */
  sourceCheckedAt: string | null;
  /** Known rule areas with no coverage for this pair. Empty when uncovered. */
  gaps: string[];
  requirements: RequirementEntry[];
}

function normalizeHs(hsCode: string): string {
  return hsCode.replace(/[^0-9]/g, '');
}

export const requirementsService = {
  /**
   * Match by exact destination and HS prefix. Unknown pairs return
   * covered: false with no entries — never a fabricated or nearest-match list.
   */
  lookup(hsCode: string, destination: string): RequirementsLookup {
    const hs = normalizeHs(hsCode);
    const dest = destination.trim().toUpperCase();
    const matches = REQUIREMENT_ENTRIES.filter(
      (e) =>
        e.destination === dest &&
        e.hsPrefixes.some((p) => hs.startsWith(p)),
    );
    const gapSet = COVERAGE_GAPS.find(
      (g) => g.destination === dest && g.hsPrefixes.some((p) => hs.startsWith(p)),
    );
    const sourceCheckedAt = matches.length
      ? matches.reduce((max, e) => (e.sourceCheckedAt > max ? e.sourceCheckedAt : max), matches[0].sourceCheckedAt)
      : null;
    return {
      covered: matches.length > 0,
      exhaustive: false,
      destination: dest,
      hsCode: hs,
      sourceCheckedAt,
      gaps: matches.length ? gapSet?.gaps ?? [] : [],
      requirements: matches,
    };
  },

  /** Pairs with committed coverage, for listing/discovery. */
  coverage(): { destination: string; hsPrefixes: string[]; productScope: string }[] {
    const seen = new Map<string, { destination: string; hsPrefixes: Set<string>; productScope: string }>();
    for (const e of REQUIREMENT_ENTRIES) {
      const key = `${e.destination}|${e.productScope}`;
      const cur = seen.get(key) ?? { destination: e.destination, hsPrefixes: new Set<string>(), productScope: e.productScope };
      e.hsPrefixes.forEach((p) => cur.hsPrefixes.add(p));
      seen.set(key, cur);
    }
    return [...seen.values()].map((v) => ({ destination: v.destination, hsPrefixes: [...v.hsPrefixes], productScope: v.productScope }));
  },
};
