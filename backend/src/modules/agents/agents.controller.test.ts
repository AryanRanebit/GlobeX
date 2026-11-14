import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { agentsController } from './agents.controller';

// Offline regression coverage for the agent-service proxy handlers.
// fetch is mocked: no network, no paid calls.

const BASE = process.env.AGENT_SERVICE_URL || 'http://localhost:8000/api/v1';

const routes: [keyof typeof agentsController, string][] = [
  ['scoreLeadDirect', '/agents/lead-scoring'],
  ['generateOutreachDirect', '/agents/outreach'],
  ['assessComplianceDirect', '/agents/compliance'],
  ['understandProductDirect', '/agents/product-understanding'],
  ['lookupHsCodeDirect', '/tools/hs-code'],
  ['calculateDutyDirect', '/tools/duty-calculator'],
  ['generateInvoiceDirect', '/tools/invoice'],
  ['generatePackingListDirect', '/tools/packing-list'],
];

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('agentsController proxy handlers', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('exposes exactly the expected handlers', () => {
    expect(Object.keys(agentsController).sort()).toEqual(routes.map(([k]) => k).sort());
  });

  it.each(routes)('%s forwards POST + JSON body to %s and relays status/data', async (name, path) => {
    const body = { product: 'rice', n: 1 };
    fetchMock.mockResolvedValue({ status: 201, json: async () => ({ ok: true }) });
    const res = mockRes();
    const next = vi.fn();
    await agentsController[name]({ body } as any, res, next);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}${path}`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(JSON.stringify(body));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: { ok: true } });
    expect(next).not.toHaveBeenCalled();
  });

  it.each(routes)('%s relays upstream error statuses unchanged', async (name) => {
    fetchMock.mockResolvedValue({ status: 503, json: async () => ({ detail: 'down' }) });
    const res = mockRes();
    await agentsController[name]({ body: {} } as any, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ data: { detail: 'down' } });
  });

  it.each(routes)('%s passes network failures to next()', async (name) => {
    const err = new Error('boom');
    fetchMock.mockRejectedValue(err);
    const res = mockRes();
    const next = vi.fn();
    await agentsController[name]({ body: {} } as any, res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
  });

  it.each(routes)('%s passes invalid-JSON upstream errors to next()', async (name) => {
    fetchMock.mockResolvedValue({ status: 502, json: async () => { throw new SyntaxError('bad json'); } });
    const next = vi.fn();
    await agentsController[name]({ body: {} } as any, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each(routes)('%s timeout signal only on product-understanding', async (name) => {
    fetchMock.mockResolvedValue({ status: 200, json: async () => ({}) });
    await agentsController[name]({ body: {} } as any, mockRes(), vi.fn());
    const init = fetchMock.mock.calls[0][1];
    if (name === 'understandProductDirect') {
      expect(init.signal).toBeInstanceOf(AbortSignal);
    } else {
      expect(init.signal).toBeUndefined();
    }
  });

  it('product-understanding uses a 20s timeout', async () => {
    const spy = vi.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValue({ status: 200, json: async () => ({}) });
    await agentsController.understandProductDirect({ body: {} } as any, mockRes(), vi.fn());
    expect(spy).toHaveBeenCalledWith(20000);
    spy.mockRestore();
  });
});
