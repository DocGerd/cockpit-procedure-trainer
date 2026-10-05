import type { ChecklistState, ProcedureItem } from '@cpt/core';
import { format, useLocalize, useMessages } from '../i18n';
import { useSessionState, useTrainer } from '../trainer';
import type { Mode } from '../trainer';
import './checklist.css';
import { DeviationSummary } from './DeviationSummary';
import { useDeviationText } from './deviation-text';
import { messages } from './messages';

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

function ActiveChecklist({ checklist, mode }: { checklist: ChecklistState<unknown>; mode: Mode }) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const trainer = useTrainer();
  const describe = useDeviationText(checklist);
  const { procedure, completed, deviations } = checklist;
  const guided = mode === 'guided';
  const latest = deviations.at(-1);
  const count = deviations.length;

  return (
    <div className="checklist">
      <div className="checklist-header">
        {procedure.type === 'emergency' ? (
          <div className="checklist-kind">
            <span className="checklist-chip">{text.abnormalProcedure}</span>
            <span className="checklist-kind-text">{text.failureInjected}</span>
          </div>
        ) : (
          <div className="checklist-eyebrow">{text.normalProcedure}</div>
        )}
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

      {guided && latest && (
        <div role="status" className="checklist-banner">
          <div className="checklist-eyebrow">{text.deviationBanner}</div>
          <div>{describe.banner(latest)}</div>
        </div>
      )}

      <ol className="checklist-items">
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
        <div className="checklist-footer-count" data-deviated={count > 0}>
          {count === 0
            ? text.noDeviations
            : format(count === 1 ? text.deviationOne : text.deviationOther, { count })}
        </div>
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
  const { mode } = useTrainer();
  const checklist = useSessionState((snapshot) => snapshot.checklist());
  if (mode === 'explore' || !checklist) return null;
  return checklist.done ? (
    <DeviationSummary checklist={checklist} />
  ) : (
    <ActiveChecklist checklist={checklist} mode={mode} />
  );
}
