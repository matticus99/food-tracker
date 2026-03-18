import { describe, it, expect } from 'vitest';
import { toLocalDateStr } from './date';

describe('toLocalDateStr', () => {
  it('formats a typical date as YYYY-MM-DD', () => {
    const d = new Date(2026, 2, 17); // March 17, 2026
    expect(toLocalDateStr(d)).toBe('2026-03-17');
  });

  it('zero-pads single-digit months', () => {
    const d = new Date(2026, 0, 15); // January 15
    expect(toLocalDateStr(d)).toBe('2026-01-15');
  });

  it('zero-pads single-digit days', () => {
    const d = new Date(2026, 11, 5); // December 5
    expect(toLocalDateStr(d)).toBe('2026-12-05');
  });

  it('handles January 1st', () => {
    const d = new Date(2026, 0, 1);
    expect(toLocalDateStr(d)).toBe('2026-01-01');
  });

  it('handles December 31st', () => {
    const d = new Date(2026, 11, 31);
    expect(toLocalDateStr(d)).toBe('2026-12-31');
  });

  it('handles leap year Feb 29', () => {
    const d = new Date(2024, 1, 29); // Feb 29, 2024
    expect(toLocalDateStr(d)).toBe('2024-02-29');
  });

  it('handles the first day of each month', () => {
    for (let month = 0; month < 12; month++) {
      const d = new Date(2026, month, 1);
      const expected = `2026-${String(month + 1).padStart(2, '0')}-01`;
      expect(toLocalDateStr(d)).toBe(expected);
    }
  });

  it('uses local date, not UTC', () => {
    // Create a date where UTC day might differ from local day
    // This verifies we use getFullYear/getMonth/getDate (local), not getUTC* methods
    const d = new Date(2026, 5, 15, 0, 0, 0); // midnight local June 15
    expect(toLocalDateStr(d)).toBe('2026-06-15');
  });
});
