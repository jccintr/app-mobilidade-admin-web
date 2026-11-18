import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'admin_theme';
const ThemeContext = createContext(null);

const read = () => {
  try {
    return localStorage.getItem(KEY) || 'auto';
  } catch {
    return 'auto';
  }
};

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(read);
  const [system, setSystem] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystem(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const dark = mode === 'dark' || (mode === 'auto' && system);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const value = useMemo(
    () => ({
      mode,
      dark,
      setMode: (next) => {
        setMode(next);
        try {
          localStorage.setItem(KEY, next);
        } catch {
          /* ignora */
        }
      },
    }),
    [mode, dark],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
