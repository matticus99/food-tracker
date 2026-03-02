import { useEffect, useState } from 'react';
import styles from './CalorieRing.module.css';

interface Props {
  consumed: number;
  target: number;
}

const SIZE = 180;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CalorieRing({ consumed, target }: Props) {
  const [animatedOffset, setAnimatedOffset] = useState(CIRCUMFERENCE);
  const remaining = Math.max(0, target - consumed);
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const offset = CIRCUMFERENCE * (1 - pct);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setAnimatedOffset(offset));
    return () => cancelAnimationFrame(timer);
  }, [offset]);

  const isOver = consumed > target;

  return (
    <div className={styles.wrapper}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.ring}>
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-indigo)" />
            <stop offset="100%" stopColor="var(--accent-violet)" />
          </linearGradient>
        </defs>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={isOver ? 'var(--accent-rose)' : 'url(#ringGradient)'}
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={animatedOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          className={styles.progress}
        />
      </svg>
      <div className={styles.center}>
        <span className={styles.value}>{Math.round(remaining)}</span>
        <span className={styles.label}>{isOver ? 'over' : 'remaining'}</span>
      </div>
    </div>
  );
}
