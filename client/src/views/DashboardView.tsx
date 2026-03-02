import PageHeader from '../components/layout/PageHeader';
import styles from './Views.module.css';

export default function DashboardView() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={styles.view}>
      <PageHeader title="Dashboard" date={today} />
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📊</span>
        <p>Your dashboard will appear here</p>
      </div>
    </div>
  );
}
