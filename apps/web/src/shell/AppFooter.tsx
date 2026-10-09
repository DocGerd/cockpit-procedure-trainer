import { Component, lazy, Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import { deployEnv } from '../deploy-env';
import { useMessages } from '../i18n';
import { versionLabel } from '../version';
import { messages as aboutMessages } from './about.messages';
import { messages } from './messages';
import './footer.css';

// lazy() keeps a rejected load for good, so a failure swaps in a fresh one that fetches the chunk again.
const loadAbout = () => lazy(() => import('./About').then((module) => ({ default: module.About })));
let About = loadAbout();

// A failed About load closes About instead of reaching the trainer's error boundary, which resets the session.
class AboutBoundary extends Component<
  { children: ReactNode; onFail(): void },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch() {
    About = loadAbout();
    this.props.onFail();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

function appVersion() {
  return versionLabel({
    release: import.meta.env.VITE_APP_RELEASE,
    deployEnv: deployEnv(import.meta.env.VITE_DEPLOY_ENV),
    commit: import.meta.env.VITE_BUILD_SHA,
  });
}

export function AppFooter() {
  const text = useMessages(messages);
  const about = useMessages(aboutMessages);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <footer className="app-footer">
      <span>{import.meta.env.VITE_COPYRIGHT}</span>
      <button
        type="button"
        className="app-footer-version readout"
        title={about.openAbout}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {text.version} {appVersion()}
      </button>
      {open && (
        <AboutBoundary onFail={close}>
          <Suspense fallback={null}>
            <About onClose={close} />
          </Suspense>
        </AboutBoundary>
      )}
    </footer>
  );
}
