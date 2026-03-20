import { useState, useCallback, useRef, useEffect } from 'react';
import PageHeader from '../components/layout/PageHeader';
import SearchBar from '../components/foods/SearchBar';
import CategoryAccordion from '../components/foods/CategoryAccordion';
import FoodForm from '../components/foods/FoodForm';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useApi, apiFetch } from '../hooks/useApi';
import { useDate } from '../context/DateContext';
import type { CategoryConfig } from '../constants/categories';
import styles from './FoodsView.module.css';
import viewStyles from './Views.module.css';

interface Food {
  id: string;
  name: string;
  emoji: string | null;
  category: string;
  servingLabel: string;
  servingGrams: string | null;
  calories: string | null;
  protein: string | null;
  fat: string | null;
  carbs: string | null;
  source: string;
}

export default function FoodsView() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editFood, setEditFood] = useState<Food | null>(null);
  const [defaultCategory, setDefaultCategory] = useState('favorites');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();
  const { dateStr } = useDate();
  const { data: user, refetch: refetchUser } = useApi<{ categoryConfig: CategoryConfig | null }>('/user');

  // Debounce search for API calls
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timerRef.current);
  }, [search]);

  const countsQs = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '';
  const { data: counts, loading: countsLoading, refetch: refetchCounts } = useApi<Record<string, number>>(`/foods/counts${countsQs}`);

  const handleEdit = useCallback((food: Food) => {
    setEditFood(food);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/foods/${id}`, { method: 'DELETE' });
        setRefreshTrigger((n) => n + 1);
        refetchCounts();
        toast('Food deleted', 'success');
      } catch {
        toast('Failed to delete food', 'error');
      }
    },
    [refetchCounts, toast],
  );

  const handleAdd = useCallback((category?: string) => {
    setEditFood(null);
    setDefaultCategory(category ?? 'favorites');
    setFormOpen(true);
  }, []);

  const handleSaved = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
    refetchCounts();
    toast(editFood ? 'Food updated' : 'Food created', 'success');
  }, [refetchCounts, toast, editFood]);

  const handleAddCategory = useCallback(async (name: string) => {
    const current = user?.categoryConfig ?? {};
    const custom = [...(current.customCategories ?? []), name];
    try {
      await apiFetch('/user', {
        method: 'PUT',
        body: JSON.stringify({ categoryConfig: { ...current, customCategories: custom } }),
      });
      refetchUser();
      toast(`Category "${name}" added`, 'success');
    } catch {
      toast('Failed to add category', 'error');
    }
  }, [user, refetchUser, toast]);

  const handleLogAll = useCallback(async (foods: { id: string }[], timeHour: number) => {
    try {
      const entries = foods.map((f) => ({
        foodId: f.id,
        date: dateStr,
        timeHour,
        servings: 1,
      }));
      await apiFetch('/log/batch', {
        method: 'POST',
        body: JSON.stringify({ entries }),
      });
      toast(`Logged ${foods.length} food${foods.length > 1 ? 's' : ''}`, 'success');
    } catch {
      toast('Failed to log foods', 'error');
    }
  }, [dateStr, toast]);

  const handleRenameCategory = useCallback(async (key: string, newLabel: string) => {
    const current = user?.categoryConfig ?? {};
    const labels = { ...(current.labels ?? {}), [key]: newLabel };
    try {
      await apiFetch('/user', {
        method: 'PUT',
        body: JSON.stringify({ categoryConfig: { ...current, labels } }),
      });
      refetchUser();
      toast(`Category renamed to "${newLabel}"`, 'success');
    } catch {
      toast('Failed to rename category', 'error');
    }
  }, [user, refetchUser, toast]);

  const handleDeleteCategory = useCallback(async (name: string) => {
    const current = user?.categoryConfig ?? {};
    const custom = (current.customCategories ?? []).filter((c) => c !== name);
    try {
      await apiFetch('/user', {
        method: 'PUT',
        body: JSON.stringify({ categoryConfig: { ...current, customCategories: custom } }),
      });
      refetchUser();
      refetchCounts();
      toast(`Category "${name}" removed`, 'success');
    } catch {
      toast('Failed to remove category', 'error');
    }
  }, [user, refetchUser, refetchCounts, toast]);

  const isLoading = countsLoading && !counts;

  return (
    <div className={viewStyles.view}>
      <PageHeader title="My Foods" />
      <div className={styles.content}>
        <SearchBar value={search} onChange={setSearch} />

        {isLoading ? (
          <div className={styles.skeletonList}>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} width="100%" height="44px" radius="var(--radius-md)" />
            ))}
          </div>
        ) : (
          <CategoryAccordion
            counts={counts}
            search={debouncedSearch}
            categoryConfig={user?.categoryConfig}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAdd={handleAdd}
            onLogAll={handleLogAll}
            refreshTrigger={refreshTrigger}
            refetchCounts={refetchCounts}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onRenameCategory={handleRenameCategory}
          />
        )}
      </div>
      <FoodForm
        open={formOpen}
        food={editFood}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        categoryConfig={user?.categoryConfig}
        defaultCategory={defaultCategory}
      />
    </div>
  );
}
