import { useState, useEffect, useCallback } from 'react';

interface UseDarkModeReturn {
  isDark: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

export default function useDarkMode(): UseDarkModeReturn {
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') ?? 'light';
    }
    return 'light';
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(isDark ? 'light' : 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme, isDark]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const enable = useCallback(() => setTheme('dark'), []);
  const disable = useCallback(() => setTheme('light'), []);

  return { isDark, toggle, enable, disable };
}
