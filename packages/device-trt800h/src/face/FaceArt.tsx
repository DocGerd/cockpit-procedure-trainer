import { memo } from 'react';
import type { CSSProperties } from 'react';
import { DISC, KEY_CAP, KEYS, KNOB, SCREW_DIAMETER, SCREWS } from './geometry';
import type { Point } from './geometry';

// The art is drawn in thousandths of the unit box.
const UNIT = 1000;
const at = (fraction: number) => fraction * UNIT;

const artStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  display: 'block',
  overflow: 'visible',
  pointerEvents: 'none',
};

const discStyle: CSSProperties = {
  fill: 'var(--panel-face)',
  stroke: 'var(--panel-bezel)',
  strokeWidth: at(DISC.rim),
};

const capStyle: CSSProperties = {
  fill: 'var(--panel-dial)',
  stroke: 'var(--panel-shadow)',
  strokeWidth: 4,
};
const capGlossStyle: CSSProperties = { fill: 'var(--panel-plastic-light)', opacity: 0.35 };

const skirtStyle: CSSProperties = {
  fill: 'var(--panel-face)',
  stroke: 'var(--panel-plastic-light)',
  strokeWidth: 4,
};
const ribStyle: CSSProperties = { stroke: 'var(--panel-plastic)', strokeWidth: 6 };
const endCapStyle: CSSProperties = {
  fill: 'var(--panel-cap-light)',
  stroke: 'var(--panel-cap)',
  strokeWidth: 4,
};
const pointerStyle: CSSProperties = {
  stroke: 'var(--panel-face)',
  strokeWidth: 10,
  strokeLinecap: 'round',
};

const screwStyle: CSSProperties = {
  fill: 'var(--panel-screw-light)',
  stroke: 'var(--panel-screw)',
  strokeWidth: 6,
};
const slotStyle: CSSProperties = {
  stroke: 'var(--panel-screw-shade)',
  strokeWidth: 10,
  strokeLinecap: 'round',
};

function Cap({ x, y }: Point) {
  const r = at(KEY_CAP / 2);
  return (
    <g>
      <circle cx={at(x)} cy={at(y)} r={r} style={capStyle} />
      <circle cx={at(x) - r * 0.35} cy={at(y) - r * 0.35} r={r * 0.35} style={capGlossStyle} />
    </g>
  );
}

function Knob() {
  const cx = at(KNOB.centre.x);
  const cy = at(KNOB.centre.y);
  const r = at(KNOB.diameter / 2);
  const end = r * KNOB.endCap;
  const ribs = Array.from({ length: KNOB.ribs }, (_, index) => {
    const angle = (index * 2 * Math.PI) / KNOB.ribs;
    const [sin, cos] = [Math.sin(angle), Math.cos(angle)];
    return (
      <line
        key={index}
        x1={cx + sin * (end + (r - end) * 0.35)}
        y1={cy - cos * (end + (r - end) * 0.35)}
        x2={cx + sin * r * 0.97}
        y2={cy - cos * r * 0.97}
        style={ribStyle}
      />
    );
  });
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} style={skirtStyle} />
      {ribs}
      <circle cx={cx} cy={cy} r={end} style={endCapStyle} />
      <line x1={cx} y1={cy - end * 0.85} x2={cx} y2={cy + end * 0.85} style={pointerStyle} />
    </g>
  );
}

function Screw({ x, y }: Point) {
  const r = at(SCREW_DIAMETER / 2);
  const arm = r * 0.55;
  return (
    <g>
      <circle cx={at(x)} cy={at(y)} r={r} style={screwStyle} />
      <line x1={at(x) - arm} y1={at(y)} x2={at(x) + arm} y2={at(y)} style={slotStyle} />
      <line x1={at(x)} y1={at(y) - arm} x2={at(x)} y2={at(y) + arm} style={slotStyle} />
    </g>
  );
}

/** The unit's hardware: disc, key caps, knob and screws. Lettering and the display are DOM. */
export const FaceArt = memo(function FaceArt() {
  return (
    <svg viewBox={`0 0 ${UNIT} ${UNIT}`} aria-hidden="true" focusable="false" style={artStyle}>
      <circle
        cx={at(DISC.centre.x)}
        cy={at(DISC.centre.y)}
        r={at(DISC.radius - DISC.rim / 2)}
        style={discStyle}
      />
      {KEYS.map((key) => (
        <Cap key={key.control} {...key.cap} />
      ))}
      {SCREWS.map((screw) => (
        <Screw key={`${screw.x},${screw.y}`} {...screw} />
      ))}
      <Knob />
    </svg>
  );
});
