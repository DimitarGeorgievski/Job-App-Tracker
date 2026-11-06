import { dashboardEnv } from './env';

const API_BASE = dashboardEnv.NEXT_PUBLIC_API_URL;

type RefreshOutcome =
  | { kind: 'success' }
  | { kind: 'unauthenticated'; reason: string }
  | { kind: 'network-error' }
  | { kind: '5xx'; statusCode: number };

export type AuthResult =
  | { kind: 'authenticated'; user: { id: string; email: string } }
  | { kind: 'unauthenticated'; reason: string }
  | { kind: 'api-unavailable'; reason: 'network' | '5xx' }
  | { kind: 'coordination-error'; reason: string }
  | { kind: 'api-unavailable'; reason: 'network' | '5xx' | 'unexpected' };

async function refreshRotation(): Promise<RefreshOutcome> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) return { kind: 'success' };
    if (res.status >= 500) return { kind: '5xx', statusCode: res.status };
    if (res.status === 401 || res.status === 403)
      return { kind: 'unauthenticated', reason: 'refresh-token-invalid' };
    return { kind: 'network-error' };
  } catch (e) {
    return { kind: 'network-error' };
  }
}

async function apiMe(): Promise<AuthResult> {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (response.ok) {
      const user = await response.json();
      if (user) {
        return { kind: 'authenticated', user };
      }
      return { kind: 'unauthenticated', reason: 'invalid-user' };
    }

    if (response.status === 401) {
      if (typeof navigator !== 'undefined' && 'locks' in navigator) {
        try {
          const result = await navigator.locks.request(
            'squidflag-auth',
            async (): Promise<AuthResult> => {
              const recheck = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
              if (recheck.ok) {
                const user = await recheck.json();
                if (user) {
                  return { kind: 'authenticated', user };
                }
                return { kind: 'unauthenticated', reason: 'invalid-user' };
              }
              if (recheck.status === 401) {
                const refresh = await refreshRotation();
                if (refresh.kind === 'success') {
                  const retry = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
                  if (retry.ok) {
                    const user = await retry.json();
                    if (user) {
                      return { kind: 'authenticated', user };
                    }
                    return { kind: 'unauthenticated', reason: 'invalid-user' };
                  }
                  if (retry.status >= 500) {
                    return { kind: 'api-unavailable', reason: '5xx' };
                  }
                  if (!retry.ok) {
                    return { kind: 'api-unavailable', reason: 'network' };
                  }
                  return { kind: 'unauthenticated', reason: 'invalid-user' };
                }
                if (refresh.kind === 'unauthenticated') {
                  return { kind: 'unauthenticated', reason: refresh.reason };
                }
                return {
                  kind: 'api-unavailable',
                  reason: refresh.kind === '5xx' ? '5xx' : 'network',
                };
              }
              if (recheck.status >= 500) {
                return { kind: 'api-unavailable', reason: '5xx' };
              }
              if (!recheck.ok) {
                return { kind: 'api-unavailable', reason: 'network' };
              }
              return { kind: 'unauthenticated', reason: 'unexpected' };
            },
          );
          return result;
        } catch (lockError) {
          return { kind: 'coordination-error', reason: String(lockError) };
        }
      } else {
        return { kind: 'coordination-error', reason: 'locks-unavailable' };
      }
    }

    if (response.status >= 500) {
      return { kind: 'api-unavailable', reason: '5xx' };
    }
    if (response.status === 0) {
      return { kind: 'api-unavailable', reason: 'network' };
    }
    return { kind: 'unauthenticated', reason: 'non-401-4xx' };
  } catch (e) {
    return { kind: 'api-unavailable', reason: 'network' };
  }
}

export { refreshRotation, apiMe };
