import PageHeader from '../components/layout/PageHeader';
import styles from './Views.module.css';

export default function AnalyticsView() {
  return (
    <div className={styles.view}>
      <PageHeader title="Analytics" />
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📈</span>
        <p>Analytics charts will appear here</p>
      </div>
    </div>
  );
}
