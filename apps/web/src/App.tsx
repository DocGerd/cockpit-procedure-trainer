import { TrainerErrorBoundary } from './errors/TrainerErrorBoundary';
import { Shell } from './shell/Shell';
import { ThemeProvider } from './theme';
import { TrainerProvider } from './trainer';

export function App() {
  return (
    <ThemeProvider>
      <TrainerProvider>
        <TrainerErrorBoundary>
          <Shell />
        </TrainerErrorBoundary>
      </TrainerProvider>
    </ThemeProvider>
  );
}
