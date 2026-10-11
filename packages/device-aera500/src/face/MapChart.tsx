import { memo } from 'react';
import type { CSSProperties } from 'react';
import { ARC_HALF_SPAN, ARC_RADIUS, CHART, OWNSHIP } from './geometry';

// A generic VFR-chart look, drawn for this trainer: no real geography, names or airspace.

const line = (token: string, width: number, extra: CSSProperties = {}): CSSProperties => ({
  fill: 'none',
  stroke: `var(--panel-${token})`,
  strokeWidth: width,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  ...extra,
});

const ChartBackdrop = memo(function ChartBackdrop() {
  return (
    <g>
      <rect width={CHART.width} height={CHART.height} style={{ fill: 'var(--panel-chart-land)' }} />
      <ellipse cx={30} cy={30} rx={14} ry={8} style={{ fill: 'var(--panel-chart-water)' }} />
      <path d="M-4 58C30 70 52 40 84 50S140 92 198 76" style={line('chart-water', 5)} />
      <path
        d="M0 100L60 88L120 104L196 96M150 0L138 60L160 131M40 0L52 40L30 131"
        style={line('chart-line', 0.6, { strokeOpacity: 0.55 })}
      />
      <path d="M-4 122L70 86L118 20L130 -4" style={line('arc-red', 2)} />
      <path
        d="M-4 26C60 6 130 30 198 14M120 135A46 46 0 0 1 198 70"
        style={line('chart-airspace', 1.4, { strokeDasharray: '0.1 3.2' })}
      />
    </g>
  );
});

const cx = OWNSHIP.x - CHART.x;
const cy = OWNSHIP.y - CHART.y;
const onCircle = (radius: number, angle: number) =>
  `${(cx + radius * Math.sin(angle)).toFixed(2)} ${(cy - radius * Math.cos(angle)).toFixed(2)}`;
const arc = (radius: number) =>
  `M${onCircle(radius, -ARC_HALF_SPAN)}A${radius} ${radius} 0 0 1 ${onCircle(radius, ARC_HALF_SPAN)}`;
const RANGE_ARC = `${arc(ARC_RADIUS)}${arc(ARC_RADIUS - 3)}`;
const NORTH_AT = ARC_RADIUS - 9;
const OWNSHIP_PATH =
  'M0 -8L1.5 -3L9 1L9 3L1.5 2L1 6L4 8L4 9L0 8L-4 9L-4 8L-1 6L-1.5 2L-9 3L-9 1L-1.5 -3Z';
const NORTH = 'M-3 4L-3 -4L3 4L3 -4';

/** The chart with the range arc around the own ship; north marked on the arc, track up. */
export function MapChart({ trackDeg, style }: { trackDeg: number | null; style: CSSProperties }) {
  const north = trackDeg === null ? null : -(((trackDeg + 180) % 360) - 180) * (Math.PI / 180);
  const northShown = north !== null && Math.abs(north) <= ARC_HALF_SPAN;
  return (
    <svg
      data-field="map"
      aria-hidden="true"
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      preserveAspectRatio="none"
      style={style}
    >
      <ChartBackdrop />
      <path d={RANGE_ARC} style={line('legend', 1.2)} />
      {northShown && (
        <path
          data-north
          d={NORTH}
          transform={`translate(${onCircle(NORTH_AT, north)})`}
          style={line('legend', 1.5)}
        />
      )}
      <path
        d={OWNSHIP_PATH}
        transform={`translate(${cx.toFixed(2)} ${cy.toFixed(2)})`}
        style={{ fill: 'var(--panel-legend)', stroke: 'var(--panel-shadow)', strokeWidth: 0.6 }}
      />
    </svg>
  );
}
