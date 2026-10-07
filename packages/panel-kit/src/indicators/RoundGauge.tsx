import type { IndicatorWidgetProps } from '../types';
import { MONO_ADVANCE, SANS_ADVANCE, placeText, useRenderedMetrics } from '../controls/legibility';
import { Grain, Kit, Materials, paint, RadialGradient, useMaterialId } from '../materials';
import type { Stop } from '../materials';
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
// The bezel stops short of the box so its cast shadow fits down-right inside it, unclipped.
const BEZEL_RADIUS = 48.4;
const CAST = { x: 0.6, y: 1.4, spread: 0.2 };
const CAST_STOPS: readonly Stop[] = [
  [0.92, 'shadow', 0.6],
  [1, 'shadow', 0],
];
const HUB = 3.5;
const BLADE = `M${CENTRE - 1.3} ${CENTRE}L${CENTRE - 0.35} ${CENTRE - NEEDLE_LENGTH}L${CENTRE + 0.35} ${CENTRE - NEEDLE_LENGTH}L${CENTRE + 1.3} ${CENTRE}Z`;
const COUNTERWEIGHT = `M${CENTRE - 1.6} ${CENTRE}V${CENTRE + 7}a1.6 1.6 0 0 0 3.2 0V${CENTRE}Z`;
const RIM = arcAt(47.6, -95, -10);
const COUNTER = arcAt(45, 100, 150);

function arcAt(radius: number, from: number, to: number): string {
  const start = polar(from, radius);
  const end = polar(to, radius);
  return `M${start.x} ${start.y}A${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

export function RoundGauge({ value, label, options }: IndicatorWidgetProps) {
  const [ref, metrics] = useRenderedMetrics(VIEWBOX);
  const id = useMaterialId('gauge');
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
      <Materials
        id={id}
        recess={{ centre: [CENTRE + 1.6, CENTRE + 2.4], radius: DIAL_RADIUS + 3 }}
      />
      <Kit id={id} use={['screw', 'specular']}>
        <Grain id={`${id}-grain`} tile={2} />
        <RadialGradient
          id={`${id}-cast`}
          userSpace
          centre={[CENTRE + CAST.x, CENTRE + CAST.y]}
          radius={BEZEL_RADIUS + CAST.spread}
          stops={CAST_STOPS}
        />
      </Kit>
      <circle
        cx={CENTRE + CAST.x}
        cy={CENTRE + CAST.y}
        r={BEZEL_RADIUS + CAST.spread}
        style={{ fill: paint(id, 'cast') }}
      />
      <circle cx={CENTRE} cy={CENTRE} r={BEZEL_RADIUS} style={{ fill: paint(id, 'bezel') }} />
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={BEZEL_RADIUS - 0.45}
        fill="none"
        strokeWidth={0.9}
        style={{ stroke: paint(id, 'lip') }}
      />
      <circle cx={CENTRE} cy={CENTRE} r={47.2} style={{ fill: paint(id, 'lip') }} />
      <circle cx={CENTRE} cy={CENTRE} r={46.5} style={{ fill: 'var(--panel-metal-shade)' }} />
      <circle cx={CENTRE} cy={CENTRE} r={DIAL_RADIUS} style={{ fill: 'var(--panel-dial)' }} />
      <circle cx={CENTRE} cy={CENTRE} r={DIAL_RADIUS} style={{ fill: paint(id, 'grain') }} />
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
      <g transform={`translate(${NEEDLE_SHADOW.x} ${NEEDLE_SHADOW.y})`} opacity={0.5}>
        <g
          data-needle-shadow=""
          transform={`rotate(${angleAt(value, min, max)} ${CENTRE} ${CENTRE})`}
        >
          <path d={BLADE} style={{ fill: 'var(--panel-shadow)' }} />
          <path d={COUNTERWEIGHT} style={{ fill: 'var(--panel-shadow)' }} />
        </g>
      </g>
      <g data-needle="" transform={`rotate(${angleAt(value, min, max)} ${CENTRE} ${CENTRE})`}>
        <path
          d={COUNTERWEIGHT}
          strokeWidth={0.3}
          style={{ fill: 'var(--panel-metal-shade)', stroke: 'var(--panel-bezel)' }}
        />
        <path
          data-blade=""
          d={BLADE}
          strokeWidth={0.25}
          style={{ fill: 'var(--panel-needle)', stroke: 'var(--panel-legend-muted)' }}
        />
      </g>
      <circle
        cx={CENTRE + 0.4}
        cy={CENTRE + 0.8}
        r={HUB + 0.3}
        opacity={0.5}
        style={{ fill: 'var(--panel-shadow)' }}
      />
      <circle cx={CENTRE} cy={CENTRE} r={HUB} style={{ fill: paint(id, 'cap') }} />
      <circle cx={CENTRE} cy={CENTRE} r={1.5} style={{ fill: paint(id, 'screw') }} />
      <line
        x1={CENTRE - 1.1}
        y1={CENTRE}
        x2={CENTRE + 1.1}
        y2={CENTRE}
        transform={`rotate(35 ${CENTRE} ${CENTRE})`}
        strokeWidth={0.45}
        strokeLinecap="round"
        style={{ stroke: 'var(--panel-screw-shade)' }}
      />
      <path d={GLARE} style={{ fill: paint(id, 'glare') }} />
      <path
        d={RIM}
        fill="none"
        strokeWidth={0.7}
        strokeLinecap="round"
        style={{ stroke: paint(id, 'specular') }}
      />
      <path
        d={COUNTER}
        fill="none"
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity={0.1}
        style={{ stroke: 'var(--panel-glare)' }}
      />
    </svg>
  );
}
