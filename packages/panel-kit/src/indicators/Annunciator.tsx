import type { IndicatorWidgetProps } from '../types';
import { placeText, SANS_ADVANCE, useRenderedMetrics } from '../controls/legibility';
import { squeeze } from './geometry';
import {
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

const VIEWBOX = { width: 100, height: 50 };
const LABEL_DESIGN = 13;
const LABEL_WIDTH = 80;
const LAMP_HEIGHT = 36;
const FRAME = { x: 0.5, y: 0.5, width: 98, height: 47.5, rx: 7 };
const LENS = { x: 6, y: 6, width: 88, height: 38, rx: 4 };

export function Annunciator({ value, label, options }: IndicatorWidgetProps) {
  const [ref, metrics] = useRenderedMetrics(VIEWBOX);
  const kit = useMaterialId('lamp');
  const config = readAnnunciatorOptions(options);
  if (config === null || typeof value !== 'boolean') {
    return <IndicatorPlaceholder label={label} />;
  }
  const { lamp, stateLabels } = config;
  const accessibleName =
    stateLabels === null ? label : `${label}: ${value ? stateLabels.lit : stateLabels.dark}`;
  const colour = `var(--panel-lamp-${lamp})`;
  const text = placeText(metrics, {
    design: LABEL_DESIGN,
    room: LABEL_WIDTH,
    chars: label.length,
    advance: SANS_ADVANCE,
    height: LAMP_HEIGHT,
    squeezable: true,
  });

  return (
    <svg
      ref={ref}
      data-widget="annunciator"
      data-lit={value ? 'true' : 'false'}
      width="100%"
      height="100%"
      viewBox="0 0 100 50"
      role="img"
      aria-label={accessibleName}
    >
      <Kit id={kit} use={['bezel', 'lip', 'well', 'screen-glare', 'specular']}>
        <RadialGradient
          id={`${kit}-glow`}
          centre={[0.5, 0.5]}
          radius={0.62}
          stops={lampGlow(lamp)}
        />
        <Grain id={`${kit}-grain`} tile={2.5} opacity={0.08} />
      </Kit>
      <SoftShadow box={FRAME} offset={[0.5, 1.2]} blur={1.4} />
      <rect {...FRAME} style={{ fill: paint(kit, 'bezel') }} />
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
        height={40}
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
      {text.show && (
        <text
          data-label=""
          x={50}
          y={26}
          fontSize={text.fontSize}
          fontWeight={600}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fill: value ? 'var(--panel-face)' : 'var(--panel-legend-muted)',
            fontFamily: 'var(--font-sans)',
          }}
          {...squeeze(label, Math.floor(LABEL_WIDTH / (SANS_ADVANCE * text.fontSize)), LABEL_WIDTH)}
        >
          {label}
        </text>
      )}
      <rect {...LENS} style={{ fill: paint(kit, 'screen-glare') }} />
      <path
        d="M7.5 30V11.5A4.5 4.5 0 0 1 12 7H52"
        fill="none"
        strokeWidth={0.8}
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
