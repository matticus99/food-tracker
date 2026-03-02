import { useState } from 'react';
import PeriodSelector from './PeriodSelector';
import { useApi } from '../../hooks/useApi';
import styles from './ChartCard.module.css';

interface IntakePoint {
  date: string;
  calories: number;
}

interface User {
  calorieTarget: number;
}

const W = 280;
const H = 70;

export default function AvgIntakeCard() {
  const [days, setDays] = useState(7);
  const { data } = useApi<IntakePoint[]>(`/analytics/daily-intake?days=${days}`);
  const { data: user } = useApi<User>('/user');

  const points = data ?? [];
  const avg = points.length > 0
    ? Math.round(points.reduce((s, p) => s + p.calories, 0) / points.length)
    : null;
  const target = user?.calorieTarget ?? 2200;

  let maxVal = 0;
  if (points.length > 0) {
    maxVal = Math.max(...points.map((p) => p.calories), target) * 1.1;
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Avg Daily Intake</span>
        <PeriodSelector periods={[7, 14, 30]} active={days} onChange={setDays} />
      </div>
      {avg != null ? (
        <>
          <div className={styles.bigNum} style={{ color: 'var(--accent-indigo)' }}>{avg}</div>
          <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} style={{ height: 70 }} preserveAspectRatio="none">
            {/* Target dashed line */}
            <line
              x1="0" y1={H - (target / maxVal) * H}
              x2={W} y2={H - (target / maxVal) * H}
              stroke="var(--text-tertiary)"
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.5"
            />
            {/* Bars */}
            {points.map((p, i) => {
              const barW = (W / points.length) * 0.6;
              const gap = (W / points.length) * 0.4;
              const x = i * (barW + gap) + gap / 2;
              const barH = (p.calories / maxVal) * H;
              return (
                <rect
                  key={p.date}
                  x={x}
                  y={H - barH}
                  width={barW}
                  height={barH}
                  rx={2}
                  fill="var(--accent-indigo)"
                  opacity={0.8}
                />
              );
            })}
          </svg>
        </>
      ) : (
        <p className={styles.empty}>No intake data</p>
      )}
    </div>
  );
}
