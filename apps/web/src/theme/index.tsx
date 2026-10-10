import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

// The build's tags are media-scoped, which already covers a mount with no choice. An explicit
// choice makes its tag unconditional and disables the other, so the browser chrome follows the
// choice rather than the OS.
function applyThemeColorChoice(choice: Theme) {
  const tags = document.head.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"][data-scheme]',
  );
  for (const tag of tags) {
    tag.setAttribute('media', tag.dataset.scheme === choice ? 'all' : 'not all');
  }
}

const FADE_CLASS = 'theme-fading';
const FADE_SETTLE_MS = 50;

// The class turns the chrome's colour transitions on (styles/theme-fade.css) only while a
// user-chosen change plays, so the first application and hover transitions are left alone.
function fadeDurationMs(root: HTMLElement): number {
  const raw = getComputedStyle(root).getPropertyValue('--duration-theme').trim();
  const value = Number.parseFloat(raw) || 0;
  return raw.endsWith('ms') ? value : value * 1000;
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

  const fadeNext = useRef(false);
  const fadeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const root = document.documentElement;
    if (fadeNext.current) {
      fadeNext.current = false;
      window.clearTimeout(fadeTimer.current);
      root.classList.add(FADE_CLASS);
      fadeTimer.current = window.setTimeout(
        () => root.classList.remove(FADE_CLASS),
        fadeDurationMs(root) + FADE_SETTLE_MS,
      );
    }
    root.dataset.theme = theme;
  }, [theme]);

  useEffect(() => () => window.clearTimeout(fadeTimer.current), []);

  useEffect(() => {
    if (choice) applyThemeColorChoice(choice);
  }, [choice]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme(next) {
        fadeNext.current = next !== theme;
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
  switchToLight: string;
  switchToDark: string;
};

function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    <svg
      className="theme-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      data-icon={theme}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {theme === 'dark' ? (
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      ) : (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </>
      )}
    </svg>
  );
}

/** Shows the theme in use; its name says the theme it switches to. */
export function ThemeSwitch({ labels }: { labels: ThemeSwitchLabels }) {
  const { theme, setTheme } = useTheme();
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? labels.switchToDark : labels.switchToLight;
  return (
    <button
      type="button"
      className="chrome-button theme-switch"
      aria-label={label}
      title={label}
      onClick={() => setTheme(next)}
    >
      <ThemeIcon theme={theme} />
    </button>
  );
}
