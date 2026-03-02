import PageHeader from '../components/layout/PageHeader';
import styles from './Views.module.css';

export default function SettingsView() {
  return (
    <div className={styles.view}>
      <PageHeader title="Settings" />
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>⚙️</span>
        <p>Settings will appear here</p>
      </div>
    </div>
  );
}
