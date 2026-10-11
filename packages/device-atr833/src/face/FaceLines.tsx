import type { CSSProperties } from 'react';
import { formatFrequency, frequencyParts, lineThree, listPreview } from '../logic';
import type { Atr833Cursor, Atr833State } from '../logic';
import { LABEL_LEFT, LINE3_VALUE_LEFT, LINE_CENTRES, VALUE_RIGHT, WINDOW } from './geometry';
import { percent } from './percent';

// The digits print a little smaller than the type step, and the labels as tall but condensed,
// as the unit's OLED font does.
const DIGIT_SCALE = 0.8;
const LABEL_CONDENSE = 0.42;

const across = (x: number) => (x - WINDOW.left) / (WINDOW.right - WINDOW.left);
const down = (y: number) => (y - WINDOW.top) / (WINDOW.bottom - WINDOW.top);

const glyph: CSSProperties = {
  position: 'absolute',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-3xl)',
  lineHeight: 'var(--leading-3xl)',
  fontWeight: 'var(--weight-semibold)',
  color: 'var(--panel-oled)',
  whiteSpace: 'nowrap',
};

const labelAt = (line: number, left: number): CSSProperties => ({
  ...glyph,
  left: percent(across(left)),
  top: percent(down(LINE_CENTRES[line] ?? 0)),
  transform: `translateY(-50%) scale(${LABEL_CONDENSE * DIGIT_SCALE}, ${DIGIT_SCALE})`,
  transformOrigin: 'left center',
});

const valueAt = (line: number): CSSProperties => ({
  ...glyph,
  right: percent(1 - across(VALUE_RIGHT)),
  top: percent(down(LINE_CENTRES[line] ?? 0)),
  transform: `translateY(-50%) scale(${DIGIT_SCALE})`,
  transformOrigin: 'right center',
});

const line3ValueStyle: CSSProperties = {
  ...glyph,
  left: percent(across(LINE3_VALUE_LEFT)),
  top: percent(down(LINE_CENTRES[2])),
  transform: `translateY(-50%) scale(${DIGIT_SCALE})`,
  transformOrigin: 'left center',
};

const underlineStyle: CSSProperties = {
  textDecorationLine: 'underline',
  textDecorationThickness: 'var(--space-1)',
  textUnderlineOffset: 'calc(var(--space-1) / 2)',
};

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

type FaceLinesProps = {
  on: boolean;
  state: Atr833State;
  /** The tier the line labels print in, where a mirror tells its lettering tiers apart. */
  labelTier?: 'secondary' | undefined;
};

/** The three OLED lines, placed in the display window as the unit prints them. */
export function FaceLines({ on, state, labelTier }: FaceLinesProps) {
  const lit = on && state.on;
  const preview = lit ? listPreview(state) : null;
  const parts = frequencyParts(state.standby);
  const [item = '', ...rest] = lit ? lineThree(state).split(' ') : [];

  const label = (line: number, text: string, left = LABEL_LEFT) => (
    <span data-line-label data-lettering={labelTier} style={labelAt(line, left)}>
      {text}
    </span>
  );

  return (
    <>
      {label(0, lit ? 'ACT' : '')}
      <span data-field="active" style={valueAt(0)}>
        {lit ? formatFrequency(state.active) : ''}
      </span>
      {label(1, lit && preview === null ? (state.dualWatch ? 'DW' : 'SBY') : '')}
      <span data-field="standby" style={valueAt(1)}>
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
      <span data-field="line3">
        {lit && (
          <>
            {label(2, item)}{' '}
            <span data-line-value style={line3ValueStyle}>
              {rest.join(' ')}
            </span>
          </>
        )}
      </span>
    </>
  );
}
