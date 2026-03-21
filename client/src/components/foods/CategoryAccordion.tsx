import { useState, useEffect, useCallback, useRef } from 'react';
import { getCategoryLabel, getAllCategories, type CategoryConfig } from '../../constants/categories';
import { TIME_BLOCKS } from '../../constants/timeBlocks';
import { useApi } from '../../hooks/useApi';
import FoodDbList from './FoodDbList';
import { Skeleton } from '../ui/Skeleton';
import styles from './CategoryAccordion.module.css';

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

interface Props {
  counts: Record<string, number> | null;
  search: string;
  categoryConfig?: CategoryConfig | null;
  onEdit: (food: Food) => void;
  onDelete: (id: string) => void;
  onAdd: (category?: string) => void;
  onLogAll: (foods: Food[], timeHour: number) => void;
  refreshTrigger: number;
  refetchCounts: () => void;
  onAddCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
  onRenameCategory: (key: string, newLabel: string) => void;
}

function AccordionCard({
  categoryKey,
  label,
  count,
  expanded,
  onToggle,
  search,
  onEdit,
  onDelete,
  onAdd,
  onLogAll,
  refreshTrigger,
  isCustom,
  onDeleteCategory,
  onRenameCategory,
}: {
  categoryKey: string;
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  search: string;
  onEdit: (food: Food) => void;
  onDelete: (id: string) => void;
  onAdd: (category?: string) => void;
  onLogAll: (foods: Food[], timeHour: number) => void;
  refreshTrigger: number;
  isCustom: boolean;
  onDeleteCategory?: (name: string) => void;
  onRenameCategory?: (key: string, newLabel: string) => void;
}) {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(label);
  const renameRef = useRef<HTMLInputElement>(null);
  const params = new URLSearchParams({ category: categoryKey });
  if (search) params.set('search', search);
  const apiPath = expanded ? `/foods?${params}` : null;
  const { data: foods, loading, refetch } = useApi<Food[]>(apiPath);

  const prevTrigger = useRef(refreshTrigger);
  useEffect(() => {
    if (expanded && refreshTrigger !== prevTrigger.current) {
      refetch();
    }
    prevTrigger.current = refreshTrigger;
  }, [refreshTrigger, expanded, refetch]);

  // Hide time picker when card collapses
  useEffect(() => {
    if (!expanded) setShowTimePicker(false);
  }, [expanded]);

  const commitRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== label) {
      onRenameCategory?.(categoryKey, trimmed);
    }
    setRenaming(false);
  }, [renameValue, label, categoryKey, onRenameCategory]);

  useEffect(() => {
    if (renaming) {
      renameRef.current?.focus();
      renameRef.current?.select();
    }
  }, [renaming]);

  return (
    <div className={`${styles.card} ${expanded ? styles.expanded : ''}`}>
      {renaming ? (
        <div className={styles.header}>
          <input
            ref={renameRef}
            className={styles.renameInput}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setRenameValue(label); setRenaming(false); }
            }}
            maxLength={50}
          />
        </div>
      ) : (
        <button className={styles.header} onClick={onToggle}>
          <span className={styles.label}>{label}</span>
          <button
            className={styles.renameBtn}
            onClick={(e) => {
              e.stopPropagation();
              setRenameValue(label);
              setRenaming(true);
            }}
            aria-label="Rename category"
          >
            &#9998;
          </button>
          <span className={styles.count}>{count}</span>
          <span className={styles.chevron}>{expanded ? '\u25BE' : '\u25B8'}</span>
        </button>
      )}
      <div className={styles.body}>
        <div className={styles.bodyInner}>
          {expanded && (
            <>
              <div className={styles.macroHeader}>
                <span>Cal</span>
                <span>P</span>
                <span>F</span>
                <span>C</span>
              </div>
              {loading && !foods ? (
                <div className={styles.skeletonList}>
                  {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} width="100%" height="48px" radius="var(--radius-md)" />
                  ))}
                </div>
              ) : foods && foods.length > 0 ? (
                <>
                  <FoodDbList
                    foods={foods}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAdd={() => onAdd(categoryKey)}
                  />
                  <div className={styles.logAllWrap}>
                    <button
                      className={styles.logAllBtn}
                      onClick={() => setShowTimePicker((v) => !v)}
                    >
                      Log All ({foods.length})
                    </button>
                    {showTimePicker && (
                      <div className={styles.logAllTimePicker}>
                        {TIME_BLOCKS.map((block) => (
                          <button
                            key={block.key}
                            className={styles.logAllTimeBtn}
                            onClick={() => {
                              onLogAll(foods, block.hour);
                              setShowTimePicker(false);
                            }}
                          >
                            <span className={styles.logAllTimeIcon}>{block.icon}</span>
                            <span className={styles.logAllTimeLabel}>{block.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className={styles.emptyCard}>
                  <span>No foods in this category</span>
                  <button className={styles.addBtn} onClick={() => onAdd(categoryKey)}>+ Add Food</button>
                </div>
              )}
              {isCustom && count === 0 && (
                <button
                  className={styles.deleteCategoryBtn}
                  onClick={() => onDeleteCategory?.(categoryKey)}
                >
                  Remove category
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const MAX_CATEGORIES = 15;

export default function CategoryAccordion({
  counts,
  search,
  categoryConfig,
  onEdit,
  onDelete,
  onAdd,
  onLogAll,
  refreshTrigger,
  onAddCategory,
  onDeleteCategory,
  onRenameCategory,
}: Props) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const prevSearch = useRef(search);

  const definedCategories = getAllCategories(categoryConfig);
  const customCategories = categoryConfig?.customCategories ?? [];

  // Include categories from DB that aren't in the defined list (e.g. old/legacy categories with foods)
  const dbOnlyCategories = counts
    ? Object.keys(counts).filter((k) => !definedCategories.includes(k) && (counts[k] ?? 0) > 0)
    : [];
  const allCategories = [...definedCategories, ...dbOnlyCategories];

  // Auto-expand first matching category when search changes
  useEffect(() => {
    if (search && search !== prevSearch.current && counts) {
      const firstMatch = allCategories.find((key) => (counts[key] ?? 0) > 0);
      setExpandedCategory(firstMatch ?? null);
    } else if (!search && prevSearch.current) {
      setExpandedCategory(null);
    }
    prevSearch.current = search;
  }, [search, counts, allCategories]);

  const handleToggle = useCallback((key: string) => {
    setExpandedCategory((prev) => (prev === key ? null : key));
  }, []);

  const handleAddCategory = useCallback(() => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (allCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return;
    onAddCategory(trimmed);
    setNewCategoryName('');
    setShowAddForm(false);
  }, [newCategoryName, allCategories, onAddCategory]);

  const visibleCategories = allCategories.filter((key) => {
    if (!search) return true;
    return (counts?.[key] ?? 0) > 0;
  });

  const canAddMore = allCategories.length < MAX_CATEGORIES;

  return (
    <div className={styles.accordion}>
      {visibleCategories.map((key) => (
        <AccordionCard
          key={key}
          categoryKey={key}
          label={getCategoryLabel(key, categoryConfig)}
          count={counts?.[key] ?? 0}
          expanded={expandedCategory === key}
          onToggle={() => handleToggle(key)}
          search={search}
          onEdit={onEdit}
          onDelete={onDelete}
          onAdd={onAdd}
          onLogAll={onLogAll}
          refreshTrigger={refreshTrigger}
          isCustom={customCategories.includes(key)}
          onDeleteCategory={onDeleteCategory}
          onRenameCategory={onRenameCategory}
        />
      ))}
      {search && visibleCategories.length === 0 && (
        <div className={styles.noResults}>No foods match your search</div>
      )}
      {!search && canAddMore && (
        showAddForm ? (
          <div className={styles.addCategoryForm}>
            <input
              className={styles.addCategoryInput}
              type="text"
              placeholder="Category name..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              maxLength={50}
              autoFocus
            />
            <button className={styles.addCategoryConfirm} onClick={handleAddCategory}>Add</button>
            <button className={styles.addCategoryCancel} onClick={() => { setShowAddForm(false); setNewCategoryName(''); }}>
              &times;
            </button>
          </div>
        ) : (
          <button className={styles.addCategoryBtn} onClick={() => setShowAddForm(true)}>
            + Add Category
          </button>
        )
      )}
    </div>
  );
}
