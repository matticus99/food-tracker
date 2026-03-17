import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';
export type TextSize = 'small' | 'default' | 'large';

const TEXT_SIZE_PX: Record<TextSize, string> = {
  small: '14px',
  default: '16px',
  large: '18px',
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  textSize: TextSize;
  setTextSize: (s: TextSize) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('food-tracker-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function getInitialTextSize(): TextSize {
  const stored = localStorage.getItem('food-tracker-text-size');
  if (stored === 'small' || stored === 'default' || stored === 'large') return stored;
  return 'default';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [textSize, setTextSize] = useState<TextSize>(getInitialTextSize);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('food-tracker-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = TEXT_SIZE_PX[textSize];
    localStorage.setItem('food-tracker-text-size', textSize);
  }, [textSize]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, textSize, setTextSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
