import { useState, useCallback } from 'react';
import PageHeader from '../components/layout/PageHeader';
import SearchBar from '../components/foods/SearchBar';
import CategoryTabs from '../components/foods/CategoryTabs';
import FoodDbList from '../components/foods/FoodDbList';
import FoodForm from '../components/foods/FoodForm';
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
  const [category, setCategory] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editFood, setEditFood] = useState<Food | null>(null);

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  const qs = params.toString();

  const { data: foods, refetch } = useApi<Food[]>(`/foods${qs ? `?${qs}` : ''}`);

  const handleEdit = useCallback((food: Food) => {
    setEditFood(food);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await apiFetch(`/foods/${id}`, { method: 'DELETE' });
      refetch();
    },
    [refetch],
  );

  const handleAdd = useCallback(() => {
    setEditFood(null);
    setFormOpen(true);
  }, []);

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
        <FoodDbList
          foods={foods ?? []}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAdd={handleAdd}
        />
      </div>
      <FoodForm
        open={formOpen}
        food={editFood}
        onClose={() => setFormOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
}
