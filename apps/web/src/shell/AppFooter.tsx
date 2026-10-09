import { lazy, Suspense, useState } from 'react';
import { deployEnv } from '../deploy-env';
import { useMessages } from '../i18n';
import { versionLabel } from '../version';
import { messages as aboutMessages } from './about.messages';
import { messages } from './messages';
import './footer.css';

const About = lazy(() => import('./About').then((module) => ({ default: module.About })));

export function appVersion() {
  return versionLabel({
    release: import.meta.env.VITE_APP_RELEASE,
    deployEnv: deployEnv(import.meta.env.VITE_DEPLOY_ENV),
    commit: import.meta.env.VITE_BUILD_SHA,
  });
}

const COMMIT_LENGTH = 7;

/** The release and its commit, for places that identify the exact build in any environment. */
export function buildLabel() {
  const release = import.meta.env.VITE_APP_RELEASE;
  const commit = import.meta.env.VITE_BUILD_SHA?.slice(0, COMMIT_LENGTH);
  return [release === undefined ? 'dev' : `v${release}`, commit].filter(Boolean).join(' · ');
}

export function AppFooter() {
  const text = useMessages(messages);
  const about = useMessages(aboutMessages);
  const [open, setOpen] = useState(false);
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
        <Suspense fallback={null}>
          <About onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </footer>
  );
}
