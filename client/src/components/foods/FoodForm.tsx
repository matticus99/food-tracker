import { useState, useEffect } from 'react';
import { apiFetch } from '../../hooks/useApi';
import styles from './FoodForm.module.css';

interface FoodData {
  id?: string;
  name: string;
  emoji: string | null;
  category: string;
  servingLabel: string;
  servingGrams?: string | null;
  calories: string | null;
  protein: string | null;
  fat: string | null;
  carbs: string | null;
}

interface Props {
  open: boolean;
  food: FoodData | null;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES = [
  'proteins', 'grains', 'vegetables', 'fruits', 'dairy', 'snacks', 'drinks', 'other',
];

const EMOJIS = ['🍗', '🥩', '🍳', '🥚', '🍚', '🍞', '🥗', '🥦', '🍎', '🫐', '🥛', '🧀', '🥜', '☕', '🍽️'];

export default function FoodForm({ open, food, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍽️');
  const [category, setCategory] = useState('other');
  const [servingLabel, setServingLabel] = useState('per serving');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (food) {
        setName(food.name);
        setEmoji(food.emoji || '🍽️');
        setCategory(food.category);
        setServingLabel(food.servingLabel);
        setCalories(food.calories ?? '');
        setProtein(food.protein ?? '');
        setFat(food.fat ?? '');
        setCarbs(food.carbs ?? '');
      } else {
        setName('');
        setEmoji('🍽️');
        setCategory('other');
        setServingLabel('per serving');
        setCalories('');
        setProtein('');
        setFat('');
        setCarbs('');
      }
    }
  }, [open, food]);

  if (!open) return null;

  const isEdit = !!food?.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const body = {
        name: name.trim(),
        emoji,
        category,
        servingLabel,
        calories: calories || null,
        protein: protein || null,
        fat: fat || null,
        carbs: carbs || null,
      };
      if (isEdit) {
        await apiFetch(`/foods/${food!.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/foods', { method: 'POST', body: JSON.stringify(body) });
      }
      onSaved();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{isEdit ? 'Edit Food' : 'New Food'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.emojiRow}>
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className={`${styles.emojiBtn} ${emoji === e ? styles.emojiActive : ''}`}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Name</label>
            <input
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Category</label>
              <select className={styles.input} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Serving</label>
              <input
                className={styles.input}
                type="text"
                value={servingLabel}
                onChange={(e) => setServingLabel(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.macroGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Calories</label>
              <input className={styles.input} type="number" value={calories} onChange={(e) => setCalories(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Protein (g)</label>
              <input className={styles.input} type="number" value={protein} onChange={(e) => setProtein(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Fat (g)</label>
              <input className={styles.input} type="number" value={fat} onChange={(e) => setFat(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Carbs (g)</label>
              <input className={styles.input} type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            </div>
          </div>

          <button className={styles.submitBtn} type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </form>
      </div>
    </div>
  );
}
