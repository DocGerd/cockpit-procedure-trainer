import type { CSSProperties } from 'react';
import { bottomRightText, levelText, modeText } from '../logic';
import type { Trt800hState } from '../logic';

export type FaceSize = 'screen' | 'mirror';

const sizes: Record<FaceSize, CSSProperties> = {
  screen: { fontSize: 'var(--text-lg)', lineHeight: 'var(--leading-lg)' },
  mirror: { fontSize: 'var(--text-2xl)', lineHeight: 'var(--leading-2xl)' },
};

const faceStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto auto',
  justifyContent: 'space-between',
  columnGap: 'var(--space-3)',
  alignContent: 'center',
  boxSizing: 'border-box',
  padding: 'var(--space-2)',
  background: 'var(--panel-screen)',
  color: 'var(--panel-legend)',
  fontFamily: 'var(--font-mono)',
};

const rightStyle: CSSProperties = { textAlign: 'right' };

const mutedStyle: CSSProperties = { color: 'var(--panel-legend-muted)' };

const cursorStyle: CSSProperties = { textDecoration: 'underline' };

type FaceProps = { state: Trt800hState; on: boolean; size: FaceSize; style?: CSSProperties };

/** The four display lines: mode and active code, a spare line, ident and flight level, status and standby. */
export function AtcFace({ state, on, size, style }: FaceProps) {
  const lit = on && state.on;
  const bottom = bottomRightText(state);
  const editing = lit && state.cursor !== null;
  return (
    <div data-display style={{ ...faceStyle, ...sizes[size], ...style }}>
      <span data-field="mode">{lit ? modeText(state) : ''}</span>
      <span data-field="code" style={rightStyle}>
        {lit ? state.squawk : ''}
      </span>
      <span aria-hidden="true" style={{ gridColumn: '1 / -1' }}>
        {' '}
      </span>
      <span data-field="ident" style={mutedStyle}>
        {lit && state.identMs > 0 ? 'IDT' : ''}
      </span>
      <span data-field="level" style={rightStyle}>
        {lit ? levelText(state) : ''}
      </span>
      <span data-field="status" style={mutedStyle}>
        {lit && state.mode === 'stby' ? 'STBY' : ''}
      </span>
      <span data-field="standby" style={rightStyle}>
        {lit &&
          (editing
            ? [...bottom].map((digit, place) => (
                <span
                  key={place}
                  data-cursor={state.cursor === place}
                  style={state.cursor === place ? cursorStyle : undefined}
                >
                  {digit}
                </span>
              ))
            : bottom)}
      </span>
    </div>
  );
}
