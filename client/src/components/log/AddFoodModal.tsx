import { useState, useEffect, useRef } from 'react';
import { useApi, apiFetch } from '../../hooks/useApi';
import { getAllCategories, getCategoryLabel, type CategoryConfig } from '../../constants/categories';
import { TIME_BLOCKS, hourToBlock } from '../../constants/timeBlocks';
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

function ModalAccordionCard({
  categoryKey,
  label,
  count,
  expanded,
  onToggle,
  search,
  selections,
  onToggleFood,
  onSelectAll,
}: {
  categoryKey: string;
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  search: string;
  selections: Map<string, SelectedFood>;
  onToggleFood: (food: Food) => void;
  onSelectAll: (foods: Food[]) => void;
}) {
  const params = new URLSearchParams({ category: categoryKey });
  if (search) params.set('search', search);
  const apiPath = expanded ? `/foods?${params}` : null;
  const { data: foods, loading } = useApi<Food[]>(apiPath);

  const allSelected = foods && foods.length > 0 && foods.every((f) => selections.has(f.id));

  return (
    <div className={`${styles.accordionCard} ${expanded ? styles.accordionExpanded : ''}`}>
      <button className={styles.accordionHeader} onClick={onToggle}>
        <span className={styles.accordionLabel}>{label}</span>
        <span className={styles.accordionCount}>{count}</span>
        <span className={styles.accordionChevron}>{expanded ? '\u25BE' : '\u25B8'}</span>
      </button>
      <div className={styles.accordionBody}>
        <div className={styles.accordionBodyInner}>
          {expanded && (
            <>
              {loading && !foods ? (
                <div className={styles.accordionLoading}>Loading...</div>
              ) : foods && foods.length > 0 ? (
                <>
                  <button
                    className={`${styles.selectAllBtn} ${allSelected ? styles.selectAllActive : ''}`}
                    onClick={() => onSelectAll(foods)}
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                  {foods.map((food) => {
                    const isSelected = selections.has(food.id);
                    return (
                      <button
                        key={food.id}
                        className={`${styles.foodItem} ${isSelected ? styles.foodItemSelected : ''}`}
                        onClick={() => onToggleFood(food)}
                      >
                        <span className={styles.checkmark}>{isSelected ? '\u2713' : ''}</span>
                        <span className={styles.foodEmoji}>{food.emoji || '\u{1F37D}\uFE0F'}</span>
                        <div className={styles.foodInfo}>
                          <span className={styles.foodName}>{food.name}</span>
                          <span className={styles.foodMeta}>
                            {food.servingLabel}
                            {food.calories ? ` \u00B7 ${Number(food.calories)} cal` : ''}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </>
              ) : (
                <p className={styles.accordionEmpty}>No foods</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AddFoodModal({ open, hour, date, onClose, onAdded, categoryConfig }: Props) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selections, setSelections] = useState<Map<string, SelectedFood>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(() => hourToBlock(hour));
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const countsQs = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '';
  const { data: counts } = useApi<Record<string, number>>(open ? `/foods/counts${countsQs}` : null);

  // Debounce search
  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timerRef.current);
  }, [search]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setDebouncedSearch('');
      setExpandedCategory(null);
      setSelections(new Map());
      setSelectedBlock(hourToBlock(hour));
    }
  }, [open, hour]);

  // Auto-expand first matching category on search
  const prevSearch = useRef(debouncedSearch);
  useEffect(() => {
    if (debouncedSearch && debouncedSearch !== prevSearch.current && counts) {
      const allCats = getAllCategories(categoryConfig);
      const dbOnly = Object.keys(counts).filter((k) => !allCats.includes(k) && (counts[k] ?? 0) > 0);
      const all = [...allCats, ...dbOnly];
      const first = all.find((k) => (counts[k] ?? 0) > 0);
      setExpandedCategory(first ?? null);
    } else if (!debouncedSearch && prevSearch.current) {
      setExpandedCategory(null);
    }
    prevSearch.current = debouncedSearch;
  }, [debouncedSearch, counts, categoryConfig]);

  const allCategories = (() => {
    const defined = getAllCategories(categoryConfig);
    const dbOnly = counts
      ? Object.keys(counts).filter((k) => !defined.includes(k) && (counts[k] ?? 0) > 0)
      : [];
    return [...defined, ...dbOnly];
  })();

  const visibleCategories = allCategories.filter((key) => {
    if (!debouncedSearch) return true;
    return (counts?.[key] ?? 0) > 0;
  });

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

  function handleSelectAll(foods: Food[]) {
    setSelections(prev => {
      const next = new Map(prev);
      const allSelected = foods.every((f) => next.has(f.id));
      if (allSelected) {
        foods.forEach((f) => next.delete(f.id));
      } else {
        foods.forEach((f) => {
          if (!next.has(f.id)) next.set(f.id, { food: f, servings: 1 });
        });
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
    const saveHour = TIME_BLOCKS.find(b => b.key === selectedBlock)?.hour ?? hour;
    try {
      const entries = Array.from(selections.values()).map(({ food, servings }) => ({
        foodId: food.id,
        date,
        timeHour: saveHour,
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

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Add Food</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.timePicker}>
          {TIME_BLOCKS.map((block) => (
            <button
              key={block.key}
              className={`${styles.timeBlock} ${selectedBlock === block.key ? styles.timeBlockActive : ''}`}
              data-time={block.key}
              onClick={() => setSelectedBlock(block.key)}
            >
              <span className={styles.timeIcon}>{block.icon}</span>
              <span className={styles.timeLabel}>{block.label}</span>
            </button>
          ))}
        </div>

        {selections.size > 0 && (
          <div className={styles.selectionTray}>
            {Array.from(selections.values()).map(({ food, servings }) => (
              <div key={food.id} className={styles.chip}>
                <span className={styles.chipEmoji}>{food.emoji || '\u{1F37D}\uFE0F'}</span>
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
          {visibleCategories.map((key) => (
            <ModalAccordionCard
              key={key}
              categoryKey={key}
              label={getCategoryLabel(key, categoryConfig)}
              count={counts?.[key] ?? 0}
              expanded={expandedCategory === key}
              onToggle={() => setExpandedCategory((prev) => (prev === key ? null : key))}
              search={debouncedSearch}
              selections={selections}
              onToggleFood={toggleFood}
              onSelectAll={handleSelectAll}
            />
          ))}
          {debouncedSearch && visibleCategories.length === 0 && (
            <p className={styles.empty}>No foods match your search</p>
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
