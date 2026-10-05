import { squeeze } from './geometry';

const LABEL_CAPACITY = 14;
const LABEL_WIDTH = 80;

export function IndicatorPlaceholder({ label }: { label: string }) {
  return (
    <svg
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
      <text
        data-label=""
        x={50}
        y={54}
        fontSize={7}
        textAnchor="middle"
        style={{ fill: 'var(--panel-legend-muted)', fontFamily: 'var(--font-sans)' }}
        {...squeeze(label, LABEL_CAPACITY, LABEL_WIDTH)}
      >
        {label}
      </text>
    </svg>
  );
}
