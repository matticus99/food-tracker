import { useState, useEffect, useRef } from 'react';
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

type Unit = 'g' | 'serving' | 'oz' | 'lb';

const OZ_TO_G = 28.3495;
const LB_TO_G = 453.592;

const CATEGORIES = [
  'favorites', 'proteins', 'grains', 'vegetables', 'fruits', 'dairy', 'snacks', 'drinks',
];

const EMOJIS = ['🍗', '🥩', '🍳', '🥚', '🍚', '🍞', '🥗', '🥦', '🍎', '🫐', '🥛', '🧀', '🥜', '☕', '🍽️'];

function formatNum(v: number): string {
  if (v === 0) return '0';
  return parseFloat(v.toFixed(1)).toString();
}

function formatAmount(value: number): string {
  if (value === 0) return '0';
  if (Number.isInteger(value)) return String(value);
  return parseFloat(value.toFixed(2)).toString();
}

function convertToGrams(value: number, unit: Unit, servingGrams: number): number {
  switch (unit) {
    case 'g': return value;
    case 'oz': return value * OZ_TO_G;
    case 'lb': return value * LB_TO_G;
    case 'serving': return value * servingGrams;
  }
}

function convertFromGrams(grams: number, unit: Unit, servingGrams: number): number {
  switch (unit) {
    case 'g': return grams;
    case 'oz': return grams / OZ_TO_G;
    case 'lb': return grams / LB_TO_G;
    case 'serving': return servingGrams > 0 ? grams / servingGrams : 1;
  }
}

export default function FoodForm({ open, food, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍽️');
  const [category, setCategory] = useState('favorites');
  const [servingLabel, setServingLabel] = useState('per serving');
  const [servingAmount, setServingAmount] = useState('');
  const [servingUnit, setServingUnit] = useState<Unit>('g');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Per-gram nutritional ratios (locked once food exists)
  const ratios = useRef({ calPerGram: 0, proPerGram: 0, fatPerGram: 0, carbPerGram: 0 });

  function computeRatios(sg: number, cal: number, pro: number, f: number, c: number) {
    if (sg > 0) {
      ratios.current = {
        calPerGram: cal / sg,
        proPerGram: pro / sg,
        fatPerGram: f / sg,
        carbPerGram: c / sg,
      };
    }
  }

  useEffect(() => {
    if (open) {
      if (food) {
        const sg = Number(food.servingGrams) || 0;
        setName(food.name);
        setEmoji(food.emoji || '🍽️');
        setCategory(food.category);
        setServingLabel(food.servingLabel);
        if (sg > 0) {
          setServingUnit('g');
          setServingAmount(formatAmount(sg));
        } else {
          setServingUnit('serving');
          setServingAmount('1');
        }
        setCalories(food.calories ?? '');
        setProtein(food.protein ?? '');
        setFat(food.fat ?? '');
        setCarbs(food.carbs ?? '');
        computeRatios(
          sg,
          Number(food.calories) || 0,
          Number(food.protein) || 0,
          Number(food.fat) || 0,
          Number(food.carbs) || 0,
        );
      } else {
        setName('');
        setEmoji('🍽️');
        setCategory('favorites');
        setServingLabel('per serving');
        setServingAmount('');
        setServingUnit('g');
        setCalories('');
        setProtein('');
        setFat('');
        setCarbs('');
        ratios.current = { calPerGram: 0, proPerGram: 0, fatPerGram: 0, carbPerGram: 0 };
      }
    }
  }, [open, food]);

  const isEdit = !!food?.id;

  // Current serving size in grams (for conversions and submission)
  const currentGrams = (() => {
    const val = Number(servingAmount) || 0;
    if (servingUnit === 'serving') {
      // In "serving" mode for new food, grams aren't known yet
      return 0;
    }
    return convertToGrams(val, servingUnit, 0); // servingGrams not needed for g/oz/lb
  })();

  function handleServingAmountChange(value: string) {
    setServingAmount(value);
    if (!isEdit) return; // In new mode, user sets macros manually

    // Edit mode: scale macros proportionally
    const val = Number(value) || 0;
    const r = ratios.current;
    if (r.calPerGram <= 0 || val <= 0) return;

    let grams: number;
    if (servingUnit === 'serving') {
      // Use original servingGrams to convert
      const origSG = Number(food?.servingGrams) || 0;
      grams = val * origSG;
    } else {
      grams = convertToGrams(val, servingUnit, 0);
    }

    if (grams > 0) {
      setCalories(formatNum(r.calPerGram * grams));
      setProtein(formatNum(r.proPerGram * grams));
      setFat(formatNum(r.fatPerGram * grams));
      setCarbs(formatNum(r.carbPerGram * grams));
    }
  }

  function handleUnitChange(newUnit: Unit) {
    if (newUnit === servingUnit) return;
    const val = Number(servingAmount) || 0;
    const origSG = Number(food?.servingGrams) || 0;

    if (val > 0) {
      // Convert current amount to grams first
      let grams: number;
      if (servingUnit === 'serving') {
        grams = val * origSG;
      } else {
        grams = convertToGrams(val, servingUnit, origSG);
      }

      // Convert from grams to new unit
      if (newUnit === 'serving' && origSG > 0) {
        setServingAmount(formatAmount(grams / origSG));
      } else if (newUnit !== 'serving') {
        setServingAmount(formatAmount(convertFromGrams(grams, newUnit, origSG)));
      } else {
        setServingAmount('1');
      }
    } else if (newUnit === 'serving') {
      setServingAmount('1');
    }

    setServingUnit(newUnit);
  }

  // In new mode, when macros change, update ratios
  function handleCaloriesChange(value: string) {
    setCalories(value);
    if (currentGrams > 0) ratios.current.calPerGram = (Number(value) || 0) / currentGrams;
  }

  function handleProteinChange(value: string) {
    setProtein(value);
    if (currentGrams > 0) ratios.current.proPerGram = (Number(value) || 0) / currentGrams;
  }

  function handleFatChange(value: string) {
    setFat(value);
    if (currentGrams > 0) ratios.current.fatPerGram = (Number(value) || 0) / currentGrams;
  }

  function handleCarbsChange(value: string) {
    setCarbs(value);
    if (currentGrams > 0) ratios.current.carbPerGram = (Number(value) || 0) / currentGrams;
  }

  if (!open) return null;

  // Determine which units to show
  const origSG = Number(food?.servingGrams) || 0;
  const hasGramBasis = isEdit ? origSG > 0 : true;
  const units: Unit[] = hasGramBasis ? ['g', 'serving', 'oz', 'lb'] : ['serving'];

  // Compute servingGrams for submission
  function getServingGramsForSubmit(): number | null {
    const val = Number(servingAmount) || 0;
    if (val <= 0) return null;
    if (servingUnit === 'serving') {
      // In serving mode, if editing keep original; if new, no gram basis
      return origSG > 0 ? origSG * val : null;
    }
    return convertToGrams(val, servingUnit, origSG);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const sg = getServingGramsForSubmit();
      const body = {
        name: name.trim(),
        emoji,
        category,
        servingLabel,
        servingGrams: sg,
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
              <label className={styles.label}>Serving Label</label>
              <input
                className={styles.input}
                type="text"
                placeholder="e.g. per oz (28g)"
                value={servingLabel}
                onChange={(e) => setServingLabel(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Serving Size</label>
            <div className={styles.servingInputRow}>
              <input
                className={styles.servingInput}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="Amount"
                value={servingAmount}
                onChange={(e) => handleServingAmountChange(e.target.value)}
              />
              <span className={styles.servingUnitLabel}>{servingUnit}</span>
            </div>
            {units.length > 1 && (
              <div className={styles.unitChips}>
                {units.map((u) => (
                  <button
                    key={u}
                    type="button"
                    className={`${styles.unitChip} ${servingUnit === u ? styles.unitChipActive : ''}`}
                    onClick={() => handleUnitChange(u)}
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
            {isEdit && (
              <span className={styles.hint}>
                Changing serving size recalculates macros proportionally
              </span>
            )}
          </div>

          <div className={styles.macroGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Calories</label>
              <input
                className={`${styles.input} ${isEdit ? styles.inputReadonly : ''}`}
                type="number"
                step="any"
                value={calories}
                onChange={(e) => handleCaloriesChange(e.target.value)}
                readOnly={isEdit}
                tabIndex={isEdit ? -1 : undefined}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Protein (g)</label>
              <input
                className={`${styles.input} ${isEdit ? styles.inputReadonly : ''}`}
                type="number"
                step="any"
                value={protein}
                onChange={(e) => handleProteinChange(e.target.value)}
                readOnly={isEdit}
                tabIndex={isEdit ? -1 : undefined}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Fat (g)</label>
              <input
                className={`${styles.input} ${isEdit ? styles.inputReadonly : ''}`}
                type="number"
                step="any"
                value={fat}
                onChange={(e) => handleFatChange(e.target.value)}
                readOnly={isEdit}
                tabIndex={isEdit ? -1 : undefined}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Carbs (g)</label>
              <input
                className={`${styles.input} ${isEdit ? styles.inputReadonly : ''}`}
                type="number"
                step="any"
                value={carbs}
                onChange={(e) => handleCarbsChange(e.target.value)}
                readOnly={isEdit}
                tabIndex={isEdit ? -1 : undefined}
              />
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
