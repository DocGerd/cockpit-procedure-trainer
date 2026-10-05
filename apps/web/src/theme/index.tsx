import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { readSetting, writeSetting } from '../storage';

export type Theme = 'light' | 'dark';

const darkQuery = '(prefers-color-scheme: dark)';

function systemMedia(): MediaQueryList | undefined {
  return typeof window.matchMedia === 'function' ? window.matchMedia(darkQuery) : undefined;
}

function storedTheme(): Theme | undefined {
  const stored = readSetting('theme');
  return stored === 'light' || stored === 'dark' ? stored : undefined;
}

type ThemeContextValue = { theme: Theme; setTheme(theme: Theme): void };

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<Theme | undefined>(storedTheme);
  const [systemDark, setSystemDark] = useState(() => systemMedia()?.matches ?? false);

  useEffect(() => {
    const media = systemMedia();
    if (!media) return;
    const onChange = (event: { matches: boolean }) => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const theme: Theme = choice ?? (systemDark ? 'dark' : 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme(next) {
        setChoice(next);
        writeSetting('theme', next);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme needs a ThemeProvider');
  return value;
}

export type ThemeSwitchLabels = {
  light: string;
  dark: string;
  switchToLight: string;
  switchToDark: string;
};

export function ThemeSwitch({ labels }: { labels: ThemeSwitchLabels }) {
  const { theme, setTheme } = useTheme();
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="chrome-button"
      aria-label={next === 'dark' ? labels.switchToDark : labels.switchToLight}
      onClick={() => setTheme(next)}
    >
      {next === 'dark' ? labels.dark : labels.light}
    </button>
  );
}
