export const BUILTIN_CATEGORIES = ['favorites', 'daily'] as const;

export type BuiltinCategory = (typeof BUILTIN_CATEGORIES)[number];

// CATEGORY_KEYS kept for backward compat — same as BUILTIN_CATEGORIES
export const CATEGORY_KEYS = BUILTIN_CATEGORIES;

export const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  favorites: 'Favorites',
  daily: 'Daily',
};

export interface CategoryConfig {
  labels?: Record<string, string>;
  pinnedCategories?: string[];
  customCategories?: string[];
}

export function getCategoryLabel(key: string, config: CategoryConfig | null | undefined): string {
  return config?.labels?.[key] ?? DEFAULT_CATEGORY_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** Returns all category keys: builtins + custom */
export function getAllCategories(config: CategoryConfig | null | undefined): string[] {
  const custom = config?.customCategories ?? [];
  return [...BUILTIN_CATEGORIES, ...custom];
}
