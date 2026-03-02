import { useState, useEffect } from 'react';
import { apiFetch } from '../../hooks/useApi';
import styles from './WeightModal.module.css';

interface Props {
  open: boolean;
  date: string;
  currentWeight?: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function WeightModal({ open, date, currentWeight, onClose, onSaved }: Props) {
  const [weight, setWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setWeight(currentWeight ? String(currentWeight) : '');
    }
  }, [open, currentWeight]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weight) return;
    setSubmitting(true);
    try {
      await apiFetch('/weight', {
        method: 'POST',
        body: JSON.stringify({ date, weight: Number(weight) }),
      });
      onSaved();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Log Weight</h3>
        <p className={styles.date}>{new Date(date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              type="number"
              step="0.1"
              min="50"
              max="500"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              autoFocus
              placeholder="0.0"
            />
            <span className={styles.unit}>lbs</span>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={!weight || submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
