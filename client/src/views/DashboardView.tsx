import { useMemo, useState, useCallback } from 'react';
import DayNavigator from '../components/dashboard/DayNavigator';
import WeekStrip from '../components/dashboard/WeekStrip';
import CalorieRing from '../components/dashboard/CalorieRing';
import MacroCard from '../components/dashboard/MacroCard';
import TdeeIntakeChart from '../components/dashboard/TdeeIntakeChart';
import WeightModal from '../components/dashboard/WeightModal';
import { SkeletonRing, SkeletonCard, Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { useDate } from '../context/DateContext';
import { useApi } from '../hooks/useApi';
import styles from './DashboardView.module.css';
import viewStyles from './Views.module.css';

interface LogEntry {
  id: string;
  servings: string;
  food: {
    calories: string | null;
    protein: string | null;
    fat: string | null;
    carbs: string | null;
  };
}

interface WeightEntry {
  date: string;
  weight: string;
}

interface TdeePoint {
  date: string;
  tdeeEstimate: number;
  caloriesConsumed: number;
}

interface IntakePoint {
  date: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface CalorieTargetInfo {
  calorieTarget: number;
  tdeeUsed: number;
  tdeeSource: 'adaptive' | 'estimated';
  objectiveOffset: number;
  objective: string;
  goalPace: number;
}

interface User {
  calorieTarget: number;
  proteinTarget: number;
  fatTarget: number;
  carbTarget: number;
  currentWeight: string;
}

interface DashboardData {
  log: LogEntry[];
  user: User;
  todayWeight: WeightEntry[];
  tdee: TdeePoint[];
  intake: IntakePoint[];
  computedCalorieTarget: CalorieTargetInfo | null;
}

export default function DashboardView() {
  const { dateStr } = useDate();
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const { toast } = useToast();

  const { data, loading, refetch } = useApi<DashboardData>(`/dashboard?date=${dateStr}`);

  const logEntries = data?.log ?? null;
  const user = data?.user ?? null;
  const tdeeData = data?.tdee ?? null;
  const intakeData = data?.intake ?? null;
  const todayWeight = data?.todayWeight ?? null;

  const handleWeightSaved = useCallback(() => {
    refetch();
    toast('Weight logged', 'success');
  }, [refetch, toast]);

  const totals = useMemo(() => {
    if (!logEntries) return { calories: 0, protein: 0, fat: 0, carbs: 0 };
    return logEntries.reduce(
      (acc, entry) => {
        const s = Number(entry.servings) || 1;
        acc.calories += (Number(entry.food.calories) || 0) * s;
        acc.protein += (Number(entry.food.protein) || 0) * s;
        acc.fat += (Number(entry.food.fat) || 0) * s;
        acc.carbs += (Number(entry.food.carbs) || 0) * s;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0 },
    );
  }, [logEntries]);

  const chartData = useMemo(() => {
    if (!tdeeData && !intakeData) return { points: [], avgTdee: 0, avgIntake: 0 };

    const tdeeMap = new Map((tdeeData ?? []).map((d) => [d.date, d.tdeeEstimate]));
    const intakeMap = new Map((intakeData ?? []).map((d) => [d.date, d.calories]));
    const allDates = [...new Set([...tdeeMap.keys(), ...intakeMap.keys()])].sort();

    // Carry forward the last known TDEE for dates that only have intake
    let lastTdee: number | undefined;
    const allPoints = allDates.map((dt) => {
      const tdee = tdeeMap.get(dt) ?? lastTdee;
      if (tdeeMap.has(dt)) lastTdee = tdeeMap.get(dt);
      return {
        date: dt,
        tdee,
        intake: intakeMap.get(dt),
      };
    });

    // Show the most recent 7 data points
    const points = allPoints.slice(-7);

    const tdeeVals = points.map((p) => p.tdee).filter((v): v is number => v != null);
    const intakeVals = points.map((p) => p.intake).filter((v): v is number => v != null);

    return {
      points,
      avgTdee: tdeeVals.length ? tdeeVals.reduce((a, b) => a + b, 0) / tdeeVals.length : 0,
      avgIntake: intakeVals.length ? intakeVals.reduce((a, b) => a + b, 0) / intakeVals.length : 0,
    };
  }, [tdeeData, intakeData]);

  const datesWithData = useMemo(() => {
    if (!intakeData) return new Set<string>();
    return new Set(intakeData.map((d) => d.date));
  }, [intakeData]);

  const isLoading = loading && !data;

  return (
    <div className={viewStyles.view}>
      <div className={styles.content}>
        <DayNavigator />
        <WeekStrip datesWithData={datesWithData} />

        {isLoading ? (
          <>
            <div className={styles.ringSection}>
              <SkeletonRing />
              <div className={styles.calorieStats}>
                <Skeleton width="60px" height="20px" />
                <Skeleton width="60px" height="20px" />
              </div>
            </div>
            <SkeletonCard lines={3} />
            <Skeleton width="140px" height="40px" radius="var(--radius-md)" />
            <SkeletonCard lines={2} />
          </>
        ) : (
          <>
            <div className={`${styles.ringSection} ${viewStyles.staggerIn}`}>
              <CalorieRing consumed={totals.calories} target={data?.computedCalorieTarget?.calorieTarget ?? user?.calorieTarget ?? 2200} tdee={data?.computedCalorieTarget?.tdeeUsed} />
              <div className={styles.calorieStats}>
                <div className={styles.calStat}>
                  <span className={styles.calVal}>{Math.round(totals.calories)}</span>
                  <span className={styles.calLabel}>consumed</span>
                </div>
                <div className={styles.calStat}>
                  <span className={styles.calVal}>{data?.computedCalorieTarget?.calorieTarget ?? user?.calorieTarget ?? 2200}</span>
                  <span className={styles.calLabel}>target</span>
                </div>
              </div>
              <button
                className={styles.weightBtn}
                onClick={() => setWeightModalOpen(true)}
              >
                <span className={styles.weightText}>
                  {todayWeight && todayWeight.length > 0
                    ? `${Number(todayWeight[0]!.weight).toFixed(1)} lbs`
                    : 'Log Weight'}
                </span>
              </button>
            </div>

            <div className={viewStyles.staggerIn} style={{ animationDelay: '120ms' }}>
              <MacroCard
                protein={totals.protein}
                proteinTarget={user?.proteinTarget ?? 180}
                fat={totals.fat}
                fatTarget={user?.fatTarget ?? 70}
                carbs={totals.carbs}
                carbsTarget={user?.carbTarget ?? 240}
              />
            </div>

            {!tdeeData || loading ? (
              <SkeletonCard lines={2} />
            ) : chartData.points.length > 0 ? (
              <div className={viewStyles.staggerIn} style={{ animationDelay: '180ms' }}>
                <TdeeIntakeChart
                  data={chartData.points}
                  avgTdee={chartData.avgTdee}
                  avgIntake={chartData.avgIntake}
                  targetCalories={data?.computedCalorieTarget?.calorieTarget}
                />
              </div>
            ) : (
              <EmptyState
                icon="📊"
                title="No trend data yet"
                description="Log a few days of food and weight to see your TDEE trend"
              />
            )}
          </>
        )}
      </div>
      <WeightModal
        open={weightModalOpen}
        date={dateStr}
        currentWeight={todayWeight?.[0] ? Number(todayWeight[0].weight) : user?.currentWeight ? Number(user.currentWeight) : undefined}
        onClose={() => setWeightModalOpen(false)}
        onSaved={handleWeightSaved}
      />
    </div>
  );
}
