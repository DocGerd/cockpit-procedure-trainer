import { inFlow, takesTick } from '@cpt/core';
import type { ChecklistState, ControlDefinition, GuardedControl, ProcedureItem } from '@cpt/core';
import { useEffect, useRef, useState } from 'react';
import { format, useLocalize, useMessages } from '../i18n';
import { useLostProgressText, useProgressAtRisk, useSessionState, useTrainer } from '../trainer';
import type { Mode } from '../trainer';
import { ConfirmDialog } from '../ui';
import './checklist.css';
import { ChecklistSelector } from './ChecklistSelector';
import { DeviationSummary } from './DeviationSummary';
import { FlightLeg } from './FlightLeg';
import { useDeviationText } from './deviation-text';
import { ItemGroup, leadingCount } from './ItemGroup';
import { ItemText } from './ItemText';
import { messages } from './messages';
import { ProcedureKind } from './ProcedureKind';
import { ProcedureViewer } from './ProcedureViewer';
import { flowLength } from './useCurrentTarget';
import { useStray } from './useStray';

const guardOf = (control: ControlDefinition | undefined) =>
  control?.kind === 'guarded' ? control.guard : undefined;

/** `open` is a flow item still to do: while the flow runs, every one of them is equally next. */
type ItemState = 'done' | 'current' | 'pending' | 'deviated' | 'open';

const glyphs: Record<ItemState, string> = {
  done: '✓',
  current: '→',
  pending: '○',
  deviated: 'Δ',
  open: '→',
};

function itemState(
  checklist: ChecklistState<unknown>,
  index: number,
  showDeviations: boolean,
): ItemState {
  if (checklist.completed.includes(index)) {
    const deviated = checklist.deviations.some(
      (deviation) => deviation.itemIndex === index && !deviation.duringFlow,
    );
    return showDeviations && deviated ? 'deviated' : 'done';
  }
  return index === checklist.current ? 'current' : 'pending';
}

// Mounted only while its row is current, so a typed reading ends with the row's turn.
function CurrentDetail({
  item,
  hint,
  answerable,
  tick,
  assist,
  withheld,
}: {
  item: ProcedureItem<unknown>;
  hint: string;
  answerable: boolean;
  tick: boolean;
  assist: boolean;
  /** The hint and the response unit name the item, so they wait for Show me too. */
  withheld: boolean;
}) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { session, showMe } = useTrainer();
  const [reading, setReading] = useState('');
  const operated = item.type === 'action' || item.type === 'guard';
  return (
    <span className="checklist-item-detail">
      {!withheld && tick && <span className="checklist-hint">{hint}</span>}
      {answerable && item.type === 'check' && (
        <label className="checklist-response">
          <span className="checklist-response-label">{text.reading}</span>
          <input
            type="number"
            inputMode="decimal"
            className="checklist-response-input"
            aria-label={text.reading}
            value={reading}
            onChange={(event) => setReading(event.target.value)}
          />
          {!withheld && item.response?.unit && <span>{localize(item.response.unit)}</span>}
        </label>
      )}
      <span className="checklist-action">
        {tick ? (
          <button
            type="button"
            className={`button-primary ${operated ? 'checklist-verify' : 'checklist-check-off'}`}
            onClick={() =>
              session.checkOff(answerable && reading.trim() !== '' ? Number(reading) : undefined)
            }
          >
            {operated ? text.verify : item.type === 'check' ? text.checkOff : text.confirm}
          </button>
        ) : (
          // An item the panel completes has no button: its instruction holds the slot instead.
          !withheld && <span className="checklist-instruction">{hint}</span>
        )}
        {assist && (
          <button type="button" className="button-secondary checklist-show-me" onClick={showMe}>
            {text.showMe}
          </button>
        )}
      </span>
    </span>
  );
}

function ItemRow({
  index,
  item,
  state,
  current,
  mode,
  tick,
  lever,
  guard,
  withheld,
  shown,
}: {
  index: number;
  item: ProcedureItem<unknown>;
  state: ItemState;
  /** The engine's current item; in a flow, the first one still open. */
  current: boolean;
  mode: Mode;
  tick: boolean;
  lever: boolean;
  /** For a guard item, the guard it moves. */
  guard: GuardedControl['guard'] | undefined;
  /** The text is left out until Show me. */
  withheld: boolean;
  /** Show me was used on this item. */
  shown: boolean;
}) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const answerable = item.type === 'check' && item.response !== undefined && mode === 'practice';
  // Practice holds a check's expected value back until the pilot has read the instrument.
  const reveal = mode === 'guided' || shown || state === 'done' || state === 'deviated';
  const labels: Record<ItemState, string> = {
    done: text.stateDone,
    current: text.stateCurrent,
    pending: text.statePending,
    deviated: text.stateDeviated,
    open: text.stateOpen,
  };
  // A current action that takes no tick springs back, so it is held.
  const gesture =
    item.type === 'guard'
      ? guard?.legends
        ? localize(guard.legends[item.position].act)
        : item.position === 'open'
          ? text.gestureGuardOpen
          : text.gestureGuardClosed
      : !tick && state === 'current'
        ? text.gestureHold
        : lever
          ? text.gestureDrag
          : text.gesturePress;
  const hint =
    item.type === 'action' || item.type === 'guard'
      ? format(
          mode === 'guided'
            ? tick
              ? text.hintVerifyGuided
              : text.hintActionGuided
            : tick
              ? text.hintVerifyPractice
              : text.hintActionPractice,
          { gesture },
        )
      : item.type === 'check'
        ? answerable
          ? text.hintResponse
          : item.target === undefined
            ? text.hintLook
            : text.hintCheck
        : text.hintConfirm;

  return (
    <li
      className="checklist-item"
      data-state={state}
      aria-current={current ? 'step' : undefined}
      tabIndex={current ? -1 : undefined}
    >
      <span className="checklist-item-row">
        <span className="checklist-mark" role="img" aria-label={labels[state]}>
          {glyphs[state]}
        </span>
        <span className="checklist-number readout">{index + 1}</span>
        <span className="checklist-item-text" data-withheld={withheld}>
          {!withheld && <ItemText item={item} reveal={reveal} />}
        </span>
      </span>
      {state === 'current' && (
        <CurrentDetail
          item={item}
          hint={hint}
          answerable={answerable}
          tick={tick}
          assist={mode === 'practice' && !shown}
          withheld={withheld}
        />
      )}
    </li>
  );
}

function DeviationBanner({
  checklist,
  running = false,
}: {
  checklist: ChecklistState<unknown>;
  /** Shown under the running list, whose current item it may offer to retry. */
  running?: boolean;
}) {
  const text = useMessages(messages);
  const { session } = useTrainer();
  const describe = useDeviationText(checklist);
  const stray = useStray();
  const latest = checklist.deviations.at(-1);
  // A flow has no item to retry: its banner says how to undo the move.
  const retry =
    running && latest !== undefined && !latest.duringFlow && latest.itemIndex === checklist.current;
  return (
    <div role="status" className="checklist-status">
      {latest && (
        <div className="checklist-banner">
          <div className="checklist-banner-head">
            <div className="checklist-eyebrow">{text.deviationBanner}</div>
            {retry && (
              <button
                type="button"
                className="chrome-button checklist-retry"
                onClick={() => session.retryItem()}
              >
                {text.retryItem}
              </button>
            )}
          </div>
          <div>{describe.banner(latest, stray === undefined)}</div>
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
  const recalling = mode === 'practice' && trainer.recall;
  const flowItems = flowLength(procedure);
  const flowing = inFlow(checklist);
  const flowShown = trainer.assisted.some((index) => index < flowItems);
  const list = useRef<HTMLOListElement>(null);
  const lost = useLostProgressText();
  const [confirming, setConfirming] = useState(false);
  const atRisk = useProgressAtRisk() !== undefined;
  const restart = () => trainer.restart();
  const memoryCount = leadingCount(procedure.items, (item) => item.memory === true);

  function row(item: ProcedureItem<unknown>, index: number) {
    const shown = trainer.assisted.includes(index);
    const flowRow = index < flowItems;
    const state: ItemState =
      flowRow && flowing && !completed.includes(index)
        ? 'open'
        : itemState(checklist, index, guided);
    // Upcoming items are not drawn at all, so their text is nowhere in the page.
    if (recalling && state === 'pending') return null;
    // Practice drills a memory item from recall: its text waits until it is done.
    const recalled =
      mode === 'practice' && item.memory === true && !checklist.completed.includes(index);
    return (
      <ItemRow
        key={index}
        index={index}
        item={item}
        state={state}
        current={index === checklist.current}
        mode={mode}
        tick={state === 'current' && takesTick(checklist)}
        lever={item.type === 'action' && checklist.controls[item.control]?.kind === 'lever'}
        guard={guardOf(item.type === 'guard' ? checklist.controls[item.control] : undefined)}
        // A flow is practised from memory, so its text stays out until it is done or shown.
        withheld={
          flowRow
            ? mode === 'practice' && flowing && !flowShown
            : !shown && ((recalling && state === 'current') || recalled)
        }
        shown={shown}
      />
    );
  }

  const rows = procedure.items.map(row);
  // Memory items open an abnormal procedure and a flow a normal one, so at most one group leads.
  const leading = memoryCount > 0 ? memoryCount : flowItems;

  // The list is the scroller, and the deviation sheet stuck to its bottom covers part of it. Once
  // the current item passes the top third it moves up under one row of what is done, so the rows
  // ahead fill the rest. A new deviation does not rerun this: the item stays where it was.
  useEffect(() => {
    const scroller = list.current;
    const row = scroller?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!scroller || !row) return;
    const box = scroller.getBoundingClientRect();
    const sheet = scroller.querySelector('.checklist-sheet')?.getBoundingClientRect().height ?? 0;
    const rect = row.getBoundingClientRect();
    const previous = row.previousElementSibling?.getBoundingClientRect().height ?? 0;
    const top = box.top + Math.min(previous, box.height / 4);
    if (
      rect.top < box.top ||
      rect.top > box.top + box.height / 3 ||
      rect.bottom > box.bottom - sheet
    ) {
      scroller.scrollTop += rect.top - top;
    }
  }, [checklist.current, trainer.assisted.length, trainer.recall]);

  // Focus that was lost, e.g. with the check-off button of the item just done, goes to the new
  // current item; never to its Verified button, so a key press cannot pass an action unlooked.
  useEffect(() => {
    const focused = document.activeElement;
    if (focused && focused !== document.body && focused.isConnected) return;
    const row = list.current?.querySelector<HTMLElement>('[aria-current="step"]');
    (row?.querySelector<HTMLElement>('.checklist-check-off') ?? row)?.focus();
  }, [checklist.current]);

  return (
    <div className="checklist">
      <div className="checklist-header">
        <ProcedureKind type={procedure.type}>
          <FlightLeg />
        </ProcedureKind>
        <h1 className="checklist-title">{localize(procedure.title)}</h1>
        <div className="checklist-progress">
          <progress
            className="checklist-bar"
            aria-label={text.progress}
            value={completed.length}
            max={procedure.items.length}
          />
          <span className="checklist-progress-count readout">
            {completed.length} / {procedure.items.length}
          </span>
        </div>
      </div>

      <ol
        ref={list}
        className="checklist-items scroll-thin scroll-fade"
        data-banner={guided && count > 0}
      >
        {memoryCount > 0 && (
          <ItemGroup kind="memory" label={text.memoryItems}>
            {rows.slice(0, memoryCount)}
          </ItemGroup>
        )}
        {memoryCount === 0 && flowItems > 0 && (
          <ItemGroup
            kind="flow"
            label={text.flowHeading}
            state={flowing ? 'current' : 'done'}
            after={
              flowing ? (
                <span className="checklist-item-detail checklist-group-detail">
                  <span className="checklist-hint">
                    {guided || flowShown ? text.flowHintGuided : text.flowHintPractice}
                  </span>
                  {mode === 'practice' && !flowShown && (
                    <button
                      type="button"
                      className="button-secondary checklist-show-me"
                      onClick={trainer.showMe}
                    >
                      {text.showMe}
                    </button>
                  )}
                </span>
              ) : (
                checklist.current === flowItems && (
                  <p className="checklist-transition">{text.flowVerify}</p>
                )
              )
            }
          >
            {rows.slice(0, flowItems)}
          </ItemGroup>
        )}
        {rows.slice(leading)}
        {guided && (
          <li role="none" className="checklist-sheet">
            <DeviationBanner checklist={checklist} running />
          </li>
        )}
      </ol>

      <div className="checklist-footer">
        {mode === 'practice' && (
          <label className="checklist-recall">
            <input
              type="checkbox"
              className="switch"
              checked={trainer.recall}
              onChange={(event) => trainer.setRecall(event.target.checked)}
            />
            {text.hideUpcoming}
          </label>
        )}
        {guided && (
          <div className="checklist-footer-count" data-deviated={count > 0}>
            {count > 0 && (
              <span className="checklist-delta" aria-hidden="true">
                Δ
              </span>
            )}
            <span>
              {count === 0
                ? text.noDeviations
                : format(count === 1 ? text.deviationOne : text.deviationOther, { count })}
            </span>
          </div>
        )}
        <button
          type="button"
          className="button-secondary checklist-restart"
          onClick={() => (atRisk ? setConfirming(true) : restart())}
        >
          {text.restart}
        </button>
        {confirming && (
          <ConfirmDialog
            title={text.restartTitle}
            body={`${trainer.surprisePhase === undefined ? text.restartBody : text.restartSurpriseBody} ${lost}`}
            confirmLabel={text.restart}
            cancelLabel={text.restartCancel}
            onCancel={() => setConfirming(false)}
            onConfirm={() => {
              setConfirming(false);
              restart();
            }}
          />
        )}
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
