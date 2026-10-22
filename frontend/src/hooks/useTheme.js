import { useCallback, useState } from 'react';

const KEY = 'attendflow.theme';

// index.html applies the saved or system theme before first paint; this hook reads and changes it.
const readTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

export function useTheme() {
  const [theme, setTheme] = useState(readTheme);

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage unavailable: the choice lasts until reload */
    }
    setTheme(next);
  }, [theme]);

  return { theme, toggle };
}
