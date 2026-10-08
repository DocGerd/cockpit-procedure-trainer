import { useEffect, useId, useState } from 'react';
import { format, useLocalize, useMessages } from '../i18n';
import { useLostProgressText, useSessionState, useTrainer } from '../trainer';
import { ConfirmDialog } from '../ui';
import { messages } from './messages';
import './outside-view.css';

export function PhaseControl() {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { aircraft, procedureId, jumpToPhase } = useTrainer();
  const phase = useSessionState((session) => session.phase());
  const [pending, setPending] = useState<string | undefined>();
  const lost = useLostProgressText();
  const selectId = useId();
  const running = procedureId !== undefined;

  useEffect(() => {
    if (!running) setPending(undefined);
  }, [running]);

  const choose = (phaseId: string) => {
    if (running) setPending(phaseId);
    else jumpToPhase(phaseId);
  };
  const pendingPhase = pending === undefined ? undefined : aircraft.phases[pending];

  return (
    <div className="phase-control">
      <label htmlFor={selectId} className="phase-control-label">
        {text.phase}
      </label>
      <select
        id={selectId}
        className="chrome-button phase-control-select"
        value={phase}
        onChange={(event) => choose(event.target.value)}
      >
        {Object.entries(aircraft.phases).map(([id, entry]) => (
          <option key={id} value={id}>
            {localize(entry.name)}
          </option>
        ))}
      </select>
      {pending !== undefined && pendingPhase && (
        <ConfirmDialog
          title={format(text.jumpTitle, { phase: localize(pendingPhase.name) })}
          body={`${format(text.jumpBody, { phase: localize(pendingPhase.name) })} ${lost}`}
          confirmLabel={text.jumpConfirm}
          cancelLabel={text.jumpCancel}
          onCancel={() => setPending(undefined)}
          onConfirm={() => {
            setPending(undefined);
            jumpToPhase(pending);
          }}
        />
      )}
    </div>
  );
}
