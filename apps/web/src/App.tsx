import { TrainerErrorBoundary } from './errors/TrainerErrorBoundary';
import { LanguageProvider } from './i18n';
import { Shell } from './shell/Shell';
import { ThemeProvider } from './theme';
import { TrainerProvider } from './trainer';

export function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <TrainerProvider>
          <TrainerErrorBoundary>
            <Shell />
          </TrainerErrorBoundary>
        </TrainerProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
