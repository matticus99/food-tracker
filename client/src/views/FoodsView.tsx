import { useState, useCallback } from 'react';
import PageHeader from '../components/layout/PageHeader';
import SearchBar from '../components/foods/SearchBar';
import CategoryTabs from '../components/foods/CategoryTabs';
import FoodDbList from '../components/foods/FoodDbList';
import FoodForm from '../components/foods/FoodForm';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { useApi, apiFetch } from '../hooks/useApi';
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
  const [category, setCategory] = useState('favorites');
  const [formOpen, setFormOpen] = useState(false);
  const [editFood, setEditFood] = useState<Food | null>(null);
  const { toast } = useToast();

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  const qs = params.toString();

  const { data: foods, loading, refetch } = useApi<Food[]>(`/foods${qs ? `?${qs}` : ''}`);

  const handleEdit = useCallback((food: Food) => {
    setEditFood(food);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/foods/${id}`, { method: 'DELETE' });
        refetch();
        toast('Food deleted', 'success');
      } catch {
        toast('Failed to delete food', 'error');
      }
    },
    [refetch, toast],
  );

  const handleAdd = useCallback(() => {
    setEditFood(null);
    setFormOpen(true);
  }, []);

  const handleSaved = useCallback(() => {
    refetch();
    toast(editFood ? 'Food updated' : 'Food created', 'success');
  }, [refetch, toast, editFood]);

  const isLoading = loading && !foods;
  const isEmpty = foods && foods.length === 0;

  return (
    <div className={viewStyles.view}>
      <PageHeader title="My Foods" />
      <div className={styles.content}>
        <SearchBar value={search} onChange={setSearch} />
        <CategoryTabs active={category} onChange={setCategory} />
        <div className={styles.macroHeader}>
          <span>Cal</span>
          <span>P</span>
          <span>F</span>
          <span>C</span>
        </div>

        {isLoading ? (
          <div className={styles.skeletonList}>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} width="100%" height="48px" radius="var(--radius-md)" />
            ))}
          </div>
        ) : isEmpty && search ? (
          <EmptyState
            icon="🔍"
            title="No results found"
            description={`No foods match "${search}"`}
            action={{ label: 'Clear Search', onClick: () => setSearch('') }}
          />
        ) : isEmpty ? (
          <EmptyState
            icon="🥗"
            title="No foods yet"
            description="Add your first custom food to get started"
            action={{ label: 'Add Food', onClick: handleAdd }}
          />
        ) : (
          <FoodDbList
            foods={foods ?? []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAdd={handleAdd}
          />
        )}
      </div>
      <FoodForm
        open={formOpen}
        food={editFood}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
