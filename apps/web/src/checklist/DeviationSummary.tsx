import type { ChecklistState, DeviationKind } from '@cpt/core';
import { useEffect, useId, useRef, useState } from 'react';
import { format, useLocalize, useMessages } from '../i18n';
import { useLeavingRisk, useSessionState, useTrainer } from '../trainer';
import type { LegResult } from '../trainer';
import { ConfirmDialog } from '../ui';
import { useDeviationText } from './deviation-text';
import { ItemGroup, leadingCount } from './ItemGroup';
import { messages } from './messages';
import { useItemText } from './item-text';
import { ItemText } from './ItemText';
import { flowLength } from './useCurrentTarget';

const KINDS: readonly DeviationKind[] = [
  'unexpected-control',
  'out-of-order',
  'wrong-position',
  'unmet-check',
  'late-memory-item',
];

const clock = (ms: number) => {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

export function DeviationSummary({ checklist }: { checklist: ChecklistState<unknown> }) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const itemText = useItemText();
  const trainer = useTrainer();
  const { atRisk, lost } = useLeavingRisk();
  const [leaving, setLeaving] = useState(false);
  const describe = useDeviationText(checklist);
  const scenario = useSessionState((snapshot) => snapshot.scenario());
  const answer = scenario?.chosen === undefined ? undefined : scenario;
  const unanswered = scenario?.injectedAtMs !== undefined && scenario.chosen === undefined;
  const headingId = useId();
  const listId = useId();
  const assistedId = useId();
  const flightId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const rows = useRef(new Map<number, HTMLElement>());

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const { aircraft, procedureId, mode, assisted, flight } = trainer;
  const { procedure, deviations } = checklist;
  const ids = Object.keys(aircraft.procedures);
  const leg = flight?.results.length ?? 0;
  const nextId = flight
    ? unanswered
      ? undefined
      : flight.legs[leg + 1]
    : procedureId === undefined || answer
      ? undefined
      : ids
          .slice(ids.indexOf(procedureId) + 1)
          .find((id) => aircraft.procedures[id]?.type === procedure.type);
  const legs: readonly LegResult[] | undefined =
    flight && nextId === undefined && !unanswered && procedureId !== undefined
      ? [
          ...flight.results,
          {
            id: procedureId,
            deviations: deviations.length,
            assists: checklist.assists + assisted.length,
            elapsedMs: checklist.elapsedMs,
          },
        ]
      : undefined;
  const sum = (key: 'deviations' | 'assists' | 'elapsedMs') =>
    legs ? legs.reduce((total, result) => total + result[key], 0) : 0;
  const next = nextId === undefined ? undefined : aircraft.procedures[nextId];
  const kindLabels: Record<DeviationKind, string> = {
    'unexpected-control': text.kindUnexpected,
    'out-of-order': text.kindOutOfOrder,
    'wrong-position': text.kindWrongPosition,
    'unmet-check': text.kindUnmet,
    'late-memory-item': text.kindLateMemory,
  };
  const memoryCount = leadingCount(procedure.items, (item) => item.memory === true);
  const reviewRows = procedure.items.map((item, index) => {
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
            {deviated ? 'Δ' : '✓'}
          </span>
          <span className="checklist-number readout">{index + 1}</span>
          <span className="checklist-item-text">
            <ItemText item={item} />
          </span>
        </span>
      </li>
    );
  });
  const firstFlowItem = procedure.items.findIndex((item) => item.type === 'action' && item.flow);
  const flowItems = flowLength(procedure);
  // Memory items open an abnormal procedure and a flow a normal one, so at most one group leads.
  const lead =
    memoryCount > 0
      ? { kind: 'memory', label: text.memoryItems, size: memoryCount }
      : flowItems > 0
        ? { kind: 'flow', label: text.flowHeading, size: flowItems }
        : undefined;
  const goTo = (index: number) => {
    const row = rows.current.get(index);
    row?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: 'center' });
  };
  const failureName = answer && aircraft.failures[answer.failure]?.name;
  const repeat = procedureId !== undefined && (
    <button
      type="button"
      className={deviations.length > 0 ? 'button-primary' : 'button-secondary'}
      onClick={() =>
        flight
          ? trainer.restart()
          : answer
            ? trainer.startSurprise(answer.phase)
            : trainer.startProcedure(procedureId)
      }
    >
      {answer && !flight ? text.newSurprise : text.repeatProcedure}
    </button>
  );

  return (
    <section className="checklist" aria-labelledby={headingId}>
      <div className="checklist-header">
        <p className="kicker checklist-kicker">
          {localize(aircraft.name)} · {mode === 'practice' ? text.modePractice : text.modeGuided}
          {flight && ` · ${format(text.flightLeg, { n: leg + 1, total: flight.legs.length })}`}
        </p>
        <h1 id={headingId} ref={heading} tabIndex={-1} className="checklist-title">
          {format(text.summaryTitle, { title: localize(procedure.title) })}
        </h1>
      </div>

      <dl className="checklist-stats">
        <div className="checklist-stat">
          <dt>{text.elapsed}</dt>
          <dd className="checklist-stat-value readout">{clock(checklist.elapsedMs)}</dd>
        </div>
        <div className="checklist-stat">
          <dt>{text.deviations}</dt>
          <dd className="checklist-stat-value readout" data-deviated={deviations.length > 0}>
            {deviations.length}
          </dd>
        </div>
        <div className="checklist-stat">
          <dt>{text.assists}</dt>
          <dd className="checklist-stat-value readout">{checklist.assists + assisted.length}</dd>
        </div>
        {answer && (
          <div className="checklist-stat">
            <dt>{text.recognition}</dt>
            <dd className="checklist-stat-value readout">
              {answer.recognitionMs === undefined
                ? text.recognisedEarly
                : clock(answer.recognitionMs)}
            </dd>
          </div>
        )}
      </dl>

      {answer && failureName && (
        <p className="checklist-surprise" data-matched={answer.matched === true}>
          {format(answer.matched ? text.surpriseMatched : text.surpriseMissed, {
            failure: localize(failureName),
          })}
          {answer.recognitionMs === undefined && ` ${text.chosenEarly}`}
        </p>
      )}

      {flight && unanswered && <p className="checklist-note">{text.surpriseNote}</p>}

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
                <div className="checklist-deviation-where readout">{describe.where(deviation)}</div>
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
                <span className="checklist-assisted-number readout">
                  {format(text.itemNumber, { n: index + 1 })}
                </span>
                <span>{procedure.items[index] && itemText(procedure.items[index])}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {legs && (
        <section className="checklist-flight" aria-labelledby={flightId}>
          <h2 id={flightId} className="checklist-deviations-heading">
            {text.flightHeading}
          </h2>
          <table className="checklist-flight-table">
            <thead>
              <tr>
                <th scope="col">{text.flightProcedure}</th>
                <th scope="col">{text.deviations}</th>
                <th scope="col">{text.assists}</th>
                <th scope="col">{text.elapsed}</th>
              </tr>
            </thead>
            <tbody>
              {legs.map((result, index) => {
                const title = aircraft.procedures[result.id]?.title;
                const name = title ? localize(title) : result.id;
                return (
                  <tr key={index}>
                    <th scope="row">
                      {result.interrupted === true
                        ? format(text.flightInterrupted, { title: name })
                        : name}
                    </th>
                    <td data-deviated={result.deviations > 0}>{result.deviations}</td>
                    <td>{result.assists}</td>
                    <td>{clock(result.elapsedMs)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{text.flightTotal}</th>
                <td data-deviated={sum('deviations') > 0}>{sum('deviations')}</td>
                <td>{sum('assists')}</td>
                <td>{clock(sum('elapsedMs'))}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      <section className="checklist-review" aria-label={text.itemsHeading}>
        <ol className="checklist-review-list">
          {lead && (
            <ItemGroup kind={lead.kind} label={lead.label}>
              {reviewRows.slice(0, lead.size)}
            </ItemGroup>
          )}
          {reviewRows.slice(lead?.size ?? 0)}
        </ol>
      </section>

      <div className="checklist-actions">
        {deviations.length > 0 && repeat}
        {nextId !== undefined && next && (
          <button
            type="button"
            className={deviations.length > 0 ? 'button-secondary' : 'button-primary'}
            onClick={() => (flight ? trainer.nextLeg() : trainer.startProcedure(nextId))}
          >
            {format(text.nextProcedure, { title: localize(next.title) })}
          </button>
        )}
        {deviations.length === 0 && repeat}
        <button
          type="button"
          className="chrome-button"
          onClick={() => (atRisk ? setLeaving(true) : trainer.backToPicker())}
        >
          {text.backToSelection}
        </button>
        {leaving && (
          <ConfirmDialog
            title={text.backToSelectionTitle}
            body={`${text.backToSelectionBody} ${lost}`}
            confirmLabel={text.backToSelection}
            cancelLabel={text.cancel}
            onCancel={() => setLeaving(false)}
            onConfirm={() => {
              setLeaving(false);
              trainer.backToPicker();
            }}
          />
        )}
      </div>
    </section>
  );
}
