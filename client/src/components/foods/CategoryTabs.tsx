import styles from './CategoryTabs.module.css';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'proteins', label: 'Proteins' },
  { value: 'grains', label: 'Grains' },
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'drinks', label: 'Drinks' },
];

interface Props {
  active: string;
  onChange: (v: string) => void;
}

export default function CategoryTabs({ active, onChange }: Props) {
  return (
    <div className={styles.tabs}>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          className={`${styles.tab} ${active === cat.value ? styles.active : ''}`}
          onClick={() => onChange(cat.value)}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
