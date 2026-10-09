import { deployEnv } from '../deploy-env';
import { useMessages } from '../i18n';
import { versionLabel } from '../version';
import { messages } from './messages';
import './footer.css';

export function AppFooter() {
  const text = useMessages(messages);
  const version = versionLabel({
    release: import.meta.env.VITE_APP_RELEASE,
    deployEnv: deployEnv(import.meta.env.VITE_DEPLOY_ENV),
    commit: import.meta.env.VITE_BUILD_SHA,
  });
  return (
    <footer className="app-footer">
      <span>{import.meta.env.VITE_COPYRIGHT}</span>
      <span>
        {text.version} {version}
      </span>
    </footer>
  );
}
