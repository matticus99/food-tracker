import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../hooks/useApi';
import { type Unit, convertAmount, toServings, formatAmount } from '../../utils/unitConversions';
import { TIME_BLOCKS, hourToBlock } from '../../constants/timeBlocks';
import styles from './EditFoodModal.module.css';

export interface EditEntry {
  id: string;
  servings: number;
  timeHour: number;
  food: {
    name: string;
    emoji: string | null;
    servingLabel: string;
    servingGrams: string | null;
    calories: string | null;
    protein: string | null;
    fat: string | null;
    carbs: string | null;
  };
}

interface Props {
  entry: EditEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditFoodModal({ entry, onClose, onSaved }: Props) {
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<Unit>('g');
  const [selectedBlock, setSelectedBlock] = useState('morning');
  const [saving, setSaving] = useState(false);

  // Lock body scroll when modal is open to prevent iOS from scrolling
  // the page behind the modal when the keyboard opens
  useEffect(() => {
    if (!entry) return;
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
  }, [entry]);

  useEffect(() => {
    if (entry) {
      const sg = Number(entry.food.servingGrams) || 0;
      if (sg > 0) {
        setUnit('g');
        setAmount(formatAmount(entry.servings * sg));
      } else {
        setUnit('serving');
        setAmount(formatAmount(entry.servings));
      }
      setSelectedBlock(hourToBlock(entry.timeHour));
    }
  }, [entry]);

  const sg = entry ? (Number(entry.food.servingGrams) || 0) : 0;

  // Can we meaningfully convert between weight and servings?
  const canComputeServings = unit === 'serving' || sg > 0;

  const servingsMultiplier = useMemo(() => {
    const val = Number(amount) || 0;
    if (unit === 'serving') return val || 1;
    if (sg <= 0) return 0; // Can't convert weight to servings without gram basis
    return toServings(val, unit, sg);
  }, [amount, unit, sg]);

  const macros = useMemo(() => {
    if (!entry) return { calories: 0, protein: 0, fat: 0, carbs: 0 };
    return {
      calories: Math.round((Number(entry.food.calories) || 0) * servingsMultiplier),
      protein: Math.round((Number(entry.food.protein) || 0) * servingsMultiplier),
      fat: Math.round((Number(entry.food.fat) || 0) * servingsMultiplier),
      carbs: Math.round((Number(entry.food.carbs) || 0) * servingsMultiplier),
    };
  }, [entry, servingsMultiplier]);

  if (!entry) return null;

  const units: Unit[] = ['g', 'serving', 'oz', 'lb'];

  function handleUnitChange(newUnit: Unit) {
    if (newUnit === unit) return;
    const currentVal = Number(amount) || 0;

    if (sg > 0 && currentVal > 0) {
      // Full conversion possible
      const converted = convertAmount(currentVal, unit, newUnit, sg);
      setAmount(formatAmount(converted));
    } else if (sg <= 0) {
      // No servingGrams: weight↔weight is pure math, but serving↔weight can't convert
      const isCurrentWeight = unit !== 'serving';
      const isNewWeight = newUnit !== 'serving';

      if (isCurrentWeight && isNewWeight && currentVal > 0) {
        const converted = convertAmount(currentVal, unit, newUnit, 0);
        setAmount(formatAmount(converted));
      } else if (newUnit === 'serving') {
        setAmount('1');
      } else {
        setAmount('');
      }
    } else if (newUnit === 'serving') {
      setAmount('1');
    } else {
      setAmount('');
    }

    setUnit(newUnit);
  }

  const newTimeHour = TIME_BLOCKS.find((b) => b.key === selectedBlock)?.hour ?? entry?.timeHour ?? 12;

  async function handleSave() {
    if (!entry) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { servings: Math.max(servingsMultiplier, 0.01) };
      if (newTimeHour !== entry.timeHour) {
        body.timeHour = newTimeHour;
      }
      await apiFetch(`/log/${entry.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Edit Entry</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.fixedTop}>
          <div className={styles.selectedFood}>
            <span className={styles.foodEmoji}>{entry.food.emoji || '🍽️'}</span>
            <span className={styles.foodName}>{entry.food.name}</span>
          </div>

          <div className={styles.amountSection}>
            <input
              className={styles.amountInput}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            <div className={styles.servingNote}>
              {entry.food.servingLabel}
              {sg > 0 && unit !== 'serving' && (
                <> · {formatAmount(servingsMultiplier)} serving{servingsMultiplier !== 1 ? 's' : ''}</>
              )}
            </div>
            {!canComputeServings && (
              <div className={styles.conversionHint}>
                Set serving weight in My Foods to enable weight entry
              </div>
            )}
          </div>

          {entry.food.calories && canComputeServings && (
            <div className={styles.macroPreview}>
              <span>{macros.calories} cal</span>
              <span style={{ color: 'var(--accent-cyan)' }}>{macros.protein}g P</span>
              <span style={{ color: 'var(--accent-orange)' }}>{macros.fat}g F</span>
              <span style={{ color: 'var(--accent-emerald)' }}>{macros.carbs}g C</span>
            </div>
          )}
        </div>

        <div className={styles.body}>
          <div className={styles.timeSection}>
            <label className={styles.timeLabel}>Time of Day</label>
            <div className={styles.timeBlocks}>
              {TIME_BLOCKS.map((b) => (
                <button
                  key={b.key}
                  className={`${styles.timeBlockBtn} ${selectedBlock === b.key ? styles.timeBlockBtnActive : ''}`}
                  onClick={() => setSelectedBlock(b.key)}
                >
                  <span className={styles.timeBlockIcon}>{b.icon}</span>
                  <span className={styles.timeBlockLabel}>{b.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !Number(amount) || !canComputeServings}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

        </div>

        <div className={styles.unitBar}>
          {units.map((u) => (
            <button
              key={u}
              className={`${styles.unitBarBtn} ${unit === u ? styles.unitBarBtnActive : ''}`}
              onClick={() => handleUnitChange(u)}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
