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

export default function FoodEntry({ id, emoji, name, servingLabel, servings, calories, onDelete }: Props) {
  return (
    <div className={styles.entry}>
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
  );
}
