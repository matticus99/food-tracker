import styles from './ChartCard.module.css';
import cardStyles from './TdeeBreakdownCard.module.css';

interface BmrData {
  bmr: number;
  activityLevel: number;
  estimatedTdee: number;
  adaptiveTdee: number | null;
  calorieTarget: number;
}

interface Props {
  data: BmrData | null;
}

export default function TdeeBreakdownCard({ data }: Props) {
  if (!data) {
    return (
      <div className={`${styles.card} ${styles.fullWidth}`}>
        <span className={styles.title}>TDEE Breakdown</span>
        <p className={styles.empty}>Loading...</p>
      </div>
    );
  }

  const tdeeValue = data.adaptiveTdee ?? data.estimatedTdee;
  const tdeeLabel = data.adaptiveTdee != null ? 'TDEE' : 'Est. TDEE';

  const stats = [
    { label: 'BMR', value: `${data.bmr}`, unit: 'cal' },
    { label: 'Activity', value: `${data.activityLevel}×`, unit: '' },
    { label: tdeeLabel, value: `${tdeeValue}`, unit: 'cal' },
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
