import { useRef, useState, useCallback } from 'react';
import styles from './FoodEntry.module.css';

interface Props {
  id: string;
  emoji: string | null;
  name: string;
  servingLabel: string;
  servingGrams: number | null;
  servings: number;
  calories: number;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

const SWIPE_THRESHOLD = 80;

function formatServingDisplay(servings: number, servingGrams: number | null, servingLabel: string): string {
  if (servingGrams && servingGrams > 0) {
    const grams = servings * servingGrams;
    return `${parseFloat(grams.toFixed(1))}g`;
  }
  if (servings !== 1) {
    return `${servings}× ${servingLabel}`;
  }
  return servingLabel;
}

export default function FoodEntry({ id, emoji, name, servingLabel, servingGrams, servings, calories, onDelete, onEdit }: Props) {
  const startX = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const hasMoved = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0]!.clientX;
    setSwiping(true);
    hasMoved.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    const diff = e.touches[0]!.clientX - startX.current;
    if (Math.abs(diff) > 5) hasMoved.current = true;
    if (diff < 0) setOffsetX(Math.max(diff, -120));
  }, [swiping]);

  const handleTouchEnd = useCallback(() => {
    setSwiping(false);
    if (offsetX < -SWIPE_THRESHOLD) {
      setOffsetX(-120);
    } else {
      setOffsetX(0);
    }
  }, [offsetX]);

  const handleDeleteClick = useCallback(() => {
    setOffsetX(0);
    onDelete(id);
  }, [id, onDelete]);

  const handleEntryClick = useCallback(() => {
    // Don't open edit if user swiped or if delete zone is showing
    if (hasMoved.current || offsetX !== 0) return;
    onEdit(id);
  }, [id, onEdit, offsetX]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.deleteZone} onClick={handleDeleteClick}>
        <span>Delete</span>
      </div>
      <div
        className={styles.entry}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.25s var(--ease-out)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleEntryClick}
      >
        <span className={styles.emoji}>{emoji || '🍽️'}</span>
        <div className={styles.info}>
          <span className={styles.name}>{name}</span>
          <span className={styles.serving}>
            {formatServingDisplay(servings, servingGrams, servingLabel)}
          </span>
        </div>
        <span className={styles.cal}>{Math.round(calories)}</span>
        <button
          className={styles.deleteBtn}
          onClick={(e) => { e.stopPropagation(); onDelete(id); }}
          aria-label="Delete entry"
        >
          ×
        </button>
      </div>
    </div>
  );
}
