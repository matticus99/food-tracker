import { useMemo } from 'react';
import PageHeader from '../components/layout/PageHeader';
import DayNavigator from '../components/dashboard/DayNavigator';
import WeekStrip from '../components/dashboard/WeekStrip';
import CalorieRing from '../components/dashboard/CalorieRing';
import MacroCard from '../components/dashboard/MacroCard';
import TdeeIntakeChart from '../components/dashboard/TdeeIntakeChart';
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

interface User {
  calorieTarget: number;
  proteinTarget: number;
  fatTarget: number;
  carbTarget: number;
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

export default function DashboardView() {
  const { date, dateStr } = useDate();

  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const { data: logEntries } = useApi<LogEntry[]>(`/log?date=${dateStr}`);
  const { data: user } = useApi<User>('/user');
  const { data: tdeeData } = useApi<TdeePoint[]>('/analytics/tdee?days=7');
  const { data: intakeData } = useApi<IntakePoint[]>('/analytics/daily-intake?days=7');

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

    const points = allDates.map((dt) => ({
      date: dt,
      tdee: tdeeMap.get(dt),
      intake: intakeMap.get(dt),
    }));

    const tdeeVals = points.map((p) => p.tdee).filter(Boolean) as number[];
    const intakeVals = points.map((p) => p.intake).filter(Boolean) as number[];

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

  return (
    <div className={viewStyles.view}>
      <PageHeader title="Dashboard" date={dateLabel} />
      <div className={styles.content}>
        <DayNavigator />
        <WeekStrip datesWithData={datesWithData} />

        <div className={styles.ringSection}>
          <CalorieRing consumed={totals.calories} target={user?.calorieTarget ?? 2200} />
          <div className={styles.calorieStats}>
            <div className={styles.calStat}>
              <span className={styles.calVal}>{Math.round(totals.calories)}</span>
              <span className={styles.calLabel}>consumed</span>
            </div>
            <div className={styles.calStat}>
              <span className={styles.calVal}>{user?.calorieTarget ?? 2200}</span>
              <span className={styles.calLabel}>target</span>
            </div>
          </div>
        </div>

        <MacroCard
          protein={totals.protein}
          proteinTarget={user?.proteinTarget ?? 180}
          fat={totals.fat}
          fatTarget={user?.fatTarget ?? 70}
          carbs={totals.carbs}
          carbsTarget={user?.carbTarget ?? 240}
        />

        <TdeeIntakeChart
          data={chartData.points}
          avgTdee={chartData.avgTdee}
          avgIntake={chartData.avgIntake}
        />
      </div>
    </div>
  );
}
