import type { CSSProperties } from 'react';

// A track-up map without map data: range rings, a compass arc with the north marker, the aircraft.
const CX = 100;
const CY = 58;
const RING = 36;
const ARC = 46;
const ARC_SPAN = (60 * Math.PI) / 180;
const OWNSHIP =
  'M0 -8 L1.5 -3 L9 1 L9 3 L1.5 2 L1 6 L4 8 L4 9 L0 8 L-4 9 L-4 8 L-1 6 L-1.5 2 L-9 3 L-9 1 L-1.5 -3 Z';
const NORTH = 'M-3 4 L-3 -4 L3 4 L3 -4';

const onArc = (angle: number): string =>
  `${(CX + ARC * Math.sin(angle)).toFixed(2)} ${(CY - ARC * Math.cos(angle)).toFixed(2)}`;
const ARC_PATH = `M${onArc(-ARC_SPAN)} A${ARC} ${ARC} 0 0 1 ${onArc(ARC_SPAN)}`;

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
      viewBox="0 0 200 100"
      data-field="map"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      style={style}
    >
      <circle cx={CX} cy={CY} r={RING} strokeOpacity={0.5} />
      <circle cx={CX} cy={CY} r={RING / 2} strokeOpacity={0.5} />
      <path d={ARC_PATH} />
      {north !== null && (
        <path data-north d={NORTH} strokeWidth={1.5} transform={`translate(${onArc(north)})`} />
      )}
      <path d={OWNSHIP} fill="currentColor" stroke="none" transform={`translate(${CX} ${CY})`} />
    </svg>
  );
}
