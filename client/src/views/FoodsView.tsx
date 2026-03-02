import PageHeader from '../components/layout/PageHeader';
import styles from './Views.module.css';

export default function FoodsView() {
  return (
    <div className={styles.view}>
      <PageHeader title="My Foods" />
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🔍</span>
        <p>Your food database will appear here</p>
      </div>
    </div>
  );
}
