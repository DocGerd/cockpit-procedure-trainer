import { useRegisterSW } from './register';
import { useMessages } from '../i18n';
import { messages } from './messages';
import './pwa.css';

export function UpdatePrompt() {
  const text = useMessages(messages);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div role="status" className="update-prompt">
      <div className="update-prompt-text">
        <div className="update-prompt-title">{text.updateTitle}</div>
        <div className="update-prompt-body">{text.updateBody}</div>
      </div>
      <div className="update-prompt-actions">
        <button type="button" className="button-secondary" onClick={() => setNeedRefresh(false)}>
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
