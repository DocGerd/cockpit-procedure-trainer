import { useEffect, useState } from 'react';
import { useMessages } from '../i18n';
import { useLostProgressText, useProgressAtRisk, useTrainer } from '../trainer';
import type { Mode } from '../trainer';
import { ConfirmDialog } from '../ui';
import { messages } from './messages';
import { OperateToggle } from './OperateToggle';
import './modes.css';

const segments: readonly Mode[] = ['guided', 'practice'];
const NOTICE_MS = 6000;

export function ModeControl() {
  const text = useMessages(messages);
  const { mode, setMode, procedureId } = useTrainer();
  const lost = useLostProgressText();
  const atRisk = useProgressAtRisk() !== undefined;
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
      {guidedOn && (
        <p role="status" className="modes-notice">
          {text.guidedOnNotice}
        </p>
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
