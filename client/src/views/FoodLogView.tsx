import { useState, useMemo, useCallback } from 'react';
import DayNavigator from '../components/dashboard/DayNavigator';
import LogSummary from '../components/log/LogSummary';
import Timeline from '../components/log/Timeline';
import AddFoodModal from '../components/log/AddFoodModal';
import EditFoodModal from '../components/log/EditFoodModal';
import type { EditEntry } from '../components/log/EditFoodModal';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useDate } from '../context/DateContext';
import { useApi, apiFetch } from '../hooks/useApi';
import type { CategoryConfig } from '../constants/categories';
import styles from './FoodLogView.module.css';
import viewStyles from './Views.module.css';

interface LogEntry {
  id: string;
  timeHour: number;
  servings: string;
  food: {
    id: string;
    name: string;
    emoji: string | null;
    servingLabel: string;
    servingGrams: string | null;
    calories: string | null;
    protein: string | null;
    fat: string | null;
    carbs: string | null;
  };
}

export default function FoodLogView() {
  const { dateStr } = useDate();
  const { data: entries, loading, refetch } = useApi<LogEntry[]>(`/log?date=${dateStr}`);
  const { data: user } = useApi<{ categoryConfig: CategoryConfig | null }>('/user');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalHour, setModalHour] = useState(12);
  const [editEntry, setEditEntry] = useState<EditEntry | null>(null);
  const { toast } = useToast();

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
      try {
        await apiFetch(`/log/${id}`, { method: 'DELETE' });
        refetch();
        toast('Entry removed', 'success');
      } catch {
        toast('Failed to delete entry', 'error');
      }
    },
    [refetch, toast],
  );

  const handleEdit = useCallback(
    (id: string) => {
      const entry = entries?.find((e) => e.id === id);
      if (!entry) return;
      setEditEntry({
        id: entry.id,
        servings: Number(entry.servings) || 1,
        timeHour: entry.timeHour,
        food: entry.food,
      });
    },
    [entries],
  );

  const handleEditSaved = useCallback(() => {
    refetch();
    toast('Entry updated', 'success');
  }, [refetch, toast]);

  const openAddModal = useCallback((hour: number) => {
    setModalHour(hour);
    setModalOpen(true);
  }, []);

  const handleAdded = useCallback(() => {
    refetch();
    toast('Food added', 'success');
  }, [refetch, toast]);

  const isLoading = loading && !entries;

  return (
    <div className={viewStyles.view}>
      <div className={styles.content}>
        <DayNavigator />
        <LogSummary
          calories={totals.calories}
          protein={totals.protein}
          fat={totals.fat}
          carbs={totals.carbs}
        />

        {isLoading ? (
          <div className={styles.skeletonList}>
            <Skeleton width="100%" height="52px" radius="var(--radius-md)" />
            <Skeleton width="100%" height="52px" radius="var(--radius-md)" />
            <Skeleton width="100%" height="52px" radius="var(--radius-md)" />
          </div>
        ) : (
          <Timeline
            entries={entries ?? []}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onAddAtHour={openAddModal}
          />
        )}

        <button className={styles.fab} onClick={() => openAddModal(new Date().getHours())}>
          +
        </button>
      </div>
      <AddFoodModal
        open={modalOpen}
        hour={modalHour}
        date={dateStr}
        onClose={() => setModalOpen(false)}
        onAdded={handleAdded}
        categoryConfig={user?.categoryConfig}
      />
      <EditFoodModal
        entry={editEntry}
        onClose={() => setEditEntry(null)}
        onSaved={handleEditSaved}
      />
    </div>
  );
}
