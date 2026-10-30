import { describe, it, expect } from 'vitest';
import { selectMirrorPerReporter, computeIndiaShare } from './mirrorMetrics';

describe('selectMirrorPerReporter', () => {
  const rows = [
    // newest-first, as Prisma orderBy period desc returns them
    { reporterCode: '842', tradeValueUsd: 1_600_000_000, period: '2025' },
    { reporterCode: '842', tradeValueUsd: 1_500_000_000, period: '2024' },
    { reporterCode: '682', tradeValueUsd: 900_000_000, period: '2024' }, // no 2025 row
  ];

  it('prefers the requested-year row', () => {
    const m = selectMirrorPerReporter(rows, '2025');
    expect(m.get('842')).toEqual({ value: 1_600_000_000, period: '2025' });
  });

  it('falls back to the latest period when the requested year is missing', () => {
    const m = selectMirrorPerReporter(rows, '2025');
    expect(m.get('682')).toEqual({ value: 900_000_000, period: '2024' });
  });

  it('keeps the exact-year row even when a newer row exists', () => {
    const m = selectMirrorPerReporter(rows, '2024');
    expect(m.get('842')).toEqual({ value: 1_500_000_000, period: '2024' });
  });

  it('returns an empty map for no rows', () => {
    expect(selectMirrorPerReporter([], '2025').size).toBe(0);
  });
});

describe('computeIndiaShare', () => {
  it('computes India-reported exports / destination world imports', () => {
    // $50M India exports into a $1B destination import market = 5%
    expect(computeIndiaShare(50_000_000, 1_000_000_000)).toBeCloseTo(5);
  });

  it('returns null when mirror data is missing (never a proxy)', () => {
    expect(computeIndiaShare(50_000_000, null)).toBeNull();
  });

  it('returns null for zero/negative destination imports', () => {
    expect(computeIndiaShare(50_000_000, 0)).toBeNull();
  });
});
