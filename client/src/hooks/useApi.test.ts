import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { apiFetch, useApi, clearCsrfToken } from './useApi';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

function mockFetchFail(status: number, body?: Record<string, unknown>) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: body ? () => Promise.resolve(body) : () => Promise.reject(new Error('no json')),
  });
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  clearCsrfToken();
  vi.stubGlobal('fetch', mockFetchOk({}));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── apiFetch tests ───────────────────────────────────────────────────────────

describe('apiFetch', () => {
  it('makes correct request with JSON headers and credentials', async () => {
    const payload = { id: 1, name: 'Apple' };
    vi.stubGlobal('fetch', mockFetchOk(payload));

    const result = await apiFetch<{ id: number; name: string }>('/foods/1');

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith('/api/foods/1', {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toEqual(payload);
  });

  it('fetches CSRF token for mutating requests', async () => {
    const csrfResponse = { token: 'test-csrf-token' };
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(csrfResponse) })   // csrf fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) });  // actual POST

    vi.stubGlobal('fetch', fetchFn);

    await apiFetch('/foods', {
      method: 'POST',
      body: JSON.stringify({ name: 'Banana' }),
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    // First call: CSRF token fetch
    expect(fetchFn).toHaveBeenNthCalledWith(1, '/api/csrf-token', { credentials: 'include' });
    // Second call: actual POST with CSRF header
    expect(fetchFn).toHaveBeenNthCalledWith(2, '/api/foods', {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-csrf-token' },
      method: 'POST',
      body: JSON.stringify({ name: 'Banana' }),
    });
  });

  it('throws on non-ok response with generic message', async () => {
    vi.stubGlobal('fetch', mockFetchFail(500));

    await expect(apiFetch('/bad')).rejects.toThrow('API error 500');
  });

  it('extracts error message from response body', async () => {
    vi.stubGlobal('fetch', mockFetchFail(422, { message: 'Validation failed' }));

    await expect(apiFetch('/bad')).rejects.toThrow('Validation failed');
  });
});

// ── useApi tests ─────────────────────────────────────────────────────────────

describe('useApi', () => {
  it('starts with loading=true when path is provided', () => {
    vi.stubGlobal('fetch', mockFetchOk({ items: [] }));

    const { result } = renderHook(() => useApi('/foods'));

    // Immediately after render, loading should be true
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns data after fetch resolves', async () => {
    const foods = [{ id: 1, name: 'Apple' }];
    vi.stubGlobal('fetch', mockFetchOk(foods));

    const { result } = renderHook(() => useApi<typeof foods>('/foods'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(foods);
    expect(result.current.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetchFail(404, { message: 'Not found' }));

    const { result } = renderHook(() => useApi('/foods/999'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Not found');
    expect(result.current.data).toBeNull();
  });

  it('does not fetch when path is null', async () => {
    const fetchSpy = mockFetchOk({});
    vi.stubGlobal('fetch', fetchSpy);

    const { result } = renderHook(() => useApi(null));

    // Give it a tick to ensure nothing fires
    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refetch re-fetches data', async () => {
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount += 1;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ count: callCount }),
        });
      }),
    );

    const { result } = renderHook(() => useApi<{ count: number }>('/counter'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toEqual({ count: 1 });

    // Trigger a refetch
    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ count: 2 });
    });

    expect(callCount).toBe(2);
  });

  it('re-fetches when path changes', async () => {
    const fetchFn = vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ url }),
      }),
    );
    vi.stubGlobal('fetch', fetchFn);

    const { result, rerender } = renderHook(
      ({ path }: { path: string }) => useApi<{ url: string }>(path),
      { initialProps: { path: '/foods' } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toEqual({ url: '/api/foods' });

    // Change the path
    rerender({ path: '/weight' });

    await waitFor(() => {
      expect(result.current.data).toEqual({ url: '/api/weight' });
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn).toHaveBeenLastCalledWith('/api/weight', expect.any(Object));
  });
});
