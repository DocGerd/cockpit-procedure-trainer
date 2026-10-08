import { useEffect, useState } from 'react';
import { format, useLocalize, useMessages } from '../i18n';
import { useLeavingRisk, useTrainer } from '../trainer';
import type { Mode } from '../trainer';
import { ConfirmDialog } from '../ui';
import { lockHolder, useLockNotice, useLockNoticeStore } from './lock-notice';
import { messages } from './messages';
import { OperateToggle } from './OperateToggle';
import './modes.css';

const segments: readonly Mode[] = ['guided', 'practice'];
const NOTICE_MS = 6000;

/** Says which control holds a control whose move an interlock refused; the panel rings that holder. */
function LockNotice() {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { aircraft, session } = useTrainer();
  const store = useLockNoticeStore();
  const notice = useLockNotice();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => store.clear(), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice, store]);

  const control = notice && aircraft.controls[notice.controlId];
  const holder = notice && lockHolder(aircraft, session.state().controls, notice.controlId);
  const by = holder === undefined ? undefined : aircraft.controls[holder];
  if (!control || !by) return null;
  return (
    <p role="status" className="modes-notice" data-notice="locked">
      {format(text.lockedNotice, { control: localize(control.name), by: localize(by.name) })}
    </p>
  );
}

export function ModeControl() {
  const text = useMessages(messages);
  const { mode, setMode, procedureId } = useTrainer();
  const { atRisk, lost } = useLeavingRisk();
  const [confirming, setConfirming] = useState(false);
  const [guidedOn, setGuidedOn] = useState(false);
  const running = procedureId !== undefined;

  useEffect(() => {
    if (!running) {
      setConfirming(false);
      setGuidedOn(false);
    }
  }, [running]);

  useEffect(() => {
    if (!guidedOn) return;
    const timer = setTimeout(() => setGuidedOn(false), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [guidedOn]);

  const choose = (next: Mode) => {
    if (next === mode) return;
    setGuidedOn(running && mode === 'practice' && next === 'guided');
    if (next === 'explore' && atRisk) setConfirming(true);
    else setMode(next);
  };

  return (
    <div className="modes-control">
      <div role="group" aria-label={text.mode} className="modes-segments">
        {segments.map((value) => (
          <button
            key={value}
            type="button"
            className="modes-segment"
            aria-pressed={value === mode}
            onClick={() => choose(value)}
          >
            {text[value]}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="modes-segment modes-explore"
        aria-pressed={mode === 'explore'}
        onClick={() => choose('explore')}
      >
        {text.explore}
      </button>
      {guidedOn ? (
        <p role="status" className="modes-notice">
          {text.guidedOnNotice}
        </p>
      ) : (
        <LockNotice />
      )}
      {mode === 'explore' && <OperateToggle />}
      {confirming && (
        <ConfirmDialog
          title={text.exploreTitle}
          body={`${text.exploreBody} ${lost}`}
          confirmLabel={text.exploreConfirm}
          cancelLabel={text.exploreCancel}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            setMode('explore');
          }}
        />
      )}
    </div>
  );
}
