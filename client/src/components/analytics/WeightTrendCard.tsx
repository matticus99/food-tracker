import { useState, useMemo } from 'react';
import PeriodSelector from './PeriodSelector';
import { toLocalDateStr } from '../../utils/date';
import styles from './ChartCard.module.css';

interface WeightPoint {
  date: string;
  weight: number;
  trend: number;
}

interface Props {
  data: WeightPoint[];
}

const W = 280;
const H = 70;

function buildPath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

export default function WeightTrendCard({ data }: Props) {
  const [days, setDays] = useState(14);

  const points = useMemo(() => {
    if (!data.length) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = toLocalDateStr(cutoff);
    return data.filter(p => p.date >= cutoffStr);
  }, [data, days]);

  const latest = points.length > 0 ? points[points.length - 1]!.trend : null;
  const first = points.length > 1 ? points[0]!.trend : null;
  const change = latest != null && first != null ? Math.round((latest - first) * 10) / 10 : null;

  let plotPoints: { x: number; y: number }[] = [];
  if (points.length > 1) {
    const vals = points.map((p) => p.trend);
    const min = Math.min(...vals) * 0.998;
    const max = Math.max(...vals) * 1.002;
    const range = max - min || 1;
    plotPoints = points.map((p, i) => ({
      x: (i / (points.length - 1)) * W,
      y: 4 + (1 - (p.trend - min) / range) * (H - 8),
    }));
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Weight Trend</span>
        <PeriodSelector periods={[7, 14, 30]} active={days} onChange={setDays} />
      </div>
      {latest != null ? (
        <>
          <div className={styles.bigNum} style={{ color: 'var(--accent-violet)' }}>
            {latest.toFixed(1)}
            {change != null && (
              <span className={`${styles.change} ${change < 0 ? styles.down : change > 0 ? styles.up : styles.neutral}`}>
                {change > 0 ? '+' : ''}{change} lbs
              </span>
            )}
          </div>
          {plotPoints.length > 1 && (
            <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} style={{ height: 70 }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="weightFillA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-violet)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--accent-violet)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={`${buildPath(plotPoints)} L${plotPoints[plotPoints.length - 1]!.x},${H} L${plotPoints[0]!.x},${H} Z`}
                fill="url(#weightFillA)"
              />
              <path d={buildPath(plotPoints)} fill="none" stroke="var(--accent-violet)" strokeWidth="2" />
            </svg>
          )}
        </>
      ) : (
        <p className={styles.empty}>No weight data</p>
      )}
    </div>
  );
}
