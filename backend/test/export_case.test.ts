// ─────────────────────────────────────────────────────────────────────────────
// Export Case tests (offline: prisma mocked, no DB, no network)
//
// Owner scoping is the safety property: every read, update and delete must
// carry BOTH the case id and the requester's userId, and validation must
// reject bad input before any database call.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const findMany = vi.fn();
const findFirst = vi.fn();
const count = vi.fn();
const create = vi.fn();
const updateMany = vi.fn();
const deleteMany = vi.fn();

vi.mock('../src/config/database', () => ({
  prisma: {
    exportCase: {
      findMany: (...a: unknown[]) => findMany(...a),
      findFirst: (...a: unknown[]) => findFirst(...a),
      count: (...a: unknown[]) => count(...a),
      create: (...a: unknown[]) => create(...a),
      updateMany: (...a: unknown[]) => updateMany(...a),
      deleteMany: (...a: unknown[]) => deleteMany(...a),
    },
  },
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), http: vi.fn() },
}));

import { exportCaseService } from '../src/modules/exportCase/exportCase.service';
import { createExportCaseSchema, updateExportCaseSchema } from '../src/modules/exportCase/exportCase.schema';

const USER = 'user-1';
const OTHER = 'user-2';

beforeEach(() => vi.clearAllMocks());

describe('owner scoping', () => {
  it('get is scoped to the requester', async () => {
    findFirst.mockResolvedValue(null);
    await exportCaseService.getForUser(OTHER, 'case-9');
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'case-9', userId: OTHER } });
  });

  it('update writes with id AND userId, never id alone', async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findFirst.mockResolvedValue({ id: 'case-1', userId: USER });
    await exportCaseService.updateForUser(USER, 'case-1', { stage: 'markets' });
    expect(updateMany.mock.calls[0][0].where).toEqual({ id: 'case-1', userId: USER });
  });

  it('update returns null when the case belongs to someone else', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    const result = await exportCaseService.updateForUser(OTHER, 'case-1', { stage: 'leads' });
    expect(result).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('delete is owner-scoped and reports false for foreign cases', async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    const removed = await exportCaseService.removeForUser(OTHER, 'case-1');
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'case-1', userId: OTHER } });
    expect(removed).toBe(false);
  });

  it('update strips undefined fields so partial updates cannot null out data', async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findFirst.mockResolvedValue({ id: 'case-1' });
    await exportCaseService.updateForUser(USER, 'case-1', { stage: undefined, notes: 'keep' });
    expect(updateMany.mock.calls[0][0].data).toEqual({ notes: 'keep' });
  });
});

describe('validation', () => {
  it('requires a product name', () => {
    expect(createExportCaseSchema.safeParse({}).success).toBe(false);
    expect(createExportCaseSchema.safeParse({ productName: 'x' }).success).toBe(false);
  });

  it('normalizes HS codes to digits and accepts 2-10', () => {
    const ok = createExportCaseSchema.safeParse({ productName: 'Turmeric fingers', hsCode: '0910.30' });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.hsCode).toBe('091030');
  });

  it('rejects non-numeric HS codes instead of guessing', () => {
    expect(createExportCaseSchema.safeParse({ productName: 'Turmeric', hsCode: 'curcuma' }).success).toBe(false);
  });

  it('empty HS code stays unconfirmed (undefined), never invented', () => {
    const ok = createExportCaseSchema.safeParse({ productName: 'Turmeric', hsCode: '' });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.hsCode).toBeUndefined();
  });

  it('update allows explicit null to clear an HS code', () => {
    const ok = updateExportCaseSchema.safeParse({ hsCode: '' });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.hsCode).toBeNull();
  });

  it('rejects unknown stages', () => {
    expect(updateExportCaseSchema.safeParse({ stage: 'done' }).success).toBe(false);
    expect(updateExportCaseSchema.safeParse({ stage: 'requirements' }).success).toBe(true);
  });
});
