import type { IndicatorWidgetProps } from '../types';
import { angleAt, arcPath, CENTRE, formatNumber, polar, squeeze } from './geometry';
import { readGaugeOptions } from './options';
import { IndicatorPlaceholder } from './Placeholder';

const ARC_RADIUS = 42;
const TICK_OUTER = 38;
const TICK_INNER = 33;
const NUMERAL_RADIUS = 26;
const NEEDLE_LENGTH = 34;
const LABEL_CAPACITY = 18;
const LABEL_WIDTH = 66;

const sans = 'var(--font-sans)';
const mono = 'var(--font-mono)';

export function RoundGauge({ value, label, options }: IndicatorWidgetProps) {
  const config = readGaugeOptions(options);
  if (config === null || typeof value !== 'number' || !Number.isFinite(value)) {
    return <IndicatorPlaceholder label={label} />;
  }
  const { min, max, units, ticks, arcs } = config;
  const reading = units === '' ? formatNumber(value) : `${formatNumber(value)} ${units}`;

  return (
    <svg
      data-widget="round-gauge"
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
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={49}
        style={{ fill: 'var(--panel-bezel-dark)', stroke: 'var(--panel-bezel)' }}
        strokeWidth={2}
      />
      <circle cx={CENTRE} cy={CENTRE} r={46} style={{ fill: 'var(--panel-dial)' }} />
      {arcs.map((arc, i) => (
        <path
          key={i}
          data-arc=""
          d={arcPath(angleAt(arc.from, min, max), angleAt(arc.to, min, max), ARC_RADIUS)}
          fill="none"
          strokeWidth={3}
          style={{ stroke: `var(--panel-arc-${arc.colour})` }}
        />
      ))}
      {ticks.map((tick, i) => {
        const angle = angleAt(tick, min, max);
        const outer = polar(angle, TICK_OUTER);
        const inner = polar(angle, TICK_INNER);
        const numeral = polar(angle, NUMERAL_RADIUS);
        return (
          <g key={i}>
            <line
              data-tick=""
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              strokeWidth={1}
              style={{ stroke: 'var(--panel-legend)' }}
            />
            <text
              data-tick-label=""
              x={numeral.x}
              y={numeral.y}
              fontSize={5}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fill: 'var(--panel-legend)', fontFamily: mono }}
            >
              {formatNumber(tick)}
            </text>
          </g>
        );
      })}
      {units !== '' && (
        <text
          data-units=""
          x={CENTRE}
          y={66}
          fontSize={5}
          textAnchor="middle"
          style={{ fill: 'var(--panel-legend-muted)', fontFamily: sans }}
        >
          {units}
        </text>
      )}
      <text
        data-label=""
        x={CENTRE}
        y={78}
        fontSize={5.5}
        textAnchor="middle"
        style={{ fill: 'var(--panel-legend)', fontFamily: sans }}
        {...squeeze(label, LABEL_CAPACITY, LABEL_WIDTH)}
      >
        {label}
      </text>
      <g data-needle="" transform={`rotate(${angleAt(value, min, max)} ${CENTRE} ${CENTRE})`}>
        <line
          x1={CENTRE}
          y1={CENTRE}
          x2={CENTRE}
          y2={CENTRE - NEEDLE_LENGTH}
          strokeWidth={1.6}
          strokeLinecap="round"
          style={{ stroke: 'var(--panel-needle)' }}
        />
      </g>
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={3.5}
        style={{ fill: 'var(--panel-cap)', stroke: 'var(--panel-bezel-dark)' }}
        strokeWidth={1}
      />
    </svg>
  );
}
