import { useMemo } from 'react';
import { useDate } from '../../context/DateContext';
import { toLocalDateStr } from '../../utils/date';
import styles from './WeekStrip.module.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  datesWithData?: Set<string>;
}

export default function WeekStrip({ datesWithData }: Props) {
  const { date, setDate } = useDate();

  const week = useMemo(() => {
    const d = new Date(date);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));

    return Array.from({ length: 7 }, (_, i) => {
      const wd = new Date(monday);
      wd.setDate(monday.getDate() + i);
      return wd;
    });
  }, [date]);

  const todayStr = toLocalDateStr(new Date());
  const selectedStr = toLocalDateStr(date);

  return (
    <div className={styles.strip}>
      {week.map((wd, i) => {
        const ds = toLocalDateStr(wd);
        const isSelected = ds === selectedStr;
        const isToday = ds === todayStr;
        const hasData = datesWithData?.has(ds);

        return (
          <button
            key={ds}
            className={`${styles.day} ${isSelected ? styles.selected : ''} ${isToday ? styles.today : ''}`}
            onClick={() => setDate(wd)}
          >
            <span className={styles.dayName}>{DAY_NAMES[i]}</span>
            <span className={styles.dayNum}>{wd.getDate()}</span>
            {hasData && <span className={styles.dot} />}
          </button>
        );
      })}
    </div>
  );
}
