import { memo, useId } from 'react';
import {
  BEVEL,
  CAP_SIZE,
  DISC,
  KEYS,
  KNOB_END,
  KNOB_RIBS,
  KNOB_SIZE,
  KNOBS,
  SCREW_SIZE,
  SCREWS,
  WINDOW,
} from './geometry';

// The art is drawn in hundredths of the disc's bounding square.
const U = 100;

const ribs = Array.from({ length: KNOB_RIBS }, (_, index) => (index * 360) / KNOB_RIBS);

/** The static face: disc, rim, key caps, knurled knobs, Phillips screws and the window's bevel. */
export const FaceArt = memo(function FaceArt() {
  const id = useId().replace(/[^\w-]/g, '');
  const cap = `atr833-cap-${id}`;
  const screw = `atr833-screw-${id}`;
  const knob = `atr833-knob-${id}`;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${U} ${U}`}
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={cap} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" style={{ stopColor: 'var(--panel-plastic-light)' }} />
          <stop offset="0.45" style={{ stopColor: 'var(--panel-plastic)' }} />
          <stop offset="1" style={{ stopColor: 'var(--panel-plastic-shade)' }} />
        </radialGradient>
        <radialGradient id={screw} cx="0.38" cy="0.32" r="0.7">
          <stop offset="0" style={{ stopColor: 'var(--panel-screw-light)' }} />
          <stop offset="1" style={{ stopColor: 'var(--panel-screw)' }} />
        </radialGradient>
        <radialGradient id={knob} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" style={{ stopColor: 'var(--panel-plastic)' }} />
          <stop offset="1" style={{ stopColor: 'var(--panel-face)' }} />
        </radialGradient>
      </defs>

      <circle
        data-disc
        cx={DISC.centre.x * U}
        cy={DISC.centre.y * U}
        r={(DISC.radius - DISC.rim / 2) * U}
        style={{
          fill: 'var(--panel-face)',
          stroke: 'var(--panel-bezel)',
          strokeWidth: DISC.rim * U,
        }}
      />

      <rect
        x={WINDOW.left * U}
        y={WINDOW.top * U}
        width={(WINDOW.right - WINDOW.left) * U}
        height={(WINDOW.bottom - WINDOW.top) * U}
        rx={WINDOW.radius * U}
        style={{ fill: 'var(--panel-screen)' }}
      />
      <line
        x1={BEVEL.bottom.left * U}
        x2={BEVEL.bottom.right * U}
        y1={BEVEL.bottom.y * U}
        y2={BEVEL.bottom.y * U}
        style={{ stroke: 'var(--panel-plastic-light)', strokeWidth: 0.4, strokeOpacity: 0.7 }}
      />
      <rect
        x={BEVEL.right.left * U}
        y={(WINDOW.top + WINDOW.radius) * U}
        width={(BEVEL.right.right - BEVEL.right.left) * U}
        height={(WINDOW.bottom - WINDOW.top - 2 * WINDOW.radius) * U}
        style={{ fill: 'var(--panel-plastic)', fillOpacity: 0.3 }}
      />

      {KEYS.map((key) => (
        <circle
          key={key.control}
          data-cap={key.control}
          cx={key.cap.x * U}
          cy={key.cap.y * U}
          r={(CAP_SIZE / 2) * U}
          style={{ fill: `url(#${cap})`, stroke: 'var(--panel-plastic-shade)', strokeWidth: 0.3 }}
        />
      ))}

      {KNOBS.map(({ control, centre }) => {
        const r = (KNOB_SIZE / 2) * U;
        return (
          <g
            key={control}
            data-knob={control}
            transform={`translate(${centre.x * U} ${centre.y * U})`}
          >
            <circle r={r} style={{ fill: 'var(--panel-plastic-shade)' }} />
            {ribs.map((angle) => (
              <line
                key={angle}
                y1={-r * 0.97}
                y2={-r * KNOB_END}
                transform={`rotate(${angle})`}
                style={{ stroke: 'var(--panel-plastic)', strokeWidth: 0.55 }}
              />
            ))}
            <circle
              r={r * KNOB_END}
              style={{
                fill: `url(#${knob})`,
                stroke: 'var(--panel-plastic-shade)',
                strokeWidth: 0.4,
              }}
            />
          </g>
        );
      })}

      {SCREWS.map((at) => {
        const r = (SCREW_SIZE / 2) * U;
        const slot = { stroke: 'var(--panel-screw-shade)', strokeWidth: r * 0.22 };
        return (
          <g key={`${at.x} ${at.y}`} data-screw transform={`translate(${at.x * U} ${at.y * U})`}>
            <circle
              r={r}
              style={{
                fill: `url(#${screw})`,
                stroke: 'var(--panel-screw-shade)',
                strokeWidth: 0.3,
              }}
            />
            <line x1={-r * 0.55} x2={r * 0.55} style={slot} />
            <line y1={-r * 0.55} y2={r * 0.55} style={slot} />
          </g>
        );
      })}
    </svg>
  );
});
