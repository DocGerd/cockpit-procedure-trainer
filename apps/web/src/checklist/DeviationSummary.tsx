import type { ChecklistState } from '@cpt/core';
import { useEffect, useId, useRef } from 'react';
import { format, useLocalize, useMessages } from '../i18n';
import { useTrainer } from '../trainer';
import { useDeviationText } from './deviation-text';
import { messages } from './messages';

export function DeviationSummary({ checklist }: { checklist: ChecklistState<unknown> }) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const trainer = useTrainer();
  const describe = useDeviationText(checklist);
  const headingId = useId();
  const listId = useId();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const { aircraft, procedureId, mode } = trainer;
  const { procedure, completed, deviations } = checklist;
  const ids = Object.keys(aircraft.procedures);
  const nextId =
    procedureId === undefined
      ? undefined
      : ids
          .slice(ids.indexOf(procedureId) + 1)
          .find((id) => aircraft.procedures[id]?.type === procedure.type);
  const next = nextId === undefined ? undefined : aircraft.procedures[nextId];

  return (
    <section className="checklist" aria-labelledby={headingId}>
      <div className="checklist-header">
        <div className="checklist-eyebrow">
          {localize(aircraft.name)} · {mode === 'practice' ? text.modePractice : text.modeGuided}
        </div>
        <h1 id={headingId} ref={heading} tabIndex={-1} className="checklist-title">
          {format(text.summaryTitle, { title: localize(procedure.title) })}
        </h1>
      </div>

      <dl className="checklist-stats">
        <div className="checklist-stat">
          <dt className="checklist-eyebrow">{text.itemsCompleted}</dt>
          <dd className="checklist-stat-value">
            {completed.length} / {procedure.items.length}
          </dd>
        </div>
        <div className="checklist-stat">
          <dt className="checklist-eyebrow">{text.deviations}</dt>
          <dd className="checklist-stat-value" data-deviated={deviations.length > 0}>
            {deviations.length}
          </dd>
        </div>
      </dl>

      {deviations.length === 0 ? (
        <p className="checklist-all-clear">{text.allAsListed}</p>
      ) : (
        <section className="checklist-deviations" aria-labelledby={listId}>
          <h2 id={listId} className="checklist-deviations-heading">
            {text.deviationsHeading}
          </h2>
          <ol className="checklist-deviation-list">
            {deviations.map((deviation, index) => (
              <li key={index} className="checklist-deviation">
                <div className="checklist-deviation-where">{describe.where(deviation)}</div>
                <div className="checklist-deviation-body">
                  <div className="checklist-deviation-title">{describe.title(deviation)}</div>
                  <div className="checklist-deviation-detail">{describe.detail(deviation)}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="checklist-actions">
        {nextId !== undefined && next && (
          <button
            type="button"
            className="button-primary"
            onClick={() => trainer.startProcedure(nextId)}
          >
            {format(text.nextProcedure, { title: localize(next.title) })}
          </button>
        )}
        {procedureId !== undefined && (
          <button
            type="button"
            className="button-secondary"
            onClick={() => trainer.startProcedure(procedureId)}
          >
            {text.repeatProcedure}
          </button>
        )}
        <button type="button" className="chrome-button" onClick={trainer.backToPicker}>
          {text.backToSelection}
        </button>
      </div>
    </section>
  );
}
