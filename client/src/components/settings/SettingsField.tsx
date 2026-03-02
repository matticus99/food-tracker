import type { ReactNode } from 'react';
import styles from './SettingsField.module.css';

interface Props {
  label: string;
  suffix?: string;
  children: ReactNode;
}

export default function SettingsField({ label, suffix, children }: Props) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <div className={styles.inputRow}>
        {children}
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>
    </div>
  );
}
