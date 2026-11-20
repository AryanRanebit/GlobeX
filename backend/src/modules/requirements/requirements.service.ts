import { REQUIREMENT_ENTRIES, RequirementEntry } from './requirements.content';

export interface RequirementsLookup {
  /** True only when committed entries exist for this exact pair. */
  covered: boolean;
  destination: string;
  hsCode: string;
  /** Latest checkedAt across matching entries; null when uncovered. */
  checkedAt: string | null;
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
    const checkedAt = matches.length
      ? matches.reduce((max, e) => (e.checkedAt > max ? e.checkedAt : max), matches[0].checkedAt)
      : null;
    return { covered: matches.length > 0, destination: dest, hsCode: hs, checkedAt, requirements: matches };
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
