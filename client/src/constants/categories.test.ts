import { describe, it, expect } from 'vitest';
import {
  CATEGORY_KEYS,
  BUILTIN_CATEGORIES,
  DEFAULT_CATEGORY_LABELS,
  getCategoryLabel,
  getAllCategories,
  type CategoryConfig,
} from './categories';

describe('BUILTIN_CATEGORIES', () => {
  it('contains favorites and daily', () => {
    expect(BUILTIN_CATEGORIES).toEqual(['favorites', 'daily']);
  });

  it('has 2 built-in categories', () => {
    expect(BUILTIN_CATEGORIES).toHaveLength(2);
  });
});

describe('CATEGORY_KEYS (backward compat)', () => {
  it('is the same as BUILTIN_CATEGORIES', () => {
    expect(CATEGORY_KEYS).toBe(BUILTIN_CATEGORIES);
  });
});

describe('DEFAULT_CATEGORY_LABELS', () => {
  it('has a label for every built-in category', () => {
    for (const key of BUILTIN_CATEGORIES) {
      expect(DEFAULT_CATEGORY_LABELS[key]).toBeDefined();
      expect(typeof DEFAULT_CATEGORY_LABELS[key]).toBe('string');
    }
  });

  it('labels are title-cased versions of keys', () => {
    for (const key of BUILTIN_CATEGORIES) {
      const expected = key.charAt(0).toUpperCase() + key.slice(1);
      expect(DEFAULT_CATEGORY_LABELS[key]).toBe(expected);
    }
  });
});

describe('getAllCategories', () => {
  it('returns builtins when config is null', () => {
    expect(getAllCategories(null)).toEqual(['favorites', 'daily']);
  });

  it('returns builtins when config is undefined', () => {
    expect(getAllCategories(undefined)).toEqual(['favorites', 'daily']);
  });

  it('appends custom categories', () => {
    const config: CategoryConfig = { customCategories: ['snacks', 'drinks'] };
    expect(getAllCategories(config)).toEqual(['favorites', 'daily', 'snacks', 'drinks']);
  });

  it('returns builtins when customCategories is empty', () => {
    const config: CategoryConfig = { customCategories: [] };
    expect(getAllCategories(config)).toEqual(['favorites', 'daily']);
  });
});

describe('getCategoryLabel', () => {
  it('returns the default label when config is null', () => {
    expect(getCategoryLabel('favorites', null)).toBe('Favorites');
    expect(getCategoryLabel('daily', null)).toBe('Daily');
  });

  it('returns the default label when config is undefined', () => {
    expect(getCategoryLabel('favorites', undefined)).toBe('Favorites');
  });

  it('returns the default label when config has no labels', () => {
    const config: CategoryConfig = {};
    expect(getCategoryLabel('daily', config)).toBe('Daily');
  });

  it('returns the default label when key is not in config labels', () => {
    const config: CategoryConfig = { labels: { favorites: 'My Faves' } };
    expect(getCategoryLabel('daily', config)).toBe('Daily');
  });

  it('returns the custom label from config when present', () => {
    const config: CategoryConfig = {
      labels: { favorites: 'My Faves', snacks: 'Treats' },
    };
    expect(getCategoryLabel('favorites', config)).toBe('My Faves');
    expect(getCategoryLabel('snacks', config)).toBe('Treats');
  });

  it('auto-capitalizes unknown categories with no config', () => {
    expect(getCategoryLabel('unknown_cat', null)).toBe('Unknown_cat');
    expect(getCategoryLabel('custom', undefined)).toBe('Custom');
  });

  it('auto-capitalizes unknown categories not in defaults or config', () => {
    const config: CategoryConfig = { labels: { favorites: 'Faves' } };
    expect(getCategoryLabel('something_else', config)).toBe('Something_else');
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
    expect(getCategoryLabel('favorites', config)).toBe('Favorites');
  });
});
