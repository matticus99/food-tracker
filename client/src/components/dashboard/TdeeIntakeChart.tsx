import styles from './TdeeIntakeChart.module.css';

interface DataPoint {
  date: string;
  tdee?: number;
  intake?: number;
}

interface Props {
  data: DataPoint[];
  avgTdee: number;
  avgIntake: number;
  targetCalories?: number;
}

const WIDTH = 320;
const HEIGHT = 80;
const PAD_X = 0;
const PAD_Y = 4;

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

function buildArea(points: { x: number; y: number }[], baseY: number): string {
  if (points.length === 0) return '';
  const path = buildPath(points);
  return `${path} L${points[points.length - 1]!.x},${baseY} L${points[0]!.x},${baseY} Z`;
}

export default function TdeeIntakeChart({ data, avgTdee, avgIntake, targetCalories }: Props) {
  if (data.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>TDEE vs Intake</span>
          <span className={styles.badge}>7d</span>
        </div>
        <p className={styles.empty}>No data yet</p>
      </div>
    );
  }

  const allVals = data.flatMap((d) => [d.tdee, d.intake]).filter((v): v is number => v != null);
  if (targetCalories != null) allVals.push(targetCalories);
  const minVal = Math.min(...allVals) * 0.95;
  const maxVal = Math.max(...allVals) * 1.05;
  const range = maxVal - minVal || 1;

  const toX = (i: number) => PAD_X + (i / (data.length - 1 || 1)) * (WIDTH - PAD_X * 2);
  const toY = (v: number) => PAD_Y + (1 - (v - minVal) / range) * (HEIGHT - PAD_Y * 2);

  const tdeePoints = data
    .map((d, i) => (d.tdee != null ? { x: toX(i), y: toY(d.tdee) } : null))
    .filter(Boolean) as { x: number; y: number }[];

  const intakePoints = data
    .map((d, i) => (d.intake != null ? { x: toX(i), y: toY(d.intake) } : null))
    .filter(Boolean) as { x: number; y: number }[];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>TDEE vs Intake</span>
        <span className={styles.badge}>7d</span>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statDot} style={{ background: 'var(--accent-orange)' }} />
          <span className={styles.statLabel}>TDEE</span>
          <span className={styles.statVal} style={{ color: 'var(--accent-orange)' }}>
            {Math.round(avgTdee)}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statDot} style={{ background: 'var(--accent-indigo)' }} />
          <span className={styles.statLabel}>Avg</span>
          <span className={styles.statVal} style={{ color: 'var(--accent-indigo)' }}>
            {Math.round(avgIntake)}
          </span>
        </div>
        {targetCalories != null && (
          <div className={styles.stat}>
            <span className={styles.statDot} style={{ background: 'var(--accent-emerald)' }} />
            <span className={styles.statLabel}>Target</span>
            <span className={styles.statVal} style={{ color: 'var(--accent-emerald)' }}>
              {Math.round(targetCalories)}
            </span>
          </div>
        )}
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={styles.chart}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="tdeeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-orange)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-orange)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="intakeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-indigo)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-indigo)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Day divider lines */}
        {data.map((_, i) => {
          const x = toX(i);
          return (
            <line
              key={`div-${i}`}
              x1={x}
              y1={PAD_Y}
              x2={x}
              y2={HEIGHT - PAD_Y}
              stroke="var(--border-subtle)"
              strokeWidth="0.5"
              opacity="0.5"
            />
          );
        })}
        {/* Target calorie line */}
        {targetCalories != null && (
          <line
            x1={PAD_X}
            y1={toY(targetCalories)}
            x2={WIDTH - PAD_X}
            y2={toY(targetCalories)}
            stroke="var(--accent-emerald)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.8"
          />
        )}
        {tdeePoints.length > 0 && (
          <>
            <path d={buildArea(tdeePoints, HEIGHT)} fill="url(#tdeeFill)" />
            <path
              d={buildPath(tdeePoints)}
              fill="none"
              stroke="var(--accent-orange)"
              strokeWidth="2"
            />
          </>
        )}
        {intakePoints.length > 0 && (
          <>
            <path d={buildArea(intakePoints, HEIGHT)} fill="url(#intakeFill)" />
            <path
              d={buildPath(intakePoints)}
              fill="none"
              stroke="var(--accent-indigo)"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendLine} style={{ background: 'var(--accent-orange)' }} />
          TDEE
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendLine} style={{ background: 'var(--accent-indigo)' }} />
          Intake
        </span>
        {targetCalories != null && (
          <span className={styles.legendItem}>
            <span className={styles.legendDash} />
            Target
          </span>
        )}
      </div>
    </div>
  );
}
