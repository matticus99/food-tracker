import { describe, it, expect } from 'vitest';
import {
  CATEGORY_KEYS,
  DEFAULT_CATEGORY_LABELS,
  getCategoryLabel,
  type CategoryConfig,
} from './categories';

describe('CATEGORY_KEYS', () => {
  it('contains all expected categories', () => {
    expect(CATEGORY_KEYS).toEqual([
      'favorites', 'proteins', 'grains', 'vegetables',
      'fruits', 'dairy', 'snacks', 'drinks',
    ]);
  });

  it('has 8 categories', () => {
    expect(CATEGORY_KEYS).toHaveLength(8);
  });
});

describe('DEFAULT_CATEGORY_LABELS', () => {
  it('has a label for every category key', () => {
    for (const key of CATEGORY_KEYS) {
      expect(DEFAULT_CATEGORY_LABELS[key]).toBeDefined();
      expect(typeof DEFAULT_CATEGORY_LABELS[key]).toBe('string');
    }
  });

  it('labels are title-cased versions of keys', () => {
    for (const key of CATEGORY_KEYS) {
      const expected = key.charAt(0).toUpperCase() + key.slice(1);
      expect(DEFAULT_CATEGORY_LABELS[key]).toBe(expected);
    }
  });
});

describe('getCategoryLabel', () => {
  it('returns the default label when config is null', () => {
    expect(getCategoryLabel('proteins', null)).toBe('Proteins');
    expect(getCategoryLabel('drinks', null)).toBe('Drinks');
  });

  it('returns the default label when config is undefined', () => {
    expect(getCategoryLabel('grains', undefined)).toBe('Grains');
  });

  it('returns the default label when config has no labels', () => {
    const config: CategoryConfig = {};
    expect(getCategoryLabel('dairy', config)).toBe('Dairy');
  });

  it('returns the default label when key is not in config labels', () => {
    const config: CategoryConfig = { labels: { proteins: 'Meat' } };
    expect(getCategoryLabel('fruits', config)).toBe('Fruits');
  });

  it('returns the custom label from config when present', () => {
    const config: CategoryConfig = {
      labels: { proteins: 'Meat & Fish', snacks: 'Treats' },
    };
    expect(getCategoryLabel('proteins', config)).toBe('Meat & Fish');
    expect(getCategoryLabel('snacks', config)).toBe('Treats');
  });

  it('returns the key itself for unknown categories with no config', () => {
    expect(getCategoryLabel('unknown_cat', null)).toBe('unknown_cat');
    expect(getCategoryLabel('custom', undefined)).toBe('custom');
  });

  it('returns the key itself for unknown categories not in defaults or config', () => {
    const config: CategoryConfig = { labels: { proteins: 'Meat' } };
    expect(getCategoryLabel('something_else', config)).toBe('something_else');
  });

  it('returns custom label for unknown category if in config', () => {
    const config: CategoryConfig = {
      labels: { custom_key: 'My Custom Category' },
    };
    expect(getCategoryLabel('custom_key', config)).toBe('My Custom Category');
  });

  it('config label takes precedence over default label', () => {
    const config: CategoryConfig = {
      labels: { favorites: 'My Faves' },
    };
    expect(getCategoryLabel('favorites', config)).toBe('My Faves');
  });

  it('handles empty string key', () => {
    expect(getCategoryLabel('', null)).toBe('');
  });

  it('handles config with empty labels object', () => {
    const config: CategoryConfig = { labels: {} };
    expect(getCategoryLabel('proteins', config)).toBe('Proteins');
  });
});
