import styles from './LogSummary.module.css';

interface Props {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export default function LogSummary({ calories, protein, fat, carbs }: Props) {
  return (
    <div className={styles.bar}>
      <span className={styles.badge}>
        <span className={styles.badgeVal}>{Math.round(calories)}</span> cal
      </span>
      <span className={`${styles.badge} ${styles.protein}`}>
        <span className={styles.badgeVal}>{Math.round(protein)}g</span> P
      </span>
      <span className={`${styles.badge} ${styles.fat}`}>
        <span className={styles.badgeVal}>{Math.round(fat)}g</span> F
      </span>
      <span className={`${styles.badge} ${styles.carbs}`}>
        <span className={styles.badgeVal}>{Math.round(carbs)}g</span> C
      </span>
    </div>
  );
}
