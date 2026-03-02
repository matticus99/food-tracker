import { useState } from 'react';
import PeriodSelector from './PeriodSelector';
import { useApi } from '../../hooks/useApi';
import styles from './ChartCard.module.css';
import cardStyles from './ActualVsGoalCard.module.css';

interface DataPoint {
  date: string;
  actual: number;
  goal: number;
  diff: number;
}

const W = 280;
const H = 70;

function buildPath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

export default function ActualVsGoalCard() {
  const [days, setDays] = useState(7);
  const { data } = useApi<DataPoint[]>(`/analytics/actual-vs-goal?days=${days}`);

  const points = data ?? [];

  let plotPoints: { x: number; y: number }[] = [];
  let goalY = H / 2;
  if (points.length > 1) {
    const allVals = points.flatMap((p) => [p.actual, p.goal]);
    const min = Math.min(...allVals) * 0.95;
    const max = Math.max(...allVals) * 1.05;
    const range = max - min || 1;
    const toY = (v: number) => 4 + (1 - (v - min) / range) * (H - 8);
    plotPoints = points.map((p, i) => ({
      x: (i / (points.length - 1)) * W,
      y: toY(p.actual),
    }));
    goalY = toY(points[0]!.goal);
  }

  const dayLabels = points.map((p) => {
    const d = new Date(p.date + 'T00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
  });

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Actual vs Goal</span>
        <PeriodSelector periods={[7, 14, 30]} active={days} onChange={setDays} />
      </div>
      {points.length > 1 ? (
        <>
          <svg viewBox={`0 0 ${W} ${H + 16}`} className={styles.chart} style={{ height: 86 }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="goalFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-emerald)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--accent-emerald)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Goal dashed line */}
            <line
              x1="0" y1={goalY} x2={W} y2={goalY}
              stroke="var(--accent-indigo)" strokeWidth="1" strokeDasharray="4 3" opacity="0.5"
            />
            {/* Actual area */}
            <path
              d={`${buildPath(plotPoints)} L${plotPoints[plotPoints.length - 1]!.x},${H} L${plotPoints[0]!.x},${H} Z`}
              fill="url(#goalFill)"
            />
            <path d={buildPath(plotPoints)} fill="none" stroke="var(--accent-emerald)" strokeWidth="2" />
            {/* Dots */}
            {plotPoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3}
                fill={points[i]!.diff > 0 ? 'var(--accent-orange)' : 'var(--accent-emerald)'}
              />
            ))}
            {/* Day labels */}
            {dayLabels.map((label, i) => (
              <text
                key={i}
                x={plotPoints[i]?.x ?? 0}
                y={H + 12}
                textAnchor="middle"
                fill="var(--text-tertiary)"
                fontSize="8"
                fontFamily="var(--font-body)"
              >
                {label}
              </text>
            ))}
          </svg>
          <div className={cardStyles.legend}>
            <span className={cardStyles.legendItem}>
              <span className={cardStyles.dot} style={{ background: 'var(--accent-emerald)' }} /> Under
            </span>
            <span className={cardStyles.legendItem}>
              <span className={cardStyles.dot} style={{ background: 'var(--accent-orange)' }} /> Over
            </span>
            <span className={cardStyles.legendItem}>
              <span className={cardStyles.line} /> Goal
            </span>
          </div>
        </>
      ) : (
        <p className={styles.empty}>No data yet</p>
      )}
    </div>
  );
}
