const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

/**
 * Session handling. The backend issues an access token (short-lived) and a
 * refresh token at login. Before this file handled 401s, an expired access
 * token meant every screen failed with raw "Invalid or expired token" errors
 * until the user logged in again. Now a 401 triggers one refresh attempt and
 * the original request is replayed once. If the refresh itself fails, the
 * session is cleared and a 'globex:session-expired' event notifies the app so
 * it can show the sign-in prompt instead of broken screens.
 */

const SESSION_EXPIRED_EVENT = 'globex:session-expired';

export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  let token: string | null = null;
  try {
    token = localStorage.getItem('token');
  } catch {
    token = null;
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function storeTokens(tokens: { accessToken?: string; refreshToken?: string }): boolean {
  if (!tokens || typeof tokens.accessToken !== 'string' || !tokens.accessToken) return false;
  localStorage.setItem('token', tokens.accessToken);
  if (typeof tokens.refreshToken === 'string' && tokens.refreshToken) {
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }
  return true;
}

function clearSession(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

// Single in-flight refresh so several simultaneous 401s share one attempt.
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const body = await res.json().catch(() => null);
    const tokens = body?.data ?? body;
    return storeTokens(tokens ?? {});
  } catch {
    return false;
  }
}

function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

function notifySessionExpired(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
}

/**
 * fetch() wrapper that targets the configured backend origin, attaches auth
 * headers, and transparently refreshes an expired access token once.
 * Auth endpoints are excluded: a 401 there is a real login failure, not an
 * expired session.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const call = () => fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: authHeaders((options.headers as Record<string, string>) || {}),
  });

  let res = await call();
  if (res.status !== 401 || path.startsWith('/api/v1/auth/')) return res;

  if (await tryRefresh()) {
    res = await call();
  }
  if (res.status === 401) {
    clearSession();
    notifySessionExpired();
  }
  return res;
}

export const __testing = { SESSION_EXPIRED_EVENT, storeTokens, clearSession };
