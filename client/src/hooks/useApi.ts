import { useState, useEffect, useCallback } from 'react';

const BASE = '/api';

// ── CSRF token management ──
let csrfToken: string | null = null;

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch(`${BASE}/csrf-token`, { credentials: 'include' });
  const data = await res.json();
  csrfToken = data.token;
  return csrfToken!;
}

/** Get the current CSRF token (fetching if needed). Use for direct fetch calls. */
export async function getCsrfToken(): Promise<string> {
  return ensureCsrfToken();
}

/** Clear cached CSRF token (e.g. after auth state change) */
export function clearCsrfToken() {
  csrfToken = null;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method?.toUpperCase() ?? 'GET';
  const isMutating = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isMutating) {
    headers['X-CSRF-Token'] = await ensureCsrfToken();
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  });

  // If CSRF token was rejected, refresh and retry once
  if (res.status === 403 && isMutating) {
    csrfToken = null;
    headers['X-CSRF-Token'] = await ensureCsrfToken();
    const retry = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      headers,
      ...options,
    });
    if (!retry.ok) {
      const body = await retry.json().catch(() => ({}));
      throw new Error(body.message || `API error ${retry.status}`);
    }
    return retry.json();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error ${res.status}`);
  }
  return res.json();
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);

  // Manual refetch (no AbortController — used after mutations)
  const refetch = useCallback(() => {
    if (!path) return;
    setLoading(true);
    setError(null);
    apiFetch<T>(path)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [path]);

  // Auto-fetch on path change with AbortController cleanup
  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    apiFetch<T>(path, { signal: controller.signal })
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [path]);

  return { data, loading, error, refetch, setData };
}
