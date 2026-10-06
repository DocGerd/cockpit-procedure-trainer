import type { ChecklistState } from '@cpt/core';
import { useEffect, useRef, useState } from 'react';
import { format, useLocalize, useMessages } from '../i18n';
import { useSessionState, useTrainer } from '../trainer';
import { messages } from './messages';

type Seen = { procedure: ChecklistState<unknown>['procedure']; current: number; done: boolean };

/** Speaks each step advance and the completion; deviations stay in the Guided banner. */
export function ChecklistAnnouncer() {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { mode } = useTrainer();
  const checklist = useSessionState((snapshot) => snapshot.checklist());
  const [message, setMessage] = useState('');
  const seen = useRef<Seen | undefined>(undefined);
  const active = mode !== 'explore' && checklist !== undefined;
  const procedure = checklist?.procedure;
  const current = checklist?.current;
  const done = checklist?.done ?? false;

  useEffect(() => {
    if (!active || procedure === undefined || current === undefined) {
      seen.current = undefined;
      setMessage('');
      return;
    }
    const previous = seen.current;
    seen.current = { procedure, current, done };
    if (previous?.procedure !== procedure) {
      setMessage('');
      return;
    }
    if (done && !previous.done) {
      setMessage(format(text.announceDone, { title: localize(procedure.title) }));
    } else if (!done && current !== previous.current) {
      const item = procedure.items[current];
      if (!item) return;
      setMessage(
        format(text.announceItem, {
          n: current + 1,
          total: procedure.items.length,
          text: localize(item.text),
        }),
      );
    }
  }, [active, procedure, current, done, text, localize]);

  return (
    <div className="checklist-announcer" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
