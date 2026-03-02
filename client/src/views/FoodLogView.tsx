import PageHeader from '../components/layout/PageHeader';
import styles from './Views.module.css';

export default function FoodLogView() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={styles.view}>
      <PageHeader title="Food Log" date={today} />
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🍽️</span>
        <p>Log your first meal!</p>
      </div>
    </div>
  );
}
