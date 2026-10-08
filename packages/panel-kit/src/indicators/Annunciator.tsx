import type { IndicatorWidgetProps } from '../types';
import {
  Chamfer,
  glareSweep,
  Grain,
  Kit,
  lampGlow,
  paint,
  RadialGradient,
  SoftShadow,
  useMaterialId,
} from '../materials';
import { readAnnunciatorOptions } from './options';
import { IndicatorPlaceholder } from './Placeholder';

const FRAME = { x: 0.5, y: 0.5, width: 97, height: 46.5, rx: 7 };
const LENS = { x: 6, y: 6, width: 88, height: 38, rx: 4 };

export function Annunciator({ value, label, options }: IndicatorWidgetProps) {
  const kit = useMaterialId('lamp');
  const config = readAnnunciatorOptions(options);
  if (config === null || typeof value !== 'boolean') {
    return <IndicatorPlaceholder label={label} />;
  }
  const { lamp, stateLabels } = config;
  const accessibleName =
    stateLabels === null ? label : `${label}: ${value ? stateLabels.lit : stateLabels.dark}`;
  const colour = `var(--panel-lamp-${lamp})`;
  return (
    <svg
      data-widget="annunciator"
      data-lit={value ? 'true' : 'false'}
      width="100%"
      height="100%"
      viewBox="0 0 100 50"
      role="img"
      aria-label={accessibleName}
    >
      <Kit id={kit} use={['bezel', 'lip', 'chamfer', 'well', 'lens-glare', 'specular']}>
        <RadialGradient
          id={`${kit}-glow`}
          centre={[0.5, 0.5]}
          radius={0.62}
          stops={lampGlow(lamp)}
        />
        <Grain id={`${kit}-grain`} tile={2.5} opacity={0.08} />
      </Kit>
      <SoftShadow box={FRAME} offset={[1.2, 1.8]} blur={1.6} opacity={0.7} />
      <rect {...FRAME} style={{ fill: paint(kit, 'bezel') }} />
      <Chamfer id={kit} box={FRAME} width={1.4} />
      <rect
        x={FRAME.x + 2}
        y={FRAME.y + 2}
        width={FRAME.width - 4}
        height={FRAME.height - 4}
        rx={FRAME.rx - 2}
        style={{ fill: paint(kit, 'lip') }}
      />
      <rect
        x={5}
        y={5}
        width={90}
        height={39.5}
        rx={5}
        style={{ fill: 'var(--panel-metal-shade)' }}
      />
      <rect
        data-lamp=""
        x={6}
        y={6}
        width={88}
        height={38}
        rx={4}
        strokeWidth={value ? 1.5 : 0}
        style={{
          fill: value ? colour : 'var(--panel-lamp-off)',
          stroke: value ? 'var(--panel-legend)' : 'none',
        }}
      />
      {value ? (
        <rect {...LENS} style={{ fill: paint(kit, 'glow') }} />
      ) : (
        <>
          <rect {...LENS} style={{ fill: paint(kit, 'grain') }} />
          <rect {...LENS} style={{ fill: paint(kit, 'well') }} />
        </>
      )}
      <path d={glareSweep(LENS)} style={{ fill: paint(kit, 'lens-glare') }} />
      <path
        d="M7.5 30V11.5A4.5 4.5 0 0 1 12 7H52"
        fill="none"
        strokeWidth={0.9}
        strokeLinecap="round"
        style={{ stroke: paint(kit, 'specular') }}
      />
      <path
        d="M70 43H88A4.5 4.5 0 0 0 92.5 38.5V30"
        fill="none"
        strokeWidth={0.8}
        strokeLinecap="round"
        opacity={0.12}
        style={{ stroke: 'var(--panel-glare)' }}
      />
    </svg>
  );
}
