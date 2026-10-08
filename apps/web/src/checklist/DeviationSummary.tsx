import type { ChecklistState, DeviationKind } from '@cpt/core';
import { useEffect, useId, useRef } from 'react';
import { format, useLocalize, useMessages } from '../i18n';
import { useTrainer } from '../trainer';
import { useDeviationText } from './deviation-text';
import { ItemGroup } from './ItemGroup';
import { messages } from './messages';
import { flowLength } from './useCurrentTarget';

const KINDS: readonly DeviationKind[] = [
  'unexpected-control',
  'out-of-order',
  'wrong-position',
  'unmet-check',
];

const clock = (ms: number) => {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

export function DeviationSummary({ checklist }: { checklist: ChecklistState<unknown> }) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const trainer = useTrainer();
  const describe = useDeviationText(checklist);
  const headingId = useId();
  const listId = useId();
  const assistedId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const rows = useRef(new Map<number, HTMLElement>());

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const { aircraft, procedureId, mode, assisted } = trainer;
  const { procedure, deviations } = checklist;
  const ids = Object.keys(aircraft.procedures);
  const nextId =
    procedureId === undefined
      ? undefined
      : ids
          .slice(ids.indexOf(procedureId) + 1)
          .find((id) => aircraft.procedures[id]?.type === procedure.type);
  const next = nextId === undefined ? undefined : aircraft.procedures[nextId];
  const kindLabels: Record<DeviationKind, string> = {
    'unexpected-control': text.kindUnexpected,
    'out-of-order': text.kindOutOfOrder,
    'wrong-position': text.kindWrongPosition,
    'unmet-check': text.kindUnmet,
  };
  const firstFlowItem = procedure.items.findIndex((item) => item.type === 'action' && item.flow);
  const flowItems = flowLength(procedure);
  const reviewRow = (item: (typeof procedure.items)[number], index: number) => {
    const deviated = deviations.some(
      (deviation) => deviation.itemIndex === index && !deviation.duringFlow,
    );
    return (
      <li
        key={index}
        ref={(row) => {
          if (row) rows.current.set(index, row);
          else rows.current.delete(index);
        }}
        tabIndex={-1}
        className="checklist-item"
        data-state={deviated ? 'deviated' : 'done'}
      >
        <span className="checklist-item-row">
          <span
            className="checklist-mark"
            role="img"
            aria-label={deviated ? text.stateDeviated : text.stateDone}
          >
            {deviated ? '▲' : '✓'}
          </span>
          <span className="checklist-number">{index + 1}</span>
          <span className="checklist-item-text">{localize(item.text)}</span>
        </span>
      </li>
    );
  };
  const goTo = (index: number) => {
    const row = rows.current.get(index);
    row?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: 'center' });
  };
  const repeat = procedureId !== undefined && (
    <button
      type="button"
      className={deviations.length > 0 ? 'button-primary' : 'button-secondary'}
      onClick={() => trainer.startProcedure(procedureId)}
    >
      {text.repeatProcedure}
    </button>
  );

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
          <dt className="checklist-eyebrow">{text.elapsed}</dt>
          <dd className="checklist-stat-value">{clock(checklist.elapsedMs)}</dd>
        </div>
        <div className="checklist-stat">
          <dt className="checklist-eyebrow">{text.deviations}</dt>
          <dd className="checklist-stat-value" data-deviated={deviations.length > 0}>
            {deviations.length}
          </dd>
        </div>
        <div className="checklist-stat">
          <dt className="checklist-eyebrow">{text.assists}</dt>
          <dd className="checklist-stat-value">{checklist.assists + assisted.length}</dd>
        </div>
      </dl>

      {deviations.length > 0 && (
        <ul className="checklist-kinds">
          {KINDS.map((kind) => {
            const count = deviations.filter((deviation) => deviation.kind === kind).length;
            return (
              count > 0 && (
                <li key={kind} className="checklist-kind">
                  <span>{kindLabels[kind]}</span>
                  <span className="checklist-kind-count">{count}</span>
                </li>
              )
            );
          })}
        </ul>
      )}

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
                  <dl className="checklist-deviation-detail">
                    <dt>{text.expectedLabel}</dt>
                    <dd>{describe.expected(deviation)}</dd>
                    <dt>{text.actualLabel}</dt>
                    <dd>{describe.actual(deviation)}</dd>
                  </dl>
                  <button
                    type="button"
                    className="checklist-deviation-link"
                    onClick={() => goTo(deviation.duringFlow ? firstFlowItem : deviation.itemIndex)}
                  >
                    {deviation.duringFlow
                      ? text.goToFlow
                      : format(text.goToItem, { n: deviation.itemIndex + 1 })}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {assisted.length > 0 && (
        <section className="checklist-assisted" aria-labelledby={assistedId}>
          <h2 id={assistedId} className="checklist-deviations-heading">
            {text.assistedHeading}
          </h2>
          <ol className="checklist-assisted-list">
            {assisted.map((index) => (
              <li key={index} className="checklist-assisted-item">
                <span className="checklist-assisted-number">
                  {format(text.itemNumber, { n: index + 1 })}
                </span>
                <span>{procedure.items[index] && localize(procedure.items[index].text)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="checklist-review" aria-label={text.itemsHeading}>
        <ol className="checklist-review-list">
          {flowItems > 0 && (
            <ItemGroup kind="flow" label={text.flowHeading}>
              {procedure.items.slice(0, flowItems).map(reviewRow)}
            </ItemGroup>
          )}
          {procedure.items.map((item, index) =>
            index < flowItems ? null : reviewRow(item, index),
          )}
        </ol>
      </section>

      <div className="checklist-actions">
        {deviations.length > 0 && repeat}
        {nextId !== undefined && next && (
          <button
            type="button"
            className={deviations.length > 0 ? 'button-secondary' : 'button-primary'}
            onClick={() => trainer.startProcedure(nextId)}
          >
            {format(text.nextProcedure, { title: localize(next.title) })}
          </button>
        )}
        {deviations.length === 0 && repeat}
        <button type="button" className="chrome-button" onClick={trainer.backToPicker}>
          {text.backToSelection}
        </button>
      </div>
    </section>
  );
}
