import type { ChecklistState, ProcedureItem } from '@cpt/core';
import { useEffect, useRef } from 'react';
import { format, useLocalize, useMessages } from '../i18n';
import { useSessionState, useTrainer } from '../trainer';
import type { Mode } from '../trainer';
import './checklist.css';
import { ChecklistSelector } from './ChecklistSelector';
import { DeviationSummary } from './DeviationSummary';
import { useDeviationText } from './deviation-text';
import { messages } from './messages';
import { ProcedureKind } from './ProcedureKind';
import { ProcedureViewer } from './ProcedureViewer';

type ItemState = 'done' | 'current' | 'pending' | 'deviated';

const glyphs: Record<ItemState, string> = {
  done: '✓',
  current: '→',
  pending: '○',
  deviated: '▲',
};

function itemState(
  checklist: ChecklistState<unknown>,
  index: number,
  showDeviations: boolean,
): ItemState {
  if (checklist.completed.includes(index)) {
    const deviated = checklist.deviations.some((deviation) => deviation.itemIndex === index);
    return showDeviations && deviated ? 'deviated' : 'done';
  }
  return index === checklist.current ? 'current' : 'pending';
}

function ItemRow({
  index,
  item,
  state,
  mode,
}: {
  index: number;
  item: ProcedureItem<unknown>;
  state: ItemState;
  mode: Mode;
}) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { session } = useTrainer();
  const labels: Record<ItemState, string> = {
    done: text.stateDone,
    current: text.stateCurrent,
    pending: text.statePending,
    deviated: text.stateDeviated,
  };
  const hint =
    item.type === 'action'
      ? mode === 'guided'
        ? text.hintActionGuided
        : text.hintActionPractice
      : item.type === 'check'
        ? text.hintCheck
        : text.hintConfirm;

  return (
    <li
      className="checklist-item"
      data-state={state}
      aria-current={state === 'current' ? 'step' : undefined}
      tabIndex={state === 'current' ? -1 : undefined}
    >
      <span className="checklist-item-row">
        <span className="checklist-mark" role="img" aria-label={labels[state]}>
          {glyphs[state]}
        </span>
        <span className="checklist-number">{index + 1}</span>
        <span className="checklist-item-text">{localize(item.text)}</span>
      </span>
      {state === 'current' && (
        <span className="checklist-item-detail">
          <span className="checklist-hint">{hint}</span>
          {item.type !== 'action' && (
            <button
              type="button"
              className="button-secondary checklist-check-off"
              onClick={() => session.checkOff()}
            >
              {item.type === 'check' ? text.checkOff : text.confirm}
            </button>
          )}
        </span>
      )}
    </li>
  );
}

function DeviationBanner({ checklist }: { checklist: ChecklistState<unknown> }) {
  const text = useMessages(messages);
  const describe = useDeviationText(checklist);
  const latest = checklist.deviations.at(-1);
  return (
    <div role="status">
      {latest && (
        <div className="checklist-banner">
          <div className="checklist-eyebrow">{text.deviationBanner}</div>
          <div>{describe.banner(latest)}</div>
        </div>
      )}
    </div>
  );
}

function ActiveChecklist({ checklist, mode }: { checklist: ChecklistState<unknown>; mode: Mode }) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const trainer = useTrainer();
  const { procedure, completed, deviations } = checklist;
  const guided = mode === 'guided';
  const count = deviations.length;
  const list = useRef<HTMLOListElement>(null);

  // Focus that was lost, e.g. with the check-off button of the item just done, goes to the new current item.
  useEffect(() => {
    const focused = document.activeElement;
    if (focused && focused !== document.body && focused.isConnected) return;
    const row = list.current?.querySelector<HTMLElement>('[aria-current="step"]');
    (row?.querySelector<HTMLElement>('button') ?? row)?.focus();
  }, [checklist.current]);

  return (
    <div className="checklist">
      <div className="checklist-header">
        <ProcedureKind type={procedure.type} />
        <h1 className="checklist-title">{localize(procedure.title)}</h1>
        <div className="checklist-progress">
          <progress
            className="checklist-bar"
            aria-label={text.progress}
            value={completed.length}
            max={procedure.items.length}
          />
          <span className="checklist-progress-count">
            {completed.length} / {procedure.items.length}
          </span>
        </div>
      </div>

      {guided && <DeviationBanner checklist={checklist} />}

      <ol ref={list} className="checklist-items">
        {procedure.items.map((item, index) => (
          <ItemRow
            key={index}
            index={index}
            item={item}
            state={itemState(checklist, index, guided)}
            mode={mode}
          />
        ))}
      </ol>

      <div className="checklist-footer">
        {guided && (
          <div className="checklist-footer-count" data-deviated={count > 0}>
            {count === 0
              ? text.noDeviations
              : format(count === 1 ? text.deviationOne : text.deviationOther, { count })}
          </div>
        )}
        <button
          type="button"
          className="chrome-button"
          onClick={() => {
            if (trainer.procedureId !== undefined) trainer.startProcedure(trainer.procedureId);
          }}
        >
          {text.restart}
        </button>
      </div>
    </div>
  );
}

export function ChecklistPane() {
  const { mode, procedureId, viewedProcedureId } = useTrainer();
  const checklist = useSessionState((snapshot) => snapshot.checklist());
  const running =
    mode !== 'explore' && checklist !== undefined && viewedProcedureId === procedureId
      ? checklist
      : undefined;
  return (
    <>
      <ChecklistSelector />
      {running === undefined ? (
        <>
          {mode === 'guided' && checklist !== undefined && !checklist.done && (
            <DeviationBanner checklist={checklist} />
          )}
          <ProcedureViewer />
        </>
      ) : running.done ? (
        <DeviationSummary checklist={running} />
      ) : (
        <ActiveChecklist checklist={running} mode={mode} />
      )}
    </>
  );
}
