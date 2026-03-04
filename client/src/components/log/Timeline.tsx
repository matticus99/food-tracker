import FoodEntry from './FoodEntry';
import styles from './Timeline.module.css';

interface LogEntryData {
  id: string;
  timeHour: number;
  servings: string;
  food: {
    id: string;
    name: string;
    emoji: string | null;
    servingLabel: string;
    servingGrams: string | null;
    calories: string | null;
    protein: string | null;
    fat: string | null;
    carbs: string | null;
  };
}

interface Props {
  entries: LogEntryData[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onAddAtHour: (hour: number) => void;
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5 AM to 10 PM

export default function Timeline({ entries, onDelete, onEdit, onAddAtHour }: Props) {
  const byHour = new Map<number, LogEntryData[]>();
  for (const entry of entries) {
    const list = byHour.get(entry.timeHour) ?? [];
    list.push(entry);
    byHour.set(entry.timeHour, list);
  }

  // Only show hours that have entries, plus some default hours
  const activeHours = new Set([...byHour.keys(), 7, 12, 18]);
  const hoursToShow = HOURS.filter((h) => activeHours.has(h));

  return (
    <div className={styles.timeline}>
      <div className={styles.line} />
      {hoursToShow.map((hour) => {
        const hourEntries = byHour.get(hour) ?? [];
        const hasEntries = hourEntries.length > 0;

        return (
          <div key={hour} className={styles.slot}>
            <span className={`${styles.timeLabel} ${hasEntries ? styles.active : ''}`}>
              {formatHour(hour)}
            </span>
            <div className={styles.content}>
              {hourEntries.map((entry) => {
                const servings = Number(entry.servings) || 1;
                return (
                  <FoodEntry
                    key={entry.id}
                    id={entry.id}
                    emoji={entry.food.emoji}
                    name={entry.food.name}
                    servingLabel={entry.food.servingLabel}
                    servingGrams={Number(entry.food.servingGrams) || null}
                    servings={servings}
                    calories={(Number(entry.food.calories) || 0) * servings}
                    onDelete={onDelete}
                    onEdit={onEdit}
                  />
                );
              })}
              <button
                className={styles.addBtn}
                onClick={() => onAddAtHour(hour)}
                aria-label={`Add food at ${formatHour(hour)}`}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
