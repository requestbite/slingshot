import { createContext } from 'preact';
import { useState, useEffect, useContext } from 'preact/hooks';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() =>
    localStorage.getItem('sl_theme') || 'system'
  );
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const applyTheme = (prefersDark) => {
      const shouldBeDark = theme === 'dark' || (theme === 'system' && prefersDark);
      setIsDark(shouldBeDark);
      document.documentElement.classList.toggle('dark', shouldBeDark);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = shouldBeDark ? '#282a36' : '#ffffff';
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme, isDark: shouldBeDark } }));
    };

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme(mq.matches);
    const handler = (e) => { if (theme === 'system') applyTheme(e.matches); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (newTheme) => {
    localStorage.setItem('sl_theme', newTheme);
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
