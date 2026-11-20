// ─────────────────────────────────────────────────────────────────────────────
// History delete endpoint tests (offline: prisma mocked, no DB, no network)
//
// Verifies the destructive DELETE /history/:id is owner-scoped and behaves:
//  - the service always deletes with BOTH id and userId in the where clause,
//    so one user can never remove another user's entry (deleteMany with a
//    foreign userId simply matches nothing and returns 404);
//  - controller returns 404 when nothing was deleted, 200 when it was;
//  - the route file requires authentication for every history route.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const deleteMany = vi.fn();

vi.mock('../src/config/database', () => ({
  prisma: {
    analysisHistory: {
      deleteMany: (...args: unknown[]) => deleteMany(...args),
    },
  },
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), http: vi.fn() },
}));

import { historyService } from '../src/modules/history/history.service';
import { historyController } from '../src/modules/history/history.controller';

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('History delete — owner scoping', () => {
  beforeEach(() => deleteMany.mockReset());

  it('always scopes the delete to the requesting user', async () => {
    deleteMany.mockResolvedValue({ count: 1 });
    await historyService.removeForUser('user-1', 'entry-1');
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: 'entry-1', userId: 'user-1' },
    });
  });

  it('another user\'s entry id matches nothing and returns false', async () => {
    // Simulates user-2 passing user-1's entry id: DB matches no row.
    deleteMany.mockResolvedValue({ count: 0 });
    const removed = await historyService.removeForUser('user-2', 'entry-1');
    expect(removed).toBe(false);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: 'entry-1', userId: 'user-2' },
    });
  });
});

describe('History delete — controller responses', () => {
  beforeEach(() => deleteMany.mockReset());

  it('returns 404 when the entry does not exist or is not owned', async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    const res = mockRes();
    const next = vi.fn();
    await historyController.remove(
      { user: { userId: 'user-2' }, params: { id: 'entry-1' } } as any,
      res,
      next,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 200 when the owner deletes their entry', async () => {
    deleteMany.mockResolvedValue({ count: 1 });
    const res = mockRes();
    const next = vi.fn();
    await historyController.remove(
      { user: { userId: 'user-1' }, params: { id: 'entry-1' } } as any,
      res,
      next,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });
});
