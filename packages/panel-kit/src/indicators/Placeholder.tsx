import { placeText, SANS_ADVANCE, useRenderedMetrics } from '../controls/legibility';
import { squeeze } from './geometry';

const VIEWBOX = { width: 100, height: 100 };
const LABEL_DESIGN = 7;
const LABEL_WIDTH = 80;

export function IndicatorPlaceholder({ label }: { label: string }) {
  const [ref, metrics] = useRenderedMetrics(VIEWBOX);
  const text = placeText(metrics, {
    design: LABEL_DESIGN,
    room: LABEL_WIDTH,
    chars: label.length,
    advance: SANS_ADVANCE,
    squeezable: true,
  });
  return (
    <svg
      ref={ref}
      data-widget="placeholder"
      data-placeholder=""
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
    >
      <circle
        cx={50}
        cy={50}
        r={49}
        style={{ fill: 'var(--panel-bezel-dark)', stroke: 'var(--panel-bezel)' }}
        strokeWidth={2}
      />
      <circle cx={50} cy={50} r={46} style={{ fill: 'var(--panel-dial)' }} />
      {text.show && (
        <text
          data-label=""
          x={50}
          y={54}
          fontSize={text.fontSize}
          textAnchor="middle"
          style={{ fill: 'var(--panel-legend-muted)', fontFamily: 'var(--font-sans)' }}
          {...squeeze(label, Math.floor(LABEL_WIDTH / (SANS_ADVANCE * text.fontSize)), LABEL_WIDTH)}
        >
          {label}
        </text>
      )}
    </svg>
  );
}
