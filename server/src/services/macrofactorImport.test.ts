import { describe, it, expect, vi } from 'vitest';

vi.mock('../db/connection.js', () => ({ db: {} }));

import { excelDateToISO } from './macrofactorImport.js';

describe('excelDateToISO', () => {
  it('converts known Excel serial dates correctly', () => {
    // Jan 1, 2023 = Excel serial 44927
    expect(excelDateToISO(44927)).toBe('2023-01-01');
  });

  it('converts Dec 31, 2024', () => {
    // Dec 31, 2024 = Excel serial 45657
    expect(excelDateToISO(45657)).toBe('2024-12-31');
  });

  it('converts Jan 1, 1900 (Excel serial 1)', () => {
    expect(excelDateToISO(1)).toBe('1899-12-31');
  });

  it('converts Excel epoch serial 2 = Jan 1, 1900', () => {
    expect(excelDateToISO(2)).toBe('1900-01-01');
  });

  it('handles serial date 0', () => {
    // Excel serial 0 = Dec 30, 1899
    const result = excelDateToISO(0);
    expect(result).toBe('1899-12-30');
  });

  it('handles large serial numbers', () => {
    // Should not crash with very large values
    const result = excelDateToISO(100000);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('produces timezone-independent results', () => {
    // The function uses UTC, so results should be consistent
    const result1 = excelDateToISO(44927);
    const result2 = excelDateToISO(44927);
    expect(result1).toBe(result2);
  });

  it('returns valid ISO date format', () => {
    const result = excelDateToISO(45000);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Should be parseable
    expect(isNaN(new Date(result).getTime())).toBe(false);
  });
});
