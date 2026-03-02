import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  date?: string;
}

export default function PageHeader({ title, date }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      {date && <div className={styles.date}>{date}</div>}
      <h1 className={styles.title}>{title}</h1>
    </header>
  );
}
