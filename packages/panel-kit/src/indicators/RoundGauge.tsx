import type { IndicatorWidgetProps } from '../types';
import { MONO_ADVANCE, SANS_ADVANCE, placeText, useRenderedMetrics } from '../controls/legibility';
import {
  DOME,
  finish,
  Grain,
  LIGHT,
  LinearGradient,
  Materials,
  paint,
  RadialGradient,
  useMaterialId,
} from '../materials';
import type { Stop } from '../materials';
import {
  angleAt,
  ARC_RADIUS,
  ARC_STROKE,
  arcPath,
  CENTRE,
  formatNumber,
  polar,
  SWEEP_END,
  TICK_OUTER,
  TICK_STROKE,
} from './geometry';
import { readGaugeOptions } from './options';
import { IndicatorPlaceholder } from './Placeholder';

const TICK_INNER = 33;
const NUMERAL_RADIUS = 26;
const NEEDLE_LENGTH = 34;
const VIEWBOX = { width: 100, height: 100 };
const NUMERAL_DESIGN = 5;
const UNITS_DESIGN = 5;
const BAND_DESIGN = 5.5;
const UNITS_Y = 66;
const BAND_Y = 78;
const FACE_RADIUS = 46;
// The light falls from the upper left, so a needle's shadow lands below and to the right of it.
const NEEDLE_SHADOW = { x: 1.3, y: 2.3 };

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
const GLARE = 'M5 50A45 45 0 0 1 84 22C62 19 26 30 7 62Z';
// The bezel stops short of the box so its cast shadow fits down-right inside it, unclipped.
const BEZEL_RADIUS = 48.4;
const CAST = { x: 0.9, y: 1.4, spread: 0.2 };
const CAST_STOPS: readonly Stop[] = [
  [0.8, 'shadow', 0.9],
  [1, 'shadow', 0],
];
const HUB = 3.5;
const BLADE = `M${CENTRE - 1.3} ${CENTRE}L${CENTRE - 0.35} ${CENTRE - NEEDLE_LENGTH}L${CENTRE + 0.35} ${CENTRE - NEEDLE_LENGTH}L${CENTRE + 1.3} ${CENTRE}Z`;
// A shadow softens and spreads with height, so it is a little wider than the blade.
const BLADE_SHADOW = `M${CENTRE - 1.8} ${CENTRE}L${CENTRE - 0.7} ${CENTRE - NEEDLE_LENGTH}L${CENTRE + 0.7} ${CENTRE - NEEDLE_LENGTH}L${CENTRE + 1.8} ${CENTRE}Z`;
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

  const bandSize = placeText(metrics, {
    design: BAND_DESIGN,
    room: Infinity,
    chars: 0,
  }).fontSize;
  const unit = placeText(metrics, {
    design: UNITS_DESIGN,
    room: chordRoom(UNITS_Y + (metrics === undefined ? UNITS_DESIGN : 11 / metrics.scale) / 2),
    chars: units.length,
    advance: SANS_ADVANCE,
    squeezable: true,
  });
  // Units and numerals stay clear of the dial's lower band, which holds only the needle and end ticks.
  const textFloor = BAND_Y - bandSize / 2;
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
      <Materials id={id} recess={{ centre: [CENTRE + 1.6, CENTRE + 2.4], radius: DIAL_RADIUS + 3 }}>
        <RadialGradient id={`${id}-screw`} {...DOME} stops={finish.screw} />
        <LinearGradient id={`${id}-specular`} {...LIGHT} stops={finish.specular} />
        <LinearGradient id={`${id}-chamfer`} {...LIGHT} stops={finish.chamfer} />
        <Grain id={`${id}-grain`} tile={2} />
        <RadialGradient
          id={`${id}-cast`}
          userSpace
          centre={[CENTRE + CAST.x, CENTRE + CAST.y]}
          radius={BEZEL_RADIUS + CAST.spread}
          stops={CAST_STOPS}
        />
      </Materials>
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
        style={{ stroke: paint(id, 'chamfer') }}
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
      <circle cx={CENTRE} cy={CENTRE} r={DIAL_RADIUS} style={{ fill: paint(id, 'recess') }} />
      <g transform={`translate(${NEEDLE_SHADOW.x} ${NEEDLE_SHADOW.y})`} fillOpacity={0.75}>
        <g
          data-needle-shadow=""
          transform={`rotate(${angleAt(value, min, max)} ${CENTRE} ${CENTRE})`}
        >
          <path d={BLADE_SHADOW} style={{ fill: 'var(--panel-shadow)' }} />
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
        cx={CENTRE + NEEDLE_SHADOW.x * 0.7}
        cy={CENTRE + NEEDLE_SHADOW.y * 0.7}
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
