import { useMemo } from 'react';
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

interface TimeBlock {
  label: string;
  startHour: number;
  endHour: number; // exclusive
}

const TIME_BLOCKS: (TimeBlock & { key: string })[] = [
  { key: 'early-morning', label: 'Early Morning', startHour: 0, endHour: 5 },
  { key: 'morning', label: 'Morning', startHour: 5, endHour: 10 },
  { key: 'midday', label: 'Midday', startHour: 10, endHour: 13 },
  { key: 'afternoon', label: 'Afternoon', startHour: 14, endHour: 17 },
  { key: 'evening', label: 'Evening', startHour: 17, endHour: 21 },
  { key: 'night', label: 'Night', startHour: 21, endHour: 24 },
];

function formatHourRange(start: number, end: number): string {
  const fmt = (h: number): string => {
    const h12 = h % 12 || 12;
    const suffix = h < 12 || h === 24 ? 'AM' : 'PM';
    return `${h12} ${suffix}`;
  };
  return `${fmt(start)} – ${fmt(end === 24 ? 0 : end)}`;
}

function getAddHour(block: TimeBlock): number {
  const now = new Date().getHours();
  if (now >= block.startHour && now < block.endHour) {
    return now;
  }
  return block.startHour;
}

export default function Timeline({ entries, onDelete, onEdit, onAddAtHour }: Props) {
  const blockData = useMemo(() => {
    return TIME_BLOCKS.map((block) => {
      const blockEntries = entries.filter(
        (e) => e.timeHour >= block.startHour && e.timeHour < block.endHour,
      );
      const totalCals = blockEntries.reduce((sum, e) => {
        const s = Number(e.servings) || 1;
        return sum + (Number(e.food.calories) || 0) * s;
      }, 0);
      return { block, entries: blockEntries, totalCals };
    }).filter((b) => b.entries.length > 0);
  }, [entries]);

  return (
    <div className={styles.cardList}>
      {blockData.map(({ block, entries: blockEntries, totalCals }) => (
        <div key={block.label} className={styles.card} data-time={block.key}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <span className={styles.cardLabel}>{block.label}</span>
              <span className={styles.cardRange}>
                {formatHourRange(block.startHour, block.endHour)}
              </span>
            </div>
            <div className={styles.cardHeaderRight}>
              <span className={styles.cardCals}>{Math.round(totalCals)}</span>
              <button
                className={styles.addBtn}
                onClick={() => onAddAtHour(getAddHour(block))}
                aria-label={`Add food to ${block.label}`}
              >
                +
              </button>
            </div>
          </div>
          <div className={styles.cardEntries}>
            {blockEntries.map((entry) => {
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
          </div>
        </div>
      ))}
    </div>
  );
}
