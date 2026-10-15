import { useEffect, useId, useRef, useState } from 'react';
import { useMessages } from '../i18n';
import { headerMessages } from '../shell/header.messages';
import { MAX_VOLUME } from '../storage';
import { useAudio } from './AudioProvider';

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg
      className="sound-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      data-icon={on ? 'on' : 'off'}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4Z" />
      {on ? (
        <>
          <path d="M15.5 9a4 4 0 0 1 0 6" />
          <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
        </>
      ) : (
        <path d="M16 9.5l5 5M21 9.5l-5 5" />
      )}
    </svg>
  );
}

export function SoundControl() {
  const text = useMessages(headerMessages);
  const { sound, volume, setSound, setVolume } = useAudio();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const on = sound === 'on';

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !root.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  return (
    <div className="sound-control" ref={root}>
      <button
        type="button"
        className="chrome-button sound-button"
        aria-label={text.sound}
        title={text.sound}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <SpeakerIcon on={on} />
      </button>
      {open && (
        <div id={popoverId} className="sound-popover" role="dialog" aria-label={text.sound}>
          <label className="sound-row">
            <input
              type="checkbox"
              role="switch"
              className="switch"
              checked={on}
              aria-checked={on}
              onChange={(event) => setSound(event.target.checked ? 'on' : 'off')}
            />
            {on ? text.soundOn : text.soundOff}
          </label>
          <label className="sound-row">
            <span>{text.volume}</span>
            <input
              type="range"
              className="sound-volume"
              min={0}
              max={MAX_VOLUME}
              step={1}
              value={volume}
              disabled={!on}
              onChange={(event) => setVolume(event.target.valueAsNumber)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
