import { useDate } from '../../context/DateContext';
import styles from './DayNavigator.module.css';

export default function DayNavigator() {
  const { date, goNext, goPrev, goToday, isToday } = useDate();

  const label = isToday
    ? 'Today'
    : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className={styles.nav}>
      <button className={styles.arrow} onClick={goPrev} aria-label="Previous day">
        ‹
      </button>
      <button className={styles.label} onClick={goToday}>
        {label}
      </button>
      <button className={styles.arrow} onClick={goNext} aria-label="Next day">
        ›
      </button>
    </div>
  );
}
