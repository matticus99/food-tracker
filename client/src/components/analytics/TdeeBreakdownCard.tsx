import { useApi } from '../../hooks/useApi';
import styles from './ChartCard.module.css';
import cardStyles from './TdeeBreakdownCard.module.css';

interface BmrData {
  bmr: number;
  activityLevel: number;
  estimatedTdee: number;
  calorieTarget: number;
}

export default function TdeeBreakdownCard() {
  const { data } = useApi<BmrData>('/analytics/bmr');

  if (!data) {
    return (
      <div className={`${styles.card} ${styles.fullWidth}`}>
        <span className={styles.title}>TDEE Breakdown</span>
        <p className={styles.empty}>Loading...</p>
      </div>
    );
  }

  const stats = [
    { label: 'BMR', value: `${data.bmr}`, unit: 'cal' },
    { label: 'Activity', value: `${data.activityLevel}×`, unit: '' },
    { label: 'Est. TDEE', value: `${data.estimatedTdee}`, unit: 'cal' },
    { label: 'Target', value: `${data.calorieTarget}`, unit: 'cal' },
  ];

  return (
    <div className={`${styles.card} ${styles.fullWidth}`}>
      <span className={styles.title}>TDEE Breakdown</span>
      <div className={cardStyles.grid}>
        {stats.map((s) => (
          <div key={s.label} className={cardStyles.stat}>
            <span className={cardStyles.statLabel}>{s.label}</span>
            <span className={cardStyles.statVal}>
              {s.value}
              {s.unit && <span className={cardStyles.statUnit}> {s.unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
