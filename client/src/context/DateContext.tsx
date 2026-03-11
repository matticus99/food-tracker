import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { toLocalDateStr } from '../utils/date';

interface DateContextValue {
  date: Date;
  dateStr: string;
  setDate: (d: Date) => void;
  goNext: () => void;
  goPrev: () => void;
  goToday: () => void;
  isToday: boolean;
}

const DateContext = createContext<DateContextValue | null>(null);

export function DateProvider({ children }: { children: ReactNode }) {
  const [date, setDateRaw] = useState(() => new Date());
  const dateStr = toLocalDateStr(date);
  const todayStr = toLocalDateStr(new Date());
  const isToday = dateStr === todayStr;

  const setDate = useCallback((d: Date) => setDateRaw(d), []);

  const goNext = useCallback(() => {
    setDateRaw((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }, []);

  const goPrev = useCallback(() => {
    setDateRaw((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return next;
    });
  }, []);

  const goToday = useCallback(() => setDateRaw(new Date()), []);

  return (
    <DateContext.Provider value={{ date, dateStr, setDate, goNext, goPrev, goToday, isToday }}>
      {children}
    </DateContext.Provider>
  );
}

export function useDate() {
  const ctx = useContext(DateContext);
  if (!ctx) throw new Error('useDate must be used within DateProvider');
  return ctx;
}
