import type { ReactNode } from 'react';
import styles from './SettingsGroup.module.css';

interface Props {
  title: string;
  children: ReactNode;
}

export default function SettingsGroup({ title, children }: Props) {
  return (
    <div className={styles.group}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
