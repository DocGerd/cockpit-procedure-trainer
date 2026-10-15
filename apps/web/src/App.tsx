import { TrainerErrorBoundary } from './errors/TrainerErrorBoundary';
import { AudioProvider } from './audio';
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
        <AudioProvider>
          <TrainerProvider>
            <TrainerErrorBoundary>
              <Shell />
            </TrainerErrorBoundary>
          </TrainerProvider>
        </AudioProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
