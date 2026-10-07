import { useId } from 'react';
import type { IndicatorWidgetProps } from '../types';
import { MONO_ADVANCE, SANS_ADVANCE, placeText, useRenderedMetrics } from '../controls/legibility';
import {
  angleAt,
  ARC_RADIUS,
  ARC_STROKE,
  arcEndRoom,
  arcPath,
  CAPTION_GAP,
  CENTRE,
  formatNumber,
  polar,
  squeeze,
  SWEEP_END,
  TICK_GAP,
  TICK_OUTER,
  TICK_STROKE,
} from './geometry';
import { readGaugeOptions } from './options';
import { IndicatorPlaceholder } from './Placeholder';

const TICK_INNER = 33;
const NUMERAL_RADIUS = 26;
const NEEDLE_LENGTH = 34;
const NEEDLE_STROKE = 1.6;
const VIEWBOX = { width: 100, height: 100 };
const NUMERAL_DESIGN = 5;
const UNITS_DESIGN = 5;
const LABEL_DESIGN = 5.5;
const UNITS_Y = 66;
const LABEL_Y = 78;
const FACE_RADIUS = 46;
const NEEDLE_LOW = polar(SWEEP_END, NEEDLE_LENGTH).y + NEEDLE_STROKE / 2;
const TICK_LOW = polar(SWEEP_END, TICK_OUTER).y + TICK_STROKE / 2;

function chordRoom(bottom: number, margin = 2): number {
  const drop = bottom - CENTRE;
  return drop >= FACE_RADIUS ? 0 : 2 * (Math.sqrt(FACE_RADIUS ** 2 - drop ** 2) - margin);
}

export function tickSpacing(angles: readonly number[]): number {
  const sorted = [...angles].sort((a, b) => a - b);
  let gap = Infinity;
  for (let index = 1; index < sorted.length; index += 1) {
    gap = Math.min(gap, (sorted[index] ?? 0) - (sorted[index - 1] ?? 0));
  }
  return gap === Infinity ? Infinity : 2 * NUMERAL_RADIUS * Math.sin((gap * Math.PI) / 360);
}

const sans = 'var(--font-sans)';
const mono = 'var(--font-mono)';
const DIAL_RADIUS = 46;
// The light falls from the upper left, so a needle's shadow lands below and to the right of it.
const NEEDLE_SHADOW = { x: 0.6, y: 1.3 };
const GLARE = 'M5 50A45 45 0 0 1 84 22C62 19 26 30 7 62Z';

type Material = 'metal-light' | 'metal-shade' | 'bezel' | 'bezel-dark' | 'glare';
type Stop = readonly [offset: number, token: Material, opacity?: number];

function Gradient({
  id,
  stops,
  from,
  to,
}: {
  id: string;
  stops: readonly Stop[];
  from: [number, number];
  to: [number, number];
}) {
  return (
    <linearGradient id={id} x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]}>
      {stops.map(([offset, token, opacity]) => (
        <stop
          key={offset}
          offset={offset}
          style={{ stopColor: `var(--panel-${token})` }}
          {...(opacity === undefined ? {} : { stopOpacity: opacity })}
        />
      ))}
    </linearGradient>
  );
}

function Materials({ id }: { id: string }) {
  return (
    <defs>
      <Gradient
        id={`${id}-bezel`}
        from={[0.15, 0.08]}
        to={[0.85, 0.95]}
        stops={[
          [0, 'metal-light'],
          [0.35, 'bezel'],
          [0.7, 'bezel-dark'],
          [1, 'metal-shade'],
        ]}
      />
      <Gradient
        id={`${id}-lip`}
        from={[0.85, 0.95]}
        to={[0.15, 0.08]}
        stops={[
          [0, 'bezel'],
          [0.45, 'bezel-dark'],
          [1, 'metal-shade'],
        ]}
      />
      <Gradient
        id={`${id}-glare`}
        from={[0.15, 0]}
        to={[0.6, 1]}
        stops={[
          [0, 'glare', 0.28],
          [0.55, 'glare', 0.07],
          [1, 'glare', 0],
        ]}
      />
      <radialGradient
        id={`${id}-recess`}
        gradientUnits="userSpaceOnUse"
        cx={CENTRE + 1.6}
        cy={CENTRE + 2.4}
        r={DIAL_RADIUS + 3}
      >
        <stop offset={0.84} style={{ stopColor: 'var(--panel-shadow)' }} stopOpacity={0} />
        <stop offset={0.93} style={{ stopColor: 'var(--panel-shadow)' }} stopOpacity={0.3} />
        <stop offset={1} style={{ stopColor: 'var(--panel-shadow)' }} stopOpacity={0.75} />
      </radialGradient>
      <radialGradient id={`${id}-cap`} cx={0.38} cy={0.34} r={0.7}>
        <stop offset={0} style={{ stopColor: 'var(--panel-metal-light)' }} />
        <stop offset={0.6} style={{ stopColor: 'var(--panel-bezel-dark)' }} />
        <stop offset={1} style={{ stopColor: 'var(--panel-metal-shade)' }} />
      </radialGradient>
    </defs>
  );
}

const paint = (id: string, material: string) => `url(#${id}-${material})`;

export function RoundGauge({ value, label, options }: IndicatorWidgetProps) {
  const [ref, metrics] = useRenderedMetrics(VIEWBOX);
  const id = `pk-gauge-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const config = readGaugeOptions(options);
  if (config === null || typeof value !== 'number' || !Number.isFinite(value)) {
    return <IndicatorPlaceholder label={label} />;
  }
  const { min, max, units, ticks, arcs } = config;
  const reading = units === '' ? formatNumber(value) : `${formatNumber(value)} ${units}`;

  const captionSize = placeText(metrics, {
    design: LABEL_DESIGN,
    room: Infinity,
    chars: 0,
  }).fontSize;
  // The caption slides down off the needle's lowest tip and the end ticks; units and numerals keep their own room.
  const labelY = Math.max(
    LABEL_Y,
    NEEDLE_LOW + captionSize / 2,
    TICK_LOW + TICK_GAP + captionSize / 2,
  );
  const captionBottom = labelY + captionSize / 2;
  const captionRoom = Math.min(
    chordRoom(captionBottom, CAPTION_GAP),
    arcEndRoom(labelY - captionSize / 2, captionBottom, CAPTION_GAP),
  );
  const caption = placeText(metrics, {
    design: LABEL_DESIGN,
    room: captionRoom,
    chars: label.length,
    advance: SANS_ADVANCE,
    squeezable: true,
  });
  const showCaption = caption.show && labelY + caption.fontSize / 2 <= CENTRE + FACE_RADIUS;
  const unit = placeText(metrics, {
    design: UNITS_DESIGN,
    room: chordRoom(UNITS_Y + (metrics === undefined ? UNITS_DESIGN : 11 / metrics.scale) / 2),
    chars: units.length,
    advance: SANS_ADVANCE,
    squeezable: true,
  });
  // Deliberately the caption's design position, not labelY: units and numerals keep their own room.
  const textFloor = LABEL_Y - caption.fontSize / 2;
  const showUnits = units !== '' && unit.show && UNITS_Y + unit.fontSize / 2 <= textFloor;
  const tickLabels = ticks.map(formatNumber);
  const numeral = placeText(metrics, {
    design: NUMERAL_DESIGN,
    room: tickSpacing(ticks.map((tick) => angleAt(tick, min, max))) * 0.9,
    chars: Math.max(0, ...tickLabels.map((tickLabel) => tickLabel.length)),
    advance: MONO_ADVANCE,
  });
  const lowestNumeral = Math.max(
    ...ticks.map((tick) => polar(angleAt(tick, min, max), NUMERAL_RADIUS).y),
  );
  const showNumerals =
    (units === '' || showUnits) &&
    numeral.show &&
    lowestNumeral + numeral.fontSize / 2 <= textFloor;

  return (
    <svg
      ref={ref}
      data-widget="round-gauge"
      data-sweep-end={SWEEP_END}
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={reading}
    >
      <Materials id={id} />
      <circle cx={CENTRE} cy={CENTRE} r={49.5} style={{ fill: paint(id, 'bezel') }} />
      <circle cx={CENTRE} cy={CENTRE} r={47.6} style={{ fill: paint(id, 'lip') }} />
      <circle cx={CENTRE} cy={CENTRE} r={DIAL_RADIUS} style={{ fill: 'var(--panel-dial)' }} />
      {arcs.map((arc, i) => (
        <path
          key={i}
          data-arc=""
          d={arcPath(angleAt(arc.from, min, max), angleAt(arc.to, min, max), ARC_RADIUS)}
          fill="none"
          strokeWidth={ARC_STROKE}
          style={{ stroke: `var(--panel-arc-${arc.colour})` }}
        />
      ))}
      {ticks.map((tick, i) => {
        const angle = angleAt(tick, min, max);
        const outer = polar(angle, TICK_OUTER);
        const inner = polar(angle, TICK_INNER);
        const position = polar(angle, NUMERAL_RADIUS);
        return (
          <g key={i}>
            <line
              data-tick=""
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              strokeWidth={TICK_STROKE}
              style={{ stroke: 'var(--panel-legend)' }}
            />
            {showNumerals && (
              <text
                data-tick-label=""
                x={position.x}
                y={position.y}
                fontSize={numeral.fontSize}
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fill: 'var(--panel-legend)', fontFamily: mono }}
              >
                {formatNumber(tick)}
              </text>
            )}
          </g>
        );
      })}
      {showUnits && (
        <text
          data-units=""
          x={CENTRE}
          y={UNITS_Y}
          fontSize={unit.fontSize}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fill: 'var(--panel-legend-muted)', fontFamily: sans }}
        >
          {units}
        </text>
      )}
      {showCaption && (
        <text
          data-label=""
          x={CENTRE}
          y={labelY}
          fontSize={caption.fontSize}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fill: 'var(--panel-legend)', fontFamily: sans }}
          {...squeeze(
            label,
            Math.floor(captionRoom / (SANS_ADVANCE * caption.fontSize)),
            captionRoom,
          )}
        >
          {label}
        </text>
      )}
      <circle cx={CENTRE} cy={CENTRE} r={DIAL_RADIUS} style={{ fill: paint(id, 'recess') }} />
      <g transform={`translate(${NEEDLE_SHADOW.x} ${NEEDLE_SHADOW.y})`} opacity={0.45}>
        <line
          x1={CENTRE}
          y1={CENTRE}
          x2={CENTRE}
          y2={CENTRE - NEEDLE_LENGTH}
          transform={`rotate(${angleAt(value, min, max)} ${CENTRE} ${CENTRE})`}
          strokeWidth={NEEDLE_STROKE + 0.8}
          strokeLinecap="round"
          style={{ stroke: 'var(--panel-shadow)' }}
        />
      </g>
      <g data-needle="" transform={`rotate(${angleAt(value, min, max)} ${CENTRE} ${CENTRE})`}>
        <line
          x1={CENTRE}
          y1={CENTRE}
          x2={CENTRE}
          y2={CENTRE - NEEDLE_LENGTH}
          strokeWidth={NEEDLE_STROKE}
          strokeLinecap="round"
          style={{ stroke: 'var(--panel-needle)' }}
        />
      </g>
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={3.5}
        style={{ fill: paint(id, 'cap'), stroke: 'var(--panel-bezel-dark)' }}
        strokeWidth={1}
      />
      <path d={GLARE} style={{ fill: paint(id, 'glare') }} />
    </svg>
  );
}
