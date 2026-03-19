import { useState, useMemo } from 'react';
import PeriodSelector from './PeriodSelector';
import { toLocalDateStr } from '../../utils/date';
import styles from './ChartCard.module.css';

interface IntakePoint {
  date: string;
  calories: number;
}

interface Props {
  data: IntakePoint[];
  calorieTarget: number;
}

const W = 280;
const H = 70;

export default function AvgIntakeCard({ data, calorieTarget }: Props) {
  const [days, setDays] = useState(7);

  const points = useMemo(() => {
    if (!data.length) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = toLocalDateStr(cutoff);
    return data.filter(p => p.date >= cutoffStr);
  }, [data, days]);

  const target = calorieTarget;
  const avg = points.length > 0
    ? Math.round(points.reduce((s, p) => s + p.calories, 0) / points.length)
    : null;

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
            {/* Area fill */}
            {points.length > 1 && (
              <path
                d={
                  points.map((p, i) => {
                    const x = (i / (points.length - 1)) * W;
                    const y = H - (p.calories / maxVal) * H;
                    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
                  }).join(' ') + ` L${W},${H} L0,${H} Z`
                }
                fill="var(--accent-indigo)"
                opacity={0.15}
              />
            )}
            {/* Line */}
            {points.length > 1 && (
              <polyline
                points={points.map((p, i) => {
                  const x = (i / (points.length - 1)) * W;
                  const y = H - (p.calories / maxVal) * H;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="var(--accent-indigo)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {/* Dots */}
            {points.map((p, i) => {
              const x = points.length > 1 ? (i / (points.length - 1)) * W : W / 2;
              const y = H - (p.calories / maxVal) * H;
              return (
                <circle
                  key={p.date}
                  cx={x}
                  cy={y}
                  r={points.length > 20 ? 1.5 : 2.5}
                  fill="var(--accent-indigo)"
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
