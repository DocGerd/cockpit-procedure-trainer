import { phaseName, sharedPhases } from '@cpt/core';
import { useEffect, useId, useState } from 'react';
import { format, useLocalize, useMessages } from '../i18n';
import { useLostProgressText, useProgressAtRisk, useSessionState, useTrainer } from '../trainer';
import { ConfirmDialog } from '../ui';
import { messages } from './messages';
import './outside-view.css';

export function PhaseControl() {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { procedureId, jumpToPhase } = useTrainer();
  const phase = useSessionState((session) => session.phase());
  const [pending, setPending] = useState<string | undefined>();
  const lost = useLostProgressText();
  const atRisk = useProgressAtRisk() !== undefined;
  const selectId = useId();
  const running = procedureId !== undefined;

  useEffect(() => {
    if (!running) setPending(undefined);
  }, [running]);

  const choose = (phaseId: string) => {
    if (atRisk) setPending(phaseId);
    else jumpToPhase(phaseId);
  };
  const pendingName = pending === undefined ? undefined : phaseName(pending);

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
        {sharedPhases.map(({ id, name }) => (
          <option key={id} value={id}>
            {localize(name)}
          </option>
        ))}
      </select>
      {pending !== undefined && pendingName && (
        <ConfirmDialog
          title={format(text.jumpTitle, { phase: localize(pendingName) })}
          body={`${format(text.jumpBody, { phase: localize(pendingName) })} ${lost}`}
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
