import { useState, useEffect } from 'react';
import { useApi, apiFetch } from '../../hooks/useApi';
import { getCategoryLabel, type CategoryConfig } from '../../constants/categories';
import styles from './AddFoodModal.module.css';

interface Food {
  id: string;
  name: string;
  emoji: string | null;
  category: string;
  servingLabel: string;
  servingGrams: string | null;
  calories: string | null;
  protein: string | null;
  fat: string | null;
  carbs: string | null;
}

interface SelectedFood {
  food: Food;
  servings: number;
}

interface Props {
  open: boolean;
  hour: number;
  date: string;
  onClose: () => void;
  onAdded: () => void;
  categoryConfig?: CategoryConfig | null;
}

export default function AddFoodModal({ open, hour, date, onClose, onAdded, categoryConfig }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('favorites');
  const [selections, setSelections] = useState<Map<string, SelectedFood>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filter !== 'all') params.set('category', filter);
  const query = params.toString() ? `?${params}` : '';
  const { data: foods } = useApi<Food[]>(open ? `/foods${query}` : null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setFilter('favorites');
      setSelections(new Map());
    }
  }, [open]);

  function toggleFood(food: Food) {
    setSelections(prev => {
      const next = new Map(prev);
      if (next.has(food.id)) {
        next.delete(food.id);
      } else {
        next.set(food.id, { food, servings: 1 });
      }
      return next;
    });
  }

  function updateServings(foodId: string, delta: number) {
    setSelections(prev => {
      const next = new Map(prev);
      const item = next.get(foodId);
      if (!item) return prev;
      const newServings = Math.max(0.5, item.servings + delta);
      next.set(foodId, { ...item, servings: newServings });
      return next;
    });
  }

  async function handleSave() {
    if (selections.size === 0) return;
    setSubmitting(true);
    try {
      const entries = Array.from(selections.values()).map(({ food, servings }) => ({
        foodId: food.id,
        date,
        timeHour: hour,
        servings,
      }));
      await apiFetch('/log/batch', {
        method: 'POST',
        body: JSON.stringify({ entries }),
      });
      onAdded();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const formatHour = (h: number) => {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Add Food — {formatHour(hour)}</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.filterTabs}>
          {[
            { value: 'favorites', label: getCategoryLabel('favorites', categoryConfig) },
            ...(categoryConfig?.pinnedCategories ?? []).map((key) => ({
              value: key,
              label: getCategoryLabel(key, categoryConfig),
            })),
            { value: 'all', label: 'All Foods' },
          ].map((tab) => (
            <button
              key={tab.value}
              className={`${styles.filterTab} ${filter === tab.value ? styles.filterTabActive : ''}`}
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {selections.size > 0 && (
          <div className={styles.selectionTray}>
            {Array.from(selections.values()).map(({ food, servings }) => (
              <div key={food.id} className={styles.chip}>
                <span className={styles.chipEmoji}>{food.emoji || '🍽️'}</span>
                <div className={styles.chipStepper}>
                  <button className={styles.chipStepperBtn} onClick={() => updateServings(food.id, -0.5)}>−</button>
                  <span className={styles.chipCount}>{servings}</span>
                  <button className={styles.chipStepperBtn} onClick={() => updateServings(food.id, 0.5)}>+</button>
                </div>
                <button className={styles.chipRemove} onClick={() => toggleFood(food)}>×</button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.list}>
          {foods?.map((food) => {
            const isSelected = selections.has(food.id);
            return (
              <button
                key={food.id}
                className={`${styles.foodItem} ${isSelected ? styles.foodItemSelected : ''}`}
                onClick={() => toggleFood(food)}
              >
                <span className={styles.checkmark}>{isSelected ? '✓' : ''}</span>
                <span className={styles.foodEmoji}>{food.emoji || '🍽️'}</span>
                <div className={styles.foodInfo}>
                  <span className={styles.foodName}>{food.name}</span>
                  <span className={styles.foodMeta}>
                    {food.servingLabel}
                    {food.calories ? ` · ${Number(food.calories)} cal` : ''}
                  </span>
                </div>
              </button>
            );
          })}
          {foods?.length === 0 && (
            <p className={styles.empty}>No foods found</p>
          )}
        </div>

        <div className={styles.bottomBar}>
          {selections.size > 0 && (
            <button className={styles.saveBtn} onClick={handleSave} disabled={submitting}>
              {submitting ? 'Saving...' : `Save ${selections.size} food${selections.size > 1 ? 's' : ''}`}
            </button>
          )}
          <input
            className={styles.search}
            type="text"
            placeholder="Search foods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
