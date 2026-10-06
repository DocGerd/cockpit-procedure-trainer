import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from './register';
import { useMessages } from '../i18n';
import { messages } from './messages';
import { watchForUpdates } from './update-check';
import './pwa.css';

export function UpdatePrompt() {
  const text = useMessages(messages);
  const [waitingAtStart, setWaitingAtStart] = useState(false);
  const stopWatching = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => stopWatching.current?.(), []);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration?.waiting) setWaitingAtStart(true);
      if (registration) stopWatching.current = watchForUpdates(registration);
    },
  });

  if (!needRefresh && !waitingAtStart) return null;

  const later = () => {
    setNeedRefresh(false);
    setWaitingAtStart(false);
  };

  return (
    <div role="status" className="update-prompt">
      <div className="update-prompt-text">
        <div className="update-prompt-title">{text.updateTitle}</div>
        <div className="update-prompt-body">{text.updateBody}</div>
      </div>
      <div className="update-prompt-actions">
        <button type="button" className="button-secondary" onClick={later}>
          {text.later}
        </button>
        <button
          type="button"
          className="button-primary"
          onClick={() => void updateServiceWorker(true)}
        >
          {text.reload}
        </button>
      </div>
    </div>
  );
}
