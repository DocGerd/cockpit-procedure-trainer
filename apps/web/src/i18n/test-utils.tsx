import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { LanguageProvider } from './language';
import type { Language } from './language';

export function renderWithLanguage(ui: ReactElement, { language }: { language?: Language } = {}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <LanguageProvider initial={language}>{children}</LanguageProvider>
  );
  return render(ui, { wrapper });
}
