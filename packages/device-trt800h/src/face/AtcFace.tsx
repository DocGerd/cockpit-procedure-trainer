import { FaceKey } from '@cpt/panel-kit';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties, ReactNode } from 'react';
import { bottomRightText, levelText, modeText } from '../logic';
import type { Trt800hState } from '../logic';
import { FaceArt } from './FaceArt';
import { KEY_CAP, KEYS, LABEL, LINES, WINDOW, inWindow, percent } from './geometry';
import './AtcFace.css';

/** The dock draws the disc large enough that neighbouring key targets never overlap. */
export const DOCK_DIAMETER = 'calc(var(--space-12) * 6 - var(--space-1))';

type FaceProps = { state: Trt800hState; on: boolean } & (
  { mode: 'dock'; send: DeviceScreenProps['send'] } | { mode: 'mirror' }
);

const unitStyle: CSSProperties = {
  position: 'relative',
  aspectRatio: '1 / 1',
  fontFamily: 'var(--font-sans)',
  fontWeight: 'var(--weight-semibold)',
  color: 'var(--panel-legend)',
};

const windowStyle: CSSProperties = {
  position: 'absolute',
  left: percent(WINDOW.left),
  top: percent(WINDOW.top),
  width: percent(WINDOW.right - WINDOW.left),
  height: percent(WINDOW.bottom - WINDOW.top),
  borderRadius: `${percent(WINDOW.radius / (WINDOW.right - WINDOW.left))} / ${percent(WINDOW.radius / (WINDOW.bottom - WINDOW.top))}`,
  background: 'var(--panel-screen)',
  boxShadow: 'inset 0 calc(var(--space-1) / -2) 0 var(--panel-plastic-light)',
  fontFamily: 'var(--font-mono)',
};

const dockLabelStyle: CSSProperties = {
  position: 'absolute',
  left: percent(LABEL.x),
  top: percent((LABEL.top + LABEL.bottom) / 2),
  transform: 'translate(-50%, -50%)',
  writingMode: 'vertical-lr',
  textOrientation: 'upright',
  letterSpacing: 'calc(var(--space-2) * -1)',
  fontSize: 'var(--text-xl)',
  lineHeight: 'var(--leading-xl)',
  pointerEvents: 'none',
};

const mirrorLegendStyle: CSSProperties = {
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  whiteSpace: 'nowrap',
  fontSize: 'var(--text-sm)',
  lineHeight: 'var(--leading-sm)',
  pointerEvents: 'none',
};

type Line = 'top' | 'middle' | 'bottom';
type Size = 'large' | 'small';

const sizes: Record<Size, CSSProperties> = {
  large: { fontSize: 'var(--text-2xl)', lineHeight: 'var(--leading-2xl)' },
  small: { fontSize: 'var(--text-lg)', lineHeight: 'var(--leading-lg)' },
};

/** One display line's text, left-aligned from `left` or right-aligned to `right`, in unit-box fractions. */
function Field({
  name,
  line,
  size,
  left,
  right,
  secondary,
  children,
}: {
  name: string;
  line: Line;
  size: Size;
  left?: number;
  right?: number;
  secondary: boolean;
  children: ReactNode;
}) {
  const y = inWindow({ x: 0, y: LINES[line] }).y;
  const style: CSSProperties = {
    position: 'absolute',
    top: percent(y),
    transform: 'translateY(-50%)',
    whiteSpace: 'nowrap',
    color: 'var(--panel-oled)',
    ...sizes[size],
    ...(left === undefined ? {} : { left: percent(inWindow({ x: left, y: 0 }).x) }),
    ...(right === undefined ? {} : { right: percent(1 - inWindow({ x: right, y: 0 }).x) }),
  };
  return (
    <span data-field={name} data-lettering={secondary ? 'secondary' : undefined} style={style}>
      {children}
    </span>
  );
}

const cursorStyle: CSSProperties = { textDecoration: 'underline' };

function Display({ state, lit, mirror }: { state: Trt800hState; lit: boolean; mirror: boolean }) {
  const bottom = bottomRightText(state);
  const editing = lit && state.cursor !== null;
  return (
    <div data-display data-lit={lit} className="pk-glass" style={windowStyle}>
      <Field name="mode" line="top" size="large" left={LINES.wordLeft} secondary={false}>
        {lit ? modeText(state) : ''}
      </Field>
      <Field name="code" line="top" size="large" right={LINES.valueRight} secondary={false}>
        {lit ? state.squawk : ''}
      </Field>
      <Field name="ident" line="middle" size="small" left={LINES.wordLeft} secondary={mirror}>
        {lit && state.identMs > 0 ? 'IDT' : ''}
      </Field>
      <Field name="level" line="middle" size="small" right={LINES.levelRight} secondary={mirror}>
        {lit ? levelText(state) : ''}
      </Field>
      <Field name="status" line="bottom" size="large" left={LINES.wordLeft} secondary={false}>
        {lit && state.mode === 'stby' ? 'STBY' : ''}
      </Field>
      <Field name="standby" line="bottom" size="large" right={LINES.valueRight} secondary={false}>
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
      </Field>
    </div>
  );
}

/**
 * The round TRT800H face: the same face operable in the dock and read-only, at panel scale, in the
 * slot mirror. The mirror's frame prints `ATC`; the dock face prints it itself.
 */
export function AtcFace(props: FaceProps) {
  const { state, on, mode } = props;
  const lit = on && state.on;
  const style: CSSProperties = {
    ...unitStyle,
    width: mode === 'dock' ? DOCK_DIAMETER : '100%',
  };
  return (
    <div className="cpt-trt800h-face" data-face-unit={mode} style={style}>
      <FaceArt />
      <Display state={state} lit={lit} mirror={mode === 'mirror'} />
      {props.mode === 'dock' ? (
        <>
          <span data-face-label aria-hidden="true" style={dockLabelStyle}>
            ATC
          </span>
          {KEYS.map((key) => (
            <FaceKey
              key={key.control}
              legend={key.legend}
              name={key.name}
              control={key.control}
              cap={key.cap}
              capSize={KEY_CAP}
              legendGap={key.cap.y - key.legendAt.y}
              legendSize="md"
              send={props.send}
            />
          ))}
        </>
      ) : (
        KEYS.map((key) => (
          <span
            key={key.control}
            data-face-legend
            data-lettering="secondary"
            aria-hidden="true"
            style={{
              ...mirrorLegendStyle,
              left: percent(key.legendAt.x),
              top: percent(key.legendAt.y),
            }}
          >
            {key.legend}
          </span>
        ))
      )}
    </div>
  );
}
