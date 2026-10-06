import type { IndicatorWidgetProps } from '../types';
import { placeText, SANS_ADVANCE, useRenderedMetrics } from '../controls/legibility';
import { squeeze } from './geometry';
import { readAnnunciatorOptions } from './options';
import { IndicatorPlaceholder } from './Placeholder';

const VIEWBOX = { width: 100, height: 50 };
const LABEL_DESIGN = 13;
const LABEL_WIDTH = 80;
const LAMP_HEIGHT = 36;

export function Annunciator({ value, label, options }: IndicatorWidgetProps) {
  const [ref, metrics] = useRenderedMetrics(VIEWBOX);
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
      <rect
        x={1}
        y={1}
        width={98}
        height={48}
        rx={7}
        strokeWidth={2}
        style={{ fill: 'var(--panel-bezel-dark)', stroke: 'var(--panel-bezel)' }}
      />
      <rect
        data-lamp=""
        x={6}
        y={6}
        width={88}
        height={38}
        rx={4}
        strokeWidth={value ? 2 : 0}
        style={{
          fill: value ? colour : 'var(--panel-lamp-off)',
          stroke: value ? 'var(--panel-legend)' : 'none',
        }}
      />
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
    </svg>
  );
}
