import type { Text } from '@cpt/core';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { readSetting, writeSetting } from '../storage';
import type { Messages } from './define-messages';
import { messages } from './messages';

export type Language = 'de' | 'en';

const languages: readonly Language[] = ['de', 'en'];

const isLanguage = (value: string | undefined): value is Language =>
  languages.some((language) => language === value);

function initialLanguage(): Language {
  const stored = readSetting('language');
  if (isLanguage(stored)) return stored;
  return window.navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en';
}

type LanguageContextValue = { language: Language; setLanguage(language: Language): void };

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setChoice] = useState<Language>(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setChoice(next);
    writeSetting('language', next);
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage needs a LanguageProvider');
  return value;
}

export function useMessages<K extends string>(source: Messages<K>): Readonly<Record<K, string>> {
  return source[useLanguage().language];
}

export function useLocalize(): (text: Text) => string {
  const { language } = useLanguage();
  return useCallback((text) => text[language], [language]);
}

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  const text = useMessages(messages);
  const options = [
    { value: 'de', short: 'DE', label: text.german },
    { value: 'en', short: 'EN', label: text.english },
  ] as const;
  return (
    <div role="group" className="language-switch" aria-label={text.language}>
      {options.map(({ value, short, label }) => (
        <button
          key={value}
          type="button"
          className="chrome-button language-switch-option"
          lang={value}
          aria-label={label}
          aria-pressed={language === value}
          onClick={() => setLanguage(value)}
        >
          {short}
        </button>
      ))}
    </div>
  );
}
