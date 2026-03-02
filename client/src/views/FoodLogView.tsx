import { useState, useMemo, useCallback } from 'react';
import PageHeader from '../components/layout/PageHeader';
import DayNavigator from '../components/dashboard/DayNavigator';
import LogSummary from '../components/log/LogSummary';
import Timeline from '../components/log/Timeline';
import AddFoodModal from '../components/log/AddFoodModal';
import { useDate } from '../context/DateContext';
import { useApi, apiFetch } from '../hooks/useApi';
import styles from './FoodLogView.module.css';
import viewStyles from './Views.module.css';

interface LogEntry {
  id: string;
  timeHour: number;
  servings: string;
  food: {
    name: string;
    emoji: string | null;
    servingLabel: string;
    calories: string | null;
    protein: string | null;
    fat: string | null;
    carbs: string | null;
  };
}

export default function FoodLogView() {
  const { date, dateStr } = useDate();
  const { data: entries, refetch } = useApi<LogEntry[]>(`/log?date=${dateStr}`);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalHour, setModalHour] = useState(12);

  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const totals = useMemo(() => {
    if (!entries) return { calories: 0, protein: 0, fat: 0, carbs: 0 };
    return entries.reduce(
      (acc, e) => {
        const s = Number(e.servings) || 1;
        acc.calories += (Number(e.food.calories) || 0) * s;
        acc.protein += (Number(e.food.protein) || 0) * s;
        acc.fat += (Number(e.food.fat) || 0) * s;
        acc.carbs += (Number(e.food.carbs) || 0) * s;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0 },
    );
  }, [entries]);

  const handleDelete = useCallback(
    async (id: string) => {
      await apiFetch(`/log/${id}`, { method: 'DELETE' });
      refetch();
    },
    [refetch],
  );

  const openAddModal = useCallback((hour: number) => {
    setModalHour(hour);
    setModalOpen(true);
  }, []);

  return (
    <div className={viewStyles.view}>
      <PageHeader title="Food Log" date={dateLabel} />
      <div className={styles.content}>
        <DayNavigator />
        <LogSummary
          calories={totals.calories}
          protein={totals.protein}
          fat={totals.fat}
          carbs={totals.carbs}
        />
        <Timeline
          entries={entries ?? []}
          onDelete={handleDelete}
          onAddAtHour={openAddModal}
        />
        <button className={styles.fab} onClick={() => openAddModal(new Date().getHours())}>
          +
        </button>
      </div>
      <AddFoodModal
        open={modalOpen}
        hour={modalHour}
        date={dateStr}
        onClose={() => setModalOpen(false)}
        onAdded={refetch}
      />
    </div>
  );
}
