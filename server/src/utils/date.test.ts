import { describe, it, expect, vi, afterEach } from 'vitest';
import { toLocalDateStr, daysAgo } from './date';

describe('toLocalDateStr', () => {
  it('formats a standard date correctly', () => {
    const d = new Date(2024, 5, 15); // June 15, 2024
    expect(toLocalDateStr(d)).toBe('2024-06-15');
  });

  it('pads single-digit months', () => {
    const d = new Date(2024, 0, 20); // January 20
    expect(toLocalDateStr(d)).toBe('2024-01-20');
  });

  it('pads single-digit days', () => {
    const d = new Date(2024, 11, 3); // December 3
    expect(toLocalDateStr(d)).toBe('2024-12-03');
  });

  it('pads both single-digit month and day', () => {
    const d = new Date(2024, 1, 5); // February 5
    expect(toLocalDateStr(d)).toBe('2024-02-05');
  });

  it('handles year boundaries (Dec 31)', () => {
    const d = new Date(2024, 11, 31);
    expect(toLocalDateStr(d)).toBe('2024-12-31');
  });

  it('handles year boundaries (Jan 1)', () => {
    const d = new Date(2025, 0, 1);
    expect(toLocalDateStr(d)).toBe('2025-01-01');
  });

  it('handles leap day', () => {
    const d = new Date(2024, 1, 29); // Feb 29 leap year
    expect(toLocalDateStr(d)).toBe('2024-02-29');
  });

  it('does not pad double-digit months and days', () => {
    const d = new Date(2024, 10, 25); // November 25
    expect(toLocalDateStr(d)).toBe('2024-11-25');
  });
});

describe('daysAgo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns today for 0 days ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 15)); // March 15, 2025
    expect(daysAgo(0)).toBe('2025-03-15');
  });

  it('returns yesterday for 1 day ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 15));
    expect(daysAgo(1)).toBe('2025-03-14');
  });

  it('returns 30 days ago correctly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 15)); // March 15
    expect(daysAgo(30)).toBe('2025-02-13');
  });

  it('crosses month boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 3)); // March 3
    expect(daysAgo(5)).toBe('2025-02-26');
  });

  it('crosses year boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 2)); // January 2, 2025
    expect(daysAgo(5)).toBe('2024-12-28');
  });

  it('handles leap year boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 2, 1)); // March 1, 2024 (leap year)
    expect(daysAgo(1)).toBe('2024-02-29');
  });

  it('handles non-leap year boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 1)); // March 1, 2025 (not leap year)
    expect(daysAgo(1)).toBe('2025-02-28');
  });
});
