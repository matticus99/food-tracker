import { describe, it, expect } from 'vitest';
import {
  convertToGrams,
  convertFromGrams,
  convertAmount,
  toServings,
  formatAmount,
  OZ_TO_G,
  LB_TO_G,
} from './unitConversions';

describe('convertToGrams', () => {
  it('returns grams unchanged', () => {
    expect(convertToGrams(100, 'g', 50)).toBe(100);
  });

  it('converts ounces to grams', () => {
    expect(convertToGrams(1, 'oz', 0)).toBeCloseTo(OZ_TO_G);
    expect(convertToGrams(2, 'oz', 0)).toBeCloseTo(2 * OZ_TO_G);
  });

  it('converts pounds to grams', () => {
    expect(convertToGrams(1, 'lb', 0)).toBeCloseTo(LB_TO_G);
    expect(convertToGrams(0.5, 'lb', 0)).toBeCloseTo(0.5 * LB_TO_G);
  });

  it('converts servings to grams using servingGrams', () => {
    expect(convertToGrams(1, 'serving', 50)).toBe(50);
    expect(convertToGrams(2, 'serving', 30)).toBe(60);
    expect(convertToGrams(0.5, 'serving', 100)).toBe(50);
  });

  it('handles zero value', () => {
    expect(convertToGrams(0, 'g', 50)).toBe(0);
    expect(convertToGrams(0, 'oz', 50)).toBe(0);
    expect(convertToGrams(0, 'lb', 50)).toBe(0);
    expect(convertToGrams(0, 'serving', 50)).toBe(0);
  });

  it('handles zero servingGrams', () => {
    expect(convertToGrams(3, 'serving', 0)).toBe(0);
  });
});

describe('convertFromGrams', () => {
  it('returns grams unchanged', () => {
    expect(convertFromGrams(100, 'g', 50)).toBe(100);
  });

  it('converts grams to ounces', () => {
    expect(convertFromGrams(OZ_TO_G, 'oz', 0)).toBeCloseTo(1);
    expect(convertFromGrams(2 * OZ_TO_G, 'oz', 0)).toBeCloseTo(2);
  });

  it('converts grams to pounds', () => {
    expect(convertFromGrams(LB_TO_G, 'lb', 0)).toBeCloseTo(1);
    expect(convertFromGrams(2 * LB_TO_G, 'lb', 0)).toBeCloseTo(2);
  });

  it('converts grams to servings', () => {
    expect(convertFromGrams(50, 'serving', 50)).toBe(1);
    expect(convertFromGrams(100, 'serving', 50)).toBe(2);
    expect(convertFromGrams(25, 'serving', 50)).toBe(0.5);
  });

  it('returns 1 when servingGrams is 0 for serving unit', () => {
    expect(convertFromGrams(100, 'serving', 0)).toBe(1);
    expect(convertFromGrams(0, 'serving', 0)).toBe(1);
  });

  it('handles zero grams', () => {
    expect(convertFromGrams(0, 'g', 50)).toBe(0);
    expect(convertFromGrams(0, 'oz', 50)).toBe(0);
    expect(convertFromGrams(0, 'lb', 50)).toBe(0);
    expect(convertFromGrams(0, 'serving', 50)).toBe(0);
  });
});

describe('convertAmount', () => {
  it('returns same value when units match', () => {
    expect(convertAmount(42, 'g', 'g', 50)).toBe(42);
    expect(convertAmount(3, 'oz', 'oz', 50)).toBe(3);
    expect(convertAmount(2, 'serving', 'serving', 50)).toBe(2);
  });

  it('converts between different units', () => {
    expect(convertAmount(1, 'lb', 'oz', 0)).toBeCloseTo(LB_TO_G / OZ_TO_G);
    expect(convertAmount(1, 'oz', 'g', 0)).toBeCloseTo(OZ_TO_G);
    expect(convertAmount(OZ_TO_G, 'g', 'oz', 0)).toBeCloseTo(1);
  });

  it('converts between servings and grams', () => {
    expect(convertAmount(2, 'serving', 'g', 50)).toBe(100);
    expect(convertAmount(100, 'g', 'serving', 50)).toBe(2);
  });

  it('round-trips g -> oz -> g', () => {
    const original = 250;
    const oz = convertAmount(original, 'g', 'oz', 0);
    const backToG = convertAmount(oz, 'oz', 'g', 0);
    expect(backToG).toBeCloseTo(original);
  });

  it('round-trips g -> lb -> g', () => {
    const original = 500;
    const lb = convertAmount(original, 'g', 'lb', 0);
    const backToG = convertAmount(lb, 'lb', 'g', 0);
    expect(backToG).toBeCloseTo(original);
  });

  it('round-trips g -> serving -> g', () => {
    const original = 150;
    const servings = convertAmount(original, 'g', 'serving', 30);
    const backToG = convertAmount(servings, 'serving', 'g', 30);
    expect(backToG).toBeCloseTo(original);
  });

  it('round-trips oz -> lb -> oz', () => {
    const original = 8;
    const lb = convertAmount(original, 'oz', 'lb', 0);
    const backToOz = convertAmount(lb, 'lb', 'oz', 0);
    expect(backToOz).toBeCloseTo(original);
  });

  it('handles zero value conversion', () => {
    expect(convertAmount(0, 'g', 'oz', 50)).toBe(0);
    expect(convertAmount(0, 'lb', 'serving', 50)).toBe(0);
  });
});

describe('toServings', () => {
  it('converts grams to servings', () => {
    expect(toServings(100, 'g', 50)).toBe(2);
    expect(toServings(25, 'g', 50)).toBe(0.5);
  });

  it('converts ounces to servings', () => {
    const servingGrams = 50;
    const result = toServings(1, 'oz', servingGrams);
    expect(result).toBeCloseTo(OZ_TO_G / servingGrams);
  });

  it('converts pounds to servings', () => {
    const servingGrams = 100;
    const result = toServings(1, 'lb', servingGrams);
    expect(result).toBeCloseTo(LB_TO_G / servingGrams);
  });

  it('keeps servings as servings', () => {
    expect(toServings(3, 'serving', 50)).toBe(3);
  });

  it('handles zero servingGrams', () => {
    // convertToGrams(5, 'g', 0) = 5, convertFromGrams(5, 'serving', 0) = 1
    expect(toServings(5, 'g', 0)).toBe(1);
  });
});

describe('formatAmount', () => {
  it('formats zero', () => {
    expect(formatAmount(0)).toBe('0');
  });

  it('formats integers without decimals', () => {
    expect(formatAmount(1)).toBe('1');
    expect(formatAmount(100)).toBe('100');
    expect(formatAmount(42)).toBe('42');
  });

  it('formats decimals up to 2 places', () => {
    expect(formatAmount(1.5)).toBe('1.5');
    expect(formatAmount(2.25)).toBe('2.25');
    expect(formatAmount(0.75)).toBe('0.75');
  });

  it('truncates beyond 2 decimal places', () => {
    expect(formatAmount(1.999)).toBe('2');
    expect(formatAmount(1.234)).toBe('1.23');
    expect(formatAmount(3.14159)).toBe('3.14');
  });

  it('removes trailing zeros after rounding', () => {
    expect(formatAmount(1.10)).toBe('1.1');
    expect(formatAmount(2.00)).toBe('2');
    expect(formatAmount(1.200)).toBe('1.2');
  });

  it('handles very small values', () => {
    expect(formatAmount(0.001)).toBe('0');
    expect(formatAmount(0.005)).toBe('0.01');
    expect(formatAmount(0.01)).toBe('0.01');
  });

  it('handles large values', () => {
    expect(formatAmount(10000)).toBe('10000');
    expect(formatAmount(9999.99)).toBe('9999.99');
  });
});
