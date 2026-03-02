import { useRef, useState, useCallback } from 'react';
import styles from './FoodEntry.module.css';

interface Props {
  id: string;
  emoji: string | null;
  name: string;
  servingLabel: string;
  servings: number;
  calories: number;
  onDelete: (id: string) => void;
}

const SWIPE_THRESHOLD = 80;

export default function FoodEntry({ id, emoji, name, servingLabel, servings, calories, onDelete }: Props) {
  const startX = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0]!.clientX;
    setSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    const diff = e.touches[0]!.clientX - startX.current;
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
      >
        <span className={styles.emoji}>{emoji || '🍽️'}</span>
        <div className={styles.info}>
          <span className={styles.name}>{name}</span>
          <span className={styles.serving}>
            {servings !== 1 ? `${servings}× ` : ''}{servingLabel}
          </span>
        </div>
        <span className={styles.cal}>{Math.round(calories)}</span>
        <button className={styles.deleteBtn} onClick={() => onDelete(id)} aria-label="Delete entry">
          ×
        </button>
      </div>
    </div>
  );
}
