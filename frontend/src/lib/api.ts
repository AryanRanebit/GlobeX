/**
 * Shared API client for all backend calls.
 *
 * Resolution order for the backend origin:
 *   1. VITE_API_BASE_URL (set on Vercel / production builds, e.g.
 *      https://globex-api.onrender.com) - required for production.
 *   2. Empty string -> relative /api paths. In development these hit the
 *      Vite dev-server proxy (frontend/vite.config.js -> http://localhost:3000).
 *
 * No localhost fallback is ever baked into a build: a production deploy
 * without VITE_API_BASE_URL fails visibly instead of silently calling
 * localhost:3000 from the user's browser.
 */
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

/**
 * Standard headers: JSON content type plus the Bearer token from
 * localStorage when the user is signed in. Callers can override or extend
 * via the `extra` argument.
 */
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

/**
 * fetch() wrapper that targets the configured backend origin and attaches
 * auth headers. `path` is the full API path, e.g. '/api/v1/buyers'.
 */
export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: authHeaders((options.headers as Record<string, string>) || {}),
  });
}
