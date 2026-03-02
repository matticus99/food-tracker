import { useState, useEffect } from 'react';
import { useApi, apiFetch } from '../../hooks/useApi';
import styles from './AddFoodModal.module.css';

interface Food {
  id: string;
  name: string;
  emoji: string | null;
  category: string;
  servingLabel: string;
  calories: string | null;
  protein: string | null;
  fat: string | null;
  carbs: string | null;
}

interface Props {
  open: boolean;
  hour: number;
  date: string;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddFoodModal({ open, hour, date, onClose, onAdded }: Props) {
  const [search, setSearch] = useState('');
  const [servings, setServings] = useState('1');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const { data: foods } = useApi<Food[]>(open ? `/foods${query}` : null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setServings('1');
      setSelectedFood(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleAdd() {
    if (!selectedFood) return;
    setSubmitting(true);
    try {
      await apiFetch('/log', {
        method: 'POST',
        body: JSON.stringify({
          foodId: selectedFood.id,
          date,
          timeHour: hour,
          servings: Number(servings) || 1,
        }),
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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Add Food — {formatHour(hour)}</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {!selectedFood ? (
          <>
            <input
              className={styles.search}
              type="text"
              placeholder="Search foods..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className={styles.list}>
              {foods?.map((food) => (
                <button
                  key={food.id}
                  className={styles.foodItem}
                  onClick={() => setSelectedFood(food)}
                >
                  <span className={styles.foodEmoji}>{food.emoji || '🍽️'}</span>
                  <div className={styles.foodInfo}>
                    <span className={styles.foodName}>{food.name}</span>
                    <span className={styles.foodMeta}>
                      {food.servingLabel}
                      {food.calories ? ` · ${Number(food.calories)} cal` : ''}
                    </span>
                  </div>
                </button>
              ))}
              {foods?.length === 0 && (
                <p className={styles.empty}>No foods found</p>
              )}
            </div>
          </>
        ) : (
          <div className={styles.confirm}>
            <div className={styles.selectedFood}>
              <span className={styles.foodEmoji}>{selectedFood.emoji || '🍽️'}</span>
              <span className={styles.foodName}>{selectedFood.name}</span>
            </div>
            <div className={styles.servingRow}>
              <label className={styles.servingLabel}>Servings</label>
              <input
                className={styles.servingInput}
                type="number"
                min="0.25"
                step="0.25"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
              />
              <span className={styles.servingUnit}>{selectedFood.servingLabel}</span>
            </div>
            {selectedFood.calories && (
              <div className={styles.macroPreview}>
                <span>{Math.round(Number(selectedFood.calories) * (Number(servings) || 1))} cal</span>
                <span style={{ color: 'var(--accent-cyan)' }}>
                  {Math.round((Number(selectedFood.protein) || 0) * (Number(servings) || 1))}g P
                </span>
                <span style={{ color: 'var(--accent-orange)' }}>
                  {Math.round((Number(selectedFood.fat) || 0) * (Number(servings) || 1))}g F
                </span>
                <span style={{ color: 'var(--accent-emerald)' }}>
                  {Math.round((Number(selectedFood.carbs) || 0) * (Number(servings) || 1))}g C
                </span>
              </div>
            )}
            <div className={styles.actions}>
              <button className={styles.backBtn} onClick={() => setSelectedFood(null)}>
                Back
              </button>
              <button className={styles.addBtn} onClick={handleAdd} disabled={submitting}>
                {submitting ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
