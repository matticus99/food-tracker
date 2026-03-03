import PageHeader from '../components/layout/PageHeader';
import TdeeCard from '../components/analytics/TdeeCard';
import WeightTrendCard from '../components/analytics/WeightTrendCard';
import AvgIntakeCard from '../components/analytics/AvgIntakeCard';
import ActualVsGoalCard from '../components/analytics/ActualVsGoalCard';
import TdeeBreakdownCard from '../components/analytics/TdeeBreakdownCard';
import { useApi } from '../hooks/useApi';
import styles from './AnalyticsView.module.css';
import viewStyles from './Views.module.css';

interface TdeePoint {
  date: string;
  tdeeEstimate: number;
  caloriesConsumed: number;
}

interface WeightPoint {
  date: string;
  weight: number;
  trend: number;
}

interface IntakePoint {
  date: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface BmrData {
  bmr: number;
  activityLevel: number;
  estimatedTdee: number;
  calorieTarget: number;
}

interface AnalyticsSummary {
  tdee: TdeePoint[];
  weightTrend: WeightPoint[];
  dailyIntake: IntakePoint[];
  bmr: BmrData | null;
  goals: {
    calorieTarget: number;
    proteinTarget: number;
    fatTarget: number;
    carbTarget: number;
  };
}

export default function AnalyticsView() {
  const { data } = useApi<AnalyticsSummary>('/analytics/summary?days=30');

  return (
    <div className={viewStyles.view}>
      <PageHeader title="Analytics" />
      <div className={styles.grid}>
        <div className={viewStyles.staggerIn}>
          <TdeeCard data={data?.tdee ?? []} />
        </div>
        <div className={viewStyles.staggerIn} style={{ animationDelay: '60ms' }}>
          <WeightTrendCard data={data?.weightTrend ?? []} />
        </div>
        <div className={viewStyles.staggerIn} style={{ animationDelay: '120ms' }}>
          <AvgIntakeCard
            data={data?.dailyIntake ?? []}
            calorieTarget={data?.goals.calorieTarget ?? 2200}
          />
        </div>
        <div className={viewStyles.staggerIn} style={{ animationDelay: '180ms' }}>
          <ActualVsGoalCard
            data={data?.dailyIntake ?? []}
            calorieTarget={data?.goals.calorieTarget ?? 2200}
          />
        </div>
        <div className={viewStyles.staggerIn} style={{ animationDelay: '240ms' }}>
          <TdeeBreakdownCard data={data?.bmr ?? null} />
        </div>
      </div>
    </div>
  );
}
