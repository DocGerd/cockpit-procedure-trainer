import { FaceKey } from '@cpt/panel-kit';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import type { Atr833State } from '../logic';
import { FaceArt } from './FaceArt';
import { FaceLines } from './FaceLines';
import { CAP_SIZE, COM_LABEL, KEYS, VOL_SEL_ARC, WINDOW, onRim } from './geometry';
import { percent } from './percent';
import './Atr833Face.css';

type FaceProps = {
  /** The disc's diameter, a token length. */
  diameter: string;
  on: boolean;
  state: Atr833State;
} & ({ mode: 'dock'; send: DeviceScreenProps['send'] } | { mode: 'mirror'; send?: undefined });

const LEGEND_SIZE = 'sm';

const faceStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  fontFamily: 'var(--font-sans)',
  fontWeight: 'var(--weight-semibold)',
  color: 'var(--panel-legend)',
};

const windowStyle = (diameter: string): CSSProperties => ({
  position: 'absolute',
  left: percent(WINDOW.left),
  top: percent(WINDOW.top),
  width: percent(WINDOW.right - WINDOW.left),
  height: percent(WINDOW.bottom - WINDOW.top),
  borderRadius: `calc(${diameter} * ${WINDOW.radius})`,
  overflow: 'hidden',
});

const printed = (x: number, y: number, turn = 0): CSSProperties => ({
  position: 'absolute',
  left: percent(x),
  top: percent(y),
  transform: `translate(-50%, -50%) rotate(${turn}deg)`,
  fontSize: `var(--text-${LEGEND_SIZE})`,
  lineHeight: `var(--leading-${LEGEND_SIZE})`,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
});

const comStyle: CSSProperties = {
  position: 'absolute',
  left: percent(COM_LABEL.x),
  top: percent((COM_LABEL.top + COM_LABEL.bottom) / 2),
  transform: 'translate(-50%, -50%)',
  writingMode: 'vertical-lr',
  textOrientation: 'upright',
  fontSize: 'var(--text-xl)',
  lineHeight: 'var(--leading-xl)',
  pointerEvents: 'none',
};

const arcLetters = [...VOL_SEL_ARC.text].map((letter, index, all) => {
  const bearing =
    VOL_SEL_ARC.from + ((VOL_SEL_ARC.to - VOL_SEL_ARC.from) * (index + 0.5)) / all.length;
  return { letter, bearing, at: onRim(bearing, VOL_SEL_ARC.radius) };
});

/**
 * The ATR833's whole face, drawn in fractions of its disc's bounding square: one component for the
 * operable dock face (`dock`, with touch keys) and the slot mirror (`mirror`, the same face at
 * panel scale, its legends in the secondary lettering tier).
 */
export function Atr833Face({ diameter, on, state, mode, send }: FaceProps) {
  const tier = mode === 'mirror' ? 'secondary' : undefined;
  return (
    <div className="cpt-atr833-face" data-atr833-face={mode} style={faceStyle}>
      <FaceArt />
      <div data-display className="pk-glass" style={windowStyle(diameter)}>
        <FaceLines on={on} state={state} labelTier={tier} />
      </div>
      <span data-arc-legend aria-hidden="true">
        {arcLetters.map(({ letter, bearing, at }, index) => (
          <span key={index} data-lettering={tier} style={printed(at.x, at.y, bearing)}>
            {letter}
          </span>
        ))}
      </span>
      {mode === 'dock' && (
        <span data-face-label style={comStyle}>
          {COM_LABEL.text}
        </span>
      )}
      {KEYS.map((key) =>
        mode === 'dock' ? (
          <FaceKey
            key={key.control}
            legend={key.legend}
            name={key.name}
            control={key.control}
            cap={key.cap}
            capSize={CAP_SIZE}
            legendGap={key.cap.y - key.legendAt.y}
            legendSize={LEGEND_SIZE}
            send={send}
          />
        ) : (
          <span
            key={key.control}
            data-key-legend
            data-lettering="secondary"
            style={printed(key.legendAt.x, key.legendAt.y)}
          >
            {key.legend}
          </span>
        ),
      )}
    </div>
  );
}
