/**
 * Pure helpers for destination market-size (mirror) metrics.
 * Kept DB-free so the data-semantics rules are unit-testable.
 */

export interface MirrorRowLike {
  reporterCode: string;
  tradeValueUsd: number;
  period: string;
}

/**
 * From mirror rows (any period), pick one per reporter: the requested year
 * when present, otherwise the most recent period. Rows must be sorted
 * newest-first by period (Prisma orderBy period desc guarantees this).
 */
export function selectMirrorPerReporter(
  rows: MirrorRowLike[],
  requestedYear: string,
): Map<string, { value: number; period: string }> {
  const out = new Map<string, { value: number; period: string }>();
  for (const r of rows) {
    const existing = out.get(r.reporterCode);
    if (existing?.period === requestedYear) continue; // exact-year row wins
    if (r.period === requestedYear || existing === undefined) {
      out.set(r.reporterCode, { value: r.tradeValueUsd, period: r.period });
    }
  }
  return out;
}

/**
 * India's market share of a destination = India-reported exports to that
 * destination / the destination's own import declarations from World.
 * Returns null unless genuine mirror data exists (never a proxy).
 */
export function computeIndiaShare(
  indiaExportUsd: number,
  destinationWorldImportUsd: number | null,
): number | null {
  if (destinationWorldImportUsd === null || destinationWorldImportUsd <= 0) return null;
  return (indiaExportUsd / destinationWorldImportUsd) * 100;
}

/**
 * Integrity guard: a share above 100% means the destination's declared
 * world imports are smaller than India alone reported shipping there - a
 * known mirror-data artifact (under-declared imports, transit-hub leakage,
 * partial-year aggregates). Such a percentage is misleading, so the share
 * is withheld and flagged instead of printed.
 */
export function isShareConsistent(sharePct: number | null): boolean {
  return sharePct === null || sharePct <= 100;
}

export const SHARE_INCONSISTENT_STATUS =
  'Mirror figure under-reports vs India export record - share withheld';
