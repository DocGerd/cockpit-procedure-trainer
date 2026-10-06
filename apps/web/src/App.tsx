import { TrainerErrorBoundary } from './errors/TrainerErrorBoundary';
import { LanguageProvider } from './i18n';
import { PwaUpdatePrompt } from './pwa';
import { Shell } from './shell/Shell';
import { ThemeProvider } from './theme';
import { TrainerProvider } from './trainer';

export function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <PwaUpdatePrompt />
        <TrainerProvider>
          <TrainerErrorBoundary>
            <Shell />
          </TrainerErrorBoundary>
        </TrainerProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
