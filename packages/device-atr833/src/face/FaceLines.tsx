import type { CSSProperties } from 'react';
import { formatFrequency, frequencyParts, lineThree, listPreview } from '../logic';
import type { Atr833Cursor, Atr833State } from '../logic';

const linesStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  gridTemplateRows: 'repeat(3, var(--leading-2xl))',
  alignItems: 'baseline',
  columnGap: 'var(--space-3)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-2xl)',
  lineHeight: 'var(--leading-2xl)',
  color: 'var(--panel-legend)',
  whiteSpace: 'nowrap',
};

const legendStyle: CSSProperties = { color: 'var(--panel-legend-muted)' };
const valueStyle: CSSProperties = { textAlign: 'right' };
const wideStyle: CSSProperties = { gridColumn: '1 / -1', textAlign: 'center' };
const underlineStyle: CSSProperties = { textDecoration: 'underline' };

type FieldProps = { name: Atr833Cursor; state: Atr833State; text: string };

function Field({ name, state, text }: FieldProps) {
  const underlined = state.cursor === name;
  return (
    <span
      data-cursor={underlined ? 'true' : undefined}
      style={underlined ? underlineStyle : undefined}
    >
      {text}
    </span>
  );
}

type FaceLinesProps = { on: boolean; state: Atr833State };

export function FaceLines({ on, state }: FaceLinesProps) {
  const lit = on && state.on;
  const preview = lit ? listPreview(state) : null;
  const parts = frequencyParts(state.standby);

  return (
    <div style={linesStyle}>
      <span style={legendStyle}>{lit ? 'ACT' : ''}</span>
      <span data-field="active" style={valueStyle}>
        {lit ? formatFrequency(state.active) : ''}
      </span>
      <span style={legendStyle}>
        {lit && preview === null ? (state.dualWatch ? 'DW' : 'SBY') : ''}
      </span>
      <span data-field="standby" style={valueStyle}>
        {lit && preview !== null && preview}
        {lit && preview === null && (
          <>
            {state.saved && '>'}
            <Field name="mhz" state={state} text={parts.mhz} />.
            <Field name="tenths" state={state} text={parts.tenths} />
            <Field name="channel" state={state} text={parts.channel} />
          </>
        )}
      </span>
      <span data-field="line3" style={wideStyle}>
        {lit ? lineThree(state) : ''}
      </span>
    </div>
  );
}
