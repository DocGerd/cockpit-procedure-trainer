import type { CSSProperties } from 'react';

// A track-up map without map data: range rings, the track line ahead and a north marker.
const CX = 50;
const CY = 54;
const RING = 32;
const OWNSHIP =
  'M0 -8 L1.5 -3 L9 1 L9 3 L1.5 2 L1 6 L4 8 L4 9 L0 8 L-4 9 L-4 8 L-1 6 L-1.5 2 L-9 3 L-9 1 L-1.5 -3 Z';
const NORTH = 'M-3 4 L-3 -4 L3 4 L3 -4';
const NORTH_AT = RING + 6;

export const formatSpeed = (knots: number | null): string =>
  `GS ${knots === null ? '---' : String(Math.round(knots))}KT`;

export const formatTrack = (degrees: number | null): string =>
  `TRK ${degrees === null ? '---' : String(Math.round(degrees)).padStart(3, '0')}°`;

export function MapSchematic({
  trackDeg,
  style,
}: {
  trackDeg: number | null;
  style?: CSSProperties;
}) {
  const north = trackDeg === null ? null : (-trackDeg * Math.PI) / 180;
  return (
    <svg
      viewBox="0 0 100 100"
      data-field="map"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      style={style}
    >
      <circle cx={CX} cy={CY} r={RING} strokeOpacity={0.5} />
      <circle cx={CX} cy={CY} r={RING / 2} strokeOpacity={0.5} />
      <line x1={CX} y1={CY - 8} x2={CX} y2={0} strokeDasharray="3 2" />
      {north !== null && (
        <path
          data-north
          d={NORTH}
          strokeWidth={1.5}
          transform={`translate(${(CX + NORTH_AT * Math.sin(north)).toFixed(2)} ${(CY - NORTH_AT * Math.cos(north)).toFixed(2)})`}
        />
      )}
      <path d={OWNSHIP} fill="currentColor" stroke="none" transform={`translate(${CX} ${CY})`} />
    </svg>
  );
}
