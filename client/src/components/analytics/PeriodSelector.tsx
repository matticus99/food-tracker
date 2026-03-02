import styles from './PeriodSelector.module.css';

interface Props {
  periods: number[];
  active: number;
  onChange: (v: number) => void;
}

export default function PeriodSelector({ periods, active, onChange }: Props) {
  return (
    <div className={styles.selector}>
      {periods.map((p) => (
        <button
          key={p}
          className={`${styles.btn} ${active === p ? styles.active : ''}`}
          onClick={() => onChange(p)}
        >
          {p}d
        </button>
      ))}
    </div>
  );
}
