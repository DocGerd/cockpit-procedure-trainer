import type { IndicatorWidgetProps } from '../types';
import { MONO_ADVANCE, SANS_ADVANCE, placeText, useRenderedMetrics } from '../controls/legibility';
import { formatNumber, squeeze } from './geometry';
import { readReadoutOptions } from './options';
import { IndicatorPlaceholder } from './Placeholder';

const VIEWBOX = { width: 100, height: 40 };
const TEXT_RIGHT = 94;
const TEXT_LEFT = 6;
const BASELINE = 36;
const LABEL_TOP = 4;
const CAP_HEIGHT = 0.72;
const VALUE_DESIGN = 16;
const LABEL_DESIGN = 6;
const UNITS_DESIGN = 7;
export const UNITS_ROOM = 32;
export const UNITS_GAP = 2;

export const unitsReserve = (units: string, fontSize: number) =>
  Math.min(units.length * MONO_ADVANCE * fontSize, UNITS_ROOM) + UNITS_GAP;

export function DigitalReadout({ value, label, options }: IndicatorWidgetProps) {
  const [ref, metrics] = useRenderedMetrics(VIEWBOX);
  const config = readReadoutOptions(options);
  if (config === null) return <IndicatorPlaceholder label={label} />;
  const { units, decimals } = config;
  const text =
    typeof value === 'number'
      ? decimals === null
        ? formatNumber(value)
        : value.toFixed(decimals)
      : String(value);
  const mono = 'var(--font-mono)';
  const wide = TEXT_RIGHT - TEXT_LEFT;

  const bare = placeText(metrics, {
    design: VALUE_DESIGN,
    room: wide,
    chars: text.length,
    advance: MONO_ADVANCE,
    height: BASELINE - LABEL_TOP,
    squeezable: true,
  });
  const caption = placeText(metrics, {
    design: LABEL_DESIGN,
    room: wide,
    chars: label.length,
    advance: SANS_ADVANCE,
    height: BASELINE - LABEL_TOP - 1 - CAP_HEIGHT * bare.fontSize,
    squeezable: true,
  });
  const unit = placeText(metrics, {
    design: UNITS_DESIGN,
    room: UNITS_ROOM,
    chars: units.length,
    advance: MONO_ADVANCE,
    height: BASELINE - LABEL_TOP,
    squeezable: true,
  });
  const reserve = unitsReserve(units, unit.fontSize);
  const withUnits = placeText(metrics, {
    design: VALUE_DESIGN,
    room: wide - reserve,
    chars: text.length,
    advance: MONO_ADVANCE,
    height: BASELINE - LABEL_TOP,
    squeezable: true,
  });
  const showCaption = bare.show && caption.show;
  const showUnits = units !== '' && showCaption && unit.show && withUnits.show;
  const valueRight = showUnits ? TEXT_RIGHT - reserve : TEXT_RIGHT;
  const available = valueRight - TEXT_LEFT;

  return (
    <svg
      ref={ref}
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
      {showCaption && (
        <text
          data-label=""
          x={TEXT_LEFT}
          y={LABEL_TOP}
          fontSize={caption.fontSize}
          dominantBaseline="hanging"
          style={{ fill: 'var(--panel-legend-muted)', fontFamily: 'var(--font-sans)' }}
          {...squeeze(label, Math.floor(wide / (SANS_ADVANCE * caption.fontSize)), wide)}
        >
          {label}
        </text>
      )}
      {bare.show && (
        <text
          data-value=""
          x={valueRight}
          y={BASELINE}
          fontSize={bare.fontSize}
          textAnchor="end"
          style={{ fill: 'var(--panel-legend)', fontFamily: mono }}
          {...squeeze(text, Math.floor(available / (MONO_ADVANCE * bare.fontSize)), available)}
        >
          {text}
        </text>
      )}
      {showUnits && (
        <text
          data-units=""
          x={TEXT_RIGHT}
          y={BASELINE}
          fontSize={unit.fontSize}
          textAnchor="end"
          style={{ fill: 'var(--panel-legend-muted)', fontFamily: mono }}
          {...squeeze(units, Math.floor(UNITS_ROOM / (MONO_ADVANCE * unit.fontSize)), UNITS_ROOM)}
        >
          {units}
        </text>
      )}
    </svg>
  );
}
