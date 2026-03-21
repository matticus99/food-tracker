import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { DateProvider, useDate } from './DateContext';
import { toLocalDateStr } from '../utils/date';
import type { ReactNode } from 'react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: ReactNode }) {
  return <DateProvider>{children}</DateProvider>;
}

const formatYMD = toLocalDateStr;

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DateContext', () => {
  it('initial date is today', () => {
    const { result } = renderHook(() => useDate(), { wrapper });

    const today = new Date();
    expect(result.current.dateStr).toBe(formatYMD(today));
  });

  it('isToday is true initially', () => {
    const { result } = renderHook(() => useDate(), { wrapper });

    expect(result.current.isToday).toBe(true);
  });

  it('dateStr is YYYY-MM-DD format', () => {
    const { result } = renderHook(() => useDate(), { wrapper });

    expect(result.current.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('goNext advances date by 1 day', () => {
    const { result } = renderHook(() => useDate(), { wrapper });

    const initialDate = new Date(result.current.date);

    act(() => {
      result.current.goNext();
    });

    const expected = new Date(initialDate);
    expected.setDate(expected.getDate() + 1);

    expect(result.current.dateStr).toBe(formatYMD(expected));
  });

  it('goPrev goes back 1 day', () => {
    const { result } = renderHook(() => useDate(), { wrapper });

    const initialDate = new Date(result.current.date);

    act(() => {
      result.current.goPrev();
    });

    const expected = new Date(initialDate);
    expected.setDate(expected.getDate() - 1);

    expect(result.current.dateStr).toBe(formatYMD(expected));
  });

  it('goToday returns to current date', () => {
    const { result } = renderHook(() => useDate(), { wrapper });

    // Navigate away first
    act(() => {
      result.current.goPrev();
      result.current.goPrev();
    });

    expect(result.current.isToday).toBe(false);

    act(() => {
      result.current.goToday();
    });

    expect(result.current.dateStr).toBe(formatYMD(new Date()));
    expect(result.current.isToday).toBe(true);
  });

  it('setDate sets a specific date', () => {
    const { result } = renderHook(() => useDate(), { wrapper });

    const target = new Date(2024, 5, 15); // June 15, 2024

    act(() => {
      result.current.setDate(target);
    });

    expect(result.current.dateStr).toBe('2024-06-15');
  });

  it('isToday becomes false when navigating away', () => {
    const { result } = renderHook(() => useDate(), { wrapper });

    expect(result.current.isToday).toBe(true);

    act(() => {
      result.current.goPrev();
    });

    expect(result.current.isToday).toBe(false);
  });

  it('throws when used outside of DateProvider', () => {
    expect(() => {
      renderHook(() => useDate());
    }).toThrow('useDate must be used within DateProvider');
  });
});
