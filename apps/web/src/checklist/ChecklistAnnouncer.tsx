import type { ChecklistState } from '@cpt/core';
import { useEffect, useRef, useState } from 'react';
import { format, useLocalize, useMessages } from '../i18n';
import { useSessionState, useTrainer } from '../trainer';
import { useDeviationText } from './deviation-text';
import { messages } from './messages';

type Seen = {
  procedure: ChecklistState<unknown>['procedure'];
  current: number;
  done: boolean;
  deviations: number;
};

/**
 * Speaks each step advance and the completion. A new Guided deviation is spoken only when
 * `announceDeviations` is set, for a layout where the Guided banner is not on screen.
 */
export function ChecklistAnnouncer({
  announceDeviations = false,
}: {
  announceDeviations?: boolean;
}) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { mode } = useTrainer();
  const checklist = useSessionState((snapshot) => snapshot.checklist());
  const [message, setMessage] = useState('');
  const seen = useRef<Seen | undefined>(undefined);
  const describe = useDeviationText(checklist);
  const guided = mode === 'guided';
  const active = mode !== 'explore' && checklist !== undefined;
  const procedure = checklist?.procedure;
  const current = checklist?.current;
  const done = checklist?.done ?? false;
  const deviations = checklist?.deviations;

  useEffect(() => {
    if (!active || procedure === undefined || current === undefined) {
      seen.current = undefined;
      setMessage('');
      return;
    }
    const previous = seen.current;
    const count = deviations?.length ?? 0;
    seen.current = { procedure, current, done, deviations: count };
    if (previous?.procedure !== procedure) {
      setMessage('');
      return;
    }
    const parts: string[] = [];
    if (done && !previous.done) {
      parts.push(format(text.announceDone, { title: localize(procedure.title) }));
    } else if (!done && current !== previous.current) {
      const item = procedure.items[current];
      if (item) {
        parts.push(
          format(text.announceItem, {
            n: current + 1,
            total: procedure.items.length,
            text: localize(item.text),
          }),
        );
      }
    }
    const latest = deviations?.at(-1);
    if (announceDeviations && guided && latest && count > previous.deviations) {
      parts.push(format(text.announceDeviation, { text: describe.banner(latest) }));
    }
    if (parts.length > 0) setMessage(parts.join('. '));
  }, [
    active,
    procedure,
    current,
    done,
    deviations,
    announceDeviations,
    guided,
    describe,
    text,
    localize,
  ]);

  return (
    <div className="checklist-announcer" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
