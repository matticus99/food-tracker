import { CATEGORY_KEYS, getCategoryLabel, type CategoryConfig } from '../../constants/categories';
import styles from './CategoryTabs.module.css';

interface Props {
  active: string;
  onChange: (v: string) => void;
  categoryConfig?: CategoryConfig | null;
}

export default function CategoryTabs({ active, onChange, categoryConfig }: Props) {
  const categories = [
    { value: '', label: 'All' },
    ...CATEGORY_KEYS.map((key) => ({
      value: key,
      label: getCategoryLabel(key, categoryConfig),
    })),
  ];

  return (
    <div className={styles.tabs}>
      {categories.map((cat) => (
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
