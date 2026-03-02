import PageHeader from '../components/layout/PageHeader';
import TdeeCard from '../components/analytics/TdeeCard';
import WeightTrendCard from '../components/analytics/WeightTrendCard';
import AvgIntakeCard from '../components/analytics/AvgIntakeCard';
import ActualVsGoalCard from '../components/analytics/ActualVsGoalCard';
import TdeeBreakdownCard from '../components/analytics/TdeeBreakdownCard';
import styles from './AnalyticsView.module.css';
import viewStyles from './Views.module.css';

export default function AnalyticsView() {
  return (
    <div className={viewStyles.view}>
      <PageHeader title="Analytics" />
      <div className={styles.grid}>
        <div className={viewStyles.staggerIn}>
          <TdeeCard />
        </div>
        <div className={viewStyles.staggerIn} style={{ animationDelay: '60ms' }}>
          <WeightTrendCard />
        </div>
        <div className={viewStyles.staggerIn} style={{ animationDelay: '120ms' }}>
          <AvgIntakeCard />
        </div>
        <div className={viewStyles.staggerIn} style={{ animationDelay: '180ms' }}>
          <ActualVsGoalCard />
        </div>
        <div className={viewStyles.staggerIn} style={{ animationDelay: '240ms' }}>
          <TdeeBreakdownCard />
        </div>
      </div>
    </div>
  );
}
