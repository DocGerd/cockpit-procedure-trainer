import type { IndicatorWidgetProps } from '../types';
import { MONO_ADVANCE, SANS_ADVANCE, placeText, useRenderedMetrics } from '../controls/legibility';
import { formatNumber, squeeze } from './geometry';
import {
  Chamfer,
  glareSweep,
  Kit,
  LIGHT,
  LinearGradient,
  paint,
  SoftShadow,
  useMaterialId,
} from '../materials';
import type { Stop } from '../materials';
import { readReadoutOptions } from './options';
import { IndicatorPlaceholder } from './Placeholder';

const VIEWBOX = { width: 100, height: 40 };
const TEXT_RIGHT = 94;
const TEXT_LEFT = 6;
const BASELINE = 36;
const FLOOR = 38;
const DESCENT = 0.3;
const LABEL_TOP = 4;
const CAP_HEIGHT = 0.72;
const VALUE_DESIGN = 16;
const LABEL_DESIGN = 6;
const UNITS_DESIGN = 7;
export const UNITS_ROOM = 32;
export const UNITS_GAP = 2;
const FRAME = { x: 0.3, y: 0.3, width: 96.6, height: 37.9, rx: 4 };
const WINDOW = { x: 2.6, y: 2.6, width: 92.3, height: 34, rx: 2.4 };
// Dark glass, a shade lighter towards the light, over a screen that is darker still.
const GLASS: readonly Stop[] = [
  [0, 'bezel-dark'],
  [0.55, 'screen'],
];
const INNER: readonly Stop[] = [
  [0, 'shadow', 0.85],
  [1, 'shadow', 0],
];

export const unitsReserve = (units: string, fontSize: number) =>
  Math.min(units.length * MONO_ADVANCE * fontSize, UNITS_ROOM) + UNITS_GAP;

export function DigitalReadout({ value, label, options }: IndicatorWidgetProps) {
  const [ref, metrics] = useRenderedMetrics(VIEWBOX);
  const kit = useMaterialId('readout');
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
  const baseline = Math.min(BASELINE, FLOOR - DESCENT * bare.fontSize);
  const showCaption = bare.show && caption.show;
  const showUnits = text !== '' && units !== '' && showCaption && unit.show && withUnits.show;
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
      aria-label={
        text === '' ? label : units === '' ? `${label}: ${text}` : `${label}: ${text} ${units}`
      }
    >
      <Kit id={kit} use={['bezel', 'lip', 'chamfer', 'well', 'lens-glare', 'specular']}>
        <LinearGradient id={`${kit}-glass`} {...LIGHT} stops={GLASS} />
        <LinearGradient id={`${kit}-inner`} from={[0, 0]} to={[0, 1]} stops={INNER} />
      </Kit>
      <SoftShadow box={FRAME} offset={[1.6, 1.2]} blur={1} opacity={0.75} />
      <rect {...FRAME} style={{ fill: paint(kit, 'bezel') }} />
      <Chamfer id={kit} box={FRAME} width={1.4} />
      <rect
        x={FRAME.x + 1.2}
        y={FRAME.y + 1.2}
        width={FRAME.width - 2.4}
        height={FRAME.height - 2.4}
        rx={FRAME.rx - 1}
        style={{ fill: paint(kit, 'lip') }}
      />
      <rect {...WINDOW} style={{ fill: paint(kit, 'glass') }} />
      <rect {...WINDOW} style={{ fill: paint(kit, 'well') }} />
      <rect
        x={WINDOW.x}
        y={WINDOW.y}
        width={WINDOW.width}
        height={3}
        rx={WINDOW.rx}
        style={{ fill: paint(kit, 'inner') }}
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
          y={baseline}
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
          y={baseline}
          fontSize={unit.fontSize}
          textAnchor="end"
          style={{ fill: 'var(--panel-legend-muted)', fontFamily: mono }}
          {...squeeze(units, Math.floor(UNITS_ROOM / (MONO_ADVANCE * unit.fontSize)), UNITS_ROOM)}
        >
          {units}
        </text>
      )}
      <path d={glareSweep(WINDOW)} style={{ fill: paint(kit, 'lens-glare') }} />
      <path
        d={`M${WINDOW.x + 0.6} ${WINDOW.y + 22}V${WINDOW.y + 2.5}A2 2 0 0 1 ${WINDOW.x + 2.5} ${WINDOW.y + 0.6}H${WINDOW.x + 50}`}
        fill="none"
        strokeWidth={0.8}
        strokeLinecap="round"
        style={{ stroke: paint(kit, 'specular') }}
      />
      <path
        d={`M${WINDOW.x + WINDOW.width * 0.7} ${WINDOW.y + WINDOW.height - 0.6}H${WINDOW.x + WINDOW.width - 2.4}A1.8 1.8 0 0 0 ${WINDOW.x + WINDOW.width - 0.6} ${WINDOW.y + WINDOW.height - 2.4}V${WINDOW.y + WINDOW.height * 0.6}`}
        fill="none"
        strokeWidth={0.7}
        strokeLinecap="round"
        opacity={0.14}
        style={{ stroke: 'var(--panel-glare)' }}
      />
    </svg>
  );
}
