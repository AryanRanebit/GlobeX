import { describe, it, expect } from 'vitest';
import { requirementsService } from '../src/modules/requirements/requirements.service';
import { REQUIREMENT_ENTRIES } from '../src/modules/requirements/requirements.content';

describe('requirements content framework', () => {
  it('returns grounded entries for a covered pair (HS prefix match)', () => {
    const r = requirementsService.lookup('091030', 'us');
    expect(r.covered).toBe(true);
    expect(r.destination).toBe('US');
    expect(r.requirements.length).toBeGreaterThan(0);
    for (const e of r.requirements) {
      expect(e.sourceUrl).toMatch(/^https:\/\//);
      expect(e.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['verified', 'unverified']).toContain(e.status);
    }
    expect(r.checkedAt).toBeTruthy();
  });

  it('tolerates dotted HS codes', () => {
    const r = requirementsService.lookup('0910.30', 'US');
    expect(r.covered).toBe(true);
    expect(r.hsCode).toBe('091030');
  });

  it('unknown destination stays unknown — covered false, empty list', () => {
    const r = requirementsService.lookup('091030', 'DE');
    expect(r.covered).toBe(false);
    expect(r.requirements).toEqual([]);
    expect(r.checkedAt).toBeNull();
  });

  it('unknown product for a covered destination stays unknown', () => {
    const r = requirementsService.lookup('310520', 'US');
    expect(r.covered).toBe(false);
    expect(r.requirements).toEqual([]);
  });

  it('does not leak coverage across HS prefixes', () => {
    const r = requirementsService.lookup('0901', 'US'); // coffee, not in coverage
    expect(r.covered).toBe(false);
  });

  it('coverage listing reflects committed entries only', () => {
    const cov = requirementsService.coverage();
    expect(cov.length).toBeGreaterThan(0);
    for (const c of cov) {
      expect(REQUIREMENT_ENTRIES.some((e) => e.destination === c.destination && e.productScope === c.productScope)).toBe(true);
    }
  });

  it('every entry id is unique and content is complete', () => {
    const ids = REQUIREMENT_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of REQUIREMENT_ENTRIES) {
      expect(e.title.length).toBeGreaterThan(3);
      expect(e.detail.length).toBeGreaterThan(10);
      expect(e.hsPrefixes.length).toBeGreaterThan(0);
      expect(e.destination).toMatch(/^[A-Z]{2}$/);
    }
  });
});
