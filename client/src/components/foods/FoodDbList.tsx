import styles from './FoodDbList.module.css';

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
  foods: Food[];
  onEdit: (food: Food) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export default function FoodDbList({ foods, onEdit, onDelete, onAdd }: Props) {
  return (
    <div className={styles.list}>
      {foods.map((food) => {
        const needsMacros = food.source === 'imported_history' && !food.calories;
        return (
          <div key={food.id} className={styles.item} onClick={() => onEdit(food)}>
            <span className={styles.emoji}>{food.emoji || '🍽️'}</span>
            <div className={styles.info}>
              <span className={styles.name}>
                {food.name}
                {needsMacros && <span className={styles.badge}>needs macros</span>}
              </span>
              <span className={styles.serving}>{food.servingLabel}</span>
            </div>
            <div className={styles.macros}>
              <span className={styles.macro}>{food.calories ? Math.round(Number(food.calories)) : '—'}</span>
              <span className={styles.macro}>{food.protein ? Math.round(Number(food.protein)) : '—'}</span>
              <span className={styles.macro}>{food.fat ? Math.round(Number(food.fat)) : '—'}</span>
              <span className={styles.macro}>{food.carbs ? Math.round(Number(food.carbs)) : '—'}</span>
            </div>
            <button
              className={styles.deleteBtn}
              onClick={(e) => { e.stopPropagation(); onDelete(food.id); }}
              aria-label="Delete food"
            >
              ×
            </button>
          </div>
        );
      })}
      <button className={styles.addNewBtn} onClick={onAdd}>
        + Add New Food
      </button>
    </div>
  );
}
