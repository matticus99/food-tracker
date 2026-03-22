import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../hooks/useApi';
import { type Unit, convertToGrams, convertFromGrams, formatAmount } from '../../utils/unitConversions';
import { getAllCategories, getCategoryLabel, type CategoryConfig } from '../../constants/categories';
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
  categoryConfig?: CategoryConfig | null;
  defaultCategory?: string;
}

const QUICK_EMOJIS = ['🍗', '🥩', '🍳', '🥚', '🍞', '🥗', '🍎', '🥛', '☕', '🍕', '🌮', '🍣', '🍽️'];

function formatNum(v: number): string {
  if (v === 0) return '0';
  return parseFloat(v.toFixed(1)).toString();
}

export default function FoodForm({ open, food, onClose, onSaved, categoryConfig, defaultCategory = 'favorites' }: Props) {
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
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Lock body scroll for iOS PWA safe area support
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

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
      setError(null);
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
        setCategory(defaultCategory);
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

    // Scale macros proportionally when ratios are known
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

  // When macros change, update per-gram ratios (if gram basis is set)
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

  const origSG = Number(food?.servingGrams) || 0;
  const units: Unit[] = ['g', 'serving', 'oz', 'lb'];

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
    setError(null);
    try {
      const sg = getServingGramsForSubmit();
      const body = {
        name: name.trim(),
        emoji,
        category,
        servingLabel,
        servingGrams: sg,
        calories: calories ? Number(calories) : null,
        protein: protein ? Number(protein) : null,
        fat: fat ? Number(fat) : null,
        carbs: carbs ? Number(carbs) : null,
      };
      if (isEdit) {
        await apiFetch(`/foods/${food!.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/foods', { method: 'POST', body: JSON.stringify(body) });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div ref={overlayRef} className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{isEdit ? 'Edit Food' : 'New Food'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.emojiPicker}>
            <button
              type="button"
              className={styles.emojiPreview}
              onClick={() => {
                const input = document.getElementById('emoji-input') as HTMLInputElement;
                input?.focus();
              }}
            >
              {emoji}
            </button>
            <div className={styles.emojiRight}>
              <input
                id="emoji-input"
                className={styles.emojiInput}
                type="text"
                value={emoji}
                placeholder="Tap to type emoji"
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) { setEmoji('🍽️'); return; }
                  // Extract the last grapheme (emoji may be multi-codepoint)
                  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
                    const segments = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(val)];
                    setEmoji(segments[segments.length - 1]!.segment);
                  } else {
                    // Fallback: take last 2 chars (covers most emoji)
                    setEmoji(val.slice(-2));
                  }
                }}
              />
              <div className={styles.emojiQuickRow}>
                {QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`${styles.emojiQuickBtn} ${emoji === e ? styles.emojiQuickActive : ''}`}
                    onClick={() => setEmoji(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
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
                {getAllCategories(categoryConfig).map((c) => (
                  <option key={c} value={c}>{getCategoryLabel(c, categoryConfig)}</option>
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
                {origSG > 0
                  ? 'Changing serving size recalculates macros proportionally'
                  : 'Set a gram amount to enable unit conversions'}
              </span>
            )}
          </div>

          <div className={styles.macroGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Calories</label>
              <input
                className={styles.input}
                type="number"
                step="any"
                value={calories}
                onChange={(e) => handleCaloriesChange(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Protein (g)</label>
              <input
                className={styles.input}
                type="number"
                step="any"
                value={protein}
                onChange={(e) => handleProteinChange(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Fat (g)</label>
              <input
                className={styles.input}
                type="number"
                step="any"
                value={fat}
                onChange={(e) => handleFatChange(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Carbs (g)</label>
              <input
                className={styles.input}
                type="number"
                step="any"
                value={carbs}
                onChange={(e) => handleCarbsChange(e.target.value)}
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.submitBtn} type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </form>
      </div>
    </div>
  );
}
