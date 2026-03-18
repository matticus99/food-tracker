import { useMemo } from 'react';
import PeriodSelector from './PeriodSelector';
import { toLocalDateStr } from '../../utils/date';
import styles from './ChartCard.module.css';

interface TdeePoint {
  date: string;
  tdeeEstimate: number;
  caloriesConsumed: number;
}

interface Props {
  data: TdeePoint[];
}

const W = 280;
const H = 70;

function buildPath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

export default function TdeeCard({ data }: Props) {
  const points = useMemo(() => {
    if (!data.length) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = toLocalDateStr(cutoff);
    return data.filter(p => p.date >= cutoffStr);
  }, [data]);

  const latest = points.length > 0 ? Math.round(points[points.length - 1]!.tdeeEstimate) : null;

  let plotPoints: { x: number; y: number }[] = [];
  if (points.length > 1) {
    const vals = points.map((p) => p.tdeeEstimate);
    const min = Math.min(...vals) * 0.98;
    const max = Math.max(...vals) * 1.02;
    const range = max - min || 1;
    plotPoints = points.map((p, i) => ({
      x: (i / (points.length - 1)) * W,
      y: 4 + (1 - (p.tdeeEstimate - min) / range) * (H - 8),
    }));
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>TDEE</span>
        <PeriodSelector periods={[30]} active={30} onChange={() => {}} />
      </div>
      {latest != null ? (
        <>
          <div className={styles.bigNum} style={{ color: 'var(--accent-orange)' }}>{latest}</div>
          {plotPoints.length > 1 && (
            <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} style={{ height: 70 }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="tdeeFillA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-orange)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--accent-orange)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={`${buildPath(plotPoints)} L${plotPoints[plotPoints.length - 1]!.x},${H} L${plotPoints[0]!.x},${H} Z`}
                fill="url(#tdeeFillA)"
              />
              <path d={buildPath(plotPoints)} fill="none" stroke="var(--accent-orange)" strokeWidth="2" />
            </svg>
          )}
        </>
      ) : (
        <p className={styles.empty}>No TDEE data</p>
      )}
    </div>
  );
}
