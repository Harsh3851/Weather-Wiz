import type { ApiErrorBody, PublicUser } from '@weatherwiz/shared';
import { API_URL } from '../config';
import { ApiError } from './errors';

/**
 * Minimal fetch wrapper for the Weather Wiz API.
 * - Keeps the short-lived access token in memory only (never localStorage).
 * - On a 401 for an authenticated call, performs one silent refresh using the
 *   httpOnly refresh cookie and retries. Concurrent 401s share a single refresh.
 */

export interface SessionResponse {
  user: PublicUser;
  accessToken: string;
}

let accessToken: string | null = null;
let refreshInFlight: Promise<SessionResponse | null> | null = null;
const listeners = new Set<(session: SessionResponse | null) => void>();

export const tokenStore = {
  get: () => accessToken,
  set(token: string | null) {
    accessToken = token;
  },
  /** Notified when a silent refresh succeeds or the session is lost. */
  subscribe(fn: (session: SessionResponse | null) => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

const REQUEST_TIMEOUT_MS = 15_000;

async function parseError(res: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> | undefined;
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    /* not JSON */
  }
  const e = body?.error;
  return new ApiError(
    e?.message ?? `Request failed (HTTP ${res.status})`,
    res.status,
    e?.code ?? 'HTTP_ERROR',
    e?.details,
  );
}

async function rawRequest(
  path: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException('Timeout', 'TimeoutError')),
    REQUEST_TIMEOUT_MS,
  );
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    return await fetch(`${API_URL}/api${path}`, {
      ...init,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    if (err instanceof DOMException && (err.name === 'TimeoutError' || controller.signal.aborted)) {
      throw new ApiError('The server took too long to respond', 0, 'TIMEOUT');
    }
    throw new ApiError(
      'Cannot reach the Weather Wiz server. Check your connection.',
      0,
      'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export function refreshSession(): Promise<SessionResponse | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await rawRequest('/auth/refresh', { method: 'POST' });
        if (!res.ok) {
          tokenStore.set(null);
          listeners.forEach((fn) => fn(null));
          return null;
        }
        const session = (await res.json()) as SessionResponse;
        tokenStore.set(session.accessToken);
        listeners.forEach((fn) => fn(session));
        return session;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const build = (): RequestInit => {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (opts.body !== undefined) headers['content-type'] = 'application/json';
    if (opts.auth && accessToken) headers.authorization = `Bearer ${accessToken}`;
    return {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    };
  };

  let res = await rawRequest(path, build(), opts.signal);
  if (res.status === 401 && opts.auth) {
    const session = await refreshSession();
    if (session) res = await rawRequest(path, build(), opts.signal);
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
