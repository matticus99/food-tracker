export const CATEGORY_KEYS = [
  'favorites', 'proteins', 'grains', 'vegetables', 'fruits', 'dairy', 'snacks', 'drinks',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  favorites: 'Favorites',
  proteins: 'Proteins',
  grains: 'Grains',
  vegetables: 'Vegetables',
  fruits: 'Fruits',
  dairy: 'Dairy',
  snacks: 'Snacks',
  drinks: 'Drinks',
};

export interface CategoryConfig {
  labels?: Record<string, string>;
  pinnedCategories?: string[];
}

export function getCategoryLabel(key: string, config: CategoryConfig | null | undefined): string {
  return config?.labels?.[key] ?? DEFAULT_CATEGORY_LABELS[key] ?? key;
}
