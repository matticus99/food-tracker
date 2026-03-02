import styles from './Skeleton.module.css';

interface Props {
  width?: string;
  height?: string;
  radius?: string;
  className?: string;
}

export function Skeleton({ width = '100%', height = '16px', radius, className }: Props) {
  return (
    <div
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

export function SkeletonRing() {
  return <div className={styles.ring} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className={styles.card}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height="12px" />
      ))}
    </div>
  );
}
