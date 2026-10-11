import { KnobHelpers } from '@cpt/panel-kit';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { Atr833Face } from '../face/Atr833Face';
import { DOCK_DIAMETER, HELPER_COLUMN, HELPER_GAP, KNOBS } from '../face/geometry';
import type { Atr833State } from '../logic';

const screenStyle: CSSProperties = {
  position: 'relative',
  width: `calc(${DOCK_DIAMETER} + ${HELPER_GAP} + ${HELPER_COLUMN})`,
  height: DOCK_DIAMETER,
};

const faceBoxStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: DOCK_DIAMETER,
  height: DOCK_DIAMETER,
};

// One stack runs down from the face's top beside the upper knob, the other ends at its bottom
// beside the lower one.
const helperColumnStyle: CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 0,
  width: HELPER_COLUMN,
  height: DOCK_DIAMETER,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  fontFamily: 'var(--font-sans)',
};

export function Atr833Screen({ on, state, send }: DeviceScreenProps) {
  const unit = state as Atr833State;
  return (
    <div className="cpt-device-atr833" style={screenStyle}>
      <div style={faceBoxStyle}>
        <Atr833Face mode="dock" diameter={DOCK_DIAMETER} on={on} state={unit} send={send} />
      </div>
      <div data-helper-column style={helperColumnStyle}>
        {KNOBS.map(({ control, word }) => (
          <KnobHelpers key={control} word={word} control={control} send={send} />
        ))}
      </div>
    </div>
  );
}
