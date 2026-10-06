import { useId } from 'react';
import { useMessages } from '../i18n';
import { messages } from './messages';
import './errors.css';

export function StartupNotice() {
  const text = useMessages(messages);
  const titleId = useId();
  return (
    <div role="note" aria-labelledby={titleId} className="startup-notice">
      <div id={titleId} className="startup-notice-title">
        {text.noticeTitle}
      </div>
      <div className="startup-notice-body">{text.noticeBody}</div>
    </div>
  );
}
