import type { IndicatorWidgetProps } from '../types';
import { formatNumber, squeeze } from './geometry';
import { readReadoutOptions } from './options';
import { IndicatorPlaceholder } from './Placeholder';

const GLYPH_WIDTH = 9.6;
const TEXT_RIGHT = 94;
const TEXT_LEFT = 6;
const UNITS_WIDTH = 24;

export function DigitalReadout({ value, label, options }: IndicatorWidgetProps) {
  const config = readReadoutOptions(options);
  if (config === null) return <IndicatorPlaceholder label={label} />;
  const { units, decimals } = config;
  const text =
    typeof value === 'number'
      ? decimals === null
        ? formatNumber(value)
        : value.toFixed(decimals)
      : String(value);
  const valueRight = units === '' ? TEXT_RIGHT : TEXT_RIGHT - UNITS_WIDTH;
  const available = valueRight - TEXT_LEFT;
  const mono = 'var(--font-mono)';

  return (
    <svg
      data-widget="digital-readout"
      width="100%"
      height="100%"
      viewBox="0 0 100 40"
      role="img"
      aria-label={units === '' ? `${label}: ${text}` : `${label}: ${text} ${units}`}
    >
      <rect
        x={1}
        y={1}
        width={98}
        height={38}
        rx={4}
        strokeWidth={2}
        style={{ fill: 'var(--panel-screen)', stroke: 'var(--panel-bezel)' }}
      />
      <text
        data-label=""
        x={TEXT_LEFT}
        y={10}
        fontSize={6}
        style={{ fill: 'var(--panel-legend-muted)', fontFamily: 'var(--font-sans)' }}
      >
        {label}
      </text>
      <text
        data-value=""
        x={valueRight}
        y={30}
        fontSize={16}
        textAnchor="end"
        style={{ fill: 'var(--panel-legend)', fontFamily: mono }}
        {...squeeze(text, Math.floor(available / GLYPH_WIDTH), available)}
      >
        {text}
      </text>
      {units !== '' && (
        <text
          data-units=""
          x={TEXT_RIGHT}
          y={30}
          fontSize={7}
          textAnchor="end"
          style={{ fill: 'var(--panel-legend-muted)', fontFamily: mono }}
        >
          {units}
        </text>
      )}
    </svg>
  );
}
