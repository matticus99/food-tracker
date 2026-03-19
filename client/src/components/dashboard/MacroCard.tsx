import styles from './MacroCard.module.css';

interface MacroRow {
  label: string;
  color: string;
  current: number;
  target: number;
}

interface Props {
  protein: number;
  proteinTarget: number;
  fat: number;
  fatTarget: number;
  carbs: number;
  carbsTarget: number;
}

export default function MacroCard({ protein, proteinTarget, fat, fatTarget, carbs, carbsTarget }: Props) {
  const rows: MacroRow[] = [
    { label: 'Protein', color: 'var(--accent-cyan)', current: protein, target: proteinTarget },
    { label: 'Fat', color: 'var(--accent-orange)', current: fat, target: fatTarget },
    { label: 'Carbs', color: 'var(--accent-emerald)', current: carbs, target: carbsTarget },
  ];

  return (
    <div className={styles.card}>
      {rows.map((row) => {
        const pct = row.target > 0 ? Math.min((row.current / row.target) * 100, 100) : 0;
        return (
          <div key={row.label} className={styles.bar} style={{ '--bar-color': row.color } as React.CSSProperties}>
            <div className={styles.barFill} style={{ width: `${pct}%` }} />
            <div className={styles.barContent}>
              <span className={styles.label}>{row.label}</span>
              <span className={styles.values}>
                {Math.round(row.current)}g / {Math.round(row.target)}g
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
