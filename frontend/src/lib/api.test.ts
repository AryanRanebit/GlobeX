// Offline tests for the session-refresh flow in api.ts.
// fetch, localStorage and window are stubbed; nothing leaves the machine.

import { beforeEach, describe, expect, it, vi } from 'vitest';

function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    _map: map,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let storage: ReturnType<typeof makeStorage>;
let dispatchEvent: ReturnType<typeof vi.fn>;
let fetchMock: ReturnType<typeof vi.fn>;
let apiFetch: typeof import('./api').apiFetch;

beforeEach(async () => {
  vi.resetModules();
  storage = makeStorage({ token: 'old-access', refreshToken: 'refresh-1', user: '{}' });
  dispatchEvent = vi.fn();
  fetchMock = vi.fn();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('window', { dispatchEvent });
  if (typeof globalThis.CustomEvent !== 'function') {
    vi.stubGlobal('CustomEvent', class CustomEvent<T> {
      type: string; detail: T | null;
      constructor(type: string, init?: { detail?: T }) { this.type = type; this.detail = init?.detail ?? null; }
    });
  }
  ({ apiFetch } = await import('./api'));
});

describe('apiFetch session refresh', () => {
  it('passes a non-401 response straight through without refreshing', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { success: true, data: [] }));
    const res = await apiFetch('/api/v1/history');
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('on 401 refreshes once, stores new tokens and replays the request with the new token', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Invalid or expired token' }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { accessToken: 'new-access', refreshToken: 'refresh-2' } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: [1, 2] }));

    const res = await apiFetch('/api/v1/history');
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const refreshCall = fetchMock.mock.calls[1];
    expect(refreshCall[0]).toBe('/api/v1/auth/refresh');
    expect(JSON.parse(refreshCall[1].body)).toEqual({ refreshToken: 'refresh-1' });

    expect(storage.getItem('token')).toBe('new-access');
    expect(storage.getItem('refreshToken')).toBe('refresh-2');

    const replay = fetchMock.mock.calls[2];
    expect(replay[1].headers.Authorization).toBe('Bearer new-access');
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it('clears the session and notifies the app when the refresh fails', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'refresh expired' }));

    const res = await apiFetch('/api/v1/history');
    expect(res.status).toBe(401);
    expect(storage.getItem('token')).toBeNull();
    expect(storage.getItem('refreshToken')).toBeNull();
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0][0].type).toBe('globex:session-expired');
  });

  it('with no stored refresh token, does not attempt a refresh', async () => {
    storage.removeItem('refreshToken');
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }));
    const res = await apiFetch('/api/v1/history');
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it('never refreshes on auth-endpoint 401s (bad login stays a login error)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: 'Invalid email or password' }));
    const res = await apiFetch('/api/v1/auth/login', { method: 'POST' });
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it('shares one refresh attempt across concurrent 401s', async () => {
    let releaseRefresh: (r: Response) => void;
    const refreshGate = new Promise<Response>((resolve) => { releaseRefresh = resolve; });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockReturnValueOnce(refreshGate as unknown as Response)
      .mockResolvedValue(jsonResponse(200, { success: true, data: [] }));

    const p1 = apiFetch('/api/v1/history');
    const p2 = apiFetch('/api/v1/buyers');
    await new Promise((r) => setTimeout(r, 10));
    releaseRefresh!(jsonResponse(200, { success: true, data: { accessToken: 'fresh' } }));
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    const refreshCalls = fetchMock.mock.calls.filter((c) => c[0] === '/api/v1/auth/refresh');
    expect(refreshCalls).toHaveLength(1);
  });
});
