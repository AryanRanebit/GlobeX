// Password reset + lead evidence tests (offline: prisma mocked, no DB, no network)
import { describe, it, expect, vi, beforeEach } from 'vitest';

const userFindUnique = vi.fn();
const prtUpdateMany = vi.fn();
const prtCreate = vi.fn();
const prtFindUnique = vi.fn();
const prtUpdate = vi.fn();
const userUpdate = vi.fn();
const transaction = vi.fn();
const evCreate = vi.fn();
const evFindMany = vi.fn();
const evDeleteMany = vi.fn();
const leadFindById = vi.fn();

vi.mock('../src/config/database', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => userFindUnique(...a), update: (...a: unknown[]) => userUpdate(...a) },
    passwordResetToken: {
      updateMany: (...a: unknown[]) => prtUpdateMany(...a),
      create: (...a: unknown[]) => prtCreate(...a),
      findUnique: (...a: unknown[]) => prtFindUnique(...a),
      update: (...a: unknown[]) => prtUpdate(...a),
    },
    leadEvidence: {
      create: (...a: unknown[]) => evCreate(...a),
      findMany: (...a: unknown[]) => evFindMany(...a),
      deleteMany: (...a: unknown[]) => evDeleteMany(...a),
    },
    $transaction: (...a: unknown[]) => transaction(...a),
  },
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../src/modules/leads/leads.repository', () => ({
  leadsRepository: { findById: (...a: unknown[]) => leadFindById(...a) },
}));

vi.mock('../src/utils/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), http: vi.fn() },
}));

import { passwordResetService, configureResetDelivery } from '../src/modules/auth/passwordReset.service';
import { leadEvidenceService } from '../src/modules/leads/leadEvidence.service';

beforeEach(() => vi.clearAllMocks());

describe('password reset mechanics', () => {
  it('availability reflects injected delivery, never account state', async () => {
    configureResetDelivery(null);
    expect(passwordResetService.isAvailable()).toBe(false);
    configureResetDelivery({ sendReset: async () => {} });
    expect(passwordResetService.isAvailable()).toBe(true);
  });

  it('fails closed when no delivery is configured: no token created', async () => {
    configureResetDelivery(null);
    userFindUnique.mockResolvedValue({ id: 'u1', email: 'user@example.com' });
    const r = await passwordResetService.requestReset('user@example.com');
    expect(r.configured).toBe(false);
    expect(prtCreate).not.toHaveBeenCalled();
  });

  it('unknown email: no token created, no enumeration signal', async () => {
    const sent: [string, string][] = [];
    configureResetDelivery({ sendReset: async (e, t) => { sent.push([e, t]); } });
    userFindUnique.mockResolvedValue(null);
    const r = await passwordResetService.requestReset('nobody@example.com');
    expect(r.configured).toBe(true); // same as known email: no enumeration
    expect(prtCreate).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
  });

  it('known email: supersedes old tokens, stores only the hash, raw token goes only to delivery', async () => {
    const sent: [string, string][] = [];
    configureResetDelivery({ sendReset: async (e, t) => { sent.push([e, t]); } });
    userFindUnique.mockResolvedValue({ id: 'u1', email: 'user@example.com' });
    prtCreate.mockResolvedValue({});
    const r = await passwordResetService.requestReset('user@example.com');
    expect(r).toEqual({ configured: true }); // nothing usable returned to the controller
    expect(sent).toHaveLength(1);
    expect(sent[0][0]).toBe('user@example.com');
    const rawToken = sent[0][1];
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/); // 32 bytes = 256 bits, hex
    expect(prtUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1', usedAt: null } }));
    const arg = prtCreate.mock.calls[0][0];
    expect(arg.data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(arg.data.tokenHash).not.toBe(rawToken); // only the hash is stored
    expect(arg.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('delivery failure kills the token so nothing usable is left behind', async () => {
    configureResetDelivery({ sendReset: async () => { throw new Error('smtp down'); } });
    userFindUnique.mockResolvedValue({ id: 'u1', email: 'user@example.com' });
    prtCreate.mockResolvedValue({});
    prtUpdateMany.mockResolvedValue({ count: 1 });
    await passwordResetService.requestReset('user@example.com');
    // second updateMany call (after the supersede one) marks the new token used
    expect(prtUpdateMany).toHaveBeenCalledTimes(2);
    expect(prtUpdateMany.mock.calls[1][0].data.usedAt).toBeInstanceOf(Date);
  });

  it('reset fails closed on unknown token', async () => {
    prtFindUnique.mockResolvedValue(null);
    await expect(passwordResetService.resetPassword('x'.repeat(64), 'NewPass123')).rejects.toThrow('Invalid or expired reset token');
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('reset fails closed on expired token', async () => {
    prtFindUnique.mockResolvedValue({ id: 't1', userId: 'u1', usedAt: null, expiresAt: new Date(Date.now() - 1000) });
    await expect(passwordResetService.resetPassword('x'.repeat(64), 'NewPass123')).rejects.toThrow('Invalid or expired reset token');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('reset fails closed on already-used token', async () => {
    prtFindUnique.mockResolvedValue({ id: 't1', userId: 'u1', usedAt: new Date(), expiresAt: new Date(Date.now() + 60000) });
    await expect(passwordResetService.resetPassword('x'.repeat(64), 'NewPass123')).rejects.toThrow('Invalid or expired reset token');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('valid reset: password rehashed, refresh token invalidated, token consumed in one transaction', async () => {
    prtFindUnique.mockResolvedValue({ id: 't1', userId: 'u1', usedAt: null, expiresAt: new Date(Date.now() + 60000) });
    transaction.mockResolvedValue([{}, {}]);
    const r = await passwordResetService.resetPassword('x'.repeat(64), 'NewPass123');
    expect(r.reset).toBe(true);
    expect(transaction).toHaveBeenCalledTimes(1);
    const userUpdateArg = userUpdate.mock.calls[0][0];
    expect(userUpdateArg.where).toEqual({ id: 'u1' });
    expect(userUpdateArg.data.refreshToken).toBeNull();
    expect(userUpdateArg.data.password).not.toBe('NewPass123');
    expect(prtUpdate.mock.calls[0][0].data.usedAt).toBeInstanceOf(Date);
  });
});

describe('lead evidence', () => {
  it('rejects evidence for a lead the user does not own', async () => {
    leadFindById.mockResolvedValue(null);
    await expect(
      leadEvidenceService.add('user-1', 'lead-x', { kind: 'manual', summary: 'met at expo' }),
    ).rejects.toThrow('Lead not found');
    expect(evCreate).not.toHaveBeenCalled();
    expect(leadFindById).toHaveBeenCalledWith('lead-x', 'user-1');
  });

  it('adds evidence to an owned lead', async () => {
    leadFindById.mockResolvedValue({ id: 'lead-1' });
    evCreate.mockResolvedValue({ id: 'ev1' });
    const r = await leadEvidenceService.add('user-1', 'lead-1', { kind: 'directory-listing', summary: 'listed on trade directory', sourceUrl: 'https://example.com/l' });
    expect(r.id).toBe('ev1');
    expect(evCreate.mock.calls[0][0].data.leadId).toBe('lead-1');
  });

  it('list is owner-scoped through the lead', async () => {
    leadFindById.mockResolvedValue(null);
    await expect(leadEvidenceService.list('user-1', 'lead-x')).rejects.toThrow('Lead not found');
    expect(evFindMany).not.toHaveBeenCalled();
  });

  it('delete is doubly scoped: evidence id AND owned lead id, 404 on no-op', async () => {
    leadFindById.mockResolvedValue({ id: 'lead-1' });
    evDeleteMany.mockResolvedValue({ count: 0 });
    await expect(leadEvidenceService.remove('user-1', 'lead-1', 'ev-other')).rejects.toThrow('Evidence not found');
    expect(evDeleteMany).toHaveBeenCalledWith({ where: { id: 'ev-other', leadId: 'lead-1' } });
  });
});
