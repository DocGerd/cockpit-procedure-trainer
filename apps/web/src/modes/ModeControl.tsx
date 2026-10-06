import { useEffect, useState } from 'react';
import { useMessages } from '../i18n';
import { useTrainer } from '../trainer';
import type { Mode } from '../trainer';
import { ConfirmDialog } from '../ui';
import { messages } from './messages';
import { OperateToggle } from './OperateToggle';
import './modes.css';

const modes: readonly Mode[] = ['guided', 'practice', 'explore'];

export function ModeControl() {
  const text = useMessages(messages);
  const { mode, setMode, procedureId } = useTrainer();
  const [confirming, setConfirming] = useState(false);
  const running = procedureId !== undefined;

  useEffect(() => {
    if (!running) setConfirming(false);
  }, [running]);

  const choose = (next: Mode) => {
    if (next === mode) return;
    if (next === 'explore' && running) setConfirming(true);
    else setMode(next);
  };

  return (
    <div className="modes-control">
      <div role="group" aria-label={text.mode} className="modes-segments">
        {modes.map((value) => (
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
      {mode === 'explore' && <OperateToggle />}
      {confirming && (
        <ConfirmDialog
          title={text.exploreTitle}
          body={text.exploreBody}
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
